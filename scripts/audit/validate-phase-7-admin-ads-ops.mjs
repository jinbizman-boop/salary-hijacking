import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "docs/admin-ops/PHASE_7_CURRENT_IMPLEMENTATION_INVENTORY.md",
  "docs/admin-ops/ADMIN_PERMISSION_RUNTIME_MATRIX.csv",
  "docs/admin-ops/ADS_PRIVACY_REPORT.md",
  "docs/admin-ops/ENVIRONMENT_ISOLATION_MATRIX.csv",
  "docs/admin-ops/OPS_INVENTORY.json",
  "docs/admin-ops/PHASE_7_ADMIN_REQUIREMENT_MATRIX.csv",
  "docs/admin-ops/PHASE_7_ADS_REQUIREMENT_MATRIX.csv",
  "docs/admin-ops/PHASE_7_OPS_REQUIREMENT_MATRIX.csv",
  "docs/admin-ops/PHASE_7_REQUIREMENT_MATRIX.csv",
  "docs/admin-ops/ADMIN_E2E_REPORT.md",
  "docs/admin-ops/OBSERVABILITY_REPORT.md",
  "docs/admin-ops/CLOUDFLARE_RUNTIME_AND_BUILDS_REPORT.md",
  "docs/admin-ops/PHASE_7_ADMIN_ADS_OPS_COMPLETION.json",
  "docs/admin-ops/PHASE_7_CLOSURE_REPORT.md",
];

function fail(message) {
  console.error(`PHASE_7_ADMIN_ADS_OPS_VALIDATION_FAIL: ${message}`);
  process.exit(1);
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) fail(`missing required file ${rel}`);
  return readFileSync(abs, "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
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
    rows: body.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    ),
  };
}

function assertNoSecretLike(rel, text) {
  const patterns = [
    /postgres(?:ql)?:\/\/[^,\s]+/i,
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    /sk-[A-Za-z0-9_-]{20,}/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
    /"accessToken"\s*:\s*"[^"]+"/i,
    /"refreshToken"\s*:\s*"[^"]+"/i,
    /"password"\s*:\s*"[^"]+"/i,
    /"token"\s*:\s*"[^"]+"/i,
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
}

for (const rel of requiredFiles) assertNoSecretLike(rel, read(rel));

const summary = JSON.parse(read("docs/admin-ops/PHASE_7_ADMIN_ADS_OPS_COMPLETION.json"));
if (!["PASS", "PARTIAL", "EXTERNAL_BLOCKER"].includes(summary.phase7Status))
  fail(`unexpected phase7Status ${summary.phase7Status}`);
if (summary.applicationRcSourceSha !== "80cc5cdfb0758478791b19196e2812e7fa6d671f")
  fail("APPLICATION_RC_SOURCE_SHA mismatch");
if (summary.status.projectCompletion100 !== false || summary.status.commercialLaunchReady !== false)
  fail("project completion/commercial launch flags must remain false");
if (
  summary.status.d013 !== "FAIL" ||
  summary.status.d016 !== "PARTIAL" ||
  summary.status.d017 !== "PASS" ||
  summary.status.d026 !== "FAIL"
) {
  fail("D status guard mismatch");
}

const requirement = parseCsv(read("docs/admin-ops/PHASE_7_REQUIREMENT_MATRIX.csv"));
if (requirement.rows.length !== 37) fail(`expected 37 Phase 7 requirement rows, got ${requirement.rows.length}`);
for (const prefix of ["ADMIN", "ADS", "OPS"]) {
  if (!requirement.rows.some((row) => row.requirementId.startsWith(`${prefix}-`)))
    fail(`missing ${prefix} requirement rows`);
}
if (new Set(requirement.rows.map((row) => row.requirementId)).size !== 37)
  fail("duplicate Phase 7 requirement ID");
for (const row of requirement.rows) {
  if (!["PASS", "PARTIAL", "FAIL", "EXTERNAL_BLOCKER", "UNVERIFIED"].includes(row.status))
    fail(`invalid requirement status ${row.requirementId}=${row.status}`);
  if (row.status !== "PASS" && !row.blocker) fail(`non-PASS row missing blocker ${row.requirementId}`);
}

const permissions = parseCsv(read("docs/admin-ops/ADMIN_PERMISSION_RUNTIME_MATRIX.csv"));
const requiredRoles = [
  "SUPER_ADMIN",
  "OPS_ADMIN",
  "MODERATOR",
  "CONTENT_ADMIN",
  "SUPPORT",
  "ADS_PARTNER_ADMIN",
  "AUDITOR_READONLY",
];
for (const role of requiredRoles) {
  const rows = permissions.rows.filter((row) => row.role === role);
  if (rows.length < 10) fail(`role ${role} has incomplete permission coverage`);
}
if (!permissions.rows.some((row) => row.role === "AUDITOR_READONLY" && row.permission === "ROLE_MUTATE" && row.expected.startsWith("DENY")))
  fail("auditor role mutation denial missing");
if (!permissions.rows.some((row) => row.role === "ADS_PARTNER_ADMIN" && row.permission === "ADS_MUTATE" && row.expected === "ALLOW"))
  fail("ads partner permission allowance missing");

const ads = read("docs/admin-ops/ADS_PRIVACY_REPORT.md");
if (!ads.includes("ADS_PRIVACY=PASS_LOCAL_ROUTE_GUARD")) fail("ads privacy route guard evidence missing");
const adminSource = read("services/api/src/routes/admin.routes.ts");
for (const routeNeedle of [
  'relativePath === "/ads/campaigns"',
  'assertAdPolicy(input)',
  "AD_FINANCIAL_TARGETING_FORBIDDEN",
]) {
  if (!adminSource.includes(routeNeedle)) fail(`admin route source missing ${routeNeedle}`);
}
const adminTest = read("services/api/tests/admin-rbac-audit-moderation-routes.test.ts");
if (!adminTest.includes("blocks financial ad targeting at the route boundary before repository dispatch"))
  fail("ads route boundary regression test missing");

const env = parseCsv(read("docs/admin-ops/ENVIRONMENT_ISOLATION_MATRIX.csv"));
if (env.rows.length < 4) fail("environment isolation matrix incomplete");
if (env.rows.some((row) => row.mutation !== "NO_PRODUCTION_DEPLOY" && !row.mutation.includes("NO_PRODUCTION")))
  fail("environment matrix does not preserve production no-mutation guard");

const ops = JSON.parse(read("docs/admin-ops/OPS_INVENTORY.json"));
if (ops.productionDeployPerformed !== false || ops.homepagePr3Touched !== false || ops.appsWebTouched !== false)
  fail("forbidden production/homepage/web mutation flag detected");
if (!Array.isArray(ops.remainingInternalBlockers) || ops.remainingInternalBlockers.length === 0)
  fail("Phase 7 must list remaining internal blockers unless fully closed");
if (!Array.isArray(ops.remainingExternalBlockers) || ops.remainingExternalBlockers.length === 0)
  fail("Phase 7 external blockers must be explicit");

if (summary.phase7Status === "PASS") {
  if (summary.remainingInternalBlockers.length !== 0) fail("PASS cannot have remaining internal blockers");
  if (requirement.rows.some((row) => row.status !== "PASS")) fail("PASS cannot include non-PASS requirement rows");
  if (summary.status.cloudflareWorkersBuilds !== "PASS") fail("PASS requires Cloudflare Workers Builds evidence");
}
if (summary.phase7Status === "PARTIAL" && summary.remainingInternalBlockers.length === 0)
  fail("PARTIAL requires remaining internal blockers");

const trace = parseCsv(read("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (const id of requirement.rows.map((row) => row.requirementId)) {
  const row = trace.rows.find((candidate) => candidate.REQ_ID === id);
  if (!row) fail(`trace missing ${id}`);
  if (!row.RUNTIME_EVIDENCE.includes("Phase 7 evidence")) fail(`trace ${id} missing Phase 7 evidence`);
  if (!row.CURRENT_REPOSITORY_HEAD) fail(`trace ${id} missing current HEAD`);
}

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(read(rel))}`).join("\n"));
console.log(`PHASE_7_ADMIN_ADS_OPS_VALIDATION_PASS ${digest}`);
