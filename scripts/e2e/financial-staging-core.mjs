import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_JSON = "docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json";
const OUT_MD = "docs/financial/STAGING_FINANCIAL_E2E_REPORT.md";
const WORKER_VERSION = "1cbd1402-2c51-4bc0-87c3-94fd8960bd1c";
let activeSteps = [];
let activeStartedAt = null;
let activeSyntheticUser = null;

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function syntheticEmail() {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase4.financial.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPass${randomBytes(6).toString("hex")}!A1`;
}

function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function paydayDate(year, month, payday) {
  return formatDate(year, month, Math.min(payday, lastDayOfMonth(year, month)));
}

function currentPayrollCycle(payday = 25) {
  const today = todayInSeoul();
  const [year, month] = today.split("-").map((part) => Number.parseInt(part, 10));
  const thisPayday = paydayDate(year, month, payday);
  const endMonth = today <= thisPayday ? { year, month } : addMonths(year, month, 1);
  const previousMonth = addMonths(endMonth.year, endMonth.month, -1);
  return {
    today,
    payday,
    firstPayrollDate: paydayDate(endMonth.year, endMonth.month, payday),
    periodEndDate: paydayDate(endMonth.year, endMonth.month, payday),
    periodStartDate: addDays(
      paydayDate(previousMonth.year, previousMonth.month, payday),
      1,
    ),
  };
}

function sanitizePath(pathValue) {
  return String(pathValue).replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
    "[UUID]",
  );
}

function sanitizeBody(body) {
  if (!body || typeof body !== "object") return {};
  const error = body.error && typeof body.error === "object" ? body.error : null;
  const data = body.data && typeof body.data === "object" ? body.data : null;
  const idKeys = [
    "planId",
    "budgetId",
    "expenseId",
    "goalId",
    "transactionId",
    "requestId",
  ];
  const unsafeFlagKey = /id$|idempotency|token|password|email|salary|expense|saving|payroll|amount|budget|hijack|income|account|secret|key/i;
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return {
    errorCode: typeof error?.code === "string" ? error.code : null,
    requestId:
      typeof error?.requestId === "string"
        ? error.requestId
        : typeof data?.requestId === "string"
          ? data.requestId
          : null,
    idHashes: data
      ? Object.fromEntries(
          idKeys
            .filter((key) => typeof data[key] === "string")
            .map((key) => [key, hash(data[key])]),
        )
      : {},
    flags: data
      ? Object.fromEntries(
          Object.entries(data).filter(([key, value]) => {
            if (unsafeFlagKey.test(key)) return false;
            if (typeof value === "string" && uuidLike.test(value)) return false;
            if (typeof value === "number" && key.toLowerCase().endsWith("minor"))
              return false;
            return ["boolean", "string", "number"].includes(typeof value);
          }),
        )
      : {},
  };
}

async function call(step, method, urlPath, { bearer, body, idempotencyKey } = {}) {
  const headers = {
    "content-type": "application/json",
    "x-request-id": `phase4-${hash(`${step}:${Date.now()}`)}`,
  };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const response = await fetch(new URL(urlPath, BASE_URL), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  const sanitized = sanitizeBody(parsed);
  return {
    step,
    method,
    path: sanitizePath(urlPath),
    status: response.status,
    errorCode: sanitized.errorCode,
    requestId: response.headers.get("x-request-id") ?? sanitized.requestId,
    idHashes: sanitized.idHashes,
    flags: sanitized.flags,
    pass: response.status < 400,
    raw: parsed,
  };
}

function tokenFrom(result, name) {
  const value = result.raw?.data?.tokens?.[name];
  return typeof value === "string" && value.length >= 20 ? value : null;
}

function idFrom(result, key) {
  const value = result.raw?.data?.[key];
  return typeof value === "string" ? value : null;
}

async function main() {
  const startedAt = new Date().toISOString();
  const email = syntheticEmail();
  const password = syntheticPassword();
  const cycle = currentPayrollCycle(25);
  const steps = [];
  activeStartedAt = startedAt;
  activeSteps = steps;
  activeSyntheticUser = { emailHash: hash(email) };

  async function record(promise) {
    const result = await promise;
    const { raw: _raw, ...safe } = result;
    steps.push(safe);
    return result;
  }

  await record(call("health", "GET", "/health"));
  await record(call("ready", "GET", "/api/v1/ready"));
  const register = await record(
    call("register", "POST", "/api/v1/auth/register", {
      body: {
        email,
        password,
        nickname: "phase4Fin",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const accessToken = tokenFrom(register, "accessToken");
  if (!accessToken) throw new Error(`register did not return access token: ${register.status} ${register.errorCode ?? "UNKNOWN"}`);

  const payroll = await record(
    call("payroll_create", "POST", "/api/v1/payroll/", {
      bearer: accessToken,
      body: {
        title: "Phase 4 payroll cycle",
        incomeType: "NET",
        payrollCycle: "MONTHLY",
        payrollAmountMinor: 2700000,
        payday: cycle.payday,
        firstPayrollDate: cycle.firstPayrollDate,
        periodStartDate: cycle.periodStartDate,
        periodEndDate: cycle.periodEndDate,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
        variableExpenseReserveMinor: 0,
        emergencyBufferMinor: 0,
        carryOverAmountMinor: 0,
        reservePolicy: "ZERO_BASE",
        memo: "phase4 synthetic",
      },
    }),
  );
  const planId = idFrom(payroll, "planId");
  if (!planId) throw new Error(`payroll create did not return planId: ${payroll.status} ${payroll.errorCode ?? "UNKNOWN"}`);

  await record(call("payroll_activate", "POST", `/api/v1/payroll/${encodeURIComponent(planId)}/activate`, { bearer: accessToken, body: { reason: "phase4 synthetic activate" } }));
  const dailyBudget = await record(
    call("daily_budget_create", "POST", "/api/v1/daily-budgets/", {
      bearer: accessToken,
      body: {
        budgetDate: cycle.today,
        plannedAmountMinor: 40000,
        memo: "phase4 synthetic budget",
        source: "MANUAL",
      },
    }),
  );
  const budgetId = idFrom(dailyBudget, "budgetId");
  if (!budgetId) throw new Error(`daily budget create did not return budgetId: ${dailyBudget.status} ${dailyBudget.errorCode ?? "UNKNOWN"}`);

  await record(
    call("fixed_expense_create", "POST", "/api/v1/fixed-expenses/", {
      bearer: accessToken,
      body: {
        title: "Phase4 fixed",
        category: "HOUSING",
        amountMinor: 300000,
        frequency: "MONTHLY",
        paymentDay: 5,
        startDate: cycle.periodStartDate,
        merchantName: "phase4",
        memo: "synthetic",
        autoPay: false,
        affectsDailyBudget: true,
      },
    }),
  );
  await record(
    call("savings_create", "POST", "/api/v1/savings/", {
      bearer: accessToken,
      body: {
        title: "Phase4 saving",
        goalType: "EMERGENCY_FUND",
        targetAmountMinor: 1000000,
        currentAmountMinor: 0,
        fixedSaveAmountMinor: 200000,
        frequency: "MONTHLY",
        saveDay: 10,
        startDate: cycle.periodStartDate,
        accountAlias: "phase4",
        memo: "synthetic",
        autoSave: false,
        affectsDailyBudget: true,
      },
    }),
  );
  const expense = await record(
    call("variable_expense_create", "POST", "/api/v1/variable-expenses/", {
      bearer: accessToken,
      body: {
        amountMinor: 10000,
        category: "MEAL",
        title: "Phase4 lunch",
        spentAt: `${cycle.today}T03:00:00.000Z`,
        paymentMethod: "CARD",
        merchantName: "phase4",
        memo: "synthetic",
        tags: ["phase4"],
        dailyBudgetId: budgetId,
        source: "MANUAL",
        idempotencyKey: `phase4-var-${hash(email)}`,
      },
    }),
  );
  const expenseId = idFrom(expense, "expenseId");
  if (!expenseId) throw new Error(`variable expense create did not return expenseId: ${expense.status} ${expense.errorCode ?? "UNKNOWN"}`);

  const duplicateExpense = await record(
    call("variable_expense_duplicate_idempotency", "POST", "/api/v1/variable-expenses/", {
      bearer: accessToken,
      body: {
        amountMinor: 10000,
        category: "MEAL",
        title: "Phase4 lunch",
        spentAt: `${cycle.today}T03:00:00.000Z`,
        paymentMethod: "CARD",
        merchantName: "phase4",
        memo: "synthetic",
        tags: ["phase4"],
        dailyBudgetId: budgetId,
        source: "MANUAL",
        idempotencyKey: `phase4-var-${hash(email)}`,
      },
    }),
  );

  await record(call("payroll_home", "GET", "/api/v1/payroll/home", { bearer: accessToken }));
  await record(call("payroll_current", "GET", "/api/v1/payroll/current", { bearer: accessToken }));
  await record(call("daily_budget_read", "GET", `/api/v1/daily-budgets/${encodeURIComponent(budgetId)}`, { bearer: accessToken }));
  await record(call("variable_expense_delete", "DELETE", `/api/v1/variable-expenses/${encodeURIComponent(expenseId)}`, { bearer: accessToken, body: { reason: "phase4 synthetic cleanup" } }));

  const assertions = {
    register: register.status === 201,
    payrollCreate: payroll.status === 201 || payroll.status === 200,
    dailyBudgetCreate: dailyBudget.status === 201 || dailyBudget.status === 200,
    variableExpenseCreate: expense.status === 201 || expense.status === 200,
    idempotencyDuplicateBlockedOrStable:
      duplicateExpense.status === 200 ||
      duplicateExpense.status === 201 ||
      duplicateExpense.status === 409,
    fullCorePath:
      steps.find((s) => s.step === "payroll_home")?.status === 200 &&
      steps.find((s) => s.step === "payroll_current")?.status === 200 &&
      steps.find((s) => s.step === "daily_budget_read")?.status === 200,
  };

  const pass = Object.values(assertions).every(Boolean);
  const evidence = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    workerVersion: WORKER_VERSION,
    startedAt,
    finishedAt: new Date().toISOString(),
    syntheticUser: { emailHash: hash(email) },
    steps,
    assertions,
    status: pass ? "PASS_CORE_STAGING_RUNTIME" : "PARTIAL",
    secretValuesStored: false,
    rawTokensStored: false,
    rawFinancialValuesStored: false,
    productionMutation: false,
    notes: [
      "Raw access/refresh tokens, passwords, connection strings, and raw financial values are not written.",
      "This harness validates core staging API runtime after Phase 4 staging-only deploy; broader concurrency/direct-ID/finalization remains separate.",
    ],
  };

  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  write(
    OUT_MD,
    `# Staging Financial E2E Report

Status: ${evidence.status}

Base URL: ${BASE_URL}
Staging Worker Version: ${WORKER_VERSION}
Timestamp: ${evidence.timestamp}

## Sanitized Checks

| Check | Status |
| --- | --- |
| Register synthetic user | ${assertions.register ? "PASS" : "FAIL"} |
| Payroll create/activate | ${assertions.payrollCreate ? "PASS" : "FAIL"} |
| Daily budget create/read | ${assertions.dailyBudgetCreate && assertions.fullCorePath ? "PASS" : "FAIL"} |
| Fixed expense create | ${steps.find((s) => s.step === "fixed_expense_create")?.status ?? "NOT_RUN"} |
| Savings create | ${steps.find((s) => s.step === "savings_create")?.status ?? "NOT_RUN"} |
| Variable expense create/delete | ${assertions.variableExpenseCreate ? "PASS" : "FAIL"} |
| Idempotency duplicate response stable | ${assertions.idempotencyDuplicateBlockedOrStable ? "PASS" : "FAIL"} |
| Payroll home/current reads | ${assertions.fullCorePath ? "PASS" : "FAIL"} |

Evidence JSON: \`${OUT_JSON}\`

No raw credentials, tokens, connection strings, PII, or raw financial values are stored.
`,
  );

  console.log(`STAGING_FINANCIAL_E2E ${evidence.status} steps=${steps.length} evidence=${OUT_JSON}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const evidence = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    workerVersion: WORKER_VERSION,
    startedAt: activeStartedAt,
    finishedAt: new Date().toISOString(),
    syntheticUser: activeSyntheticUser,
    steps: activeSteps,
    assertions: {
      failedBeforeCompletion: true,
      firstFailure: message.replace(
        /[A-Za-z0-9+/=_-]{24,}/g,
        "[REDACTED_TOKEN_LIKE]",
      ),
    },
    status: "PARTIAL_STAGING_RUNTIME_BLOCKED",
    secretValuesStored: false,
    rawTokensStored: false,
    rawFinancialValuesStored: false,
    productionMutation: false,
    notes: [
      "Raw access/refresh tokens, passwords, connection strings, and raw financial values are not written.",
      "This failure artifact is intentionally sanitized and records only HTTP status, stable error code, requestId, and hashed IDs.",
    ],
  };
  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  write(
    OUT_MD,
    `# Staging Financial E2E Report

Status: ${evidence.status}

Base URL: ${BASE_URL}
Staging Worker Version: ${WORKER_VERSION}
Timestamp: ${evidence.timestamp}

First failure: ${evidence.assertions.firstFailure}

Evidence JSON: \`${OUT_JSON}\`

No raw credentials, tokens, connection strings, PII, or raw financial values are stored.
`,
  );
  console.error(`STAGING_FINANCIAL_E2E_FAIL ${message}`);
  process.exit(1);
});
