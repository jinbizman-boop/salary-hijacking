import type { CommunityBoardType, ModerationStatus } from "./community.types";

export type CommunityAnalyticsEvent =
  | "community_feed_view"
  | "community_post_open"
  | "community_post_publish_attempt"
  | "community_post_publish_result"
  | "community_post_reaction"
  | "community_comment_publish_result"
  | "community_report_result"
  | "community_ad_impression"
  | "community_ad_click";

export type CommunityAnalyticsInput = Readonly<Record<string, unknown>>;

export type CommunityAnalyticsPayload = Readonly<{
  event: CommunityAnalyticsEvent;
  boardType?: CommunityBoardType;
  moderationStatus?: ModerationStatus;
  result?: "success" | "failure";
  action?: "like" | "unlike" | "report" | "delete";
  correlationId?: string;
  placement?: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type CommunityAnalytics = Readonly<{
  track: (
    event: CommunityAnalyticsEvent,
    input?: CommunityAnalyticsInput,
  ) => void;
}>;

const ALLOWED_EVENTS = new Set<CommunityAnalyticsEvent>([
  "community_feed_view",
  "community_post_open",
  "community_post_publish_attempt",
  "community_post_publish_result",
  "community_post_reaction",
  "community_comment_publish_result",
  "community_report_result",
  "community_ad_impression",
  "community_ad_click",
]);

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

const MODERATION_STATUSES = new Set<ModerationStatus>([
  "SAFE",
  "REVIEW",
  "BLOCKED",
  "HIDDEN",
  "DELETED",
]);

function cleanText(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > maximumLength ||
    /[\r\n]/u.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

export function createCommunityAnalytics(
  sink: (payload: CommunityAnalyticsPayload) => void,
): CommunityAnalytics {
  return {
    track(event, input = {}) {
      if (!ALLOWED_EVENTS.has(event)) {
        throw new TypeError("허용되지 않은 커뮤니티 분석 이벤트입니다.");
      }

      const boardType = BOARD_TYPES.has(input.boardType as CommunityBoardType)
        ? (input.boardType as CommunityBoardType)
        : undefined;
      const moderationStatus = MODERATION_STATUSES.has(
        input.moderationStatus as ModerationStatus,
      )
        ? (input.moderationStatus as ModerationStatus)
        : undefined;
      const result =
        input.result === "success" || input.result === "failure"
          ? input.result
          : undefined;
      const action =
        input.action === "like" ||
        input.action === "unlike" ||
        input.action === "report" ||
        input.action === "delete"
          ? input.action
          : undefined;
      const correlationId = cleanText(input.correlationId, 128);
      const placement = cleanText(input.placement, 80);

      sink({
        event,
        ...(boardType ? { boardType } : {}),
        ...(moderationStatus ? { moderationStatus } : {}),
        ...(result ? { result } : {}),
        ...(action ? { action } : {}),
        ...(correlationId ? { correlationId } : {}),
        ...(placement ? { placement } : {}),
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      });
    },
  };
}
