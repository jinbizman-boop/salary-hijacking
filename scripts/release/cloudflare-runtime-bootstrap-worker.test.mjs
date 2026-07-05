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
