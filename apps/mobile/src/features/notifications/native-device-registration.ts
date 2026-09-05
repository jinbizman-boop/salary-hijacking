import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Localization from "expo-localization";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import type {
  NativeNotificationPermissionStatus,
  NativeNotificationRegistrationDependencies,
} from "./controller";
import type { NotificationDevicePlatform } from "./types";

const NOTIFICATION_DEVICE_ID_KEY = "salary-hijacking.notification.device-id";

export async function createNativeNotificationRegistrationDependencies(): Promise<NativeNotificationRegistrationDependencies> {
  return {
    appVersion: Constants.expoConfig?.version ?? null,
    getDeviceId: readOrCreateNotificationDeviceId,
    getDevicePushToken: getNativeDevicePushToken,
    getPermissionStatus: getNativeNotificationPermissionStatus,
    locale: Localization.getLocales()[0]?.languageTag ?? "ko-KR",
    platform: nativeNotificationPlatform(),
    requestPermission: requestNativeNotificationPermission,
  };
}

async function getNativeNotificationPermissionStatus(): Promise<NativeNotificationPermissionStatus> {
  return notificationPermissionStatus(
    await Notifications.getPermissionsAsync(),
  );
}

async function requestNativeNotificationPermission(): Promise<NativeNotificationPermissionStatus> {
  return notificationPermissionStatus(
    await Notifications.requestPermissionsAsync(),
  );
}

async function getNativeDevicePushToken(): Promise<string> {
  const tokenResult = await Notifications.getDevicePushTokenAsync();
  return String(tokenResult.data ?? "");
}

function notificationPermissionStatus(
  permission: Pick<
    Notifications.NotificationPermissionsStatus,
    "granted" | "status"
  >,
): NativeNotificationPermissionStatus {
  if (permission.granted) return "GRANTED";
  if (permission.status === "undetermined") return "UNDETERMINED";
  return "DENIED";
}

function nativeNotificationPlatform(): NotificationDevicePlatform {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
}

function createLocalDeviceId(): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `salary-hijacking-${Platform.OS}-${randomPart}`;
}

async function readOrCreateNotificationDeviceId(): Promise<string> {
  const cached = await SecureStore.getItemAsync(NOTIFICATION_DEVICE_ID_KEY);
  if (cached && /^[A-Za-z0-9_.:-]+$/u.test(cached)) return cached;

  const stableNativeId =
    Platform.OS === "android"
      ? Application.getAndroidId()
      : Platform.OS === "ios"
        ? await Application.getIosIdForVendorAsync()
        : null;
  const nextDeviceId =
    stableNativeId && /^[A-Za-z0-9_.:-]+$/u.test(stableNativeId)
      ? `salary-hijacking-${Platform.OS}-${stableNativeId}`
      : createLocalDeviceId();
  await SecureStore.setItemAsync(NOTIFICATION_DEVICE_ID_KEY, nextDeviceId);
  return nextDeviceId;
}
