import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_PROOF_PATH = "release/secrets-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/secrets-evidence.json";

export const REQUIRED_RUNTIME_SECRET_NAMES = Object.freeze([
  "DATABASE_URL",
  "STAGING_DATABASE_URL",
  "NEON_API_KEY",
  "NEON_PROJECT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CF_ADMIN_WORKER_NAME",
  "EXPO_TOKEN",
  "EAS_PROJECT_ID",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "SENTRY_DSN",
  "SLACK_WEBHOOK_URL",
]);

export const DEFAULT_SECRET_STORES = Object.freeze({
  DATABASE_URL: ["GitHub Environments", "Cloudflare Worker secret", "Neon"],
  STAGING_DATABASE_URL: [
    "GitHub Environments",
    "Cloudflare Worker secret",
    "Neon",
  ],
  NEON_API_KEY: ["GitHub Environments"],
  NEON_PROJECT_ID: ["GitHub Environments", "release external evidence"],
  CLOUDFLARE_API_TOKEN: ["GitHub Environments", "Cloudflare account secret"],
  CLOUDFLARE_ACCOUNT_ID: ["GitHub Environments"],
  CF_ADMIN_WORKER_NAME: ["GitHub Environments", "Cloudflare Worker config"],
  EXPO_TOKEN: ["GitHub Environments", "EAS secret store"],
  EAS_PROJECT_ID: ["GitHub Environments", "EAS project settings"],
  GITHUB_TOKEN: ["GitHub Actions runtime"],
  GITHUB_REPOSITORY: ["GitHub Actions runtime"],
  SENTRY_DSN: ["GitHub Environments", "provider secret store"],
  SLACK_WEBHOOK_URL: ["GitHub Environments", "provider secret store"],
});

const approvedSecretStoreSet = new Set(
  Object.values(DEFAULT_SECRET_STORES).flat(),
);

const RAW_SECRET_VALUE_KEYS = new Set([
  "value",
  "rawValue",
  "secretValue",
  "tokenValue",
  "password",
  "connectionString",
  "databaseUrl",
  "webhookUrl",
  "dsnValue",
  "privateKey",
  "serviceAccountJson",
]);

const RAW_SECRET_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|https?:\/\/hooks\.slack\.com\/services\/|https?:\/\/[^@\s]+@[^/\s]+\/\d+|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+|napi_[a-z0-9_-]{16,})/i;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonIfPresent = (rootDir, filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const isRawSecretValueKey = (key) => {
  if (RAW_SECRET_VALUE_KEYS.has(key)) return true;
  return /(?:token|secret|password|connection|string|database|webhook|dsn|privatekey|serviceaccount).*value$/i.test(
    key,
  );
};

const containsRawSecretValue = (value) => {
  if (typeof value === "string") return RAW_SECRET_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsRawSecretValue);
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      isRawSecretValueKey(key) &&
      typeof nestedValue === "string" &&
      nestedValue.trim().length > 0
    ) {
      return true;
    }

    if (containsRawSecretValue(nestedValue)) return true;
  }

  return false;
};

const requiredSecretNameSet = new Set(REQUIRED_RUNTIME_SECRET_NAMES);

const proofSecrets = (proof) =>
  isPlainObject(proof?.secrets) ? proof.secrets : {};

const stringArray = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const unapprovedVerifiedStoreLabels = (proof) => {
  const invalidLabels = [];

  for (const [secretName, sourceEntry] of Object.entries(proofSecrets(proof))) {
    if (!isPlainObject(sourceEntry) || sourceEntry.verified !== true) continue;

    const invalidStores = stringArray(sourceEntry.stores).filter(
      (store) => !approvedSecretStoreSet.has(store),
    );
    if (invalidStores.length > 0) {
      invalidLabels.push(`${secretName}: ${invalidStores.join(", ")}`);
    }
  }

  return invalidLabels;
};

const validateNoSecretProof = (proof, proofPath) => {
  if (!isPlainObject(proof)) return {};

  if (
    proof.schemaVersion !== 1 ||
    proof.secretsRedacted !== true ||
    proof.containsSecretValues !== false ||
    containsRawSecretValue(proof)
  ) {
    throw new Error(
      `${proofPath} must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no raw secret values`,
    );
  }

  const unknownSecretNames = Object.keys(proofSecrets(proof)).filter(
    (name) => !requiredSecretNameSet.has(name),
  );
  if (unknownSecretNames.length > 0) {
    throw new Error(
      `${proofPath} contains unknown secret names: ${unknownSecretNames.join(", ")}`,
    );
  }

  const invalidStoreLabels = unapprovedVerifiedStoreLabels(proof);
  if (invalidStoreLabels.length > 0) {
    throw new Error(
      `${proofPath} contains unapproved secret store labels: ${invalidStoreLabels.join("; ")}`,
    );
  }

  return proof;
};

const readProof = (rootDir, proofPath) => {
  const localProof = readJsonIfPresent(rootDir, proofPath);
  if (localProof) return validateNoSecretProof(localProof, proofPath);

  const fallback =
    proofPath === DEFAULT_PROOF_PATH
      ? readJsonIfPresent(rootDir, DEFAULT_OUTPUT_PATH)
      : null;
  if (fallback) return validateNoSecretProof(fallback, DEFAULT_OUTPUT_PATH);

  return {};
};

const entryForSecret = (proof, secretName) => {
  const sourceEntry = proofSecrets(proof)[secretName];
  const stores = stringArray(sourceEntry?.stores);
  const verified = sourceEntry?.verified === true && stores.length > 0;
  const note =
    typeof sourceEntry?.note === "string" && sourceEntry.note.trim()
      ? sourceEntry.note.trim()
      : `Presence for ${secretName} must be verified in an approved secret store without committing the value.`;

  return {
    verified,
    stores: stores.length > 0 ? stores : DEFAULT_SECRET_STORES[secretName],
    note,
  };
};

export const buildSecretsEvidence = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  now = () => new Date(),
} = {}) => {
  const proof = readProof(rootDir, proofPath);
  const secrets = Object.fromEntries(
    REQUIRED_RUNTIME_SECRET_NAMES.map((secretName) => [
      secretName,
      entryForSecret(proof, secretName),
    ]),
  );
  const unverifiedSecretNames = REQUIRED_RUNTIME_SECRET_NAMES.filter(
    (secretName) => secrets[secretName].verified !== true,
  );

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/generate-secrets-evidence.mjs from local no-secret proof booleans; raw tokens, URLs, DSNs, webhooks, private keys, and secret values are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    secrets,
    nextEvidenceRequired: unverifiedSecretNames.map(
      (secretName) =>
        `${secretName} presence proof in ${secrets[secretName].stores.join(" or ")}`,
    ),
  };
};

export const writeSecretsEvidenceFile = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  now = () => new Date(),
} = {}) => {
  const evidence = buildSecretsEvidence({ rootDir, proofPath, now });
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
  const outputPath = writeSecretsEvidenceFile();
  console.log(
    `[secrets-evidence] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
