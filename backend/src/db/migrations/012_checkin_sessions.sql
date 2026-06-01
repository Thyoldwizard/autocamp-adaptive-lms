-- 012_checkin_sessions.sql
-- Persistent check-in session storage (replaces the in-memory Map in checkin.service.js).

CREATE TABLE IF NOT EXISTS checkin_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID        NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  skill_id    UUID        NOT NULL REFERENCES skills(id),
  skill_code  TEXT        NOT NULL,
  questions   JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS checkin_sessions_learner_id_idx
  ON checkin_sessions (learner_id);

CREATE INDEX IF NOT EXISTS checkin_sessions_expires_at_idx
  ON checkin_sessions (expires_at);

GRANT ALL ON checkin_sessions TO service_role;
