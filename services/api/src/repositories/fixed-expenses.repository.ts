import type {
  FixedExpenseCreateInput,
  FixedExpenseImpactInput,
  FixedExpenseListResult,
  FixedExpenseRepository,
  FixedExpenseRouteRuntime,
  JsonRecord,
  JsonValue,
  PaginationInput,
} from "../routes/fixed-expenses.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface FixedExpensesDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface FixedExpensesDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type FixedExpensesDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: FixedExpensesDbQueryOptions<TEnv>,
) => Promise<FixedExpensesDbQueryResult>;

export interface NeonFixedExpensesRepositoryOptions<TEnv = unknown> {
  readonly query?: FixedExpensesDbQuery<TEnv>;
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

const dbCategoryByApiCategory = Object.freeze({
  HOUSING: "RENT",
  TELECOM: "TELECOM",
  UTILITY: "ETC",
  INSURANCE: "INSURANCE",
  SUBSCRIPTION: "SUBSCRIPTION",
  LOAN_REPAYMENT: "LOAN",
  TRANSPORT: "TRANSPORT",
  EDUCATION: "EDUCATION",
  HEALTHCARE: "HEALTHCARE",
  FAMILY: "ETC",
  TAX: "TAX",
  ETC: "ETC",
});

const apiCategoryByDbCategory = Object.freeze({
  SUBSCRIPTION: "SUBSCRIPTION",
  LOAN: "LOAN_REPAYMENT",
  INSURANCE: "INSURANCE",
  TELECOM: "TELECOM",
  RENT: "HOUSING",
  TRANSPORT: "TRANSPORT",
  CARD: "ETC",
  TAX: "TAX",
  EDUCATION: "EDUCATION",
  HEALTHCARE: "HEALTHCARE",
  ETC: "ETC",
});

const dbStatusByApiStatus = Object.freeze({
  ACTIVE: "SCHEDULED",
  PAUSED: "SKIPPED",
  ENDED: "CANCELLED",
  DELETED: "CANCELLED",
});

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonFixedExpensesRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for fixed expenses repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: FixedExpensesDbQueryOptions<TEnv>,
): Promise<FixedExpensesDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed fixed expenses.`);
  }
  return value;
}

function assertKrw(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive safe integer KRW amount.`);
  }
  return value;
}

function assertKrwOrZero(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer KRW amount.`);
  }
  return value;
}

function assertDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be an ISO date.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid ISO date.`);
  }
  return value;
}

function assertPaymentDay(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 31) {
    throw new Error(`${field} must be an integer from 1 to 31.`);
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

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date(0).toISOString()
      : parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function dateFromUnknown(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return assertDate(value.slice(0, 10), "date");
  }
  return fallback;
}

function todayInSeoul(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

function endOfMonth(month: string): string {
  const end = new Date(`${month}-01T00:00:00.000Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return end.toISOString().slice(0, 10);
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function dbCategoryFromApi(value: string): string {
  return (
    dbCategoryByApiCategory[value as keyof typeof dbCategoryByApiCategory] ??
    "ETC"
  );
}

function apiCategoryFromDb(value: unknown): string {
  const category = String(value ?? "ETC").toUpperCase();
  return (
    apiCategoryByDbCategory[category as keyof typeof apiCategoryByDbCategory] ??
    "ETC"
  );
}

function dbStatusFromApi(value: string): string {
  return (
    dbStatusByApiStatus[value as keyof typeof dbStatusByApiStatus] ?? value
  );
}

function apiStatusFromDb(row: DbRow): string {
  const status = String(row.status ?? "SCHEDULED").toUpperCase();
  if (status === "SKIPPED") return "PAUSED";
  if (status === "CANCELLED") return "ENDED";
  return "ACTIVE";
}

function dbStatusFromPaymentStatus(value: string): string {
  if (value === "PAID") return "PAID";
  if (value === "SKIPPED" || value === "FAILED") return "SKIPPED";
  return "SCHEDULED";
}

function frequencyFromDb(value: unknown): string {
  const frequency = String(value ?? "MONTHLY").toUpperCase();
  return ["WEEKLY", "MONTHLY", "YEARLY", "ONCE"].includes(frequency)
    ? frequency
    : "MONTHLY";
}

function dayFromDate(date: string): number {
  return Number.parseInt(date.slice(8, 10), 10) || 1;
}

function privacyFlags(): JsonRecord {
  return {
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function rowToExpense(row: DbRow, extra: JsonRecord = {}): JsonRecord {
  const paidAt = toText(row.paid_at);
  const status = apiStatusFromDb(row);
  const createdAt = toIso(row.created_at);
  const updatedAt = toIso(row.updated_at ?? row.created_at);
  const startDate =
    typeof extra.startDate === "string"
      ? extra.startDate
      : dateFromUnknown(row.created_at, createdAt.slice(0, 10));
  const endDate =
    typeof extra.endDate === "string" || extra.endDate === null
      ? extra.endDate
      : toText(row.cancelled_at)
        ? toIso(row.cancelled_at).slice(0, 10)
        : null;
  const record: JsonRecord = {
    expenseId: String(row.fixed_expense_id ?? ""),
    title: String(row.name ?? ""),
    category: apiCategoryFromDb(row.category),
    amountMinor: toNumber(row.amount),
    frequency: frequencyFromDb(row.recurrence_type),
    paymentDay: toNumber(row.expense_day),
    startDate,
    endDate,
    merchantName:
      typeof extra.merchantName === "string" || extra.merchantName === null
        ? extra.merchantName
        : null,
    memo:
      typeof extra.memo === "string" || extra.memo === null ? extra.memo : null,
    autoPay: typeof extra.autoPay === "boolean" ? extra.autoPay : true,
    affectsDailyBudget:
      typeof extra.affectsDailyBudget === "boolean"
        ? extra.affectsDailyBudget
        : true,
    status,
    paidTotalMinor: paidAt ? toNumber(row.amount) : 0,
    lastPaidAt: paidAt ? toIso(row.paid_at) : null,
    createdAt,
    updatedAt,
    ...privacyFlags(),
    ...extra,
  };
  delete record.userId;
  delete record.payrollPlanId;
  return record;
}

function isExpenseActiveInPeriod(
  expense: JsonRecord,
  startDate: string,
  endDate: string,
): boolean {
  const status = String(expense.status ?? "ACTIVE");
  if (status !== "ACTIVE") return false;
  const start = String(expense.startDate ?? startDate);
  const end = typeof expense.endDate === "string" ? expense.endDate : null;
  return start <= endDate && (!end || end >= startDate);
}

function nextDueDate(expense: JsonRecord, fromDate: string): string | null {
  const frequency = String(expense.frequency ?? "MONTHLY");
  const startDate = String(expense.startDate ?? fromDate);
  const endDate = typeof expense.endDate === "string" ? expense.endDate : null;
  const paymentDay =
    typeof expense.paymentDay === "number" ? expense.paymentDay : null;
  const candidate = startDate > fromDate ? startDate : fromDate;

  if (frequency === "ONCE") {
    return startDate >= fromDate && (!endDate || startDate <= endDate)
      ? startDate
      : null;
  }

  if (frequency === "WEEKLY") {
    const targetDay = paymentDay ?? 1;
    for (let offset = 0; offset < 8; offset += 1) {
      const test = addDays(candidate, offset);
      const day = new Date(`${test}T00:00:00.000Z`).getUTCDay() || 7;
      if (day === targetDay && (!endDate || test <= endDate)) return test;
    }
    return null;
  }

  const maxLoops = frequency === "YEARLY" ? 15 : 24;
  for (let step = 0; step < maxLoops; step += 1) {
    const base =
      frequency === "YEARLY"
        ? addMonths(candidate, step * 12)
        : addMonths(candidate, step);
    const date = new Date(`${base.slice(0, 7)}-01T00:00:00.000Z`);
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const due = `${base.slice(0, 7)}-${String(Math.min(paymentDay ?? 1, last)).padStart(2, "0")}`;
    if (due >= fromDate && due >= startDate && (!endDate || due <= endDate)) {
      return due;
    }
  }
  return null;
}

function occurrencesInPeriod(
  expense: JsonRecord,
  startDate: string,
  endDate: string,
): readonly string[] {
  if (!isExpenseActiveInPeriod(expense, startDate, endDate)) return [];
  const dates: string[] = [];
  let cursor = startDate;
  for (let index = 0; index < 370; index += 1) {
    const due = nextDueDate(expense, cursor);
    if (!due || due > endDate) break;
    dates.push(due);
    cursor = addDays(due, 1);
  }
  return dates;
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): FixedExpenseListResult<TItem> {
  return {
    items: rows.map(mapper),
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function queryText<TEnv>(
  repositoryQuery: FixedExpensesDbQuery<TEnv>,
  runtime: FixedExpenseRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<FixedExpensesDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

function userIdFromRuntime<TEnv>(
  runtime: FixedExpenseRouteRuntime<TEnv>,
): string {
  return assertUuid(runtime.principal.userId, "principal.userId");
}

function listWhere(
  input: JsonRecord,
  runtime: FixedExpenseRouteRuntime,
): { readonly sql: string; readonly params: DbValue[] } {
  const params: DbValue[] = [userIdFromRuntime(runtime)];
  const clauses = ["f.user_id = $1::uuid"];

  const category = toText(input.category);
  if (category) {
    params.push(dbCategoryFromApi(category.toUpperCase()));
    clauses.push(`f.category = $${params.length}`);
  }

  const status = toText(input.status)?.toUpperCase();
  if (status === "ACTIVE") {
    clauses.push("f.status in ('SCHEDULED', 'PAID')");
  } else if (status) {
    params.push(dbStatusFromApi(status));
    clauses.push(`f.status = $${params.length}`);
  }

  const q = toText(input.q);
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`f.name ilike $${params.length}`);
  }

  return { sql: clauses.join(" and "), params };
}

async function queryExpenseRows<TEnv>(
  repositoryQuery: FixedExpensesDbQuery<TEnv>,
  input: JsonRecord,
  page: PaginationInput,
  runtime: FixedExpenseRouteRuntime<TEnv>,
  operationName = "fixedExpenses.list",
): Promise<FixedExpensesDbQueryResult> {
  const where = listWhere(input, runtime);
  const params = [...where.params, page.limit, page.offset];
  return queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select f.*, count(*) over() as total_count
      from public.fixed_expenses f
      where ${where.sql}
      order by f.expense_day asc, f.created_at desc, f.fixed_expense_id desc
      limit $${params.length - 1}::int
      offset $${params.length}::int
    `,
    params,
  );
}

async function queryPeriodExpenses<TEnv>(
  repositoryQuery: FixedExpensesDbQuery<TEnv>,
  runtime: FixedExpenseRouteRuntime<TEnv>,
  operationName: string,
): Promise<readonly JsonRecord[]> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select *
      from public.fixed_expenses
      where user_id = $1::uuid
      order by expense_day asc, created_at desc, fixed_expense_id desc
    `,
    [userIdFromRuntime(runtime)],
  );
  return result.rows.map((row) => rowToExpense(row));
}

function paymentDayForInput(input: FixedExpenseCreateInput): number {
  return assertPaymentDay(
    input.paymentDay ?? dayFromDate(assertDate(input.startDate, "startDate")),
    "paymentDay",
  );
}

export function createNeonFixedExpensesRepository<TEnv = unknown>(
  options: NeonFixedExpensesRepositoryOptions<TEnv> = {},
): FixedExpenseRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-fixed-expenses-repository",
    async listExpenses(input, page, runtime) {
      const today = todayInSeoul(runtime.now);
      return listResult(
        (await queryExpenseRows(repositoryQuery, input, page, runtime)).rows,
        page,
        (row) => {
          const expense = rowToExpense(row);
          return {
            ...expense,
            nextDueDate: nextDueDate(expense, today),
            paymentCount: expense.lastPaidAt ? 1 : 0,
          };
        },
      );
    },
    async getExpense(expenseId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.get",
        `
          select *
          from public.fixed_expenses
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          limit 1
        `,
        [assertUuid(expenseId, "expenseId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) return null;
      const expense = rowToExpense(row);
      return {
        ...expense,
        nextDueDate: nextDueDate(expense, todayInSeoul(runtime.now)),
        payments: expense.lastPaidAt
          ? ([
              {
                expenseId: expense.expenseId,
                paidAmountMinor: expense.paidTotalMinor,
                paymentStatus: "PAID",
                paidAt: expense.lastPaidAt,
                ...privacyFlags(),
              },
            ] as JsonValue[])
          : [],
      };
    },
    async createExpense(input, runtime) {
      if (input.endDate && input.endDate < input.startDate) {
        throw new Error("endDate must not be earlier than startDate.");
      }
      const paymentDay = paymentDayForInput(input);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.create",
        `
          with selected_plan as (
            select payroll_plan_id
            from public.payroll_plans
            where user_id = $1::uuid
              and status = 'ACTIVE'
            order by year_month desc, updated_at desc, payroll_plan_id desc
            limit 1
          )
          insert into public.fixed_expenses (
            user_id,
            payroll_plan_id,
            expense_day,
            category,
            name,
            amount,
            recurrence_type,
            status,
            paid_at
          )
          select
            $1::uuid,
            selected_plan.payroll_plan_id,
            $2::smallint,
            $3,
            $4,
            $5::bigint,
            $6,
            'SCHEDULED',
            null
          from selected_plan
          returning *
        `,
        [
          userIdFromRuntime(runtime),
          paymentDay,
          dbCategoryFromApi(input.category),
          input.title,
          assertKrw(input.amountMinor, "amountMinor"),
          input.frequency,
        ],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(
          "Failed to create fixed expense; active payroll plan required.",
        );
      }
      const expense = rowToExpense(row, {
        startDate: assertDate(input.startDate, "startDate"),
        endDate: input.endDate,
        merchantName: input.merchantName,
        memo: input.memo,
        autoPay: input.autoPay,
        affectsDailyBudget: input.affectsDailyBudget,
      });
      return {
        ...expense,
        nextDueDate: nextDueDate(expense, todayInSeoul(runtime.now)),
      };
    },
    async updateExpense(expenseId, input, runtime) {
      if (input.endDate && input.startDate && input.endDate < input.startDate) {
        throw new Error("endDate must not be earlier than startDate.");
      }
      const dbStatus =
        input.status === undefined ? null : dbStatusFromApi(input.status);
      const cancelledAt =
        input.status === "ENDED" || input.status === "DELETED"
          ? (input.endDate ?? todayInSeoul(runtime.now))
          : null;
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.update",
        `
          update public.fixed_expenses
          set name = coalesce($3, name),
              category = coalesce($4, category),
              amount = coalesce($5::bigint, amount),
              recurrence_type = coalesce($6, recurrence_type),
              expense_day = coalesce($7::smallint, expense_day),
              status = coalesce($8, status),
              paid_at = case
                when coalesce($8, status) = 'PAID' then paid_at
                else null
              end,
              cancelled_at = case
                when coalesce($8, status) = 'CANCELLED' then coalesce($9::timestamptz, now())
                when coalesce($8, status) <> 'CANCELLED' then null
                else cancelled_at
              end,
              updated_at = now()
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(expenseId, "expenseId"),
          userIdFromRuntime(runtime),
          input.title ?? null,
          input.category === undefined
            ? null
            : dbCategoryFromApi(input.category),
          input.amountMinor === undefined
            ? null
            : assertKrw(input.amountMinor, "amountMinor"),
          input.frequency ?? null,
          input.paymentDay === undefined || input.paymentDay === null
            ? null
            : assertPaymentDay(input.paymentDay, "paymentDay"),
          dbStatus,
          cancelledAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Fixed expense not found.");
      const expense = rowToExpense(row, {
        ...(input.startDate !== undefined
          ? { startDate: assertDate(input.startDate, "startDate") }
          : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.merchantName !== undefined
          ? { merchantName: input.merchantName }
          : {}),
        ...(input.memo !== undefined ? { memo: input.memo } : {}),
        ...(input.autoPay !== undefined ? { autoPay: input.autoPay } : {}),
        ...(input.affectsDailyBudget !== undefined
          ? { affectsDailyBudget: input.affectsDailyBudget }
          : {}),
      });
      return {
        ...expense,
        nextDueDate: nextDueDate(expense, todayInSeoul(runtime.now)),
      };
    },
    async deleteExpense(expenseId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.delete",
        `
          update public.fixed_expenses
          set status = 'CANCELLED',
              paid_at = null,
              cancelled_at = coalesce(cancelled_at, now()),
              updated_at = now()
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          returning fixed_expense_id
        `,
        [assertUuid(expenseId, "expenseId"), userIdFromRuntime(runtime)],
      );
      if (!result.rows[0]) throw new Error("Fixed expense not found.");
      return { expenseId, status: "DELETED", ...privacyFlags() };
    },
    async pauseExpense(expenseId, reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.pause",
        `
          update public.fixed_expenses
          set status = 'SKIPPED',
              paid_at = null,
              updated_at = now()
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [assertUuid(expenseId, "expenseId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Fixed expense not found.");
      return rowToExpense(row, { pauseReason: reason });
    },
    async resumeExpense(expenseId, reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.resume",
        `
          update public.fixed_expenses
          set status = 'SCHEDULED',
              paid_at = null,
              cancelled_at = null,
              updated_at = now()
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [assertUuid(expenseId, "expenseId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Fixed expense not found.");
      const expense = rowToExpense(row, { resumeReason: reason });
      return {
        ...expense,
        nextDueDate: nextDueDate(expense, todayInSeoul(runtime.now)),
      };
    },
    async endExpense(expenseId, endDate, reason, runtime) {
      const normalizedEndDate = assertDate(endDate, "endDate");
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.end",
        `
          update public.fixed_expenses
          set status = 'CANCELLED',
              paid_at = null,
              cancelled_at = $3::timestamptz,
              updated_at = now()
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(expenseId, "expenseId"),
          userIdFromRuntime(runtime),
          normalizedEndDate,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Fixed expense not found.");
      return rowToExpense(row, {
        status: "ENDED",
        endDate: normalizedEndDate,
        endReason: reason,
      });
    },
    async recordPayment(expenseId, input, runtime) {
      assertKrwOrZero(input.paidAmountMinor, "paidAmountMinor");
      const dbStatus = dbStatusFromPaymentStatus(input.paymentStatus);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "fixedExpenses.recordPayment",
        `
          update public.fixed_expenses
          set amount = case
                when $3::bigint > 0 then $3::bigint
                else amount
              end,
              status = $4,
              paid_at = case
                when $4 = 'PAID' then $5::timestamptz
                else null
              end,
              cancelled_at = null,
              updated_at = now()
          where fixed_expense_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(expenseId, "expenseId"),
          userIdFromRuntime(runtime),
          input.paidAmountMinor,
          dbStatus,
          input.paidAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Fixed expense not found.");
      const expense = rowToExpense(row);
      return {
        payment: {
          expenseId,
          paidAmountMinor: input.paidAmountMinor,
          paidAt: input.paidAt,
          paymentStatus: input.paymentStatus,
          memo: input.memo,
          ...privacyFlags(),
        },
        expense,
        idempotentReplay: false,
        ...privacyFlags(),
      };
    },
    async upcoming(input, runtime) {
      const fromDate =
        typeof input.fromDate === "string"
          ? assertDate(input.fromDate, "fromDate")
          : todayInSeoul(runtime.now);
      const toDate =
        typeof input.toDate === "string"
          ? assertDate(input.toDate, "toDate")
          : addDays(fromDate, 31);
      daysInclusive(fromDate, toDate);
      const expenses = await queryPeriodExpenses(
        repositoryQuery,
        runtime,
        "fixedExpenses.upcoming",
      );
      const items = expenses.flatMap((expense) =>
        occurrencesInPeriod(expense, fromDate, toDate).map((dueDate) => ({
          expenseId: String(expense.expenseId),
          title: String(expense.title),
          category: String(expense.category),
          dueDate,
          amountMinor:
            typeof expense.amountMinor === "number" ? expense.amountMinor : 0,
          autoPay: expense.autoPay === true,
          status: "SCHEDULED",
        })),
      );
      return {
        fromDate,
        toDate,
        totalAmountMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        count: items.length,
        items: items as unknown as JsonValue,
        ...privacyFlags(),
      };
    },
    async summary(input, runtime) {
      const startDate =
        typeof input.startDate === "string"
          ? assertDate(input.startDate, "startDate")
          : todayInSeoul(runtime.now).slice(0, 8).concat("01");
      const endDate =
        typeof input.endDate === "string"
          ? assertDate(input.endDate, "endDate")
          : addMonths(startDate, 1);
      daysInclusive(startDate, endDate);
      const expenses = await queryPeriodExpenses(
        repositoryQuery,
        runtime,
        "fixedExpenses.summary",
      );
      const active = expenses.filter((expense) =>
        isExpenseActiveInPeriod(expense, startDate, endDate),
      );
      const scheduled = active.flatMap((expense) =>
        occurrencesInPeriod(expense, startDate, endDate).map((dueDate) => ({
          expense,
          dueDate,
        })),
      );
      const byCategory = active.reduce<Record<string, number>>(
        (acc, expense) => {
          const category = String(expense.category ?? "ETC");
          const amount =
            occurrencesInPeriod(expense, startDate, endDate).length *
            (typeof expense.amountMinor === "number" ? expense.amountMinor : 0);
          acc[category] = (acc[category] ?? 0) + amount;
          return acc;
        },
        {},
      );
      const scheduledTotalMinor = scheduled.reduce(
        (sum, item) =>
          sum +
          (typeof item.expense.amountMinor === "number"
            ? item.expense.amountMinor
            : 0),
        0,
      );
      return {
        startDate,
        endDate,
        activeCount: active.length,
        scheduledPaymentCount: scheduled.length,
        scheduledTotalMinor,
        paidTotalMinor: active.reduce(
          (sum, expense) =>
            sum +
            (typeof expense.paidTotalMinor === "number"
              ? expense.paidTotalMinor
              : 0),
          0,
        ),
        monthlyEquivalentMinor: scheduledTotalMinor,
        byCategory: Object.fromEntries(
          Object.entries(byCategory).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
        affectsDailyBudgetTotalMinor: active
          .filter((expense) => expense.affectsDailyBudget !== false)
          .reduce(
            (sum, expense) =>
              sum +
              occurrencesInPeriod(expense, startDate, endDate).length *
                (typeof expense.amountMinor === "number"
                  ? expense.amountMinor
                  : 0),
            0,
          ),
        ...privacyFlags(),
      };
    },
    async calendar(input, runtime) {
      const month =
        typeof input.month === "string" && /^\d{4}-\d{2}$/.test(input.month)
          ? input.month
          : todayInSeoul(runtime.now).slice(0, 7);
      const startDate = `${month}-01`;
      const endDate = endOfMonth(month);
      const expenses = await queryPeriodExpenses(
        repositoryQuery,
        runtime,
        "fixedExpenses.calendar",
      );
      const items = expenses
        .flatMap((expense) =>
          occurrencesInPeriod(expense, startDate, endDate).map((dueDate) => ({
            date: dueDate,
            expenseId: String(expense.expenseId),
            title: String(expense.title),
            category: String(expense.category),
            amountMinor:
              typeof expense.amountMinor === "number" ? expense.amountMinor : 0,
            autoPay: expense.autoPay === true,
          })),
        )
        .sort((left, right) => left.date.localeCompare(right.date));
      return {
        month,
        startDate,
        endDate,
        totalAmountMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        items: items as unknown as JsonValue,
        ...privacyFlags(),
      };
    },
    async impact(input: FixedExpenseImpactInput, runtime) {
      const expenses = await queryPeriodExpenses(
        repositoryQuery,
        runtime,
        "fixedExpenses.impact",
      );
      const active = expenses.filter(
        (expense) =>
          expense.affectsDailyBudget !== false &&
          isExpenseActiveInPeriod(
            expense,
            input.periodStartDate,
            input.periodEndDate,
          ),
      );
      const fixedExpenseTotalMinor = active.reduce(
        (sum, expense) =>
          sum +
          occurrencesInPeriod(
            expense,
            input.periodStartDate,
            input.periodEndDate,
          ).length *
            (typeof expense.amountMinor === "number" ? expense.amountMinor : 0),
        0,
      );
      const dayCount = daysInclusive(
        input.periodStartDate,
        input.periodEndDate,
      );
      const availableForDailyBudgetMinor = Math.max(
        0,
        input.payrollAmountMinor -
          fixedExpenseTotalMinor -
          input.fixedSavingsAmountMinor -
          input.variableExpenseReserveMinor,
      );
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        dayCount,
        payrollAmountMinor: input.payrollAmountMinor,
        fixedExpenseTotalMinor,
        fixedSavingsAmountMinor: input.fixedSavingsAmountMinor,
        variableExpenseReserveMinor: input.variableExpenseReserveMinor,
        availableForDailyBudgetMinor,
        recommendedDailyBudgetMinor:
          dayCount > 0
            ? Math.floor(availableForDailyBudgetMinor / dayCount)
            : 0,
        expenseCount: active.length,
        ...privacyFlags(),
      };
    },
  };
}
