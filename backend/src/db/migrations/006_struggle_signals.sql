-- Enum types for struggle_signals.
CREATE TYPE signal_type AS ENUM (
  'missed_deadline',
  'low_score',
  'repeated_attempts',
  'inactivity',
  'help_requested',
  'instructor_flag'
);

CREATE TYPE signal_source AS ENUM (
  'system',
  'instructor',
  'companion'
);

-- Timestamped events indicating a learner is struggling.
-- Written by: the rules engine inline on progress events,
--             the periodic inactivity sweep job,
--             the companion on help_requested,
--             instructors via the instructor API.
CREATE TABLE struggle_signals (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID          NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  signal_type signal_type   NOT NULL,
  severity    TEXT          NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  source      signal_source NOT NULL,
  context     JSONB,
  notes       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Fast lookup for per-learner signal history (newest first).
CREATE INDEX idx_signals_learner_created ON struggle_signals (learner_id, created_at DESC);
-- Partial index to query unresolved signals efficiently.
CREATE INDEX idx_signals_unresolved ON struggle_signals (learner_id) WHERE resolved_at IS NULL;

COMMENT ON TABLE  struggle_signals          IS 'Struggle events written by system, instructor, or companion';
COMMENT ON COLUMN struggle_signals.context  IS 'e.g. {"module_id":"...","score":42,"deadline_missed_by_days":3}';
COMMENT ON COLUMN struggle_signals.notes    IS 'Free-text note; typically provided on instructor_flag entries';
