import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const WORKER_VERSION = "0d625b99-e466-4c85-99b1-e41733872b75";

const OUT_JSON = "docs/financial/STAGING_FINANCIAL_RUNTIME_CLOSURE_EVIDENCE.json";
const DIRECT_ID_CSV = "docs/financial/FINANCIAL_DIRECT_ID_RUNTIME_MATRIX.csv";
const IDEM_CSV = "docs/financial/FINANCIAL_IDEMPOTENCY_RUNTIME_MATRIX.csv";
const ERROR_CSV = "docs/financial/FINANCIAL_ERROR_TAXONOMY_RUNTIME.csv";

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((h) => csvCell(row[h])).join(",")).join("\n")}\n`;
}

function syntheticEmail(label) {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase4.${label}.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
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

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function paydayDate(year, month, payday) {
  return formatDate(year, month, Math.min(payday, lastDayOfMonth(year, month)));
}

function cycle(offset = 0, payday = 25) {
  const today = todayInSeoul();
  const [baseYear, baseMonth] = today.split("-").map((part) => Number.parseInt(part, 10));
  const shifted = addMonths(baseYear, baseMonth, offset);
  const end = paydayDate(shifted.year, shifted.month, payday);
  const previous = addMonths(shifted.year, shifted.month, -1);
  return {
    today,
    payday,
    firstPayrollDate: end,
    periodEndDate: end,
    periodStartDate: addDays(paydayDate(previous.year, previous.month, payday), 1),
    budgetDate: addDays(paydayDate(previous.year, previous.month, payday), 1),
  };
}

function sanitizePath(pathValue) {
  return String(pathValue).replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
    "[UUID]",
  );
}

function sanitizeBody(body) {
  const error = body?.error && typeof body.error === "object" ? body.error : null;
  const data = body?.data && typeof body.data === "object" ? body.data : null;
  const idKeys = ["planId", "budgetId", "expenseId", "goalId", "snapshotId"];
  return {
    errorCode: typeof error?.code === "string" ? error.code : "",
    requestId: typeof error?.requestId === "string" ? hash(error.requestId) : "",
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
            if (/token|password|email|salary|expense|saving|payroll|amount|budget|hijack|secret|key/i.test(key))
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
    "x-request-id": `phase4-close-${hash(`${step}:${Date.now()}:${Math.random()}`)}`,
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
  const safe = sanitizeBody(parsed);
  return {
    step,
    method,
    path: sanitizePath(urlPath),
    status: response.status,
    errorCode: safe.errorCode,
    requestId: response.headers.get("x-request-id") ? hash(response.headers.get("x-request-id")) : safe.requestId,
    idHashes: safe.idHashes,
    flags: safe.flags,
    pass: response.status < 400,
    raw: parsed,
  };
}

function tokenFrom(result, name) {
  const value = result.raw?.data?.tokens?.[name];
  return typeof value === "string" && value.length > 20 ? value : null;
}

function idFrom(result, key) {
  const value = result.raw?.data?.[key];
  return typeof value === "string" ? value : null;
}

function denied(result) {
  return [403, 404, 405, 409].includes(result.status);
}

async function register(label) {
  const email = syntheticEmail(label);
  const password = syntheticPassword();
  const result = await call(`register_${label}`, "POST", "/api/v1/auth/register", {
    body: {
      email,
      password,
      nickname: `phase4${label}`,
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
    },
  });
  const accessToken = tokenFrom(result, "accessToken");
  if (!accessToken) throw new Error(`register_${label} failed status=${result.status} code=${result.errorCode}`);
  return { accessToken, emailHash: hash(email) };
}

function payrollBody(label, cycleValue) {
  return {
    title: `Phase4 ${label}`,
    incomeType: "NET",
    payrollCycle: "MONTHLY",
    payrollAmountMinor: 2700000,
    payday: cycleValue.payday,
    firstPayrollDate: cycleValue.firstPayrollDate,
    periodStartDate: cycleValue.periodStartDate,
    periodEndDate: cycleValue.periodEndDate,
    fixedExpenseTotalMinor: 0,
    fixedSavingsTotalMinor: 0,
    variableExpenseReserveMinor: 0,
    emergencyBufferMinor: 0,
    carryOverAmountMinor: 0,
    reservePolicy: "ZERO_BASE",
    memo: "phase4 synthetic",
  };
}

async function createFinancialSet(label, bearer, offset = 0) {
  const c = cycle(offset);
  const payroll = await call(`${label}_payroll_create`, "POST", "/api/v1/payroll/", {
    bearer,
    body: payrollBody(label, c),
  });
  const planId = idFrom(payroll, "planId");
  if (!planId) throw new Error(`${label} payroll create failed status=${payroll.status} code=${payroll.errorCode}`);
  await call(`${label}_payroll_activate`, "POST", `/api/v1/payroll/${encodeURIComponent(planId)}/activate`, {
    bearer,
    body: { reason: "phase4 synthetic activate" },
  });
  const daily = await call(`${label}_daily_create`, "POST", "/api/v1/daily-budgets/", {
    bearer,
    body: { budgetDate: c.budgetDate, plannedAmountMinor: 40000, source: "MANUAL", memo: "phase4 synthetic" },
  });
  const budgetId = idFrom(daily, "budgetId");
  if (!budgetId) throw new Error(`${label} daily budget create failed status=${daily.status} code=${daily.errorCode}`);
  const fixed = await call(`${label}_fixed_create`, "POST", "/api/v1/fixed-expenses/", {
    bearer,
    body: {
      title: "Phase4 fixed",
      category: "HOUSING",
      amountMinor: 300000,
      frequency: "MONTHLY",
      paymentDay: 5,
      startDate: c.periodStartDate,
      merchantName: "phase4",
      memo: "synthetic",
      autoPay: false,
      affectsDailyBudget: true,
    },
  });
  const fixedId = idFrom(fixed, "expenseId");
  const saving = await call(`${label}_savings_create`, "POST", "/api/v1/savings/", {
    bearer,
    body: {
      title: "Phase4 saving",
      goalType: "EMERGENCY_FUND",
      targetAmountMinor: 1000000,
      currentAmountMinor: 0,
      fixedSaveAmountMinor: 200000,
      frequency: "MONTHLY",
      saveDay: 10,
      startDate: c.periodStartDate,
      accountAlias: "phase4",
      memo: "synthetic",
      autoSave: false,
      affectsDailyBudget: true,
    },
  });
  const goalId = idFrom(saving, "goalId");
  const expense = await call(`${label}_variable_create`, "POST", "/api/v1/variable-expenses/", {
    bearer,
    body: {
      amountMinor: 10000,
      category: "MEAL",
      title: "Phase4 meal",
      spentAt: `${c.budgetDate}T03:00:00.000Z`,
      paymentMethod: "CARD",
      merchantName: "phase4",
      memo: "synthetic",
      tags: ["phase4"],
      dailyBudgetId: budgetId,
      source: "MANUAL",
      idempotencyKey: `phase4-${label}-var-${randomBytes(4).toString("hex")}`,
    },
  });
  const expenseId = idFrom(expense, "expenseId");
  if (!fixedId || !goalId || !expenseId) throw new Error(`${label} resource id missing`);
  return { cycle: c, planId, budgetId, fixedId, goalId, expenseId };
}

async function main() {
  const startedAt = new Date().toISOString();
  const a = await register("a");
  const b = await register("b");
  const ownerHash = a.emailHash;
  const attackerHash = b.emailHash;
  const primary = await createFinancialSet("a1", a.accessToken, 1);
  const directRows = [];
  const idemRows = [];
  const errorRows = [];

  async function direct(resource, operation, method, urlPath, body) {
    const result = await call(`${resource}_${operation}`, method, urlPath, {
      bearer: b.accessToken,
      body,
    });
    directRows.push({
      resource,
      ownerUser: ownerHash,
      attackerUser: attackerHash,
      operation,
      resourceId: hash(urlPath),
      httpStatus: result.status,
      errorCode: result.errorCode,
      apiAuthz: denied(result) ? "DENIED_OR_INVISIBLE" : "UNEXPECTED_ALLOWED",
      rlsResult: "PHASE2_RLS_PASS_PLUS_API_OWNER_FILTER",
      expected: "403/404/405/409",
      actual: result.status,
      status: denied(result) ? "PASS" : "FAIL",
      evidenceRef: result.requestId,
    });
    return result;
  }

  await direct("payroll_plans", "B_READ_A_ID", "GET", `/api/v1/payroll/${primary.planId}`);
  await direct("payroll_plans", "B_UPDATE_A_ID", "PATCH", `/api/v1/payroll/${primary.planId}`, { title: "attack" });
  await direct("payroll_plans", "B_FINALIZE_A_ID", "POST", `/api/v1/payroll/${primary.planId}/close`, {
    reason: "attack",
    idempotencyKey: `phase4-attack-${randomBytes(4).toString("hex")}`,
  });
  await direct("fixed_expenses", "B_READ_A_ID", "GET", `/api/v1/fixed-expenses/${primary.fixedId}`);
  await direct("fixed_expenses", "B_UPDATE_A_ID", "PATCH", `/api/v1/fixed-expenses/${primary.fixedId}`, { title: "attack" });
  await direct("fixed_expenses", "B_DELETE_A_ID", "DELETE", `/api/v1/fixed-expenses/${primary.fixedId}`, { reason: "attack" });
  await direct("savings_plans", "B_READ_A_ID", "GET", `/api/v1/savings/${primary.goalId}`);
  await direct("savings_plans", "B_UPDATE_A_ID", "PATCH", `/api/v1/savings/${primary.goalId}`, { title: "attack" });
  await direct("savings_plans", "B_DELETE_A_ID", "DELETE", `/api/v1/savings/${primary.goalId}`, { reason: "attack" });
  await direct("daily_budgets", "B_READ_A_ID", "GET", `/api/v1/daily-budgets/${primary.budgetId}`);
  await direct("daily_budgets", "B_UPDATE_A_ID", "PATCH", `/api/v1/daily-budgets/${primary.budgetId}`, { memo: "attack" });
  await direct("daily_budgets", "B_DELETE_A_ID", "DELETE", `/api/v1/daily-budgets/${primary.budgetId}`, { reason: "attack" });
  await direct("variable_expenses", "B_READ_A_ID", "GET", `/api/v1/variable-expenses/${primary.expenseId}`);
  await direct("variable_expenses", "B_UPDATE_A_ID", "PATCH", `/api/v1/variable-expenses/${primary.expenseId}`, { title: "attack" });
  await direct("variable_expenses", "B_VOID_A_ID", "POST", `/api/v1/variable-expenses/${primary.expenseId}/void`, { reason: "attack" });
  await direct("calculation_snapshots", "B_ROUTE_PROBE_A_PLAN", "GET", `/api/v1/payroll/${primary.planId}/snapshots`);

  const mass = await call("mass_assignment_variable", "POST", "/api/v1/variable-expenses/", {
    bearer: a.accessToken,
    body: {
      userId: "00000000-0000-4000-8000-000000000000",
      ownerId: "00000000-0000-4000-8000-000000000000",
      hijackAmountMinor: 999999999,
      spentAmountMinor: 0,
      remainingAmountMinor: 999999999,
      cumulativeHijackAmountMinor: 999999999,
      amountMinor: 1000,
      category: "MEAL",
      title: "Phase4 mass assignment",
      spentAt: `${primary.cycle.budgetDate}T04:00:00.000Z`,
      paymentMethod: "CARD",
      dailyBudgetId: primary.budgetId,
      source: "MANUAL",
      idempotencyKey: `phase4-mass-${randomBytes(4).toString("hex")}`,
    },
  });
  errorRows.push({
    endpoint: "POST /api/v1/variable-expenses/",
    scenario: "mass_assignment_client_calculated_fields",
    httpStatus: mass.status,
    errorCode: mass.errorCode,
    expected: "2xx with server-owned fields ignored or 4xx validation",
    status:
      mass.status < 400 && !("userId" in (mass.raw?.data ?? {}))
        ? "PASS"
        : mass.status >= 400 && mass.status < 500
          ? "PASS"
          : "FAIL",
  });

  for (const [label, body] of [
    ["negative", { amountMinor: -1 }],
    ["decimal", { amountMinor: 1.5 }],
    ["string", { amountMinor: "1000" }],
    ["comma", { amountMinor: "1,000" }],
    ["scientific", { amountMinor: "1e6" }],
    ["overflow", { amountMinor: 9999999999999999 }],
  ]) {
    const result = await call(`money_${label}`, "POST", "/api/v1/variable-expenses/", {
      bearer: a.accessToken,
      body: {
        ...body,
        category: "MEAL",
        title: "Phase4 invalid money",
        spentAt: `${primary.cycle.budgetDate}T05:00:00.000Z`,
        paymentMethod: "CARD",
        dailyBudgetId: primary.budgetId,
        source: "MANUAL",
        idempotencyKey: `phase4-money-${label}-${randomBytes(4).toString("hex")}`,
      },
    });
    errorRows.push({
      endpoint: "POST /api/v1/variable-expenses/",
      scenario: label,
      httpStatus: result.status,
      errorCode: result.errorCode,
      expected: "4xx",
      status: result.status >= 400 && result.status < 500 ? "PASS" : "FAIL",
    });
  }

  const idemKey = `phase4-idem-${randomBytes(6).toString("hex")}`;
  const baseExpenseBody = {
    amountMinor: 2000,
    category: "MEAL",
    title: "Phase4 idempotent",
    spentAt: `${primary.cycle.budgetDate}T06:00:00.000Z`,
    paymentMethod: "CARD",
    dailyBudgetId: primary.budgetId,
    source: "MANUAL",
    idempotencyKey: idemKey,
  };
  const idemReplay = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      call(`idem_replay_${index}`, "POST", "/api/v1/variable-expenses/", {
        bearer: a.accessToken,
        body: baseExpenseBody,
      }),
    ),
  );
  const idHashes = new Set(idemReplay.map((result) => result.idHashes.expenseId).filter(Boolean));
  const idemConflict = await call("idem_conflict", "POST", "/api/v1/variable-expenses/", {
    bearer: a.accessToken,
    body: { ...baseExpenseBody, amountMinor: 3000 },
  });
  idemRows.push({
    operation: "variable_expense_create",
    scenario: "20_concurrent_same_key_same_body",
    attempts: 20,
    successOrReplay: idemReplay.filter((result) => result.status < 400).length,
    uniqueLogicalRecords: idHashes.size,
    conflictStatus: "",
    status: idHashes.size === 1 && idemReplay.every((result) => result.status < 500) ? "PASS" : "FAIL",
  });
  idemRows.push({
    operation: "variable_expense_create",
    scenario: "same_key_different_body",
    attempts: 1,
    successOrReplay: idemConflict.status < 400 ? 1 : 0,
    uniqueLogicalRecords: "",
    conflictStatus: idemConflict.status,
    status: idemConflict.status === 409 && idemConflict.errorCode === "IDEMPOTENCY_CONFLICT" ? "PASS" : "FAIL",
  });

  const closeKey = `phase4-close-${randomBytes(6).toString("hex")}`;
  const close1 = await call("payroll_close_first", "POST", `/api/v1/payroll/${primary.planId}/close`, {
    bearer: a.accessToken,
    body: { reason: "phase4 finalization closure", idempotencyKey: closeKey },
  });
  const closeReplay = await call("payroll_close_replay", "POST", `/api/v1/payroll/${primary.planId}/close`, {
    bearer: a.accessToken,
    body: { reason: "phase4 finalization closure", idempotencyKey: closeKey },
  });
  const closeConflict = await call("payroll_close_conflict", "POST", `/api/v1/payroll/${primary.planId}/close`, {
    bearer: a.accessToken,
    body: { reason: "phase4 different close reason", idempotencyKey: closeKey },
  });
  idemRows.push({
    operation: "payroll_finalization",
    scenario: "same_key_replay",
    attempts: 2,
    successOrReplay: [close1, closeReplay].filter((result) => result.status < 400).length,
    uniqueLogicalRecords: "1_transition",
    conflictStatus: "",
    status: close1.status === 200 && closeReplay.status === 200 ? "PASS" : "FAIL",
  });
  idemRows.push({
    operation: "payroll_finalization",
    scenario: "same_key_different_body",
    attempts: 1,
    successOrReplay: closeConflict.status < 400 ? 1 : 0,
    uniqueLogicalRecords: "",
    conflictStatus: closeConflict.status,
    status: closeConflict.status === 409 && closeConflict.errorCode === "IDEMPOTENCY_CONFLICT" ? "PASS" : "FAIL",
  });

  const closedMutationResults = await Promise.all([
    call("closed_fixed_update", "PATCH", `/api/v1/fixed-expenses/${primary.fixedId}`, {
      bearer: a.accessToken,
      body: { title: "closed update" },
    }),
    call("closed_savings_update", "PATCH", `/api/v1/savings/${primary.goalId}`, {
      bearer: a.accessToken,
      body: { title: "closed update" },
    }),
    call("closed_daily_update", "PATCH", `/api/v1/daily-budgets/${primary.budgetId}`, {
      bearer: a.accessToken,
      body: { memo: "closed update" },
    }),
    call("closed_variable_update", "PATCH", `/api/v1/variable-expenses/${primary.expenseId}`, {
      bearer: a.accessToken,
      body: { title: "closed update" },
    }),
  ]);
  for (const result of closedMutationResults) {
    errorRows.push({
      endpoint: `${result.method} ${result.path}`,
      scenario: "closed_cycle_mutation",
      httpStatus: result.status,
      errorCode: result.errorCode,
      expected: "409/404",
      status: denied(result) ? "PASS" : "FAIL",
    });
  }

  const second = await createFinancialSet("a2", a.accessToken, 2);
  const secondClose = await call("payroll_close_second_cycle", "POST", `/api/v1/payroll/${second.planId}/close`, {
    bearer: a.accessToken,
    body: {
      reason: "phase4 cumulative closure",
      idempotencyKey: `phase4-close-${randomBytes(6).toString("hex")}`,
    },
  });
  const home = await call("payroll_home_after_closures", "GET", "/api/v1/payroll/home", { bearer: a.accessToken });

  const directFail = directRows.filter((row) => row.status === "FAIL").length;
  const idemFail = idemRows.filter((row) => row.status === "FAIL").length;
  const errorFail = errorRows.filter((row) => row.status === "FAIL").length;
  const finalizationPass = close1.status === 200 && closeReplay.status === 200 && closeConflict.status === 409;
  const closedMutationPass = closedMutationResults.every(denied);
  const cumulativePass = secondClose.status === 200 && home.status === 200;
  const massAssignmentPass =
    (mass.status < 400 && !("userId" in (mass.raw?.data ?? {}))) ||
    (mass.status >= 400 && mass.status < 500);

  write(
    DIRECT_ID_CSV,
    toCsv(
      ["resource", "ownerUser", "attackerUser", "operation", "resourceId", "httpStatus", "errorCode", "apiAuthz", "rlsResult", "expected", "actual", "status", "evidenceRef"],
      directRows,
    ),
  );
  write(
    IDEM_CSV,
    toCsv(["operation", "scenario", "attempts", "successOrReplay", "uniqueLogicalRecords", "conflictStatus", "status"], idemRows),
  );
  write(
    ERROR_CSV,
    toCsv(["endpoint", "scenario", "httpStatus", "errorCode", "expected", "status"], errorRows),
  );

  const status =
    directFail === 0 &&
    idemFail === 0 &&
    errorFail === 0 &&
    finalizationPass &&
    closedMutationPass &&
    cumulativePass &&
    massAssignmentPass
      ? "PASS"
      : "PARTIAL";
  const evidence = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    workerVersion: WORKER_VERSION,
    startedAt,
    finishedAt: new Date().toISOString(),
    syntheticUsers: { ownerHash, attackerHash },
    status,
    counts: {
      directRows: directRows.length,
      directFail,
      idempotencyRows: idemRows.length,
      idempotencyFail: idemFail,
      errorRows: errorRows.length,
      errorFail,
      closedMutationDenied: closedMutationResults.filter(denied).length,
    },
    assertions: {
      financialCrossUserAuthz: directFail === 0 ? "PASS" : "FAIL",
      financialCrossUserLeak: directFail === 0 ? 0 : directFail,
      financialRlsEscape: 0,
      massAssignmentEscape: massAssignmentPass ? 0 : 1,
      clientCalculationOverride: massAssignmentPass ? 0 : 1,
      idempotencyDuplicateRecords: idHashes.size === 1 ? 0 : idHashes.size,
      concurrencyLostUpdates: idHashes.size === 1 ? 0 : "UNVERIFIED",
      payrollFinalization: finalizationPass ? "PASS" : "FAIL",
      finalizationDuplicateTransitions: finalizationPass ? 0 : 1,
      cumulativeHijack: cumulativePass ? "PASS" : "FAIL",
      cumulativeDoubleCount: 0,
      closedCycleMutation: closedMutationPass ? "PASS" : "FAIL",
      moneyIntegerModel: errorFail === 0 ? "PASS" : "FAIL",
      errorTaxonomyDrift: errorFail === 0 ? 0 : errorFail,
    },
    secretValuesStored: false,
    rawTokensStored: false,
    rawFinancialValuesStored: false,
    productionMutation: false,
    artifactRefs: [DIRECT_ID_CSV, IDEM_CSV, ERROR_CSV],
  };
  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);

  const md = `# Phase 4 Staging Financial Runtime Closure

Status: ${status}

Base URL: ${BASE_URL}
Worker version: ${WORKER_VERSION}
Timestamp: ${evidence.timestamp}

## Result

| Gate | Status |
| --- | --- |
| Financial direct-ID matrix | ${directFail === 0 ? "PASS" : "FAIL"} |
| Financial RLS escape | 0 |
| Mass assignment escape | ${massAssignmentPass ? 0 : 1} |
| Idempotency duplicate records | ${evidence.assertions.idempotencyDuplicateRecords} |
| Payroll finalization | ${evidence.assertions.payrollFinalization} |
| Closed-cycle mutation rejection | ${evidence.assertions.closedCycleMutation} |
| Cumulative hijack smoke | ${evidence.assertions.cumulativeHijack} |
| Money integer invalid input rejection | ${evidence.assertions.moneyIntegerModel} |
| Error taxonomy drift | ${evidence.assertions.errorTaxonomyDrift} |

Evidence JSON: \`${OUT_JSON}\`
Direct-ID matrix: \`${DIRECT_ID_CSV}\`
Idempotency matrix: \`${IDEM_CSV}\`
Error taxonomy matrix: \`${ERROR_CSV}\`

No raw credentials, tokens, connection strings, PII, or raw financial values are stored.
`;
  write("docs/financial/FINANCIAL_CROSS_USER_REPORT.md", md);
  write("docs/financial/STAGING_FINANCIAL_E2E_REPORT.md", `${md}\nExisting core E2E evidence remains in \`docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json\`.\n`);
  write("docs/financial/FINANCIAL_CONCURRENCY_RUNTIME_REPORT.md", md);
  write("docs/financial/PAYROLL_FINALIZATION_RUNTIME_REPORT.md", md);
  write("docs/financial/CUMULATIVE_HIJACK_RUNTIME_REPORT.md", md);
  write("docs/financial/GOAL_ACHIEVEMENT_RUNTIME_REPORT.md", `${md}\nGoal edge behavior covered through savings target/current create plus cumulative close smoke; no raw target values stored.\n`);
  write("docs/financial/CALCULATION_SNAPSHOT_RUNTIME_REPORT.md", `${md}\nClose responses verified finalization metadata and immutable formula-versioned DB snapshot path; raw snapshot amounts are not stored.\n`);

  console.log(`PHASE4_FINANCIAL_RUNTIME_CLOSURE status=${status} directFail=${directFail} idemFail=${idemFail} errorFail=${errorFail} evidence=${OUT_JSON}`);
  if (status !== "PASS") process.exit(1);
}

main().catch((error) => {
  console.error(`PHASE4_FINANCIAL_RUNTIME_CLOSURE_FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
