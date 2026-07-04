import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_DATABASE_EVIDENCE_PATH = "release/database-evidence.json";
const DEFAULT_OUTPUT_PATH = "release/database-command-proof.local.json";
const DEFAULT_EXPECTED_PROJECT_HINT = "salary-hijacking";

const DEFAULT_API_SMOKE_PATH = "/api/v1/mobile/bootstrap";
const DEFAULT_ADMIN_SMOKE_PATH = "/admin/api/v1/ready";
const DEFAULT_SERVER_AUTHORITY_SMOKE_PATH = "/api/v1/mobile/bootstrap";
const DEFAULT_PRIVACY_SMOKE_PATH = "/api/v1/mobile/bootstrap";

const RAW_SECRET_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|ghp_[a-z0-9_]{16,}|xox[baprs]-[a-z0-9-]+)/i;

const RAW_RESPONSE_DATA_PATTERN =
  /("?)(salaryAmount|salary|incomeAmount|income|expenseAmount|expense|savingsAmount|savings|hijackAmount|hijack|accountNumber|cardNumber|loanAmount|residentNumber|phoneNumber|email|authToken|accessToken|refreshToken|sessionToken|pushToken|rawDeviceIdentifier|deviceIdentifier|deviceId)\1\s*[:=]/i;

const EMAIL_VALUE_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const JWT_VALUE_PATTERN =
  /\beyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\b/;

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
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/+$/, "");
};

const joinUrl = (baseUrl, smokePath) => `${baseUrl}${smokePath}`;

const responseHasSensitiveRawData = (text) =>
  RAW_SECRET_PATTERN.test(text) ||
  RAW_RESPONSE_DATA_PATTERN.test(text) ||
  EMAIL_VALUE_PATTERN.test(text) ||
  JWT_VALUE_PATTERN.test(text);

const headerValue = (headers, key) =>
  headers.get(key)?.trim().toLowerCase() ?? "";

const hasServerAuthorityProof = (headers, text) => {
  if (headerValue(headers, "x-server-authority") === "true") return true;
  return (
    /"?serverAuthorityEnabled"?\s*:\s*true/i.test(text) ||
    /"?serverAuthority"?\s*:\s*true/i.test(text)
  );
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
    safe: !responseHasSensitiveRawData(text),
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
    return commandResult({
      verified,
      environment: "staging",
      noRawPayloadStored: true,
    });
  } catch {
    return commandResult({
      verified: false,
      environment: "staging",
      noRawPayloadStored: true,
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
    env.STAGING_API_BASE_URL,
    "STAGING_API_BASE_URL",
  );
  const adminBaseUrl = normalizeHttpsBaseUrl(
    env.STAGING_ADMIN_BASE_URL,
    "STAGING_ADMIN_BASE_URL",
  );
  const bearer =
    typeof env.STAGING_SMOKE_BEARER === "string" && env.STAGING_SMOKE_BEARER
      ? env.STAGING_SMOKE_BEARER
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
