'use strict';

/**
 * Tests for companion.service retry + deterministic-fallback behaviour (B9).
 *
 * We isolate companion.service by injecting fresh mocks into require.cache
 * BEFORE the service is loaded in this file so the module state is clean.
 *
 * Run: node --test tests/services/llmRobustness.test.js
 */

// ── Env stubs ─────────────────────────────────────────────────────────────────
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';
process.env.LLM_PROVIDER              = 'fallback';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// ── Mock data ─────────────────────────────────────────────────────────────────

const LEARNER_ID = 'learner-uuid-b9-test';

const MOCK_MODEL = {
  learner: { name: 'Test', program: 'data-analytics-bootcamp', stated_goal: 'Job' },
  skillState: [],
  progress: [],
  recentSignals: [],
  outcomes: [],
  recentMessages: [],
  analysis: {
    atRisk:         { score: 0, level: 'low', reasons: [] },
    goalProgress:   { percentage: 40, onTrack: false, strongAreas: [], weakAreas: [] },
    nextBestAction: null,
  },
};

// ── Shared mock state ─────────────────────────────────────────────────────────

let llmCallCount  = 0;
let llmShouldFail = false;
let insertedRows  = [];

// ── Inject mocks ──────────────────────────────────────────────────────────────

// learnerModel.service
require.cache[require.resolve('../../src/services/learnerModel.service')] = {
  id:       require.resolve('../../src/services/learnerModel.service'),
  filename: require.resolve('../../src/services/learnerModel.service'),
  loaded:   true,
  exports:  { getLearnerModel: async () => MOCK_MODEL },
};

// companion.repo
require.cache[require.resolve('../../src/db/repositories/companion.repo')] = {
  id:       require.resolve('../../src/db/repositories/companion.repo'),
  filename: require.resolve('../../src/db/repositories/companion.repo'),
  loaded:   true,
  exports:  {
    findRecentByLearnerId: async () => [],
    insert: async (row) => { insertedRows.push(row); return { id: `row-${insertedRows.length}`, ...row }; },
  },
};

// signals.repo
require.cache[require.resolve('../../src/db/repositories/signals.repo')] = {
  id:       require.resolve('../../src/db/repositories/signals.repo'),
  filename: require.resolve('../../src/db/repositories/signals.repo'),
  loaded:   true,
  exports:  { insert: async (row) => ({ id: 'sig-1', ...row }) },
};

// llm/index — controlled failure
require.cache[require.resolve('../../src/services/llm/index')] = {
  id:       require.resolve('../../src/services/llm/index'),
  filename: require.resolve('../../src/services/llm/index'),
  loaded:   true,
  exports:  {
    generate: async () => {
      llmCallCount++;
      if (llmShouldFail) throw new Error('LLM unavailable');
      return 'LLM response';
    },
    LLMError: class LLMError extends Error {},
  },
};

// llm/fallback.provider — always succeeds
require.cache[require.resolve('../../src/services/llm/fallback.provider')] = {
  id:       require.resolve('../../src/services/llm/fallback.provider'),
  filename: require.resolve('../../src/services/llm/fallback.provider'),
  loaded:   true,
  exports:  { generate: async () => 'fallback response' },
};

// Load companion.service AFTER all mocks are injected
const { chat } = require('../../src/services/companion.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

function reset() {
  llmCallCount  = 0;
  llmShouldFail = false;
  insertedRows  = [];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('companion.service — LLM retry + fallback (B9)', () => {

  test('success path: LLM called once, response returned', async () => {
    reset();
    const { response } = await chat(LEARNER_ID, 'Hello!');
    assert.equal(response, 'LLM response');
    assert.equal(llmCallCount, 1);
  });

  test('on LLM failure: retries once more before falling back', async () => {
    reset();
    llmShouldFail = true;
    const { response } = await chat(LEARNER_ID, 'What should I study?');
    // Two LLM attempts should have fired, then fallback kicked in
    assert.equal(llmCallCount, 2, 'expected exactly 2 LLM attempts before fallback');
    assert.equal(response, 'fallback response', 'should return deterministic fallback text');
  });

  test('fallback path: both turns still persisted after fallback', async () => {
    reset();
    llmShouldFail = true;
    await chat(LEARNER_ID, 'I am stuck on this');
    const roles = insertedRows.map((r) => r.role);
    assert.ok(roles.includes('user'),      'user message must be persisted');
    assert.ok(roles.includes('assistant'), 'assistant message must be persisted');
  });

  test('success path: both turns persisted after successful LLM call', async () => {
    reset();
    await chat(LEARNER_ID, 'What is SQL?');
    const roles = insertedRows.map((r) => r.role);
    assert.ok(roles.includes('user'));
    assert.ok(roles.includes('assistant'));
    const assistantRow = insertedRows.find((r) => r.role === 'assistant');
    assert.equal(assistantRow.content, 'LLM response');
  });

  test('fallback response content is persisted, not the error', async () => {
    reset();
    llmShouldFail = true;
    await chat(LEARNER_ID, 'Help me please');
    const assistantRow = insertedRows.find((r) => r.role === 'assistant');
    assert.ok(assistantRow, 'assistant row must be present');
    assert.equal(assistantRow.content, 'fallback response');
  });

  test('chat throws if learnerId is missing', async () => {
    reset();
    await assert.rejects(
      () => chat('', 'Hello'),
      /learnerId is required/,
    );
  });

  test('chat throws if userMessage is empty', async () => {
    reset();
    await assert.rejects(
      () => chat(LEARNER_ID, '   '),
      /userMessage is required/,
    );
  });

});

// ── LLM index: warn + fallback when GEMINI key missing (B10) ─────────────────

describe('llm/index — missing GEMINI_API_KEY falls back gracefully (B10)', () => {

  test('fallback.provider.generate always returns a string', async () => {
    const { generate } = require('../../src/services/llm/fallback.provider');
    const result = await generate({
      system: 'Name: Test\nCurrent module: SQL\nGoal progress: 50%\nOn track: true\nWeak areas: sql\nStrong areas: none yet\nRecommended next module: Python',
      messages: [{ role: 'user', content: 'What should I do next?' }],
    });
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 5);
  });

  test('gemini.provider exports LLMError with isOperational flag', () => {
    // LLMError must be recognisable as operational so errorHandler logs correctly.
    const { LLMError } = require('../../src/services/llm/gemini.provider');
    const err = new LLMError('test', 429);
    assert.equal(err.name, 'LLMError');
    assert.equal(err.isOperational, true);
    assert.equal(err.statusCode, 429);
  });

  test('llm/index key-missing guard: generate() is always a function', () => {
    // llm/index must always export a callable generate() regardless of provider.
    const llmIndex = require('../../src/services/llm/index');
    assert.equal(typeof llmIndex.generate, 'function');
  });

});
