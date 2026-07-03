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
) => {
  if (
    observation.schemaVersion !== 1 ||
    observation.secretsRedacted !== true ||
    observation.containsSecretValues !== false ||
    containsRawSecretValue(observation)
  ) {
    throw new Error(
      `${inputPath} must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no raw secret values`,
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
};

export const buildCloudflareProof = ({
  observation,
  inputPath = DEFAULT_INPUT_PATH,
  expectedWorkers = [],
  expectedAdminWorker = "",
  expectedDomains = DEFAULT_EXPECTED_DOMAINS,
  now = () => new Date(),
} = {}) => {
  const normalizedExpectedWorkers = normalizeExpectedWorkers(expectedWorkers);
  const normalizedExpectedDomains = normalizeExpectedDomains(expectedDomains);
  validateObservation(
    observation,
    inputPath,
    normalizedExpectedWorkers,
    normalizedExpectedDomains,
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
      workerSecretBindingsVerified: boolFrom(
        resourcesInput,
        "workerSecretBindingsVerified",
      ),
      note: "Resource proof records only R2, Queue, cron, and binding presence booleans. No secret binding values or copied resource payloads are stored.",
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
  const { expectedWorkers, expectedAdminWorker } =
    readCloudflareReleaseTargets();
  const proof = collectCloudflareProof({
    expectedWorkers,
    expectedAdminWorker,
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
