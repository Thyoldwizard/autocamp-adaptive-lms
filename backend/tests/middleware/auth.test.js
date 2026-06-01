'use strict';

// Set required env vars before any require triggers env.js
process.env.SUPABASE_URL            = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET     = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt    = require('jsonwebtoken');

const SECRET = process.env.SUPABASE_JWT_SECRET;

// Mock supabase before auth.js is required
require('module').Module._cache[require.resolve('../../src/config/supabase')] = {
  id: require.resolve('../../src/config/supabase'),
  filename: require.resolve('../../src/config/supabase'),
  loaded: true,
  exports: {
    auth: {
      getUser: async (token) => {
        try {
          const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
          return { data: { user: { id: payload.sub, email: payload.email, app_metadata: payload.app_metadata } }, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      }
    }
  }
};

const auth = require('../../src/middleware/auth');

function makeToken(payload = {}, options = {}) {
  return jwt.sign(
    { sub: 'user-uuid-123', email: 'test@test.com', app_metadata: { role: 'student' }, ...payload },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h', ...options },
  );
}

function makeReq(authHeader) {
  return { headers: { authorization: authHeader } };
}

function makeNext() {
  const calls = [];
  const fn = (arg) => calls.push(arg);
  fn.calls = calls;
  return fn;
}

describe('auth middleware', () => {
  test('valid token — populates req.user and calls next()', async () => {
    const token = makeToken();
    const req   = makeReq(`Bearer ${token}`);
    const next  = makeNext();

    await auth(req, null, next);

    assert.equal(next.calls.length, 1);
    assert.equal(next.calls[0], undefined, 'next() called with no error');
    assert.equal(req.user.id,    'user-uuid-123');
    assert.equal(req.user.role,  'student');
    assert.equal(req.user.email, 'test@test.com');
  });

  test('missing Authorization header — 401', async () => {
    const req  = makeReq(undefined);
    const next = makeNext();

    await auth(req, null, next);

    assert.equal(next.calls.length, 1);
    assert.equal(next.calls[0].statusCode, 401);
  });

  test('non-Bearer scheme — 401', async () => {
    const req  = makeReq('Basic abc123');
    const next = makeNext();

    await auth(req, null, next);

    assert.equal(next.calls[0].statusCode, 401);
  });

  test('tampered / invalid token — 401', async () => {
    const req  = makeReq('Bearer not.a.valid.jwt');
    const next = makeNext();

    await auth(req, null, next);

    assert.equal(next.calls[0].statusCode, 401);
  });

  test('expired token — 401', async () => {
    const token = makeToken({}, { expiresIn: -1 }); // already expired
    const req   = makeReq(`Bearer ${token}`);
    const next  = makeNext();

    await auth(req, null, next);

    assert.equal(next.calls[0].statusCode, 401);
  });

  test('token with no app_metadata role — req.user.role is null', async () => {
    const token = jwt.sign(
      { sub: 'user-uuid-999', email: 'norole@test.com' },
      SECRET,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    const req  = makeReq(`Bearer ${token}`);
    const next = makeNext();

    await auth(req, null, next);

    assert.equal(next.calls[0], undefined, 'next() called without error');
    assert.equal(req.user.role, null);
  });
});
