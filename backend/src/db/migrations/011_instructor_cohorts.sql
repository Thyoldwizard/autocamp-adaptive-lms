-- Maps each instructor to the cohort strings they are authorised to view.
-- cohortScope.js queries this table to populate req.allowedCohorts.
-- Cohort is a free-text string matching the cohort column on learners —
-- no FK to a cohorts catalog table (intentional, matches learners schema).

CREATE TABLE IF NOT EXISTS instructor_cohorts (
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort        TEXT NOT NULL,
  PRIMARY KEY (instructor_id, cohort)
);

-- Grants for the two tables created in 010 and 011.
-- 009_grants.sql covers only tables that existed when it ran,
-- so new tables need explicit grants here.
GRANT ALL ON profiles, instructor_cohorts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, instructor_cohorts TO authenticated;
