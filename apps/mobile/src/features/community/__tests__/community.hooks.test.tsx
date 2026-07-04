import { act, renderHook, waitFor } from "@testing-library/react-native";

import { CommunityApiError } from "../api";
import type { CommunityAnalytics } from "../community.analytics";
import { createCommunityStore } from "../community.store";
import type {
  CommunityApiResponse,
  CommunityCommentDraft,
  CommunityPost,
  CommunityPostDraft,
  CommunityService,
} from "../community.types";
import { useCommunityActions } from "../hooks/useCommunityActions";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import { useCommunityPost } from "../hooks/useCommunityPost";

function serverPost(id: string, title: string): Record<string, unknown> {
  return {
    postId: id,
    boardType: "FREE",
    title,
    content: `${title} 본문`,
    authorMasked: "익명 사용자",
    status: "VISIBLE",
    likeCount: 0,
    commentCount: 0,
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    financialRawDataExposed: false,
  };
}

function storedPost(id: string): CommunityPost {
  return {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "익명 사용자",
    boardType: "FREE",
    bookmarkCount: 0,
    bodyPreview: "절약 루틴 공유",
    commentCount: 0,
    createdAt: "2026-06-25T00:00:00.000Z",
    id,
    likeCount: 7,
    likedByMe: false,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: "삭제 실패 테스트",
    updatedAt: "2026-06-25T00:00:00.000Z",
  };
}

describe("community hooks", () => {
  it("loads and appends server feed pages through an isolated store", async () => {
    const listPosts = jest.fn(
      async (query): Promise<CommunityApiResponse> => ({
        data: {
          items: [
            serverPost(
              query?.page === 2 ? "post_2" : "post_1",
              query?.page === 2 ? "둘째 글" : "첫 글",
            ),
          ],
          page: query?.page ?? 1,
          pageSize: 1,
          total: 2,
        },
      }),
    );
    const service = { listPosts } as unknown as CommunityService;
    const store = createCommunityStore();
    const { result } = renderHook(() =>
      useCommunityFeed(
        service,
        { boardType: "FREE", sort: "LATEST", pageSize: 1 },
        store,
      ),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items.map((post) => post.id)).toEqual(["post_1"]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    expect(result.current.items.map((post) => post.id)).toEqual([
      "post_1",
      "post_2",
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("combines post detail and comments without exposing owner ids", async () => {
    const service = {
      getPost: jest.fn(
        async (): Promise<CommunityApiResponse> => ({
          data: {
            ...serverPost("post_1", "상세 글"),
            ownerUserId: "usr_private",
            tags: "루틴,예산",
          },
        }),
      ),
      listComments: jest.fn(
        async (): Promise<CommunityApiResponse> => ({
          data: {
            items: [
              {
                commentId: "comment_1",
                postId: "post_1",
                ownerUserId: "usr_private",
                authorMasked: "익명 사용자",
                content: "좋은 방법입니다.",
                status: "VISIBLE",
                createdAt: "2026-06-25T00:00:00.000Z",
                updatedAt: "2026-06-25T00:00:00.000Z",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      ),
    } as unknown as CommunityService;
    const store = createCommunityStore();
    const { result } = renderHook(() =>
      useCommunityPost(service, "post_1", store),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detail?.tags).toEqual(["루틴", "예산"]);
    expect(result.current.comments).toHaveLength(1);
    expect(JSON.stringify(result.current)).not.toContain("usr_private");
  });

  it("records privacy-safe report failures without leaking raw reasons", async () => {
    const rawReason = "Authorization bearer_12345678 test@example.com";
    const reportPost = jest.fn(async () => {
      throw new CommunityApiError(
        0,
        "COMMUNITY_REPORT_REASON_INVALID",
        rawReason,
      );
    });
    const track = jest.fn<
      ReturnType<CommunityAnalytics["track"]>,
      Parameters<CommunityAnalytics["track"]>
    >();
    const service = { reportPost } as unknown as CommunityService;
    const { result } = renderHook(() =>
      useCommunityActions(service, createCommunityStore(), { track }),
    );
    let thrown: unknown;

    await act(async () => {
      try {
        await result.current.reportPost(
          "post_1",
          "RAW_FINANCIAL_EXPORT",
          rawReason,
        );
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toMatchObject({ code: "COMMUNITY_REPORT_REASON_INVALID" });
    expect(track).toHaveBeenCalledWith("community_report_result", {
      action: "report",
      result: "failure",
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain(rawReason);
    expect(JSON.stringify(track.mock.calls)).not.toContain("test@example.com");
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).not.toContain("test@example.com");
    expect(result.current.pendingAction).toBeNull();
  });

  it("records privacy-safe publish and comment failures without raw drafts", async () => {
    const rawPostDraft: CommunityPostDraft = {
      anonymous: true,
      boardType: "FREE",
      content: "Authorization bearer_12345678 test@example.com",
      tags: [],
      title: "실패 테스트",
    };
    const rawCommentDraft: CommunityCommentDraft = {
      anonymous: true,
      content: "Authorization bearer_87654321 test@example.com",
    };
    const publishPost = jest.fn(async () => {
      throw new CommunityApiError(422, "COMMUNITY_CONTENT_BLOCKED", "blocked");
    });
    const previewPost = jest.fn(() => ({
      issues: [],
      moderationStatus: "BLOCKED" as const,
      valid: false,
    }));
    const createComment = jest.fn(async () => {
      throw new CommunityApiError(422, "COMMUNITY_CONTENT_BLOCKED", "blocked");
    });
    const track = jest.fn<
      ReturnType<CommunityAnalytics["track"]>,
      Parameters<CommunityAnalytics["track"]>
    >();
    const service = {
      createComment,
      previewPost,
      publishPost,
    } as unknown as CommunityService;
    const { result } = renderHook(() =>
      useCommunityActions(service, createCommunityStore(), { track }),
    );

    await act(async () => {
      await result.current.publishPost(rawPostDraft).catch(() => undefined);
      await result.current
        .createComment("post_1", rawCommentDraft)
        .catch(() => undefined);
    });

    expect(track).toHaveBeenCalledWith("community_post_publish_result", {
      boardType: "FREE",
      moderationStatus: "BLOCKED",
      result: "failure",
    });
    expect(track).toHaveBeenCalledWith("community_comment_publish_result", {
      result: "failure",
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain("test@example.com");
    expect(JSON.stringify(track.mock.calls)).not.toContain("bearer_");
    expect(result.current.pendingAction).toBeNull();
  });

  it("records privacy-safe reaction failures without mutating cached posts", async () => {
    const post = storedPost("post_1");
    const store = createCommunityStore();
    store.receiveFeed([post], { page: 1, pageSize: 20, total: 1 }, false);
    const setPostLiked = jest.fn(async () => {
      throw new CommunityApiError(409, "COMMUNITY_STATE_CHANGED", "stale");
    });
    const deletePost = jest.fn(async () => {
      throw new CommunityApiError(403, "COMMUNITY_DELETE_DENIED", "denied");
    });
    const track = jest.fn<
      ReturnType<CommunityAnalytics["track"]>,
      Parameters<CommunityAnalytics["track"]>
    >();
    const service = {
      deletePost,
      setPostLiked,
    } as unknown as CommunityService;
    const { result } = renderHook(() =>
      useCommunityActions(service, store, { track }),
    );

    await act(async () => {
      await result.current.setPostLiked("post_1", true).catch(() => undefined);
      await result.current.deletePost("post_1").catch(() => undefined);
    });

    expect(track).toHaveBeenCalledWith("community_post_reaction", {
      action: "like",
      result: "failure",
    });
    expect(track).toHaveBeenCalledWith("community_post_reaction", {
      action: "delete",
      result: "failure",
    });
    expect(store.getState().feed.items).toHaveLength(1);
    expect(store.getState().feed.items[0]?.id).toBe("post_1");
    expect(store.getState().feed.items[0]?.likeCount).toBe(7);
    expect(result.current.pendingAction).toBeNull();
  });
});
