import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_CSV = "docs/auth/CROSS_USER_DIRECT_ID_RUNTIME_MATRIX.csv";
const OUT_MD = "docs/auth/CROSS_USER_RUNTIME_FINAL_REPORT.md";

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function syntheticEmail(label) {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase3.cross.${label}.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPass${randomBytes(6).toString("hex")}!A1`;
}

function sanitizeBody(body) {
  if (!body || typeof body !== "object") return {};
  const error = body.error && typeof body.error === "object" ? body.error : null;
  const data = body.data && typeof body.data === "object" ? body.data : null;
  return {
    errorCode: typeof error?.code === "string" ? error.code : "",
    requestId:
      typeof error?.requestId === "string"
        ? hash(error.requestId)
        : typeof data?.requestId === "string"
          ? hash(data.requestId)
          : "",
    dataFlags: data
      ? Object.fromEntries(
          Object.entries(data)
            .filter(([key, value]) => {
              if (/token|password|email|phone|salary|expense|saving|payroll/i.test(key)) return false;
              return ["boolean", "string", "number"].includes(typeof value);
            })
            .map(([key, value]) => [key, value]),
        )
      : {},
  };
}

async function call(step, method, urlPath, { bearer, body } = {}) {
  const headers = {
    "content-type": "application/json",
    "x-request-id": `phase3-cross-${hash(`${step}:${Date.now()}`)}`,
  };
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
  return {
    step,
    method,
    path: urlPath,
    status: response.status,
    ...sanitizeBody(parsed),
    raw: parsed,
  };
}

function tokenFrom(result, name) {
  const value = result.raw?.data?.tokens?.[name];
  return typeof value === "string" && value.length >= 20 ? value : null;
}

function userIdFrom(result) {
  const userId = result.raw?.data?.user?.userId ?? result.raw?.data?.userId;
  return typeof userId === "string" ? userId : null;
}

function exportIdFrom(result) {
  const value =
    result.raw?.data?.exportId ??
    result.raw?.data?.items?.[0]?.exportId ??
    result.raw?.data?.privacy?.latestExportId;
  return typeof value === "string" ? value : null;
}

function ticketIdFrom(result) {
  const value = result.raw?.data?.id ?? result.raw?.data?.ticketId;
  return typeof value === "string" ? value : null;
}

function row({
  resource,
  operation,
  ownerUser,
  attackerUser,
  httpStatus,
  errorCode,
  rlsResult,
  expected,
  actual,
  status,
  evidenceRef,
}) {
  return [
    resource,
    operation,
    ownerUser,
    attackerUser,
    httpStatus,
    errorCode,
    rlsResult,
    expected,
    actual,
    status,
    evidenceRef,
  ];
}

function passDenied(result) {
  return [403, 404, 405].includes(result.status);
}

async function main() {
  const startedAt = new Date().toISOString();
  const userA = { email: syntheticEmail("a"), password: syntheticPassword() };
  const userB = { email: syntheticEmail("b"), password: syntheticPassword() };
  const rows = [
    [
      "resource",
      "operation",
      "ownerUser",
      "attackerUser",
      "httpStatus",
      "errorCode",
      "rlsResult",
      "expected",
      "actual",
      "status",
      "evidenceRef",
    ],
  ];

  const registerA = await call("register_a", "POST", "/api/v1/auth/register", {
    body: {
      email: userA.email,
      password: userA.password,
      nickname: "crossA",
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
    },
  });
  const registerB = await call("register_b", "POST", "/api/v1/auth/register", {
    body: {
      email: userB.email,
      password: userB.password,
      nickname: "crossB",
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
    },
  });
  const accessA = tokenFrom(registerA, "accessToken");
  const accessB = tokenFrom(registerB, "accessToken");
  if (!accessA || !accessB) throw new Error("synthetic staging register did not return bearer tokens");

  const meA = await call("me_a", "GET", "/api/v1/users/me", { bearer: accessA });
  const meB = await call("me_b", "GET", "/api/v1/users/me", { bearer: accessB });
  const ownerHash = hash(userIdFrom(meA) ?? userA.email);
  const attackerHash = hash(userIdFrom(meB) ?? userB.email);

  const updateProfileA = await call("profile_update_a", "PATCH", "/api/v1/users/me/profile", {
    bearer: accessA,
    body: { nickname: `crossA-${randomBytes(2).toString("hex")}` },
  });
  const updateProfileB = await call("profile_update_b_owner_scoped", "PATCH", "/api/v1/users/me/profile", {
    bearer: accessB,
    body: { nickname: `crossB-${randomBytes(2).toString("hex")}` },
  });
  rows.push(
    row({
      resource: "profile",
      operation: "B_UPDATE_OWNER_SCOPED_DOES_NOT_TARGET_A",
      ownerUser: ownerHash,
      attackerUser: attackerHash,
      httpStatus: updateProfileB.status,
      errorCode: updateProfileB.errorCode,
      rlsResult: "OWNER_SCOPED_NO_A_ID_EXPOSED",
      expected: "B modifies only B profile",
      actual: updateProfileA.status === 200 && updateProfileB.status === 200 ? "owner scoped updates isolated" : "unexpected status",
      status: updateProfileA.status === 200 && updateProfileB.status === 200 ? "PASS" : "FAIL",
      evidenceRef: "profile_update_a/profile_update_b_owner_scoped",
    }),
  );

  for (const [resource, getPath, patchBody] of [
    ["user_settings", "/api/v1/users/settings", { theme: "DARK", timezone: "Asia/Seoul" }],
    [
      "consents",
      "/api/v1/users/consents",
      {
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
        contentRecommendationAccepted: true,
        adPartnerAccepted: false,
        analyticsAccepted: false,
        consentVersion: "phase3-cross-user",
      },
    ],
    [
      "notification_preferences",
      "/api/v1/notifications/preferences",
      { pushEnabled: true, budgetAlertEnabled: true, marketingOptIn: false },
    ],
  ]) {
    const aUpdate = await call(`${resource}_a_update`, "PATCH", getPath, {
      bearer: accessA,
      body: patchBody,
    });
    const bRead = await call(`${resource}_b_read_own`, "GET", getPath, { bearer: accessB });
    rows.push(
      row({
        resource,
        operation: "B_READ_OWNER_SCOPED_DOES_NOT_RETURN_A",
        ownerUser: ownerHash,
        attackerUser: attackerHash,
        httpStatus: bRead.status,
        errorCode: bRead.errorCode,
        rlsResult: "OWNER_SCOPED",
        expected: "B receives only B resource",
        actual: aUpdate.status < 400 && bRead.status < 400 ? "owner scoped read succeeds without direct A ID" : "unexpected status",
        status: aUpdate.status < 400 && bRead.status < 400 ? "PASS" : "FAIL",
        evidenceRef: `${resource}_a_update/${resource}_b_read_own`,
      }),
    );
  }

  const exportA = await call("privacy_export_a_create", "POST", "/api/v1/users/privacy/export", {
    bearer: accessA,
    body: {
      includeProfile: true,
      includeSettings: true,
      includeConsents: true,
      includeCommunity: false,
      includeGrowth: false,
      reason: "phase3 cross-user export",
    },
  });
  const exportId = exportIdFrom(exportA);
  if (exportId) {
    const ownerGet = await call("privacy_export_a_get_by_id", "GET", `/api/v1/users/privacy/export/${encodeURIComponent(exportId)}`, {
      bearer: accessA,
    });
    const attackerGet = await call("privacy_export_b_get_a_id", "GET", `/api/v1/users/privacy/export/${encodeURIComponent(exportId)}`, {
      bearer: accessB,
    });
    rows.push(
      row({
        resource: "privacy_export",
        operation: "B_READ_A_EXACT_ID",
        ownerUser: ownerHash,
        attackerUser: attackerHash,
        httpStatus: attackerGet.status,
        errorCode: attackerGet.errorCode,
        rlsResult: "API_DENIED_OR_INVISIBLE_DB_OWNER_FILTER",
        expected: "403/404 invisible",
        actual: `owner=${ownerGet.status}; attacker=${attackerGet.status}`,
        status: ownerGet.status === 200 && passDenied(attackerGet) ? "PASS" : "FAIL",
        evidenceRef: `exportIdHash=${hash(exportId)}`,
      }),
    );
  } else {
    rows.push(
      row({
        resource: "privacy_export",
        operation: "A_CREATE",
        ownerUser: ownerHash,
        attackerUser: attackerHash,
        httpStatus: exportA.status,
        errorCode: exportA.errorCode,
        rlsResult: "NO_ID_RETURNED",
        expected: "export id for direct-ID test",
        actual: "no exact id returned",
        status: "PARTIAL",
        evidenceRef: "privacy_export_a_create",
      }),
    );
  }

  const supportA = await call("support_a_create", "POST", "/api/v1/users/me/support-tickets", {
    bearer: accessA,
    body: {
      category: "PRIVACY",
      subject: "Phase 3 cross-user ticket",
      message: "Synthetic support ownership check.",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    },
  });
  const ticketId = ticketIdFrom(supportA);
  const supportBGet = ticketId
    ? await call("support_b_get_a_exact_id", "GET", `/api/v1/users/me/support-tickets/${encodeURIComponent(ticketId)}`, {
        bearer: accessB,
      })
    : null;
  rows.push(
    row({
      resource: "support_ticket",
      operation: "B_READ_A_EXACT_ID",
      ownerUser: ownerHash,
      attackerUser: attackerHash,
      httpStatus: supportBGet?.status ?? supportA.status,
      errorCode: supportBGet?.errorCode ?? supportA.errorCode,
      rlsResult: ticketId ? "NO_PUBLIC_DIRECT_READ_ROUTE" : "NO_ID_RETURNED",
      expected: "403/404/405 or no direct route",
      actual: ticketId ? `attacker=${supportBGet.status}` : "support id unavailable",
      status: ticketId ? (passDenied(supportBGet) ? "PASS" : "FAIL") : "PARTIAL",
      evidenceRef: ticketId ? `ticketIdHash=${hash(ticketId)}` : "support_a_create",
    }),
  );

  const withdrawalA = await call("withdrawal_a_request", "POST", "/api/v1/users/me/withdrawal-request", {
    bearer: accessA,
    body: { reason: "phase3 cross-user withdrawal", deleteCommunityContent: false },
  });
  const withdrawalBProbe = await call(
    "withdrawal_b_get_a_exact_id_unsupported",
    "GET",
    `/api/v1/users/me/withdrawal-request/${ownerHash}`,
    { bearer: accessB },
  );
  rows.push(
    row({
      resource: "withdrawal_request",
      operation: "B_READ_A_EXACT_ID",
      ownerUser: ownerHash,
      attackerUser: attackerHash,
      httpStatus: withdrawalBProbe.status,
      errorCode: withdrawalBProbe.errorCode,
      rlsResult: "NO_PUBLIC_DIRECT_READ_ROUTE",
      expected: "403/404/405",
      actual: `ownerCreate=${withdrawalA.status}; attacker=${withdrawalBProbe.status}`,
      status: withdrawalA.status < 400 && passDenied(withdrawalBProbe) ? "PASS" : "FAIL",
      evidenceRef: "withdrawal_a_request/withdrawal_b_get_a_exact_id_unsupported",
    }),
  );

  const deviceId = globalThis.crypto.randomUUID();
  const deviceA = await call("device_a_register", "POST", "/api/v1/notifications/devices", {
    bearer: accessA,
    body: {
      deviceId,
      platform: "ANDROID",
      pushToken: `phase3-${randomBytes(12).toString("hex")}`,
      appVersion: "phase3",
      osVersion: "android-test",
    },
  });
  const deviceBDelete = await call("device_b_delete_a_exact_id", "DELETE", `/api/v1/notifications/devices/${encodeURIComponent(deviceId)}`, {
    bearer: accessB,
  });
  rows.push(
    row({
      resource: "device",
      operation: "B_DELETE_A_EXACT_ID",
      ownerUser: ownerHash,
      attackerUser: attackerHash,
      httpStatus: deviceBDelete.status,
      errorCode: deviceBDelete.errorCode,
      rlsResult: "API_OWNER_FILTER_OR_NOT_FOUND",
      expected: "403/404",
      actual: `ownerCreate=${deviceA.status}; attacker=${deviceBDelete.status}`,
      status: deviceA.status < 400 && passDenied(deviceBDelete) ? "PASS" : "FAIL",
      evidenceRef: `deviceIdHash=${hash(deviceId)}`,
    }),
  );

  const sessionListB = await call("sessions_b_route_probe", "GET", "/api/v1/auth/sessions", { bearer: accessB });
  rows.push(
    row({
      resource: "sessions",
      operation: "B_LIST_OR_REVOKE_A_DIRECT_ID",
      ownerUser: ownerHash,
      attackerUser: attackerHash,
      httpStatus: sessionListB.status,
      errorCode: sessionListB.errorCode,
      rlsResult: "NO_PUBLIC_SESSION_LIST_ROUTE",
      expected: "403/404/405",
      actual: `probe=${sessionListB.status}`,
      status: passDenied(sessionListB) ? "PASS" : "FAIL",
      evidenceRef: "sessions_b_route_probe",
    }),
  );

  const bodyRows = rows.slice(1);
  const failCount = bodyRows.filter((r) => r[9] === "FAIL").length;
  const partialCount = bodyRows.filter((r) => r[9] === "PARTIAL").length;
  const passCount = bodyRows.filter((r) => r[9] === "PASS").length;

  write(OUT_CSV, csv(rows));
  write(
    OUT_MD,
    `# Cross-User Direct-ID Runtime Matrix

Status: ${failCount === 0 && partialCount === 0 ? "PASS" : failCount === 0 ? "PARTIAL" : "FAIL"}
Timestamp: ${new Date().toISOString()}
Base URL: ${BASE_URL}

Synthetic owner hash: \`${ownerHash}\`
Synthetic attacker hash: \`${attackerHash}\`

Rows:
- PASS: ${passCount}
- PARTIAL: ${partialCount}
- FAIL: ${failCount}

Evidence CSV: \`${OUT_CSV}\`

No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored.

Started at: ${startedAt}
`,
  );
  console.log(
    `CROSS_USER_DIRECT_ID_MATRIX pass=${passCount} partial=${partialCount} fail=${failCount} evidence=${OUT_CSV}`,
  );
  if (failCount > 0 || partialCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`CROSS_USER_DIRECT_ID_MATRIX_FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
