import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import {
  adminRoutesManifest,
  assertAdminRoutesCompleteness,
  type AdminRepository,
  type AdminRouteRuntime,
  type AdminRoutesOptions,
  type JsonRecord,
} from "../src/routes/admin.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

function headersFor(role: string, extra?: HeadersInit): Headers {
  return new Headers({
    "content-type": "application/json",
    "x-admin-reason": "D-018 admin RBAC route contract verification",
    "x-auth-context-source": "auth.middleware",
    "x-authenticated-user-id": "99999999-9999-4999-8999-999999999999",
    "x-auth-primary-role": role,
    "x-authenticated-roles": role,
    "x-auth-account-status": "ACTIVE",
    "x-auth-mfa-verified": "true",
    "x-correlation-id": `admin-rbac-${role.toLowerCase()}`,
    ...extra,
  });
}

function emptyList() {
  return { items: [], page: 1, pageSize: 20, total: 0 };
}

function appWithRepository(repository: AdminRepository<unknown>) {
  return createApp({
    enableAuth: false,
    enableRateLimit: false,
    adminRoutesOptions: {
      repository,
      exposeRepositoryName: true,
    },
  } satisfies AppOptions<unknown> & {
    readonly adminRoutesOptions: AdminRoutesOptions<unknown>;
  });
}

function createRepository() {
  const calls: JsonRecord[] = [];
  const record = async (
    input: JsonRecord = {},
    runtime?: AdminRouteRuntime<unknown>,
  ) => ({
    ...input,
    actor: runtime?.principal.adminId ?? null,
    serverAuthority: true,
  });
  const repository: AdminRepository<unknown> = {
    name: "admin-rbac-audit-moderation-test-repository",
    dashboard: async (runtime) => record({}, runtime),
    listUsers: async () => emptyList(),
    getUser: async () => null,
    updateUserStatus: async (_userId, input, action, runtime) => {
      calls.push({ action, reason: input.reason ?? null });
      return record({ action }, runtime);
    },
    forceLogoutUser: async (_userId, input, runtime) => {
      calls.push({ action: "FORCE_LOGOUT_USER", reason: input.reason ?? null });
      return record({}, runtime);
    },
    userActivitySummary: async (_userId, runtime) => record({}, runtime),
    listCommunityPosts: async () => emptyList(),
    getCommunityPost: async () => null,
    moderateCommunityPost: async (_postId, input, action, runtime) => {
      calls.push({
        action,
        reason: runtime.request.headers.get("x-admin-reason") ?? null,
      });
      return record({ action, postStatus: "HIDDEN" }, runtime);
    },
    deleteCommunityPost: async (_postId, input, runtime) => {
      calls.push({ action: "DELETE_POST", reason: input.reason ?? null });
      return record({ action: "DELETE_POST" }, runtime);
    },
    listReports: async () => emptyList(),
    resolveReport: async (_reportId, input, runtime) => {
      calls.push({ action: "RESOLVE_REPORT", reason: input.reason ?? null });
      return record({ status: "RESOLVED" }, runtime);
    },
    listNotices: async () => emptyList(),
    createNotice: async (input, runtime) => record(input, runtime),
    updateNotice: async (_noticeId, input, runtime) => record(input, runtime),
    publishNotice: async (_noticeId, input, runtime) => record(input, runtime),
    unpublishNotice: async (_noticeId, input, runtime) => record(input, runtime),
    deleteNotice: async (_noticeId, input, runtime) => record(input, runtime),
    listAdCampaigns: async () => emptyList(),
    createAdCampaign: async (input, runtime) => record(input, runtime),
    updateAdCampaign: async (_campaignId, input, runtime) =>
      record(input, runtime),
    changeAdCampaignStatus: async (_campaignId, status, input, runtime) =>
      record({ ...input, status }, runtime),
    adReports: async () => emptyList(),
    listGrowthTasks: async () => emptyList(),
    createGrowthTask: async (input, runtime) => record(input, runtime),
    updateGrowthTask: async (_taskId, input, runtime) => record(input, runtime),
    listGrowthContents: async () => emptyList(),
    createGrowthContent: async (input, runtime) => record(input, runtime),
    updateGrowthContent: async (_contentId, input, runtime) =>
      record(input, runtime),
    reviewGrowthContent: async (_contentId, input, runtime) =>
      record(input, runtime),
    publishGrowthContent: async (_contentId, input, runtime) =>
      record(input, runtime),
    archiveGrowthContent: async (_contentId, input, runtime) =>
      record(input, runtime),
    listAuditLogs: async () => ({
      items: [
        {
          auditLogId: "aud_1001",
          actorAdminIdMasked: "adm_***",
          action: "HIDE_POST",
          targetId: "post_1001",
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    listRoleMembers: async () => emptyList(),
    updateRoleMember: async (_adminId, input, runtime) => record(input, runtime),
  };
  return { calls, repository };
}

async function bodyOf(response: Response) {
  return (await response.json()) as {
    readonly success?: boolean;
    readonly data?: JsonRecord;
    readonly error?: { readonly code?: string; readonly details?: JsonRecord };
  };
}

describe("admin RBAC, audit, and moderation routes", () => {
  it("requires auth middleware context and verified MFA before admin routes run", async () => {
    const { repository } = createRepository();
    const app = appWithRepository(repository);

    const missingContext = await app.fetch(
      new Request("https://api.test/admin/api/v1/dashboard", {
        headers: headersFor("ADMIN", { "x-auth-context-source": "" }),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(missingContext.status).toBe(401);
    expect((await bodyOf(missingContext)).error?.code).toBe(
      "ADMIN_AUTH_CONTEXT_REQUIRED",
    );

    const missingMfa = await app.fetch(
      new Request("https://api.test/admin/api/v1/dashboard", {
        headers: headersFor("ADMIN", { "x-auth-mfa-verified": "false" }),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(missingMfa.status).toBe(403);
    expect((await bodyOf(missingMfa)).error?.code).toBe("ADMIN_MFA_REQUIRED");
  });

  it("blocks read-only admins from moderation mutations", async () => {
    const { calls, repository } = createRepository();
    const app = appWithRepository(repository);

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/community/posts/post_1001/hide", {
        body: JSON.stringify({ reason: "privacy report" }),
        headers: headersFor("ADM_READONLY"),
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = await bodyOf(response);

    expect(response.status).toBe(403);
    expect(body.error?.code).toBe("ADMIN_PERMISSION_DENIED");
    expect(calls).toEqual([]);
  });

  it("allows community admins to moderate posts with an audit reason", async () => {
    const { calls, repository } = createRepository();
    const app = appWithRepository(repository);

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/community/posts/post_1001/hide", {
        body: JSON.stringify({ reason: "privacy report" }),
        headers: headersFor("ADM_COMMUNITY"),
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      action: "HIDE_POST",
      postStatus: "HIDDEN",
      serverAuthority: true,
    });
    expect(calls).toContainEqual({
      action: "HIDE_POST",
      reason: "D-018 admin RBAC route contract verification",
    });
  });

  it("separates report read and report resolve permissions", async () => {
    const { calls, repository } = createRepository();
    const app = appWithRepository(repository);

    const list = await app.fetch(
      new Request("https://api.test/admin/api/v1/reports", {
        headers: headersFor("ADM_CS"),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(list.status).toBe(200);

    const resolve = await app.fetch(
      new Request("https://api.test/admin/api/v1/reports/rpt_1001/resolve", {
        body: JSON.stringify({ reason: "handled by moderation team" }),
        headers: headersFor("ADM_CS"),
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = await bodyOf(resolve);

    expect(resolve.status).toBe(403);
    expect(body.error?.code).toBe("ADMIN_PERMISSION_DENIED");
    expect(calls).toEqual([]);
  });

  it("allows auditors to read audit logs but not mutate role members", async () => {
    const { calls, repository } = createRepository();
    const app = appWithRepository(repository);

    const auditLogs = await app.fetch(
      new Request("https://api.test/admin/api/v1/audit-logs", {
        headers: headersFor("ADM_AUDITOR"),
      }),
      { APP_ENV: "development" },
      context,
    );
    const auditBody = await bodyOf(auditLogs);

    expect(auditLogs.status).toBe(200);
    expect(auditBody.data?.items).toEqual([
      {
        auditLogId: "aud_1001",
        actorAdminIdMasked: "adm_***",
        action: "HIDE_POST",
        targetId: "post_1001",
      },
    ]);

    const roleMutation = await app.fetch(
      new Request("https://api.test/admin/api/v1/admin-role-members/adm_1001", {
        body: JSON.stringify({ roles: ["ADM_OWNER"], reason: "test" }),
        headers: headersFor("ADM_AUDITOR"),
        method: "PATCH",
      }),
      { APP_ENV: "development" },
      context,
    );

    expect(roleMutation.status).toBe(403);
    expect((await bodyOf(roleMutation)).error?.code).toBe(
      "ADMIN_PERMISSION_DENIED",
    );
    expect(calls).toEqual([]);
  });

  it("declares the admin security, privacy, and audit controls in the route manifest", () => {
    expect(adminRoutesManifest).toMatchObject({
      adminMfaRequired: true,
      adFinancialTargetingForbidden: true,
      auditMiddlewareCompatible: true,
      financialRawDataMasked: true,
      reasonRequiredForMutations: true,
    });
    expect(adminRoutesManifest.endpoints).toEqual(
      expect.arrayContaining([
        "POST /community/posts/{postId}/hide",
        "GET /reports",
        "POST /reports/{reportId}/resolve",
        "GET /audit-logs",
        "PATCH /admin-role-members/{adminId}",
      ]),
    );
    expect(assertAdminRoutesCompleteness()).toMatchObject({
      ok: true,
      version: adminRoutesManifest.version,
    });
  });
});
