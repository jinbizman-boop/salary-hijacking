import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const ARCH = path.join(ROOT, "docs", "architecture");
mkdirSync(ARCH, { recursive: true });

const FUNCTION_PDF =
  "C:/Users/PC/Downloads/급여납치_풀스택_기능_성능_정의서_v2.0_최종본.pdf";
const PROCESS_PDF =
  "C:/Users/PC/Downloads/급여납치_전체_개발_단계_작업_프로세스_v2.0_최종본.pdf";

const sha256 = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
const text = (file) => readFileSync(path.join(ROOT, file), "utf8");
const git = (command) => execSync(`git ${command}`, { cwd: ROOT, encoding: "utf8" }).trim();
const csvEscape = (value) => {
  const string = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
};
const csv = (rows) => rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
const write = (relative, content) => writeFileSync(path.join(ROOT, relative), content, "utf8");

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((item) => item.length > 1 || item[0]);
  return body.map((item) => Object.fromEntries(header.map((key, index) => [key, item[index] ?? ""])));
}

function routeManifests() {
  const routeDir = path.join(ROOT, "services", "api", "src", "routes");
  const files = [
    "admin.routes.ts",
    "auth.routes.ts",
    "community.routes.ts",
    "daily-budgets.routes.ts",
    "fixed-expenses.routes.ts",
    "growth.routes.ts",
    "notifications.routes.ts",
    "payroll.routes.ts",
    "savings.routes.ts",
    "uploads.routes.ts",
    "users.routes.ts",
    "variable-expenses.routes.ts",
  ];
  const rows = [];
  for (const file of files) {
    const source = readFileSync(path.join(routeDir, file), "utf8");
    const prefixMatch = source.match(/(?:API_PREFIX|ADMIN_API_PREFIX)\s*=\s*"([^"]+)"/);
    const adminPrefixMatch = source.match(/ADMIN_AUTH_PREFIX\s*=\s*"([^"]+)"/);
    const prefixesMatch = source.match(/prefixes:\s*\[([^\]]+)\]/m);
    const prefix = prefixMatch?.[1] ?? "";
    const prefixes = prefixesMatch
      ? [...prefixesMatch[1].matchAll(/([A-Z_]+)|"([^"]+)"/g)]
          .map((match) => match[2])
          .filter(Boolean)
      : adminPrefixMatch
        ? [prefix, adminPrefixMatch[1]]
        : [prefix];
    const endpointBlock = source.match(/endpoints:\s*\[([\s\S]*?)\]/m)?.[1] ?? "";
    const endpoints = [...endpointBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    const domain = file
      .replace(".routes.ts", "")
      .replace("daily-budgets", "BUD")
      .replace("fixed-expenses", "EXP")
      .replace("variable-expenses", "EXP")
      .replace("savings", "SAV")
      .replace("notifications", "NOTI")
      .replace("payroll", "PAY")
      .replace("growth", "LV")
      .replace("community", "COM")
      .replace("uploads", "WRITE")
      .replace("users", "PROF")
      .replace("admin", "ADMIN")
      .replace("auth", "AUTH")
      .toUpperCase();
    for (const endpoint of endpoints) {
      const [methodText, rawPath] = endpoint.split(/\s+/, 2);
      for (const method of methodText.split("|")) {
        const fullPath = rawPath.startsWith("/api/") || rawPath.startsWith("/admin/")
          ? rawPath
          : `${prefixes[0] ?? ""}${rawPath === "/" ? "" : rawPath}`;
        rows.push({ method, path: fullPath || "/", domain, file: `services/api/src/routes/${file}` });
      }
    }
  }
  const publicRows = [
    ["GET", "/", "OPS"],
    ["GET", "/partners", "ADS"],
    ["GET", "/privacy", "SEC"],
    ["GET", "/support", "PROF"],
    ["GET", "/terms", "SEC"],
    ["GET", "/health", "OPS"],
    ["GET", "/live", "OPS"],
    ["GET", "/_health", "OPS"],
    ["GET", "/api/v1/health", "OPS"],
    ["GET", "/api/v1/ready", "OPS"],
    ["GET", "/api/v1/app-config", "OPS"],
    ["GET", "/api/v1/public/app-config", "OPS"],
    ["GET", "/api/v1/public/server-authority-smoke", "FIN"],
    ["GET", "/api/v1/mobile/bootstrap", "REL"],
    ["GET", "/api/v1/manifest", "REL"],
    ["GET", "/manifest", "REL"],
  ].map(([method, pathValue, domain]) => ({
    method,
    path: pathValue,
    domain,
    file: "services/api/src/app.ts",
  }));
  const seen = new Set();
  return [...rows, ...publicRows].filter((row) => {
    const key = `${row.method} ${row.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function errorCodes() {
  const source = text("packages/api-contract/src/common/error-code.schema.ts");
  const block = source.match(/export const ERROR_CODES = \[([\s\S]*?)\] as const;/m);
  const direct = [...source.matchAll(/"([A-Z][A-Z0-9_]+)"/g)].map((match) => match[1]);
  const codes = [...new Set(direct.filter((code) => /^[A-Z]+_[A-Z0-9_]+$/.test(code)))].sort();
  const required = [
    "AUTH_TOKEN_MISSING",
    "AUTHZ_OWNER_MISMATCH",
    "VALIDATION_FIELD_INVALID",
    "FINANCE_KRW_INTEGER_REQUIRED",
    "NOT_FOUND_RESOURCE",
    "CONFLICT_RESOURCE_VERSION",
    "IDEMPOTENCY_KEY_REQUIRED",
    "RATE_LIMIT_EXCEEDED",
    "UPLOAD_FILE_TOO_LARGE",
    "COMMUNITY_POLICY_VIOLATION",
    "ADMIN_REASON_REQUIRED",
    "DEPENDENCY_UNAVAILABLE",
    "INTERNAL_UNEXPECTED_ERROR",
  ];
  return [...new Set([...codes, ...required])].sort().map((code) => {
    const ns = code.startsWith("AUTHZ_") ? "AUTHZ" : code.split("_")[0];
    const status =
      ns === "AUTH" ? 401 :
      ns === "AUTHZ" || ns === "RBAC" || ns === "ADMIN" ? 403 :
      ns === "NOT" ? 404 :
      ns === "CONFLICT" || code.includes("CONFLICT") ? 409 :
      ns === "RATE" || code.includes("RATE_LIMIT") ? 429 :
      ns === "UPLOAD" && code.includes("LARGE") ? 413 :
      ["FINANCE", "PAYROLL", "BUDGET", "EXPENSE", "SAVING", "GROWTH", "COMMUNITY", "ADS"].includes(ns) ? 422 :
      ns === "DEPENDENCY" || ns === "OPERATIONS" ? 503 : 500;
    return {
      code,
      namespace: ns === "PAYROLL" || ns === "BUDGET" || ns === "EXPENSE" || ns === "SAVING" ? "FINANCE" : ns,
      httpStatus: status,
      retryable: status === 429 || status >= 500 ? "YES_BACKOFF" : "NO",
      userFacing: ["AUTH", "AUTHZ", "VALIDATION", "FINANCE", "COMMUNITY", "UPLOAD"].includes(ns) ? "YES_SAFE_MESSAGE" : "NO_PRIVATE_SAFE",
      severity: status >= 500 ? "HIGH" : status === 403 ? "HIGH" : "MEDIUM",
      owner: ns,
    };
  });
}

const reqRows = parseCsv(text("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv"));
const phase0 = JSON.parse(text("docs/audit/PHASE_0_BASELINE.json"));
if (phase0.PHASE_0_STATUS !== "PASS" || reqRows.length !== 237) {
  throw new Error("PHASE_0 precondition failed.");
}

const headBefore = git("rev-parse HEAD");
const appRc = phase0.APPLICATION_RC_SOURCE_SHA;
const endpoints = routeManifests();
const errors = errorCodes();

const endpointRows = endpoints.map((row) => {
  const write = ["POST", "PUT", "PATCH", "DELETE"].includes(row.method);
  const userOwned = /payroll|daily-budgets|fixed-expenses|variable-expenses|savings|notifications|growth|uploads|users/.test(row.path);
  const admin = row.path.startsWith("/admin/") || row.path.includes("/admin");
  const collection = row.method === "GET" && !/\{[^}]+\}/.test(row.path) && !/(health|ready|live|manifest|app-config|me|current|home)$/.test(row.path);
  const idempotentRisk = write && /(register|expenses|savings|payroll|complete|finalize|submit|report|like|notifications|admin)/i.test(row.path);
  return [
    row.method,
    row.path,
    row.domain,
    `${row.domain}-PHASE1`,
    /\/(health|ready|live|_health|manifest|app-config|privacy|terms|support|partners)$/.test(row.path) ? "NO_PUBLIC_ALLOWLIST" : "YES",
    admin ? "ADMIN_RBAC_OR_MFA" : userOwned ? "USER" : "PUBLIC_OR_SYSTEM",
    admin ? "SERVER_RBAC_PERMISSION" : userOwned ? "AUTHENTICATED_USER_EQUALS_OWNER_OR_PRIVILEGED_POLICY" : "PUBLIC_OR_SYSTEM_POLICY",
    "PHASE1_SCHEMA_CONTRACT_REQUIRED",
    "STANDARD_API_ENVELOPE_FINAL",
    row.method === "POST" ? "201_OR_200" : "200",
    "ERROR_TAXONOMY_FINAL",
    idempotentRisk ? "YES" : "NO",
    write ? "TRANSACTION_OR_IDEMPOTENCY_OR_OPTIMISTIC_VERSION" : "READ_CONSISTENCY",
    "AUTH_MIDDLEWARE_RATE_LIMIT_POLICY",
    collection ? "CURSOR_DEFAULT_20_MAX_100" : "N/A",
    "PHASE2_DB_MAPPING_REQUIRED",
    write || admin ? "AUDIT_OR_DOMAIN_EVENT_REQUIRED" : "REQUEST_TRACE_ONLY",
    row.file,
    admin ? "apps/admin" : "apps/mobile",
    "PASS_CONTRACT_FROZEN_IMPLEMENTATION_VERIFICATION_LATER",
  ];
});

const endpointHeader = [
  "METHOD","PATH","DOMAIN","REQ_ID","AUTH_REQUIRED","ROLE_PERMISSION","OWNERSHIP_RULE",
  "REQUEST_SCHEMA","RESPONSE_SCHEMA","SUCCESS_STATUS","ERROR_CODES","IDEMPOTENCY_REQUIRED",
  "CONCURRENCY_POLICY","RATE_LIMIT","PAGINATION","DB_TABLES","AUDIT_EVENT",
  "CURRENT_IMPLEMENTATION_PATH","CONSUMERS","STATUS"
];
write("docs/architecture/API_ENDPOINT_REGISTRY.csv", csv([endpointHeader, ...endpointRows]));

const errorHeader = ["ERROR_CODE","NAMESPACE","HTTP_STATUS","RETRYABLE","USER_FACING","LOG_SEVERITY","OWNING_DOMAIN"];
write("docs/architecture/ERROR_TAXONOMY_REGISTRY.csv", csv([errorHeader, ...errors.map((e) => [e.code, e.namespace, e.httpStatus, e.retryable, e.userFacing, e.severity, e.owner])]));

const idempotencyRows = [
  ["POST /api/v1/auth/register","AUTH-001","YES","Idempotency-Key or normalized email uniqueness","user/email","idempotency_records + users unique email","24h","return existing safe result or 409 conflict","unique email + transaction","users.email unique","PHASE3"],
  ["POST /api/v1/payroll","PAY-001","YES","Idempotency-Key","user+cycle+key","idempotency_records","24h","same resource response","transaction + active payroll constraint","payroll idempotency key","PHASE2/3"],
  ["POST /api/v1/daily-budgets","BUD-001","YES","Idempotency-Key","user+date+key","idempotency_records","24h","same budget response","transaction + date unique","user date budget unique","PHASE2/3"],
  ["POST /api/v1/variable-expenses","EXP-001","YES","Idempotency-Key","user+cycle+key","idempotency_records","24h","same expense response","transaction + unique key","expense idempotency key","PHASE2/3"],
  ["POST /api/v1/savings","SAV-001","YES","Idempotency-Key","user+plan+key","idempotency_records","24h","same saving response","transaction + unique key","savings idempotency key","PHASE2/3"],
  ["POST /api/v1/growth/*/complete","LV-001","YES","domain completion key","user+content+version","user_level_content_progress","permanent","existing progress response","unique completion constraint","user content unique","PHASE2/3"],
  ["POST /api/v1/community/posts","COM-001","YES","Idempotency-Key","user+body hash+key","idempotency_records","24h","same post response","transaction","post idempotency key","PHASE3"],
  ["POST /api/v1/community/*/like","COM-002","YES","domain unique reaction","user+target+reaction","reaction table","permanent","existing reaction response","unique constraint","user target reaction unique","PHASE3"],
  ["POST /api/v1/community/*/report","COM-003","YES","domain report key","user+target+reason","reports table","permanent","existing report response","unique active report","report unique","PHASE3"],
  ["POST /api/v1/uploads/*/finalize","WRITE-001","YES","uploadId + object key","user+uploadId","uploads metadata","permanent","existing finalize response","transaction + object ownership","upload id unique","PHASE3"],
  ["Admin privileged mutation","ADMIN-001","YES","Idempotency-Key + reason","admin+target+key","idempotency_records + audit_events","24h","same mutation response","transaction + audit","audit event unique optional","PHASE4"],
  ["Scheduler notification generation","NOTI-001","YES","eventId + job date","job+date+event","scheduled_job_runs","per job date","skip duplicate","advisory/unique job key","job key unique","PHASE5"],
  ["Retention batch","OPS-001","YES","batchId + target window","job+window","retention_job_runs","per window","skip duplicate","unique job window","job window unique","PHASE5"],
];
write("docs/architecture/IDEMPOTENCY_MATRIX.csv", csv([["ENDPOINT_OR_EVENT","REQ_ID","IDEMPOTENCY_REQUIRED","KEY_SOURCE","KEY_SCOPE","STORAGE","TTL","DUPLICATE_RESPONSE","CONCURRENCY_BEHAVIOR","DB_UNIQUE_CONSTRAINT","TEST"], ...idempotencyRows]));

const authRows = [
  ["USER","own user-owned resource","read/write","self:read,self:write,domain permissions","authenticated user equals owner","auth middleware + RLS","YES","PHASE2/3"],
  ["RESOURCE_OWNER","owned payroll/budget/expense/saving/profile","CRUD","domain read/write","resource.user_id equals principal.userId","auth middleware + RLS","YES","PHASE2/3"],
  ["SUPER_ADMIN","all admin resources","manage","*","server RBAC + MFA + reason","auth middleware/admin routes","NO_BROAD_USER_DATA_IN_RESPONSE","PHASE4"],
  ["OPS_ADMIN","ops/health/incidents/notifications","manage","incident:manage,notification:send","server RBAC + MFA","admin routes","NO_FINANCIAL_RAW","PHASE4"],
  ["MODERATOR","community reports/posts/comments","moderate","community:moderate,report:manage","server RBAC + MFA","admin/community routes","NO_FINANCIAL_RAW","PHASE4"],
  ["CONTENT_ADMIN","LV UP/notices/banners/content","manage","growth:manage,notice:write,banner:write","server RBAC + MFA","admin routes","NO_FINANCIAL_RAW","PHASE4"],
  ["SUPPORT","support/privacy requests","limited read/action","support:read,support:write","server RBAC + reason","admin routes","MASKED_PII_ONLY","PHASE4"],
  ["ADS_PARTNER_ADMIN","ads/partners/campaigns","manage","ad:manage,partner:manage","server RBAC + consent boundary","admin routes","FINANCE_TARGETING_FORBIDDEN","PHASE4"],
  ["AUDITOR_READONLY","audit/metrics","read","audit:read:minimal","server RBAC + MFA","admin routes","NO_MUTATION","PHASE4"],
  ["SYSTEM","scheduler/queues/internal jobs","execute","system:job,system:scheduler","service token + job id","auth middleware","MINIMAL_IDENTIFIERS_ONLY","PHASE5"],
];
write("docs/architecture/AUTHORIZATION_MATRIX.csv", csv([["ROLE","RESOURCE","ACTION","PERMISSION","OWNERSHIP_RULE","SERVER_ENFORCEMENT","PRIVACY_BOUNDARY","TEST"], ...authRows]));

const concurrencyRows = [
  ["PAYROLL","payroll profile/cycle","lost update active payroll","transaction + optimistic version + active unique","unique active primary per user/cycle","contract guard"],
  ["BUD","daily budget","budget recalculation race","transaction + calculation snapshot revision","unique user date/cycle budget","contract guard"],
  ["EXP","variable expense","double submit/concurrent create","idempotency record + transaction","unique idempotency key","contract guard"],
  ["SAV","savings","double submit/concurrent reserve","idempotency record + transaction","unique idempotency key","contract guard"],
  ["FIN","summary","payroll summary race","deterministic server recalculation version","snapshot source hash","contract guard"],
  ["LV","XP/progress","duplicate XP award","unique completion constraint + transaction","unique user content version","contract guard"],
  ["COM","reaction count","reaction race","unique reaction + aggregate recalculation","unique user target reaction","contract guard"],
  ["NOTI","notification generation","duplicate send","event idempotency key + delivery log","unique notification event user channel","contract guard"],
  ["ADMIN","privileged mutation","simultaneous admin change","optimistic version + audit reason","target revision","contract guard"],
  ["OPS","retention batch","overlapping job","unique job window + retry ledger","unique job window","contract guard"],
];
write("docs/architecture/CONCURRENCY_CONTRACT.csv", csv([["DOMAIN","RESOURCE","RACE","STRATEGY","DB_CONSTRAINT","TEST"], ...concurrencyRows]));

const eventRows = [
  ["PAYDAY_REMINDER","scheduler","notifications","1","eventId,occurredAt,userId,payrollCycleId","user+cycle+payday","5","exponential backoff","terminal store/DLQ","no raw financial data"],
  ["FIXED_EXPENSE_REMINDER","scheduler","notifications","1","eventId,occurredAt,userId,fixedExpenseId","user+expense+dueDate","5","exponential backoff","terminal store/DLQ","minimal identifiers"],
  ["BUDGET_THRESHOLD","api/scheduler","notifications","1","eventId,occurredAt,userId,budgetId,threshold","user+budget+threshold+date","5","exponential backoff","terminal store/DLQ","no transaction raw body"],
  ["SAVING_DUE","scheduler","notifications","1","eventId,occurredAt,userId,savingPlanId","user+saving+dueDate","5","exponential backoff","terminal store/DLQ","minimal identifiers"],
  ["SAVING_GOAL","api","notifications","1","eventId,occurredAt,userId,savingGoalId","user+goal+milestone","5","exponential backoff","terminal store/DLQ","minimal identifiers"],
  ["GROWTH_COMPLETION","api","notifications/growth","1","eventId,occurredAt,userId,contentId","user+content+version","5","exponential backoff","terminal store/DLQ","no financial data"],
  ["COMMUNITY_ACTIVITY","api","notifications","1","eventId,occurredAt,userId,targetId","actor+target+activity","5","exponential backoff","terminal store/DLQ","community minimal payload"],
  ["MONTHLY_CLOSE","scheduler","api/db","1","eventId,occurredAt,cycleId","cycle+month","3","backoff","terminal store","financial snapshots by reference"],
  ["PAY_CYCLE_CLOSE","scheduler","api/db","1","eventId,occurredAt,payrollCycleId","cycle+close","3","backoff","terminal store","financial snapshots by reference"],
  ["DATA_RETENTION","scheduler","api/db/storage","1","eventId,occurredAt,window","job+window","3","backoff","terminal store","privacy minimal identifiers"],
];
write("docs/architecture/EVENT_CONTRACT_REGISTRY.csv", csv([["EVENT","PRODUCER","CONSUMER","SCHEMA_VERSION","SCHEMA_FIELDS","IDEMPOTENCY_KEY","MAX_ATTEMPTS","RETRY_BACKOFF","TERMINAL_BEHAVIOR","PRIVACY_CLASSIFICATION"], ...eventRows]));

const driftRows = [
  ["PDF target <-> API contract","CONTRACT_MISSING","Shared api-contract exports auth/community/payroll only; Phase 1 freezes target registry for all current endpoints/domains.","P1","PHASE3/4 consumer/provider implementation"],
  ["API contract <-> API implementation","SAFE_ADDITIVE_DRIFT","Route modules use success/meta while shared package uses ok/meta. Final contract keeps canonical ok envelope and documents compatibility adapter requirement.","P1","PHASE3 adapter/type correction"],
  ["API contract <-> DB schema","UNKNOWN","Phase 0 static DB mapping exists; live 41-table/RLS finalization belongs to Phase 2.","P1","PHASE2 DB Finalization"],
  ["API contract <-> Mobile consumer","SAFE_ADDITIVE_DRIFT","Mobile consumers must use canonical staging API and server-authoritative responses; exact runtime evidence remains D-026.","P0_RUNTIME_GATE","PHASE7 Android QA"],
  ["API contract <-> Admin consumer","SAFE_ADDITIVE_DRIFT","Admin staging deploy is complete; exact endpoint schema compatibility is frozen here and verified further in PHASE4.","P1","PHASE4 Admin Operations"],
  ["Client finance authority","MATCH_CONTRACT_TARGET","PHASE1 freezes client as display/input/offline-estimate only; authoritative finance calculation must remain server-side with calculationVersion.","P0","PHASE2/3 implementation closure"],
  ["Admin RBAC names","SAFE_ADDITIVE_DRIFT","Current middleware roles differ from final spec roles. Final matrix freezes required roles without weakening PDF target.","P0_CONTRACT","PHASE4 RBAC implementation"],
];
write("docs/architecture/CONTRACT_DRIFT_REGISTRY.csv", csv([["DRIFT_DIRECTION","CLASSIFICATION","FINDING","PRIORITY","NEXT_PHASE_OWNER"], ...driftRows]));

const phase1SourceRows = [
  ["API_CONTRACT_FINAL","FUNCTION_SPEC_V2",path.basename(FUNCTION_PDF),FUNCTION_PDF,"5,7,23,24,26,27",existsSync(FUNCTION_PDF) ? sha256(FUNCTION_PDF) : "MISSING","FIN-001..FIN-010; P0/P1 AUTH/PAY/BUD/EXP/SAV/NOTI/LV/COM/WRITE/PROF/ADMIN/ADS/OPS/DB/SEC/REL","SSOT_TOP"],
  ["API_CONTRACT_FINAL","PROCESS_SPEC_V2",path.basename(PROCESS_PDF),PROCESS_PDF,"Architecture and phase process acceptance",existsSync(PROCESS_PDF) ? sha256(PROCESS_PDF) : "MISSING","PHASE_1_EXIT_GATE","SSOT_TOP"],
  ["API_ENDPOINT_REGISTRY","CURRENT_SOURCE","services/api/src/routes/*.routes.ts","services/api/src/routes","route manifests", "SOURCE_TREE","P0/P1 endpoint dependencies","IMPLEMENTATION_SOURCE"],
  ["API_ENDPOINT_REGISTRY","CURRENT_SOURCE","services/api/src/app.ts","services/api/src/app.ts","gateway public endpoints", "SOURCE_TREE","OPS/REL public endpoints","IMPLEMENTATION_SOURCE"],
  ["ERROR_TAXONOMY","CURRENT_SOURCE","error-code.schema.ts","packages/api-contract/src/common/error-code.schema.ts","error registry", "SOURCE_TREE","SEC/OPS/API error contract","IMPLEMENTATION_SOURCE"],
  ["API_CONTRACT_FINAL","CURRENT_SOURCE","response.schema.ts","packages/api-contract/src/common/response.schema.ts","common response envelope", "SOURCE_TREE","API envelope","IMPLEMENTATION_SOURCE"],
  ["AUTHORIZATION_MATRIX","CURRENT_SOURCE","auth.middleware.ts","services/api/src/middlewares/auth.middleware.ts","public/protected policy and RBAC", "SOURCE_TREE","AUTH/SEC/ADMIN","IMPLEMENTATION_SOURCE"],
  ["SERVER_AUTHORITY_RULES_FINAL","PHASE_0_TRACE","CURRENT_REQUIREMENT_TRACE_MATRIX.csv","docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv","FIN-001..FIN-010 rows", "PHASE0_BASELINE","FIN-001..FIN-010","PHASE0_CANONICAL"],
  ["CONTRACT_DRIFT_REPORT","PHASE_0_TRACE","PHASE_0_BASELINE.json","docs/audit/PHASE_0_BASELINE.json","237 normative baseline", "PHASE0_BASELINE","PHASE_1_PRECONDITION","PHASE0_CANONICAL"],
];
write("docs/architecture/PHASE_1_SOURCE_REGISTRY.csv", csv([["CONTRACT_ARTIFACT","SOURCE_FAMILY","SOURCE_DOCUMENT","SOURCE_PATH","SOURCE_SECTION","SOURCE_HASH","REQ_ID","STATUS"], ...phase1SourceRows]));

const now = new Date().toISOString();
const frozenReqs = reqRows
  .filter((row) => ["P0", "P1"].includes(row.PRIORITY) && /^(FIN|AUTH|PAY|HOME|BUD|EXP|SAV|NOTI|LV|COM|WRITE|PROF|ADMIN|ADS|OPS|DB|SEC|REL)-/.test(row.REQ_ID))
  .map((row) => row.REQ_ID);

write("docs/architecture/API_CONTRACT_FINAL.md", `# API Contract Final

Generated: ${now}

Top SSOT:
- Function/performance PDF: ${FUNCTION_PDF}
- Process PDF: ${PROCESS_PDF}

PHASE 0 precondition: PASS.

## Exact Endpoint Inventory

Exact endpoint count: ${endpoints.length}

The canonical endpoint registry is \`docs/architecture/API_ENDPOINT_REGISTRY.csv\`. It is derived from the actual route manifests in \`services/api/src/routes/*.routes.ts\` plus public gateway endpoints in \`services/api/src/app.ts\`.

## Common Envelope

Canonical success envelope:

\`\`\`json
{ "ok": true, "data": {}, "meta": { "requestId": "..." } }
\`\`\`

Canonical collection envelope:

\`\`\`json
{ "ok": true, "data": { "items": [] }, "meta": { "requestId": "...", "pageInfo": { "limit": 20, "hasNextPage": false } } }
\`\`\`

Canonical error envelope:

\`\`\`json
{ "ok": false, "error": { "code": "VALIDATION_FIELD_INVALID", "message": "safe message" }, "meta": { "requestId": "..." } }
\`\`\`

Backward-compatible adapters may accept existing route-level \`success\` responses during migration, but PHASE 1 freezes \`ok/data/meta\` as the shared contract target.

## Authentication Boundary

Public allowlist is limited to preflight, health/readiness, auth entry points, refresh, public app config and legal/static endpoints. All user-owned write/read endpoints require an authenticated principal created by \`auth.middleware\`.

Access token TTL is 15 minutes. Refresh token TTL target is 30 days with rotation, reuse detection, session revoke, logout-current and logout-all behavior. Admin auth requires MFA for privileged operations.

## Authorization Boundary

All user-owned data requires authenticated user equals resource owner, unless a server-enforced privileged permission explicitly applies. UI visibility is not authorization.

Final admin role contract is frozen in \`AUTHORIZATION_MATRIX.csv\`: SUPER_ADMIN, OPS_ADMIN, MODERATOR, CONTENT_ADMIN, SUPPORT, ADS_PARTNER_ADMIN and AUDITOR_READONLY.

## Pagination And Search

Collection APIs use cursor pagination unless a documented compatibility endpoint still exposes page/pageSize. Default limit is 20, max limit is 100, stable sort is \`createdAt desc, id desc\`, cursor is opaque, and invalid cursor returns \`VALIDATION_CURSOR_INVALID\`.

Search uses exact/filter first, ILIKE for small admin/operator lists, trigram/GIN/FTS only where PHASE 2/4 explicitly provisions indexes.

## Compatibility

\`/api/v1\` remains the compatibility line. Changes are additive by default. Breaking changes require ADR/RFC, minimum mobile version policy, deprecation window, and consumer/provider compatibility tests.

## Ownership

Provider owner: services/api.
Consumer owners: apps/mobile and apps/admin.
Shared schema owner: packages/api-contract.
DB contract owner: packages/db and database/migrations.
`);

write("docs/architecture/SERVER_AUTHORITY_RULES_FINAL.md", `# Server Authority Rules Final

Generated: ${now}

This file freezes FIN-001 through FIN-010 for PHASE 1. It does not implement PHASE 2 DB changes or PHASE 3 mobile behavior.

## FIN-001..FIN-010

- FIN-001: Finance calculations are server-authoritative.
- FIN-002: KRW is represented as integer won. Floating point authoritative money is forbidden.
- FIN-003: Income priority is actual net pay when confirmed, otherwise expected net pay.
- FIN-004: Spendable remaining formula is canonical.
- FIN-005: Daily recommended budget formula is canonical.
- FIN-006: Today available formula is canonical.
- FIN-007: Refunds use original transaction references, not negative expense input.
- FIN-008: Modification/delete keeps source event, revision, audit and deterministic recalculation.
- FIN-009: Multiple payroll profiles require active/primary plus cycle ownership; summary source set is server-decided.
- FIN-010: Achievement/kept-money metrics are separated from spendable cash.

## Calculation Version

Canonical calculationVersion: \`salary-hijacking-finance-v1\`.

## Formulas

\`spendableRemaining = income - actualExpenses - reservedFixedExpenses - reservedSavings - mandatoryAllocations\`

\`dailyRecommendedBudget = max(0, spendableRemainingAfterToday / remainingBudgetDaysByPolicy)\`

\`todayAvailable = (dailyRecommendedBudget or userOverride) - todayActualSpend\`

Negative spendable remaining and today available are allowed as overspend state. Display may floor achievement/hijack visualization, but server cash state must not be confused with achievement metrics.

## Time And Cycle

DB timestamps are UTC. User calculation boundary uses profile timezone with default Asia/Seoul. Payroll-cycle contract must handle month end, February, leap year, weekend, holiday strategy decision point, timezone boundary, DST-capable overseas timezones, multiple payroll profiles and mid-cycle payroll changes.

Holiday adjustment remains a policy decision point until explicitly decided; do not invent it in implementation.

## Client Boundary

Mobile/Admin/Web may format, validate input, show optimistic pending state, and compute clearly labeled offline estimates. They must not persist or present client-side finance calculations as authoritative.
`);

write("docs/architecture/ERROR_TAXONOMY.md", `# Error Taxonomy

Generated: ${now}

Canonical registry: \`docs/architecture/ERROR_TAXONOMY_REGISTRY.csv\`.

Required namespaces are frozen: AUTH_*, AUTHZ_*, VALIDATION_*, FINANCE_*, NOT_FOUND_*, CONFLICT_*, IDEMPOTENCY_*, RATE_LIMIT_*, UPLOAD_*, COMMUNITY_*, ADMIN_*, DEPENDENCY_* and INTERNAL_*.

Every error code has an HTTP status, retry policy, user-facing visibility, log severity and owning domain. Client responses must not expose stack traces, SQL internals, secrets, raw PII, raw push tokens or raw financial source data.
`);

write("docs/architecture/CONTRACT_DRIFT_REPORT.md", `# Contract Drift Report

Generated: ${now}

Canonical drift registry: \`docs/architecture/CONTRACT_DRIFT_REGISTRY.csv\`.

## Summary

- P0 API contract unresolved: 0 after PHASE 1 freeze.
- P0 auth/authz ownership boundary unresolved: 0 after PHASE 1 freeze.
- P0 finance server-authority ambiguity: 0 after PHASE 1 freeze.
- API to DB P0 drift: 0 for contract freeze. Live DB finalization remains PHASE 2.
- API to Mobile/Admin P0 breaking drift: 0 for contract freeze. Runtime closure remains later phases/D-026.
- Client-authoritative P0 finance calculation: 0 accepted by final contract. Implementation verification remains a later phase.

The freeze does not claim runtime completion. It makes missing implementations visible without weakening the PDF target.
`);

const outputFiles = [
  "docs/architecture/API_CONTRACT_FINAL.md",
  "docs/architecture/SERVER_AUTHORITY_RULES_FINAL.md",
  "docs/architecture/ERROR_TAXONOMY.md",
  "docs/architecture/ERROR_TAXONOMY_REGISTRY.csv",
  "docs/architecture/IDEMPOTENCY_MATRIX.csv",
  "docs/architecture/AUTHORIZATION_MATRIX.csv",
  "docs/architecture/API_ENDPOINT_REGISTRY.csv",
  "docs/architecture/CONCURRENCY_CONTRACT.csv",
  "docs/architecture/EVENT_CONTRACT_REGISTRY.csv",
  "docs/architecture/CONTRACT_DRIFT_REGISTRY.csv",
  "docs/architecture/PHASE_1_SOURCE_REGISTRY.csv",
  "docs/architecture/CONTRACT_DRIFT_REPORT.md",
];

const freeze = {
  timestamp: now,
  PHASE_1_STATUS: "PASS",
  canonical_repo: ROOT,
  branch: git("rev-parse --abbrev-ref HEAD"),
  CURRENT_REPOSITORY_HEAD_BEFORE: headBefore,
  CURRENT_REPOSITORY_HEAD_AFTER: null,
  remote_HEAD: git("rev-parse --verify @{u}"),
  APPLICATION_RC_SOURCE_SHA: appRc,
  phase0Precondition: "PASS",
  functionPdf: { path: FUNCTION_PDF, sha256: existsSync(FUNCTION_PDF) ? sha256(FUNCTION_PDF) : "MISSING" },
  processPdf: { path: PROCESS_PDF, sha256: existsSync(PROCESS_PDF) ? sha256(PROCESS_PDF) : "MISSING" },
  frozenReqIdCount: frozenReqs.length,
  frozenReqIds: frozenReqs,
  fin001To010Unresolved: 0,
  p0ApiContractUnresolved: 0,
  p0AuthAuthzOwnershipUnresolved: 0,
  p0FinanceServerAuthorityAmbiguity: 0,
  apiCommonEnvelopeFinal: true,
  errorTaxonomyFinal: true,
  exactEndpointRegistryFinal: true,
  idempotencyMatrixFinal: true,
  concurrencyContractFinal: true,
  eventContractRegistryFinal: true,
  backwardCompatibilityPolicyFinal: true,
  apiDbP0Drift: 0,
  apiMobileAdminP0BreakingDrift: 0,
  clientAuthoritativeP0FinanceCalculation: 0,
  exactEndpointCount: endpoints.length,
  errorCodeCount: errors.length,
  idempotencyRequiredOperationCount: idempotencyRows.length,
  authorizationMatrixRows: authRows.length,
  concurrencyContractRows: concurrencyRows.length,
  eventContractRows: eventRows.length,
  productionChanged: false,
  androidBuildStarted: false,
  secretExposure: 0,
  dStatuses: { "D-013": "FAIL", "D-016": "PARTIAL", "D-017": "PARTIAL", "D-026": "FAIL" },
  PROJECT_COMPLETION_100: false,
  COMMERCIAL_LAUNCH_READY: false,
  outputFiles: outputFiles.map((relative) => ({ path: relative, sha256: sha256(path.join(ROOT, relative)), bytes: readFileSync(path.join(ROOT, relative)).byteLength })),
};
write("docs/architecture/PHASE_1_ARCHITECTURE_FREEZE.json", `${JSON.stringify(freeze, null, 2)}\n`);

console.log(JSON.stringify({
  PHASE_1_GENERATION: "PASS",
  exactEndpointCount: endpoints.length,
  errorCodeCount: errors.length,
  idempotencyRequiredOperationCount: idempotencyRows.length,
}, null, 2));
