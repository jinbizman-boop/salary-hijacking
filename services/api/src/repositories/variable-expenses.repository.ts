import type {
  JsonRecord,
  JsonValue,
  PaginationInput,
  VariableExpenseCreateInput,
  VariableExpenseRefundInput,
  VariableExpensesRepository,
  VariableExpensesRouteRuntime,
  VariableExpenseVoidInput,
} from "../routes/variable-expenses.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface VariableExpensesDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface VariableExpensesDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type VariableExpensesDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: VariableExpensesDbQueryOptions<TEnv>,
) => Promise<VariableExpensesDbQueryResult>;

export interface NeonVariableExpensesRepositoryOptions<TEnv = unknown> {
  readonly query?: VariableExpensesDbQuery<TEnv>;
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
  MEAL: "FOOD",
  GROCERIES: "FOOD",
  TRANSPORT: "TRANSPORT",
  CAFE: "CAFE",
  SHOPPING: "SHOPPING",
  HEALTH: "HEALTHCARE",
  CONTENT: "CULTURE",
  EDUCATION: "EDUCATION",
  FAMILY: "LIVING",
  GIFT: "GIFT",
  TRAVEL: "TRAVEL",
  ETC: "ETC",
});

const apiCategoryByDbCategory = Object.freeze({
  FOOD: "MEAL",
  TRANSPORT: "TRANSPORT",
  CAFE: "CAFE",
  SHOPPING: "SHOPPING",
  CULTURE: "CONTENT",
  HEALTHCARE: "HEALTH",
  EDUCATION: "EDUCATION",
  LIVING: "ETC",
  GIFT: "GIFT",
  TRAVEL: "TRAVEL",
  ETC: "ETC",
});

const dbStatusByApiStatus = Object.freeze({
  POSTED: "ACTIVE",
  REFUNDED: "CANCELLED",
  VOIDED: "CANCELLED",
  DELETED: "DELETED",
});

const apiStatusByDbStatus = Object.freeze({
  ACTIVE: "POSTED",
  CANCELLED: "VOIDED",
  DELETED: "DELETED",
});

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonVariableExpensesRepository<TEnv>(
  env: TEnv,
): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for variable expenses repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: VariableExpensesDbQueryOptions<TEnv>,
): Promise<VariableExpensesDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed variable expenses.`);
  }
  return value;
}

function assertKrw(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive safe integer KRW amount.`);
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

function seoulDateFromIso(iso: string): string {
  return todayInSeoul(new Date(iso));
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function apiCategoryFromDb(value: unknown): string {
  const category = String(value ?? "ETC").toUpperCase();
  return (
    apiCategoryByDbCategory[category as keyof typeof apiCategoryByDbCategory] ??
    "ETC"
  );
}

function dbCategoryFromApi(value: string): string {
  return (
    dbCategoryByApiCategory[value as keyof typeof dbCategoryByApiCategory] ??
    "ETC"
  );
}

function apiStatusFromDb(value: unknown): string {
  const status = String(value ?? "ACTIVE").toUpperCase();
  return (
    apiStatusByDbStatus[status as keyof typeof apiStatusByDbStatus] ?? "POSTED"
  );
}

function dbStatusFromApi(value: string): string {
  return (
    dbStatusByApiStatus[value as keyof typeof dbStatusByApiStatus] ?? value
  );
}

function rowToExpense(row: DbRow, extra: JsonRecord = {}): JsonRecord {
  const status = apiStatusFromDb(row.status);
  const amountMinor = toNumber(row.amount);
  const refundAmountMinor = Math.min(
    amountMinor,
    Math.max(0, toNumber(row.refund_amount)),
  );
  const title =
    toText(row.merchant_name) ??
    toText(row.memo) ??
    apiCategoryFromDb(row.category);
  const record: JsonRecord = {
    expenseId: String(row.variable_expense_id ?? ""),
    dailyBudgetId: String(row.daily_budget_id ?? ""),
    amountMinor,
    category: apiCategoryFromDb(row.category),
    title,
    spentAt: toIso(row.spent_at),
    paymentMethod: "ETC",
    merchantName: toText(row.merchant_name),
    memo: toText(row.memo),
    tags: [],
    receiptAttachmentId: null,
    source: "MANUAL",
    idempotencyKey: toText(row.idempotency_key),
    refundAmountMinor: status === "POSTED" ? refundAmountMinor : amountMinor,
    status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    netAmountMinor:
      status === "POSTED" ? Math.max(0, amountMinor - refundAmountMinor) : 0,
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
    ...extra,
  };
  delete record.userId;
  return record;
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
  const items = rows.map((row) => rowToExpense(row) as TItem);
  return {
    items,
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function queryText<TEnv>(
  repositoryQuery: VariableExpensesDbQuery<TEnv>,
  runtime: VariableExpensesRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<VariableExpensesDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

async function findByIdempotency<TEnv>(
  repositoryQuery: VariableExpensesDbQuery<TEnv>,
  input: VariableExpenseCreateInput | VariableExpenseRefundInput,
  runtime: VariableExpensesRouteRuntime<TEnv>,
): Promise<JsonRecord | null> {
  if (!input.idempotencyKey) return null;
  const result = await queryText(
    repositoryQuery,
    runtime,
    "variableExpenses.findByIdempotency",
    `
      select *
      from public.variable_expenses
      where user_id = $1::uuid
        and idempotency_key = $2
        and status <> 'DELETED'
      limit 1
    `,
    [
      assertUuid(runtime.principal.userId, "principal.userId"),
      input.idempotencyKey,
    ],
  );
  return result.rows[0] ? rowToExpense(result.rows[0]) : null;
}

async function ensureDailyBudget<TEnv>(
  repositoryQuery: VariableExpensesDbQuery<TEnv>,
  runtime: VariableExpensesRouteRuntime<TEnv>,
  spentAt: string,
): Promise<string> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    "variableExpenses.ensureDailyBudget",
    `
      insert into public.daily_budgets (
        user_id,
        budget_date,
        daily_limit_amount,
        used_amount,
        remaining_amount,
        over_amount,
        status,
        calculated_at
      )
      values ($1::uuid, $2::date, 0, 0, 0, 0, 'OPEN', now())
      on conflict (user_id, budget_date)
      do update set budget_date = excluded.budget_date
      returning daily_budget_id
    `,
    [
      assertUuid(runtime.principal.userId, "principal.userId"),
      seoulDateFromIso(spentAt),
    ],
  );
  const dailyBudgetId = result.rows[0]?.daily_budget_id;
  if (typeof dailyBudgetId !== "string") {
    throw new Error("Failed to resolve daily budget for variable expense.");
  }
  return dailyBudgetId;
}

function listWhere(
  input: JsonRecord,
  runtime: VariableExpensesRouteRuntime,
): { readonly sql: string; readonly params: DbValue[] } {
  const params: DbValue[] = [
    assertUuid(runtime.principal.userId, "principal.userId"),
  ];
  const clauses = ["user_id = $1::uuid", "status <> 'DELETED'"];

  const startDate = toText(input.startDate);
  if (startDate) {
    params.push(startDate);
    clauses.push(
      `(spent_at at time zone 'Asia/Seoul')::date >= $${params.length}::date`,
    );
  }

  const endDate = toText(input.endDate);
  if (endDate) {
    params.push(endDate);
    clauses.push(
      `(spent_at at time zone 'Asia/Seoul')::date <= $${params.length}::date`,
    );
  }

  const category = toText(input.category);
  if (category) {
    params.push(dbCategoryFromApi(category.toUpperCase()));
    clauses.push(`category = $${params.length}`);
  }

  const status = toText(input.status);
  if (status) {
    params.push(dbStatusFromApi(status.toUpperCase()));
    clauses.push(`status = $${params.length}`);
  }

  const q = toText(input.q);
  if (q) {
    params.push(`%${q}%`);
    clauses.push(
      `(merchant_name ilike $${params.length} or memo ilike $${params.length})`,
    );
  }

  return { sql: clauses.join(" and "), params };
}

async function queryExpenseRows<TEnv>(
  repositoryQuery: VariableExpensesDbQuery<TEnv>,
  input: JsonRecord,
  page: PaginationInput,
  runtime: VariableExpensesRouteRuntime<TEnv>,
  operationName = "variableExpenses.list",
): Promise<VariableExpensesDbQueryResult> {
  const where = listWhere(input, runtime);
  const params = [...where.params, page.limit, page.offset];
  return queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select *, count(*) over() as total_count
      from public.variable_expenses
      where ${where.sql}
      order by spent_at desc, variable_expense_id desc
      limit $${params.length - 1}::int
      offset $${params.length}::int
    `,
    params,
  );
}

export function createNeonVariableExpensesRepository<TEnv = unknown>(
  options: NeonVariableExpensesRepositoryOptions<TEnv> = {},
): VariableExpensesRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-variable-expenses-repository",
    async list(input, page, runtime) {
      return listResult(
        (await queryExpenseRows(repositoryQuery, input, page, runtime)).rows,
        page,
      );
    },
    async recent(input, page, runtime) {
      const rawDays = toText(input.days);
      const days = Math.max(
        1,
        Math.min(365, rawDays ? Number.parseInt(rawDays, 10) || 7 : 7),
      );
      const endDate = todayInSeoul(runtime.now);
      const startDate = addDays(endDate, -days);
      return listResult(
        (
          await queryExpenseRows(
            repositoryQuery,
            { ...input, startDate, endDate },
            page,
            runtime,
            "variableExpenses.recent",
          )
        ).rows,
        page,
      );
    },
    async get(expenseId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.get",
        `
          select *
          from public.variable_expenses
          where variable_expense_id = $1::uuid
            and user_id = $2::uuid
            and status <> 'DELETED'
          limit 1
        `,
        [
          assertUuid(expenseId, "expenseId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      return result.rows[0] ? rowToExpense(result.rows[0]) : null;
    },
    async create(input, runtime) {
      const existing = await findByIdempotency(repositoryQuery, input, runtime);
      if (existing) return { ...existing, idempotentReplay: true };

      const dailyBudgetId = input.dailyBudgetId
        ? assertUuid(input.dailyBudgetId, "dailyBudgetId")
        : await ensureDailyBudget(repositoryQuery, runtime, input.spentAt);

      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.create",
        `
          insert into public.variable_expenses (
            user_id,
            daily_budget_id,
            spent_at,
            category,
            merchant_name,
            memo,
            amount,
            status,
            idempotency_key
          )
          values ($1::uuid, $2::uuid, $3::timestamptz, $4, $5, $6, $7::bigint, 'ACTIVE', $8)
          returning *
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          dailyBudgetId,
          input.spentAt,
          dbCategoryFromApi(input.category),
          input.merchantName ?? input.title,
          input.memo,
          assertKrw(input.amountMinor, "amountMinor"),
          input.idempotencyKey,
        ],
      );
      if (!result.rows[0])
        throw new Error("Failed to create variable expense.");
      return rowToExpense(result.rows[0]);
    },
    async update(expenseId, input, runtime) {
      const fields: string[] = ["updated_at = now()"];
      const params: DbValue[] = [
        assertUuid(expenseId, "expenseId"),
        assertUuid(runtime.principal.userId, "principal.userId"),
      ];
      const add = (sql: string, value: DbValue): void => {
        params.push(value);
        fields.push(`${sql} = $${params.length}`);
      };
      if (input.amountMinor !== undefined)
        add("amount", assertKrw(input.amountMinor, "amountMinor"));
      if (input.category !== undefined)
        add("category", dbCategoryFromApi(input.category));
      if (input.title !== undefined && input.merchantName === undefined)
        add("merchant_name", input.title);
      if (input.spentAt !== undefined) add("spent_at", input.spentAt);
      if (input.merchantName !== undefined)
        add("merchant_name", input.merchantName);
      if (input.memo !== undefined) add("memo", input.memo);
      if (input.dailyBudgetId !== undefined && input.dailyBudgetId !== null)
        add(
          "daily_budget_id",
          assertUuid(input.dailyBudgetId, "dailyBudgetId"),
        );

      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.update",
        `
          update public.variable_expenses
          set ${fields.join(", ")}
          where variable_expense_id = $1::uuid
            and user_id = $2::uuid
            and status = 'ACTIVE'
          returning *
        `,
        params,
      );
      if (!result.rows[0]) throw new Error("Variable expense not found.");
      return rowToExpense(result.rows[0]);
    },
    async delete(expenseId, _reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.delete",
        `
          update public.variable_expenses
          set status = 'DELETED', deleted_at = now(), updated_at = now()
          where variable_expense_id = $1::uuid
            and user_id = $2::uuid
            and status <> 'DELETED'
          returning *
        `,
        [
          assertUuid(expenseId, "expenseId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      if (!result.rows[0]) throw new Error("Variable expense not found.");
      return rowToExpense(result.rows[0]);
    },
    async refund(expenseId, input, runtime) {
      const existing = await findByIdempotency(repositoryQuery, input, runtime);
      if (existing)
        return {
          refund: {
            expenseId,
            refundAmountMinor: input.refundAmountMinor,
            refundedAt: input.refundedAt,
            serverAuthority: true,
          },
          expense: existing,
          idempotentReplay: true,
        };

      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.refund",
        `
          update public.variable_expenses
          set
            refund_amount = least(amount, refund_amount + $3::bigint),
            last_refund_idempotency_key = coalesce($4, last_refund_idempotency_key),
            status = case
              when least(amount, refund_amount + $3::bigint) >= amount then 'CANCELLED'
              else 'ACTIVE'
            end,
            cancelled_at = case
              when least(amount, refund_amount + $3::bigint) >= amount then now()
              else cancelled_at
            end,
            updated_at = now()
          where variable_expense_id = $1::uuid
            and user_id = $2::uuid
            and status = 'ACTIVE'
            and refund_amount + $3::bigint <= amount
          returning *
        `,
        [
          assertUuid(expenseId, "expenseId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
          assertKrw(input.refundAmountMinor, "refundAmountMinor"),
          input.idempotencyKey,
        ],
      );
      if (!result.rows[0]) throw new Error("Variable expense not found.");
      return {
        refund: {
          expenseId,
          refundAmountMinor: input.refundAmountMinor,
          refundedAt: input.refundedAt,
          reason: input.reason,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
        expense: rowToExpense(result.rows[0]),
        idempotentReplay: false,
      };
    },
    async void(expenseId, input: VariableExpenseVoidInput, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.void",
        `
          update public.variable_expenses
          set status = 'CANCELLED', cancelled_at = now(), updated_at = now()
          where variable_expense_id = $1::uuid
            and user_id = $2::uuid
            and status = 'ACTIVE'
          returning *
        `,
        [
          assertUuid(expenseId, "expenseId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      if (!result.rows[0]) throw new Error("Variable expense not found.");
      return rowToExpense(result.rows[0], {
        voidReasonRecorded: Boolean(input.reason),
      });
    },
    async today(runtime) {
      const today = todayInSeoul(runtime.now);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.today",
        `
          select
            daily_budget_id,
            budget_date,
            daily_limit_amount,
            used_amount,
            remaining_amount,
            over_amount,
            status,
            calculated_at
          from public.daily_budgets
          where user_id = $1::uuid
            and budget_date = $2::date
          limit 1
        `,
        [assertUuid(runtime.principal.userId, "principal.userId"), today],
      );
      const row = result.rows[0];
      return {
        date: today,
        dailyBudgetId: row ? String(row.daily_budget_id ?? "") : null,
        dailyLimitAmountMinor: toNumber(row?.daily_limit_amount),
        usedAmountMinor: toNumber(row?.used_amount),
        remainingAmountMinor: toNumber(row?.remaining_amount),
        overAmountMinor: toNumber(row?.over_amount),
        status: row ? String(row.status ?? "OPEN") : "OPEN",
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async summary(input, runtime) {
      const endDate = toText(input.endDate) ?? todayInSeoul(runtime.now);
      const startDate = toText(input.startDate) ?? addDays(endDate, -30);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.summary",
        `
          select
            count(*)::int as count,
            coalesce(sum(amount), 0)::bigint as total_amount
          from public.variable_expenses
          where user_id = $1::uuid
            and status = 'ACTIVE'
            and (spent_at at time zone 'Asia/Seoul')::date between $2::date and $3::date
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          startDate,
          endDate,
        ],
      );
      const row = result.rows[0] ?? {};
      return {
        startDate,
        endDate,
        count: toNumber(row.count),
        totalAmountMinor: toNumber(row.total_amount),
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async calendar(input, runtime) {
      const endDate = toText(input.endDate) ?? todayInSeoul(runtime.now);
      const startDate = toText(input.startDate) ?? addDays(endDate, -30);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.calendar",
        `
          select
            (spent_at at time zone 'Asia/Seoul')::date::text as date,
            count(*)::int as count,
            coalesce(sum(amount), 0)::bigint as amount_minor
          from public.variable_expenses
          where user_id = $1::uuid
            and status = 'ACTIVE'
            and (spent_at at time zone 'Asia/Seoul')::date between $2::date and $3::date
          group by date
          order by date asc
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          startDate,
          endDate,
        ],
      );
      return {
        startDate,
        endDate,
        days: result.rows.map((row) => ({
          date: String(row.date ?? ""),
          count: toNumber(row.count),
          amountMinor: toNumber(row.amount_minor),
        })) as unknown as JsonValue,
        serverAuthority: true,
      };
    },
    async categoryBreakdown(input, runtime) {
      const endDate = toText(input.endDate) ?? todayInSeoul(runtime.now);
      const startDate = toText(input.startDate) ?? addDays(endDate, -30);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "variableExpenses.categoryBreakdown",
        `
          select
            category,
            count(*)::int as count,
            coalesce(sum(amount), 0)::bigint as amount_minor
          from public.variable_expenses
          where user_id = $1::uuid
            and status = 'ACTIVE'
            and (spent_at at time zone 'Asia/Seoul')::date between $2::date and $3::date
          group by category
          order by amount_minor desc
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          startDate,
          endDate,
        ],
      );
      const items = result.rows.map((row) => ({
        category: apiCategoryFromDb(row.category),
        count: toNumber(row.count),
        amountMinor: toNumber(row.amount_minor),
      }));
      return {
        startDate,
        endDate,
        items: items as unknown as JsonValue,
        totalAmountMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        serverAuthority: true,
      };
    },
    async budgetImpact(input, runtime) {
      const result = await this.summary(
        {
          startDate: input.periodStartDate,
          endDate: input.periodEndDate,
        },
        runtime,
      );
      const summary = jsonRecord(result);
      const actualVariableExpenseTotalMinor = toNumber(
        summary.totalAmountMinor,
      );
      const dayCount = daysInclusive(
        input.periodStartDate,
        input.periodEndDate,
      );
      const dailyBudgetRemainingMinor =
        input.dailyBudgetTotalMinor - actualVariableExpenseTotalMinor;
      const reserveRemainingMinor =
        input.plannedVariableExpenseReserveMinor -
        actualVariableExpenseTotalMinor;
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        dayCount,
        dailyBudgetTotalMinor: input.dailyBudgetTotalMinor,
        plannedVariableExpenseReserveMinor:
          input.plannedVariableExpenseReserveMinor,
        actualVariableExpenseTotalMinor,
        fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
        fixedSavingsTotalMinor: input.fixedSavingsTotalMinor,
        dailyBudgetRemainingMinor,
        reserveRemainingMinor,
        overDailyBudget: dailyBudgetRemainingMinor < 0,
        overVariableReserve: reserveRemainingMinor < 0,
        averageDailyVariableExpenseMinor: Math.round(
          actualVariableExpenseTotalMinor / dayCount,
        ),
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
  };
}
