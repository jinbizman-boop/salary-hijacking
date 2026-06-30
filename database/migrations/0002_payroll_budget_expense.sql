-- database/migrations/0002_payroll_budget_expense.sql
-- 급여납치 급여·예산·고정지출·고정저축·변동지출·계산 스냅샷 최종 마이그레이션
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 기준 통화: KRW, 1원 단위 BIGINT, 소수점 저장 금지
-- 선행 마이그레이션: 0001_init_users.sql
-- 설계 원칙:
--   1. 급여·예산·지출·저축·납치금액 계산은 서버 권위로 처리한다.
--   2. 사용자 입력 금액은 음수와 소수점을 허용하지 않는다.
--   3. 납치금액은 0원 미만으로 저장하지 않는다.
--   4. 예산 초과는 remaining_amount = 0, over_amount > 0으로 저장한다.
--   5. 변동지출 등록/수정/삭제는 daily_budgets row lock 후 재계산한다.
--   6. fixed/savings/daily/variable 변경은 payroll_calculation_snapshots로 추적 가능해야 한다.
--   7. 모든 사용자 소유 데이터는 user_id 기반 RLS와 서버 API 소유권 검증을 전제로 한다.
--   8. idempotency_key로 변동지출 중복 등록을 방지한다.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

-- -----------------------------------------------------------------------------
-- 선행 마이그레이션 계약 검증
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0002_payroll_budget_expense.sql requires public.users from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0002_payroll_budget_expense.sql requires public.set_updated_at() from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION '0002_payroll_budget_expense.sql requires public.current_app_user_id() from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION '0002_payroll_budget_expense.sql requires public.current_app_is_admin() from 0001_init_users.sql';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- payroll_plans
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payroll_plans (
  payroll_plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  year_month char(7) NOT NULL,
  payday smallint NOT NULL,

  expected_salary_amount bigint NOT NULL DEFAULT 0,
  expected_expense_amount bigint NOT NULL DEFAULT 0,
  target_hijack_amount bigint NOT NULL DEFAULT 0,
  expected_hijack_amount bigint NOT NULL DEFAULT 0,
  confirmed_hijack_amount bigint NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'DRAFT',

  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,

  CONSTRAINT chk_payroll_plans_year_month
    CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),

  CONSTRAINT chk_payroll_plans_payday
    CHECK (payday BETWEEN 1 AND 31),

  CONSTRAINT chk_payroll_plans_amounts_non_negative
    CHECK (
      expected_salary_amount >= 0
      AND expected_expense_amount >= 0
      AND target_hijack_amount >= 0
      AND expected_hijack_amount >= 0
      AND confirmed_hijack_amount >= 0
    ),

  CONSTRAINT chk_payroll_plans_status
    CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED')),

  CONSTRAINT chk_payroll_plans_closed_status
    CHECK (
      closed_at IS NULL
      OR status IN ('CLOSED', 'ARCHIVED')
    ),

  CONSTRAINT chk_payroll_plans_archived_status
    CHECK (
      archived_at IS NULL
      OR status = 'ARCHIVED'
    )
);

COMMENT ON TABLE public.payroll_plans
IS '사용자별 월별 급여 계획. 급여, 고정지출, 고정저축, 일일예산, 예상/확정 납치금액의 서버 권위 루트다.';

COMMENT ON COLUMN public.payroll_plans.year_month IS '계획 월. YYYY-MM 형식.';
COMMENT ON COLUMN public.payroll_plans.payday IS '급여일. 월 1~31일.';
COMMENT ON COLUMN public.payroll_plans.expected_salary_amount IS '예상 급여액. KRW 1원 단위 BIGINT.';
COMMENT ON COLUMN public.payroll_plans.expected_expense_amount IS '서버 계산 예상 지출 합계.';
COMMENT ON COLUMN public.payroll_plans.target_hijack_amount IS '사용자 목표 납치금액.';
COMMENT ON COLUMN public.payroll_plans.expected_hijack_amount IS 'MAX(예상 급여 - 예상 지출, 0).';
COMMENT ON COLUMN public.payroll_plans.confirmed_hijack_amount IS '월 마감 또는 재계산 기준 확정 납치금액. 0 미만 저장 금지.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_user_month_active
  ON public.payroll_plans (user_id, year_month)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_payroll_user_month
  ON public.payroll_plans (user_id, year_month DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_user_status_month
  ON public.payroll_plans (user_id, status, year_month DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_status_updated
  ON public.payroll_plans (status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_payroll_plans_set_updated_at ON public.payroll_plans;
CREATE TRIGGER trg_payroll_plans_set_updated_at
BEFORE UPDATE ON public.payroll_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- fixed_expenses
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  fixed_expense_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  payroll_plan_id uuid NOT NULL REFERENCES public.payroll_plans(payroll_plan_id) ON DELETE CASCADE,

  expense_day smallint NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  amount bigint NOT NULL,
  recurrence_type text NOT NULL DEFAULT 'MONTHLY',
  status text NOT NULL DEFAULT 'SCHEDULED',

  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,

  CONSTRAINT chk_fixed_expenses_day
    CHECK (expense_day BETWEEN 1 AND 31),

  CONSTRAINT chk_fixed_expenses_category
    CHECK (
      category IN (
        'SUBSCRIPTION',
        'LOAN',
        'INSURANCE',
        'TELECOM',
        'RENT',
        'TRANSPORT',
        'CARD',
        'TAX',
        'EDUCATION',
        'HEALTHCARE',
        'ETC'
      )
    ),

  CONSTRAINT chk_fixed_expenses_name_length
    CHECK (char_length(trim(name)) BETWEEN 1 AND 120),

  CONSTRAINT chk_fixed_expenses_amount_positive
    CHECK (amount > 0),

  CONSTRAINT chk_fixed_expenses_recurrence
    CHECK (recurrence_type IN ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),

  CONSTRAINT chk_fixed_expenses_status
    CHECK (status IN ('SCHEDULED', 'PAID', 'SKIPPED', 'CANCELLED')),

  CONSTRAINT chk_fixed_expenses_paid_status
    CHECK (
      paid_at IS NULL
      OR status = 'PAID'
    ),

  CONSTRAINT chk_fixed_expenses_cancelled_status
    CHECK (
      cancelled_at IS NULL
      OR status = 'CANCELLED'
    )
);

COMMENT ON TABLE public.fixed_expenses
IS '월급 계획에 종속되는 고정지출. 구독, 대출, 보험, 통신비, 월세, 카드 등 고정 지출 항목을 관리한다.';

COMMENT ON COLUMN public.fixed_expenses.amount IS '고정지출 금액. KRW 1원 단위, 0원/음수 불가.';
COMMENT ON COLUMN public.fixed_expenses.status IS 'SCHEDULED, PAID, SKIPPED, CANCELLED. 서버 계산 합계에는 SCHEDULED/PAID만 포함한다.';

CREATE INDEX IF NOT EXISTS idx_fixed_user_plan
  ON public.fixed_expenses (user_id, payroll_plan_id, expense_day);

CREATE INDEX IF NOT EXISTS idx_fixed_plan_status
  ON public.fixed_expenses (payroll_plan_id, status, expense_day);

CREATE INDEX IF NOT EXISTS idx_fixed_user_category_status
  ON public.fixed_expenses (user_id, category, status);

DROP TRIGGER IF EXISTS trg_fixed_expenses_set_updated_at ON public.fixed_expenses;
CREATE TRIGGER trg_fixed_expenses_set_updated_at
BEFORE UPDATE ON public.fixed_expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- savings_plans
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.savings_plans (
  savings_plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  payroll_plan_id uuid NOT NULL REFERENCES public.payroll_plans(payroll_plan_id) ON DELETE CASCADE,

  saving_day smallint NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  amount bigint NOT NULL,
  recurrence_type text NOT NULL DEFAULT 'MONTHLY',
  status text NOT NULL DEFAULT 'SCHEDULED',

  transferred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,

  CONSTRAINT chk_savings_plans_day
    CHECK (saving_day BETWEEN 1 AND 31),

  CONSTRAINT chk_savings_plans_category
    CHECK (
      category IN (
        'SAVINGS',
        'INSTALLMENT',
        'INVESTMENT',
        'EMERGENCY_FUND',
        'PENSION',
        'HOUSING',
        'ETC'
      )
    ),

  CONSTRAINT chk_savings_plans_name_length
    CHECK (char_length(trim(name)) BETWEEN 1 AND 120),

  CONSTRAINT chk_savings_plans_amount_positive
    CHECK (amount > 0),

  CONSTRAINT chk_savings_plans_recurrence
    CHECK (recurrence_type IN ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),

  CONSTRAINT chk_savings_plans_status
    CHECK (status IN ('SCHEDULED', 'TRANSFERRED', 'SKIPPED', 'CANCELLED')),

  CONSTRAINT chk_savings_plans_transferred_status
    CHECK (
      transferred_at IS NULL
      OR status = 'TRANSFERRED'
    ),

  CONSTRAINT chk_savings_plans_cancelled_status
    CHECK (
      cancelled_at IS NULL
      OR status = 'CANCELLED'
    )
);

COMMENT ON TABLE public.savings_plans
IS '월급 계획에 종속되는 고정저축. 적금, 투자, 비상금, 연금, 주거저축 등 급여 선분리 저축 항목을 관리한다.';

COMMENT ON COLUMN public.savings_plans.amount IS '고정저축 금액. KRW 1원 단위, 0원/음수 불가.';
COMMENT ON COLUMN public.savings_plans.status IS 'SCHEDULED, TRANSFERRED, SKIPPED, CANCELLED. 서버 계산 합계에는 SCHEDULED/TRANSFERRED만 포함한다.';

CREATE INDEX IF NOT EXISTS idx_savings_user_plan
  ON public.savings_plans (user_id, payroll_plan_id, saving_day);

CREATE INDEX IF NOT EXISTS idx_savings_plan_status
  ON public.savings_plans (payroll_plan_id, status, saving_day);

CREATE INDEX IF NOT EXISTS idx_savings_user_category_status
  ON public.savings_plans (user_id, category, status);

DROP TRIGGER IF EXISTS trg_savings_plans_set_updated_at ON public.savings_plans;
CREATE TRIGGER trg_savings_plans_set_updated_at
BEFORE UPDATE ON public.savings_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- daily_budgets
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_budgets (
  daily_budget_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  budget_date date NOT NULL,
  daily_limit_amount bigint NOT NULL DEFAULT 0,
  used_amount bigint NOT NULL DEFAULT 0,
  remaining_amount bigint NOT NULL DEFAULT 0,
  over_amount bigint NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'OPEN',
  calculated_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,

  CONSTRAINT chk_daily_budgets_amounts_non_negative
    CHECK (
      daily_limit_amount >= 0
      AND used_amount >= 0
      AND remaining_amount >= 0
      AND over_amount >= 0
    ),

  CONSTRAINT chk_daily_budgets_balance
    CHECK (
      (used_amount <= daily_limit_amount AND remaining_amount = daily_limit_amount - used_amount AND over_amount = 0)
      OR
      (used_amount > daily_limit_amount AND remaining_amount = 0 AND over_amount = used_amount - daily_limit_amount)
    ),

  CONSTRAINT chk_daily_budgets_status
    CHECK (status IN ('OPEN', 'OVER', 'CLOSED')),

  CONSTRAINT chk_daily_budgets_status_amount
    CHECK (
      (status = 'OVER' AND over_amount > 0)
      OR
      (status IN ('OPEN', 'CLOSED'))
    ),

  CONSTRAINT chk_daily_budgets_closed_status
    CHECK (
      closed_at IS NULL
      OR status = 'CLOSED'
    )
);

COMMENT ON TABLE public.daily_budgets
IS '사용자별 일일 예산. 사용금액, 남은금액, 초과금액은 서버 권위 재계산으로 유지한다.';

COMMENT ON COLUMN public.daily_budgets.remaining_amount
IS '저장 정책상 0 이상. UI에서 음수 표시가 필요하면 API에서 display_remaining_amount를 계산한다.';

COMMENT ON COLUMN public.daily_budgets.over_amount
IS '예산 초과액. used_amount가 daily_limit_amount를 초과하면 양수로 저장한다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_budget_user_date
  ON public.daily_budgets (user_id, budget_date);

CREATE INDEX IF NOT EXISTS idx_daily_budget_user_date
  ON public.daily_budgets (user_id, budget_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_budget_user_status_date
  ON public.daily_budgets (user_id, status, budget_date DESC);

DROP TRIGGER IF EXISTS trg_daily_budgets_set_updated_at ON public.daily_budgets;
CREATE TRIGGER trg_daily_budgets_set_updated_at
BEFORE UPDATE ON public.daily_budgets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- variable_expenses
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.variable_expenses (
  variable_expense_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  daily_budget_id uuid NOT NULL REFERENCES public.daily_budgets(daily_budget_id) ON DELETE CASCADE,

  spent_at timestamptz NOT NULL,
  category text NOT NULL,
  merchant_name text,
  memo text,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  deleted_at timestamptz,

  CONSTRAINT chk_variable_expenses_category
    CHECK (
      category IN (
        'FOOD',
        'CAFE',
        'TRANSPORT',
        'SHOPPING',
        'CULTURE',
        'HEALTHCARE',
        'EDUCATION',
        'LIVING',
        'GIFT',
        'TRAVEL',
        'ETC'
      )
    ),

  CONSTRAINT chk_variable_expenses_merchant_length
    CHECK (merchant_name IS NULL OR char_length(merchant_name) <= 120),

  CONSTRAINT chk_variable_expenses_memo_length
    CHECK (memo IS NULL OR char_length(memo) <= 500),

  CONSTRAINT chk_variable_expenses_amount_positive
    CHECK (amount > 0),

  CONSTRAINT chk_variable_expenses_status
    CHECK (status IN ('ACTIVE', 'CANCELLED', 'DELETED')),

  CONSTRAINT chk_variable_expenses_idempotency_length
    CHECK (
      idempotency_key IS NULL
      OR char_length(idempotency_key) BETWEEN 16 AND 160
    ),

  CONSTRAINT chk_variable_expenses_cancelled_status
    CHECK (
      cancelled_at IS NULL
      OR status IN ('CANCELLED', 'DELETED')
    ),

  CONSTRAINT chk_variable_expenses_deleted_status
    CHECK (
      deleted_at IS NULL
      OR status = 'DELETED'
    )
);

COMMENT ON TABLE public.variable_expenses
IS '일일예산에 종속되는 변동지출. 등록/수정/취소/삭제 시 daily_budgets를 서버 권위로 재계산한다.';

COMMENT ON COLUMN public.variable_expenses.amount IS '변동지출 금액. KRW 1원 단위, 0원/음수 불가.';
COMMENT ON COLUMN public.variable_expenses.idempotency_key IS '중복 지출 등록 방지용 멱등 키. 사용자별 unique partial index 적용.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_variable_idempotency
  ON public.variable_expenses (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variable_user_spent
  ON public.variable_expenses (user_id, spent_at DESC);

CREATE INDEX IF NOT EXISTS idx_variable_budget
  ON public.variable_expenses (daily_budget_id, status);

CREATE INDEX IF NOT EXISTS idx_variable_user_category_spent
  ON public.variable_expenses (user_id, category, spent_at DESC);

CREATE INDEX IF NOT EXISTS idx_variable_active_budget_spent
  ON public.variable_expenses (daily_budget_id, spent_at DESC)
  WHERE status = 'ACTIVE';

DROP TRIGGER IF EXISTS trg_variable_expenses_set_updated_at ON public.variable_expenses;
CREATE TRIGGER trg_variable_expenses_set_updated_at
BEFORE UPDATE ON public.variable_expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- payroll_calculation_snapshots
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payroll_calculation_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  payroll_plan_id uuid NOT NULL REFERENCES public.payroll_plans(payroll_plan_id) ON DELETE CASCADE,

  year_month char(7) NOT NULL,
  salary_amount bigint NOT NULL DEFAULT 0,
  fixed_expense_total bigint NOT NULL DEFAULT 0,
  savings_total bigint NOT NULL DEFAULT 0,
  variable_expense_total bigint NOT NULL DEFAULT 0,
  daily_budget_total bigint NOT NULL DEFAULT 0,
  expected_expense_amount bigint NOT NULL DEFAULT 0,
  expected_hijack_amount bigint NOT NULL DEFAULT 0,
  confirmed_hijack_amount bigint NOT NULL DEFAULT 0,

  formula_version text NOT NULL DEFAULT 'payroll-v1',
  calculation_reason text NOT NULL DEFAULT 'RECALCULATE',
  calculation_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculation_output jsonb NOT NULL DEFAULT '{}'::jsonb,

  calculated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_calc_snapshots_year_month
    CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),

  CONSTRAINT chk_calc_snapshots_amounts_non_negative
    CHECK (
      salary_amount >= 0
      AND fixed_expense_total >= 0
      AND savings_total >= 0
      AND variable_expense_total >= 0
      AND daily_budget_total >= 0
      AND expected_expense_amount >= 0
      AND expected_hijack_amount >= 0
      AND confirmed_hijack_amount >= 0
    ),

  CONSTRAINT chk_calc_snapshots_formula_version_length
    CHECK (char_length(trim(formula_version)) BETWEEN 1 AND 80),

  CONSTRAINT chk_calc_snapshots_reason
    CHECK (
      calculation_reason IN (
        'PAYROLL_PLAN_CREATED',
        'PAYROLL_PLAN_UPDATED',
        'FIXED_EXPENSE_CHANGED',
        'SAVINGS_PLAN_CHANGED',
        'DAILY_BUDGET_CHANGED',
        'VARIABLE_EXPENSE_CHANGED',
        'MONTH_CLOSED',
        'RECALCULATE',
        'MIGRATION'
      )
    )
);

COMMENT ON TABLE public.payroll_calculation_snapshots
IS '급여·지출·저축·일일예산·납치금액 서버 권위 계산 결과의 재현 가능한 스냅샷.';

CREATE INDEX IF NOT EXISTS idx_calc_snapshot_user_month
  ON public.payroll_calculation_snapshots (user_id, year_month DESC, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_snapshot_plan_time
  ON public.payroll_calculation_snapshots (payroll_plan_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_snapshot_reason_time
  ON public.payroll_calculation_snapshots (calculation_reason, calculated_at DESC);

-- -----------------------------------------------------------------------------
-- 소유권 일관성 검증 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_payroll_child_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_user_id uuid;
BEGIN
  SELECT pp.user_id
    INTO v_plan_user_id
  FROM public.payroll_plans pp
  WHERE pp.payroll_plan_id = NEW.payroll_plan_id;

  IF v_plan_user_id IS NULL THEN
    RAISE EXCEPTION 'payroll_plan_id % does not exist', NEW.payroll_plan_id;
  END IF;

  IF NEW.user_id <> v_plan_user_id THEN
    RAISE EXCEPTION 'child user_id % does not match payroll plan owner %', NEW.user_id, v_plan_user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_payroll_child_owner()
IS 'fixed_expenses/savings_plans가 payroll_plans 소유자와 같은 user_id를 갖도록 강제한다.';

CREATE OR REPLACE FUNCTION public.ensure_variable_expense_owner_and_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget_user_id uuid;
  v_budget_date date;
  v_spent_date date;
BEGIN
  SELECT db.user_id, db.budget_date
    INTO v_budget_user_id, v_budget_date
  FROM public.daily_budgets db
  WHERE db.daily_budget_id = NEW.daily_budget_id;

  IF v_budget_user_id IS NULL THEN
    RAISE EXCEPTION 'daily_budget_id % does not exist', NEW.daily_budget_id;
  END IF;

  IF NEW.user_id <> v_budget_user_id THEN
    RAISE EXCEPTION 'variable expense user_id % does not match daily budget owner %', NEW.user_id, v_budget_user_id;
  END IF;

  v_spent_date := (NEW.spent_at AT TIME ZONE 'Asia/Seoul')::date;

  IF v_spent_date <> v_budget_date THEN
    RAISE EXCEPTION 'spent_at date % must match daily budget date % in Asia/Seoul', v_spent_date, v_budget_date;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_variable_expense_owner_and_date()
IS '변동지출의 user_id와 spent_at 날짜가 daily_budgets 소유자/날짜와 일치하도록 강제한다.';

CREATE OR REPLACE FUNCTION public.ensure_snapshot_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_user_id uuid;
  v_plan_year_month char(7);
BEGIN
  SELECT pp.user_id, pp.year_month
    INTO v_plan_user_id, v_plan_year_month
  FROM public.payroll_plans pp
  WHERE pp.payroll_plan_id = NEW.payroll_plan_id;

  IF v_plan_user_id IS NULL THEN
    RAISE EXCEPTION 'payroll_plan_id % does not exist', NEW.payroll_plan_id;
  END IF;

  IF NEW.user_id <> v_plan_user_id THEN
    RAISE EXCEPTION 'snapshot user_id % does not match payroll plan owner %', NEW.user_id, v_plan_user_id;
  END IF;

  IF NEW.year_month <> v_plan_year_month THEN
    RAISE EXCEPTION 'snapshot year_month % does not match payroll plan year_month %', NEW.year_month, v_plan_year_month;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_snapshot_owner()
IS '계산 스냅샷의 user_id/year_month가 payroll_plans와 일치하도록 강제한다.';

DROP TRIGGER IF EXISTS trg_fixed_expenses_ensure_owner ON public.fixed_expenses;
CREATE TRIGGER trg_fixed_expenses_ensure_owner
BEFORE INSERT OR UPDATE OF user_id, payroll_plan_id ON public.fixed_expenses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_payroll_child_owner();

DROP TRIGGER IF EXISTS trg_savings_plans_ensure_owner ON public.savings_plans;
CREATE TRIGGER trg_savings_plans_ensure_owner
BEFORE INSERT OR UPDATE OF user_id, payroll_plan_id ON public.savings_plans
FOR EACH ROW
EXECUTE FUNCTION public.ensure_payroll_child_owner();

DROP TRIGGER IF EXISTS trg_variable_expenses_ensure_owner_date ON public.variable_expenses;
CREATE TRIGGER trg_variable_expenses_ensure_owner_date
BEFORE INSERT OR UPDATE OF user_id, daily_budget_id, spent_at ON public.variable_expenses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_variable_expense_owner_and_date();

DROP TRIGGER IF EXISTS trg_calc_snapshots_ensure_owner ON public.payroll_calculation_snapshots;
CREATE TRIGGER trg_calc_snapshots_ensure_owner
BEFORE INSERT OR UPDATE OF user_id, payroll_plan_id, year_month ON public.payroll_calculation_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.ensure_snapshot_owner();

-- -----------------------------------------------------------------------------
-- 서버 권위 재계산 함수
-- -----------------------------------------------------------------------------

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

  SELECT COALESCE(SUM(ve.amount), 0)::bigint
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

COMMENT ON FUNCTION public.recalculate_daily_budget(uuid)
IS '변동지출 합계를 기준으로 daily_budgets를 row lock 후 서버 권위로 재계산한다.';

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
  v_variable_total bigint;
  v_daily_budget_total bigint;
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

  SELECT COALESCE(SUM(ve.amount), 0)::bigint
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
    'payroll-v1',
    COALESCE(p_reason, 'RECALCULATE'),
    jsonb_build_object(
      'month_start', v_month_start,
      'month_end', v_month_end,
      'salary_amount', v_salary_amount,
      'fixed_expense_statuses', jsonb_build_array('SCHEDULED', 'PAID'),
      'savings_statuses', jsonb_build_array('SCHEDULED', 'TRANSFERRED'),
      'variable_expense_status', 'ACTIVE',
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
IS '급여계획의 고정지출, 고정저축, 일일예산, 변동지출 합계를 서버 권위로 재계산하고 snapshot을 생성한다.';

CREATE OR REPLACE FUNCTION public.recalculate_payroll_plans_for_user_month(
  p_user_id uuid,
  p_budget_date date,
  p_reason text DEFAULT 'DAILY_BUDGET_CHANGED'
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_month char(7);
  v_plan record;
  v_count integer := 0;
BEGIN
  v_year_month := to_char(p_budget_date, 'YYYY-MM');

  FOR v_plan IN
    SELECT pp.payroll_plan_id
    FROM public.payroll_plans pp
    WHERE pp.user_id = p_user_id
      AND pp.year_month = v_year_month
      AND pp.status IN ('DRAFT', 'ACTIVE', 'CLOSED')
  LOOP
    PERFORM public.recalculate_payroll_plan(v_plan.payroll_plan_id, p_reason);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.recalculate_payroll_plans_for_user_month(uuid, date, text)
IS '일일예산/변동지출 변경 시 같은 사용자·월의 급여계획을 재계산한다.';

-- -----------------------------------------------------------------------------
-- 재계산 트리거
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_fixed_expenses_recalculate_payroll()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason text := 'FIXED_EXPENSE_CHANGED';
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_payroll_plan(OLD.payroll_plan_id, v_reason);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.payroll_plan_id IS DISTINCT FROM NEW.payroll_plan_id THEN
    PERFORM public.recalculate_payroll_plan(OLD.payroll_plan_id, v_reason);
    PERFORM public.recalculate_payroll_plan(NEW.payroll_plan_id, v_reason);
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_payroll_plan(NEW.payroll_plan_id, v_reason);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_savings_plans_recalculate_payroll()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason text := 'SAVINGS_PLAN_CHANGED';
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_payroll_plan(OLD.payroll_plan_id, v_reason);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.payroll_plan_id IS DISTINCT FROM NEW.payroll_plan_id THEN
    PERFORM public.recalculate_payroll_plan(OLD.payroll_plan_id, v_reason);
    PERFORM public.recalculate_payroll_plan(NEW.payroll_plan_id, v_reason);
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_payroll_plan(NEW.payroll_plan_id, v_reason);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_variable_expenses_recalculate_daily_budget()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_daily_budget(OLD.daily_budget_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.daily_budget_id IS DISTINCT FROM NEW.daily_budget_id THEN
    PERFORM public.recalculate_daily_budget(OLD.daily_budget_id);
    PERFORM public.recalculate_daily_budget(NEW.daily_budget_id);
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_daily_budget(NEW.daily_budget_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_daily_budgets_recalculate_payroll()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_payroll_plans_for_user_month(OLD.user_id, OLD.budget_date, 'DAILY_BUDGET_CHANGED');
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.budget_date IS DISTINCT FROM NEW.budget_date
     ) THEN
    PERFORM public.recalculate_payroll_plans_for_user_month(OLD.user_id, OLD.budget_date, 'DAILY_BUDGET_CHANGED');
    PERFORM public.recalculate_payroll_plans_for_user_month(NEW.user_id, NEW.budget_date, 'DAILY_BUDGET_CHANGED');
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_payroll_plans_for_user_month(NEW.user_id, NEW.budget_date, 'DAILY_BUDGET_CHANGED');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixed_expenses_recalculate_payroll ON public.fixed_expenses;
CREATE TRIGGER trg_fixed_expenses_recalculate_payroll
AFTER INSERT OR UPDATE OR DELETE ON public.fixed_expenses
FOR EACH ROW
EXECUTE FUNCTION public.trg_fixed_expenses_recalculate_payroll();

DROP TRIGGER IF EXISTS trg_savings_plans_recalculate_payroll ON public.savings_plans;
CREATE TRIGGER trg_savings_plans_recalculate_payroll
AFTER INSERT OR UPDATE OR DELETE ON public.savings_plans
FOR EACH ROW
EXECUTE FUNCTION public.trg_savings_plans_recalculate_payroll();

DROP TRIGGER IF EXISTS trg_variable_expenses_recalculate_daily_budget ON public.variable_expenses;
CREATE TRIGGER trg_variable_expenses_recalculate_daily_budget
AFTER INSERT OR UPDATE OR DELETE ON public.variable_expenses
FOR EACH ROW
EXECUTE FUNCTION public.trg_variable_expenses_recalculate_daily_budget();

DROP TRIGGER IF EXISTS trg_daily_budgets_recalculate_payroll ON public.daily_budgets;
CREATE TRIGGER trg_daily_budgets_recalculate_payroll
AFTER INSERT OR UPDATE OR DELETE ON public.daily_budgets
FOR EACH ROW
EXECUTE FUNCTION public.trg_daily_budgets_recalculate_payroll();

-- -----------------------------------------------------------------------------
-- RLS / 접근통제
-- 서버 API는 요청별로 SET LOCAL app.current_user_id, app.is_admin을 주입해야 한다.
-- -----------------------------------------------------------------------------

ALTER TABLE public.payroll_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_calculation_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_plans_owner_all ON public.payroll_plans;
CREATE POLICY payroll_plans_owner_all
ON public.payroll_plans
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS fixed_expenses_owner_all ON public.fixed_expenses;
CREATE POLICY fixed_expenses_owner_all
ON public.fixed_expenses
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS savings_plans_owner_all ON public.savings_plans;
CREATE POLICY savings_plans_owner_all
ON public.savings_plans
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS daily_budgets_owner_all ON public.daily_budgets;
CREATE POLICY daily_budgets_owner_all
ON public.daily_budgets
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS variable_expenses_owner_all ON public.variable_expenses;
CREATE POLICY variable_expenses_owner_all
ON public.variable_expenses
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS calc_snapshots_owner_all ON public.payroll_calculation_snapshots;
CREATE POLICY calc_snapshots_owner_all
ON public.payroll_calculation_snapshots
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

COMMENT ON POLICY payroll_plans_owner_all ON public.payroll_plans
IS '본인 또는 관리자만 급여계획을 조회·변경할 수 있다.';

COMMENT ON POLICY fixed_expenses_owner_all ON public.fixed_expenses
IS '본인 또는 관리자만 고정지출을 조회·변경할 수 있다.';

COMMENT ON POLICY savings_plans_owner_all ON public.savings_plans
IS '본인 또는 관리자만 고정저축을 조회·변경할 수 있다.';

COMMENT ON POLICY daily_budgets_owner_all ON public.daily_budgets
IS '본인 또는 관리자만 일일예산을 조회·변경할 수 있다.';

COMMENT ON POLICY variable_expenses_owner_all ON public.variable_expenses
IS '본인 또는 관리자만 변동지출을 조회·변경할 수 있다.';

COMMENT ON POLICY calc_snapshots_owner_all ON public.payroll_calculation_snapshots
IS '본인 또는 관리자만 계산 스냅샷을 조회·생성할 수 있다.';

COMMIT;
