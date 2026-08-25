import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_JSON = "docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json";
const OUT_MATRIX = "docs/notifications/NOTIFICATION_DIRECT_ID_RUNTIME_MATRIX.csv";

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, "utf8");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function syntheticEmail(label) {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase5.${label}.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPhase5${randomBytes(6).toString("hex")}!A1`;
}

function safeBody(body) {
  const error = body?.error && typeof body.error === "object" ? body.error : null;
  const data = body?.data && typeof body.data === "object" ? body.data : null;
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
              if (/token|password|email|message|title|body/i.test(key)) return false;
              return ["boolean", "string", "number"].includes(typeof value);
            })
            .map(([key, value]) => [
              /id$/i.test(key) ? `${key}Hash` : key,
              /id$/i.test(key) ? hash(value) : value,
            ]),
        )
      : {},
  };
}

async function call(step, method, urlPath, { bearer, body } = {}) {
  const headers = {
    "content-type": "application/json",
    "x-request-id": `phase5-${hash(`${step}:${Date.now()}:${Math.random()}`)}`,
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
  const safe = safeBody(parsed);
  return {
    step,
    method,
    path: urlPath,
    status: response.status,
    errorCode: safe.errorCode,
    requestId: response.headers.get("x-request-id") ?? safe.requestId,
    retryAfter: response.headers.get("retry-after"),
    pass: response.status < 400,
    dataFlags: safe.dataFlags,
    raw: parsed,
  };
}

function tokenFrom(result, name) {
  const value = result.raw?.data?.tokens?.[name];
  return typeof value === "string" && value.length >= 20 ? value : null;
}

function idFrom(result, key) {
  const value = result.raw?.data?.[key] ?? result.raw?.data?.notification?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function statusOkOrDenied(status) {
  return status === 403 || status === 404;
}

async function main() {
  const startedAt = new Date().toISOString();
  const steps = [];
  const matrix = [];
  const users = {
    a: { email: syntheticEmail("a"), password: syntheticPassword() },
    b: { email: syntheticEmail("b"), password: syntheticPassword() },
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
    call("register_a", "POST", "/api/v1/auth/register", {
      body: {
        email: users.a.email,
        password: users.a.password,
        nickname: "phase5A",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const registerB = await record(
    call("register_b", "POST", "/api/v1/auth/register", {
      body: {
        email: users.b.email,
        password: users.b.password,
        nickname: "phase5B",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const accessA = tokenFrom(registerA, "accessToken");
  const accessB = tokenFrom(registerB, "accessToken");
  if (!accessA || !accessB) {
    throw new Error("synthetic registration did not return access tokens");
  }

  await record(call("list_empty_a", "GET", "/api/v1/notifications?page=1&pageSize=20", { bearer: accessA }));
  await record(call("preferences_get_a", "GET", "/api/v1/notifications/preferences", { bearer: accessA }));
  const prefsPatch = await record(
    call("preferences_patch_a", "PATCH", "/api/v1/notifications/preferences", {
      bearer: accessA,
      body: {
        pushEnabled: true,
        emailEnabled: false,
        paymentDueEnabled: true,
        budgetWarningEnabled: true,
        budgetExceededEnabled: true,
        communityEnabled: false,
        quietHoursStart: "23:00",
        quietHoursEnd: "07:30",
        timezone: "UTC",
      },
    }),
  );
  const prefsGetAfter = await record(
    call("preferences_get_after_a", "GET", "/api/v1/notifications/preferences", {
      bearer: accessA,
    }),
  );

  const pushToken = `ExponentPushToken[phase5-${randomBytes(12).toString("hex")}]`;
  const logicalDeviceId = `phase5-device-${randomBytes(8).toString("hex")}`;
  const deviceCreate = await record(
    call("device_register_a", "POST", "/api/v1/notifications/devices", {
      bearer: accessA,
      body: {
        deviceId: logicalDeviceId,
        platform: "ANDROID",
        pushToken,
        appVersion: "phase5-e2e",
        locale: "ko-KR",
      },
    }),
  );
  await record(call("device_list_a", "GET", "/api/v1/notifications/devices", { bearer: accessA }));

  const dedupeKey = `phase5-notice-${randomBytes(8).toString("hex")}`;
  const notificationBody = {
    type: "NOTICE",
    title: "Phase 5 runtime check",
    message: "Open notifications to review the safe notice.",
    priority: "NORMAL",
    channels: ["IN_APP"],
    deeplink: "salaryhijacking://notifications",
    metadata: {
      idempotencyKey: dedupeKey,
      phase: "PHASE_5",
      rawFinancialDataExposed: false,
    },
  };
  const create1 = await record(
    call("notification_create_a", "POST", "/api/v1/notifications", {
      bearer: accessA,
      body: notificationBody,
    }),
  );
  const createReplay = await record(
    call("notification_create_replay_same_key_a", "POST", "/api/v1/notifications", {
      bearer: accessA,
      body: notificationBody,
    }),
  );
  const createConflict = await record(
    call("notification_create_conflict_same_key_a", "POST", "/api/v1/notifications", {
      bearer: accessA,
      body: { ...notificationBody, title: "Phase 5 changed body" },
    }),
  );

  const notificationId = idFrom(create1, "notificationId");
  const returnedReplayId = idFrom(createReplay, "notificationId");
  const deviceId = idFrom(deviceCreate, "deviceId");

  if (notificationId) {
    const directOps = [
      ["notification", "B_READ", "GET", `/api/v1/notifications/${notificationId}`],
      ["notification", "B_MARK_READ", "POST", `/api/v1/notifications/${notificationId}/read`],
      ["notification", "B_ARCHIVE", "POST", `/api/v1/notifications/${notificationId}/archive`],
      ["notification", "B_DELETE", "DELETE", `/api/v1/notifications/${notificationId}`],
    ];
    for (const [resource, operation, method, targetPath] of directOps) {
      const result = await record(call(`cross_user_${operation.toLowerCase()}`, method, targetPath, { bearer: accessB }));
      matrix.push({
        resource,
        operation,
        ownerUser: "USER_A",
        attackerUser: "USER_B",
        resourceIdHash: hash(notificationId),
        httpStatus: result.status,
        errorCode: result.errorCode ?? "",
        apiAuthz: statusOkOrDenied(result.status) ? "DENIED_OR_INVISIBLE" : "UNEXPECTED",
        rlsResult: "CHECKED_BY_SEPARATE_NEON_EVIDENCE",
        expected: "403_OR_404_OR_INVISIBLE",
        actual: statusOkOrDenied(result.status) ? "DENIED_OR_INVISIBLE" : "NOT_DENIED",
        status: statusOkOrDenied(result.status) ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      });
    }
    await record(call("notification_mark_read_a", "POST", `/api/v1/notifications/${notificationId}/read`, { bearer: accessA }));
    await record(call("notification_archive_a", "POST", `/api/v1/notifications/${notificationId}/archive`, { bearer: accessA }));
  }

  if (deviceId) {
    const crossDevice = await record(
      call("cross_user_device_revoke", "DELETE", `/api/v1/notifications/devices/${deviceId}`, {
        bearer: accessB,
      }),
    );
    matrix.push({
      resource: "device",
      operation: "B_REVOKE",
      ownerUser: "USER_A",
      attackerUser: "USER_B",
      resourceIdHash: hash(deviceId),
      httpStatus: crossDevice.status,
      errorCode: crossDevice.errorCode ?? "",
      apiAuthz: statusOkOrDenied(crossDevice.status) ? "DENIED_OR_INVISIBLE" : "UNEXPECTED",
      rlsResult: "CHECKED_BY_SEPARATE_NEON_EVIDENCE",
      expected: "403_OR_404_OR_INVISIBLE",
      actual: statusOkOrDenied(crossDevice.status) ? "DENIED_OR_INVISIBLE" : "NOT_DENIED",
      status: statusOkOrDenied(crossDevice.status) ? "PASS" : "FAIL",
      evidenceRef: OUT_JSON,
    });
    await record(call("device_revoke_a", "DELETE", `/api/v1/notifications/devices/${deviceId}`, { bearer: accessA }));
  }

  await record(call("read_all_a", "POST", "/api/v1/notifications/read-all", { bearer: accessA, body: {} }));
  await record(call("unread_count_a", "GET", "/api/v1/notifications/unread-count", { bearer: accessA }));
  await record(
    call("rules_preview_a", "POST", "/api/v1/notifications/rules/preview", {
      bearer: accessA,
      body: {
        today: new Date().toISOString().slice(0, 10),
        upcomingPaymentCount: 1,
        budgetUsageRate: 0.82,
        savingsGoalRate: 1,
        levelChanged: true,
      },
    }),
  );

  const assertions = {
    notificationListRuntime: steps.some((s) => s.step === "list_empty_a" && s.pass),
    preferenceRuntime:
      prefsPatch.status === 200 &&
      prefsGetAfter.status === 200 &&
      prefsGetAfter.raw?.data?.timezone === "UTC" &&
      prefsGetAfter.raw?.data?.quietHoursStart === "23:00",
    deviceRuntime: deviceCreate.status === 201 && Boolean(deviceId),
    deviceRevokeRuntime: steps.some((s) => s.step === "device_revoke_a" && s.pass),
    notificationCreateRuntime: create1.status === 201 && Boolean(notificationId),
    idempotentReplaySameResult:
      createReplay.status === 201 && Boolean(notificationId) && notificationId === returnedReplayId,
    idempotencyConflict: createConflict.status === 409,
    crossUserDirectIdDenied: matrix.length > 0 && matrix.every((row) => row.status === "PASS"),
    rawPushTokenStoredInEvidence: false,
    rawCredentialStoredInEvidence: false,
  };

  const hardFailures = Object.entries(assertions).filter(
    ([key, value]) => key !== "rawPushTokenStoredInEvidence" && key !== "rawCredentialStoredInEvidence" && value !== true,
  );
  const runtimeStatus =
    hardFailures.length === 0 ? "PASS_CORE_RUNTIME" : "PARTIAL";

  const evidence = {
    PHASE_5_STAGING_NOTIFICATION_RUNTIME: runtimeStatus,
    hardFailures: hardFailures.map(([key]) => key),
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    syntheticUsers: {
      a: { emailHash: hash(users.a.email) },
      b: { emailHash: hash(users.b.email) },
    },
    resourceHashes: {
      notificationIdHash: notificationId ? hash(notificationId) : null,
      deviceIdHash: deviceId ? hash(deviceId) : null,
    },
    steps: steps.map(({ raw: _raw, ...safe }) => safe),
    directIdMatrix: matrix,
    assertions,
    duplicateRecordResult: assertions.idempotentReplaySameResult ? 0 : "UNVERIFIED_OR_FAIL",
    productionMutation: false,
    rawTokensStored: false,
    rawPushTokensStored: false,
    rawFinancialValuesStored: false,
    notes: [
      "Synthetic staging users only.",
      "Evidence stores request ids, status codes, hashes and booleans only.",
      "No raw passwords, access tokens, refresh tokens, push tokens, PII payloads or financial values are written.",
    ],
  };

  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  const headers = [
    "resource",
    "operation",
    "ownerUser",
    "attackerUser",
    "resourceIdHash",
    "httpStatus",
    "errorCode",
    "apiAuthz",
    "rlsResult",
    "expected",
    "actual",
    "status",
    "evidenceRef",
  ];
  write(
    OUT_MATRIX,
    `${headers.join(",")}\n${matrix
      .map((row) => headers.map((header) => csvEscape(row[header])).join(","))
      .join("\n")}\n`,
  );

  const failed = Object.entries(assertions).filter(([, value]) => value !== true && value !== false);
  if (failed.length) throw new Error(`unexpected non-boolean assertions: ${failed.map(([key]) => key).join(",")}`);
  console.log(
    JSON.stringify(
      {
        PHASE_5_STAGING_NOTIFICATION_RUNTIME: runtimeStatus,
        hardFailures: hardFailures.map(([key]) => key),
        evidence: OUT_JSON,
        matrix: OUT_MATRIX,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`PHASE_5_NOTIFICATION_STAGING_RUNTIME_FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
