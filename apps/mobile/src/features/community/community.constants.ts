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
  Object.freeze([
    "SALARY_TALK",
    "BUDGET_TIP",
    "EXPENSE_CUT",
    "SAVINGS_GOAL",
    "LEVEL_CERTIFICATION",
    "SIDE_HUSTLE",
    "HEALTH_ROUTINE",
    "FREE",
  ]);

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
