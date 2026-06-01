-- Portfolio items, milestones, and placement records per learner.
CREATE TABLE outcomes (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       UUID         NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  outcome_type     TEXT         NOT NULL CHECK (outcome_type IN (
                                  'portfolio_item',
                                  'milestone',
                                  'placement'
                                )),
  title            TEXT         NOT NULL,
  url              TEXT,
  status           TEXT         NOT NULL DEFAULT 'in_progress'
                               CHECK (status IN ('in_progress', 'achieved')),
  goal_progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0
                               CHECK (goal_progress_pct >= 0 AND goal_progress_pct <= 100),
  achieved_at      TIMESTAMPTZ,
  metadata         JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- achieved_at must be set when the outcome is marked achieved.
  CONSTRAINT chk_achieved_at CHECK (
    status <> 'achieved' OR achieved_at IS NOT NULL
  )
);

CREATE INDEX idx_outcomes_learner        ON outcomes (learner_id);
CREATE INDEX idx_outcomes_learner_status ON outcomes (learner_id, status);

CREATE TRIGGER trg_outcomes_updated_at
  BEFORE UPDATE ON outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE  outcomes                    IS 'Portfolio items, milestones, and placement records';
COMMENT ON COLUMN outcomes.goal_progress_pct  IS 'Rules-engine estimate of progress toward learners.stated_goal (0–100)';
COMMENT ON COLUMN outcomes.metadata           IS 'Freeform structured data, e.g. project links, employer info';
