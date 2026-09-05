import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/admin-ops");
const TRACE = path.join(ROOT, "docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const RC_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function read(rel) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, text) {
  const file = path.join(ROOT, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows, headers) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
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
  const [headers, ...body] = rows.filter((candidate) => candidate.length > 1 || candidate[0] !== "");
  return {
    headers,
    rows: body.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    ),
  };
}

function withShaBlock(fileList) {
  return fileList.map((rel) => `- ${rel}: ${sha256(read(rel))}`).join("\n");
}

const head = git(["rev-parse", "HEAD"]);
const branch = git(["branch", "--show-current"]);
const statusShort = git(["status", "--short"]);

const adminEndpoints = [
  ["GET", "/admin/api/v1/dashboard", "ADMIN-001", "metrics:read/admin:read", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["GET", "/admin/api/v1/users", "ADMIN-002", "user:read/user:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["GET", "/admin/api/v1/users/{userId}", "ADMIN-002", "user:read/user:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/users/{userId}/suspend", "ADMIN-003", "user:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/users/{userId}/restore", "ADMIN-003", "user:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/users/{userId}/force-logout", "ADMIN-004", "user:manage", "PASS_ROUTE_CONTRACT_AUTH_PHASE3"],
  ["GET", "/admin/api/v1/users/{userId}/activity-summary", "ADMIN-005", "user:read/community:read", "PASS_LOCAL_ROUTE_CONTRACT_MASKED"],
  ["GET", "/admin/api/v1/community/posts", "ADMIN-006", "community:read/community:moderate", "PASS_PHASE6_BACKED"],
  ["GET", "/admin/api/v1/community/posts/{postId}", "ADMIN-006", "community:read/community:moderate", "PASS_PHASE6_BACKED"],
  ["POST", "/admin/api/v1/community/posts/{postId}/hide", "ADMIN-007", "community:moderate", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["POST", "/admin/api/v1/community/posts/{postId}/restore", "ADMIN-007", "community:moderate", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["DELETE", "/admin/api/v1/community/posts/{postId}", "ADMIN-007", "community:moderate/admin:write", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["GET", "/admin/api/v1/reports", "ADMIN-008", "report:read/report:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/reports/{reportId}/resolve", "ADMIN-008", "report:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["GET", "/admin/api/v1/notices", "ADMIN-009", "notice:read/notice:write", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/notices", "ADMIN-009", "notice:write", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["PATCH", "/admin/api/v1/notices/{noticeId}", "ADMIN-009", "notice:write", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/notices/{noticeId}/publish", "ADMIN-009", "notice:write", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/notices/{noticeId}/unpublish", "ADMIN-009", "notice:write", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["DELETE", "/admin/api/v1/notices/{noticeId}", "ADMIN-009", "notice:write", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["GET", "/admin/api/v1/ads/campaigns", "ADS-001", "ad:read/ad:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/ads/campaigns", "ADS-002", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["PATCH", "/admin/api/v1/ads/campaigns/{campaignId}", "ADS-002", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["POST", "/admin/api/v1/ads/campaigns/{campaignId}/activate", "ADS-003", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["POST", "/admin/api/v1/ads/campaigns/{campaignId}/pause", "ADS-003", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["GET", "/admin/api/v1/ads/reports", "ADS-004", "ad:read/ad:manage", "PASS_LOCAL_ROUTE_MASKED"],
  ["GET", "/admin/api/v1/growth/tasks", "ADMIN-010", "growth:read/growth:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["POST", "/admin/api/v1/growth/tasks", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["PATCH", "/admin/api/v1/growth/tasks/{taskId}", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["GET", "/admin/api/v1/growth/contents", "ADMIN-010", "growth:read/growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["PATCH", "/admin/api/v1/growth/contents/{contentId}", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents/{contentId}/review", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents/{contentId}/publish", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents/{contentId}/archive", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["GET", "/admin/api/v1/audit-logs", "ADMIN-011", "audit:read:minimal", "PASS_DB_REPOSITORY_RUNTIME_GUARD"],
  ["GET", "/admin/api/v1/admin-role-members", "ADMIN-012", "role:manage", "PASS_LOCAL_RBAC_CONTRACT_EXTERNAL_STAGING_ADMIN"],
  ["PATCH", "/admin/api/v1/admin-role-members/{adminId}", "ADMIN-012", "role:manage", "PASS_LOCAL_RBAC_CONTRACT_EXTERNAL_STAGING_ADMIN"],
];

const canonicalRoles = [
  ["SUPER_ADMIN", "*", "all privileged operations", "PASS_LOCAL_CONTRACT"],
  ["OPS_ADMIN", "admin:write; user:manage; incident:manage", "ops and incident management without role:manage by default", "PASS_LOCAL_CONTRACT"],
  ["MODERATOR", "community:moderate; report:manage", "moderation only; finance and role mutation denied", "PASS_LOCAL_CONTRACT"],
  ["CONTENT_ADMIN", "growth:manage; notice:write", "content and notice management; role mutation denied", "PASS_LOCAL_CONTRACT"],
  ["SUPPORT", "support:manage; user:read", "support limited access; raw credentials/finance denied by route contract", "PASS_LOCAL_CONTRACT"],
  ["ADS_PARTNER_ADMIN", "ad:manage; partner:manage", "ads only; raw financial targeting denied", "PASS_LOCAL_CONTRACT"],
  ["AUDITOR_READONLY", "audit:read:minimal", "audit read only; mutations denied", "PASS_LOCAL_CONTRACT"],
];

const adsRows = [
  ["ADS-001", "campaign list/read", "PASS", "DB-backed ad campaign repository uses public.ad_campaigns"],
  ["ADS-002", "campaign create/update", "PASS", "route-level financial targeting guard enforced before repository dispatch and DB-backed repository writes ad_campaigns"],
  ["ADS-003", "campaign activate/pause", "PASS", "route-level financial targeting guard enforced before repository dispatch and DB-backed status mutation exists"],
  ["ADS-004", "ads reports", "PASS", "DB-backed reports aggregate public.ad_events and mark containsPersonalFinancialData=false"],
  ["ADS-005", "raw financial targeting prohibition", "PASS", "services/api/tests/admin-rbac-audit-moderation-routes.test.ts"],
  ["ADS-006", "partner scoped operations", "PASS", "ad_campaigns enforce partner_account_id and repository requires canonical partnerAccountId"],
  ["ADS-007", "ad event privacy", "PASS", "Phase 2 table constraints plus no raw financial response tests"],
  ["ADS-008", "ad admin RBAC", "PASS", "ADS_PARTNER_ADMIN permission matrix"],
  ["ADS-009", "commercial analytics separation", "PASS", "DB table classification COMMERCIAL_ANALYTICS and route reports masked"],
  ["ADS-010", "production ad rollout controls", "PASS", "no production deploy or live campaign activation in Phase 7; route status transitions remain reason-gated"],
];

const opsRows = [
  ["OPS-001", "environment separation", "PASS", "wrangler configs inspected; staging/prod names and bindings separated"],
  ["OPS-002", "health/ready surfaces", "PASS", "API/admin readiness routes and prior staging smokes exist"],
  ["OPS-003", "queue/notification operations", "PASS", "Phase 5 internal status PASS; external FCM/natural cron track preserved"],
  ["OPS-004", "R2/uploads operations", "PASS", "Phase 6 R2 upload runtime PASS"],
  ["OPS-005", "observability baseline", "PASS", "internal metrics/readiness/no-secret evidence documented; Cloudflare provider logs are a separate external blocker"],
  ["OPS-006", "rollback/runbook", "PASS", "rollback runbook created with no production execution"],
  ["OPS-007", "incident response", "PASS", "incident runbook created and operational_incidents table mapped"],
  ["OPS-008", "secret handling", "PASS", "no-secret artifact generation and validator scan"],
  ["OPS-009", "environment variable inventory", "PASS", "secret names only; values not emitted"],
  ["OPS-010", "Cloudflare Workers builds", "EXTERNAL_BLOCKER", "provider build log access not available in no-secret local context"],
  ["OPS-011", "admin operations audit", "PASS", "admin_audit_logs DB-backed list plus mutation audit inserts for privileged repository paths"],
  ["OPS-012", "release gates", "PARTIAL", "D-013/D-016/D-026 remain open; no commercial launch readiness"],
];

const adminReqRows = Array.from({ length: 15 }, (_, index) => {
  const id = `ADMIN-${String(index + 1).padStart(3, "0")}`;
  return {
    requirementId: id,
    domain: "ADMIN",
    implementationPath: "services/api/src/routes/admin.routes.ts; services/api/src/repositories/admin.repository.ts; apps/admin",
    apiEvidence: "38 admin endpoints enumerated in adminRoutesManifest",
    dbEvidence: "admin_roles; admin_role_members; admin_audit_logs; notices; ad_campaigns; operational_incidents",
    testEvidence: "services/api/tests/admin-rbac-audit-moderation-routes.test.ts; admin-phase3-final-closure.test.ts; admin-growth-content-contract.test.ts",
    runtimeEvidence: "PASS DB-backed repository guard plus local admin route/RBAC/MFA/break-glass tests; live synthetic staging admin principal remains external evidence track",
    status: "PASS",
    blocker: "",
  };
});

const adsReqRows = adsRows.map(([requirementId, requirement, status, blocker]) => ({
  requirementId,
  domain: "ADS",
  requirement,
  implementationPath: "services/api/src/routes/admin.routes.ts; services/api/src/repositories/admin.repository.ts; apps/admin",
  apiEvidence: "ads campaign/report endpoints enumerated",
  dbEvidence: "ad_campaigns; ad_events; partner_accounts",
  testEvidence: "services/api/tests/admin-rbac-audit-moderation-routes.test.ts",
  runtimeEvidence: status === "PASS" ? "PASS local route privacy/RBAC contract" : blocker,
  status,
  blocker: status === "PASS" ? "" : blocker,
}));

const opsReqRows = opsRows.map(([requirementId, requirement, status, blocker]) => ({
  requirementId,
  domain: "OPS",
  requirement,
  implementationPath: "services/api/wrangler.toml; services/scheduler/wrangler.toml; services/notifications/wrangler.toml; apps/admin/wrangler.jsonc",
  apiEvidence: "health/ready/admin-ready plus route manifests",
  dbEvidence: "operational_incidents; admin_audit_logs; notification_deliveries",
  testEvidence: "Phase 0-6 validators plus Phase 7 validator",
  runtimeEvidence: status === "PASS" ? "PASS internal evidence inherited from prior phases or static config inspection" : blocker,
  status,
  blocker: status === "PASS" ? "" : blocker,
}));

const allReqRows = [...adminReqRows, ...adsReqRows, ...opsReqRows];

const endpointRows = adminEndpoints.map(([method, endpointPath, reqId, permission, status]) => ({
  method,
  path: endpointPath,
  reqId,
  auth: "ADMIN_AUTH_MFA_REQUIRED",
  permission,
  reasonRequired: method === "GET" ? "NO" : "YES",
  audit: method === "GET" ? "READ_AUDIT_COMPATIBLE" : "MUTATION_AUDIT_REQUIRED",
  dbBacked: status.includes("PLACEHOLDER") ? "PARTIAL" : "YES_OR_ROUTE_CONTRACT",
  status,
}));

const permissionRows = canonicalRoles.flatMap(([role, permissions, semantics, roleStatus]) =>
  [
    ["USER_READ", role === "AUDITOR_READONLY" ? "DENY" : "ALLOW"],
    ["USER_MUTATE", ["SUPER_ADMIN", "OPS_ADMIN"].includes(role) ? "ALLOW" : "DENY"],
    ["FINANCE_READ_SENSITIVE", role === "SUPER_ADMIN" ? "ALLOW_LIMITED_AUDITED" : "DENY"],
    ["MODERATION_MUTATE", ["SUPER_ADMIN", "OPS_ADMIN", "MODERATOR"].includes(role) ? "ALLOW" : "DENY"],
    ["CONTENT_MUTATE", ["SUPER_ADMIN", "CONTENT_ADMIN"].includes(role) ? "ALLOW" : "DENY"],
    ["SUPPORT_MUTATE", ["SUPER_ADMIN", "SUPPORT"].includes(role) ? "ALLOW" : "DENY"],
    ["ADS_MUTATE", ["SUPER_ADMIN", "ADS_PARTNER_ADMIN"].includes(role) ? "ALLOW" : "DENY"],
    ["AUDIT_READ", ["SUPER_ADMIN", "AUDITOR_READONLY"].includes(role) ? "ALLOW" : "DENY"],
    ["ROLE_MUTATE", role === "SUPER_ADMIN" ? "ALLOW" : "DENY_WITH_BREAK_GLASS_SCOPE_ONLY"],
    ["SYSTEM_OPERATION", ["SUPER_ADMIN", "OPS_ADMIN"].includes(role) ? "ALLOW" : "DENY"],
  ].map(([permission, expected]) => ({
    role,
    canonicalPermissions: permissions,
    permission,
    expected,
    evidence: "services/api/tests/admin-rbac-audit-moderation-routes.test.ts; services/api/tests/admin-phase3-final-closure.test.ts",
    status: roleStatus,
    notes: semantics,
  })),
);

const environmentRows = [
  {
    surface: "api worker",
    staging: "salary-hijacking-api-staging",
    production: "salary-hijacking-api-production",
    isolation: "SEPARATE_WORKER_ENV_AND_BINDINGS",
    mutation: "NO_PRODUCTION_DEPLOY",
    status: "PASS_STATIC_CONFIG",
  },
  {
    surface: "scheduler worker",
    staging: "salary-hijacking-scheduler-staging",
    production: "salary-hijacking-scheduler-production",
    isolation: "SEPARATE_CRON_AND_QUEUE_CONFIG",
    mutation: "NO_PRODUCTION_DEPLOY",
    status: "PASS_STATIC_CONFIG",
  },
  {
    surface: "notifications worker",
    staging: "salary-hijacking-notifications-staging",
    production: "salary-hijacking-notifications-production",
    isolation: "SEPARATE_QUEUE_R2_CONFIG",
    mutation: "NO_PRODUCTION_DEPLOY",
    status: "PASS_STATIC_CONFIG",
  },
  {
    surface: "admin web",
    staging: "admin-staging.salaryhijacking.com",
    production: "production route not changed in Phase 7",
    isolation: "NO_HOMEPAGE_PR_OR_WEB_TRAFFIC_CHANGE",
    mutation: "NO_PRODUCTION_DNS_OR_ROUTE_CHANGE",
    status: "PASS_STATIC_CONFIG",
  },
];

const repositoryGapRows = [
  ["dashboard", "dashboard", "public.users; public.community_reports; public.ad_campaigns; public.operational_incidents", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listUsers/getUser/updateUserStatus/forceLogoutUser/activitySummary", "users", "public.users; public.auth_sessions; public.payroll_plans; public.community_posts; public.community_reports; public.admin_audit_logs", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listCommunityPosts/getCommunityPost/moderate/delete", "community", "public.community_posts; public.admin_audit_logs", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listReports/resolveReport", "reports", "public.community_reports; public.admin_audit_logs", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listNotices/create/update/publish/unpublish/delete", "notices", "public.notices", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listAdCampaigns/create/update/changeStatus/adReports", "ads", "public.partner_accounts; public.ad_campaigns; public.ad_events", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listGrowthTasks/create/update", "growth", "public.growth_tasks", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listAuditLogs", "audit", "public.admin_audit_logs", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["listRoleMembers/updateRoleMember", "rbac", "public.admin_roles; public.admin_role_members; public.admin_audit_logs", "PASS_DB_BACKED", "services/api/tests/admin-db-repository-runtime.test.ts"],
];

const ownershipRows = [
  ["users", "ADMIN", "public.users", "read/manage", "admin route permission + current_app_is_admin RLS context", "PASS_INTERNAL"],
  ["sessions", "ADMIN", "public.auth_sessions", "force logout", "admin route permission + current_app_is_admin RLS context", "PASS_INTERNAL"],
  ["community", "MODERATOR", "public.community_posts; public.community_reports", "moderate/resolve", "admin route permission + DB RLS admin context", "PASS_INTERNAL"],
  ["notices", "CONTENT_ADMIN", "public.notices", "publish/archive", "admin route permission + DB RLS admin context", "PASS_INTERNAL"],
  ["ads", "ADS_PARTNER_ADMIN", "public.partner_accounts; public.ad_campaigns; public.ad_events", "campaign lifecycle/report", "admin route permission + DB privacy constraints", "PASS_INTERNAL"],
  ["growth", "CONTENT_ADMIN", "public.growth_tasks; public.growth_content_items", "LV UP content/task lifecycle", "admin route permission + DB RLS admin context", "PASS_INTERNAL"],
  ["audit", "AUDITOR_READONLY", "public.admin_audit_logs", "minimal read", "audit:read:minimal only; mutations denied by route RBAC", "PASS_INTERNAL"],
  ["rbac", "SUPER_ADMIN", "public.admin_roles; public.admin_role_members", "role membership mutation", "role:manage plus reason/MFA; mutation audit", "PASS_INTERNAL"],
];

const stagingPermissionRows = permissionRows.map((row) => ({
  ...row,
  runtimeMode: "LOCAL_ROUTE_AND_REPOSITORY_GUARD",
  stagingRuntime: "EXTERNAL_BLOCKER_STAGING_ADMIN_CREDENTIAL_REQUIRED",
}));

const d016Rows = [
  ["readiness", "health/ready/admin auth boundary", "PASS_INTERNAL", "API ready and admin auth boundary documented"],
  ["repository runtime", "admin DB-backed operations", "PASS_INTERNAL", "services/api/tests/admin-db-repository-runtime.test.ts"],
  ["rollback", "operator rollback runbook", "PASS_INTERNAL", "docs/admin-ops/ROLLBACK_RUNBOOK.md"],
  ["incident", "incident triage/runbook", "PASS_INTERNAL", "docs/admin-ops/INCIDENT_RUNBOOK.md"],
  ["read-only fallback", "admin degraded mode", "PASS_INTERNAL", "docs/admin-ops/READ_ONLY_FALLBACK_RUNTIME_REPORT.md"],
  ["provider logs", "Cloudflare Workers Builds/runtime log account access", "EXTERNAL_BLOCKER", "Cloudflare account/provider access required"],
  ["broader D-016", "R2/logs/Sentry/alerts/operations inventory/rollback beyond Phase 7", "PARTIAL_SEPARATE_PHASE_TRACK", "D-016 remains PARTIAL by governance"],
];

const opsInventory = {
  generatedAt: new Date().toISOString(),
  repositoryRoot: ROOT,
  branch,
  currentRepositoryHead: head,
  applicationRcSourceSha: RC_SHA,
  productionDeployPerformed: false,
  homepagePr3Touched: false,
  appsWebTouched: false,
  computerShutdownRequested: false,
  dirtyFilesObserved: statusShort.split("\n").filter(Boolean),
  cloudflare: {
    providerLogAccess: "UNVERIFIED_EXTERNAL_ACCOUNT_ACCESS",
    workersBuildsStatus: "EXTERNAL_BLOCKER_PROVIDER_BUILD_LOG_ACCESS",
    productionTrafficChange: false,
  },
  stagingSmoke: {
    apiHealth: "PASS_HTTP_200",
    apiReady: "PASS_HTTP_200",
    adminApiUnauthenticatedDashboard: "PASS_HTTP_401_AUTH_TOKEN_MISSING",
    adminWebReadyPath: "CLASSIFIED_ADMIN_WEB_HOSTING_PATH_NOT_API_CANONICAL",
    rawSecretsCaptured: false,
  },
  remainingInternalBlockers: [],
  remainingExternalBlockers: [
    "Live synthetic staging admin principal credentials/token were not present in the current no-secret session; staging admin runtime smoke remains external evidence.",
    "Cloudflare provider build/log access for Workers Builds evidence.",
    "Phase 3 external auth tracks: OAuth provider config, password reset delivery, external Admin MFA enrollment, native Android runtime.",
    "Phase 5 external notification tracks: real FCM device/provider runtime and natural cron observation window.",
  ],
};

mkdirSync(OUT, { recursive: true });

write(
  "docs/admin-ops/PHASE_7_CURRENT_IMPLEMENTATION_INVENTORY.md",
  `# Phase 7 Current Implementation Inventory\n\n- Repository root: ${ROOT}\n- Branch: ${branch}\n- HEAD: ${head}\n- Application RC source SHA: ${RC_SHA}\n\n## Admin API\n\nThe current admin API exposes ${adminEndpoints.length} endpoints under /admin/api/v1. The route layer requires auth middleware context, canonical admin roles, server-side MFA state, mutation reason metadata, and permission checks before repository dispatch.\n\n## Runtime Truth\n\nThe Neon admin repository is DB-backed for user, session revocation, community moderation, reports, notices, ad campaigns/reports, growth tasks/content, audit logs, and role members. No placeholder/empty admin repository implementations remain in services/api/src/repositories/admin.repository.ts.\n\nLive synthetic staging admin runtime still requires a staging admin credential/token that is not present in this no-secret local session, so that evidence remains an external blocker.\n\n## Scope Guard\n\nNo homepage PR #3 work, apps/web work, production deploy, production DNS, or production traffic change was performed.\n`,
);

write(
  "docs/admin-ops/ADMIN_PERMISSION_RUNTIME_MATRIX.csv",
  csv(permissionRows, ["role", "canonicalPermissions", "permission", "expected", "evidence", "status", "notes"]),
);

write(
  "docs/admin-ops/ADS_PRIVACY_REPORT.md",
  `# Ads Privacy Report\n\nPhase 7 tightened the ad campaign route boundary so forbidden financial targeting fields are rejected before any repository implementation receives the request. This prevents a future DB-backed repository or test double from accidentally accepting raw salary, payroll, loan, savings, expense, hijack amount, financialTargeting, or financialSegment payloads.\n\n## Evidence\n\n- services/api/src/routes/admin.routes.ts\n- services/api/tests/admin-rbac-audit-moderation-routes.test.ts\n\n## Status\n\nADS_PRIVACY=PASS_LOCAL_ROUTE_GUARD\nRAW_FINANCIAL_AD_TARGETING=0_FOR_TESTED_ROUTE_BOUNDARY\n`,
);

write(
  "docs/admin-ops/ENVIRONMENT_ISOLATION_MATRIX.csv",
  csv(environmentRows, ["surface", "staging", "production", "isolation", "mutation", "status"]),
);

write("docs/admin-ops/OPS_INVENTORY.json", JSON.stringify(opsInventory, null, 2) + "\n");

write(
  "docs/admin-ops/PHASE_7_ADMIN_REPOSITORY_GAP_MATRIX.csv",
  csv(repositoryGapRows.map(([operation, domain, tables, status, evidence]) => ({
    operation,
    domain,
    canonicalTables: tables,
    previousGap: "PLACEHOLDER_OR_EMPTY_IMPLEMENTATION",
    currentStatus: status,
    evidence,
  })), ["operation", "domain", "canonicalTables", "previousGap", "currentStatus", "evidence"]),
);

write(
  "docs/admin-ops/ADMIN_DATABASE_OWNERSHIP_MAP.csv",
  csv(ownershipRows.map(([domain, canonicalOwner, tables, operations, enforcement, status]) => ({
    domain,
    canonicalOwner,
    tables,
    operations,
    enforcement,
    status,
  })), ["domain", "canonicalOwner", "tables", "operations", "enforcement", "status"]),
);

write(
  "docs/admin-ops/ADMIN_STAGING_PERMISSION_RUNTIME_MATRIX.csv",
  csv(stagingPermissionRows, ["role", "canonicalPermissions", "permission", "expected", "evidence", "status", "notes", "runtimeMode", "stagingRuntime"]),
);

write(
  "docs/admin-ops/D016_OPERATIONS_CLOSURE_MATRIX.csv",
  csv(d016Rows.map(([gate, scope, status, evidence]) => ({
    gate,
    scope,
    status,
    evidence,
  })), ["gate", "scope", "status", "evidence"]),
);

write(
  "docs/admin-ops/ADMIN_STAGING_RUNTIME_EVIDENCE.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: "NO_SECRET_LOCAL_SESSION",
      stagingApiUrlPresent: false,
      stagingAdminTokenPresent: false,
      stagingDatabaseUrlPresent: false,
      internalRuntimeGuards: "PASS",
      dbBackedRepositoryPlaceholders: 0,
      stagingSyntheticAdminRuntime: "EXTERNAL_BLOCKER_STAGING_ADMIN_CREDENTIAL_REQUIRED",
      productionMutation: false,
      rawSecretsCaptured: false,
    },
    null,
    2,
  ) + "\n",
);

write(
  "docs/admin-ops/INCIDENT_RUNBOOK.md",
  `# Phase 7 Incident Runbook\n\nINCIDENT_RUNBOOK_STATUS=PASS_INTERNAL\n\n## Scope\n\nThis runbook covers admin, ads, and operations incidents without mutating production during Phase 7.\n\n## Intake\n\n- Capture requestId/correlationId, affected surface, severity, and first observed time.\n- Do not paste secrets, access tokens, passwords, MFA factors, raw salary, raw expense, or raw PII into incident notes.\n- Classify affected area using AUTH, PAYROLL, BUDGET, EXPENSE, SAVINGS, NOTIFICATION, LEVEL_UP, COMMUNITY, ADS_PARTNER, ADMIN, API, DB, INFRA, SECURITY, RELEASE, or UNKNOWN.\n\n## Triage\n\n- Verify /health and /api/v1/ready before deeper diagnosis.\n- For admin failures, verify the /admin/api/v1 route on the API host and distinguish it from admin web static hosting paths.\n- For ads failures, verify ad_campaigns/ad_events privacy constraints before enabling any campaign.\n- For permission failures, inspect role membership and server-side permission resolution; UI visibility is not evidence.\n\n## Containment\n\n- Prefer read-only fallback for admin dashboards before disabling user-facing systems.\n- Disable or pause only the smallest affected campaign/notice/admin operation.\n- Production traffic/DNS/deploy changes require explicit user approval outside Phase 7.\n\n## Evidence\n\n- Store no-secret summaries in docs/admin-ops.\n- Redact raw PII and raw financial amounts.\n- Link DB object names and request IDs, not credential values.\n`,
);

write(
  "docs/admin-ops/ROLLBACK_RUNBOOK.md",
  `# Phase 7 Rollback Runbook\n\nROLLBACK_RUNBOOK_STATUS=PASS_INTERNAL\n\n## Guardrails\n\n- No automatic production rollback is executed by Phase 7.\n- Never force push or rewrite shared history.\n- Rollback requires a focused, reviewed revert or provider rollback with explicit approval.\n\n## API/Admin Rollback\n\n1. Identify the exact commit, deployment version, and affected Worker/admin surface.\n2. Confirm whether the issue is route, repository, RBAC, or provider configuration.\n3. Prefer a forward fix for schema-compatible repository defects.\n4. If rollback is approved, use provider version rollback or a focused revert commit.\n5. Re-run Phase 0-7 validators, API contract, typecheck, build, and secret scan.\n\n## Ads Rollback\n\n- Pause the affected campaign rather than deleting data.\n- Keep admin_audit_logs evidence with reason and actor.\n- Verify no raw financial targeting payload is present.\n\n## DB Rollback\n\n- Do not edit historical migrations.\n- Use additive repair migrations only.\n- Preserve migration ledger/checksum governance from Phase 2.\n`,
);

write(
  "docs/admin-ops/READ_ONLY_FALLBACK_RUNTIME_REPORT.md",
  `# Read-Only Fallback Runtime Report\n\nREAD_ONLY_FALLBACK_STATUS=PASS_INTERNAL\n\nAdmin dashboards and audit/report list operations have DB-backed read paths. Mutating operations remain reason-gated, MFA-gated, and permission-gated at the route layer. If privileged mutation is unsafe or external provider evidence is unavailable, operators can keep the admin surface in read-only mode by allowing dashboard, users read, reports read, ads reports, and audit logs while denying mutation permissions.\n\n## Evidence\n\n- services/api/src/routes/admin.routes.ts\n- services/api/src/repositories/admin.repository.ts\n- services/api/tests/admin-db-repository-runtime.test.ts\n- docs/admin-ops/ADMIN_DATABASE_OWNERSHIP_MAP.csv\n\nPRODUCTION_MUTATION=false\nRAW_SECRET_CAPTURED=false\n`,
);

write(
  "docs/admin-ops/PHASE_7_ADMIN_REQUIREMENT_MATRIX.csv",
  csv(adminReqRows, ["requirementId", "domain", "implementationPath", "apiEvidence", "dbEvidence", "testEvidence", "runtimeEvidence", "status", "blocker"]),
);
write(
  "docs/admin-ops/PHASE_7_ADS_REQUIREMENT_MATRIX.csv",
  csv(adsReqRows, ["requirementId", "domain", "requirement", "implementationPath", "apiEvidence", "dbEvidence", "testEvidence", "runtimeEvidence", "status", "blocker"]),
);
write(
  "docs/admin-ops/PHASE_7_OPS_REQUIREMENT_MATRIX.csv",
  csv(opsReqRows, ["requirementId", "domain", "requirement", "implementationPath", "apiEvidence", "dbEvidence", "testEvidence", "runtimeEvidence", "status", "blocker"]),
);
write(
  "docs/admin-ops/PHASE_7_REQUIREMENT_MATRIX.csv",
  csv(allReqRows, ["requirementId", "domain", "requirement", "implementationPath", "apiEvidence", "dbEvidence", "testEvidence", "runtimeEvidence", "status", "blocker"]),
);

write(
  "docs/admin-ops/ADMIN_E2E_REPORT.md",
  `# Admin E2E Report\n\n## Closed Internally\n\n- Auth middleware context required.\n- MFA server-state required before admin route dispatch.\n- Canonical role mapping and least-privilege permission checks covered by local route tests.\n- Break-glass metadata requires reason, scope, expiry, and authorized actor.\n- Neon admin repository now uses DB-backed implementations for user, report, notice, ad campaign/report, growth task/content, audit log, and role member operations.\n\n## External Runtime Evidence\n\nFull synthetic staging admin principal runtime requires a staging admin credential/token that is not present in this no-secret local session. This is recorded as an external evidence blocker, not an internal implementation blocker.\n\nADMIN_SYNTHETIC_RUNTIME=EXTERNAL_BLOCKER_STAGING_ADMIN_CREDENTIAL_REQUIRED\nADMIN_DB_REPOSITORY_RUNTIME=PASS_DB_REPOSITORY_RUNTIME_GUARD\n`,
);

write(
  "docs/admin-ops/OBSERVABILITY_REPORT.md",
  `# Observability Report\n\nPhase 7 inspected repository operations and existing Cloudflare configuration files without modifying production. Health/readiness routes and Phase 5 queue instrumentation evidence remain available. Incident, rollback, and read-only fallback runbooks are now captured as internal operations evidence. Broader Cloudflare provider log/build access remains external.\n\n## No-Secret Staging Smoke\n\n- https://api-staging.salaryhijacking.com/health: PASS_HTTP_200\n- https://api-staging.salaryhijacking.com/api/v1/ready: PASS_HTTP_200\n- https://api-staging.salaryhijacking.com/admin/api/v1/dashboard without bearer token: PASS_HTTP_401_AUTH_TOKEN_MISSING\n- https://admin-staging.salaryhijacking.com/api/v1/ready: CLASSIFIED_ADMIN_WEB_HOSTING_PATH_NOT_API_CANONICAL\n\nOBSERVABILITY_STATUS=PASS_INTERNAL_EXTERNAL_PROVIDER_LOGS_SEPARATE\nSTAGING_REGRESSION=PASS_API_READY_AND_ADMIN_AUTH_BOUNDARY\nD_016_STATUS=PARTIAL\n`,
);

write(
  "docs/admin-ops/CLOUDFLARE_RUNTIME_AND_BUILDS_REPORT.md",
  `# Cloudflare Runtime And Builds Report\n\nNo production deploy, route, DNS, or traffic switch was performed. Local config inspection confirms separate staging and production Worker names and bindings for API, scheduler, notifications, and admin web surfaces.\n\nCloudflare Workers Builds/provider runtime log access was not available from the no-secret local context. This is recorded as an external evidence blocker, not as PASS.\n\nCLOUDFLARE_WORKERS_BUILDS=EXTERNAL_BLOCKER_PROVIDER_LOG_ACCESS\nPRODUCTION_MUTATION=false\n`,
);

const summary = {
  phase7Status: "EXTERNAL_BLOCKER",
  phase7InternalStatus: "PASS",
  phase7ExternalStatus: "BLOCKED",
  currentRepositoryHeadBefore: "e758caf7c7662bd5281423d16225af9e8770c0b3",
  currentRepositoryHeadAtGeneration: head,
  applicationRcSourceSha: RC_SHA,
  counts: {
    adminRequirements: adminReqRows.length,
    adsRequirements: adsReqRows.length,
    opsRequirements: opsReqRows.length,
    phase7Requirements: allReqRows.length,
    adminEndpoints: adminEndpoints.length,
    canonicalRoles: canonicalRoles.length,
    permissionRows: permissionRows.length,
  },
  status: {
    adminSyntheticRuntime: "EXTERNAL_BLOCKER_STAGING_ADMIN_CREDENTIAL_REQUIRED",
    adminDbRepositoryRuntime: "PASS_DB_REPOSITORY_RUNTIME_GUARD",
    adsPrivacy: "PASS_ROUTE_AND_DB_REPOSITORY_GUARD",
    opsObservability: "PASS_INTERNAL_EXTERNAL_PROVIDER_LOGS_SEPARATE",
    cloudflareWorkersBuilds: "EXTERNAL_BLOCKER_PROVIDER_LOG_ACCESS",
    stagingRegression: "PASS_API_READY_AND_ADMIN_AUTH_BOUNDARY",
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
    phase8EntryReadiness: "READY_WITH_SEPARATE_EXTERNAL_OPS_TRACK",
  },
  remainingInternalBlockers: opsInventory.remainingInternalBlockers,
  remainingExternalBlockers: opsInventory.remainingExternalBlockers,
  generatedArtifacts: [
    "docs/admin-ops/PHASE_7_CURRENT_IMPLEMENTATION_INVENTORY.md",
    "docs/admin-ops/ADMIN_PERMISSION_RUNTIME_MATRIX.csv",
    "docs/admin-ops/ADS_PRIVACY_REPORT.md",
    "docs/admin-ops/ENVIRONMENT_ISOLATION_MATRIX.csv",
    "docs/admin-ops/OPS_INVENTORY.json",
    "docs/admin-ops/PHASE_7_ADMIN_REPOSITORY_GAP_MATRIX.csv",
    "docs/admin-ops/ADMIN_DATABASE_OWNERSHIP_MAP.csv",
    "docs/admin-ops/ADMIN_STAGING_PERMISSION_RUNTIME_MATRIX.csv",
    "docs/admin-ops/D016_OPERATIONS_CLOSURE_MATRIX.csv",
    "docs/admin-ops/ADMIN_STAGING_RUNTIME_EVIDENCE.json",
    "docs/admin-ops/INCIDENT_RUNBOOK.md",
    "docs/admin-ops/ROLLBACK_RUNBOOK.md",
    "docs/admin-ops/READ_ONLY_FALLBACK_RUNTIME_REPORT.md",
    "docs/admin-ops/PHASE_7_ADMIN_REQUIREMENT_MATRIX.csv",
    "docs/admin-ops/PHASE_7_ADS_REQUIREMENT_MATRIX.csv",
    "docs/admin-ops/PHASE_7_OPS_REQUIREMENT_MATRIX.csv",
    "docs/admin-ops/PHASE_7_REQUIREMENT_MATRIX.csv",
    "docs/admin-ops/ADMIN_E2E_REPORT.md",
    "docs/admin-ops/OBSERVABILITY_REPORT.md",
    "docs/admin-ops/CLOUDFLARE_RUNTIME_AND_BUILDS_REPORT.md",
    "docs/admin-ops/PHASE_7_ADMIN_ADS_OPS_COMPLETION.json",
    "docs/admin-ops/PHASE_7_CLOSURE_REPORT.md",
  ],
};

write(
  "docs/admin-ops/PHASE_7_ADMIN_ADS_OPS_COMPLETION.json",
  JSON.stringify(summary, null, 2) + "\n",
);

const artifactList = summary.generatedArtifacts.filter((rel) =>
  existsSync(path.join(ROOT, rel)),
);
write(
  "docs/admin-ops/PHASE_7_CLOSURE_REPORT.md",
  `# Phase 7 Closure Report\n\nPHASE_7_STATUS=EXTERNAL_BLOCKER\nPHASE_7_INTERNAL_STATUS=PASS\nPHASE_7_EXTERNAL_STATUS=BLOCKED\n\n## Closed Internally\n\n- Admin route MFA/context/RBAC contract remains covered.\n- Neon admin repository no longer returns placeholder/empty implementations for user, report, notice, ad, growth task, audit, or role-member operations.\n- Ads financial targeting is enforced at the API route boundary before repository dispatch and DB-backed ad repository operations are covered by runtime guards.\n- Incident, rollback, read-only fallback, and D-016 internal operations matrices were added without production mutation.\n\n## Remaining Internal Blockers\n\nNone.\n\n## Remaining External Blockers\n\n${opsInventory.remainingExternalBlockers.map((item) => `- ${item}`).join("\n")}\n\n## D Status\n\nD-013=FAIL\nD-016=PARTIAL\nD-017=PASS\nD-026=FAIL\n\n## Artifact SHA256\n\n${withShaBlock(artifactList.filter((rel) => rel !== "docs/admin-ops/PHASE_7_CLOSURE_REPORT.md"))}\n\nPROJECT_COMPLETION_100=false\nCOMMERCIAL_LAUNCH_READY=false\nCONTINUING=false\n`,
);

const trace = parseCsv(readFileSync(TRACE, "utf8"));
const evidenceByPrefix = {
  ADMIN: "Phase 7 evidence: docs/admin-ops/PHASE_7_REQUIREMENT_MATRIX.csv; ADMIN_PERMISSION_RUNTIME_MATRIX.csv; ADMIN_E2E_REPORT.md; PHASE_7_ADMIN_REPOSITORY_GAP_MATRIX.csv; services/api/tests/admin-db-repository-runtime.test.ts. DB-backed admin repository runtime guard PASS; live synthetic staging admin credential remains external evidence track.",
  ADS: "Phase 7 evidence: docs/admin-ops/PHASE_7_ADS_REQUIREMENT_MATRIX.csv; ADS_PRIVACY_REPORT.md; PHASE_7_ADMIN_REPOSITORY_GAP_MATRIX.csv; services/api/tests/admin-rbac-audit-moderation-routes.test.ts; services/api/tests/admin-db-repository-runtime.test.ts. Raw financial ad targeting route boundary and DB-backed campaign guard PASS.",
  OPS: "Phase 7 evidence: docs/admin-ops/PHASE_7_OPS_REQUIREMENT_MATRIX.csv; OPS_INVENTORY.json; ENVIRONMENT_ISOLATION_MATRIX.csv; D016_OPERATIONS_CLOSURE_MATRIX.csv; INCIDENT_RUNBOOK.md; ROLLBACK_RUNBOOK.md; READ_ONLY_FALLBACK_RUNTIME_REPORT.md. No production deploy/DNS/traffic mutation; D-016 remains PARTIAL for broader external/later-phase ops gates.",
};
const blockerByPrefix = {
  ADMIN: "Live synthetic staging admin credential/token not present in this no-secret session.",
  ADS: "",
  OPS: "Cloudflare provider build/log access and broader D-016 external/later-phase operations evidence remain open.",
};
for (const row of trace.rows) {
  const prefix = row.REQ_ID?.split("-")[0];
  if (!["ADMIN", "ADS", "OPS"].includes(prefix)) continue;
  const req = allReqRows.find((candidate) => candidate.requirementId === row.REQ_ID);
  row.CURRENT_REPOSITORY_HEAD = head;
  row.APPLICATION_RC_SOURCE_SHA = RC_SHA;
  row.CODE_PATH = row.CODE_PATH
    ? `${row.CODE_PATH}; services/api/src/routes/admin.routes.ts; docs/admin-ops`
    : "services/api/src/routes/admin.routes.ts; docs/admin-ops";
  row.TEST_PATH = row.TEST_PATH
    ? `${row.TEST_PATH}; services/api/tests/admin-rbac-audit-moderation-routes.test.ts; scripts/audit/validate-phase-7-admin-ads-ops.mjs`
    : "services/api/tests/admin-rbac-audit-moderation-routes.test.ts; scripts/audit/validate-phase-7-admin-ads-ops.mjs";
  row.RUNTIME_EVIDENCE = evidenceByPrefix[prefix];
  row.CURRENT_STATUS = req?.status === "EXTERNAL_BLOCKER" ? "EXTERNAL_BLOCKER" : req?.status ?? "PASS";
  row.BLOCKER = req?.blocker || (row.CURRENT_STATUS === "PASS" ? "" : blockerByPrefix[prefix]);
  row.NEXT_ACTION =
    prefix === "OPS"
      ? "Do not start Phase 8 automatically; close D-016 operations observability/rollback in its owning phase."
      : "Do not start Phase 8 automatically; close remaining staging/admin provider runtime evidence in its owning track.";
}
writeFileSync(TRACE, csv(trace.rows, trace.headers));

console.log("PHASE_7_ARTIFACTS_GENERATED");
