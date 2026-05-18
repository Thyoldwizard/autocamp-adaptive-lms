-- Catalog of teachable skills across all programs.
-- Seed this table before learner data is created.
CREATE TABLE skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  domain      TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  skills        IS 'Skill catalog — shared across all programs';
COMMENT ON COLUMN skills.code   IS 'Machine-readable key, e.g. sql_joins, python_pandas';
COMMENT ON COLUMN skills.domain IS 'Broad category: sql | python | ml | stats | soft_skill';
