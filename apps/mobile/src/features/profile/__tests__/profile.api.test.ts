import {
  createProfileApi,
  mergeProfileSnapshotWithMyPageSummary,
} from "../api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

const profilePayload = {
  user: {
    idHash: "sha256:1234567890abcdef1234567890abcdef",
    nickname: "급여 방어자",
    role: "USER",
    emailVerified: true,
    onboardingCompleted: true,
    joinedAt: "2026-07-02T09:00:00.000Z",
    level: 18,
    title: "Salary Guardian",
    avatarEmoji: "SH",
    marketingConsent: false,
    notificationConsent: true,
    communityDisplayName: "익명 방어자",
    rawEmailExposed: false,
    rawPhoneExposed: false,
    rawFinancialDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  },
  summary: {
    totalHijackSaved: 5_780_000,
    currentMonthHijack: 1_927_000,
    currentLevel: 18,
    levelXp: 380,
    nextLevelXp: 999,
    selfCareScore: 84,
    completedGrowthTasks: 11,
    communityPosts: 7,
    communityComments: 14,
    notificationUnread: 3,
    privacyPassRate: "100.00%",
  },
  privacy: {
    exportStatus: "NONE",
    exportRequestedAt: null,
    withdrawalRequested: false,
    adPersonalization: false,
    financialDataForAds: false,
    rawPushTokenLogging: false,
    tokenHashOnly: true,
  },
  activities: [
    {
      id: "activity_1",
      kind: "NOTICE",
      title: "PROFILE_VIEWED",
      description: "Account activity processed by the server.",
      createdAt: "2026-07-02T09:10:00.000Z",
      route: "/profile",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
  ],
} as const;

const myPageSummaryPayload = {
  adPartnerAccepted: false,
  adsFinancialTargetingUsed: false,
  communityComments: 4,
  communityPosts: 3,
  contentRecommendationAccepted: true,
  financialRawDataExposed: false,
  latestExportRequestedAt: "2026-07-03T06:00:00.000Z",
  latestExportStatus: "READY",
  level: 18,
  levelXp: 420,
  nextActions: "Profile ready; review LV UP routine",
  notificationUnread: 2,
  privacyExportCount: 2,
  profileCompleted: true,
  rawPersonalDataExposed: false,
  rawTokenExposed: false,
  selfCareScore: 91,
  sensitiveFinancialTargetingAccepted: false,
  status: "ACTIVE",
  theme: "DARK",
  totalExp: 1740,
} as const;

describe("profile api", () => {
  it("loads the mobile profile payload with privacy headers and redacted identifiers", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "profile-correlation-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({ data: profilePayload });
      },
      platform: "ios",
    });

    await expect(api.getProfile()).resolves.toMatchObject({
      user: {
        idHash: "sha256:1234567890abcdef1234567890abcdef",
        nickname: "급여 방어자",
        rawFinancialDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      summary: {
        totalHijackSaved: 5_780_000,
        currentLevel: 18,
        privacyPassRate: "100.00%",
      },
      privacy: {
        financialDataForAds: false,
        rawPushTokenLogging: false,
        tokenHashOnly: true,
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/profile",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("ios");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "profile-correlation-1",
    );
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    expect(JSON.stringify(await api.getProfile())).not.toContain("userId");
    expect(JSON.stringify(await api.getProfile())).not.toContain(
      "raw@example.com",
    );
  });

  it("loads and merges the server MY page summary without exposing owner ids or raw private data", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "profile-summary-correlation-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({ data: myPageSummaryPayload });
      },
      platform: "android",
    });

    const summary = await api.getMyPageSummary();
    const merged = mergeProfileSnapshotWithMyPageSummary(
      {
        activities: profilePayload.activities,
        privacy: profilePayload.privacy,
        summary: profilePayload.summary,
        user: profilePayload.user,
      },
      summary,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/my-page-summary",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("android");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(summary).toMatchObject({
      adsFinancialTargetingUsed: false,
      communityPosts: 3,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      rawTokenExposed: false,
      sensitiveFinancialTargetingAccepted: false,
    });
    expect(merged.summary).toMatchObject({
      communityComments: 4,
      communityPosts: 3,
      currentLevel: 18,
      levelXp: 420,
      notificationUnread: 2,
      privacyPassRate: "100.00%",
      selfCareScore: 91,
    });
    expect(merged.privacy).toMatchObject({
      exportRequestedAt: "2026-07-03T06:00:00.000Z",
      exportStatus: "READY",
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    });
    expect(JSON.stringify(summary)).not.toContain("userId");
    expect(JSON.stringify(summary)).not.toMatch(
      /raw@example\.com|salary|expense|saving|hijack|phone|card|account/iu,
    );
  });

  it("requests privacy export and withdrawal request without raw financial payloads", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({ data: profilePayload }, 202);
      },
      platform: "android",
    });

    await expect(
      api.requestPrivacyExport({ reason: "app-my-page" }),
    ).resolves.toMatchObject({ privacy: { financialDataForAds: false } });
    await expect(
      api.requestWithdrawalRequest({ reason: "app-my-page" }),
    ).resolves.toMatchObject({ privacy: { rawPushTokenLogging: false } });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/privacy-export",
    );
    expect(calls[1]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/withdrawal-request",
    );
    for (const call of calls) {
      expect(call.method).toBe("POST");
      const body = JSON.parse(await call.clone().text()) as Record<
        string,
        unknown
      >;
      expect(body).toMatchObject({
        adsFinancialTargetingUsed: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
      });
      expect(JSON.stringify(Object.values(body))).not.toMatch(
        /salary|expense|saving|hijack|token|email|phone|card|account/iu,
      );
    }
  });

  it("creates support tickets without raw financial or personal payloads", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse(
          {
            data: {
              adsFinancialTargetingUsed: false,
              category: "ACCOUNT",
              createdAt: "2026-07-03T05:30:00.000Z",
              id: "ticket_1",
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPushTokenExposed: false,
              status: "OPEN",
              subject: "로그인 도움이 필요해요",
            },
          },
          202,
        );
      },
      platform: "android",
    });

    await expect(
      api.createSupportTicket({
        category: "ACCOUNT",
        message: "계정 설정 화면에서 로그인 상태를 확인하고 싶어요.",
        subject: "로그인 도움이 필요해요",
      }),
    ).resolves.toMatchObject({
      adsFinancialTargetingUsed: false,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      status: "OPEN",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/support-tickets",
    );
    const body = JSON.parse(await calls[0]!.clone().text()) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      adsFinancialTargetingUsed: false,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
    });
    expect(JSON.stringify(Object.values(body))).not.toMatch(
      /salary|expense|saving|hijack|token|email|phone|card|accountNumber/iu,
    );
  });

  it("rejects unsafe profile responses before MY screen consumes them", async () => {
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            ...profilePayload,
            user: {
              ...profilePayload.user,
              rawFinancialDataExposed: true,
            },
          },
        }),
      platform: "web",
    });

    await expect(api.getProfile()).rejects.toMatchObject({
      code: "PROFILE_INVALID_RESPONSE",
    });
  });
});
