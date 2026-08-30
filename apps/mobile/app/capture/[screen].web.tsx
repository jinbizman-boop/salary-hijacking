import { Redirect, useLocalSearchParams, usePathname } from "expo-router";
import { Platform } from "react-native";

type CapturePreviewKind = string;
type CapturePreviewComponent = (props: {
  readonly kind: CapturePreviewKind;
}) => React.ReactElement;
type CapturePreviewModule = Readonly<{
  CapturePreviewScreen?: CapturePreviewComponent;
  resolveCapturePreviewKind?: (screen: string) => CapturePreviewKind | null;
}>;

declare function require(moduleName: string): unknown;

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
  const screen = String(rawScreen ?? "");
  const kind = resolveCapturePreviewKindLazily(screen) ?? "salary";
  const CapturePreviewScreen = loadCapturePreviewScreen();
  return <CapturePreviewScreen kind={kind} />;
}

function resolveCapturePreviewKindLazily(
  screen: string,
): CapturePreviewKind | null {
  const mod = require("../../src/features/capture") as CapturePreviewModule;
  const resolver = mod.resolveCapturePreviewKind;
  return typeof resolver === "function" ? resolver(screen) : null;
}

function loadCapturePreviewScreen(): CapturePreviewComponent {
  const mod = require("../../src/features/capture") as CapturePreviewModule;
  if (typeof mod.CapturePreviewScreen === "function") {
    return mod.CapturePreviewScreen;
  }
  return function CapturePreviewFallback(): React.ReactElement {
    return <Redirect href="/salary" />;
  };
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
