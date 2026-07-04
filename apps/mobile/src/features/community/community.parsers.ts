import type {
  AttachmentScanStatus,
  CommunityAttachment,
  CommunityBoardType,
  CommunityComment,
  CommunityFeedPage,
  CommunityPost,
  CommunityPostDetail,
  ModerationStatus,
} from "./community.types";

const BOARD_TYPES = new Set<CommunityBoardType>([
  "SALARY_TALK",
  "BUDGET_TIP",
  "EXPENSE_CUT",
  "SAVINGS_GOAL",
  "LEVEL_CERTIFICATION",
  "SIDE_HUSTLE",
  "HEALTH_ROUTINE",
  "FREE",
]);

const SCAN_STATUSES = new Set<AttachmentScanStatus>([
  "PENDING",
  "CLEAN",
  "REJECTED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function optionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`안전하지 않은 커뮤니티 응답: ${field}`);
  }
  return value.trim();
}

function timestamp(value: unknown): string {
  const text = requiredText(value, "timestamp");
  if (Number.isNaN(Date.parse(text))) {
    throw new TypeError("안전하지 않은 커뮤니티 응답: timestamp");
  }
  return text;
}

function moderationStatus(value: unknown): ModerationStatus {
  switch (value) {
    case "VISIBLE":
    case "PUBLISHED":
    case "ACTIVE":
    case "SAFE":
      return "SAFE";
    case "PENDING":
    case "UNDER_REVIEW":
    case "REVIEW":
      return "REVIEW";
    case "BLOCKED":
    case "REJECTED":
      return "BLOCKED";
    case "HIDDEN":
      return "HIDDEN";
    case "DELETED":
      return "DELETED";
    default:
      throw new TypeError("안전하지 않은 커뮤니티 응답: moderation status");
  }
}

function boardType(value: unknown): CommunityBoardType {
  if (BOARD_TYPES.has(value as CommunityBoardType)) {
    return value as CommunityBoardType;
  }
  throw new TypeError("안전하지 않은 커뮤니티 응답: board type");
}

function ensurePrivacy(value: Record<string, unknown>): void {
  if (
    value.financialRawDataExposed === true ||
    value.rawFinancialDataExposed === true ||
    value.rawPersonalDataExposed === true ||
    value.adsFinancialTargetingUsed === true
  ) {
    throw new TypeError("안전하지 않은 커뮤니티 응답");
  }
}

function tags(value: unknown): readonly string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return source
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function attachments(value: unknown): readonly CommunityAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): readonly CommunityAttachment[] => {
    if (!isRecord(item)) return [];
    const status = item.scanStatus;
    if (!SCAN_STATUSES.has(status as AttachmentScanStatus)) return [];
    const id =
      typeof item.attachmentId === "string"
        ? item.attachmentId
        : typeof item.id === "string"
          ? item.id
          : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!id || !name) return [];
    const mediaType = item.mediaType === "image" ? "image" : "file";
    return [
      {
        id,
        name,
        mediaType,
        uri:
          status === "CLEAN" &&
          typeof item.uri === "string" &&
          item.uri.startsWith("https://")
            ? item.uri
            : null,
        scanStatus: status as AttachmentScanStatus,
      },
    ];
  });
}

export function parseCommunityPost(value: unknown): CommunityPost {
  if (!isRecord(value)) throw new TypeError("안전하지 않은 커뮤니티 응답");
  ensurePrivacy(value);
  const id = requiredText(value.postId ?? value.id, "post id");
  const title = requiredText(value.title, "title");
  const content =
    typeof value.content === "string"
      ? value.content.trim()
      : typeof value.bodyPreview === "string"
        ? value.bodyPreview.trim()
        : "";
  const anonymousDisplayName =
    typeof value.authorMasked === "string" && value.authorMasked.trim()
      ? value.authorMasked.trim()
      : typeof value.anonymousDisplayName === "string" &&
          value.anonymousDisplayName.trim()
        ? value.anonymousDisplayName.trim()
        : "익명 사용자";

  const anonymous = optionalBoolean(value.anonymous ?? value.isAnonymous);

  return {
    id,
    boardType: boardType(value.boardType),
    title,
    bodyPreview: content.slice(0, 180),
    ...(anonymous !== null ? { anonymous } : {}),
    anonymousDisplayName,
    moderationStatus: moderationStatus(value.status ?? value.moderationStatus),
    likeCount: safeInteger(value.likeCount),
    likedByMe:
      value.likedByMe === true ||
      value.viewerLiked === true ||
      value.liked === true,
    commentCount: safeInteger(value.commentCount),
    bookmarkCount: safeInteger(value.bookmarkCount),
    bookmarkedByMe:
      value.bookmarkedByMe === true ||
      value.viewerBookmarked === true ||
      value.bookmarked === true,
    shareCount: safeInteger(value.shareCount),
    createdAt: timestamp(value.createdAt),
    updatedAt: timestamp(value.updatedAt ?? value.createdAt),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

export function parseCommunityComment(value: unknown): CommunityComment {
  if (!isRecord(value)) throw new TypeError("안전하지 않은 커뮤니티 응답");
  ensurePrivacy(value);
  const anonymous = optionalBoolean(value.anonymous ?? value.isAnonymous);
  return {
    id: requiredText(value.commentId ?? value.id, "comment id"),
    postId: requiredText(value.postId, "post id"),
    content: requiredText(value.content, "comment content"),
    ...(anonymous !== null ? { anonymous } : {}),
    anonymousDisplayName:
      typeof value.authorMasked === "string" && value.authorMasked.trim()
        ? value.authorMasked.trim()
        : "익명 사용자",
    moderationStatus: moderationStatus(value.status ?? value.moderationStatus),
    likeCount: safeInteger(value.likeCount),
    likedByMe: value.likedByMe === true,
    createdAt: timestamp(value.createdAt),
    updatedAt: timestamp(value.updatedAt ?? value.createdAt),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
  };
}

export function parseCommunityFeedPage(value: unknown): CommunityFeedPage {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new TypeError("안전하지 않은 커뮤니티 응답");
  }
  const page = safeInteger(value.page);
  const pageSize = safeInteger(value.pageSize);
  const total = safeInteger(value.total);
  if (page < 1 || pageSize < 1) {
    throw new TypeError("안전하지 않은 커뮤니티 응답: pagination");
  }
  return {
    items: value.items.map(parseCommunityPost),
    meta: { page, pageSize, total },
  };
}

export function parseCommunityPostDetail(value: unknown): CommunityPostDetail {
  if (!isRecord(value)) throw new TypeError("안전하지 않은 커뮤니티 응답");
  return {
    post: parseCommunityPost(value),
    content: typeof value.content === "string" ? value.content.trim() : "",
    tags: tags(value.tags),
    attachments: attachments(value.attachments),
    comments: [],
  };
}

export function parseCommunityCommentPage(value: unknown): Readonly<{
  items: readonly CommunityComment[];
  page: number;
  pageSize: number;
  total: number;
}> {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new TypeError("안전하지 않은 커뮤니티 응답");
  }
  return {
    items: value.items.map(parseCommunityComment),
    page: safeInteger(value.page),
    pageSize: safeInteger(value.pageSize),
    total: safeInteger(value.total),
  };
}

export function communityResponseData(value: unknown): unknown {
  if (!isRecord(value) || !("data" in value)) {
    throw new TypeError("안전하지 않은 커뮤니티 응답");
  }
  return value.data;
}
