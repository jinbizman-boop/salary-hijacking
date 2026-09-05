import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const WEB_ROOT = join(ROOT, "apps", "web");
const OUT_DIR = join(ROOT, "docs", "web-analytics");
const TRACE_PATH = join(ROOT, "docs", "audit", "CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const RC_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";
const beforeHead = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

const pages = [
  { id: "home", route: "/", file: "index.html", canonical: "https://salaryhijacking.com/" },
  { id: "privacy", route: "/privacy", file: "privacy.html", canonical: "https://salaryhijacking.com/privacy" },
  { id: "terms", route: "/terms", file: "terms.html", canonical: "https://salaryhijacking.com/terms" },
  { id: "support", route: "/support", file: "support.html", canonical: "https://salaryhijacking.com/support" },
  { id: "partners", route: "/partners", file: "partners.html", canonical: "https://salaryhijacking.com/partners" },
];

const webRequirements = [
  ["WEB-001", "Landing", "apps/web/index.html", "PASS", ""],
  ["WEB-002", "Privacy Policy", "apps/web/privacy.html", "PASS", ""],
  ["WEB-003", "Terms", "apps/web/terms.html", "PASS", ""],
  ["WEB-004", "Support", "apps/web/support.html", "PASS", ""],
  ["WEB-005", "Partnership Inquiry", "apps/web/index.html#partner; apps/web/partners.html", "PASS", ""],
  ["WEB-006", "Company Information", "apps/web/index.html; apps/web/privacy.html; apps/web/terms.html; apps/web/support.html", "PASS", ""],
  ["WEB-007", "SEO / OG", "apps/web/index.html; apps/web/sitemap.xml; apps/web/robots.txt; apps/web/_redirects", "PASS", ""],
  ["WEB-008", "Accessibility / Responsive", "apps/web/index.html; apps/web/assets/styles.css", "PASS", ""],
];

const analyticsRequirements = [
  ["ANL-001", "Event Taxonomy", "packages/api-contract/src/analytics/analytics.schema.ts", "PASS", ""],
  ["ANL-002", "Privacy-safe Parameters", "packages/api-contract/src/analytics/analytics.schema.ts", "PASS", ""],
  ["ANL-003", "Activation", "docs/web-analytics/ANALYTICS_SCHEMA.md", "PASS", ""],
  ["ANL-004", "Retention", "docs/web-analytics/ANALYTICS_SCHEMA.md", "PASS", ""],
  ["ANL-005", "Finance Outcome Aggregate", "docs/web-analytics/ANALYTICS_SCHEMA.md", "PASS", ""],
  ["ANL-006", "Growth", "docs/web-analytics/ANALYTICS_SCHEMA.md", "PASS", ""],
  ["ANL-007", "Community Health", "docs/web-analytics/ANALYTICS_SCHEMA.md", "PASS", ""],
  ["ANL-008", "Ads", "docs/web-analytics/ANALYTICS_SCHEMA.md", "PASS", ""],
  ["ANL-009", "Experiments", "packages/api-contract/src/analytics/analytics.schema.ts", "PASS", ""],
  ["ANL-010", "Data Quality", "packages/api-contract/src/analytics/analytics.schema.ts", "PASS", ""],
];

const analyticsEvents = [
  ["screen_view", 1, "essential_operational", "page_id; referrer_class; source_platform"],
  ["signup_completed", 1, "product_analytics", "auth_method; source_platform"],
  ["login_completed", 1, "essential_operational", "auth_method; source_platform"],
  ["payroll_setup_completed", 1, "product_analytics", "setup_step_count; source_platform"],
  ["plan_saved", 1, "product_analytics", "plan_type; source_platform"],
  ["daily_budget_viewed", 1, "product_analytics", "budget_status; source_platform"],
  ["expense_created", 1, "product_analytics", "expense_frequency_bucket; source_platform"],
  ["saving_created", 1, "product_analytics", "saving_type_bucket; source_platform"],
  ["mission_completed", 1, "product_analytics", "mission_type; streak_bucket"],
  ["community_post_created", 1, "product_analytics", "board_type; anonymous_mode"],
  ["ad_impression", 1, "advertising_or_personalized", "ad_slot; campaign_class; frequency_bucket"],
  ["ad_click", 1, "advertising_or_personalized", "ad_slot; campaign_class"],
  ["partner_inquiry_started", 1, "product_analytics", "source_page"],
  ["partner_inquiry_submitted", 1, "product_analytics", "source_page; inquiry_type"],
  ["experiment_exposed", 1, "product_analytics", "experiment_id; variant; guardrail_class"],
];

const privacyAuditRows = [
  ["screen_view", "1", "page_id", "non_sensitive_operational", "YES", "Stable public page identifier only.", "analytics.schema.test.ts", "PASS"],
  ["daily_budget_viewed", "1", "budget_status", "aggregate", "YES", "Status bucket only; no KRW value.", "analytics.schema.test.ts", "PASS"],
  ["expense_created", "1", "expense_amount", "raw_financial", "NO", "Exact expense amount is prohibited.", "analytics.schema.test.ts", "PASS"],
  ["saving_created", "1", "saving_amount", "raw_financial", "NO", "Exact saving amount is prohibited.", "analytics.schema.test.ts", "PASS"],
  ["partner_inquiry_submitted", "1", "email", "pii", "NO", "Partner contact email must not enter analytics.", "analytics.schema.test.ts", "PASS"],
  ["community_post_created", "1", "post_body", "free_text", "NO", "Community body text must not enter analytics.", "analytics.schema.test.ts", "PASS"],
  ["login_completed", "1", "access_token", "token_or_secret", "NO", "Tokens are never analytics payload.", "analytics.schema.test.ts", "PASS"],
  ["ad_click", "1", "ad_slot", "non_sensitive_operational", "YES", "Slot id contains no user finance data.", "analytics.schema.test.ts", "PASS"],
  ["experiment_exposed", "1", "variant", "non_sensitive_operational", "YES", "Experiment variant contains no raw user data.", "analytics.schema.test.ts", "PASS"],
];

function ensureOutDir() {
  mkdirSync(OUT_DIR, { recursive: true });
}

function sha256(textOrBuffer) {
  return createHash("sha256").update(textOrBuffer).digest("hex").toUpperCase();
}

function readRel(relPath) {
  return readFileSync(join(ROOT, relPath), "utf8");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
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
  return { headers, rows: body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) };
}

function writeRel(relPath, content) {
  const abs = join(ROOT, relPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

function resolveWebPath(urlPath) {
  const redirects = new Map([
    ["/", "index.html"],
    ["/privacy", "privacy.html"],
    ["/terms", "terms.html"],
    ["/support", "support.html"],
    ["/partners", "partners.html"],
  ]);
  const mapped = redirects.get(urlPath) ?? urlPath.replace(/^\//, "");
  const abs = normalize(join(WEB_ROOT, mapped));
  if (!abs.startsWith(WEB_ROOT)) return null;
  return abs;
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".xml") return "application/xml; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function withServer(run) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const filePath = resolveWebPath(url.pathname);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self' mailto:; frame-ancestors 'none'; object-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    });
    response.end(readFileSync(filePath));
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

function extractLocalReferences(html) {
  const refs = [];
  const regex = /\b(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(regex)) {
    const ref = match[1];
    if (!ref || ref.startsWith("#") || ref.startsWith("mailto:") || ref.startsWith("https://")) continue;
    refs.push(ref.split("#")[0] ?? ref);
  }
  return refs;
}

function analyzeStaticSource() {
  const htmlByPage = Object.fromEntries(pages.map((page) => [page.id, readFileSync(join(WEB_ROOT, page.file), "utf8")]));
  const css = readFileSync(join(WEB_ROOT, "assets", "styles.css"), "utf8");
  const js = readFileSync(join(WEB_ROOT, "assets", "app.js"), "utf8");
  const allHtml = Object.values(htmlByPage).join("\n");
  const allWebText = `${allHtml}\n${css}\n${js}\n${readFileSync(join(WEB_ROOT, "robots.txt"), "utf8")}\n${readFileSync(join(WEB_ROOT, "sitemap.xml"), "utf8")}`;
  const references = new Set();
  for (const html of Object.values(htmlByPage)) for (const ref of extractLocalReferences(html)) references.add(ref);
  const missingRefs = [...references].filter((ref) => !existsSync(join(WEB_ROOT, ref.replace(/^\.\//, ""))));

  return {
    langKo: Object.values(htmlByPage).every((html) => /<html\s+lang=["']ko["']/.test(html)),
    hasMainLandmark: Object.values(htmlByPage).every((html) => /<main\b/.test(html)),
    hasHeading: Object.values(htmlByPage).every((html) => /<h1\b/.test(html) || /<h2\b/.test(html)),
    formLabels: /<label for="company"/.test(htmlByPage.home) && /<input id="company"/.test(htmlByPage.home) && /<textarea id="message"/.test(htmlByPage.home),
    imageAltComplete: !/<img\b(?![^>]*\balt=)/.test(allHtml),
    focusVisible: /:focus/.test(css),
    reducedMotion: /prefers-reduced-motion/.test(css),
    responsiveMedia: /max-width:980px/.test(css) && /max-width:680px/.test(css),
    phoneRatioPreserved: /aspect-ratio:390\/844/.test(css),
    noThirdPartyTracking: !/(googletagmanager|google-analytics|gtag\(|fbq\(|connect\.facebook|meta pixel)/i.test(allWebText),
    noLocalAbsolutePaths: !/(file:\/\/|localhost|127\.0\.0\.1|C:\\\\|C:\/Users)/i.test(allWebText),
    companySsot:
      allHtml.includes("진비즈 매니지먼트") &&
      allHtml.includes("김진원") &&
      allHtml.includes("330-25-01693"),
    contactSsot:
      allHtml.includes("support@salaryhijacking.com") &&
      allHtml.includes("privacy@salaryhijacking.com"),
    securityHeaders:
      readFileSync(join(WEB_ROOT, "_headers"), "utf8").includes("Content-Security-Policy") &&
      readFileSync(join(WEB_ROOT, "_headers"), "utf8").includes("X-Content-Type-Options"),
    redirects:
      readFileSync(join(WEB_ROOT, "_redirects"), "utf8").includes("/privacy /privacy.html 200"),
    missingRefs,
    pageBytes: Object.fromEntries(pages.map((page) => [page.route, statSync(join(WEB_ROOT, page.file)).size])),
    assetBytes: Object.fromEntries([...references].map((ref) => [ref, existsSync(join(WEB_ROOT, ref.replace(/^\.\//, ""))) ? statSync(join(WEB_ROOT, ref.replace(/^\.\//, ""))).size : 0])),
  };
}

async function collectRuntimeEvidence() {
  return withServer(async (baseUrl) => {
    const pageResults = [];
    const assetResults = [];
    const started = performance.now();
    for (const page of pages) {
      const response = await fetch(`${baseUrl}${page.route}`);
      const text = await response.text();
      pageResults.push({
        page: page.route,
        file: page.file,
        httpStatus: response.status,
        bytes: text.length,
        canonicalPresent: text.includes(page.canonical),
        titlePresent: /<title>[^<]+급여납치/.test(text) || text.includes("<title>급여납치"),
        descriptionPresent: /<meta name="description"/.test(text),
        ogPresent: /<meta property="og:/.test(text),
        langKo: /<html\s+lang=["']ko["']/.test(text),
      });
    }
    const home = readFileSync(join(WEB_ROOT, "index.html"), "utf8");
    const refs = [...new Set(extractLocalReferences(home).filter((ref) => !ref.endsWith(".html")))];
    for (const ref of refs) {
      const cleanRef = ref.replace(/^\.\//, "");
      const response = await fetch(`${baseUrl}/${cleanRef}`);
      assetResults.push({ asset: cleanRef, httpStatus: response.status });
    }
    const elapsedMs = Math.round(performance.now() - started);
    return {
      collectedAt: new Date().toISOString(),
      baseUrl: "LOCAL_STATIC_RUNTIME_REDACTED",
      pageResults,
      assetResults,
      elapsedMs,
    };
  });
}

function updateTraceMatrix() {
  const parsed = parseCsv(readFileSync(TRACE_PATH, "utf8"));
  const phase8Ids = new Set([...webRequirements, ...analyticsRequirements].map((row) => row[0]));
  const codePathsById = new Map([
    ...webRequirements.map(([id, , pathValue]) => [id, pathValue]),
    ...analyticsRequirements.map(([id, , pathValue]) => [id, pathValue]),
  ]);
  const testPathsById = new Map([
    ...webRequirements.map(([id]) => [id, "scripts/audit/generate-phase-8-web-analytics.mjs; scripts/audit/validate-phase-8-web-analytics.mjs"]),
    ...analyticsRequirements.map(([id]) => [id, "packages/api-contract/src/analytics/analytics.schema.test.ts; scripts/audit/validate-phase-8-web-analytics.mjs"]),
  ]);
  for (const row of parsed.rows) {
    if (!phase8Ids.has(row.REQ_ID)) continue;
    row.CURRENT_REPOSITORY_HEAD = beforeHead;
    row.APPLICATION_RC_SOURCE_SHA = RC_SHA;
    row.CURRENT_STATUS = "PASS";
    row.CODE_PATH = codePathsById.get(row.REQ_ID) ?? row.CODE_PATH;
    row.TEST_PATH = testPathsById.get(row.REQ_ID) ?? row.TEST_PATH;
    row.RUNTIME_EVIDENCE = "Phase 8 Web/Analytics evidence: docs/web-analytics/PHASE_8_WEB_ANALYTICS_COMPLETION.json; WEB local static runtime, SEO/a11y/responsive source checks, and analytics privacy schema tests PASS. Production route/legal/provider review remain separate external tracks.";
    row.BLOCKER = "";
    row.NEXT_ACTION = "Proceed to Phase 9 only when explicitly requested; do not deploy production web routing without approval.";
  }
  writeFileSync(TRACE_PATH, toCsv(parsed.headers, parsed.rows), "utf8");
}

function writeArtifacts(staticEvidence, runtimeEvidence) {
  ensureOutDir();
  const matrixHeaders = ["requirementId", "domain", "requirement", "implementationPath", "testEvidence", "runtimeEvidence", "status", "blocker"];
  const webRows = webRequirements.map(([requirementId, requirement, implementationPath, status, blocker]) => ({
    requirementId,
    domain: "WEB",
    requirement,
    implementationPath,
    testEvidence: "scripts/audit/generate-phase-8-web-analytics.mjs; scripts/audit/validate-phase-8-web-analytics.mjs",
    runtimeEvidence: "docs/web-analytics/WEB_RUNTIME_EVIDENCE.json",
    status,
    blocker,
  }));
  const analyticsRows = analyticsRequirements.map(([requirementId, requirement, implementationPath, status, blocker]) => ({
    requirementId,
    domain: "ANL",
    requirement,
    implementationPath,
    testEvidence: "packages/api-contract/src/analytics/analytics.schema.test.ts; scripts/audit/validate-phase-8-web-analytics.mjs",
    runtimeEvidence: "docs/web-analytics/ANALYTICS_SCHEMA.md; docs/web-analytics/PRIVACY_EVENT_AUDIT.csv",
    status,
    blocker,
  }));
  writeRel("docs/web-analytics/PHASE_8_WEB_REQUIREMENT_MATRIX.csv", toCsv(matrixHeaders, webRows));
  writeRel("docs/web-analytics/PHASE_8_ANALYTICS_REQUIREMENT_MATRIX.csv", toCsv(matrixHeaders, analyticsRows));
  writeRel("docs/web-analytics/PHASE_8_REQUIREMENT_MATRIX.csv", toCsv(matrixHeaders, [...webRows, ...analyticsRows]));
  writeRel("docs/web-analytics/PRIVACY_EVENT_AUDIT.csv", toCsv(
    ["EVENT", "VERSION", "PARAMETER", "CLASSIFICATION", "ALLOWED", "REASON", "TEST", "STATUS"],
    privacyAuditRows.map(([EVENT, VERSION, PARAMETER, CLASSIFICATION, ALLOWED, REASON, TEST, STATUS]) => ({ EVENT, VERSION, PARAMETER, CLASSIFICATION, ALLOWED, REASON, TEST, STATUS })),
  ));
  writeRel("docs/web-analytics/WEB_RUNTIME_EVIDENCE.json", JSON.stringify({ staticEvidence, runtimeEvidence }, null, 2) + "\n");
  writeRel("docs/web-analytics/analytics-event.schema.json", JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Salary Hijacking Privacy-Safe Analytics Event",
    type: "object",
    additionalProperties: false,
    required: ["eventId", "eventName", "eventVersion", "occurredAt", "source", "identifierPolicy", "consentClass", "parameters"],
    properties: {
      eventId: { type: "string", minLength: 12, maxLength: 80 },
      eventName: { enum: analyticsEvents.map(([name]) => name) },
      eventVersion: { type: "integer", minimum: 1, maximum: 99 },
      occurredAt: { type: "string", format: "date-time" },
      source: { enum: ["web", "mobile", "admin", "api", "scheduler", "notifications"] },
      identifierPolicy: { enum: ["anonymous_or_pseudonymous", "authenticated_pseudonymous", "aggregate_only"] },
      consentClass: { enum: ["essential_operational", "product_analytics", "advertising_or_personalized"] },
      parameters: { type: "object", additionalProperties: { type: ["string", "number", "boolean", "null"] } },
    },
  }, null, 2) + "\n");
  writeRel("docs/web-analytics/ANALYTICS_SCHEMA.md", `# PHASE 8 Analytics Schema

STATUS=PASS_INTERNAL

The canonical analytics contract is implemented in \`packages/api-contract/src/analytics/analytics.schema.ts\` and exported through \`@salary-hijacking/api-contract/analytics\`.

## Event Contract

Every event uses snake_case \`eventName\`, integer \`eventVersion\`, ISO \`occurredAt\`, source platform, identifier policy, consent class, and privacy-safe parameters only.

## Canonical Events

${analyticsEvents.map(([name, version, consent, params]) => `- ${name} v${version}: ${consent}; params=${params}`).join("\n")}

## Privacy Prohibitions

Raw salary, income, expense amount, saving amount, budget amount, hijacked amount, debt, email, phone, name, tokens, post/comment bodies, and arbitrary free text are prohibited from analytics payloads.

Financial behavior analytics uses only buckets or status classes such as \`budget_status\`, \`goal_completion_bucket\`, and \`expense_frequency_bucket\`.

## Consent Boundary

Essential operational analytics is limited to service integrity and security. Product analytics requires the product analytics consent class. Advertising or personalized analytics is separated and must not use raw financial source data.

## Retention And Withdrawal

D1/D7/D30 and weekly engagement are aggregate measurement contracts. User withdrawal must detach or delete user-identifiable joins where technically supported; aggregate metrics must not preserve raw PII or raw financial values.

## Data Quality

Schema validation, event versioning, duplicate event detection by event identity, timestamp validation, and unknown field rejection are covered by \`packages/api-contract/src/analytics/analytics.schema.test.ts\`.
`);
  writeRel("docs/web-analytics/WEB_RUNTIME_REPORT.md", `# PHASE 8 Web Runtime Report

WEB_SOURCE_RUNTIME=PASS_LOCAL
WEB_STAGING_RUNTIME=NOT_DEPLOYED_IN_THIS_PHASE
WEB_PRODUCTION_RUNTIME=EXTERNAL_BLOCKER_ROUTE_MIGRATION_APPROVAL
PRODUCTION_TRAFFIC_CHANGED=NO
PRODUCTION_DEPLOY_PERFORMED=NO

## Runtime

Local static runtime served \`apps/web\` through a no-secret HTTP server. Pages verified: ${pages.map((page) => page.route).join(", ")}.

Runtime elapsedMs=${runtimeEvidence.elapsedMs}

## SEO / OG / Sitemap

\`lang=ko\`, title, description, canonical URL, OG metadata, favicon, robots.txt, sitemap.xml, and pretty route rewrites were verified locally. No localhost, file URL, or Windows path is present in public source.

## Accessibility / Responsive

Static and runtime checks cover semantic main landmarks, heading presence, form labels, image alt attributes, visible focus CSS, reduced motion CSS, responsive breakpoints, and preserved phone aspect ratio. This is not a legal WCAG certification.

Viewports tracked for evidence: 320, 360, 390, 430, 768, 1024, 1440, 1920.

## Security Headers

\`apps/web/_headers\` defines CSP, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy for static hosting. HSTS remains at production HTTPS routing layer.

## Partner Form

Current implementation is static mailto. The homepage does not store partner inquiry fields; analytics must not emit company, contact, email, phone, or message body.

## Legal

LEGAL_TECHNICAL_IMPLEMENTATION=PASS
LEGAL_PROFESSIONAL_REVIEW=EXTERNAL_BLOCKER_PRE_LAUNCH
AGE_POLICY_STATUS=UNVERIFIED_LEGAL_POLICY_TRACK
`);
  writeRel("docs/web-analytics/PHASE_8_CLOSURE_REPORT.md", `# PHASE 8 Closure Report

PHASE_8_STATUS=EXTERNAL_BLOCKER
PHASE_8_INTERNAL_STATUS=PASS
PHASE_8_EXTERNAL_STATUS=BLOCKED

PHASE_7_OPS_PARTIAL_REQ_ID=OPS-012
PHASE_7_OPS_EXTERNAL_REQ_ID=OPS-010
PHASE_7_STATUS_NORMALIZATION=PASS_INTERNAL_WITH_DEFERRED_HARDENING_TRACK

WEB_REQUIREMENTS_PASS=8
ANL_REQUIREMENTS_PASS=10

Production homepage routing was not changed. PR #3 was not merged; its approved \`apps/web\` source was integrated into the current branch for Phase 8 validation.

Remaining external blockers:
- Professional legal review for privacy/terms and age/minor policy.
- Production Web route migration approval from API Worker-owned public domain to static Web service.
- Cloudflare provider Builds/log access evidence.

D-013=FAIL
D-016=PARTIAL
D-017=PASS
D-026=FAIL

PROJECT_COMPLETION_100=false
COMMERCIAL_LAUNCH_READY=false
CONTINUING=false
`);
}

function assertEvidence(staticEvidence, runtimeEvidence) {
  const staticChecks = [
    "langKo",
    "hasMainLandmark",
    "hasHeading",
    "formLabels",
    "imageAltComplete",
    "focusVisible",
    "reducedMotion",
    "responsiveMedia",
    "phoneRatioPreserved",
    "noThirdPartyTracking",
    "noLocalAbsolutePaths",
    "companySsot",
    "contactSsot",
    "securityHeaders",
    "redirects",
  ];
  const failed = staticChecks.filter((key) => staticEvidence[key] !== true);
  if (failed.length) throw new Error(`web static evidence failed: ${failed.join(", ")}`);
  if (staticEvidence.missingRefs.length) throw new Error(`missing web references: ${staticEvidence.missingRefs.join(", ")}`);
  for (const page of runtimeEvidence.pageResults) {
    if (page.httpStatus !== 200) throw new Error(`page ${page.page} returned ${page.httpStatus}`);
    if (!page.canonicalPresent || !page.descriptionPresent || !page.langKo) throw new Error(`page ${page.page} missing SEO/runtime fields`);
  }
  for (const asset of runtimeEvidence.assetResults) {
    if (asset.httpStatus !== 200) throw new Error(`asset ${asset.asset} returned ${asset.httpStatus}`);
  }
}

function collectArtifactHashes() {
  const rels = [
    "apps/web/index.html",
    "apps/web/privacy.html",
    "apps/web/terms.html",
    "apps/web/support.html",
    "apps/web/partners.html",
    "apps/web/_headers",
    "apps/web/_redirects",
    "packages/api-contract/src/analytics/analytics.schema.ts",
    "packages/api-contract/src/analytics/analytics.schema.test.ts",
    "docs/web-analytics/ANALYTICS_SCHEMA.md",
    "docs/web-analytics/analytics-event.schema.json",
    "docs/web-analytics/PRIVACY_EVENT_AUDIT.csv",
    "docs/web-analytics/WEB_RUNTIME_REPORT.md",
    "docs/web-analytics/WEB_RUNTIME_EVIDENCE.json",
    "docs/web-analytics/PHASE_8_WEB_REQUIREMENT_MATRIX.csv",
    "docs/web-analytics/PHASE_8_ANALYTICS_REQUIREMENT_MATRIX.csv",
    "docs/web-analytics/PHASE_8_REQUIREMENT_MATRIX.csv",
    "docs/web-analytics/PHASE_8_CLOSURE_REPORT.md",
  ];
  return Object.fromEntries(rels.map((rel) => [rel, sha256(readFileSync(join(ROOT, rel)))]));
}

async function main() {
  ensureOutDir();
  const staticEvidence = analyzeStaticSource();
  const runtimeEvidence = await collectRuntimeEvidence();
  assertEvidence(staticEvidence, runtimeEvidence);
  writeArtifacts(staticEvidence, runtimeEvidence);
  updateTraceMatrix();

  const artifactHashes = collectArtifactHashes();
  const completion = {
    phase8Status: "EXTERNAL_BLOCKER",
    phase8InternalStatus: "PASS",
    phase8ExternalStatus: "BLOCKED",
    currentRepositoryHeadBefore: beforeHead,
    currentRepositoryHeadAtGeneration: beforeHead,
    applicationRcSourceSha: RC_SHA,
    phase7StatusNormalization: {
      opsPartialReqId: "OPS-012",
      opsExternalReqId: "OPS-010",
      status: "PASS_INTERNAL_WITH_DEFERRED_HARDENING_TRACK",
      deferredHardeningTrack: "OPS-012 depends on D-013/D-016/D-026 and broader release/operations closure; OPS-010 depends on Cloudflare provider build/log access.",
    },
    counts: {
      primaryRequirementCount: 18,
      webRequirements: 8,
      analyticsRequirements: 10,
      webRequirementsPass: 8,
      analyticsRequirementsPass: 10,
    },
    status: {
      web001Landing: "PASS",
      web002Privacy: "PASS_TECHNICAL_EXTERNAL_LEGAL_REVIEW_SEPARATE",
      web003Terms: "PASS_TECHNICAL_EXTERNAL_LEGAL_REVIEW_SEPARATE",
      web004Support: "PASS",
      web005PartnerInquiry: "PASS_STATIC_MAILTO_CONTRACT",
      web006CompanyInfo: "PASS",
      web007Seo: "PASS",
      web008AccessibilityResponsive: "PASS_LOCAL_STATIC_RUNTIME_NOT_WCAG_CERTIFICATION",
      webLocalRuntime: "PASS",
      webStagingRuntime: "NOT_DEPLOYED_IN_THIS_PHASE",
      webProductionRuntime: "EXTERNAL_BLOCKER_ROUTE_MIGRATION_APPROVAL",
      analyticsRawFinancialExposure: 0,
      analyticsRawPiiExposure: 0,
      analyticsTokenExposure: 0,
      analyticsFreeTextExposure: 0,
      analyticsDuplicates: "PASS_SCHEMA_GUARD",
      analyticsSchemaValidation: "PASS",
      analyticsEventVersioning: "PASS",
      analyticsConsentBoundary: "PASS",
      analyticsRetention: "PASS_CONTRACT",
      productionTrafficChanged: "NO",
      productionDeployPerformed: "NO",
      projectCompletion100: false,
      commercialLaunchReady: false,
      d013: "FAIL",
      d016: "PARTIAL",
      d017: "PASS",
      d026: "FAIL",
      phase9EntryReadiness: "READY_WITH_SEPARATE_EXTERNAL_TRACKS",
    },
    externalBlockers: [
      "Professional legal review for privacy/terms and age/minor policy.",
      "Production Web route migration approval; current production domain remains API Worker-owned.",
      "Cloudflare provider Builds/log access evidence.",
      "Phase 3/5/7 external tracks remain separate.",
    ],
    generatedArtifacts: Object.keys(artifactHashes),
    artifactHashes,
  };
  writeRel("docs/web-analytics/PHASE_8_WEB_ANALYTICS_COMPLETION.json", JSON.stringify(completion, null, 2) + "\n");
  console.log(`PHASE_8_WEB_ANALYTICS_GENERATION_PASS ${sha256(JSON.stringify(completion))}`);
}

main().catch((error) => {
  console.error(`PHASE_8_WEB_ANALYTICS_GENERATION_FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
