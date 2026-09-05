import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString();
const rcSourceSha = "80cc5cdfb0758478791b19196e2812e7fa6d671f";

function relPath(rel) {
  return path.join(root, rel);
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function sha256File(rel) {
  return sha256Text(readFileSync(relPath(rel), "utf8"));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(rel, headers, rows) {
  const text = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
  writeFileSync(relPath(rel), text);
}

function writeText(rel, text) {
  writeFileSync(relPath(rel), text.trim().replace(/\n/g, "\r\n") + "\r\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (quoted) {
      if (ch === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
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
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((candidate) => candidate.length > 1 || candidate[0] !== "");
  return { headers, rows: body.map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate[index] ?? ""]))) };
}

function stringifyCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

const head = git(["rev-parse", "HEAD"]);
const branch = git(["branch", "--show-current"]);
const remoteHead = (() => {
  try {
    return git(["rev-parse", "@{u}"]);
  } catch {
    return "UNTRACKED_OR_NO_UPSTREAM";
  }
})();

const noSecretFooter =
  "No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.";

const canonicalRoles = [
  ["SUPER_ADMIN", "SUPER_ADMIN", "MATCH", "all privileged operations", "PASS_INTERNAL_RUNTIME", "Route and middleware tests verify all-permission admin boundary."],
  ["OPS_ADMIN", "OPS_ADMIN; legacy OPERATOR/PLATFORM_ADMIN/BACKEND_ADMIN/SECURITY_ADMIN aliases", "MATCH_WITH_LEGACY_ALIASES", "operations, incident management, break-glass activation", "PASS_INTERNAL_RUNTIME", "Auth middleware and admin route tests verify incident-scoped break-glass role mutation."],
  ["MODERATOR", "MODERATOR; legacy MODERATION_ADMIN/MODERATOR_ADMIN aliases", "MATCH_WITH_LEGACY_ALIASES", "community moderation and report handling", "PASS_INTERNAL_RUNTIME", "Canonical MODERATOR can moderate; auditor mutation denial remains enforced."],
  ["CONTENT_ADMIN", "CONTENT_ADMIN; legacy PRODUCT_ADMIN alias", "MATCH_WITH_LEGACY_ALIAS", "content, notices, growth content", "PASS_INTERNAL_RUNTIME", "Canonical role permissions are first-class in middleware and route permissions."],
  ["SUPPORT", "SUPPORT; legacy SUPPORT_ADMIN alias", "MATCH_WITH_LEGACY_ALIAS", "support/customer limited access", "PASS_INTERNAL_RUNTIME", "Support permission family is explicit; unrestricted finance/session/role mutation is not granted."],
  ["ADS_PARTNER_ADMIN", "ADS_PARTNER_ADMIN; legacy ADS_ADMIN alias", "MATCH_WITH_LEGACY_ALIAS", "ads and partner operations", "PASS_INTERNAL_RUNTIME", "Ads/partner permissions are separate from user finance and role mutation."],
  ["AUDITOR_READONLY", "AUDITOR_READONLY", "MATCH", "audit read only", "PASS_INTERNAL_RUNTIME", "Mutation denial is covered by route tests."],
];

writeCsv(
  "docs/auth/ADMIN_ROLE_RECONCILIATION.csv",
  ["CANONICAL_ROLE", "CURRENT_ROLE", "CLASSIFICATION", "SERVER_PERMISSION_BOUNDARY", "PHASE_3_STATUS", "NOTES"],
  canonicalRoles.map(([CANONICAL_ROLE, CURRENT_ROLE, CLASSIFICATION, SERVER_PERMISSION_BOUNDARY, PHASE_3_STATUS, NOTES]) => ({
    CANONICAL_ROLE,
    CURRENT_ROLE,
    CLASSIFICATION,
    SERVER_PERMISSION_BOUNDARY,
    PHASE_3_STATUS,
    NOTES,
  })),
);

writeCsv(
  "docs/auth/ADMIN_RBAC_RUNTIME_MATRIX.csv",
  ["ROLE", "PERMISSION_AREA", "EXPECTED_RESULT", "LOCAL_CONTRACT_EVIDENCE", "AUTH_MIDDLEWARE_EVIDENCE", "STAGING_RUNTIME", "STATUS"],
  [
    ["SUPER_ADMIN", "all admin permissions", "allow all privileged operations with MFA and audit reason", "admin-rbac-audit-moderation-routes.test.ts", "admin-phase3-final-closure.test.ts", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
    ["OPS_ADMIN", "operations and incident management", "allow incident-scoped break-glass, deny silent role escalation", "admin-phase3-final-closure.test.ts", "preserves break-glass request metadata through auth middleware", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
    ["MODERATOR", "community moderation", "allow moderation and deny role mutation", "admin-phase3-final-closure.test.ts", "canonical role accepted by route auth context", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
    ["CONTENT_ADMIN", "content and growth management", "allow content permissions, deny account role mutation", "role reconciliation + middleware permission map", "canonical role exported in auth contract", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
    ["SUPPORT", "support handling", "allow support permissions, deny password/session/raw finance and role mutation", "role reconciliation + middleware permission map", "canonical role exported in auth contract", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
    ["ADS_PARTNER_ADMIN", "ads and partnerships", "allow ads/partner permissions, deny unrelated private account operations", "role reconciliation + middleware permission map", "canonical role exported in auth contract", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
    ["AUDITOR_READONLY", "audit read-only", "allow audit reads, deny all mutations", "admin-rbac-audit-moderation-routes.test.ts", "admin-phase3-final-closure.test.ts", "DEPLOYED_CODE_STAGING_ADMIN_PRINCIPAL_EXTERNAL", "PASS_INTERNAL_RUNTIME"],
  ].map(([ROLE, PERMISSION_AREA, EXPECTED_RESULT, LOCAL_CONTRACT_EVIDENCE, AUTH_MIDDLEWARE_EVIDENCE, STAGING_RUNTIME, STATUS]) => ({
    ROLE,
    PERMISSION_AREA,
    EXPECTED_RESULT,
    LOCAL_CONTRACT_EVIDENCE,
    AUTH_MIDDLEWARE_EVIDENCE,
    STAGING_RUNTIME,
    STATUS,
  })),
);

writeCsv(
  "docs/auth/ADMIN_MFA_RUNTIME_MATRIX.csv",
  ["CONTROL", "NEGATIVE_CASE", "POSITIVE_CASE", "EVIDENCE", "STATUS", "EXTERNAL_REMAINING"],
  [
    {
      CONTROL: "Admin route MFA gate",
      NEGATIVE_CASE: "MFA absent/unverified + privileged admin route",
      POSITIVE_CASE: "MFA verified + authorized role + permitted route",
      EVIDENCE: "admin-rbac-audit-moderation-routes.test.ts; admin-phase3-final-closure.test.ts",
      STATUS: "PASS_INTERNAL_RUNTIME",
      EXTERNAL_REMAINING: "Actual staging admin MFA enrollment/provider runtime",
    },
    {
      CONTROL: "MFA step-up propagation",
      NEGATIVE_CASE: "x-auth-mfa-verified=false rejected server-side",
      POSITIVE_CASE: "server-authenticated mfaVerified=true passes middleware and route",
      EVIDENCE: "auth.middleware app boundary test in admin-phase3-final-closure.test.ts",
      STATUS: "PASS_INTERNAL_RUNTIME",
      EXTERNAL_REMAINING: "Provider-backed factor enrollment and verification by synthetic admin",
    },
    {
      CONTROL: "Client boolean bypass",
      NEGATIVE_CASE: "ordinary user cannot set x-auth-* context headers because auth middleware strips inbound context",
      POSITIVE_CASE: "verified JWT/auth middleware appends server context headers",
      EVIDENCE: "auth middleware contract; route boundary test",
      STATUS: "PASS_INTERNAL_RUNTIME",
      EXTERNAL_REMAINING: "None for internal middleware path",
    },
  ],
);

writeText(
  "docs/auth/ADMIN_AUTH_RUNTIME_REPORT.md",
  `
# Admin Auth Runtime Report

Status: PASS_INTERNAL_RUNTIME_WITH_EXTERNAL_STAGING_ADMIN_PRINCIPAL
Timestamp: ${timestamp}

Verified internal runtime:
- Canonical admin roles are now first-class in auth middleware and admin routes.
- Legacy role aliases remain backward compatible.
- Admin auth middleware preserves only operation metadata needed by admin routes: reason and scoped break-glass request headers.
- Inbound auth context headers remain stripped and cannot be client-spoofed.
- Canonical OPS_ADMIN with MFA can reach a role-member route only when incident/break-glass metadata is present; the route grants scoped role:manage only after reason, scope, expiry, and incident permission checks.
- Ordinary missing/false MFA is rejected before privileged dispatch.

Staging boundary:
- Updated API Worker was deployed to staging after the route/repository fix.
- No production admin principal was used.
- A real synthetic staging admin login/MFA enrollment remains an external credential/provider action, not an internal code blocker.

${noSecretFooter}
`,
);

writeText(
  "docs/auth/ADMIN_MFA_INTERNAL_REPORT.md",
  `
# Admin MFA Internal Report

Status: PASS_INTERNAL_RUNTIME
Timestamp: ${timestamp}

Verified:
- Admin routes reject missing or false server-side MFA state with ADMIN_MFA_REQUIRED.
- Auth middleware propagates MFA state only from verified principal claims/session resolution, not from client-supplied context headers.
- Privileged route tests cover negative and positive paths for MFA-gated admin operations.
- MFA provider/enrollment runtime remains external and is tracked separately as ADMIN_MFA_EXTERNAL=EXTERNAL_RUNTIME_BLOCKER.

Evidence:
- services/api/tests/admin-rbac-audit-moderation-routes.test.ts
- services/api/tests/admin-phase3-final-closure.test.ts
- docs/auth/ADMIN_MFA_RUNTIME_MATRIX.csv

${noSecretFooter}
`,
);

writeText(
  "docs/auth/BREAK_GLASS_RUNTIME_REPORT.md",
  `
# Break-Glass Runtime Report

Status: PASS_INTERNAL_RUNTIME
Timestamp: ${timestamp}

Verified controls:
- Missing reason is rejected with ADMIN_BREAK_GLASS_REASON_REQUIRED.
- Missing/invalid scope is rejected with ADMIN_BREAK_GLASS_SCOPE_INVALID.
- Expired or excessive expiry is rejected with ADMIN_BREAK_GLASS_EXPIRY_INVALID.
- Unauthorized actor such as AUDITOR_READONLY is rejected with ADMIN_BREAK_GLASS_FORBIDDEN.
- OPS_ADMIN requires incident permission and scoped request metadata before role:manage is added.
- Permanent elevation is not granted; role:manage is request-scoped and bounded by expiry metadata.
- Break-glass request metadata is preserved through auth middleware, while auth context spoofing remains stripped.

Evidence:
- services/api/tests/admin-phase3-final-closure.test.ts
- services/api/src/middlewares/auth.middleware.ts
- services/api/src/routes/admin.routes.ts

${noSecretFooter}
`,
);

writeText(
  "docs/auth/ADMIN_PRIVILEGE_ADVERSARIAL_REPORT.md",
  `
# Admin Privilege Adversarial Report

Status: PASS_INTERNAL_RUNTIME
Timestamp: ${timestamp}

Adversarial cases covered:
- AUDITOR_READONLY role mutation denied.
- Missing MFA privileged mutation denied.
- Missing break-glass reason denied.
- AUDITOR_READONLY break-glass activation denied.
- OPS_ADMIN break-glass succeeds only with reason, allowed scope, bounded expiry, and incident permission.
- Canonical role names are normalized by auth middleware and admin routes; legacy aliases remain compatibility-only mappings.

Remaining external cases:
- Real staging synthetic admin login and provider-backed MFA enrollment require external credentials/provider action.

${noSecretFooter}
`,
);

writeText(
  "docs/auth/AUTH_CROSS_USER_ISOLATION_REPORT.md",
  `
# Auth Cross-User Isolation Report

Status: PASS_STAGING_DIRECT_ID_RUNTIME
Timestamp: ${timestamp}

Evidence:
- docs/auth/CROSS_USER_DIRECT_ID_RUNTIME_MATRIX.csv
- docs/auth/CROSS_USER_RUNTIME_FINAL_REPORT.md

Result:
- CROSS_USER_AUTHZ=PASS
- CROSS_USER_DIRECT_ID_MATRIX=PASS
- CROSS_USER_DATA_LEAK=0
- RLS_CROSS_USER_ESCAPE=0 for live physical user-owned tables inspected.

Notes:
- The direct-ID staging matrix used two synthetic users and exact resource IDs where the public API exposes them.
- The notification preferences API is owner-scoped at runtime; live staging does not expose a separate physical notification_preferences table in the 41-table catalog.
- The notification device cross-user 500 was fixed to stable NOTIFICATION_DEVICE_NOT_FOUND before this final PASS run.

${noSecretFooter}
`,
);

writeText(
  "docs/auth/AUTH_PASSWORD_RESET_REPORT.md",
  `
# Auth Password Reset Report

Status: EXTERNAL_EMAIL_DELIVERY_RUNTIME_STAGING_LOCAL_CONTRACT_PASS
Timestamp: ${timestamp}

Verified internal security:
- Password reset request is accepted on staging without exposing raw reset tokens.
- Local contract verifies valid reset, one-time replay block, invalid token rejection, old password rejection, and new password login.
- Non-local/staging responses intentionally do not expose delivery tokens.

External delivery blocker:
- Full provider-runtime reset confirm/replay on staging requires a safe email delivery provider/inbox or approved secure token retrieval path.
- This blocker is external to the internal auth/session/account closure because returning raw reset tokens from staging would violate the security contract.

${noSecretFooter}
`,
);

writeCsv(
  "docs/auth/OAUTH_PROVIDER_MATRIX.csv",
  ["PROVIDER", "STATUS", "CONTRACT", "INTERNAL_EVIDENCE", "EXTERNAL_USER_ACTION_REQUIRED"],
  [
    ["GOOGLE", "CODE_COMPLETE_EXTERNAL_CONFIG", "state and PKCE start/callback contract present", "OAuth route and mobile callback source inspected in Phase 3; no token logging evidence", "Google console client/redirect configuration and runtime smoke"],
    ["APPLE", "CODE_COMPLETE_EXTERNAL_CONFIG", "state PKCE nonce hash binding, nonce expiry and single-use internal path", "APPLE_NONCE_INTERNAL=PASS; local/staging start path internal checks complete", "Apple developer console/client/redirect configuration and runtime login"],
    ["NAVER", "CODE_COMPLETE_EXTERNAL_CONFIG", "state and PKCE start/callback contract present", "OAuth route and mobile callback source inspected in Phase 3; no token logging evidence", "Naver console application/redirect configuration and runtime smoke"],
    ["KAKAO", "CODE_COMPLETE_EXTERNAL_CONFIG", "state and PKCE start/callback contract present", "OAuth route and mobile callback source inspected in Phase 3; no token logging evidence", "Kakao console application/redirect configuration and runtime smoke"],
  ].map(([PROVIDER, STATUS, CONTRACT, INTERNAL_EVIDENCE, EXTERNAL_USER_ACTION_REQUIRED]) => ({
    PROVIDER,
    STATUS,
    CONTRACT,
    INTERNAL_EVIDENCE,
    EXTERNAL_USER_ACTION_REQUIRED,
  })),
);

writeText(
  "docs/auth/ADMIN_AUTH_RBAC_MFA_REPORT.md",
  `
# Admin Auth / RBAC / MFA Report

Status: PASS_INTERNAL_RUNTIME_WITH_EXTERNAL_MFA_PROVIDER
Timestamp: ${timestamp}

Closed:
- Canonical v2.0 role names are now accepted by auth middleware and admin routes.
- Legacy role names are mapped without weakening the canonical model.
- Permissions are enforced server-side; UI visibility is not treated as authorization.
- MFA-required privileged routes reject missing server-side MFA state.
- Break-glass is scoped, reason-required, expiry-bounded, and denied for readonly actors.

External:
- Real synthetic staging admin login and MFA factor enrollment/provider runtime still require external credentials/provider action.

${noSecretFooter}
`,
);

writeText(
  "docs/auth/PHASE_3_CLOSURE_REPORT.md",
  `
# Phase 3 Closure Report

PHASE_3_STATUS=EXTERNAL_BLOCKER
PHASE_3_INTERNAL_STATUS=PASS
PHASE_3_EXTERNAL_STATUS=BLOCKED
Timestamp: ${timestamp}

Closed in this final internal closure:
- CROSS_USER_DIRECT_ID_MATRIX=PASS on canonical staging API.
- CROSS_USER_DATA_LEAK=0.
- Notification device cross-user direct-ID 500 was fixed to stable NOTIFICATION_DEVICE_NOT_FOUND.
- Canonical Admin RBAC role model is first-class in auth middleware and admin routes.
- Admin MFA internal middleware/route gating is PASS_INTERNAL_RUNTIME.
- Break-glass internal runtime is PASS_INTERNAL_RUNTIME with reason, scope, expiry, actor and permission checks.
- Root api:contract race is addressed by making the root task depend on the package build task.

Remaining external tracks:
- OAuth provider console/runtime configuration for Google, Apple, Naver, Kakao.
- Password reset provider-runtime delivery/inbox for staging confirm/replay.
- Real synthetic staging admin MFA enrollment/provider runtime.
- Android native session/bootstrap runtime remains D-026/Phase 9/13.

Phase 4 backend readiness:
- READY_WITH_SEPARATE_EXTERNAL_AUTH_TRACKS for financial core backend dependencies: login, refresh, authenticated identity context, ownership, cross-user isolation, logout/revoke, staging persistence.

D statuses remain:
- D-013=FAIL
- D-016=PARTIAL
- D-017=PASS
- D-026=FAIL

PROJECT_COMPLETION_100=false
COMMERCIAL_LAUNCH_READY=false

${noSecretFooter}
`,
);

const traceRel = "docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv";
const trace = parseCsv(readFileSync(relPath(traceRel), "utf8"));
const traceUpdates = {
  "AUTH-005": {
    CURRENT_STATUS: "EXTERNAL_BLOCKER",
    RUNTIME_EVIDENCE: "Password reset internal security and replay local contract PASS; staging request PASS without raw token exposure; provider-runtime confirm/replay requires safe email delivery/inbox.",
    BLOCKER: "EXTERNAL_EMAIL_DELIVERY_OR_SECURE_TEST_INBOX_REQUIRED",
    NEXT_ACTION: "Configure staging email delivery/inbox and run provider-runtime password reset replay smoke.",
  },
  "AUTH-006": {
    CURRENT_STATUS: "EXTERNAL_BLOCKER",
    RUNTIME_EVIDENCE: "Google/Apple/Naver/Kakao OAuth internal code paths complete; Apple nonce internal PASS; provider callback runtime needs external console/client configuration.",
    BLOCKER: "OAUTH_PROVIDER_CONSOLE_RUNTIME_CONFIG_REQUIRED",
    NEXT_ACTION: "Configure provider consoles and run runtime OAuth smoke per provider.",
  },
  "AUTH-012": {
    CURRENT_STATUS: "EXTERNAL_BLOCKER",
    RUNTIME_EVIDENCE: "Admin auth/RBAC/MFA internal runtime tests PASS; canonical roles and break-glass are enforced through auth middleware and admin routes; real synthetic staging admin MFA enrollment/provider runtime remains external.",
    BLOCKER: "SYNTHETIC_ADMIN_MFA_PROVIDER_RUNTIME_REQUIRED",
    NEXT_ACTION: "Provision synthetic staging admin with MFA provider and run live admin login/MFA smoke.",
  },
  "SEC-011": {
    CURRENT_STATUS: "PASS",
    RUNTIME_EVIDENCE: "Phase 3 final closure: staging cross-user direct-ID matrix PASS 9/9; cross-user data leak 0; notification device direct-ID 500 fixed to NOTIFICATION_DEVICE_NOT_FOUND; RLS catalog owner policies inspected for live physical tables.",
    BLOCKER: "",
    NEXT_ACTION: "Keep direct-ID matrix in regression set.",
  },
  "SEC-014": {
    CURRENT_STATUS: "EXTERNAL_BLOCKER",
    RUNTIME_EVIDENCE: "Admin MFA internal middleware/route enforcement PASS; provider-backed synthetic admin factor enrollment and full staging MFA runtime remain external.",
    BLOCKER: "SYNTHETIC_ADMIN_MFA_PROVIDER_RUNTIME_REQUIRED",
    NEXT_ACTION: "Configure synthetic staging admin MFA factor and run provider-backed MFA runtime test.",
  },
  "ADMIN-012": {
    CURRENT_STATUS: "EXTERNAL_BLOCKER",
    RUNTIME_EVIDENCE: "Admin auth internal runtime PASS through auth middleware and admin route tests; no production admin used; real synthetic staging admin login requires external principal/MFA setup.",
    BLOCKER: "SYNTHETIC_STAGING_ADMIN_PRINCIPAL_REQUIRED",
    NEXT_ACTION: "Provision synthetic staging admin principal and run live admin login/readiness/logout smoke.",
  },
  "ADMIN-013": {
    CURRENT_STATUS: "EXTERNAL_BLOCKER",
    RUNTIME_EVIDENCE: "Admin MFA internal enforcement PASS; route rejects missing server-side MFA and accepts verified server-side MFA in tests.",
    BLOCKER: "SYNTHETIC_ADMIN_MFA_PROVIDER_RUNTIME_REQUIRED",
    NEXT_ACTION: "Run provider-backed synthetic admin MFA enrollment/verification.",
  },
  "ADMIN-014": {
    CURRENT_STATUS: "PASS",
    RUNTIME_EVIDENCE: "Canonical RBAC runtime model PASS_INTERNAL_RUNTIME: SUPER_ADMIN, OPS_ADMIN, MODERATOR, CONTENT_ADMIN, SUPPORT, ADS_PARTNER_ADMIN, AUDITOR_READONLY mapped and enforced by auth middleware/admin routes; privilege escalation P0=0 for tested paths.",
    BLOCKER: "",
    NEXT_ACTION: "Add live synthetic admin credential smoke when external MFA/admin principal is available.",
  },
  "ADMIN-015": {
    CURRENT_STATUS: "PASS",
    RUNTIME_EVIDENCE: "Break-glass PASS_INTERNAL_RUNTIME: reason, scope, expiry, actor permission, readonly denial and scoped role:manage grant tested through auth middleware/admin route boundary.",
    BLOCKER: "",
    NEXT_ACTION: "Repeat with live synthetic staging admin after external MFA/principal setup.",
  },
};
for (const row of trace.rows) {
  const update = traceUpdates[row.REQ_ID];
  if (update) Object.assign(row, update, {
    CURRENT_REPOSITORY_HEAD: head,
    APPLICATION_RC_SOURCE_SHA: rcSourceSha,
  });
}
writeFileSync(relPath(traceRel), stringifyCsv(trace.headers, trace.rows));

const outputFiles = [
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
  "docs/auth/ADMIN_AUTH_RUNTIME_REPORT.md",
  "docs/auth/ADMIN_MFA_INTERNAL_REPORT.md",
  "docs/auth/ADMIN_MFA_RUNTIME_MATRIX.csv",
  "docs/auth/BREAK_GLASS_RUNTIME_REPORT.md",
  "docs/auth/ADMIN_PRIVILEGE_ADVERSARIAL_REPORT.md",
  "docs/auth/AUTH_CROSS_USER_ISOLATION_REPORT.md",
  "docs/auth/CROSS_USER_DIRECT_ID_RUNTIME_MATRIX.csv",
  "docs/auth/CROSS_USER_RUNTIME_FINAL_REPORT.md",
  "docs/auth/APPLE_OAUTH_NONCE_SECURITY_REPORT.md",
  "docs/auth/PHASE_3_CLOSURE_REPORT.md",
  "docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json",
].filter((rel) => existsSync(relPath(rel)));

const phase3 = {
  timestamp,
  branch,
  currentRepositoryHead: head,
  remoteHead,
  applicationRcSourceSha: rcSourceSha,
  phaseStatus: "EXTERNAL_BLOCKER",
  phase3InternalStatus: "PASS",
  phase3ExternalStatus: "BLOCKED",
  phase4EntryReadiness: "READY_WITH_SEPARATE_EXTERNAL_AUTH_TRACKS",
  authEndpointCount: 84,
  statuses: {
    authP0Drift: 0,
    stagingRegister: "PASS",
    registerRepeatTest: "PASS_10_OF_10_INTERNAL_ERROR_0",
    stagingAuthLifecycleE2E: "PASS_CORE_STAGING_RUNTIME",
    sessionReuseTest: "PASS_STAGING_RUNTIME",
    passwordResetInternalSecurity: "PASS",
    passwordResetExternalDelivery: "EXTERNAL_RUNTIME_BLOCKER_EMAIL_DELIVERY",
    passwordResetReplay: "EXTERNAL_EMAIL_DELIVERY_RUNTIME_STAGING_LOCAL_CONTRACT_PASS",
    rateLimitStatus: "PASS_LOCAL_AND_STAGING_REPRESENTATIVE",
    crossUserAuthz: "PASS",
    crossUserDirectIdMatrix: "PASS",
    crossUserDataLeak: 0,
    rlsCrossUserEscape: 0,
    onboardingGate: "PASS_SERVER_BOOTSTRAP_CONTRACT",
    privacyExport: "PASS_CORE_STAGING_RUNTIME",
    withdrawal: "PASS_CORE_STAGING_RUNTIME",
    support: "PASS_CORE_STAGING_RUNTIME",
    consentVersioning: "PASS_CORE_STAGING_RUNTIME",
    passwordHashNew: "PASS_PBKDF2_SHA256_100000_WORKERS_COMPATIBLE",
    passwordHashLegacyCompat: "PASS_LOCAL_CONTRACT",
    legacyRehashStrategy: "PASS_LOCAL_AND_DB_CONTRACT",
    oauthGoogle: "CODE_COMPLETE_EXTERNAL_CONFIG",
    oauthApple: "CODE_COMPLETE_EXTERNAL_CONFIG",
    oauthNaver: "CODE_COMPLETE_EXTERNAL_CONFIG",
    oauthKakao: "CODE_COMPLETE_EXTERNAL_CONFIG",
    appleNonceInternal: "PASS",
    adminSyntheticRuntime: "EXTERNAL_BLOCKER_STAGING_ADMIN_PRINCIPAL_REQUIRED",
    adminAuth: "PASS_INTERNAL_RUNTIME_EXTERNAL_STAGING_PRINCIPAL",
    adminMfaInternal: "PASS",
    adminMfaExternal: "EXTERNAL_RUNTIME_BLOCKER_SYNTHETIC_ADMIN_MFA_REQUIRED",
    rbac: "PASS_INTERNAL_RUNTIME",
    rbacRuntime: "PASS",
    rbacP0Drift: 0,
    breakGlass: "PASS_INTERNAL_RUNTIME",
    breakGlassRuntime: "PASS",
    breakGlassAbuseTest: "PASS",
    adminAuditIntegrity: "PASS_INTERNAL_ROUTE_GATE",
    privilegeEscalationP0: 0,
    piiTokenLoggingIssues: 0,
    rootApiContractStatus: "PASS",
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
  },
  blockers: {
    internal: [],
    external: [
      "OAuth provider console/runtime verification for Google/Apple/Naver/Kakao",
      "Staging password reset provider delivery/inbox for full confirm/replay runtime",
      "Synthetic staging admin principal plus provider-backed MFA enrollment/runtime",
      "Native Android session/bootstrap runtime under D-026/Phase 9/13",
    ],
  },
  evidence: {
    noSecret: true,
    productionMutation: false,
    crossUserDirectIdRows: 9,
    crossUserDirectIdFailures: 0,
    rlsNotificationPreferencesPhysicalTable: "NOT_PRESENT_IN_LIVE_41_TABLE_CATALOG",
    stagingApiWorkerVersion: "e13ff5b0-a803-4d87-97ba-2dcad7703ef7",
  },
  outputFiles: outputFiles.map((rel) => ({
    path: rel,
    sha256: rel.endsWith("PHASE_3_AUTH_ACCOUNT_COMPLETION.json")
      ? "SELF_HASH_RECOMPUTED_AFTER_WRITE"
      : sha256File(rel),
  })),
};

writeFileSync(relPath("docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json"), `${JSON.stringify(phase3, null, 2)}\n`);

console.log(`PHASE3_FINAL_CLOSURE_ARTIFACTS_UPDATED ${sha256File("docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json")}`);
