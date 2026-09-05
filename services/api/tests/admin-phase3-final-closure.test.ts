import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type { VerifiedJwt } from "../src/middlewares/auth.middleware";
import type {
  AdminRepository,
  AdminRouteRuntime,
  AdminRoutesOptions,
  JsonRecord,
} from "../src/routes/admin.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

function headersFor(role: string, extra?: HeadersInit): Headers {
  return new Headers({
    "content-type": "application/json",
    "x-admin-reason": "Phase 3 admin runtime closure",
    "x-auth-context-source": "auth.middleware",
    "x-authenticated-user-id": "99999999-9999-4999-8999-999999999999",
    "x-auth-primary-role": role,
    "x-authenticated-roles": role,
    "x-auth-account-status": "ACTIVE",
    "x-auth-mfa-verified": "true",
    "x-correlation-id": `phase3-admin-${role.toLowerCase()}`,
    ...extra,
  });
}

function emptyList() {
  return { items: [], page: 1, pageSize: 20, total: 0 };
}

function createRepository() {
  const calls: JsonRecord[] = [];
  const record = async (
    input: JsonRecord = {},
    runtime?: AdminRouteRuntime<unknown>,
  ) => ({
    ...input,
    actor: runtime?.principal.adminId ?? null,
    roles: runtime?.principal.roles.join(",") ?? "",
    permissions: runtime?.principal.permissions.join(",") ?? "",
    mfaVerified: runtime?.principal.mfaVerified ?? false,
    serverAuthority: true,
  });
  const repository: AdminRepository<unknown> = {
    name: "phase3-admin-runtime-test-repository",
    dashboard: async (runtime) => record({}, runtime),
    listUsers: async () => emptyList(),
    getUser: async (_userId, runtime) => record({}, runtime),
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
    getCommunityPost: async (_postId, runtime) => record({}, runtime),
    moderateCommunityPost: async (_postId, input, action, runtime) => {
      calls.push({ action, reason: input.reason ?? null });
      return record({ action }, runtime);
    },
    deleteCommunityPost: async (_postId, input, runtime) => {
      calls.push({ action: "DELETE_POST", reason: input.reason ?? null });
      return record({ action: "DELETE_POST" }, runtime);
    },
    listReports: async () => emptyList(),
    resolveReport: async (_reportId, input, runtime) => {
      calls.push({ action: "RESOLVE_REPORT", reason: input.reason ?? null });
      return record({ action: "RESOLVE_REPORT" }, runtime);
    },
    listNotices: async () => emptyList(),
    createNotice: async (input, runtime) => record(input, runtime),
    updateNotice: async (_noticeId, input, runtime) => record(input, runtime),
    publishNotice: async (_noticeId, input, runtime) => record(input, runtime),
    unpublishNotice: async (_noticeId, input, runtime) =>
      record(input, runtime),
    deleteNotice: async (_noticeId, input, runtime) => record(input, runtime),
    listAdCampaigns: async () => emptyList(),
    createAdCampaign: async (input, runtime) => record(input, runtime),
    updateAdCampaign: async (_campaignId, input, runtime) =>
      record(input, runtime),
    changeAdCampaignStatus: async (_campaignId, status, input, runtime) =>
      record({ ...input, status }, runtime),
    adReports: async (_input, runtime) => record({}, runtime),
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
    listAuditLogs: async () => emptyList(),
    listRoleMembers: async () => emptyList(),
    updateRoleMember: async (_adminId, input, runtime) =>
      record(input, runtime),
  };
  return { calls, repository };
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

function authenticatedAppWithRepository(repository: AdminRepository<unknown>) {
  return createApp({
    enableRateLimit: false,
    authOptions: {
      verifyJwt: async (token): Promise<VerifiedJwt> => ({
        header: { alg: "test" },
        claims: {
          iss: "salary-hijacking-api",
          aud: "salary-hijacking-admin",
          sub: "99999999-9999-4999-8999-999999999999",
          role: "OPS_ADMIN",
          roles: ["OPS_ADMIN"],
          sessionId: "sess_phase3_admin",
          mfaVerified: true,
          exp: Math.floor(Date.now() / 1000) + 900,
        },
        rawToken: token,
        tokenKind: "ADMIN",
      }),
    },
    adminRoutesOptions: {
      repository,
      exposeRepositoryName: true,
    },
  } satisfies AppOptions<unknown> & {
    readonly adminRoutesOptions: AdminRoutesOptions<unknown>;
  });
}

async function bodyOf(response: Response) {
  return (await response.json()) as {
    readonly success?: boolean;
    readonly data?: JsonRecord;
    readonly error?: { readonly code?: string; readonly details?: JsonRecord };
  };
}

describe("Phase 3 final admin RBAC, MFA, and break-glass closure", () => {
  it("accepts canonical v2.0 admin roles and maps them to least-privilege permissions", async () => {
    const { repository } = createRepository();
    const app = appWithRepository(repository);

    const moderator = await app.fetch(
      new Request(
        "https://api.test/admin/api/v1/community/posts/post_1001/hide",
        {
          method: "POST",
          headers: headersFor("MODERATOR"),
          body: JSON.stringify({ reason: "policy violation" }),
        },
      ),
      { APP_ENV: "development" },
      context,
    );
    expect(moderator.status).toBe(200);
    expect((await bodyOf(moderator)).data?.roles).toBe("MODERATOR");

    const auditorMutation = await app.fetch(
      new Request("https://api.test/admin/api/v1/admin-role-members/adm_1", {
        method: "PATCH",
        headers: headersFor("AUDITOR_READONLY"),
        body: JSON.stringify({ roles: ["SUPER_ADMIN"], reason: "audit" }),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(auditorMutation.status).toBe(403);
    expect((await bodyOf(auditorMutation)).error?.code).toBe(
      "ADMIN_PERMISSION_DENIED",
    );
  });

  it("blocks privileged admin mutations without server-side MFA state", async () => {
    const { repository } = createRepository();
    const app = appWithRepository(repository);

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/users/user_1001/suspend", {
        method: "POST",
        headers: headersFor("SUPER_ADMIN", { "x-auth-mfa-verified": "false" }),
        body: JSON.stringify({ reason: "mfa missing" }),
      }),
      { APP_ENV: "development" },
      context,
    );

    expect(response.status).toBe(403);
    expect((await bodyOf(response)).error?.code).toBe("ADMIN_MFA_REQUIRED");
  });

  it("rejects malformed or unauthorized break-glass context before privileged dispatch", async () => {
    const { calls, repository } = createRepository();
    const app = appWithRepository(repository);

    const missingReason = await app.fetch(
      new Request("https://api.test/admin/api/v1/admin-role-members/adm_1", {
        method: "PATCH",
        headers: headersFor("OPS_ADMIN", {
          "x-admin-break-glass": "true",
          "x-admin-break-glass-scope": "role:manage",
          "x-admin-break-glass-expires-at": new Date(
            Date.now() + 10 * 60 * 1000,
          ).toISOString(),
          "x-admin-reason": "",
        }),
        body: JSON.stringify({ roles: ["SUPER_ADMIN"] }),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(missingReason.status).toBe(400);
    expect((await bodyOf(missingReason)).error?.code).toBe(
      "ADMIN_BREAK_GLASS_REASON_REQUIRED",
    );

    const auditorActivation = await app.fetch(
      new Request("https://api.test/admin/api/v1/admin-role-members/adm_1", {
        method: "PATCH",
        headers: headersFor("AUDITOR_READONLY", {
          "x-admin-break-glass": "true",
          "x-admin-break-glass-scope": "role:manage",
          "x-admin-break-glass-expires-at": new Date(
            Date.now() + 10 * 60 * 1000,
          ).toISOString(),
        }),
        body: JSON.stringify({ roles: ["SUPER_ADMIN"] }),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(auditorActivation.status).toBe(403);
    expect((await bodyOf(auditorActivation)).error?.code).toBe(
      "ADMIN_BREAK_GLASS_FORBIDDEN",
    );
    expect(calls).toEqual([]);
  });

  it("allows a scoped OPS break-glass role mutation only with reason, expiry, and audit context", async () => {
    const { calls, repository } = createRepository();
    const app = appWithRepository(repository);

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/admin-role-members/adm_1", {
        method: "PATCH",
        headers: headersFor("OPS_ADMIN", {
          "x-admin-break-glass": "true",
          "x-admin-break-glass-scope": "role:manage",
          "x-admin-break-glass-expires-at": new Date(
            Date.now() + 10 * 60 * 1000,
          ).toISOString(),
        }),
        body: JSON.stringify({ roles: ["MODERATOR"], reason: "incident" }),
      }),
      { APP_ENV: "development" },
      context,
    );

    expect(response.status).toBe(200);
    expect((await bodyOf(response)).data).toMatchObject({
      serverAuthority: true,
    });
    expect(calls).toHaveLength(0);
  });

  it("preserves break-glass request metadata through auth middleware for canonical OPS admins", async () => {
    const { repository } = createRepository();
    const app = authenticatedAppWithRepository(repository);

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/admin-role-members/adm_1", {
        method: "PATCH",
        headers: {
          authorization: "Bearer phase3-admin-token",
          "content-type": "application/json",
          "x-admin-break-glass": "true",
          "x-admin-break-glass-scope": "role:manage",
          "x-admin-break-glass-expires-at": new Date(
            Date.now() + 10 * 60 * 1000,
          ).toISOString(),
          "x-admin-reason": "incident-scoped role repair",
        },
        body: JSON.stringify({ roles: ["MODERATOR"] }),
      }),
      { APP_ENV: "development" },
      context,
    );

    expect(response.status).toBe(200);
    const body = await bodyOf(response);
    expect(body.data).toMatchObject({
      roles: "OPS_ADMIN",
      serverAuthority: true,
    });
    expect(String(body.data?.permissions)).toContain("role:manage");
  });
});
