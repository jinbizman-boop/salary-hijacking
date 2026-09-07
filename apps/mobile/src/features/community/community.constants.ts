import type {
  CommunityBoardType,
  CommunityReportReason,
  CommunityShareChannel,
  CommunitySort,
} from "./community.types";

export const COMMUNITY_API_PREFIX = "/api/v1/community";
export const COMMUNITY_MAX_TITLE_LENGTH = 120;
export const COMMUNITY_MAX_CONTENT_LENGTH = 10_000;
export const COMMUNITY_MAX_COMMENT_LENGTH = 2_000;
export const COMMUNITY_MAX_TAGS = 10;
export const COMMUNITY_MAX_TAG_LENGTH = 24;

export const COMMUNITY_BOARD_TYPES: readonly CommunityBoardType[] =
  Object.freeze(["FREE", "LEVELUP", "HOBBY"]);

export const COMMUNITY_BOARD_LABELS = Object.freeze({
  FREE: "자유 게시판",
  LEVELUP: "레벨업 인증",
  HOBBY: "취미 게시판",
} satisfies Readonly<Record<CommunityBoardType, string>>);

export const COMMUNITY_LEGACY_CATEGORY_MAPPING: Readonly<
  Record<string, CommunityBoardType>
> = Object.freeze({
  "급여 이야기": "FREE",
  "예산 팁": "FREE",
  "지출 줄이기": "FREE",
  저축: "FREE",
  "저축 목표": "FREE",
  부업: "FREE",
  자유: "FREE",
  "자유 게시판": "FREE",
  레벨업: "LEVELUP",
  "레벨업 인증": "LEVELUP",
  취미: "HOBBY",
  "취미 게시판": "HOBBY",
  SALARY_TALK: "FREE",
  BUDGET_TIP: "FREE",
  EXPENSE_CUT: "FREE",
  SAVINGS_GOAL: "FREE",
  SIDE_HUSTLE: "FREE",
  LEVEL_CERTIFICATION: "LEVELUP",
  HEALTH_ROUTINE: "HOBBY",
});

export function isCommunityBoardType(
  value: unknown,
): value is CommunityBoardType {
  return COMMUNITY_BOARD_TYPES.includes(value as CommunityBoardType);
}

export function normalizeCommunityBoardType(
  value: unknown,
): CommunityBoardType | null {
  if (isCommunityBoardType(value)) return value;
  if (typeof value !== "string") return null;
  return COMMUNITY_LEGACY_CATEGORY_MAPPING[value.trim()] ?? null;
}

export function communityBoardLabel(value: unknown): string {
  const boardType = normalizeCommunityBoardType(value);
  return boardType
    ? COMMUNITY_BOARD_LABELS[boardType]
    : COMMUNITY_BOARD_LABELS.FREE;
}

export const COMMUNITY_SORTS: readonly CommunitySort[] = Object.freeze([
  "LATEST",
  "POPULAR",
  "COMMENTS",
  "BOOKMARKED",
]);

export const COMMUNITY_SHARE_CHANNELS: readonly CommunityShareChannel[] =
  Object.freeze(["SYSTEM_SHARE", "COPY_LINK", "KAKAO", "NAVER", "OTHER"]);

export const COMMUNITY_REPORT_REASONS: readonly CommunityReportReason[] =
  Object.freeze([
    "SPAM",
    "ABUSE",
    "HARASSMENT",
    "HATE_OR_DISCRIMINATION",
    "SEXUAL_CONTENT",
    "MISINFORMATION",
    "FINANCIAL_RISK",
    "ILLEGAL_FINANCE",
    "GAMBLING_OR_SPECULATION",
    "SCAM_OR_PHISHING",
    "PERSONAL_INFORMATION",
    "PRIVACY_LEAK",
    "RAW_FINANCIAL_DATA_EXPOSURE",
    "TOKEN_OR_SECRET_LEAK",
    "AD_OR_PARTNER_POLICY_VIOLATION",
    "COPYRIGHT",
    "ILLEGAL",
    "OTHER",
  ]);

export const COMMUNITY_PRIVACY_HEADERS = Object.freeze({
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting-used": "false",
});
