import { useRouter } from "expo-router";

import {
  NotificationReferenceScreen,
  assertMobileNotificationsIndexCompleteness,
  type NotificationReferenceHref,
} from "../../src/features/notifications/components";

export default function NotificationsIndexScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <NotificationReferenceScreen
      onBack={() => router.back()}
      onOpenHref={(href: NotificationReferenceHref) =>
        router.push(href as never)
      }
      onSettings={() => router.push("/profile/settings")}
    />
  );
}

export { assertMobileNotificationsIndexCompleteness };
