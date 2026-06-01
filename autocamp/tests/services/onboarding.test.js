'use strict';

/**
 * Tests for onboarding.service (B11).
 * - Idempotency: second completeOnboarding call is a no-op
 * - Learner-not-found → 404
 * - No skills in program → returns model without writing
 *
 * Run: node --test tests/services/onboarding.test.js
 */

// ── Env stubs ─────────────────────────────────────────────────────────────────
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// ── Mock state ────────────────────────────────────────────────────────────────

const LEARNER_ID = 'learner-uuid-onboarding';

let mockSkillState     = [];   // simulates existing skill_state rows
let upsertCallCount    = 0;
let mockLearner        = {
  id:              LEARNER_ID,
  program:         'data-analytics-bootcamp',
  background_type: 'non_technical',
  enrolled_at:     '2026-01-01T00:00:00Z',
};
let mockModules        = [
  { skill_ids: ['skill-uuid-sql', 'skill-uuid-python'] },
];
let mockSkillRows      = [
  { id: 'skill-uuid-sql',    code: 'sql' },
  { id: 'skill-uuid-python', code: 'python' },
];
let mockLearnerModel   = { learner: mockLearner, analysis: {} };

// ── Inject mocks ──────────────────────────────────────────────────────────────

require.cache[require.resolve('../../src/db/repositories/skillState.repo')] = {
  id:       require.resolve('../../src/db/repositories/skillState.repo'),
  filename: require.resolve('../../src/db/repositories/skillState.repo'),
  loaded:   true,
  exports: {
    findByLearnerId: async () => mockSkillState,
    upsertSkill:     async (row) => { upsertCallCount++; return row; },
  },
};

require.cache[require.resolve('../../src/db/repositories/learners.repo')] = {
  id:       require.resolve('../../src/db/repositories/learners.repo'),
  filename: require.resolve('../../src/db/repositories/learners.repo'),
  loaded:   true,
  exports:  { findById: async (id) => (id === LEARNER_ID ? mockLearner : null) },
};

require.cache[require.resolve('../../src/db/repositories/modules.repo')] = {
  id:       require.resolve('../../src/db/repositories/modules.repo'),
  filename: require.resolve('../../src/db/repositories/modules.repo'),
  loaded:   true,
  exports:  { findByProgram: async () => mockModules },
};

require.cache[require.resolve('../../src/db/repositories/skills.repo')] = {
  id:       require.resolve('../../src/db/repositories/skills.repo'),
  filename: require.resolve('../../src/db/repositories/skills.repo'),
  loaded:   true,
  exports:  { findByIds: async () => mockSkillRows },
};

require.cache[require.resolve('../../src/services/learnerModel.service')] = {
  id:       require.resolve('../../src/services/learnerModel.service'),
  filename: require.resolve('../../src/services/learnerModel.service'),
  loaded:   true,
  exports:  { getLearnerModel: async () => mockLearnerModel },
};

const { getOnboardingStatus, completeOnboarding } = require('../../src/services/onboarding.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

function reset() {
  mockSkillState  = [];
  upsertCallCount = 0;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('onboarding.service — getOnboardingStatus()', () => {

  test('returns completed: false when no skill_state rows exist', async () => {
    reset();
    const status = await getOnboardingStatus(LEARNER_ID);
    assert.equal(status.completed, false);
    assert.equal(status.learnerId, LEARNER_ID);
  });

  test('returns completed: true when skill_state rows exist', async () => {
    reset();
    mockSkillState = [{ id: 'ss-1', learner_id: LEARNER_ID, skill_id: 'skill-uuid-sql' }];
    const status = await getOnboardingStatus(LEARNER_ID);
    assert.equal(status.completed, true);
  });

  test('throws when learnerId is missing', async () => {
    await assert.rejects(
      () => getOnboardingStatus(''),
      /learnerId is required/,
    );
  });

});

describe('onboarding.service — completeOnboarding()', () => {

  test('writes skill_state rows on first call', async () => {
    reset();
    await completeOnboarding(LEARNER_ID, {});
    assert.ok(upsertCallCount > 0, 'should have upserted at least one skill_state row');
  });

  test('returns the learner model', async () => {
    reset();
    const result = await completeOnboarding(LEARNER_ID, {});
    assert.deepEqual(result, mockLearnerModel);
  });

  test('idempotent: second call is a no-op (no upserts)', async () => {
    reset();
    // Pre-seed skill_state so the guard fires immediately
    mockSkillState = [{ id: 'ss-1', learner_id: LEARNER_ID, skill_id: 'skill-uuid-sql' }];
    await completeOnboarding(LEARNER_ID, {});
    assert.equal(upsertCallCount, 0, 'should not write any rows when already onboarded');
  });

  test('idempotent: still returns learner model on second call', async () => {
    reset();
    mockSkillState = [{ id: 'ss-1', learner_id: LEARNER_ID, skill_id: 'skill-uuid-sql' }];
    const result = await completeOnboarding(LEARNER_ID);
    assert.deepEqual(result, mockLearnerModel);
  });

  test('404 when learner does not exist', async () => {
    reset();
    await assert.rejects(
      () => completeOnboarding('non-existent-learner-id', {}),
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      },
    );
  });

  test('no-op when program has no modules', async () => {
    reset();
    const savedModules = mockModules;
    mockModules = [];
    const result = await completeOnboarding(LEARNER_ID, {});
    assert.equal(upsertCallCount, 0);
    assert.deepEqual(result, mockLearnerModel);
    mockModules = savedModules;
  });

  test('throws when learnerId is missing', async () => {
    await assert.rejects(
      () => completeOnboarding(''),
      /learnerId is required/,
    );
  });

});
