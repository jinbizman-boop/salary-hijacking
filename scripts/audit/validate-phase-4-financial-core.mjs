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
  return { headers, rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))) };
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
if (phase4.phase4Status !== "PARTIAL") fail("Phase 4 must remain PARTIAL until full financial staging E2E closes");
if (phase4.status.payrollCycle !== "PASS_DB_AND_LOCAL_CONTRACT") fail("payroll cycle DB/local contract evidence missing");
if (phase4.status.stagingFinancialE2E !== "PASS_CORE_STAGING_RUNTIME")
  fail("staging financial E2E core runtime evidence missing");
if (phase4.status.serverAuthority !== "PASS_CORE_STAGING_RUNTIME_BROAD_GATES_PENDING")
  fail("server authority core runtime evidence missing");
if (phase4.status.projectCompletion100 !== false) fail("PROJECT_COMPLETION_100 must remain false");
if (phase4.status.commercialLaunchReady !== false) fail("COMMERCIAL_LAUNCH_READY must remain false");
if (phase4.status.d013 !== "FAIL" || phase4.status.d016 !== "PARTIAL" || phase4.status.d017 !== "PASS" || phase4.status.d026 !== "FAIL")
  fail("D status guard mismatch");

const migration = readRel("database/migrations/0017_payroll_cycle_recalculation.sql");
for (const needle of [
  "payroll-v2-cycle-kst",
  "make_payday_date",
  "payroll_cycle_contains_date",
  "v_cycle_end_exclusive",
  "(ve.spent_at at time zone 'Asia/Seoul')::date",
]) {
  if (!migration.includes(needle)) fail(`migration 0017 missing ${needle}`);
}

const refundRepairMigration = readRel("database/migrations/0018_variable_expense_refund_column_repair.sql");
for (const needle of [
  "ADD COLUMN IF NOT EXISTS refund_amount bigint NOT NULL DEFAULT 0",
  "ADD COLUMN IF NOT EXISTS last_refund_idempotency_key text",
  "chk_variable_expenses_refund_amount",
]) {
  if (!refundRepairMigration.includes(needle)) fail(`migration 0018 missing ${needle}`);
}

const requirementMatrix = parseCsv(readRel("docs/financial/PHASE_4_REQUIREMENT_MATRIX.csv"));
if (requirementMatrix.rows.length < 58) fail(`Phase 4 requirement matrix too small: ${requirementMatrix.rows.length}`);
for (const ns of ["FIN", "PAY", "HOME", "BUD", "EXP", "SAV"]) {
  if (!requirementMatrix.rows.some((row) => row.namespace === ns)) fail(`Phase 4 requirement matrix missing ${ns}`);
}
if (requirementMatrix.rows.some((row) => row.status === "PASS"))
  fail("Phase 4 requirement matrix must not mark rows PASS without full staging runtime");

const endpointMatrix = parseCsv(readRel("docs/financial/FINANCIAL_ENDPOINT_RUNTIME_MATRIX.csv"));
for (const pathNeedle of [
  "/api/v1/payroll",
  "/api/v1/daily-budgets",
  "/api/v1/fixed-expenses",
  "/api/v1/variable-expenses",
  "/api/v1/savings",
  "/api/v1/payroll/home",
]) {
  if (!endpointMatrix.rows.some((row) => row.path === pathNeedle)) fail(`endpoint matrix missing ${pathNeedle}`);
}

const golden = parseCsv(readRel("docs/financial/FINANCIAL_GOLDEN_CASES.csv"));
if (golden.rows.length < 12) fail("golden cases must include at least 12 cases");
if (!golden.rows.some((row) => row.caseId === "CASE-008" && row.status === "PASS_DB_HELPER"))
  fail("payday 31 February DB helper case missing");

const trace = parseCsv(readRel("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (const id of ["FIN-005", "FIN-009", "FIN-010", "PAY-004", "BUD-010", "EXP-005", "SAV-001"]) {
  const row = trace.rows.find((candidate) => candidate.REQ_ID === id);
  if (!row) fail(`trace missing ${id}`);
  if (!row.RUNTIME_EVIDENCE.includes("payroll-v2-cycle-kst")) fail(`trace ${id} lacks Phase 4 evidence`);
  if (row.CURRENT_STATUS === "PASS") fail(`trace ${id} must not be PASS before full Phase 4 runtime`);
}

for (const [rel, phrase] of [
  ["docs/financial/FINANCIAL_FORMULA_REGISTRY.md", "payroll-v2-cycle-kst"],
  ["docs/financial/PAYROLL_CYCLE_POLICY.md", "2026-08-26 through 2026-09-25"],
  ["docs/financial/TIMEZONE_BOUNDARY_REPORT.md", "Asia/Seoul"],
  ["docs/financial/STAGING_FINANCIAL_E2E_REPORT.md", "PASS_CORE_STAGING_RUNTIME"],
  ["docs/financial/PHASE_4_CLOSURE_REPORT.md", "PHASE_4_STATUS=PARTIAL"],
]) {
  if (!readRel(rel).includes(phrase)) fail(`${rel} missing ${phrase}`);
}

const stagingEvidence = JSON.parse(readRel("docs/financial/STAGING_FINANCIAL_E2E_EVIDENCE.json"));
if (stagingEvidence.status !== "PASS_CORE_STAGING_RUNTIME")
  fail("staging financial E2E evidence status must be PASS_CORE_STAGING_RUNTIME");
if (stagingEvidence.secretValuesStored !== false || stagingEvidence.rawTokensStored !== false || stagingEvidence.rawFinancialValuesStored !== false)
  fail("staging financial E2E evidence must not store secrets, raw tokens, or raw financial values");
if (!Array.isArray(stagingEvidence.steps) || stagingEvidence.steps.length < 12)
  fail("staging financial E2E evidence missing required steps");
for (const step of ["payroll_create", "daily_budget_create", "fixed_expense_create", "savings_create", "variable_expense_create", "variable_expense_duplicate_idempotency", "payroll_home", "payroll_current"]) {
  if (!stagingEvidence.steps.some((candidate) => candidate.step === step && candidate.pass === true))
    fail(`staging financial E2E missing passing step ${step}`);
}

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(readRel(rel))}`).join("\n"));
console.log(`PHASE_4_FINANCIAL_VALIDATION_PASS ${digest}`);
