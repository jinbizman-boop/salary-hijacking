import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectCloudflareProof } from "./collect-cloudflare-proof.mjs";

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
    workerSecretBindingsVerified: true,
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
  assert.equal(proof.networking.customDomainsVerified, true);
  assert.equal(proof.networking.certificatesVerified, true);
  assert.deepEqual(proof.networking.expectedDomains, expectedDomains);

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(
    written,
    /cf_live_token_value|-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  );
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
    writeFile: false,
  });

  assert.deepEqual(proof.workers.observedWorkers, ["salary-hijacking-api"]);
  assert.equal(proof.workers.productionDeployVerified, false);
  assert.equal(proof.workers.adminWorkerVerified, false);
  assert.equal(proof.resources.r2BucketsVerified, false);
  assert.equal(proof.resources.r2ApiReadBlockedByAccountActivation, true);
  assert.equal(proof.resources.r2ReadErrorCode, "10042");
  assert.equal(proof.resources.queuesVerified, false);
  assert.equal(proof.networking.customDomainsVerified, false);
  assert.equal(proof.networking.certificatesVerified, false);
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
