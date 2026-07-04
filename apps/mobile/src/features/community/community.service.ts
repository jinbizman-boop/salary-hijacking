import { CommunityApiError } from "./api";
import { COMMUNITY_API_PREFIX } from "./community.constants";
import { redactCommunityText } from "./community.redaction";
import type {
  CommunityApiResponse,
  CommunityApiTransport,
  CommunityCommentDraft,
  CommunityFeedQuery,
  CommunityPostDraft,
  CommunityService,
} from "./community.types";
import {
  validateCommentInput,
  validatePostDraft,
} from "./community.validators";

function requireSafePost(draft: CommunityPostDraft): void {
  const result = validatePostDraft(draft);
  if (!result.valid || result.moderationStatus === "BLOCKED") {
    throw new CommunityApiError(
      422,
      "COMMUNITY_CONTENT_BLOCKED",
      result.issues[0]?.message ??
        "커뮤니티 정책에 맞지 않는 내용이 포함되어 있습니다.",
    );
  }
}

function requireSafeComment(draft: CommunityCommentDraft): void {
  const result = validateCommentInput(draft);
  if (!result.valid || result.moderationStatus === "BLOCKED") {
    throw new CommunityApiError(
      422,
      "COMMUNITY_CONTENT_BLOCKED",
      result.issues[0]?.message ??
        "커뮤니티 정책에 맞지 않는 내용이 포함되어 있습니다.",
    );
  }
}

function requireId(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9_-]+$/u.test(normalized)) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_INVALID_ID",
      `${name} 식별자가 올바르지 않습니다.`,
    );
  }
  return encodeURIComponent(normalized);
}

function normalizePage(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) return fallback;
  return Math.min(value, maximum);
}

function listQuery(input: CommunityFeedQuery = {}): string {
  const params = new URLSearchParams();
  if (input.boardType) params.set("boardType", input.boardType);
  if (input.sort) params.set("sort", input.sort);
  params.set("page", String(normalizePage(input.page, 1, 10_000)));
  params.set("pageSize", String(normalizePage(input.pageSize, 20, 100)));
  const query = input.query?.trim();
  if (query) params.set("q", query.slice(0, 120));
  return params.toString();
}

function pageQuery(
  page: number | undefined,
  pageSize: number | undefined,
): string {
  return new URLSearchParams({
    page: String(normalizePage(page, 1, 10_000)),
    pageSize: String(normalizePage(pageSize, 20, 100)),
  }).toString();
}

function idempotencyKey(scope: string, id: string): string {
  return `mobile-${scope}-${id}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function reportBody(
  reasonType: string,
  reason: string,
): Readonly<{
  reasonType: string;
  reason: string;
}> {
  const normalizedType = reasonType.trim().toUpperCase();
  const safeReason = reason.trim().slice(0, 500);
  if (!/^[A-Z][A-Z0-9_]{1,39}$/u.test(normalizedType) || !safeReason) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_REPORT_REASON_REQUIRED",
      "신고 사유를 확인해 주세요.",
    );
  }
  return {
    reasonType: normalizedType,
    reason: redactCommunityText(safeReason),
  };
}

export function createCommunityService(
  transport: CommunityApiTransport,
): CommunityService {
  return {
    async listBoards(): Promise<CommunityApiResponse> {
      return transport.request(`${COMMUNITY_API_PREFIX}/boards`);
    },

    async listPosts(query): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts?${listQuery(query)}`,
      );
    },

    async getPost(postId): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}`,
      );
    },

    previewPost(draft) {
      return validatePostDraft(draft);
    },

    async publishPost(draft): Promise<CommunityApiResponse> {
      requireSafePost(draft);
      return transport.request(`${COMMUNITY_API_PREFIX}/posts`, {
        method: "POST",
        body: draft,
      });
    },

    async updatePost(postId, draft): Promise<CommunityApiResponse> {
      requireSafePost(draft);
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}`,
        {
          method: "PATCH",
          body: draft,
        },
      );
    },

    async deletePost(postId): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}`,
        { method: "DELETE" },
      );
    },

    async setPostLiked(postId, liked): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}/like`,
        { method: liked ? "POST" : "DELETE" },
      );
    },

    async setPostBookmarked(postId, bookmarked): Promise<CommunityApiResponse> {
      const safePostId = requireId(postId, "게시글");
      return transport.request(`${COMMUNITY_API_PREFIX}/bookmarks`, {
        method: "POST",
        body: {
          enabled: bookmarked,
          idempotencyKey: idempotencyKey("bookmark", safePostId),
          postId: safePostId,
        },
      });
    },

    async recordPostShare(postId, channel): Promise<CommunityApiResponse> {
      const safePostId = requireId(postId, "게시글");
      return transport.request(`${COMMUNITY_API_PREFIX}/shares`, {
        method: "POST",
        body: {
          channel,
          idempotencyKey: idempotencyKey("share", safePostId),
          postId: safePostId,
        },
      });
    },

    async listComments(postId, page, pageSize): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}/comments?${pageQuery(page, pageSize)}`,
      );
    },

    async createComment(postId, draft): Promise<CommunityApiResponse> {
      requireSafeComment(draft);
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}/comments`,
        {
          method: "POST",
          body: draft,
        },
      );
    },

    async updateComment(commentId, draft): Promise<CommunityApiResponse> {
      requireSafeComment(draft);
      return transport.request(
        `${COMMUNITY_API_PREFIX}/comments/${requireId(commentId, "댓글")}`,
        {
          method: "PATCH",
          body: draft,
        },
      );
    },

    async deleteComment(commentId): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/comments/${requireId(commentId, "댓글")}`,
        { method: "DELETE" },
      );
    },

    async reportPost(
      postId,
      reasonType,
      reason,
    ): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}/report`,
        {
          method: "POST",
          body: reportBody(reasonType, reason),
        },
      );
    },

    async reportComment(
      commentId,
      reasonType,
      reason,
    ): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/comments/${requireId(commentId, "댓글")}/report`,
        {
          method: "POST",
          body: reportBody(reasonType, reason),
        },
      );
    },

    async listMyPosts(page, pageSize): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/me/posts?${pageQuery(page, pageSize)}`,
      );
    },

    async listMyComments(page, pageSize): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/me/comments?${pageQuery(page, pageSize)}`,
      );
    },
  };
}
