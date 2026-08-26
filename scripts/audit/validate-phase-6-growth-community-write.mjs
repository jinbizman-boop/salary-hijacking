import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "docs/growth-community/PHASE_6_CURRENT_IMPLEMENTATION_INVENTORY.md",
  "docs/growth-community/RESPONSIBLE_GAMIFICATION_AUDIT.md",
  "docs/growth-community/GROWTH_E2E_REPORT.md",
  "docs/growth-community/COMMUNITY_E2E_REPORT.md",
  "docs/growth-community/WRITE_E2E_REPORT.md",
  "docs/growth-community/UPLOAD_SECURITY_REPORT.md",
  "docs/growth-community/COMMUNITY_TNS_REPORT.md",
  "docs/growth-community/PHASE_6_REQUIREMENT_MATRIX.csv",
  "docs/growth-community/PHASE_6_NOTIFICATION_INTEGRATION_MATRIX.csv",
  "docs/growth-community/PHASE_6_CROSS_USER_RUNTIME_MATRIX.csv",
  "docs/growth-community/PHASE_6_PERFORMANCE_REPORT.md",
  "docs/growth-community/PHASE_6_GROWTH_COMMUNITY_WRITE_COMPLETION.json",
  "docs/growth-community/PHASE_6_CLOSURE_REPORT.md",
];

function fail(message) {
  console.error(`PHASE_6_GROWTH_COMMUNITY_WRITE_VALIDATION_FAIL: ${message}`);
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
    /"accessToken"\s*:\s*"[^"]+"/i,
    /"refreshToken"\s*:\s*"[^"]+"/i,
    /"resetToken"\s*:\s*"[^"]+"/i,
    /"pushToken"\s*:\s*"[^"]+"/i,
    /"password"\s*:\s*"[^"]+"/i,
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
}

for (const rel of requiredFiles) assertNoSecretLike(rel, readRel(rel));

const phase6 = JSON.parse(readRel("docs/growth-community/PHASE_6_GROWTH_COMMUNITY_WRITE_COMPLETION.json"));
if (!["PASS", "PARTIAL", "EXTERNAL_BLOCKER"].includes(phase6.phase6Status)) fail(`unexpected Phase 6 status ${phase6.phase6Status}`);
if (phase6.status.projectCompletion100 !== false) fail("PROJECT_COMPLETION_100 must remain false");
if (phase6.status.commercialLaunchReady !== false) fail("COMMERCIAL_LAUNCH_READY must remain false");
if (phase6.status.d013 !== "FAIL" || phase6.status.d016 !== "PARTIAL" || phase6.status.d017 !== "PASS" || phase6.status.d026 !== "FAIL")
  fail("D status guard mismatch");
if (phase6.phase6Status === "PASS") {
  for (const [key, expected] of [
    ["growthE2E", "PASS"],
    ["communityE2E", "PASS"],
    ["writeE2E", "PASS"],
    ["uploadSecurity", "PASS"],
    ["communityTns", "PASS"],
    ["growthXpConcurrency", "PASS"],
    ["perf007", "PASS"],
  ]) {
    if (phase6.status[key] !== expected) fail(`PASS status invalid because ${key} is ${phase6.status[key]}`);
  }
}
if (phase6.phase6Status !== "PASS" && (!Array.isArray(phase6.remainingInternalBlockers) || phase6.remainingInternalBlockers.length === 0))
  fail("non-PASS Phase 6 must list remaining internal blockers");
if (phase6.status.growthNotificationProducer !== "PASS_LOCAL_CONTRACT") fail("growth notification producer evidence missing");
if (phase6.status.communityNotificationProducer !== "PASS_LOCAL_CONTRACT") fail("community notification producer evidence missing");

const requirement = parseCsv(readRel("docs/growth-community/PHASE_6_REQUIREMENT_MATRIX.csv"));
if (requirement.rows.length !== 30) fail(`expected 30 Phase 6 requirement rows, got ${requirement.rows.length}`);
for (const prefix of ["LV", "COM", "WRITE"]) {
  if (!requirement.rows.some((row) => row.requirementId.startsWith(`${prefix}-`))) fail(`missing ${prefix} rows`);
}
for (const id of ["NOTI-008", "PERF-007"]) {
  if (!requirement.rows.some((row) => row.requirementId === id)) fail(`missing ${id}`);
}
if (requirement.rows.some((row) => !["PASS", "PARTIAL", "FAIL", "EXTERNAL_BLOCKER", "UNVERIFIED"].includes(row.statusClass)))
  fail("requirement matrix contains invalid statusClass");
if (phase6.phase6Status === "PARTIAL" && !requirement.rows.some((row) => row.statusClass === "PARTIAL" || row.statusClass === "UNVERIFIED"))
  fail("PARTIAL Phase 6 needs PARTIAL/UNVERIFIED requirement evidence");

const notification = parseCsv(readRel("docs/growth-community/PHASE_6_NOTIFICATION_INTEGRATION_MATRIX.csv"));
for (const event of ["GROWTH_COMPLETION", "COMMUNITY_ACTIVITY"]) {
  const row = notification.rows.find((candidate) => candidate.event === event);
  if (!row) fail(`missing notification integration row ${event}`);
  if (!row.testEvidence.includes("PASS")) fail(`${event} missing PASS local test evidence`);
}

const crossUser = parseCsv(readRel("docs/growth-community/PHASE_6_CROSS_USER_RUNTIME_MATRIX.csv"));
for (const resource of ["growth_profile", "community_post", "attachment"]) {
  if (!crossUser.rows.some((row) => row.resource === resource)) fail(`missing cross-user resource ${resource}`);
}
if (phase6.phase6Status === "PASS" && crossUser.rows.some((row) => row.status !== "PASS"))
  fail("Phase 6 PASS cannot include non-PASS cross-user rows");
if (phase6.phase6Status !== "PASS" && !crossUser.rows.some((row) => row.status === "UNVERIFIED"))
  fail("non-PASS Phase 6 should preserve unverified staging cross-user evidence");

const producer = readRel("services/api/src/notifications/phase6-growth-community-producers.ts");
for (const needle of ["GROWTH_REMINDER", "COMMUNITY", "SELF_NOTIFICATION", "idempotencyKey"]) {
  if (!producer.includes(needle)) fail(`producer missing ${needle}`);
}
const app = readRel("services/api/src/app.ts");
if (!app.includes("createPhase6GrowthCommunityNotificationProducer")) fail("app does not wire Phase 6 producer");
const communityRepo = readRel("services/api/src/repositories/community.repository.ts");
for (const needle of ["decodePostCursor", "encodeCursor", "notificationTargetFor"]) {
  if (!communityRepo.includes(needle)) fail(`community repository missing ${needle}`);
}

const trace = parseCsv(readRel("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (const id of ["LV-001", "COM-001", "WRITE-001", "NOTI-008"]) {
  const row = trace.rows.find((candidate) => candidate.REQ_ID === id);
  if (!row) fail(`trace missing ${id}`);
  if (!row.RUNTIME_EVIDENCE.includes("Phase 6 evidence")) fail(`trace ${id} missing Phase 6 evidence`);
}
const perf007 = trace.rows.find((row) => row.REQ_ID === "PERF-007");
if (!perf007) fail("trace missing PERF-007");
if (perf007.CURRENT_STATUS === "PASS") fail("PERF-007 cannot PASS without staging load evidence");

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(readRel(rel))}`).join("\n"));
console.log(`PHASE_6_GROWTH_COMMUNITY_WRITE_VALIDATION_PASS ${digest}`);
