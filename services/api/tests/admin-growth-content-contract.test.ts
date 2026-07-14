import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  AdminRepository,
  AdminRoutesOptions,
} from "../src/routes/admin.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const adminHeaders = Object.freeze({
  "content-type": "application/json",
  "x-admin-reason": "LV UP content operations approval",
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "99999999-9999-4999-8999-999999999999",
  "x-auth-primary-role": "ADM_CONTENT",
  "x-authenticated-roles": "ADM_CONTENT",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "true",
  "x-correlation-id": "admin-growth-content-contract",
});

function emptyList() {
  return { items: [], page: 1, pageSize: 20, total: 0 };
}

function createAdminGrowthContentRepository(): AdminRepository<unknown> {
  const record = async () => ({ serverAuthority: true });
  return {
    name: "admin-growth-content-contract-repository",
    dashboard: record,
    listUsers: async () => emptyList(),
    getUser: async () => null,
    updateUserStatus: record,
    forceLogoutUser: record,
    userActivitySummary: record,
    listCommunityPosts: async () => emptyList(),
    getCommunityPost: async () => null,
    moderateCommunityPost: record,
    deleteCommunityPost: record,
    listReports: async () => emptyList(),
    resolveReport: record,
    listNotices: async () => emptyList(),
    createNotice: record,
    updateNotice: record,
    publishNotice: record,
    unpublishNotice: record,
    deleteNotice: record,
    listAdCampaigns: async () => emptyList(),
    createAdCampaign: record,
    updateAdCampaign: record,
    changeAdCampaignStatus: record,
    adReports: record,
    listGrowthTasks: async () => emptyList(),
    createGrowthTask: record,
    updateGrowthTask: record,
    listGrowthContents: async () => ({
      items: [
        {
          contentId: "44444444-4444-4444-8444-444444444444",
          contentType: "READING",
          title: "Money habit reading",
          status: "DRAFT",
          sourceUrl: "https://publisher.example/books/money-habit",
          licenseType: "CURATED_LINK",
          safetyLevel: "GENERAL",
          auditReasonRequired: true,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    createGrowthContent: async (input, runtime) => ({
      contentId: "44444444-4444-4444-8444-444444444444",
      ...input,
      status: "DRAFT",
      createdBy: runtime.principal.adminId,
      auditReasonRequired: true,
      serverAuthority: true,
      financialRawDataExposed: false,
    }),
    updateGrowthContent: record,
    reviewGrowthContent: record,
    publishGrowthContent: record,
    archiveGrowthContent: record,
    listAuditLogs: async () => emptyList(),
    listRoleMembers: async () => emptyList(),
    updateRoleMember: record,
  };
}

describe("admin LV UP content operations contract", () => {
  it("lets the app gateway inject an admin repository and list LV UP content operations", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      adminRoutesOptions: {
        repository: createAdminGrowthContentRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly adminRoutesOptions: AdminRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/growth/contents", {
        headers: adminHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: { readonly items?: readonly Record<string, unknown>[] };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-admin-repository")).toBe(
      "admin-growth-content-contract-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.items?.[0]).toMatchObject({
      contentType: "READING",
      auditReasonRequired: true,
      financialRawDataExposed: false,
    });
    expect(JSON.stringify(body)).not.toContain(
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("blocks admin LV UP content mutation without an admin reason at the app audit gate", async () => {
    const app = createApp({
      enableAuth: false,
      enableRateLimit: false,
      adminRoutesOptions: {
        repository: createAdminGrowthContentRepository(),
      },
    } as AppOptions<unknown> & {
      readonly adminRoutesOptions: AdminRoutesOptions<unknown>;
    });
    const headers = new Headers(adminHeaders);
    headers.delete("x-admin-reason");

    const response = await app.fetch(
      new Request("https://api.test/admin/api/v1/growth/contents", {
        body: JSON.stringify({
          contentType: "READING",
          title: "Money habit reading",
        }),
        headers,
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(400);
    expect(body.error?.code).toBe("ADMIN_REASON_REQUIRED");
  });

  it("rejects publishing unsafe LV UP content when required source, license, or safety flags are missing", async () => {
    const app = createApp({
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      adminRoutesOptions: {
        repository: createAdminGrowthContentRepository(),
      },
    } as AppOptions<unknown> & {
      readonly adminRoutesOptions: AdminRoutesOptions<unknown>;
    });

    const response = await app.fetch(
      new Request(
        "https://api.test/admin/api/v1/growth/contents/44444444-4444-4444-8444-444444444444/publish",
        {
          body: JSON.stringify({
            contentType: "NEWS",
            sourceUrl: "",
            licenseType: "",
            safetyLevel: "",
          }),
          headers: adminHeaders,
          method: "POST",
        },
      ),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(400);
    expect(body.error?.code).toBe("ADMIN_GROWTH_CONTENT_PUBLISH_BLOCKED");
  });
});
