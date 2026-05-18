-- Per-learner per-module progress tracking.
-- A row is created when a learner first interacts with a module.
CREATE TABLE progress (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id           UUID         NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  module_id            UUID         NOT NULL REFERENCES modules(id)  ON DELETE RESTRICT,
  status               TEXT         NOT NULL DEFAULT 'not_started'
                                    CHECK (status IN (
                                      'not_started',
                                      'in_progress',
                                      'completed',
                                      'stalled'
                                    )),
  completion_pct       NUMERIC(5,2) NOT NULL DEFAULT 0
                                    CHECK (completion_pct >= 0 AND completion_pct <= 100),
  time_spent_minutes   INT          NOT NULL DEFAULT 0
                                    CHECK (time_spent_minutes >= 0),
  attempts             INT          NOT NULL DEFAULT 0
                                    CHECK (attempts >= 0),
  last_score           NUMERIC(5,2) CHECK (last_score >= 0 AND last_score <= 100),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (learner_id, module_id)
);

CREATE INDEX idx_progress_learner_status ON progress (learner_id, status);
CREATE INDEX idx_progress_module        ON progress (module_id);

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE  progress             IS 'Per-learner per-module progress';
COMMENT ON COLUMN progress.last_score  IS '0–100; nullable until first scored attempt';
