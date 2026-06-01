'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Fire a lightweight HTTP request against a running server
function request(server, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const req = http.request(
      { host: '127.0.0.1', port: addr.port, path, method,
        headers: { 'content-type': 'application/json' } },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function withServer(fn) {
  // Fresh require of app each time so rate-limit store is also fresh
  // We achieve isolation by clearing the module cache for app.js only.
  Object.keys(require.cache).forEach((k) => {
    if (k.includes('/src/app.js')) delete require.cache[k];
  });
  const app = require('../../src/app');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    await fn(server);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

describe('rate limiting', () => {
  it('returns 429 on /api/auth after exceeding 20 requests', async () => {
    await withServer(async (server) => {
      const results = [];
      // Send 22 rapid-fire POST /api/auth/login requests
      for (let i = 0; i < 22; i++) {
        results.push(await request(server, '/api/auth/login', 'POST'));
      }
      const statuses = results.map((r) => r.status);
      assert.ok(
        statuses.includes(429),
        `Expected a 429 among statuses after 22 auth requests, got: ${JSON.stringify(statuses)}`,
      );
    });
  });

  it('returns 429 on /api/student/companion after exceeding 30 requests', async () => {
    await withServer(async (server) => {
      const results = [];
      for (let i = 0; i < 32; i++) {
        results.push(await request(server, '/api/student/companion', 'POST'));
      }
      const statuses = results.map((r) => r.status);
      assert.ok(
        statuses.includes(429),
        `Expected a 429 among statuses after 32 companion requests, got: ${JSON.stringify(statuses)}`,
      );
    });
  });

  it('RateLimit-Limit header is present on rate-limited responses', async () => {
    await withServer(async (server) => {
      let lastRes;
      for (let i = 0; i < 22; i++) {
        lastRes = await new Promise((resolve, reject) => {
          const addr = server.address();
          const req = http.request(
            { host: '127.0.0.1', port: addr.port, path: '/api/auth/login', method: 'POST' },
            (res) => {
              let body = '';
              res.on('data', (c) => { body += c; });
              res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
            },
          );
          req.on('error', reject);
          req.end();
        });
      }
      // standardHeaders: true means RateLimit-* headers should appear
      const hasHeader = Object.keys(lastRes.headers).some((h) =>
        h.toLowerCase().startsWith('ratelimit-'),
      );
      assert.ok(hasHeader, 'No RateLimit-* header found on response');
    });
  });
});
