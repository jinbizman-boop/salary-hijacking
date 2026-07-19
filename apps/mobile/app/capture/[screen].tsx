import { Redirect, useLocalSearchParams, usePathname } from "expo-router";
import { Platform } from "react-native";

import {
  CapturePreviewScreen,
  type CapturePreviewKind,
} from "../../src/features/capture";

const captureScreens: Readonly<Record<string, CapturePreviewKind>> =
  Object.freeze({
    community: "community",
    "community-post-detail": "community-post-detail",
    "community-write": "community-write",
    "common-empty": "common-empty",
    "common-error": "common-error",
    "common-loading": "common-loading",
    "common-offline": "common-offline",
    english: "english",
    "expense-form-state": "expense-form-state",
    "fixed-expense-form": "fixed-expense-form",
    "fixed-saving-form": "fixed-saving-form",
    health: "health",
    level: "level",
    "living-cost-form": "living-cost-form",
    login: "login",
    news: "news",
    notifications: "notifications",
    "notification-settings": "notification-settings",
    plan: "plan",
    profile: "profile",
    "profile-account": "profile-account",
    "profile-community": "profile-community",
    "profile-level": "profile-level",
    "profile-notices": "profile-notices",
    "profile-settings": "profile-settings",
    "profile-support": "profile-support",
    reading: "reading",
    salary: "salary",
    signup: "signup",
    splash: "splash",
    "terms-consent": "terms-consent",
  });

export default function CaptureScreen(): React.ReactElement {
  if (Platform.OS !== "web") return <Redirect href="/salary" />;

  const params = useLocalSearchParams();
  const pathname = usePathname();
  const paramScreen = params.screen;
  const rawScreen = Array.isArray(paramScreen)
    ? paramScreen[0]
    : typeof paramScreen === "string"
      ? paramScreen
      : (readCaptureScreenFromPath(pathname) ?? readCaptureScreenFromWindow());
  const kind = captureScreens[String(rawScreen ?? "")] ?? "salary";
  return <CapturePreviewScreen kind={kind} />;
}

function readCaptureScreenFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const captureIndex = parts.indexOf("capture");
  if (captureIndex < 0) return null;
  const value = parts[captureIndex + 1];
  if (!value || value === "[screen]") return null;
  return value;
}

function readCaptureScreenFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (!location || typeof location.pathname !== "string") return null;
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[0] === "capture" ? (parts[1] ?? null) : null;
}
