import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RELEASE_TARGETS_PATH = "release/release-targets.json";
const DEFAULT_PROOF_PATH = "release/database-proof.local.json";
const DEFAULT_COMMAND_PROOF_PATH = "release/database-command-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/database-evidence.json";

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
  "authtoken",
  "refreshtoken",
  "sessiontoken",
  "pushtoken",
  "rawdeviceidentifier",
  "deviceidentifier",
  "deviceid",
];

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonIfPresent = (rootDir, filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const countMigrationFiles = (rootDir) => {
  const migrationDir = path.join(rootDir, "database", "migrations");
  if (!fs.existsSync(migrationDir)) return 0;
  return fs
    .readdirSync(migrationDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort().length;
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

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const proofSection = (proof, key) =>
  isPlainObject(proof?.[key]) ? proof[key] : {};

const commandVerified = (commands, key) =>
  isPlainObject(commands?.[key]) && commands[key].verified === true;

const commandNoRawPayloadStored = (commands, key) =>
  isPlainObject(commands?.[key]) &&
  commands[key].verified === true &&
  commands[key].noRawPayloadStored === true;

const databaseNextEvidenceRequired = (evidence) => {
  const missing = [];
  if (!evidence.migrations.migrationValidationVerified) {
    missing.push("Safe migration validation against a non-production target");
  }
  if (!evidence.migrations.stagingMigrationExecuted) {
    missing.push("Staging migration execution proof");
  }
  if (!evidence.seeds.stagingSeedExecuted) {
    missing.push("Staging seed execution proof with synthetic data only");
  }
  if (!evidence.migrations.productionMigrationDryRunVerified) {
    missing.push("Production migration dry-run proof");
  }
  if (!evidence.smoke.stagingApiSmokeVerified) {
    missing.push("API smoke proof against migrated staging data");
  }
  if (!evidence.smoke.adminSmokeVerified) {
    missing.push("Admin smoke proof against migrated staging data");
  }
  if (!evidence.smoke.serverAuthoritySmokeVerified) {
    missing.push("Server-authority payroll/budget smoke proof");
  }
  if (
    !evidence.smoke.privacySmokeVerified ||
    !evidence.smoke.noRawFinancialDataInSmokePayloads
  ) {
    missing.push("Privacy/redaction smoke proof");
  }
  if (!evidence.rollback.rollbackRehearsalVerified) {
    missing.push("Database rollback rehearsal proof");
  }
  return missing;
};

const readExpectedProjectHint = (rootDir) => {
  const targets = readJsonIfPresent(rootDir, RELEASE_TARGETS_PATH);
  const hint = targets?.neon?.expectedProjectHint;
  return typeof hint === "string" && hint.trim() ? hint.trim() : "";
};

const stringFrom = (source, key) =>
  typeof source?.[key] === "string" ? source[key].trim() : "";

const assertNeonProofTargetMatches = ({
  proof,
  proofPath,
  expectedProjectHint,
  requireExpectedProjectHint = false,
}) => {
  const neon = proofSection(proof, "neon");
  const proofProjectHint = stringFrom(neon, "expectedProjectHint");
  if (
    requireExpectedProjectHint &&
    neon.projectMatched === true &&
    proofProjectHint.length === 0
  ) {
    throw new Error(
      `${proofPath} Neon proof target does not match release target: expectedProjectHint is missing`,
    );
  }
  if (
    proofProjectHint.length > 0 &&
    expectedProjectHint.length > 0 &&
    proofProjectHint !== expectedProjectHint
  ) {
    throw new Error(
      `${proofPath} Neon proof target does not match release target: expectedProjectHint must be ${expectedProjectHint}`,
    );
  }
};

const validateProof = ({
  proof,
  proofPath,
  expectedProjectHint,
  requireExpectedProjectHint = false,
}) => {
  if (!proof) return {};
  if (
    proof.schemaVersion !== 1 ||
    proof.secretsRedacted !== true ||
    proof.containsSecretValues !== false ||
    containsRawSensitiveValue(proof)
  ) {
    throw new Error(
      `${proofPath} must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no raw database URLs or secret values`,
    );
  }
  if (containsRawSmokePayloadOrSensitiveUserData(proof)) {
    throw new Error(
      `${proofPath} must not contain raw smoke payloads or sensitive user data`,
    );
  }
  if (proofSection(proof, "seeds").productionSeedExecuted === true) {
    throw new Error(
      `${proofPath} must not mark production seed execution as verified`,
    );
  }
  assertNeonProofTargetMatches({
    proof,
    proofPath,
    expectedProjectHint,
    requireExpectedProjectHint,
  });
  return proof;
};

const readProof = (rootDir, proofPath, expectedProjectHint) => {
  const localProof = readJsonIfPresent(rootDir, proofPath);
  if (localProof) {
    return validateProof({
      proof: localProof,
      proofPath,
      expectedProjectHint,
      requireExpectedProjectHint: true,
    });
  }

  const commandProof =
    proofPath === DEFAULT_PROOF_PATH
      ? readJsonIfPresent(rootDir, DEFAULT_COMMAND_PROOF_PATH)
      : null;
  if (commandProof) {
    return validateProof({
      proof: commandProof,
      proofPath: DEFAULT_COMMAND_PROOF_PATH,
      expectedProjectHint,
      requireExpectedProjectHint: true,
    });
  }

  const fallback =
    proofPath === DEFAULT_PROOF_PATH
      ? readJsonIfPresent(rootDir, DEFAULT_OUTPUT_PATH)
      : null;
  return validateProof({
    proof: fallback,
    proofPath: DEFAULT_OUTPUT_PATH,
    expectedProjectHint,
  });
};

export const buildDatabaseEvidence = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  now = () => new Date(),
} = {}) => {
  const expectedProjectHint = readExpectedProjectHint(rootDir);
  const proof = readProof(rootDir, proofPath, expectedProjectHint);
  const neon = proofSection(proof, "neon");
  const migrations = proofSection(proof, "migrations");
  const seeds = proofSection(proof, "seeds");
  const smoke = proofSection(proof, "smoke");
  const rollback = proofSection(proof, "rollback");
  const commands = proofSection(proof, "commands");
  const migrationFileCount = countMigrationFiles(rootDir);

  const evidence = {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/generate-database-evidence.mjs from local no-secret proof booleans; raw database URLs, secret values, raw smoke payloads, and sensitive user/financial data keys are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    neon: {
      expectedProjectHint,
      projectMatched: boolFrom(neon, "projectMatched"),
      mainBranchReady: boolFrom(neon, "mainBranchReady"),
      stagingBranchReady: boolFrom(neon, "stagingBranchReady"),
      note: "This evidence records only project/branch booleans. No raw Neon connection string is stored.",
    },
    migrations: {
      migrationFilesVerified: migrationFileCount > 0,
      migrationFileCount,
      migrationValidationVerified:
        boolFrom(migrations, "migrationValidationVerified") ||
        commandVerified(commands, "migrationValidation"),
      stagingMigrationExecuted:
        boolFrom(migrations, "stagingMigrationExecuted") ||
        commandVerified(commands, "stagingMigration"),
      productionMigrationDryRunVerified:
        boolFrom(migrations, "productionMigrationDryRunVerified") ||
        commandVerified(commands, "productionMigrationDryRun"),
      note: "Migration execution proof must come from a safe validation target, staging execution, and production dry-run, not from committed database URLs.",
    },
    seeds: {
      stagingSeedExecuted:
        boolFrom(seeds, "stagingSeedExecuted") ||
        commandVerified(commands, "stagingSeed"),
      productionSeedExecuted: false,
      destructiveProductionSeedBlocked: true,
      note: "Only staging synthetic seed proof may be recorded. Production seed execution remains blocked.",
    },
    smoke: {
      stagingApiSmokeVerified:
        boolFrom(smoke, "stagingApiSmokeVerified") ||
        commandVerified(commands, "stagingApiSmoke"),
      adminSmokeVerified:
        boolFrom(smoke, "adminSmokeVerified") ||
        commandVerified(commands, "adminSmoke"),
      serverAuthoritySmokeVerified:
        boolFrom(smoke, "serverAuthoritySmokeVerified") ||
        commandVerified(commands, "serverAuthoritySmoke"),
      privacySmokeVerified:
        boolFrom(smoke, "privacySmokeVerified") ||
        commandVerified(commands, "privacySmoke"),
      noRawFinancialDataInSmokePayloads:
        boolFrom(smoke, "noRawFinancialDataInSmokePayloads") ||
        (commandNoRawPayloadStored(commands, "stagingApiSmoke") &&
          commandNoRawPayloadStored(commands, "adminSmoke") &&
          commandNoRawPayloadStored(commands, "serverAuthoritySmoke") &&
          commandNoRawPayloadStored(commands, "privacySmoke")),
      note: "Smoke proof must be based on deployed staging API/Admin responses with sensitive payloads redacted.",
    },
    rollback: {
      rollbackRehearsalVerified:
        boolFrom(rollback, "rollbackRehearsalVerified") ||
        commandVerified(commands, "rollbackRehearsal"),
      note: "Rollback proof must be a rehearsal or documented recovery validation, not a destructive production rollback.",
    },
  };
  return {
    ...evidence,
    nextEvidenceRequired: databaseNextEvidenceRequired(evidence),
  };
};

export const writeDatabaseEvidenceFile = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  now = () => new Date(),
} = {}) => {
  const evidence = buildDatabaseEvidence({ rootDir, proofPath, now });
  const absoluteOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(rootDir, outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(
    absoluteOutputPath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  return absoluteOutputPath;
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint()) {
  const outputPath = writeDatabaseEvidenceFile();
  console.log(
    `[database-evidence] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
