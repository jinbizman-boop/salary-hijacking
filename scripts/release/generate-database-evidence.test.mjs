import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDatabaseEvidence,
  writeDatabaseEvidenceFile,
} from "./generate-database-evidence.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "salary-db-evidence-"));
  write(
    rootDir,
    "release/release-targets.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        neon: {
          expectedProjectHint: "salary-hijacking",
        },
      },
      null,
      2,
    ),
  );
  write(rootDir, "database/migrations/0001_init_users.sql", "-- users\n");
  write(
    rootDir,
    "database/migrations/0002_payroll_budget_expense.sql",
    "-- payroll\n",
  );
  return rootDir;
};

test("builds blocked database evidence from checked-in migrations without secrets", () => {
  const rootDir = makeWorkspace();

  const evidence = buildDatabaseEvidence({
    rootDir,
    now: () => new Date("2026-07-01T05:00:00.000Z"),
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.observedAt, "2026-07-01T05:00:00.000Z");
  assert.equal(evidence.secretsRedacted, true);
  assert.equal(evidence.containsSecretValues, false);
  assert.equal(evidence.neon.expectedProjectHint, "salary-hijacking");
  assert.equal(evidence.neon.projectMatched, false);
  assert.equal(evidence.migrations.migrationFilesVerified, true);
  assert.equal(evidence.migrations.migrationFileCount, 2);
  assert.equal(evidence.migrations.migrationValidationVerified, false);
  assert.equal(evidence.seeds.stagingSeedExecuted, false);
  assert.equal(evidence.smoke.noRawFinancialDataInSmokePayloads, false);
  assert.equal(evidence.rollback.rollbackRehearsalVerified, false);
  assert.doesNotMatch(JSON.stringify(evidence), /postgres(?:ql)?:\/\//i);
});

test("uses a local proof file to mark verified database release gates", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "database-proof.local.json");
  write(
    rootDir,
    "release/database-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        neon: {
          projectMatched: true,
          mainBranchReady: true,
          stagingBranchReady: true,
        },
        migrations: {
          migrationValidationVerified: true,
          stagingMigrationExecuted: true,
          productionMigrationDryRunVerified: true,
        },
        seeds: {
          stagingSeedExecuted: true,
        },
        smoke: {
          stagingApiSmokeVerified: true,
          adminSmokeVerified: true,
          serverAuthoritySmokeVerified: true,
          privacySmokeVerified: true,
          noRawFinancialDataInSmokePayloads: true,
        },
        rollback: {
          rollbackRehearsalVerified: true,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildDatabaseEvidence({
    rootDir,
    proofPath,
    now: () => new Date("2026-07-01T05:30:00.000Z"),
  });

  assert.equal(evidence.neon.projectMatched, true);
  assert.equal(evidence.neon.mainBranchReady, true);
  assert.equal(evidence.neon.stagingBranchReady, true);
  assert.equal(evidence.migrations.migrationValidationVerified, true);
  assert.equal(evidence.migrations.stagingMigrationExecuted, true);
  assert.equal(evidence.migrations.productionMigrationDryRunVerified, true);
  assert.equal(evidence.seeds.stagingSeedExecuted, true);
  assert.equal(evidence.seeds.productionSeedExecuted, false);
  assert.equal(evidence.seeds.destructiveProductionSeedBlocked, true);
  assert.equal(evidence.smoke.stagingApiSmokeVerified, true);
  assert.equal(evidence.smoke.adminSmokeVerified, true);
  assert.equal(evidence.smoke.serverAuthoritySmokeVerified, true);
  assert.equal(evidence.smoke.privacySmokeVerified, true);
  assert.equal(evidence.smoke.noRawFinancialDataInSmokePayloads, true);
  assert.equal(evidence.rollback.rollbackRehearsalVerified, true);
});

test("preserves existing no-secret database evidence when local proof is absent", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/database-evidence.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        neon: {
          projectMatched: true,
          mainBranchReady: true,
          stagingBranchReady: true,
        },
        migrations: {
          migrationValidationVerified: true,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildDatabaseEvidence({
    rootDir,
  });

  assert.equal(evidence.neon.projectMatched, true);
  assert.equal(evidence.neon.mainBranchReady, true);
  assert.equal(evidence.neon.stagingBranchReady, true);
  assert.equal(evidence.migrations.migrationValidationVerified, true);
  assert.equal(evidence.migrations.migrationFileCount, 2);
});

test("rejects proof files that contain raw database URLs or secret values", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "database-proof.local.json");
  write(
    rootDir,
    "release/database-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        neon: {
          projectMatched: true,
          databaseUrl: "postgresql://user:password@host.neon.tech/db",
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () =>
      buildDatabaseEvidence({
        rootDir,
        proofPath,
      }),
    /raw database URLs or secret values/i,
  );
});

test("rejects proof files that contain raw smoke payloads or sensitive user data", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "database-proof.local.json");
  write(
    rootDir,
    "release/database-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        smoke: {
          stagingApiSmokeVerified: true,
          serverAuthoritySmokeVerified: true,
          privacySmokeVerified: true,
          noRawFinancialDataInSmokePayloads: false,
          responsePayload: {
            email: "actual-user@example.com",
            salaryAmount: 2700000,
          },
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () =>
      buildDatabaseEvidence({
        rootDir,
        proofPath,
      }),
    /raw smoke payloads or sensitive user data/i,
  );
});

test("writes release/database-evidence.json with generated evidence", () => {
  const rootDir = makeWorkspace();

  const outputPath = writeDatabaseEvidenceFile({
    rootDir,
    now: () => new Date("2026-07-01T06:00:00.000Z"),
  });

  assert.equal(
    outputPath,
    path.join(rootDir, "release", "database-evidence.json"),
  );
  const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(written.observedAt, "2026-07-01T06:00:00.000Z");
  assert.equal(written.migrations.migrationFileCount, 2);
  assert.doesNotMatch(JSON.stringify(written), /postgres(?:ql)?:\/\//i);
});
