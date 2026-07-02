import { createProfileApi } from "../api";

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
};

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
