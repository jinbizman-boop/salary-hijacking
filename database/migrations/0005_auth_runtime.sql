-- database/migrations/0005_auth_runtime.sql
-- Salary Hijacking auth runtime persistence.
-- Adds DB-backed credential/session/token state for /api/v1/auth without raw
-- password, refresh token, push token, device identifier, or financial payloads.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0005_auth_runtime.sql requires public.users from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.auth_identities') IS NULL THEN
    RAISE EXCEPTION '0005_auth_runtime.sql requires public.auth_identities from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.user_devices') IS NULL THEN
    RAISE EXCEPTION '0005_auth_runtime.sql requires public.user_devices from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0005_auth_runtime.sql requires public.set_updated_at() from 0001_init_users.sql';
  END IF;
END;
$$;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS chk_users_status;

ALTER TABLE public.users
  ADD CONSTRAINT chk_users_status
  CHECK (
    status IN (
      'ACTIVE',
      'PENDING',
      'PENDING_EMAIL_VERIFICATION',
      'LOCKED',
      'SUSPENDED',
      'WITHDRAWN',
      'DELETED'
    )
  );

ALTER TABLE public.auth_identities
  DROP CONSTRAINT IF EXISTS chk_auth_provider;

ALTER TABLE public.auth_identities
  ADD CONSTRAINT chk_auth_provider
  CHECK (
    provider IN (
      'EMAIL',
      'PASSWORD',
      'GOOGLE',
      'APPLE',
      'KAKAO',
      'NAVER',
      'FACEBOOK'
    )
  );

CREATE TABLE IF NOT EXISTS public.auth_credentials (
  credential_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  identity_id uuid REFERENCES public.auth_identities(identity_id) ON DELETE CASCADE,

  kind text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  credential_hash text NOT NULL,
  credential_secret_ref text,
  algorithm text NOT NULL DEFAULT 'sha256',
  version integer NOT NULL DEFAULT 1,

  last_used_at timestamptz,
  rotated_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,

  raw_password_included boolean NOT NULL DEFAULT false,
  raw_token_included boolean NOT NULL DEFAULT false,
  raw_secret_included boolean NOT NULL DEFAULT false,
  raw_push_token_included boolean NOT NULL DEFAULT false,
  raw_financial_source_data_included boolean NOT NULL DEFAULT false,
  ads_payload_linked boolean NOT NULL DEFAULT false,
  community_payload_linked boolean NOT NULL DEFAULT false,

  request_id varchar(128),
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_credentials_kind
    CHECK (kind IN ('PASSWORD_HASH', 'PASSKEY', 'RECOVERY_CODE_HASH', 'OAUTH_SUBJECT_REF')),
  CONSTRAINT chk_auth_credentials_status
    CHECK (status IN ('ACTIVE', 'ROTATED', 'REVOKED', 'EXPIRED', 'DISABLED')),
  CONSTRAINT chk_auth_credentials_hash_length
    CHECK (char_length(trim(credential_hash)) BETWEEN 32 AND 512),
  CONSTRAINT chk_auth_credentials_no_raw_secret
    CHECK (
      raw_password_included = false
      AND raw_token_included = false
      AND raw_secret_included = false
      AND raw_push_token_included = false
      AND raw_financial_source_data_included = false
      AND ads_payload_linked = false
      AND community_payload_linked = false
    )
);

CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_kind
  ON public.auth_credentials (user_id, kind, status);

CREATE INDEX IF NOT EXISTS idx_auth_credentials_identity_status
  ON public.auth_credentials (identity_id, status)
  WHERE identity_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_auth_credentials_set_updated_at ON public.auth_credentials;
CREATE TRIGGER trg_auth_credentials_set_updated_at
BEFORE UPDATE ON public.auth_credentials
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.user_devices(device_id) ON DELETE SET NULL,

  refresh_token_hash text NOT NULL,
  device_identifier_hash text,
  session_family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'ACTIVE',

  issued_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  idempotency_key varchar(256) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  raw_password_included boolean NOT NULL DEFAULT false,
  raw_token_included boolean NOT NULL DEFAULT false,
  raw_secret_included boolean NOT NULL DEFAULT false,
  raw_push_token_included boolean NOT NULL DEFAULT false,
  raw_financial_source_data_included boolean NOT NULL DEFAULT false,
  ads_payload_linked boolean NOT NULL DEFAULT false,
  community_payload_linked boolean NOT NULL DEFAULT false,

  request_id varchar(128),
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_sessions_status
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'ROTATED', 'SUSPICIOUS')),
  CONSTRAINT chk_auth_sessions_expiry_check
    CHECK (expires_at > created_at),
  CONSTRAINT chk_auth_sessions_refresh_hash_length
    CHECK (char_length(trim(refresh_token_hash)) BETWEEN 32 AND 512),
  CONSTRAINT chk_auth_sessions_device_hash_length
    CHECK (device_identifier_hash IS NULL OR char_length(device_identifier_hash) BETWEEN 32 AND 512),
  CONSTRAINT chk_auth_sessions_no_raw_secret
    CHECK (
      raw_password_included = false
      AND raw_token_included = false
      AND raw_secret_included = false
      AND raw_push_token_included = false
      AND raw_financial_source_data_included = false
      AND ads_payload_linked = false
      AND community_payload_linked = false
    )
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_status
  ON public.auth_sessions (user_id, status, last_used_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_sessions_refresh_hash_active
  ON public.auth_sessions (refresh_token_hash)
  WHERE status = 'ACTIVE' AND revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_auth_sessions_set_updated_at ON public.auth_sessions;
CREATE TRIGGER trg_auth_sessions_set_updated_at
BEFORE UPDATE ON public.auth_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.auth_email_verifications (
  verification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_email_verifications_hash_length
    CHECK (char_length(trim(token_hash)) BETWEEN 32 AND 512),
  CONSTRAINT chk_auth_email_verifications_expiry
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_email_verifications_user
  ON public.auth_email_verifications (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.auth_password_resets (
  reset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_password_resets_hash_length
    CHECK (char_length(trim(token_hash)) BETWEEN 32 AND 512),
  CONSTRAINT chk_auth_password_resets_expiry
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_password_resets_user
  ON public.auth_password_resets (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.auth_oauth_states (
  state text PRIMARY KEY,
  provider text NOT NULL,
  code_verifier_hash text NOT NULL,
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_oauth_states_provider
    CHECK (provider IN ('GOOGLE', 'APPLE', 'KAKAO', 'NAVER', 'FACEBOOK')),
  CONSTRAINT chk_auth_oauth_states_hash_length
    CHECK (char_length(trim(code_verifier_hash)) BETWEEN 32 AND 512),
  CONSTRAINT chk_auth_oauth_states_redirect_length
    CHECK (char_length(trim(redirect_uri)) BETWEEN 1 AND 2048),
  CONSTRAINT chk_auth_oauth_states_expiry
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_oauth_states_expiry
  ON public.auth_oauth_states (expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS public.user_mfa_factors (
  mfa_factor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  method text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  code_hash text,
  secret_ref text,
  secret_hash text,
  label text,
  enabled_at timestamptz,
  last_used_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  raw_password_included boolean NOT NULL DEFAULT false,
  raw_token_included boolean NOT NULL DEFAULT false,
  raw_secret_included boolean NOT NULL DEFAULT false,
  raw_push_token_included boolean NOT NULL DEFAULT false,
  raw_financial_source_data_included boolean NOT NULL DEFAULT false,
  ads_payload_linked boolean NOT NULL DEFAULT false,
  community_payload_linked boolean NOT NULL DEFAULT false,

  CONSTRAINT chk_user_mfa_factors_method
    CHECK (method IN ('TOTP', 'RECOVERY_CODE', 'PASSKEY')),
  CONSTRAINT chk_user_mfa_factors_status
    CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED', 'REVOKED')),
  CONSTRAINT chk_user_mfa_factors_no_raw_secret
    CHECK (
      raw_password_included = false
      AND raw_token_included = false
      AND raw_secret_included = false
      AND raw_push_token_included = false
      AND raw_financial_source_data_included = false
      AND ads_payload_linked = false
      AND community_payload_linked = false
    )
);

CREATE INDEX IF NOT EXISTS idx_user_mfa_user_status
  ON public.user_mfa_factors (user_id, method, status);

DROP TRIGGER IF EXISTS trg_user_mfa_factors_set_updated_at ON public.user_mfa_factors;
CREATE TRIGGER trg_user_mfa_factors_set_updated_at
BEFORE UPDATE ON public.user_mfa_factors
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_factors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_credentials_owner_select ON public.auth_credentials;
CREATE POLICY auth_credentials_owner_select
ON public.auth_credentials
FOR SELECT
USING (user_id = public.current_app_user_id() OR public.current_app_is_admin());

DROP POLICY IF EXISTS auth_credentials_service_all ON public.auth_credentials;
CREATE POLICY auth_credentials_service_all
ON public.auth_credentials
FOR ALL
USING (public.current_app_is_admin() OR current_user = 'service_role')
WITH CHECK (public.current_app_is_admin() OR current_user = 'service_role');

DROP POLICY IF EXISTS auth_sessions_owner_select ON public.auth_sessions;
CREATE POLICY auth_sessions_owner_select
ON public.auth_sessions
FOR SELECT
USING (user_id = public.current_app_user_id() OR public.current_app_is_admin());

DROP POLICY IF EXISTS auth_sessions_service_all ON public.auth_sessions;
CREATE POLICY auth_sessions_service_all
ON public.auth_sessions
FOR ALL
USING (public.current_app_is_admin() OR current_user = 'service_role')
WITH CHECK (public.current_app_is_admin() OR current_user = 'service_role');

DROP POLICY IF EXISTS auth_email_verifications_service_all ON public.auth_email_verifications;
CREATE POLICY auth_email_verifications_service_all
ON public.auth_email_verifications
FOR ALL
USING (public.current_app_is_admin() OR current_user = 'service_role')
WITH CHECK (public.current_app_is_admin() OR current_user = 'service_role');

DROP POLICY IF EXISTS auth_password_resets_service_all ON public.auth_password_resets;
CREATE POLICY auth_password_resets_service_all
ON public.auth_password_resets
FOR ALL
USING (public.current_app_is_admin() OR current_user = 'service_role')
WITH CHECK (public.current_app_is_admin() OR current_user = 'service_role');

DROP POLICY IF EXISTS auth_oauth_states_service_all ON public.auth_oauth_states;
CREATE POLICY auth_oauth_states_service_all
ON public.auth_oauth_states
FOR ALL
USING (public.current_app_is_admin() OR current_user = 'service_role')
WITH CHECK (public.current_app_is_admin() OR current_user = 'service_role');

DROP POLICY IF EXISTS user_mfa_factors_owner_select ON public.user_mfa_factors;
CREATE POLICY user_mfa_factors_owner_select
ON public.user_mfa_factors
FOR SELECT
USING (user_id = public.current_app_user_id() OR public.current_app_is_admin());

DROP POLICY IF EXISTS user_mfa_factors_service_all ON public.user_mfa_factors;
CREATE POLICY user_mfa_factors_service_all
ON public.user_mfa_factors
FOR ALL
USING (public.current_app_is_admin() OR current_user = 'service_role')
WITH CHECK (public.current_app_is_admin() OR current_user = 'service_role');

COMMENT ON TABLE public.auth_credentials
IS 'DB-backed auth credential hashes. Raw passwords, tokens, secrets, push tokens, and financial data are forbidden.';

COMMENT ON TABLE public.auth_sessions
IS 'Refresh-session ledger for rotation and logout. Stores refresh token hashes and hashed device identifiers only.';

COMMIT;
