import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RELEASE_TARGETS_PATH = "release/release-targets.json";
const DEFAULT_PROOF_PATH = "release/public-url-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/public-url-evidence.json";

const DEFAULT_PUBLIC_URLS = Object.freeze({
  landingUrl: "https://salaryhijacking.com/",
  privacyUrl: "https://salaryhijacking.com/privacy",
  supportUrl: "https://salaryhijacking.com/support",
  termsUrl: "https://salaryhijacking.com/terms",
});

const RAW_SECRET_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|https?:\/\/hooks\.slack\.com\/services\/|https?:\/\/[^@\s]+@[^/\s]+\/\d+|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+|napi_[a-z0-9_-]{16,}|cf_[a-z0-9_-]{16,})/i;

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

const RAW_PUBLIC_PAGE_OR_SENSITIVE_KEY_TERMS = [
  "payload",
  "requestbody",
  "responsebody",
  "responsehtml",
  "requestheaders",
  "responseheaders",
  "rawheaders",
  "copiedheaders",
  "htmlbody",
  "rawhtml",
  "pagebody",
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
  "session",
  "csrf",
  "apikey",
  "accesskey",
  "secretkey",
  "jwt",
  "authtoken",
  "accesstoken",
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

const proofSection = (proof, key) =>
  isPlainObject(proof?.[key]) ? proof[key] : {};

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const noteFrom = (source, key, fallback) =>
  typeof source?.[key] === "string" && source[key].trim()
    ? source[key].trim()
    : fallback;

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

const publicProofKeyLooksUnsafe = (key) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return RAW_PUBLIC_PAGE_OR_SENSITIVE_KEY_TERMS.some((term) =>
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

const containsRawPublicPagePayloadOrSensitiveData = (value) => {
  if (Array.isArray(value)) {
    return value.some(containsRawPublicPagePayloadOrSensitiveData);
  }
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      publicProofKeyLooksUnsafe(key) &&
      isNonBooleanEvidenceValue(nestedValue)
    ) {
      return true;
    }
    if (containsRawPublicPagePayloadOrSensitiveData(nestedValue)) return true;
  }

  return false;
};

const readPublicUrlTargets = (rootDir) => {
  const targets = readJsonIfPresent(rootDir, RELEASE_TARGETS_PATH);
  const publicUrls = isPlainObject(targets?.publicUrls)
    ? targets.publicUrls
    : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_PUBLIC_URLS).map(([key, fallback]) => {
      const value = publicUrls[key];
      return [
        key,
        typeof value === "string" && value.trim() ? value.trim() : fallback,
      ];
    }),
  );
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

  if (containsRawPublicPagePayloadOrSensitiveData(proof)) {
    throw new Error(
      `${proofPath} must not contain raw public page payloads or sensitive data`,
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

const buildNextEvidenceRequired = ({ reachability, headers, content }) => {
  const next = [];
  if (reachability.landingReachable !== true) {
    next.push("Production reachability proof for https://salaryhijacking.com/");
  }
  if (reachability.privacyReachable !== true) {
    next.push("Production reachability proof for /privacy");
  }
  if (reachability.supportReachable !== true) {
    next.push("Production reachability proof for /support");
  }
  if (reachability.termsReachable !== true) {
    next.push("Production reachability proof for /terms");
  }
  if (headers.cspVerified !== true) {
    next.push("CSP header proof for public app/legal pages");
  }
  if (headers.privacyHeadersVerified !== true) {
    next.push("Privacy and ads-safe header proof for public pages");
  }
  if (headers.noIndexAbsentOnPublicPages !== true) {
    next.push("No accidental noindex proof for public store-review URLs");
  }
  if (content.koreanCopyVerified !== true) {
    next.push("Korean public page copy proof");
  }
  if (content.storeReviewUrlsVerified !== true) {
    next.push(
      "Store review URL proof for landing, privacy, support, and terms",
    );
  }
  if (content.noSensitiveRawDataExposed !== true) {
    next.push("Public page sensitive data non-exposure proof");
  }
  return next;
};

export const buildPublicUrlEvidence = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  now = () => new Date(),
} = {}) => {
  const proof = readProof(rootDir, proofPath);
  const proofReachability = proofSection(proof, "reachability");
  const proofHeaders = proofSection(proof, "headers");
  const proofContent = proofSection(proof, "content");

  const reachability = {
    landingReachable: boolFrom(proofReachability, "landingReachable"),
    privacyReachable: boolFrom(proofReachability, "privacyReachable"),
    supportReachable: boolFrom(proofReachability, "supportReachable"),
    termsReachable: boolFrom(proofReachability, "termsReachable"),
    note: noteFrom(
      proofReachability,
      "note",
      "This evidence records only URL reachability booleans. It does not store copied page bodies, logs, headers containing identifiers, or user payloads.",
    ),
  };

  const headers = {
    cspVerified: boolFrom(proofHeaders, "cspVerified"),
    privacyHeadersVerified: boolFrom(proofHeaders, "privacyHeadersVerified"),
    noIndexAbsentOnPublicPages: boolFrom(
      proofHeaders,
      "noIndexAbsentOnPublicPages",
    ),
    note: noteFrom(
      proofHeaders,
      "note",
      "This evidence records only security/header presence booleans. It does not store raw request or response headers.",
    ),
  };

  const content = {
    koreanCopyVerified: boolFrom(proofContent, "koreanCopyVerified"),
    storeReviewUrlsVerified: boolFrom(proofContent, "storeReviewUrlsVerified"),
    noSensitiveRawDataExposed: boolFrom(
      proofContent,
      "noSensitiveRawDataExposed",
    ),
    note: noteFrom(
      proofContent,
      "note",
      "This evidence records only public content review booleans. It does not store raw financial, personal, token, or copied page payload data.",
    ),
  };

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/generate-public-url-evidence.mjs from local no-secret proof booleans; raw secrets, copied page bodies, raw headers, and sensitive user/financial data keys are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    expectedUrls: readPublicUrlTargets(rootDir),
    reachability,
    headers,
    content,
    nextEvidenceRequired: buildNextEvidenceRequired({
      reachability,
      headers,
      content,
    }),
  };
};

export const writePublicUrlEvidenceFile = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  now = () => new Date(),
} = {}) => {
  const evidence = buildPublicUrlEvidence({ rootDir, proofPath, now });
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
  const outputPath = writePublicUrlEvidenceFile();
  console.log(
    `[public-url-evidence] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
