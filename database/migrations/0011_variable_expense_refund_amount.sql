-- 0011_variable_expense_refund_amount.sql
-- Salary Hijacking variable expense partial refund runtime support.
--
-- This migration is additive and keeps the existing public.variable_expenses
-- table shape compatible while allowing server-authoritative daily budget and
-- payroll recalculation to account for partial merchant refunds.

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

CREATE OR REPLACE FUNCTION public.recalculate_daily_budget(p_daily_budget_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily_limit_amount bigint;
  v_used_amount bigint;
BEGIN
  SELECT db.daily_limit_amount
    INTO v_daily_limit_amount
  FROM public.daily_budgets db
  WHERE db.daily_budget_id = p_daily_budget_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(GREATEST(ve.amount - ve.refund_amount, 0)), 0)::bigint
    INTO v_used_amount
  FROM public.variable_expenses ve
  WHERE ve.daily_budget_id = p_daily_budget_id
    AND ve.status = 'ACTIVE';

  UPDATE public.daily_budgets db
  SET
    used_amount = v_used_amount,
    remaining_amount = GREATEST(v_daily_limit_amount - v_used_amount, 0),
    over_amount = GREATEST(v_used_amount - v_daily_limit_amount, 0),
    status = CASE
      WHEN db.status = 'CLOSED' THEN 'CLOSED'
      WHEN v_used_amount > v_daily_limit_amount THEN 'OVER'
      ELSE 'OPEN'
    END,
    calculated_at = now()
  WHERE db.daily_budget_id = p_daily_budget_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_payroll_plan(
  p_payroll_plan_id uuid,
  p_reason text DEFAULT 'RECALCULATE'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_year_month char(7);
  v_salary_amount bigint;
  v_fixed_total bigint;
  v_savings_total bigint;
  v_daily_budget_total bigint;
  v_variable_total bigint;
  v_expected_expense_amount bigint;
  v_expected_hijack_amount bigint;
  v_confirmed_hijack_amount bigint;
  v_month_start date;
  v_month_end date;
  v_snapshot_id uuid;
BEGIN
  SELECT pp.user_id, pp.year_month, pp.expected_salary_amount
    INTO v_user_id, v_year_month, v_salary_amount
  FROM public.payroll_plans pp
  WHERE pp.payroll_plan_id = p_payroll_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payroll_plan_id % does not exist', p_payroll_plan_id;
  END IF;

  v_month_start := to_date(v_year_month || '-01', 'YYYY-MM-DD');
  v_month_end := (v_month_start + INTERVAL '1 month')::date;

  SELECT COALESCE(SUM(fe.amount), 0)::bigint
    INTO v_fixed_total
  FROM public.fixed_expenses fe
  WHERE fe.payroll_plan_id = p_payroll_plan_id
    AND fe.status IN ('SCHEDULED', 'PAID');

  SELECT COALESCE(SUM(sp.amount), 0)::bigint
    INTO v_savings_total
  FROM public.savings_plans sp
  WHERE sp.payroll_plan_id = p_payroll_plan_id
    AND sp.status IN ('SCHEDULED', 'TRANSFERRED');

  SELECT COALESCE(SUM(db.daily_limit_amount), 0)::bigint
    INTO v_daily_budget_total
  FROM public.daily_budgets db
  WHERE db.user_id = v_user_id
    AND db.budget_date >= v_month_start
    AND db.budget_date < v_month_end
    AND db.status IN ('OPEN', 'OVER', 'CLOSED');

  SELECT COALESCE(SUM(GREATEST(ve.amount - ve.refund_amount, 0)), 0)::bigint
    INTO v_variable_total
  FROM public.variable_expenses ve
  WHERE ve.user_id = v_user_id
    AND ve.status = 'ACTIVE'
    AND ve.spent_at >= v_month_start::timestamptz
    AND ve.spent_at < v_month_end::timestamptz;

  v_expected_expense_amount := v_fixed_total + v_savings_total + v_daily_budget_total;
  v_expected_hijack_amount := GREATEST(v_salary_amount - v_expected_expense_amount, 0);
  v_confirmed_hijack_amount := GREATEST(v_salary_amount - v_fixed_total - v_savings_total - v_variable_total, 0);

  UPDATE public.payroll_plans pp
  SET
    expected_expense_amount = v_expected_expense_amount,
    expected_hijack_amount = v_expected_hijack_amount,
    confirmed_hijack_amount = v_confirmed_hijack_amount
  WHERE pp.payroll_plan_id = p_payroll_plan_id;

  INSERT INTO public.payroll_calculation_snapshots (
    user_id,
    payroll_plan_id,
    year_month,
    salary_amount,
    fixed_expense_total,
    savings_total,
    variable_expense_total,
    daily_budget_total,
    expected_expense_amount,
    expected_hijack_amount,
    confirmed_hijack_amount,
    formula_version,
    calculation_reason,
    calculation_input,
    calculation_output,
    calculated_at
  )
  VALUES (
    v_user_id,
    p_payroll_plan_id,
    v_year_month,
    v_salary_amount,
    v_fixed_total,
    v_savings_total,
    v_variable_total,
    v_daily_budget_total,
    v_expected_expense_amount,
    v_expected_hijack_amount,
    v_confirmed_hijack_amount,
    'v1.1-partial-refund',
    p_reason,
    jsonb_build_object('payrollPlanId', p_payroll_plan_id, 'reason', p_reason),
    jsonb_build_object(
      'expectedExpenseAmount', v_expected_expense_amount,
      'expectedHijackAmount', v_expected_hijack_amount,
      'confirmedHijackAmount', v_confirmed_hijack_amount
    ),
    now()
  )
  RETURNING snapshot_id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;
