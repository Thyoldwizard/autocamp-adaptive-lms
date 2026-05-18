-- Catalog of learning modules ordered within a program.
-- skill_ids is a denormalized UUID array — no FK enforcement by design.
-- Seed this table before learner data is created.
CREATE TABLE modules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  program     TEXT        NOT NULL,
  sequence    INT         NOT NULL CHECK (sequence > 0),
  skill_ids   UUID[]      NOT NULL DEFAULT '{}',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_program ON modules (program);

COMMENT ON TABLE  modules            IS 'Module catalog ordered within a program';
COMMENT ON COLUMN modules.program    IS 'Matches learners.program, e.g. data-science-bootcamp';
COMMENT ON COLUMN modules.sequence   IS 'Ordering within the program (1-based)';
COMMENT ON COLUMN modules.skill_ids  IS 'Skills taught by this module — denormalized, no FK';
