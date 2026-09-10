type NativeNotificationsRuntime = Readonly<{
  setNotificationHandler?: (handler: {
    readonly handleNotification: () => Promise<Readonly<Record<string, boolean>>>;
  }) => void;
  addNotificationResponseReceivedListener?: (
    listener: (response: unknown) => void,
  ) => { readonly remove?: () => void };
  getLastNotificationResponseAsync?: () => Promise<unknown>;
}>;

type NativeNotificationRouter = Readonly<{
  replace: (href: never) => void;
}>;

const ALLOWED_NOTIFICATION_ROUTES = new Set([
  "/salary",
  "/plan",
  "/level",
  "/level/reading",
  "/level/news",
  "/level/english",
  "/level/health",
  "/salary/notifications",
  "/salary/notifications/settings",
  "/notifications",
  "/notifications/settings",
  "/community",
  "/community/my-posts",
  "/community/write",
  "/profile",
  "/profile/notifications",
]);

export function notificationRouteFromResponse(
  response: unknown,
): string | null {
  const data = notificationDataFromResponse(response);
  const deeplink = typeof data?.deeplink === "string" ? data.deeplink : null;
  if (!deeplink || deeplink.length > 500) return null;

  let url: URL;
  try {
    url = new URL(deeplink);
  } catch {
    return null;
  }
  if (url.protocol !== "salaryhijacking:") return null;

  const route = routePathFromSalaryHijackingUrl(url);
  if (!route) return null;
  return ALLOWED_NOTIFICATION_ROUTES.has(route) ? route : null;
}

export function createNativeNotificationRouting({
  notifications,
  router,
}: {
  readonly notifications: NativeNotificationsRuntime;
  readonly router: NativeNotificationRouter;
}): Readonly<{
  remove: () => void;
  replayLastResponse: () => Promise<void>;
}> {
  notifications.setNotificationHandler?.({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const openResponse = (response: unknown): void => {
    const route = notificationRouteFromResponse(response);
    if (!route) return;
    router.replace(route as never);
  };

  const subscription =
    notifications.addNotificationResponseReceivedListener?.(openResponse) ??
    null;

  return {
    remove: (): void => {
      subscription?.remove?.();
    },
    replayLastResponse: async (): Promise<void> => {
      const response = await notifications.getLastNotificationResponseAsync?.();
      if (response) openResponse(response);
    },
  };
}

function notificationDataFromResponse(
  response: unknown,
): Readonly<Record<string, unknown>> | null {
  if (!isRecord(response)) return null;
  const notification = response.notification;
  if (!isRecord(notification)) return null;
  const request = notification.request;
  if (!isRecord(request)) return null;
  const content = request.content;
  if (!isRecord(content)) return null;
  const data = content.data;
  return isRecord(data) ? data : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function routePathFromSalaryHijackingUrl(url: URL): string | null {
  const pathname = url.pathname.startsWith("/")
    ? url.pathname
    : `/${url.pathname}`;
  if (!url.hostname || url.hostname === "app") {
    return pathname === "/" ? null : pathname;
  }
  return `/${[url.hostname, pathname.replace(/^\//u, "")]
    .filter(Boolean)
    .join("/")}`;
}
