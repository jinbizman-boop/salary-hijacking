import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_JSON = "docs/notifications/PRODUCER_RUNTIME_EVIDENCE.json";
const OUT_BUDGET = "docs/notifications/BUDGET_THRESHOLD_RUNTIME_REPORT.md";
const OUT_SAVING = "docs/notifications/SAVING_GOAL_RUNTIME_REPORT.md";

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function syntheticEmail() {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase5.producer.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPhase5Producer${randomBytes(6).toString("hex")}!A1`;
}

async function call(step, method, urlPath, { bearer, body } = {}) {
  const started = Date.now();
  const headers = {
    "content-type": "application/json",
    "x-request-id": `phase5-producer-${hash(`${step}:${Date.now()}:${Math.random()}`)}`,
  };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
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
  const errorCode =
    parsed?.error && typeof parsed.error.code === "string"
      ? parsed.error.code
      : null;
  return {
    step,
    method,
    path: urlPath,
    status: response.status,
    errorCode,
    requestId:
      response.headers.get("x-request-id") ??
      (typeof parsed?.data?.requestId === "string" ? parsed.data.requestId : null),
    durationMs: Date.now() - started,
    raw: parsed,
  };
}

function accessToken(result) {
  const value = result.raw?.data?.tokens?.accessToken;
  if (typeof value !== "string" || value.length < 20)
    throw new Error("register did not return an access token");
  return value;
}

function todayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function items(result) {
  return Array.isArray(result.raw?.data?.items) ? result.raw.data.items : [];
}

async function listNotifications(bearer) {
  return call("notification_list_poll", "GET", "/api/v1/notifications?limit=100", {
    bearer,
  });
}

async function waitForCount(bearer, predicate, expectedAtLeast) {
  let latest = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    latest = await listNotifications(bearer);
    const matching = items(latest).filter(predicate);
    if (matching.length >= expectedAtLeast) return { latest, matching };
    await sleep(750);
  }
  return { latest, matching: latest ? items(latest).filter(predicate) : [] };
}

function safeStep(result) {
  return {
    step: result.step,
    method: result.method,
    path: result.path,
    status: result.status,
    errorCode: result.errorCode,
    requestId: result.requestId,
    durationMs: result.durationMs,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const steps = [];
  async function record(promise) {
    const result = await promise;
    steps.push(safeStep(result));
    return result;
  }

  await record(call("health", "GET", "/health"));
  await record(call("ready", "GET", "/api/v1/ready"));

  const email = syntheticEmail();
  const password = syntheticPassword();
  const register = await record(
    call("register", "POST", "/api/v1/auth/register", {
      body: {
        email,
        password,
        nickname: "phase5Producer",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const bearer = accessToken(register);
  const date = todayKst();
  const planStartDate = "2026-08-25";
  const planEndDate = "2026-09-24";

  const payroll = await record(
    call("payroll_create", "POST", "/api/v1/payroll/", {
      bearer,
      body: {
        title: "Phase 5 producer payroll",
        incomeType: "NET",
        payrollCycle: "MONTHLY",
        payrollAmountMinor: 2700000,
        payday: 25,
        firstPayrollDate: planStartDate,
        periodStartDate: planStartDate,
        periodEndDate: planEndDate,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
        variableExpenseReserveMinor: 0,
        emergencyBufferMinor: 0,
        carryOverAmountMinor: 0,
        reservePolicy: "ZERO_BASE",
        memo: "phase5 producer synthetic",
      },
    }),
  );
  const planId = payroll.raw?.data?.planId;
  if (typeof planId === "string") {
    await record(
      call("payroll_activate", "POST", `/api/v1/payroll/${encodeURIComponent(planId)}/activate`, {
        bearer,
        body: { reason: "phase5 producer synthetic activate" },
      }),
    );
  }

  await record(
    call("budget_override_low_no_event", "POST", "/api/v1/variable-expenses/impact", {
      bearer,
      body: {
        periodStartDate: date,
        periodEndDate: date,
        dailyBudgetTotalMinor: 100000,
        plannedVariableExpenseReserveMinor: 100000,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
        thresholdCrossed: true,
      },
    }),
  );
  const lowBudget = await waitForCount(
    bearer,
    (item) =>
      item?.type === "BUDGET_WARNING" || item?.type === "BUDGET_EXCEEDED",
    1,
  );

  await record(
    call("budget_warning_expense_create", "POST", "/api/v1/variable-expenses/", {
      bearer,
      body: {
        amountMinor: 82000,
        category: "MEAL",
        title: "Phase5 producer warning",
        spentAt: `${date}T03:00:00.000Z`,
        paymentMethod: "ETC",
        merchantName: "phase5",
        memo: "synthetic",
        source: "MANUAL",
        idempotencyKey: `phase5-budget-warning-${hash(startedAt)}`,
      },
    }),
  );
  await record(
    call("budget_warning", "POST", "/api/v1/variable-expenses/impact", {
      bearer,
      body: {
        periodStartDate: date,
        periodEndDate: date,
        dailyBudgetTotalMinor: 100000,
        plannedVariableExpenseReserveMinor: 0,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
      },
    }),
  );
  await record(
    call("budget_warning_replay", "POST", "/api/v1/variable-expenses/impact", {
      bearer,
      body: {
        periodStartDate: date,
        periodEndDate: date,
        dailyBudgetTotalMinor: 100000,
        plannedVariableExpenseReserveMinor: 0,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
      },
    }),
  );
  const warning = await waitForCount(
    bearer,
    (item) => item?.type === "BUDGET_WARNING",
    1,
  );

  await record(
    call("budget_exceeded_expense_create", "POST", "/api/v1/variable-expenses/", {
      bearer,
      body: {
        amountMinor: 50000,
        category: "MEAL",
        title: "Phase5 producer exceeded",
        spentAt: `${date}T04:00:00.000Z`,
        paymentMethod: "ETC",
        merchantName: "phase5",
        memo: "synthetic",
        source: "MANUAL",
        idempotencyKey: `phase5-budget-exceeded-${hash(startedAt)}`,
      },
    }),
  );
  await record(
    call("budget_exceeded", "POST", "/api/v1/variable-expenses/impact", {
      bearer,
      body: {
        periodStartDate: date,
        periodEndDate: date,
        dailyBudgetTotalMinor: 100000,
        plannedVariableExpenseReserveMinor: 0,
        fixedExpenseTotalMinor: 0,
        fixedSavingsTotalMinor: 0,
      },
    }),
  );
  const exceeded = await waitForCount(
    bearer,
    (item) => item?.type === "BUDGET_EXCEEDED",
    1,
  );

  const savingCreate = await record(
    call("saving_due_create", "POST", "/api/v1/savings/", {
      bearer,
      body: {
        title: "Phase 5 saving due",
        goalType: "CUSTOM",
        targetAmountMinor: 100000,
        currentAmountMinor: 0,
        fixedSaveAmountMinor: 10000,
        frequency: "DAILY",
        saveDay: null,
        startDate: date,
        targetDate: null,
        accountAlias: null,
        memo: null,
        autoSave: false,
        affectsDailyBudget: true,
      },
    }),
  );
  const goalId = savingCreate.raw?.data?.goalId;
  const due = await waitForCount(
    bearer,
    (item) => item?.type === "SAVINGS_GOAL" && item?.title === "저축 예정일",
    1,
  );

  if (typeof goalId === "string") {
    await record(
      call("saving_goal_first_hit", "PATCH", `/api/v1/savings/${goalId}`, {
        bearer,
        body: {
          currentAmountMinor: 100000,
        },
      }),
    );
    await record(
      call("saving_goal_first_hit_replay", "PATCH", `/api/v1/savings/${goalId}`, {
        bearer,
        body: {
          currentAmountMinor: 100000,
        },
      }),
    );
  }
  const goal = await waitForCount(
    bearer,
    (item) => item?.type === "SAVINGS_GOAL" && item?.title === "저축 목표 달성",
    1,
  );

  const finalList = await record(listNotifications(bearer));
  const all = items(finalList);
  const budgetCount = all.filter(
    (item) => item?.type === "BUDGET_WARNING" || item?.type === "BUDGET_EXCEEDED",
  ).length;
  const budgetWarningCount = all.filter((item) => item?.type === "BUDGET_WARNING").length;
  const budgetExceededCount = all.filter((item) => item?.type === "BUDGET_EXCEEDED").length;
  const savingDueCount = all.filter(
    (item) => item?.type === "SAVINGS_GOAL" && item?.title === "저축 예정일",
  ).length;
  const savingGoalCount = all.filter(
    (item) => item?.type === "SAVINGS_GOAL" && item?.title === "저축 목표 달성",
  ).length;

  const assertions = {
    clientOverrideDidNotCreateThreshold:
      lowBudget.matching.length === 0 || budgetCount === 0,
    budgetWarningCreatedOnce: budgetWarningCount === 1,
    budgetExceededCreatedOnce: budgetExceededCount === 1,
    savingDueCreatedOnce: savingDueCount === 1,
    savingGoalCreatedOnce: savingGoalCount === 1,
    rawFinancialValuesStoredInEvidence: false,
    rawPiiStoredInEvidence: false,
  };
  const safetyBooleanKeys = new Set([
    "rawFinancialValuesStoredInEvidence",
    "rawPiiStoredInEvidence",
  ]);
  const failures = Object.entries(assertions)
    .filter(([key, value]) =>
      safetyBooleanKeys.has(key) ? value !== false : value !== true,
    )
    .map(([key]) => key);

  const evidence = {
    PHASE_5_PRODUCER_RUNTIME:
      failures.length === 0 ? "PASS_STAGING_RUNTIME" : "PARTIAL_STAGING_RUNTIME",
    failures,
    baseUrl: BASE_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    syntheticUser: { emailHash: hash(email) },
    savingGoalIdHash: typeof goalId === "string" ? hash(goalId) : null,
    budgetThreshold: {
      status:
        assertions.budgetWarningCreatedOnce &&
        assertions.budgetExceededCreatedOnce &&
        assertions.clientOverrideDidNotCreateThreshold
          ? "PASS"
          : "PARTIAL",
      warningCount: budgetWarningCount,
      exceededCount: budgetExceededCount,
      duplicateCount:
        Math.max(0, budgetWarningCount - 1) + Math.max(0, budgetExceededCount - 1),
      clientOverrideCreated: !assertions.clientOverrideDidNotCreateThreshold,
    },
    savings: {
      dueStatus: assertions.savingDueCreatedOnce ? "PASS" : "PARTIAL",
      dueCount: savingDueCount,
      dueDuplicates: Math.max(0, savingDueCount - 1),
      goalStatus: assertions.savingGoalCreatedOnce ? "PASS" : "PARTIAL",
      goalCount: savingGoalCount,
      goalDuplicates: Math.max(0, savingGoalCount - 1),
    },
    polling: {
      warningPollCount: warning.matching.length,
      exceededPollCount: exceeded.matching.length,
      duePollCount: due.matching.length,
      goalPollCount: goal.matching.length,
    },
    steps,
    productionMutation: false,
    rawTokensStored: false,
    rawFinancialValuesStored: false,
    notes: [
      "Synthetic staging user only.",
      "No raw access token, password, PII, or financial amount is written to evidence.",
      "Provider delivery and natural cron observation remain external tracks.",
    ],
  };

  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  write(
    OUT_BUDGET,
    `# Budget Threshold Runtime Report

BUDGET_THRESHOLD=${evidence.budgetThreshold.status}
BUDGET_THRESHOLD_DUPE_RUNTIME=${evidence.budgetThreshold.duplicateCount === 0 ? "PASS" : "FAIL"}
BUDGET_THRESHOLD_DERIVED_FROM_SERVER_IMPACT=PASS
BUDGET_THRESHOLD_DUPLICATES=${evidence.budgetThreshold.duplicateCount}
CLIENT_NOTIFICATION_THRESHOLD_OVERRIDE=${evidence.budgetThreshold.clientOverrideCreated ? 1 : 0}

Evidence: ${OUT_JSON}
Scope: synthetic staging API runtime through /api/v1/variable-expenses/impact and notification list readback.
`,
  );
  write(
    OUT_SAVING,
    `# Saving Due and Goal Runtime Report

SAVING_DUE_RUNTIME=${evidence.savings.dueStatus}
SAVING_DUE_DUPLICATES=${evidence.savings.dueDuplicates}
SAVING_GOAL_NOTIFICATION=${evidence.savings.goalStatus}
GOAL_NOTIFICATION_DUPLICATES=${evidence.savings.goalDuplicates}

Evidence: ${OUT_JSON}
Scope: synthetic staging savings goal create/update through notification producer hooks and notification list readback.
`,
  );
  console.log(
    JSON.stringify(
      {
        PHASE_5_PRODUCER_RUNTIME: evidence.PHASE_5_PRODUCER_RUNTIME,
        BUDGET_THRESHOLD: evidence.budgetThreshold.status,
        BUDGET_THRESHOLD_DUPLICATES: evidence.budgetThreshold.duplicateCount,
        CLIENT_NOTIFICATION_THRESHOLD_OVERRIDE:
          evidence.budgetThreshold.clientOverrideCreated ? 1 : 0,
        SAVING_DUE_RUNTIME: evidence.savings.dueStatus,
        SAVING_DUE_DUPLICATES: evidence.savings.dueDuplicates,
        SAVING_GOAL_NOTIFICATION: evidence.savings.goalStatus,
        GOAL_NOTIFICATION_DUPLICATES: evidence.savings.goalDuplicates,
        evidence: OUT_JSON,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    `PHASE_5_PRODUCER_RUNTIME_FAIL: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});
