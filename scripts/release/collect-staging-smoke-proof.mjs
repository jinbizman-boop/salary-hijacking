import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_DATABASE_EVIDENCE_PATH = "release/database-evidence.json";
const DEFAULT_OUTPUT_PATH = "release/database-command-proof.local.json";
const DEFAULT_EXPECTED_PROJECT_HINT = "salary-hijacking";
const DEFAULT_API_WRANGLER_PATH = "services/api/wrangler.toml";
const DEFAULT_ADMIN_WRANGLER_PATH = "apps/admin/wrangler.jsonc";

const DEFAULT_API_SMOKE_PATH = "/api/v1/ready";
const DEFAULT_ADMIN_SMOKE_PATH = "/admin/api/v1/ready";
const DEFAULT_SERVER_AUTHORITY_SMOKE_PATH =
  "/api/v1/public/server-authority-smoke";
const DEFAULT_PRIVACY_SMOKE_PATH = "/api/v1/public/server-authority-smoke";
const DEFAULT_MOBILE_BOOTSTRAP_PATH = "/api/v1/mobile/bootstrap";
const DEFAULT_PAYROLL_PATH = "/api/v1/payroll";
const DEFAULT_DAILY_BUDGETS_PATH = "/api/v1/daily-budgets";
const DEFAULT_VARIABLE_EXPENSES_PATH = "/api/v1/variable-expenses";

const RAW_SECRET_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|ghp_[a-z0-9_]{16,}|xox[baprs]-[a-z0-9-]+)/i;

const RAW_RESPONSE_DATA_PATTERN =
  /("?)(salaryAmount|salary|incomeAmount|income|expenseAmount|expense|savingsAmount|savings|hijackAmount|hijack|accountNumber|cardNumber|loanAmount|residentNumber|phoneNumber|email|authToken|accessToken|refreshToken|sessionToken|pushToken|rawDeviceIdentifier|deviceIdentifier|deviceId)\1\s*[:=]/i;

const EMAIL_VALUE_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const JWT_VALUE_PATTERN =
  /\beyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\b/;

const SENSITIVE_RESPONSE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-refresh-token",
  "x-session-token",
]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveFromRoot = (rootDir, filePath) =>
  path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);

const readJsonIfPresent = (rootDir, filePath) => {
  const absolutePath = resolveFromRoot(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(
    fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, ""),
  );
};

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const section = (source, key) =>
  isPlainObject(source?.[key]) ? source[key] : {};

const commandResult = ({
  verified = false,
  environment = "staging",
  exitCode,
  noRawPayloadStored,
  dryRun,
  syntheticDataOnly,
  reason,
}) => {
  const item = {
    verified: verified === true,
    environment,
    exitCode: typeof exitCode === "number" ? exitCode : verified ? 0 : 1,
  };
  if (typeof noRawPayloadStored === "boolean") {
    item.noRawPayloadStored = noRawPayloadStored;
  }
  if (typeof dryRun === "boolean") item.dryRun = dryRun;
  if (typeof syntheticDataOnly === "boolean") {
    item.syntheticDataOnly = syntheticDataOnly;
  }
  if (typeof reason === "string" && reason.trim()) {
    item.reason = reason.trim();
  }
  return item;
};

const normalizeSmokePath = (value, fallback) => {
  const rawValue =
    typeof value === "string" && value.trim() ? value.trim() : fallback;
  return rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
};

const normalizeHttpsBaseUrl = (value, label) => {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = new URL(value.trim());
  if (url.protocol !== "https:") {
    throw new Error(`${label} must use https for staging smoke proof`);
  }
  if (url.username || url.password) {
    throw new Error(`${label} must not include credentials`);
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/+$/, "");
};

const stagingApiBaseUrlFromWorkerConfig = (rootDir) => {
  const absolutePath = resolveFromRoot(rootDir, DEFAULT_API_WRANGLER_PATH);
  if (!fs.existsSync(absolutePath)) return "";
  const text = fs.readFileSync(absolutePath, "utf8");
  const stagingVarsMatch = text.match(
    /\[env\.staging\.vars\]([\s\S]*?)(?:\n\[|$)/,
  );
  const stagingVars = stagingVarsMatch?.[1] ?? "";
  const baseUrlMatch = stagingVars.match(
    /^\s*APP_PUBLIC_BASE_URL\s*=\s*"([^"]+)"\s*$/m,
  );
  return baseUrlMatch?.[1]?.trim() ?? "";
};

const stagingAdminBaseUrlFromWorkerConfig = (rootDir) => {
  const absolutePath = resolveFromRoot(rootDir, DEFAULT_ADMIN_WRANGLER_PATH);
  if (!fs.existsSync(absolutePath)) return "";
  const text = fs.readFileSync(absolutePath, "utf8");
  const stagingEnvMatch = text.match(
    /"staging"\s*:\s*\{([\s\S]*?)(?:\n\s*\}\s*,?\s*"production"|\n\s*\}\s*\}\s*,?\s*\})/,
  );
  const stagingEnv = stagingEnvMatch?.[1] ?? text;
  const baseUrlMatch = stagingEnv.match(
    /"APP_PUBLIC_BASE_URL"\s*:\s*"([^"]+)"/,
  );
  return baseUrlMatch?.[1]?.trim() ?? "";
};

const joinUrl = (baseUrl, smokePath) => `${baseUrl}${smokePath}`;

const responseHasSensitiveRawData = (text) =>
  RAW_SECRET_PATTERN.test(text) ||
  RAW_RESPONSE_DATA_PATTERN.test(text) ||
  EMAIL_VALUE_PATTERN.test(text) ||
  JWT_VALUE_PATTERN.test(text);

const responseHeadersHaveSensitiveRawData = (headers) => {
  for (const [key, value] of headers.entries()) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_RESPONSE_HEADERS.has(normalizedKey)) return true;
    if (
      RAW_SECRET_PATTERN.test(value) ||
      EMAIL_VALUE_PATTERN.test(value) ||
      JWT_VALUE_PATTERN.test(value)
    ) {
      return true;
    }
  }
  return false;
};

const headerValue = (headers, key) =>
  headers.get(key)?.trim().toLowerCase() ?? "";

const hasServerAuthorityProof = (headers, text) => {
  const serverAuthorityDeclared =
    headerValue(headers, "x-server-authority") === "true" ||
    /"?serverAuthorityEnabled"?\s*:\s*true/i.test(text) ||
    /"?serverAuthority"?\s*:\s*true/i.test(text);
  const syntheticCalculationVerified =
    /"?syntheticKrwIntegerCalculation"?\s*:\s*\{/i.test(text) &&
    /"?verified"?\s*:\s*true/i.test(text) &&
    /"?sourceOfTruth"?\s*:\s*"\/api\/v1"/i.test(text) &&
    /"?krwIntegerOnly"?\s*:\s*true/i.test(text) &&
    /"?negativeMoneyRejected"?\s*:\s*true/i.test(text) &&
    /"?fractionalMoneyRejected"?\s*:\s*true/i.test(text) &&
    /"?dailyBudgetDistributionVerified"?\s*:\s*true/i.test(text) &&
    /"?paycheckProtectionFormulaVerified"?\s*:\s*true/i.test(text) &&
    /"?rawAmountsReturned"?\s*:\s*false/i.test(text);

  return serverAuthorityDeclared && syntheticCalculationVerified;
};

const hasPrivacyProof = (headers, text) => {
  const financialHeader =
    headerValue(headers, "x-financial-raw-data-exposed") === "false" ||
    headerValue(headers, "x-raw-financial-data-exposed") === "false";
  const personalHeader =
    headerValue(headers, "x-raw-personal-data-exposed") === "false" ||
    /"?rawPersonalDataExposed"?\s*:\s*false/i.test(text);
  const pushHeader =
    headerValue(headers, "x-raw-push-token-exposed") === "false" ||
    /"?rawPushTokenExposed"?\s*:\s*false/i.test(text);
  const adsHeader =
    headerValue(headers, "x-ad-financial-targeting") === "separated" ||
    headerValue(headers, "x-ad-financial-targeting-used") === "false" ||
    /"?adsFinancialTargetingUsed"?\s*:\s*false/i.test(text);
  const bodyFinancial =
    /"?rawFinancialDataExposed"?\s*:\s*false/i.test(text) || financialHeader;

  return bodyFinancial && personalHeader && pushHeader && adsHeader;
};

const safeFetchText = async ({ url, fetcher, bearer, timeoutMs }) => {
  const headers = new Headers({
    accept: "application/json,text/plain;q=0.8,*/*;q=0.2",
    "cache-control": "no-store",
    "x-release-smoke-proof": "no-secret-boolean-only",
  });
  if (bearer) headers.set("authorization", `Bearer ${bearer}`);

  const init = {
    method: "GET",
    headers,
  };
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    init.signal = AbortSignal.timeout(timeoutMs);
  }

  const response = await fetcher(url, init);
  const text = await response.text();
  const responseHeaders =
    response.headers instanceof Headers
      ? response.headers
      : new Headers(response.headers ?? {});
  return {
    ok: response.ok === true,
    status: response.status,
    headers: responseHeaders,
    text,
    safe:
      !responseHasSensitiveRawData(text) &&
      !responseHeadersHaveSensitiveRawData(responseHeaders),
  };
};

const safeFetchJson = async ({
  url,
  fetcher,
  bearer,
  timeoutMs,
  method = "GET",
  body,
}) => {
  const headers = new Headers({
    accept: "application/json,text/plain;q=0.8,*/*;q=0.2",
    "cache-control": "no-store",
    "x-release-smoke-proof": "no-secret-boolean-only",
  });
  if (bearer) headers.set("authorization", `Bearer ${bearer}`);
  const init = { method, headers };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body);
  }
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    init.signal = AbortSignal.timeout(timeoutMs);
  }

  const response = await fetcher(url, init);
  const text = await response.text();
  const responseHeaders =
    response.headers instanceof Headers
      ? response.headers
      : new Headers(response.headers ?? {});
  const safe =
    !responseHasSensitiveRawData(text) &&
    !responseHeadersHaveSensitiveRawData(responseHeaders);
  const parsed = text.trim() ? JSON.parse(text) : {};
  return {
    ok: response.ok === true,
    status: response.status,
    headers: responseHeaders,
    safe,
    json: isPlainObject(parsed) ? parsed : {},
  };
};

const smokeCommand = async ({
  baseUrl,
  smokePath,
  fetcher,
  bearer,
  timeoutMs,
  predicate = () => true,
}) => {
  if (!baseUrl) {
    return commandResult({
      verified: false,
      environment: "staging",
      noRawPayloadStored: true,
      reason: "missing staging base URL",
    });
  }

  try {
    const response = await safeFetchText({
      url: joinUrl(baseUrl, smokePath),
      fetcher,
      bearer,
      timeoutMs,
    });
    const verified =
      response.ok === true &&
      response.safe === true &&
      predicate(response.headers, response.text);
    const reason = response.safe
      ? response.ok
        ? verified
          ? ""
          : "staging smoke predicate did not verify"
        : `staging smoke returned HTTP ${response.status}`
      : "staging smoke response contained sensitive data";
    return commandResult({
      verified,
      environment: "staging",
      noRawPayloadStored: true,
      ...(reason ? { reason } : {}),
    });
  } catch (error) {
    return commandResult({
      verified: false,
      environment: "staging",
      noRawPayloadStored: true,
      reason: classifyFetchFailure(error),
    });
  }
};

const dataRecord = (response) =>
  isPlainObject(response?.json?.data) ? response.json.data : {};

const stringFrom = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const boolValue = (value) => value === true;

const commandWithReason = ({
  verified = false,
  reason = "",
  noRawPayloadStored = true,
}) => ({
  ...commandResult({
    verified,
    environment: "staging",
    noRawPayloadStored,
  }),
  ...(reason ? { reason } : {}),
});

const classifyFetchFailure = (error) => {
  const text = `${error?.code ?? ""} ${error?.cause?.code ?? ""} ${error?.message ?? ""}`;
  if (/\b(?:ENOTFOUND|EAI_AGAIN|DNS)\b/iu.test(text)) {
    return "DNS_UNRESOLVED";
  }
  if (/\b(?:ETIMEDOUT|TIMEOUT|ABORT_ERR)\b/iu.test(text)) {
    return "REQUEST_TIMEOUT";
  }
  if (/\b(?:ECONNREFUSED|ECONNRESET|ECONNABORTED)\b/iu.test(text)) {
    return "CONNECTION_FAILED";
  }
  if (/\b(?:CERT|TLS|SSL)\b/iu.test(text)) {
    return "TLS_VALIDATION_FAILED";
  }
  return "STAGING_REQUEST_FAILED";
};

const persistenceSmokeCommand = async ({
  baseUrl,
  fetcher,
  bearer,
  timeoutMs,
  now,
}) => {
  if (!baseUrl) {
    return commandWithReason({ reason: "missing STAGING_API_BASE_URL" });
  }
  if (!bearer) {
    return commandWithReason({
      reason: "missing STAGING_PERSISTENCE_E2E_BEARER",
    });
  }

  const observed = now();
  const date = observed.toISOString().slice(0, 10);
  const runId = observed
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  try {
    const bootstrap = await safeFetchJson({
      url: joinUrl(baseUrl, DEFAULT_MOBILE_BOOTSTRAP_PATH),
      fetcher,
      bearer,
      timeoutMs,
    });
    const auth = isPlainObject(dataRecord(bootstrap).auth)
      ? dataRecord(bootstrap).auth
      : {};
    if (
      !bootstrap.ok ||
      !bootstrap.safe ||
      dataRecord(bootstrap).serverAuthority !== true ||
      auth.authenticated !== true
    ) {
      return commandWithReason({
        reason: "authenticated mobile bootstrap did not verify",
      });
    }

    const createPlan = await safeFetchJson({
      url: joinUrl(baseUrl, DEFAULT_PAYROLL_PATH),
      fetcher,
      bearer,
      timeoutMs,
      method: "POST",
      body: {
        title: `QA persistence ${runId}`,
        incomeType: "SALARY",
        payrollCycle: "MONTHLY",
        payrollAmountMinor: 2700000,
        payday: 25,
        firstPayrollDate: date,
        periodStartDate: date,
        periodEndDate: date,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
        variableExpenseReserveMinor: 0,
        emergencyBufferMinor: 0,
        carryOverAmountMinor: 0,
        reservePolicy: "DAILY_EQUAL_SPLIT",
        memo: `qa-persistence-${runId}`,
      },
    });
    const planId = stringFrom(dataRecord(createPlan).planId);
    if (!createPlan.ok || !createPlan.safe || !planId) {
      return commandWithReason({ reason: "payroll plan create failed" });
    }

    const readPlan = await safeFetchJson({
      url: joinUrl(baseUrl, `${DEFAULT_PAYROLL_PATH}/${planId}`),
      fetcher,
      bearer,
      timeoutMs,
    });
    if (
      !readPlan.ok ||
      !readPlan.safe ||
      stringFrom(dataRecord(readPlan).planId) !== planId ||
      !boolValue(dataRecord(readPlan).serverAuthority)
    ) {
      return commandWithReason({
        reason: "payroll plan read-after-write failed",
      });
    }

    const createBudget = await safeFetchJson({
      url: joinUrl(baseUrl, DEFAULT_DAILY_BUDGETS_PATH),
      fetcher,
      bearer,
      timeoutMs,
      method: "POST",
      body: {
        budgetDate: date,
        plannedAmountMinor: 42000,
        memo: `qa-persistence-${runId}`,
        source: "MANUAL",
      },
    });
    const budgetId = stringFrom(dataRecord(createBudget).budgetId);
    if (!createBudget.ok || !createBudget.safe || !budgetId) {
      return commandWithReason({ reason: "daily budget create failed" });
    }

    const readBudget = await safeFetchJson({
      url: joinUrl(baseUrl, `${DEFAULT_DAILY_BUDGETS_PATH}/date/${date}`),
      fetcher,
      bearer,
      timeoutMs,
    });
    if (
      !readBudget.ok ||
      !readBudget.safe ||
      stringFrom(dataRecord(readBudget).budgetId) !== budgetId
    ) {
      return commandWithReason({
        reason: "daily budget read-after-write failed",
      });
    }

    const createExpense = await safeFetchJson({
      url: joinUrl(baseUrl, DEFAULT_VARIABLE_EXPENSES_PATH),
      fetcher,
      bearer,
      timeoutMs,
      method: "POST",
      body: {
        amountMinor: 1300,
        category: "CAFE",
        title: `QA expense ${runId}`,
        spentAt: observed.toISOString(),
        paymentMethod: "CARD",
        merchantName: "QA",
        memo: `qa-persistence-${runId}`,
        tags: ["qa"],
        receiptAttachmentId: null,
        dailyBudgetId: budgetId,
        source: "MANUAL",
        idempotencyKey: `qa-persistence-${runId}`,
      },
    });
    const expenseId = stringFrom(dataRecord(createExpense).expenseId);
    if (!createExpense.ok || !createExpense.safe || !expenseId) {
      return commandWithReason({ reason: "variable expense create failed" });
    }

    const readExpense = await safeFetchJson({
      url: joinUrl(baseUrl, `${DEFAULT_VARIABLE_EXPENSES_PATH}/${expenseId}`),
      fetcher,
      bearer,
      timeoutMs,
    });
    if (
      !readExpense.ok ||
      !readExpense.safe ||
      stringFrom(dataRecord(readExpense).expenseId) !== expenseId ||
      stringFrom(dataRecord(readExpense).dailyBudgetId) !== budgetId
    ) {
      return commandWithReason({
        reason: "variable expense read-after-write failed",
      });
    }

    const home = await safeFetchJson({
      url: joinUrl(baseUrl, `${DEFAULT_PAYROLL_PATH}/home`),
      fetcher,
      bearer,
      timeoutMs,
    });
    if (
      !home.ok ||
      !home.safe ||
      !boolValue(dataRecord(home).serverAuthority) ||
      dataRecord(home).financialRawDataExposed === true
    ) {
      return commandWithReason({
        reason: "salary home synchronization failed",
      });
    }

    return commandWithReason({ verified: true });
  } catch (error) {
    return commandWithReason({
      reason: classifyFetchFailure(error),
    });
  }
};

const buildProofBaseFromEvidence = (evidence) => {
  const neon = section(evidence, "neon");
  const migrations = section(evidence, "migrations");
  const seeds = section(evidence, "seeds");
  const rollback = section(evidence, "rollback");

  return {
    schemaVersion: 1,
    secretsRedacted: true,
    containsSecretValues: false,
    neon: {
      expectedProjectHint:
        typeof neon.expectedProjectHint === "string" && neon.expectedProjectHint
          ? neon.expectedProjectHint
          : DEFAULT_EXPECTED_PROJECT_HINT,
      projectMatched: boolFrom(neon, "projectMatched"),
      mainBranchReady: boolFrom(neon, "mainBranchReady"),
      stagingBranchReady: boolFrom(neon, "stagingBranchReady"),
    },
    commands: {
      migrationValidation: commandResult({
        verified: boolFrom(migrations, "migrationValidationVerified"),
        environment: "local-safe",
      }),
      stagingMigration: commandResult({
        verified: boolFrom(migrations, "stagingMigrationExecuted"),
        environment: "staging",
      }),
      productionMigrationDryRun: commandResult({
        verified: boolFrom(migrations, "productionMigrationDryRunVerified"),
        environment: "production",
        dryRun: true,
      }),
      stagingSeed: commandResult({
        verified: boolFrom(seeds, "stagingSeedExecuted"),
        environment: "staging",
        syntheticDataOnly: true,
      }),
      rollbackRehearsal: commandResult({
        verified: boolFrom(rollback, "rollbackRehearsalVerified"),
        environment: "staging-drill",
      }),
    },
    seeds: {
      productionSeedExecuted: false,
    },
  };
};

export const collectStagingSmokeProof = async ({
  rootDir = process.cwd(),
  databaseEvidencePath = DEFAULT_DATABASE_EVIDENCE_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  env = process.env,
  fetcher = globalThis.fetch,
  now = () => new Date(),
  writeFile = true,
} = {}) => {
  if (typeof fetcher !== "function") {
    throw new Error(
      "collectStagingSmokeProof requires a fetch-compatible function",
    );
  }

  const evidence = readJsonIfPresent(rootDir, databaseEvidencePath) ?? {};
  const proof = buildProofBaseFromEvidence(evidence);
  proof.observedAt = now().toISOString();
  proof.source =
    "Generated by scripts/release/collect-staging-smoke-proof.mjs from staging API/Admin responses; stores only command booleans and rejects raw response data before verification";

  const apiBaseUrl = normalizeHttpsBaseUrl(
    env.STAGING_API_BASE_URL || stagingApiBaseUrlFromWorkerConfig(rootDir),
    "STAGING_API_BASE_URL",
  );
  const adminBaseUrl = normalizeHttpsBaseUrl(
    env.STAGING_ADMIN_BASE_URL || stagingAdminBaseUrlFromWorkerConfig(rootDir),
    "STAGING_ADMIN_BASE_URL",
  );
  const bearer =
    typeof env.STAGING_SMOKE_BEARER === "string" && env.STAGING_SMOKE_BEARER
      ? env.STAGING_SMOKE_BEARER
      : "";
  const persistenceBearer =
    typeof env.STAGING_PERSISTENCE_E2E_BEARER === "string" &&
    env.STAGING_PERSISTENCE_E2E_BEARER
      ? env.STAGING_PERSISTENCE_E2E_BEARER
      : "";
  const timeoutMs = Number.isInteger(Number(env.STAGING_SMOKE_TIMEOUT_MS))
    ? Number(env.STAGING_SMOKE_TIMEOUT_MS)
    : 10000;

  proof.commands.stagingApiSmoke = await smokeCommand({
    baseUrl: apiBaseUrl,
    smokePath: normalizeSmokePath(
      env.STAGING_API_SMOKE_PATH,
      DEFAULT_API_SMOKE_PATH,
    ),
    fetcher,
    bearer,
    timeoutMs,
  });
  proof.commands.adminSmoke = await smokeCommand({
    baseUrl: adminBaseUrl,
    smokePath: normalizeSmokePath(
      env.STAGING_ADMIN_SMOKE_PATH,
      DEFAULT_ADMIN_SMOKE_PATH,
    ),
    fetcher,
    bearer,
    timeoutMs,
  });
  proof.commands.serverAuthoritySmoke = await smokeCommand({
    baseUrl: apiBaseUrl,
    smokePath: normalizeSmokePath(
      env.STAGING_SERVER_AUTHORITY_SMOKE_PATH,
      DEFAULT_SERVER_AUTHORITY_SMOKE_PATH,
    ),
    fetcher,
    bearer,
    timeoutMs,
    predicate: hasServerAuthorityProof,
  });
  proof.commands.privacySmoke = await smokeCommand({
    baseUrl: apiBaseUrl,
    smokePath: normalizeSmokePath(
      env.STAGING_PRIVACY_SMOKE_PATH,
      DEFAULT_PRIVACY_SMOKE_PATH,
    ),
    fetcher,
    bearer,
    timeoutMs,
    predicate: hasPrivacyProof,
  });
  proof.commands.persistenceE2eSmoke = await persistenceSmokeCommand({
    baseUrl: apiBaseUrl,
    fetcher,
    bearer: persistenceBearer,
    timeoutMs,
    now,
  });

  if (writeFile) {
    const absoluteOutputPath = resolveFromRoot(rootDir, outputPath);
    fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
    fs.writeFileSync(
      absoluteOutputPath,
      `${JSON.stringify(proof, null, 2)}\n`,
      "utf8",
    );
  }

  return proof;
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint()) {
  const proof = await collectStagingSmokeProof();
  const verified =
    proof.commands.stagingApiSmoke.verified === true &&
    proof.commands.adminSmoke.verified === true &&
    proof.commands.serverAuthoritySmoke.verified === true &&
    proof.commands.privacySmoke.verified === true;
  console.log(
    `[staging-smoke-proof] wrote ${DEFAULT_OUTPUT_PATH}; verified=${verified}`,
  );
  if (!verified) process.exitCode = 1;
}
