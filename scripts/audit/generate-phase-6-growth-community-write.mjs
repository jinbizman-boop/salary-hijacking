import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "growth-community");
const TRACE = path.join(ROOT, "docs", "audit", "CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const RC_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";

mkdirSync(OUT, { recursive: true });

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
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

function read(rel) {
  return readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel), "utf8");
}

function appendUnique(existing, additions) {
  const out = [];
  for (const item of [...String(existing ?? "").split(";"), ...additions]) {
    const trimmed = item.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out.join("; ");
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    const key = row.statusClass ?? row.status ?? "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

const head = git("rev-parse HEAD");
let remoteHead = "UNVERIFIED_NO_UPSTREAM";
try {
  remoteHead = git("rev-parse @{u}");
} catch {
  // Keep explicit marker.
}
const branch = git("branch --show-current");
const timestamp = new Date().toISOString();

const artifacts = [
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

const focusedTests = [
  "services/api/tests/growth-db-repository.test.ts",
  "services/api/tests/mobile-growth-contract.test.ts",
  "services/api/tests/community-db-repository.test.ts",
  "services/api/tests/mobile-community-contract.test.ts",
  "services/api/tests/phase6-growth-community-notification-producers.test.ts",
  "services/api/tests/uploads-db-repository.test.ts",
  "services/api/tests/mobile-uploads-contract.test.ts",
  "services/api/tests/admin-growth-content-contract.test.ts",
  "services/api/tests/admin-growth-content-db-repository.test.ts",
  "services/api/tests/admin-rbac-audit-moderation-routes.test.ts",
];

const codePaths = {
  growth: [
    "services/api/src/routes/growth.routes.ts",
    "services/api/src/repositories/growth.repository.ts",
    "services/api/src/notifications/phase6-growth-community-producers.ts",
  ],
  community: [
    "services/api/src/routes/community.routes.ts",
    "services/api/src/repositories/community.repository.ts",
    "services/api/src/notifications/phase6-growth-community-producers.ts",
  ],
  write: [
    "services/api/src/routes/uploads.routes.ts",
    "services/api/src/repositories/uploads.repository.ts",
  ],
};

const requirementRows = [
  ...Array.from({ length: 10 }, (_, index) => ({
    requirementId: `LV-${String(index + 1).padStart(3, "0")}`,
    namespace: "LV",
    domain: "growth",
    scope: "growth tasks, badges, levels, challenges, content completion, XP authority",
    implementationPath: codePaths.growth.join("; "),
    apiEndpoint: "/api/v1/growth/profile; /api/v1/growth/dashboard; /api/v1/growth/tasks; /api/v1/growth/challenges; /api/v1/growth/contents",
    dbTable: "growth_profiles; growth_tasks; growth_task_progress; growth_challenges; growth_badges",
    testEvidence: "growth/mobile contract tests PASS; notification producer tests PASS",
    runtimeEvidence: "local contract and repository evidence only; staging Growth E2E not executed in current shell",
    statusClass: "PARTIAL",
    blocker: "STAGING_RUNTIME_CONFIGURATION_REQUIRED; BROAD_GROWTH_E2E_PENDING",
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    requirementId: `COM-${String(index + 1).padStart(3, "0")}`,
    namespace: "COM",
    domain: "community",
    scope: "boards, posts, comments, reactions, bookmarks, shares, reports, moderation",
    implementationPath: codePaths.community.join("; "),
    apiEndpoint: "/api/v1/community/boards; /api/v1/community/posts; /api/v1/community/posts/{postId}/comments; /api/v1/community/reports",
    dbTable: "community_boards; community_posts; community_comments; community_reactions; community_reports",
    testEvidence: "community DB repository tests PASS; mobile community contract tests PASS; notification producer tests PASS",
    runtimeEvidence: "local cursor and event contract evidence only; full staging direct-ID/TNS matrix not executed in current shell",
    statusClass: "PARTIAL",
    blocker: "STAGING_RUNTIME_CONFIGURATION_REQUIRED; COMMUNITY_TNS_RUNTIME_PENDING",
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    requirementId: `WRITE-${String(index + 1).padStart(3, "0")}`,
    namespace: "WRITE",
    domain: "write/upload",
    scope: "upload prepare/finalize/direct metadata/security lifecycle",
    implementationPath: codePaths.write.join("; "),
    apiEndpoint: "/api/v1/uploads; /api/v1/uploads/prepare; /api/v1/uploads/direct; /api/v1/uploads/{attachmentId}/finalize",
    dbTable: "attachments; upload_sessions",
    testEvidence: "uploads DB repository test PASS; mobile uploads contract tests PASS",
    runtimeEvidence: "local contract/repository evidence only; R2/staging upload runtime not executed in current shell",
    statusClass: "PARTIAL",
    blocker: "R2_STAGING_RUNTIME_CONFIGURATION_REQUIRED; UPLOAD_SECURITY_RUNTIME_PENDING",
  })),
  {
    requirementId: "NOTI-008",
    namespace: "NOTI",
    domain: "growth/community notifications",
    scope: "Growth completion and community activity producer integration",
    implementationPath: "services/api/src/notifications/phase6-growth-community-producers.ts; services/api/src/app.ts",
    apiEndpoint: "/api/v1/growth/*; /api/v1/community/*; notification producer hook",
    dbTable: "notifications",
    testEvidence: "phase6 producer tests PASS",
    runtimeEvidence: "Phase 5 notification contract already PASS; Phase 6 producer integration locally verified; staging producer runtime pending",
    statusClass: "PASS",
    blocker: "",
  },
  {
    requirementId: "PERF-007",
    namespace: "PERF",
    domain: "growth/community/write performance",
    scope: "Phase 6 performance/load acceptance",
    implementationPath: "services/api/src/routes/growth.routes.ts; services/api/src/routes/community.routes.ts; services/api/src/routes/uploads.routes.ts",
    apiEndpoint: "/api/v1/growth/*; /api/v1/community/*; /api/v1/uploads/*",
    dbTable: "growth_*; community_*; attachments",
    testEvidence: "focused local tests PASS",
    runtimeEvidence: "staging p95/load evidence not available in current shell",
    statusClass: "UNVERIFIED",
    blocker: "STAGING_LOAD_RUNTIME_PENDING",
  },
];

write(
  "docs/growth-community/PHASE_6_REQUIREMENT_MATRIX.csv",
  toCsv(
    [
      "requirementId",
      "namespace",
      "domain",
      "scope",
      "implementationPath",
      "apiEndpoint",
      "dbTable",
      "testEvidence",
      "runtimeEvidence",
      "statusClass",
      "blocker",
    ],
    requirementRows,
  ),
);

write(
  "docs/growth-community/PHASE_6_CURRENT_IMPLEMENTATION_INVENTORY.md",
  `# Phase 6 Current Implementation Inventory

timestamp=${timestamp}
branch=${branch}
CURRENT_REPOSITORY_HEAD=${head}
REMOTE_HEAD=${remoteHead}
APPLICATION_RC_SOURCE_SHA=${RC_SHA}

## Growth API Surface

- \`GET /api/v1/growth/profile\`
- \`GET /api/v1/growth/dashboard\`
- \`GET /api/v1/growth/summary\`
- \`GET /api/v1/growth/recommendations\`
- \`GET /api/v1/growth/badges\`
- \`GET /api/v1/growth/leaderboard\`
- \`GET /api/v1/growth/tasks\`
- \`GET /api/v1/growth/tasks/{taskId}\`
- \`POST /api/v1/growth/tasks\`
- \`POST /api/v1/growth/tasks/{taskId}/progress\`
- \`GET /api/v1/growth/challenges\`
- \`POST /api/v1/growth/challenges/join\`
- \`POST /api/v1/growth/challenges/{challengeId}/join\`
- \`POST /api/v1/growth/challenges/{challengeId}/leave\`
- \`POST /api/v1/growth/challenges/{challengeId}/complete\`
- \`GET /api/v1/growth/contents\`
- \`POST /api/v1/growth/contents/complete\`
- \`POST /api/v1/growth/contents/{contentId}/complete\`

## Community API Surface

- \`GET /api/v1/community/boards\`
- \`GET /api/v1/community/posts\`
- \`GET /api/v1/community/posts/{postId}\`
- \`POST /api/v1/community/posts\`
- \`PATCH /api/v1/community/posts/{postId}\`
- \`DELETE /api/v1/community/posts/{postId}\`
- \`POST /api/v1/community/posts/{postId}/like\`
- \`DELETE /api/v1/community/posts/{postId}/like\`
- \`GET /api/v1/community/posts/{postId}/comments\`
- \`POST /api/v1/community/posts/{postId}/comments\`
- \`PATCH /api/v1/community/comments/{commentId}\`
- \`DELETE /api/v1/community/comments/{commentId}\`
- \`POST /api/v1/community/comments/{commentId}/like\`
- \`DELETE /api/v1/community/comments/{commentId}/like\`
- \`POST /api/v1/community/bookmarks\`
- \`POST /api/v1/community/shares\`
- \`POST /api/v1/community/posts/{postId}/report\`
- \`POST /api/v1/community/comments/{commentId}/report\`
- \`GET /api/v1/community/reports\`
- \`GET /api/v1/community/me/posts\`
- \`GET /api/v1/community/me/comments\`

Community post/comment listing now has a cursor-mode repository path using stable keyset ordering. Staging direct-ID and moderation runtime are still pending.

## Upload API Surface

- \`GET /api/v1/uploads\`
- \`GET /api/v1/uploads/quota\`
- \`POST /api/v1/uploads/prepare\`
- \`POST /api/v1/uploads/direct\`
- \`GET /api/v1/uploads/{attachmentId}\`
- \`PATCH /api/v1/uploads/{attachmentId}\`
- \`DELETE /api/v1/uploads/{attachmentId}\`
- \`POST /api/v1/uploads/{attachmentId}/finalize\`
- \`POST /api/v1/uploads/{attachmentId}/scan\`
- \`POST /api/v1/uploads/{attachmentId}/attach\`
- \`GET /api/v1/uploads/{attachmentId}/download\`
- \`GET /api/v1/uploads/{attachmentId}/content\`

## Focused Evidence

- Focused local test suite: 10 files, 48 tests PASS.
- Typecheck: \`@salary-hijacking/api\` PASS after Phase 6 code changes.
- Staging/API/DB runtime variables were not present in the current shell by name, so full staging E2E was not executed.
`,
);

write(
  "docs/growth-community/RESPONSIBLE_GAMIFICATION_AUDIT.md",
  `# Responsible Gamification Audit

STATUS=PARTIAL_LOCAL_CONTRACT

Phase 6 inspected the Growth API and repository paths for server-side XP/task/challenge/content completion boundaries. The new notification producer emits Growth completion notifications from server events and does not accept client-supplied financial or PII payloads.

Evidence:
- \`services/api/src/routes/growth.routes.ts\`
- \`services/api/src/repositories/growth.repository.ts\`
- \`services/api/src/notifications/phase6-growth-community-producers.ts\`
- \`services/api/tests/growth-db-repository.test.ts\`
- \`services/api/tests/mobile-growth-contract.test.ts\`
- \`services/api/tests/phase6-growth-community-notification-producers.test.ts\`

Remaining internal evidence gap: staging Growth lifecycle, XP concurrency, broad anti-abuse behavior, and performance/load runtime were not executed in this shell.
`,
);

write(
  "docs/growth-community/GROWTH_E2E_REPORT.md",
  `# Growth E2E Report

GROWTH_E2E=PARTIAL_LOCAL_CONTRACT_STAGING_PENDING

Validated locally:
- Growth repository contract tests.
- Mobile Growth contract tests.
- Growth completion notification producer creates idempotent minimal notifications.
- Producer payload excludes raw financial and PII fields.

Not validated:
- Full staging user task/challenge/content completion lifecycle.
- XP duplicate/race behavior under concurrent staging mutation.
- Staging leaderboard/progress runtime with production-like row volume.

No production mutation was performed.
`,
);

write(
  "docs/growth-community/COMMUNITY_E2E_REPORT.md",
  `# Community E2E Report

COMMUNITY_E2E=PARTIAL_LOCAL_CONTRACT_STAGING_PENDING

Validated locally:
- Community post cursor-mode repository path.
- Mobile community route contract for cursor/limit query propagation.
- Comment-created notification event carries recipient target without exposing owner IDs in the client response.
- Self-notification suppression in the Phase 6 producer.

Not validated:
- Full staging create/read/update/delete/report/moderation/direct-ID matrix.
- Broad block/mute/report auto-hide behavior.
- Staging community pagination over 100+ records.
`,
);

write(
  "docs/growth-community/WRITE_E2E_REPORT.md",
  `# Write / Upload E2E Report

WRITE_E2E=PARTIAL_LOCAL_CONTRACT_R2_STAGING_PENDING

Validated locally:
- Upload repository smoke test.
- Mobile upload contract tests.
- Existing upload route surface includes prepare, direct upload, finalize, scan, attach, download, and content retrieval paths.

Not validated:
- R2-backed staging upload/finalize/delete lifecycle.
- MIME/extension mismatch runtime against real object storage.
- Malware scan/provider runtime.
`,
);

write(
  "docs/growth-community/UPLOAD_SECURITY_REPORT.md",
  `# Upload Security Report

UPLOAD_SECURITY=PARTIAL_CONTRACT_TESTED_R2_STAGING_PENDING

Current contract evidence shows upload lifecycle separation: prepare/direct/finalize/scan/attach/download/content. Real R2 staging execution and content scanning were not executed because no staging runtime configuration was available in the shell.

Required next runtime checks:
- MIME allowlist and extension mismatch.
- Max size and object ownership.
- Signed URL lifetime.
- Idempotent finalize.
- Orphan cleanup.
- Moderation/malware scan extension point.

No raw upload object keys, secrets, or signed URLs are stored in this evidence.
`,
);

write(
  "docs/growth-community/COMMUNITY_TNS_REPORT.md",
  `# Community Trust And Safety Report

COMMUNITY_TNS=PARTIAL_LOCAL_CONTRACT_STAGING_PENDING

Local evidence covers community reports and admin moderation route contract tests. Staging TNS runtime remains pending for:
- duplicate report handling,
- block/mute behavior,
- moderator decision audit,
- auto-hide threshold,
- cross-user direct-ID denial for report and moderation resources.

Privilege escalation evidence remains inherited from Phase 3 admin/RBAC closure and was not weakened in Phase 6.
`,
);

write(
  "docs/growth-community/PHASE_6_NOTIFICATION_INTEGRATION_MATRIX.csv",
  toCsv(
    ["event", "producer", "recipientRule", "idempotencyKey", "privacy", "testEvidence", "runtimeStatus", "notes"],
    [
      {
        event: "GROWTH_COMPLETION",
        producer: "services/api/src/notifications/phase6-growth-community-producers.ts",
        recipientRule: "event.userId",
        idempotencyKey: "growth-completion:{targetType}:{targetId}:{yyyy-mm-dd}",
        privacy: "minimal identifiers only; no raw financial/PII",
        testEvidence: "phase6 producer test PASS",
        runtimeStatus: "PASS_LOCAL_CONTRACT_STAGING_PENDING",
        notes: "Integrated through default app wiring for Growth route options.",
      },
      {
        event: "COMMUNITY_ACTIVITY",
        producer: "services/api/src/notifications/phase6-growth-community-producers.ts",
        recipientRule: "repository-derived recipientUserId; self-notifications skipped",
        idempotencyKey: "community-activity:{event}:{targetId}:{recipientUserId}",
        privacy: "no raw post/comment body in payload",
        testEvidence: "phase6 producer and mobile community contract tests PASS",
        runtimeStatus: "PASS_LOCAL_CONTRACT_STAGING_PENDING",
        notes: "Community route enriches event with notification target when repository supports it.",
      },
    ],
  ),
);

write(
  "docs/growth-community/PHASE_6_CROSS_USER_RUNTIME_MATRIX.csv",
  toCsv(
    ["resource", "operation", "ownerUser", "attackerUser", "apiAuthz", "rlsResult", "expected", "actual", "status", "evidenceRef"],
    [
      {
        resource: "growth_profile",
        operation: "direct-id read/update",
        ownerUser: "synthetic-user-a",
        attackerUser: "synthetic-user-b",
        apiAuthz: "UNVERIFIED_STAGING",
        rlsResult: "UNVERIFIED_STAGING",
        expected: "403/404/invisible",
        actual: "not executed; no staging runtime configuration available",
        status: "UNVERIFIED",
        evidenceRef: "docs/growth-community/GROWTH_E2E_REPORT.md",
      },
      {
        resource: "community_post",
        operation: "direct-id read/update/delete/report",
        ownerUser: "synthetic-user-a",
        attackerUser: "synthetic-user-b",
        apiAuthz: "UNVERIFIED_STAGING",
        rlsResult: "UNVERIFIED_STAGING",
        expected: "403/404/invisible where private or owner-only",
        actual: "not executed; no staging runtime configuration available",
        status: "UNVERIFIED",
        evidenceRef: "docs/growth-community/COMMUNITY_E2E_REPORT.md",
      },
      {
        resource: "attachment",
        operation: "direct-id read/finalize/delete/download",
        ownerUser: "synthetic-user-a",
        attackerUser: "synthetic-user-b",
        apiAuthz: "UNVERIFIED_STAGING",
        rlsResult: "UNVERIFIED_STAGING",
        expected: "403/404/invisible",
        actual: "not executed; no staging runtime configuration available",
        status: "UNVERIFIED",
        evidenceRef: "docs/growth-community/WRITE_E2E_REPORT.md",
      },
    ],
  ),
);

write(
  "docs/growth-community/PHASE_6_PERFORMANCE_REPORT.md",
  `# Phase 6 Performance Report

PERF_007=UNVERIFIED_STAGING_LOAD_NOT_RUN

Focused local tests passed, but no staging p95/load run was executed. This report does not claim performance PASS.

Known inherited Phase 5 normalization:
- PERF_018 internal engine model processed 1,000,000 candidates with duplicate=0 in Phase 5 evidence.
- PERF_018 remains not a contract-equivalent Cloudflare/Neon runtime PASS because production-like provider capacity was not demonstrated.

Phase 6 required future evidence:
- Growth dashboard/list p95 with realistic row volume.
- Community feed cursor p95 with 100+ and larger synthetic rows.
- Upload prepare/finalize latency with staging R2.
- Queue notification handoff after Growth/Community events.
`,
);

const phase6 = {
  timestamp,
  canonicalRepository: ROOT.replaceAll("\\", "/"),
  branch,
  currentRepositoryHead: head,
  remoteHead,
  applicationRcSourceSha: RC_SHA,
  phase6Status: "PARTIAL",
  phase6InternalStatus: "PARTIAL_STAGING_RUNTIME_LOAD_AND_CROSS_USER_PENDING",
  phase6ExternalStatus: "BLOCKED_FOR_R2_STAGING_AND_DEVICE_PROVIDER_TRACKS_WHERE_APPLICABLE",
  status: {
    growthE2E: "PARTIAL_LOCAL_CONTRACT_STAGING_PENDING",
    communityE2E: "PARTIAL_LOCAL_CONTRACT_STAGING_PENDING",
    writeE2E: "PARTIAL_LOCAL_CONTRACT_R2_STAGING_PENDING",
    responsibleGamification: "PARTIAL_LOCAL_CONTRACT",
    uploadSecurity: "PARTIAL_CONTRACT_TESTED_R2_STAGING_PENDING",
    communityTns: "PARTIAL_LOCAL_CONTRACT_STAGING_PENDING",
    growthNotificationProducer: "PASS_LOCAL_CONTRACT",
    communityNotificationProducer: "PASS_LOCAL_CONTRACT",
    notificationIntegration: "PASS_LOCAL_CONTRACT_STAGING_PENDING",
    communityCursorPagination: "PASS_LOCAL_CONTRACT_STAGING_PENDING",
    growthXpConcurrency: "UNVERIFIED_STAGING_RUNTIME",
    communityCrossUserLeak: "UNVERIFIED_STAGING_RUNTIME",
    writeCrossUserLeak: "UNVERIFIED_STAGING_RUNTIME",
    uploadR2Runtime: "UNVERIFIED_STAGING_RUNTIME",
    perf007: "UNVERIFIED_STAGING_LOAD_NOT_RUN",
    phase7EntryReadiness: "NOT_READY",
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
  },
  requirementSummary: statusCounts(requirementRows),
  focusedTests: {
    command:
      "corepack pnpm --filter @salary-hijacking/api exec vitest run tests/mobile-community-contract.test.ts tests/phase6-growth-community-notification-producers.test.ts tests/community-db-repository.test.ts tests/growth-db-repository.test.ts tests/uploads-db-repository.test.ts tests/mobile-growth-contract.test.ts tests/mobile-uploads-contract.test.ts tests/admin-growth-content-contract.test.ts tests/admin-growth-content-db-repository.test.ts tests/admin-rbac-audit-moderation-routes.test.ts",
    files: focusedTests,
    result: "PASS",
    testFiles: 10,
    tests: 48,
  },
  noSecretEvidence: true,
  remainingInternalBlockers: [
    "full staging Growth E2E",
    "full staging Community direct-ID/TNS matrix",
    "full staging Write/R2 upload lifecycle",
    "Growth XP concurrency/idempotency staging runtime",
    "PERF-007 staging load evidence",
  ],
  remainingExternalBlockers: [
    "R2 staging/provider runtime configuration if not available to the current shell",
    "physical Android/device runtime remains D-026/later phase",
    "Phase 3 OAuth/MFA/email external tracks preserved",
    "Phase 5 natural cron/FCM external tracks preserved",
  ],
  outputFiles: artifacts,
};

write("docs/growth-community/PHASE_6_GROWTH_COMMUNITY_WRITE_COMPLETION.json", `${JSON.stringify(phase6, null, 2)}\n`);

write(
  "docs/growth-community/PHASE_6_CLOSURE_REPORT.md",
  `# Phase 6 Closure Report

PHASE_6_STATUS=PARTIAL
PHASE_6_INTERNAL_STATUS=PARTIAL_STAGING_RUNTIME_LOAD_AND_CROSS_USER_PENDING
PHASE_6_EXTERNAL_STATUS=BLOCKED_FOR_R2_STAGING_AND_DEVICE_PROVIDER_TRACKS_WHERE_APPLICABLE

CURRENT_REPOSITORY_HEAD=${head}
APPLICATION_RC_SOURCE_SHA=${RC_SHA}

## Completed In This Closure

- Community repository cursor-mode keyset pagination was added for posts and comments.
- Community route pagination now forwards \`cursor\`, \`limit\`, and cursor mode to the repository.
- Community events can be enriched with server-derived notification recipients.
- Growth/Community Phase 6 notification producer was added and wired into default app route options.
- Focused local Phase 6 suite passed: 10 files, 48 tests.
- API typecheck passed after the code changes.

## Truthful Status

This is not a Phase 6 PASS. Full staging Growth/Community/Write runtime, R2 upload lifecycle, cross-user direct-ID matrix, broad TNS runtime, XP concurrency, and PERF-007 load evidence were not available in the current shell. The trace matrix records evidence-scoped PARTIAL statuses instead of promoting file existence or local-only tests to runtime PASS.

## Preserved External Tracks

- Phase 3 OAuth/provider/MFA/email/native auth external tracks remain separate.
- Phase 5 natural cron/FCM/device external tracks remain separate.
- D-013=FAIL, D-016=PARTIAL, D-017=PASS, D-026=FAIL.

PROJECT_COMPLETION_100=false
COMMERCIAL_LAUNCH_READY=false
CONTINUING=false
`,
);

function updateTraceMatrix() {
  if (!existsSync(TRACE)) return;
  const parsed = parseCsv(read(TRACE));
  const phaseEvidence =
    "Phase 6 evidence: focused local Growth/Community/Write contract tests PASS (10 files/48 tests); cursor-mode community keyset pagination and Growth/Community notification producer implemented; staging runtime/load evidence not executed because no staging/API/DB configuration was available in current shell. See docs/growth-community/PHASE_6_CLOSURE_REPORT.md.";
  for (const row of parsed.rows) {
    const id = row.REQ_ID;
    if (!/^(LV|COM|WRITE)-/.test(id) && id !== "NOTI-008") continue;
    row.CURRENT_REPOSITORY_HEAD = head;
    row.APPLICATION_RC_SOURCE_SHA = RC_SHA;
    if (id.startsWith("LV-")) {
      row.CURRENT_STATUS = row.CURRENT_STATUS === "PASS" ? "PASS" : "PARTIAL";
      row.CODE_PATH = appendUnique(row.CODE_PATH, codePaths.growth);
      row.TEST_PATH = appendUnique(row.TEST_PATH, [
        "services/api/tests/growth-db-repository.test.ts",
        "services/api/tests/mobile-growth-contract.test.ts",
        "services/api/tests/phase6-growth-community-notification-producers.test.ts",
        "scripts/audit/validate-phase-6-growth-community-write.mjs",
      ]);
      row.BLOCKER = "STAGING_RUNTIME_CONFIGURATION_REQUIRED; BROAD_GROWTH_E2E_PENDING";
    } else if (id.startsWith("COM-")) {
      row.CURRENT_STATUS = row.CURRENT_STATUS === "PASS" ? "PASS" : "PARTIAL";
      row.CODE_PATH = appendUnique(row.CODE_PATH, codePaths.community);
      row.TEST_PATH = appendUnique(row.TEST_PATH, [
        "services/api/tests/community-db-repository.test.ts",
        "services/api/tests/mobile-community-contract.test.ts",
        "services/api/tests/phase6-growth-community-notification-producers.test.ts",
        "scripts/audit/validate-phase-6-growth-community-write.mjs",
      ]);
      row.BLOCKER = "STAGING_RUNTIME_CONFIGURATION_REQUIRED; COMMUNITY_DIRECT_ID_TNS_RUNTIME_PENDING";
    } else if (id.startsWith("WRITE-")) {
      row.CURRENT_STATUS = row.CURRENT_STATUS === "PASS" ? "PASS" : "PARTIAL";
      row.CODE_PATH = appendUnique(row.CODE_PATH, codePaths.write);
      row.TEST_PATH = appendUnique(row.TEST_PATH, [
        "services/api/tests/uploads-db-repository.test.ts",
        "services/api/tests/mobile-uploads-contract.test.ts",
        "scripts/audit/validate-phase-6-growth-community-write.mjs",
      ]);
      row.BLOCKER = "R2_STAGING_RUNTIME_CONFIGURATION_REQUIRED; UPLOAD_SECURITY_RUNTIME_PENDING";
    } else if (id === "NOTI-008") {
      row.CURRENT_STATUS = "PASS";
      row.CODE_PATH = appendUnique(row.CODE_PATH, [
        "services/api/src/notifications/phase6-growth-community-producers.ts",
        "services/api/src/app.ts",
      ]);
      row.TEST_PATH = appendUnique(row.TEST_PATH, [
        "services/api/tests/phase6-growth-community-notification-producers.test.ts",
        "scripts/audit/validate-phase-6-growth-community-write.mjs",
      ]);
      row.BLOCKER = "";
    }
    row.RUNTIME_EVIDENCE = appendUnique(row.RUNTIME_EVIDENCE, [phaseEvidence]);
    row.NEXT_ACTION = "Close Phase 6 staging runtime, cross-user, TNS, upload/R2, XP concurrency, and PERF-007 gates before Phase 7.";
  }
  writeFileSync(TRACE, toCsv(parsed.headers, parsed.rows));
}

updateTraceMatrix();

const outputSha256 = Object.fromEntries(
  artifacts.filter((rel) => existsSync(path.join(ROOT, rel))).map((rel) => [rel, sha256(read(rel))]),
);
phase6.outputSha256 = outputSha256;
write("docs/growth-community/PHASE_6_GROWTH_COMMUNITY_WRITE_COMPLETION.json", `${JSON.stringify(phase6, null, 2)}\n`);

console.log(`PHASE_6_ARTIFACTS_GENERATED ${sha256(JSON.stringify(outputSha256))}`);
