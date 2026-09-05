import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import {
  loadNotificationSnapshot,
  openNotificationWithServerRead,
  type NotificationSnapshot,
} from "../../src/features/notifications/controller";
import {
  NotificationScreen,
  assertMobileNotificationsIndexCompleteness,
  type NotificationHref,
  type NotificationScreenProps,
} from "../../src/features/notifications/components";
import type { NotificationItem } from "../../src/features/notifications/types";
import { createMobileNotificationsApi } from "../../src/shared/api/mobile-api";

export default function NotificationsIndexScreen(): React.ReactElement {
  const router = useRouter();
  const notificationsApi = useMemo(() => createMobileNotificationsApi(), []);
  const [snapshot, setSnapshot] = useState<NotificationSnapshot | null>(null);
  const [variant, setVariant] =
    useState<NonNullable<NotificationScreenProps["variant"]>>("default");
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refreshNotifications = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const nextSnapshot = await loadNotificationSnapshot(notificationsApi);
      setSnapshot(nextSnapshot);
      setVariant(
        nextSnapshot.items.length === 0
          ? "empty"
          : nextSnapshot.unreadCount === 0
            ? "no-unread-with-list"
            : "default",
      );
    } catch {
      setVariant("offline");
    } finally {
      setIsRefreshing(false);
    }
  }, [notificationsApi]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const handleOpenNotification = useCallback(
    async (item: NotificationItem) => {
      try {
        const result = await openNotificationWithServerRead(
          notificationsApi,
          item,
        );
        setSnapshot((current) => {
          if (!current) return current;
          const wasUnread = item.status === "UNREAD";
          return {
            ...current,
            items: current.items.map((currentItem) =>
              currentItem.notificationId === result.item.notificationId
                ? result.item
                : currentItem,
            ),
            unreadCount: wasUnread
              ? Math.max(0, current.unreadCount - 1)
              : current.unreadCount,
          };
        });
        if (result.href) router.push(result.href as never);
      } catch {
        setVariant("error");
      }
    },
    [notificationsApi, router],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      await refreshNotifications();
    } catch {
      setVariant("error");
    }
  }, [notificationsApi, refreshNotifications]);

  return (
    <NotificationScreen
      apiItems={snapshot?.items}
      isRefreshing={isRefreshing}
      onBack={() => router.back()}
      onMarkAllRead={snapshot ? handleMarkAllRead : undefined}
      onOpenNotification={handleOpenNotification}
      onOpenHref={(href: NotificationHref) => router.push(href as never)}
      onRetry={refreshNotifications}
      onSettings={() => router.push("/notifications/settings" as never)}
      unreadCount={snapshot?.unreadCount}
      variant={variant}
    />
  );
}

export { assertMobileNotificationsIndexCompleteness };
