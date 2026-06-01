-- Mirrors auth.users with an explicit role column.
-- Role here is the application role (student / instructor / admin).
-- Auth middleware reads role from app_metadata in the JWT, so no DB
-- lookup is required at request time — this table exists as the
-- authoritative source for instructor_cohorts FK and admin tooling.

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
  email      TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
