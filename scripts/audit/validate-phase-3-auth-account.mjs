import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "docs/auth/AUTH_ENDPOINT_RUNTIME_MATRIX.csv",
  "docs/auth/STAGING_REGISTER_ROOT_CAUSE_REPORT.md",
  "docs/auth/STAGING_REGISTER_TRANSACTION_REPORT.md",
  "docs/auth/STAGING_REGISTER_REPEAT_EVIDENCE.json",
  "docs/auth/STAGING_ACCOUNT_LIFECYCLE_FINAL_REPORT.md",
  "docs/auth/STAGING_AUTH_LIFECYCLE_E2E_REPORT.md",
  "docs/auth/STAGING_AUTH_LIFECYCLE_E2E_EVIDENCE.json",
  "docs/auth/AUTH_STAGING_ERROR_CONTRACT_REPORT.md",
  "docs/auth/AUTH_SESSION_SECURITY_REPORT.md",
  "docs/auth/AUTH_PASSWORD_RESET_REPORT.md",
  "docs/auth/AUTH_RATE_LIMIT_REPORT.md",
  "docs/auth/OAUTH_PROVIDER_MATRIX.csv",
  "docs/auth/ONBOARDING_GATE_REPORT.md",
  "docs/auth/PRIVACY_EXPORT_E2E_REPORT.md",
  "docs/auth/WITHDRAWAL_E2E_REPORT.md",
  "docs/auth/SUPPORT_E2E_REPORT.md",
  "docs/auth/CONSENT_VERSIONING_REPORT.md",
  "docs/auth/ADMIN_AUTH_RBAC_MFA_REPORT.md",
  "docs/auth/ADMIN_ROLE_RECONCILIATION.csv",
  "docs/auth/ADMIN_RBAC_RUNTIME_MATRIX.csv",
  "docs/auth/ADMIN_MFA_INTERNAL_REPORT.md",
  "docs/auth/AUTH_CROSS_USER_ISOLATION_REPORT.md",
  "docs/auth/APPLE_OAUTH_NONCE_SECURITY_REPORT.md",
  "docs/auth/PHASE_3_CLOSURE_REPORT.md",
  "docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json",
];

function fail(message) {
  console.error(`PHASE_3_AUTH_VALIDATION_FAIL: ${message}`);
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
    /resetTokenForDelivery"\s*:\s*"[^"]+"/i,
    /emailVerificationTokenForDelivery"\s*:\s*"[^"]+"/i,
    /password\s*[:=]\s*["'][^"']{6,}["']/i,
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
  }
}

for (const rel of requiredFiles) {
  assertNoSecretLike(rel, readRel(rel));
}

const endpointMatrix = parseCsv(readRel("docs/auth/AUTH_ENDPOINT_RUNTIME_MATRIX.csv"));
if (endpointMatrix.rows.length < 30)
  fail(`auth endpoint matrix expected at least 30 rows, got ${endpointMatrix.rows.length}`);
for (const field of [
  "METHOD",
  "PATH",
  "DOMAIN",
  "AUTH_REQUIRED",
  "ROLE_PERMISSION",
  "CURRENT_IMPLEMENTATION_PATH",
  "PHASE_3_STATUS",
]) {
  if (endpointMatrix.rows.some((r) => !r[field])) fail(`endpoint matrix missing ${field}`);
}
for (const pathNeedle of [
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/auth/password-reset",
  "/api/v1/auth/password-reset/confirm",
  "/admin/auth/login",
  "/admin/auth/mfa/verify",
]) {
  if (!endpointMatrix.rows.some((r) => r.PATH === pathNeedle))
    fail(`endpoint matrix missing ${pathNeedle}`);
}

const oauth = parseCsv(readRel("docs/auth/OAUTH_PROVIDER_MATRIX.csv"));
const providers = new Set(oauth.rows.map((r) => r.PROVIDER));
for (const provider of ["GOOGLE", "APPLE", "NAVER", "KAKAO"]) {
  if (!providers.has(provider)) fail(`OAuth matrix missing ${provider}`);
}

const phase3 = JSON.parse(readRel("docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json"));
if (phase3.phaseStatus !== "PARTIAL") fail("Phase 3 status must remain PARTIAL until full cross-user/admin runtime closes");
if (phase3.phase4EntryReadiness !== "READY_WITH_SEPARATE_EXTERNAL_AUTH_TRACKS")
  fail("Phase 4 readiness must be READY_WITH_SEPARATE_EXTERNAL_AUTH_TRACKS after core auth runtime passes");
if (phase3.statuses.authP0Drift !== 0) fail("auth P0 drift must be 0 after register root-cause closure");
if (phase3.statuses.stagingRegister !== "PASS") fail("staging register status must be PASS");
if (phase3.statuses.registerRepeatTest !== "PASS_10_OF_10_INTERNAL_ERROR_0")
  fail("register repeat PASS evidence missing");
if (phase3.statuses.stagingAuthLifecycleE2E !== "PASS_CORE_STAGING_RUNTIME")
  fail("staging auth lifecycle core PASS evidence missing");
if (phase3.statuses.sessionReuseTest !== "PASS_STAGING_RUNTIME") fail("session reuse staging status missing");
if (!String(phase3.statuses.passwordResetReplay).startsWith("PARTIAL_EXTERNAL_EMAIL_DELIVERY_RUNTIME"))
  fail("password reset external delivery blocker classification missing");
if (phase3.statuses.rateLimitStatus !== "PASS_LOCAL_AND_STAGING_REPRESENTATIVE")
  fail("rate limit local/staging representative status missing");
if (phase3.statuses.consentVersioning !== "PASS_CORE_STAGING_RUNTIME")
  fail("consent runtime status missing");
if (phase3.statuses.privacyExport !== "PASS_CORE_STAGING_RUNTIME")
  fail("privacy export runtime status missing");
if (phase3.statuses.withdrawal !== "PASS_CORE_STAGING_RUNTIME")
  fail("withdrawal runtime status missing");
if (phase3.statuses.support !== "PASS_CORE_STAGING_RUNTIME")
  fail("support runtime status missing");
if (phase3.statuses.oauthApple !== "CODE_COMPLETE_EXTERNAL_CONFIG" || phase3.statuses.appleNonceInternal !== "PASS")
  fail("Apple OAuth nonce internal closure missing");
if (phase3.statuses.legacyRehashStrategy !== "PASS_LOCAL_AND_DB_CONTRACT")
  fail("legacy password rehash strategy status missing");
if (phase3.statuses.rbacP0Drift !== 0) fail("RBAC P0 drift must be 0 for tested paths");
if (phase3.statuses.piiTokenLoggingIssues !== 0) fail("PII/token logging issue count must be 0 for generated artifacts");
if (phase3.statuses.projectCompletion100 !== false) fail("PROJECT_COMPLETION_100 must remain false");
if (phase3.statuses.commercialLaunchReady !== false) fail("COMMERCIAL_LAUNCH_READY must remain false");
if (phase3.statuses.d013 !== "FAIL" || phase3.statuses.d016 !== "PARTIAL" || phase3.statuses.d017 !== "PASS" || phase3.statuses.d026 !== "FAIL")
  fail("D status guard mismatch");
if (!Array.isArray(phase3.outputFiles) || phase3.outputFiles.length < requiredFiles.length)
  fail("phase3 output file hash list missing");

const sessionReport = readRel("docs/auth/AUTH_SESSION_SECURITY_REPORT.md");
if (!sessionReport.includes("PASS_STAGING_RUNTIME") || !sessionReport.includes("legacy"))
  fail("session report lacks refresh evidence or partial status");
const resetReport = readRel("docs/auth/AUTH_PASSWORD_RESET_REPORT.md");
if (!resetReport.includes("one-time replay block") || !resetReport.includes("PARTIAL_EXTERNAL_EMAIL_DELIVERY_RUNTIME"))
  fail("password reset report lacks replay evidence or partial status");
const stagingReport = readRel("docs/auth/STAGING_AUTH_LIFECYCLE_E2E_REPORT.md");
if (!stagingReport.includes("PASS") || !stagingReport.includes("core=PASS"))
  fail("staging lifecycle report must record core PASS");
const stagingEvidence = JSON.parse(readRel("docs/auth/STAGING_AUTH_LIFECYCLE_E2E_EVIDENCE.json"));
if (stagingEvidence.rawTokensStored !== false || stagingEvidence.secretValuesStored !== false)
  fail("staging lifecycle evidence must not store raw tokens or secrets");
if (stagingEvidence.assertions?.coreRegisterLoginRefreshLogout !== true)
  fail("staging lifecycle core assertion missing");
if (stagingEvidence.assertions?.consentRuntime !== true)
  fail("staging lifecycle consent assertion missing");
const registerRepeat = JSON.parse(readRel("docs/auth/STAGING_REGISTER_REPEAT_EVIDENCE.json"));
if (registerRepeat.successCount !== 10 || registerRepeat.internalErrorCount !== 0)
  fail("register repeat evidence must be 10/10 with zero internal errors");
const rateLimitReport = readRel("docs/auth/AUTH_RATE_LIMIT_REPORT.md");
if (!rateLimitReport.includes("PASS") || !rateLimitReport.includes("RATE_LIMIT_EXCEEDED"))
  fail("rate limit report lacks Phase 3 contract evidence");
const appleReport = readRel("docs/auth/APPLE_OAUTH_NONCE_SECURITY_REPORT.md");
if (!appleReport.includes("PASS_INTERNAL_CODE_AND_STAGING_START") || !appleReport.includes("nonce hash"))
  fail("Apple OAuth nonce report lacks closure evidence");
const adminReport = readRel("docs/auth/ADMIN_AUTH_RBAC_MFA_REPORT.md");
if (!adminReport.includes("role model") || !adminReport.includes("MFA"))
  fail("admin report must document role/MFA drift");
const roleMatrix = parseCsv(readRel("docs/auth/ADMIN_ROLE_RECONCILIATION.csv"));
if (roleMatrix.rows.length < 7) fail("admin role reconciliation missing canonical roles");
for (const role of [
  "SUPER_ADMIN",
  "OPS_ADMIN",
  "MODERATOR",
  "CONTENT_ADMIN",
  "SUPPORT",
  "ADS_PARTNER_ADMIN",
  "AUDITOR_READONLY",
]) {
  if (!roleMatrix.rows.some((r) => r.CANONICAL_ROLE === role))
    fail(`admin role reconciliation missing ${role}`);
}

const trace = parseCsv(readRel("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (const id of [
  "AUTH-001",
  "AUTH-002",
  "AUTH-003",
  "AUTH-004",
  "AUTH-005",
  "AUTH-006",
  "AUTH-007",
  "AUTH-008",
  "AUTH-009",
  "AUTH-010",
  "AUTH-011",
  "AUTH-012",
  "SEC-003",
  "SEC-004",
  "SEC-005",
  "SEC-008",
  "SEC-009",
  "SEC-011",
  "SEC-014",
  "ADMIN-012",
  "ADMIN-013",
  "ADMIN-014",
  "ADMIN-015",
]) {
  const row = trace.rows.find((r) => r.REQ_ID === id);
  if (!row) fail(`trace matrix missing ${id}`);
  if (!["PASS", "PARTIAL"].includes(row.CURRENT_STATUS)) fail(`trace matrix ${id} must be PASS or PARTIAL`);
  if (
    !row.RUNTIME_EVIDENCE ||
    row.RUNTIME_EVIDENCE.includes("Phase 0 does not execute runtime")
  )
    fail(`trace matrix ${id} lacks Phase 3 evidence text`);
}

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(readRel(rel))}`).join("\n"));
console.log(`PHASE_3_AUTH_VALIDATION_PASS ${digest}`);
