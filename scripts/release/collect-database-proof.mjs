import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT_PATH = "release/database-command-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/database-proof.local.json";
const DEFAULT_EXPECTED_PROJECT_HINT = "salary-hijacking";

const RAW_SECRET_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|ghp_[a-z0-9_]{16,}|xox[baprs]-[a-z0-9-]+)/i;

const RAW_SMOKE_OR_SENSITIVE_KEY_TERMS = [
  "payload",
  "requestbody",
  "responsebody",
  "sampledata",
  "rawdata",
  "salary",
  "income",
  "expense",
  "savings",
  "hijack",
  "accountnumber",
  "cardnumber",
  "loan",
  "resident",
  "phone",
  "email",
  "authorization",
  "cookie",
  "setcookie",
  "bearer",
  "apikey",
  "accesskey",
  "secretkey",
  "jwt",
  "csrf",
  "authtoken",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "pushtoken",
  "rawdeviceidentifier",
  "deviceidentifier",
  "deviceid",
];

const SAFE_VALIDATION_ENVIRONMENTS = new Set([
  "local",
  "local-safe",
  "ci",
  "preview",
  "staging",
  "uat",
]);

const SMOKE_ENVIRONMENTS = new Set(["staging"]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveFromCwd = (filePath) =>
  path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const readJsonFile = (filePath) => {
  const absolutePath = resolveFromCwd(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${filePath} is missing`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const containsRawSensitiveValue = (value) => {
  if (typeof value === "string") return RAW_SECRET_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsRawSensitiveValue);
  if (!isPlainObject(value)) return false;
  return Object.values(value).some(containsRawSensitiveValue);
};

const proofKeyLooksLikeRawSmokeOrSensitiveData = (key) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return RAW_SMOKE_OR_SENSITIVE_KEY_TERMS.some((term) =>
    normalized.includes(term),
  );
};

const isNonBooleanEvidenceValue = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") {
    return false;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
};

const containsRawSmokePayloadOrSensitiveUserData = (value) => {
  if (Array.isArray(value)) {
    return value.some(containsRawSmokePayloadOrSensitiveUserData);
  }
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      proofKeyLooksLikeRawSmokeOrSensitiveData(key) &&
      isNonBooleanEvidenceValue(nestedValue)
    ) {
      return true;
    }
    if (containsRawSmokePayloadOrSensitiveUserData(nestedValue)) return true;
  }

  return false;
};

const section = (value, key) => (isPlainObject(value?.[key]) ? value[key] : {});

const stringFrom = (source, key) =>
  typeof source?.[key] === "string" ? source[key].trim() : "";

const command = (input, key) =>
  isPlainObject(section(input, "commands")[key])
    ? section(input, "commands")[key]
    : {};

const commandPassed = (item) => item.verified === true && item.exitCode === 0;

const normalizedEnvironment = (item) =>
  typeof item.environment === "string" ? item.environment.trim() : "";

const validationCommandVerified = (input, key) => {
  const item = command(input, key);
  return (
    commandPassed(item) &&
    SAFE_VALIDATION_ENVIRONMENTS.has(normalizedEnvironment(item))
  );
};

const stagingCommandVerified = (input, key) => {
  const item = command(input, key);
  return commandPassed(item) && normalizedEnvironment(item) === "staging";
};

const productionDryRunVerified = (input) => {
  const item = command(input, "productionMigrationDryRun");
  return (
    commandPassed(item) &&
    normalizedEnvironment(item) === "production" &&
    item.dryRun === true
  );
};

const stagingSeedVerified = (input) => {
  const item = command(input, "stagingSeed");
  return (
    commandPassed(item) &&
    normalizedEnvironment(item) === "staging" &&
    item.syntheticDataOnly === true
  );
};

const smokeVerified = (input, key) => {
  const item = command(input, key);
  return (
    commandPassed(item) &&
    SMOKE_ENVIRONMENTS.has(normalizedEnvironment(item)) &&
    item.noRawPayloadStored === true
  );
};

const rollbackVerified = (input) => {
  const item = command(input, "rollbackRehearsal");
  return (
    commandPassed(item) &&
    ["staging", "staging-drill", "uat", "ci"].includes(
      normalizedEnvironment(item),
    )
  );
};

const validateInput = (input, inputPath) => {
  if (
    input.schemaVersion !== 1 ||
    input.secretsRedacted !== true ||
    input.containsSecretValues !== false ||
    containsRawSensitiveValue(input)
  ) {
    throw new Error(
      `${inputPath} must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no raw database URLs or secret values`,
    );
  }

  if (containsRawSmokePayloadOrSensitiveUserData(input)) {
    throw new Error(
      `${inputPath} must not contain raw smoke payloads or sensitive user data`,
    );
  }

  const neon = section(input, "neon");
  const expectedProjectHint = stringFrom(neon, "expectedProjectHint");
  if (
    expectedProjectHint.length > 0 &&
    expectedProjectHint !== DEFAULT_EXPECTED_PROJECT_HINT
  ) {
    throw new Error(
      `${inputPath} neon.expectedProjectHint must be ${DEFAULT_EXPECTED_PROJECT_HINT}`,
    );
  }
  if (neon.projectMatched === true && expectedProjectHint.length === 0) {
    throw new Error(
      `${inputPath} neon.expectedProjectHint must be ${DEFAULT_EXPECTED_PROJECT_HINT} when projectMatched=true`,
    );
  }

  if (
    section(input, "seeds").productionSeedExecuted === true ||
    command(input, "productionSeed").verified === true
  ) {
    throw new Error(
      `${inputPath} must not mark production seed execution as verified`,
    );
  }
};

export const buildDatabaseProof = ({
  input,
  now = () => new Date(),
  inputPath = DEFAULT_INPUT_PATH,
} = {}) => {
  validateInput(input, inputPath);

  const neon = section(input, "neon");
  const stagingApiSmokeVerified = smokeVerified(input, "stagingApiSmoke");
  const adminSmokeVerified = smokeVerified(input, "adminSmoke");
  const serverAuthoritySmokeVerified = smokeVerified(
    input,
    "serverAuthoritySmoke",
  );
  const privacySmokeVerified = smokeVerified(input, "privacySmoke");

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/collect-database-proof.mjs from local no-secret command result booleans; raw database URLs, secret values, raw smoke payloads, and sensitive user/financial data keys are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    neon: {
      expectedProjectHint: stringFrom(neon, "expectedProjectHint"),
      projectMatched: neon.projectMatched === true,
      mainBranchReady: neon.mainBranchReady === true,
      stagingBranchReady: neon.stagingBranchReady === true,
    },
    migrations: {
      migrationValidationVerified: validationCommandVerified(
        input,
        "migrationValidation",
      ),
      stagingMigrationExecuted: stagingCommandVerified(
        input,
        "stagingMigration",
      ),
      productionMigrationDryRunVerified: productionDryRunVerified(input),
    },
    seeds: {
      stagingSeedExecuted: stagingSeedVerified(input),
      productionSeedExecuted: false,
      destructiveProductionSeedBlocked: true,
    },
    smoke: {
      stagingApiSmokeVerified,
      adminSmokeVerified,
      serverAuthoritySmokeVerified,
      privacySmokeVerified,
      noRawFinancialDataInSmokePayloads:
        stagingApiSmokeVerified &&
        adminSmokeVerified &&
        serverAuthoritySmokeVerified &&
        privacySmokeVerified,
    },
    rollback: {
      rollbackRehearsalVerified: rollbackVerified(input),
    },
    note: "This local proof stores only booleans. Do not add raw Neon URLs, passwords, tokens, copied SQL outputs, smoke request/response bodies, emails, phone numbers, salary, expense, savings, hijack amounts, account/card/loan data, push tokens, or device identifiers.",
  };
};

export const collectDatabaseProof = ({
  inputPath = DEFAULT_INPUT_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  now = () => new Date(),
  writeFile = true,
} = {}) => {
  const input = readJsonFile(inputPath);
  const proof = buildDatabaseProof({ input, now, inputPath });

  if (writeFile) {
    const absoluteOutputPath = resolveFromCwd(outputPath);
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
  const proof = collectDatabaseProof();
  const verified =
    Object.values(proof.neon).every(Boolean) &&
    Object.values(proof.migrations).every(Boolean) &&
    proof.seeds.stagingSeedExecuted === true &&
    proof.seeds.productionSeedExecuted === false &&
    proof.seeds.destructiveProductionSeedBlocked === true &&
    Object.values(proof.smoke).every(Boolean) &&
    proof.rollback.rollbackRehearsalVerified === true;
  console.log(
    `[database-proof] wrote ${DEFAULT_OUTPUT_PATH}; verified=${verified}`,
  );
  if (!verified) process.exitCode = 1;
}
