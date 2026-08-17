-- database/migrations/0015_auth_preauth_rls_bootstrap.sql
-- Close the Phase 3 staging registration blocker by aligning the live RLS
-- policy surface with the canonical packages/db users schema. The API still
-- runs as the non-BYPASSRLS application role; only the server-controlled
-- app.is_admin context or service_role can perform pre-auth bootstrap writes.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';

DO $$
BEGIN
  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION '0015_auth_preauth_rls_bootstrap.sql requires public.current_app_is_admin()';
  END IF;

  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0015_auth_preauth_rls_bootstrap.sql requires public.users';
  END IF;

  IF to_regclass('public.auth_identities') IS NULL THEN
    RAISE EXCEPTION '0015_auth_preauth_rls_bootstrap.sql requires public.auth_identities';
  END IF;
END
$$;

DROP POLICY IF EXISTS users_service_all ON public.users;
CREATE POLICY users_service_all
ON public.users
FOR ALL
USING (
  public.current_app_is_admin()
  OR current_user = 'service_role'
)
WITH CHECK (
  public.current_app_is_admin()
  OR current_user = 'service_role'
);

DROP POLICY IF EXISTS auth_identities_service_all ON public.auth_identities;
CREATE POLICY auth_identities_service_all
ON public.auth_identities
FOR ALL
USING (
  public.current_app_is_admin()
  OR current_user = 'service_role'
)
WITH CHECK (
  public.current_app_is_admin()
  OR current_user = 'service_role'
);

COMMENT ON POLICY users_service_all ON public.users
IS 'Allows server-controlled pre-auth account bootstrap writes only after API-side auth service context sets app.is_admin=true, or via service_role. The runtime app role remains non-BYPASSRLS.';

COMMENT ON POLICY auth_identities_service_all ON public.auth_identities
IS 'Aligns auth identity bootstrap policy with canonical users schema service policy. Raw provider credentials are not stored.';

COMMIT;
