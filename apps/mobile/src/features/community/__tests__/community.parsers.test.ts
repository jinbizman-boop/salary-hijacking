import {
  parseCommunityComment,
  parseCommunityFeedPage,
  parseCommunityPostDetail,
} from "../community.parsers";

describe("community parsers", () => {
  it("maps server posts into privacy-safe mobile feed models", () => {
    const page = parseCommunityFeedPage({
      items: [
        {
          postId: "post_1",
          boardType: "FREE",
          title: "생활 루틴",
          content: "주간 단위로 계획을 점검한 경험을 공유합니다.",
          authorMasked: "usr***",
          status: "VISIBLE",
          likeCount: 3,
          commentCount: 1,
          createdAt: "2026-06-25T00:00:00.000Z",
          updatedAt: "2026-06-25T01:00:00.000Z",
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    expect(page).toEqual({
      items: [
        expect.objectContaining({
          id: "post_1",
          title: "생활 루틴",
          moderationStatus: "SAFE",
          bookmarkCount: 0,
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      ],
      meta: { page: 1, pageSize: 20, total: 1 },
    });
  });

  it("parses post detail tags and comments without leaking owner identifiers", () => {
    const detail = parseCommunityPostDetail({
      postId: "post_1",
      boardType: "BUDGET_TIP",
      title: "예산 루틴",
      content: "월간 계획을 주간 단위로 나누었습니다.",
      tags: "예산,루틴",
      ownerUserId: "usr_private",
      authorMasked: "익명 사용자",
      status: "VISIBLE",
      likeCount: 0,
      commentCount: 0,
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      financialRawDataExposed: false,
    });
    const comment = parseCommunityComment({
      commentId: "comment_1",
      postId: "post_1",
      ownerUserId: "usr_private",
      authorMasked: "익명 사용자",
      content: "좋은 방법입니다.",
      likeCount: 3,
      likedByMe: true,
      status: "VISIBLE",
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
    });

    expect(detail.tags).toEqual(["예산", "루틴"]);
    expect(detail.post).not.toHaveProperty("ownerUserId");
    expect(comment).not.toHaveProperty("ownerUserId");
    expect(comment.likeCount).toBe(3);
    expect(comment.likedByMe).toBe(true);
  });

  it("preserves server viewer like state without exposing viewer identifiers", () => {
    const detail = parseCommunityPostDetail({
      postId: "post_1",
      boardType: "FREE",
      title: "liked post",
      content: "liked content",
      likedByMe: true,
      bookmarkedByMe: true,
      viewerUserId: "usr_private",
      authorMasked: "usr***",
      status: "VISIBLE",
      likeCount: 1,
      commentCount: 0,
      shareCount: 2,
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      financialRawDataExposed: false,
    });

    expect(detail.post.likedByMe).toBe(true);
    expect(detail.post.bookmarkedByMe).toBe(true);
    expect(detail.post.shareCount).toBe(2);
    expect(detail.post).not.toHaveProperty("viewerUserId");
  });

  it("preserves server anonymity state for post and comment edits", () => {
    const detail = parseCommunityPostDetail({
      postId: "post_1",
      boardType: "FREE",
      title: "named post",
      content: "named content",
      anonymous: false,
      authorMasked: "usr***",
      status: "VISIBLE",
      likeCount: 1,
      commentCount: 0,
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      financialRawDataExposed: false,
    });
    const comment = parseCommunityComment({
      commentId: "comment_1",
      postId: "post_1",
      content: "named comment",
      anonymous: false,
      authorMasked: "usr***",
      status: "VISIBLE",
      likeCount: 0,
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
    });

    expect(detail.post.anonymous).toBe(false);
    expect(comment.anonymous).toBe(false);
  });

  it("rejects records explicitly marked as exposing raw financial data", () => {
    expect(() =>
      parseCommunityFeedPage({
        items: [
          {
            postId: "post_1",
            boardType: "FREE",
            title: "노출 위험",
            content: "본문",
            authorMasked: "익명",
            status: "VISIBLE",
            likeCount: 0,
            commentCount: 0,
            createdAt: "2026-06-25T00:00:00.000Z",
            updatedAt: "2026-06-25T00:00:00.000Z",
            financialRawDataExposed: true,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
    ).toThrow("안전하지 않은 커뮤니티 응답");
  });
});
