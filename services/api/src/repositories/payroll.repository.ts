import type {
  JsonRecord,
  JsonValue,
  PaginationInput,
  PayrollPlanCreateInput,
  PayrollRepository,
  PayrollRouteRuntime,
  PayrollSimulationInput,
} from "../routes/payroll.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface PayrollDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface PayrollDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type PayrollDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: PayrollDbQueryOptions<TEnv>,
) => Promise<PayrollDbQueryResult>;

export interface NeonPayrollRepositoryOptions<TEnv = unknown> {
  readonly query?: PayrollDbQuery<TEnv>;
}

const DATABASE_URL_ENV_KEYS = [
  "SALARY_HIJACKING_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "DIRECT_DATABASE_URL",
] as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonPayrollRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for payroll repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: PayrollDbQueryOptions<TEnv>,
): Promise<PayrollDbQueryResult> {
  const moduleValue = (await import("@neondatabase/serverless")) as unknown as {
    readonly Pool: new (config: Record<string, unknown>) => {
      query: (
        text: string,
        values?: readonly DbValue[],
      ) => Promise<{
        readonly rows: readonly DbRow[];
        readonly rowCount: number | null;
      }>;
      end: () => Promise<void>;
    };
    readonly neonConfig?: { fetchConnectionCache?: boolean };
  };

  if (moduleValue.neonConfig)
    moduleValue.neonConfig.fetchConnectionCache = true;
  const pool = new moduleValue.Pool({
    connectionString: databaseUrl(options.env),
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  try {
    return await pool.query(sqlText, [...params]);
  } finally {
    await pool.end();
  }
}

function assertUuid(value: string, field: string): string {
  if (!uuidPattern.test(value)) {
    throw new Error(`${field} must be a UUID for DB-backed payroll.`);
  }
  return value;
}

function assertKrw(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer KRW amount.`);
  }
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function todayInSeoul(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function lastDateOfMonth(yearMonth: string): string {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

function dayForMonth(yearMonth: string, payday: number): string {
  const lastDate = lastDateOfMonth(yearMonth);
  const maxDay = Number.parseInt(lastDate.slice(8, 10), 10);
  const day = Math.max(1, Math.min(maxDay, payday));
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function serverAuthorityBreakdown(input: {
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly payrollAmountMinor: number;
  readonly fixedExpenseTotalMinor: number;
  readonly fixedSavingsTotalMinor: number;
  readonly variableExpenseReserveMinor: number;
  readonly emergencyBufferMinor: number;
  readonly carryOverAmountMinor: number;
  readonly alreadySpentAmountMinor?: number;
}): JsonRecord {
  const dayCount = daysInclusive(input.periodStartDate, input.periodEndDate);
  const totalDeductionsMinor =
    input.fixedExpenseTotalMinor +
    input.fixedSavingsTotalMinor +
    input.variableExpenseReserveMinor +
    input.emergencyBufferMinor;
  const availableBeforeSpentMinor =
    input.payrollAmountMinor +
    input.carryOverAmountMinor -
    totalDeductionsMinor;
  const availableForDailyBudgetMinor = Math.max(
    0,
    availableBeforeSpentMinor - (input.alreadySpentAmountMinor ?? 0),
  );
  const recommendedDailyBudgetMinor = Math.floor(
    availableForDailyBudgetMinor / dayCount,
  );
  const remainderMinor =
    availableForDailyBudgetMinor - recommendedDailyBudgetMinor * dayCount;
  return {
    periodStartDate: input.periodStartDate,
    periodEndDate: input.periodEndDate,
    dayCount,
    payrollAmountMinor: input.payrollAmountMinor,
    fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
    fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
    variableExpenseReserveMinor: input.variableExpenseReserveMinor,
    emergencyBufferMinor: input.emergencyBufferMinor,
    carryOverAmountMinor: input.carryOverAmountMinor,
    alreadySpentAmountMinor: input.alreadySpentAmountMinor ?? 0,
    totalDeductionsMinor,
    availableBeforeSpentMinor,
    availableForDailyBudgetMinor,
    recommendedDailyBudgetMinor,
    remainderMinor,
    hijackRate:
      input.payrollAmountMinor > 0
        ? Math.round(
            (totalDeductionsMinor / input.payrollAmountMinor) * 10_000,
          ) / 10_000
        : 0,
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function expectedExpenseFromInput(input: PayrollPlanCreateInput): number {
  return (
    assertKrw(input.fixedExpenseTotalMinor, "fixedExpenseTotalMinor") +
    assertKrw(
      input.variableExpenseReserveMinor,
      "variableExpenseReserveMinor",
    ) +
    assertKrw(input.emergencyBufferMinor, "emergencyBufferMinor")
  );
}

function targetHijackFromInput(input: PayrollPlanCreateInput): number {
  return (
    expectedExpenseFromInput(input) +
    assertKrw(input.fixedSavingsTotalMinor, "fixedSavingsTotalMinor")
  );
}

function rowToPlan(
  row: DbRow,
  extra: Partial<PayrollPlanCreateInput> = {},
): JsonRecord {
  const yearMonth = String(
    row.year_month ?? todayInSeoul(new Date()).slice(0, 7),
  );
  const payday = toNumber(row.payday) || 1;
  const payrollAmountMinor = toNumber(row.expected_salary_amount);
  const expectedExpenseAmount = toNumber(row.expected_expense_amount);
  const targetHijackAmount = toNumber(row.target_hijack_amount);
  const fixedSavingsTotalMinor =
    extra.fixedSavingsTotalMinor ??
    Math.max(0, targetHijackAmount - expectedExpenseAmount);
  const fixedExpenseTotalMinor =
    extra.fixedExpenseTotalMinor ?? expectedExpenseAmount;
  const variableExpenseReserveMinor = extra.variableExpenseReserveMinor ?? 0;
  const emergencyBufferMinor = extra.emergencyBufferMinor ?? 0;
  const periodStartDate = extra.periodStartDate ?? `${yearMonth}-01`;
  const periodEndDate = extra.periodEndDate ?? lastDateOfMonth(yearMonth);
  const plan: JsonRecord = {
    planId: String(row.payroll_plan_id ?? ""),
    title: extra.title ?? `${yearMonth} 급여 계획`,
    incomeType: extra.incomeType ?? "NET",
    payrollCycle: extra.payrollCycle ?? "MONTHLY",
    payrollAmountMinor,
    payday,
    firstPayrollDate: extra.firstPayrollDate ?? dayForMonth(yearMonth, payday),
    periodStartDate,
    periodEndDate,
    fixedExpenseTotalMinor,
    fixedSavingsTotalMinor,
    variableExpenseReserveMinor,
    emergencyBufferMinor,
    carryOverAmountMinor: extra.carryOverAmountMinor ?? 0,
    reservePolicy: extra.reservePolicy ?? "ZERO_BASE",
    memo: extra.memo ?? null,
    status: String(row.status ?? "DRAFT"),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    calculation: serverAuthorityBreakdown({
      periodStartDate,
      periodEndDate,
      payrollAmountMinor,
      fixedExpenseTotalMinor,
      fixedSavingsTotalMinor,
      variableExpenseReserveMinor,
      emergencyBufferMinor,
      carryOverAmountMinor: extra.carryOverAmountMinor ?? 0,
    }),
    expectedExpenseAmountMinor: expectedExpenseAmount,
    targetHijackAmountMinor: targetHijackAmount,
    expectedHijackAmountMinor: toNumber(row.expected_hijack_amount),
    confirmedHijackAmountMinor: toNumber(row.confirmed_hijack_amount),
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
  };
  delete plan.userId;
  return plan;
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
): {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
} {
  return {
    items: rows.map((row) => rowToPlan(row) as TItem),
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function queryText<TEnv>(
  repositoryQuery: PayrollDbQuery<TEnv>,
  runtime: PayrollRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<PayrollDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

function pageParams(page: PaginationInput): readonly [number, number] {
  return [page.limit, page.offset];
}

async function getPlanRow<TEnv>(
  repositoryQuery: PayrollDbQuery<TEnv>,
  planId: string,
  runtime: PayrollRouteRuntime<TEnv>,
  operationName = "payroll.get",
): Promise<DbRow | null> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select *
      from public.payroll_plans
      where payroll_plan_id = $1::uuid
        and user_id = $2::uuid
        and status <> 'ARCHIVED'
      limit 1
    `,
    [
      assertUuid(planId, "planId"),
      assertUuid(runtime.principal.userId, "principal.userId"),
    ],
  );
  return result.rows[0] ?? null;
}

function simulationResult(input: PayrollSimulationInput): JsonRecord {
  return {
    calculation: serverAuthorityBreakdown(input),
    saved: false,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
    serverAuthority: true,
  };
}

export function createNeonPayrollRepository<TEnv = unknown>(
  options: NeonPayrollRepositoryOptions<TEnv> = {},
): PayrollRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-payroll-repository",
    async listPlans(input, page, runtime) {
      const status =
        typeof input.status === "string" && input.status.trim()
          ? input.status.trim().toUpperCase()
          : null;
      const params: DbValue[] = [
        assertUuid(runtime.principal.userId, "principal.userId"),
      ];
      const clauses = ["user_id = $1::uuid"];
      if (status) {
        params.push(status);
        clauses.push(`status = $${params.length}`);
      }
      const pageValues = pageParams(page);
      params.push(...pageValues);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.list",
        `
          select *, count(*) over() as total_count
          from public.payroll_plans
          where ${clauses.join(" and ")}
          order by year_month desc, updated_at desc, payroll_plan_id desc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page);
    },
    async getPlan(planId, runtime) {
      const row = await getPlanRow(repositoryQuery, planId, runtime);
      return row ? rowToPlan(row) : null;
    },
    async getCurrentPlan(runtime) {
      const today = todayInSeoul(runtime.now);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.current",
        `
          select *
          from public.payroll_plans
          where user_id = $1::uuid
            and status = 'ACTIVE'
            and year_month <= $2
          order by year_month desc, updated_at desc
          limit 1
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          today.slice(0, 7),
        ],
      );
      return result.rows[0] ? rowToPlan(result.rows[0]) : null;
    },
    async createPlan(input, runtime) {
      const expectedExpenseAmount = expectedExpenseFromInput(input);
      const targetHijackAmount = targetHijackFromInput(input);
      const expectedHijackAmount = Math.max(
        0,
        assertKrw(input.payrollAmountMinor, "payrollAmountMinor") -
          expectedExpenseAmount,
      );
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.create",
        `
          insert into public.payroll_plans (
            user_id,
            year_month,
            payday,
            expected_salary_amount,
            expected_expense_amount,
            target_hijack_amount,
            expected_hijack_amount,
            confirmed_hijack_amount,
            status
          )
          values ($1::uuid, $2, $3::smallint, $4::bigint, $5::bigint, $6::bigint, $7::bigint, 0, 'DRAFT')
          returning *
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          input.periodStartDate.slice(0, 7),
          input.payday ?? 1,
          assertKrw(input.payrollAmountMinor, "payrollAmountMinor"),
          expectedExpenseAmount,
          targetHijackAmount,
          expectedHijackAmount,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create payroll plan.");
      return rowToPlan(row, input);
    },
    async updatePlan(planId, input, runtime) {
      const existing = await getPlanRow(
        repositoryQuery,
        planId,
        runtime,
        "payroll.update.find",
      );
      if (!existing) throw new Error("Payroll plan not found.");
      const current = rowToPlan(existing);
      const merged: PayrollPlanCreateInput = {
        title: String(input.title ?? current.title ?? "급여 계획"),
        incomeType: input.incomeType ?? "NET",
        payrollCycle: input.payrollCycle ?? "MONTHLY",
        payrollAmountMinor:
          input.payrollAmountMinor ?? toNumber(current.payrollAmountMinor),
        payday: input.payday ?? (toNumber(current.payday) || 1),
        firstPayrollDate:
          input.firstPayrollDate ?? String(current.firstPayrollDate),
        periodStartDate:
          input.periodStartDate ?? String(current.periodStartDate),
        periodEndDate: input.periodEndDate ?? String(current.periodEndDate),
        fixedExpenseTotalMinor:
          input.fixedExpenseTotalMinor ??
          toNumber(current.fixedExpenseTotalMinor),
        fixedSavingsTotalMinor:
          input.fixedSavingsTotalMinor ??
          toNumber(current.fixedSavingsTotalMinor),
        variableExpenseReserveMinor:
          input.variableExpenseReserveMinor ??
          toNumber(current.variableExpenseReserveMinor),
        emergencyBufferMinor:
          input.emergencyBufferMinor ?? toNumber(current.emergencyBufferMinor),
        carryOverAmountMinor:
          input.carryOverAmountMinor ?? toNumber(current.carryOverAmountMinor),
        reservePolicy: input.reservePolicy ?? "ZERO_BASE",
        memo:
          input.memo === undefined
            ? typeof current.memo === "string"
              ? current.memo
              : null
            : input.memo,
      };
      const expectedExpenseAmount = expectedExpenseFromInput(merged);
      const targetHijackAmount = targetHijackFromInput(merged);
      const status = input.status ?? String(current.status ?? "DRAFT");
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.update",
        `
          update public.payroll_plans
          set year_month = $3,
              payday = $4::smallint,
              expected_salary_amount = $5::bigint,
              expected_expense_amount = $6::bigint,
              target_hijack_amount = $7::bigint,
              expected_hijack_amount = $8::bigint,
              status = $9
          where payroll_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(planId, "planId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
          merged.periodStartDate.slice(0, 7),
          merged.payday ?? 1,
          assertKrw(merged.payrollAmountMinor, "payrollAmountMinor"),
          expectedExpenseAmount,
          targetHijackAmount,
          Math.max(0, merged.payrollAmountMinor - expectedExpenseAmount),
          status === "DELETED" || status === "PAUSED" ? "DRAFT" : status,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Payroll plan update failed.");
      return rowToPlan(row, merged);
    },
    async deletePlan(planId, runtime) {
      await queryText(
        repositoryQuery,
        runtime,
        "payroll.delete",
        `
          update public.payroll_plans
          set status = 'ARCHIVED',
              archived_at = now()
          where payroll_plan_id = $1::uuid
            and user_id = $2::uuid
        `,
        [
          assertUuid(planId, "planId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      return { planId, status: "DELETED", serverAuthority: true };
    },
    async activatePlan(planId, _reason, runtime) {
      await queryText(
        repositoryQuery,
        runtime,
        "payroll.activate.archiveExisting",
        `
          update public.payroll_plans
          set status = 'ARCHIVED',
              archived_at = now()
          where user_id = $1::uuid
            and status = 'ACTIVE'
            and payroll_plan_id <> $2::uuid
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          assertUuid(planId, "planId"),
        ],
      );
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.activate",
        `
          update public.payroll_plans
          set status = 'ACTIVE',
              archived_at = null,
              closed_at = null
          where payroll_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(planId, "planId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Payroll plan activation failed.");
      return rowToPlan(row);
    },
    async pausePlan(planId, _reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.pause",
        `
          update public.payroll_plans
          set status = 'DRAFT'
          where payroll_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(planId, "planId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Payroll plan pause failed.");
      return rowToPlan(row, { memo: "PAUSED" });
    },
    async archivePlan(planId, _reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.archive",
        `
          update public.payroll_plans
          set status = 'ARCHIVED',
              archived_at = now()
          where payroll_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(planId, "planId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Payroll plan archive failed.");
      return rowToPlan(row);
    },
    async home(runtime) {
      const currentPlan = await this.getCurrentPlan(runtime);
      const calculation =
        currentPlan &&
        typeof currentPlan.calculation === "object" &&
        currentPlan.calculation !== null &&
        !Array.isArray(currentPlan.calculation)
          ? (currentPlan.calculation as JsonRecord)
          : null;
      return {
        currentPlan,
        headline: currentPlan
          ? "급여 납치 계획이 활성화되어 있습니다."
          : "활성 급여계획이 없습니다.",
        nextAction: currentPlan
          ? "오늘의 일일 예산을 확인하고 변동지출을 기록하세요."
          : "급여일과 고정지출을 입력해 첫 계획을 만드세요.",
        recommendedDailyBudgetMinor:
          typeof calculation?.recommendedDailyBudgetMinor === "number"
            ? calculation.recommendedDailyBudgetMinor
            : 0,
        availableForDailyBudgetMinor:
          typeof calculation?.availableForDailyBudgetMinor === "number"
            ? calculation.availableForDailyBudgetMinor
            : 0,
        financialRawDataExposed: false,
        serverAuthority: true,
      };
    },
    async summary(input, runtime) {
      const page = { page: 1, pageSize: 500, offset: 0, limit: 500 };
      const rows = (
        await this.listPlans(
          typeof input.status === "string" ? { status: input.status } : {},
          page,
          runtime,
        )
      ).items;
      const payrollTotalMinor = rows.reduce(
        (sum, item) => sum + toNumber(item.payrollAmountMinor),
        0,
      );
      const deductionTotalMinor = rows.reduce((sum, item) => {
        const calculation =
          typeof item.calculation === "object" &&
          item.calculation !== null &&
          !Array.isArray(item.calculation)
            ? (item.calculation as JsonRecord)
            : {};
        return sum + toNumber(calculation.totalDeductionsMinor);
      }, 0);
      return {
        planCount: rows.length,
        activePlanCount: rows.filter((item) => item.status === "ACTIVE").length,
        payrollTotalMinor,
        deductionTotalMinor,
        availableTotalMinor: Math.max(
          0,
          payrollTotalMinor - deductionTotalMinor,
        ),
        averageHijackRate:
          payrollTotalMinor > 0
            ? Math.round((deductionTotalMinor / payrollTotalMinor) * 10_000) /
              10_000
            : 0,
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async calendar(input, runtime) {
      const month =
        typeof input.month === "string" && /^\d{4}-\d{2}$/.test(input.month)
          ? input.month
          : todayInSeoul(runtime.now).slice(0, 7);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "payroll.calendar",
        `
          select *
          from public.payroll_plans
          where user_id = $1::uuid
            and year_month = $2
          order by payday asc, updated_at desc
        `,
        [assertUuid(runtime.principal.userId, "principal.userId"), month],
      );
      const items = result.rows.map((row) => {
        const plan = rowToPlan(row);
        return {
          planId: String(plan.planId),
          title: String(plan.title),
          payrollDate: String(plan.firstPayrollDate),
          payrollAmountMinor: toNumber(plan.payrollAmountMinor),
          status: String(plan.status),
        } as JsonRecord;
      });
      return {
        month,
        startDate: `${month}-01`,
        endDate: lastDateOfMonth(month),
        items: items as unknown as JsonValue[],
        payrollCount: items.length,
        payrollTotalMinor: items.reduce(
          (sum, item) => sum + toNumber(item.payrollAmountMinor),
          0,
        ),
        serverAuthority: true,
      };
    },
    async recalculate(input, runtime) {
      const calculation = serverAuthorityBreakdown(input);
      let updatedPlan: JsonRecord | null = null;
      if (input.planId && input.overwritePlan) {
        updatedPlan = await this.updatePlan(
          input.planId,
          {
            payrollAmountMinor: input.payrollAmountMinor,
            periodStartDate: input.periodStartDate,
            periodEndDate: input.periodEndDate,
            fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
            fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
            variableExpenseReserveMinor: input.variableExpenseReserveMinor,
            emergencyBufferMinor: input.emergencyBufferMinor,
            carryOverAmountMinor: input.carryOverAmountMinor,
            memo: input.reason,
          },
          runtime,
        );
      }
      return {
        calculation,
        updatedPlan,
        overwritePlan: input.overwritePlan,
        reason: input.reason,
        serverAuthority: true,
      };
    },
    async simulate(input) {
      return simulationResult(input);
    },
  };
}
