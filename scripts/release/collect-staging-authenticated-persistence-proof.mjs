#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const DEFAULT_API_BASE_URL = "https://api-staging.salaryhijacking.com";
const DEFAULT_OUTPUT_PATH =
  "artifacts/neon-staging/authenticated-persistence-proof.json";

const SENSITIVE_PATTERN =
  /postgres(?:ql)?:\/\/|:\/\/[^/\s]+:[^@\s]+@|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|"(authorization|cookie|set-cookie|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|jwt|secret|password|salaryAmount(?:Minor)?|payrollAmount(?:Minor)?|expenseAmount(?:Minor)?|savingAmount(?:Minor)?|targetAmount(?:Minor)?|currentAmount(?:Minor)?|fixedSaveAmount(?:Minor)?|plannedAmount(?:Minor)?|hijackAmount(?:Minor)?|accountNumber|cardNumber|phoneNumber|email|pushToken|rawDeviceIdentifier)"\s*:/i;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hash = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const shortHash = (value) => hash(value).slice(0, 16);

const parseArgs = (argv) => {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    args.set(value.slice(2), argv[index + 1]);
    index += 1;
  }
  return args;
};

const assertNoSensitiveEvidence = (evidence) => {
  const serialized = JSON.stringify(evidence);
  assert.equal(
    SENSITIVE_PATTERN.test(serialized),
    false,
    "authenticated persistence evidence contains raw secret, token, PII, or financial data",
  );
};

const metric = (ok, status) => ({
  ok: ok === true,
  status: typeof status === "number" ? status : ok ? 200 : 0,
});

const objectKeys = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];

const safeResponseShape = (result) => ({
  status: result.status,
  ok: result.ok,
  topLevelKeys: objectKeys(result.data),
  dataKeys: objectKeys(result.data?.data),
  tokenContainerKeys: objectKeys(
    result.data?.data?.tokens ?? result.data?.tokens,
  ),
  errorCode:
    typeof result.data?.error?.code === "string"
      ? result.data.error.code
      : typeof result.data?.code === "string"
        ? result.data.code
        : null,
});

const todayInSeoul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (dateText, days) => {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const lastDayOfMonth = (year, month) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const payrollCycle = () => {
  const today = todayInSeoul();
  const [year, month] = today
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  const payday = 25;
  const thisPayday = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(payday, lastDayOfMonth(year, month))).padStart(2, "0")}`;
  const endDate =
    today <= thisPayday
      ? new Date(Date.UTC(year, month - 1, payday))
      : new Date(Date.UTC(year, month, payday));
  const prevEndDate = new Date(endDate);
  prevEndDate.setUTCMonth(prevEndDate.getUTCMonth() - 1);
  const periodEndDate = endDate.toISOString().slice(0, 10);
  const periodStartDate = addDays(prevEndDate.toISOString().slice(0, 10), 1);
  return {
    today,
    payday,
    firstPayrollDate: periodEndDate,
    periodStartDate,
    periodEndDate,
  };
};

const syntheticEmail = () =>
  `codex.launch.persistence.${Date.now()}.${crypto.randomBytes(4).toString("hex")}@example.test`;

const syntheticPassword = () =>
  `Persistence${crypto.randomBytes(8).toString("hex")}!A1`;

const jsonFetch = async (
  baseUrl,
  apiPath,
  { method = "GET", bearer, body } = {},
) => {
  const headers = {
    accept: "application/json",
    "cache-control": "no-store",
    "content-type": "application/json",
    "user-agent": "salary-hijacking-launch-persistence-proof/1.0",
    "x-release-proof": "authenticated-persistence-no-secret-evidence",
  };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const response = await fetch(new URL(apiPath, baseUrl), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, ok: response.ok, data };
};

const accessTokenFrom = (result) => {
  const token =
    result.data?.data?.tokens?.accessToken ??
    result.data?.data?.accessToken ??
    result.data?.tokens?.accessToken ??
    result.data?.accessToken;
  assert.equal(
    typeof token,
    "string",
    `register did not return access token; safe_shape=${JSON.stringify(safeResponseShape(result))}`,
  );
  assert.ok(token.length >= 20, "register access token is unexpectedly short");
  return token;
};

const idFrom = (result, key) => {
  const value = result.data?.data?.[key];
  assert.equal(
    typeof value,
    "string",
    `${key} was not returned; safe_shape=${JSON.stringify(safeResponseShape(result))}`,
  );
  assert.match(value, UUID_PATTERN, `${key} is not a UUID`);
  return value;
};

const assertStepOk = (result, label) => {
  assert.equal(
    result.ok,
    true,
    `${label} failed; safe_shape=${JSON.stringify(safeResponseShape(result))}`,
  );
};

const readbackStep = async (baseUrl, bearer, apiPath) => {
  const result = await jsonFetch(baseUrl, apiPath, { bearer });
  return metric(result.ok, result.status);
};

const blockedOwnershipStep = async (baseUrl, bearer, apiPath) => {
  const result = await jsonFetch(baseUrl, apiPath, { bearer });
  return metric(result.status === 403 || result.status === 404, result.status);
};

const setAdminContext = async (sql) => {
  await sql`select set_config('app.is_admin', 'true', true)`;
};

const setUserContext = async (sql, userId) => {
  await sql`select set_config('app.current_user_id', ${userId}, true), set_config('app.is_admin', 'false', true)`;
};

const dbReadback = async (sql, table, idColumn, id, userId) => {
  const rows = await sql.begin(async (tx) => {
    await setUserContext(tx, userId);
    if (table === "payroll_plans") {
      return tx`
        select count(*)::int as row_count,
               encode(digest(string_agg(payroll_plan_id::text || ':' || status, ',' order by payroll_plan_id), 'sha256'), 'hex') as record_hash
        from public.payroll_plans
        where payroll_plan_id = ${id}::uuid and user_id = ${userId}::uuid
      `;
    }
    if (table === "daily_budgets") {
      return tx`
        select count(*)::int as row_count,
               encode(digest(string_agg(daily_budget_id::text || ':' || status, ',' order by daily_budget_id), 'sha256'), 'hex') as record_hash
        from public.daily_budgets
        where daily_budget_id = ${id}::uuid and user_id = ${userId}::uuid
      `;
    }
    if (table === "variable_expenses") {
      return tx`
        select count(*)::int as row_count,
               encode(digest(string_agg(variable_expense_id::text || ':' || status, ',' order by variable_expense_id), 'sha256'), 'hex') as record_hash
        from public.variable_expenses
        where variable_expense_id = ${id}::uuid and user_id = ${userId}::uuid
      `;
    }
    if (table === "savings_plans") {
      return tx`
        select count(*)::int as row_count,
               encode(digest(string_agg(savings_plan_id::text || ':' || status, ',' order by savings_plan_id), 'sha256'), 'hex') as record_hash
        from public.savings_plans
        where savings_plan_id = ${id}::uuid and user_id = ${userId}::uuid
      `;
    }
    throw new Error(`Unsupported table for ${idColumn}`);
  });
  const row = rows[0] ?? {};
  return {
    rowCount: Number(row.row_count ?? 0),
    recordHash: String(row.record_hash ?? ""),
  };
};

const dbUserIdByEmail = async (sql, email) => {
  const rows = await sql.begin(async (tx) => {
    await setAdminContext(tx);
    return tx`
      select user_id
      from public.users
      where email = ${email}
      order by created_at desc
      limit 1
    `;
  });
  const userId = rows[0]?.user_id;
  assert.equal(typeof userId, "string", "synthetic user was not found in DB");
  assert.match(userId, UUID_PATTERN, "synthetic user id is not a UUID");
  return userId;
};

const cleanupSyntheticUser = async (sql, email) => {
  const rows = await sql.begin(async (tx) => {
    await setAdminContext(tx);
    return tx`
      delete from public.users
      where email = ${email}
      returning user_id
    `;
  });
  const residual = await sql.begin(async (tx) => {
    await setAdminContext(tx);
    return tx`
      select count(*)::int as user_count
      from public.users
      where email = ${email}
    `;
  });
  return {
    deletedUserRows: rows.length,
    residualSyntheticUsers: Number(residual[0]?.user_count ?? 0),
  };
};

const loadPostgres = async () => {
  const requireFromApi = createRequire(
    pathToFileURL(path.resolve("services/api/package.json")),
  );
  const postgresPath = requireFromApi.resolve("postgres");
  const moduleValue = await import(pathToFileURL(postgresPath).href);
  return moduleValue.default;
};

const buildEvidence = ({
  sourceSha,
  subjectHash,
  checks,
  dbChecks,
  cleanup,
}) => {
  const domain = (name) => ({
    authenticatedMutation: checks[name].mutation.ok,
    apiReadback: checks[name].readback.ok,
    dbReadback: dbChecks[name].rowCount === 1,
    ownership: checks[name].ownership.ok,
    result:
      checks[name].mutation.ok &&
      checks[name].readback.ok &&
      dbChecks[name].rowCount === 1 &&
      checks[name].ownership.ok
        ? "PASS"
        : "FAIL",
    mutationStatus: checks[name].mutation.status,
    apiReadbackStatus: checks[name].readback.status,
    ownershipStatus: checks[name].ownership.status,
    dbRowCount: dbChecks[name].rowCount,
    dbRecordHash: dbChecks[name].recordHash,
  });

  const evidence = {
    schemaVersion: 1,
    evidenceType: "staging-authenticated-api-persistence",
    capturedAt: new Date().toISOString(),
    applicationSourceSha: sourceSha,
    environment: "staging",
    secretsRedacted: true,
    containsSecretValues: false,
    containsRawPersonalData: false,
    containsRawFinancialData: false,
    containsRawTokens: false,
    productionDatabaseModified: false,
    syntheticSubjectHash: subjectHash,
    domains: {
      payroll: domain("payroll"),
      budget: domain("budget"),
      expense: domain("expense"),
      saving: domain("saving"),
    },
    cleanup: {
      syntheticUserDeleted: cleanup.deletedUserRows === 1,
      residualSyntheticUsers: cleanup.residualSyntheticUsers,
    },
  };
  const pass =
    Object.values(evidence.domains).every((entry) => entry.result === "PASS") &&
    evidence.cleanup.syntheticUserDeleted &&
    evidence.cleanup.residualSyntheticUsers === 0;
  evidence.status = pass ? "PASS" : "FAIL";
  assertNoSensitiveEvidence(evidence);
  return evidence;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = args.get("out") ?? DEFAULT_OUTPUT_PATH;
  const baseUrl = process.env.STAGING_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const connectionString = process.env.STAGING_DATABASE_URL;
  const sourceSha =
    process.env.APPLICATION_SOURCE_SHA ?? process.env.GITHUB_SHA ?? "UNKNOWN";
  assert.ok(
    connectionString,
    "Missing staging environment secret: STAGING_DATABASE_URL",
  );

  const postgres = await loadPostgres();
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 20,
  });

  const emailA = syntheticEmail();
  const passwordA = syntheticPassword();
  const emailB = syntheticEmail();
  const passwordB = syntheticPassword();
  const cycle = payrollCycle();

  let evidence;
  let cleanup = { deletedUserRows: 0, residualSyntheticUsers: 0 };
  try {
    const registerA = await jsonFetch(baseUrl, "/api/v1/auth/register", {
      method: "POST",
      body: {
        email: emailA,
        password: passwordA,
        nickname: "launchPersistA",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    });
    const registerB = await jsonFetch(baseUrl, "/api/v1/auth/register", {
      method: "POST",
      body: {
        email: emailB,
        password: passwordB,
        nickname: "launchPersistB",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    });
    const tokenA = accessTokenFrom(registerA);
    const tokenB = accessTokenFrom(registerB);

    const payroll = await jsonFetch(baseUrl, "/api/v1/payroll/", {
      method: "POST",
      bearer: tokenA,
      body: {
        title: "Launch persistence payroll",
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
        memo: "launch persistence synthetic",
      },
    });
    const planId = idFrom(payroll, "planId");
    const payrollActivation = await jsonFetch(
      baseUrl,
      `/api/v1/payroll/${encodeURIComponent(planId)}/activate`,
      {
        method: "POST",
        bearer: tokenA,
        body: { reason: "launch persistence synthetic activate" },
      },
    );
    assertStepOk(payrollActivation, "payroll activation");

    const budget = await jsonFetch(baseUrl, "/api/v1/daily-budgets/", {
      method: "POST",
      bearer: tokenA,
      body: {
        budgetDate: cycle.today,
        plannedAmountMinor: 40000,
        memo: "launch persistence synthetic",
        source: "MANUAL",
      },
    });
    const budgetId = idFrom(budget, "budgetId");

    const expense = await jsonFetch(baseUrl, "/api/v1/variable-expenses/", {
      method: "POST",
      bearer: tokenA,
      body: {
        amountMinor: 10000,
        category: "MEAL",
        title: "Launch persistence expense",
        spentAt: `${cycle.today}T03:00:00.000Z`,
        paymentMethod: "CARD",
        merchantName: "launch-persistence",
        memo: "synthetic",
        tags: ["launch"],
        dailyBudgetId: budgetId,
        source: "MANUAL",
        idempotencyKey: `launch-persistence-${shortHash(emailA)}`,
      },
    });
    const expenseId = idFrom(expense, "expenseId");

    const saving = await jsonFetch(baseUrl, "/api/v1/savings/", {
      method: "POST",
      bearer: tokenA,
      body: {
        title: "Launch persistence saving",
        goalType: "EMERGENCY_FUND",
        targetAmountMinor: 1000000,
        currentAmountMinor: 0,
        fixedSaveAmountMinor: 200000,
        frequency: "MONTHLY",
        saveDay: 10,
        startDate: cycle.periodStartDate,
        accountAlias: "launch",
        memo: "synthetic",
        autoSave: false,
        affectsDailyBudget: true,
      },
    });
    const goalId = idFrom(saving, "goalId");

    const userId = await dbUserIdByEmail(sql, emailA);
    const dbChecks = {
      payroll: await dbReadback(
        sql,
        "payroll_plans",
        "payroll_plan_id",
        planId,
        userId,
      ),
      budget: await dbReadback(
        sql,
        "daily_budgets",
        "daily_budget_id",
        budgetId,
        userId,
      ),
      expense: await dbReadback(
        sql,
        "variable_expenses",
        "variable_expense_id",
        expenseId,
        userId,
      ),
      saving: await dbReadback(
        sql,
        "savings_plans",
        "savings_plan_id",
        goalId,
        userId,
      ),
    };

    const checks = {
      payroll: {
        mutation: metric(payroll.ok, payroll.status),
        readback: await readbackStep(
          baseUrl,
          tokenA,
          `/api/v1/payroll/${encodeURIComponent(planId)}`,
        ),
        ownership: await blockedOwnershipStep(
          baseUrl,
          tokenB,
          `/api/v1/payroll/${encodeURIComponent(planId)}`,
        ),
      },
      budget: {
        mutation: metric(budget.ok, budget.status),
        readback: await readbackStep(
          baseUrl,
          tokenA,
          `/api/v1/daily-budgets/${encodeURIComponent(budgetId)}`,
        ),
        ownership: await blockedOwnershipStep(
          baseUrl,
          tokenB,
          `/api/v1/daily-budgets/${encodeURIComponent(budgetId)}`,
        ),
      },
      expense: {
        mutation: metric(expense.ok, expense.status),
        readback: await readbackStep(
          baseUrl,
          tokenA,
          `/api/v1/variable-expenses/${encodeURIComponent(expenseId)}`,
        ),
        ownership: await blockedOwnershipStep(
          baseUrl,
          tokenB,
          `/api/v1/variable-expenses/${encodeURIComponent(expenseId)}`,
        ),
      },
      saving: {
        mutation: metric(saving.ok, saving.status),
        readback: await readbackStep(
          baseUrl,
          tokenA,
          `/api/v1/savings/${encodeURIComponent(goalId)}`,
        ),
        ownership: await blockedOwnershipStep(
          baseUrl,
          tokenB,
          `/api/v1/savings/${encodeURIComponent(goalId)}`,
        ),
      },
    };

    cleanup = await cleanupSyntheticUser(sql, emailA);
    await cleanupSyntheticUser(sql, emailB);
    evidence = buildEvidence({
      sourceSha,
      subjectHash: shortHash(emailA),
      checks,
      dbChecks,
      cleanup,
    });
  } finally {
    await sql.end({ timeout: 5 });
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    `Authenticated staging persistence proof ${evidence.status}; raw values were not printed.`,
  );
  if (evidence.status !== "PASS") process.exitCode = 1;
}

export { assertNoSensitiveEvidence, buildEvidence };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
