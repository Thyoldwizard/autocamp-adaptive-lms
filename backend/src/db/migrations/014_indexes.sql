-- 014_indexes.sql
-- Performance indexes added alongside B6 pagination.

-- Reverse lookup: find all skill_state rows for a given skill_id.
-- Used by the cohort heatmap and signalSweep aggregations.
-- (Migration 004 only indexed learner_id; skill_id lookups were full-scans.)
CREATE INDEX IF NOT EXISTS idx_skill_state_skill
  ON skill_state (skill_id);
