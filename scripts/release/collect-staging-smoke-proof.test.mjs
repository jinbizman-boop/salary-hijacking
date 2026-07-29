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
            syntheticKrwIntegerCalculation: {
              verified: true,
              sourceOfTruth: "/api/v1",
              krwIntegerOnly: true,
              negativeMoneyRejected: true,
              fractionalMoneyRejected: true,
              dailyBudgetDistributionVerified: true,
              paycheckProtectionFormulaVerified: true,
              rawAmountsReturned: false,
            },
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
  assert.equal(proof.commands.persistenceE2eSmoke.verified, false);
  assert.equal(proof.commands.stagingApiSmoke.noRawPayloadStored, true);
  assert.equal(proof.commands.persistenceE2eSmoke.noRawPayloadStored, true);
});

test("defaults the staging API smoke base URL from the API Worker staging config", async () => {
  const rootDir = makeRoot();
  fs.mkdirSync(path.join(rootDir, "services/api"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "services/api/wrangler.toml"),
    [
      "[env.staging.vars]",
      'APP_PUBLIC_BASE_URL = "https://api-staging.salaryhijacking.com"',
      "",
    ].join("\n"),
    "utf8",
  );

  const calls = [];
  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {},
    fetcher: async (url) => {
      calls.push(url);
      const error = new Error(
        "getaddrinfo ENOTFOUND api-staging.salaryhijacking.com",
      );
      error.code = "ENOTFOUND";
      throw error;
    },
  });

  assert.ok(
    calls.every((url) =>
      String(url).startsWith("https://api-staging.salaryhijacking.com/"),
    ),
  );
  assert.equal(proof.commands.stagingApiSmoke.reason, "DNS_UNRESOLVED");
  assert.equal(proof.commands.serverAuthoritySmoke.reason, "DNS_UNRESOLVED");
  assert.equal(proof.commands.privacySmoke.reason, "DNS_UNRESOLVED");
  assert.equal(proof.commands.adminSmoke.reason, "missing staging base URL");
});

test("defaults the staging Admin smoke base URL from the Admin Worker staging config", async () => {
  const rootDir = makeRoot();
  fs.mkdirSync(path.join(rootDir, "apps/admin"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "apps/admin/wrangler.jsonc"),
    [
      "{",
      '  "env": {',
      '    "staging": {',
      '      "vars": {',
      '        "APP_PUBLIC_BASE_URL": "https://staging-admin.salaryhijacking.com"',
      "      }",
      "    }",
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  const calls = [];
  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {},
    fetcher: async (url) => {
      calls.push(url);
      const error = new Error(
        String(url).includes("staging-admin")
          ? "getaddrinfo ENOTFOUND staging-admin.salaryhijacking.com"
          : "fetcher should only receive the Admin smoke URL",
      );
      error.code = "ENOTFOUND";
      throw error;
    },
  });

  assert.ok(
    calls.some((url) =>
      String(url).startsWith("https://staging-admin.salaryhijacking.com/"),
    ),
  );
  assert.equal(proof.commands.adminSmoke.reason, "DNS_UNRESOLVED");
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

test("classifies DNS staging smoke failures without storing raw endpoint URLs", async () => {
  const rootDir = makeRoot();

  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com",
    },
    fetcher: async () => {
      const error = new Error(
        "getaddrinfo ENOTFOUND api-staging.salaryhijacking.com",
      );
      error.code = "ENOTFOUND";
      throw error;
    },
  });

  assert.equal(proof.commands.stagingApiSmoke.verified, false);
  assert.equal(proof.commands.stagingApiSmoke.reason, "DNS_UNRESOLVED");
  assert.equal(proof.commands.adminSmoke.reason, "DNS_UNRESOLVED");
  assert.equal(proof.commands.serverAuthoritySmoke.reason, "DNS_UNRESOLVED");
  assert.equal(proof.commands.privacySmoke.reason, "DNS_UNRESOLVED");

  const written = fs.readFileSync(
    path.join(rootDir, "release/database-command-proof.local.json"),
    "utf8",
  );
  assert.doesNotMatch(written, /api-staging\.salaryhijacking\.com/);
  assert.doesNotMatch(written, /admin-staging\.salaryhijacking\.com/);
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

test("uses unauthenticated readiness and synthetic server-authority endpoints as default staging smoke targets", async () => {
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
        '{"serverAuthorityEnabled":true,"rawFinancialDataExposed":false,"rawPersonalDataExposed":false,"rawPushTokenExposed":false,"adsFinancialTargetingUsed":false,"syntheticKrwIntegerCalculation":{"verified":true,"sourceOfTruth":"/api/v1","krwIntegerOnly":true,"negativeMoneyRejected":true,"fractionalMoneyRejected":true,"dailyBudgetDistributionVerified":true,"paycheckProtectionFormulaVerified":true,"rawAmountsReturned":false}}',
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
      url: "https://api-staging.salaryhijacking.com/api/v1/public/server-authority-smoke",
      authorization: null,
    },
    {
      url: "https://api-staging.salaryhijacking.com/api/v1/public/server-authority-smoke",
      authorization: null,
    },
  ]);
});

test("requires synthetic KRW calculation proof for server-authority smoke", async () => {
  const rootDir = makeRoot();

  const proof = await collectStagingSmokeProof({
    rootDir,
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com/",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com/",
    },
    fetcher: async () =>
      new FakeResponse(
        '{"serverAuthorityEnabled":true,"rawFinancialDataExposed":false,"rawPersonalDataExposed":false,"rawPushTokenExposed":false,"adsFinancialTargetingUsed":false}',
        { headers: privacyHeaders },
      ),
  });

  assert.equal(proof.commands.stagingApiSmoke.verified, true);
  assert.equal(proof.commands.serverAuthoritySmoke.verified, false);
  assert.equal(proof.commands.privacySmoke.verified, true);
});

test("verifies authenticated salary-plan-budget persistence read-after-write without storing raw payloads", async () => {
  const rootDir = makeRoot();
  const visited = [];
  const planId = "plan_qa_persistence_1";
  const budgetId = "budget_qa_persistence_1";
  const expenseId = "expense_qa_persistence_1";

  const proof = await collectStagingSmokeProof({
    rootDir,
    now: () => new Date("2026-07-12T01:00:00.000Z"),
    env: {
      STAGING_API_BASE_URL: "https://api-staging.salaryhijacking.com/",
      STAGING_ADMIN_BASE_URL: "https://admin-staging.salaryhijacking.com/",
      STAGING_PERSISTENCE_E2E_BEARER: "redacted-persistence-token",
    },
    fetcher: async (url, init) => {
      const method = init?.method ?? "GET";
      visited.push({
        method,
        url,
        authorization: new Headers(init?.headers).get("authorization"),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (url.endsWith("/api/v1/mobile/bootstrap")) {
        return new FakeResponse(
          '{"data":{"auth":{"authenticated":true},"serverAuthority":true}}',
          { headers: privacyHeaders },
        );
      }
      if (method === "POST" && url.endsWith("/api/v1/payroll")) {
        return new FakeResponse(
          JSON.stringify({ data: { planId, serverAuthority: true } }),
          { status: 201, headers: privacyHeaders },
        );
      }
      if (method === "GET" && url.endsWith(`/api/v1/payroll/${planId}`)) {
        return new FakeResponse(
          JSON.stringify({ data: { planId, serverAuthority: true } }),
          { headers: privacyHeaders },
        );
      }
      if (method === "POST" && url.endsWith("/api/v1/daily-budgets")) {
        return new FakeResponse(
          JSON.stringify({
            data: {
              budgetId,
              budgetDate: "2026-07-12",
              plannedAmountMinor: 42000,
              serverAuthority: true,
            },
          }),
          { status: 201, headers: privacyHeaders },
        );
      }
      if (
        method === "GET" &&
        url.endsWith("/api/v1/daily-budgets/date/2026-07-12")
      ) {
        return new FakeResponse(
          JSON.stringify({
            data: {
              budgetId,
              budgetDate: "2026-07-12",
              plannedAmountMinor: 42000,
              serverAuthority: true,
            },
          }),
          { headers: privacyHeaders },
        );
      }
      if (method === "POST" && url.endsWith("/api/v1/variable-expenses")) {
        return new FakeResponse(
          JSON.stringify({
            data: { expenseId, dailyBudgetId: budgetId, serverAuthority: true },
          }),
          { status: 201, headers: privacyHeaders },
        );
      }
      if (
        method === "GET" &&
        url.endsWith(`/api/v1/variable-expenses/${expenseId}`)
      ) {
        return new FakeResponse(
          JSON.stringify({
            data: { expenseId, dailyBudgetId: budgetId, serverAuthority: true },
          }),
          { headers: privacyHeaders },
        );
      }
      if (method === "GET" && url.endsWith("/api/v1/payroll/home")) {
        return new FakeResponse(
          '{"data":{"serverAuthority":true,"financialRawDataExposed":false}}',
          { headers: privacyHeaders },
        );
      }
      return new FakeResponse("{}", { status: 404, headers: privacyHeaders });
    },
  });

  assert.equal(proof.commands.persistenceE2eSmoke.verified, true);
  assert.equal(proof.commands.persistenceE2eSmoke.noRawPayloadStored, true);
  assert.deepEqual(
    visited.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    [
      "GET /api/v1/ready",
      "GET /admin/api/v1/ready",
      "GET /api/v1/public/server-authority-smoke",
      "GET /api/v1/public/server-authority-smoke",
      "GET /api/v1/mobile/bootstrap",
      "POST /api/v1/payroll",
      `GET /api/v1/payroll/${planId}`,
      "POST /api/v1/daily-budgets",
      "GET /api/v1/daily-budgets/date/2026-07-12",
      "POST /api/v1/variable-expenses",
      `GET /api/v1/variable-expenses/${expenseId}`,
      "GET /api/v1/payroll/home",
    ],
  );

  const written = fs.readFileSync(
    path.join(rootDir, "release/database-command-proof.local.json"),
    "utf8",
  );
  assert.doesNotMatch(
    written,
    /redacted-persistence-token|responseBody|requestPayload|payrollAmountMinor|plannedAmountMinor|amountMinor/i,
  );
});
