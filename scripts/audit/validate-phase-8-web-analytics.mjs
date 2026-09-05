import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "apps/web/index.html",
  "apps/web/privacy.html",
  "apps/web/terms.html",
  "apps/web/support.html",
  "apps/web/partners.html",
  "apps/web/robots.txt",
  "apps/web/sitemap.xml",
  "apps/web/_headers",
  "apps/web/_redirects",
  "packages/api-contract/src/analytics/analytics.schema.ts",
  "packages/api-contract/src/analytics/analytics.schema.test.ts",
  "docs/web-analytics/ANALYTICS_SCHEMA.md",
  "docs/web-analytics/analytics-event.schema.json",
  "docs/web-analytics/PRIVACY_EVENT_AUDIT.csv",
  "docs/web-analytics/WEB_RUNTIME_REPORT.md",
  "docs/web-analytics/WEB_RUNTIME_EVIDENCE.json",
  "docs/web-analytics/PHASE_8_WEB_REQUIREMENT_MATRIX.csv",
  "docs/web-analytics/PHASE_8_ANALYTICS_REQUIREMENT_MATRIX.csv",
  "docs/web-analytics/PHASE_8_REQUIREMENT_MATRIX.csv",
  "docs/web-analytics/PHASE_8_WEB_ANALYTICS_COMPLETION.json",
  "docs/web-analytics/PHASE_8_CLOSURE_REPORT.md",
];

const webIds = ["WEB-001", "WEB-002", "WEB-003", "WEB-004", "WEB-005", "WEB-006", "WEB-007", "WEB-008"];
const analyticsIds = ["ANL-001", "ANL-002", "ANL-003", "ANL-004", "ANL-005", "ANL-006", "ANL-007", "ANL-008", "ANL-009", "ANL-010"];
const phase8Ids = [...webIds, ...analyticsIds];

function fail(message) {
  console.error(`PHASE_8_WEB_ANALYTICS_VALIDATION_FAIL: ${message}`);
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
  return { headers, rows: body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) };
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
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
}

for (const rel of requiredFiles) assertNoSecretLike(rel, read(rel));

const webMatrix = parseCsv(read("docs/web-analytics/PHASE_8_WEB_REQUIREMENT_MATRIX.csv"));
const analyticsMatrix = parseCsv(read("docs/web-analytics/PHASE_8_ANALYTICS_REQUIREMENT_MATRIX.csv"));
const primaryMatrix = parseCsv(read("docs/web-analytics/PHASE_8_REQUIREMENT_MATRIX.csv"));

if (webMatrix.rows.length !== 8) fail(`expected 8 WEB rows, got ${webMatrix.rows.length}`);
if (analyticsMatrix.rows.length !== 10) fail(`expected 10 ANL rows, got ${analyticsMatrix.rows.length}`);
if (primaryMatrix.rows.length !== 18) fail(`expected 18 primary rows, got ${primaryMatrix.rows.length}`);
if (new Set(primaryMatrix.rows.map((row) => row.requirementId)).size !== 18) fail("duplicate Phase 8 requirement IDs");
for (const id of webIds) {
  const row = webMatrix.rows.find((candidate) => candidate.requirementId === id);
  if (!row) fail(`missing web matrix row ${id}`);
  if (row.status !== "PASS") fail(`${id} is not PASS`);
  if (!row.runtimeEvidence || !row.testEvidence) fail(`${id} missing evidence columns`);
}
for (const id of analyticsIds) {
  const row = analyticsMatrix.rows.find((candidate) => candidate.requirementId === id);
  if (!row) fail(`missing analytics matrix row ${id}`);
  if (row.status !== "PASS") fail(`${id} is not PASS`);
  if (!row.runtimeEvidence || !row.testEvidence) fail(`${id} missing evidence columns`);
}

const runtime = JSON.parse(read("docs/web-analytics/WEB_RUNTIME_EVIDENCE.json"));
const staticEvidence = runtime.staticEvidence;
const runtimeEvidence = runtime.runtimeEvidence;
for (const key of [
  "langKo",
  "hasMainLandmark",
  "hasHeading",
  "formLabels",
  "imageAltComplete",
  "focusVisible",
  "reducedMotion",
  "responsiveMedia",
  "phoneRatioPreserved",
  "noThirdPartyTracking",
  "noLocalAbsolutePaths",
  "companySsot",
  "contactSsot",
  "securityHeaders",
  "redirects",
]) {
  if (staticEvidence[key] !== true) fail(`runtime static evidence ${key} is not true`);
}
if (staticEvidence.missingRefs.length !== 0) fail("web runtime evidence has missing local references");
if (!runtimeEvidence.pageResults.every((page) => page.httpStatus === 200 && page.canonicalPresent && page.descriptionPresent && page.ogPresent && page.langKo))
  fail("not all web pages have runtime HTTP/SEO evidence");
if (!runtimeEvidence.assetResults.every((asset) => asset.httpStatus === 200)) fail("not all web assets returned HTTP 200");

const privacyAudit = parseCsv(read("docs/web-analytics/PRIVACY_EVENT_AUDIT.csv"));
if (privacyAudit.rows.length < 8) fail("privacy event audit is incomplete");
for (const row of privacyAudit.rows) {
  if (!["YES", "NO"].includes(row.ALLOWED)) fail(`invalid privacy audit ALLOWED ${row.ALLOWED}`);
  if (["raw_financial", "pii", "token_or_secret", "free_text"].includes(row.CLASSIFICATION) && row.ALLOWED !== "NO")
    fail(`prohibited analytics field allowed: ${row.EVENT}.${row.PARAMETER}`);
}

const schema = JSON.parse(read("docs/web-analytics/analytics-event.schema.json"));
if (!Array.isArray(schema.properties?.eventName?.enum) || schema.properties.eventName.enum.length < 15)
  fail("analytics JSON schema event taxonomy incomplete");

const analyticsSource = read("packages/api-contract/src/analytics/analytics.schema.ts");
for (const needle of [
  "AnalyticsEventSchema",
  "validateAnalyticsEventBatch",
  "prohibitedParameterNames",
  "tokenLikePattern",
  "emailLikePattern",
]) {
  if (!analyticsSource.includes(needle)) fail(`analytics source missing ${needle}`);
}

const completion = JSON.parse(read("docs/web-analytics/PHASE_8_WEB_ANALYTICS_COMPLETION.json"));
if (completion.phase8Status !== "EXTERNAL_BLOCKER") fail("Phase 8 status must reflect external legal/routing/build blockers");
if (completion.phase8InternalStatus !== "PASS") fail("Phase 8 internal status must be PASS");
if (completion.phase8ExternalStatus !== "BLOCKED") fail("Phase 8 external status must be BLOCKED");
if (completion.applicationRcSourceSha !== "80cc5cdfb0758478791b19196e2812e7fa6d671f") fail("APPLICATION_RC_SOURCE_SHA mismatch");
if (completion.status.productionTrafficChanged !== "NO" || completion.status.productionDeployPerformed !== "NO")
  fail("production traffic/deploy guard changed");
if (completion.status.projectCompletion100 !== false || completion.status.commercialLaunchReady !== false)
  fail("project completion/commercial launch must remain false");
if (completion.status.d013 !== "FAIL" || completion.status.d016 !== "PARTIAL" || completion.status.d017 !== "PASS" || completion.status.d026 !== "FAIL")
  fail("D status guard mismatch");
if (completion.phase7StatusNormalization.opsPartialReqId !== "OPS-012") fail("Phase 7 OPS partial ID mismatch");
if (completion.phase7StatusNormalization.opsExternalReqId !== "OPS-010") fail("Phase 7 OPS external ID mismatch");

const trace = parseCsv(read("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (const id of phase8Ids) {
  const row = trace.rows.find((candidate) => candidate.REQ_ID === id);
  if (!row) fail(`trace missing ${id}`);
  if (row.CURRENT_STATUS !== "PASS") fail(`trace ${id} is not PASS`);
  if (!row.RUNTIME_EVIDENCE.includes("Phase 8 Web/Analytics evidence")) fail(`trace ${id} missing Phase 8 evidence`);
  if (row.APPLICATION_RC_SOURCE_SHA !== "80cc5cdfb0758478791b19196e2812e7fa6d671f") fail(`trace ${id} RC SHA mismatch`);
}

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(read(rel))}`).join("\n"));
console.log(`PHASE_8_WEB_ANALYTICS_VALIDATION_PASS ${digest}`);
