import type {
  DailyBudgetAdjustmentInput,
  DailyBudgetCreateInput,
  DailyBudgetListResult,
  DailyBudgetRepository,
  DailyBudgetRecalculateInput,
  DailyBudgetRouteRuntime,
  DailyBudgetSpendInput,
  DailyBudgetStatus,
  DailyBudgetUpdateInput,
  JsonRecord,
  JsonValue,
  PaginationInput,
} from "../routes/daily-budgets.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface DailyBudgetsDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface DailyBudgetsDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type DailyBudgetsDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: DailyBudgetsDbQueryOptions<TEnv>,
) => Promise<DailyBudgetsDbQueryResult>;

export interface NeonDailyBudgetsRepositoryOptions<TEnv = unknown> {
  readonly query?: DailyBudgetsDbQuery<TEnv>;
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
  TRANSPORT: "TRANSPORT",
  CAFE: "CAFE",
  SHOPPING: "SHOPPING",
  HEALTH: "HEALTHCARE",
  CONTENT: "CULTURE",
  ETC: "ETC",
});

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonDailyBudgetsRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for daily budgets repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: DailyBudgetsDbQueryOptions<TEnv>,
): Promise<DailyBudgetsDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed daily budgets.`);
  }
  return value;
}

function assertKrw(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer KRW amount.`);
  }
  return value;
}

function assertPositiveKrw(value: number, field: string): number {
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

function dateText(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return "1970-01-01";
}

function assertDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be YYYY-MM-DD for daily budgets.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${field} must be a valid calendar date.`);
  }
  return value;
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

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (end < start) {
    throw new Error("periodEndDate must not be before periodStartDate.");
  }
  return Math.floor((end - start) / 86_400_000) + 1;
}

function endOfMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function dbCategoryFromApi(value: string): string {
  return (
    dbCategoryByApiCategory[value as keyof typeof dbCategoryByApiCategory] ??
    "ETC"
  );
}

function apiStatusFromRow(row: DbRow, now: Date): DailyBudgetStatus {
  const dbStatus = String(row.status ?? "OPEN").toUpperCase();
  const plannedAmountMinor = toNumber(row.daily_limit_amount);
  const spentAmountMinor = toNumber(row.used_amount);
  if (dbStatus === "CLOSED") return "CLOSED";
  if (dbStatus === "OVER" || spentAmountMinor > plannedAmountMinor)
    return "OVERSPENT";
  const budgetDate = dateText(row.budget_date);
  const today = todayInSeoul(now);
  if (budgetDate < today) return "CLOSED";
  if (budgetDate === today) return "ACTIVE";
  return "PLANNED";
}

function dbStatusFromApi(value: DailyBudgetStatus): string {
  if (value === "OVERSPENT") return "OVER";
  if (value === "CLOSED" || value === "DELETED") return "CLOSED";
  return "OPEN";
}

function rowToBudget(
  row: DbRow,
  now: Date,
  extra: JsonRecord = {},
): JsonRecord {
  const plannedAmountMinor = toNumber(row.daily_limit_amount);
  const spentAmountMinor = toNumber(row.used_amount);
  const remainingAmountMinor = plannedAmountMinor - spentAmountMinor;
  const overAmountMinor = Math.max(0, spentAmountMinor - plannedAmountMinor);
  const record: JsonRecord = {
    budgetId: String(row.daily_budget_id ?? ""),
    budgetDate: dateText(row.budget_date),
    plannedAmountMinor,
    spentAmountMinor,
    adjustmentAmountMinor: 0,
    availableAmountMinor: plannedAmountMinor,
    remainingAmountMinor,
    storageRemainingAmountMinor: toNumber(row.remaining_amount),
    overAmountMinor: Math.max(overAmountMinor, toNumber(row.over_amount)),
    usageRate:
      plannedAmountMinor > 0
        ? Math.round((spentAmountMinor / plannedAmountMinor) * 10_000) / 10_000
        : 0,
    source: "SYSTEM",
    memo: null,
    status: apiStatusFromRow(row, now),
    calculatedAt: row.calculated_at ? toIso(row.calculated_at) : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    closedAt: row.closed_at ? toIso(row.closed_at) : null,
    serverAuthority: true,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
    ...extra,
  };
  delete record.userId;
  return record;
}

function rowToSpend(row: DbRow): JsonRecord {
  const record: JsonRecord = {
    spendId: String(row.variable_expense_id ?? ""),
    budgetId: String(row.daily_budget_id ?? ""),
    amountMinor: toNumber(row.amount),
    category: String(row.category ?? "ETC"),
    memo: toText(row.memo),
    spentAt: toIso(row.spent_at),
    idempotencyKey: toText(row.idempotency_key),
    createdAt: toIso(row.created_at),
    serverAuthority: true,
    financialRawDataExposed: false,
  };
  delete record.userId;
  return record;
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  now: Date,
): DailyBudgetListResult<TItem> {
  return {
    items: rows.map((row) => rowToBudget(row, now) as TItem),
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function queryText<TEnv>(
  repositoryQuery: DailyBudgetsDbQuery<TEnv>,
  runtime: DailyBudgetRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<DailyBudgetsDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

function dateRangeFromInput(
  input: JsonRecord,
  runtime: DailyBudgetRouteRuntime,
): { readonly startDate: string; readonly endDate: string } {
  const endDate =
    typeof input.endDate === "string"
      ? assertDate(input.endDate, "endDate")
      : todayInSeoul(runtime.now);
  const startDate =
    typeof input.startDate === "string"
      ? assertDate(input.startDate, "startDate")
      : addDays(endDate, -30);
  daysInclusive(startDate, endDate);
  return { startDate, endDate };
}

async function getBudgetRow<TEnv>(
  repositoryQuery: DailyBudgetsDbQuery<TEnv>,
  budgetId: string,
  runtime: DailyBudgetRouteRuntime<TEnv>,
  operationName = "dailyBudgets.get",
): Promise<DbRow | null> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select *
      from public.daily_budgets
      where daily_budget_id = $1::uuid
        and user_id = $2::uuid
      limit 1
    `,
    [
      assertUuid(budgetId, "budgetId"),
      assertUuid(runtime.principal.userId, "principal.userId"),
    ],
  );
  return result.rows[0] ?? null;
}

async function getBudgetRowByDate<TEnv>(
  repositoryQuery: DailyBudgetsDbQuery<TEnv>,
  budgetDate: string,
  runtime: DailyBudgetRouteRuntime<TEnv>,
  operationName = "dailyBudgets.getByDate",
): Promise<DbRow | null> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select *
      from public.daily_budgets
      where user_id = $1::uuid
        and budget_date = $2::date
      limit 1
    `,
    [
      assertUuid(runtime.principal.userId, "principal.userId"),
      assertDate(budgetDate, "budgetDate"),
    ],
  );
  return result.rows[0] ?? null;
}

async function queryBudgetById<TEnv>(
  repositoryQuery: DailyBudgetsDbQuery<TEnv>,
  budgetId: string,
  runtime: DailyBudgetRouteRuntime<TEnv>,
): Promise<JsonRecord> {
  const row = await getBudgetRow(
    repositoryQuery,
    budgetId,
    runtime,
    "dailyBudgets.getAfterMutation",
  );
  if (!row) throw new Error("Daily budget not found after mutation.");
  return rowToBudget(row, runtime.now);
}

async function findSpendByIdempotency<TEnv>(
  repositoryQuery: DailyBudgetsDbQuery<TEnv>,
  input: DailyBudgetSpendInput,
  runtime: DailyBudgetRouteRuntime<TEnv>,
): Promise<DbRow | null> {
  if (!input.idempotencyKey) return null;
  const result = await queryText(
    repositoryQuery,
    runtime,
    "dailyBudgets.findSpendByIdempotency",
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
  return result.rows[0] ?? null;
}

export function createNeonDailyBudgetsRepository<TEnv = unknown>(
  options: NeonDailyBudgetsRepositoryOptions<TEnv> = {},
): DailyBudgetRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-daily-budgets-repository",
    async listBudgets(input, page, runtime) {
      const params: DbValue[] = [
        assertUuid(runtime.principal.userId, "principal.userId"),
      ];
      const clauses = ["user_id = $1::uuid"];
      const startDate =
        typeof input.startDate === "string"
          ? assertDate(input.startDate, "startDate")
          : null;
      const endDate =
        typeof input.endDate === "string"
          ? assertDate(input.endDate, "endDate")
          : null;
      if (startDate) {
        params.push(startDate);
        clauses.push(`budget_date >= $${params.length}::date`);
      }
      if (endDate) {
        params.push(endDate);
        clauses.push(`budget_date <= $${params.length}::date`);
      }
      if (typeof input.status === "string") {
        params.push(dbStatusFromApi(input.status as DailyBudgetStatus));
        clauses.push(`status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.list",
        `
          select *, count(*) over() as total_count
          from public.daily_budgets
          where ${clauses.join(" and ")}
          order by budget_date asc, daily_budget_id asc
          limit $${params.length - 1}::int
          offset $${params.length}::int
        `,
        params,
      );
      return listResult(result.rows, page, runtime.now);
    },
    async getBudgetById(budgetId, runtime) {
      const row = await getBudgetRow(repositoryQuery, budgetId, runtime);
      return row ? rowToBudget(row, runtime.now) : null;
    },
    async getBudgetByDate(budgetDate, runtime) {
      const row = await getBudgetRowByDate(
        repositoryQuery,
        budgetDate,
        runtime,
      );
      return row ? rowToBudget(row, runtime.now) : null;
    },
    async createBudget(input: DailyBudgetCreateInput, runtime) {
      const plannedAmountMinor = assertKrw(
        input.plannedAmountMinor,
        "plannedAmountMinor",
      );
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.create",
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
          values ($1::uuid, $2::date, $3::bigint, 0, $3::bigint, 0, 'OPEN', now())
          on conflict (user_id, budget_date)
          do update set
            daily_limit_amount = excluded.daily_limit_amount,
            remaining_amount = greatest(excluded.daily_limit_amount - public.daily_budgets.used_amount, 0),
            over_amount = greatest(public.daily_budgets.used_amount - excluded.daily_limit_amount, 0),
            status = case
              when public.daily_budgets.status = 'CLOSED' then 'CLOSED'
              when public.daily_budgets.used_amount > excluded.daily_limit_amount then 'OVER'
              else 'OPEN'
            end,
            calculated_at = now(),
            closed_at = case
              when public.daily_budgets.status = 'CLOSED' then public.daily_budgets.closed_at
              else null
            end
          returning *
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          assertDate(input.budgetDate, "budgetDate"),
          plannedAmountMinor,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create daily budget.");
      return rowToBudget(row, runtime.now, {
        source: input.source,
        memo: input.memo,
      });
    },
    async updateBudget(
      budgetId: string,
      input: DailyBudgetUpdateInput,
      runtime: DailyBudgetRouteRuntime<TEnv>,
    ) {
      if (input.status === "DELETED")
        return this.deleteBudget(budgetId, runtime);
      const plannedAmountMinor =
        input.plannedAmountMinor === undefined
          ? null
          : assertKrw(input.plannedAmountMinor, "plannedAmountMinor");
      const dbStatus =
        input.status === undefined ? null : dbStatusFromApi(input.status);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.update",
        `
          update public.daily_budgets
          set
            daily_limit_amount = coalesce($3::bigint, daily_limit_amount),
            remaining_amount = greatest(coalesce($3::bigint, daily_limit_amount) - used_amount, 0),
            over_amount = greatest(used_amount - coalesce($3::bigint, daily_limit_amount), 0),
            status = case
              when $4::text = 'CLOSED' then 'CLOSED'
              when used_amount > coalesce($3::bigint, daily_limit_amount) then 'OVER'
              else 'OPEN'
            end,
            calculated_at = now(),
            closed_at = case
              when $4::text = 'CLOSED' then coalesce(closed_at, now())
              else null
            end
          where daily_budget_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(budgetId, "budgetId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
          plannedAmountMinor,
          dbStatus,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Daily budget not found.");
      return rowToBudget(row, runtime.now, {
        ...(input.memo !== undefined ? { memo: input.memo } : {}),
      });
    },
    async deleteBudget(budgetId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.delete",
        `
          update public.daily_budgets
          set status = 'CLOSED',
              closed_at = coalesce(closed_at, now()),
              calculated_at = now()
          where daily_budget_id = $1::uuid
            and user_id = $2::uuid
          returning daily_budget_id
        `,
        [
          assertUuid(budgetId, "budgetId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
        ],
      );
      if (!result.rows[0]) throw new Error("Daily budget not found.");
      return {
        budgetId,
        status: "DELETED",
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async recordSpend(
      budgetId: string,
      input: DailyBudgetSpendInput,
      runtime: DailyBudgetRouteRuntime<TEnv>,
    ) {
      const existingSpend = await findSpendByIdempotency(
        repositoryQuery,
        input,
        runtime,
      );
      if (existingSpend) {
        const replayBudgetId = String(
          existingSpend.daily_budget_id ?? budgetId,
        );
        return {
          spend: rowToSpend(existingSpend),
          budget: await queryBudgetById(
            repositoryQuery,
            replayBudgetId,
            runtime,
          ),
          idempotentReplay: true,
          serverAuthority: true,
          financialRawDataExposed: false,
        };
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.recordSpend",
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
          values ($1::uuid, $2::uuid, $3::timestamptz, $4, null, $5, $6::bigint, 'ACTIVE', $7)
          on conflict (user_id, idempotency_key)
          where idempotency_key is not null
          do update set idempotency_key = excluded.idempotency_key
          returning *
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          assertUuid(budgetId, "budgetId"),
          input.spentAt,
          dbCategoryFromApi(input.category),
          input.memo,
          assertPositiveKrw(input.amountMinor, "amountMinor"),
          input.idempotencyKey,
        ],
      );
      const spendRow = result.rows[0];
      if (!spendRow) throw new Error("Failed to record daily budget spend.");
      return {
        spend: rowToSpend(spendRow),
        budget: await queryBudgetById(repositoryQuery, budgetId, runtime),
        idempotentReplay: false,
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async adjustBudget(
      budgetId: string,
      input: DailyBudgetAdjustmentInput,
      runtime: DailyBudgetRouteRuntime<TEnv>,
    ) {
      const signedAmount =
        input.adjustmentType === "DECREASE" ||
        input.adjustmentType === "CARRY_OVER_OUT"
          ? -assertPositiveKrw(input.amountMinor, "amountMinor")
          : assertPositiveKrw(input.amountMinor, "amountMinor");
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.adjust",
        `
          update public.daily_budgets
          set
            daily_limit_amount = greatest(daily_limit_amount + $3::bigint, 0),
            remaining_amount = greatest(greatest(daily_limit_amount + $3::bigint, 0) - used_amount, 0),
            over_amount = greatest(used_amount - greatest(daily_limit_amount + $3::bigint, 0), 0),
            status = case
              when used_amount > greatest(daily_limit_amount + $3::bigint, 0) then 'OVER'
              when status = 'CLOSED' then 'CLOSED'
              else 'OPEN'
            end,
            calculated_at = now()
          where daily_budget_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(budgetId, "budgetId"),
          assertUuid(runtime.principal.userId, "principal.userId"),
          signedAmount,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Daily budget not found.");
      return {
        adjustment: {
          budgetId,
          amountMinor: signedAmount,
          adjustmentType: input.adjustmentType,
          reason: input.reason,
          serverAuthority: true,
        },
        budget: rowToBudget(row, runtime.now),
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
    async recalculate(
      input: DailyBudgetRecalculateInput,
      runtime: DailyBudgetRouteRuntime<TEnv>,
    ) {
      const periodStartDate = assertDate(
        input.periodStartDate,
        "periodStartDate",
      );
      const periodEndDate = assertDate(input.periodEndDate, "periodEndDate");
      const totalDays = daysInclusive(periodStartDate, periodEndDate);
      const distributable = Math.max(
        0,
        assertKrw(input.availableAmountMinor, "availableAmountMinor") +
          assertKrw(input.carryOverAmountMinor, "carryOverAmountMinor") -
          assertKrw(input.alreadySpentAmountMinor, "alreadySpentAmountMinor"),
      );
      const baseDailyAmount = Math.floor(distributable / totalDays);
      const remainder = distributable - baseDailyAmount * totalDays;
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.recalculate",
        `
          with days as (
            select
              ($2::date + (series.day_index - 1)::int)::date as budget_date,
              series.day_index
            from generate_series(1, $6::int) as series(day_index)
          ),
          desired as (
            select
              budget_date,
              ($4::bigint + case when day_index <= $5::int then 1 else 0 end)::bigint as daily_limit_amount
            from days
          ),
          upserted as (
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
            select
              $1::uuid,
              budget_date,
              daily_limit_amount,
              0,
              daily_limit_amount,
              0,
              'OPEN',
              now()
            from desired
            on conflict (user_id, budget_date)
            do update set
              daily_limit_amount = case
                when $7::boolean then excluded.daily_limit_amount
                else public.daily_budgets.daily_limit_amount
              end,
              remaining_amount = case
                when $7::boolean then greatest(excluded.daily_limit_amount - public.daily_budgets.used_amount, 0)
                else public.daily_budgets.remaining_amount
              end,
              over_amount = case
                when $7::boolean then greatest(public.daily_budgets.used_amount - excluded.daily_limit_amount, 0)
                else public.daily_budgets.over_amount
              end,
              status = case
                when not $7::boolean then public.daily_budgets.status
                when public.daily_budgets.used_amount > excluded.daily_limit_amount then 'OVER'
                else 'OPEN'
              end,
              calculated_at = now()
            returning *
          )
          select *, count(*) over() as total_count
          from upserted
          order by budget_date asc
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          periodStartDate,
          periodEndDate,
          baseDailyAmount,
          remainder,
          totalDays,
          input.overwriteExisting,
        ],
      );
      const items = result.rows.map((row) => rowToBudget(row, runtime.now));
      return {
        periodStartDate,
        periodEndDate,
        totalDays,
        distributableAmountMinor: distributable,
        baseDailyAmountMinor: baseDailyAmount,
        remainderAmountMinor: remainder,
        createdOrUpdatedCount: items.length,
        skippedCount: input.overwriteExisting ? 0 : totalDays - items.length,
        items: items as unknown as JsonValue,
        serverAuthority: true,
      };
    },
    async summary(input, runtime) {
      const { startDate, endDate } = dateRangeFromInput(input, runtime);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.summary",
        `
          select
            count(*)::int as day_count,
            coalesce(sum(daily_limit_amount), 0)::bigint as planned_total,
            coalesce(sum(used_amount), 0)::bigint as spent_total,
            coalesce(sum(daily_limit_amount - used_amount), 0)::bigint as remaining_total,
            coalesce(sum(over_amount), 0)::bigint as over_total,
            count(*) filter (where used_amount > daily_limit_amount)::int as over_spent_days
          from public.daily_budgets
          where user_id = $1::uuid
            and budget_date between $2::date and $3::date
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          startDate,
          endDate,
        ],
      );
      const row = result.rows[0] ?? {};
      const dayCount = toNumber(row.day_count);
      const spentTotalMinor = toNumber(row.spent_total);
      const plannedTotalMinor = toNumber(row.planned_total);
      return {
        startDate,
        endDate,
        dayCount,
        plannedTotalMinor,
        adjustmentTotalMinor: 0,
        availableTotalMinor: plannedTotalMinor,
        spentTotalMinor,
        remainingTotalMinor: toNumber(row.remaining_total),
        overAmountTotalMinor: toNumber(row.over_total),
        overSpentDays: toNumber(row.over_spent_days),
        averageDailySpentMinor: dayCount
          ? Math.round(spentTotalMinor / dayCount)
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
      const startDate = `${month}-01`;
      const endDate = endOfMonth(month);
      const result = await queryText(
        repositoryQuery,
        runtime,
        "dailyBudgets.calendar",
        `
          select *
          from public.daily_budgets
          where user_id = $1::uuid
            and budget_date between $2::date and $3::date
          order by budget_date asc, daily_budget_id asc
        `,
        [
          assertUuid(runtime.principal.userId, "principal.userId"),
          startDate,
          endDate,
        ],
      );
      return {
        month,
        startDate,
        endDate,
        items: result.rows.map((row) =>
          rowToBudget(row, runtime.now),
        ) as unknown as JsonValue,
        serverAuthority: true,
        financialRawDataExposed: false,
      };
    },
  };
}
