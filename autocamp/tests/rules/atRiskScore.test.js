'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { atRiskScore } = require('../../src/services/rules/atRiskScore');

// Fixed reference point keeps tests deterministic.
const NOW = new Date('2026-05-16T12:00:00.000Z');

// Signal factory helpers
const recent = (type) => ({ signal_type: type, created_at: '2026-05-13T10:00:00.000Z', resolved_at: null });
const old     = (type) => ({ signal_type: type, created_at: '2026-04-01T10:00:00.000Z', resolved_at: null });
const resolved = (type) => ({ signal_type: type, created_at: '2026-05-14T10:00:00.000Z', resolved_at: '2026-05-15T00:00:00.000Z' });

// ---------------------------------------------------------------------------
// Persona baselines
// ---------------------------------------------------------------------------
describe('atRiskScore — persona baselines', () => {
  test('Bilal — no signals — score 0, level low', () => {
    const result = atRiskScore({ signals: [], now: NOW });
    assert.equal(result.score,   0);
    assert.equal(result.level,   'low');
    assert.deepEqual(result.reasons, []);
  });

  test('Sadia — two recent low_score signals — score 45, level medium', () => {
    // 2 × (15 × 1.5) = 45
    const result = atRiskScore({
      signals: [
        { signal_type: 'low_score', created_at: '2026-05-13T18:05:00.000Z', resolved_at: null },
        { signal_type: 'low_score', created_at: '2026-05-15T09:00:00.000Z', resolved_at: null },
      ],
      now: NOW,
    });
    assert.equal(result.score, 45);
    assert.equal(result.level, 'medium');
    assert.equal(result.reasons.length, 2);
    assert.match(result.reasons[0], /low score/i);
    assert.match(result.reasons[0], /recent/i);
  });

  test('Amna — one recent missed_deadline — score 30, level medium', () => {
    // 20 × 1.5 = 30
    const result = atRiskScore({
      signals: [{ signal_type: 'missed_deadline', created_at: '2026-05-13T10:00:00.000Z', resolved_at: null }],
      now: NOW,
    });
    assert.equal(result.score, 30);
    assert.equal(result.level, 'medium');
    assert.match(result.reasons[0], /missed deadline/i);
    assert.match(result.reasons[0], /recent/i);
  });

  test('scores differ meaningfully across personas: Bilal < Amna < Sadia', () => {
    const bilal = atRiskScore({ signals: [], now: NOW });
    const amna  = atRiskScore({
      signals: [{ signal_type: 'missed_deadline', created_at: '2026-05-13T10:00:00.000Z', resolved_at: null }],
      now: NOW,
    });
    const sadia = atRiskScore({
      signals: [
        { signal_type: 'low_score', created_at: '2026-05-13T18:05:00.000Z', resolved_at: null },
        { signal_type: 'low_score', created_at: '2026-05-15T09:00:00.000Z', resolved_at: null },
      ],
      now: NOW,
    });
    assert.ok(bilal.score < amna.score,  `Bilal (${bilal.score}) should be < Amna (${amna.score})`);
    assert.ok(amna.score  < sadia.score, `Amna (${amna.score}) should be < Sadia (${sadia.score})`);
  });
});

// ---------------------------------------------------------------------------
// Recency weighting
// ---------------------------------------------------------------------------
describe('atRiskScore — recency weighting', () => {
  test('recent signal (within 7 days) is weighted 1.5×', () => {
    const result = atRiskScore({ signals: [recent('missed_deadline')], now: NOW });
    assert.equal(result.score, 30); // 20 × 1.5
    assert.match(result.reasons[0], /recent/i);
  });

  test('old signal (outside 7 days) has no recency multiplier', () => {
    const result = atRiskScore({ signals: [old('missed_deadline')], now: NOW });
    assert.equal(result.score, 20); // 20 × 1.0
    assert.doesNotMatch(result.reasons[0], /recent/i);
  });

  test('recent signal scores higher than old signal of same type', () => {
    const r = atRiskScore({ signals: [recent('low_score')], now: NOW });
    const o = atRiskScore({ signals: [old('low_score')],    now: NOW });
    assert.ok(r.score > o.score);
  });
});

// ---------------------------------------------------------------------------
// Signal weights and levels
// ---------------------------------------------------------------------------
describe('atRiskScore — signal weights', () => {
  test('instructor_flag is the highest single-signal weight (30 base → 45 recent)', () => {
    const result = atRiskScore({ signals: [recent('instructor_flag')], now: NOW });
    assert.equal(result.score, 45); // 30 × 1.5
    assert.equal(result.level, 'medium'); // 45 is in the 25–49 band
  });

  test('inactivity is the second-highest (25 base → 38 recent)', () => {
    const result = atRiskScore({ signals: [recent('inactivity')], now: NOW });
    assert.equal(result.score, 38); // 25 × 1.5 = 37.5 → 38
    assert.equal(result.level, 'medium');
  });

  test('help_requested is the lowest weight (5 base → 8 recent)', () => {
    const result = atRiskScore({ signals: [recent('help_requested')], now: NOW });
    assert.equal(result.score, 8); // 5 × 1.5 = 7.5 → 8
    assert.equal(result.level, 'low');
  });
});

// ---------------------------------------------------------------------------
// Level thresholds
// ---------------------------------------------------------------------------
describe('atRiskScore — levels', () => {
  test('score 0 → low', () => {
    assert.equal(atRiskScore({ signals: [], now: NOW }).level, 'low');
  });

  test('score 25 → medium (missed_deadline old = 20, plus low_score old = 15 → 35... use repeated_attempts)', () => {
    // repeated_attempts(old)=10 + low_score(old)=15 = 25 → medium
    const result = atRiskScore({
      signals: [old('repeated_attempts'), old('low_score')],
      now: NOW,
    });
    assert.equal(result.score, 25);
    assert.equal(result.level, 'medium');
  });

  test('score ≥ 50 → high', () => {
    // instructor_flag recent (45) + help_requested recent (8) = 53
    const result = atRiskScore({
      signals: [recent('instructor_flag'), recent('help_requested')],
      now: NOW,
    });
    assert.ok(result.score >= 50);
    assert.equal(result.level, 'high');
  });

  test('score ≥ 75 → critical', () => {
    // missed_deadline(30) + inactivity(38) + low_score(23) = 91 → capped 100
    const result = atRiskScore({
      signals: [recent('missed_deadline'), recent('inactivity'), recent('low_score')],
      now: NOW,
    });
    assert.ok(result.score >= 75);
    assert.equal(result.level, 'critical');
  });

  test('score caps at 100', () => {
    const manySignals = [
      recent('instructor_flag'),
      recent('inactivity'),
      recent('missed_deadline'),
      recent('low_score'),
      recent('repeated_attempts'),
      recent('help_requested'),
    ];
    const result = atRiskScore({ signals: manySignals, now: NOW });
    assert.equal(result.score, 100);
  });
});

// ---------------------------------------------------------------------------
// Resolved signals
// ---------------------------------------------------------------------------
describe('atRiskScore — resolved signals', () => {
  test('resolved signal does not contribute to score', () => {
    const result = atRiskScore({ signals: [resolved('instructor_flag')], now: NOW });
    assert.equal(result.score, 0);
    assert.equal(result.level, 'low');
    assert.deepEqual(result.reasons, []);
  });

  test('only unresolved signals count — mixed batch', () => {
    const result = atRiskScore({
      signals: [resolved('instructor_flag'), recent('low_score')],
      now: NOW,
    });
    assert.equal(result.score, 23); // only low_score counts: 15 × 1.5 = 22.5 → 23
  });
});

// ---------------------------------------------------------------------------
// Multiple signals compound
// ---------------------------------------------------------------------------
describe('atRiskScore — compounding', () => {
  test('two old signals add up: missed_deadline(20) + low_score(15) = 35', () => {
    const result = atRiskScore({
      signals: [old('missed_deadline'), old('low_score')],
      now: NOW,
    });
    assert.equal(result.score, 35);
    assert.equal(result.level, 'medium');
    assert.equal(result.reasons.length, 2);
  });

  test('two recent signals compound with multiplier', () => {
    // missed_deadline(20) + low_score(15) both recent: (20+15) × 1.5 = 52.5 → 53
    const result = atRiskScore({
      signals: [recent('missed_deadline'), recent('low_score')],
      now: NOW,
    });
    assert.equal(result.score, 53);
    assert.equal(result.level, 'high');
  });
});
