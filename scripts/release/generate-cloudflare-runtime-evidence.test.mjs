import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCloudflareRuntimeEvidence,
  writeCloudflareRuntimeEvidenceFile,
} from "./generate-cloudflare-runtime-evidence.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

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

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-cloudflare-evidence-"),
  );
  write(
    rootDir,
    "release/release-targets.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        cloudflare: {
          expectedWorkers,
          expectedAdminWorker: "salary-hijacking-admin",
          adminDeploymentType: "workers-opennext",
        },
      },
      null,
      2,
    ),
  );
  return rootDir;
};

test("builds blocked no-secret Cloudflare runtime evidence by default", () => {
  const rootDir = makeWorkspace();

  const evidence = buildCloudflareRuntimeEvidence({
    rootDir,
    now: () => new Date("2026-07-01T09:00:00.000Z"),
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.observedAt, "2026-07-01T09:00:00.000Z");
  assert.equal(evidence.secretsRedacted, true);
  assert.equal(evidence.containsSecretValues, false);
  assert.deepEqual(evidence.workers.expectedWorkers, expectedWorkers);
  assert.deepEqual(evidence.workers.observedWorkers, []);
  assert.equal(evidence.workers.productionDeployVerified, false);
  assert.equal(evidence.workers.adminWorkerVerified, false);
  assert.equal(evidence.resources.r2BucketsVerified, false);
  assert.equal(evidence.networking.customDomainsVerified, false);
  assert.deepEqual(evidence.networking.expectedDomains, expectedDomains);
  assert.ok(evidence.nextEvidenceRequired.length > 0);
  assert.doesNotMatch(JSON.stringify(evidence), /api[_-]?token/i);
});

test("uses a local proof file to mark Cloudflare runtime gates verified", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "cloudflare-proof.local.json",
  );
  write(
    rootDir,
    "release/cloudflare-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        workers: {
          observedWorkers: expectedWorkers,
          productionDeployVerified: true,
          adminWorkerVerified: true,
        },
        resources: {
          r2BucketsVerified: true,
          queuesVerified: true,
          deadLetterQueuesVerified: true,
          cronTriggersVerified: true,
          workerSecretBindingsVerified: true,
        },
        networking: {
          customDomainsVerified: true,
          certificatesVerified: true,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildCloudflareRuntimeEvidence({
    rootDir,
    proofPath,
    now: () => new Date("2026-07-01T09:30:00.000Z"),
  });

  assert.deepEqual(evidence.workers.observedWorkers, expectedWorkers);
  assert.equal(evidence.workers.productionDeployVerified, true);
  assert.equal(evidence.workers.adminWorkerVerified, true);
  assert.equal(evidence.resources.r2BucketsVerified, true);
  assert.equal(evidence.resources.queuesVerified, true);
  assert.equal(evidence.resources.deadLetterQueuesVerified, true);
  assert.equal(evidence.resources.cronTriggersVerified, true);
  assert.equal(evidence.resources.workerSecretBindingsVerified, true);
  assert.equal(evidence.networking.customDomainsVerified, true);
  assert.equal(evidence.networking.certificatesVerified, true);
  assert.deepEqual(evidence.nextEvidenceRequired, []);
});

test("preserves existing no-secret Cloudflare evidence when local proof is absent", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/cloudflare-runtime-evidence.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        workers: {
          observedWorkers: ["salary-hijacking-api"],
          productionDeployVerified: false,
        },
        resources: {
          observedQueueCount: 0,
          r2ApiReadBlockedByAccountActivation: true,
          r2ReadErrorCode: "10042",
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildCloudflareRuntimeEvidence({ rootDir });

  assert.deepEqual(evidence.workers.observedWorkers, ["salary-hijacking-api"]);
  assert.equal(evidence.resources.observedQueueCount, 0);
  assert.equal(evidence.resources.r2ApiReadBlockedByAccountActivation, true);
  assert.equal(evidence.resources.r2ReadErrorCode, "10042");
});

test("rejects proof files that contain raw Cloudflare secret values", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "cloudflare-proof.local.json",
  );
  write(
    rootDir,
    "release/cloudflare-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        workers: {
          observedWorkers: expectedWorkers,
          apiTokenValue: "cf_live_token_value_that_must_not_be_stored",
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildCloudflareRuntimeEvidence({ rootDir, proofPath }),
    /raw secret values/i,
  );
});

test("rejects unrelated observed Worker names", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "cloudflare-proof.local.json",
  );
  write(
    rootDir,
    "release/cloudflare-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        workers: {
          observedWorkers: ["salary-hijacking-api", "retro-db"],
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildCloudflareRuntimeEvidence({ rootDir, proofPath }),
    /unexpected Cloudflare Worker/i,
  );
});

test("rejects unrelated proof domains before runtime evidence generation", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "cloudflare-proof.local.json",
  );
  write(
    rootDir,
    "release/cloudflare-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        workers: {
          observedWorkers: expectedWorkers,
        },
        networking: {
          expectedDomains: [...expectedDomains, "retrogames.kr"],
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildCloudflareRuntimeEvidence({ rootDir, proofPath }),
    /unexpected Cloudflare domain/i,
  );
});

test("writes release/cloudflare-runtime-evidence.json with generated evidence", () => {
  const rootDir = makeWorkspace();

  const outputPath = writeCloudflareRuntimeEvidenceFile({
    rootDir,
    now: () => new Date("2026-07-01T10:00:00.000Z"),
  });

  assert.equal(
    outputPath,
    path.join(rootDir, "release", "cloudflare-runtime-evidence.json"),
  );
  const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(written.observedAt, "2026-07-01T10:00:00.000Z");
  assert.deepEqual(written.workers.expectedWorkers, expectedWorkers);
  assert.doesNotMatch(JSON.stringify(written), /api[_-]?token/i);
});
