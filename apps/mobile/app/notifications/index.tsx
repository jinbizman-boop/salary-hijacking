import { useRouter } from "expo-router";

import {
  NotificationScreen,
  assertMobileNotificationsIndexCompleteness,
  type NotificationHref,
} from "../../src/features/notifications/components";

export default function NotificationsIndexScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <NotificationScreen
      onBack={() => router.back()}
      onOpenHref={(href: NotificationHref) => router.push(href as never)}
      onSettings={() => router.push("/profile/settings")}
    />
  );
}

export { assertMobileNotificationsIndexCompleteness };
