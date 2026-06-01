'use strict';

process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const requireRole = require('../../src/middleware/requireRole');

function makeReq(role) {
  return { user: role != null ? { id: 'uid', role, email: 'u@t.com' } : undefined };
}

function makeNext() {
  const calls = [];
  const fn = (arg) => calls.push(arg);
  fn.calls = calls;
  return fn;
}

describe('requireRole middleware', () => {
  test('matching role — calls next() with no error', () => {
    const next = makeNext();
    requireRole('student')(makeReq('student'), null, next);

    assert.equal(next.calls.length, 1);
    assert.equal(next.calls[0], undefined);
  });

  test('wrong role — 403 Forbidden', () => {
    const next = makeNext();
    requireRole('instructor')(makeReq('student'), null, next);

    assert.equal(next.calls[0].statusCode, 403);
  });

  test('instructor role allowed through instructor guard', () => {
    const next = makeNext();
    requireRole('instructor')(makeReq('instructor'), null, next);

    assert.equal(next.calls[0], undefined);
  });

  test('no req.user (auth middleware not run) — 401', () => {
    const next = makeNext();
    requireRole('student')(makeReq(null), null, next);

    assert.equal(next.calls[0].statusCode, 401);
  });

  test('null role on req.user — 403', () => {
    const next = makeNext();
    requireRole('student')({ user: { id: 'uid', role: null } }, null, next);

    assert.equal(next.calls[0].statusCode, 403);
  });
});
