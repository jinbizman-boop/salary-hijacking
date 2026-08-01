-- database/migrations/0013_force_rls_user_owned_tables.sql
-- Force RLS on user-owned runtime tables so owner-role connections are still
-- evaluated through tenant isolation policies in staging and QA validation.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
DECLARE
  user_owned_table record;
BEGIN
  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION '0013_force_rls_user_owned_tables.sql requires public.current_app_user_id()';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION '0013_force_rls_user_owned_tables.sql requires public.current_app_is_admin()';
  END IF;

  FOR user_owned_table IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_class pc
      ON pc.relname = c.table_name
    JOIN pg_namespace n
      ON n.oid = pc.relnamespace
     AND n.nspname = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND pc.relkind = 'r'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      user_owned_table.table_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
      user_owned_table.table_name
    );
  END LOOP;
END;
$$;

COMMIT;
