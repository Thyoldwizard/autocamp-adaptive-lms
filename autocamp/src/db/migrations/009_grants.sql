-- Grant Supabase PostgREST roles access to all public schema tables.
-- Required when tables are created via raw SQL instead of the Supabase dashboard.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- service_role: full access (used by supabase-js server-side client)
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- authenticated: full row-level access (gated by RLS when enabled)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE                          ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- anon: read-only on catalog tables only
GRANT SELECT ON skills, modules TO anon;
