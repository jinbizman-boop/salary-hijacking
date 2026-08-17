import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
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
  "docs/financial/STAGING_FINANCIAL_RUNTIME_CLOSURE_EVIDENCE.json",
  "docs/financial/FINANCIAL_DIRECT_ID_RUNTIME_MATRIX.csv",
  "docs/financial/FINANCIAL_IDEMPOTENCY_RUNTIME_MATRIX.csv",
  "docs/financial/FINANCIAL_ERROR_TAXONOMY_RUNTIME.csv",
  "docs/financial/PAYROLL_FINALIZATION_RUNTIME_REPORT.md",
  "docs/financial/CUMULATIVE_HIJACK_RUNTIME_REPORT.md",
  "docs/financial/GOAL_ACHIEVEMENT_RUNTIME_REPORT.md",
  "docs/financial/CALCULATION_SNAPSHOT_RUNTIME_REPORT.md",
  "docs/financial/FINANCIAL_CALCULATION_INTEGRITY_REPORT.md",
  "docs/financial/PHASE_4_FINANCIAL_CORE_COMPLETION.json",
  "docs/financial/PHASE_4_CLOSURE_REPORT.md",
];

function fail(message) {
  console.error(`PHASE_4_FINANCIAL_VALIDATION_FAIL: ${message}`);
  process.exit(1);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function readRel(rel) {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) fail(`missing required file ${rel}`);
  return readFileSync(abs, "utf8");
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
  return {
    headers,
    rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))),
  };
}

function assertNoSecretLike(rel, text) {
  const patterns = [
    /postgres(?:ql)?:\/\/[^,\s]+/i,
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    /sk-[A-Za-z0-9_-]{20,}/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
    /refreshToken"\s*:\s*"[^"]+"/i,
    /accessToken"\s*:\s*"[^"]+"/i,
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
}

for (const rel of requiredFiles) assertNoSecretLike(rel, readRel(rel));

const phase4 = JSON.parse(readRel("docs/financial/PHASE_4_FINANCIAL_CORE_COMPLETION.json"));
if (phase4.phase4Status !== "PASS") fail("Phase 4 status must be PASS after final runtime closure");
if (phase4.status.projectCompletion100 !== false) fail("PROJECT_COMPLETION_100 must remain false");
if (phase4.status.commercialLaunchReady !== false) fail("COMMERCIAL_LAUNCH_READY must remain false");
if (phase4.status.d013 !== "FAIL" || phase4.status.d016 !== "PARTIAL" || phase4.status.d017 !== "PASS" || phase4.status.d026 !== "FAIL")
  fail("D status guard mismatch");

for (const [key, expected] of [
  ["payrollCycle", "PASS"],
  ["serverAuthority", "PASS"],
  ["moneyIntegerModel", "PASS"],
  ["paydayEdgeCases", "PASS"],
  ["timezoneBoundary", "PASS"],
  ["fixedExpense", "PASS"],
  ["savings", "PASS"],
  ["dailyBudget", "PASS"],
  ["variableExpense", "PASS"],
  ["hijackFormula", "PASS"],
  ["calculationRecalculation", "PASS"],
  ["calculationSnapshot", "PASS"],
  ["idempotency", "PASS"],
  ["concurrency", "PASS"],
  ["payrollFinalization", "PASS"],
  ["cumulativeHijack", "PASS"],
  ["goalCalculation", "PASS"],
  ["financialCrossUserAuthz", "PASS"],
  ["stagingFinancialE2E", "PASS"],
  ["goldenCases", "PASS"],
]) {
  if (phase4.status[key] !== expected) fail(`phase4.status.${key} expected ${expected}`);
}

for (const [key, expected] of [
  ["idempotencyDuplicateRecords", 0],
  ["concurrencyLostUpdates", 0],
  ["finalizationDuplicateTransitions", 0],
  ["financialCrossUserLeak", 0],
  ["financialRlsEscape", 0],
  ["financialMassAssignmentEscape", 0],
  ["clientCalculationOverride", 0],
  ["errorTaxonomyDrift", 0],
  ["financialP0Defects", 0],
  ["financialLoggingIssues", 0],
]) {
  if (phase4.status[key] !== expected) fail(`phase4.status.${key} expected ${expected}`);
}

const migration0017 = readRel("database/migrations/0017_payroll_cycle_recalculation.sql");
for (const needle of [
  "payroll-v2-cycle-kst",
  "make_payday_date",
  "payroll_cycle_contains_date",
  "(ve.spent_at at time zone 'Asia/Seoul')::date",
]) {
  if (!migration0017.includes(needle)) fail(`migration 0017 missing ${needle}`);
}
if (!readRel("database/migrations/0019_payroll_close_idempotency.sql").includes("close_request_hash"))
  fail("migration 0019 close idempotency hash missing");
if (!readRel("database/migrations/0020_variable_expense_idempotency_hash.sql").includes("idempotency_request_hash"))
  fail("migration 0020 variable expense idempotency hash missing");

const requirementMatrix = parseCsv(readRel("docs/financial/PHASE_4_REQUIREMENT_MATRIX.csv"));
if (requirementMatrix.rows.length !== 58) fail(`Phase 4 requirement matrix expected 58 rows, got ${requirementMatrix.rows.length}`);
for (const ns of ["FIN", "PAY", "HOME", "BUD", "EXP", "SAV"]) {
  if (!requirementMatrix.rows.some((row) => row.namespace === ns)) fail(`Phase 4 requirement matrix missing ${ns}`);
}
if (requirementMatrix.rows.some((row) => row.status !== "PASS"))
  fail("all Phase 4 requirement matrix rows must be PASS after closure");

const directId = parseCsv(readRel("docs/financial/FINANCIAL_DIRECT_ID_RUNTIME_MATRIX.csv"));
if (directId.rows.length < 16) fail("financial direct-ID runtime matrix missing coverage");
if (directId.rows.some((row) => row.status !== "PASS")) fail("financial direct-ID matrix contains non-PASS row");

const idempotency = parseCsv(readRel("docs/financial/FINANCIAL_IDEMPOTENCY_RUNTIME_MATRIX.csv"));
for (const scenario of [
  "20_concurrent_same_key_same_body",
  "same_key_different_body",
  "same_key_replay",
]) {
  if (!idempotency.rows.some((row) => row.scenario === scenario && row.status === "PASS"))
    fail(`idempotency matrix missing PASS scenario ${scenario}`);
}

const errors = parseCsv(readRel("docs/financial/FINANCIAL_ERROR_TAXONOMY_RUNTIME.csv"));
if (errors.rows.length < 10) fail("financial error taxonomy runtime matrix too small");
if (errors.rows.some((row) => row.status !== "PASS")) fail("financial error taxonomy has drift");

const golden = parseCsv(readRel("docs/financial/FINANCIAL_GOLDEN_CASES.csv"));
if (golden.rows.length !== 12) fail("golden cases must include exactly 12 cases");
if (golden.rows.some((row) => row.status !== "PASS")) fail("all golden cases must PASS");

const trace = parseCsv(readRel("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (const id of ["FIN-005", "FIN-009", "FIN-010", "PAY-004", "BUD-010", "EXP-005", "SAV-001"]) {
  const row = trace.rows.find((candidate) => candidate.REQ_ID === id);
  if (!row) fail(`trace missing ${id}`);
  if (row.CURRENT_STATUS !== "PASS") fail(`trace ${id} must be PASS after Phase 4 closure`);
  if (!row.RUNTIME_EVIDENCE.includes("staging financial runtime closure PASS")) fail(`trace ${id} lacks closure evidence`);
}

const coreEvidence = JSON.parse(readRel("docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json"));
if (coreEvidence.status !== "PASS_CORE_STAGING_RUNTIME")
  fail("staging core financial E2E evidence must remain PASS_CORE_STAGING_RUNTIME");
if (coreEvidence.secretValuesStored !== false || coreEvidence.rawTokensStored !== false || coreEvidence.rawFinancialValuesStored !== false)
  fail("staging core financial E2E evidence must not store secrets/raw values");

const closureEvidence = JSON.parse(readRel("docs/financial/STAGING_FINANCIAL_RUNTIME_CLOSURE_EVIDENCE.json"));
if (closureEvidence.status !== "PASS") fail("runtime closure evidence must be PASS");
if (closureEvidence.secretValuesStored !== false || closureEvidence.rawTokensStored !== false || closureEvidence.rawFinancialValuesStored !== false)
  fail("runtime closure evidence must not store secrets/raw values");
for (const [key, expected] of [
  ["financialCrossUserLeak", 0],
  ["financialRlsEscape", 0],
  ["massAssignmentEscape", 0],
  ["clientCalculationOverride", 0],
  ["idempotencyDuplicateRecords", 0],
  ["concurrencyLostUpdates", 0],
  ["finalizationDuplicateTransitions", 0],
  ["errorTaxonomyDrift", 0],
]) {
  if (closureEvidence.assertions[key] !== expected)
    fail(`runtime closure assertion ${key} expected ${expected}`);
}

if (!readRel("docs/financial/PHASE_4_CLOSURE_REPORT.md").includes("PHASE_4_STATUS=PASS"))
  fail("closure report must record PHASE_4_STATUS=PASS");
if (!readRel("docs/financial/PHASE_4_CLOSURE_REPORT.md").includes("PHASE_5_ENTRY_READINESS=READY"))
  fail("closure report must record Phase 5 readiness");

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(readRel(rel))}`).join("\n"));
console.log(`PHASE_4_FINANCIAL_VALIDATION_PASS ${digest}`);
