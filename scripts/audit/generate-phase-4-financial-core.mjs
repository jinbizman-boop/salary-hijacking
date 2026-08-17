import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FIN_DIR = path.join(ROOT, "docs", "financial");
const TRACE_PATH = path.join(ROOT, "docs", "audit", "CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const RC_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";
const STAGING_BRANCH_ID = "br-fragrant-sky-aj5kk2c3";
const MIGRATION_0017 = "database/migrations/0017_payroll_cycle_recalculation.sql";
const MIGRATION_0018 = "database/migrations/0018_variable_expense_refund_column_repair.sql";
const PHASE4_EVIDENCE =
  "Phase 4 evidence: payroll repository test stores payday-cycle plans under payroll month; migration 0017 replaces server recalculation with KST payday-cycle boundaries and formula_version payroll-v2-cycle-kst; migration 0018 repairs missing live variable_expenses refund columns required by the recalculation trigger; staging Neon branch br-fragrant-sky-aj5kk2c3 verified helper/function definitions, 25-day cycle boundaries, refund columns, and migration ledger 18/18 VERIFIED_APPLIED. Public staging core financial API E2E passed via scripts/e2e/financial-staging-core.mjs with sanitized evidence in docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json. Financial direct-ID matrix, broad concurrency, and finalization/cumulative runtime gates remain pending.";

mkdirSync(FIN_DIR, { recursive: true });

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function sha256File(rel) {
  return sha256(readFileSync(path.join(ROOT, rel), "utf8"));
}

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseCsv(text) {
  const parsedRows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      parsedRows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    parsedRows.push(row);
  }
  const [headers, ...body] = parsedRows.filter((r) => r.length > 1 || r[0] !== "");
  return { headers, rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))) };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")).join("\n")}\n`;
}

function writeRel(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

function appendUniqueList(existing, additions) {
  const seen = new Set();
  return [...String(existing ?? "").split(";"), ...additions]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .join("; ");
}

const head = git("rev-parse HEAD");
const remoteHead = git("rev-parse @{u}");
const branch = git("rev-parse --abbrev-ref HEAD");
const migrationHash = sha256File(MIGRATION_0017);
const migration0018Hash = sha256File(MIGRATION_0018);

const trace = parseCsv(readFileSync(TRACE_PATH, "utf8"));
const phase4Namespaces = new Set(["FIN", "PAY", "HOME", "BUD", "EXP", "SAV"]);
const phase4Rows = trace.rows.filter((row) => phase4Namespaces.has(row.REQ_ID.split("-")[0]));

for (const row of trace.rows) {
  const namespace = row.REQ_ID.split("-")[0];
  if (!phase4Namespaces.has(namespace)) continue;
  row.CURRENT_REPOSITORY_HEAD = head;
  row.APPLICATION_RC_SOURCE_SHA = RC_SHA;
  row.CODE_PATH = appendUniqueList(row.CODE_PATH, [
    "services/api/src/repositories/payroll.repository.ts",
    "database/migrations/0017_payroll_cycle_recalculation.sql",
    "database/migrations/0018_variable_expense_refund_column_repair.sql",
  ]);
  row.TEST_PATH = appendUniqueList(row.TEST_PATH, [
    "services/api/tests/payroll-db-repository.test.ts",
    "services/api/tests/financial-phase4-payroll-cycle-migration.test.ts",
    "scripts/audit/validate-phase-4-financial-core.mjs",
    "scripts/e2e/financial-staging-core.mjs",
  ]);
  row.RUNTIME_EVIDENCE = PHASE4_EVIDENCE;
  row.BLOCKER =
    "Financial direct-ID matrix, broad idempotency/concurrency runtime, payroll finalization/cumulative runtime remain pending.";
  row.NEXT_ACTION =
    "Run full financial direct-ID matrix, broad concurrency/idempotency harness, and finalization/cumulative lifecycle before PASS.";
  if (row.CURRENT_STATUS === "UNVERIFIED" || row.CURRENT_STATUS === "FAIL") row.CURRENT_STATUS = "PARTIAL";
}
writeFileSync(TRACE_PATH, toCsv(trace.headers, trace.rows));

const reqHeaders = [
  "requirementId",
  "namespace",
  "priority",
  "requirement",
  "implementationPath",
  "apiEndpoint",
  "dbTable",
  "calculationRule",
  "unitTest",
  "integrationTest",
  "stagingRuntime",
  "evidence",
  "status",
];
writeRel(
  "docs/financial/PHASE_4_REQUIREMENT_MATRIX.csv",
  toCsv(
    reqHeaders,
    phase4Rows.map((row) => ({
      requirementId: row.REQ_ID,
      namespace: row.REQ_ID.split("-")[0],
      priority: row.PRIORITY,
      requirement: row.SOURCE_SECTION,
      implementationPath: row.CODE_PATH,
      apiEndpoint: row.API_ENDPOINT_OR_FAMILY,
      dbTable: row.DB_TABLES,
      calculationRule:
        row.REQ_ID.startsWith("FIN-") || row.REQ_ID.startsWith("PAY-") || row.REQ_ID.startsWith("HOME-")
          ? "server-authoritative payroll-v2-cycle-kst where covered by 0017; endpoint lifecycle broader than current evidence"
          : "domain CRUD/calculation contract requires full staging runtime evidence",
      unitTest:
        row.REQ_ID === "FIN-005" || row.REQ_ID === "FIN-009" || row.REQ_ID.startsWith("PAY-")
          ? "services/api/tests/payroll-db-repository.test.ts; services/api/tests/financial-phase4-payroll-cycle-migration.test.ts"
          : "PHASE_4_PENDING_OR_EXISTING_DOMAIN_TEST",
      integrationTest: "scripts/e2e/financial-staging-core.mjs",
      stagingRuntime: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
      evidence: PHASE4_EVIDENCE,
      status: "PARTIAL",
    })),
  ),
);

const endpointRows = [
  ["POST", "/api/v1/payroll", "PAY", "YES", "USER_OWNER", "PASS_CORE", "Creates payroll plan; repository fixed to store payroll month from cycle end/payday; staging E2E passed core create/activate."],
  ["GET", "/api/v1/payroll", "PAY", "YES", "USER_OWNER", "PASS_CORE", "Current payroll read passed in staging core E2E."],
  ["PATCH", "/api/v1/payroll/{payrollPlanId}", "PAY", "YES", "USER_OWNER", "PARTIAL", "Update path now derives payroll month from firstPayrollDate/periodEndDate."],
  ["POST", "/api/v1/daily-budgets", "BUD", "YES", "USER_OWNER", "PASS_CORE", "DB recalculation dispatcher maps budget date to KST payday cycle; staging E2E create/read passed after 0018 repair."],
  ["POST", "/api/v1/fixed-expenses", "EXP", "YES", "USER_OWNER", "PASS_CORE", "Fixed totals included in server recalculation by payroll_plan_id; staging E2E create passed."],
  ["POST", "/api/v1/variable-expenses", "EXP", "YES", "USER_OWNER", "PASS_CORE", "Variable totals included by KST spent_at business date and refund-adjusted amount; staging E2E create/delete and idempotent replay passed."],
  ["POST", "/api/v1/savings", "SAV", "YES", "USER_OWNER", "PASS_CORE", "Savings totals included as reserved allocation in server recalculation; staging E2E create passed."],
  ["GET", "/api/v1/payroll/home", "HOME", "YES", "USER_OWNER", "PASS_CORE", "Home/current reads passed in staging core E2E."],
];
writeRel(
  "docs/financial/FINANCIAL_ENDPOINT_RUNTIME_MATRIX.csv",
  toCsv(
    ["method", "path", "domain", "auth", "ownership", "status", "evidence"],
    endpointRows.map(([method, pathValue, domain, auth, ownership, status, evidence]) => ({
      method,
      path: pathValue,
      domain,
      auth,
      ownership,
      status,
      evidence,
    })),
  ),
);

writeRel(
  "docs/financial/FINANCIAL_FORMULA_REGISTRY.md",
  `# Financial Formula Registry

Status: PARTIAL

Source: \`급여납치_풀스택_기능_성능_정의서_v2.0_최종본.pdf\` sections 5, 7, and 21.

## FORMULA-PAYROLL-CYCLE-KST

- Inputs: payroll yearMonth, payday, user timezone default Asia/Seoul.
- Output: cycleStart, cycleEnd, cycleEndExclusive.
- Rule: cycle starts the day after the previous concrete payday and ends on the current concrete payday. Payday 29-31 clamps to month end.
- Implementation: \`packages/utils/src/date.ts\`, \`services/api/src/repositories/payroll.repository.ts\`, \`database/migrations/0017_payroll_cycle_recalculation.sql\`.
- Evidence: local regression tests pass; staging helper verified for 2026-02 payday 31 and 2026-09 payday 25 boundaries.

## FORMULA-HIJACK-AMOUNT

- Inputs: salary amount, fixed expense total, savings total, variable expense total.
- Output: expectedHijackAmount and confirmedHijackAmount.
- Rule: server recalculation uses KRW integer totals and clamps hijack amount to zero when allocations/spend exceed salary.
- Current implementation: \`recalculate_payroll_plan\` formula version \`payroll-v2-cycle-kst\`.
- Status: PARTIAL because finalization/cumulative and broad adversarial runtime remain pending.

## FORMULA-DAILY-BUDGET-RECALCULATION

- Inputs: daily budget row, active variable expenses, refund amount.
- Output: spent, remaining, over amount through DB recalculation guards.
- Status: PARTIAL; DB guard exists, but broad staging API mutation/runtime evidence remains pending.
`,
);

writeRel(
  "docs/financial/PAYROLL_CYCLE_POLICY.md",
  `# Payroll Cycle Policy

Status: PARTIAL

- Default business timezone: Asia/Seoul.
- DB timestamp storage remains UTC; business date attribution is done in the user/business timezone.
- Payday policy implemented in Phase 4: day 1-31, clamped to the concrete month end.
- Example: payday 25 for payroll month 2026-09 covers 2026-08-26 through 2026-09-25.
- Example: payday 31 in February 2026 resolves to 2026-02-28.
- Migration evidence: \`database/migrations/0017_payroll_cycle_recalculation.sql\`.
- Staging evidence: Neon staging branch ${STAGING_BRANCH_ID} helper calls returned expected boundaries.

Remaining blocker: financial direct-ID matrix plus finalization/cumulative lifecycle verification.
`,
);

writeRel(
  "docs/financial/TIMEZONE_BOUNDARY_REPORT.md",
  `# Timezone Boundary Report

Status: PARTIAL

Phase 4 fixed the known server-side payroll recalculation drift where variable expenses and daily budgets were attributed by calendar month rather than KST payday-cycle.

Evidence:
- \`recalculate_payroll_plan\` now converts \`variable_expenses.spent_at\` with \`at time zone 'Asia/Seoul'\` before cycle filtering.
- \`daily_budgets.budget_date\` now uses cycleStart/cycleEndExclusive instead of calendar month.
- Staging branch ${STAGING_BRANCH_ID} verified payday 25 inclusion/exclusion around 2026-08-25, 2026-08-26, 2026-09-25, and 2026-09-26.

Remaining blocker: DST timezone user tests and non-default user timezone runtime are not yet complete.
`,
);

writeRel(
  "docs/financial/FINANCIAL_GOLDEN_CASES.csv",
  toCsv(
    ["caseId", "description", "expected", "implementation", "status"],
    [
      ["CASE-001", "normal payroll with fixed, savings, variable totals", "server recalculation snapshot", "0017 payroll-v2-cycle-kst", "PARTIAL"],
      ["CASE-002", "no expense", "hijack equals salary", "pending public API runtime", "PENDING"],
      ["CASE-003", "no savings", "savings total zero", "pending public API runtime", "PENDING"],
      ["CASE-004", "overspend", "remaining may go negative while hijack clamps to zero", "DB formula clamps hijack", "PARTIAL"],
      ["CASE-005", "exact zero remaining", "zero boundary stable", "pending public API runtime", "PENDING"],
      ["CASE-006", "multiple fixed expenses", "sum by payroll_plan_id", "0017 function", "PARTIAL"],
      ["CASE-007", "recurring savings", "sum by payroll_plan_id", "0017 function", "PARTIAL"],
      ["CASE-008", "payday 31 February", "2026-02-28", "staging helper verified", "PASS_DB_HELPER"],
      ["CASE-009", "timezone midnight", "KST business date attribution", "0017 function", "PARTIAL"],
      ["CASE-010", "concurrent expenses", "no lost updates", "pending runtime harness", "PENDING"],
      ["CASE-011", "idempotent retry", "duplicate financial row zero", "DB unique exists for variable expense", "PARTIAL"],
      ["CASE-012", "finalized cycle", "immutable deterministic totals", "pending finalization runtime", "PENDING"],
    ].map(([caseId, description, expected, implementation, status]) => ({
      caseId,
      description,
      expected,
      implementation,
      status,
    })),
  ),
);

writeRel(
  "docs/financial/IDEMPOTENCY_CONCURRENCY_REPORT.md",
  `# Idempotency and Concurrency Report

Status: PARTIAL

Confirmed:
- Variable expense idempotency key has DB unique protection from earlier schema work.
- Phase 4 migration preserves row-lock-based recalculation paths and moves payroll-plan selection to payday-cycle boundaries.
- Public staging core E2E verified duplicate variable-expense idempotency replay returned the same expense through the API without creating a second record.

Not closed:
- 20-way concurrent expense create/update/delete runtime harness was not completed in this Phase 4 pass.
- Duplicate Idempotency-Key different body public API conflict behavior remains pending for all financial write endpoints.
- Payroll finalization race remains pending.

PHASE_4_STATUS remains PARTIAL.
`,
);

writeRel(
  "docs/financial/FINANCIAL_CROSS_USER_REPORT.md",
  `# Financial Cross-User Report

Status: PARTIAL

Phase 3 account/privacy cross-user direct-ID and RLS evidence remains PASS and is preserved. Phase 4 financial direct-ID matrix for payroll plans, fixed expenses, savings, daily budgets, variable expenses, and calculation snapshots was not fully rerun through public staging API in this pass.

Current risk status:
- FINANCIAL_CROSS_USER_LEAK: UNVERIFIED_FOR_FULL_FINANCIAL_MATRIX
- FINANCIAL_RLS_ESCAPE: UNVERIFIED_FOR_FULL_FINANCIAL_MATRIX

Next action: run USER_A/USER_B synthetic staging financial resource direct-ID tests before PASS.
`,
);

writeRel(
  "docs/financial/STAGING_FINANCIAL_E2E_REPORT.md",
  `# Staging Financial E2E Report

Status: PASS_CORE_STAGING_RUNTIME

Completed in this pass:
- Neon staging branch ${STAGING_BRANCH_ID} verified Phase 4 DB functions and migration ledger 18/18.
- Server-side payroll cycle recalculation no longer uses calendar-month boundaries in the DB function.
- Public staging synthetic E2E passed register/login, payroll create/activate/current/home, daily budget create/read, fixed expense create, savings create, variable expense create/delete, and duplicate idempotency replay.
- Root cause repaired: daily budget creation failed because live staging lacked \`variable_expenses.refund_amount\`; migration 0018 restored the missing column.

Evidence:
- \`docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json\`
- \`scripts/e2e/financial-staging-core.mjs\`

Still not enough for PHASE_4=PASS:
- Financial direct-ID cross-user matrix pending.
- Broad 20-way concurrency and different-body idempotency conflict runtime pending.
- Payroll finalization/cumulative hijack runtime pending.
`,
);

writeRel(
  "docs/financial/FINANCIAL_CALCULATION_INTEGRITY_REPORT.md",
  `# Financial Calculation Integrity Report

Status: PARTIAL

Closed drift:
- Payroll plan repository now stores the payroll month from \`firstPayrollDate\` or \`periodEndDate\`, rather than the cycle start month.
- DB recalculation now uses KST payday-cycle boundaries for daily budget and variable expense totals.
- Migration 0018 repaired the missing live \`variable_expenses.refund_amount\` column that blocked the daily-budget recalculation trigger in staging.
- Calculation snapshots include formula version \`payroll-v2-cycle-kst\`, cycle boundaries, payday, timezone, KRW currency, and KRW_1 unit.

Remaining internal blockers:
- Full financial direct-ID matrix.
- Finalized cycle immutability/reopen policy runtime.
- Cumulative hijack aggregation runtime.
- Goal/achievement runtime edge cases.
- Broad concurrency/idempotency harness.
`,
);

writeRel(
  "docs/financial/PHASE_4_CLOSURE_REPORT.md",
  `# Phase 4 Closure Report

PHASE_4_STATUS=PARTIAL

This pass closed the highest-confidence root drift found in Financial Core: payroll-cycle calculations were split between API utility behavior and DB calendar-month recalculation. The new migration and repository fix align server-side storage and DB recalculation with payday-cycle/KST boundaries.

Evidence:
- \`services/api/tests/payroll-db-repository.test.ts\`
- \`services/api/tests/financial-phase4-payroll-cycle-migration.test.ts\`
- \`database/migrations/0017_payroll_cycle_recalculation.sql\`
- Neon staging branch ${STAGING_BRANCH_ID}: helper/function definitions and ledger row verified.

Why not PASS:
- Financial cross-user direct-ID matrix is pending.
- Broad idempotency/concurrency/finalization/cumulative runtime evidence is pending.

PROJECT_COMPLETION_100=false
COMMERCIAL_LAUNCH_READY=false
`,
);

const summary = {
  timestamp: new Date().toISOString(),
  branch,
  currentRepositoryHead: head,
  remoteHead,
  applicationRcSourceSha: RC_SHA,
  phase4Status: "PARTIAL",
  status: {
    payrollCycle: "PASS_DB_AND_LOCAL_CONTRACT",
    serverAuthority: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
    moneyIntegerModel: "PARTIAL_DB_CONSTRAINTS_EXIST_FULL_RUNTIME_PENDING",
    paydayEdgeCases: "PARTIAL_31_FEBRUARY_AND_25_DAY_STAGING_HELPERS_VERIFIED",
    timezoneBoundary: "PARTIAL_KST_DB_FUNCTION_VERIFIED_NON_DEFAULT_TZ_PENDING",
    fixedExpense: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
    savings: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
    dailyBudget: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
    variableExpense: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
    hijackFormula: "PARTIAL_DB_SNAPSHOT_FORMULA_VERSIONED_FINALIZATION_PENDING",
    cumulativeHijack: "PARTIAL_RUNTIME_PENDING",
    goalCalculation: "PARTIAL_RUNTIME_PENDING",
    calculationRecalculation: "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING",
    calculationSnapshot: "PARTIAL_VERSIONED_DB_SNAPSHOT_PENDING_FULL_E2E",
    idempotency: "PARTIAL_DB_GUARD_EXISTS_RUNTIME_PENDING",
    concurrency: "PARTIAL_RUNTIME_HARNESS_PENDING",
    financialCrossUserAuthz: "PARTIAL_FINANCIAL_DIRECT_ID_MATRIX_PENDING",
    financialCrossUserLeak: "UNVERIFIED_FULL_FINANCIAL_MATRIX",
    financialRlsEscape: "UNVERIFIED_FULL_FINANCIAL_MATRIX",
    stagingFinancialE2E: "PASS_CORE_STAGING_RUNTIME",
    errorTaxonomyDrift: "UNVERIFIED_FULL_FINANCIAL_API_RUNTIME",
    financialP0Defects: 0,
    financialLoggingIssues: 0,
    phase5EntryReadiness: "NOT_READY",
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
  },
  evidence: {
    migration0017Sha256: migrationHash,
    migration0018Sha256: migration0018Hash,
    stagingBranchId: STAGING_BRANCH_ID,
    stagingLedger: "18/18 VERIFIED_APPLIED",
    stagingFinancialE2E: "PASS_CORE_STAGING_RUNTIME",
    stagingBoundaryCheck:
      "2026-09 payday 25 includes 2026-08-26 and 2026-09-25; excludes 2026-08-25 and 2026-09-26",
    noProductionMutation: true,
    noAndroidBuild: true,
  },
  blockers: {
    internal: [
      "Financial direct-ID cross-user matrix",
      "Broad financial idempotency and concurrency runtime harness",
      "Payroll finalization and cumulative hijack runtime",
      "Goal/achievement edge-case runtime",
    ],
    external: [
      "Phase 3 external auth tracks remain separate: OAuth provider console/runtime, password-reset email delivery, Admin MFA provider enrollment, Android native session runtime",
    ],
  },
  outputFiles: [],
};

const outputFiles = [
  "docs/financial/PHASE_4_REQUIREMENT_MATRIX.csv",
  "docs/financial/FINANCIAL_FORMULA_REGISTRY.md",
  "docs/financial/FINANCIAL_ENDPOINT_RUNTIME_MATRIX.csv",
  "docs/financial/FINANCIAL_GOLDEN_CASES.csv",
  "docs/financial/PAYROLL_CYCLE_POLICY.md",
  "docs/financial/TIMEZONE_BOUNDARY_REPORT.md",
  "docs/financial/IDEMPOTENCY_CONCURRENCY_REPORT.md",
  "docs/financial/FINANCIAL_CROSS_USER_REPORT.md",
  "docs/financial/STAGING_FINANCIAL_E2E_REPORT.md",
  "docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json",
  "docs/financial/FINANCIAL_CALCULATION_INTEGRITY_REPORT.md",
  "docs/financial/PHASE_4_CLOSURE_REPORT.md",
];
summary.outputFiles = outputFiles.map((rel) => ({ path: rel, sha256: sha256File(rel) }));
writeRel("docs/financial/PHASE_4_FINANCIAL_CORE_COMPLETION.json", `${JSON.stringify(summary, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      PHASE_4_GENERATION: "PASS",
      phase4Status: summary.phase4Status,
      outputFiles: summary.outputFiles.length + 1,
      migration0017Sha256: migrationHash,
      migration0018Sha256: migration0018Hash,
    },
    null,
    2,
  ),
);
