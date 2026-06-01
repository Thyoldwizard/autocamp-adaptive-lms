'use strict';

/**
 * Tests for src/lib/validate.js middleware factory and per-route schema rejection.
 *
 * Run: node --test tests/middleware/validate.test.js
 */

process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET       = 'test-jwt-secret-min-32-chars-ok!!';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { z }  = require('zod');

const { validate }      = require('../../src/lib/validate');
const { BadRequestError } = require('../../src/lib/errors');

// ─── Helper: create a fake Express req/res/next ───────────────────────────────
function makeReq({ body, params, query } = {}) {
  return { body: body ?? {}, params: params ?? {}, query: query ?? {} };
}

function runMiddleware(mw, req) {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve({ err, req }));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// validate() — middleware factory unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('validate() — body schema', () => {

  const schema = z.object({
    name:  z.string().min(1, 'is required'),
    score: z.number().int().min(0).max(100),
  });

  test('valid body passes — req.body replaced with coerced output', async () => {
    const req = makeReq({ body: { name: 'Amna', score: 85 } });
    const { err } = await runMiddleware(validate({ body: schema }), req);
    assert.equal(err, undefined);
    assert.equal(req.body.name, 'Amna');
    assert.equal(req.body.score, 85);
  });

  test('missing required field → BadRequestError containing field name', async () => {
    const req = makeReq({ body: { score: 85 } });
    const { err } = await runMiddleware(validate({ body: schema }), req);
    assert.ok(err instanceof BadRequestError, 'should be BadRequestError');
    assert.ok(err.message.toLowerCase().includes('name'), `message should include 'name': ${err.message}`);
  });

  test('wrong type → BadRequestError', async () => {
    const req = makeReq({ body: { name: 'Amna', score: 'not-a-number' } });
    const { err } = await runMiddleware(validate({ body: schema }), req);
    assert.ok(err instanceof BadRequestError);
    assert.ok(err.message.toLowerCase().includes('score'));
  });

  test('multiple field errors → all reported in single message', async () => {
    const req = makeReq({ body: {} });
    const { err } = await runMiddleware(validate({ body: schema }), req);
    assert.ok(err instanceof BadRequestError);
    assert.ok(err.message.includes('name'));
    assert.ok(err.message.includes('score'));
  });

  test('null body treated as empty object — does not throw', async () => {
    const req = makeReq({ body: null });
    const { err } = await runMiddleware(validate({ body: schema }), req);
    assert.ok(err instanceof BadRequestError);
  });

  test('extra fields are stripped from req.body', async () => {
    const req = makeReq({ body: { name: 'Amna', score: 50, extra: 'ignored' } });
    await runMiddleware(validate({ body: schema }), req);
    assert.ok(!('extra' in req.body), 'extra field should be stripped');
  });

});

describe('validate() — params schema', () => {

  const schema = z.object({
    id: z.string().uuid('must be a valid UUID'),
  });

  test('valid UUID param passes', async () => {
    const req = makeReq({ params: { id: '00000000-0000-0000-0000-000000000000' } });
    const { err } = await runMiddleware(validate({ params: schema }), req);
    assert.equal(err, undefined);
  });

  test('non-UUID param → BadRequestError containing field name', async () => {
    const req = makeReq({ params: { id: 'not-a-uuid' } });
    const { err } = await runMiddleware(validate({ params: schema }), req);
    assert.ok(err instanceof BadRequestError);
    assert.ok(err.message.toLowerCase().includes('id'));
  });

});

describe('validate() — trim behaviour', () => {

  const schema = z.object({
    message: z.string().trim().min(1, 'is required'),
  });

  test('whitespace-only string → BadRequestError after trim', async () => {
    const req = makeReq({ body: { message: '   ' } });
    const { err } = await runMiddleware(validate({ body: schema }), req);
    assert.ok(err instanceof BadRequestError);
    assert.ok(err.message.toLowerCase().includes('message'));
  });

  test('non-empty string is trimmed in req.body output', async () => {
    const req = makeReq({ body: { message: '  hello  ' } });
    await runMiddleware(validate({ body: schema }), req);
    assert.equal(req.body.message, 'hello');
  });

});

describe('validate() — combined body + params', () => {

  const bodySchema   = z.object({ note: z.string().min(1, 'is required') });
  const paramsSchema = z.object({ id:   z.string().uuid() });

  test('both valid — no error', async () => {
    const req = makeReq({
      body:   { note: 'looks great' },
      params: { id:   '00000000-0000-0000-0000-000000000000' },
    });
    const { err } = await runMiddleware(validate({ body: bodySchema, params: paramsSchema }), req);
    assert.equal(err, undefined);
  });

  test('both invalid — message includes both field names', async () => {
    const req = makeReq({ body: {}, params: { id: 'bad' } });
    const { err } = await runMiddleware(validate({ body: bodySchema, params: paramsSchema }), req);
    assert.ok(err instanceof BadRequestError);
    assert.ok(err.message.toLowerCase().includes('note'));
    assert.ok(err.message.toLowerCase().includes('id'));
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Per-schema sanity tests — ensure each schema accepts valid input
// and rejects the documented bad cases
// ─────────────────────────────────────────────────────────────────────────────

describe('checkin.schemas — submitBody', () => {

  const { submitBody } = require('../../src/schemas/checkin.schemas');

  test('valid sessionId UUID + answers array passes', () => {
    const r = submitBody.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000000',
      answers: [0, 1, 2, 3],
    });
    assert.equal(r.success, true);
  });

  test('non-UUID sessionId rejected', () => {
    const r = submitBody.safeParse({ sessionId: 'fake', answers: [0] });
    assert.equal(r.success, false);
    assert.ok(r.error.issues.some((i) => i.path.includes('sessionId')));
  });

  test('missing answers rejected', () => {
    const r = submitBody.safeParse({ sessionId: '00000000-0000-0000-0000-000000000000' });
    assert.equal(r.success, false);
    assert.ok(r.error.issues.some((i) => i.path.includes('answers')));
  });

  test('float answer rejected', () => {
    const r = submitBody.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000000',
      answers: [0.5],
    });
    assert.equal(r.success, false);
  });

});

describe('companion.schemas — messageBody', () => {

  const { messageBody } = require('../../src/schemas/companion.schemas');

  test('valid message passes', () => {
    assert.equal(messageBody.safeParse({ message: 'Hello!' }).success, true);
  });

  test('empty string rejected', () => {
    assert.equal(messageBody.safeParse({ message: '' }).success, false);
  });

  test('whitespace-only rejected', () => {
    assert.equal(messageBody.safeParse({ message: '   ' }).success, false);
  });

  test('message over 2000 chars rejected', () => {
    assert.equal(messageBody.safeParse({ message: 'a'.repeat(2001) }).success, false);
  });

  test('message trimmed in output', () => {
    const r = messageBody.safeParse({ message: '  hi  ' });
    assert.equal(r.success, true);
    assert.equal(r.data.message, 'hi');
  });

});

describe('auth.schemas — register', () => {

  const { register } = require('../../src/schemas/auth.schemas');

  const BASE = {
    email: 'test@example.com',
    password: 'password123',
    role: 'instructor',
    name: 'Test User',
  };

  test('valid instructor registration passes', () => {
    assert.equal(register.safeParse(BASE).success, true);
  });

  test('invalid email rejected', () => {
    const r = register.safeParse({ ...BASE, email: 'not-an-email' });
    assert.equal(r.success, false);
    assert.ok(r.error.issues.some((i) => i.path.includes('email')));
  });

  test('password under 8 chars rejected', () => {
    const r = register.safeParse({ ...BASE, password: 'short' });
    assert.equal(r.success, false);
    assert.ok(r.error.issues.some((i) => i.path.includes('password')));
  });

  test('invalid role rejected', () => {
    const r = register.safeParse({ ...BASE, role: 'admin' });
    assert.equal(r.success, false);
  });

  test('student without background_type rejected', () => {
    const r = register.safeParse({
      ...BASE,
      role: 'student',
      program: 'data-analytics-bootcamp',
      cohort: 'da-2026-spring',
      // background_type missing
    });
    assert.equal(r.success, false);
  });

  test('valid student registration passes', () => {
    const r = register.safeParse({
      ...BASE,
      role: 'student',
      background_type: 'non_technical',
      program: 'data-analytics-bootcamp',
      cohort: 'da-2026-spring',
    });
    assert.equal(r.success, true);
  });

});

describe('dashboard.schemas — activityBody', () => {

  const { activityBody } = require('../../src/schemas/dashboard.schemas');

  test('minimal valid body (attempts only) passes', () => {
    assert.equal(activityBody.safeParse({ attempts: 1 }).success, true);
  });

  test('negative attempts rejected', () => {
    assert.equal(activityBody.safeParse({ attempts: -1 }).success, false);
  });

  test('score over 100 rejected', () => {
    assert.equal(activityBody.safeParse({ attempts: 1, score: 101 }).success, false);
  });

  test('float attempts rejected', () => {
    assert.equal(activityBody.safeParse({ attempts: 1.5 }).success, false);
  });

});

describe('instructor.schemas — flagBody', () => {

  const { flagBody, flagParams } = require('../../src/schemas/instructor.schemas');

  test('valid note passes', () => {
    assert.equal(flagBody.safeParse({ note: 'struggling with SQL' }).success, true);
  });

  test('empty note rejected', () => {
    assert.equal(flagBody.safeParse({ note: '' }).success, false);
  });

  test('whitespace-only note rejected', () => {
    assert.equal(flagBody.safeParse({ note: '   ' }).success, false);
  });

  test('note trimmed in output', () => {
    const r = flagBody.safeParse({ note: '  needs help  ' });
    assert.equal(r.data.note, 'needs help');
  });

  test('valid UUID learnerId passes', () => {
    assert.equal(flagParams.safeParse({ learnerId: '00000000-0000-0000-0000-000000000000' }).success, true);
  });

  test('non-UUID learnerId rejected', () => {
    assert.equal(flagParams.safeParse({ learnerId: 'bad-id' }).success, false);
  });

});
