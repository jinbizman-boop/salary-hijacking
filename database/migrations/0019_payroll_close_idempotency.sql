-- 0019_payroll_close_idempotency.sql
-- Phase 4 finalization closure: make payroll close/finalize idempotency
-- auditable without introducing a new physical table.

ALTER TABLE public.payroll_plans
  ADD COLUMN IF NOT EXISTS close_idempotency_key text,
  ADD COLUMN IF NOT EXISTS close_request_hash char(32),
  ADD COLUMN IF NOT EXISTS close_reason text;

ALTER TABLE public.payroll_plans
  DROP CONSTRAINT IF EXISTS chk_payroll_plans_close_idempotency_key,
  ADD CONSTRAINT chk_payroll_plans_close_idempotency_key
    CHECK (
      close_idempotency_key IS NULL
      OR char_length(trim(close_idempotency_key)) BETWEEN 16 AND 256
    ),
  DROP CONSTRAINT IF EXISTS chk_payroll_plans_close_request_hash,
  ADD CONSTRAINT chk_payroll_plans_close_request_hash
    CHECK (
      close_request_hash IS NULL
      OR close_request_hash ~ '^[0-9a-f]{32}$'
    ),
  DROP CONSTRAINT IF EXISTS chk_payroll_plans_close_reason,
  ADD CONSTRAINT chk_payroll_plans_close_reason
    CHECK (
      close_reason IS NULL
      OR char_length(trim(close_reason)) BETWEEN 1 AND 500
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_plans_user_close_idempotency
  ON public.payroll_plans (user_id, close_idempotency_key)
  WHERE close_idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.payroll_plans.close_idempotency_key
IS 'Payroll finalization idempotency key captured at close time. User-scoped unique partial index prevents duplicate close transitions.';

COMMENT ON COLUMN public.payroll_plans.close_request_hash
IS 'MD5 fingerprint of the close request target and reason. Used only for idempotency conflict detection; raw request body is not persisted.';

COMMENT ON COLUMN public.payroll_plans.close_reason
IS 'Bounded close/finalization reason text for audit and support review. Must not contain raw sensitive financial payloads.';
