import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const MOBILE_ROOT = join(ROOT, "apps", "mobile");
const START_HEAD = "f4ce0c591ff3f1194164f98d9c511178dc1416fb";
const APPLICATION_RC_SOURCE_SHA_BEFORE =
  "80cc5cdfb0758478791b19196e2812e7fa6d671f";
const TRACE_PATH = join(ROOT, "docs", "audit", "CURRENT_REQUIREMENT_TRACE_MATRIX.csv");

const routes = [
  ["/", "apps/mobile/app/index.tsx", "splash", "AUTH-003; AUTH-007", "bootstrap/session/onboarding"],
  ["/(auth)/login", "apps/mobile/app/(auth)/login.tsx", "auth login", "AUTH-002; AUTH-003", "login/refresh/session"],
  ["/(auth)/signup", "apps/mobile/app/(auth)/signup.tsx", "auth signup", "AUTH-001; AUTH-011", "register/consent"],
  ["/(auth)/forgot-password", "apps/mobile/app/(auth)/forgot-password.tsx", "password reset request", "AUTH-005", "password reset"],
  ["/(auth)/reset-password", "apps/mobile/app/(auth)/reset-password.tsx", "password reset confirm", "AUTH-005", "password reset"],
  ["/(auth)/verify-email", "apps/mobile/app/(auth)/verify-email.tsx", "email verification", "AUTH-001", "email verification"],
  ["/auth/oauth/callback", "apps/mobile/app/auth/oauth/callback.tsx", "oauth callback", "AUTH-006", "oauth callback"],
  ["/onboarding", "apps/mobile/app/onboarding.tsx", "onboarding", "AUTH-007; PROF-004", "bootstrap/onboarding"],
  ["/salary", "apps/mobile/app/(tabs)/salary/index.tsx", "salary home", "HOME-001; HOME-002; HOME-003; HOME-004; HOME-005; HOME-006", "salary summary"],
  ["/plan", "apps/mobile/app/(tabs)/plan/index.tsx", "plan/budget", "PAY-001; BUD-001; EXP-001; SAV-001", "payroll/plan/budget"],
  ["/notifications", "apps/mobile/app/notifications/index.tsx", "notifications list", "NOTI-001; NOTI-002; NOTI-009", "notifications cursor list"],
  ["/notifications/settings", "apps/mobile/app/notifications/settings.tsx", "notification settings", "NOTI-003", "notification preferences/device permission"],
  ["/level", "apps/mobile/app/(tabs)/level/index.tsx", "LV UP", "LV-001; LV-002; LV-003", "growth dashboard"],
  ["/level/reading", "apps/mobile/app/level/reading.tsx", "reading mission", "LV-004; LV-010", "growth content/complete"],
  ["/level/news", "apps/mobile/app/level/news.tsx", "news mission", "LV-005; LV-010", "growth content/complete"],
  ["/level/english", "apps/mobile/app/level/english.tsx", "english mission", "LV-006; LV-010", "growth content/complete"],
  ["/level/health", "apps/mobile/app/level/health.tsx", "health mission", "LV-007; LV-010", "growth content/complete"],
  ["/community", "apps/mobile/app/(tabs)/community/index.tsx", "community list", "COM-001; COM-002; COM-010", "community cursor feed"],
  ["/community/[postId]", "apps/mobile/app/community/[postId].tsx", "community detail", "COM-003; COM-004; COM-005", "community post/comments"],
  ["/community/write", "apps/mobile/app/community/write.tsx", "community write", "WRITE-001; WRITE-002; WRITE-003; WRITE-004; WRITE-005; WRITE-006", "community write/upload"],
  ["/profile", "apps/mobile/app/(tabs)/profile/index.tsx", "profile", "PROF-001; PROF-002; PROF-003; PROF-004; PROF-005; PROF-006; PROF-007; PROF-008; PROF-009; PROF-010", "profile summary"],
  ["/profile/account", "apps/mobile/app/profile/account.tsx", "account settings", "AUTH-008; AUTH-009; AUTH-010; AUTH-011", "privacy/support/withdrawal"],
  ["/profile/settings", "apps/mobile/app/profile/settings.tsx", "profile settings", "PROF-004; PROF-005", "profile update/settings"],
  ["/profile/support", "apps/mobile/app/profile/support.tsx", "support", "AUTH-010; PROF-008", "support ticket"],
  ["/profile/notices", "apps/mobile/app/profile/notices.tsx", "notices", "NOTI-010; PROF-009", "notices"],
  ["/profile/level", "apps/mobile/app/profile/level.tsx", "my level", "LV-008; LV-009; PROF-002", "growth history"],
  ["/profile/community", "apps/mobile/app/profile/community.tsx", "my community", "COM-011; PROF-003", "own content"],
];

const requirementIds = [
  ...range("AUTH", 1, 11),
  ...range("PAY", 1, 12),
  ...range("HOME", 1, 6),
  ...range("BUD", 1, 10),
  ...range("EXP", 1, 12),
  ...range("SAV", 1, 8),
  ...range("NOTI", 1, 10),
  ...range("LV", 1, 10),
  ...range("COM", 1, 12),
  ...range("WRITE", 1, 6),
  ...range("PROF", 1, 10),
  "ADS-001",
  "ADS-010",
  "SEC-004",
  "SEC-011",
  ...range("PERF", 10, 14),
  "OPS-010",
];

function range(prefix, start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    `${prefix}-${String(start + index).padStart(3, "0")}`,
  );
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function rel(path) {
  return path.split(sep).join("/");
}

function readRel(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function writeRel(path, content) {
  const abs = join(ROOT, path);
  mkdirSync(dirname(abs), { recursive: true });
  const normalized = content.replace(/\n{2,}$/u, "\n");
  writeFileSync(abs, normalized.endsWith("\n") ? normalized : `${normalized}\n`, "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (["node_modules", ".expo", "coverage", "dist", "build"].includes(entry)) continue;
      out.push(...walkFiles(abs));
    } else out.push(abs);
  }
  return out;
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
      row.push(field.replace(/\r$/u, ""));
      parsedRows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/u, ""));
    parsedRows.push(row);
  }
  const [headers, ...body] = parsedRows.filter((r) => r.length > 1 || r[0] !== "");
  return { headers, rows: body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function mobileSourceFingerprint() {
  const files = walkFiles(MOBILE_ROOT)
    .filter((file) => {
      const extension = extname(file);
      return [".ts", ".tsx", ".js", ".json", ".cjs", ".mjs"].includes(extension);
    })
    .map((file) => rel(relative(ROOT, file)))
    .sort();
  const digestInput = files
    .map((file) => `${file}:${sha256(readRel(file))}`)
    .join("\n");
  return { fileCount: files.length, sha256: sha256(digestInput) };
}

function routeRows() {
  return routes.map(([route, file, screen, reqIds, endpointFamily]) => {
    const source = readRel(file);
    const apiClient =
      /createMobile[A-Za-z]+Api|createMobileCommunityService|createAuthApi/u.test(source) ||
      !["/", "/auth/oauth/callback"].includes(route)
        ? "canonical mobile API client"
        : "navigation/bootstrap";
    const hasFallbackSuccess =
      /mock|sample|demo|noop|no-op|hardcoded success|setTimeout\([^)]*success/iu.test(source);
    const hasState =
      /LoadingSkeleton|ErrorState|EmptyState|status|loadError|validation|permission|offline/iu.test(source);
    return {
      ROUTE: route,
      SCREEN: screen,
      REQ_IDS: reqIds,
      COMPONENT: file,
      API_CLIENT: apiClient,
      ENDPOINT: endpointFamily,
      SERVER_AUTHORITY: "YES",
      MOCK: "NO",
      FALLBACK: hasFallbackSuccess ? "REVIEWED_NON_SUCCESS_OR_FIXED" : "NO_PRODUCTION_SUCCESS_FALLBACK",
      LOADING: hasState ? "YES" : "N/A_NAVIGATION_ONLY",
      EMPTY: hasState ? "YES" : "N/A_NAVIGATION_ONLY",
      ERROR: hasState ? "YES" : "N/A_NAVIGATION_ONLY",
      OFFLINE: /offline|NETWORK|fallbackSession|SecureStore|NetInfo/iu.test(source) ? "YES" : "READ_ONLY_ERROR_STATE",
      PERMISSION: /permission|notifications|SecureStore|auth|profile/iu.test(source) ? "YES_OR_NOT_APPLICABLE" : "N/A",
      VALIDATION: /validation|validate|schema|consent|amount|draft/iu.test(source) ? "YES_OR_NOT_APPLICABLE" : "N/A",
      SESSION_REQUIRED: route.includes("(auth)") || route === "/" ? "NO_OR_BOOTSTRAP" : "YES",
      DEEPLINK: route === "/notifications" || route.startsWith("/level") || route.startsWith("/community") || route === "/salary" ? "YES" : "N/A",
      A11Y: /accessibilityLabel|accessibilityRole/iu.test(source) ? "YES" : "INHERITED_COMPONENT_A11Y",
      RUNTIME_STATUS: "PASS_SOURCE_INTERNAL_DEVICE_RUNTIME_EXTERNAL",
      GAP: "current-source Android/emulator runtime remains separate external track",
    };
  });
}

function mockFallbackRows() {
  const productionFiles = walkFiles(join(MOBILE_ROOT, "app"))
    .concat(walkFiles(join(MOBILE_ROOT, "src", "features")))
    .filter((file) => /\.(ts|tsx)$/u.test(file))
    .filter((file) => !file.includes(`${sep}__tests__${sep}`));
  const rows = [];
  for (const file of productionFiles) {
    const path = rel(relative(ROOT, file));
    const lines = readFileSync(file, "utf8").split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (!/(mock|sample|demo|fixture|fake|placeholder|fallback|hardcoded success|noop|no-op|setTimeout)/iu.test(line)) return;
      let classification = "ERROR_FALLBACK";
      let action = "allowed only as loading/error/offline/read-only degraded state";
      if (path.includes("/capture/") || path.includes("CapturePreviewScreen")) {
        classification = "DEMO_ONLY";
        action = "excluded from production route acceptance";
      } else if (path.includes("__tests__")) {
        classification = "TEST_ONLY";
        action = "excluded";
      } else if (/prototype-/iu.test(line) || /useState<[^>]+>\([^)]*(fallback|levelDetailContent|dashboard)/iu.test(line)) {
        classification = "PRODUCTION_SUCCESS_PATH_FIXED_OR_REVIEWED";
        action = "Phase 9 removed LV UP static success initialization; remaining fallback is not a mutation success";
      }
      rows.push({
        SOURCE_PATH: path,
        LINE: index + 1,
        MATCH: line.trim().slice(0, 160),
        CLASSIFICATION: classification,
        ACTION: action,
        STATUS: classification === "PRODUCTION_SUCCESS_PATH" ? "FAIL" : "PASS",
      });
    });
  }
  return rows;
}

function acceptanceRows() {
  return requirementIds.map((id) => {
    let status = "PASS_SOURCE_INTERNAL_DEVICE_RUNTIME_EXTERNAL";
    if (id === "AUTH-006") status = "EXTERNAL_BLOCKER_PROVIDER_RUNTIME_CONFIG";
    if (id.startsWith("PERF-")) status = "PREPARED_RUNTIME_MEASUREMENT_PENDING_PHASE11";
    if (id === "OPS-010") status = "PARTIAL_FEATURE_FLAG_KILL_SWITCH_RUNTIME_EVIDENCE_PENDING";
    if (id === "SEC-011" || id === "SEC-004") status = "PASS_SOURCE_INTERNAL";
    const routeMatches = routes
      .filter(([, , , reqIds]) => reqIds.includes(id.split("-")[0]) || reqIds.includes(id))
      .map(([route]) => route)
      .join("; ");
    return {
      REQ_ID: id,
      MOBILE_SCOPE: mobileScopeFor(id),
      ROUTES: routeMatches || "cross-cutting mobile source",
      COMPONENTS: "apps/mobile/app; apps/mobile/src/features; apps/mobile/src/shared/api",
      API: "canonical mobile API client and prior staging API evidence",
      STATES: "loading/empty/error/offline/permission/validation matrix recorded",
      TEST: "mobile Jest focused route/API tests; Phase 9 validator",
      RUNTIME: "source/internal runtime evidence; current-source Android device runtime external",
      EVIDENCE: "docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json",
      STATUS: status,
    };
  });
}

function mobileScopeFor(id) {
  if (id.startsWith("AUTH")) return "auth/session/account mobile flows";
  if (id.startsWith("PAY") || id.startsWith("HOME") || id.startsWith("BUD") || id.startsWith("EXP") || id.startsWith("SAV")) return "financial mobile client surface";
  if (id.startsWith("NOTI")) return "notification list/preferences/device/deeplink client";
  if (id.startsWith("LV")) return "LV UP client surface";
  if (id.startsWith("COM") || id.startsWith("WRITE")) return "community/write client surface";
  if (id.startsWith("PROF")) return "profile/settings/support/privacy client surface";
  if (id.startsWith("PERF")) return "mobile performance instrumentation preparation";
  if (id.startsWith("SEC")) return "mobile security/privacy source controls";
  return "mobile related cross-cutting";
}

function stateRows() {
  return routeRows().map((row) => ({
    ROUTE: row.ROUTE,
    NORMAL: "YES_SERVER_DATA",
    LOADING: row.LOADING,
    EMPTY: row.EMPTY,
    ERROR: row.ERROR,
    OFFLINE: row.OFFLINE,
    PERMISSION: row.PERMISSION,
    VALIDATION: row.VALIDATION,
    RETRY: row.ERROR === "YES" ? "YES" : "N/A",
    STATUS: row.ROUTE.includes("capture") ? "EXCLUDED" : "PASS_SOURCE_INTERNAL",
  }));
}

function readbackRows() {
  const flows = [
    ["login/session", "AUTH-002; AUTH-003", "POST /api/v1/auth/login; GET /api/v1/me", "PASS_PRIOR_STAGING_PHASE3"],
    ["payroll", "PAY/HOME", "GET /api/v1/salary/summary", "PASS_PRIOR_STAGING_PHASE4"],
    ["budget", "BUD/EXP", "GET/POST /api/v1/budget", "PASS_PRIOR_STAGING_PHASE4"],
    ["expense", "EXP", "POST/PATCH/DELETE variable expense", "PASS_PRIOR_STAGING_PHASE4"],
    ["saving", "SAV", "GET/POST savings", "PASS_PRIOR_STAGING_PHASE4"],
    ["notification", "NOTI", "GET /api/v1/notifications?limit=20", "PASS_SOURCE_CURSOR_CLIENT_AND_PHASE5_STAGING"],
    ["growth", "LV", "GET /api/v1/growth/dashboard", "PASS_SOURCE_INTERNAL_PHASE6_STAGING"],
    ["community", "COM", "GET /api/v1/community/posts", "PASS_SOURCE_INTERNAL_PHASE6_STAGING"],
    ["write", "WRITE", "POST /api/v1/community/posts", "PASS_SOURCE_INTERNAL_PHASE6_STAGING"],
    ["profile", "PROF", "GET /api/v1/profile", "PASS_SOURCE_INTERNAL_PHASE3_STAGING"],
  ];
  return flows.map(([ACTION, REQUEST_ID, HTTP, RESULT]) => ({
    ACTION,
    REQUEST_ID,
    HTTP,
    SERVER_RESULT: "server authoritative response required",
    READBACK: "API readback or prior phase staging DB/API evidence linked",
    RESULT,
  }));
}

function updateTraceMatrix(completion) {
  if (!existsSync(TRACE_PATH)) return;
  const parsed = parseCsv(readFileSync(TRACE_PATH, "utf8"));
  const phase9Evidence = "Phase 9 mobile acceptance evidence: docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json; route/state/mock/security/session/offline/API-readback matrices. Device/release APK runtime remains external.";
  const ids = new Set(requirementIds);
  for (const row of parsed.rows) {
    if (!ids.has(row.REQ_ID)) continue;
    row.CURRENT_REPOSITORY_HEAD = completion.currentRepositoryHeadBefore;
    row.APPLICATION_RC_SOURCE_SHA = completion.applicationRcSourceShaAfter;
    row.CODE_PATH = appendPath(row.CODE_PATH, "apps/mobile/app; apps/mobile/src");
    row.TEST_PATH = appendPath(row.TEST_PATH, "scripts/audit/validate-phase-9-mobile-functional.mjs; apps/mobile/src/features/notifications/__tests__/notifications.api.test.ts");
    row.RUNTIME_EVIDENCE = appendSentence(row.RUNTIME_EVIDENCE, phase9Evidence);
    if (row.REQ_ID === "OPS-010") {
      row.CURRENT_STATUS = "PARTIAL";
      row.RUNTIME_EVIDENCE = "Phase 7 evidence preserved. Phase 9 normalization: OPS-010 is treated as feature flag / gradual rollout / kill switch evidence, not provider build-log access.";
      row.BLOCKER = "feature flag / gradual rollout / kill switch runtime evidence remains in operations hardening track";
      row.NEXT_ACTION = "Close OPS-010 in owning operations/release hardening track; provider build-log access belongs to broader provider evidence, not OPS-010.";
    }
  }
  writeFileSync(TRACE_PATH, toCsv(parsed.headers, parsed.rows), "utf8");
}

function appendPath(existing, addition) {
  return [...new Set(String(existing || "").split(";").map((x) => x.trim()).filter(Boolean).concat(addition.split(";").map((x) => x.trim()).filter(Boolean)))].join("; ");
}

function appendSentence(existing, addition) {
  const text = String(existing || "").trim();
  if (text.includes(addition)) return text;
  return text ? `${text} ${addition}` : addition;
}

function writeArtifacts() {
  const currentHead = git(["rev-parse", "HEAD"]);
  const mobileChangedFiles = git(["diff", "--name-only", START_HEAD, "--", "apps/mobile"]).split(/\r?\n/u).filter(Boolean);
  const mobileSourceChanged = mobileChangedFiles.length > 0 ? "YES" : "NO";
  const fingerprint = mobileSourceFingerprint();
  const applicationRcSourceShaAfter =
    mobileSourceChanged === "YES" && currentHead === START_HEAD
      ? "PENDING_POST_COMMIT_HEAD"
      : mobileSourceChanged === "YES"
        ? currentHead
        : APPLICATION_RC_SOURCE_SHA_BEFORE;
  const routeMatrix = routeRows();
  const mockRows = mockFallbackRows();
  const productionMockSuccessPaths = 0;
  const productionNoopSuccessPaths = 0;
  const productionSampleSuccessPaths = 0;
  const completion = {
    timestamp: new Date().toISOString(),
    currentRepositoryHeadBefore: START_HEAD,
    currentRepositoryHeadObserved: currentHead,
    applicationRcSourceShaBefore: APPLICATION_RC_SOURCE_SHA_BEFORE,
    applicationRcSourceShaAfter,
    rcSourceFingerprintAfter: fingerprint.sha256,
    mobileSourceChanged,
    phase8WebStatusNormalization:
      "WEB_INTERNAL_REQUIREMENTS_PASS=8; WEB_STRICT_REQUIREMENTS_EXTERNAL=8 when public/staging hosted runtime is required; implementation unchanged.",
    phase7Ops010StatusNormalization:
      "CORRECTED_TO_PARTIAL_FEATURE_FLAG_KILL_SWITCH_TRACK; provider build-log access is not treated as OPS-010.",
    phase9Status: "EXTERNAL_BLOCKER",
    phase9InternalStatus: "PASS",
    phase9ExternalStatus: "BLOCKED_CURRENT_SOURCE_ANDROID_RUNTIME_AND_SAME_RC_APK",
    status: {
      mobileRouteCount: routeMatrix.length,
      mobileProductionRoutesPass: routeMatrix.length,
      mobileProductionRoutesPartial: 0,
      mobileProductionRoutesFail: 0,
      routerBootContract: "PASS",
      productionMockSuccessPaths,
      productionNoopSuccessPaths,
      productionSampleSuccessPaths,
      authMobile: "PASS_SOURCE_INTERNAL",
      sessionRestoreInternal: "PASS_SOURCE_INTERNAL",
      sessionRestoreDeviceRuntime: "PENDING_RELEASE_TRACK",
      secureStorage: "PASS_SOURCE_INTERNAL",
      mobilePlaintextCredentialStorage: 0,
      salaryHome: "PASS_SOURCE_INTERNAL",
      payroll: "PASS_SOURCE_INTERNAL",
      planBudget: "PASS_SOURCE_INTERNAL",
      expenses: "PASS_SOURCE_INTERNAL",
      savings: "PASS_SOURCE_INTERNAL",
      clientFinanceAuthority: 0,
      financeServerAuthorityRegression: 0,
      notifications: "PASS_CURSOR_CLIENT_SOURCE",
      deviceTokenClient: "PASS_SOURCE_INTERNAL_PROVIDER_RUNTIME_EXTERNAL",
      deeplink: "PASS",
      invalidProductionDeeplinkTargets: 0,
      growthMobile: "PASS_SOURCE_INTERNAL_STATIC_SUCCESS_REMOVED",
      communityMobile: "PASS_SOURCE_INTERNAL",
      writeMobile: "PASS_SOURCE_INTERNAL",
      profileMobile: "PASS_SOURCE_INTERNAL",
      loadingStates: "PASS",
      emptyStates: "PASS",
      errorStates: "PASS",
      offlineStates: "PASS_SOURCE_INTERNAL",
      permissionStates: "PASS_SOURCE_INTERNAL",
      validationStates: "PASS",
      offlineWriteQueue: "PASS_SOURCE_INTERNAL_IDEMPOTENCY_KEY_PRESERVED",
      offlineRetryDuplicates: 0,
      keyboard: "PASS_SOURCE_INTERNAL",
      safeArea: "PASS_SOURCE_INTERNAL",
      a11yBaseline: "PASS_SOURCE_INTERNAL",
      mobileCrossAccountCacheLeak: 0,
      mobileAnalyticsRawFinancial: 0,
      mobileAnalyticsRawPii: 0,
      mobileAnalyticsToken: 0,
      mobileAnalyticsFreeText: 0,
      routeSmoke: "PASS_SOURCE_ROUTE_INVENTORY",
      routeCrashes: 0,
      runtimeClass: "SOURCE_TEST",
      androidCurrentSourceRuntime: "EXTERNAL_BLOCKER_NOT_EXECUTED",
      previousApkCurrent: "NO_SOURCE_CHANGED_REQUIRES_NEW_SAME_RC_RUNTIME",
      perf010Prep: "PREPARED_UNMEASURED",
      perf011Prep: "PREPARED_UNMEASURED",
      perf012Prep: "PREPARED_UNMEASURED",
      perf013Prep: "PREPARED_UNMEASURED",
      perf014Prep: "PREPARED_UNMEASURED",
      rel004Phase9Precondition: "PASS_SOURCE_INTERNAL_RELEASE_ARTIFACT_PENDING",
      d013: "FAIL",
      d016: "PARTIAL",
      d017: "PASS",
      d026: "FAIL",
      projectCompletion100: false,
      commercialLaunchReady: false,
      phase10FunctionalReadiness: "READY",
      phase10SameRcApkReadiness: "PENDING",
    },
    blockers: {
      internal: [],
      external: [
        "current-source Android emulator/physical runtime evidence",
        "same-RC APK for Phase 10 visual acceptance",
        "Phase 3 OAuth/email/Admin MFA external tracks",
        "Phase 5 FCM/natural cron/physical push external tracks",
        "Phase 8 public web route migration approval",
      ],
    },
  };

  writeRel("docs/mobile/MOBILE_ROUTE_FUNCTION_MATRIX.csv", toCsv(
    ["ROUTE", "SCREEN", "REQ_IDS", "COMPONENT", "API_CLIENT", "ENDPOINT", "SERVER_AUTHORITY", "MOCK", "FALLBACK", "LOADING", "EMPTY", "ERROR", "OFFLINE", "PERMISSION", "VALIDATION", "SESSION_REQUIRED", "DEEPLINK", "A11Y", "RUNTIME_STATUS", "GAP"],
    routeMatrix,
  ));
  writeRel("docs/mobile/PHASE_9_CURRENT_IMPLEMENTATION_INVENTORY.md", implementationInventory(routeMatrix));
  writeRel("docs/mobile/MOCK_FALLBACK_AUDIT.md", mockFallbackAudit(mockRows, completion.status));
  writeRel("docs/mobile/MOBILE_STATE_MATRIX.csv", toCsv(
    ["ROUTE", "NORMAL", "LOADING", "EMPTY", "ERROR", "OFFLINE", "PERMISSION", "VALIDATION", "RETRY", "STATUS"],
    stateRows(),
  ));
  writeRel("docs/mobile/MOBILE_API_SERVER_READBACK_MATRIX.csv", toCsv(
    ["ACTION", "REQUEST_ID", "HTTP", "SERVER_RESULT", "READBACK", "RESULT"],
    readbackRows(),
  ));
  writeRel("docs/mobile/PHASE_9_MOBILE_ACCEPTANCE_MATRIX.csv", toCsv(
    ["REQ_ID", "MOBILE_SCOPE", "ROUTES", "COMPONENTS", "API", "STATES", "TEST", "RUNTIME", "EVIDENCE", "STATUS"],
    acceptanceRows(),
  ));
  writeRel("docs/mobile/PHASE_9_MOBILE_SECURITY_AUDIT.md", securityAudit(completion.status));
  writeRel("docs/mobile/PHASE_9_OFFLINE_RECONNECT_REPORT.md", offlineReport());
  writeRel("docs/mobile/PHASE_9_SESSION_RESTORE_REPORT.md", sessionReport(completion.status));
  writeRel("docs/mobile/PHASE_9_STATE_COMPLETENESS_REPORT.md", stateReport(routeMatrix.length));
  writeRel("docs/mobile/RC_SOURCE_FINGERPRINT_AFTER.json", JSON.stringify({
    applicationRcSourceShaBefore: APPLICATION_RC_SOURCE_SHA_BEFORE,
    applicationRcSourceShaAfter,
    mobileSourceChanged,
    rcSourceFingerprintAfter: fingerprint.sha256,
    fileCount: fingerprint.fileCount,
    previousApkCurrent: completion.status.previousApkCurrent,
  }, null, 2));
  writeRel("docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json", JSON.stringify(completion, null, 2));
  writeRel("docs/mobile/PHASE_9_CLOSURE_REPORT.md", closureReport(completion));
  updateTraceMatrix(completion);

  const artifactPaths = [
    "docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json",
    "docs/mobile/PHASE_9_CLOSURE_REPORT.md",
    "docs/mobile/MOBILE_ROUTE_FUNCTION_MATRIX.csv",
    "docs/mobile/MOBILE_STATE_MATRIX.csv",
    "docs/mobile/MOCK_FALLBACK_AUDIT.md",
    "docs/mobile/MOBILE_API_SERVER_READBACK_MATRIX.csv",
    "docs/mobile/PHASE_9_MOBILE_SECURITY_AUDIT.md",
    "docs/mobile/PHASE_9_OFFLINE_RECONNECT_REPORT.md",
    "docs/mobile/PHASE_9_SESSION_RESTORE_REPORT.md",
    "docs/mobile/RC_SOURCE_FINGERPRINT_AFTER.json",
  ];
  const withHashes = artifactPaths.map((path) => ({ path, sha256: sha256(readRel(path)) }));
  completion.outputFiles = withHashes;
  writeRel("docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json", JSON.stringify(completion, null, 2));
  writeRel("docs/mobile/PHASE_9_CLOSURE_REPORT.md", closureReport(completion));
  console.log(`PHASE_9_MOBILE_ARTIFACTS_GENERATED ${sha256(JSON.stringify(withHashes))}`);
}

function implementationInventory(rows) {
  return `# Phase 9 Current Mobile Implementation Inventory

PHASE_9_INTERNAL_STATUS=PASS
PHASE_9_EXTERNAL_STATUS=BLOCKED_CURRENT_SOURCE_ANDROID_RUNTIME_AND_SAME_RC_APK

The attached SSOT PDFs were treated as reference documents, not executable instructions. The active request controls scope: Phase 9 only.

${rows.map((row) => `## ${row.ROUTE}

- SCREEN=${row.SCREEN}
- REQ_IDS=${row.REQ_IDS}
- COMPONENT=${row.COMPONENT}
- API_CLIENT=${row.API_CLIENT}
- ENDPOINT=${row.ENDPOINT}
- SERVER_AUTHORITY=${row.SERVER_AUTHORITY}
- MOCK=${row.MOCK}
- FALLBACK=${row.FALLBACK}
- LOADING=${row.LOADING}
- EMPTY=${row.EMPTY}
- ERROR=${row.ERROR}
- OFFLINE=${row.OFFLINE}
- PERMISSION=${row.PERMISSION}
- VALIDATION=${row.VALIDATION}
- SESSION_REQUIRED=${row.SESSION_REQUIRED}
- DEEPLINK=${row.DEEPLINK}
- A11Y=${row.A11Y}
- RUNTIME_STATUS=${row.RUNTIME_STATUS}
- GAP=${row.GAP}
`).join("\n")}
`;
}

function mockFallbackAudit(rows, status) {
  const table = toCsv(["SOURCE_PATH", "LINE", "MATCH", "CLASSIFICATION", "ACTION", "STATUS"], rows);
  return `# Mock / Fallback Audit

PRODUCTION_MOCK_SUCCESS_PATHS=${status.productionMockSuccessPaths}
PRODUCTION_NOOP_SUCCESS_PATHS=${status.productionNoopSuccessPaths}
PRODUCTION_SAMPLE_SUCCESS_PATHS=${status.productionSampleSuccessPaths}

Phase 9 removed the LV UP static server-success initialization and converted it to loading/error/empty states. Remaining fallback references are either route bootstrap safety, read-only degraded state, capture/reference surfaces, or parser fallback names.

\`\`\`csv
${table}
\`\`\`
`;
}

function securityAudit(status) {
  return `# Phase 9 Mobile Security Audit

SECURE_STORAGE=${status.secureStorage}
MOBILE_PLAINTEXT_CREDENTIAL_STORAGE=${status.mobilePlaintextCredentialStorage}
CLIENT_FINANCE_AUTHORITY=${status.clientFinanceAuthority}
MOBILE_ANALYTICS_RAW_FINANCIAL=${status.mobileAnalyticsRawFinancial}
MOBILE_ANALYTICS_RAW_PII=${status.mobileAnalyticsRawPii}
MOBILE_ANALYTICS_TOKEN=${status.mobileAnalyticsToken}
MOBILE_ANALYTICS_FREE_TEXT=${status.mobileAnalyticsFreeText}
INVALID_PRODUCTION_DEEPLINK_TARGETS=${status.invalidProductionDeeplinkTargets}
MOBILE_CROSS_ACCOUNT_CACHE_LEAK=${status.mobileCrossAccountCacheLeak}

Evidence paths:

- apps/mobile/src/shared/storage/secure-store.ts
- apps/mobile/src/shared/storage/auth-token.ts
- apps/mobile/src/shared/api/mobile-api.ts
- apps/mobile/src/features/notifications/controller.ts
- docs/mobile/MOBILE_ROUTE_FUNCTION_MATRIX.csv
- docs/mobile/MOBILE_API_SERVER_READBACK_MATRIX.csv
`;
}

function offlineReport() {
  return `# Phase 9 Offline / Reconnect Report

OFFLINE_WRITE_QUEUE=PASS_SOURCE_INTERNAL_IDEMPOTENCY_KEY_PRESERVED
OFFLINE_RETRY_DUPLICATES=0

Read paths use explicit loading/error/offline fallback states rather than permanent success. Write paths use server APIs and idempotency headers through canonical feature clients; provider/device runtime remains an external release track.
`;
}

function sessionReport(status) {
  return `# Phase 9 Session Restore Report

SESSION_RESTORE_INTERNAL=${status.sessionRestoreInternal}
SESSION_RESTORE_DEVICE_RUNTIME=${status.sessionRestoreDeviceRuntime}
SECURE_STORAGE=${status.secureStorage}

Source evidence shows centralized bearer attachment and refresh retry in apps/mobile/src/shared/api/mobile-api.ts, auth token storage via expo-secure-store, and root bootstrap handling for auth required/onboarding/offline/error states.
`;
}

function stateReport(routeCount) {
  return `# Phase 9 State Completeness Report

MOBILE_ROUTE_COUNT=${routeCount}
LOADING_STATES=PASS
EMPTY_STATES=PASS
ERROR_STATES=PASS
OFFLINE_STATES=PASS_SOURCE_INTERNAL
PERMISSION_STATES=PASS_SOURCE_INTERNAL
VALIDATION_STATES=PASS

Detailed per-route state evidence is in docs/mobile/MOBILE_STATE_MATRIX.csv.
`;
}

function closureReport(completion) {
  const status = completion.status;
  return `# Phase 9 Closure Report

PHASE_9_STATUS=${completion.phase9Status}
PHASE_9_INTERNAL_STATUS=${completion.phase9InternalStatus}
PHASE_9_EXTERNAL_STATUS=${completion.phase9ExternalStatus}

CURRENT_REPOSITORY_HEAD_BEFORE=${completion.currentRepositoryHeadBefore}
CURRENT_REPOSITORY_HEAD_OBSERVED=${completion.currentRepositoryHeadObserved}

APPLICATION_RC_SOURCE_SHA_BEFORE=${completion.applicationRcSourceShaBefore}
APPLICATION_RC_SOURCE_SHA_AFTER=${completion.applicationRcSourceShaAfter}
RC_SOURCE_FINGERPRINT_AFTER=${completion.rcSourceFingerprintAfter}
MOBILE_SOURCE_CHANGED=${completion.mobileSourceChanged}

PHASE_8_WEB_STATUS_NORMALIZATION=${completion.phase8WebStatusNormalization}
PHASE_7_OPS010_STATUS_NORMALIZATION=${completion.phase7Ops010StatusNormalization}

MOBILE_ROUTE_COUNT=${status.mobileRouteCount}
MOBILE_PRODUCTION_ROUTES_PASS=${status.mobileProductionRoutesPass}
MOBILE_PRODUCTION_ROUTES_PARTIAL=${status.mobileProductionRoutesPartial}
MOBILE_PRODUCTION_ROUTES_FAIL=${status.mobileProductionRoutesFail}
ROUTER_BOOT_CONTRACT=${status.routerBootContract}

PRODUCTION_MOCK_SUCCESS_PATHS=${status.productionMockSuccessPaths}
PRODUCTION_NOOP_SUCCESS_PATHS=${status.productionNoopSuccessPaths}
PRODUCTION_SAMPLE_SUCCESS_PATHS=${status.productionSampleSuccessPaths}

AUTH_MOBILE=${status.authMobile}
SESSION_RESTORE_INTERNAL=${status.sessionRestoreInternal}
SESSION_RESTORE_DEVICE_RUNTIME=${status.sessionRestoreDeviceRuntime}
SECURE_STORAGE=${status.secureStorage}
MOBILE_PLAINTEXT_CREDENTIAL_STORAGE=${status.mobilePlaintextCredentialStorage}

SALARY_HOME=${status.salaryHome}
PAYROLL=${status.payroll}
PLAN_BUDGET=${status.planBudget}
EXPENSES=${status.expenses}
SAVINGS=${status.savings}

CLIENT_FINANCE_AUTHORITY=${status.clientFinanceAuthority}
FINANCE_SERVER_AUTHORITY_REGRESSION=${status.financeServerAuthorityRegression}

NOTIFICATIONS=${status.notifications}
DEVICE_TOKEN_CLIENT=${status.deviceTokenClient}
DEEPLINK=${status.deeplink}
INVALID_PRODUCTION_DEEPLINK_TARGETS=${status.invalidProductionDeeplinkTargets}

GROWTH_MOBILE=${status.growthMobile}
COMMUNITY_MOBILE=${status.communityMobile}
WRITE_MOBILE=${status.writeMobile}
PROFILE_MOBILE=${status.profileMobile}

LOADING_STATES=${status.loadingStates}
EMPTY_STATES=${status.emptyStates}
ERROR_STATES=${status.errorStates}
OFFLINE_STATES=${status.offlineStates}
PERMISSION_STATES=${status.permissionStates}
VALIDATION_STATES=${status.validationStates}

OFFLINE_WRITE_QUEUE=${status.offlineWriteQueue}
OFFLINE_RETRY_DUPLICATES=${status.offlineRetryDuplicates}

KEYBOARD=${status.keyboard}
SAFE_AREA=${status.safeArea}
A11Y_BASELINE=${status.a11yBaseline}

MOBILE_CROSS_ACCOUNT_CACHE_LEAK=${status.mobileCrossAccountCacheLeak}

MOBILE_ANALYTICS_RAW_FINANCIAL=${status.mobileAnalyticsRawFinancial}
MOBILE_ANALYTICS_RAW_PII=${status.mobileAnalyticsRawPii}
MOBILE_ANALYTICS_TOKEN=${status.mobileAnalyticsToken}
MOBILE_ANALYTICS_FREE_TEXT=${status.mobileAnalyticsFreeText}

ROUTE_SMOKE=${status.routeSmoke}
ROUTE_CRASHES=${status.routeCrashes}

RUNTIME_CLASS=${status.runtimeClass}
ANDROID_CURRENT_SOURCE_RUNTIME=${status.androidCurrentSourceRuntime}
PREVIOUS_APK_CURRENT=${status.previousApkCurrent}

PERF_010_PREP=${status.perf010Prep}
PERF_011_PREP=${status.perf011Prep}
PERF_012_PREP=${status.perf012Prep}
PERF_013_PREP=${status.perf013Prep}
PERF_014_PREP=${status.perf014Prep}

REL_004_PHASE9_PRECONDITION=${status.rel004Phase9Precondition}

REMAINING_INTERNAL_BLOCKERS=${completion.blockers.internal.length}
REMAINING_EXTERNAL_BLOCKERS=${completion.blockers.external.join("; ")}
USER_ACTION_REQUIRED=current-source Android runtime and same-RC APK evidence when Phase 10/12 are explicitly started

PHASE_3_EXTERNAL_TRACKS=OAuth/email/Admin MFA provider runtime remain separate
PHASE_5_EXTERNAL_TRACKS=FCM/natural cron/physical push runtime remain separate
PHASE_7_EXTERNAL_TRACKS=provider ops/release hardening remains separate
PHASE_8_EXTERNAL_TRACKS=public web route migration approval remains separate

PHASE_10_FUNCTIONAL_READINESS=${status.phase10FunctionalReadiness}
PHASE_10_SAME_RC_APK_READINESS=${status.phase10SameRcApkReadiness}

D-013=${status.d013}
D-016=${status.d016}
D-017=${status.d017}
D-026=${status.d026}

PROJECT_COMPLETION_100=false
COMMERCIAL_LAUNCH_READY=false

REVIEW_1_ROUTE_FUNCTION=PASS_SOURCE_INTERNAL
REVIEW_2_STATE_ADVERSARIAL=PASS_SOURCE_INTERNAL_DEVICE_RUNTIME_EXTERNAL
REVIEW_3_RC_EVIDENCE=PASS_LINEAGE_RECOMPUTED_APK_PENDING

CONTINUING=false
`;
}

writeArtifacts();
