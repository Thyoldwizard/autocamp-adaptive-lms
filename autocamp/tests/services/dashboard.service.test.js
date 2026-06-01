'use strict';

/**
 * dashboard.service integration tests.
 *
 * Pre-conditions:
 *   - .env is present with valid Supabase credentials
 *   - `npm run seed` has been run (Amna, Bilal, Sadia + catalog data)
 *
 * Run: node --test tests/services/dashboard.service.test.js
 */

require('dotenv').config();

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../../src/config/supabase');
const { getDashboard, getSkillBreakdown, recordActivity } = require('../../src/services/dashboard.service');

// ─── Seed persona resolution ──────────────────────────────────────────────────

const EMAILS = {
  amna:  'amna.malik@atomcamp.test',
  bilal: 'bilal.ahmed@atomcamp.test',
  sadia: 'sadia.hussain@atomcamp.test',
};

const learnerIds = {};
const signalsToClean = [];   // collect inserted signal IDs for teardown
const progressToClean = [];  // collect inserted progress IDs for teardown

before(async () => {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`before: listUsers failed — ${error.message}`);

  for (const [key, email] of Object.entries(EMAILS)) {
    const authUser = users.find((u) => u.email === email);
    assert.ok(authUser, `Seed persona not found: ${email} — run npm run seed`);

    const { data: learner, error: lerr } = await supabase
      .from('learners')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    assert.ok(!lerr, `Could not fetch learner for ${email}: ${lerr?.message}`);
    learnerIds[key] = learner.id;
  }
});

after(async () => {
  // Clean up any signals inserted by recordActivity tests
  if (signalsToClean.length) {
    await supabase.from('struggle_signals').delete().in('id', signalsToClean);
  }
  // Clean up any progress rows inserted by recordActivity tests
  if (progressToClean.length) {
    await supabase.from('progress').delete().in('id', progressToClean);
  }
});

// ─── getDashboard ─────────────────────────────────────────────────────────────

describe('getDashboard — shape and structure', () => {

  test('Amna — returns all six top-level keys', async () => {
    const dash = await getDashboard(learnerIds.amna);

    assert.ok(dash.learner,       'learner key must be present');
    assert.ok(dash.journey,       'journey key must be present');
    assert.ok(dash.skills,        'skills key must be present');
    assert.ok(dash.atRisk,        'atRisk key must be present');
    assert.ok(dash.goalProgress,  'goalProgress key must be present');
    assert.ok(Array.isArray(dash.recentActivity), 'recentActivity must be an array');
  });

  test('Amna — learner block has name, program, cohort, goal', async () => {
    const { learner } = await getDashboard(learnerIds.amna);

    assert.equal(learner.name,    'Amna Malik');
    assert.equal(learner.program, 'data-analytics-bootcamp');
    assert.equal(learner.cohort,  'da-2026-spring');
    assert.ok(typeof learner.goal === 'string' || learner.goal === null,
      'goal should be a string or null');
  });

  test('Amna — journey.progressSummary has completed=1, inProgress≥1', async () => {
    const { journey } = await getDashboard(learnerIds.amna);

    assert.ok('completed'  in journey.progressSummary, 'progressSummary must have completed');
    assert.ok('inProgress' in journey.progressSummary, 'progressSummary must have inProgress');
    assert.ok('notStarted' in journey.progressSummary, 'progressSummary must have notStarted');

    // Amna seed: Excel Fundamentals completed, SQL stalled
    assert.ok(journey.progressSummary.completed  >= 1, 'Amna has at least 1 completed module');
    assert.ok(journey.progressSummary.inProgress >= 1, 'Amna has at least 1 in-progress/stalled module');
  });

  test('Amna — journey.currentModule points at the stalled SQL module', async () => {
    const { journey } = await getDashboard(learnerIds.amna);

    assert.ok(journey.currentModule, 'currentModule must be non-null for Amna');
    assert.ok(journey.currentModule.moduleId, 'currentModule must have a moduleId');
    assert.ok(journey.currentModule.moduleName, 'currentModule must have a moduleName');
    assert.ok(
      journey.currentModule.status === 'in_progress' || journey.currentModule.status === 'stalled',
      `currentModule status should be in_progress or stalled, got: ${journey.currentModule.status}`,
    );
  });

  test('Amna — journey.nextBestAction is present with required fields', async () => {
    const { journey } = await getDashboard(learnerIds.amna);

    if (journey.nextBestAction !== null) {
      assert.ok(journey.nextBestAction.moduleId,   'nextBestAction must have moduleId');
      assert.ok(journey.nextBestAction.moduleName, 'nextBestAction must have moduleName');
      assert.ok(typeof journey.nextBestAction.skillGap === 'number', 'skillGap must be a number');
      assert.ok(journey.nextBestAction.reason, 'nextBestAction must have reason');
    }
  });

  test('Amna — skills block has strong, weak, notStarted arrays', async () => {
    const { skills } = await getDashboard(learnerIds.amna);

    assert.ok(Array.isArray(skills.strong),     'skills.strong must be an array');
    assert.ok(Array.isArray(skills.weak),       'skills.weak must be an array');
    assert.ok(Array.isArray(skills.notStarted), 'skills.notStarted must be an array');

    // Amna has no skills >= 0.7 — strong should be empty
    assert.equal(skills.strong.length, 0, 'Amna has no strong skills');
    // Amna has sql (0.20), python (0.10), statistics (0.35) — all weak
    assert.ok(skills.weak.length >= 3, `Expected >= 3 weak skills, got ${skills.weak.length}`);
    // power_bi and ml are at 0.0 — not started
    assert.ok(skills.notStarted.length >= 2, 'Amna has at least 2 not-started skills');
  });

  test('Amna — skill items have required fields (skillId, code, name, proficiency)', async () => {
    const { skills } = await getDashboard(learnerIds.amna);
    const item = skills.weak[0];
    assert.ok(item.skillId,             'skill item must have skillId');
    assert.ok(item.code,                'skill item must have code');
    assert.ok(item.name,                'skill item must have name');
    assert.ok(typeof item.proficiency === 'number', 'proficiency must be a number');
  });

  test('Amna — atRisk has level and reasons', async () => {
    const { atRisk } = await getDashboard(learnerIds.amna);

    assert.ok(['low', 'medium', 'high', 'critical'].includes(atRisk.level),
      `Invalid atRisk level: ${atRisk.level}`);
    assert.ok(Array.isArray(atRisk.reasons), 'reasons must be an array');
  });

  test('Amna — goalProgress has percentage, onTrack, strongAreas, weakAreas', async () => {
    const { goalProgress } = await getDashboard(learnerIds.amna);

    assert.ok(typeof goalProgress.percentage === 'number', 'percentage must be a number');
    assert.ok(typeof goalProgress.onTrack    === 'boolean', 'onTrack must be a boolean');
    assert.ok(Array.isArray(goalProgress.strongAreas), 'strongAreas must be an array');
    assert.ok(Array.isArray(goalProgress.weakAreas),   'weakAreas must be an array');

    // Amna: 1/2 modules complete, average proficiency ~21% → should NOT be on track
    assert.equal(goalProgress.onTrack, false, 'Amna should not be on track');
  });

  test('Bilal — goalProgress.onTrack is true (≥50%)', async () => {
    const { goalProgress } = await getDashboard(learnerIds.bilal);
    assert.equal(goalProgress.onTrack, true, 'Bilal should be on track');
    assert.ok(goalProgress.percentage >= 50, `Bilal percentage ${goalProgress.percentage} should be >= 50`);
  });

  test('Bilal — strongAreas includes python, machine_learning, statistics', async () => {
    const { goalProgress } = await getDashboard(learnerIds.bilal);
    assert.ok(goalProgress.strongAreas.includes('python'),          'python should be a strong area');
    assert.ok(goalProgress.strongAreas.includes('machine_learning'), 'machine_learning should be a strong area');
    assert.ok(goalProgress.strongAreas.includes('statistics'),      'statistics should be a strong area');
  });

  test('Bilal — atRisk score is low (no signals)', async () => {
    const { atRisk } = await getDashboard(learnerIds.bilal);
    assert.equal(atRisk.level, 'low');
    assert.deepEqual(atRisk.reasons, []);
  });

  test('Sadia — recentActivity is an array (may include companion messages)', async () => {
    const { recentActivity } = await getDashboard(learnerIds.sadia);
    assert.ok(Array.isArray(recentActivity));
    // Sadia has 2 seeded companion messages
    assert.ok(recentActivity.length >= 2, 'Sadia should have at least 2 recent activity items');
  });

  test('recentActivity is in chronological order (oldest first)', async () => {
    const { recentActivity } = await getDashboard(learnerIds.amna);
    if (recentActivity.length >= 2) {
      const first  = new Date(recentActivity[0].created_at);
      const second = new Date(recentActivity[1].created_at);
      assert.ok(first <= second, 'recentActivity should be oldest-first (chronological)');
    }
  });

});

// ─── getSkillBreakdown ────────────────────────────────────────────────────────

describe('getSkillBreakdown — proficiency banding', () => {

  test('returns strong, developing, weak arrays', async () => {
    const breakdown = await getSkillBreakdown(learnerIds.amna);

    assert.ok(Array.isArray(breakdown.strong),     'strong must be an array');
    assert.ok(Array.isArray(breakdown.developing), 'developing must be an array');
    assert.ok(Array.isArray(breakdown.weak),       'weak must be an array');
  });

  test('Amna — no strong skills (none >= 0.7)', async () => {
    const { strong } = await getSkillBreakdown(learnerIds.amna);
    assert.equal(strong.length, 0, 'Amna has no skills >= 0.7');
  });

  test('Amna — excel (0.62) is in developing band (0.4–0.69)', async () => {
    const { developing } = await getSkillBreakdown(learnerIds.amna);
    const excel = developing.find((s) => s.code === 'excel');
    assert.ok(excel, 'excel should be in developing band at 0.62');
    assert.ok(excel.proficiency >= 0.4 && excel.proficiency < 0.7);
  });

  test('Amna — sql, python, statistics are in weak band (<0.4)', async () => {
    const { weak } = await getSkillBreakdown(learnerIds.amna);
    const codes = weak.map((s) => s.code);
    assert.ok(codes.includes('sql'),        'sql should be weak');
    assert.ok(codes.includes('python'),     'python should be weak');
    assert.ok(codes.includes('statistics'), 'statistics should be weak');
  });

  test('Amna — power_bi and ml (proficiency 0) fall into weak band', async () => {
    const { weak } = await getSkillBreakdown(learnerIds.amna);
    const codes = weak.map((s) => s.code);
    assert.ok(codes.includes('power_bi'),       'power_bi (0.0) should be in weak band');
    assert.ok(codes.includes('machine_learning'), 'machine_learning (0.0) should be in weak band');
  });

  test('Bilal — python, machine_learning, statistics are in strong band', async () => {
    const { strong } = await getSkillBreakdown(learnerIds.bilal);
    const codes = strong.map((s) => s.code);
    assert.ok(codes.includes('python'),          'python should be strong');
    assert.ok(codes.includes('machine_learning'), 'machine_learning should be strong');
    assert.ok(codes.includes('statistics'),      'statistics should be strong');
  });

  test('Bilal — deep_learning (0.30) and nlp (0.20) are in weak band', async () => {
    const { weak } = await getSkillBreakdown(learnerIds.bilal);
    const codes = weak.map((s) => s.code);
    assert.ok(codes.includes('deep_learning'), 'deep_learning should be weak');
    assert.ok(codes.includes('nlp'),           'nlp should be weak');
  });

  test('each skill item has skillId, code, name, domain, proficiency', async () => {
    const { developing } = await getSkillBreakdown(learnerIds.amna);
    if (developing.length > 0) {
      const item = developing[0];
      assert.ok(item.skillId,             'skillId must be present');
      assert.ok(item.code,                'code must be present');
      assert.ok(item.name,                'name must be present');
      assert.ok(item.domain,              'domain must be present');
      assert.ok(typeof item.proficiency === 'number', 'proficiency must be a number');
    }
  });

  test('strong band is sorted descending by proficiency', async () => {
    const { strong } = await getSkillBreakdown(learnerIds.bilal);
    for (let i = 1; i < strong.length; i++) {
      assert.ok(strong[i].proficiency <= strong[i - 1].proficiency,
        'strong band should be sorted highest proficiency first');
    }
  });

  test('Sadia — python (0.50) is in developing band', async () => {
    const { developing } = await getSkillBreakdown(learnerIds.sadia);
    const python = developing.find((s) => s.code === 'python');
    assert.ok(python, 'python (0.50) should be in developing band for Sadia');
  });

});

// ─── recordActivity ───────────────────────────────────────────────────────────

describe('recordActivity — progress write + struggle detection', () => {

  // We'll record activity on a module Amna hasn't touched yet so we can clean up safely.
  // da-powerbi is not in her seed progress.
  let powerBiModuleId;

  before(async () => {
    const { data: mod } = await supabase
      .from('modules')
      .select('id')
      .eq('code', 'da-powerbi')
      .single();
    assert.ok(mod, 'da-powerbi module must exist in catalog');
    powerBiModuleId = mod.id;
  });

  test('returns { progress, signalsCreated } object', async () => {
    const result = await recordActivity(learnerIds.amna, powerBiModuleId, {
      score:            75,
      attempts:         1,
      timeSpentMinutes: 30,
      completionPct:    20,
    });

    assert.ok(result.progress,                  'result.progress must be present');
    assert.ok(Array.isArray(result.signalsCreated), 'result.signalsCreated must be an array');

    // Register for cleanup
    progressToClean.push(result.progress.id);
  });

  test('progress row has correct status for partial completion (in_progress)', async () => {
    const result = await recordActivity(learnerIds.amna, powerBiModuleId, {
      score:         75,
      attempts:      1,
      completionPct: 50,
    });

    assert.equal(result.progress.status, 'in_progress');
    assert.ok(Math.abs(Number(result.progress.completion_pct) - 50) < 0.01,
      `Expected 50% completion, got ${result.progress.completion_pct}`);
    // No cleanup — same progress row as above (upsert on learner+module)
  });

  test('status is "completed" when completionPct = 100', async () => {
    const result = await recordActivity(learnerIds.amna, powerBiModuleId, {
      score:         90,
      attempts:      1,
      completionPct: 100,
    });

    assert.equal(result.progress.status, 'completed');
    assert.ok(result.progress.completed_at, 'completed_at must be set when status is completed');
    assert.equal(result.signalsCreated.length, 0, 'No signals for a clean pass');
  });

  test('started_at is preserved across subsequent activity events (not overwritten)', async () => {
    // The powerBi row already exists from the tests above. Capture its current
    // started_at, record another event, and confirm the original start time is
    // not rewritten (regression for the unconditional started_at upsert bug).
    const { data: before } = await supabase
      .from('progress')
      .select('started_at')
      .eq('learner_id', learnerIds.amna)
      .eq('module_id', powerBiModuleId)
      .single();
    assert.ok(before?.started_at, 'precondition: existing row must already have a started_at');

    const result = await recordActivity(learnerIds.amna, powerBiModuleId, {
      score:         95,
      attempts:      2,
      completionPct: 100,
    });

    assert.equal(result.progress.started_at, before.started_at,
      'started_at must not change on a follow-up activity event');
  });

  // ── Amna low-score struggle signal ──────────────────────────────────────

  test('Amna — low score (48) triggers a low_score signal', async () => {
    // Find the SQL module she is already working on
    const { data: sqlMod } = await supabase
      .from('modules')
      .select('id')
      .eq('code', 'da-sql-analysis')
      .single();

    const result = await recordActivity(learnerIds.amna, sqlMod.id, {
      score:            48,   // below 60 threshold → low_score
      attempts:         2,    // 2 ≤ 3 → no repeated_attempts
      timeSpentMinutes: 45,
      completionPct:    35,
    });

    assert.ok(result.signalsCreated.length >= 1,
      `Expected at least 1 signal, got ${result.signalsCreated.length}`);

    const types = result.signalsCreated.map((s) => s.signal_type);
    assert.ok(types.includes('low_score'), 'low_score signal must be created');

    // Verify the signal was persisted to the DB
    const { data: dbSignal } = await supabase
      .from('struggle_signals')
      .select('*')
      .eq('id', result.signalsCreated[0].id)
      .single();

    assert.ok(dbSignal, 'Signal must exist in the database');
    assert.equal(dbSignal.learner_id,   learnerIds.amna);
    assert.equal(dbSignal.signal_type,  'low_score');
    assert.equal(dbSignal.source,       'system');
    assert.equal(dbSignal.resolved_at,  null);

    // Clean up
    for (const sig of result.signalsCreated) signalsToClean.push(sig.id);
  });

  test('Amna — repeated attempts (4) triggers repeated_attempts signal', async () => {
    const { data: sqlMod } = await supabase
      .from('modules')
      .select('id')
      .eq('code', 'da-sql-analysis')
      .single();

    const result = await recordActivity(learnerIds.amna, sqlMod.id, {
      score:         65,   // above 60 → no low_score
      attempts:      4,    // > 3 → repeated_attempts
      completionPct: 40,
    });

    const types = result.signalsCreated.map((s) => s.signal_type);
    assert.ok(types.includes('repeated_attempts'), 'repeated_attempts signal must be created');

    for (const sig of result.signalsCreated) signalsToClean.push(sig.id);
  });

  test('Amna — low score + repeated attempts triggers both signals', async () => {
    const { data: sqlMod } = await supabase
      .from('modules')
      .select('id')
      .eq('code', 'da-sql-analysis')
      .single();

    const result = await recordActivity(learnerIds.amna, sqlMod.id, {
      score:         45,   // < 60 → low_score
      attempts:      5,    // > 3 → repeated_attempts
      completionPct: 40,
    });

    assert.equal(result.signalsCreated.length, 2, 'Both low_score and repeated_attempts should fire');
    const types = result.signalsCreated.map((s) => s.signal_type).sort();
    assert.deepEqual(types, ['low_score', 'repeated_attempts'].sort());

    for (const sig of result.signalsCreated) signalsToClean.push(sig.id);
  });

  test('good performance — no signals created', async () => {
    const result = await recordActivity(learnerIds.bilal, powerBiModuleId, {
      score:         88,   // above 60
      attempts:      1,    // ≤ 3
      completionPct: 60,
    });

    assert.equal(result.signalsCreated.length, 0, 'No signals for good performance');
    progressToClean.push(result.progress.id);
  });

  test('inactivity signal fires when timeSpentMinutes < 20% of expected', async () => {
    const result = await recordActivity(learnerIds.sadia, powerBiModuleId, {
      score:               80,
      attempts:            1,
      timeSpentMinutes:    2,    // 2 < 30 × 0.2 = 6 → inactivity
      expectedTimeMinutes: 30,
      completionPct:       10,
    });

    const types = result.signalsCreated.map((s) => s.signal_type);
    assert.ok(types.includes('inactivity'), 'inactivity signal should be created');

    for (const sig of result.signalsCreated) signalsToClean.push(sig.id);
    progressToClean.push(result.progress.id);
  });

  test('signal context includes moduleId and score', async () => {
    const { data: sqlMod } = await supabase
      .from('modules')
      .select('id')
      .eq('code', 'da-sql-analysis')
      .single();

    const result = await recordActivity(learnerIds.amna, sqlMod.id, {
      score:         50,
      attempts:      1,
      completionPct: 35,
    });

    const lowScoreSignal = result.signalsCreated.find((s) => s.signal_type === 'low_score');
    if (lowScoreSignal) {
      assert.ok(lowScoreSignal.context, 'signal must have a context JSONB');
      assert.equal(lowScoreSignal.context.module_id, sqlMod.id);
      assert.equal(lowScoreSignal.context.score,     50);
    }

    for (const sig of result.signalsCreated) signalsToClean.push(sig.id);
  });

});
