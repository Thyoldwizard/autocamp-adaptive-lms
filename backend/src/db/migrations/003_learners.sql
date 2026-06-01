-- Shared trigger function used by all tables that carry updated_at.
-- Defined here because learners is the first table that needs it.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core learner profile. One row per enrolled student.
-- program and cohort are free-text strings, not foreign keys.
CREATE TABLE learners (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  background_type  TEXT        NOT NULL
                               CHECK (background_type IN (
                                 'non_technical',
                                 'stem_grad',
                                 'working_professional'
                               )),
  program          TEXT        NOT NULL,
  cohort           TEXT        NOT NULL,
  enrolled_at      TIMESTAMPTZ,
  stated_goal      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learners_cohort  ON learners (cohort);
CREATE INDEX idx_learners_user_id ON learners (user_id);

CREATE TRIGGER trg_learners_updated_at
  BEFORE UPDATE ON learners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE  learners                  IS 'Core learner profile — one row per enrolled student';
COMMENT ON COLUMN learners.user_id          IS 'References Supabase auth.users';
COMMENT ON COLUMN learners.background_type  IS 'non_technical | stem_grad | working_professional';
COMMENT ON COLUMN learners.program          IS 'Free-text, e.g. data-science-bootcamp';
COMMENT ON COLUMN learners.cohort           IS 'Free-text, e.g. ds-2026-spring';
