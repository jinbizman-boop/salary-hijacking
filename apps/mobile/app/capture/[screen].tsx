import { useLocalSearchParams, usePathname } from "expo-router";

import {
  CapturePreviewScreen,
  type CapturePreviewKind,
} from "../../src/features/capture";

const captureScreens: Readonly<Record<string, CapturePreviewKind>> =
  Object.freeze({
    community: "community",
    "community-write": "community-write",
    english: "english",
    health: "health",
    level: "level",
    login: "login",
    news: "news",
    notifications: "notifications",
    plan: "plan",
    profile: "profile",
    "profile-level": "profile-level",
    reading: "reading",
    salary: "salary",
    signup: "signup",
    splash: "splash",
  });

export default function CaptureScreen(): React.ReactElement {
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
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] === "capture" ? (parts[1] ?? null) : null;
}
