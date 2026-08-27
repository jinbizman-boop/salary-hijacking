import { describe, expect, it } from "vitest";
import { createNeonAdminRepository } from "../src/repositories/admin.repository";
import type { AdminRouteRuntime } from "../src/routes/admin.routes";

const adminId = "99999999-9999-4999-8999-999999999999";
const userId = "11111111-1111-4111-8111-111111111111";
const postId = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
const noticeId = "44444444-4444-4444-8444-444444444444";
const partnerId = "55555555-5555-4555-8555-555555555555";
const campaignId = "66666666-6666-4666-8666-666666666666";
const roleMemberId = "77777777-7777-4777-8777-777777777777";

function createRuntime(path = "/admin/api/v1/users") {
  return {
    request: new Request(`https://api.test${path}`, {
      headers: { "x-admin-reason": "phase7 repository runtime test" },
    }),
    env: { DATABASE_URL: "postgres://example.invalid/salary" },
    execution: {},
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/admin/api/v1", ""),
    method: "GET",
    requestId: "phase7-admin-db-runtime",
    principal: {
      adminId,
      roles: ["SUPER_ADMIN"],
      permissions: ["*"],
      mfaVerified: true,
      policyId: null,
      breakGlass: null,
    },
    repository: null,
  } as unknown as AdminRouteRuntime<{ readonly DATABASE_URL: string }>;
}

describe("Neon admin repository runtime coverage", () => {
  it("uses canonical DB tables for dashboard, user list, detail, activity, and force logout", async () => {
    const calls: Array<{ operationName: string; sqlText: string }> = [];
    const repository = createNeonAdminRepository({
      query: async (sqlText, _params, options) => {
        calls.push({ operationName: options.operationName, sqlText });
        if (options.operationName === "admin.dashboard") {
          return {
            rows: [
              {
                user_count: 2,
                active_user_count: 1,
                open_report_count: 3,
                live_ad_campaign_count: 4,
                open_incident_count: 5,
              },
            ],
            rowCount: 1,
          };
        }
        if (options.operationName === "admin.listUsers") {
          return {
            rows: [
              {
                user_id: userId,
                email: "masked@example.test",
                nickname: "tester",
                status: "ACTIVE",
                created_at: "2026-08-27T00:00:00.000Z",
                updated_at: "2026-08-27T00:00:00.000Z",
                last_login_at: "2026-08-27T00:01:00.000Z",
                total_count: 1,
              },
            ],
            rowCount: 1,
          };
        }
        if (options.operationName === "admin.getUser") {
          return {
            rows: [
              {
                user_id: userId,
                email: "masked@example.test",
                nickname: "tester",
                status: "ACTIVE",
                created_at: "2026-08-27T00:00:00.000Z",
                updated_at: "2026-08-27T00:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        if (options.operationName === "admin.forceLogoutUser") {
          return { rows: [{ revoked_sessions: 2 }], rowCount: 1 };
        }
        return { rows: [{ payroll_plan_count: 1, post_count: 2, report_count: 3, active_session_count: 0 }], rowCount: 1 };
      },
    });

    await repository.dashboard(createRuntime("/admin/api/v1/dashboard"));
    const users = await repository.listUsers(
      {},
      { page: 1, pageSize: 20, offset: 0, limit: 20 },
      createRuntime(),
    );
    const detail = await repository.getUser(
      userId,
      createRuntime(`/admin/api/v1/users/${userId}`),
    );
    const logout = await repository.forceLogoutUser(
      userId,
      {},
      createRuntime(`/admin/api/v1/users/${userId}/force-logout`),
    );
    await repository.userActivitySummary(
      userId,
      createRuntime(`/admin/api/v1/users/${userId}/activity-summary`),
    );

    expect(users.items).toHaveLength(1);
    expect(detail?.userId).toBe(userId);
    expect(logout).toMatchObject({ userId, revokedSessions: 2 });
    expect(calls.map((call) => call.operationName)).toEqual([
      "admin.dashboard",
      "admin.listUsers",
      "admin.getUser",
      "admin.forceLogoutUser",
      "admin.userActivitySummary",
    ]);
    expect(calls[0]?.sqlText).toContain("public.users");
    expect(calls[1]?.sqlText).toContain("public.users");
    expect(calls[3]?.sqlText).toContain("public.auth_sessions");
  });

  it("persists community moderation, reports, notices, ads, audit logs, and role members through canonical tables", async () => {
    const calls: Array<{ operationName: string; sqlText: string; params: readonly unknown[] }> = [];
    const repository = createNeonAdminRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        switch (options.operationName) {
          case "admin.listCommunityPosts":
          case "admin.getCommunityPost":
          case "admin.moderateCommunityPost":
          case "admin.deleteCommunityPost":
            return {
              rows: [
                {
                  post_id: postId,
                  user_id: userId,
                  board_type: "FREE",
                  title: "hello",
                  status: options.operationName === "admin.deleteCommunityPost" ? "DELETED" : "HIDDEN",
                  created_at: "2026-08-27T00:00:00.000Z",
                  updated_at: "2026-08-27T00:00:00.000Z",
                  total_count: 1,
                },
              ],
              rowCount: 1,
            };
          case "admin.listReports":
          case "admin.resolveReport":
            return {
              rows: [
                {
                  report_id: reportId,
                  reporter_user_id: userId,
                  target_type: "POST",
                  target_id: postId,
                  reason_code: "SPAM",
                  status: "RESOLVED",
                  created_at: "2026-08-27T00:00:00.000Z",
                  resolved_at: "2026-08-27T00:02:00.000Z",
                  total_count: 1,
                },
              ],
              rowCount: 1,
            };
          case "admin.listNotices":
          case "admin.createNotice":
          case "admin.updateNotice":
          case "admin.publishNotice":
          case "admin.unpublishNotice":
          case "admin.deleteNotice":
            return {
              rows: [
                {
                  notice_id: noticeId,
                  title: "notice",
                  body: "body",
                  audience: "ALL",
                  status: "PUBLISHED",
                  is_pinned: false,
                  created_at: "2026-08-27T00:00:00.000Z",
                  updated_at: "2026-08-27T00:00:00.000Z",
                  total_count: 1,
                },
              ],
              rowCount: 1,
            };
          case "admin.listAdCampaigns":
          case "admin.createAdCampaign":
          case "admin.updateAdCampaign":
          case "admin.changeAdCampaignStatus":
            return {
              rows: [
                {
                  ad_campaign_id: campaignId,
                  partner_account_id: partnerId,
                  name: "campaign",
                  placement: "HOME_TOP",
                  status: "LIVE",
                  targeting_policy: "CONTEXTUAL_ONLY",
                  targeting_payload: {},
                  start_at: "2026-08-27T00:00:00.000Z",
                  end_at: "2026-09-27T00:00:00.000Z",
                  created_at: "2026-08-27T00:00:00.000Z",
                  updated_at: "2026-08-27T00:00:00.000Z",
                  total_count: 1,
                },
              ],
              rowCount: 1,
            };
          case "admin.adReports":
            return { rows: [{ impressions: 7, clicks: 2, conversions: 1 }], rowCount: 1 };
          case "admin.listAuditLogs":
            return {
              rows: [
                {
                  admin_audit_log_id: "88888888-8888-4888-8888-888888888888",
                  action: "UPDATE_ROLE_MEMBER",
                  target_type: "ADMIN_ROLE_MEMBER",
                  result: "SUCCESS",
                  severity: "INFO",
                  request_id: "phase7-admin-db-runtime",
                  created_at: "2026-08-27T00:00:00.000Z",
                  total_count: 1,
                },
              ],
              rowCount: 1,
            };
          case "admin.listRoleMembers":
          case "admin.updateRoleMember":
            return {
              rows: [
                {
                  admin_role_member_id: roleMemberId,
                  role_key: "owner",
                  user_id: userId,
                  status: "ACTIVE",
                  assigned_at: "2026-08-27T00:00:00.000Z",
                  total_count: 1,
                },
              ],
              rowCount: 1,
            };
          default:
            throw new Error(`Unhandled operation ${options.operationName}`);
        }
      },
    });

    const page = { page: 1, pageSize: 20, offset: 0, limit: 20 };
    await repository.listCommunityPosts({}, page, createRuntime("/admin/api/v1/community/posts"));
    await repository.getCommunityPost(postId, createRuntime(`/admin/api/v1/community/posts/${postId}`));
    await repository.moderateCommunityPost(postId, {}, "HIDE_POST", createRuntime(`/admin/api/v1/community/posts/${postId}/hide`));
    await repository.deleteCommunityPost(postId, {}, createRuntime(`/admin/api/v1/community/posts/${postId}`));
    await repository.listReports({}, page, createRuntime("/admin/api/v1/reports"));
    await repository.resolveReport(reportId, {}, createRuntime(`/admin/api/v1/reports/${reportId}/resolve`));
    await repository.listNotices({}, page, createRuntime("/admin/api/v1/notices"));
    await repository.createNotice({ title: "notice", body: "body" }, createRuntime("/admin/api/v1/notices"));
    await repository.updateNotice(noticeId, { title: "notice2" }, createRuntime(`/admin/api/v1/notices/${noticeId}`));
    await repository.publishNotice(noticeId, {}, createRuntime(`/admin/api/v1/notices/${noticeId}/publish`));
    await repository.unpublishNotice(noticeId, {}, createRuntime(`/admin/api/v1/notices/${noticeId}/unpublish`));
    await repository.deleteNotice(noticeId, {}, createRuntime(`/admin/api/v1/notices/${noticeId}`));
    await repository.listAdCampaigns({}, page, createRuntime("/admin/api/v1/ads/campaigns"));
    await repository.createAdCampaign(
      { partnerAccountId: partnerId, name: "campaign", placement: "HOME_TOP", landingUrl: "https://ads.example", startAt: "2026-08-27T00:00:00.000Z", endAt: "2026-09-27T00:00:00.000Z" },
      createRuntime("/admin/api/v1/ads/campaigns"),
    );
    await repository.updateAdCampaign(campaignId, { name: "campaign2" }, createRuntime(`/admin/api/v1/ads/campaigns/${campaignId}`));
    await repository.changeAdCampaignStatus(campaignId, "ACTIVE", {}, createRuntime(`/admin/api/v1/ads/campaigns/${campaignId}/activate`));
    await repository.adReports({}, createRuntime("/admin/api/v1/ads/reports"));
    await repository.listAuditLogs({}, page, createRuntime("/admin/api/v1/audit-logs"));
    await repository.listRoleMembers({}, page, createRuntime("/admin/api/v1/admin-role-members"));
    await repository.updateRoleMember(roleMemberId, { status: "SUSPENDED" }, createRuntime(`/admin/api/v1/admin-role-members/${roleMemberId}`));

    const joinedSql = calls.map((call) => call.sqlText).join("\n");
    expect(joinedSql).toContain("public.community_posts");
    expect(joinedSql).toContain("public.community_reports");
    expect(joinedSql).toContain("public.notices");
    expect(joinedSql).toContain("public.ad_campaigns");
    expect(joinedSql).toContain("public.ad_events");
    expect(joinedSql).toContain("public.admin_audit_logs");
    expect(joinedSql).toContain("public.admin_role_members");
    expect(calls.some((call) => call.operationName === "admin.createAdCampaign" && call.params.includes(false))).toBe(true);
  });
});
