import type {
  GrowthListResult,
  GrowthRepository,
  GrowthRouteRuntime,
  GrowthTaskDifficulty,
  GrowthTaskStatus,
  GrowthTaskType,
  JsonRecord,
  PaginationInput,
} from "../routes/growth.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface GrowthDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface GrowthDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type GrowthDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: GrowthDbQueryOptions<TEnv>,
) => Promise<GrowthDbQueryResult>;

export interface NeonGrowthRepositoryOptions<TEnv = unknown> {
  readonly query?: GrowthDbQuery<TEnv>;
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

const dbTypeByApiType = Object.freeze({
  READING: ["READING"],
  EXERCISE: ["HEALTH"],
  STUDY: ["ENGLISH", "QUIZ"],
  SAVING: ["ROUTINE"],
  EXPENSE_LOG: ["ROUTINE"],
  BUDGET_REVIEW: ["ROUTINE"],
  CONTENT: ["NEWS"],
  CUSTOM: ["ROUTINE"],
} satisfies Record<GrowthTaskType, readonly string[]>);

const apiTypeByDbType = Object.freeze({
  READING: "READING",
  NEWS: "CONTENT",
  ENGLISH: "STUDY",
  HEALTH: "EXERCISE",
  QUIZ: "STUDY",
  ROUTINE: "CUSTOM",
} satisfies Record<string, GrowthTaskType>);

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonGrowthRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for growth repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: GrowthDbQueryOptions<TEnv>,
): Promise<GrowthDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed growth.`);
  }
  return value;
}

function assertNonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer.`);
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

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()))
      return parsed.toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }
  return null;
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

function levelFromExp(totalExp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalExp) / 100)) + 1);
}

function nextLevelExp(level: number): number {
  return level * level * 100;
}

function difficultyFromReward(expReward: number): GrowthTaskDifficulty {
  if (expReward >= 150) return "EXTREME";
  if (expReward >= 80) return "HARD";
  if (expReward <= 15) return "EASY";
  return "NORMAL";
}

function apiTaskTypeFromDb(value: unknown): GrowthTaskType {
  const type = String(value ?? "ROUTINE").toUpperCase();
  return apiTypeByDbType[type as keyof typeof apiTypeByDbType] ?? "CUSTOM";
}

function dbTaskTypesFromApi(value: string): readonly string[] {
  const type = value.toUpperCase() as GrowthTaskType;
  return dbTypeByApiType[type] ?? ["ROUTINE"];
}

function dbTaskTypeFromApi(value: GrowthTaskType): string {
  return dbTaskTypesFromApi(value)[0] ?? "ROUTINE";
}

function apiStatus(row: DbRow): GrowthTaskStatus {
  const dbStatus = String(row.status ?? "ACTIVE").toUpperCase();
  if (dbStatus === "PAUSED") return "PAUSED";
  if (dbStatus === "ARCHIVED" || dbStatus === "DRAFT") return "ARCHIVED";
  return toNumber(row.progress_count) >= 1 ? "COMPLETED" : "ACTIVE";
}

function privacyFlags(): JsonRecord {
  return {
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function rowToTask(row: DbRow): JsonRecord {
  const expReward = assertNonNegativeInteger(
    toNumber(row.exp_reward),
    "expReward",
  );
  const progressCount = assertNonNegativeInteger(
    toNumber(row.progress_count),
    "progressCount",
  );
  const startDate = toDateOnly(row.active_from) ?? "1970-01-01";
  const endDate = toDateOnly(row.active_to);
  const completedAt =
    progressCount > 0 ? toIso(row.last_completed_at ?? row.updated_at) : null;
  return {
    taskId: String(row.growth_task_id ?? ""),
    title: String(row.title ?? ""),
    taskType: apiTaskTypeFromDb(row.type),
    difficulty: difficultyFromReward(expReward),
    targetCount: 1,
    progressCount: Math.min(1, progressCount),
    expReward,
    startDate,
    endDate,
    note: toText(row.description),
    publicShareEnabled: false,
    status: apiStatus(row),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at ?? row.created_at),
    completedAt,
    ...privacyFlags(),
  };
}

function listResult<TItem extends JsonRecord>(
  rows: readonly DbRow[],
  page: PaginationInput,
  mapper: (row: DbRow) => TItem,
): GrowthListResult<TItem> {
  return {
    items: rows.map(mapper),
    page: page.page,
    pageSize: page.pageSize,
    total: rows.length ? toNumber(rows[0]?.total_count) : 0,
  };
}

function queryText<TEnv>(
  repositoryQuery: GrowthDbQuery<TEnv>,
  runtime: GrowthRouteRuntime<TEnv>,
  operationName: string,
  sqlText: string,
  params: readonly DbValue[],
): Promise<GrowthDbQueryResult> {
  return repositoryQuery(sqlText, params, {
    operationName,
    env: runtime.env,
  });
}

function userIdFromRuntime<TEnv>(runtime: GrowthRouteRuntime<TEnv>): string {
  return assertUuid(runtime.principal.userId, "principal.userId");
}

function taskWhere(
  input: JsonRecord,
  runtime: GrowthRouteRuntime,
): { readonly sql: string; readonly params: DbValue[] } {
  const params: DbValue[] = [userIdFromRuntime(runtime)];
  const clauses = ["gt.status <> 'ARCHIVED'"];

  const taskType = toText(input.taskType);
  if (taskType) {
    params.push(dbTaskTypesFromApi(taskType));
    clauses.push(`gt.type = any($${params.length}::text[])`);
  }

  const status = toText(input.status)?.toUpperCase();
  if (status === "ACTIVE") {
    clauses.push("gt.status = 'ACTIVE'");
  } else if (status === "PAUSED") {
    clauses.push("gt.status = 'PAUSED'");
  } else if (status === "COMPLETED") {
    clauses.push(`
      exists (
        select 1
        from public.growth_task_completions completed
        where completed.growth_task_id = gt.growth_task_id
          and completed.user_id = $1::uuid
          and completed.status = 'COMPLETED'
      )
    `);
  } else if (status === "ARCHIVED" || status === "DELETED") {
    clauses.push("gt.status = 'ARCHIVED'");
  }

  return { sql: clauses.join(" and "), params };
}

async function queryTaskRows<TEnv>(
  repositoryQuery: GrowthDbQuery<TEnv>,
  input: JsonRecord,
  page: PaginationInput,
  runtime: GrowthRouteRuntime<TEnv>,
  operationName = "growth.listTasks",
): Promise<GrowthDbQueryResult> {
  const where = taskWhere(input, runtime);
  const params = [...where.params, page.limit, page.offset];
  return queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select
        gt.*,
        coalesce(count(gc.completion_id) filter (where gc.status = 'COMPLETED'), 0)::int as progress_count,
        max(gc.completed_at) filter (where gc.status = 'COMPLETED') as last_completed_at,
        count(*) over() as total_count
      from public.growth_tasks gt
      left join public.growth_task_completions gc
        on gc.growth_task_id = gt.growth_task_id
       and gc.user_id = $1::uuid
      where ${where.sql}
      group by gt.growth_task_id
      order by gt.active_from desc, gt.created_at desc, gt.growth_task_id desc
      limit $${params.length - 1}::int
      offset $${params.length}::int
    `,
    params,
  );
}

async function queryTaskById<TEnv>(
  repositoryQuery: GrowthDbQuery<TEnv>,
  taskId: string,
  runtime: GrowthRouteRuntime<TEnv>,
  operationName = "growth.getTask",
): Promise<JsonRecord | null> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select
        gt.*,
        coalesce(count(gc.completion_id) filter (where gc.status = 'COMPLETED'), 0)::int as progress_count,
        max(gc.completed_at) filter (where gc.status = 'COMPLETED') as last_completed_at
      from public.growth_tasks gt
      left join public.growth_task_completions gc
        on gc.growth_task_id = gt.growth_task_id
       and gc.user_id = $1::uuid
      where gt.growth_task_id = $2::uuid
        and gt.status <> 'ARCHIVED'
      group by gt.growth_task_id
      limit 1
    `,
    [userIdFromRuntime(runtime), assertUuid(taskId, "taskId")],
  );
  const row = result.rows[0];
  return row ? rowToTask(row) : null;
}

async function queryProfile<TEnv>(
  repositoryQuery: GrowthDbQuery<TEnv>,
  runtime: GrowthRouteRuntime<TEnv>,
  operationName = "growth.profile",
): Promise<JsonRecord> {
  const result = await queryText(
    repositoryQuery,
    runtime,
    operationName,
    `
      select
        coalesce(ugs.level, 1)::int as level,
        coalesce(ugs.total_exp, 0)::int as total_exp,
        coalesce(ugs.current_exp, 0)::int as current_exp
      from (select $1::uuid as user_id) principal
      left join public.user_growth_stats ugs
        on ugs.user_id = principal.user_id
      limit 1
    `,
    [userIdFromRuntime(runtime)],
  );
  const row = result.rows[0] ?? {};
  const totalExp = toNumber(row.total_exp);
  const level = Math.max(1, toNumber(row.level) || levelFromExp(totalExp));
  const next = nextLevelExp(level);
  return {
    level,
    totalExp,
    nextLevelExp: next,
    remainingExpToNextLevel: Math.max(0, next - totalExp),
    badgeCount: 0,
    financialRawDataExposed: false,
  };
}

export function createNeonGrowthRepository<TEnv = unknown>(
  options: NeonGrowthRepositoryOptions<TEnv> = {},
): GrowthRepository<TEnv> {
  const repositoryQuery = options.query ?? defaultQuery<TEnv>;

  return {
    name: "neon-growth-repository",
    async profile(runtime) {
      return queryProfile(repositoryQuery, runtime);
    },
    async dashboard(runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "growth.dashboard",
        `
          select
            coalesce(ugs.level, 1)::int as level,
            coalesce(ugs.total_exp, 0)::int as total_exp,
            (select count(*)::int from public.growth_tasks where status = 'ACTIVE') as active_task_count,
            (
              select count(*)::int
              from public.growth_task_completions
              where user_id = $1::uuid
                and status = 'COMPLETED'
            ) as completed_task_count
          from (select $1::uuid as user_id) principal
          left join public.user_growth_stats ugs
            on ugs.user_id = principal.user_id
          limit 1
        `,
        [userIdFromRuntime(runtime)],
      );
      const row = result.rows[0] ?? {};
      return {
        profile: {
          level: Math.max(1, toNumber(row.level) || 1),
          totalExp: toNumber(row.total_exp),
        },
        activeTaskCount: toNumber(row.active_task_count),
        completedTaskCount: toNumber(row.completed_task_count),
        joinedChallengeCount: 0,
        completedContentCount: 0,
        todaySuggestion: "오늘도 LV UP 미션을 이어가요.",
        financialRawDataExposed: false,
      };
    },
    async listTasks(input, page, runtime) {
      return listResult(
        (await queryTaskRows(repositoryQuery, input, page, runtime)).rows,
        page,
        rowToTask,
      );
    },
    async getTask(taskId, runtime) {
      return queryTaskById(repositoryQuery, taskId, runtime);
    },
    async createTask(input, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "growth.createTask",
        `
          insert into public.growth_tasks (
            type,
            category,
            title,
            description,
            exp_reward,
            active_from,
            active_to,
            status
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5::int,
            $6::timestamptz,
            $7::timestamptz,
            'ACTIVE'
          )
          returning *, 0::int as progress_count
        `,
        [
          dbTaskTypeFromApi(input.taskType),
          dbTaskTypeFromApi(input.taskType),
          input.title,
          input.note ?? input.title,
          assertNonNegativeInteger(input.expReward, "expReward"),
          `${input.startDate}T00:00:00.000Z`,
          input.endDate ? `${input.endDate}T23:59:59.999Z` : null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create growth task.");
      return rowToTask(row);
    },
    async updateTask(taskId, input, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "growth.updateTask",
        `
          update public.growth_tasks
          set title = coalesce($2, title),
              type = coalesce($3, type),
              category = coalesce($3, category),
              description = coalesce($4, description),
              exp_reward = coalesce($5::int, exp_reward),
              active_from = coalesce($6::timestamptz, active_from),
              active_to = $7::timestamptz,
              status = coalesce($8, status),
              updated_at = now()
          where growth_task_id = $1::uuid
          returning *, 0::int as progress_count
        `,
        [
          assertUuid(taskId, "taskId"),
          input.title ?? null,
          input.taskType === undefined
            ? null
            : dbTaskTypeFromApi(input.taskType),
          input.note ?? null,
          input.expReward === undefined
            ? null
            : assertNonNegativeInteger(input.expReward, "expReward"),
          input.startDate === undefined
            ? null
            : `${input.startDate}T00:00:00.000Z`,
          input.endDate === undefined
            ? null
            : input.endDate
              ? `${input.endDate}T23:59:59.999Z`
              : null,
          input.status === undefined
            ? null
            : input.status === "DELETED"
              ? "ARCHIVED"
              : input.status,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Growth task not found.");
      return rowToTask(row);
    },
    async deleteTask(taskId, runtime) {
      const result = await queryText(
        repositoryQuery,
        runtime,
        "growth.deleteTask",
        `
          update public.growth_tasks
          set status = 'ARCHIVED',
              updated_at = now()
          where growth_task_id = $1::uuid
          returning growth_task_id
        `,
        [assertUuid(taskId, "taskId")],
      );
      if (!result.rows[0]) throw new Error("Growth task not found.");
      return { taskId, status: "DELETED", ...privacyFlags() };
    },
    async recordTaskProgress(taskId, input, runtime) {
      assertNonNegativeInteger(input.progressCount, "progressCount");
      const result = await queryText(
        repositoryQuery,
        runtime,
        "growth.recordTaskProgress",
        `
          insert into public.growth_task_completions (
            user_id,
            growth_task_id,
            completion_date,
            earned_exp,
            proof_text,
            status,
            completed_at
          )
          select
            $1::uuid,
            gt.growth_task_id,
            (($3::timestamptz at time zone 'Asia/Seoul')::date),
            gt.exp_reward,
            $4,
            'COMPLETED',
            $3::timestamptz
          from public.growth_tasks gt
          where gt.growth_task_id = $2::uuid
            and gt.status = 'ACTIVE'
          on conflict (user_id, growth_task_id, completion_date)
            where status = 'COMPLETED'
          do update
            set earned_exp = excluded.earned_exp,
                proof_text = excluded.proof_text,
                completed_at = excluded.completed_at,
                updated_at = now()
          returning *
        `,
        [
          userIdFromRuntime(runtime),
          assertUuid(taskId, "taskId"),
          input.occurredAt,
          input.note,
        ],
      );
      const completion = result.rows[0];
      if (!completion) throw new Error("Growth task not found.");
      const task = (await queryTaskById(
        repositoryQuery,
        taskId,
        runtime,
        "growth.getTaskAfterProgress",
      )) ?? { taskId, ...privacyFlags() };
      const expDelta = toNumber(completion.earned_exp);
      return {
        progress: {
          progressId: String(completion.completion_id ?? ""),
          taskId,
          progressCount: input.progressCount,
          note: toText(completion.proof_text),
          occurredAt: toIso(completion.completed_at ?? input.occurredAt),
          idempotencyKey: input.idempotencyKey,
          expDelta,
          createdAt: toIso(completion.created_at ?? completion.completed_at),
        },
        task,
        expDelta,
        badges: [],
        idempotentReplay: false,
      };
    },
    async listChallenges(_input, page) {
      return { items: [], page: page.page, pageSize: page.pageSize, total: 0 };
    },
    async joinChallenge(input) {
      return {
        joinId: null,
        challengeId: input.challengeId,
        status: "JOINED",
        publicShareEnabled: input.publicShareEnabled,
        financialRawDataRequired: false,
      };
    },
    async leaveChallenge(challengeId, reason) {
      return { challengeId, status: "LEFT", leaveReason: reason };
    },
    async completeChallenge(challengeId) {
      return { challengeId, status: "COMPLETED", expDelta: 0, badges: [] };
    },
    async listContents(_input, page) {
      return { items: [], page: page.page, pageSize: page.pageSize, total: 0 };
    },
    async completeContent(input, runtime) {
      return {
        completion: {
          completionId: null,
          contentId: input.contentId,
          note: input.note,
          expDelta: 0,
          completedAt: runtime.now.toISOString(),
          recommendationUsesSensitiveFinancialData: false,
        },
        badges: [],
        idempotentReplay: false,
      };
    },
    async listBadges() {
      return [];
    },
    async leaderboard(_input, page, runtime) {
      const profile = await queryProfile(
        repositoryQuery,
        runtime,
        "growth.leaderboard",
      );
      return {
        items: [
          {
            rank: 1,
            userMasked: "me",
            level: profile.level ?? 1,
            totalExp: profile.totalExp ?? 0,
          },
        ],
        page: page.page,
        pageSize: page.pageSize,
        total: 1,
      };
    },
    async recommendations(input) {
      const goal = typeof input.goal === "string" ? input.goal : "habit";
      return {
        goal,
        items: [],
        recommendationUsesSensitiveFinancialData: false,
        adTargetingSeparated: true,
      };
    },
    async summary(input, runtime) {
      const startDate =
        typeof input.startDate === "string"
          ? input.startDate
          : addDays(todayInSeoul(runtime.now), -30);
      const endDate =
        typeof input.endDate === "string"
          ? input.endDate
          : todayInSeoul(runtime.now);
      const profile = await queryProfile(
        repositoryQuery,
        runtime,
        "growth.summary",
      );
      return {
        startDate,
        endDate,
        progressRecordCount: 0,
        expEarnedInPeriod: 0,
        totalExp: profile.totalExp ?? 0,
        level: profile.level ?? 1,
        taskCount: 0,
        badgeCount: 0,
        financialRawDataExposed: false,
      };
    },
  };
}
