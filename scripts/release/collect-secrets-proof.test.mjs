import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectSecretsProof } from "./collect-secrets-proof.mjs";

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

const makeEnv = (valueForName = (name) => `${name}_present_value`) =>
  Object.fromEntries(
    requiredRuntimeSecretNames.map((name) => [name, valueForName(name)]),
  );

const makeOutputPath = () =>
  path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "salary-secrets-proof-")),
    "release",
    "secrets-proof.local.json",
  );

test("collects no-value runtime secret proof from a trusted secret store", () => {
  const outputPath = makeOutputPath();
  const env = makeEnv((name) =>
    name === "DATABASE_URL"
      ? "postgresql://user:password@host.neon.tech/neondb"
      : `${name}_secret_value`,
  );

  const proof = collectSecretsProof({
    env,
    proofStore: "GitHub Environments",
    outputPath,
    now: () => new Date("2026-07-01T16:00:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.observedAt, "2026-07-01T16:00:00.000Z");
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.deepEqual(Object.keys(proof.secrets), requiredRuntimeSecretNames);

  for (const secretName of requiredRuntimeSecretNames) {
    assert.equal(proof.secrets[secretName].verified, true, secretName);
    assert.deepEqual(proof.secrets[secretName].stores, ["GitHub Environments"]);
  }

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(written, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(written, /password@host|secret_value|hooks\.slack/i);
});

test("does not verify present local environment values without a trusted store", () => {
  const proof = collectSecretsProof({
    env: makeEnv(),
    writeFile: false,
    now: () => new Date("2026-07-01T16:15:00.000Z"),
  });

  assert.equal(proof.secrets.DATABASE_URL.verified, false);
  assert.equal(proof.secrets.GITHUB_TOKEN.verified, false);
  assert.deepEqual(proof.secrets.DATABASE_URL.stores, [
    "local process environment",
  ]);
});

test("keeps blank secret names unverified even for a trusted store", () => {
  const env = makeEnv();
  env.DATABASE_URL = "";
  env.SLACK_WEBHOOK_URL = "   ";

  const proof = collectSecretsProof({
    env,
    proofStore: "GitHub Environments",
    writeFile: false,
  });

  assert.equal(proof.secrets.DATABASE_URL.verified, false);
  assert.equal(proof.secrets.STAGING_DATABASE_URL.verified, true);
  assert.equal(proof.secrets.SLACK_WEBHOOK_URL.verified, false);
});

test("rejects unknown secret names in collector options", () => {
  assert.throws(
    () =>
      collectSecretsProof({
        env: makeEnv(),
        proofStore: "GitHub Environments",
        secretNames: ["DATABASE_URL", "RETRO_GAMES_DATABASE_URL"],
        writeFile: false,
      }),
    /unknown secret names/i,
  );
});
