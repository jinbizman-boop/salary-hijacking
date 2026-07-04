import {
  createProfileApi,
  mergeProfileSnapshotWithMyPageSummary,
} from "../api";
import { PROFILE_SAFE_ERROR_MESSAGE } from "../constants";

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
  it("keeps the safe profile error message readable for Korean users", () => {
    expect(PROFILE_SAFE_ERROR_MESSAGE).toBe(
      "프로필 정보를 안전하게 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
    expect(PROFILE_SAFE_ERROR_MESSAGE).not.toMatch(/[�]/u);
    expect(PROFILE_SAFE_ERROR_MESSAGE).not.toContain("?꾨줈");
  });

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

  it("updates profile settings through the server profile boundary without unsafe fields", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "profile-update-correlation-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            ...profilePayload,
            user: {
              ...profilePayload.user,
              communityDisplayName: "익명 방어자",
              nickname: "급여 방어자",
              title: "프로덕트 루틴러",
            },
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.updateProfile({
        displayBio: "월급을 먼저 지키는 루틴러",
        nickname: "급여 방어자",
        occupationCategory: "PRODUCT",
      }),
    ).resolves.toMatchObject({
      user: {
        adsFinancialTargetingUsed: false,
        nickname: "급여 방어자",
        rawFinancialDataExposed: false,
        rawPhoneExposed: false,
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/profile",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("android");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "profile-update-correlation-1",
    );
    const body = JSON.parse(await calls[0]!.clone().text()) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      adsFinancialTargetingUsed: false,
      displayBio: "월급을 먼저 지키는 루틴러",
      nickname: "급여 방어자",
      occupationCategory: "PRODUCT",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
    });
    expect(JSON.stringify(Object.values(body))).not.toMatch(
      /salary|expense|saving|hijack|token|email|phone|card|accountNumber/iu,
    );
  });

  it("rejects profile updates with raw personal or financial values before fetch", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: profilePayload });
      },
      platform: "ios",
    });

    const unsafeRequests = [
      {
        displayBio: "연락은 user@example.com 또는 010-1234-5678로 주세요.",
        nickname: "안전유저",
      },
      {
        displayBio: "이번 달 급여 2,700,000원 관리 중",
        nickname: "월급러",
      },
      {
        displayBio:
          "Authorization Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        nickname: "토큰러",
      },
    ];

    for (const request of unsafeRequests) {
      await expect(api.updateProfile(request)).rejects.toMatchObject({
        code: "PROFILE_INVALID_UPDATE_REQUEST",
      });
    }
    expect(calls).toHaveLength(0);
  });

  it("rejects unknown profile update fields before they can enter MY payloads", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: profilePayload });
      },
      platform: "android",
    });

    await expect(
      api.updateProfile({
        nickname: "Salary keeper",
        phone: "010-1234-5678",
      } as never),
    ).rejects.toMatchObject({
      code: "PROFILE_INVALID_UPDATE_REQUEST",
    });

    await expect(
      api.updateProfile({
        displayBio: "quiet profile",
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({
      code: "PROFILE_INVALID_UPDATE_REQUEST",
    });
    expect(calls).toHaveLength(0);
  });

  it("rejects credentialed profile API base URLs before any request can be created", () => {
    const calls: Request[] = [];

    expect(() =>
      createProfileApi({
        baseUrl: "https://operator:secret@api.salaryhijacking.com",
        fetcher: async (request) => {
          calls.push(
            request instanceof Request ? request : new Request(request),
          );
          return jsonResponse({ data: profilePayload });
        },
        platform: "android",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "PROFILE_INVALID_BASE_URL",
      }),
    );
    expect(calls).toHaveLength(0);
  });

  it("completes onboarding through the server profile boundary without unsafe fields", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "onboarding-complete-correlation-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            ...profilePayload,
            user: {
              ...profilePayload.user,
              onboardingCompleted: true,
            },
          },
        });
      },
      platform: "android",
    });

    await expect(api.completeOnboarding()).resolves.toMatchObject({
      user: {
        onboardingCompleted: true,
        rawFinancialDataExposed: false,
        rawPushTokenExposed: false,
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/me/onboarding-complete",
    );
    const body = JSON.parse(await calls[0]!.clone().text()) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      adsFinancialTargetingUsed: false,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
    });
    expect(JSON.stringify(Object.values(body))).not.toMatch(
      /salary|expense|saving|hijack|token|email|phone|card|account/iu,
    );
  });

  it("updates account consent settings without financial targeting or raw token payloads", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "account-settings-correlation-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            adPartnerAccepted: false,
            adPartnerFinancialRawDataUsed: false,
            analyticsAccepted: false,
            consentVersion: "mobile-v1",
            contentRecommendationAccepted: true,
            marketingAccepted: false,
            privacyAccepted: true,
            sensitiveFinancialTargetingAccepted: false,
            termsAccepted: true,
            updatedAt: "2026-07-03T08:20:00.000Z",
          },
        });
      },
      platform: "ios",
    });

    await expect(
      api.updateAccountSettings({
        adPartnerAccepted: false,
        analyticsAccepted: false,
        consentVersion: "mobile-v1",
        contentRecommendationAccepted: true,
        marketingAccepted: false,
        privacyAccepted: true,
        termsAccepted: true,
      }),
    ).resolves.toMatchObject({
      adPartnerAccepted: false,
      adPartnerFinancialRawDataUsed: false,
      marketingAccepted: false,
      sensitiveFinancialTargetingAccepted: false,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/users/consents",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("ios");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "account-settings-correlation-1",
    );
    const body = JSON.parse(await calls[0]!.clone().text()) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      adPartnerAccepted: false,
      adPartnerFinancialRawDataUsed: false,
      adsFinancialTargetingUsed: false,
      analyticsAccepted: false,
      consentVersion: "mobile-v1",
      contentRecommendationAccepted: true,
      marketingAccepted: false,
      privacyAccepted: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      sensitiveFinancialTargetingAccepted: false,
      termsAccepted: true,
    });
    expect(JSON.stringify(Object.values(body))).not.toMatch(
      /salary|expense|saving|hijack|token|email|phone|card|accountNumber/iu,
    );
  });

  it("rejects account consent versions with raw sensitive values before fetch", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "ios",
    });

    for (const consentVersion of [
      "Authorization Bearer secret_12345678",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      "user@example.com",
    ]) {
      await expect(
        api.updateAccountSettings({
          adPartnerAccepted: false,
          analyticsAccepted: false,
          consentVersion,
          contentRecommendationAccepted: true,
          marketingAccepted: false,
          privacyAccepted: true,
          termsAccepted: true,
        }),
      ).rejects.toMatchObject({
        code: "PROFILE_INVALID_ACCOUNT_SETTINGS_REQUEST",
      });
    }
    expect(calls).toHaveLength(0);
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

  it("rejects privacy export and withdrawal reasons with raw sensitive values before fetch", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: profilePayload }, 202);
      },
      platform: "android",
    });
    const unsafeReasons = [
      "내보내기 답변은 user@example.com으로 주세요",
      "탈퇴 확인 연락처 010-1234-5678",
      "계좌 110-123-456789와 급여 2,700,000원 확인",
      "Authorization Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
    ];

    for (const reason of unsafeReasons) {
      await expect(api.requestPrivacyExport({ reason })).rejects.toMatchObject({
        code: "PROFILE_INVALID_ACTION_REQUEST",
      });
      await expect(
        api.requestWithdrawalRequest({ reason }),
      ).rejects.toMatchObject({
        code: "PROFILE_INVALID_ACTION_REQUEST",
      });
    }
    expect(calls).toHaveLength(0);
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

  it("normalizes support ticket categories to the server contract before sending", async () => {
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
              category: "PRIVACY",
              createdAt: "2026-07-03T05:30:00.000Z",
              id: "ticket_privacy_1",
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPushTokenExposed: false,
              status: "OPEN",
              subject: "Privacy settings question",
            },
          },
          202,
        );
      },
      platform: "android",
    });

    await expect(
      api.createSupportTicket({
        category: "privacy" as never,
        message: "Please check the privacy settings screen behavior.",
        subject: "Privacy settings question",
      }),
    ).resolves.toMatchObject({
      category: "PRIVACY",
      id: "ticket_privacy_1",
      rawPersonalDataExposed: false,
    });
    await expect(
      api.createSupportTicket({
        category: "billing" as never,
        message: "Unsupported category should be rejected.",
        subject: "Unsupported category",
      }),
    ).rejects.toMatchObject({
      code: "PROFILE_INVALID_SUPPORT_TICKET_REQUEST",
    });

    expect(calls).toHaveLength(1);
    expect(JSON.parse(await calls[0]!.clone().text())).toMatchObject({
      category: "PRIVACY",
    });
  });

  it("rejects unknown support ticket fields before they can enter MY payloads", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} }, 202);
      },
      platform: "android",
    });

    await expect(
      api.createSupportTicket({
        accountNumber: "123-456-789012",
        category: "ACCOUNT",
        message: "Please check the account settings screen behavior.",
        subject: "Account settings question",
      } as never),
    ).rejects.toMatchObject({
      code: "PROFILE_INVALID_SUPPORT_TICKET_REQUEST",
    });

    expect(calls).toHaveLength(0);
  });

  it("rejects support tickets with raw personal or financial values before fetch", async () => {
    const calls: Request[] = [];
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} }, 202);
      },
      platform: "android",
    });

    const unsafeRequests = [
      {
        category: "ACCOUNT" as const,
        subject: "연락처 확인",
        message: "답변은 user@example.com 또는 010-1234-5678로 주세요.",
      },
      {
        category: "PAYMENT" as const,
        subject: "결제 카드 확인",
        message: "카드 1234-5678-9012-3456로 결제했어요.",
      },
      {
        category: "PRIVACY" as const,
        subject: "급여 문의",
        message:
          "이번 달 급여 2,700,000원과 계좌 110-123-456789를 확인해 주세요.",
      },
      {
        category: "BUG" as const,
        subject: "토큰 문의",
        message:
          "Authorization Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      },
    ];

    for (const request of unsafeRequests) {
      await expect(api.createSupportTicket(request)).rejects.toMatchObject({
        code: "PROFILE_INVALID_SUPPORT_TICKET_REQUEST",
      });
    }
    expect(calls).toHaveLength(0);
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

  it("rejects support ticket response subjects with raw sensitive values", async () => {
    const api = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse(
          {
            data: {
              adsFinancialTargetingUsed: false,
              category: "ACCOUNT",
              createdAt: "2026-07-03T05:30:00.000Z",
              id: "ticket_sensitive_subject",
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPushTokenExposed: false,
              status: "OPEN",
              subject: "contact user@example.com about account 123-456-789012",
            },
          },
          202,
        ),
      platform: "android",
    });

    await expect(
      api.createSupportTicket({
        category: "ACCOUNT",
        message: "login state check needed",
        subject: "login question",
      }),
    ).rejects.toMatchObject({
      code: "PROFILE_INVALID_RESPONSE",
    });
  });

  it("rejects invalid profile activity and support ticket ids returned by the server", async () => {
    const profileApi = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            ...profilePayload,
            activities: [
              {
                ...profilePayload.activities[0],
                id: "../activity_1",
              },
            ],
          },
        }),
      platform: "web",
    });
    const supportApi = createProfileApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse(
          {
            data: {
              adsFinancialTargetingUsed: false,
              category: "ACCOUNT",
              createdAt: "2026-07-03T05:30:00.000Z",
              id: "ticket_1\r\nAuthorization",
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPushTokenExposed: false,
              status: "OPEN",
              subject: "로그인 문의",
            },
          },
          202,
        ),
      platform: "android",
    });

    await expect(profileApi.getProfile()).rejects.toMatchObject({
      code: "PROFILE_INVALID_RESPONSE",
    });
    await expect(
      supportApi.createSupportTicket({
        category: "ACCOUNT",
        message: "앱 로그인 상태 확인이 필요합니다.",
        subject: "로그인 문의",
      }),
    ).rejects.toMatchObject({
      code: "PROFILE_INVALID_RESPONSE",
    });
  });
});
