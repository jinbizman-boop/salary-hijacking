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
  ["GET", "/admin/api/v1/users", "ADMIN-002", "user:read/user:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["GET", "/admin/api/v1/users/{userId}", "ADMIN-002", "user:read/user:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/users/{userId}/suspend", "ADMIN-003", "user:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/users/{userId}/restore", "ADMIN-003", "user:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/users/{userId}/force-logout", "ADMIN-004", "user:manage", "PASS_ROUTE_CONTRACT_AUTH_PHASE3"],
  ["GET", "/admin/api/v1/users/{userId}/activity-summary", "ADMIN-005", "user:read/community:read", "PASS_LOCAL_ROUTE_CONTRACT_MASKED"],
  ["GET", "/admin/api/v1/community/posts", "ADMIN-006", "community:read/community:moderate", "PASS_PHASE6_BACKED"],
  ["GET", "/admin/api/v1/community/posts/{postId}", "ADMIN-006", "community:read/community:moderate", "PASS_PHASE6_BACKED"],
  ["POST", "/admin/api/v1/community/posts/{postId}/hide", "ADMIN-007", "community:moderate", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["POST", "/admin/api/v1/community/posts/{postId}/restore", "ADMIN-007", "community:moderate", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["DELETE", "/admin/api/v1/community/posts/{postId}", "ADMIN-007", "community:moderate/admin:write", "PASS_LOCAL_ROUTE_CONTRACT"],
  ["GET", "/admin/api/v1/reports", "ADMIN-008", "report:read/report:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/reports/{reportId}/resolve", "ADMIN-008", "report:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["GET", "/admin/api/v1/notices", "ADMIN-009", "notice:read/notice:write", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/notices", "ADMIN-009", "notice:write", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["PATCH", "/admin/api/v1/notices/{noticeId}", "ADMIN-009", "notice:write", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/notices/{noticeId}/publish", "ADMIN-009", "notice:write", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/notices/{noticeId}/unpublish", "ADMIN-009", "notice:write", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["DELETE", "/admin/api/v1/notices/{noticeId}", "ADMIN-009", "notice:write", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["GET", "/admin/api/v1/ads/campaigns", "ADS-001", "ad:read/ad:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/ads/campaigns", "ADS-002", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["PATCH", "/admin/api/v1/ads/campaigns/{campaignId}", "ADS-002", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["POST", "/admin/api/v1/ads/campaigns/{campaignId}/activate", "ADS-003", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["POST", "/admin/api/v1/ads/campaigns/{campaignId}/pause", "ADS-003", "ad:manage", "PASS_LOCAL_ROUTE_PRIVACY_GUARD"],
  ["GET", "/admin/api/v1/ads/reports", "ADS-004", "ad:read/ad:manage", "PASS_LOCAL_ROUTE_MASKED"],
  ["GET", "/admin/api/v1/growth/tasks", "ADMIN-010", "growth:read/growth:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["POST", "/admin/api/v1/growth/tasks", "ADMIN-010", "growth:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["PATCH", "/admin/api/v1/growth/tasks/{taskId}", "ADMIN-010", "growth:manage", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
  ["GET", "/admin/api/v1/growth/contents", "ADMIN-010", "growth:read/growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["PATCH", "/admin/api/v1/growth/contents/{contentId}", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents/{contentId}/review", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents/{contentId}/publish", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["POST", "/admin/api/v1/growth/contents/{contentId}/archive", "ADMIN-010", "growth:manage", "PASS_DB_REPOSITORY_GROWTH_CONTENT"],
  ["GET", "/admin/api/v1/audit-logs", "ADMIN-011", "audit:read:minimal", "PARTIAL_DB_REPOSITORY_PLACEHOLDER"],
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
  ["ADS-001", "campaign list/read", "PARTIAL", "DB-backed ad campaign repository remains placeholder for staging runtime"],
  ["ADS-002", "campaign create/update", "PASS", "route-level financial targeting guard enforced before repository dispatch"],
  ["ADS-003", "campaign activate/pause", "PASS", "route-level financial targeting guard enforced before repository dispatch"],
  ["ADS-004", "ads reports", "PASS", "local route reports mark containsPersonalFinancialData=false"],
  ["ADS-005", "raw financial targeting prohibition", "PASS", "services/api/tests/admin-rbac-audit-moderation-routes.test.ts"],
  ["ADS-006", "partner scoped operations", "PARTIAL", "partner account DB runtime not exercised with synthetic staging principal"],
  ["ADS-007", "ad event privacy", "PASS", "Phase 2 table constraints plus no raw financial response tests"],
  ["ADS-008", "ad admin RBAC", "PASS", "ADS_PARTNER_ADMIN permission matrix"],
  ["ADS-009", "commercial analytics separation", "PASS", "DB table classification COMMERCIAL_ANALYTICS and route reports masked"],
  ["ADS-010", "production ad rollout controls", "PARTIAL", "no production deploy or live campaign activation in Phase 7"],
];

const opsRows = [
  ["OPS-001", "environment separation", "PASS", "wrangler configs inspected; staging/prod names and bindings separated"],
  ["OPS-002", "health/ready surfaces", "PASS", "API/admin readiness routes and prior staging smokes exist"],
  ["OPS-003", "queue/notification operations", "PASS", "Phase 5 internal status PASS; external FCM/natural cron track preserved"],
  ["OPS-004", "R2/uploads operations", "PASS", "Phase 6 R2 upload runtime PASS"],
  ["OPS-005", "observability baseline", "PARTIAL", "Cloudflare provider runtime logs/build details require account access"],
  ["OPS-006", "rollback/runbook", "PARTIAL", "deployment rollback command inventory documented; no live rollback rehearsal"],
  ["OPS-007", "incident response", "PARTIAL", "operational_incidents table exists; full runbook/Sentry/alert flow later"],
  ["OPS-008", "secret handling", "PASS", "no-secret artifact generation and validator scan"],
  ["OPS-009", "environment variable inventory", "PASS", "secret names only; values not emitted"],
  ["OPS-010", "Cloudflare Workers builds", "EXTERNAL_BLOCKER", "provider build log access not available in no-secret local context"],
  ["OPS-011", "admin operations audit", "PARTIAL", "route audit middleware compatible; repository persistence incomplete for many admin ops"],
  ["OPS-012", "release gates", "PARTIAL", "D-013/D-016/D-026 remain open; no commercial launch readiness"],
];

const adminReqRows = Array.from({ length: 15 }, (_, index) => {
  const id = `ADMIN-${String(index + 1).padStart(3, "0")}`;
  const passIds = new Set(["ADMIN-004", "ADMIN-006", "ADMIN-007", "ADMIN-010", "ADMIN-012", "ADMIN-013", "ADMIN-014", "ADMIN-015"]);
  return {
    requirementId: id,
    domain: "ADMIN",
    implementationPath: "services/api/src/routes/admin.routes.ts; services/api/src/repositories/admin.repository.ts; apps/admin",
    apiEvidence: "38 admin endpoints enumerated in adminRoutesManifest",
    dbEvidence: "admin_roles; admin_role_members; admin_audit_logs; notices; ad_campaigns; operational_incidents",
    testEvidence: "services/api/tests/admin-rbac-audit-moderation-routes.test.ts; admin-phase3-final-closure.test.ts; admin-growth-content-contract.test.ts",
    runtimeEvidence: passIds.has(id) ? "PASS local route/runtime contract; Phase 6 growth content staging where applicable" : "PARTIAL DB-backed staging admin runtime not available",
    status: passIds.has(id) ? "PASS" : "PARTIAL",
    blocker: passIds.has(id) ? "" : "Synthetic staging admin principal plus DB-backed repository implementation/runtime evidence required",
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
    adminWebReadyPath: "UNVERIFIED_HTTP_404_ON_ADMIN_STAGING_DOMAIN",
    rawSecretsCaptured: false,
  },
  remainingInternalBlockers: [
    "DB-backed admin repository still returns placeholder/empty implementations for several user, report, notice, ad, role-member operations.",
    "Live synthetic staging admin principal was not available in local no-secret context, so full admin staging runtime is not closed.",
    "Operations runbook/rollback/incident observability evidence remains partial and belongs to broader D-016 closure.",
  ],
  remainingExternalBlockers: [
    "Cloudflare provider build/log access for Workers Builds evidence.",
    "Phase 3 external auth tracks: OAuth provider config, password reset delivery, external Admin MFA enrollment, native Android runtime.",
    "Phase 5 external notification tracks: real FCM device/provider runtime and natural cron observation window.",
  ],
};

mkdirSync(OUT, { recursive: true });

write(
  "docs/admin-ops/PHASE_7_CURRENT_IMPLEMENTATION_INVENTORY.md",
  `# Phase 7 Current Implementation Inventory\n\n- Repository root: ${ROOT}\n- Branch: ${branch}\n- HEAD: ${head}\n- Application RC source SHA: ${RC_SHA}\n\n## Admin API\n\nThe current admin API exposes ${adminEndpoints.length} endpoints under /admin/api/v1. The route layer requires auth middleware context, canonical admin roles, server-side MFA state, mutation reason metadata, and permission checks before repository dispatch.\n\n## Runtime Truth\n\nGrowth content admin operations have DB-backed repository coverage. Several admin/ads/ops operations remain placeholder-backed in services/api/src/repositories/admin.repository.ts and cannot be truthfully promoted to full staging runtime PASS in this phase.\n\n## Scope Guard\n\nNo homepage PR #3 work, apps/web work, production deploy, production DNS, or production traffic change was performed.\n`,
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
  `# Admin E2E Report\n\n## Closed Internally\n\n- Auth middleware context required.\n- MFA server-state required before admin route dispatch.\n- Canonical role mapping and least-privilege permission checks covered by local route tests.\n- Break-glass metadata requires reason, scope, expiry, and authorized actor.\n\n## Not Closed\n\nFull synthetic staging admin principal runtime was not available in the local no-secret context. DB-backed repository operations for users/reports/notices/ads/role members remain partial.\n\nADMIN_SYNTHETIC_RUNTIME=EXTERNAL_BLOCKER_STAGING_ADMIN_PRINCIPAL_REQUIRED\nADMIN_DB_REPOSITORY_RUNTIME=PARTIAL_PLACEHOLDERS_PRESENT\n`,
);

write(
  "docs/admin-ops/OBSERVABILITY_REPORT.md",
  `# Observability Report\n\nPhase 7 inspected repository operations and existing Cloudflare configuration files without modifying production. Health/readiness routes and Phase 5 queue instrumentation evidence remain available. Broader Sentry/logs/alerts/runbook closure is still part of D-016 and later operations phases.\n\n## No-Secret Staging Smoke\n\n- https://api-staging.salaryhijacking.com/health: PASS_HTTP_200\n- https://api-staging.salaryhijacking.com/api/v1/ready: PASS_HTTP_200\n- https://api-staging.salaryhijacking.com/admin/api/v1/dashboard without bearer token: PASS_HTTP_401_AUTH_TOKEN_MISSING\n- https://admin-staging.salaryhijacking.com/api/v1/ready: UNVERIFIED_HTTP_404_ON_ADMIN_STAGING_DOMAIN\n\nOBSERVABILITY_STATUS=PARTIAL\nSTAGING_REGRESSION=PASS_API_READY_AND_ADMIN_AUTH_BOUNDARY\nD_016_STATUS=PARTIAL\n`,
);

write(
  "docs/admin-ops/CLOUDFLARE_RUNTIME_AND_BUILDS_REPORT.md",
  `# Cloudflare Runtime And Builds Report\n\nNo production deploy, route, DNS, or traffic switch was performed. Local config inspection confirms separate staging and production Worker names and bindings for API, scheduler, notifications, and admin web surfaces.\n\nCloudflare Workers Builds/provider runtime log access was not available from the no-secret local context. This is recorded as an external evidence blocker, not as PASS.\n\nCLOUDFLARE_WORKERS_BUILDS=EXTERNAL_BLOCKER_PROVIDER_LOG_ACCESS\nPRODUCTION_MUTATION=false\n`,
);

const summary = {
  phase7Status: "PARTIAL",
  phase7InternalStatus: "PARTIAL",
  phase7ExternalStatus: "BLOCKED",
  currentRepositoryHeadBefore: "9d37b087933bcb8699506d8a62d4fef63d2c92af",
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
    adminSyntheticRuntime: "EXTERNAL_BLOCKER_STAGING_ADMIN_PRINCIPAL_REQUIRED",
    adminDbRepositoryRuntime: "PARTIAL_PLACEHOLDERS_PRESENT",
    adsPrivacy: "PASS_LOCAL_ROUTE_GUARD",
    opsObservability: "PARTIAL",
    cloudflareWorkersBuilds: "EXTERNAL_BLOCKER_PROVIDER_LOG_ACCESS",
    stagingRegression: "PASS_API_READY_AND_ADMIN_AUTH_BOUNDARY",
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
    phase8EntryReadiness: "NOT_READY",
  },
  remainingInternalBlockers: opsInventory.remainingInternalBlockers,
  remainingExternalBlockers: opsInventory.remainingExternalBlockers,
  generatedArtifacts: [
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
  `# Phase 7 Closure Report\n\nPHASE_7_STATUS=PARTIAL\nPHASE_7_INTERNAL_STATUS=PARTIAL\nPHASE_7_EXTERNAL_STATUS=BLOCKED\n\n## Closed\n\n- Admin route MFA/context/RBAC contract remains covered.\n- Ads financial targeting is now enforced at the API route boundary before repository dispatch.\n- Environment isolation inventory confirms no production deploy/DNS/traffic mutation.\n\n## Remaining Internal Blockers\n\n${opsInventory.remainingInternalBlockers.map((item) => `- ${item}`).join("\n")}\n\n## Remaining External Blockers\n\n${opsInventory.remainingExternalBlockers.map((item) => `- ${item}`).join("\n")}\n\n## Artifact SHA256\n\n${withShaBlock(artifactList.filter((rel) => rel !== "docs/admin-ops/PHASE_7_CLOSURE_REPORT.md"))}\n\nPROJECT_COMPLETION_100=false\nCOMMERCIAL_LAUNCH_READY=false\nCONTINUING=false\n`,
);

const trace = parseCsv(readFileSync(TRACE, "utf8"));
const evidenceByPrefix = {
  ADMIN: "Phase 7 evidence: docs/admin-ops/PHASE_7_REQUIREMENT_MATRIX.csv; ADMIN_PERMISSION_RUNTIME_MATRIX.csv; ADMIN_E2E_REPORT.md; local admin RBAC/MFA/break-glass tests; ads route boundary guard test. DB-backed admin repository runtime remains partial where documented.",
  ADS: "Phase 7 evidence: docs/admin-ops/PHASE_7_ADS_REQUIREMENT_MATRIX.csv; ADS_PRIVACY_REPORT.md; services/api/tests/admin-rbac-audit-moderation-routes.test.ts. Raw financial ad targeting route boundary guard PASS; DB-backed campaign runtime partial where documented.",
  OPS: "Phase 7 evidence: docs/admin-ops/PHASE_7_OPS_REQUIREMENT_MATRIX.csv; OPS_INVENTORY.json; ENVIRONMENT_ISOLATION_MATRIX.csv; CLOUDFLARE_RUNTIME_AND_BUILDS_REPORT.md. No production deploy/DNS/traffic mutation; D-016 remains PARTIAL.",
};
const blockerByPrefix = {
  ADMIN: "DB-backed admin repository runtime and synthetic staging admin principal remain incomplete where applicable.",
  ADS: "DB-backed ads campaign/partner staging runtime remains incomplete where applicable.",
  OPS: "Cloudflare provider build/log access and broader D-016 observability/rollback runbook remain open.",
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
  row.CURRENT_STATUS = req?.status === "EXTERNAL_BLOCKER" ? "EXTERNAL_BLOCKER" : req?.status ?? "PARTIAL";
  row.BLOCKER = req?.blocker || (row.CURRENT_STATUS === "PASS" ? "" : blockerByPrefix[prefix]);
  row.NEXT_ACTION =
    prefix === "OPS"
      ? "Do not start Phase 8 automatically; close D-016 operations observability/rollback in its owning phase."
      : "Do not start Phase 8 automatically; close remaining staging/admin provider runtime evidence in its owning track.";
}
writeFileSync(TRACE, csv(trace.rows, trace.headers));

console.log("PHASE_7_ARTIFACTS_GENERATED");
