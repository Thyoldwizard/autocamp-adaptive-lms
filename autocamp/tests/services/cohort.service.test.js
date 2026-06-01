'use strict';

/**
 * cohort.service integration tests.
 *
 * Pre-conditions:
 *   - .env with valid Supabase credentials
 *   - `npm run seed` run (Amna → da-2026-spring, Bilal → ai-2026-spring,
 *                          Sadia → auto-2026-spring)
 *
 * Run: node --test tests/services/cohort.service.test.js
 *
 * Test strategy
 * ─────────────
 * Each seeded persona is in a different cohort (one learner each).  We verify
 * the service correctly classifies each cohort independently.
 *
 * For the "Amna + Sadia but not Bilal" requirement, we run getAtRiskList on
 * all three cohorts and assert:
 *   da-2026-spring   → Amna   IS flagged  (missed_deadline signal)
 *   auto-2026-spring → Sadia  IS flagged  (low_score signal)
 *   ai-2026-spring   → Bilal  NOT flagged (no signals)
 */

require('dotenv').config();

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../../src/config/supabase');
const {
  getCohortOverview,
  getAtRiskList,
  getStruggleHeatmap,
  addInstructorFlag,
} = require('../../src/services/cohort.service');

// ─── Persona / cohort lookup ──────────────────────────────────────────────────

const COHORTS = {
  amna:  'da-2026-spring',
  bilal: 'ai-2026-spring',
  sadia: 'auto-2026-spring',
};

const EMAILS = {
  amna:  'amna.malik@pace.test',
  bilal: 'bilal.ahmed@pace.test',
  sadia: 'sadia.hussain@pace.test',
};

const learnerIds  = {};
const flagsToClean = [];  // instructor_flag signal IDs created during tests

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
  if (flagsToClean.length) {
    await supabase.from('struggle_signals').delete().in('id', flagsToClean);
  }
});

// ─── getCohortOverview ────────────────────────────────────────────────────────

describe('getCohortOverview — shape and structure', () => {

  test('returns all five top-level keys', async () => {
    const overview = await getCohortOverview(COHORTS.amna);

    assert.ok('cohort'              in overview, 'cohort key required');
    assert.ok('totalLearners'       in overview, 'totalLearners key required');
    assert.ok('atRiskCounts'        in overview, 'atRiskCounts key required');
    assert.ok('averageGoalProgress' in overview, 'averageGoalProgress key required');
    assert.ok(Array.isArray(overview.learners),  'learners must be an array');
  });

  test('cohort string echoed back correctly', async () => {
    const overview = await getCohortOverview(COHORTS.amna);
    assert.equal(overview.cohort, COHORTS.amna);
  });

  test('Amna\'s cohort has 1 learner', async () => {
    const overview = await getCohortOverview(COHORTS.amna);
    assert.ok(overview.totalLearners >= 1);
    assert.ok(overview.learners.length >= 1);
  });

  test('each learner summary has learnerId, name, atRisk, goalProgress, nextBestAction', async () => {
    const overview = await getCohortOverview(COHORTS.amna);
    const summary  = overview.learners[0];

    assert.ok(summary.learnerId,      'learnerId required');
    assert.ok(summary.name,           'name required');
    assert.ok(summary.atRisk,         'atRisk required');
    assert.ok(summary.goalProgress,   'goalProgress required');
    assert.ok('nextBestAction' in summary, 'nextBestAction key required (may be null)');
  });

  test('Amna\'s summary has correct name', async () => {
    const overview = await getCohortOverview(COHORTS.amna);
    assert.equal(overview.learners[0].name, 'Amna Malik');
  });

  test('atRiskCounts has all four level keys', async () => {
    const { atRiskCounts } = await getCohortOverview(COHORTS.amna);
    assert.ok('low'      in atRiskCounts, 'low required');
    assert.ok('medium'   in atRiskCounts, 'medium required');
    assert.ok('high'     in atRiskCounts, 'high required');
    assert.ok('critical' in atRiskCounts, 'critical required');
  });

  test('averageGoalProgress is a number between 0 and 100', async () => {
    const { averageGoalProgress } = await getCohortOverview(COHORTS.amna);
    assert.ok(typeof averageGoalProgress === 'number', 'must be a number');
    assert.ok(averageGoalProgress >= 0 && averageGoalProgress <= 100,
      `must be 0–100, got ${averageGoalProgress}`);
  });

  test('empty cohort returns zero counts and empty learners array', async () => {
    const overview = await getCohortOverview('nonexistent-cohort-xyz');
    assert.equal(overview.totalLearners, 0);
    assert.equal(overview.learners.length, 0);
    assert.equal(overview.averageGoalProgress, 0);
    assert.equal(overview.atRiskCounts.low,      0);
    assert.equal(overview.atRiskCounts.medium,   0);
    assert.equal(overview.atRiskCounts.high,     0);
    assert.equal(overview.atRiskCounts.critical, 0);
  });

  test('Bilal\'s cohort — averageGoalProgress is on track (>= 50)', async () => {
    const { averageGoalProgress } = await getCohortOverview(COHORTS.bilal);
    assert.ok(averageGoalProgress >= 50,
      `Bilal's cohort average should be >= 50, got ${averageGoalProgress}`);
  });

});

// ─── getAtRiskList — Amna IS flagged, Sadia IS flagged, Bilal NOT flagged ────

describe('getAtRiskList — at-risk filtering', () => {

  test('returns cohort, totalLearners, requiresAction, atRiskCounts, learners', async () => {
    const result = await getAtRiskList(COHORTS.amna);

    assert.ok('cohort'         in result, 'cohort required');
    assert.ok('totalLearners'  in result, 'totalLearners required');
    assert.ok('requiresAction' in result, 'requiresAction required');
    assert.ok('atRiskCounts'   in result, 'atRiskCounts required');
    assert.ok(Array.isArray(result.learners), 'learners must be an array');
  });

  test('Amna — IS in the at-risk list (has a missed_deadline signal)', async () => {
    const result = await getAtRiskList(COHORTS.amna);
    // Amna has a missed_deadline signal → should appear
    assert.ok(result.totalLearners >= 1,
      `Expected Amna to be flagged, got ${result.totalLearners} at-risk learners`);
    const amna = result.learners.find((l) => l.learnerId === learnerIds.amna);
    assert.ok(amna, 'Amna must appear in the at-risk list');
    assert.ok(['medium', 'high', 'critical'].includes(amna.atRisk.level),
      `Amna's atRisk level should be medium/high/critical, got: ${amna.atRisk.level}`);
  });

  test('Sadia — IS in the at-risk list (has a low_score signal)', async () => {
    const result = await getAtRiskList(COHORTS.sadia);
    assert.ok(result.totalLearners >= 1,
      `Expected Sadia to be flagged, got ${result.totalLearners} at-risk learners`);
    const sadia = result.learners.find((l) => l.learnerId === learnerIds.sadia);
    assert.ok(sadia, 'Sadia must appear in the at-risk list');
    assert.ok(['medium', 'high', 'critical'].includes(sadia.atRisk.level),
      `Sadia's atRisk level should be medium/high/critical, got: ${sadia.atRisk.level}`);
  });

  test('Bilal — NOT in the at-risk list (no struggle signals)', async () => {
    const result = await getAtRiskList(COHORTS.bilal);
    // Bilal has no signals → atRisk level is low → excluded from list
    assert.equal(result.totalLearners, 0,
      `Expected Bilal to NOT be flagged; got ${result.totalLearners} at-risk learners`);
    assert.equal(result.learners.length, 0);
  });

  test('Bilal — requiresAction is false (no high/critical learners)', async () => {
    const { requiresAction } = await getAtRiskList(COHORTS.bilal);
    assert.equal(requiresAction, false);
  });

  test('only medium/high/critical learners appear — no low-risk learners', async () => {
    // Test all three cohorts
    for (const cohort of Object.values(COHORTS)) {
      const result = await getAtRiskList(cohort);
      for (const learner of result.learners) {
        assert.ok(
          ['medium', 'high', 'critical'].includes(learner.atRisk.level),
          `Learner ${learner.name} has level "${learner.atRisk.level}" but should be medium/high/critical`,
        );
      }
    }
  });

  test('requiresAction is true only when at least one learner is high or critical', async () => {
    // For cohorts with only medium learners, requiresAction should be false
    const amnaResult = await getAtRiskList(COHORTS.amna);
    if (amnaResult.learners.length > 0) {
      const hasHighOrCritical = amnaResult.learners.some((l) =>
        ['high', 'critical'].includes(l.atRisk.level),
      );
      assert.equal(amnaResult.requiresAction, hasHighOrCritical,
        'requiresAction must match presence of high/critical learners');
    }
  });

  test('empty cohort returns empty result with requiresAction false', async () => {
    const result = await getAtRiskList('nonexistent-cohort-xyz');
    assert.equal(result.totalLearners, 0);
    assert.equal(result.requiresAction, false);
    assert.equal(result.learners.length, 0);
  });

});

// ─── getStruggleHeatmap ───────────────────────────────────────────────────────

describe('getStruggleHeatmap — skill aggregation', () => {

  test('returns cohort and skills array', async () => {
    const heatmap = await getStruggleHeatmap(COHORTS.amna);
    assert.ok('cohort' in heatmap,          'cohort key required');
    assert.ok(Array.isArray(heatmap.skills), 'skills must be an array');
  });

  test('Amna\'s cohort heatmap has at least 6 skill rows (Amna has 6 skills seeded)', async () => {
    const { skills } = await getStruggleHeatmap(COHORTS.amna);
    assert.ok(skills.length >= 6,
      `Expected >= 6 skills in heatmap, got ${skills.length}`);
  });

  test('each skill row has required fields', async () => {
    const { skills } = await getStruggleHeatmap(COHORTS.amna);
    const s = skills[0];
    assert.ok(s.skillId,                            'skillId required');
    assert.ok(s.skillCode,                           'skillCode required');
    assert.ok(s.skillName,                           'skillName required');
    assert.ok(typeof s.averageProficiency === 'number', 'averageProficiency must be number');
    assert.ok(typeof s.learnersStruggling === 'number', 'learnersStruggling must be number');
    assert.ok(typeof s.learnersStrong     === 'number', 'learnersStrong must be number');
  });

  test('SQL shows as a weak cohort skill in da-2026-spring (Amna: sql proficiency 0.20)', async () => {
    const { skills } = await getStruggleHeatmap(COHORTS.amna);
    const sqlSkill = skills.find((s) => s.skillCode === 'sql');
    assert.ok(sqlSkill, 'sql skill must appear in da-2026-spring heatmap');
    assert.ok(sqlSkill.averageProficiency < 0.4,
      `SQL average proficiency should be < 0.4 (weak), got ${sqlSkill.averageProficiency}`);
    assert.ok(sqlSkill.learnersStruggling >= 1,
      'At least 1 learner should be struggling with SQL');
  });

  test('SQL appears near the top (weakest cohort skills first, ascending)', async () => {
    const { skills } = await getStruggleHeatmap(COHORTS.amna);
    // Verify the array is sorted ascending by averageProficiency
    for (let i = 1; i < skills.length; i++) {
      assert.ok(
        skills[i].averageProficiency >= skills[i - 1].averageProficiency,
        `Skills not sorted ascending: ${skills[i - 1].skillCode}(${skills[i - 1].averageProficiency}) > ${skills[i].skillCode}(${skills[i].averageProficiency})`,
      );
    }
    // SQL (0.20) must not be last — it should be weaker than most skills
    const sqlIdx = skills.findIndex((s) => s.skillCode === 'sql');
    assert.ok(sqlIdx < skills.length - 1,
      `SQL (idx ${sqlIdx}) should not be at the end of ${skills.length} skills (it's weak, not the weakest or strongest)`);
    // Confirm SQL is weaker than excel in the sorted order
    const excelIdx = skills.findIndex((s) => s.skillCode === 'excel');
    assert.ok(sqlIdx < excelIdx,
      `SQL (idx ${sqlIdx}) should appear before excel (idx ${excelIdx}) in ascending order`);
  });

  test('excel appears in stronger cohort skills than sql (Amna: excel 0.62 > sql 0.20)', async () => {
    const { skills } = await getStruggleHeatmap(COHORTS.amna);
    const sqlSkill   = skills.find((s) => s.skillCode === 'sql');
    const excelSkill = skills.find((s) => s.skillCode === 'excel');
    assert.ok(sqlSkill,   'sql must be in heatmap');
    assert.ok(excelSkill, 'excel must be in heatmap');
    assert.ok(
      excelSkill.averageProficiency > sqlSkill.averageProficiency,
      `excel (${excelSkill.averageProficiency}) should be stronger than sql (${sqlSkill.averageProficiency})`,
    );
  });

  test('Bilal\'s cohort has python in learnersStrong (proficiency 0.85)', async () => {
    const { skills } = await getStruggleHeatmap(COHORTS.bilal);
    const python = skills.find((s) => s.skillCode === 'python');
    assert.ok(python, 'python must appear in ai-2026-spring heatmap');
    assert.ok(python.learnersStrong >= 1,
      `Expected python to have >= 1 strong learner, got ${python.learnersStrong}`);
    assert.ok(python.learnersStruggling === 0,
      `Expected 0 struggling with python for Bilal, got ${python.learnersStruggling}`);
  });

  test('empty cohort returns empty skills array', async () => {
    const heatmap = await getStruggleHeatmap('nonexistent-cohort-xyz');
    assert.equal(heatmap.cohort, 'nonexistent-cohort-xyz');
    assert.deepEqual(heatmap.skills, []);
  });

});

// ─── addInstructorFlag ────────────────────────────────────────────────────────

describe('addInstructorFlag — manual instructor signal', () => {

  const FAKE_INSTRUCTOR_ID = '00000000-dead-beef-cafe-000000000001';
  const TEST_NOTE = 'Integration test flag — safe to delete';

  test('creates a signal with source=instructor and type=instructor_flag', async () => {
    const signal = await addInstructorFlag(
      learnerIds.amna,
      FAKE_INSTRUCTOR_ID,
      TEST_NOTE,
    );

    assert.ok(signal.id,                         'signal must have an id');
    assert.equal(signal.learner_id,   learnerIds.amna);
    assert.equal(signal.signal_type,  'instructor_flag');
    assert.equal(signal.source,       'instructor');
    assert.equal(signal.severity,     'medium');
    assert.equal(signal.notes,        TEST_NOTE);
    assert.equal(signal.resolved_at,  null);

    flagsToClean.push(signal.id);
  });

  test('signal is persisted to the database (can be retrieved)', async () => {
    const signal = await addInstructorFlag(
      learnerIds.bilal,
      FAKE_INSTRUCTOR_ID,
      'DB persistence check',
    );

    const { data: dbRow } = await supabase
      .from('struggle_signals')
      .select('*')
      .eq('id', signal.id)
      .single();

    assert.ok(dbRow,                        'signal must exist in DB');
    assert.equal(dbRow.source, 'instructor', 'source must be instructor in DB');
    assert.equal(dbRow.signal_type, 'instructor_flag');

    flagsToClean.push(signal.id);
  });

  test('context includes flagged_by (instructorId) and flagged_at timestamp', async () => {
    const signal = await addInstructorFlag(
      learnerIds.sadia,
      FAKE_INSTRUCTOR_ID,
      'Context field check',
    );

    assert.ok(signal.context,                        'context must be present');
    assert.equal(signal.context.flagged_by, FAKE_INSTRUCTOR_ID,
      'context.flagged_by must equal instructorId');
    assert.ok(signal.context.flagged_at,             'context.flagged_at must be set');

    flagsToClean.push(signal.id);
  });

  test('notes field is stored and returned', async () => {
    const customNote = 'Learner missed three live sessions — follow up needed';
    const signal = await addInstructorFlag(
      learnerIds.amna,
      FAKE_INSTRUCTOR_ID,
      customNote,
    );

    assert.equal(signal.notes, customNote);
    flagsToClean.push(signal.id);
  });

  test('throws when learnerId is missing', async () => {
    await assert.rejects(
      () => addInstructorFlag(null, FAKE_INSTRUCTOR_ID, 'test'),
      /learnerId is required/,
    );
  });

  test('throws when instructorId is missing', async () => {
    await assert.rejects(
      () => addInstructorFlag(learnerIds.amna, null, 'test'),
      /instructorId is required/,
    );
  });

  test('throws when note is missing', async () => {
    await assert.rejects(
      () => addInstructorFlag(learnerIds.amna, FAKE_INSTRUCTOR_ID, ''),
      /note is required/,
    );
  });

  test('addInstructorFlag shows up in getAtRiskList after flag (bumps score)', async () => {
    // Bilal has no signals. Adding an instructor_flag should make him appear at-risk.
    const signal = await addInstructorFlag(
      learnerIds.bilal,
      FAKE_INSTRUCTOR_ID,
      'Test: does flag raise at-risk level?',
    );
    flagsToClean.push(signal.id);

    const result = await getAtRiskList(COHORTS.bilal);
    const bilalEntry = result.learners.find((l) => l.learnerId === learnerIds.bilal);
    // instructor_flag (30 base × 1.5 recent = 45) → medium band → should now appear
    assert.ok(bilalEntry,
      'Bilal should appear in at-risk list after an instructor_flag is added');
    assert.ok(['medium', 'high', 'critical'].includes(bilalEntry.atRisk.level),
      `Expected medium/high/critical after flag, got: ${bilalEntry.atRisk.level}`);
  });

});
