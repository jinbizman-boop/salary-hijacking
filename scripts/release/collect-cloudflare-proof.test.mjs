import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectCloudflareProof,
  readCloudflareReleaseTargets,
} from "./collect-cloudflare-proof.mjs";

const expectedWorkers = [
  "salary-hijacking-api",
  "salary-hijacking-notifications",
  "salary-hijacking-scheduler",
  "salary-hijacking-admin",
];

const expectedDomains = [
  "salaryhijacking.com",
  "www.salaryhijacking.com",
  "api.salaryhijacking.com",
  "notifications.salaryhijacking.com",
  "scheduler.salaryhijacking.com",
  "admin.salaryhijacking.com",
];

const expectedWorkerSecrets = {
  "salary-hijacking-api": [
    "AUDIT_HASH_SECRET",
    "AUTH_JWT_SECRET",
    "DATABASE_URL",
    "HASH_SECRET",
    "JWT_SECRET",
    "OPERATION_WEBHOOK_TOKEN",
    "RATE_LIMIT_HASH_SECRET",
    "SENTRY_DSN",
    "SLACK_WEBHOOK_URL",
  ],
  "salary-hijacking-notifications": [
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN",
    "NOTIFICATIONS_SERVICE_TOKEN_SHA256",
    "SENTRY_DSN",
  ],
  "salary-hijacking-scheduler": [
    "API_INTERNAL_SERVICE_TOKEN",
    "SCHEDULER_OPERATION_WEBHOOK_TOKEN",
    "SCHEDULER_SERVICE_TOKEN_SHA256",
    "SENTRY_DSN",
  ],
  "salary-hijacking-admin": ["SENTRY_DSN"],
};

const writeJson = (rootDir, filePath, value) => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};

const makeRoot = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-cloudflare-proof-"));

const completeObservation = {
  schemaVersion: 1,
  secretsRedacted: true,
  containsSecretValues: false,
  workers: {
    observedWorkers: expectedWorkers,
    productionDeployVerified: true,
  },
  resources: {
    r2BucketsVerified: true,
    queuesVerified: true,
    observedQueueCount: 6,
    deadLetterQueuesVerified: true,
    cronTriggersVerified: true,
    workerSecretBindings: expectedWorkerSecrets,
  },
  networking: {
    observedDomains: expectedDomains,
    activeTlsCertificates: expectedDomains,
  },
};

test("normalizes no-secret Cloudflare observation into release proof booleans", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    completeObservation,
  );
  const outputPath = path.join(
    rootDir,
    "release",
    "cloudflare-proof.local.json",
  );

  const proof = collectCloudflareProof({
    inputPath,
    outputPath,
    expectedWorkers,
    expectedAdminWorker: "salary-hijacking-admin",
    expectedDomains,
    expectedWorkerSecrets,
    now: () => new Date("2026-07-01T17:00:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.observedAt, "2026-07-01T17:00:00.000Z");
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.deepEqual(proof.workers.observedWorkers, expectedWorkers);
  assert.equal(proof.workers.productionDeployVerified, true);
  assert.equal(proof.workers.adminWorkerVerified, true);
  assert.equal(proof.resources.r2BucketsVerified, true);
  assert.equal(proof.resources.queuesVerified, true);
  assert.equal(proof.resources.observedQueueCount, 6);
  assert.equal(proof.resources.deadLetterQueuesVerified, true);
  assert.equal(proof.resources.cronTriggersVerified, true);
  assert.equal(proof.resources.workerSecretBindingsVerified, true);
  assert.deepEqual(proof.resources.workerSecretBindings, expectedWorkerSecrets);
  assert.deepEqual(proof.resources.missingWorkerSecretBindings, {});
  assert.equal(proof.networking.customDomainsVerified, true);
  assert.equal(proof.networking.certificatesVerified, true);
  assert.deepEqual(proof.networking.expectedDomains, expectedDomains);

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(
    written,
    /cf_live_token_value|-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  );
});

test("reads expected Worker targets from release manifest for CLI proof collection", () => {
  const rootDir = makeRoot();
  const targetsPath = writeJson(rootDir, "release/release-targets.json", {
    schemaVersion: 1,
    cloudflare: {
      expectedWorkers,
      expectedAdminWorker: "salary-hijacking-admin",
      expectedWorkerSecrets,
    },
  });

  const targets = readCloudflareReleaseTargets({ targetsPath });

  assert.deepEqual(targets.expectedWorkers, expectedWorkers);
  assert.equal(targets.expectedAdminWorker, "salary-hijacking-admin");
  assert.deepEqual(targets.expectedWorkerSecrets, expectedWorkerSecrets);
});

test("keeps proof false for incomplete observations", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      workers: {
        observedWorkers: ["salary-hijacking-api"],
        productionDeployVerified: false,
      },
      resources: {
        r2ApiReadBlockedByAccountActivation: true,
        r2ReadErrorCode: "10042",
        observedQueueCount: 0,
      },
      networking: {
        observedDomains: ["api.salaryhijacking.com"],
        activeTlsCertificates: [],
      },
    },
  );

  const proof = collectCloudflareProof({
    inputPath,
    expectedWorkers,
    expectedAdminWorker: "salary-hijacking-admin",
    expectedDomains,
    expectedWorkerSecrets,
    writeFile: false,
  });

  assert.deepEqual(proof.workers.observedWorkers, ["salary-hijacking-api"]);
  assert.equal(proof.workers.productionDeployVerified, false);
  assert.equal(proof.workers.adminWorkerVerified, false);
  assert.equal(proof.resources.r2BucketsVerified, false);
  assert.equal(proof.resources.r2ApiReadBlockedByAccountActivation, true);
  assert.equal(proof.resources.r2ReadErrorCode, "10042");
  assert.equal(proof.resources.queuesVerified, false);
  assert.equal(proof.resources.workerSecretBindingsVerified, false);
  assert.deepEqual(proof.resources.workerSecretBindings, {});
  assert.equal(proof.networking.customDomainsVerified, false);
  assert.equal(proof.networking.certificatesVerified, false);
});

test("keeps Worker secret binding proof false when an expected secret name is missing", () => {
  const rootDir = makeRoot();
  const incompleteWorkerSecrets = {
    ...expectedWorkerSecrets,
    "salary-hijacking-api": expectedWorkerSecrets[
      "salary-hijacking-api"
    ].filter((secretName) => secretName !== "DATABASE_URL"),
  };
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    {
      ...completeObservation,
      resources: {
        ...completeObservation.resources,
        workerSecretBindings: incompleteWorkerSecrets,
      },
    },
  );

  const proof = collectCloudflareProof({
    inputPath,
    expectedWorkers,
    expectedAdminWorker: "salary-hijacking-admin",
    expectedDomains,
    expectedWorkerSecrets,
    writeFile: false,
  });

  assert.equal(proof.resources.workerSecretBindingsVerified, false);
  assert.deepEqual(proof.resources.missingWorkerSecretBindings, {
    "salary-hijacking-api": ["DATABASE_URL"],
  });
});

test("rejects Worker secret binding observations with raw secret payload keys", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    {
      ...completeObservation,
      resources: {
        ...completeObservation.resources,
        workerSecretBindings: {
          "salary-hijacking-api": [
            {
              name: "DATABASE_URL",
              text: "postgres://user:password@example.invalid/db",
            },
          ],
        },
      },
    },
  );

  assert.throws(
    () =>
      collectCloudflareProof({
        inputPath,
        expectedWorkers,
        expectedDomains,
        expectedWorkerSecrets,
        writeFile: false,
      }),
    /raw Worker secret binding values/i,
  );
});

test("writes blocked no-secret proof when Cloudflare observation file is missing", () => {
  const rootDir = makeRoot();
  const inputPath = path.join(
    rootDir,
    "release",
    "cloudflare-observation.local.json",
  );
  const outputPath = path.join(
    rootDir,
    "release",
    "cloudflare-proof.local.json",
  );

  const proof = collectCloudflareProof({
    inputPath,
    outputPath,
    expectedWorkers,
    expectedAdminWorker: "salary-hijacking-admin",
    expectedDomains,
    now: () => new Date("2026-07-02T05:40:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.observedAt, "2026-07-02T05:40:00.000Z");
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.deepEqual(proof.workers.observedWorkers, []);
  assert.equal(proof.workers.productionDeployVerified, false);
  assert.equal(proof.workers.adminWorkerVerified, false);
  assert.equal(proof.resources.r2BucketsVerified, false);
  assert.equal(proof.resources.queuesVerified, false);
  assert.equal(proof.resources.cronTriggersVerified, false);
  assert.equal(proof.resources.workerSecretBindingsVerified, false);
  assert.equal(proof.networking.customDomainsVerified, false);
  assert.equal(proof.networking.certificatesVerified, false);
  assert.deepEqual(proof.networking.expectedDomains, expectedDomains);

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(
    written,
    /cf_live_token_value|retrogames|-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  );
});

test("accepts UTF-8 BOM in local Cloudflare observation files", () => {
  const rootDir = makeRoot();
  const inputPath = path.join(
    rootDir,
    "release",
    "cloudflare-observation.local.json",
  );
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(
    inputPath,
    `\uFEFF${JSON.stringify(completeObservation, null, 2)}\n`,
    "utf8",
  );

  const proof = collectCloudflareProof({
    inputPath,
    expectedWorkers,
    expectedAdminWorker: "salary-hijacking-admin",
    expectedDomains,
    writeFile: false,
  });

  assert.equal(proof.workers.productionDeployVerified, true);
  assert.equal(proof.workers.adminWorkerVerified, true);
});

test("rejects observations containing raw Cloudflare or secret values", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      workers: {
        observedWorkers: expectedWorkers,
        apiTokenValue: "cf_live_token_value_that_must_not_be_stored",
      },
    },
  );

  assert.throws(
    () =>
      collectCloudflareProof({
        inputPath,
        expectedWorkers,
        writeFile: false,
      }),
    /raw secret values/i,
  );
});

test("rejects unrelated Worker observations", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      workers: {
        observedWorkers: ["salary-hijacking-api", "retro-db"],
      },
    },
  );

  assert.throws(
    () =>
      collectCloudflareProof({
        inputPath,
        expectedWorkers,
        writeFile: false,
      }),
    /unexpected Cloudflare Worker/i,
  );
});

test("rejects unrelated domain observations before proof generation", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/cloudflare-observation.local.json",
    {
      ...completeObservation,
      networking: {
        observedDomains: [...expectedDomains, "retrogames.kr"],
        activeTlsCertificates: [...expectedDomains, "retrogames.kr"],
      },
    },
  );

  assert.throws(
    () =>
      collectCloudflareProof({
        inputPath,
        expectedWorkers,
        expectedDomains,
        writeFile: false,
      }),
    /unexpected Cloudflare domain/i,
  );
});
