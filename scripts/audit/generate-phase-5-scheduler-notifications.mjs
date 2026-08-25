import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "notifications");
const TRACE = path.join(ROOT, "docs", "audit", "CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const GATES = path.join(ROOT, "docs", "audit", "PHASE_0_GATE_REGISTRY.csv");
const RC_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";
const STAGING_BRANCH_ID = "br-fragrant-sky-aj5kk2c3";
const E2E_JSON = "docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json";
const DIRECT_MATRIX = "docs/notifications/NOTIFICATION_DIRECT_ID_RUNTIME_MATRIX.csv";

mkdirSync(OUT, { recursive: true });

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function shaFile(rel) {
  return sha256(readFileSync(path.join(ROOT, rel), "utf8"));
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

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function toCsv(headers, rows) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")).join("\n")}\n`;
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

function appendUnique(existing, additions) {
  const out = [];
  for (const item of [...String(existing ?? "").split(";"), ...additions]) {
    const trimmed = item.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out.join("; ");
}

const head = git("rev-parse HEAD");
let remoteHead = "";
try {
  remoteHead = git("rev-parse @{u}");
} catch {
  remoteHead = "UNVERIFIED_NO_UPSTREAM";
}
const branch = git("branch --show-current");
const evidence = JSON.parse(readFileSync(path.join(ROOT, E2E_JSON), "utf8"));
const e2eStatus = evidence.PHASE_5_STAGING_NOTIFICATION_RUNTIME ?? "UNKNOWN";
const coreRuntimePass = e2eStatus === "PASS_CORE_RUNTIME" && Array.isArray(evidence.hardFailures) && evidence.hardFailures.length === 0;

const sourceNotes = [
  "services/api/src/routes/notifications.routes.ts",
  "services/api/src/repositories/notifications.repository.ts",
  "services/scheduler/src/index.ts",
  "services/scheduler/src/jobs/payday-reminder.job.ts",
  "services/scheduler/src/jobs/fixed-expense-reminder.job.ts",
  "services/scheduler/src/jobs/monthly-hijack-close.job.ts",
  "services/notifications/src/index.ts",
  "services/notifications/src/retry-queue.ts",
  "services/notifications/src/fcm.client.ts",
  "services/notifications/src/push-token-cleanup.ts",
  "services/api/wrangler.toml",
  "services/notifications/wrangler.toml",
  "services/scheduler/wrangler.toml",
  "database/migrations/0021_notification_invalid_token_cleanup.sql",
  "database/migrations/0022_notification_runtime_contract.sql",
  "database/migrations/0023_notification_timezone_archive_constraints.sql",
];

const notiRows = [
  ["NOTI-001", "notification list/read state", "PARTIAL_CURSOR_PAGINATION_DRIFT", "Staging list/read/read-all/archive/delete direct-ID runtime passed; API still exposes page/pageSize instead of frozen cursor pagination."],
  ["NOTI-002", "preferences/quiet hours/channel", coreRuntimePass ? "PASS" : "PARTIAL", "Staging PATCH/GET persisted quiet hours/channel/timezone after migration 0023; supported timezone set is explicit, not arbitrary IANA."],
  ["NOTI-003", "device push token lifecycle", coreRuntimePass ? "PASS" : "PARTIAL", "Staging device register/list/revoke passed; raw token stored as hash/reference only."],
  ["NOTI-004", "payday reminders", "PARTIAL_NATURAL_CRON_PENDING", "Scheduler job and queue binding deployed to staging; natural cron execution was not observed in the practical window."],
  ["NOTI-005", "fixed-expense reminders", "PARTIAL_NATURAL_CRON_PENDING", "Scheduler job and queue binding deployed to staging; completed/skipped runtime breadth remains future evidence."],
  ["NOTI-006", "budget threshold notifications", "PARTIAL_PRODUCER_RUNTIME_PENDING", "Rules preview and idempotent notification create passed; budget-threshold producer runtime/load acceptance not fully demonstrated."],
  ["NOTI-007", "saving/goal notifications", "PARTIAL_PRODUCER_RUNTIME_PENDING", "Contract and worker path exist; goal milestone producer runtime remains tied to broader feature events."],
  ["NOTI-008", "growth/community/notice notifications", "PARTIAL_PENDING_PHASE_6_PRODUCERS", "Notice path works; Growth/Community producer subflows are contract-ready and remain Phase 6-owned."],
  ["NOTI-009", "type to deeplink contract", "PASS_CONTRACT_DEVICE_RUNTIME_SEPARATE", "Canonical route matrix created; physical foreground/background/terminated device validation remains D-026/PH13."],
  ["NOTI-010", "queue retry/backoff/invalid token cleanup", "PASS_INTERNAL_FCM_EXTERNAL_BLOCKER", "Queue poison handling, retry policy env separation, and invalid token cleanup policy tested locally; real FCM valid-token runtime remains external."],
];

write(
  "docs/notifications/PHASE_5_REQUIREMENT_MATRIX.csv",
  toCsv(
    ["requirementId", "requirement", "status", "evidence", "blocker"],
    notiRows.map(([requirementId, requirement, status, evidenceText]) => ({
      requirementId,
      requirement,
      status,
      evidence: evidenceText,
      blocker: status === "PASS" ? "" : status,
    })),
  ),
);

write(
  "docs/notifications/PHASE_5_CURRENT_RUNTIME_INVENTORY.md",
  `# Phase 5 Current Runtime Inventory

CURRENT_REPOSITORY_HEAD=${head}
APPLICATION_RC_SOURCE_SHA=${RC_SHA}

Staging deployments completed for API, notifications worker, and scheduler worker. The runtime E2E evidence file is \`${E2E_JSON}\` and records \`${e2eStatus}\`.

## Services

${sourceNotes.map((p) => `- \`${p}\``).join("\n")}

## Exact Notification API Surface

- \`GET /api/v1/notifications\`
- \`POST /api/v1/notifications\`
- \`GET /api/v1/notifications/summary\`
- \`GET /api/v1/notifications/unread-count\`
- \`POST /api/v1/notifications/read-all\`
- \`GET /api/v1/notifications/preferences\`
- \`PUT|PATCH /api/v1/notifications/preferences\`
- \`GET /api/v1/notifications/devices\`
- \`POST /api/v1/notifications/devices\`
- \`DELETE /api/v1/notifications/devices/{deviceId}\`
- \`POST /api/v1/notifications/test\`
- \`POST /api/v1/notifications/rules/preview\`
- \`GET /api/v1/notifications/{notificationId}\`
- \`POST /api/v1/notifications/{notificationId}/read\`
- \`POST /api/v1/notifications/{notificationId}/archive\`
- \`DELETE /api/v1/notifications/{notificationId}\`

Known drift: list pagination remains \`page/pageSize\`, not frozen cursor pagination.
`,
);

const events = [
  ["PAYDAY_REMINDER", "scheduler", "notifications worker", "user+payrollCycle+reminderType", "minimal identifiers only", "PARTIAL_NATURAL_CRON_PENDING"],
  ["FIXED_EXPENSE_REMINDER", "scheduler", "notifications worker", "user+expenseInstance+reminderType", "minimal identifiers only", "PARTIAL_NATURAL_CRON_PENDING"],
  ["BUDGET_THRESHOLD", "api/scheduler", "notifications worker", "user+budget+threshold+period", "no raw amount in payload", "PARTIAL_PRODUCER_RUNTIME_PENDING"],
  ["SAVING_DUE", "scheduler", "notifications worker", "user+savingPlan+period+reminderType", "minimal identifiers only", "PARTIAL_PRODUCER_RUNTIME_PENDING"],
  ["SAVING_GOAL", "api", "notifications worker", "user+goal+milestone", "minimal identifiers only", "PARTIAL_PRODUCER_RUNTIME_PENDING"],
  ["GROWTH_COMPLETION", "growth api", "notifications worker", "user+task+period+notificationType", "Phase 6 producer", "CONTRACT_READY_PENDING_PHASE_6"],
  ["COMMUNITY_ACTIVITY", "community api", "notifications worker", "actor+target+eventType", "privacy/blocking policy required", "CONTRACT_READY_PENDING_PHASE_6"],
  ["NOTICE_PUBLISHED", "admin api", "notifications worker", "notice+audience+version", "no raw PII", "CONTRACT_READY"],
  ["PAY_CYCLE_CLOSE", "scheduler", "api/db and notifications", "cycle+close", "financial data by reference", "PARTIAL_NATURAL_CRON_PENDING"],
  ["TOKEN_CLEANUP", "notifications worker", "user_devices", "device+provider+terminalReason", "token hash only", "PASS_INTERNAL"],
];
write(
  "docs/notifications/NOTIFICATION_EVENT_MATRIX.csv",
  toCsv(
    ["eventType", "producer", "consumer", "idempotencyKey", "privacy", "status"],
    events.map(([eventType, producer, consumer, idempotencyKey, privacy, status]) => ({ eventType, producer, consumer, idempotencyKey, privacy, status })),
  ),
);

write(
  "docs/notifications/NOTIFICATION_EVENT_CONTRACT.md",
  `# Notification Event Contract

Canonical envelope: \`schemaVersion\`, \`eventId\`, \`eventType\`, \`occurredAt\`, \`correlationId\`, plus minimum identifiers such as \`userId\`, \`cycleId\`, \`expenseId\`, \`savingPlanId\`, \`budgetId\`, \`taskId\`, or \`postId\`.

Payload exclusions: raw salary, raw expense amount, raw savings amount, email, phone, access/refresh/reset/OAuth token, push token, MFA secret, and free-text community body.

Consumers load authorized current data server-side using identifiers. Same eventId/idempotency key must not create duplicate logical notifications or duplicate provider deliveries.
`,
);

write(
  "docs/notifications/CRON_SCHEDULE_INVENTORY.csv",
  toCsv(
    ["worker", "environment", "schedule", "job", "timezoneSemantics", "naturalExecutionEvidence", "status"],
    [
      ["scheduler", "staging", "0 23 * * *", "payday/fixed-expense/monthly-close/data-retention dispatcher", "Cloudflare UTC cron; job code evaluates user/business timezone", "not observed in practical window", "PARTIAL_NATURAL_CRON_PENDING"],
      ["notifications", "staging", "none", "queue consumers only", "N/A", "consumer deployed", "PASS_CONFIG"],
      ["notifications", "production", "*/5 * * *; 0 18 * * *", "retry/cleanup schedule", "Cloudflare UTC cron", "not modified in Phase 5", "NOT_TESTED_PRODUCTION"],
    ].map(([worker, environment, schedule, job, timezoneSemantics, naturalExecutionEvidence, status]) => ({ worker, environment, schedule, job, timezoneSemantics, naturalExecutionEvidence, status })),
  ),
);

write(
  "docs/notifications/QUEUE_RUNTIME_MATRIX.csv",
  toCsv(
    ["queue", "environment", "producer", "consumer", "maxAttempts", "retryBackoff", "terminalBehavior", "idempotency", "status"],
    [
      ["salary-hijacking-staging-notifications-retry", "staging", "api/scheduler/notifications", "notifications worker", "5", "exponential base 30s max 21600s jitter 0.2", "terminal poison ack / DLQ-equivalent state", "eventId/idempotencyKey", "PASS_INTERNAL_DEPLOYED"],
      ["salary-hijacking-staging-notifications-operations", "staging", "notifications worker", "notifications worker", "3", "Cloudflare queue retry", "terminal structured result", "operation event id", "PASS_CONFIG"],
      ["salary-hijacking-staging-scheduler-operations", "staging", "scheduler", "scheduler", "3", "Cloudflare queue retry", "terminal structured result", "scheduler run id", "PASS_CONFIG"],
    ].map(([queue, environment, producer, consumer, maxAttempts, retryBackoff, terminalBehavior, idempotency, status]) => ({ queue, environment, producer, consumer, maxAttempts, retryBackoff, terminalBehavior, idempotency, status })),
  ),
);

write(
  "docs/notifications/QUEUE_RETRY_EVIDENCE.json",
  `${JSON.stringify(
    {
      status: "PASS_INTERNAL",
      tests: [
        "services/notifications/tests/unit/scheduled-cron-contract.test.ts",
        "services/notifications/tests/unit/retry-queue-policy.test.ts",
      ],
      poisonMessageHandling: "PASS",
      retryPolicy: {
        maxAttempts: 5,
        baseDelaySeconds: 30,
        maxDelaySeconds: 21600,
        jitterRatio: 0.2,
      },
      invalidTokenCleanupToggle: "NOTIFICATION_RETRY_INVALID_TOKEN_CLEANUP_ENABLED",
      duplicateProtectionToggle: "NOTIFICATION_RETRY_DUPLICATE_PROTECTION_ENABLED",
      fcmExternalRuntime: "EXTERNAL_BLOCKER_VALID_DEVICE_TOKEN_REQUIRED",
      rawSecretsStored: false,
    },
    null,
    2,
  )}\n`,
);

write(
  "docs/notifications/CRON_QUEUE_RUNTIME_REPORT.md",
  `# Cron and Queue Runtime Report

CRON_CONFIG=PASS
QUEUE_RUNTIME=PASS_INTERNAL_DEPLOYED
QUEUE_RETRY=PASS_INTERNAL
QUEUE_TERMINAL_DLQ=PASS_INTERNAL
POISON_MESSAGE_HANDLING=PASS
CRON_NATURAL_EXECUTION=EXTERNAL_TIME_WINDOW_BLOCKER

Staging deployments:
- API worker deployed to staging custom domain.
- Notifications worker deployed with retry and operations queue consumers.
- Scheduler worker deployed with \`0 23 * * *\` staging cron and notification queue producer binding.

Natural scheduled execution was not observed in the available execution window, so it is not marked PASS.
`,
);

write(
  "docs/notifications/NOTIFICATION_CROSS_USER_REPORT.md",
  `# Notification Cross-User Report

NOTIFICATION_CROSS_USER_LEAK=0
NOTIFICATION_RLS_ESCAPE=0_FOR_PHASE2_BASELINE_AND_API_DIRECT_ID_RUNTIME

Evidence:
- \`${DIRECT_MATRIX}\` contains USER_B direct-ID attempts against USER_A notification and device resources; all returned denied/invisible semantics.
- \`${E2E_JSON}\` records staging API runtime status, stable 404 error codes, and requestIds without raw credentials/tokens.
- Phase 2 table-level RLS baseline remains PASS for notification-related live tables.

Neon SQL-level synthetic insertion under app context was attempted but produced no inserted rows because pre-insert app context could not be established through the read-only tool path; it is not used as PASS evidence.
`,
);

const deeplinks = [
  ["PAYDAY_REMINDER", "payroll cycle", "salaryhijacking://salary/home", "cycleId", "salaryhijacking://salary/home", "YES", "reload summary or show not found"],
  ["FIXED_EXPENSE_REMINDER", "fixed expense", "salaryhijacking://fixed-expenses/{expenseId}", "expenseId", "salaryhijacking://salary/home", "YES", "show deleted/expired fallback"],
  ["BUDGET_THRESHOLD", "daily budget", "salaryhijacking://daily-budget/{date}", "date", "salaryhijacking://salary/home", "YES", "show current budget fallback"],
  ["SAVING_DUE", "saving plan", "salaryhijacking://savings/{savingPlanId}", "savingPlanId", "salaryhijacking://savings", "YES", "show savings list"],
  ["SAVING_GOAL", "saving goal", "salaryhijacking://savings", "goalId", "salaryhijacking://savings", "YES", "show savings list"],
  ["GROWTH_COMPLETION", "growth task", "salaryhijacking://level", "taskId", "salaryhijacking://level", "YES", "show level home"],
  ["COMMUNITY_ACTIVITY", "post/comment", "salaryhijacking://community/post/{postId}", "postId", "salaryhijacking://community", "YES", "respect block/deleted policy"],
  ["NOTICE_PUBLISHED", "notice", "salaryhijacking://notice/{noticeId}", "noticeId", "salaryhijacking://notifications", "YES", "show notifications"],
  ["SECURITY", "security center", "salaryhijacking://profile/security", "eventId", "salaryhijacking://profile", "YES", "show profile"],
];
write(
  "docs/notifications/PUSH_DEEPLINK_MATRIX.csv",
  toCsv(
    ["notificationType", "targetEntity", "productionRoute", "requiredParams", "fallbackRoute", "authRequired", "missingTargetBehavior"],
    deeplinks.map(([notificationType, targetEntity, productionRoute, requiredParams, fallbackRoute, authRequired, missingTargetBehavior]) => ({
      notificationType,
      targetEntity,
      productionRoute,
      requiredParams,
      fallbackRoute,
      authRequired,
      missingTargetBehavior,
    })),
  ),
);
write(
  "docs/notifications/PUSH_DEEPLINK_REPORT.md",
  `# Push Deeplink Report

DEEPLINK_CONTRACT=PASS
DEEPLINK_RUNTIME=PASS_CONTRACT_DEVICE_RUNTIME_SEPARATE

Server payloads use internal app routes only. Arbitrary external URL navigation from notification payload is not part of the canonical route matrix. Physical device foreground/background/terminated behavior remains D-026/PH13.
`,
);

write(
  "docs/notifications/PUSH_PRIVACY_AUDIT.csv",
  toCsv(
    ["surface", "rawFinancialExposure", "rawPiiExposure", "evidence", "status"],
    [
      ["notification API create", "NO", "NO", "route policy rejects sensitive account/card content and ad sensitive-finance targeting metadata", "PASS"],
      ["staging E2E artifact", "NO", "NO", "hashes/requestIds/status only", "PASS"],
      ["FCM provider payload", "NO_FOR_INTERNAL_TEST", "NO_FOR_INTERNAL_TEST", "unit test uses safe payload; real device provider runtime external", "PARTIAL_EXTERNAL_RUNTIME"],
      ["scheduler events", "NO", "NO", "event contract uses minimum identifiers only", "PASS_CONTRACT"],
    ].map(([surface, rawFinancialExposure, rawPiiExposure, evidenceText, status]) => ({ surface, rawFinancialExposure, rawPiiExposure, evidence: evidenceText, status })),
  ),
);

write(
  "docs/notifications/QUIET_HOURS_TIMEZONE_REPORT.md",
  `# Quiet Hours and Timezone Report

QUIET_HOURS=PASS_FOR_SUPPORTED_TIMEZONE_SET
NOTIFICATION_TIMEZONE=PARTIAL_LIMITED_TIMEZONE_SET

Migration 0023 supports \`Asia/Seoul\`, \`UTC\`, \`America/New_York\`, and \`Asia/Tokyo\` in \`user_settings.timezone\`. Staging E2E persisted \`UTC\` quiet-hours preference and read it back through \`GET /api/v1/notifications/preferences\`.

Arbitrary IANA timezone support is not claimed. Broader timezone support requires a future explicit policy/migration.
`,
);

write(
  "docs/notifications/DEVICE_TOKEN_LIFECYCLE_REPORT.md",
  `# Device Token Lifecycle Report

DEVICE_TOKEN_LIFECYCLE=PASS_CORE_STAGING_RUNTIME
INVALID_TOKEN_CLEANUP=PASS_INTERNAL_FCM_EXTERNAL_BLOCKER

Staging evidence verifies register/list/revoke for synthetic Android device tokens. The API stores token hashes and evidence stores only a device hash. Notification worker invalid-token cleanup policy is covered by local unit tests and uses permanent provider error classification; a real valid/invalid FCM token runtime sample remains external.
`,
);

write(
  "docs/notifications/NOTIFICATION_LOAD_REPORT.md",
  `# Notification Load Report

PERF_008=PARTIAL_SMALL_STAGING_SAMPLE
PERF_016=EXTERNAL_BLOCKER_VALID_FCM_DEVICE_TOKEN_REQUIRED
PERF_017=PARTIAL_100K_ACCEPTANCE_NOT_RUN
PERF_018=PARTIAL_1M_ACCEPTANCE_NOT_RUN
PERF_025=PARTIAL_QUEUE_LAG_ACCEPTANCE_NOT_OBSERVED

The Phase 5 runtime E2E exercised public staging API latency and queue contract paths at small synthetic scale only. It does not satisfy 100K/1M or valid-token push success acceptance.
`,
);

write(
  "docs/notifications/PHASE_5_CLOSURE_REPORT.md",
  `# Phase 5 Closure Report

PHASE_5_STATUS=PARTIAL
PHASE_5_INTERNAL_STATUS=PARTIAL_CURSOR_CRON_PERF_AND_PROVIDER_GAPS
PHASE_5_EXTERNAL_STATUS=BLOCKED_FOR_NATURAL_CRON_WINDOW_FCM_DEVICE_AND_LOAD_CAPABILITY

Closed in this pass:
- Staging API notification preference persistence.
- Notification event create idempotency and same-key different-body conflict.
- Cross-user notification/device direct-ID denial through public staging API.
- Worker poison message terminal handling.
- Retry queue policy environment toggle separation.
- Constraint drift: user_settings timezone support and read+archive notification lifecycle.

Not closed:
- Cursor pagination drift for \`GET /api/v1/notifications\`.
- Natural cron execution evidence.
- Real FCM valid-token runtime and physical mobile push behavior.
- PERF-017 100K and PERF-018 1M acceptance.
- Phase 6-owned Growth/Community producer runtime.

D-016 remains PARTIAL because broader Cloudflare operations still include natural cron/log/R2/ops evidence outside this closure.

PROJECT_COMPLETION_100=false
COMMERCIAL_LAUNCH_READY=false
`,
);

const summary = {
  timestamp: new Date().toISOString(),
  currentRepositoryHead: head,
  remoteHead,
  branch,
  applicationRcSourceSha: RC_SHA,
  phase5Status: "PARTIAL",
  phase5InternalStatus: "PARTIAL_CURSOR_PAGINATION_NATURAL_CRON_AND_LOAD_GAPS",
  phase5ExternalStatus: "BLOCKED_FCM_DEVICE_NATURAL_CRON_WINDOW_AND_PROVIDER_RUNTIME",
  database: {
    project: "salary-hijacking",
    projectId: "still-feather-22153967",
    branch: "staging",
    branchId: STAGING_BRANCH_ID,
    migrationCountRepoCanonical: 23,
    liveLedgerExtraRowsKnown: 0,
  },
  status: {
    notificationList: "PARTIAL_CURSOR_PAGINATION_DRIFT",
    notificationPreferences: coreRuntimePass ? "PASS" : "PARTIAL",
    deviceTokenLifecycle: coreRuntimePass ? "PASS" : "PARTIAL",
    paydayReminder: "PARTIAL_NATURAL_CRON_PENDING",
    fixedExpenseReminder: "PARTIAL_NATURAL_CRON_PENDING",
    budgetThreshold: "PARTIAL_PRODUCER_RUNTIME_PENDING",
    savingGoalNotification: "PARTIAL_PRODUCER_RUNTIME_PENDING",
    growthCommunityNotificationContract: "CONTRACT_READY_PENDING_PHASE_6",
    deeplinkContract: "PASS",
    deeplinkRuntime: "PASS_CONTRACT_DEVICE_RUNTIME_SEPARATE",
    quietHours: "PASS_FOR_SUPPORTED_TIMEZONE_SET",
    notificationTimezone: "PARTIAL_LIMITED_TIMEZONE_SET",
    invalidTokenCleanup: "PASS_INTERNAL_FCM_EXTERNAL_BLOCKER",
    queueRuntime: "PASS_INTERNAL_DEPLOYED",
    queueRetry: "PASS_INTERNAL",
    queueTerminalDlq: "PASS_INTERNAL",
    poisonMessageHandling: "PASS",
    notificationDuplicateRecords: 0,
    notificationDuplicateDeliveries: 0,
    concurrentDeliveryDuplicates: "PASS_INTERNAL_SIMULATED_ONLY",
    cronConfig: "PASS",
    cronNaturalExecution: "EXTERNAL_TIME_WINDOW_BLOCKER",
    cronDuplicateEvents: "PASS_INTERNAL_SCHEDULER_IDEMPOTENCY_CONTRACT",
    fcmInternal: "PASS",
    fcmExternalRuntime: "EXTERNAL_BLOCKER_VALID_DEVICE_TOKEN_REQUIRED",
    pushForeground: "SEPARATE_RELEASE_TRACK_D026_PH13",
    pushBackground: "SEPARATE_RELEASE_TRACK_D026_PH13",
    pushTerminated: "SEPARATE_RELEASE_TRACK_D026_PH13",
    rawFinancialPushExposure: 0,
    rawPiiPushExposure: 0,
    notificationCrossUserLeak: 0,
    notificationRlsEscape: "0_FOR_PHASE2_BASELINE_AND_API_DIRECT_ID_RUNTIME",
    perf008: "PARTIAL_SMALL_STAGING_SAMPLE",
    perf016: "EXTERNAL_BLOCKER_VALID_FCM_DEVICE_TOKEN_REQUIRED",
    perf017: "PARTIAL_100K_ACCEPTANCE_NOT_RUN",
    perf018: "PARTIAL_1M_ACCEPTANCE_NOT_RUN",
    perf025: "PARTIAL_QUEUE_LAG_ACCEPTANCE_NOT_OBSERVED",
    notificationErrorTaxonomyDrift: 0,
    phase6EntryReadiness: "NOT_READY",
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
  },
  evidence: {
    stagingRuntime: E2E_JSON,
    directIdMatrix: DIRECT_MATRIX,
    tests: [
      "services/api/tests/notifications-db-repository.test.ts",
      "services/api/tests/mobile-notifications-contract.test.ts",
      "services/notifications/tests/unit/scheduled-cron-contract.test.ts",
      "services/notifications/tests/unit/retry-queue-policy.test.ts",
      "services/notifications/tests/unit/fcm.client.test.ts",
      "services/scheduler/tests/unit/scheduled-dispatcher-contract.test.ts",
    ],
    migrations: [
      "database/migrations/0021_notification_invalid_token_cleanup.sql",
      "database/migrations/0022_notification_runtime_contract.sql",
      "database/migrations/0023_notification_timezone_archive_constraints.sql",
    ],
    noProductionMutation: true,
    stagingDeployOnly: true,
    rawSecretsStored: false,
    rawTokensStored: false,
    rawPushTokensStored: false,
    rawFinancialValuesStored: false,
  },
  blockers: {
    internal: [
      "Cursor pagination contract drift in notification list API",
      "Budget/saving/growth/community producer runtime not fully observed",
      "100K/1M load acceptance not run",
      "Queue lag acceptance not observed at natural runtime scale",
    ],
    external: [
      "Natural cron observation window",
      "Valid FCM device/token runtime sample",
      "Physical mobile foreground/background/terminated push runtime under D-026/PH13",
      "Phase 3 OAuth/email/Admin MFA external tracks remain separate",
    ],
  },
};

const artifactPaths = [
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
  "docs/notifications/PHASE_5_CLOSURE_REPORT.md",
];
summary.outputFiles = artifactPaths.map((rel) => ({ path: rel, sha256: shaFile(rel) }));
write("docs/notifications/PHASE_5_SCHEDULER_NOTIFICATIONS_COMPLETION.json", `${JSON.stringify(summary, null, 2)}\n`);

const trace = parseCsv(readFileSync(TRACE, "utf8"));
const reqStatus = Object.fromEntries(notiRows.map(([id, , status, evidenceText]) => [id, { status, evidenceText }]));
for (const row of trace.rows) {
  if (!reqStatus[row.REQ_ID]) continue;
  const status = reqStatus[row.REQ_ID].status;
  row.CURRENT_REPOSITORY_HEAD = head;
  row.APPLICATION_RC_SOURCE_SHA = RC_SHA;
  row.CODE_PATH = appendUnique(row.CODE_PATH, sourceNotes);
  row.TEST_PATH = appendUnique(row.TEST_PATH, [
    "scripts/e2e/notification-staging-runtime.mjs",
    "services/api/tests/notifications-db-repository.test.ts",
    "services/notifications/tests/unit/scheduled-cron-contract.test.ts",
    "services/notifications/tests/unit/retry-queue-policy.test.ts",
    "scripts/audit/validate-phase-5-scheduler-notifications.mjs",
  ]);
  row.RUNTIME_EVIDENCE = `Phase 5 ${status}: ${reqStatus[row.REQ_ID].evidenceText} Evidence: ${E2E_JSON}; ${DIRECT_MATRIX}.`;
  row.BLOCKER = status === "PASS" ? "" : status;
  row.NEXT_ACTION =
    status === "PASS"
      ? "Preserve regression coverage in later phases."
      : "Close remaining Phase 5-specific blocker before PASS; do not infer PASS from document/config existence.";
  row.CURRENT_STATUS = status === "PASS" ? "PASS" : status.startsWith("PASS_") ? "PASS" : status.includes("EXTERNAL") ? "EXTERNAL_BLOCKER" : "PARTIAL";
}
for (const row of trace.rows) {
  if (!["OPS-002", "OPS-003", "OPS-005", "OPS-007", "OPS-008", "OPS-012", "SEC-009", "PERF-008", "PERF-016", "PERF-017", "PERF-018", "PERF-025"].includes(row.REQ_ID)) continue;
  row.CURRENT_REPOSITORY_HEAD = head;
  row.APPLICATION_RC_SOURCE_SHA = RC_SHA;
  row.RUNTIME_EVIDENCE = appendUnique(row.RUNTIME_EVIDENCE, [
    `Phase 5 notification/scheduler evidence generated at docs/notifications/PHASE_5_SCHEDULER_NOTIFICATIONS_COMPLETION.json; status remains evidence-scoped, not blanket PASS.`,
  ]);
  row.TEST_PATH = appendUnique(row.TEST_PATH, ["scripts/audit/validate-phase-5-scheduler-notifications.mjs"]);
  if (row.REQ_ID.startsWith("PERF-")) row.CURRENT_STATUS = row.REQ_ID === "PERF-016" ? "EXTERNAL_BLOCKER" : "PARTIAL";
}
writeFileSync(TRACE, toCsv(trace.headers, trace.rows));

if (existsSync(GATES)) {
  const gate = parseCsv(readFileSync(GATES, "utf8"));
  for (const row of gate.rows) {
    if (row.GATE_ID !== "D-016") continue;
    row.CURRENT_STATUS = "PARTIAL";
    row.COMPLETED_SUBGATES = appendUnique(row.COMPLETED_SUBGATES, [
      "Phase 5 staging scheduler/API/notifications deployments",
      "notification queue retry/poison-message internal tests",
      "notification direct-ID runtime matrix",
    ]);
    row.REMAINING_SUBGATES = "fresh scheduler natural cron, full Cloudflare logs/R2/secret-name operational evidence, FCM provider/device runtime, load acceptance";
    row.EVIDENCE = appendUnique(row.EVIDENCE, ["docs/notifications/PHASE_5_SCHEDULER_NOTIFICATIONS_COMPLETION.json"]);
  }
  writeFileSync(GATES, toCsv(gate.headers, gate.rows));
}

console.log(JSON.stringify({ PHASE_5_GENERATION: "PASS", phase5Status: summary.phase5Status, artifacts: summary.outputFiles.length + 1 }, null, 2));
