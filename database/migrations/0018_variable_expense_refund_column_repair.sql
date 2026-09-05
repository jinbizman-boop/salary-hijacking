-- 0018_variable_expense_refund_column_repair.sql
-- Phase 4 repair: restore the refund columns required by the
-- server-authoritative payroll and daily-budget recalculation functions.
--
-- Root cause:
-- The staging migration ledger marked 0011_variable_expense_refund_amount as
-- applied, but the live variable_expenses table did not contain the additive
-- refund columns. Re-applying the columns in a new migration preserves the
-- immutable migration history while closing the runtime schema drift.

ALTER TABLE public.variable_expenses
  ADD COLUMN IF NOT EXISTS refund_amount bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_refund_idempotency_key text;

ALTER TABLE public.variable_expenses
  DROP CONSTRAINT IF EXISTS chk_variable_expenses_refund_amount,
  ADD CONSTRAINT chk_variable_expenses_refund_amount
    CHECK (refund_amount >= 0 AND refund_amount <= amount);

ALTER TABLE public.variable_expenses
  DROP CONSTRAINT IF EXISTS chk_variable_expenses_refund_idempotency_length,
  ADD CONSTRAINT chk_variable_expenses_refund_idempotency_length
    CHECK (
      last_refund_idempotency_key IS NULL
      OR char_length(last_refund_idempotency_key) BETWEEN 16 AND 160
    );

COMMENT ON COLUMN public.variable_expenses.refund_amount
IS '누적 부분 환불 금액. KRW 1원 단위, amount 이하. daily_budgets/payroll 재계산은 ACTIVE 지출의 amount - refund_amount를 사용한다.';

COMMENT ON COLUMN public.variable_expenses.last_refund_idempotency_key
IS '최근 환불 요청 멱등 키. 원 지출 생성 idempotency_key를 덮어쓰지 않고 모바일/API 재시도 관측에 사용한다.';
