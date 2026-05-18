// Runs all SQL migration files via the Supabase Management API.
// No direct database connection required.
// Requires SUPABASE_ACCESS_TOKEN in .env:
//   supabase.com/dashboard/account/tokens → "New token"
require('../config/env');

const fs   = require('fs');
const path = require('path');

const MIGRATIONS_DIR  = path.join(__dirname, 'migrations');
const PROJECT_REF     = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
const ACCESS_TOKEN    = process.env.SUPABASE_ACCESS_TOKEN;
const QUERY_ENDPOINT  = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runQuery(sql) {
  const res = await fetch(QUERY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
}

async function run() {
  if (!ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN is not set in .env');
    console.error('Generate one at: supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Running ${files.length} migration(s)...\n`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`  ${file} ... `);
    try {
      await runQuery(sql);
      console.log('OK');
    } catch (err) {
      console.log('FAILED');
      console.error(`  └─ ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\nAll migrations applied successfully.');
}

run();
