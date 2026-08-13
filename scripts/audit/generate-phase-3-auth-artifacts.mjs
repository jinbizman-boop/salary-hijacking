import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "auth");
const TRACE_PATH = path.join(ROOT, "docs", "audit", "CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const ENDPOINT_REGISTRY_PATH = path.join(ROOT, "docs", "architecture", "API_ENDPOINT_REGISTRY.csv");
const APPLICATION_RC_SOURCE_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";

function sh(args) {
  return execFileSync(args[0], args.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, headers) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
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
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
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
    } else {
      field += ch;
    }
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

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function read(rel) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function statusForEndpoint(row) {
  if (row.PATH.includes("/oauth")) return "PARTIAL_EXTERNAL_PROVIDER_RUNTIME_UNVERIFIED";
  if (row.PATH.includes("/password-reset")) return "PARTIAL_LOCAL_REPLAY_TEST_PASS_DELIVERY_RUNTIME_UNVERIFIED";
  if (row.PATH.includes("/logout")) return row.PATH.endsWith("/logout") ? "PASS_LOCAL_CONTRACT" : "PARTIAL_ALL_SESSION_RUNTIME_UNVERIFIED";
  if (row.PATH.includes("/support")) return "PARTIAL_REPOSITORY_CONTRACT_TEST_PASS_STAGING_E2E_UNVERIFIED";
  if (row.PATH.includes("/privacy") || row.PATH.includes("/withdraw") || row.PATH.includes("/consent")) return "PARTIAL_SOURCE_DB_CONTRACT_STAGING_E2E_UNVERIFIED";
  if (row.PATH.includes("/admin")) return "PARTIAL_RBAC_TEST_PASS_MFA_RUNTIME_UNVERIFIED";
  if (row.PATH.includes("/auth/register") || row.PATH.includes("/auth/login") || row.PATH.includes("/auth/refresh")) return "PASS_LOCAL_CONTRACT_STAGING_RUNTIME_UNVERIFIED";
  return "PARTIAL";
}

const currentHead = sh(["git", "rev-parse", "HEAD"]);
const remoteHead = sh(["git", "rev-parse", "@{u}"]);
const branch = sh(["git", "branch", "--show-current"]);
mkdirSync(OUT_DIR, { recursive: true });

const endpointCsv = parseCsv(readFileSync(ENDPOINT_REGISTRY_PATH, "utf8"));
const authEndpointRows = endpointCsv.rows
  .filter((row) => {
    const domain = row.DOMAIN;
    const pathValue = row.PATH;
    return (
      ["AUTH", "PROF", "ADMIN"].includes(domain) ||
      /\/(auth|users|profile|privacy|support|consent|withdraw|admin)(?:\/|$|-)/.test(pathValue)
    );
  })
  .map((row) => ({
    METHOD: row.METHOD,
    PATH: row.PATH,
    DOMAIN: row.DOMAIN,
    REQ_ID: row.REQ_ID,
    AUTH_REQUIRED: row.AUTH_REQUIRED,
    ROLE_PERMISSION: row.ROLE_PERMISSION,
    OWNERSHIP_RULE: row.OWNERSHIP_RULE,
    REQUEST_SCHEMA: row.REQUEST_SCHEMA,
    RESPONSE_SCHEMA: row.RESPONSE_SCHEMA,
    SUCCESS_STATUS: row.SUCCESS_STATUS,
    ERROR_CODES: row.ERROR_CODES,
    RATE_LIMIT: row.RATE_LIMIT,
    DB_TABLES: row.DB_TABLES,
    AUDIT_EVENT: row.AUDIT_EVENT,
    CURRENT_IMPLEMENTATION_PATH: row.CURRENT_IMPLEMENTATION_PATH,
    CONSUMERS: row.CONSUMERS,
    PHASE_3_STATUS: statusForEndpoint(row),
    PHASE_3_EVIDENCE:
      "Local route/repository contract tests PASS where named; staging full account lifecycle E2E not executed in Phase 3.",
  }));

write(
  "docs/auth/AUTH_ENDPOINT_RUNTIME_MATRIX.csv",
  toCsv(authEndpointRows, [
    "METHOD",
    "PATH",
    "DOMAIN",
    "REQ_ID",
    "AUTH_REQUIRED",
    "ROLE_PERMISSION",
    "OWNERSHIP_RULE",
    "REQUEST_SCHEMA",
    "RESPONSE_SCHEMA",
    "SUCCESS_STATUS",
    "ERROR_CODES",
    "RATE_LIMIT",
    "DB_TABLES",
    "AUDIT_EVENT",
    "CURRENT_IMPLEMENTATION_PATH",
    "CONSUMERS",
    "PHASE_3_STATUS",
    "PHASE_3_EVIDENCE",
  ]),
);

const reports = {
  "docs/auth/AUTH_SESSION_SECURITY_REPORT.md": `# Auth Session Security Report

Status: PARTIAL

Evidence:
- PBKDF2-SHA256 password hashing local contract test PASS.
- Refresh rotation and reused refresh-token family revocation local route test PASS.
- Current-session logout accepts refresh-token based revocation without a bearer token local route test PASS.
- Broader auth/profile/admin regression suite PASS: 7 files, 42 tests.

Remaining:
- Full staging session restore and all-session logout E2E remain unverified.
- OAuth provider runtime sessions remain external-provider/runtime unverified.

No raw tokens or credentials are stored in this report.
`,
  "docs/auth/AUTH_PASSWORD_RESET_REPORT.md": `# Auth Password Reset Report

Status: PARTIAL

Evidence:
- Reset token one-time replay block local route test PASS.
- Non-local environments do not return raw reset delivery tokens in auth route responses local test PASS.
- Repository path stores reset state by hashed token and consumes it on successful reset.

Remaining:
- Email delivery provider and staging end-to-end reset flow are not runtime verified in this Phase.
- Post-reset mobile session cleanup requires Android/runtime validation in a later phase.
`,
  "docs/auth/AUTH_RATE_LIMIT_REPORT.md": `# Auth Rate Limit Report

Status: PARTIAL

Evidence:
- Auth endpoint registry declares AUTH_MIDDLEWARE_RATE_LIMIT_POLICY.
- Existing app supports configurable rate-limit middleware.

Remaining:
- Credential abuse thresholds for login, register, password reset, support and admin login were not exhaustively exercised against staging in this Phase.
- No production security rule was changed.
`,
  "docs/auth/OAUTH_PROVIDER_MATRIX.csv": toCsv(
    [
      {
        PROVIDER: "GOOGLE",
        STATUS: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
        CONTRACT: "state and PKCE contract present in auth routes",
        RUNTIME_EVIDENCE: "not verified against external Google console/provider",
        BLOCKER: "provider credentials/redirect console runtime",
      },
      {
        PROVIDER: "APPLE",
        STATUS: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
        CONTRACT: "state and PKCE/nonce boundary required by Phase 1 contract",
        RUNTIME_EVIDENCE: "not verified against external Apple provider",
        BLOCKER: "provider credentials/redirect console runtime",
      },
      {
        PROVIDER: "NAVER",
        STATUS: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
        CONTRACT: "state and PKCE contract present in auth routes",
        RUNTIME_EVIDENCE: "not verified against external Naver provider",
        BLOCKER: "provider credentials/redirect console runtime",
      },
      {
        PROVIDER: "KAKAO",
        STATUS: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
        CONTRACT: "state and PKCE contract present in auth routes",
        RUNTIME_EVIDENCE: "not verified against external Kakao provider",
        BLOCKER: "provider credentials/redirect console runtime",
      },
    ],
    ["PROVIDER", "STATUS", "CONTRACT", "RUNTIME_EVIDENCE", "BLOCKER"],
  ),
  "docs/auth/ONBOARDING_GATE_REPORT.md": `# Onboarding Gate Report

Status: PARTIAL

Evidence:
- Bootstrap/profile contracts are covered by existing mobile-profile contract tests.
- Server-authenticated bootstrap remains the authority boundary for onboarding and payroll configured state.

Remaining:
- Native mobile route transition runtime was not executed in Phase 3.
- Android D-026 remains FAIL and is not closed by this source-level auth work.
`,
  "docs/auth/PRIVACY_EXPORT_E2E_REPORT.md": `# Privacy Export E2E Report

Status: PARTIAL

Evidence:
- User/profile/privacy API surfaces are present in endpoint registry.
- Repository and route contracts separate owner access from privileged/admin access.

Remaining:
- Full queued export generation/download/expiry staging E2E was not executed.
- Cross-user download denial requires staging runtime evidence before PASS.
`,
  "docs/auth/WITHDRAWAL_E2E_REPORT.md": `# Withdrawal E2E Report

Status: PARTIAL

Evidence:
- Account lifecycle endpoints are registered and protected by auth middleware/ownership policy.
- Session revoke primitives exist and are exercised by password reset and refresh reuse tests.

Remaining:
- Full synthetic staging withdrawal lifecycle, cleanup/anonymization and session invalidation E2E was not executed in this Phase.
`,
  "docs/auth/SUPPORT_E2E_REPORT.md": `# Support E2E Report

Status: PARTIAL

Evidence:
- Support ticket repository contract tests PASS.
- Owner-access and support/admin access paths are covered by local route/repository tests.

Remaining:
- Full staging user A/B support-ticket create/read/update denial E2E was not executed in this Phase.
`,
  "docs/auth/CONSENT_VERSIONING_REPORT.md": `# Consent Versioning Report

Status: PARTIAL

Evidence:
- Register route enforces required terms/privacy consent.
- Trace and DB contracts include consent/versioning requirement rows.

Remaining:
- Consent history/re-consent staging runtime and policy-version update flow remain unverified.
`,
  "docs/auth/ADMIN_AUTH_RBAC_MFA_REPORT.md": `# Admin Auth RBAC MFA Report

Status: PARTIAL

Evidence:
- Admin RBAC/audit moderation route tests PASS.
- Admin API is protected separately from mobile audience by auth middleware.
- MFA verification path exists.

Remaining:
- PDF role model SUPER_ADMIN/OPS_ADMIN/MODERATOR/CONTENT_ADMIN/SUPPORT/ADS_PARTNER_ADMIN/AUDITOR_READONLY is not fully identical to current middleware USER/OPERATOR/ADMIN/SUPER_ADMIN/SYSTEM model.
- Real staging admin MFA provider/runtime, break-glass, and time-limited privilege flows remain unverified.
`,
  "docs/auth/AUTH_CROSS_USER_ISOLATION_REPORT.md": `# Auth Cross-User Isolation Report

Status: PARTIAL

Evidence:
- Phase 2 database A/B isolation PASS for user-owned domains.
- Auth/profile/support local repository and route tests PASS.

Remaining:
- Phase 3 did not execute full staging API cross-user account/privacy/support/session denial matrix.
- No production users were mutated.
`,
};

for (const [rel, text] of Object.entries(reports)) {
  write(rel, text);
}

const phase3 = {
  timestamp: new Date().toISOString(),
  branch,
  currentRepositoryHead: currentHead,
  remoteHead,
  applicationRcSourceSha: APPLICATION_RC_SOURCE_SHA,
  phaseStatus: "PARTIAL",
  phase4EntryReadiness: "NOT_READY",
  authEndpointCount: authEndpointRows.length,
  statuses: {
    authP0Drift: 1,
    sessionReuseTest: "PASS_LOCAL_CONTRACT",
    passwordResetReplay: "PASS_LOCAL_CONTRACT",
    rateLimitStatus: "PARTIAL_STAGING_ABUSE_RUNTIME_UNVERIFIED",
    crossUserAuthz: "PARTIAL_LOCAL_AND_DB_CONTRACT_STAGING_RUNTIME_UNVERIFIED",
    onboardingGate: "PARTIAL_SOURCE_CONTRACT_NATIVE_RUNTIME_UNVERIFIED",
    privacyExport: "PARTIAL_E2E_UNVERIFIED",
    withdrawal: "PARTIAL_E2E_UNVERIFIED",
    support: "PARTIAL_REPOSITORY_CONTRACT_E2E_UNVERIFIED",
    consentVersioning: "PARTIAL_POLICY_RUNTIME_UNVERIFIED",
    oauthGoogle: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
    oauthApple: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
    oauthNaver: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
    oauthKakao: "PARTIAL_EXTERNAL_PROVIDER_CONFIG_REQUIRED",
    adminAuth: "PARTIAL_LOCAL_RBAC_TEST_PASS_STAGING_RUNTIME_UNVERIFIED",
    adminMfa: "PARTIAL_RUNTIME_UNVERIFIED",
    rbac: "PARTIAL_ROLE_MODEL_DRIFT",
    breakGlass: "UNVERIFIED",
    privilegeEscalationP0: 0,
    piiTokenLoggingIssues: 0,
    d013: "FAIL",
    d016: "PARTIAL",
    d017: "PASS",
    d026: "FAIL",
    projectCompletion100: false,
    commercialLaunchReady: false,
  },
  tests: [
    {
      command:
        "corepack pnpm --filter @salary-hijacking/api exec vitest run tests/auth-phase3-session-security.test.ts",
      result: "PASS",
      files: 1,
      tests: 5,
    },
    {
      command:
        "corepack pnpm --filter @salary-hijacking/api exec vitest run tests/auth-db-repository.test.ts tests/auth-routes-env-secret.test.ts tests/auth-session-resolver-contract.test.ts tests/mobile-profile-contract.test.ts tests/users-support-ticket-db-repository.test.ts tests/admin-rbac-audit-moderation-routes.test.ts tests/auth-phase3-session-security.test.ts",
      result: "PASS",
      files: 7,
      tests: 42,
    },
  ],
  evidence: {
    codePaths: [
      "services/api/src/routes/auth.routes.ts",
      "services/api/src/repositories/auth.repository.ts",
      "services/api/src/middlewares/auth.middleware.ts",
      "services/api/tests/auth-phase3-session-security.test.ts",
    ],
    improvements: [
      "new email password hashes use PBKDF2-SHA256 with 310000 iterations",
      "legacy sha256 password verification remains backward-compatible",
      "refresh-token reuse is detected and revokes the token family",
      "nonlocal auth delivery responses no longer expose raw verification/reset tokens",
      "current-session logout can revoke by refresh token without a bearer token",
      "password reset token replay is blocked",
    ],
    blockers: [
      "full staging account lifecycle E2E not executed",
      "OAuth provider external console/runtime config not verified",
      "Admin MFA/break-glass runtime not verified",
      "native mobile session/bootstrap runtime not executed",
    ],
    secretExposure: false,
    productionMutation: false,
  },
  outputFiles: [],
};

const traceUpdates = new Map(
  [
    ["AUTH-001", "Email registration local route test PASS for required terms/privacy, duplicate guard source path present, PBKDF2 password hash now used for new credentials; staging email delivery/E2E remains unverified."],
    ["AUTH-002", "Login/password verification local route and repository regression tests PASS; PBKDF2 plus legacy sha256 verification compatibility covered; staging login runtime not rerun in this Phase."],
    ["AUTH-003", "Refresh rotation/reuse local route test PASS; reused refresh token revokes rotated family and returns AUTH_REFRESH_TOKEN_REUSED; mobile/native session restore remains runtime-unverified."],
    ["AUTH-004", "Current-session logout by refresh token local route test PASS; logout-all staging runtime remains unverified."],
    ["AUTH-005", "Password reset token one-time replay block local route test PASS; nonlocal reset delivery token exposure blocked; email provider/staging E2E remains unverified."],
    ["AUTH-006", "OAuth provider matrix created for Google/Apple/Naver/Kakao; external provider runtime configuration remains a separated blocker."],
    ["AUTH-007", "Onboarding/bootstrap contract documented; native mobile route gate runtime remains unverified."],
    ["AUTH-008", "Withdrawal contract documented; full synthetic staging withdrawal lifecycle and cleanup/anonymization E2E remains unverified."],
    ["AUTH-009", "Privacy export contract documented; queued export/download/expiry and cross-user runtime denial remain unverified."],
    ["AUTH-010", "Support ticket repository contract tests PASS; full staging user A/B support workflow remains unverified."],
    ["AUTH-011", "Register route enforces required terms/privacy consent; full consent versioning/history runtime remains unverified."],
    ["AUTH-012", "Admin auth/RBAC local tests PASS; MFA provider/runtime and break-glass remain unverified and role model drift remains documented."],
    ["PROF-004", "Profile/account auth surface included in Phase 3 endpoint matrix; runtime evidence remains partial."],
    ["PROF-005", "Notification/privacy setting ownership remains partial; staging runtime not executed."],
    ["PROF-006", "Support/privacy account lifecycle evidence is partial via local repository/route tests."],
    ["PROF-007", "Withdrawal/account cleanup documented as partial pending staging lifecycle E2E."],
    ["PROF-008", "Privacy export documented as partial pending staging queued export E2E."],
    ["PROF-009", "Consent versioning documented as partial pending policy-version runtime."],
    ["SEC-003", "Password storage strengthened for new email credentials with PBKDF2-SHA256 local test PASS; delivery token exposure guard local test PASS."],
    ["SEC-004", "Refresh reuse detection/family revocation local test PASS; full staging attack scenario remains unverified."],
    ["SEC-005", "Rate-limit posture documented as partial; staging credential-abuse runtime threshold tests not executed."],
    ["SEC-008", "Phase 2 RLS remains PASS; Phase 3 user account cross-user API denial matrix remains partial."],
    ["SEC-009", "Token/secret logging evidence remains no known exposure in generated artifacts; static/runtime logging sweep partial."],
    ["SEC-011", "Admin auth/RBAC local tests PASS; MFA/break-glass runtime remains partial."],
    ["SEC-014", "Privacy export/withdrawal/support account lifecycle evidence partial pending staging E2E."],
    ["ADMIN-012", "Admin auth boundary local test coverage PASS; staging admin session runtime partial."],
    ["ADMIN-013", "Admin MFA path exists but provider/runtime enforcement remains partial."],
    ["ADMIN-014", "Admin RBAC/audit local tests PASS; PDF role-model drift remains documented."],
    ["ADMIN-015", "Break-glass/time-limited privileged action runtime remains unverified."],
  ].map(([id, evidence]) => [id, evidence]),
);

if (existsSync(TRACE_PATH)) {
  const trace = parseCsv(readFileSync(TRACE_PATH, "utf8"));
  const updated = trace.rows.map((row) => {
    if (!traceUpdates.has(row.REQ_ID)) return row;
    const evidence = traceUpdates.get(row.REQ_ID);
    return {
      ...row,
      CURRENT_REPOSITORY_HEAD: currentHead,
      APPLICATION_RC_SOURCE_SHA,
      TEST_PATH: [
        row.TEST_PATH,
        "services/api/tests/auth-phase3-session-security.test.ts",
      ]
        .filter(Boolean)
        .join("; "),
      RUNTIME_EVIDENCE: evidence,
      CURRENT_STATUS: "PARTIAL",
      BLOCKER:
        "Full staging/mobile/admin-provider runtime remains incomplete; do not mark Phase 3 PASS.",
      NEXT_ACTION:
        "Run full synthetic staging account lifecycle E2E, OAuth provider runtime verification, Admin MFA/break-glass runtime, and mobile session bootstrap in Phase 3 continuation.",
    };
  });
  writeFileSync(TRACE_PATH, toCsv(updated, trace.headers), "utf8");
}

const artifactRels = [
  "docs/auth/AUTH_ENDPOINT_RUNTIME_MATRIX.csv",
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
  "docs/auth/AUTH_CROSS_USER_ISOLATION_REPORT.md",
];

phase3.outputFiles = artifactRels.map((rel) => ({
  path: rel,
  sha256: sha256Text(read(rel)),
}));

write(
  "docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json",
  `${JSON.stringify(
    {
      ...phase3,
      outputFiles: [
        ...phase3.outputFiles,
        {
          path: "docs/auth/PHASE_3_AUTH_ACCOUNT_COMPLETION.json",
          sha256: "SELF_REFERENTIAL_UPDATED_AFTER_WRITE",
        },
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(
  `PHASE_3_AUTH_ARTIFACTS_GENERATED endpoints=${authEndpointRows.length} status=PARTIAL head=${currentHead}`,
);
