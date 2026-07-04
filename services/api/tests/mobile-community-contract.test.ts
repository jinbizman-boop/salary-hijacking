import { describe, expect, it, vi } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  CommunityRepository,
  CommunityRoutesOptions,
} from "../src/routes/community.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "content-type": "application/json",
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "11111111-1111-4111-8111-111111111111",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
  "x-correlation-id": "mobile-community-contract",
});

function createMobileCommunityRepository(): CommunityRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  const emptyList = async () => ({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  return {
    name: "mobile-contract-community-repository",
    listBoards: async () => [],
    listPosts: async () => ({
      items: [
        {
          postId: "22222222-2222-4222-8222-222222222222",
          boardType: "LEVEL_CERTIFICATION",
          title: "DB-backed community repository is wired",
          content: "모바일 커뮤니티 피드는 API 저장소 주입을 사용합니다.",
          authorMasked: "익명 사용자",
          anonymous: true,
          status: "VISIBLE",
          likeCount: 0,
          commentCount: 0,
          serverAuthority: true,
          financialRawDataExposed: false,
          rawPersonalDataExposed: false,
          adsFinancialTargetingUsed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    getPost: async () => null,
    createPost: notUsed,
    updatePost: notUsed,
    deletePost: notUsed,
    setPostReaction: notUsed,
    setPostBookmark: notUsed,
    recordPostShare: notUsed,
    listComments: emptyList,
    createComment: notUsed,
    updateComment: notUsed,
    deleteComment: notUsed,
    createReport: notUsed,
    listMyPosts: emptyList,
    listMyComments: emptyList,
  };
}

describe("mobile community API contract", () => {
  it("lets the app gateway inject a community repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      communityRoutesOptions: {
        repository: createMobileCommunityRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly communityRoutesOptions: CommunityRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/community/posts", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly items?: readonly Record<string, unknown>[];
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-community-repository")).toBe(
      "mobile-contract-community-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.items?.[0]).toMatchObject({
      title: "DB-backed community repository is wired",
      serverAuthority: true,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
  });

  it("routes mobile bookmark and share actions through the community repository", async () => {
    const setPostBookmark = vi.fn().mockResolvedValue({
      postId: "22222222-2222-4222-8222-222222222222",
      state: "BOOKMARKED",
      bookmarkCount: 1,
      serverAuthority: true,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    const recordPostShare = vi.fn().mockResolvedValue({
      postId: "22222222-2222-4222-8222-222222222222",
      channel: "SYSTEM_SHARE",
      shareCount: 1,
      serverAuthority: true,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    const repository = {
      ...createMobileCommunityRepository(),
      setPostBookmark,
      recordPostShare,
    } as unknown as CommunityRepository<unknown>;
    const app = createApp({
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      communityRoutesOptions: {
        repository,
        exposeRepositoryName: true,
      },
    });

    const bookmarkResponse = await app.fetch(
      new Request("https://api.test/api/v1/community/bookmarks", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          enabled: true,
          postId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const shareResponse = await app.fetch(
      new Request("https://api.test/api/v1/community/shares", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          channel: "SYSTEM_SHARE",
          postId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
      { APP_ENV: "development" },
      context,
    );

    expect(bookmarkResponse.status).toBe(200);
    expect(shareResponse.status).toBe(201);
    expect(setPostBookmark).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      true,
      expect.objectContaining({ path: "/api/v1/community/bookmarks" }),
    );
    expect(recordPostShare).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "SYSTEM_SHARE",
      expect.objectContaining({ path: "/api/v1/community/shares" }),
    );
  });
});
