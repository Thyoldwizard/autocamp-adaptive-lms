'use strict';

/**
 * Route-level tests for all four route modules.
 *
 * Strategy: module-cache dependency injection (same pattern as auth.test.js).
 * All service modules are mocked before app.js loads, so no real DB calls.
 * Each describe block controls mock return values via shared mutable state.
 *
 * Run: node --test tests/routes/routes.test.js
 */

// ── Env stubs ─────────────────────────────────────────────────────────────────
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe, before, after } = require('node:test');
const assert  = require('node:assert/strict');
const http    = require('node:http');
const jwt     = require('jsonwebtoken');

// ─── Shared mock return state ─────────────────────────────────────────────────

// Dashboard service mocks
let mockDashboard        = null;
let mockSkillBreakdown   = null;
let mockRecordActivity   = null;

// Onboarding service mocks
let mockOnboardingStatus = null;
let mockOnboardingModel  = null;

// Cohort service mocks
let mockCohortOverview   = null;
let mockAtRiskList       = null;
let mockHeatmap          = null;
let mockFlagResult       = null;

// learnerModel service mocks
let mockRefreshAnalysis  = null;
let mockLearnerModel     = null;

// ─── Mock: Supabase client ────────────────────────────────────────────────────
// ownLearnerOnly does: supabase.from('learners').select('id').eq('user_id', x).single()
// cohortScope does:    supabase.from('instructor_cohorts').select('cohort').eq('instructor_id', x)
// We need the query builder to support both call patterns.

const mockLearnerRow = { id: 'learner-uuid-student' };
const mockCohortRows = [{ cohort: 'da-2026-spring' }];
let mockLearnerByIdRow = { id: 'learner-uuid-bilal', cohort: 'da-2026-spring' };

function makeQueryBuilder(table) {
  // Returns an object whose methods all return `this` (fluent chain),
  // except terminal operations (.single() and direct await via thenable).
  const filters = {};
  const chain = {
    select:  () => chain,
    eq:      (column, value) => {
      filters[column] = value;
      return chain;
    },
    order:   () => chain,
    limit:   () => chain,
    insert:  () => chain,
    update:  () => chain,
    upsert:  () => chain,
    delete:  () => chain,
    // Terminal: .single() — used by ownLearnerOnly
    single: async () => {
      if (table === 'learners' && filters.user_id) {
        return { data: mockLearnerRow, error: null };
      }
      if (table === 'learners' && filters.id) {
        return mockLearnerByIdRow
          ? { data: mockLearnerByIdRow, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'No rows' } };
      }
      if (table === 'learners') return { data: mockLearnerRow, error: null };
      return { data: null, error: null };
    },
    // Thenable: allows `await supabase.from('instructor_cohorts').select('cohort').eq(...)` directly
    // cohortScope awaits the chain without calling .single()
    then: (resolve, reject) => {
      let result;
      if (table === 'instructor_cohorts') result = { data: mockCohortRows, error: null };
      else result = { data: [mockLearnerRow], error: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}

const mockSupabase = {
  auth: {
    admin: {
      createUser: async () => ({ data: { user: {} }, error: null }),
      signOut:    async () => ({ error: null }),
    },
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'err' } }),
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
};


require.cache[require.resolve('../../src/config/supabase')] = {
  id:       require.resolve('../../src/config/supabase'),
  filename: require.resolve('../../src/config/supabase'),
  loaded:   true,
  exports:  mockSupabase,
};

// ─── Mock: dashboard.service ──────────────────────────────────────────────────
require.cache[require.resolve('../../src/services/dashboard.service')] = {
  id:       require.resolve('../../src/services/dashboard.service'),
  filename: require.resolve('../../src/services/dashboard.service'),
  loaded:   true,
  exports: {
    getDashboard:     async () => mockDashboard,
    getSkillBreakdown: async () => mockSkillBreakdown,
    recordActivity:   async () => mockRecordActivity,
  },
};

// ─── Mock: onboarding.service ─────────────────────────────────────────────────
require.cache[require.resolve('../../src/services/onboarding.service')] = {
  id:       require.resolve('../../src/services/onboarding.service'),
  filename: require.resolve('../../src/services/onboarding.service'),
  loaded:   true,
  exports: {
    getOnboardingStatus: async () => mockOnboardingStatus,
    completeOnboarding:  async () => mockOnboardingModel,
  },
};

// ─── Mock: cohort.service ─────────────────────────────────────────────────────
require.cache[require.resolve('../../src/services/cohort.service')] = {
  id:       require.resolve('../../src/services/cohort.service'),
  filename: require.resolve('../../src/services/cohort.service'),
  loaded:   true,
  exports: {
    getCohortOverview:  async () => mockCohortOverview,
    getAtRiskList:      async () => mockAtRiskList,
    getStruggleHeatmap: async () => mockHeatmap,
    addInstructorFlag:  async () => mockFlagResult,
  },
};

// ─── Mock: learnerModel.service ───────────────────────────────────────────────
require.cache[require.resolve('../../src/services/learnerModel.service')] = {
  id:       require.resolve('../../src/services/learnerModel.service'),
  filename: require.resolve('../../src/services/learnerModel.service'),
  loaded:   true,
  exports: {
    getLearnerModel:  async () => mockLearnerModel,
    refreshAnalysis:  async () => mockRefreshAnalysis,
  },
};

// ─── Load app AFTER all mock injections ───────────────────────────────────────
const app = require('../../src/app');

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

async function request(method, path, body, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function makeToken(role = 'student', extra = {}) {
  return jwt.sign(
    { sub: 'user-uuid-123', email: 'test@test.com', app_metadata: { role }, ...extra },
    process.env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

const STUDENT_TOKEN    = makeToken('student');
const INSTRUCTOR_TOKEN = makeToken('instructor');
const authH = (t) => ({ Authorization: `Bearer ${t}` });

// ─── Fixture data ─────────────────────────────────────────────────────────────

const FAKE_DASHBOARD = {
  learner:       { name: 'Amna', program: 'data-analytics-bootcamp', cohort: 'da-2026-spring', goal: 'Get a job' },
  journey:       { currentModule: null, nextBestAction: null, progressSummary: { completed: 1, inProgress: 1, notStarted: 0 } },
  skills:        { strong: [], weak: [], notStarted: [] },
  atRisk:        { level: 'low', reasons: [] },
  goalProgress:  { percentage: 38, onTrack: false, strongAreas: [], weakAreas: ['sql'] },
  recentActivity: [],
};

const FAKE_BREAKDOWN = { strong: [], developing: [], weak: [] };

const FAKE_RECORD_RESULT = {
  progress:       { id: 'prog-1', status: 'in_progress', completion_pct: 50 },
  signalsCreated: [],
};

const FAKE_ONBOARDING_STATUS = { completed: false, learnerId: 'learner-uuid-student' };
const FAKE_ONBOARDING_MODEL  = { learner: { name: 'Amna' }, analysis: {} };

const FAKE_OVERVIEW  = { cohort: 'da-2026-spring', totalLearners: 1, learners: [] };
const FAKE_AT_RISK   = { cohort: 'da-2026-spring', totalLearners: 0, requiresAction: false, learners: [] };
const FAKE_HEATMAP   = { cohort: 'da-2026-spring', skills: [] };
const FAKE_FLAG      = { id: 'sig-1', signal_type: 'instructor_flag', source: 'instructor' };
const FAKE_ANALYSIS  = { atRisk: { score: 0, level: 'low', reasons: [] }, goalProgress: {}, nextBestAction: null };
const FAKE_LEARNER_MODEL = {
  learner: { id: 'learner-uuid-bilal', name: 'Bilal Ahmed', cohort: 'da-2026-spring', program: 'data-analytics-bootcamp' },
  analysis: FAKE_ANALYSIS,
  skillState: [],
  progress: [],
  recentSignals: [],
  outcomes: [],
  recentMessages: [],
};

// ─── Student: dashboard routes ─────────────────────────────────────────────────

describe('GET /api/student/dashboard', () => {

  test('200 with dashboard — valid student token', async () => {
    mockDashboard = FAKE_DASHBOARD;
    const { status, body } = await request('GET', '/api/student/dashboard', null, authH(STUDENT_TOKEN));
    assert.equal(status, 200);
    assert.equal(body.learner.name, 'Amna');
    assert.ok('journey'      in body, 'journey key required');
    assert.ok('skills'       in body, 'skills key required');
    assert.ok('atRisk'       in body, 'atRisk key required');
    assert.ok('goalProgress' in body, 'goalProgress key required');
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', '/api/student/dashboard');
    assert.equal(status, 401);
  });

  test('403 — instructor token rejected', async () => {
    const { status } = await request('GET', '/api/student/dashboard', null, authH(INSTRUCTOR_TOKEN));
    assert.equal(status, 403);
  });

});

describe('GET /api/student/skills', () => {

  test('200 with skill breakdown — valid student token', async () => {
    mockSkillBreakdown = FAKE_BREAKDOWN;
    const { status, body } = await request('GET', '/api/student/skills', null, authH(STUDENT_TOKEN));
    assert.equal(status, 200);
    assert.ok('strong'     in body, 'strong key required');
    assert.ok('developing' in body, 'developing key required');
    assert.ok('weak'       in body, 'weak key required');
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', '/api/student/skills');
    assert.equal(status, 401);
  });

  test('403 — instructor token rejected', async () => {
    const { status } = await request('GET', '/api/student/skills', null, authH(INSTRUCTOR_TOKEN));
    assert.equal(status, 403);
  });

});

describe('POST /api/student/activity/:moduleId', () => {

  const MODULE_ID = 'mod-uuid-sql';
  const ACTIVITY_BODY = { attempts: 2, score: 75, completionPct: 50 };

  test('201 with progress and signalsCreated — valid student token', async () => {
    mockRecordActivity = FAKE_RECORD_RESULT;
    const { status, body } = await request(
      'POST', `/api/student/activity/${MODULE_ID}`,
      ACTIVITY_BODY,
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 201);
    assert.ok(body.progress,                   'progress must be present');
    assert.ok(Array.isArray(body.signalsCreated), 'signalsCreated must be array');
  });

  test('400 — missing attempts in body', async () => {
    const { status, body } = await request(
      'POST', `/api/student/activity/${MODULE_ID}`,
      { score: 75 },
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 400);
    assert.ok(body.error?.message?.toLowerCase().includes('attempts'));
  });

  test('401 — no token', async () => {
    const { status } = await request('POST', `/api/student/activity/${MODULE_ID}`, ACTIVITY_BODY);
    assert.equal(status, 401);
  });

  test('403 — instructor token rejected', async () => {
    const { status } = await request(
      'POST', `/api/student/activity/${MODULE_ID}`,
      ACTIVITY_BODY,
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 403);
  });

});

// ─── Student: onboarding routes ───────────────────────────────────────────────

describe('GET /api/student/onboarding/status', () => {

  test('200 with completed boolean — valid student token', async () => {
    mockOnboardingStatus = FAKE_ONBOARDING_STATUS;
    const { status, body } = await request('GET', '/api/student/onboarding/status', null, authH(STUDENT_TOKEN));
    assert.equal(status, 200);
    assert.ok('completed'  in body, 'completed key required');
    assert.ok('learnerId'  in body, 'learnerId key required');
    assert.equal(body.completed, false);
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', '/api/student/onboarding/status');
    assert.equal(status, 401);
  });

  test('403 — instructor token rejected', async () => {
    const { status } = await request('GET', '/api/student/onboarding/status', null, authH(INSTRUCTOR_TOKEN));
    assert.equal(status, 403);
  });

});

describe('POST /api/student/onboarding/complete', () => {

  test('201 with learner model — valid student token', async () => {
    mockOnboardingModel = FAKE_ONBOARDING_MODEL;
    const { status, body } = await request(
      'POST', '/api/student/onboarding/complete',
      { answers: { sql: 0.3, python: 0.1 } },
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 201);
    assert.ok(body.learner, 'learner key required');
    assert.ok('analysis' in body, 'analysis key required');
  });

  test('201 with no body (answers is optional)', async () => {
    mockOnboardingModel = FAKE_ONBOARDING_MODEL;
    const { status } = await request(
      'POST', '/api/student/onboarding/complete',
      {},
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 201);
  });

  test('401 — no token', async () => {
    const { status } = await request('POST', '/api/student/onboarding/complete', {});
    assert.equal(status, 401);
  });

});

// ─── Instructor: cohort routes ────────────────────────────────────────────────

describe('GET /api/instructor/cohort', () => {

  test('200 with cohorts array — valid instructor token', async () => {
    mockCohortOverview = FAKE_OVERVIEW;
    const { status, body } = await request('GET', '/api/instructor/cohort', null, authH(INSTRUCTOR_TOKEN));
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.cohorts), 'cohorts must be an array');
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', '/api/instructor/cohort');
    assert.equal(status, 401);
  });

  test('403 — student token rejected', async () => {
    const { status } = await request('GET', '/api/instructor/cohort', null, authH(STUDENT_TOKEN));
    assert.equal(status, 403);
  });

});

describe('GET /api/instructor/cohort/at-risk', () => {

  test('200 with cohorts array — valid instructor token', async () => {
    mockAtRiskList = FAKE_AT_RISK;
    const { status, body } = await request('GET', '/api/instructor/cohort/at-risk', null, authH(INSTRUCTOR_TOKEN));
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.cohorts), 'cohorts must be an array');
    const cohort = body.cohorts[0];
    assert.ok('requiresAction' in cohort, 'requiresAction key required');
    assert.ok('learners'       in cohort, 'learners key required');
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', '/api/instructor/cohort/at-risk');
    assert.equal(status, 401);
  });

  test('403 — student token rejected', async () => {
    const { status } = await request('GET', '/api/instructor/cohort/at-risk', null, authH(STUDENT_TOKEN));
    assert.equal(status, 403);
  });

});

describe('GET /api/instructor/cohort/heatmap', () => {

  test('200 with cohorts array — valid instructor token', async () => {
    mockHeatmap = FAKE_HEATMAP;
    const { status, body } = await request('GET', '/api/instructor/cohort/heatmap', null, authH(INSTRUCTOR_TOKEN));
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.cohorts), 'cohorts must be an array');
    assert.ok(Array.isArray(body.cohorts[0].skills), 'skills must be an array');
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', '/api/instructor/cohort/heatmap');
    assert.equal(status, 401);
  });

});

describe('POST /api/instructor/learner/:learnerId/flag', () => {

  const LEARNER_ID = 'learner-uuid-amna';

  test('201 with signal — valid instructor token + note', async () => {
    mockFlagResult = FAKE_FLAG;
    const { status, body } = await request(
      'POST', `/api/instructor/learner/${LEARNER_ID}/flag`,
      { note: 'Missed three sessions' },
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 201);
    assert.ok(body.signal, 'signal key required');
    assert.equal(body.signal.signal_type, 'instructor_flag');
    assert.equal(body.signal.source,      'instructor');
  });

  test('400 — missing note', async () => {
    const { status, body } = await request(
      'POST', `/api/instructor/learner/${LEARNER_ID}/flag`,
      {},
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 400);
    assert.ok(body.error?.message?.toLowerCase().includes('note'));
  });

  test('400 — empty note string', async () => {
    const { status, body } = await request(
      'POST', `/api/instructor/learner/${LEARNER_ID}/flag`,
      { note: '   ' },
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 400);
    assert.ok(body.error?.message?.toLowerCase().includes('note'));
  });

  test('401 — no token', async () => {
    const { status } = await request('POST', `/api/instructor/learner/${LEARNER_ID}/flag`, { note: 'test' });
    assert.equal(status, 401);
  });

  test('403 — student token rejected', async () => {
    const { status } = await request(
      'POST', `/api/instructor/learner/${LEARNER_ID}/flag`,
      { note: 'test' },
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 403);
  });

});

// ─── Instructor: learner detail route ─────────────────────────────────────────

describe('GET /api/instructor/learner/:learnerId', () => {

  const LEARNER_ID = 'learner-uuid-bilal';

  test('200 with learner model — valid instructor token for in-scope learner', async () => {
    mockLearnerByIdRow = { id: LEARNER_ID, cohort: 'da-2026-spring' };
    mockLearnerModel = FAKE_LEARNER_MODEL;

    const { status, body } = await request(
      'GET', `/api/instructor/learner/${LEARNER_ID}`,
      null,
      authH(INSTRUCTOR_TOKEN),
    );

    assert.equal(status, 200);
    assert.equal(body.learner.id, LEARNER_ID);
    assert.ok(body.analysis, 'analysis key required');
    assert.ok(Array.isArray(body.skillState), 'skillState must be array');
    assert.ok(Array.isArray(body.progress), 'progress must be array');
    assert.ok(Array.isArray(body.recentSignals), 'recentSignals must be array');
    assert.ok(Array.isArray(body.recentMessages), 'recentMessages must be array');
  });

  test('403 — instructor token rejected for out-of-scope learner', async () => {
    mockLearnerByIdRow = { id: LEARNER_ID, cohort: 'ai-2026-spring' };
    mockLearnerModel = FAKE_LEARNER_MODEL;

    const { status } = await request(
      'GET', `/api/instructor/learner/${LEARNER_ID}`,
      null,
      authH(INSTRUCTOR_TOKEN),
    );

    assert.equal(status, 403);
  });

  test('404 — learner does not exist', async () => {
    mockLearnerByIdRow = null;

    const { status } = await request(
      'GET', `/api/instructor/learner/${LEARNER_ID}`,
      null,
      authH(INSTRUCTOR_TOKEN),
    );

    assert.equal(status, 404);
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', `/api/instructor/learner/${LEARNER_ID}`);
    assert.equal(status, 401);
  });

  test('403 — student token rejected', async () => {
    const { status } = await request(
      'GET', `/api/instructor/learner/${LEARNER_ID}`,
      null,
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 403);
  });

});

// ─── Instructor: atRisk route ─────────────────────────────────────────────────

describe('GET /api/instructor/at-risk/:learnerId', () => {

  const LEARNER_ID = 'learner-uuid-bilal';

  test('200 with learnerId and analysis — valid instructor token for in-scope learner', async () => {
    mockLearnerByIdRow = { id: LEARNER_ID, cohort: 'da-2026-spring' };
    mockRefreshAnalysis = FAKE_ANALYSIS;
    const { status, body } = await request(
      'GET', `/api/instructor/at-risk/${LEARNER_ID}`,
      null,
      authH(INSTRUCTOR_TOKEN),
    );
    assert.equal(status, 200);
    assert.equal(body.learnerId, LEARNER_ID);
    assert.ok(body.analysis,              'analysis key required');
    assert.ok(body.analysis.atRisk,       'analysis.atRisk required');
    assert.ok('goalProgress'   in body.analysis, 'analysis.goalProgress required');
    assert.ok('nextBestAction' in body.analysis, 'analysis.nextBestAction required');
  });

  test('403 — instructor token rejected for out-of-scope learner', async () => {
    mockLearnerByIdRow = { id: LEARNER_ID, cohort: 'ai-2026-spring' };
    mockRefreshAnalysis = FAKE_ANALYSIS;

    const { status } = await request(
      'GET', `/api/instructor/at-risk/${LEARNER_ID}`,
      null,
      authH(INSTRUCTOR_TOKEN),
    );

    assert.equal(status, 403);
  });

  test('404 — learner does not exist', async () => {
    mockLearnerByIdRow = null;

    const { status } = await request(
      'GET', `/api/instructor/at-risk/${LEARNER_ID}`,
      null,
      authH(INSTRUCTOR_TOKEN),
    );

    assert.equal(status, 404);
  });

  test('401 — no token', async () => {
    const { status } = await request('GET', `/api/instructor/at-risk/${LEARNER_ID}`);
    assert.equal(status, 401);
  });

  test('403 — student token rejected', async () => {
    const { status } = await request(
      'GET', `/api/instructor/at-risk/${LEARNER_ID}`,
      null,
      authH(STUDENT_TOKEN),
    );
    assert.equal(status, 403);
  });

});
