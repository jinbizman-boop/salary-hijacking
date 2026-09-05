import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const requiredFiles = [
  "docs/mobile/PHASE_9_CURRENT_IMPLEMENTATION_INVENTORY.md",
  "docs/mobile/MOCK_FALLBACK_AUDIT.md",
  "docs/mobile/MOBILE_STATE_MATRIX.csv",
  "docs/mobile/MOBILE_ROUTE_FUNCTION_MATRIX.csv",
  "docs/mobile/MOBILE_API_SERVER_READBACK_MATRIX.csv",
  "docs/mobile/PHASE_9_MOBILE_SECURITY_AUDIT.md",
  "docs/mobile/PHASE_9_OFFLINE_RECONNECT_REPORT.md",
  "docs/mobile/PHASE_9_SESSION_RESTORE_REPORT.md",
  "docs/mobile/PHASE_9_STATE_COMPLETENESS_REPORT.md",
  "docs/mobile/PHASE_9_MOBILE_ACCEPTANCE_MATRIX.csv",
  "docs/mobile/RC_SOURCE_FINGERPRINT_AFTER.json",
  "docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json",
  "docs/mobile/PHASE_9_CLOSURE_REPORT.md",
];

function fail(message) {
  console.error(`PHASE_9_MOBILE_VALIDATION_FAIL: ${message}`);
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
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return { headers, rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))) };
}

function assertNoSecretLike(rel, text) {
  const patterns = [
    /postgres(?:ql)?:\/\/[^,\s]+/iu,
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/u,
    /sk-[A-Za-z0-9_-]{20,}/u,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/u,
    /"accessToken"\s*:\s*"[^"]+"/iu,
    /"refreshToken"\s*:\s*"[^"]+"/iu,
    /"pushToken"\s*:\s*"[^"]+"/iu,
    /"password"\s*:\s*"[^"]+"/iu,
    /DATABASE_URL\s*[:=]\s*postgres/iu,
  ];
  for (const pattern of patterns) if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
}

for (const rel of requiredFiles) assertNoSecretLike(rel, read(rel));

const completion = JSON.parse(read("docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json"));
if (completion.phase9Status !== "EXTERNAL_BLOCKER") fail("Phase 9 must remain EXTERNAL_BLOCKER without current-source Android runtime");
if (completion.phase9InternalStatus !== "PASS") fail("Phase 9 internal status must be PASS after source closure");
if (!String(completion.phase9ExternalStatus).includes("CURRENT_SOURCE_ANDROID_RUNTIME")) fail("device runtime external blocker missing");
if (completion.status.productionMockSuccessPaths !== 0) fail("production mock success paths must be 0");
if (completion.status.productionNoopSuccessPaths !== 0) fail("production no-op success paths must be 0");
if (completion.status.productionSampleSuccessPaths !== 0) fail("production sample success paths must be 0");
if (completion.status.mobilePlaintextCredentialStorage !== 0) fail("plaintext credential storage must be 0");
if (completion.status.clientFinanceAuthority !== 0) fail("client finance authority must be 0");
if (completion.status.financeServerAuthorityRegression !== 0) fail("financial server authority regression must be 0");
if (completion.status.invalidProductionDeeplinkTargets !== 0) fail("invalid deeplink target count must be 0");
if (completion.status.mobileCrossAccountCacheLeak !== 0) fail("cross-account cache leak must be 0");
if (completion.status.routeCrashes !== 0) fail("route crash count must be 0");
if (completion.status.d013 !== "FAIL" || completion.status.d017 !== "PASS" || completion.status.d026 !== "FAIL") fail("D-status guard mismatch");
if (completion.status.projectCompletion100 !== false || completion.status.commercialLaunchReady !== false) fail("project launch flags must stay false");
if (completion.applicationRcSourceShaAfter === completion.applicationRcSourceShaBefore && completion.mobileSourceChanged === "YES") fail("mobile source changed but RC source SHA was not separated");

const routeMatrix = parseCsv(read("docs/mobile/MOBILE_ROUTE_FUNCTION_MATRIX.csv"));
if (routeMatrix.rows.length < 20) fail("route matrix is incomplete");
for (const route of ["/salary", "/plan", "/notifications", "/level", "/community", "/community/write", "/profile"]) {
  if (!routeMatrix.rows.some((row) => row.ROUTE === route && row.API_CLIENT.includes("canonical"))) fail(`route ${route} missing canonical API evidence`);
}
if (routeMatrix.rows.some((row) => row.MOCK !== "NO")) fail("route matrix has MOCK != NO");

const stateMatrix = parseCsv(read("docs/mobile/MOBILE_STATE_MATRIX.csv"));
if (stateMatrix.rows.length !== routeMatrix.rows.length) fail("state matrix route count mismatch");
if (stateMatrix.rows.some((row) => ["LOADING", "EMPTY", "ERROR"].some((column) => row[column] === ""))) fail("state matrix has blank state evidence");

const acceptance = parseCsv(read("docs/mobile/PHASE_9_MOBILE_ACCEPTANCE_MATRIX.csv"));
for (const id of ["AUTH-001", "PAY-001", "HOME-001", "BUD-001", "EXP-001", "SAV-001", "NOTI-001", "LV-001", "COM-001", "WRITE-001", "PROF-001", "SEC-011"]) {
  if (!acceptance.rows.some((row) => row.REQ_ID === id)) fail(`acceptance matrix missing ${id}`);
}
if (!acceptance.rows.some((row) => row.REQ_ID === "AUTH-006" && row.STATUS.includes("EXTERNAL_BLOCKER"))) fail("AUTH-006 OAuth external blocker not preserved");
if (!acceptance.rows.some((row) => row.REQ_ID === "OPS-010" && row.STATUS.includes("FEATURE_FLAG"))) fail("OPS-010 normalization missing");

const notificationsApi = read("apps/mobile/src/features/notifications/api.ts");
const notificationsTypes = read("apps/mobile/src/features/notifications/types.ts");
if (!notificationsApi.includes("limit: String(limit)") || notificationsApi.includes("pageSize: String(pageSize)")) fail("mobile notification list must use cursor limit, not pageSize");
if (!notificationsTypes.includes("nextCursor: string | null") || !notificationsTypes.includes("hasMore: boolean")) fail("notification list type missing cursor fields");

const levelIndex = read("apps/mobile/app/(tabs)/level/index.tsx");
for (const forbidden of ["4.2.0-prototype-lv-main", "const dashboard: GrowthDashboard", "useState<GrowthDashboard>(dashboard)"]) {
  if (levelIndex.includes(forbidden)) fail(`LV UP static success path remains: ${forbidden}`);
}
for (const rel of ["apps/mobile/app/level/reading.tsx", "apps/mobile/app/level/news.tsx", "apps/mobile/app/level/english.tsx", "apps/mobile/app/level/health.tsx"]) {
  const source = read(rel);
  if (source.includes("levelDetailContent")) fail(`${rel} still imports static detail content as runtime data`);
  if (!source.includes("LoadingSkeleton") || !source.includes("ErrorState") || !source.includes("EmptyState")) fail(`${rel} missing state completeness controls`);
}

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(read(rel))}`).join("\n"));
console.log(`PHASE_9_MOBILE_VALIDATION_PASS ${digest}`);
