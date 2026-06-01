'use strict';

process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { withClient } = require('../../src/middleware/cohortScope');

const INSTRUCTOR_ID = 'auth-instructor-uuid-abc';

// Builds a mock supabase client whose .from().select().eq() resolves to `result`.
function mockSupabase(result) {
  return {
    from: () => ({
      select: () => ({
        eq: async () => result,
      }),
    }),
  };
}

function makeReq() {
  return { user: { id: INSTRUCTOR_ID, role: 'instructor', email: 'inst@t.com' } };
}

function makeNext() {
  const calls = [];
  const fn = (arg) => calls.push(arg);
  fn.calls = calls;
  return fn;
}

describe('cohortScope middleware', () => {
  test('instructor with one cohort — req.instructorCohorts has one entry', async () => {
    const middleware = withClient(mockSupabase({ data: [{ cohort: 'da-2026-spring' }], error: null }));
    const req  = makeReq();
    const next = makeNext();

    await middleware(req, null, next);

    assert.equal(next.calls[0], undefined, 'next() called without error');
    assert.deepEqual(req.instructorCohorts, ['da-2026-spring']);
  });

  test('instructor with multiple cohorts — req.instructorCohorts has all entries', async () => {
    const rows = [
      { cohort: 'da-2026-spring' },
      { cohort: 'ai-2026-spring' },
      { cohort: 'auto-2026-spring' },
    ];
    const middleware = withClient(mockSupabase({ data: rows, error: null }));
    const req  = makeReq();
    const next = makeNext();

    await middleware(req, null, next);

    assert.equal(next.calls[0], undefined, 'next() called without error');
    assert.deepEqual(req.instructorCohorts, ['da-2026-spring', 'ai-2026-spring', 'auto-2026-spring']);
  });

  test('instructor with no cohorts — req.instructorCohorts is empty array', async () => {
    const middleware = withClient(mockSupabase({ data: [], error: null }));
    const req  = makeReq();
    const next = makeNext();

    await middleware(req, null, next);

    assert.equal(next.calls[0], undefined, 'next() called without error');
    assert.deepEqual(req.instructorCohorts, []);
  });

  test('DB error — forwards ForbiddenError (403) to next()', async () => {
    const middleware = withClient(mockSupabase({ data: null, error: { message: 'permission denied' } }));
    const next = makeNext();

    await middleware(makeReq(), null, next);

    assert.equal(next.calls[0].statusCode, 403);
  });

  test('DB throws — propagates thrown error to next()', async () => {
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
