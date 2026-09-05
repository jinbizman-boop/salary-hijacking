import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((item) => item.length > 1 || item[0]);
  return body.map((item) => Object.fromEntries(header.map((key, index) => [key, item[index] ?? ""])));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredFiles = [
  "docs/architecture/API_CONTRACT_FINAL.md",
  "docs/architecture/SERVER_AUTHORITY_RULES_FINAL.md",
  "docs/architecture/ERROR_TAXONOMY.md",
  "docs/architecture/ERROR_TAXONOMY_REGISTRY.csv",
  "docs/architecture/IDEMPOTENCY_MATRIX.csv",
  "docs/architecture/AUTHORIZATION_MATRIX.csv",
  "docs/architecture/API_ENDPOINT_REGISTRY.csv",
  "docs/architecture/CONCURRENCY_CONTRACT.csv",
  "docs/architecture/EVENT_CONTRACT_REGISTRY.csv",
  "docs/architecture/CONTRACT_DRIFT_REGISTRY.csv",
  "docs/architecture/PHASE_1_SOURCE_REGISTRY.csv",
  "docs/architecture/CONTRACT_DRIFT_REPORT.md",
  "docs/architecture/PHASE_1_ARCHITECTURE_FREEZE.json",
];
for (const file of requiredFiles) assert(existsSync(path.join(ROOT, file)), `missing ${file}`);

const phase0 = JSON.parse(read("docs/audit/PHASE_0_BASELINE.json"));
const freeze = JSON.parse(read("docs/architecture/PHASE_1_ARCHITECTURE_FREEZE.json"));
assert(phase0.PHASE_0_STATUS === "PASS", "PHASE 0 precondition is not PASS");
assert(freeze.PHASE_1_STATUS === "PASS", "freeze status is not PASS");
assert(freeze.APPLICATION_RC_SOURCE_SHA === phase0.APPLICATION_RC_SOURCE_SHA, "RC source SHA mismatch");

const endpoints = parseCsv(read("docs/architecture/API_ENDPOINT_REGISTRY.csv"));
const endpointKeys = new Set(endpoints.map((row) => `${row.METHOD} ${row.PATH}`));
assert(endpointKeys.size === endpoints.length, "duplicate endpoint key");
assert(endpoints.length === freeze.exactEndpointCount, "endpoint count mismatch");
assert(endpoints.length >= 200, "endpoint inventory unexpectedly small");
assert(endpoints.every((row) => row.METHOD && row.PATH && row.DOMAIN && row.AUTH_REQUIRED && row.OWNERSHIP_RULE && row.STATUS), "endpoint registry missing required field");

const errors = parseCsv(read("docs/architecture/ERROR_TAXONOMY_REGISTRY.csv"));
const errorCodes = new Set(errors.map((row) => row.ERROR_CODE));
assert(errorCodes.size === errors.length, "duplicate error code");
assert(errors.length === freeze.errorCodeCount, "error count mismatch");
for (const namespace of ["AUTH", "AUTHZ", "VALIDATION", "FINANCE", "NOT_FOUND", "CONFLICT", "IDEMPOTENCY", "RATE_LIMIT", "UPLOAD", "COMMUNITY", "ADMIN", "DEPENDENCY", "INTERNAL"]) {
  assert(errors.some((row) => row.NAMESPACE === namespace || row.ERROR_CODE.startsWith(`${namespace}_`)), `missing error namespace ${namespace}`);
}
assert(errors.every((row) => row.ERROR_CODE && row.HTTP_STATUS && row.RETRYABLE && row.USER_FACING && row.LOG_SEVERITY && row.OWNING_DOMAIN), "error taxonomy missing required field");

const idem = parseCsv(read("docs/architecture/IDEMPOTENCY_MATRIX.csv"));
assert(idem.length === freeze.idempotencyRequiredOperationCount, "idempotency count mismatch");
assert(idem.length >= 13, "idempotency matrix incomplete");
assert(idem.every((row) => row.IDEMPOTENCY_REQUIRED === "YES" && row.KEY_SOURCE && row.KEY_SCOPE && row.STORAGE && row.CONCURRENCY_BEHAVIOR), "idempotency row incomplete");

const auth = parseCsv(read("docs/architecture/AUTHORIZATION_MATRIX.csv"));
for (const role of ["SUPER_ADMIN", "OPS_ADMIN", "MODERATOR", "CONTENT_ADMIN", "SUPPORT", "ADS_PARTNER_ADMIN", "AUDITOR_READONLY", "USER", "SYSTEM"]) {
  assert(auth.some((row) => row.ROLE === role), `missing role ${role}`);
}
assert(auth.length === freeze.authorizationMatrixRows, "authorization row count mismatch");

const concurrency = parseCsv(read("docs/architecture/CONCURRENCY_CONTRACT.csv"));
assert(concurrency.length === freeze.concurrencyContractRows, "concurrency row count mismatch");
assert(concurrency.length >= 10, "concurrency contract incomplete");

const events = parseCsv(read("docs/architecture/EVENT_CONTRACT_REGISTRY.csv"));
for (const event of ["PAYDAY_REMINDER", "FIXED_EXPENSE_REMINDER", "BUDGET_THRESHOLD", "SAVING_DUE", "SAVING_GOAL", "GROWTH_COMPLETION", "COMMUNITY_ACTIVITY", "MONTHLY_CLOSE", "PAY_CYCLE_CLOSE", "DATA_RETENTION"]) {
  assert(events.some((row) => row.EVENT === event), `missing event ${event}`);
}
assert(events.length === freeze.eventContractRows, "event row count mismatch");

const sources = parseCsv(read("docs/architecture/PHASE_1_SOURCE_REGISTRY.csv"));
assert(sources.length >= 8, "Phase 1 source registry incomplete");
assert(sources.some((row) => row.SOURCE_FAMILY === "FUNCTION_SPEC_V2" && row.STATUS === "SSOT_TOP"), "missing function spec source");
assert(sources.some((row) => row.SOURCE_FAMILY === "PROCESS_SPEC_V2" && row.STATUS === "SSOT_TOP"), "missing process spec source");
assert(sources.every((row) => row.CONTRACT_ARTIFACT && row.SOURCE_FAMILY && row.SOURCE_PATH && row.REQ_ID && row.STATUS), "source registry row incomplete");

const serverRules = read("docs/architecture/SERVER_AUTHORITY_RULES_FINAL.md");
for (let index = 1; index <= 10; index += 1) {
  assert(serverRules.includes(`FIN-${String(index).padStart(3, "0")}`), `missing FIN-${String(index).padStart(3, "0")}`);
}
assert(serverRules.includes("spendableRemaining = income - actualExpenses - reservedFixedExpenses - reservedSavings - mandatoryAllocations"), "missing spendable formula");
assert(serverRules.includes("dailyRecommendedBudget = max(0, spendableRemainingAfterToday / remainingBudgetDaysByPolicy)"), "missing daily budget formula");

assert(freeze.fin001To010Unresolved === 0, "FIN unresolved not zero");
assert(freeze.p0ApiContractUnresolved === 0, "P0 API unresolved not zero");
assert(freeze.p0AuthAuthzOwnershipUnresolved === 0, "P0 auth/authz unresolved not zero");
assert(freeze.p0FinanceServerAuthorityAmbiguity === 0, "P0 finance ambiguity not zero");
assert(freeze.apiDbP0Drift === 0, "API DB P0 drift not zero");
assert(freeze.apiMobileAdminP0BreakingDrift === 0, "API Mobile/Admin P0 drift not zero");
assert(freeze.clientAuthoritativeP0FinanceCalculation === 0, "client authoritative finance count not zero");
assert(freeze.secretExposure === 0, "secret exposure not zero");
assert(freeze.productionChanged === false, "production changed flag not false");
assert(freeze.androidBuildStarted === false, "android build started flag not false");

console.log(JSON.stringify({
  PHASE_1_VALIDATION: "PASS",
  endpoints: endpoints.length,
  errorCodes: errors.length,
  idempotencyRequired: idem.length,
  authorizationRows: auth.length,
  concurrencyRows: concurrency.length,
  eventRows: events.length,
}, null, 2));
