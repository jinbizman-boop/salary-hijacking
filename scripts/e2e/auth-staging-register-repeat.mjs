import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_JSON = "docs/auth/STAGING_REGISTER_REPEAT_EVIDENCE.json";
const OUT_MD = "docs/auth/STAGING_REGISTER_ROOT_CAUSE_REPORT.md";
const COUNT = Number.parseInt(process.env.STAGING_REGISTER_REPEAT_COUNT ?? "10", 10);

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function syntheticEmail(index) {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase3.register.${index}.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPass${randomBytes(6).toString("hex")}!A1`;
}

async function register(index) {
  const email = syntheticEmail(index);
  const password = syntheticPassword();
  const requestId = `phase3-register-repeat-${index}-${hash(`${email}:${Date.now()}`)}`;
  const response = await fetch(new URL("/api/v1/auth/register", BASE_URL), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    body: JSON.stringify({
      email,
      password,
      nickname: `phase3R${index}`,
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
    }),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const data = body?.data && typeof body.data === "object" ? body.data : {};
  const error = body?.error && typeof body.error === "object" ? body.error : {};
  return {
    index,
    status: response.status,
    errorCode: typeof error.code === "string" ? error.code : null,
    retryAfterSeconds: Number.parseInt(response.headers.get("retry-after") ?? "0", 10) || 0,
    requestId: response.headers.get("x-request-id") ?? requestId,
    emailHash: hash(email),
    hasAccessToken: typeof data.tokens?.accessToken === "string",
    hasRefreshToken: typeof data.tokens?.refreshToken === "string",
    hasUser: Boolean(data.user),
  };
}

async function main() {
  if (!Number.isInteger(COUNT) || COUNT < 1 || COUNT > 25)
    throw new Error("STAGING_REGISTER_REPEAT_COUNT must be 1..25");
  const startedAt = new Date().toISOString();
  const results = [];
  for (let index = 1; index <= COUNT; index += 1) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const result = { ...(await register(index)), attempt };
      results.push(result);
      if (result.status !== 429) break;
      const waitSeconds = Math.min(
        Math.max(result.retryAfterSeconds || 60, 1),
        90,
      );
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1_000));
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  const terminalResults = Array.from(
    new Map(results.map((row) => [row.index, row])).values(),
  );
  const successCount = terminalResults.filter(
    (row) =>
      row.status === 201 &&
      row.hasAccessToken &&
      row.hasRefreshToken &&
      row.hasUser,
  ).length;
  const evidence = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    requested: COUNT,
    successCount,
    attemptCount: results.length,
    rateLimitCount: results.filter((row) => row.status === 429).length,
    internalErrorCount: terminalResults.filter(
      (row) => row.errorCode === "AUTH_ROUTE_INTERNAL_ERROR",
    ).length,
    results,
    terminalResults,
    assertions: {
      stagingRegisterSuccess: successCount === COUNT,
      registerInternalErrorZero: terminalResults.every(
        (row) => row.errorCode !== "AUTH_ROUTE_INTERNAL_ERROR",
      ),
      retryAfterHonored: results.some((row) => row.status === 429)
        ? terminalResults.every((row) => row.status !== 429)
        : true,
    },
    secretValuesStored: false,
    rawTokensStored: false,
    rawCredentialsStored: false,
    productionMutation: false,
  };
  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  write(
    OUT_MD,
    `# Staging Register Root Cause Report

Status: ${evidence.assertions.stagingRegisterSuccess ? "PASS" : "FAIL"}

Base URL: ${BASE_URL}
Timestamp: ${evidence.timestamp}

Root cause removed:
- Cloudflare Workers WebCrypto rejected PBKDF2 iteration count 310000.
- Staging RLS lacked the \`users_service_all\` pre-auth bootstrap policy required by the canonical schema.

Register repeat:
- Success: ${successCount}/${COUNT}
- AUTH_ROUTE_INTERNAL_ERROR: ${evidence.internalErrorCount}

Evidence JSON: \`${OUT_JSON}\`

No raw password, access token, refresh token, verification token, OAuth token, MFA secret, connection string, PII, or financial value is stored.
`,
  );
  console.log(
    `STAGING_REGISTER_REPEAT success=${successCount}/${COUNT} internalError=${evidence.internalErrorCount} evidence=${OUT_JSON}`,
  );
  if (successCount !== COUNT || evidence.internalErrorCount !== 0) process.exit(1);
}

main().catch((error) => {
  console.error(
    `STAGING_REGISTER_REPEAT_FAIL ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
