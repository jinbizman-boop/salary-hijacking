import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";

import {
  loadNotificationPreferences,
  registerNativeNotificationDevice,
  saveNotificationPreferences,
  type NotificationPreferenceState,
} from "../../src/features/notifications/controller";
import { NotificationSettingsScreen } from "../../src/features/notifications/components";
import { createNativeNotificationRegistrationDependencies } from "../../src/features/notifications/native-device-registration";
import type { NotificationDevice } from "../../src/features/notifications/types";
import { createMobileNotificationsApi } from "../../src/shared/api/mobile-api";
import { DevicePermissionBottomSheet } from "../../src/shared/ui/sheets/DevicePermissionBottomSheet";

export const notificationSettingsStitchStateComponents = {
  DevicePermissionBottomSheet,
} as const;

export default function NotificationsSettingsRoute(): React.ReactElement {
  const router = useRouter();
  const notificationsApi = useMemo(() => createMobileNotificationsApi(), []);
  const [preferences, setPreferences] =
    useState<NotificationPreferenceState | null>(null);
  const [devices, setDevices] = useState<readonly NotificationDevice[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<
    "denied" | "error" | "idle" | "registered" | "registering"
  >("idle");

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

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(await notificationsApi.listDevices());
    } catch {
      setDevices([]);
    }
  }, [notificationsApi]);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const handleRegisterDevice = useCallback(async () => {
    setDeviceStatus("registering");
    try {
      const result = await registerNativeNotificationDevice(
        notificationsApi,
        await createNativeNotificationRegistrationDependencies(),
      );
      if (result.status === "PERMISSION_DENIED") {
        setDeviceStatus("denied");
        return;
      }
      setDevices((current) => [
        result.device,
        ...current.filter(
          (device) => device.deviceId !== result.device.deviceId,
        ),
      ]);
      setDeviceStatus("registered");
    } catch {
      setDeviceStatus("error");
    }
  }, [notificationsApi]);

  const handleSavePreferences = useCallback(
    async (nextPreferences: NotificationPreferenceState) => {
      const savedPreferences = await saveNotificationPreferences(
        notificationsApi,
        nextPreferences,
      );
      setPreferences(savedPreferences);
      if (
        savedPreferences.push &&
        !devices.some((device) => device.status === "ACTIVE")
      ) {
        await handleRegisterDevice();
      }
    },
    [devices, handleRegisterDevice, notificationsApi],
  );

  return (
    <NotificationSettingsScreen
      onBack={() => router.back()}
      onOpenSystemSettings={() => {
        void Linking.openSettings();
      }}
      onPreferencesChange={setPreferences}
      onRegisterDevice={handleRegisterDevice}
      onSavePreferences={handleSavePreferences}
      notificationDeviceCount={
        devices.filter((device) => device.status === "ACTIVE").length
      }
      notificationDeviceStatus={deviceStatus}
      preferences={preferences ?? undefined}
    />
  );
}
