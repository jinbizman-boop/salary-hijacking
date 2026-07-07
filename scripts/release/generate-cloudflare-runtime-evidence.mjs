import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RELEASE_TARGETS_PATH = "release/release-targets.json";
const DEFAULT_PROOF_PATH = "release/cloudflare-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/cloudflare-runtime-evidence.json";

export const DEFAULT_EXPECTED_DOMAINS = Object.freeze([
  "salaryhijacking.com",
  "www.salaryhijacking.com",
  "api.salaryhijacking.com",
  "notifications.salaryhijacking.com",
  "scheduler.salaryhijacking.com",
  "admin.salaryhijacking.com",
]);

export const RAW_SECRET_VALUE_KEYS = new Set([
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

export const RAW_SECRET_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|https?:\/\/hooks\.slack\.com\/services\/|https?:\/\/[^@\s]+@[^/\s]+\/\d+|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+|napi_[a-z0-9_-]{16,}|cf_[a-z0-9_-]{16,})/i;

export const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonIfPresent = (rootDir, filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

export const stringArray = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const uniqueStrings = (value) => [...new Set(stringArray(value))];

const proofSection = (proof, key) =>
  isPlainObject(proof?.[key]) ? proof[key] : {};

export const unexpectedCloudflareDomains = ({
  domains,
  expectedDomains = DEFAULT_EXPECTED_DOMAINS,
} = {}) => {
  const expectedDomainSet = new Set(uniqueStrings(expectedDomains));
  return uniqueStrings(domains).filter(
    (domain) => !expectedDomainSet.has(domain),
  );
};

export const assertCloudflareDomainsInScope = ({
  domains,
  proofPath,
  label = "Cloudflare domains",
  expectedDomains = DEFAULT_EXPECTED_DOMAINS,
} = {}) => {
  const unexpectedDomains = unexpectedCloudflareDomains({
    domains,
    expectedDomains,
  });
  if (unexpectedDomains.length > 0) {
    throw new Error(
      `${proofPath} contains unexpected ${label}: ${unexpectedDomains.join(", ")}`,
    );
  }
};

export const isRawSecretValueKey = (key) => {
  if (RAW_SECRET_VALUE_KEYS.has(key)) return true;
  return /(?:token|secret|password|connection|string|database|webhook|dsn|privatekey|serviceaccount).*value$/i.test(
    key,
  );
};

export const containsRawSecretValue = (value) => {
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
    expectedWorkerSecrets: normalizeWorkerSecretMap(
      cloudflare.expectedWorkerSecrets,
      stringArray(cloudflare.expectedWorkers),
    ),
  };
};

const observedSecretNameArray = (value, proofPath) => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (typeof item === "string") return item.trim();
    if (isPlainObject(item)) {
      const hasRawPayloadKey = Object.keys(item).some((key) =>
        /^(text|value|rawValue|secretValue|bindingValue|key_base64|key_jwk|privateKey|serviceAccountJson)$/i.test(
          key,
        ),
      );
      if (hasRawPayloadKey) {
        throw new Error(
          `${proofPath} contains raw Worker secret binding values; store only secret names`,
        );
      }
      if (typeof item.name === "string") return item.name.trim();
    }
    return "";
  });
};

const normalizeWorkerSecretMap = (value, expectedWorkers) => {
  if (!isPlainObject(value)) return {};
  const expectedWorkerSet = new Set(expectedWorkers);
  return Object.fromEntries(
    Object.entries(value)
      .map(([workerName, secretNames]) => [
        workerName.trim(),
        uniqueStrings(secretNames),
      ])
      .filter(
        ([workerName, secretNames]) =>
          expectedWorkerSet.has(workerName) && secretNames.length > 0,
      ),
  );
};

const normalizeWorkerSecretProofMap = ({
  value,
  proofPath,
  expectedWorkers,
  expectedWorkerSecrets,
}) => {
  if (!isPlainObject(value)) return {};
  const expectedWorkerSet = new Set(expectedWorkers);

  return Object.fromEntries(
    Object.entries(value)
      .map(([workerName, secretNames]) => {
        if (!expectedWorkerSet.has(workerName)) {
          throw new Error(
            `${proofPath} contains unexpected Cloudflare Worker secret binding names for ${workerName}`,
          );
        }
        const expectedSecretSet = new Set(expectedWorkerSecrets[workerName]);
        const observedSecretNames = uniqueStrings(
          observedSecretNameArray(secretNames, proofPath),
        ).filter((secretName) => {
          if (!expectedSecretSet.has(secretName)) {
            throw new Error(
              `${proofPath} contains unexpected Worker secret names for ${workerName}: ${secretName}`,
            );
          }
          return true;
        });
        return [workerName, observedSecretNames];
      })
      .filter(([, secretNames]) => secretNames.length > 0),
  );
};

const buildMissingWorkerSecretBindings = ({
  observedWorkerSecretBindings,
  expectedWorkerSecrets,
}) =>
  Object.fromEntries(
    Object.entries(expectedWorkerSecrets)
      .map(([workerName, expectedSecretNames]) => {
        const observedSecretSet = new Set(
          observedWorkerSecretBindings[workerName] ?? [],
        );
        return [
          workerName,
          expectedSecretNames.filter(
            (secretName) => !observedSecretSet.has(secretName),
          ),
        ];
      })
      .filter(([, missingSecretNames]) => missingSecretNames.length > 0),
  );

const validateNoSecretProof = (
  proof,
  proofPath,
  expectedWorkers,
  expectedWorkerSecrets = {},
) => {
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

  assertCloudflareDomainsInScope({
    domains: proofSection(proof, "networking").expectedDomains,
    proofPath,
  });

  normalizeWorkerSecretProofMap({
    value: proofSection(proof, "resources").workerSecretBindings,
    proofPath,
    expectedWorkers,
    expectedWorkerSecrets,
  });

  return proof;
};

const readProof = (
  rootDir,
  proofPath,
  expectedWorkers,
  expectedWorkerSecrets,
) => {
  const localProof = readJsonIfPresent(rootDir, proofPath);
  if (localProof) {
    return validateNoSecretProof(
      localProof,
      proofPath,
      expectedWorkers,
      expectedWorkerSecrets,
    );
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
      expectedWorkerSecrets,
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
  const { expectedWorkers, expectedAdminWorker, expectedWorkerSecrets } =
    readCloudflareTargets(rootDir);
  const proof = readProof(
    rootDir,
    proofPath,
    expectedWorkers,
    expectedWorkerSecrets,
  );
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
  const workerSecretBindings = normalizeWorkerSecretProofMap({
    value: proofResources.workerSecretBindings,
    proofPath,
    expectedWorkers,
    expectedWorkerSecrets,
  });
  const missingWorkerSecretBindings =
    isPlainObject(proofResources.missingWorkerSecretBindings) &&
    Object.keys(proofResources.missingWorkerSecretBindings).length > 0
      ? normalizeWorkerSecretProofMap({
          value: proofResources.missingWorkerSecretBindings,
          proofPath,
          expectedWorkers,
          expectedWorkerSecrets,
        })
      : buildMissingWorkerSecretBindings({
          observedWorkerSecretBindings: workerSecretBindings,
          expectedWorkerSecrets,
        });

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
    workerSecretBindings,
    missingWorkerSecretBindings,
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
