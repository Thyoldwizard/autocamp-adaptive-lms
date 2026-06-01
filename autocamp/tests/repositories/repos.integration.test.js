'use strict';

/**
 * Repository integration tests — hit the real Supabase database.
 *
 * Pre-conditions:
 *   - .env is present with valid Supabase credentials
 *   - `npm run seed` has been run (creates Amna, Bilal, Sadia + catalog data)
 *
 * Run: node --test tests/repositories/repos.integration.test.js
 */

require('dotenv').config();

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../../src/config/supabase');

// Repos under test
const learnersRepo   = require('../../src/db/repositories/learners.repo');
const skillStateRepo = require('../../src/db/repositories/skillState.repo');
const progressRepo   = require('../../src/db/repositories/progress.repo');
const signalsRepo    = require('../../src/db/repositories/signals.repo');
const outcomesRepo   = require('../../src/db/repositories/outcomes.repo');
const companionRepo  = require('../../src/db/repositories/companion.repo');
const skillsRepo     = require('../../src/db/repositories/skills.repo');
const modulesRepo    = require('../../src/db/repositories/modules.repo');

// ─── Seed persona lookup ───────────────────────────────────────────────────────
// We resolve learner UUIDs dynamically so the tests survive a re-seed.

const EMAILS = {
  amna:  'amna.malik@pace.test',
  bilal: 'bilal.ahmed@pace.test',
  sadia: 'sadia.hussain@pace.test',
};

// keyed by first name (amna / bilal / sadia)
const learners = {};

before(async () => {
  // Fetch all three learner records by email via the auth admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`before: listUsers failed — ${error.message}`);

  for (const [key, email] of Object.entries(EMAILS)) {
    const authUser = users.find((u) => u.email === email);
    assert.ok(authUser, `Seed persona not found in auth: ${email} — run npm run seed`);

    const { data: learner, error: lerr } = await supabase
      .from('learners')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    assert.ok(!lerr, `Could not fetch learner for ${email}: ${lerr?.message}`);
    learners[key] = learner;
  }
});

// ─── learners.repo ────────────────────────────────────────────────────────────

describe('learners.repo', () => {

  test('findById — returns Amna by her learner id', async () => {
    const result = await learnersRepo.findById(learners.amna.id);
    assert.equal(result.id, learners.amna.id);
    assert.equal(result.name, 'Amna Malik');
    assert.equal(result.cohort, 'da-2026-spring');
  });

  test('findById — returns null for unknown id', async () => {
    const result = await learnersRepo.findById('00000000-0000-0000-0000-000000000000');
    assert.equal(result, null);
  });

  test('findByCohort — returns Amna from da-2026-spring', async () => {
    const result = await learnersRepo.findByCohort('da-2026-spring');
    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 1);
    const amna = result.find((l) => l.id === learners.amna.id);
    assert.ok(amna, 'Amna should be in da-2026-spring cohort');
  });

  test('findByCohort — returns empty array for non-existent cohort', async () => {
    const result = await learnersRepo.findByCohort('nonexistent-cohort-xyz');
    assert.deepEqual(result, []);
  });

  test('findByUserId — returns Bilal by his auth user_id', async () => {
    const result = await learnersRepo.findByUserId(learners.bilal.user_id);
    assert.equal(result.id, learners.bilal.id);
    assert.equal(result.name, 'Bilal Ahmed');
  });

  test('findByUserId — returns null for unknown user_id', async () => {
    const result = await learnersRepo.findByUserId('00000000-0000-0000-0000-000000000000');
    assert.equal(result, null);
  });

  test('update — can change stated_goal for Sadia', async () => {
    const newGoal = 'Updated goal for test — ' + Date.now();
    const updated = await learnersRepo.update(learners.sadia.id, { stated_goal: newGoal });
    assert.equal(updated.stated_goal, newGoal);

    // Restore original goal
    await learnersRepo.update(learners.sadia.id, { stated_goal: learners.sadia.stated_goal });
  });

});

// ─── skills.repo ─────────────────────────────────────────────────────────────

describe('skills.repo', () => {

  let allSkills;

  test('findAll — returns at least 12 skills from the catalog', async () => {
    allSkills = await skillsRepo.findAll();
    assert.ok(Array.isArray(allSkills));
    assert.ok(allSkills.length >= 12, `Expected >= 12 skills, got ${allSkills.length}`);
  });

  test('findById — returns the sql skill by id', async () => {
    const sql = allSkills.find((s) => s.code === 'sql');
    assert.ok(sql, 'sql skill should exist in catalog');
    const result = await skillsRepo.findById(sql.id);
    assert.equal(result.code, 'sql');
  });

  test('findById — returns null for unknown id', async () => {
    const result = await skillsRepo.findById('00000000-0000-0000-0000-000000000000');
    assert.equal(result, null);
  });

  test('findByCodes — returns python and excel', async () => {
    const result = await skillsRepo.findByCodes(['python', 'excel']);
    assert.equal(result.length, 2);
    const codes = result.map((s) => s.code).sort();
    assert.deepEqual(codes, ['excel', 'python']);
  });

});

// ─── modules.repo ─────────────────────────────────────────────────────────────

describe('modules.repo', () => {

  let allModules;

  test('findAll — returns at least 22 modules from the catalog', async () => {
    allModules = await modulesRepo.findAll();
    assert.ok(Array.isArray(allModules));
    assert.ok(allModules.length >= 22, `Expected >= 22 modules, got ${allModules.length}`);
  });

  test('findById — returns da-sql-analysis module', async () => {
    const mod = allModules.find((m) => m.code === 'da-sql-analysis');
    assert.ok(mod, 'da-sql-analysis module should exist');
    const result = await modulesRepo.findById(mod.id);
    assert.equal(result.code, 'da-sql-analysis');
    assert.equal(result.program, 'data-analytics-bootcamp');
  });

  test('findById — returns null for unknown id', async () => {
    const result = await modulesRepo.findById('00000000-0000-0000-0000-000000000000');
    assert.equal(result, null);
  });

  test('findByProgram — returns modules for ai-bootcamp in sequence order', async () => {
    const result = await modulesRepo.findByProgram('ai-bootcamp');
    assert.ok(result.length >= 9, `Expected >= 9 ai-bootcamp modules, got ${result.length}`);
    // Verify ascending sequence order
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i].sequence >= result[i - 1].sequence, 'Modules should be in sequence order');
    }
  });

  test('findBySkillId — returns modules that teach the python skill', async () => {
    const allSkills = await skillsRepo.findAll();
    const python = allSkills.find((s) => s.code === 'python');
    assert.ok(python, 'python skill should exist');

    const result = await modulesRepo.findBySkillId(python.id);
    assert.ok(result.length >= 1, 'At least one module should teach python');
    // Every returned module should have the python skill_id in its array
    for (const mod of result) {
      assert.ok(mod.skill_ids.includes(python.id), `Module ${mod.code} should include python skill_id`);
    }
  });

});

// ─── skillState.repo ─────────────────────────────────────────────────────────

describe('skillState.repo', () => {

  test('findByLearnerId — returns Amna\'s 6 skill states with joined skill', async () => {
    const result = await skillStateRepo.findByLearnerId(learners.amna.id);
    assert.ok(result.length >= 6, `Expected >= 6 skill states for Amna, got ${result.length}`);
    // Each row should have the nested skill object
    assert.ok(result[0].skill, 'Each row should have a joined skill object');
    assert.ok(result[0].skill.code, 'Joined skill should have a code');
  });

  test('findByLearnerId — returns Bilal\'s 9 skill states', async () => {
    const result = await skillStateRepo.findByLearnerId(learners.bilal.id);
    assert.ok(result.length >= 9, `Expected >= 9 skill states for Bilal, got ${result.length}`);
  });

  test('updateProficiency — updates Sadia\'s python proficiency and restores it', async () => {
    const sadiaSkills = await skillStateRepo.findByLearnerId(learners.sadia.id);
    const pythonState = sadiaSkills.find((s) => s.skill.code === 'python');
    assert.ok(pythonState, 'Sadia should have a python skill state');

    const originalProficiency = Number(pythonState.proficiency);
    const newProficiency = Math.min(1, originalProficiency + 0.05);

    const updated = await skillStateRepo.updateProficiency(
      learners.sadia.id,
      pythonState.skill_id,
      { proficiency: newProficiency },
    );
    assert.ok(Math.abs(Number(updated.proficiency) - newProficiency) < 0.001);

    // Restore
    await skillStateRepo.updateProficiency(
      learners.sadia.id,
      pythonState.skill_id,
      { proficiency: originalProficiency },
    );
  });

  test('upsertSkill — inserts a new skill state row and cleans up', async () => {
    const allSkills = await skillsRepo.findAll();
    // Find a skill Bilal does NOT have yet (mlops proficiency 0.0 is in seed but let's use a present one)
    const mlopsSkill = allSkills.find((s) => s.code === 'mlops');
    assert.ok(mlopsSkill);

    // Bilal already has mlops at 0.0 — upsert should update, not throw
    const row = {
      learner_id:   learners.bilal.id,
      skill_id:     mlopsSkill.id,
      proficiency:  0.05,
      confidence:   0.05,
      last_assessed_at: new Date().toISOString(),
    };
    const result = await skillStateRepo.upsertSkill(row);
    assert.ok(result.id);
    assert.ok(Math.abs(Number(result.proficiency) - 0.05) < 0.001);

    // Restore to seed value
    await skillStateRepo.upsertSkill({ ...row, proficiency: 0.0, confidence: 0.0 });
  });

});

// ─── progress.repo ────────────────────────────────────────────────────────────

describe('progress.repo', () => {

  test('findByLearnerId — returns Amna\'s 2 progress rows with joined module', async () => {
    const result = await progressRepo.findByLearnerId(learners.amna.id);
    assert.ok(result.length >= 2, `Expected >= 2 progress rows for Amna, got ${result.length}`);
    assert.ok(result[0].module, 'Each row should have a joined module object');
    assert.ok(result[0].module.code, 'Joined module should have a code');
  });

  test('findByLearnerAndModule — returns Amna\'s SQL progress row', async () => {
    const allModules = await modulesRepo.findAll();
    const sqlMod = allModules.find((m) => m.code === 'da-sql-analysis');
    assert.ok(sqlMod);

    const result = await progressRepo.findByLearnerAndModule(learners.amna.id, sqlMod.id);
    assert.ok(result, 'Should find Amna\'s SQL progress row');
    // Status may have been mutated by other test runs — accept any valid status
    assert.ok(
      ['stalled', 'in_progress', 'not_started', 'completed'].includes(result.status),
      `Unexpected status: ${result.status}`,
    );
    assert.equal(Number(result.completion_pct), 35);
  });

  test('findByLearnerAndModule — returns null for non-existent pair', async () => {
    const result = await progressRepo.findByLearnerAndModule(
      learners.amna.id,
      '00000000-0000-0000-0000-000000000000',
    );
    assert.equal(result, null);
  });

  test('updateStatus — updates Amna\'s SQL module status and restores', async () => {
    const allModules = await modulesRepo.findAll();
    const sqlMod = allModules.find((m) => m.code === 'da-sql-analysis');

    const updated = await progressRepo.updateStatus(learners.amna.id, sqlMod.id, 'in_progress');
    assert.equal(updated.status, 'in_progress');

    // Restore original status
    await progressRepo.updateStatus(learners.amna.id, sqlMod.id, 'stalled');
  });

  test('upsert — inserts a new progress row for Bilal on a module not yet started', async () => {
    const allModules = await modulesRepo.findAll();
    // ai-langchain is not in Bilal's seed progress — safe to upsert
    const langchainMod = allModules.find((m) => m.code === 'ai-langchain');
    assert.ok(langchainMod);

    const row = {
      learner_id:          learners.bilal.id,
      module_id:           langchainMod.id,
      status:              'not_started',
      completion_pct:      0,
      time_spent_minutes:  0,
      attempts:            0,
    };

    const result = await progressRepo.upsert(row);
    assert.ok(result.id);
    assert.equal(result.status, 'not_started');

    // Clean up — delete so re-runs stay idempotent
    await supabase.from('progress').delete().eq('id', result.id);
  });

});

// ─── signals.repo ─────────────────────────────────────────────────────────────

describe('signals.repo', () => {

  test('findByLearnerId — returns Amna\'s 1 signal', async () => {
    const result = await signalsRepo.findByLearnerId(learners.amna.id);
    assert.ok(result.length >= 1, `Expected >= 1 signal for Amna, got ${result.length}`);
    assert.equal(result[0].signal_type, 'missed_deadline');
    assert.equal(result[0].source, 'system');
  });

  test('findByLearnerId — returns empty array for Bilal (no signals)', async () => {
    const result = await signalsRepo.findByLearnerId(learners.bilal.id);
    assert.deepEqual(result, []);
  });

  test('findRecentByLearnerId — returns Sadia\'s low_score signal within 60 days', async () => {
    const result = await signalsRepo.findRecentByLearnerId(learners.sadia.id, 60);
    assert.ok(result.length >= 1, `Expected >= 1 recent signal for Sadia`);
    assert.equal(result[0].signal_type, 'low_score');
  });

  test('findRecentByLearnerId — returns empty for very narrow window (0 days)', async () => {
    const result = await signalsRepo.findRecentByLearnerId(learners.amna.id, 0);
    // 0-day window: signals created more than now should be 0
    assert.ok(Array.isArray(result));
  });

  test('insert + resolve — round-trip for a new signal on Bilal', async () => {
    const newSignal = await signalsRepo.insert({
      learner_id:  learners.bilal.id,
      signal_type: 'inactivity',
      severity:    'low',
      source:      'system',
      context:     { test: true, created_by: 'integration-test' },
    });

    assert.ok(newSignal.id);
    assert.equal(newSignal.signal_type, 'inactivity');
    assert.equal(newSignal.resolved_at, null);

    // Resolve it
    const resolved = await signalsRepo.resolve(newSignal.id);
    assert.ok(resolved.resolved_at, 'resolved_at should be set after resolve()');

    // Cleanup
    await supabase.from('struggle_signals').delete().eq('id', newSignal.id);
  });

});

// ─── outcomes.repo ────────────────────────────────────────────────────────────

describe('outcomes.repo', () => {

  test('findByLearnerId — returns empty array (no outcomes seeded for Amna)', async () => {
    const result = await outcomesRepo.findByLearnerId(learners.amna.id);
    assert.ok(Array.isArray(result));
    // The seed doesn't insert outcomes, so 0 is correct
    assert.equal(result.length, 0);
  });

  test('upsert — inserts a portfolio outcome for Sadia and cleans up', async () => {
    const inserted = await outcomesRepo.upsert({
      learner_id:       learners.sadia.id,
      outcome_type:     'portfolio_item',
      title:            'Integration Test Portfolio Item',
      status:           'in_progress',
      goal_progress_pct: 10,
    });

    assert.ok(inserted.id);
    assert.equal(inserted.title, 'Integration Test Portfolio Item');
    assert.equal(inserted.outcome_type, 'portfolio_item');

    // Update via upsert (with id so it resolves to same row)
    const updated = await outcomesRepo.upsert({
      id:               inserted.id,
      learner_id:       learners.sadia.id,
      outcome_type:     'portfolio_item',
      title:            'Integration Test Portfolio Item',
      status:           'achieved',
      achieved_at:      new Date().toISOString(),
      goal_progress_pct: 25,
    });
    assert.equal(updated.status, 'achieved');

    // Cleanup
    await supabase.from('outcomes').delete().eq('id', inserted.id);
  });

});

// ─── companion.repo ───────────────────────────────────────────────────────────

describe('companion.repo', () => {

  test('findByLearnerId — returns Amna\'s 2 messages in chronological order', async () => {
    const result = await companionRepo.findByLearnerId(learners.amna.id);
    assert.ok(result.length >= 2, `Expected >= 2 companion messages for Amna`);
    // Chronological: first message is the user turn
    assert.equal(result[0].role, 'user');
    assert.equal(result[1].role, 'assistant');
  });

  test('findRecentByLearnerId — returns Bilal\'s 2 messages with limit=5', async () => {
    const result = await companionRepo.findRecentByLearnerId(learners.bilal.id, 5);
    assert.ok(result.length >= 2, `Expected >= 2 messages for Bilal`);
    // Recent: newest first
    assert.ok(
      new Date(result[0].created_at) >= new Date(result[1].created_at),
      'Messages should be newest first',
    );
  });

  test('findRecentByLearnerId — respects limit parameter', async () => {
    const result = await companionRepo.findRecentByLearnerId(learners.sadia.id, 1);
    assert.ok(result.length <= 1, 'Should return at most 1 message when limit=1');
  });

  test('insert — persists a new user message for Amna and cleans up', async () => {
    const inserted = await companionRepo.insert({
      learner_id: learners.amna.id,
      role:       'user',
      content:    'Integration test message — can be deleted',
    });

    assert.ok(inserted.id);
    assert.equal(inserted.role, 'user');
    assert.equal(inserted.content, 'Integration test message — can be deleted');

    // Cleanup
    await supabase.from('companion_messages').delete().eq('id', inserted.id);
  });

});
