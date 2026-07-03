import { describe, expect, it } from "vitest";
import {
  createNeonUsersRepository,
  shouldUseNeonUsersRepository,
} from "../src/repositories/users.repository";
import type { UsersRouteRuntime } from "../src/routes/users.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const exportId = "33333333-3333-4333-8333-333333333333";
const withdrawalRequestId = "44444444-4444-4444-8444-444444444444";

function createRuntime(): UsersRouteRuntime<unknown> {
  return {
    request: new Request("https://api.test/api/v1/users/me/support-tickets"),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/users/me/support-tickets"),
    path: "/api/v1/users/me/support-tickets",
    relativePath: "/me/support-tickets",
    method: "POST",
    requestId: "users-support-ticket-db-repository-test",
    now: new Date("2026-07-03T06:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

describe("Neon users support ticket repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonUsersRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonUsersRepository({ APP_ENV: "test" })).toBe(false);
  });

  it("stores mobile support tickets without echoing owner ids, message body, or raw sensitive data", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              ads_financial_targeting_used: false,
              category: "ACCOUNT",
              created_at: "2026-07-03T06:00:00.000Z",
              raw_financial_data_exposed: false,
              raw_personal_data_exposed: false,
              raw_push_token_exposed: false,
              status: "OPEN",
              subject: "로그인 도움이 필요해요",
              ticket_id: ticketId,
              user_id: userId,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.createSupportTicket(
      {
        category: "ACCOUNT",
        message: "계정 설정 화면에서 로그인 상태를 확인하고 싶어요.",
        subject: "로그인 도움이 필요해요",
      },
      createRuntime(),
    );

    expect(result).toMatchObject({
      adsFinancialTargetingUsed: false,
      category: "ACCOUNT",
      createdAt: "2026-07-03T06:00:00.000Z",
      id: ticketId,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      status: "OPEN",
      subject: "로그인 도움이 필요해요",
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain("계정 설정 화면");
    expect(calls.map((call) => call.operationName)).toEqual([
      "users.createSupportTicket",
    ]);
    expect(calls[0]?.sqlText).toContain(
      "insert into public.user_support_tickets",
    );
    expect(calls[0]?.params).toContain(userId);
    expect(calls[0]?.params).toContain(
      "계정 설정 화면에서 로그인 상태를 확인하고 싶어요.",
    );
  });
  it("stores privacy export requests as financial-summary-only records without returning owner ids or raw financial data", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              created_at: "2026-07-03T06:00:00.000Z",
              download_url: null,
              export_id: exportId,
              expires_at: "2026-07-04T06:00:00.000Z",
              financial_raw_data_included: false,
              include_community: true,
              include_consents: true,
              include_financial_summary_only: true,
              include_growth: true,
              include_profile: true,
              include_settings: true,
              reason: "mobile privacy export",
              status: "REQUESTED",
              user_id: userId,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.requestExport(
      {
        includeCommunity: true,
        includeConsents: true,
        includeFinancialSummaryOnly: true,
        includeGrowth: true,
        includeProfile: true,
        includeSettings: true,
        reason: "mobile privacy export",
      },
      createRuntime(),
    );

    expect(result).toMatchObject({
      createdAt: "2026-07-03T06:00:00.000Z",
      exportId,
      financialRawDataIncluded: false,
      includeCommunity: true,
      includeConsents: true,
      includeFinancialSummaryOnly: true,
      includeGrowth: true,
      includeProfile: true,
      includeSettings: true,
      status: "REQUESTED",
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain("salary");
    expect(calls.map((call) => call.operationName)).toEqual([
      "users.requestExport",
    ]);
    expect(calls[0]?.sqlText).toContain(
      "insert into public.user_privacy_exports",
    );
    expect(calls[0]?.params).toContain(userId);
    expect(calls[0]?.params).toContain(true);
  });

  it("stores withdrawal requests without performing destructive withdrawal or returning the raw reason", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              delete_community_content: true,
              reason: "mobile withdrawal request",
              requested_at: "2026-07-03T06:00:00.000Z",
              request_id: withdrawalRequestId,
              status: "REQUESTED",
              user_id: userId,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.requestWithdrawal(
      {
        deleteCommunityContent: true,
        reason: "mobile withdrawal request",
      },
      createRuntime(),
    );

    expect(result).toMatchObject({
      deleteCommunityContent: true,
      status: "ACTIVE",
      withdrawalRequested: true,
      withdrawalRequestedAt: "2026-07-03T06:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain("mobile withdrawal request");
    expect(calls.map((call) => call.operationName)).toEqual([
      "users.requestWithdrawal",
    ]);
    expect(calls[0]?.sqlText).toContain(
      "insert into public.user_withdrawal_requests",
    );
    expect(calls[0]?.params).toContain(userId);
    expect(calls[0]?.params).toContain("mobile withdrawal request");
  });

  it("loads and upserts mobile profile settings through user_settings", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              dashboard_compact_mode: true,
              language: "ko-KR",
              payday_reminder_days_before: 5,
              show_amounts_in_community: false,
              theme: "DARK",
              timezone: "Asia/Seoul",
              updated_at: "2026-07-03T06:00:00.000Z",
              user_id: userId,
              week_starts_on_monday: true,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const settings = await repository.getSettings(createRuntime());
    const updated = await repository.updateSettings(
      {
        dashboardCompactMode: true,
        language: "ko-KR",
        paydayReminderDaysBefore: 5,
        showAmountsInCommunity: false,
        theme: "DARK",
        timezone: "Asia/Seoul",
        weekStartsOnMonday: true,
      },
      createRuntime(),
    );

    expect(settings).toMatchObject({
      dashboardCompactMode: true,
      language: "ko-KR",
      paydayReminderDaysBefore: 5,
      showAmountsInCommunity: false,
      theme: "DARK",
      timezone: "Asia/Seoul",
      updatedAt: "2026-07-03T06:00:00.000Z",
      weekStartsOnMonday: true,
    });
    expect(updated).toMatchObject(settings);
    expect(JSON.stringify(updated)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "users.getSettings",
      "users.updateSettings",
    ]);
    expect(calls[0]?.sqlText).toContain("from public.user_settings");
    expect(calls[1]?.sqlText).toContain("insert into public.user_settings");
    expect(calls[1]?.sqlText).toContain("on conflict (user_id) do update");
    expect(calls[1]?.params).toContain(userId);
    expect(calls[1]?.params).toContain("DARK");
  });

  it("loads latest consents and records consent updates without financial targeting consent", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows:
            options.operationName === "users.getConsents"
              ? [
                  {
                    consent_type: "TERMS_OF_SERVICE",
                    consent_version: "v3.1",
                    granted: true,
                    updated_at: "2026-07-03T06:00:00.000Z",
                  },
                  {
                    consent_type: "PRIVACY_POLICY",
                    consent_version: "v3.1",
                    granted: true,
                    updated_at: "2026-07-03T06:00:00.000Z",
                  },
                  {
                    consent_type: "ADS_PARTNER",
                    consent_version: "v3.1",
                    granted: true,
                    updated_at: "2026-07-03T06:00:00.000Z",
                  },
                ]
              : [
                  {
                    ad_partner_accepted: true,
                    analytics_accepted: true,
                    consent_version: "v3.1",
                    content_recommendation_accepted: true,
                    marketing_accepted: false,
                    privacy_accepted: true,
                    terms_accepted: true,
                    updated_at: "2026-07-03T06:00:00.000Z",
                  },
                ],
          rowCount: 1,
        };
      },
    });

    const consents = await repository.getConsents(createRuntime());
    const updated = await repository.updateConsents(
      {
        adPartnerAccepted: true,
        analyticsAccepted: true,
        consentVersion: "v3.1",
        contentRecommendationAccepted: true,
        marketingAccepted: false,
        privacyAccepted: true,
        termsAccepted: true,
      },
      createRuntime(),
    );

    expect(consents).toMatchObject({
      adPartnerAccepted: true,
      adPartnerFinancialRawDataUsed: false,
      privacyAccepted: true,
      sensitiveFinancialTargetingAccepted: false,
      termsAccepted: true,
    });
    expect(updated).toMatchObject({
      adPartnerAccepted: true,
      adPartnerFinancialRawDataUsed: false,
      analyticsAccepted: true,
      contentRecommendationAccepted: true,
      marketingAccepted: false,
      privacyAccepted: true,
      sensitiveFinancialTargetingAccepted: false,
      termsAccepted: true,
    });
    expect(calls.map((call) => call.operationName)).toEqual([
      "users.getConsents",
      "users.updateConsents",
    ]);
    expect(calls[0]?.sqlText).toContain("from public.user_consents");
    expect(calls[1]?.sqlText).toContain("insert into public.user_consents");
    expect(calls[1]?.params).toContain(userId);
    expect(JSON.stringify(updated)).not.toContain("salary");
  });

  it("loads the DB-backed profile without returning raw email or financial data", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              avatar_attachment_id: "att_profile_001",
              birth_year: 1991,
              created_at: "2026-07-01T00:00:00.000Z",
              display_bio: "월급을 먼저 지키는 사용자",
              display_name: "월급지킴이",
              email: "salary-user@example.com",
              last_login_at: "2026-07-03T05:00:00.000Z",
              level: 18,
              occupation_category: "OFFICE_WORKER",
              status: "ACTIVE",
              updated_at: "2026-07-03T06:00:00.000Z",
              user_id: userId,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.getMe(createRuntime());

    expect(result).toMatchObject({
      avatarAttachmentId: "att_profile_001",
      birthYear: 1991,
      createdAt: "2026-07-01T00:00:00.000Z",
      displayBio: "월급을 먼저 지키는 사용자",
      emailMasked: "sa***@example.com",
      financialRawDataExposed: false,
      level: 18,
      nickname: "월급지킴이",
      occupationCategory: "OFFICE_WORKER",
      status: "ACTIVE",
      updatedAt: "2026-07-03T06:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("salary-user@example.com");
    expect(JSON.stringify(result)).not.toContain("salary");
    expect(calls.map((call) => call.operationName)).toEqual(["users.getMe"]);
    expect(calls[0]?.sqlText).toContain("from public.users");
    expect(calls[0]?.sqlText).toContain("left join public.user_profiles");
    expect(calls[0]?.params).toContain(userId);
  });

  it("upserts profile changes through users and user_profiles without echoing raw contact data", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              avatar_attachment_id: "att_profile_002",
              birth_year: 1992,
              created_at: "2026-07-01T00:00:00.000Z",
              display_bio: "이번 달 예산을 지키는 중",
              display_name: "예산러",
              email: "budget-user@example.com",
              last_login_at: null,
              level: 2,
              occupation_category: "CREATOR",
              status: "ACTIVE",
              updated_at: "2026-07-03T06:00:00.000Z",
              user_id: userId,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.updateMe(
      {
        avatarAttachmentId: "att_profile_002",
        birthYear: 1992,
        displayBio: "이번 달 예산을 지키는 중",
        nickname: "예산러",
        occupationCategory: "CREATOR",
      },
      createRuntime(),
    );

    expect(result).toMatchObject({
      avatarAttachmentId: "att_profile_002",
      birthYear: 1992,
      displayBio: "이번 달 예산을 지키는 중",
      emailMasked: "bu***@example.com",
      financialRawDataExposed: false,
      nickname: "예산러",
      occupationCategory: "CREATOR",
      status: "ACTIVE",
    });
    expect(JSON.stringify(result)).not.toContain("budget-user@example.com");
    expect(calls.map((call) => call.operationName)).toEqual(["users.updateMe"]);
    expect(calls[0]?.sqlText).toContain("update public.users");
    expect(calls[0]?.sqlText).toContain("insert into public.user_profiles");
    expect(calls[0]?.sqlText).toContain("on conflict (user_id) do update");
    expect(calls[0]?.params).toContain(userId);
    expect(calls[0]?.params).toContain("예산러");
    expect(calls[0]?.params).toContain("att_profile_002");
  });
});
