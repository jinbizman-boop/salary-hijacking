import { describe, expect, it } from "vitest";

import {
  COMMUNITY_API_PATHS,
  CommunityEndpointContract,
  LikeCommunityCommentRequestSchema,
  UnlikeCommunityCommentRequestSchema,
} from "./community.schema";

const commentId = "33333333-3333-4333-8333-333333333333";

describe("community API contract", () => {
  it("exposes dedicated mobile comment like and unlike endpoints", () => {
    expect(COMMUNITY_API_PATHS.likeComment).toBe(
      "/community/comments/:commentId/like",
    );
    expect(COMMUNITY_API_PATHS.unlikeComment).toBe(
      "/community/comments/:commentId/like",
    );
    expect(CommunityEndpointContract.likeComment).toMatchObject({
      method: "POST",
      path: "/community/comments/:commentId/like",
    });
    expect(CommunityEndpointContract.unlikeComment).toMatchObject({
      method: "DELETE",
      path: "/community/comments/:commentId/like",
    });
  });

  it("validates privacy-safe comment like request payloads", () => {
    expect(
      LikeCommunityCommentRequestSchema.parse({
        commentId,
        context: { requestId: "req_comment_like" },
      }),
    ).toMatchObject({ commentId });
    expect(
      UnlikeCommunityCommentRequestSchema.parse({
        commentId,
        context: { requestId: "req_comment_unlike" },
      }),
    ).toMatchObject({ commentId });
  });
});
