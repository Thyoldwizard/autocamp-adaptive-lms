'use strict';

/**
 * Tests for signalSweep.js — runSweep()
 *
 * Tests against mocked repo data simulating the three seeded personas.
 *
 * Run: node --test tests/jobs/signalSweep.test.js
 */

// ── Env stubs ─────────────────────────────────────────────────────────────────
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ─── Mock data ────────────────────────────────────────────────────────────────

// Anchor the mock clock to the real current time so the relative `daysAgo()`
// offsets below line up with runSweep(), which uses the real `new Date()`.
// (Previously frozen at a fixed date, which silently rotted as real time moved
// past it: "recent" mock data eventually read as stalled and flipped the tests.)
const NOW = new Date();

function daysAgo(days) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// Amna: enrolled 15 days ago, has stalled SQL module (updated 10 days ago)
const mockAmna = {
  id: 'amna-id',
  name: 'Amna Malik',
  background_type: 'non_technical',
  program: 'data-analytics-bootcamp',
  enrolled_at: daysAgo(15),
};

const mockAmnaProgress = [
  {
    learner_id: 'amna-id',
    module_id: 'mod-excel',
    status: 'completed',
    completion_pct: 100,
    updated_at: daysAgo(5),
    module: { name: 'Excel Fundamentals' },
  },
  {
    learner_id: 'amna-id',
    module_id: 'mod-sql',
    status: 'in_progress',
    completion_pct: 35,
    updated_at: daysAgo(10), // stalled — older than 7 days
    module: { name: 'SQL for Data Analysis' },
  },
];

// Bilal: enrolled 43 days ago, active Deep Learning module (updated 2 days ago)
const mockBilal = {
  id: 'bilal-id',
  name: 'Bilal Ahmed',
  background_type: 'technical',
  program: 'ai-bootcamp',
  enrolled_at: daysAgo(43),
};

const mockBilalProgress = [
  {
    learner_id: 'bilal-id',
    module_id: 'mod-python',
    status: 'completed',
    completion_pct: 100,
    updated_at: daysAgo(30),
    module: { name: 'Python Refresher' },
  },
  {
    learner_id: 'bilal-id',
    module_id: 'mod-ml',
    status: 'completed',
    completion_pct: 100,
    updated_at: daysAgo(20),
    module: { name: 'ML Foundations' },
  },
  {
    learner_id: 'bilal-id',
    module_id: 'mod-dl',
    status: 'in_progress',
    completion_pct: 40,
    updated_at: daysAgo(2), // active — less than 7 days
    module: { name: 'Deep Learning' },
  },
];

// Sadia: enrolled 29 days ago, Prompt Engineering updated 5 days ago (not stalled)
const mockSadia = {
  id: 'sadia-id',
  name: 'Sadia Hussain',
  background_type: 'non_technical',
  program: 'automation-with-ai-bootcamp',
  enrolled_at: daysAgo(29),
};

const mockSadiaProgress = [
  {
    learner_id: 'sadia-id',
    module_id: 'mod-py-auto',
    status: 'completed',
    completion_pct: 100,
    updated_at: daysAgo(20),
    module: { name: 'Python for Automation' },
  },
  {
    learner_id: 'sadia-id',
    module_id: 'mod-prompt',
    status: 'in_progress',
    completion_pct: 60,
    updated_at: daysAgo(5), // not stalled — less than 7 days
    module: { name: 'Prompt Engineering' },
  },
];

// New learner: enrolled 5 days ago, ALL progress is not_started
const mockNewLearner = {
  id: 'new-id',
  name: 'New Student',
  background_type: 'non_technical',
  program: 'data-analytics-bootcamp',
  enrolled_at: daysAgo(5),
};

const mockNewLearnerProgress = [
  {
    learner_id: 'new-id',
    module_id: 'mod-excel',
    status: 'not_started',
    completion_pct: 0,
    updated_at: daysAgo(5),
    module: { name: 'Excel Fundamentals' },
  },
  {
    learner_id: 'new-id',
    module_id: 'mod-sql',
    status: 'not_started',
    completion_pct: 0,
    updated_at: daysAgo(5),
    module: { name: 'SQL for Data Analysis' },
  },
];

// ─── Mock repo state ──────────────────────────────────────────────────────────

let mockLearners = [];
let mockProgressMap = {};
let mockSignalsMap = {};
let insertedSignals = [];

function mockLearnersFindAll() {
  return mockLearners;
}

function mockProgressFindByLearnerId(learnerId) {
  return mockProgressMap[learnerId] ?? [];
}

function mockProgressFindByLearnerIds(learnerIds) {
  return learnerIds.flatMap((id) => mockProgressMap[id] ?? []);
}

function mockSignalsFindRecent(learnerId, days) {
  const signals = mockSignalsMap[learnerId] ?? [];
  const cutoff = daysAgo(days);
  return signals.filter((s) => s.created_at >= cutoff);
}

function mockSignalsFindRecentByLearnerIds(learnerIds, days) {
  const cutoff = daysAgo(days);
  return learnerIds.flatMap((id) => {
    const signals = mockSignalsMap[id] ?? [];
    return signals.filter((s) => s.created_at >= cutoff);
  });
}

function mockSignalsInsert(row) {
  const signal = {
    id: `sig-${insertedSignals.length + 1}`,
    ...row,
    created_at: NOW.toISOString(),
    resolved_at: null,
  };
  insertedSignals.push(signal);
  if (!mockSignalsMap[row.learner_id]) {
    mockSignalsMap[row.learner_id] = [];
  }
  mockSignalsMap[row.learner_id].push(signal);
  return signal;
}

// ─── Inject mocks ─────────────────────────────────────────────────────────────

require.cache[require.resolve('../../src/db/repositories/learners.repo')] = {
  id: require.resolve('../../src/db/repositories/learners.repo'),
  filename: require.resolve('../../src/db/repositories/learners.repo'),
  loaded: true,
  exports: {
    findAll: mockLearnersFindAll,
    findById: async (id) => mockLearners.find((l) => l.id === id) ?? null,
  },
};

require.cache[require.resolve('../../src/db/repositories/progress.repo')] = {
  id: require.resolve('../../src/db/repositories/progress.repo'),
  filename: require.resolve('../../src/db/repositories/progress.repo'),
  loaded: true,
  exports: {
    findByLearnerId:   mockProgressFindByLearnerId,
    findByLearnerIds:  mockProgressFindByLearnerIds,
  },
};

require.cache[require.resolve('../../src/db/repositories/signals.repo')] = {
  id: require.resolve('../../src/db/repositories/signals.repo'),
  filename: require.resolve('../../src/db/repositories/signals.repo'),
  loaded: true,
  exports: {
    findRecentByLearnerId:   mockSignalsFindRecent,
    findRecentByLearnerIds:  mockSignalsFindRecentByLearnerIds,
    insert:                  mockSignalsInsert,
  },
};

const { runSweep } = require('../../src/jobs/signalSweep');

// ─── Test helpers ─────────────────────────────────────────────────────────────

function resetMocks() {
  mockLearners = [];
  mockProgressMap = {};
  mockSignalsMap = {};
  insertedSignals = [];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runSweep() — inactivity detection', () => {

  test('Amna — stalled in_progress module triggers inactivity signal', async () => {
    resetMocks();
    mockLearners = [mockAmna];
    mockProgressMap = { 'amna-id': mockAmnaProgress };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 1);
    assert.equal(result.signalsCreated.length, 1);
    assert.equal(result.signalsCreated[0].learnerId, 'amna-id');
    assert.equal(result.signalsCreated[0].reason, 'stalled_module');
    assert.equal(result.signalsCreated[0].signal.signal_type, 'inactivity');
    assert.equal(result.signalsCreated[0].signal.source, 'system');
  });

  test('Bilal — active module, no signal created', async () => {
    resetMocks();
    mockLearners = [mockBilal];
    mockProgressMap = { 'bilal-id': mockBilalProgress };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 1);
    assert.equal(result.signalsCreated.length, 0);
  });

  test('Sadia — recently updated in_progress module, no signal', async () => {
    resetMocks();
    mockLearners = [mockSadia];
    mockProgressMap = { 'sadia-id': mockSadiaProgress };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 1);
    assert.equal(result.signalsCreated.length, 0);
  });

  test('New learner — no progress after 5 days enrollment triggers signal', async () => {
    resetMocks();
    mockLearners = [mockNewLearner];
    mockProgressMap = { 'new-id': mockNewLearnerProgress };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 1);
    assert.equal(result.signalsCreated.length, 1);
    assert.equal(result.signalsCreated[0].learnerId, 'new-id');
    assert.equal(result.signalsCreated[0].reason, 'no_progress_after_enrollment');
    assert.equal(result.signalsCreated[0].signal.signal_type, 'inactivity');
  });

  test('dedup — existing unresolved inactivity signal prevents duplicate', async () => {
    resetMocks();
    mockLearners = [mockAmna];
    mockProgressMap = { 'amna-id': mockAmnaProgress };
    // Pre-seed an unresolved inactivity signal
    mockSignalsMap = {
      'amna-id': [
        {
          id: 'sig-existing',
          learner_id: 'amna-id',
          signal_type: 'inactivity',
          source: 'system',
          resolved_at: null,
          created_at: daysAgo(3),
        },
      ],
    };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 1);
    assert.equal(result.signalsCreated.length, 0);
  });

  test('multiple learners — both stalled and no-progress signals created', async () => {
    resetMocks();
    mockLearners = [mockAmna, mockNewLearner];
    mockProgressMap = {
      'amna-id': mockAmnaProgress,
      'new-id': mockNewLearnerProgress,
    };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 2);
    assert.equal(result.signalsCreated.length, 2);

    const learnerIds = result.signalsCreated.map((s) => s.learnerId);
    assert.ok(learnerIds.includes('amna-id'), 'Amna should have a signal');
    assert.ok(learnerIds.includes('new-id'), 'New learner should have a signal');
  });

  test('empty learner list — returns zero counts', async () => {
    resetMocks();
    mockLearners = [];

    const result = await runSweep();

    assert.equal(result.learnersScanned, 0);
    assert.equal(result.signalsCreated.length, 0);
  });

  test('resolved inactivity signal does NOT block new signal', async () => {
    resetMocks();
    mockLearners = [mockAmna];
    mockProgressMap = { 'amna-id': mockAmnaProgress };
    // Pre-seed a RESOLVED inactivity signal
    mockSignalsMap = {
      'amna-id': [
        {
          id: 'sig-resolved',
          learner_id: 'amna-id',
          signal_type: 'inactivity',
          source: 'system',
          resolved_at: daysAgo(1),
          created_at: daysAgo(10),
        },
      ],
    };

    const result = await runSweep();

    assert.equal(result.learnersScanned, 1);
    assert.equal(result.signalsCreated.length, 1);
  });

  test('signal context includes module details for stalled module', async () => {
    resetMocks();
    mockLearners = [mockAmna];
    mockProgressMap = { 'amna-id': mockAmnaProgress };

    const result = await runSweep();

    const signal = result.signalsCreated[0].signal;
    assert.ok(signal.context, 'context must be present');
    assert.equal(signal.context.reason, 'stalled_module');
    assert.equal(signal.context.module_name, 'SQL for Data Analysis');
    assert.equal(signal.context.status, 'in_progress');
  });

  test('signal context includes enrollment details for no-progress', async () => {
    resetMocks();
    mockLearners = [mockNewLearner];
    mockProgressMap = { 'new-id': mockNewLearnerProgress };

    const result = await runSweep();

    const signal = result.signalsCreated[0].signal;
    assert.ok(signal.context, 'context must be present');
    assert.equal(signal.context.reason, 'no_progress_after_enrollment');
    assert.ok(signal.context.enrolled_at, 'enrolled_at must be present');
  });

});
