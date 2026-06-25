-- Schema verification after Supabase migration
-- Usage: psql "SUPABASE_DATABASE_URL" -f apps/foasis-backend/docs/sql/supabase-verify-schema.sql

\echo '=== Tables in public schema (expect 29: 28 app + _prisma_migrations) ==='
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo '=== Enums (expect 14) ==='
SELECT typname AS enum_name
FROM pg_type
WHERE typtype = 'e'
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY typname;

\echo '=== Foreign keys (expect 11) ==='
SELECT
  con.conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS references_table
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY con.conname;

\echo '=== Unique indexes (expect 11) ==='
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%UNIQUE%'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

\echo '=== Prisma migration history (expect 20250616000000_init) ==='
SELECT migration_name, finished_at, applied_steps_count
FROM "_prisma_migrations"
ORDER BY finished_at;
