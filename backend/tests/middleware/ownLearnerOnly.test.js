'use strict';

process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { withClient } = require('../../src/middleware/ownLearnerOnly');

const USER_ID    = 'auth-user-uuid-abc';
const LEARNER_ID = 'learner-uuid-xyz';

// Builds a mock supabase client whose .from().select().eq().single() resolves to `result`.
function mockSupabase(result) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => result,
        }),
      }),
    }),
  };
}

function makeReq() {
  return { user: { id: USER_ID, role: 'student', email: 'u@t.com' } };
}

function makeNext() {
  const calls = [];
  const fn = (arg) => calls.push(arg);
  fn.calls = calls;
  return fn;
}

describe('ownLearnerOnly middleware', () => {
  test('learner found — sets req.learnerId and calls next()', async () => {
    const middleware = withClient(mockSupabase({ data: { id: LEARNER_ID }, error: null }));
    const req  = makeReq();
    const next = makeNext();

    await middleware(req, null, next);

    assert.equal(next.calls[0], undefined, 'next() called without error');
    assert.equal(req.learnerId, LEARNER_ID);
  });

  test('learner not found (null data) — 404', async () => {
    const middleware = withClient(mockSupabase({ data: null, error: null }));
    const next = makeNext();

    await middleware(makeReq(), null, next);

    assert.equal(next.calls[0].statusCode, 404);
  });

  test('supabase error — 404', async () => {
    const middleware = withClient(mockSupabase({ data: null, error: { message: 'not found' } }));
    const next = makeNext();

    await middleware(makeReq(), null, next);

    assert.equal(next.calls[0].statusCode, 404);
  });

  test('supabase throws — error forwarded to next()', async () => {
    const throwingClient = {
      from: () => { throw new Error('connection lost'); },
    };
    const middleware = withClient(throwingClient);
    const next = makeNext();

    await middleware(makeReq(), null, next);

    assert.ok(next.calls[0] instanceof Error);
    assert.equal(next.calls[0].message, 'connection lost');
  });
});
