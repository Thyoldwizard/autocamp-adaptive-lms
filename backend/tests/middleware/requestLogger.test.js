'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// ── logger spy ─────────────────────────────────────────────────────────────
// Intercept process.stdout.write so we can capture structured log lines
// without any real HTTP stack.
let captured = [];
const originalWrite = process.stdout.write.bind(process.stdout);
function startCapture() { captured = []; }
function stopCapture()  { /* noop — we always capture */ }

before(() => {
  process.stdout.write = (chunk, ...args) => {
    captured.push(chunk.toString());
    return originalWrite(chunk, ...args);
  };
});

after(() => {
  process.stdout.write = originalWrite;
});

// ── unit helpers ────────────────────────────────────────────────────────────
const requestLogger = require('../../src/middleware/requestLogger');

function makeReq(overrides = {}) {
  return { method: 'GET', path: '/api/health', ...overrides };
}

function makeRes() {
  const listeners = {};
  return {
    on(event, fn) { listeners[event] = fn; },
    _emit(event) { listeners[event]?.(); },
    statusCode: 200,
  };
}

// ── tests ───────────────────────────────────────────────────────────────────
describe('requestLogger middleware', () => {
  it('attaches a UUID requestId to req', () => {
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;

    requestLogger(req, res, () => { nextCalled = true; });

    assert.ok(nextCalled, 'next() was not called');
    assert.match(
      req.requestId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      'requestId is not a v4 UUID',
    );
  });

  it('assigns a unique requestId per request', () => {
    const req1 = makeReq();
    const req2 = makeReq();
    const res = makeRes();

    requestLogger(req1, res, () => {});
    requestLogger(req2, res, () => {});

    assert.notEqual(req1.requestId, req2.requestId);
  });

  it('logs a structured entry on response finish', () => {
    startCapture();
    const req = makeReq({ method: 'POST', path: '/api/auth/login' });
    const res = makeRes();
    res.statusCode = 401;

    requestLogger(req, res, () => {});
    res._emit('finish');

    const logLines = captured.filter(l => {
      try { return JSON.parse(l).message === 'request'; } catch { return false; }
    });
    assert.ok(logLines.length >= 1, 'no "request" log line emitted on finish');

    const entry = JSON.parse(logLines[logLines.length - 1]);
    assert.equal(entry.level, 'info');
    assert.equal(entry.method, 'POST');
    assert.equal(entry.path, '/api/auth/login');
    assert.equal(entry.statusCode, 401);
    assert.equal(entry.requestId, req.requestId);
    assert.ok(typeof entry.durationMs === 'number', 'durationMs missing');
    assert.ok(typeof entry.timestamp === 'string', 'timestamp missing');
    stopCapture();
  });

  it('does not log before finish fires', () => {
    startCapture();
    const req = makeReq();
    const res = makeRes();

    requestLogger(req, res, () => {});

    const logLines = captured.filter(l => {
      try { return JSON.parse(l).message === 'request'; } catch { return false; }
    });
    assert.equal(logLines.length, 0, 'log fired before finish event');
    stopCapture();
  });
});

// ── logger unit tests ────────────────────────────────────────────────────────
describe('logger', () => {
  const logger = require('../../src/lib/logger');

  it('writes JSON to stdout', () => {
    startCapture();
    logger.info('hello', { foo: 'bar' });
    const lines = captured.filter(l => { try { return JSON.parse(l).message === 'hello'; } catch { return false; } });
    assert.ok(lines.length >= 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, 'info');
    assert.equal(entry.foo, 'bar');
    assert.ok(entry.timestamp);
    stopCapture();
  });

  it('includes all four log methods', () => {
    assert.equal(typeof logger.error, 'function');
    assert.equal(typeof logger.warn,  'function');
    assert.equal(typeof logger.info,  'function');
    assert.equal(typeof logger.debug, 'function');
  });

  it('suppresses debug logs when LOG_LEVEL is info (default)', () => {
    startCapture();
    logger.debug('should be suppressed');
    const lines = captured.filter(l => { try { return JSON.parse(l).message === 'should be suppressed'; } catch { return false; } });
    assert.equal(lines.length, 0, 'debug log was not suppressed at info level');
    stopCapture();
  });
});
