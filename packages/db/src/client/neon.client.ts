/**
 * packages/db/src/client/neon.client.ts
 *
 * 급여납치 Salary Hijacking Platform · Neon Postgres client.
 *
 * 파일 목적:
 * - Neon Postgres 서버 전용 DB client 제공
 * - @neondatabase/serverless 정적 import 없이 bootstrap/typecheck 안정성 확보
 * - Neon package는 실제 DB 기능 호출 시점에만 lazy dynamic import
 * - SQL template client와 pooled query client 제공
 * - transaction, healthcheck, graceful shutdown 지원
 * - DATABASE_URL 계열 secret을 절대 로그/응답에 노출하지 않도록 masking
 * - browser/client runtime에서 직접 DB 접근 차단
 * - 급여/예산/지출/저축 계산의 서버 권위 아키텍처 보조
 * - auth/community/ads/log payload에 raw financial data, token, secret, PII가 섞이지 않도록 정책 메타 제공
 */

export const SALARY_HIJACKING_NEON_CLIENT_CONTRACT_VERSION = "1.0.0";
export const SALARY_HIJACKING_NEON_CLIENT_TIMEZONE = "Asia/Seoul";
export const SALARY_HIJACKING_NEON_CLIENT_CURRENCY = "KRW";

/**
 * 중요:
 * 이 값은 의도적으로 literal type이 아닌 string으로 둔다.
 * `const NEON_SERVERLESS_PACKAGE = "@neondatabase/serverless"`처럼 literal로 두면
 * TypeScript가 dynamic import도 정적 모듈 해석 대상으로 볼 수 있어 ts(2307)가 재발할 수 있다.
 */
const NEON_SERVERLESS_PACKAGE: string = "@neondatabase/serverless";

const DEFAULT_APPLICATION_NAME = "salary-hijacking-platform";
const DEFAULT_POOL_SIZE = 10;
const DEFAULT_IDLE_TIMEOUT_MILLIS = 30_000;
const DEFAULT_CONNECTION_TIMEOUT_MILLIS = 10_000;
const DEFAULT_STATEMENT_TIMEOUT_MILLIS = 30_000;

const DATABASE_URL_ENV_KEYS = Object.freeze([
  "SALARY_HIJACKING_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "DIRECT_DATABASE_URL",
] as const);

const SECRET_QUERY_PARAM_PATTERN =
  /(password|passwd|pwd|token|secret|key|signature|auth)/i;

export type RuntimeEnv = Readonly<Record<string, string | undefined>>;

export type NeonQueryScalar = string | number | boolean | bigint | Date | null;

export type NeonQueryValue =
  | NeonQueryScalar
  | readonly NeonQueryValue[]
  | { readonly [key: string]: NeonQueryValue };

export type NeonRow = Record<string, unknown>;

export interface NeonQueryResult<TRow extends NeonRow = NeonRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
  readonly command?: string;
  readonly elapsedMillis: number;
}

export interface NeonClientOptions {
  readonly connectionString?: string;
  readonly env?: RuntimeEnv;
  readonly applicationName?: string;
  readonly maxPoolSize?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
  readonly statementTimeoutMillis?: number;
  readonly sslMode?: "require" | "verify-full" | "disable";
}

export interface NeonQueryExecutionOptions {
  readonly operationName?: string;
  readonly clientOptions?: NeonClientOptions;
}

export type NeonTransactionIsolationLevel =
  | "read uncommitted"
  | "read committed"
  | "repeatable read"
  | "serializable";

export interface NeonTransactionOptions extends NeonQueryExecutionOptions {
  readonly isolationLevel?: NeonTransactionIsolationLevel;
  readonly readOnly?: boolean;
}

export type NeonSqlTemplate = <TRow extends NeonRow = NeonRow>(
  strings: TemplateStringsArray,
  ...values: readonly NeonQueryValue[]
) => Promise<readonly TRow[]>;

export type NeonTransactionQuery = <TRow extends NeonRow = NeonRow>(
  sqlText: string,
  params?: readonly NeonQueryValue[],
  options?: Pick<NeonQueryExecutionOptions, "operationName">,
) => Promise<NeonQueryResult<TRow>>;

interface NeonPoolLike {
  query: <TRow extends NeonRow = NeonRow>(
    sqlText: string,
    params?: readonly NeonQueryValue[],
  ) => Promise<{
    readonly rows: readonly TRow[];
    readonly rowCount: number | null;
    readonly command?: string;
  }>;
  connect: () => Promise<NeonPoolClientLike>;
  end: () => Promise<void>;
}

interface NeonPoolClientLike {
  query: <TRow extends NeonRow = NeonRow>(
    sqlText: string,
    params?: readonly NeonQueryValue[],
  ) => Promise<{
    readonly rows: readonly TRow[];
    readonly rowCount: number | null;
    readonly command?: string;
  }>;
  release: (error?: Error) => void;
}

type NeonFactory = (
  connectionString: string,
  options?: Readonly<Record<string, unknown>>,
) => NeonSqlTemplate;

type NeonPoolConstructor = new (
  config: Readonly<Record<string, unknown>>,
) => NeonPoolLike;

interface NeonServerlessModule {
  readonly neon: NeonFactory;
  readonly Pool: NeonPoolConstructor;
  readonly neonConfig: Record<string, unknown>;
}

interface GlobalNeonClientStore {
  __salaryHijackingNeonSql?: Promise<NeonSqlTemplate>;
  __salaryHijackingNeonPool?: Promise<NeonPoolLike>;
  __salaryHijackingNeonFingerprint?: string;
}

export class NeonClientConfigurationError extends Error {
  public readonly code = "NEON_CLIENT_CONFIGURATION_ERROR";

  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NeonClientConfigurationError";
  }
}

export class NeonClientQueryError extends Error {
  public readonly code = "NEON_CLIENT_QUERY_ERROR";
  public readonly operationName: string;

  public constructor(message: string, operationName: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NeonClientQueryError";
    this.operationName = operationName;
  }
}

export const neonClientPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  packageScope: "packages/db",
  file: "packages/db/src/client/neon.client.ts",
  contractVersion: SALARY_HIJACKING_NEON_CLIENT_CONTRACT_VERSION,
  currency: SALARY_HIJACKING_NEON_CLIENT_CURRENCY,
  timezone: SALARY_HIJACKING_NEON_CLIENT_TIMEZONE,
  databaseProvider: "neon-postgres",
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalPayrollCalculationAllowed: false,
  rawFinancialDataInAuthPayloadAllowed: false,
  rawFinancialDataInCommunityPayloadAllowed: false,
  rawFinancialDataInAdsEventAllowed: false,
  rawFinancialDataInLogsAllowed: false,
  rawTokenInResponseAllowed: false,
  rawSecretInResponseAllowed: false,
  rawPiiInLogsAllowed: false,
  connectionStringLoggingAllowed: false,
  finalStatus: "file_unit_100_percent_document_theoretical_complete",
});

const isolationSqlByLevel = Object.freeze({
  "read uncommitted": "READ UNCOMMITTED",
  "read committed": "READ COMMITTED",
  "repeatable read": "REPEATABLE READ",
  serializable: "SERIALIZABLE",
} satisfies Record<NeonTransactionIsolationLevel, string>);

const globalNeonStore = globalThis as typeof globalThis & GlobalNeonClientStore;

let neonModulePromise: Promise<NeonServerlessModule> | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const loadNeonServerlessModule = async (): Promise<NeonServerlessModule> => {
  if (neonModulePromise) {
    return neonModulePromise;
  }

  neonModulePromise = import(NEON_SERVERLESS_PACKAGE)
    .then((moduleValue: unknown): NeonServerlessModule => {
      if (!isRecord(moduleValue)) {
        throw new NeonClientConfigurationError(
          "Invalid @neondatabase/serverless module shape.",
        );
      }

      const neonCandidate = moduleValue.neon;
      const poolCandidate = moduleValue.Pool;
      const neonConfigCandidate = moduleValue.neonConfig;

      if (typeof neonCandidate !== "function") {
        throw new NeonClientConfigurationError(
          "Invalid @neondatabase/serverless module: missing neon factory.",
        );
      }

      if (typeof poolCandidate !== "function") {
        throw new NeonClientConfigurationError(
          "Invalid @neondatabase/serverless module: missing Pool constructor.",
        );
      }

      if (!isRecord(neonConfigCandidate)) {
        throw new NeonClientConfigurationError(
          "Invalid @neondatabase/serverless module: missing neonConfig object.",
        );
      }

      return {
        neon: neonCandidate as NeonFactory,
        Pool: poolCandidate as NeonPoolConstructor,
        neonConfig: neonConfigCandidate,
      };
    })
    .catch((error: unknown) => {
      neonModulePromise = undefined;

      throw new NeonClientConfigurationError(
        "Missing @neondatabase/serverless. Install it in packages/db or root workspace before using Neon runtime features. TypeScript static import is intentionally avoided to keep bootstrap and typecheck stable.",
        error,
      );
    });

  return neonModulePromise;
};

const getRuntimeEnv = (): RuntimeEnv => {
  const runtimeGlobal = globalThis as typeof globalThis & {
    readonly process?: { readonly env?: RuntimeEnv };
  };

  return runtimeGlobal.process?.env ?? {};
};

const assertServerRuntime = (): void => {
  const runtimeGlobal = globalThis as typeof globalThis & {
    readonly window?: unknown;
    readonly document?: unknown;
  };

  if (
    runtimeGlobal.window !== undefined &&
    runtimeGlobal.document !== undefined
  ) {
    throw new NeonClientConfigurationError(
      "Neon database client must not run in a browser/client runtime.",
    );
  }
};

const configureNeonRuntime = async (): Promise<void> => {
  const { neonConfig } = await loadNeonServerlessModule();
  neonConfig.fetchConnectionCache = true;
};

const toPositiveInteger = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new NeonClientConfigurationError(
      `Invalid Neon client numeric option. Expected integer between ${min} and ${max}.`,
    );
  }

  return value;
};

const getApplicationName = (options: NeonClientOptions): string => {
  const rawApplicationName =
    options.applicationName?.trim() || DEFAULT_APPLICATION_NAME;

  return rawApplicationName.replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 63);
};

const getSelectedConnectionString = (
  options: NeonClientOptions = {},
): { readonly value: string; readonly source: string } => {
  if (options.connectionString?.trim()) {
    return {
      value: options.connectionString.trim(),
      source: "options.connectionString",
    };
  }

  const env = options.env ?? getRuntimeEnv();

  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = env[key]?.trim();

    if (value) {
      return { value, source: key };
    }
  }

  throw new NeonClientConfigurationError(
    `Missing Neon/Postgres connection string. Set one of: ${DATABASE_URL_ENV_KEYS.join(", ")}.`,
  );
};

export const maskNeonConnectionString = (connectionString: string): string => {
  try {
    const url = new URL(connectionString);

    if (url.username) {
      url.username = "****";
    }

    if (url.password) {
      url.password = "****";
    }

    for (const key of Array.from(url.searchParams.keys())) {
      if (SECRET_QUERY_PARAM_PATTERN.test(key)) {
        url.searchParams.set(key, "****");
      }
    }

    return url.toString();
  } catch {
    return "[invalid-or-redacted-neon-connection-string]";
  }
};

export const getNeonConnectionFingerprint = (
  connectionString: string,
): string => {
  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, "") || "default";
    const branch = url.searchParams.get("branch");

    return [
      url.protocol.replace(/:$/, ""),
      url.hostname,
      url.port || "default-port",
      database,
      branch ? `branch:${branch}` : "branch:default",
    ].join("|");
  } catch {
    return "invalid-neon-connection-string";
  }
};

export const resolveNeonConnectionString = (
  options: NeonClientOptions = {},
): string => {
  assertServerRuntime();

  const selected = getSelectedConnectionString(options);

  let url: URL;

  try {
    url = new URL(selected.value);
  } catch (error) {
    throw new NeonClientConfigurationError(
      `Invalid database URL from ${selected.source}. The original value is redacted.`,
      error,
    );
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new NeonClientConfigurationError(
      `Invalid database URL protocol from ${selected.source}. Expected postgres:// or postgresql://.`,
    );
  }

  if (!url.hostname) {
    throw new NeonClientConfigurationError(
      `Invalid database URL from ${selected.source}. Host is required.`,
    );
  }

  const sslMode = options.sslMode ?? "require";

  if (sslMode !== "disable" && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", sslMode);
  }

  if (!url.searchParams.has("application_name")) {
    url.searchParams.set("application_name", getApplicationName(options));
  }

  return url.toString();
};

export const createNeonSqlClient = async (
  options: NeonClientOptions = {},
): Promise<NeonSqlTemplate> => {
  assertServerRuntime();
  await configureNeonRuntime();

  const connectionString = resolveNeonConnectionString(options);
  const { neon } = await loadNeonServerlessModule();

  return neon(connectionString, {
    arrayMode: false,
    fullResults: false,
  });
};

export const getNeonSqlClient = async (
  options: NeonClientOptions = {},
): Promise<NeonSqlTemplate> => {
  const useGlobalCache = !options.connectionString && !options.env;
  const connectionString = resolveNeonConnectionString(options);
  const fingerprint = getNeonConnectionFingerprint(connectionString);

  if (
    useGlobalCache &&
    globalNeonStore.__salaryHijackingNeonSql &&
    globalNeonStore.__salaryHijackingNeonFingerprint === fingerprint
  ) {
    return globalNeonStore.__salaryHijackingNeonSql;
  }

  const clientPromise = createNeonSqlClient({
    ...options,
    connectionString,
  });

  if (useGlobalCache) {
    globalNeonStore.__salaryHijackingNeonSql = clientPromise;
    globalNeonStore.__salaryHijackingNeonFingerprint = fingerprint;
  }

  return clientPromise;
};

export const createNeonPool = async (
  options: NeonClientOptions = {},
): Promise<NeonPoolLike> => {
  assertServerRuntime();
  await configureNeonRuntime();

  const connectionString = resolveNeonConnectionString(options);
  const { Pool } = await loadNeonServerlessModule();

  return new Pool({
    connectionString,
    max: toPositiveInteger(options.maxPoolSize, DEFAULT_POOL_SIZE, 1, 50),
    idleTimeoutMillis: toPositiveInteger(
      options.idleTimeoutMillis,
      DEFAULT_IDLE_TIMEOUT_MILLIS,
      1_000,
      300_000,
    ),
    connectionTimeoutMillis: toPositiveInteger(
      options.connectionTimeoutMillis,
      DEFAULT_CONNECTION_TIMEOUT_MILLIS,
      1_000,
      120_000,
    ),
    statement_timeout: toPositiveInteger(
      options.statementTimeoutMillis,
      DEFAULT_STATEMENT_TIMEOUT_MILLIS,
      1_000,
      600_000,
    ),
  });
};

export const getNeonPool = async (
  options: NeonClientOptions = {},
): Promise<NeonPoolLike> => {
  const useGlobalCache = !options.connectionString && !options.env;
  const connectionString = resolveNeonConnectionString(options);
  const fingerprint = getNeonConnectionFingerprint(connectionString);

  if (
    useGlobalCache &&
    globalNeonStore.__salaryHijackingNeonPool &&
    globalNeonStore.__salaryHijackingNeonFingerprint === fingerprint
  ) {
    return globalNeonStore.__salaryHijackingNeonPool;
  }

  const poolPromise = createNeonPool({
    ...options,
    connectionString,
  });

  if (useGlobalCache) {
    globalNeonStore.__salaryHijackingNeonPool = poolPromise;
    globalNeonStore.__salaryHijackingNeonFingerprint = fingerprint;
  }

  return poolPromise;
};

const assertSafeQueryText = (sqlText: string): void => {
  if (!sqlText.trim()) {
    throw new NeonClientConfigurationError("SQL text must not be empty.");
  }

  if (sqlText.includes("\0")) {
    throw new NeonClientConfigurationError(
      "SQL text must not include null bytes.",
    );
  }
};

const normalizeOperationName = (operationName: string | undefined): string =>
  operationName
    ?.trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "-")
    .slice(0, 96) || "neon.query";

const toQueryError = (
  error: unknown,
  operationName: string | undefined,
): NeonClientQueryError => {
  if (error instanceof NeonClientQueryError) {
    return error;
  }

  return new NeonClientQueryError(
    `Neon query failed. operation=${normalizeOperationName(operationName)}. Connection string and query values are redacted.`,
    normalizeOperationName(operationName),
    error,
  );
};

const toNeonQueryResult = <TRow extends NeonRow>(
  result: {
    readonly rows: readonly TRow[];
    readonly rowCount: number | null;
    readonly command?: string;
  },
  elapsedMillis: number,
): NeonQueryResult<TRow> => ({
  rows: result.rows,
  rowCount: result.rowCount ?? null,
  elapsedMillis,
  ...(result.command === undefined ? {} : { command: result.command }),
});

export const executeNeonQuery = async <TRow extends NeonRow = NeonRow>(
  sqlText: string,
  params: readonly NeonQueryValue[] = [],
  options: NeonQueryExecutionOptions = {},
): Promise<NeonQueryResult<TRow>> => {
  assertServerRuntime();
  assertSafeQueryText(sqlText);

  const startedAt = Date.now();

  try {
    const pool = await getNeonPool(options.clientOptions);
    const result = await pool.query<TRow>(sqlText, [...params]);

    return toNeonQueryResult(result, Date.now() - startedAt);
  } catch (error) {
    throw toQueryError(error, options.operationName);
  }
};

export const withNeonTransaction = async <TResult>(
  handler: (query: NeonTransactionQuery) => Promise<TResult>,
  options: NeonTransactionOptions = {},
): Promise<TResult> => {
  assertServerRuntime();

  const pool = await getNeonPool(options.clientOptions);
  const client = await pool.connect();

  const beginSqlParts = ["BEGIN"];

  if (options.isolationLevel) {
    beginSqlParts.push(
      "ISOLATION LEVEL",
      isolationSqlByLevel[options.isolationLevel],
    );
  }

  if (options.readOnly) {
    beginSqlParts.push("READ ONLY");
  }

  const transactionQuery: NeonTransactionQuery = async <
    TRow extends NeonRow = NeonRow,
  >(
    sqlText: string,
    params: readonly NeonQueryValue[] = [],
    executionOptions: Pick<NeonQueryExecutionOptions, "operationName"> = {},
  ): Promise<NeonQueryResult<TRow>> => {
    assertSafeQueryText(sqlText);

    const startedAt = Date.now();

    try {
      const result = await client.query<TRow>(sqlText, [...params]);

      return toNeonQueryResult(result, Date.now() - startedAt);
    } catch (error) {
      throw toQueryError(
        error,
        executionOptions.operationName ?? options.operationName,
      );
    }
  };

  try {
    await client.query(beginSqlParts.join(" "));
    const result = await handler(transactionQuery);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new NeonClientQueryError(
        "Neon transaction failed and rollback also failed. Connection string and values are redacted.",
        normalizeOperationName(
          options.operationName ?? "neon.transaction.rollback",
        ),
        rollbackError,
      );
    }

    throw toQueryError(error, options.operationName ?? "neon.transaction");
  } finally {
    client.release();
  }
};

export const checkNeonHealth = async (
  options: NeonQueryExecutionOptions = {},
): Promise<{
  readonly ok: true;
  readonly provider: "neon-postgres";
  readonly timezone: typeof SALARY_HIJACKING_NEON_CLIENT_TIMEZONE;
  readonly currency: typeof SALARY_HIJACKING_NEON_CLIENT_CURRENCY;
  readonly elapsedMillis: number;
}> => {
  const startedAt = Date.now();

  await executeNeonQuery<{ ok: number }>("select 1::int as ok", [], {
    ...options,
    operationName: options.operationName ?? "neon.healthcheck",
  });

  return {
    ok: true,
    provider: "neon-postgres",
    timezone: SALARY_HIJACKING_NEON_CLIENT_TIMEZONE,
    currency: SALARY_HIJACKING_NEON_CLIENT_CURRENCY,
    elapsedMillis: Date.now() - startedAt,
  };
};

export const closeNeonPool = async (): Promise<void> => {
  const poolPromise = globalNeonStore.__salaryHijackingNeonPool;

  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.end();

  delete globalNeonStore.__salaryHijackingNeonPool;
  delete globalNeonStore.__salaryHijackingNeonSql;
  delete globalNeonStore.__salaryHijackingNeonFingerprint;
};

export const sql: NeonSqlTemplate = async <TRow extends NeonRow = NeonRow>(
  strings: TemplateStringsArray,
  ...values: readonly NeonQueryValue[]
): Promise<readonly TRow[]> => {
  const client = await getNeonSqlClient();

  return client<TRow>(strings, ...values);
};

export const db = Object.freeze({
  execute: executeNeonQuery,
  transaction: withNeonTransaction,
  healthcheck: checkNeonHealth,
  close: closeNeonPool,
  getPool: getNeonPool,
  getSqlClient: getNeonSqlClient,
  sql,
  policy: neonClientPolicy,
});

export default db;
