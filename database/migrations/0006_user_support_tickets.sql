-- database/migrations/0006_user_support_tickets.sql
-- Salary Hijacking user support ticket persistence.
-- Stores mobile 1:1 inquiries without raw financial data exposure, raw push
-- tokens, ad-financial targeting payloads, or public response echoing of the
-- message body.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0006_user_support_tickets.sql requires public.users from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0006_user_support_tickets.sql requires public.set_updated_at() from 0001_init_users.sql';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_support_tickets (
  ticket_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  category text NOT NULL,
  subject text NOT NULL,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',

  assigned_admin_id uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  answer_body text,
  answered_at timestamptz,
  closed_at timestamptz,

  raw_financial_data_exposed boolean NOT NULL DEFAULT false,
  raw_personal_data_exposed boolean NOT NULL DEFAULT false,
  raw_push_token_exposed boolean NOT NULL DEFAULT false,
  ads_financial_targeting_used boolean NOT NULL DEFAULT false,

  request_id varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_user_support_tickets_category
    CHECK (category IN ('ACCOUNT', 'PAYMENT', 'PRIVACY', 'BUG', 'OTHER')),
  CONSTRAINT chk_user_support_tickets_status
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED')),
  CONSTRAINT chk_user_support_tickets_subject_length
    CHECK (char_length(trim(subject)) BETWEEN 2 AND 80),
  CONSTRAINT chk_user_support_tickets_message_length
    CHECK (char_length(trim(message_body)) BETWEEN 5 AND 1000),
  CONSTRAINT chk_user_support_tickets_no_raw_sensitive_payload
    CHECK (
      raw_financial_data_exposed = false
      AND raw_personal_data_exposed = false
      AND raw_push_token_exposed = false
      AND ads_financial_targeting_used = false
    ),
  CONSTRAINT chk_user_support_tickets_answered_state
    CHECK (
      (answered_at IS NULL AND answer_body IS NULL)
      OR (answered_at IS NOT NULL AND answer_body IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_user_support_tickets_user_status_created
  ON public.user_support_tickets (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_support_tickets_status_created
  ON public.user_support_tickets (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_support_tickets_set_updated_at ON public.user_support_tickets;
CREATE TRIGGER trg_user_support_tickets_set_updated_at
BEFORE UPDATE ON public.user_support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.user_support_tickets
IS 'Salary Hijacking mobile 1:1 support tickets. API responses must not echo user_id or message_body to the mobile support compose result.';

COMMENT ON COLUMN public.user_support_tickets.message_body
IS 'Support inquiry body. Store for operations, but never copy into release evidence, analytics, ads payloads, or mobile create response.';

COMMIT;
