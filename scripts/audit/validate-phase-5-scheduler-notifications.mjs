import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "docs/notifications/PHASE_5_REQUIREMENT_MATRIX.csv",
  "docs/notifications/PHASE_5_CURRENT_RUNTIME_INVENTORY.md",
  "docs/notifications/NOTIFICATION_EVENT_MATRIX.csv",
  "docs/notifications/NOTIFICATION_EVENT_CONTRACT.md",
  "docs/notifications/CRON_SCHEDULE_INVENTORY.csv",
  "docs/notifications/CRON_QUEUE_RUNTIME_REPORT.md",
  "docs/notifications/QUEUE_RUNTIME_MATRIX.csv",
  "docs/notifications/QUEUE_RETRY_EVIDENCE.json",
  "docs/notifications/NOTIFICATION_CROSS_USER_REPORT.md",
  "docs/notifications/PUSH_DEEPLINK_MATRIX.csv",
  "docs/notifications/PUSH_DEEPLINK_REPORT.md",
  "docs/notifications/PUSH_PRIVACY_AUDIT.csv",
  "docs/notifications/QUIET_HOURS_TIMEZONE_REPORT.md",
  "docs/notifications/DEVICE_TOKEN_LIFECYCLE_REPORT.md",
  "docs/notifications/NOTIFICATION_LOAD_REPORT.md",
  "docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json",
  "docs/notifications/NOTIFICATION_DIRECT_ID_RUNTIME_MATRIX.csv",
  "docs/notifications/PHASE_5_SCHEDULER_NOTIFICATIONS_COMPLETION.json",
  "docs/notifications/PHASE_5_CLOSURE_REPORT.md",
];

function fail(message) {
  console.error(`PHASE_5_NOTIFICATION_VALIDATION_FAIL: ${message}`);
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
  const rows = [];
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
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
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
    /"pushToken"\s*:\s*"[^"]+"/i,
    /"password"\s*:\s*"[^"]+"/i,
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
}

for (const rel of requiredFiles) assertNoSecretLike(rel, readRel(rel));

const phase5 = JSON.parse(readRel("docs/notifications/PHASE_5_SCHEDULER_NOTIFICATIONS_COMPLETION.json"));
if (phase5.phase5Status === "PASS") {
  for (const [key, expected] of [
    ["notificationList", "PASS"],
    ["paydayReminder", "PASS"],
    ["fixedExpenseReminder", "PASS"],
    ["budgetThreshold", "PASS"],
    ["savingGoalNotification", "PASS"],
    ["cronNaturalExecution", "PASS"],
    ["fcmExternalRuntime", "PASS"],
    ["perf017", "PASS"],
    ["perf018", "PASS"],
  ]) {
    if (phase5.status[key] !== expected) fail(`PASS status is invalid because ${key} is ${phase5.status[key]}`);
  }
}
if (phase5.phase5Status !== "PARTIAL") fail("Phase 5 must remain PARTIAL while cursor/natural-cron/provider/load evidence is missing");
if (phase5.status.projectCompletion100 !== false) fail("PROJECT_COMPLETION_100 must remain false");
if (phase5.status.commercialLaunchReady !== false) fail("COMMERCIAL_LAUNCH_READY must remain false");
if (phase5.status.d016 !== "PARTIAL") fail("D-016 must remain PARTIAL for broader Cloudflare ops");
if (phase5.status.d017 !== "PASS") fail("D-017 must remain PASS unless DB regression exists");
if (phase5.status.notificationDuplicateRecords !== 0) fail("notification duplicate records must be 0 for tested staging path");
if (phase5.status.notificationDuplicateDeliveries !== 0) fail("notification duplicate deliveries must be 0 for tested internal path");
if (phase5.status.rawFinancialPushExposure !== 0) fail("raw financial push exposure must be 0");
if (phase5.status.rawPiiPushExposure !== 0) fail("raw PII push exposure must be 0");
if (phase5.status.notificationCrossUserLeak !== 0) fail("notification cross-user leak must be 0");
if (phase5.status.notificationList === "PASS") fail("notification list cannot be PASS until cursor pagination drift closes");
if (phase5.status.cronNaturalExecution === "PASS") fail("cron natural execution cannot be PASS without observed natural cron evidence");
if (phase5.status.fcmExternalRuntime === "PASS") fail("FCM external runtime cannot be PASS without real valid device token evidence");
if (phase5.status.perf017 === "PASS" || phase5.status.perf018 === "PASS") fail("100K/1M load targets cannot be PASS without acceptance runs");

const requirement = parseCsv(readRel("docs/notifications/PHASE_5_REQUIREMENT_MATRIX.csv"));
if (requirement.rows.length !== 10) fail(`expected 10 NOTI requirement rows, got ${requirement.rows.length}`);
for (let i = 1; i <= 10; i += 1) {
  const id = `NOTI-${String(i).padStart(3, "0")}`;
  if (!requirement.rows.some((row) => row.requirementId === id)) fail(`missing ${id}`);
}
if (!requirement.rows.some((row) => row.requirementId === "NOTI-001" && row.status.includes("CURSOR")))
  fail("NOTI-001 cursor pagination drift must be explicit");

const runtime = JSON.parse(readRel("docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json"));
if (runtime.PHASE_5_STAGING_NOTIFICATION_RUNTIME !== "PASS_CORE_RUNTIME") fail("staging notification runtime must be PASS_CORE_RUNTIME");
if (runtime.rawTokensStored !== false || runtime.rawPushTokensStored !== false || runtime.rawFinancialValuesStored !== false)
  fail("staging evidence must not store raw tokens/push tokens/financial values");
if (!runtime.assertions?.idempotentReplaySameResult || !runtime.assertions?.idempotencyConflict || !runtime.assertions?.crossUserDirectIdDenied)
  fail("staging runtime missing idempotency or cross-user assertions");

const direct = parseCsv(readRel("docs/notifications/NOTIFICATION_DIRECT_ID_RUNTIME_MATRIX.csv"));
if (direct.rows.length < 5) fail("direct-ID matrix must include notification and device rows");
if (direct.rows.some((row) => row.status !== "PASS")) fail("direct-ID matrix contains non-PASS row");

const eventMatrix = parseCsv(readRel("docs/notifications/NOTIFICATION_EVENT_MATRIX.csv"));
for (const eventType of ["PAYDAY_REMINDER", "FIXED_EXPENSE_REMINDER", "BUDGET_THRESHOLD", "SAVING_DUE", "SAVING_GOAL", "GROWTH_COMPLETION", "COMMUNITY_ACTIVITY", "NOTICE_PUBLISHED"]) {
  if (!eventMatrix.rows.some((row) => row.eventType === eventType)) fail(`missing event contract ${eventType}`);
}

const queueEvidence = JSON.parse(readRel("docs/notifications/QUEUE_RETRY_EVIDENCE.json"));
if (queueEvidence.status !== "PASS_INTERNAL") fail("queue retry evidence must be PASS_INTERNAL");
if (queueEvidence.rawSecretsStored !== false) fail("queue retry evidence must not store raw secrets");

const migrations = readdirSync(path.join(ROOT, "database", "migrations")).filter((file) => file.endsWith(".sql"));
if (!migrations.includes("0022_notification_runtime_contract.sql")) fail("missing 0022 notification migration");
if (!migrations.includes("0023_notification_timezone_archive_constraints.sql")) fail("missing 0023 notification constraint migration");

const trace = parseCsv(readRel("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
for (let i = 1; i <= 10; i += 1) {
  const id = `NOTI-${String(i).padStart(3, "0")}`;
  const row = trace.rows.find((candidate) => candidate.REQ_ID === id);
  if (!row) fail(`trace missing ${id}`);
  if (!row.RUNTIME_EVIDENCE.includes("Phase 5")) fail(`trace ${id} missing Phase 5 evidence`);
  if (id === "NOTI-001" && row.CURRENT_STATUS === "PASS") fail("trace NOTI-001 cannot PASS with cursor drift");
}

const gate = parseCsv(readRel("docs/audit/PHASE_0_GATE_REGISTRY.csv"));
const d016 = gate.rows.find((row) => row.GATE_ID === "D-016");
if (!d016) fail("D-016 missing from gate registry");
if (d016.CURRENT_STATUS !== "PARTIAL") fail("D-016 must remain PARTIAL");
if (!d016.COMPLETED_SUBGATES.includes("Phase 5")) fail("D-016 completed subgates missing Phase 5 update");

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(readRel(rel))}`).join("\n"));
console.log(`PHASE_5_NOTIFICATION_VALIDATION_PASS ${digest}`);
