-- 0017_payroll_cycle_recalculation.sql
-- Phase 4: align server-authoritative payroll totals with the user's payday
-- cycle instead of calendar-month boundaries.

CREATE OR REPLACE FUNCTION public.make_payday_date(
  p_year_month char(7),
  p_payday smallint
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_day integer;
BEGIN
  v_month_start := to_date(p_year_month || '-01', 'YYYY-MM-DD');
  v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::date;
  v_day := LEAST(GREATEST(p_payday::integer, 1), EXTRACT(day FROM v_month_end)::integer);
  RETURN (v_month_start + (v_day - 1) * INTERVAL '1 day')::date;
END;
$$;

COMMENT ON FUNCTION public.make_payday_date(char(7), smallint)
IS 'Returns the concrete KST business payday date for a YYYY-MM payroll month, clamping day 29-31 to the month end.';

CREATE OR REPLACE FUNCTION public.payroll_cycle_contains_date(
  p_year_month char(7),
  p_payday smallint,
  p_business_date date
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_month_start date;
  v_prev_year_month char(7);
  v_cycle_start date;
  v_cycle_end_exclusive date;
BEGIN
  v_month_start := to_date(p_year_month || '-01', 'YYYY-MM-DD');
  v_prev_year_month := to_char(v_month_start - INTERVAL '1 month', 'YYYY-MM')::char(7);
  v_cycle_start := public.make_payday_date(v_prev_year_month, p_payday) + 1;
  v_cycle_end_exclusive := public.make_payday_date(p_year_month, p_payday) + 1;
  RETURN p_business_date >= v_cycle_start AND p_business_date < v_cycle_end_exclusive;
END;
$$;

COMMENT ON FUNCTION public.payroll_cycle_contains_date(char(7), smallint, date)
IS 'True when a KST business date belongs to the payday cycle ending in the given payroll month.';

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
  v_payday smallint;
  v_salary_amount bigint;
  v_fixed_total bigint;
  v_savings_total bigint;
  v_daily_budget_total bigint;
  v_variable_total bigint;
  v_expected_expense_amount bigint;
  v_expected_hijack_amount bigint;
  v_confirmed_hijack_amount bigint;
  v_month_start date;
  v_prev_year_month char(7);
  v_cycle_start date;
  v_cycle_end date;
  v_cycle_end_exclusive date;
  v_snapshot_id uuid;
BEGIN
  SELECT pp.user_id, pp.year_month, pp.payday, pp.expected_salary_amount
    INTO v_user_id, v_year_month, v_payday, v_salary_amount
  FROM public.payroll_plans pp
  WHERE pp.payroll_plan_id = p_payroll_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payroll_plan_id % does not exist', p_payroll_plan_id;
  END IF;

  v_month_start := to_date(v_year_month || '-01', 'YYYY-MM-DD');
  v_prev_year_month := to_char(v_month_start - INTERVAL '1 month', 'YYYY-MM')::char(7);
  v_cycle_start := public.make_payday_date(v_prev_year_month, v_payday) + 1;
  v_cycle_end := public.make_payday_date(v_year_month, v_payday);
  v_cycle_end_exclusive := v_cycle_end + 1;

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
    AND db.budget_date >= v_cycle_start
    AND db.budget_date < v_cycle_end_exclusive
    AND db.status IN ('OPEN', 'OVER', 'CLOSED');

  SELECT COALESCE(SUM(GREATEST(ve.amount - ve.refund_amount, 0)), 0)::bigint
    INTO v_variable_total
  FROM public.variable_expenses ve
  WHERE ve.user_id = v_user_id
    AND ve.status = 'ACTIVE'
    AND (ve.spent_at at time zone 'Asia/Seoul')::date >= v_cycle_start
    AND (ve.spent_at at time zone 'Asia/Seoul')::date < v_cycle_end_exclusive;

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
    'payroll-v2-cycle-kst',
    COALESCE(p_reason, 'RECALCULATE'),
    jsonb_build_object(
      'cycle_start', v_cycle_start,
      'cycle_end', v_cycle_end,
      'cycle_end_exclusive', v_cycle_end_exclusive,
      'payday', v_payday,
      'salary_amount', v_salary_amount,
      'fixed_expense_statuses', jsonb_build_array('SCHEDULED', 'PAID'),
      'savings_statuses', jsonb_build_array('SCHEDULED', 'TRANSFERRED'),
      'variable_expense_status', 'ACTIVE',
      'timezone', 'Asia/Seoul',
      'currency', 'KRW',
      'unit', 'KRW_1'
    ),
    jsonb_build_object(
      'fixed_expense_total', v_fixed_total,
      'savings_total', v_savings_total,
      'variable_expense_total', v_variable_total,
      'daily_budget_total', v_daily_budget_total,
      'expected_expense_amount', v_expected_expense_amount,
      'expected_hijack_amount', v_expected_hijack_amount,
      'confirmed_hijack_amount', v_confirmed_hijack_amount
    ),
    now()
  )
  RETURNING snapshot_id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_payroll_plan(uuid, text)
IS '급여계획의 고정지출, 고정저축, 일일예산, 변동지출 합계를 KST payday-cycle 기준으로 서버 권위 재계산하고 snapshot을 생성한다.';

CREATE OR REPLACE FUNCTION public.recalculate_payroll_plans_for_user_month(
  p_user_id uuid,
  p_budget_date date,
  p_reason text DEFAULT 'DAILY_BUDGET_CHANGED'
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan record;
  v_count integer := 0;
BEGIN
  FOR v_plan IN
    SELECT pp.payroll_plan_id
    FROM public.payroll_plans pp
    WHERE pp.user_id = p_user_id
      AND pp.status IN ('DRAFT', 'ACTIVE', 'CLOSED')
      AND public.payroll_cycle_contains_date(pp.year_month, pp.payday, p_budget_date)
  LOOP
    PERFORM public.recalculate_payroll_plan(v_plan.payroll_plan_id, p_reason);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.recalculate_payroll_plans_for_user_month(uuid, date, text)
IS '일일예산/변동지출 변경 시 해당 KST payday-cycle에 속한 사용자 급여계획을 재계산한다.';
