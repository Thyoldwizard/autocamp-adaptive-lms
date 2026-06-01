-- Per-learner per-skill proficiency and confidence estimates.
-- Written initially by the onboarding diagnostic and updated by the rules engine.
CREATE TABLE skill_state (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       UUID        NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  skill_id         UUID        NOT NULL REFERENCES skills(id)   ON DELETE RESTRICT,
  proficiency      NUMERIC(4,3) NOT NULL DEFAULT 0
                               CHECK (proficiency >= 0 AND proficiency <= 1),
  confidence       NUMERIC(4,3) NOT NULL DEFAULT 0
                               CHECK (confidence  >= 0 AND confidence  <= 1),
  last_assessed_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (learner_id, skill_id)
);

CREATE INDEX idx_skill_state_learner ON skill_state (learner_id);

CREATE TRIGGER trg_skill_state_updated_at
  BEFORE UPDATE ON skill_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE  skill_state               IS 'Per-learner per-skill proficiency and confidence';
COMMENT ON COLUMN skill_state.proficiency   IS '0–1; set by diagnostic, updated by rules engine';
COMMENT ON COLUMN skill_state.confidence    IS '0–1; self-reported or modelled';
