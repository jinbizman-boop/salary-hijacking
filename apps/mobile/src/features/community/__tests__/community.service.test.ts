import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createCommunityService } from "../community.service";
import type { CommunityApiTransport } from "../community.types";

describe("community service", () => {
  it("keeps service validation errors and route id labels readable", () => {
    const source = readFileSync(
      join(__dirname, "..", "community.service.ts"),
      "utf8",
    );

    expect(source).toContain(
      "커뮤니티 정책에 맞지 않는 내용이 포함되어 있습니다.",
    );
    expect(source).toContain("게시글");
    expect(source).toContain("댓글");
    expect(source).toContain("신고 사유를 확인해 주세요.");
    for (const marker of ["占?", "�", "寃", "而", "?좉", "?볤"]) {
      expect(source).not.toContain(marker);
    }
  });

  it("blocks unsafe content before it reaches the API", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.publishPost({
        boardType: "FREE",
        title: "연락 주세요",
        content: "010-1234-5678로 연락 주세요",
        tags: [],
        anonymous: true,
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_CONTENT_BLOCKED" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks sensitive community search queries before they reach URL logs", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.listPosts({
        query:
          "find user@example.com 010-1234-5678 account 123-456-789012 token abcdefghijklmnop",
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_QUERY_BLOCKED" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks sensitive community tags before they reach API payloads", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.publishPost({
        boardType: "FREE",
        title: "safe title",
        content: "safe community routine note",
        tags: ["routine", "010-1234-5678", "token=abcdefghijklmnop"],
        anonymous: true,
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_CONTENT_BLOCKED" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks unknown post and comment draft fields before they reach API payloads", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.publishPost({
        anonymous: true,
        boardType: "FREE",
        content: "safe community routine note",
        rawSalaryMemo: "salary 2,700,000",
        tags: ["routine"],
        title: "safe title",
      } as never),
    ).rejects.toMatchObject({ code: "COMMUNITY_PAYLOAD_INVALID" });
    await expect(
      service.createComment("post_1", {
        accountNumber: "123-456-789012",
        anonymous: true,
        content: "safe comment",
      } as never),
    ).rejects.toMatchObject({ code: "COMMUNITY_PAYLOAD_INVALID" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks invalid community feed filters before they reach URL logs", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.listPosts({
        boardType: "FREE&token=raw-secret" as never,
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_FEED_QUERY_INVALID" });
    await expect(
      service.listPosts({
        sort: "LATEST\nAuthorization" as never,
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_FEED_QUERY_INVALID" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks unsafe community feed paging and unknown query fields before URL construction", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.listPosts({
        page: 0,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_FEED_QUERY_INVALID" });
    await expect(
      service.listPosts({
        page: 1,
        pageSize: 101,
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_FEED_QUERY_INVALID" });
    await expect(
      service.listPosts({
        page: 1,
        pageSize: 20,
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({ code: "COMMUNITY_FEED_QUERY_INVALID" });

    expect(request).not.toHaveBeenCalled();
  });

  it("uses the API v1 community boundary and privacy-safe payloads", async () => {
    const request = jest
      .fn<
        ReturnType<CommunityApiTransport["request"]>,
        Parameters<CommunityApiTransport["request"]>
      >()
      .mockResolvedValue({
        data: { postId: "post_1", status: "VISIBLE" },
        meta: { requestId: "req_1" },
      });
    const service = createCommunityService({ request });

    await service.publishPost({
      boardType: "FREE",
      title: "생활비 루틴",
      content: "주간 단위로 나누는 계획을 지키기 쉬웠어요.",
      tags: ["생활비"],
      anonymous: true,
    });

    expect(request).toHaveBeenCalledWith("/api/v1/community/posts", {
      method: "POST",
      body: {
        boardType: "FREE",
        title: "생활비 루틴",
        content: "주간 단위로 나누는 계획을 지키기 쉬웠어요.",
        tags: ["생활비"],
        anonymous: true,
      },
    });
    expect(JSON.stringify(request.mock.calls[0])).not.toMatch(
      /salaryAmount|accountNumber|token/i,
    );
  });

  it("matches the implemented server routes for feed, reactions, comments, and reports", async () => {
    const request = jest
      .fn<
        ReturnType<CommunityApiTransport["request"]>,
        Parameters<CommunityApiTransport["request"]>
      >()
      .mockResolvedValue({ data: {} });
    const service = createCommunityService({ request });

    await service.listPosts({
      boardType: "FREE",
      sort: "LATEST",
      page: 2,
      pageSize: 20,
      query: "루틴",
    });
    await service.setPostLiked("post_1", true);
    await service.setPostLiked("post_1", false);
    await service.setCommentLiked("comment_1", true);
    await service.setCommentLiked("comment_1", false);
    await service.listComments("post_1", 1, 20);
    await service.updateComment("comment_1", {
      content: "수정한 댓글",
      anonymous: true,
    });
    await service.deleteComment("comment_1");
    await service.reportComment("comment_1", "SPAM", "반복 홍보");

    expect(request.mock.calls).toEqual([
      [
        "/api/v1/community/posts?boardType=FREE&sort=LATEST&page=2&pageSize=20&q=%EB%A3%A8%ED%8B%B4",
      ],
      ["/api/v1/community/posts/post_1/like", { method: "POST" }],
      ["/api/v1/community/posts/post_1/like", { method: "DELETE" }],
      ["/api/v1/community/comments/comment_1/like", { method: "POST" }],
      ["/api/v1/community/comments/comment_1/like", { method: "DELETE" }],
      ["/api/v1/community/posts/post_1/comments?page=1&pageSize=20"],
      [
        "/api/v1/community/comments/comment_1",
        {
          method: "PATCH",
          body: { content: "수정한 댓글", anonymous: true },
        },
      ],
      ["/api/v1/community/comments/comment_1", { method: "DELETE" }],
      [
        "/api/v1/community/comments/comment_1/report",
        {
          method: "POST",
          body: { reasonType: "SPAM", reason: "반복 홍보" },
        },
      ],
    ]);
  });

  it("uses implemented bookmark and share API routes", async () => {
    const request = jest
      .fn<
        ReturnType<CommunityApiTransport["request"]>,
        Parameters<CommunityApiTransport["request"]>
      >()
      .mockResolvedValue({ data: {} });
    const service = createCommunityService({ request });

    await service.setPostBookmarked("post_1", true);
    await service.recordPostShare("post_1", "SYSTEM_SHARE");

    expect(request.mock.calls).toEqual([
      [
        "/api/v1/community/bookmarks",
        {
          method: "POST",
          body: expect.objectContaining({
            enabled: true,
            postId: "post_1",
          }),
        },
      ],
      [
        "/api/v1/community/shares",
        {
          method: "POST",
          body: expect.objectContaining({
            channel: "SYSTEM_SHARE",
            postId: "post_1",
          }),
        },
      ],
    ]);
  });

  it("blocks invalid community share channels before they reach event payloads", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.recordPostShare("post_1", "SYSTEM_SHARE\nAuthorization" as never),
    ).rejects.toMatchObject({ code: "COMMUNITY_SHARE_CHANNEL_INVALID" });
    await expect(
      service.recordPostShare("post_1", "RAW_FINANCIAL_EXPORT" as never),
    ).rejects.toMatchObject({ code: "COMMUNITY_SHARE_CHANNEL_INVALID" });

    expect(request).not.toHaveBeenCalled();
  });

  it("redacts sensitive report reason text before sending moderation payloads", async () => {
    const request = jest
      .fn<
        ReturnType<CommunityApiTransport["request"]>,
        Parameters<CommunityApiTransport["request"]>
      >()
      .mockResolvedValue({ data: {} });
    const service = createCommunityService({ request });
    const rawJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signatureABC";

    await service.reportPost(
      "post_1",
      "abuse",
      `leaked phone 010-1234-5678 and token ${rawJwt}`,
    );
    await service.reportComment(
      "comment_1",
      "spam",
      "shared account 123-456-789012",
    );

    const payload = JSON.stringify(request.mock.calls);
    expect(payload).not.toContain("010-1234-5678");
    expect(payload).not.toContain(rawJwt);
    expect(payload).not.toContain("123-456-789012");
    expect(payload).toContain("[auth-redacted]");
  });

  it("maps mobile-only report reasons to the server community report contract", async () => {
    const request = jest
      .fn<
        ReturnType<CommunityApiTransport["request"]>,
        Parameters<CommunityApiTransport["request"]>
      >()
      .mockResolvedValue({ data: {} });
    const service = createCommunityService({ request });

    await service.reportPost(
      "post_1",
      "RAW_FINANCIAL_DATA_EXPOSURE",
      "민감 정보가 포함된 게시글입니다",
    );
    await service.reportComment(
      "comment_1",
      "SCAM_OR_PHISHING",
      "사기성 홍보로 보입니다",
    );
    await service.reportPost(
      "post_2",
      "HATE_OR_DISCRIMINATION",
      "차별적 표현이 포함되어 있습니다",
    );

    expect(request.mock.calls).toEqual([
      [
        "/api/v1/community/posts/post_1/report",
        {
          method: "POST",
          body: {
            reasonType: "PRIVACY",
            reason: "민감 정보가 포함된 게시글입니다",
          },
        },
      ],
      [
        "/api/v1/community/comments/comment_1/report",
        {
          method: "POST",
          body: {
            reasonType: "FINANCIAL_ADVICE_RISK",
            reason: "사기성 홍보로 보입니다",
          },
        },
      ],
      [
        "/api/v1/community/posts/post_2/report",
        {
          method: "POST",
          body: {
            reasonType: "ABUSE",
            reason: "차별적 표현이 포함되어 있습니다",
          },
        },
      ],
    ]);
  });

  it("blocks report reasons that are only sensitive raw data before moderation payloads", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });
    const rawJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signatureABC";

    await expect(
      service.reportPost(
        "post_1",
        "ABUSE",
        `010-1234-5678 ${rawJwt} 123-456-789012`,
      ),
    ).rejects.toMatchObject({ code: "COMMUNITY_REPORT_REASON_UNSAFE" });
    await expect(
      service.reportComment("comment_1", "SPAM", "user@example.com"),
    ).rejects.toMatchObject({ code: "COMMUNITY_REPORT_REASON_UNSAFE" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks invalid community report reasons before moderation payloads", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.reportPost("post_1", "RAW_FINANCIAL_EXPORT", "invalid reason"),
    ).rejects.toMatchObject({ code: "COMMUNITY_REPORT_REASON_INVALID" });
    await expect(
      service.reportComment(
        "comment_1",
        "SPAM\nAuthorization",
        "invalid reason",
      ),
    ).rejects.toMatchObject({ code: "COMMUNITY_REPORT_REASON_INVALID" });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks overlong community route ids before they reach URL logs", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });
    const overlongPostId = `post_${"a".repeat(300)}`;
    const overlongCommentId = `comment_${"b".repeat(300)}`;

    await expect(service.getPost(overlongPostId)).rejects.toMatchObject({
      code: "COMMUNITY_INVALID_ID",
    });
    await expect(
      service.setCommentLiked(overlongCommentId, true),
    ).rejects.toMatchObject({
      code: "COMMUNITY_INVALID_ID",
    });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks sensitive-looking community route ids before they reach URL logs", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(
      service.getPost("token_abcdefghijklmnop"),
    ).rejects.toMatchObject({
      code: "COMMUNITY_INVALID_ID",
    });
    await expect(
      service.reportComment(
        "session_abcdefghijklmnop",
        "SPAM",
        "반복 홍보입니다",
      ),
    ).rejects.toMatchObject({
      code: "COMMUNITY_INVALID_ID",
    });

    expect(request).not.toHaveBeenCalled();
  });

  it("blocks too-short community route ids before they reach URL logs", async () => {
    const request = jest.fn<
      ReturnType<CommunityApiTransport["request"]>,
      Parameters<CommunityApiTransport["request"]>
    >();
    const service = createCommunityService({ request });

    await expect(service.getPost("p")).rejects.toMatchObject({
      code: "COMMUNITY_INVALID_ID",
    });
    await expect(service.setCommentLiked("c", true)).rejects.toMatchObject({
      code: "COMMUNITY_INVALID_ID",
    });

    expect(request).not.toHaveBeenCalled();
  });
});
