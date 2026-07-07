import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_BOOTSTRAP_WORKER_SERVICES,
  renderReleaseBootstrapWorkerModule,
} from "./cloudflare-runtime-bootstrap-worker.mjs";

const importGeneratedWorker = async (serviceName) => {
  const source = renderReleaseBootstrapWorkerModule({ serviceName });
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
};

test("renders release bootstrap worker routes without raw secret or financial payload markers", async () => {
  for (const serviceName of RELEASE_BOOTSTRAP_WORKER_SERVICES) {
    const source = renderReleaseBootstrapWorkerModule({ serviceName });

    assert.match(source, /export default/);
    assert.doesNotMatch(
      source,
      /DATABASE_URL|JWT_SECRET|PRIVATE_KEY|salaryAmount|expenseAmount|hijackAmount|email|pushToken/,
    );
  }
});

test("api bootstrap worker exposes release-safe ready and server-authority smoke endpoints", async () => {
  const mod = await importGeneratedWorker("salary-hijacking-api");
  const worker = mod.default;

  const ready = await worker.fetch(
    new Request(
      "https://salary-hijacking-api.jinbizman.workers.dev/api/v1/ready",
    ),
    {},
    {},
  );
  const readyText = await ready.text();

  assert.equal(ready.status, 200);
  assert.equal(ready.headers.get("x-server-authority"), "true");
  assert.equal(ready.headers.get("x-raw-financial-data-exposed"), "false");
  assert.match(readyText, /"serverAuthorityEnabled":true/);
  assert.match(readyText, /"rawFinancialDataExposed":false/);

  const smoke = await worker.fetch(
    new Request(
      "https://salary-hijacking-api.jinbizman.workers.dev/api/v1/public/server-authority-smoke",
    ),
    {},
    {},
  );
  const smokeText = await smoke.text();

  assert.equal(smoke.status, 200);
  assert.match(smokeText, /"syntheticKrwIntegerCalculation":\{/);
  assert.match(smokeText, /"verified":true/);
  assert.match(smokeText, /"sourceOfTruth":"\/api\/v1"/);
  assert.match(smokeText, /"krwIntegerOnly":true/);
  assert.match(smokeText, /"negativeMoneyRejected":true/);
  assert.match(smokeText, /"fractionalMoneyRejected":true/);
  assert.match(smokeText, /"dailyBudgetDistributionVerified":true/);
  assert.match(smokeText, /"paycheckProtectionFormulaVerified":true/);
  assert.match(smokeText, /"rawAmountsReturned":false/);
});

test("api bootstrap worker exposes public app and legal HTML pages for store review proof", async () => {
  const mod = await importGeneratedWorker("salary-hijacking-api");
  const worker = mod.default;

  const cases = [
    [
      "/",
      ["급여납치", "이번 달 내가 지켜낸 돈", "/privacy", "/support", "/terms"],
    ],
    ["/privacy", ["급여납치", "개인정보"]],
    ["/support", ["급여납치", "지원"]],
    ["/terms", ["급여납치", "이용약관"]],
  ];

  for (const [path, requiredText] of cases) {
    const response = await worker.fetch(
      new Request(`https://salaryhijacking.com${path}`, {
        headers: { accept: "text/html" },
      }),
      {},
      {},
    );
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-type") ?? "",
      /text\/html; charset=utf-8/,
    );
    assert.match(
      response.headers.get("content-security-policy") ?? "",
      /default-src 'self'/,
    );
    assert.equal(response.headers.get("x-financial-raw-data-exposed"), "false");
    assert.equal(response.headers.get("x-ad-financial-targeting"), "separated");
    assert.equal(response.headers.has("x-server-authority"), false);
    assert.equal(response.headers.has("permissions-policy"), false);
    assert.equal(response.headers.has("x-raw-push-token-exposed"), false);
    assert.doesNotMatch(text, /noindex/i);
    assert.doesNotMatch(
      text,
      /salaryAmount|expenseAmount|savingAmount|hijackAmount|authToken|refreshToken|sessionToken|pushToken|DATABASE_URL|JWT_SECRET|PRIVATE_KEY/i,
    );

    for (const item of requiredText) {
      assert.match(
        text,
        new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
    }
  }
});

test("admin bootstrap worker exposes admin ready path with RBAC and audit boundary proof", async () => {
  const mod = await importGeneratedWorker("salary-hijacking-admin");
  const worker = mod.default;

  const response = await worker.fetch(
    new Request(
      "https://salary-hijacking-admin.jinbizman.workers.dev/admin/api/v1/ready",
    ),
    {},
    {},
  );
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-server-authority"), "true");
  assert.equal(response.headers.get("x-admin-rbac-required"), "true");
  assert.equal(response.headers.get("x-admin-reason-required"), "true");
  assert.match(text, /"status":"ready"/);
  assert.match(text, /"rbacRequired":true/);
  assert.match(text, /"adminReasonRequired":true/);
  assert.match(text, /"rawFinancialDataExposed":false/);
});
