import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_PROOF_PATH = "release/security-audit-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/security-audit-evidence.json";

const RAW_SECRET_PATTERN =
  /(\/\/registry\.npmjs\.org\/:_authToken=|npm_[a-z0-9_-]{16,}|napi_[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|sk-[a-z0-9_-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|bearer\s+[a-z0-9._-]{16,})/i;

const RAW_SECRET_VALUE_KEYS = new Set([
  "value",
  "rawValue",
  "secretValue",
  "tokenValue",
  "npmTokenValue",
  "registryTokenValue",
  "authTokenValue",
  "authorization",
  "cookie",
  "password",
  "privateKey",
]);

const COPIED_AUDIT_PAYLOAD_KEY_TERMS = [
  "rawauditjson",
  "rawauditreport",
  "fullauditreport",
  "auditreport",
  "advisories",
  "vulnerabilitydetails",
  "registryresponse",
  "npmresponse",
  "dependencypayload",
  "packagelockpayload",
  "pnpmlockpayload",
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

const normalizedKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isRawSecretKey = (key) => {
  if (RAW_SECRET_VALUE_KEYS.has(key)) return true;
  return /(?:token|secret|password|authorization|cookie|privatekey).*value$/i.test(
    key,
  );
};

const containsRawSecretValue = (value) => {
  if (typeof value === "string") return RAW_SECRET_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsRawSecretValue);
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      isRawSecretKey(key) &&
      typeof nestedValue === "string" &&
      nestedValue.trim().length > 0
    ) {
      return true;
    }
    if (containsRawSecretValue(nestedValue)) return true;
  }

  return false;
};

const keyLooksLikeCopiedAuditPayload = (key) => {
  const normalized = normalizedKey(key);
  return COPIED_AUDIT_PAYLOAD_KEY_TERMS.some((term) =>
    normalized.includes(term),
  );
};

const isNonEmptyEvidenceValue = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") {
    return false;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
};

const containsCopiedAuditPayload = (value) => {
  if (Array.isArray(value)) return value.some(containsCopiedAuditPayload);
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (keyLooksLikeCopiedAuditPayload(key) && isNonEmptyEvidenceValue(nestedValue)) {
      return true;
    }
    if (containsCopiedAuditPayload(nestedValue)) return true;
  }

  return false;
};

const validateNoSecretProof = (proof, proofPath) => {
  if (!proof) return {};
  if (
    proof.schemaVersion !== 1 ||
    proof.secretsRedacted !== true ||
    proof.containsSecretValues !== false ||
    containsRawSecretValue(proof)
  ) {
    throw new Error(
      `${proofPath} must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no raw registry tokens or secret values`,
    );
  }
  if (containsCopiedAuditPayload(proof)) {
    throw new Error(
      `${proofPath} must not contain copied audit reports, advisories, registry responses, or dependency payloads`,
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
  return validateNoSecretProof(fallback, DEFAULT_OUTPUT_PATH);
};

const proofAudit = (proof) => (isPlainObject(proof?.audit) ? proof.audit : {});

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const stringFrom = (source, key, fallback = "") =>
  typeof source?.[key] === "string" && source[key].trim()
    ? source[key].trim()
    : fallback;

const nonNegativeIntegerOrNull = (source, key) => {
  const value = source?.[key];
  return Number.isInteger(value) && value >= 0 ? value : null;
};

export const buildSecurityAuditEvidence = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  now = () => new Date(),
} = {}) => {
  const proof = readProof(rootDir, proofPath);
  const audit = proofAudit(proof);
  const criticalVulnerabilities = nonNegativeIntegerOrNull(
    audit,
    "criticalVulnerabilities",
  );
  const highVulnerabilities = nonNegativeIntegerOrNull(
    audit,
    "highVulnerabilities",
  );
  const noHighOrCriticalVulnerabilities =
    audit.noHighOrCriticalVulnerabilities === true &&
    criticalVulnerabilities === 0 &&
    highVulnerabilities === 0;

  const evidence = {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/generate-security-audit-evidence.mjs from local no-secret dependency audit proof; raw npm tokens, registry payloads, advisories, and full audit reports are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    audit: {
      packageManager: stringFrom(audit, "packageManager", "pnpm"),
      auditCommand: stringFrom(
        audit,
        "auditCommand",
        "corepack pnpm audit --audit-level=high --prod=false",
      ),
      registryAuditVerified: boolFrom(audit, "registryAuditVerified"),
      lockfileAudited: boolFrom(audit, "lockfileAudited"),
      productionDependenciesAudited: boolFrom(
        audit,
        "productionDependenciesAudited",
      ),
      devDependenciesAudited: boolFrom(audit, "devDependenciesAudited"),
      criticalVulnerabilities,
      highVulnerabilities,
      moderateVulnerabilities: nonNegativeIntegerOrNull(
        audit,
        "moderateVulnerabilities",
      ),
      lowVulnerabilities: nonNegativeIntegerOrNull(audit, "lowVulnerabilities"),
      noHighOrCriticalVulnerabilities,
      note:
        stringFrom(audit, "note") ||
        "Run the dependency audit in a network-enabled release environment and record only counts plus pass/fail booleans.",
    },
    nextEvidenceRequired: [],
  };

  if (evidence.audit.registryAuditVerified !== true) {
    evidence.nextEvidenceRequired.push(
      "Run corepack pnpm audit --audit-level=high --prod=false from a network-enabled release environment",
    );
  }
  if (
    evidence.audit.lockfileAudited !== true ||
    evidence.audit.productionDependenciesAudited !== true ||
    evidence.audit.devDependenciesAudited !== true
  ) {
    evidence.nextEvidenceRequired.push(
      "Record lockfile, production dependency, and dev dependency audit coverage booleans",
    );
  }
  if (evidence.audit.noHighOrCriticalVulnerabilities !== true) {
    evidence.nextEvidenceRequired.push(
      "Record zero high and zero critical vulnerability counts before release",
    );
  }

  return evidence;
};

export const writeSecurityAuditEvidenceFile = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  now = () => new Date(),
} = {}) => {
  const evidence = buildSecurityAuditEvidence({ rootDir, proofPath, now });
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
  const outputPath = writeSecurityAuditEvidenceFile();
  console.log(
    `[security-audit-evidence] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
