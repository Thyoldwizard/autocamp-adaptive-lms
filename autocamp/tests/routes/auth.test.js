'use strict';

// ── Env stubs (must come before any require that loads env.js) ────────────────
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe, before, after } = require('node:test');
const assert  = require('node:assert/strict');
const http    = require('node:http');
const jwt     = require('jsonwebtoken');

// ── We need to swap the supabase module out BEFORE app.js is loaded.
// Strategy: build a mock client and monkey-patch the module cache so that
// `require('../config/supabase')` inside auth.routes.js gets our mock.
// This is the same DI pattern used by ownLearnerOnly tests but applied at
// the module-cache level for route-level tests.

// ─── Shared mock state ────────────────────────────────────────────────────────
//
// Each test resets these to control what the mock Supabase returns.
let mockCreateUserResult  = null;
let mockSignInResult      = null;
let mockSignOutResult     = null;
let mockLearnerInsertResult = null;
let mockProfileInsertResult = null;
let deletedUserIds = [];
let profileInserts = [];

// ─── Mock Supabase client ─────────────────────────────────────────────────────
const mockSupabase = {
  auth: {
    admin: {
      createUser: async (_opts) => mockCreateUserResult,
      deleteUser: async (id) => {
        deletedUserIds.push(id);
        return { error: null };
      },
      signOut:    async (_token) => mockSignOutResult ?? { error: null },
    },
    signInWithPassword: async (_creds) => mockSignInResult,
    getUser: async (token) => {
      try {
        const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
        return { data: { user: { id: payload.sub, email: payload.email, app_metadata: payload.app_metadata } }, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }
  },
  from: (table) => ({
    insert: (data) => {
      if (table === 'profiles') {
        profileInserts.push(data);
        return mockProfileInsertResult ?? { data: null, error: null };
      }

      if (table === 'learners') {
        return {
          select: async () => mockLearnerInsertResult,
        };
      }

      return { data: null, error: null };
    },
  }),
};

// Inject mock before loading the app
require.cache[require.resolve('../../src/config/supabase')] = {
  id:       require.resolve('../../src/config/supabase'),
  filename: require.resolve('../../src/config/supabase'),
  loaded:   true,
  exports:  mockSupabase,
};

// Now load the app (auth.routes.js will pick up our mock via require cache)
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
  const json = await res.json();
  return { status: res.status, body: json };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeToken(payload = {}) {
  return jwt.sign(
    { sub: 'user-uuid-123', email: 'test@test.com', app_metadata: { role: 'student' }, ...payload },
    process.env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

const STUDENT_BODY = {
  email:           'new.student@atomcamp.test',
  password:        'SecurePass123!',
  role:            'student',
  name:            'Test Student',
  background_type: 'non_technical',
  program:         'data-analytics-bootcamp',
  cohort:          'da-2026-test',
  goal:            'Learn data analytics',
};

const INSTRUCTOR_BODY = {
  email:    'instructor@atomcamp.test',
  password: 'SecurePass123!',
  role:     'instructor',
  name:     'Test Instructor',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {

  test('successful student registration — 201 with learner record', async () => {
    deletedUserIds = [];
    profileInserts = [];
    const fakeUser = { id: 'user-uuid-new', email: STUDENT_BODY.email };
    const signedInUser = { ...fakeUser, app_metadata: { role: 'student' } };
    const fakeToken = 'student-register-token';
    const fakeLearner = {
      id: 'learner-uuid-new',
      user_id: fakeUser.id,
      name: STUDENT_BODY.name,
      background_type: STUDENT_BODY.background_type,
      program: STUDENT_BODY.program,
      cohort: STUDENT_BODY.cohort,
      stated_goal: STUDENT_BODY.goal,
    };

    mockCreateUserResult = { data: { user: fakeUser }, error: null };
    mockProfileInsertResult = { data: null, error: null };
    mockLearnerInsertResult = { data: [fakeLearner], error: null };
    mockSignInResult = {
      data: { session: { access_token: fakeToken }, user: signedInUser },
      error: null,
    };

    const { status, body } = await request('POST', '/api/auth/register', STUDENT_BODY);

    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.access_token, fakeToken);
    assert.ok(body.learner, 'Response should include learner object');
    assert.ok(body.user,    'Response should include user object');
    assert.equal(body.learner.id, 'learner-uuid-new');
    assert.equal(body.user.id,    'user-uuid-new');
    assert.equal(profileInserts.length, 1);
    assert.deepEqual(profileInserts[0], {
      id: fakeUser.id,
      role: 'student',
      email: STUDENT_BODY.email,
      name: STUDENT_BODY.name,
    });
    assert.deepEqual(deletedUserIds, []);
  });

  test('successful instructor registration — 201 with user only (no learner insert)', async () => {
    deletedUserIds = [];
    profileInserts = [];
    const fakeUser = { id: 'user-uuid-instructor', email: INSTRUCTOR_BODY.email };
    const fakeToken = 'instructor-register-token';

    mockCreateUserResult = { data: { user: fakeUser }, error: null };
    mockProfileInsertResult = { data: null, error: null };
    mockLearnerInsertResult = { data: null, error: new Error('learners.insert called for instructor — should not happen') };
    mockSignInResult = {
      data: { session: { access_token: fakeToken }, user: fakeUser },
      error: null,
    };

    const { status, body } = await request('POST', '/api/auth/register', INSTRUCTOR_BODY);

    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.access_token, fakeToken);
    assert.ok(body.user,    'Response should include user object');
    assert.equal(body.user.id, 'user-uuid-instructor');
    assert.equal(body.learner, undefined, 'No learner record should be returned for instructors');
    assert.equal(profileInserts.length, 1);
    assert.deepEqual(profileInserts[0], {
      id: fakeUser.id,
      role: 'instructor',
      email: INSTRUCTOR_BODY.email,
      name: INSTRUCTOR_BODY.name,
    });
    assert.deepEqual(deletedUserIds, []);
  });

  test('student registration rolls back auth user when learner insert fails', async () => {
    deletedUserIds = [];
    profileInserts = [];
    const fakeUser = { id: 'user-uuid-rollback', email: STUDENT_BODY.email };

    mockCreateUserResult = { data: { user: fakeUser }, error: null };
    mockProfileInsertResult = { data: null, error: null };
    mockLearnerInsertResult = { data: null, error: new Error('learner insert failed') };

    const { status, body } = await request('POST', '/api/auth/register', STUDENT_BODY);

    assert.equal(status, 500);
    assert.ok(body.error?.message);
    assert.deepEqual(deletedUserIds, [fakeUser.id]);
  });

  test('registration with invalid role — 400', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      ...STUDENT_BODY,
      role: 'admin',
    });

    assert.equal(status, 400);
    assert.ok(body.error?.message?.includes("'student' or 'instructor'"));
  });

  test('duplicate email — 400', async () => {
    mockCreateUserResult = {
      data:  { user: null },
      error: { message: 'User already registered', status: 422 },
    };

    const { status, body } = await request('POST', '/api/auth/register', STUDENT_BODY);

    assert.equal(status, 400);
    assert.ok(body.error?.message?.toLowerCase().includes('already exists'));
  });

});

describe('POST /api/auth/login', () => {

  test('successful login — 200 with access_token and user', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.token';
    const fakeUser  = { id: 'user-uuid-123', email: 'amna.malik@atomcamp.test' };

    mockSignInResult = {
      data:  { session: { access_token: fakeToken }, user: fakeUser },
      error: null,
    };

    const { status, body } = await request('POST', '/api/auth/login', {
      email:    'amna.malik@atomcamp.test',
      password: 'AtomCamp2026!',
    });

    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body.access_token, 'Response should include access_token');
    assert.ok(body.user,         'Response should include user');
    assert.equal(body.access_token, fakeToken);
    assert.equal(body.user.id, 'user-uuid-123');
  });

  test('login with wrong password — 401', async () => {
    mockSignInResult = {
      data:  { session: null, user: null },
      error: { message: 'Invalid login credentials', status: 400 },
    };

    const { status, body } = await request('POST', '/api/auth/login', {
      email:    'amna.malik@atomcamp.test',
      password: 'WrongPassword!',
    });

    assert.equal(status, 401);
    assert.ok(body.error?.message?.toLowerCase().includes('invalid'));
  });

});

describe('POST /api/auth/logout', () => {

  test('logout with valid token — 200', async () => {
    mockSignOutResult = { error: null };

    const token = makeToken();
    const { status, body } = await request(
      'POST',
      '/api/auth/logout',
      null,
      { Authorization: `Bearer ${token}` },
    );

    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body.message?.toLowerCase().includes('logged out'));
  });

  test('logout without token — 401', async () => {
    const { status } = await request('POST', '/api/auth/logout');
    assert.equal(status, 401);
  });

});
