import { CommunityApiError } from "./api";
import {
  COMMUNITY_API_PREFIX,
  COMMUNITY_BOARD_TYPES,
  COMMUNITY_REPORT_REASONS,
  COMMUNITY_SHARE_CHANNELS,
  COMMUNITY_SORTS,
} from "./community.constants";
import {
  containsSensitiveCommunityContent,
  redactCommunityText,
} from "./community.redaction";
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

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function requireExpectedDraftKeys(
  draft: Record<string, unknown>,
  allowedKeys: readonly string[],
): void {
  if (!hasOnlyKeys(draft, allowedKeys)) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_PAYLOAD_INVALID",
      "커뮤니티 요청 형식을 확인해 주세요.",
    );
  }
}

function postBody(draft: CommunityPostDraft): CommunityPostDraft {
  requireExpectedDraftKeys(draft as Record<string, unknown>, [
    "anonymous",
    "boardType",
    "content",
    "tags",
    "title",
  ]);
  return {
    anonymous: draft.anonymous,
    boardType: draft.boardType,
    content: draft.content,
    tags: draft.tags,
    title: draft.title,
  };
}

function commentBody(draft: CommunityCommentDraft): CommunityCommentDraft {
  requireExpectedDraftKeys(draft as Record<string, unknown>, [
    "anonymous",
    "content",
  ]);
  return {
    anonymous: draft.anonymous,
    content: draft.content,
  };
}

function requireSafePost(draft: CommunityPostDraft): void {
  postBody(draft);
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
  commentBody(draft);
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

function containsSensitiveRouteIdSegment(value: string): boolean {
  return /(?:^|[_-])(?:authorization|bearer|fcm|push|refresh|session|token)(?:[_-]|$)/iu.test(
    value,
  );
}

function requireId(value: string, name: string): string {
  const normalized = value.trim();
  if (
    normalized.length < 3 ||
    normalized.length > 160 ||
    !/^[A-Za-z0-9_-]+$/u.test(normalized) ||
    containsSensitiveCommunityContent(normalized) ||
    containsSensitiveRouteIdSegment(normalized)
  ) {
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
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_FEED_QUERY_INVALID",
      "Invalid community paging options.",
    );
  }
  return value;
}

function listQuery(input: CommunityFeedQuery = {}): string {
  if (
    !input ||
    !hasOnlyKeys(input as Record<string, unknown>, [
      "boardType",
      "page",
      "pageSize",
      "query",
      "sort",
    ])
  ) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_FEED_QUERY_INVALID",
      "Invalid community feed query.",
    );
  }
  const params = new URLSearchParams();
  if (input.boardType) {
    if (!COMMUNITY_BOARD_TYPES.includes(input.boardType)) {
      throw new CommunityApiError(
        0,
        "COMMUNITY_FEED_QUERY_INVALID",
        "커뮤니티 필터를 확인해 주세요.",
      );
    }
    params.set("boardType", input.boardType);
  }
  if (input.sort) {
    if (!COMMUNITY_SORTS.includes(input.sort)) {
      throw new CommunityApiError(
        0,
        "COMMUNITY_FEED_QUERY_INVALID",
        "커뮤니티 정렬을 확인해 주세요.",
      );
    }
    params.set("sort", input.sort);
  }
  params.set("page", String(normalizePage(input.page, 1, 10_000)));
  params.set("pageSize", String(normalizePage(input.pageSize, 20, 100)));
  const query = input.query?.trim();
  if (query) {
    if (containsSensitiveCommunityContent(query)) {
      throw new CommunityApiError(
        422,
        "COMMUNITY_QUERY_BLOCKED",
        "커뮤니티 검색어에서 민감 정보를 제외해 주세요.",
      );
    }
    params.set("q", query.slice(0, 120));
  }
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

function isCommunityReportReason(
  value: string,
): value is (typeof COMMUNITY_REPORT_REASONS)[number] {
  return COMMUNITY_REPORT_REASONS.includes(
    value as (typeof COMMUNITY_REPORT_REASONS)[number],
  );
}

function serverReportReason(
  value: (typeof COMMUNITY_REPORT_REASONS)[number],
): string {
  if (
    value === "PERSONAL_INFORMATION" ||
    value === "PRIVACY_LEAK" ||
    value === "RAW_FINANCIAL_DATA_EXPOSURE" ||
    value === "TOKEN_OR_SECRET_LEAK"
  ) {
    return "PRIVACY";
  }
  if (
    value === "FINANCIAL_RISK" ||
    value === "ILLEGAL_FINANCE" ||
    value === "GAMBLING_OR_SPECULATION" ||
    value === "SCAM_OR_PHISHING"
  ) {
    return "FINANCIAL_ADVICE_RISK";
  }
  if (
    value === "HARASSMENT" ||
    value === "HATE_OR_DISCRIMINATION" ||
    value === "SEXUAL_CONTENT"
  ) {
    return "ABUSE";
  }
  if (value === "AD_OR_PARTNER_POLICY_VIOLATION" || value === "COPYRIGHT") {
    return "OTHER";
  }
  return value;
}

function reportBody(
  reasonType: string,
  reason: string,
): Readonly<{
  reasonType: string;
  reason: string;
}> {
  const normalizedType = reasonType.trim().toUpperCase();
  const trimmedReason = reason.trim().slice(0, 500);
  if (!trimmedReason) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_REPORT_REASON_REQUIRED",
      "신고 사유를 확인해 주세요.",
    );
  }
  if (!isCommunityReportReason(normalizedType)) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_REPORT_REASON_INVALID",
      "커뮤니티 신고 사유를 확인해 주세요.",
    );
  }
  const safeReason = redactCommunityText(trimmedReason);
  if (
    !hasMeaningfulReportText(safeReason) ||
    containsSensitiveCommunityContent(safeReason)
  ) {
    throw new CommunityApiError(
      422,
      "COMMUNITY_REPORT_REASON_UNSAFE",
      "신고 사유에서 민감 정보를 제외해 주세요.",
    );
  }
  return {
    reasonType: serverReportReason(normalizedType),
    reason: safeReason,
  };
}

function hasMeaningfulReportText(value: string): boolean {
  const redactionRemoved = value.replace(/\[[^\]]+\]/gu, " ");
  const lettersOnly = redactionRemoved.replace(/[^\p{L}]+/gu, "");
  return lettersOnly.length >= 4;
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
        body: postBody(draft),
      });
    },

    async updatePost(postId, draft): Promise<CommunityApiResponse> {
      requireSafePost(draft);
      return transport.request(
        `${COMMUNITY_API_PREFIX}/posts/${requireId(postId, "게시글")}`,
        {
          method: "PATCH",
          body: postBody(draft),
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

    async setCommentLiked(commentId, liked): Promise<CommunityApiResponse> {
      return transport.request(
        `${COMMUNITY_API_PREFIX}/comments/${requireId(commentId, "댓글")}/like`,
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
      if (!COMMUNITY_SHARE_CHANNELS.includes(channel)) {
        throw new CommunityApiError(
          0,
          "COMMUNITY_SHARE_CHANNEL_INVALID",
          "커뮤니티 공유 채널을 확인해 주세요.",
        );
      }
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
          body: commentBody(draft),
        },
      );
    },

    async updateComment(commentId, draft): Promise<CommunityApiResponse> {
      requireSafeComment(draft);
      return transport.request(
        `${COMMUNITY_API_PREFIX}/comments/${requireId(commentId, "댓글")}`,
        {
          method: "PATCH",
          body: commentBody(draft),
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
