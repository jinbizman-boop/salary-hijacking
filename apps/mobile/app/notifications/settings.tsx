import { Linking } from "react-native";
import { useRouter } from "expo-router";

import { NotificationSettingsScreen } from "../../src/features/notifications/components";

export default function NotificationsSettingsRoute(): React.ReactElement {
  const router = useRouter();

  return (
    <NotificationSettingsScreen
      onBack={() => router.back()}
      onOpenSystemSettings={() => {
        void Linking.openSettings();
      }}
    />
  );
}
