import { describe, expect, it } from "vitest";

import { COMMUNITY_API_PATHS } from "./community.types";
import type {
  CommunityEndpointTypes,
  LikeCommunityCommentRequest,
  UnlikeCommunityCommentRequest,
} from "./community.types";

const commentId = "33333333-3333-4333-8333-333333333333";

describe("community domain endpoint types", () => {
  it("names dedicated mobile comment like and unlike endpoints", () => {
    expect(COMMUNITY_API_PATHS.likeComment).toBe(
      "/community/comments/:commentId/like",
    );
    expect(COMMUNITY_API_PATHS.unlikeComment).toBe(
      "/community/comments/:commentId/like",
    );
  });

  it("keeps comment like endpoint request and response types addressable", () => {
    const likeRequest: LikeCommunityCommentRequest = {
      commentId,
      context: { requestId: "req_comment_like" },
    };
    const unlikeRequest: UnlikeCommunityCommentRequest = {
      commentId,
      context: { requestId: "req_comment_unlike" },
    };
    const endpointKeys = [
      "likeComment",
      "unlikeComment",
    ] satisfies readonly (keyof CommunityEndpointTypes)[];

    expect(likeRequest.commentId).toBe(commentId);
    expect(unlikeRequest.commentId).toBe(commentId);
    expect(endpointKeys).toEqual(["likeComment", "unlikeComment"]);
  });
});
