import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectDatabaseProof } from "./collect-database-proof.mjs";

const writeJson = (rootDir, filePath, value) => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};

const makeRoot = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-database-proof-"));

const completeInput = {
  schemaVersion: 1,
  secretsRedacted: true,
  containsSecretValues: false,
  neon: {
    projectMatched: true,
    mainBranchReady: true,
    stagingBranchReady: true,
  },
  commands: {
    migrationValidation: {
      verified: true,
      environment: "local-safe",
      exitCode: 0,
    },
    stagingMigration: {
      verified: true,
      environment: "staging",
      exitCode: 0,
    },
    productionMigrationDryRun: {
      verified: true,
      environment: "production",
      dryRun: true,
      exitCode: 0,
    },
    stagingSeed: {
      verified: true,
      environment: "staging",
      syntheticDataOnly: true,
      exitCode: 0,
    },
    stagingApiSmoke: {
      verified: true,
      environment: "staging",
      noRawPayloadStored: true,
      exitCode: 0,
    },
    adminSmoke: {
      verified: true,
      environment: "staging",
      noRawPayloadStored: true,
      exitCode: 0,
    },
    serverAuthoritySmoke: {
      verified: true,
      environment: "staging",
      noRawPayloadStored: true,
      exitCode: 0,
    },
    privacySmoke: {
      verified: true,
      environment: "staging",
      noRawPayloadStored: true,
      exitCode: 0,
    },
    rollbackRehearsal: {
      verified: true,
      environment: "staging-drill",
      exitCode: 0,
    },
  },
};

test("normalizes no-secret database command proof into release proof booleans", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/database-command-proof.local.json",
    completeInput,
  );
  const outputPath = path.join(rootDir, "release", "database-proof.local.json");

  const proof = collectDatabaseProof({
    inputPath,
    outputPath,
    now: () => new Date("2026-07-01T15:00:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.observedAt, "2026-07-01T15:00:00.000Z");
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.equal(proof.neon.projectMatched, true);
  assert.equal(proof.neon.mainBranchReady, true);
  assert.equal(proof.neon.stagingBranchReady, true);
  assert.equal(proof.migrations.migrationValidationVerified, true);
  assert.equal(proof.migrations.stagingMigrationExecuted, true);
  assert.equal(proof.migrations.productionMigrationDryRunVerified, true);
  assert.equal(proof.seeds.stagingSeedExecuted, true);
  assert.equal(proof.seeds.productionSeedExecuted, false);
  assert.equal(proof.seeds.destructiveProductionSeedBlocked, true);
  assert.equal(proof.smoke.stagingApiSmokeVerified, true);
  assert.equal(proof.smoke.adminSmokeVerified, true);
  assert.equal(proof.smoke.serverAuthoritySmokeVerified, true);
  assert.equal(proof.smoke.privacySmokeVerified, true);
  assert.equal(proof.smoke.noRawFinancialDataInSmokePayloads, true);
  assert.equal(proof.rollback.rollbackRehearsalVerified, true);

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(written, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(written, /salaryAmount|responsePayload|authToken/i);
});

test("keeps unverified gates false when command proof is incomplete", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/database-command-proof.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      commands: {
        migrationValidation: {
          verified: true,
          environment: "local-safe",
          exitCode: 0,
        },
        stagingMigration: {
          verified: true,
          environment: "production",
          exitCode: 0,
        },
        stagingSeed: {
          verified: true,
          environment: "staging",
          syntheticDataOnly: false,
          exitCode: 0,
        },
      },
    },
  );

  const proof = collectDatabaseProof({
    inputPath,
    writeFile: false,
  });

  assert.equal(proof.migrations.migrationValidationVerified, true);
  assert.equal(proof.migrations.stagingMigrationExecuted, false);
  assert.equal(proof.migrations.productionMigrationDryRunVerified, false);
  assert.equal(proof.seeds.stagingSeedExecuted, false);
  assert.equal(proof.smoke.noRawFinancialDataInSmokePayloads, false);
});

test("rejects database command proof containing raw database URLs or secrets", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/database-command-proof.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      commands: {
        migrationValidation: {
          verified: true,
          environment: "local-safe",
          exitCode: 0,
          note: "postgresql://user:password@host.neon.tech/neondb",
        },
      },
    },
  );

  assert.throws(
    () =>
      collectDatabaseProof({
        inputPath,
        writeFile: false,
      }),
    /raw database URLs or secret values/i,
  );
});

test("rejects smoke proof containing raw payloads or sensitive user data keys", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/database-command-proof.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      commands: {
        stagingApiSmoke: {
          verified: true,
          environment: "staging",
          exitCode: 0,
          responsePayload: {
            email: "actual-user@example.com",
            salaryAmount: 2700000,
          },
        },
      },
    },
  );

  assert.throws(
    () =>
      collectDatabaseProof({
        inputPath,
        writeFile: false,
      }),
    /raw smoke payloads or sensitive user data/i,
  );
});

test("rejects smoke proof containing raw auth or cookie headers", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/database-command-proof.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      commands: {
        privacySmoke: {
          verified: true,
          environment: "staging",
          noRawPayloadStored: true,
          exitCode: 0,
          requestHeaders: {
            Authorization: "Bearer copied-runtime-token",
            Cookie: "session=raw-session-cookie",
          },
        },
      },
    },
  );

  assert.throws(
    () =>
      collectDatabaseProof({
        inputPath,
        writeFile: false,
      }),
    /raw smoke payloads or sensitive user data/i,
  );
});

test("rejects any production seed proof even when marked synthetic", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/database-command-proof.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      seeds: {
        productionSeedExecuted: true,
      },
      commands: {
        stagingSeed: {
          verified: true,
          environment: "production",
          syntheticDataOnly: true,
          exitCode: 0,
        },
      },
    },
  );

  assert.throws(
    () =>
      collectDatabaseProof({
        inputPath,
        writeFile: false,
      }),
    /production seed/i,
  );
});
