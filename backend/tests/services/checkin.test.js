'use strict';

/**
 * Tests for:
 *   1. checkin.prompt — buildCheckinPrompt, parseCheckinResponse, FALLBACK_QUESTIONS
 *   2. checkin.service — startCheckin, submitCheckin with mocked dependencies
 *   3. POST /student/checkin/start/:skillCode — route tests
 *   4. POST /student/checkin/submit/:skillCode — route tests
 *
 * Run: node --test tests/services/checkin.test.js
 */

// ── Env stubs (must come before any require that loads env.js) ────────────────
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';
process.env.LLM_PROVIDER              = 'fallback';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const jwt    = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHECKIN PROMPT — pure function tests
// ─────────────────────────────────────────────────────────────────────────────

const { buildCheckinPrompt, parseCheckinResponse, FALLBACK_QUESTIONS } =
  require('../../src/services/llm/prompts/checkin.prompt');

describe('buildCheckinPrompt()', () => {

  const ctx = {
    learner: { name: 'Amna', background_type: 'non_technical', program: 'data-analytics-bootcamp' },
    skill: { code: 'sql', name: 'SQL', domain: 'data' },
    proficiency: 0.2,
    backgroundType: 'non_technical',
  };

  test('returns system and messages', () => {
    const result = buildCheckinPrompt(ctx);
    assert.ok(typeof result.system === 'string', 'system must be a string');
    assert.ok(Array.isArray(result.messages), 'messages must be an array');
  });

  test('system prompt includes skill name and code', () => {
    const { system } = buildCheckinPrompt(ctx);
    assert.match(system, /SQL/);
    assert.match(system, /sql/);
  });

  test('system prompt includes difficulty level for low proficiency', () => {
    const { system } = buildCheckinPrompt({
      ...ctx,
      proficiency: 0.1,
    });
    assert.match(system, /beginner/i);
  });

  test('system prompt includes intermediate difficulty for 0.4 proficiency', () => {
    const { system } = buildCheckinPrompt({
      ...ctx,
      proficiency: 0.4,
    });
    assert.match(system, /intermediate/i);
  });

  test('system prompt includes advanced difficulty for 0.8 proficiency', () => {
    const { system } = buildCheckinPrompt({
      ...ctx,
      proficiency: 0.8,
    });
    assert.match(system, /advanced/i);
  });

  test('system prompt includes background type note', () => {
    const { system } = buildCheckinPrompt(ctx);
    assert.match(system, /non-technical/i);
  });

  test('system prompt includes few-shot JSON example', () => {
    const { system } = buildCheckinPrompt(ctx);
    assert.match(system, /FEW-SHOT EXAMPLE/i);
    assert.match(system, /question/);
    assert.match(system, /correctIndex/);
  });

  test('user message includes skill code and difficulty', () => {
    const { messages } = buildCheckinPrompt({
      ...ctx,
      proficiency: 0.1,
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0].content, /sql/);
    assert.match(messages[0].content, /beginner/);
  });

});

describe('parseCheckinResponse()', () => {

  test('parses valid JSON array of MCQs', () => {
    const raw = JSON.stringify([
      { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'A is correct.' },
      { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'C is correct.' },
    ]);
    const result = parseCheckinResponse(raw);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 2);
    assert.equal(result[0].correctIndex, 0);
    assert.equal(result[0].explanation, 'A is correct.');
  });

  test('strips markdown code fences', () => {
    const raw = '```json\n[{"question":"Q?","options":["A","B","C","D"],"correctIndex":1}]\n```';
    const result = parseCheckinResponse(raw);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 1);
  });

  test('returns null for non-array JSON', () => {
    const result = parseCheckinResponse('{"question": "Q?"}');
    assert.equal(result, null);
  });

  test('returns null for empty array', () => {
    const result = parseCheckinResponse('[]');
    assert.equal(result, null);
  });

  test('returns null for malformed JSON', () => {
    const result = parseCheckinResponse('not json at all');
    assert.equal(result, null);
  });

  test('returns null if correctIndex is out of range', () => {
    const raw = JSON.stringify([
      { question: 'Q?', options: ['A', 'B', 'C', 'D'], correctIndex: 5 },
    ]);
    const result = parseCheckinResponse(raw);
    assert.equal(result, null);
  });

  test('returns null if options count is not 4', () => {
    const raw = JSON.stringify([
      { question: 'Q?', options: ['A', 'B'], correctIndex: 0 },
    ]);
    const result = parseCheckinResponse(raw);
    assert.equal(result, null);
  });

  test('returns null for null/undefined input', () => {
    assert.equal(parseCheckinResponse(null), null);
    assert.equal(parseCheckinResponse(undefined), null);
    assert.equal(parseCheckinResponse(''), null);
  });

});

describe('FALLBACK_QUESTIONS', () => {

  test('has entries for common skill codes', () => {
    assert.ok('sql' in FALLBACK_QUESTIONS);
    assert.ok('python' in FALLBACK_QUESTIONS);
    assert.ok('statistics' in FALLBACK_QUESTIONS);
  });

  test('each fallback has exactly 2 questions', () => {
    for (const [code, questions] of Object.entries(FALLBACK_QUESTIONS)) {
      assert.equal(questions.length, 2, `${code} should have 2 questions`);
    }
  });

  test('each question has valid shape', () => {
    for (const [code, questions] of Object.entries(FALLBACK_QUESTIONS)) {
      for (const q of questions) {
        assert.ok(typeof q.question === 'string', `${code}: question must be string`);
        assert.ok(Array.isArray(q.options), `${code}: options must be array`);
        assert.equal(q.options.length, 4, `${code}: must have 4 options`);
        assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, `${code}: correctIndex must be 0-3`);
        assert.ok(typeof q.explanation === 'string' && q.explanation.length > 0, `${code}: explanation must be string`);
      }
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHECKIN SERVICE — with mocked dependencies
// ─────────────────────────────────────────────────────────────────────────────

// In-memory stand-in for the checkin_sessions DB table, shared across both
// service describe blocks below.
const mockSessionStore = new Map();

describe('checkin.service — startCheckin() with mocked deps', () => {

  // Clear the module cache so we can inject mocks
  const servicePath = require.resolve('../../src/services/checkin.service');
  delete require.cache[servicePath];

  // Mock dependencies
  const mockLearner = {
    id: 'learner-uuid-test',
    name: 'Amna Malik',
    background_type: 'non_technical',
    program: 'data-analytics-bootcamp',
  };

  const mockSkill = { id: 'skill-sql-id', code: 'sql', name: 'SQL', domain: 'data' };

  const mockSkillState = { learner_id: 'learner-uuid-test', skill_id: 'skill-sql-id', proficiency: 0.2 };

  let mockFindLearner = null;
  let mockFindSkillByCode = null;
  let mockFindSkillState = null;
  let mockGenerate = null;

  require.cache[require.resolve('../../src/db/repositories/learners.repo')] = {
    id: require.resolve('../../src/db/repositories/learners.repo'),
    filename: require.resolve('../../src/db/repositories/learners.repo'),
    loaded: true,
    exports: {
      findById: async () => mockFindLearner,
    },
  };

  require.cache[require.resolve('../../src/db/repositories/skills.repo')] = {
    id: require.resolve('../../src/db/repositories/skills.repo'),
    filename: require.resolve('../../src/db/repositories/skills.repo'),
    loaded: true,
    exports: {
      findByCode: async () => mockFindSkillByCode,
    },
  };

  require.cache[require.resolve('../../src/db/repositories/skillState.repo')] = {
    id: require.resolve('../../src/db/repositories/skillState.repo'),
    filename: require.resolve('../../src/db/repositories/skillState.repo'),
    loaded: true,
    exports: {
      findByLearnerAndSkillId: async () => mockFindSkillState,
      updateProficiency: async () => ({}),
    },
  };

  require.cache[require.resolve('../../src/db/repositories/checkinSessions.repo')] = {
    id: require.resolve('../../src/db/repositories/checkinSessions.repo'),
    filename: require.resolve('../../src/db/repositories/checkinSessions.repo'),
    loaded: true,
    exports: {
      create:       async (row) => { mockSessionStore.set(row.id, row); return row; },
      findById:     async (id)  => mockSessionStore.get(id) ?? null,
      deleteById:   async (id)  => { mockSessionStore.delete(id); },
      purgeExpired: async ()    => {},
    },
  };

  require.cache[require.resolve('../../src/services/dashboard.service')] = {
    id: require.resolve('../../src/services/dashboard.service'),
    filename: require.resolve('../../src/services/dashboard.service'),
    loaded: true,
    exports: {
      recordActivity: async () => ({ signalsCreated: [] }),
    },
  };

  require.cache[require.resolve('../../src/services/llm')] = {
    id: require.resolve('../../src/services/llm'),
    filename: require.resolve('../../src/services/llm'),
    loaded: true,
    exports: {
      generate: async () => mockGenerate,
      LLMError: class LLMError extends Error {},
    },
  };

  const { startCheckin } = require('../../src/services/checkin.service');

  test('returns sessionId, skillCode, skillName, and 4 questions', async () => {
    mockFindLearner = mockLearner;
    mockFindSkillByCode = mockSkill;
    mockFindSkillState = mockSkillState;
    mockGenerate = JSON.stringify([
      { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'A is correct.' },
      { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'B is correct.' },
      { question: 'Q3?', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'C is correct.' },
      { question: 'Q4?', options: ['A', 'B', 'C', 'D'], correctIndex: 3, explanation: 'D is correct.' },
    ]);

    const result = await startCheckin('learner-uuid-test', 'sql');

    assert.ok(result.sessionId, 'sessionId must be present');
    assert.equal(result.skillCode, 'sql');
    assert.equal(result.skillName, 'SQL');
    assert.ok(Array.isArray(result.questions), 'questions must be an array');
    assert.equal(result.questions.length, 4, 'must have 4 questions');
  });

  test('questions do NOT include correct answers', async () => {
    const result = await startCheckin('learner-uuid-test', 'sql');
    for (const q of result.questions) {
      assert.ok('question' in q, 'must have question');
      assert.ok('options' in q, 'must have options');
      assert.ok(!('correctIndex' in q), 'must NOT have correctIndex');
      assert.ok(!('correctAnswer' in q), 'must NOT have correctAnswer');
      assert.ok(!('explanation' in q), 'must NOT have explanation');
    }
  });

  test('throws NotFoundError for unknown learner', async () => {
    mockFindLearner = null;
    mockFindSkillByCode = mockSkill;

    try {
      await startCheckin('nonexistent', 'sql');
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.statusCode, 404);
    }
  });

  test('throws NotFoundError for unknown skill', async () => {
    mockFindLearner = mockLearner;
    mockFindSkillByCode = null;

    try {
      await startCheckin('learner-uuid-test', 'unknown');
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.statusCode, 404);
    }
  });

});

describe('checkin.service — submitCheckin() with mocked deps', () => {

  const { startCheckin, submitCheckin } = require('../../src/services/checkin.service');

  // Reset the mock session store before each test
  before(() => {
    mockSessionStore.clear();
  });

  test('all-correct answers raise proficiency', async () => {
    require('../../src/db/repositories/learners.repo').findById = async () => ({
      id: 'learner-uuid-test', name: 'Amna', background_type: 'non_technical', program: 'da',
    });
    require('../../src/db/repositories/skills.repo').findByCode = async () => ({
      id: 'skill-sql-id', code: 'sql', name: 'SQL',
    });
    require('../../src/db/repositories/skillState.repo').findByLearnerAndSkillId = async () => ({
      proficiency: 0.3,
    });
    require('../../src/services/llm').generate = async () => JSON.stringify([
      { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'A is correct.' },
      { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'B is correct.' },
    ]);

    const start = await startCheckin('learner-uuid-test', 'sql');

    let updatedProf = null;
    require('../../src/db/repositories/skillState.repo').updateProficiency = async (_l, _s, fields) => {
      updatedProf = fields.proficiency;
      return {};
    };

    const result = await submitCheckin(
      'learner-uuid-test',
      'sql',
      start.sessionId,
      [0, 1], // all correct
    );

    assert.equal(result.score, 100);
    assert.equal(result.correctAnswers, 2);
    assert.ok(result.updatedProficiency > 0.3, 'proficiency should increase');
    assert.equal(result.review.length, 2);
    assert.equal(result.review[0].isCorrect, true);
    assert.equal(result.review[0].explanation, 'A is correct.');
    assert.equal(mockSessionStore.has(start.sessionId), false, 'session should be deleted');
  });

  test('all-wrong answers lower proficiency', async () => {
    mockSessionStore.clear();

    require('../../src/db/repositories/learners.repo').findById = async () => ({
      id: 'learner-uuid-test', name: 'Amna', background_type: 'non_technical', program: 'da',
    });
    require('../../src/db/repositories/skills.repo').findByCode = async () => ({
      id: 'skill-sql-id', code: 'sql', name: 'SQL',
    });
    require('../../src/db/repositories/skillState.repo').findByLearnerAndSkillId = async () => ({
      proficiency: 0.5,
    });
    require('../../src/services/llm').generate = async () => JSON.stringify([
      { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'A is correct.' },
      { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'B is correct.' },
    ]);

    const start = await startCheckin('learner-uuid-test', 'sql');

    require('../../src/db/repositories/skillState.repo').updateProficiency = async (_l, _s, fields) => {
      return {};
    };

    const result = await submitCheckin(
      'learner-uuid-test',
      'sql',
      start.sessionId,
      [3, 3], // all wrong
    );

    assert.equal(result.score, 0);
    assert.equal(result.correctAnswers, 0);
    assert.ok(result.updatedProficiency < 0.5, 'proficiency should decrease');
    assert.equal(result.review[0].selectedIndex, 3);
    assert.equal(result.review[0].correctIndex, 0);
    assert.equal(result.review[0].isCorrect, false);
  });

  test('invalid sessionId returns 400', async () => {
    try {
      await submitCheckin('learner-uuid-test', 'sql', 'fake-session-id', [0, 1]);
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /invalid or expired/i);
    }
  });

  test('missing answers array returns 400', async () => {
    try {
      await submitCheckin('learner-uuid-test', 'sql', 'any-id', null);
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.statusCode, 400);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROUTE-LEVEL TESTS (combined start + submit — single app instance)
// ─────────────────────────────────────────────────────────────────────────────

describe('Check-in route tests', () => {

  const mockLearnerRow = { id: 'learner-uuid-student' };

  function makeQueryBuilder(table) {
    const chain = {
      select:  () => chain,
      eq:      () => chain,
      single: async () => {
        if (table === 'learners') return { data: mockLearnerRow, error: null };
        return { data: null, error: null };
      },
      then: (resolve, reject) => {
        const result = { data: [mockLearnerRow], error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return chain;
  }

  const mockState = {
    startResult: null,
    submitResult: null,
    submitError: null,
  };

  require.cache[require.resolve('../../src/config/supabase')] = {
    id: require.resolve('../../src/config/supabase'),
    filename: require.resolve('../../src/config/supabase'),
    loaded: true,
    exports: {
      auth: {
        admin: { createUser: async () => ({}), signOut: async () => ({}) },
        getUser: async (token) => {
          try {
            const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
            return { data: { user: { id: payload.sub, email: payload.email, app_metadata: payload.app_metadata } }, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        }
      },
      from: (table) => makeQueryBuilder(table),
    },
  };

  require.cache[require.resolve('../../src/services/checkin.service')] = {
    id: require.resolve('../../src/services/checkin.service'),
    filename: require.resolve('../../src/services/checkin.service'),
    loaded: true,
    exports: {
      startCheckin:  async () => mockState.startResult,
      submitCheckin: async () => {
        if (mockState.submitError) throw mockState.submitError;
        return mockState.submitResult;
      },
    },
  };

  const app = require('../../src/app');

  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  function makeToken(role = 'student') {
    return jwt.sign(
      { sub: 'user-uuid-test', email: 't@t.com', app_metadata: { role } },
      process.env.SUPABASE_JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
  }

  async function request(method, path, body, headers = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }

  const STUDENT_TOKEN    = makeToken('student');
  const INSTRUCTOR_TOKEN = makeToken('instructor');
  const authH = (t) => ({ Authorization: `Bearer ${t}` });

  // ── Start route tests ──────────────────────────────────────────────────────

  test('POST /checkin/start/sql — 201 with questions', async () => {
    mockState.startResult = {
      sessionId: 'session-uuid-1',
      skillCode: 'sql',
      skillName: 'SQL',
      questions: [
        { question: 'Q1?', options: ['A', 'B', 'C', 'D'] },
        { question: 'Q2?', options: ['A', 'B', 'C', 'D'] },
        { question: 'Q3?', options: ['A', 'B', 'C', 'D'] },
        { question: 'Q4?', options: ['A', 'B', 'C', 'D'] },
      ],
    };

    const { status, body } = await request(
      'POST', '/api/student/checkin/start/sql',
      null,
      authH(STUDENT_TOKEN),
    );

    assert.equal(status, 201);
    assert.ok(body.sessionId, 'sessionId must be present');
    assert.ok(Array.isArray(body.questions), 'questions must be array');
    assert.equal(body.questions.length, 4);
  });

  test('questions do not contain correctIndex', async () => {
    const { body } = await request(
      'POST', '/api/student/checkin/start/sql',
      null,
      authH(STUDENT_TOKEN),
    );

    for (const q of body.questions) {
      assert.ok(!('correctIndex' in q), 'question must not have correctIndex');
    }
  });

  test('start — 401 no token', async () => {
    const { status } = await request('POST', '/api/student/checkin/start/sql');
    assert.equal(status, 401);
  });

  test('start — 403 instructor token', async () => {
    const { status } = await request(
      'POST', '/api/student/checkin/start/sql',
      null,
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 403);
  });

  // ── Submit route tests ─────────────────────────────────────────────────────

  test('POST /checkin/submit/sql — 201 with score', async () => {
    mockState.submitResult = {
      score: 100,
      totalQuestions: 4,
      correctAnswers: 4,
      updatedProficiency: 0.38,
      signalsCreated: [],
      review: [
        { question: 'Q1?', options: ['A', 'B', 'C', 'D'], selectedIndex: 0, correctIndex: 0, isCorrect: true, explanation: 'A is correct.' },
      ],
    };
    mockState.submitError = null;

    const { status, body } = await request(
      'POST', '/api/student/checkin/submit/sql',
      { sessionId: '00000000-0000-0000-0000-000000000000', answers: [0, 1, 2, 3] },
      authH(STUDENT_TOKEN),
    );

    assert.equal(status, 201);
    assert.equal(body.score, 100);
    assert.ok('updatedProficiency' in body, 'updatedProficiency must be present');
    assert.ok(Array.isArray(body.signalsCreated), 'signalsCreated must be array');
    assert.ok(Array.isArray(body.review), 'review must be array');
  });

  test('submit — 400 missing sessionId', async () => {
    const { status, body } = await request(
      'POST', '/api/student/checkin/submit/sql',
      { answers: [0, 1, 2, 3] },
      authH(STUDENT_TOKEN),
    );

    assert.equal(status, 400);
    assert.ok(body.error?.message?.toLowerCase().includes('sessionid'));
  });

  test('submit — 400 missing answers', async () => {
    const { status, body } = await request(
      'POST', '/api/student/checkin/submit/sql',
      { sessionId: 'session-uuid-1' },
      authH(STUDENT_TOKEN),
    );

    assert.equal(status, 400);
    assert.ok(body.error?.message?.toLowerCase().includes('answers'));
  });

  test('submit — 400 invalid sessionId', async () => {
    const err = new Error('Invalid or expired session. Start a new check-in.');
    err.statusCode = 400;
    mockState.submitError = err;
    mockState.submitResult = null;

    const { status } = await request(
      'POST', '/api/student/checkin/submit/sql',
      { sessionId: 'fake-session', answers: [0, 1] },
      authH(STUDENT_TOKEN),
    );

    assert.equal(status, 400);

    mockState.submitError = null;
    mockState.submitResult = { score: 100, totalQuestions: 4, correctAnswers: 4, updatedProficiency: 0.38, signalsCreated: [] };
  });

  test('submit — 401 no token', async () => {
    const { status } = await request(
      'POST', '/api/student/checkin/submit/sql',
      { sessionId: 'x', answers: [0] },
    );
    assert.equal(status, 401);
  });

  test('submit — 403 instructor token', async () => {
    const { status } = await request(
      'POST', '/api/student/checkin/submit/sql',
      { sessionId: 'x', answers: [0] },
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 403);
  });

});
