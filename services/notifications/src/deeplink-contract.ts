/**
 * Canonical notification -> Expo Router destination contract.
 *
 * Route groups such as `(tabs)` are implementation folders and are not emitted
 * in user-facing deep links. This registry only points to production routes
 * confirmed in apps/mobile/app on the current branch.
 */

export const NOTIFICATION_DEEPLINK_SCHEME = "salary-hijacking" as const;

export type NotificationDeeplinkType =
  | "PAYDAY"
  | "FIXED_PAYMENT_DUE"
  | "SAVINGS_DUE"
  | "BUDGET_OVER"
  | "BUDGET_REMAINING"
  | "HIJACK_GOAL"
  | "GROWTH_TASK"
  | "GROWTH_LEVEL_UP"
  | "COMMUNITY_COMMENT"
  | "COMMUNITY_REACTION"
  | "NOTICE"
  | "SECURITY"
  | "SYSTEM";

export type NotificationProductionRoute =
  | "/salary"
  | "/plan"
  | "/notifications"
  | "/level"
  | "/community";

export interface NotificationDeeplinkTarget {
  readonly type: NotificationDeeplinkType;
  readonly route: NotificationProductionRoute;
  readonly deeplink: string;
  readonly targetScreen:
    | "salary-home"
    | "plan"
    | "notifications"
    | "level"
    | "community";
}

const targetByType: Readonly<
  Record<
    NotificationDeeplinkType,
    Omit<NotificationDeeplinkTarget, "type" | "deeplink">
  >
> = Object.freeze({
  PAYDAY: { route: "/salary", targetScreen: "salary-home" },
  FIXED_PAYMENT_DUE: { route: "/plan", targetScreen: "plan" },
  SAVINGS_DUE: { route: "/plan", targetScreen: "plan" },
  BUDGET_OVER: { route: "/salary", targetScreen: "salary-home" },
  BUDGET_REMAINING: { route: "/salary", targetScreen: "salary-home" },
  HIJACK_GOAL: { route: "/salary", targetScreen: "salary-home" },
  GROWTH_TASK: { route: "/level", targetScreen: "level" },
  GROWTH_LEVEL_UP: { route: "/level", targetScreen: "level" },
  COMMUNITY_COMMENT: { route: "/community", targetScreen: "community" },
  COMMUNITY_REACTION: { route: "/community", targetScreen: "community" },
  NOTICE: { route: "/notifications", targetScreen: "notifications" },
  SECURITY: { route: "/notifications", targetScreen: "notifications" },
  SYSTEM: { route: "/notifications", targetScreen: "notifications" },
});

function encodeQueryValue(value: string | number | boolean): string {
  return encodeURIComponent(String(value));
}

export function notificationRouteFor(
  type: NotificationDeeplinkType,
): NotificationProductionRoute {
  return targetByType[type].route;
}

export function notificationDeeplinkFor(
  type: NotificationDeeplinkType,
  params: Readonly<Record<string, string | number | boolean | null | undefined>> = {},
): NotificationDeeplinkTarget {
  const target = targetByType[type];
  const entries = Object.entries(params)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  const query = entries.length
    ? `?${entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeQueryValue(value)}`)
        .join("&")}`
    : "";

  return Object.freeze({
    type,
    route: target.route,
    targetScreen: target.targetScreen,
    deeplink: `${NOTIFICATION_DEEPLINK_SCHEME}://${target.route.slice(1)}${query}`,
  });
}

export function isCanonicalNotificationDeeplink(
  type: NotificationDeeplinkType,
  deeplink: string,
): boolean {
  const expectedPrefix = `${NOTIFICATION_DEEPLINK_SCHEME}://${targetByType[type].route.slice(1)}`;
  return deeplink === expectedPrefix || deeplink.startsWith(`${expectedPrefix}?`);
}

export const notificationDeeplinkManifest = Object.freeze({
  scheme: NOTIFICATION_DEEPLINK_SCHEME,
  productionRoutes: Object.freeze([
    "/salary",
    "/plan",
    "/notifications",
    "/level",
    "/community",
  ] as const),
  routeGroupsExcludedFromUrls: true,
  requirementRefs: Object.freeze(["NOTI-009", "REL-006"]),
});
