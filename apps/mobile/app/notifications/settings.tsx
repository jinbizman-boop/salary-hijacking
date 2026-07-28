import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";

import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferenceState,
} from "../../src/features/notifications/controller";
import { NotificationSettingsScreen } from "../../src/features/notifications/components";
import { createMobileNotificationsApi } from "../../src/shared/api/mobile-api";

export default function NotificationsSettingsRoute(): React.ReactElement {
  const router = useRouter();
  const notificationsApi = useMemo(() => createMobileNotificationsApi(), []);
  const [preferences, setPreferences] =
    useState<NotificationPreferenceState | null>(null);

  const refreshPreferences = useCallback(async () => {
    try {
      setPreferences(await loadNotificationPreferences(notificationsApi));
    } catch {
      setPreferences(null);
    }
  }, [notificationsApi]);

  useEffect(() => {
    void refreshPreferences();
  }, [refreshPreferences]);

  const handleSavePreferences = useCallback(
    async (nextPreferences: NotificationPreferenceState) => {
      setPreferences(
        await saveNotificationPreferences(notificationsApi, nextPreferences),
      );
    },
    [notificationsApi],
  );

  return (
    <NotificationSettingsScreen
      onBack={() => router.back()}
      onOpenSystemSettings={() => {
        void Linking.openSettings();
      }}
      onPreferencesChange={setPreferences}
      onSavePreferences={handleSavePreferences}
      preferences={preferences ?? undefined}
    />
  );
}
