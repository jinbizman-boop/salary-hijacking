import type {
  JsonRecord,
  JsonValue,
  PaginationInput,
  SavingsListResult,
  SavingsRepository,
  SavingsRouteRuntime,
} from "../routes/savings.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface SavingsDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface SavingsDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type SavingsDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: SavingsDbQueryOptions<TEnv>,
) => Promise<SavingsDbQueryResult>;

export interface NeonSavingsRepositoryOptions<TEnv = unknown> {
  readonly query?: SavingsDbQuery<TEnv>;
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

const dbCategoryByGoalType = Object.freeze({
  EMERGENCY_FUND: "EMERGENCY_FUND",
  HOUSE: "HOUSING",
  TRAVEL: "ETC",
  INVESTMENT: "INVESTMENT",
  EDUCATION: "SAVINGS",
  DEBT_PAYOFF: "INSTALLMENT",
  CUSTOM: "ETC",
});

const goalTypeByDbCategory = Object.freeze({
  SAVINGS: "CUSTOM",
  INSTALLMENT: "DEBT_PAYOFF",
  INVESTMENT: "INVESTMENT",
  EMERGENCY_FUND: "EMERGENCY_FUND",
  PENSION: "INVESTMENT",
  HOUSING: "HOUSE",
  ETC: "CUSTOM",
});

const dbStatusByApiStatus = Object.freeze({
  ACTIVE: "SCHEDULED",
  PAUSED: "SKIPPED",
  COMPLETED: "TRANSFERRED",
  ARCHIVED: "CANCELLED",
  DELETED: "CANCELLED",
});

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonSavingsRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for savings repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: SavingsDbQueryOptions<TEnv>,
): Promise<SavingsDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed savings.`);
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

function assertDay(value: number, field: string): number {
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

function dbCategoryFromGoalType(value: string): string {
  return (
    dbCategoryByGoalType[value as keyof typeof dbCategoryByGoalType] ?? "ETC"
  );
}

function goalTypeFromDb(value: unknown): string {
  const category = String(value ?? "ETC").toUpperCase();
  return (
    goalTypeByDbCategory[category as keyof typeof goalTypeByDbCategory] ??
    "CUSTOM"
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
  if (status === "CANCELLED") return "ARCHIVED";
  if (status === "TRANSFERRED") return "ACTIVE";
  return "ACTIVE";
}

function frequencyFromDb(value: unknown): string {
  const frequency = String(value ?? "MONTHLY").toUpperCase();
  return ["DAILY", "WEEKLY", "MONTHLY", "ONCE"].includes(frequency)
    ? frequency
    : "MONTHLY";
}

function dbFrequencyFromApi(value: string): string {
  return value === "PAYDAY" ? "MONTHLY" : value;
}

function dayFromDate(date: string): number {
  return Number.parseInt(date.slice(8, 10), 10) || 1;
}

function privacyFlags(): JsonRecord {
  return {
    serverAuthority: true,
    financialRawAccountDataExposed: false,
  };
}

function computed(goal: JsonRecord): JsonRecord {
  const current =
    typeof goal.currentAmountMinor === "number" ? goal.currentAmountMinor : 0;
  const target =
    typeof goal.targetAmountMinor === "number" ? goal.targetAmountMinor : 0;
  const fixed =
    typeof goal.fixedSaveAmountMinor === "number"
      ? goal.fixedSaveAmountMinor
      : 0;
  const remaining = Math.max(0, target - current);
  const status =
    goal.status === "PAUSED" ||
    goal.status === "ARCHIVED" ||
    goal.status === "DELETED"
      ? goal.status
      : current >= target && target > 0
        ? "COMPLETED"
        : "ACTIVE";
  return {
    ...goal,
    currentAmountMinor: current,
    targetAmountMinor: target,
    remainingAmountMinor: remaining,
    completionRate:
      target > 0
        ? Math.min(1, Math.round((current / target) * 10_000) / 10_000)
        : 0,
    estimatedRemainingCycles: fixed > 0 ? Math.ceil(remaining / fixed) : null,
    status,
    ...privacyFlags(),
  };
}

function rowToGoal(row: DbRow, extra: JsonRecord = {}): JsonRecord {
  const transferredAt = toText(row.transferred_at);
  const createdAt = toIso(row.created_at);
  const updatedAt = toIso(row.updated_at ?? row.created_at);
  const amount = toNumber(row.amount);
  const record: JsonRecord = {
    goalId: String(row.savings_plan_id ?? ""),
    title: String(row.name ?? ""),
    goalType: goalTypeFromDb(row.category),
    targetAmountMinor:
      typeof extra.targetAmountMinor === "number"
        ? extra.targetAmountMinor
        : amount,
    currentAmountMinor:
      typeof extra.currentAmountMinor === "number"
        ? extra.currentAmountMinor
        : transferredAt
          ? amount
          : 0,
    fixedSaveAmountMinor: amount,
    frequency: frequencyFromDb(row.recurrence_type),
    saveDay: toNumber(row.saving_day),
    startDate:
      typeof extra.startDate === "string"
        ? extra.startDate
        : createdAt.slice(0, 10),
    targetDate:
      typeof extra.targetDate === "string" || extra.targetDate === null
        ? extra.targetDate
        : null,
    accountAlias:
      typeof extra.accountAlias === "string" || extra.accountAlias === null
        ? extra.accountAlias
        : null,
    memo:
      typeof extra.memo === "string" || extra.memo === null ? extra.memo : null,
    autoSave: typeof extra.autoSave === "boolean" ? extra.autoSave : true,
    affectsDailyBudget:
      typeof extra.affectsDailyBudget === "boolean"
        ? extra.affectsDailyBudget
        : true,
    status: apiStatusFromDb(row),
    lastSavedAt: transferredAt ? toIso(row.transferred_at) : null,
    createdAt,
    updatedAt,
    ...extra,
  };
  delete record.userId;
  delete record.payrollPlanId;
  return computed(record);
}

function activeIn(
  goal: JsonRecord,
  startDate: string,
  endDate: string,
): boolean {
  const state = String(computed(goal).status);
  if (state !== "ACTIVE") return false;
  const start = String(goal.startDate ?? startDate);
  const target = typeof goal.targetDate === "string" ? goal.targetDate : null;
  return start <= endDate && (!target || target >= startDate);
}

function nextDate(goal: JsonRecord, from: string): string | null {
  const frequency = String(goal.frequency ?? "MONTHLY");
  const start = String(goal.startDate ?? from);
  const end = typeof goal.targetDate === "string" ? goal.targetDate : null;
  const dayValue = typeof goal.saveDay === "number" ? goal.saveDay : null;
  const candidate = start > from ? start : from;

  if (frequency === "ONCE")
    return start >= from && (!end || start <= end) ? start : null;
  if (frequency === "DAILY" || frequency === "PAYDAY") {
    return candidate <= (end ?? "9999-12-31") ? candidate : null;
  }
  if (frequency === "WEEKLY") {
    const weekdayTarget = dayValue ?? 1;
    for (let offset = 0; offset < 8; offset += 1) {
      const test = addDays(candidate, offset);
      const weekday = new Date(`${test}T00:00:00.000Z`).getUTCDay() || 7;
      if (weekday === weekdayTarget && (!end || test <= end)) return test;
    }
    return null;
  }
  for (let step = 0; step < 36; step += 1) {
    const base = addMonths(candidate, step);
    const first = new Date(`${base.slice(0, 7)}-01T00:00:00.000Z`);
    const last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const due = `${base.slice(0, 7)}-${String(Math.min(dayValue ?? 1, last)).padStart(2, "0")}`;
    if (due >= from && due >= start && (!end || due <= end)) return due;
  }
  return null;
}

function occurrences(
  goal: JsonRecord,
  startDate: string,
  endDate: string,
): readonly string[] {
  if (!activeIn(goal, startDate, endDate)) return [];
  const out: string[] = [];
  let cursor = startDate;
  for (let index = 0; index < 370; index += 1) {
    const due = nextDate(goal, cursor);
    if (!due || due > endDate) break;
    out.push(due);
    cursor = addDays(due, 1);
  }
  return out;
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): SavingsListResult<TItem> {
  return {
    items: rows.map(mapper),
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function queryText<TEnv>(
  repositoryQuery: SavingsDbQuery<TEnv>,
  runtime: SavingsRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<SavingsDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

function userIdFromRuntime<TEnv>(runtime: SavingsRouteRuntime<TEnv>): string {
  return assertUuid(runtime.principal.userId, "principal.userId");
}

function listWhere(
  input: JsonRecord,
  runtime: SavingsRouteRuntime,
): { readonly sql: string; readonly params: DbValue[] } {
  const params: DbValue[] = [userIdFromRuntime(runtime)];
  const clauses = ["s.user_id = $1::uuid"];

  const goalType = toText(input.goalType);
  if (goalType) {
    params.push(dbCategoryFromGoalType(goalType.toUpperCase()));
    clauses.push(`s.category = $${params.length}`);
  }

  const status = toText(input.status)?.toUpperCase();
  if (status === "ACTIVE") {
    clauses.push("s.status in ('SCHEDULED', 'TRANSFERRED')");
  } else if (status) {
    params.push(dbStatusFromApi(status));
    clauses.push(`s.status = $${params.length}`);
  }

  const q = toText(input.q);
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`s.name ilike $${params.length}`);
  }

  return { sql: clauses.join(" and "), params };
}

async function queryGoalRows<TEnv>(
  repositoryQuery: SavingsDbQuery<TEnv>,
  input: JsonRecord,
  page: PaginationInput,
  runtime: SavingsRouteRuntime<TEnv>,
  operationName = "savings.listGoals",
): Promise<SavingsDbQueryResult> {
  const where = listWhere(input, runtime);
  const params = [...where.params, page.limit, page.offset];
  return queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select s.*, count(*) over() as total_count
      from public.savings_plans s
      where ${where.sql}
      order by s.saving_day asc, s.created_at desc, s.savings_plan_id desc
      limit $${params.length - 1}::int
      offset $${params.length}::int
    `,
    params,
  );
}

async function queryAllGoals<TEnv>(
  repositoryQuery: SavingsDbQuery<TEnv>,
  runtime: SavingsRouteRuntime<TEnv>,
  operationName: string,
): Promise<readonly JsonRecord[]> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select *
      from public.savings_plans
      where user_id = $1::uuid
      order by saving_day asc, created_at desc, savings_plan_id desc
    `,
    [userIdFromRuntime(runtime)],
  );
  return result.rows.map((row) => rowToGoal(row));
}

function saveDayForInput(input: {
  readonly saveDay: number | null;
  readonly startDate: string;
}): number {
  return assertDay(
    input.saveDay ?? dayFromDate(assertDate(input.startDate, "startDate")),
    "saveDay",
  );
}

export function createNeonSavingsRepository<TEnv = unknown>(
  options: NeonSavingsRepositoryOptions<TEnv> = {},
): SavingsRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-savings-repository",
    async listGoals(input, page, runtime) {
      const today = todayInSeoul(runtime.now);
      return listResult(
        (await queryGoalRows(repositoryQuery, input, page, runtime)).rows,
        page,
        (row) => {
          const goal = rowToGoal(row);
          return {
            ...goal,
            nextSaveDate: nextDate(goal, today),
            transactionCount: goal.lastSavedAt ? 1 : 0,
          };
        },
      );
    },
    async getGoal(goalId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.getGoal",
        `
          select *
          from public.savings_plans
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          limit 1
        `,
        [assertUuid(goalId, "goalId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) return null;
      const goal = rowToGoal(row);
      return {
        ...goal,
        nextSaveDate: nextDate(goal, todayInSeoul(runtime.now)),
        transactions: goal.lastSavedAt
          ? ([
              {
                goalId: goal.goalId,
                transactionType: "AUTO_SAVE",
                amountMinor: goal.currentAmountMinor,
                signedAmountMinor: goal.currentAmountMinor,
                occurredAt: goal.lastSavedAt,
                ...privacyFlags(),
              },
            ] as JsonValue[])
          : [],
      };
    },
    async createGoal(input, runtime) {
      if (input.targetDate && input.targetDate < input.startDate) {
        throw new Error("targetDate must not be earlier than startDate.");
      }
      if (input.currentAmountMinor > input.targetAmountMinor) {
        throw new Error(
          "currentAmountMinor must not exceed targetAmountMinor.",
        );
      }
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.createGoal",
        `
          with selected_plan as (
            select payroll_plan_id
            from public.payroll_plans
            where user_id = $1::uuid
              and status = 'ACTIVE'
            order by year_month desc, updated_at desc, payroll_plan_id desc
            limit 1
          )
          insert into public.savings_plans (
            user_id,
            payroll_plan_id,
            saving_day,
            category,
            name,
            amount,
            recurrence_type,
            status,
            transferred_at
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
          saveDayForInput(input),
          dbCategoryFromGoalType(input.goalType),
          input.title,
          assertKrw(input.fixedSaveAmountMinor, "fixedSaveAmountMinor"),
          dbFrequencyFromApi(input.frequency),
        ],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(
          "Failed to create savings goal; active payroll plan required.",
        );
      }
      const goal = rowToGoal(row, {
        targetAmountMinor: assertKrw(
          input.targetAmountMinor,
          "targetAmountMinor",
        ),
        currentAmountMinor: assertKrwOrZero(
          input.currentAmountMinor,
          "currentAmountMinor",
        ),
        frequency: input.frequency,
        startDate: assertDate(input.startDate, "startDate"),
        targetDate: input.targetDate,
        accountAlias: input.accountAlias,
        memo: input.memo,
        autoSave: input.autoSave,
        affectsDailyBudget: input.affectsDailyBudget,
      });
      return {
        ...goal,
        nextSaveDate: nextDate(goal, todayInSeoul(runtime.now)),
      };
    },
    async updateGoal(goalId, input, runtime) {
      if (
        input.targetDate &&
        input.startDate &&
        input.targetDate < input.startDate
      ) {
        throw new Error("targetDate must not be earlier than startDate.");
      }
      const dbStatus =
        input.status === undefined ? null : dbStatusFromApi(input.status);
      const cancelledAt =
        input.status === "ARCHIVED" || input.status === "DELETED"
          ? todayInSeoul(runtime.now)
          : null;
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.updateGoal",
        `
          update public.savings_plans
          set name = coalesce($3, name),
              category = coalesce($4, category),
              amount = coalesce($5::bigint, amount),
              recurrence_type = coalesce($6, recurrence_type),
              saving_day = coalesce($7::smallint, saving_day),
              status = coalesce($8, status),
              transferred_at = case
                when coalesce($8, status) = 'TRANSFERRED' then coalesce(transferred_at, now())
                when coalesce($8, status) <> 'TRANSFERRED' then null
                else transferred_at
              end,
              cancelled_at = case
                when coalesce($8, status) = 'CANCELLED' then coalesce($9::timestamptz, now())
                when coalesce($8, status) <> 'CANCELLED' then null
                else cancelled_at
              end,
              updated_at = now()
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(goalId, "goalId"),
          userIdFromRuntime(runtime),
          input.title ?? null,
          input.goalType === undefined
            ? null
            : dbCategoryFromGoalType(input.goalType),
          input.fixedSaveAmountMinor === undefined
            ? null
            : assertKrw(input.fixedSaveAmountMinor, "fixedSaveAmountMinor"),
          input.frequency === undefined
            ? null
            : dbFrequencyFromApi(input.frequency),
          input.saveDay === undefined || input.saveDay === null
            ? null
            : assertDay(input.saveDay, "saveDay"),
          dbStatus,
          cancelledAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Savings goal not found.");
      const extra: JsonRecord = {};
      if (input.targetAmountMinor !== undefined)
        extra.targetAmountMinor = assertKrw(
          input.targetAmountMinor,
          "targetAmountMinor",
        );
      if (input.currentAmountMinor !== undefined)
        extra.currentAmountMinor = assertKrwOrZero(
          input.currentAmountMinor,
          "currentAmountMinor",
        );
      if (input.frequency !== undefined) extra.frequency = input.frequency;
      if (input.startDate !== undefined)
        extra.startDate = assertDate(input.startDate, "startDate");
      if (input.targetDate !== undefined) extra.targetDate = input.targetDate;
      if (input.accountAlias !== undefined)
        extra.accountAlias = input.accountAlias;
      if (input.memo !== undefined) extra.memo = input.memo;
      if (input.autoSave !== undefined) extra.autoSave = input.autoSave;
      if (input.affectsDailyBudget !== undefined)
        extra.affectsDailyBudget = input.affectsDailyBudget;
      const goal = rowToGoal(row, extra);
      return {
        ...goal,
        nextSaveDate: nextDate(goal, todayInSeoul(runtime.now)),
      };
    },
    async deleteGoal(goalId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.deleteGoal",
        `
          update public.savings_plans
          set status = 'CANCELLED',
              transferred_at = null,
              cancelled_at = coalesce(cancelled_at, now()),
              updated_at = now()
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          returning savings_plan_id
        `,
        [assertUuid(goalId, "goalId"), userIdFromRuntime(runtime)],
      );
      if (!result.rows[0]) throw new Error("Savings goal not found.");
      return { goalId, status: "DELETED", ...privacyFlags() };
    },
    async pauseGoal(goalId, reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.pauseGoal",
        `
          update public.savings_plans
          set status = 'SKIPPED',
              transferred_at = null,
              updated_at = now()
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [assertUuid(goalId, "goalId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Savings goal not found.");
      return rowToGoal(row, { pauseReason: reason });
    },
    async resumeGoal(goalId, reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.resumeGoal",
        `
          update public.savings_plans
          set status = 'SCHEDULED',
              transferred_at = null,
              cancelled_at = null,
              updated_at = now()
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [assertUuid(goalId, "goalId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Savings goal not found.");
      const goal = rowToGoal(row, { resumeReason: reason });
      return {
        ...goal,
        nextSaveDate: nextDate(goal, todayInSeoul(runtime.now)),
      };
    },
    async archiveGoal(goalId, reason, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.archiveGoal",
        `
          update public.savings_plans
          set status = 'CANCELLED',
              transferred_at = null,
              cancelled_at = coalesce(cancelled_at, now()),
              updated_at = now()
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [assertUuid(goalId, "goalId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Savings goal not found.");
      return rowToGoal(row, { archiveReason: reason, status: "ARCHIVED" });
    },
    async recordTransaction(goalId, input, runtime) {
      assertKrw(input.amountMinor, "amountMinor");
      const signed =
        input.transactionType === "WITHDRAWAL"
          ? -input.amountMinor
          : input.amountMinor;
      const dbStatus =
        input.transactionType === "WITHDRAWAL" ? "SCHEDULED" : "TRANSFERRED";
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.recordTransaction",
        `
          update public.savings_plans
          set status = $3,
              transferred_at = case
                when $3 = 'TRANSFERRED' then $4::timestamptz
                else null
              end,
              cancelled_at = null,
              updated_at = now()
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          returning *
        `,
        [
          assertUuid(goalId, "goalId"),
          userIdFromRuntime(runtime),
          dbStatus,
          input.occurredAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Savings goal not found.");
      const goal = rowToGoal(row, {
        currentAmountMinor: Math.max(0, signed),
      });
      return {
        transaction: {
          goalId,
          transactionType: input.transactionType,
          amountMinor: input.amountMinor,
          signedAmountMinor: signed,
          occurredAt: input.occurredAt,
          memo: input.memo,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
          status: "POSTED",
          ...privacyFlags(),
        },
        goal,
        idempotentReplay: false,
        ...privacyFlags(),
      };
    },
    async listTransactions(goalId, page, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "savings.listTransactions",
        `
          select *
          from public.savings_plans
          where savings_plan_id = $1::uuid
            and user_id = $2::uuid
          limit 1
        `,
        [assertUuid(goalId, "goalId"), userIdFromRuntime(runtime)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Savings goal not found.");
      const goal = rowToGoal(row);
      const currentAmount =
        typeof goal.currentAmountMinor === "number"
          ? goal.currentAmountMinor
          : 0;
      const lastSavedAt =
        typeof goal.lastSavedAt === "string" ? goal.lastSavedAt : null;
      const items = goal.lastSavedAt
        ? [
            {
              goalId,
              transactionType: "AUTO_SAVE",
              amountMinor: currentAmount,
              signedAmountMinor: currentAmount,
              occurredAt: lastSavedAt ?? new Date(0).toISOString(),
              status: "POSTED",
              ...privacyFlags(),
            },
          ]
        : [];
      return {
        items: items.slice(page.offset, page.offset + page.limit),
        page: page.page,
        pageSize: page.pageSize,
        total: items.length,
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
      const goals = await queryAllGoals(
        repositoryQuery,
        runtime,
        "savings.upcoming",
      );
      const items = goals.flatMap((goal) =>
        occurrences(goal, fromDate, toDate).map((dueDate) => ({
          goalId: String(goal.goalId),
          title: String(goal.title),
          goalType: String(goal.goalType),
          dueDate,
          amountMinor:
            typeof goal.fixedSaveAmountMinor === "number"
              ? goal.fixedSaveAmountMinor
              : 0,
          autoSave: goal.autoSave === true,
          status: "SCHEDULED",
        })),
      );
      return {
        fromDate,
        toDate,
        count: items.length,
        totalAmountMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        items: items as unknown as JsonValue,
        ...privacyFlags(),
      };
    },
    async summary(input, runtime) {
      const startDate =
        typeof input.startDate === "string"
          ? assertDate(input.startDate, "startDate")
          : addMonths(todayInSeoul(runtime.now), -3);
      const endDate =
        typeof input.endDate === "string"
          ? assertDate(input.endDate, "endDate")
          : todayInSeoul(runtime.now);
      daysInclusive(startDate, endDate);
      const goals = await queryAllGoals(
        repositoryQuery,
        runtime,
        "savings.summary",
      );
      const items = goals.map(computed);
      const depositTotalMinor = items.reduce(
        (sum, item) =>
          sum +
          (item.lastSavedAt &&
          typeof item.currentAmountMinor === "number" &&
          String(item.lastSavedAt).slice(0, 10) >= startDate &&
          String(item.lastSavedAt).slice(0, 10) <= endDate
            ? item.currentAmountMinor
            : 0),
        0,
      );
      return {
        startDate,
        endDate,
        goalCount: items.length,
        activeGoalCount: items.filter((item) => item.status === "ACTIVE")
          .length,
        completedGoalCount: items.filter((item) => item.status === "COMPLETED")
          .length,
        targetTotalMinor: items.reduce(
          (sum, item) =>
            sum +
            (typeof item.targetAmountMinor === "number"
              ? item.targetAmountMinor
              : 0),
          0,
        ),
        currentTotalMinor: items.reduce(
          (sum, item) =>
            sum +
            (typeof item.currentAmountMinor === "number"
              ? item.currentAmountMinor
              : 0),
          0,
        ),
        fixedSaveTotalMinor: items
          .filter((item) => item.status === "ACTIVE")
          .reduce(
            (sum, item) =>
              sum +
              (typeof item.fixedSaveAmountMinor === "number"
                ? item.fixedSaveAmountMinor
                : 0),
            0,
          ),
        depositTotalMinor,
        withdrawalTotalMinor: 0,
        averageCompletionRate: items.length
          ? Math.round(
              (items.reduce(
                (sum, item) =>
                  sum +
                  (typeof item.completionRate === "number"
                    ? item.completionRate
                    : 0),
                0,
              ) /
                items.length) *
                10_000,
            ) / 10_000
          : 0,
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
      const goals = await queryAllGoals(
        repositoryQuery,
        runtime,
        "savings.calendar",
      );
      const items = goals
        .flatMap((goal) =>
          occurrences(goal, startDate, endDate).map((dateText) => ({
            date: dateText,
            goalId: String(goal.goalId),
            title: String(goal.title),
            goalType: String(goal.goalType),
            amountMinor:
              typeof goal.fixedSaveAmountMinor === "number"
                ? goal.fixedSaveAmountMinor
                : 0,
            autoSave: goal.autoSave === true,
          })),
        )
        .sort((left, right) => left.date.localeCompare(right.date));
      return {
        month,
        startDate,
        endDate,
        scheduledSaveCount: items.length,
        scheduledSaveTotalMinor: items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        ),
        items: items as unknown as JsonValue,
        ...privacyFlags(),
      };
    },
    async impact(input, runtime) {
      const goals = await queryAllGoals(
        repositoryQuery,
        runtime,
        "savings.impact",
      );
      const active = goals.filter(
        (goal) =>
          goal.affectsDailyBudget !== false &&
          activeIn(goal, input.periodStartDate, input.periodEndDate),
      );
      const fixedSavingsTotalMinor = active.reduce(
        (sum, goal) =>
          sum +
          occurrences(goal, input.periodStartDate, input.periodEndDate).length *
            (typeof goal.fixedSaveAmountMinor === "number"
              ? goal.fixedSaveAmountMinor
              : 0),
        0,
      );
      const dayCount = daysInclusive(
        input.periodStartDate,
        input.periodEndDate,
      );
      const availableForDailyBudgetMinor = Math.max(
        0,
        input.payrollAmountMinor -
          input.fixedExpenseTotalMinor -
          fixedSavingsTotalMinor -
          input.variableExpenseReserveMinor -
          input.emergencyBufferMinor,
      );
      return {
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        dayCount,
        payrollAmountMinor: input.payrollAmountMinor,
        fixedExpenseTotalMinor: input.fixedExpenseTotalMinor,
        fixedSavingsTotalMinor,
        variableExpenseReserveMinor: input.variableExpenseReserveMinor,
        emergencyBufferMinor: input.emergencyBufferMinor,
        availableForDailyBudgetMinor,
        recommendedDailyBudgetMinor:
          dayCount > 0
            ? Math.floor(availableForDailyBudgetMinor / dayCount)
            : 0,
        goalCount: active.length,
        ...privacyFlags(),
      };
    },
  };
}
