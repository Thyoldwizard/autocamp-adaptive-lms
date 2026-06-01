-- Live override layer for the adaptive rules engine (see src/config/rules.js).
--
-- A single JSONB row holds a *partial* override object that is deep-merged on
-- top of the code DEFAULTS and any RULES_* env overrides at server startup
-- (loadRules()). This lets thresholds be retuned without a redeploy. The table
-- is intentionally optional: if it is empty or absent, the engine runs on
-- defaults+env, so the app keeps working before this migration is applied.
--
-- Keeping it single-row keeps reads trivial; loadRules() orders by updated_at
-- and takes the newest, so an accidental extra row never breaks resolution.

CREATE TABLE IF NOT EXISTS rules_config (
  id         INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the single row so updates can be a plain UPDATE. Empty config = "use
-- defaults+env for everything".
INSERT INTO rules_config (id, config)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 009_grants.sql only covered tables that existed when it ran, so this
-- table needs its own grant. The backend reads it via the service_role client.
GRANT ALL ON rules_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rules_config TO authenticated;
