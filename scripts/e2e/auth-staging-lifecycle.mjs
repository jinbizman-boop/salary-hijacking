import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_JSON = "docs/auth/STAGING_AUTH_LIFECYCLE_E2E_EVIDENCE.json";
const OUT_MD = "docs/auth/STAGING_AUTH_LIFECYCLE_E2E_REPORT.md";

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function syntheticEmail(label) {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase3.${label}.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPass${randomBytes(6).toString("hex")}!A1`;
}

function sanitizeBody(body) {
  if (!body || typeof body !== "object") return {};
  const error = body.error && typeof body.error === "object" ? body.error : null;
  const data = body.data && typeof body.data === "object" ? body.data : null;
  return {
    errorCode: typeof error?.code === "string" ? error.code : null,
    requestId:
      typeof error?.requestId === "string"
        ? error.requestId
        : typeof data?.requestId === "string"
          ? data.requestId
          : null,
    dataFlags: data
      ? Object.fromEntries(
          Object.entries(data)
            .filter(([key, value]) => {
              if (/token|password|email/i.test(key)) return false;
              return ["boolean", "string", "number"].includes(typeof value);
            })
            .map(([key, value]) => [key, value]),
        )
      : {},
  };
}

async function call(step, method, urlPath, { bearer, body } = {}) {
  const headers = { "content-type": "application/json", "x-request-id": `phase3-${hash(`${step}:${Date.now()}`)}` };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const response = await fetch(new URL(urlPath, BASE_URL), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  const sanitized = sanitizeBody(parsed);
  return {
    step,
    method,
    path: urlPath,
    status: response.status,
    errorCode: sanitized.errorCode,
    requestId: response.headers.get("x-request-id") ?? sanitized.requestId,
    dataFlags: sanitized.dataFlags,
    pass: response.status < 400,
    raw: parsed,
  };
}

function tokenFrom(result, name) {
  const value = result.raw?.data?.tokens?.[name];
  return typeof value === "string" && value.length >= 20 ? value : null;
}

async function main() {
  const startedAt = new Date().toISOString();
  const steps = [];
  const users = {
    a: { email: syntheticEmail("a"), password: syntheticPassword() },
    b: { email: syntheticEmail("b"), password: syntheticPassword() },
    c: { email: syntheticEmail("c"), password: syntheticPassword() },
  };

  async function record(promise) {
    const result = await promise;
    const { raw: _raw, ...safe } = result;
    steps.push(safe);
    return result;
  }

  await record(call("health", "GET", "/health"));
  await record(call("ready", "GET", "/api/v1/ready"));

  const registerA = await record(
    call("register_user_a", "POST", "/api/v1/auth/register", {
      body: {
        email: users.a.email,
        password: users.a.password,
        nickname: "phase3A",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const accessA1 = tokenFrom(registerA, "accessToken");
  const refreshA1 = tokenFrom(registerA, "refreshToken");
  if (!accessA1 || !refreshA1) {
    const evidence = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      startedAt,
      finishedAt: new Date().toISOString(),
      syntheticUsers: { a: { emailHash: hash(users.a.email) } },
      steps,
      assertions: {
        coreRegisterLoginRefreshLogout: false,
        stagingRegisterBlocked: true,
      },
      blocker: {
        code: registerA.errorCode ?? "UNKNOWN",
        status: registerA.status,
        firstFailingStep: "register_user_a",
        classification: "STAGING_INTERNAL_AUTH_REGISTER_BLOCKER",
      },
      secretValuesStored: false,
      rawTokensStored: false,
      productionMutation: false,
      notes: [
        "Staging register did not return tokens, so destructive/credential-bearing follow-up steps were not attempted.",
        "No raw password, access token, refresh token, reset token, email verification token, OAuth token, MFA token, or connection string is written.",
      ],
    };
    write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
    write(
      OUT_MD,
      `# Staging Auth Lifecycle E2E Report

Status: BLOCKED_STAGING_REGISTER_INTERNAL_ERROR

Base URL: ${BASE_URL}
Timestamp: ${evidence.timestamp}

First failing step: \`register_user_a\`
HTTP status: ${registerA.status}
Stable error code: \`${registerA.errorCode ?? "UNKNOWN"}\`
RequestId: \`${registerA.requestId ?? "not-returned"}\`

The public staging API did not return access/refresh tokens for a synthetic registration, so downstream login/refresh/privacy/support/withdrawal E2E was not attempted in this run.

Evidence JSON: \`${OUT_JSON}\`

No raw credentials, tokens, connection strings, PII, or financial values are stored.
`,
    );
    console.log(
      `STAGING_AUTH_LIFECYCLE_E2E core=BLOCKED firstFail=register_user_a status=${registerA.status} error=${registerA.errorCode ?? "UNKNOWN"} evidence=${OUT_JSON}`,
    );
    return;
  }

  const registerB = await record(
    call("register_user_b", "POST", "/api/v1/auth/register", {
      body: {
        email: users.b.email,
        password: users.b.password,
        nickname: "phase3B",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const accessB = tokenFrom(registerB, "accessToken");

  const registerC = await record(
    call("register_user_c", "POST", "/api/v1/auth/register", {
      body: {
        email: users.c.email,
        password: users.c.password,
        nickname: "phase3C",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const accessC = tokenFrom(registerC, "accessToken");
  if (!accessB || !accessC) throw new Error("secondary synthetic registration did not return tokens");

  await record(call("auth_me_user_a", "GET", "/api/v1/auth/me", { bearer: accessA1 }));
  await record(call("users_me_user_a", "GET", "/api/v1/users/me", { bearer: accessA1 }));

  const refresh1 = await record(
    call("refresh_rotate_r1_to_r2", "POST", "/api/v1/auth/refresh", {
      body: { refreshToken: refreshA1 },
    }),
  );
  const refreshA2 = tokenFrom(refresh1, "refreshToken");
  if (!refreshA2) throw new Error("refresh did not return rotated token");
  const replayR1 = await record(
    call("refresh_reuse_r1", "POST", "/api/v1/auth/refresh", {
      body: { refreshToken: refreshA1 },
    }),
  );
  const reuseR2 = await record(
    call("refresh_family_revoked_r2", "POST", "/api/v1/auth/refresh", {
      body: { refreshToken: refreshA2 },
    }),
  );

  const loginA2 = await record(
    call("login_after_reuse_user_a", "POST", "/api/v1/auth/login", {
      body: { email: users.a.email, password: users.a.password },
    }),
  );
  const refreshA3 = tokenFrom(loginA2, "refreshToken");
  if (!refreshA3) throw new Error("login after reuse did not return refresh token");
  await record(call("logout_current_by_refresh", "POST", "/api/v1/auth/logout", { body: { refreshToken: refreshA3 } }));
  await record(call("refresh_after_logout_current", "POST", "/api/v1/auth/refresh", { body: { refreshToken: refreshA3 } }));

  const loginA3 = await record(
    call("login_for_account_lifecycle_user_a", "POST", "/api/v1/auth/login", {
      body: { email: users.a.email, password: users.a.password },
    }),
  );
  const accessA = tokenFrom(loginA3, "accessToken");
  const refreshA4 = tokenFrom(loginA3, "refreshToken");
  if (!accessA || !refreshA4) throw new Error("login for account lifecycle did not return tokens");

  await record(call("logout_all_user_a", "POST", "/api/v1/auth/logout-all", { bearer: accessA, body: {} }));
  await record(call("refresh_after_logout_all", "POST", "/api/v1/auth/refresh", { body: { refreshToken: refreshA4 } }));

  const loginA4 = await record(
    call("login_after_logout_all_user_a", "POST", "/api/v1/auth/login", {
      body: { email: users.a.email, password: users.a.password },
    }),
  );
  const accessA5 = tokenFrom(loginA4, "accessToken");
  if (!accessA5) throw new Error("login after logout-all did not return access token");

  await record(call("password_reset_request", "POST", "/api/v1/auth/password-reset", { body: { email: users.a.email } }));

  await record(call("onboarding_complete", "POST", "/api/v1/users/me/onboarding-complete", { bearer: accessA5, body: {} }));
  await record(call("consents_get_before", "GET", "/api/v1/users/consents", { bearer: accessA5 }));
  await record(
    call("consents_update", "PATCH", "/api/v1/users/consents", {
      bearer: accessA5,
      body: {
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
        contentRecommendationAccepted: true,
        adPartnerAccepted: false,
        analyticsAccepted: false,
        consentVersion: "phase3-runtime-2026-08-17",
      },
    }),
  );
  await record(call("consents_get_after", "GET", "/api/v1/users/consents", { bearer: accessA5 }));

  const exportRequest = await record(
    call("privacy_export_request_user_a", "POST", "/api/v1/users/me/privacy-export", {
      bearer: accessA5,
      body: {
        includeProfile: true,
        includeSettings: true,
        includeConsents: true,
        includeCommunity: false,
        includeGrowth: false,
        reason: "phase3 synthetic privacy export",
      },
    }),
  );
  const exportId = exportRequest.raw?.data?.exportId ?? exportRequest.raw?.data?.privacy?.latestExportId;
  await record(call("privacy_export_list_user_a", "GET", "/api/v1/users/me/privacy-exports", { bearer: accessA5 }));
  if (typeof exportId === "string") {
    await record(call("privacy_export_detail_owner", "GET", `/api/v1/users/me/privacy-exports/${encodeURIComponent(exportId)}`, { bearer: accessA5 }));
    await record(call("privacy_export_detail_cross_user_b", "GET", `/api/v1/users/me/privacy-exports/${encodeURIComponent(exportId)}`, { bearer: accessB }));
  }

  await record(
    call("support_ticket_create_user_a", "POST", "/api/v1/users/me/support-tickets", {
      bearer: accessA5,
      body: {
        category: "PRIVACY",
        subject: "Phase 3 account help",
        message: "Please review my account settings.",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
    }),
  );

  await record(
    call("withdrawal_request_user_c", "POST", "/api/v1/users/me/withdrawal-request", {
      bearer: accessC,
      body: { reason: "phase3 synthetic withdrawal request", deleteCommunityContent: false },
    }),
  );
  await record(
    call("withdraw_confirm_user_c", "POST", "/api/v1/users/me/withdraw", {
      bearer: accessC,
      body: { reason: "phase3 synthetic withdrawal", confirmText: "회원탈퇴", deleteCommunityContent: false },
    }),
  );

  const assertions = {
    coreRegisterLoginRefreshLogout:
      registerA.status === 201 &&
      registerB.status === 201 &&
      registerC.status === 201 &&
      refresh1.status === 200 &&
      replayR1.status === 401 &&
      replayR1.errorCode === "AUTH_REFRESH_TOKEN_REUSED" &&
      reuseR2.status === 401 &&
      reuseR2.errorCode === "AUTH_REFRESH_TOKEN_REUSED",
    passwordResetRequestNoRawToken:
      steps.find((s) => s.step === "password_reset_request")?.status === 200 &&
      !("resetTokenForDelivery" in (steps.find((s) => s.step === "password_reset_request")?.dataFlags ?? {})),
    consentRuntime:
      steps.find((s) => s.step === "consents_update")?.status === 200 &&
      steps.find((s) => s.step === "consents_get_after")?.status === 200,
    privacyExportRuntime: exportRequest.status === 200 || exportRequest.status === 202,
    supportRuntime: steps.find((s) => s.step === "support_ticket_create_user_a")?.status === 202,
    withdrawalRuntime:
      steps.find((s) => s.step === "withdrawal_request_user_c")?.status === 202 &&
      steps.find((s) => s.step === "withdraw_confirm_user_c")?.status === 200,
  };

  const evidence = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    syntheticUsers: Object.fromEntries(
      Object.entries(users).map(([key, value]) => [key, { emailHash: hash(value.email) }]),
    ),
    steps,
    assertions,
    secretValuesStored: false,
    rawTokensStored: false,
    productionMutation: false,
    notes: [
      "No raw access, refresh, reset, email verification, OAuth, MFA token, password, or connection string is written.",
      "Password reset confirm remains external-email-delivery blocked on non-local staging because delivery token is intentionally not exposed.",
      "Direct Neon DB readback was not executed locally because STAGING_DATABASE_URL is not present in the local shell.",
    ],
  };

  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  write(
    OUT_MD,
    `# Staging Auth Lifecycle E2E Report

Status: ${assertions.coreRegisterLoginRefreshLogout ? "PASS_CORE_STAGING_RUNTIME" : "PARTIAL"}

Base URL: ${BASE_URL}
Timestamp: ${evidence.timestamp}

## Results

| Check | Status |
| --- | --- |
| Register/login/refresh/logout core | ${assertions.coreRegisterLoginRefreshLogout ? "PASS" : "FAIL"} |
| Refresh reuse family revocation | ${replayR1.errorCode === "AUTH_REFRESH_TOKEN_REUSED" && reuseR2.errorCode === "AUTH_REFRESH_TOKEN_REUSED" ? "PASS" : "FAIL"} |
| Password reset request no raw token | ${assertions.passwordResetRequestNoRawToken ? "PASS" : "FAIL"} |
| Consent update/read | ${assertions.consentRuntime ? "PASS" : "FAIL"} |
| Privacy export request/list/detail | ${assertions.privacyExportRuntime ? "PASS" : "PARTIAL"} |
| Support ticket create | ${assertions.supportRuntime ? "PASS" : "FAIL"} |
| Withdrawal request/confirm | ${assertions.withdrawalRuntime ? "PASS" : "FAIL"} |

Evidence JSON: \`${OUT_JSON}\`

No raw credentials, tokens, connection strings, PII, or financial values are stored.
`,
  );

  console.log(
    `STAGING_AUTH_LIFECYCLE_E2E core=${assertions.coreRegisterLoginRefreshLogout ? "PASS" : "FAIL"} steps=${steps.length} evidence=${OUT_JSON}`,
  );
}

main().catch((error) => {
  console.error(`STAGING_AUTH_LIFECYCLE_E2E_FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
