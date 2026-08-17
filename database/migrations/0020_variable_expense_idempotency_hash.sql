-- 0020_variable_expense_idempotency_hash.sql
-- Phase 4 runtime idempotency closure: detect same key with different
-- variable-expense create body while preserving existing retry behavior.

ALTER TABLE public.variable_expenses
  ADD COLUMN IF NOT EXISTS idempotency_request_hash char(32);

ALTER TABLE public.variable_expenses
  DROP CONSTRAINT IF EXISTS chk_variable_expenses_idempotency_request_hash,
  ADD CONSTRAINT chk_variable_expenses_idempotency_request_hash
    CHECK (
      idempotency_request_hash IS NULL
      OR idempotency_request_hash ~ '^[0-9a-f]{32}$'
    );

COMMENT ON COLUMN public.variable_expenses.idempotency_request_hash
IS 'MD5 fingerprint of idempotent create request fields. Same key with a different request body is rejected without storing raw financial payloads.';
