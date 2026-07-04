import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectStagingSmokeProof } from "./collect-staging-smoke-proof.mjs";

const makeRoot = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-staging-smoke-"));

const readJson = (filePath) =>
  JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));

const writeJson = (rootDir, filePath, value) => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};

class FakeResponse {
  constructor(body, { status = 200, headers = {} } = {}) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.headers = new Headers(headers);
    this.body = body;
  }

  async text() {
    return this.body;
  }
}

const privacyHeaders = {
  "x-financial-raw-data-exposed": "false",
  "x-ad-financial-targeting": "separated",
  "x-server-authority": "true",
};

test("collects staging API/Admin/server-authority/privacy smoke booleans without storing raw responses", async () => {
  const rootDir = makeRoot();
  writeJson(rootDir, "release/database-evidence.json", {
    schemaVersion: 1,
    secretsRedacted: true,
    containsSecretValues: false,
    neon: {
      expectedProjectHint: "salary-hijacking",
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
      productionSeedExecuted: false,
      destructiveProductionSeedBlocked: true,
    },
    rollback: {
      rollbackRehearsalVerified: true,
    },
  });

  const calls = [];
  const proof = await collectStagingSmokeProof({
    rootDir,
    now: () => new Date("2026-07-04T07:00:00.000Z"),
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com",
      STAGING_SMOKE_BEARER: "redacted-test-token",
    },
    fetcher: async (url, init) => {
      calls.push({ url, headers: new Headers(init?.headers) });
      return new FakeResponse(
        JSON.stringify({
          data: {
            status: "ready",
            serverAuthorityEnabled: true,
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPushTokenExposed: false,
            adsFinancialTargetingUsed: false,
          },
        }),
        { headers: privacyHeaders },
      );
    },
  });

  assert.equal(proof.commands.migrationValidation.verified, true);
  assert.equal(proof.commands.stagingMigration.verified, true);
  assert.equal(proof.commands.productionMigrationDryRun.verified, true);
  assert.equal(proof.commands.stagingSeed.verified, true);
  assert.equal(proof.commands.rollbackRehearsal.verified, true);
  assert.equal(proof.commands.stagingApiSmoke.verified, true);
  assert.equal(proof.commands.adminSmoke.verified, true);
  assert.equal(proof.commands.serverAuthoritySmoke.verified, true);
  assert.equal(proof.commands.privacySmoke.verified, true);
  assert.equal(calls.length, 4);
  assert.ok(calls.every((call) => call.url.startsWith("https://")));
  assert.ok(
    calls.every((call) =>
      call.headers.get("authorization")?.startsWith("Bearer "),
    ),
  );

  const written = fs.readFileSync(
    path.join(rootDir, "release/database-command-proof.local.json"),
    "utf8",
  );
  assert.doesNotMatch(
    written,
    /redacted-test-token|responseBody|responsePayload|requestPayload/i,
  );
  assert.doesNotMatch(written, /salaryAmount|actual-user@example\.com/i);
});

test("keeps smoke gates false when staging URLs are missing", async () => {
  const rootDir = makeRoot();

  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {},
    fetcher: async () => {
      throw new Error("fetcher must not be called without staging URLs");
    },
  });

  assert.equal(proof.commands.stagingApiSmoke.verified, false);
  assert.equal(proof.commands.adminSmoke.verified, false);
  assert.equal(proof.commands.serverAuthoritySmoke.verified, false);
  assert.equal(proof.commands.privacySmoke.verified, false);
  assert.equal(proof.commands.stagingApiSmoke.noRawPayloadStored, true);
});

test("requires HTTPS staging URLs and rejects local HTTP smoke targets", async () => {
  const rootDir = makeRoot();

  await assert.rejects(
    () =>
      collectStagingSmokeProof({
        rootDir,
        env: {
          STAGING_API_BASE_URL: "http://api-staging.salaryhijacking.com",
          STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com",
        },
        fetcher: async () => new FakeResponse("ok"),
      }),
    /must use https/i,
  );
});

test("rejects staging smoke URLs that embed credentials", async () => {
  const rootDir = makeRoot();

  await assert.rejects(
    () =>
      collectStagingSmokeProof({
        rootDir,
        env: {
          STAGING_API_BASE_URL:
            "https://operator:secret@api-staging.salaryhijacking.com",
          STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com",
        },
        fetcher: async () => new FakeResponse("ok"),
      }),
    /must not include credentials/i,
  );
});

test("marks a smoke command false when the response contains sensitive raw data", async () => {
  const rootDir = makeRoot();

  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com",
    },
    fetcher: async (url) => {
      if (url.includes("/admin/")) {
        return new FakeResponse('{"status":"ready"}', {
          headers: privacyHeaders,
        });
      }
      return new FakeResponse('{"salaryAmount":2700000}', {
        headers: privacyHeaders,
      });
    },
  });

  assert.equal(proof.commands.stagingApiSmoke.verified, false);
  assert.equal(proof.commands.serverAuthoritySmoke.verified, false);
  assert.equal(proof.commands.privacySmoke.verified, false);
  assert.equal(proof.commands.adminSmoke.verified, true);

  const written = readJson(
    path.join(rootDir, "release/database-command-proof.local.json"),
  );
  assert.equal(written.containsSecretValues, false);
  assert.equal(written.commands.stagingApiSmoke.noRawPayloadStored, true);
});

test("marks smoke commands false when response headers expose raw cookie or token fields", async () => {
  const rootDir = makeRoot();

  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com",
    },
    fetcher: async (url) => {
      if (url.includes("admin-staging")) {
        return new FakeResponse('{"status":"ready"}', {
          headers: privacyHeaders,
        });
      }
      return new FakeResponse(
        '{"serverAuthorityEnabled":true,"rawFinancialDataExposed":false,"rawPersonalDataExposed":false,"rawPushTokenExposed":false,"adsFinancialTargetingUsed":false}',
        {
          headers: {
            ...privacyHeaders,
            "set-cookie": "session=raw-session-cookie",
            "x-session-token": "copied-session-token",
          },
        },
      );
    },
  });

  assert.equal(proof.commands.stagingApiSmoke.verified, false);
  assert.equal(proof.commands.serverAuthoritySmoke.verified, false);
  assert.equal(proof.commands.privacySmoke.verified, false);
  assert.equal(proof.commands.adminSmoke.verified, true);

  const written = fs.readFileSync(
    path.join(rootDir, "release/database-command-proof.local.json"),
    "utf8",
  );
  assert.doesNotMatch(written, /raw-session-cookie|copied-session-token/i);
});

test("accepts explicit smoke path overrides while preserving slash normalization", async () => {
  const rootDir = makeRoot();
  const visited = [];

  await collectStagingSmokeProof({
    rootDir,
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com/",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com/",
      STAGING_API_SMOKE_PATH: "api/v1/ready",
      STAGING_ADMIN_SMOKE_PATH: "/admin/api/v1/ready",
      STAGING_SERVER_AUTHORITY_SMOKE_PATH: "/api/v1/mobile/bootstrap",
      STAGING_PRIVACY_SMOKE_PATH: "/api/v1/app-config",
    },
    fetcher: async (url) => {
      visited.push(url);
      return new FakeResponse(
        '{"serverAuthorityEnabled":true,"rawFinancialDataExposed":false,"rawPersonalDataExposed":false,"rawPushTokenExposed":false,"adsFinancialTargetingUsed":false}',
        { headers: privacyHeaders },
      );
    },
  });

  assert.deepEqual(visited, [
    "https://api-staging.salaryhijacking.com/api/v1/ready",
    "https://admin-staging.salaryhijacking.com/admin/api/v1/ready",
    "https://api-staging.salaryhijacking.com/api/v1/mobile/bootstrap",
    "https://api-staging.salaryhijacking.com/api/v1/app-config",
  ]);
});

test("uses unauthenticated readiness endpoints as default staging smoke targets", async () => {
  const rootDir = makeRoot();
  const visited = [];

  await collectStagingSmokeProof({
    rootDir,
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com/",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com/",
    },
    fetcher: async (url, init) => {
      visited.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return new FakeResponse(
        '{"serverAuthorityEnabled":true,"rawFinancialDataExposed":false,"rawPersonalDataExposed":false,"rawPushTokenExposed":false,"adsFinancialTargetingUsed":false}',
        { headers: privacyHeaders },
      );
    },
  });

  assert.deepEqual(visited, [
    {
      url: "https://api-staging.salaryhijacking.com/api/v1/ready",
      authorization: null,
    },
    {
      url: "https://admin-staging.salaryhijacking.com/admin/api/v1/ready",
      authorization: null,
    },
    {
      url: "https://api-staging.salaryhijacking.com/api/v1/ready",
      authorization: null,
    },
    {
      url: "https://api-staging.salaryhijacking.com/api/v1/ready",
      authorization: null,
    },
  ]);
});
