import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_EXPECTED_DOMAINS,
  assertCloudflareDomainsInScope,
  containsRawSecretValue,
  isPlainObject,
  stringArray,
  uniqueStrings,
} from "./generate-cloudflare-runtime-evidence.mjs";

const DEFAULT_INPUT_PATH = "release/cloudflare-observation.local.json";
const DEFAULT_OUTPUT_PATH = "release/cloudflare-proof.local.json";
const DEFAULT_TARGETS_PATH = "release/release-targets.json";

const resolveFromCwd = (filePath) =>
  path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const readJsonFile = (filePath, { missingFallback } = {}) => {
  const absolutePath = resolveFromCwd(filePath);
  if (!fs.existsSync(absolutePath)) {
    if (typeof missingFallback === "function") return missingFallback();
    throw new Error(`${filePath} is missing`);
  }
  return JSON.parse(
    fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, ""),
  );
};

export const readCloudflareReleaseTargets = ({
  targetsPath = DEFAULT_TARGETS_PATH,
} = {}) => {
  const targets = readJsonFile(targetsPath, {
    missingFallback: () => ({ cloudflare: {} }),
  });
  const cloudflareTargets = isPlainObject(targets.cloudflare)
    ? targets.cloudflare
    : {};

  return {
    expectedWorkers: stringArray(cloudflareTargets.expectedWorkers),
    expectedAdminWorker:
      typeof cloudflareTargets.expectedAdminWorker === "string"
        ? cloudflareTargets.expectedAdminWorker.trim()
        : "",
    expectedWorkerSecrets: isPlainObject(
      cloudflareTargets.expectedWorkerSecrets,
    )
      ? Object.fromEntries(
          Object.entries(cloudflareTargets.expectedWorkerSecrets)
            .map(([workerName, secretNames]) => [
              workerName.trim(),
              uniqueStrings(secretNames),
            ])
            .filter(
              ([workerName, secretNames]) =>
                workerName.length > 0 && secretNames.length > 0,
            ),
        )
      : {},
  };
};

const section = (value, key) => (isPlainObject(value?.[key]) ? value[key] : {});

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const stringFrom = (source, key, fallback = "") =>
  typeof source?.[key] === "string" ? source[key].trim() : fallback;

const numberFrom = (source, key, fallback = 0) =>
  Number.isInteger(source?.[key]) && source[key] >= 0 ? source[key] : fallback;

const hasAll = (observed, expected) => {
  const observedSet = new Set(observed);
  return expected.length > 0 && expected.every((item) => observedSet.has(item));
};

const normalizeExpectedWorkers = (expectedWorkers) =>
  uniqueStrings(expectedWorkers).filter(Boolean);

const normalizeExpectedWorkerSecrets = (
  expectedWorkerSecrets,
  expectedWorkers,
) => {
  if (!isPlainObject(expectedWorkerSecrets)) return {};
  const expectedWorkerSet = new Set(expectedWorkers);
  return Object.fromEntries(
    Object.entries(expectedWorkerSecrets)
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

const normalizeExpectedDomains = (expectedDomains) =>
  uniqueStrings([...DEFAULT_EXPECTED_DOMAINS, ...stringArray(expectedDomains)]);

const buildDefaultBlockedObservation = () => ({
  schemaVersion: 1,
  secretsRedacted: true,
  containsSecretValues: false,
  workers: {
    observedWorkers: [],
    productionDeployVerified: false,
  },
  resources: {
    r2BucketsVerified: false,
    r2ApiReadBlockedByAccountActivation: false,
    r2ReadErrorCode: "",
    queuesVerified: false,
    observedQueueCount: 0,
    deadLetterQueuesVerified: false,
    cronTriggersVerified: false,
    workerSecretBindingsVerified: false,
    workerSecretBindings: {},
  },
  networking: {
    observedDomains: [],
    activeTlsCertificates: [],
  },
});

const validateObservation = (
  observation,
  inputPath,
  expectedWorkers,
  expectedDomains,
  expectedWorkerSecrets = {},
) => {
  if (
    observation.schemaVersion !== 1 ||
    observation.secretsRedacted !== true ||
    observation.containsSecretValues !== false
  ) {
    throw new Error(
      `${inputPath} must use schemaVersion 1, secretsRedacted=true, and containsSecretValues=false`,
    );
  }

  const expectedWorkerSet = new Set(expectedWorkers);
  const unexpectedWorkers = stringArray(
    section(observation, "workers").observedWorkers,
  ).filter((worker) => !expectedWorkerSet.has(worker));
  if (unexpectedWorkers.length > 0) {
    throw new Error(
      `${inputPath} contains unexpected Cloudflare Worker names: ${unexpectedWorkers.join(", ")}`,
    );
  }

  const networking = section(observation, "networking");
  assertCloudflareDomainsInScope({
    domains: networking.observedDomains,
    proofPath: inputPath,
    expectedDomains,
  });
  assertCloudflareDomainsInScope({
    domains: networking.activeTlsCertificates,
    proofPath: inputPath,
    label: "Cloudflare TLS certificate domains",
    expectedDomains,
  });

  validateWorkerSecretBindings({
    bindings: section(observation, "resources").workerSecretBindings,
    expectedWorkers,
    expectedWorkerSecrets,
    inputPath,
  });

  if (containsRawSecretValue(observation)) {
    throw new Error(`${inputPath} must contain no raw secret values`);
  }
};

const observedSecretNameArray = (value, inputPath) => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (typeof item === "string") return item.trim();
    if (isPlainObject(item)) {
      const keys = Object.keys(item);
      const hasRawPayloadKey = keys.some((key) =>
        /^(text|value|rawValue|secretValue|bindingValue|key_base64|key_jwk|privateKey|serviceAccountJson)$/i.test(
          key,
        ),
      );
      if (hasRawPayloadKey) {
        throw new Error(
          `${inputPath} contains raw Worker secret binding values; store only secret names`,
        );
      }
      if (typeof item.name === "string") return item.name.trim();
    }
    return "";
  });
};

const validateWorkerSecretBindings = ({
  bindings,
  expectedWorkers,
  expectedWorkerSecrets,
  inputPath,
}) => {
  if (bindings === undefined) return;
  if (!isPlainObject(bindings)) {
    throw new Error(
      `${inputPath} workerSecretBindings must be an object keyed by expected Worker name`,
    );
  }

  const expectedWorkerSet = new Set(expectedWorkers);
  const expectedSecretSetByWorker = new Map(
    Object.entries(expectedWorkerSecrets).map(([workerName, secretNames]) => [
      workerName,
      new Set(secretNames),
    ]),
  );

  for (const [workerName, observedSecretNames] of Object.entries(bindings)) {
    if (!expectedWorkerSet.has(workerName)) {
      throw new Error(
        `${inputPath} contains unexpected Cloudflare Worker secret binding names for ${workerName}`,
      );
    }
    const expectedSecretSet = expectedSecretSetByWorker.get(workerName);
    const unexpectedSecretNames = observedSecretNameArray(
      observedSecretNames,
      inputPath,
    ).filter(
      (secretName) =>
        secretName.length > 0 &&
        expectedSecretSet &&
        !expectedSecretSet.has(secretName),
    );
    if (unexpectedSecretNames.length > 0) {
      throw new Error(
        `${inputPath} contains unexpected Worker secret names for ${workerName}: ${unexpectedSecretNames.join(", ")}`,
      );
    }
  }
};

const normalizeWorkerSecretBindings = ({
  bindings,
  expectedWorkerSecrets,
  inputPath,
}) => {
  if (!isPlainObject(bindings)) return {};

  return Object.fromEntries(
    Object.entries(expectedWorkerSecrets)
      .map(([workerName, expectedSecretNames]) => {
        const observedSecretNames = uniqueStrings(
          observedSecretNameArray(bindings[workerName], inputPath),
        ).filter((secretName) => expectedSecretNames.includes(secretName));
        return [workerName, observedSecretNames];
      })
      .filter(([, observedSecretNames]) => observedSecretNames.length > 0),
  );
};

const missingWorkerSecretBindings = ({
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

const hasExpectedWorkerSecretBindings = ({
  observedWorkerSecretBindings,
  expectedWorkerSecrets,
}) => {
  const expectedEntries = Object.entries(expectedWorkerSecrets);
  if (expectedEntries.length === 0) return false;
  return expectedEntries.every(([workerName, expectedSecretNames]) =>
    hasAll(observedWorkerSecretBindings[workerName] ?? [], expectedSecretNames),
  );
};

export const buildCloudflareProof = ({
  observation,
  inputPath = DEFAULT_INPUT_PATH,
  expectedWorkers = [],
  expectedAdminWorker = "",
  expectedDomains = DEFAULT_EXPECTED_DOMAINS,
  expectedWorkerSecrets = {},
  now = () => new Date(),
} = {}) => {
  const normalizedExpectedWorkers = normalizeExpectedWorkers(expectedWorkers);
  const normalizedExpectedDomains = normalizeExpectedDomains(expectedDomains);
  const normalizedExpectedWorkerSecrets = normalizeExpectedWorkerSecrets(
    expectedWorkerSecrets,
    normalizedExpectedWorkers,
  );
  validateObservation(
    observation,
    inputPath,
    normalizedExpectedWorkers,
    normalizedExpectedDomains,
    normalizedExpectedWorkerSecrets,
  );

  const workersInput = section(observation, "workers");
  const resourcesInput = section(observation, "resources");
  const networkingInput = section(observation, "networking");
  const observedWorkers = uniqueStrings(workersInput.observedWorkers).filter(
    (worker) => normalizedExpectedWorkers.includes(worker),
  );
  const observedDomains = uniqueStrings(networkingInput.observedDomains);
  const activeTlsCertificates = uniqueStrings(
    networkingInput.activeTlsCertificates,
  );
  const workerSecretBindings = normalizeWorkerSecretBindings({
    bindings: resourcesInput.workerSecretBindings,
    expectedWorkerSecrets: normalizedExpectedWorkerSecrets,
    inputPath,
  });
  const missingWorkerSecrets = missingWorkerSecretBindings({
    observedWorkerSecretBindings: workerSecretBindings,
    expectedWorkerSecrets: normalizedExpectedWorkerSecrets,
  });
  const workerSecretBindingsVerified = hasExpectedWorkerSecretBindings({
    observedWorkerSecretBindings: workerSecretBindings,
    expectedWorkerSecrets: normalizedExpectedWorkerSecrets,
  });
  const adminWorkerVerified =
    expectedAdminWorker.length > 0 &&
    observedWorkers.includes(expectedAdminWorker) &&
    boolFrom(workersInput, "productionDeployVerified");

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/collect-cloudflare-proof.mjs from local no-secret read-only Cloudflare observations; raw tokens, secret values, private keys, certificates, and copied runtime payloads are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    workers: {
      observedWorkers,
      productionDeployVerified:
        boolFrom(workersInput, "productionDeployVerified") &&
        hasAll(observedWorkers, normalizedExpectedWorkers),
      adminWorkerVerified,
      note: "Worker proof records only expected Salary Hijacking Worker names and booleans. No Cloudflare credential, script body, binding value, or deployment payload is stored.",
    },
    resources: {
      r2BucketsVerified: boolFrom(resourcesInput, "r2BucketsVerified"),
      r2ApiReadBlockedByAccountActivation: boolFrom(
        resourcesInput,
        "r2ApiReadBlockedByAccountActivation",
      ),
      r2ReadErrorCode: stringFrom(resourcesInput, "r2ReadErrorCode"),
      queuesVerified: boolFrom(resourcesInput, "queuesVerified"),
      observedQueueCount: numberFrom(resourcesInput, "observedQueueCount"),
      deadLetterQueuesVerified: boolFrom(
        resourcesInput,
        "deadLetterQueuesVerified",
      ),
      cronTriggersVerified: boolFrom(resourcesInput, "cronTriggersVerified"),
      workerSecretBindings,
      missingWorkerSecretBindings: missingWorkerSecrets,
      workerSecretBindingsVerified,
      note: "Resource proof records only R2, Queue, cron, and Worker secret binding presence by secret name. No secret binding values or copied resource payloads are stored.",
    },
    networking: {
      customDomainsVerified: hasAll(observedDomains, normalizedExpectedDomains),
      certificatesVerified: hasAll(
        activeTlsCertificates,
        normalizedExpectedDomains,
      ),
      expectedDomains: normalizedExpectedDomains,
      note: "Networking proof records only expected hostnames and certificate status booleans. No certificate material, private key, zone token, or DNS secret is stored.",
    },
  };
};

export const collectCloudflareProof = ({
  inputPath = DEFAULT_INPUT_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  expectedWorkers = [],
  expectedAdminWorker = "",
  expectedDomains = DEFAULT_EXPECTED_DOMAINS,
  expectedWorkerSecrets = {},
  now = () => new Date(),
  writeFile = true,
} = {}) => {
  const observation = readJsonFile(inputPath, {
    missingFallback: buildDefaultBlockedObservation,
  });
  const proof = buildCloudflareProof({
    observation,
    inputPath,
    expectedWorkers,
    expectedAdminWorker,
    expectedDomains,
    expectedWorkerSecrets,
    now,
  });

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
  const { expectedWorkers, expectedAdminWorker, expectedWorkerSecrets } =
    readCloudflareReleaseTargets();
  const proof = collectCloudflareProof({
    expectedWorkers,
    expectedAdminWorker,
    expectedWorkerSecrets,
  });
  const verified =
    proof.workers.productionDeployVerified === true &&
    proof.workers.adminWorkerVerified === true &&
    proof.resources.r2BucketsVerified === true &&
    proof.resources.queuesVerified === true &&
    proof.resources.deadLetterQueuesVerified === true &&
    proof.resources.cronTriggersVerified === true &&
    proof.resources.workerSecretBindingsVerified === true &&
    proof.networking.customDomainsVerified === true &&
    proof.networking.certificatesVerified === true;
  console.log(
    `[cloudflare-proof] wrote ${DEFAULT_OUTPUT_PATH}; verified=${verified}`,
  );
  if (!verified) process.exitCode = 1;
}
