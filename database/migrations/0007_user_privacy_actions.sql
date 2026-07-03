-- Salary Hijacking user privacy action persistence.
-- Stores mobile privacy export and withdrawal-request intents without raw
-- financial export data, raw token data, or ad-financial targeting payloads.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0007_user_privacy_actions.sql requires public.users from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0007_user_privacy_actions.sql requires public.set_updated_at() from 0001_init_users.sql';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_privacy_exports (
  export_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'REQUESTED',
  include_profile boolean NOT NULL DEFAULT true,
  include_settings boolean NOT NULL DEFAULT true,
  include_consents boolean NOT NULL DEFAULT true,
  include_community boolean NOT NULL DEFAULT false,
  include_growth boolean NOT NULL DEFAULT false,
  include_financial_summary_only boolean NOT NULL DEFAULT true,
  reason text,

  download_url text,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,

  financial_raw_data_included boolean NOT NULL DEFAULT false,
  raw_personal_data_included boolean NOT NULL DEFAULT false,
  raw_token_included boolean NOT NULL DEFAULT false,
  ads_financial_targeting_used boolean NOT NULL DEFAULT false,

  request_id varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_user_privacy_exports_status
    CHECK (status IN ('REQUESTED', 'PROCESSING', 'READY', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT chk_user_privacy_exports_reason_length
    CHECK (reason IS NULL OR char_length(reason) <= 500),
  CONSTRAINT chk_user_privacy_exports_download_url_length
    CHECK (download_url IS NULL OR char_length(download_url) <= 2048),
  CONSTRAINT chk_user_privacy_exports_expiry
    CHECK (expires_at > created_at),
  CONSTRAINT chk_user_privacy_exports_summary_only
    CHECK (include_financial_summary_only = true),
  CONSTRAINT chk_user_privacy_exports_no_raw_sensitive_payload
    CHECK (
      financial_raw_data_included = false
      AND raw_personal_data_included = false
      AND raw_token_included = false
      AND ads_financial_targeting_used = false
    )
);

CREATE INDEX IF NOT EXISTS idx_user_privacy_exports_user_created
  ON public.user_privacy_exports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_privacy_exports_status_created
  ON public.user_privacy_exports (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_privacy_exports_set_updated_at ON public.user_privacy_exports;
CREATE TRIGGER trg_user_privacy_exports_set_updated_at
BEFORE UPDATE ON public.user_privacy_exports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_withdrawal_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  reason text NOT NULL,
  delete_community_content boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'REQUESTED',

  requested_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  request_trace_id varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_user_withdrawal_requests_status
    CHECK (status IN ('REQUESTED', 'REVIEWING', 'CANCELLED', 'COMPLETED')),
  CONSTRAINT chk_user_withdrawal_requests_reason_length
    CHECK (char_length(trim(reason)) BETWEEN 2 AND 500),
  CONSTRAINT chk_user_withdrawal_requests_terminal_state
    CHECK (
      (cancelled_at IS NULL AND completed_at IS NULL)
      OR (cancelled_at IS NOT NULL AND status = 'CANCELLED')
      OR (completed_at IS NOT NULL AND status = 'COMPLETED')
    )
);

CREATE INDEX IF NOT EXISTS idx_user_withdrawal_requests_user_status_created
  ON public.user_withdrawal_requests (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_withdrawal_requests_status_created
  ON public.user_withdrawal_requests (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_withdrawal_requests_set_updated_at ON public.user_withdrawal_requests;
CREATE TRIGGER trg_user_withdrawal_requests_set_updated_at
BEFORE UPDATE ON public.user_withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.user_privacy_exports
IS 'Salary Hijacking privacy export requests. Exports are financial-summary-only and must never include raw tokens, raw financial rows, or ad targeting payloads.';

COMMENT ON TABLE public.user_withdrawal_requests
IS 'Salary Hijacking withdrawal request intents. Mobile request-only flow stores intent for review without immediately performing destructive account withdrawal.';

COMMIT;
