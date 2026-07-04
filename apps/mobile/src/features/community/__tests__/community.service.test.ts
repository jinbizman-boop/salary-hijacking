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
});
