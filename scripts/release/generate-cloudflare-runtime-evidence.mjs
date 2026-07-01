import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RELEASE_TARGETS_PATH = "release/release-targets.json";
const DEFAULT_PROOF_PATH = "release/cloudflare-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/cloudflare-runtime-evidence.json";

const DEFAULT_EXPECTED_DOMAINS = Object.freeze([
  "salaryhijacking.com",
  "www.salaryhijacking.com",
  "api.salaryhijacking.com",
  "notifications.salaryhijacking.com",
  "scheduler.salaryhijacking.com",
  "admin.salaryhijacking.com",
]);

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
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|https?:\/\/hooks\.slack\.com\/services\/|https?:\/\/[^@\s]+@[^/\s]+\/\d+|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+|napi_[a-z0-9_-]{16,}|cf_[a-z0-9_-]{16,})/i;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonIfPresent = (rootDir, filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const stringArray = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const uniqueStrings = (value) => [...new Set(stringArray(value))];

const proofSection = (proof, key) =>
  isPlainObject(proof?.[key]) ? proof[key] : {};

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

const readCloudflareTargets = (rootDir) => {
  const targets = readJsonIfPresent(rootDir, RELEASE_TARGETS_PATH);
  const cloudflare = isPlainObject(targets?.cloudflare)
    ? targets.cloudflare
    : {};
  return {
    expectedWorkers: stringArray(cloudflare.expectedWorkers),
    expectedAdminWorker:
      typeof cloudflare.expectedAdminWorker === "string"
        ? cloudflare.expectedAdminWorker.trim()
        : "",
  };
};

const validateNoSecretProof = (proof, proofPath, expectedWorkers) => {
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

  const expectedWorkerSet = new Set(expectedWorkers);
  const unexpectedWorkers = stringArray(
    proofSection(proof, "workers").observedWorkers,
  ).filter((worker) => !expectedWorkerSet.has(worker));
  if (unexpectedWorkers.length > 0) {
    throw new Error(
      `${proofPath} contains unexpected Cloudflare Worker names: ${unexpectedWorkers.join(", ")}`,
    );
  }

  return proof;
};

const readProof = (rootDir, proofPath, expectedWorkers) => {
  const localProof = readJsonIfPresent(rootDir, proofPath);
  if (localProof) {
    return validateNoSecretProof(localProof, proofPath, expectedWorkers);
  }

  const fallback =
    proofPath === DEFAULT_PROOF_PATH
      ? readJsonIfPresent(rootDir, DEFAULT_OUTPUT_PATH)
      : null;
  if (fallback) {
    return validateNoSecretProof(
      fallback,
      DEFAULT_OUTPUT_PATH,
      expectedWorkers,
    );
  }

  return {};
};

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const numberFrom = (source, key, fallback = 0) =>
  Number.isInteger(source?.[key]) && source[key] >= 0 ? source[key] : fallback;

const stringFrom = (source, key, fallback = "") =>
  typeof source?.[key] === "string" ? source[key].trim() : fallback;

const noteFrom = (source, key, fallback) =>
  typeof source?.[key] === "string" && source[key].trim()
    ? source[key].trim()
    : fallback;

const buildNextEvidenceRequired = ({
  expectedWorkers,
  observedWorkers,
  productionDeployVerified,
  expectedAdminWorker,
  adminWorkerVerified,
  resources,
  networking,
}) => {
  const observedWorkerSet = new Set(observedWorkers);
  const next = [];

  for (const worker of expectedWorkers) {
    if (!observedWorkerSet.has(worker)) {
      next.push(`Cloudflare Worker list or deployment proof for ${worker}`);
    }
  }
  if (!productionDeployVerified) {
    next.push("Production deployment proof for required Cloudflare Workers");
  }
  if (expectedAdminWorker && !adminWorkerVerified) {
    next.push(`Admin OpenNext Worker proof for ${expectedAdminWorker}`);
  }
  if (resources.r2BucketsVerified !== true) {
    next.push("R2 upload bucket proof for staging and production");
  }
  if (resources.queuesVerified !== true) {
    next.push("Queue proof for operations, notifications, and scheduler flows");
  }
  if (resources.deadLetterQueuesVerified !== true) {
    next.push("Dead-letter Queue proof for asynchronous failure handling");
  }
  if (resources.cronTriggersVerified !== true) {
    next.push("Cron trigger proof for scheduled Workers");
  }
  if (resources.workerSecretBindingsVerified !== true) {
    next.push("Worker secret binding presence proof without values");
  }
  if (networking.customDomainsVerified !== true) {
    next.push(
      "Custom domain proof for public app, API, notifications, scheduler, and admin",
    );
  }
  if (networking.certificatesVerified !== true) {
    next.push(
      "TLS certificate proof for public app, API, notifications, scheduler, and admin",
    );
  }

  return next;
};

export const buildCloudflareRuntimeEvidence = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  now = () => new Date(),
} = {}) => {
  const { expectedWorkers, expectedAdminWorker } =
    readCloudflareTargets(rootDir);
  const proof = readProof(rootDir, proofPath, expectedWorkers);
  const proofWorkers = proofSection(proof, "workers");
  const proofResources = proofSection(proof, "resources");
  const proofNetworking = proofSection(proof, "networking");
  const observedWorkers = uniqueStrings(proofWorkers.observedWorkers);
  const observedWorkerSet = new Set(observedWorkers);
  const productionDeployVerified = boolFrom(
    proofWorkers,
    "productionDeployVerified",
  );
  const adminWorkerVerified =
    expectedAdminWorker.length > 0 &&
    observedWorkerSet.has(expectedAdminWorker) &&
    boolFrom(proofWorkers, "adminWorkerVerified");

  const workers = {
    expectedWorkers,
    observedWorkers,
    productionDeployVerified,
    adminWorkerVerified,
    note: noteFrom(
      proofWorkers,
      "note",
      "This evidence records only Worker names and proof booleans. No deployment token or Worker secret value is stored.",
    ),
  };

  const resources = {
    r2BucketsVerified: boolFrom(proofResources, "r2BucketsVerified"),
    r2ApiReadBlockedByAccountActivation: boolFrom(
      proofResources,
      "r2ApiReadBlockedByAccountActivation",
    ),
    r2ReadErrorCode: stringFrom(proofResources, "r2ReadErrorCode"),
    queuesVerified: boolFrom(proofResources, "queuesVerified"),
    observedQueueCount: numberFrom(proofResources, "observedQueueCount"),
    deadLetterQueuesVerified: boolFrom(
      proofResources,
      "deadLetterQueuesVerified",
    ),
    cronTriggersVerified: boolFrom(proofResources, "cronTriggersVerified"),
    workerSecretBindingsVerified: boolFrom(
      proofResources,
      "workerSecretBindingsVerified",
    ),
    note: noteFrom(
      proofResources,
      "note",
      "This evidence records only R2, Queue, cron trigger, and binding presence booleans. No secret binding values are stored.",
    ),
  };

  const expectedDomains = stringArray(proofNetworking.expectedDomains);
  const networking = {
    customDomainsVerified: boolFrom(proofNetworking, "customDomainsVerified"),
    certificatesVerified: boolFrom(proofNetworking, "certificatesVerified"),
    expectedDomains: uniqueStrings([
      ...DEFAULT_EXPECTED_DOMAINS,
      ...expectedDomains,
    ]),
    note: noteFrom(
      proofNetworking,
      "note",
      "This evidence records only domain and certificate proof booleans. No zone token, private key, or certificate material is stored.",
    ),
  };

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/generate-cloudflare-runtime-evidence.mjs from local no-secret proof booleans; raw tokens, DSNs, webhooks, private keys, and secret values are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    workers,
    resources,
    networking,
    nextEvidenceRequired: buildNextEvidenceRequired({
      expectedWorkers,
      observedWorkers,
      productionDeployVerified,
      expectedAdminWorker,
      adminWorkerVerified,
      resources,
      networking,
    }),
  };
};

export const writeCloudflareRuntimeEvidenceFile = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  now = () => new Date(),
} = {}) => {
  const evidence = buildCloudflareRuntimeEvidence({
    rootDir,
    proofPath,
    now,
  });
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
  const outputPath = writeCloudflareRuntimeEvidenceFile();
  console.log(
    `[cloudflare-runtime-evidence] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
