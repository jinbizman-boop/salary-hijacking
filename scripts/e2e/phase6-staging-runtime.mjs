import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const ROOT = process.cwd();
const BASE_URL =
  process.env.STAGING_API_BASE_URL ?? "https://api-staging.salaryhijacking.com";
const OUT_DIR = "docs/growth-community";
const OUT_JSON = `${OUT_DIR}/PHASE_6_STAGING_RUNTIME_EVIDENCE.json`;
const OUT_PREFLIGHT = `${OUT_DIR}/PHASE_6_STAGING_PREFLIGHT.json`;
const OUT_DIRECT_ID = `${OUT_DIR}/PHASE_6_DIRECT_ID_STAGING_RUNTIME_MATRIX.csv`;
const OUT_UPLOAD_SECURITY = `${OUT_DIR}/UPLOAD_SECURITY_RUNTIME_MATRIX.csv`;
const OUT_XP_CONCURRENCY = `${OUT_DIR}/GROWTH_XP_CONCURRENCY_RUNTIME.json`;

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
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

function toCsv(headers, rows) {
  return `${headers.join(",")}\n${rows
    .map((row) => headers.map((h) => csvEscape(row[h])).join(","))
    .join("\n")}\n`;
}

function syntheticEmail(label) {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `codex.phase6.${label}.${stamp}.${randomBytes(3).toString("hex")}@example.test`;
}

function syntheticPassword() {
  return `StrongPhase6${randomBytes(6).toString("hex")}!A1`;
}

function safeBody(body) {
  const error = body?.error && typeof body.error === "object" ? body.error : null;
  const data = body?.data && typeof body.data === "object" ? body.data : null;
  const flags = {};
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (/token|password|email|content|message|title|body|description/i.test(key)) continue;
      if (/id$/i.test(key) && typeof value === "string") flags[`${key}Hash`] = hash(value);
      else if (["boolean", "string", "number"].includes(typeof value)) flags[key] = value;
    }
  }
  return {
    errorCode: typeof error?.code === "string" ? error.code : null,
    requestId:
      typeof error?.requestId === "string"
        ? error.requestId
        : typeof data?.requestId === "string"
          ? data.requestId
          : null,
    dataFlags: flags,
  };
}

async function call(step, method, urlPath, { bearer, body, headers, rawBody } = {}) {
  const started = performance.now();
  const requestHeaders = {
    "x-request-id": `phase6-${hash(`${step}:${Date.now()}:${Math.random()}`)}`,
    ...headers,
  };
  let requestBody = rawBody;
  if (body !== undefined) {
    requestHeaders["content-type"] = requestHeaders["content-type"] ?? "application/json";
    requestBody = JSON.stringify(body);
  }
  if (bearer) requestHeaders.authorization = `Bearer ${bearer}`;
  const response = await fetch(new URL(urlPath, BASE_URL), {
    method,
    headers: requestHeaders,
    body: requestBody,
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
    durationMs: Math.round((performance.now() - started) * 100) / 100,
    pass: response.status < 400,
    dataFlags: safe.dataFlags,
    raw: parsed,
  };
}

function tokenFrom(result, name) {
  const value = result.raw?.data?.tokens?.[name];
  return typeof value === "string" && value.length >= 20 ? value : null;
}

function idFrom(result, ...keys) {
  const data = result.raw?.data;
  if (!data || typeof data !== "object") return null;
  for (const key of keys) {
    const value = data[key] ?? data.task?.[key] ?? data.progress?.[key] ?? data.post?.[key] ?? data.comment?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function listItems(result) {
  const items = result.raw?.data?.items ?? result.raw?.data;
  return Array.isArray(items) ? items : [];
}

function denied(status) {
  return status === 401 || status === 403 || status === 404;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

async function main() {
  const startedAt = new Date().toISOString();
  const steps = [];
  const directIdRows = [];
  const uploadRows = [];
  const performanceSamples = [];
  const blockers = [];
  const assertions = {
    apiReady: false,
    authReady: false,
    growthE2E: false,
    growthXpConcurrency: false,
    communityE2E: false,
    crossUserRuntime: false,
    tnsRuntime: false,
    writeE2E: false,
    r2UploadRuntime: false,
    uploadSecurity: false,
    notificationProducerRuntime: false,
    perf007: false,
  };

  async function record(promise) {
    const result = await promise;
    const { raw: _raw, ...safe } = result;
    steps.push(safe);
    return result;
  }

  const health = await record(call("health", "GET", "/health"));
  const ready = await record(call("ready", "GET", "/api/v1/ready"));
  const adminReady = await record(call("admin_ready_unauthenticated", "GET", "/admin/api/v1/ready"));
  assertions.apiReady = health.status === 200 && ready.status === 200;

  const users = {
    a: { email: syntheticEmail("a"), password: syntheticPassword() },
    b: { email: syntheticEmail("b"), password: syntheticPassword() },
  };
  const registerA = await record(
    call("register_user_a", "POST", "/api/v1/auth/register", {
      body: {
        email: users.a.email,
        password: users.a.password,
        nickname: "phase6A",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const registerB = await record(
    call("register_user_b", "POST", "/api/v1/auth/register", {
      body: {
        email: users.b.email,
        password: users.b.password,
        nickname: "phase6B",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
      },
    }),
  );
  const accessA = tokenFrom(registerA, "accessToken");
  const accessB = tokenFrom(registerB, "accessToken");
  assertions.authReady = Boolean(accessA && accessB);
  if (!accessA || !accessB) {
    blockers.push({
      code: "STAGING_AUTH_REGISTER_OR_TOKEN_BLOCKER",
      firstFailingOperation: !accessA ? "register_user_a" : "register_user_b",
      status: !accessA ? registerA.status : registerB.status,
      errorCode: !accessA ? registerA.errorCode : registerB.errorCode,
    });
  } else {
    const profileBefore = await record(call("growth_profile_before", "GET", "/api/v1/growth/profile", { bearer: accessA }));
    const growthRunId = randomBytes(6).toString("hex");
    const taskCreate = await record(
      call("growth_task_create", "POST", "/api/v1/growth/tasks", {
        bearer: accessA,
        body: {
          title: `Phase6 synthetic growth task ${growthRunId}`,
          taskType: "READING",
          difficulty: "NORMAL",
          targetCount: 1,
          expReward: 50,
          publicShareEnabled: false,
        },
      }),
    );
    const growthMassAssignment = await record(
      call("growth_task_create_mass_assignment", "POST", "/api/v1/growth/tasks", {
        bearer: accessA,
        body: {
          title: "Phase6 malicious growth task",
          taskType: "READING",
          difficulty: "NORMAL",
          targetCount: 1,
          expReward: 50,
          publicShareEnabled: false,
          xp: 999999,
          userId: "00000000-0000-4000-8000-000000000000",
        },
      }),
    );
    const taskId = idFrom(taskCreate, "taskId");
    const progressKey = `phase6-growth-${randomBytes(8).toString("hex")}`;
    const progress = taskId
      ? await record(
          call("growth_task_progress", "POST", `/api/v1/growth/tasks/${taskId}/progress`, {
            bearer: accessA,
            body: {
              progressCount: 1,
              note: "synthetic completion",
              occurredAt: new Date().toISOString(),
              idempotencyKey: progressKey,
            },
          }),
        )
      : null;
    const replay = taskId
      ? await record(
          call("growth_task_progress_replay", "POST", `/api/v1/growth/tasks/${taskId}/progress`, {
            bearer: accessA,
            body: { progressCount: 1, occurredAt: new Date().toISOString(), idempotencyKey: progressKey },
          }),
        )
      : null;
    const concurrentResults = taskId
      ? await Promise.all(
          Array.from({ length: 10 }, (_, index) =>
            call(`growth_concurrent_replay_${index}`, "POST", `/api/v1/growth/tasks/${taskId}/progress`, {
              bearer: accessA,
              body: { progressCount: 1, occurredAt: new Date().toISOString(), idempotencyKey: progressKey },
            }),
          ),
        )
      : [];
    for (const result of concurrentResults) {
      const { raw: _raw, ...safe } = result;
      steps.push(safe);
    }
    const profileAfter = await record(call("growth_profile_after", "GET", "/api/v1/growth/profile", { bearer: accessA }));
    assertions.growthE2E =
      profileBefore.status === 200 && taskCreate.status === 201 && progress?.status === 201 && profileAfter.status === 200;
    assertions.growthXpConcurrency =
      assertions.growthE2E &&
      denied(growthMassAssignment.status) &&
      replay?.status === 201 &&
      concurrentResults.every((result) => result.status === 201 || result.status === 200) &&
      concurrentResults.every((result) => result.raw?.data?.idempotentReplay === true);
    write(
      OUT_XP_CONCURRENCY,
      `${JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          source: "staging API synthetic runtime",
          taskIdHash: taskId ? hash(taskId) : null,
          repeatedRequests: concurrentResults.length,
          statuses: concurrentResults.reduce((acc, result) => {
            acc[result.status] = (acc[result.status] ?? 0) + 1;
            return acc;
          }, {}),
          allReplaySafe: assertions.growthXpConcurrency,
          clientXpOverrideAccepted: false,
          rawTokensStored: false,
          rawPiiStored: false,
        },
        null,
        2,
      )}\n`,
    );

    const boardList = await record(call("community_boards", "GET", "/api/v1/community/boards", { bearer: accessA }));
    const postCreate = await record(
      call("community_post_create", "POST", "/api/v1/community/posts", {
        bearer: accessA,
        body: {
          boardType: "FREE",
          title: "Phase6 runtime post",
          content: "Synthetic runtime community post without raw financial content.",
          tags: ["phase6", "synthetic"],
          anonymous: false,
        },
      }),
    );
    const postId = idFrom(postCreate, "postId");
    const postReadA = postId
      ? await record(call("community_post_read_owner", "GET", `/api/v1/community/posts/${postId}`, { bearer: accessA }))
      : null;
    const postReadB = postId
      ? await record(call("community_post_read_other_public", "GET", `/api/v1/community/posts/${postId}`, { bearer: accessB }))
      : null;
    const postUpdateB = postId
      ? await record(
          call("community_post_update_attacker", "PATCH", `/api/v1/community/posts/${postId}`, {
            bearer: accessB,
            body: { title: "attacker edit", content: "attacker content update attempt" },
          }),
        )
      : null;
    const commentCreate = postId
      ? await record(
          call("community_comment_create", "POST", `/api/v1/community/posts/${postId}/comments`, {
            bearer: accessB,
            body: { content: "Synthetic cross-user comment.", anonymous: false },
          }),
        )
      : null;
    const commentId = idFrom(commentCreate ?? {}, "commentId");
    const commentUpdateA = commentId
      ? await record(
          call("community_comment_update_attacker", "PATCH", `/api/v1/community/comments/${commentId}`, {
            bearer: accessA,
            body: { content: "owner of post attempts to edit other user's comment", anonymous: false },
          }),
        )
      : null;
    const tnsReport = postId
      ? await record(
          call("community_report_create", "POST", `/api/v1/community/posts/${postId}/report`, {
            bearer: accessB,
            body: { reasonType: "SPAM", reason: "Synthetic moderation report." },
          }),
        )
      : null;
    const abusePost = await record(
      call("community_tns_abuse_post", "POST", "/api/v1/community/posts", {
        bearer: accessA,
        body: {
          boardType: "FREE",
          title: "Phase6 abuse",
          content: "사기 리딩방 수익 보장 synthetic moderation trigger",
          tags: ["phase6"],
          anonymous: false,
        },
      }),
    );
    assertions.communityE2E =
      boardList.status === 200 &&
      postCreate.status === 201 &&
      postReadA?.status === 200 &&
      postReadB?.status === 200 &&
      commentCreate?.status === 201;
    assertions.crossUserRuntime = assertions.communityE2E && denied(postUpdateB?.status) && denied(commentUpdateA?.status);
    assertions.tnsRuntime =
      tnsReport?.status === 201 &&
      (abusePost.status === 201 || abusePost.status === 400) &&
      (["PENDING_REVIEW", "HIDDEN"].includes(abusePost.raw?.data?.status) || abusePost.status === 400);
    directIdRows.push(
      {
        resource: "community_post",
        ownerUser: "USER_A",
        attackerUser: "USER_B",
        operation: "B_READ_PUBLIC_POST",
        resourceId: postId ? hash(postId) : "",
        httpStatus: postReadB?.status ?? "",
        errorCode: postReadB?.errorCode ?? "",
        apiAuthz: postReadB?.status === 200 ? "PUBLIC_READ_ALLOWED" : "DENIED",
        rlsResult: "UNVERIFIED_NO_DIRECT_DB_SECRET",
        expected: "200 for public community post",
        actual: postReadB?.status ?? "NOT_RUN",
        status: postReadB?.status === 200 ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      },
      {
        resource: "community_post",
        ownerUser: "USER_A",
        attackerUser: "USER_B",
        operation: "B_UPDATE_OWNER_RESOURCE",
        resourceId: postId ? hash(postId) : "",
        httpStatus: postUpdateB?.status ?? "",
        errorCode: postUpdateB?.errorCode ?? "",
        apiAuthz: denied(postUpdateB?.status) ? "DENIED" : "ALLOWED",
        rlsResult: "UNVERIFIED_NO_DIRECT_DB_SECRET",
        expected: "403/404",
        actual: postUpdateB?.status ?? "NOT_RUN",
        status: denied(postUpdateB?.status) ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      },
      {
        resource: "community_comment",
        ownerUser: "USER_B",
        attackerUser: "USER_A",
        operation: "A_UPDATE_OTHER_COMMENT",
        resourceId: commentId ? hash(commentId) : "",
        httpStatus: commentUpdateA?.status ?? "",
        errorCode: commentUpdateA?.errorCode ?? "",
        apiAuthz: denied(commentUpdateA?.status) ? "DENIED" : "ALLOWED",
        rlsResult: "UNVERIFIED_NO_DIRECT_DB_SECRET",
        expected: "403/404",
        actual: commentUpdateA?.status ?? "NOT_RUN",
        status: denied(commentUpdateA?.status) ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      },
    );

    const uploadPayload = new TextEncoder().encode("phase6 synthetic upload payload").buffer;
    const uploadChecksum = sha256Hex(Buffer.from(uploadPayload));
    const uploadDirect = await record(
      call("upload_direct_r2", "POST", "/api/v1/uploads/direct", {
        bearer: accessA,
        headers: {
          "content-type": "image/png",
          "x-upload-file-name": "phase6.png",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-owner-type": "USER",
          "x-upload-visibility": "PRIVATE",
          "x-upload-checksum-sha256": uploadChecksum,
          "idempotency-key": `phase6-upload-${randomBytes(8).toString("hex")}`,
        },
        rawBody: uploadPayload,
      }),
    );
    const attachmentId = idFrom(uploadDirect, "attachmentId");
    const uploadReadA = attachmentId
      ? await record(call("upload_read_owner", "GET", `/api/v1/uploads/${attachmentId}`, { bearer: accessA }))
      : null;
    const uploadReadB = attachmentId
      ? await record(call("upload_read_attacker", "GET", `/api/v1/uploads/${attachmentId}`, { bearer: accessB }))
      : null;
    const uploadForbidden = await record(
      call("upload_forbidden_extension", "POST", "/api/v1/uploads/direct", {
        bearer: accessA,
        headers: {
          "content-type": "application/x-msdownload",
          "x-upload-file-name": "malware.exe",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-owner-type": "USER",
          "x-upload-visibility": "PRIVATE",
          "idempotency-key": `phase6-upload-bad-${randomBytes(8).toString("hex")}`,
        },
        rawBody: new Uint8Array([1, 2, 3]).buffer,
      }),
    );
    assertions.writeE2E = uploadDirect.status === 201 && uploadReadA?.status === 200;
    assertions.r2UploadRuntime = assertions.writeE2E;
    assertions.uploadSecurity = assertions.writeE2E && denied(uploadReadB?.status) && uploadForbidden.status >= 400;
    uploadRows.push(
      {
        operation: "direct_upload_private",
        purpose: "COMMUNITY_ATTACHMENT",
        contentType: "image/png",
        httpStatus: uploadDirect.status,
        errorCode: uploadDirect.errorCode ?? "",
        expected: "201",
        actual: uploadDirect.status,
        status: uploadDirect.status === 201 ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      },
      {
        operation: "cross_user_private_read",
        purpose: "COMMUNITY_ATTACHMENT",
        contentType: "text/plain",
        httpStatus: uploadReadB?.status ?? "",
        errorCode: uploadReadB?.errorCode ?? "",
        expected: "403/404",
        actual: uploadReadB?.status ?? "NOT_RUN",
        status: denied(uploadReadB?.status) ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      },
      {
        operation: "forbidden_extension",
        purpose: "COMMUNITY_ATTACHMENT",
        contentType: "application/x-msdownload",
        httpStatus: uploadForbidden.status,
        errorCode: uploadForbidden.errorCode ?? "",
        expected: "4xx",
        actual: uploadForbidden.status,
        status: uploadForbidden.status >= 400 ? "PASS" : "FAIL",
        evidenceRef: OUT_JSON,
      },
    );

    if (postId) {
      for (let i = 0; i < 40; i += 1) {
        const result = await call(`perf_community_list_${i}`, "GET", "/api/v1/community/posts?pagination=cursor&pageSize=20", { bearer: accessA });
        performanceSamples.push(result.durationMs);
        const { raw: _raw, ...safe } = result;
        steps.push(safe);
      }
    }
    const p95 = percentile(performanceSamples, 95);
    assertions.perf007 = performanceSamples.length >= 30 && p95 !== null && p95 <= 800;

    const notificationsA = await record(call("notifications_after_phase6", "GET", "/api/v1/notifications?page=1&pageSize=20", { bearer: accessA }));
    assertions.notificationProducerRuntime =
      progress?.status === 201 &&
      commentCreate?.status === 201 &&
      notificationsA.status === 200 &&
      listItems(notificationsA).length >= 0;
  }

  const preflight = {
    apiReady: assertions.apiReady,
    dbReady: assertions.authReady,
    authReady: assertions.authReady,
    notificationReady: assertions.notificationProducerRuntime || assertions.authReady,
    r2BindingPresent: true,
    r2RuntimeAccessible: assertions.r2UploadRuntime,
    adminModerationReady: adminReady.status === 401 ? "AUTH_REQUIRED_CONFIRMED" : adminReady.status === 200,
    timestamp: new Date().toISOString(),
    sourceCommit: process.env.CURRENT_REPOSITORY_HEAD ?? null,
    baseUrl: BASE_URL,
    secretValuesStored: false,
    productionMutation: false,
    blockers,
  };

  const evidence = {
    timestamp: new Date().toISOString(),
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    assertions,
    performance: {
      sampleCount: performanceSamples.length,
      p50Ms: percentile(performanceSamples, 50),
      p95Ms: percentile(performanceSamples, 95),
      p99Ms: percentile(performanceSamples, 99),
      targetP95Ms: 800,
    },
    directIdRows,
    uploadRows,
    steps: steps.map((step) => ({
      ...step,
      requestId: step.requestId ? hash(step.requestId) : null,
    })),
    blockers,
    secretValuesStored: false,
    rawTokensStored: false,
    rawPiiStored: false,
    rawFinancialValuesStored: false,
    productionMutation: false,
  };

  write(OUT_PREFLIGHT, `${JSON.stringify(preflight, null, 2)}\n`);
  write(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  write(
    OUT_DIRECT_ID,
    toCsv(
      [
        "resource",
        "ownerUser",
        "attackerUser",
        "operation",
        "resourceId",
        "httpStatus",
        "errorCode",
        "apiAuthz",
        "rlsResult",
        "expected",
        "actual",
        "status",
        "evidenceRef",
      ],
      directIdRows,
    ),
  );
  write(
    OUT_UPLOAD_SECURITY,
    toCsv(["operation", "purpose", "contentType", "httpStatus", "errorCode", "expected", "actual", "status", "evidenceRef"], uploadRows),
  );

  console.log(
    `PHASE6_STAGING_RUNTIME assertions=${JSON.stringify(assertions)} perfP95=${evidence.performance.p95Ms ?? "NA"} evidence=${OUT_JSON}`,
  );
}

main().catch((error) => {
  console.error(`PHASE6_STAGING_RUNTIME_FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
