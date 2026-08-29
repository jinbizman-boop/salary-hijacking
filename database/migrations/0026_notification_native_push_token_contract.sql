-- 0026_notification_native_push_token_contract.sql
-- Phase 13 remediation: distinguish native FCM/APNs provider tokens from
-- Expo Push Service tokens without exposing raw token material.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS push_token_provider text NOT NULL DEFAULT 'FCM',
  ADD COLUMN IF NOT EXISTS push_token_source text NOT NULL DEFAULT 'NATIVE_DEVICE',
  ADD COLUMN IF NOT EXISTS push_token_secret_ref text;

ALTER TABLE public.user_devices
  DROP CONSTRAINT IF EXISTS chk_user_devices_push_token_provider,
  ADD CONSTRAINT chk_user_devices_push_token_provider
    CHECK (push_token_provider IN ('FCM', 'APNS', 'EXPO')),
  DROP CONSTRAINT IF EXISTS chk_user_devices_push_token_source,
  ADD CONSTRAINT chk_user_devices_push_token_source
    CHECK (push_token_source IN ('NATIVE_DEVICE', 'EXPO_PUSH_SERVICE')),
  DROP CONSTRAINT IF EXISTS chk_user_devices_android_native_fcm,
  ADD CONSTRAINT chk_user_devices_android_native_fcm
    CHECK (
      platform <> 'ANDROID'
      OR (
        push_token_provider = 'FCM'
        AND push_token_source = 'NATIVE_DEVICE'
      )
    ),
  DROP CONSTRAINT IF EXISTS chk_user_devices_push_token_secret_ref_length,
  ADD CONSTRAINT chk_user_devices_push_token_secret_ref_length
    CHECK (
      push_token_secret_ref IS NULL
      OR char_length(trim(push_token_secret_ref)) BETWEEN 8 AND 512
    );

CREATE INDEX IF NOT EXISTS idx_user_devices_provider_status
  ON public.user_devices (push_token_provider, status, last_seen_at DESC)
  WHERE push_token_hash IS NOT NULL AND status = 'ACTIVE';

COMMENT ON COLUMN public.user_devices.push_token_provider
IS 'Native push delivery provider for the active device token. Android staging/production uses FCM; Expo Push Service tokens are not canonical FCM targets.';

COMMENT ON COLUMN public.user_devices.push_token_source
IS 'Source API for the device token. NATIVE_DEVICE means expo-notifications getDevicePushTokenAsync or equivalent native provider token path.';

COMMENT ON COLUMN public.user_devices.push_token_secret_ref
IS 'Operational reference for secure push-token material. Evidence, logs, and user-facing APIs must expose only token hashes or this non-secret reference, never raw token values.';

CREATE TABLE IF NOT EXISTS public.notification_push_tokens (
  push_token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.user_devices(device_id) ON DELETE SET NULL,
  platform varchar(24) NOT NULL,
  provider varchar(24) NOT NULL DEFAULT 'FCM',
  token_hash varchar(512) NOT NULL,
  token_secret_ref varchar(512),
  token_ciphertext text,
  push_permission_status varchar(32) NOT NULL DEFAULT 'NOT_DETERMINED',
  status varchar(24) NOT NULL DEFAULT 'ACTIVE',
  app_version varchar(80),
  os_version varchar(120),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  raw_financial_source_data_included boolean NOT NULL DEFAULT false,
  raw_push_token_included boolean NOT NULL DEFAULT false,
  raw_token_included boolean NOT NULL DEFAULT false,
  raw_secret_included boolean NOT NULL DEFAULT false,
  raw_pii_included boolean NOT NULL DEFAULT false,
  actor_user_id uuid,
  actor_role varchar(32),
  actor_reason text,
  request_id varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_notification_push_tokens_platform
    CHECK (platform IN ('IOS', 'ANDROID', 'WEB', 'ADMIN_WEB', 'UNKNOWN')),
  CONSTRAINT chk_notification_push_tokens_provider
    CHECK (provider IN ('IN_APP', 'FCM', 'EXPO', 'APNS', 'ADMIN', 'MOCK')),
  CONSTRAINT chk_notification_push_tokens_token_hash_length
    CHECK (char_length(trim(token_hash)) BETWEEN 32 AND 512),
  CONSTRAINT chk_notification_push_tokens_secret_ref_length
    CHECK (
      token_secret_ref IS NULL
      OR char_length(trim(token_secret_ref)) BETWEEN 8 AND 512
    ),
  CONSTRAINT chk_notification_push_tokens_ciphertext
    CHECK (token_ciphertext IS NULL OR token_ciphertext LIKE 'shjenc:v2:%'),
  CONSTRAINT chk_notification_push_tokens_secret_ref_or_ciphertext
    CHECK (token_secret_ref IS NOT NULL OR token_ciphertext IS NOT NULL),
  CONSTRAINT chk_notification_push_tokens_permission
    CHECK (
      push_permission_status IN (
        'AUTHORIZED',
        'DENIED',
        'PROVISIONAL',
        'EPHEMERAL',
        'NOT_DETERMINED'
      )
    ),
  CONSTRAINT chk_notification_push_tokens_status
    CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'BLOCKED')),
  CONSTRAINT chk_notification_push_tokens_permission_active
    CHECK (
      status <> 'ACTIVE'
      OR push_permission_status IN ('AUTHORIZED', 'PROVISIONAL', 'EPHEMERAL')
    ),
  CONSTRAINT chk_notification_push_tokens_revoked_status
    CHECK (revoked_at IS NULL OR status IN ('REVOKED', 'EXPIRED', 'BLOCKED')),
  CONSTRAINT chk_notification_push_tokens_no_raw_payload
    CHECK (
      raw_financial_source_data_included = false
      AND raw_push_token_included = false
      AND raw_token_included = false
      AND raw_secret_included = false
      AND raw_pii_included = false
    )
);

ALTER TABLE public.notification_push_tokens
  ADD COLUMN IF NOT EXISTS token_ciphertext text;

ALTER TABLE public.notification_push_tokens
  DROP CONSTRAINT IF EXISTS chk_notification_push_tokens_ciphertext,
  ADD CONSTRAINT chk_notification_push_tokens_ciphertext
    CHECK (token_ciphertext IS NULL OR token_ciphertext LIKE 'shjenc:v2:%'),
  DROP CONSTRAINT IF EXISTS chk_notification_push_tokens_secret_ref_or_ciphertext,
  ADD CONSTRAINT chk_notification_push_tokens_secret_ref_or_ciphertext
    CHECK (token_secret_ref IS NOT NULL OR token_ciphertext IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_push_tokens_token_hash_active
  ON public.notification_push_tokens (token_hash)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_notification_push_tokens_user_status
  ON public.notification_push_tokens (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_push_tokens_device
  ON public.notification_push_tokens (device_id, status, created_at DESC)
  WHERE device_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_notification_push_tokens_set_updated_at
  ON public.notification_push_tokens;
CREATE TRIGGER trg_notification_push_tokens_set_updated_at
BEFORE UPDATE ON public.notification_push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_push_tokens
IS 'Secure push-token delivery target registry. Raw FCM/APNs token material is held only as encrypted operational ciphertext; logs, evidence, and APIs use token_hash or token_secret_ref.';

COMMENT ON COLUMN public.notification_push_tokens.token_ciphertext
IS 'AES-GCM encrypted native provider token envelope for server-side delivery. Never returned to clients, logs, audit evidence, or analytics.';

ALTER TABLE public.notification_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_push_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_push_tokens_owner_all
  ON public.notification_push_tokens;
CREATE POLICY notification_push_tokens_owner_all
  ON public.notification_push_tokens
  FOR ALL
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS notification_push_tokens_service_select
  ON public.notification_push_tokens;
CREATE POLICY notification_push_tokens_service_select
  ON public.notification_push_tokens
  FOR SELECT
  USING (public.current_app_is_admin());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'salary_hijacking_staging_app'
  ) THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON public.notification_push_tokens
      TO salary_hijacking_staging_app;
  END IF;
END;
$$;

COMMIT;
