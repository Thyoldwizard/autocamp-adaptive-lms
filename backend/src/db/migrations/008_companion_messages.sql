-- Enum for companion message role.
CREATE TYPE companion_role AS ENUM (
  'user',
  'assistant'
);

-- Persisted chat history for the AI learning companion.
-- skill_id and module_id are optional context tags on a message.
CREATE TABLE companion_messages (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       UUID           NOT NULL REFERENCES learners(id)  ON DELETE CASCADE,
  role             companion_role NOT NULL,
  content          TEXT           NOT NULL,
  skill_id         UUID           REFERENCES skills(id)  ON DELETE SET NULL,
  module_id        UUID           REFERENCES modules(id) ON DELETE SET NULL,
  context_snapshot JSONB,
  model_used       TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Fast lookup for paginated chat history (newest first).
CREATE INDEX idx_companion_learner_created ON companion_messages (learner_id, created_at DESC);

COMMENT ON TABLE  companion_messages                  IS 'Persisted AI companion chat history per learner';
COMMENT ON COLUMN companion_messages.skill_id         IS 'Optional skill this message pertains to';
COMMENT ON COLUMN companion_messages.module_id        IS 'Optional module this message pertains to';
COMMENT ON COLUMN companion_messages.context_snapshot IS 'Rules-built context passed to the LLM at call time';
COMMENT ON COLUMN companion_messages.model_used       IS 'e.g. gemini-1.5-flash or fallback';
