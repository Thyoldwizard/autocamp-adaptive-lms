'use strict';

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { getRules, loadRules, refresh, DEFAULTS } = require('../../src/config/rules');

// All RULES_* env vars this suite touches — cleared after each test so a
// failing assertion can't leak an override into the next one.
const TOUCHED_ENV = [
  'RULES_BAND_STRONG',
  'RULES_BAND_DEVELOPING',
  'RULES_ATRISK_SIGNAL_WEIGHTS',
  'RULES_ATRISK_LEVELS',
  'RULES_CHECKIN_SESSION_TTL_MS',
];

afterEach(async () => {
  for (const key of TOUCHED_ENV) delete process.env[key];
  // Rebuild the cache from a clean env so subsequent tests start from defaults.
  await refresh();
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

describe('rules config — defaults', () => {
  test('getRules() returns the documented defaults synchronously', () => {
    const r = getRules();
    assert.equal(r.bands.strong, 0.7);
    assert.equal(r.bands.developing, 0.4);
    assert.equal(r.goalProgress.moduleWeight, 0.6);
    assert.equal(r.goalProgress.skillWeight, 0.4);
    assert.equal(r.goalProgress.onTrackCutoff, 50);
    assert.equal(r.atRisk.signalWeights.instructor_flag, 30);
    assert.equal(r.atRisk.recencyWindowMs, 7 * 24 * 60 * 60 * 1000);
    assert.equal(r.struggle.lowScoreThreshold, 60);
    assert.equal(r.struggle.repeatedAttemptsThreshold, 3);
    assert.equal(r.nextBestAction.inProgressBoost, 0.3);
    assert.equal(r.onboarding.backgroundProficiency.technical, 0.3);
    assert.equal(r.checkin.sessionTtlMs, 30 * 60 * 1000);
    assert.equal(r.checkin.proficiencyDelta.highScore, 0.08);
  });

  test('getRules() never exposes the DEFAULTS object for mutation', async () => {
    const r = getRules();
    r.bands.strong = 999; // mutate the returned config
    await refresh();
    assert.equal(getRules().bands.strong, 0.7, 'mutation must not leak into DEFAULTS');
    assert.equal(DEFAULTS.bands.strong, 0.7);
  });
});

// ─── Env overrides ─────────────────────────────────────────────────────────────

describe('rules config — env overrides', () => {
  test('scalar RULES_* override is applied after refresh()', async () => {
    process.env.RULES_BAND_STRONG = '0.9';
    process.env.RULES_CHECKIN_SESSION_TTL_MS = '60000';
    await refresh();

    assert.equal(getRules().bands.strong, 0.9);
    assert.equal(getRules().checkin.sessionTtlMs, 60000);
    // Untouched keys keep their defaults.
    assert.equal(getRules().bands.developing, 0.4);
  });

  test('non-numeric scalar override is ignored (keeps default)', async () => {
    process.env.RULES_BAND_STRONG = 'not-a-number';
    await refresh();
    assert.equal(getRules().bands.strong, 0.7);
  });

  test('JSON override replaces a structured value', async () => {
    process.env.RULES_ATRISK_SIGNAL_WEIGHTS = JSON.stringify({ low_score: 99 });
    await refresh();
    assert.equal(getRules().atRisk.signalWeights.low_score, 99);
  });

  test('malformed JSON override is ignored (keeps default)', async () => {
    process.env.RULES_ATRISK_LEVELS = '{not valid json';
    await refresh();
    assert.equal(getRules().atRisk.levels[0].level, 'critical');
  });
});

// ─── loadRules ─────────────────────────────────────────────────────────────────

describe('rules config — loadRules()', () => {
  test('resolves to the env+defaults layer even with no DB available', async () => {
    // This suite does not configure Supabase, so the DB read inside loadRules
    // throws and is swallowed — we should still get a usable config back.
    const r = await loadRules();
    assert.ok(r.bands, 'config must be returned');
    assert.equal(r.bands.strong, 0.7);
  });
});
