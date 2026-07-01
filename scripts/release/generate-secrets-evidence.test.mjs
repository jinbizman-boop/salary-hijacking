import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSecretsEvidence,
  writeSecretsEvidenceFile,
} from "./generate-secrets-evidence.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-secrets-evidence-"));

const requiredRuntimeSecretNames = [
  "DATABASE_URL",
  "STAGING_DATABASE_URL",
  "NEON_API_KEY",
  "NEON_PROJECT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CF_ADMIN_WORKER_NAME",
  "EXPO_TOKEN",
  "EAS_PROJECT_ID",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "SENTRY_DSN",
  "SLACK_WEBHOOK_URL",
];

test("builds blocked no-value runtime secret evidence by default", () => {
  const rootDir = makeWorkspace();

  const evidence = buildSecretsEvidence({
    rootDir,
    now: () => new Date("2026-07-01T07:00:00.000Z"),
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.observedAt, "2026-07-01T07:00:00.000Z");
  assert.equal(evidence.secretsRedacted, true);
  assert.equal(evidence.containsSecretValues, false);
  assert.deepEqual(Object.keys(evidence.secrets), requiredRuntimeSecretNames);
  assert.equal(evidence.secrets.DATABASE_URL.verified, false);
  assert.equal(evidence.secrets.GITHUB_REPOSITORY.verified, false);
  assert.ok(evidence.nextEvidenceRequired.length > 0);
  assert.doesNotMatch(JSON.stringify(evidence), /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(JSON.stringify(evidence), /hooks\.slack\.com/i);
});

test("uses a local proof file to mark required secret names verified", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "secrets-proof.local.json");
  write(
    rootDir,
    "release/secrets-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        secrets: Object.fromEntries(
          requiredRuntimeSecretNames.map((name) => [
            name,
            {
              verified: true,
              stores: ["GitHub Environments", "provider secret store"],
              note: `${name} presence verified by store UI without exposing the value.`,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );

  const evidence = buildSecretsEvidence({
    rootDir,
    proofPath,
    now: () => new Date("2026-07-01T07:30:00.000Z"),
  });

  for (const secretName of requiredRuntimeSecretNames) {
    assert.equal(evidence.secrets[secretName].verified, true, secretName);
    assert.deepEqual(evidence.secrets[secretName].stores, [
      "GitHub Environments",
      "provider secret store",
    ]);
  }
  assert.deepEqual(evidence.nextEvidenceRequired, []);
});

test("preserves existing no-secret evidence when local proof is absent", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/secrets-evidence.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        secrets: {
          GITHUB_REPOSITORY: {
            verified: true,
            stores: ["GitHub Actions runtime"],
            note: "Repository target verified without a secret value.",
          },
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildSecretsEvidence({ rootDir });

  assert.equal(evidence.secrets.GITHUB_REPOSITORY.verified, true);
  assert.deepEqual(evidence.secrets.GITHUB_REPOSITORY.stores, [
    "GitHub Actions runtime",
  ]);
  assert.equal(evidence.secrets.DATABASE_URL.verified, false);
});

test("rejects proof files that contain raw secret values", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "secrets-proof.local.json");
  write(
    rootDir,
    "release/secrets-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        secrets: {
          DATABASE_URL: {
            verified: true,
            stores: ["GitHub Environments"],
            value: "postgresql://user:password@host.neon.tech/db",
          },
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildSecretsEvidence({ rootDir, proofPath }),
    /raw secret values/i,
  );
});

test("rejects verified secret proof with unapproved store labels", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "secrets-proof.local.json");
  write(
    rootDir,
    "release/secrets-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        secrets: {
          DATABASE_URL: {
            verified: true,
            stores: ["personal notes"],
            note: "The value exists somewhere.",
          },
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildSecretsEvidence({ rootDir, proofPath }),
    /unapproved secret store/i,
  );
});

test("rejects unknown secret names in proof files", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(rootDir, "release", "secrets-proof.local.json");
  write(
    rootDir,
    "release/secrets-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        secrets: {
          DATABASE_URL: {
            verified: true,
            stores: ["GitHub Environments"],
          },
          RETRO_GAMES_DATABASE_URL: {
            verified: true,
            stores: ["GitHub Environments"],
          },
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildSecretsEvidence({ rootDir, proofPath }),
    /unknown secret names/i,
  );
});

test("writes release/secrets-evidence.json with generated evidence", () => {
  const rootDir = makeWorkspace();

  const outputPath = writeSecretsEvidenceFile({
    rootDir,
    now: () => new Date("2026-07-01T08:00:00.000Z"),
  });

  assert.equal(
    outputPath,
    path.join(rootDir, "release", "secrets-evidence.json"),
  );
  const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(written.observedAt, "2026-07-01T08:00:00.000Z");
  assert.equal(written.secrets.DATABASE_URL.verified, false);
  assert.doesNotMatch(JSON.stringify(written), /postgres(?:ql)?:\/\//i);
});
