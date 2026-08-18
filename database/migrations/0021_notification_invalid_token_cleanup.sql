-- database/migrations/0021_notification_invalid_token_cleanup.sql
-- Phase 5: provide a narrowly-scoped, hash-only SECURITY DEFINER boundary for
-- revoking invalid push tokens without weakening FORCE RLS on user_devices.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';

DO $$
BEGIN
  IF to_regclass('public.user_devices') IS NULL THEN
    RAISE EXCEPTION '0021_notification_invalid_token_cleanup.sql requires public.user_devices';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.revoke_invalid_push_token_hash(
  p_token_hash text,
  p_provider_error_code text,
  p_request_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hash text;
  v_count integer := 0;
BEGIN
  v_hash := regexp_replace(lower(btrim(coalesce(p_token_hash, ''))), '^sha256:', '');

  IF v_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PUSH_TOKEN_HASH_INVALID';
  END IF;

  IF coalesce(length(btrim(p_provider_error_code)), 0) = 0
     OR length(p_provider_error_code) > 160 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PUSH_PROVIDER_ERROR_CODE_INVALID';
  END IF;

  IF coalesce(length(btrim(p_request_id)), 0) = 0
     OR length(p_request_id) > 160
     OR p_request_id !~ '^[A-Za-z0-9._:/-]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PUSH_CLEANUP_REQUEST_ID_INVALID';
  END IF;

  UPDATE public.user_devices
  SET status = 'REVOKED',
      revoked_at = coalesce(revoked_at, clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE push_token_hash = v_hash
    AND status = 'ACTIVE';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;

COMMENT ON FUNCTION public.revoke_invalid_push_token_hash(text, text, text)
IS 'Phase 5 hash-only provider-invalid push-token revocation boundary. Never accepts or returns raw push tokens or financial data. SECURITY DEFINER is intentionally limited to ACTIVE user_devices rows matching a validated SHA-256 token hash.';

REVOKE ALL ON FUNCTION public.revoke_invalid_push_token_hash(text, text, text) FROM PUBLIC;

DO $$
DECLARE
  v_role text;
BEGIN
  FOR v_role IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname = 'service_role'
       OR rolname ~ '^salary_hijacking(_[a-z0-9]+)?_app$'
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.revoke_invalid_push_token_hash(text, text, text) TO %I',
      v_role
    );
  END LOOP;
END
$$;

COMMIT;
