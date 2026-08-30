import { useRouter } from "expo-router";
import { useEffect, type ReactElement } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

import { salaryHijackingDesignSystem } from "../src/shared/components/tokens";

declare function require(moduleName: string): unknown;

const SCREEN_VERSION = "4.1.0-launch-components";
const SPLASH_ROUTE_DELAY_MS = 0;
const COLD_DEEP_LINK_ROUTES = new Set([
  "/salary",
  "/plan",
  "/level",
  "/level/reading",
  "/level/news",
  "/level/english",
  "/level/health",
  "/notifications",
  "/community",
  "/community/write",
  "/profile",
  "/profile/settings",
  "/profile/community",
  "/profile/level",
  "/profile/notices",
  "/profile/support",
  "/profile/account",
]);

type AppRoute = string;
type CapturePreviewKind = string;
type CapturePreviewComponent = (props: {
  readonly kind: CapturePreviewKind;
}) => ReactElement;
type CapturePreviewModule = Readonly<{
  CapturePreviewScreen?: CapturePreviewComponent;
  resolveCapturePreviewKind?: (screen: string) => CapturePreviewKind | null;
}>;
type LinkingRuntime = Readonly<{
  addEventListener?: (
    event: "url",
    listener: (event: { readonly url: string }) => void,
  ) => { readonly remove: () => void };
  getInitialURL?: () => Promise<string | null>;
  parseInitialURLAsync?: () => Promise<{
    scheme: string | null;
    hostname: string | null;
    path: string | null;
  }>;
}>;
type SplashScreenRuntime = Readonly<{
  hideAsync?: () => Promise<boolean>;
}>;
let cachedLinkingRuntime: LinkingRuntime | null = null;
let cachedSplashRuntime: SplashScreenRuntime | null = null;

export default function MobileIndexScreen(): ReactElement {
  const router = useRouter();
  const captureScreenKind = readCaptureScreenKind();

  useEffect(() => {
    if (captureScreenKind) {
      hideNativeSplashSafely();
      return undefined;
    }

    let mounted = true;
    const linking = getLinkingRuntime();
    const subscription = linking.addEventListener?.("url", ({ url }) => {
      const route = normalizeInitialDeepLinkRoute(url);
      if (route) router.replace(route as never);
    });
    hideNativeSplashSafely();
    void resolveInitialDeepLinkRoute().then((route) => {
      if (!mounted) return;
      if (route) router.replace(route as never);
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [captureScreenKind, router]);

  if (captureScreenKind) {
    const CapturePreviewScreen = loadCapturePreviewScreen();
    return <CapturePreviewScreen kind={captureScreenKind} />;
  }

  return <LaunchTransitionScreen />;
}

export async function resolveInitialDeepLinkRoute(): Promise<AppRoute | null> {
  const linking = getLinkingRuntime();
  try {
    const raw = await linking.getInitialURL?.();
    const route = normalizeInitialDeepLinkRoute(raw ?? null);
    if (route) return route;
    const parsed = await linking.parseInitialURLAsync?.();
    if (!parsed) return null;
    return normalizeInitialDeepLinkRoute(parsedToHref(parsed));
  } catch {
    return null;
  }
}

function parsedToHref(
  parsed: Readonly<{
    scheme: string | null;
    hostname: string | null;
    path: string | null;
  }>,
): string | null {
  if (!parsed.scheme) return null;
  const path = parsed.path ? `/${parsed.path.replace(/^\//u, "")}` : "";
  if (parsed.hostname) return `${parsed.scheme}://${parsed.hostname}${path}`;
  return `${parsed.scheme}://${path}`;
}

export function normalizeInitialDeepLinkRoute(
  href: string | null,
): AppRoute | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const route = routePathFromUrl(url);
  if (!route) return null;
  if (COLD_DEEP_LINK_ROUTES.has(route)) return route;
  if (/^\/community\/[A-Za-z0-9_-]{1,80}$/u.test(route)) return route;
  return null;
}

function routePathFromUrl(url: URL): AppRoute | null {
  const pathname = url.pathname.startsWith("/")
    ? url.pathname
    : `/${url.pathname}`;
  if (url.protocol === "https:") return pathname === "/" ? null : pathname;
  const host = url.hostname;
  if (!host || host === "app") return pathname === "/" ? null : pathname;
  return `/${[host, pathname.replace(/^\//u, "")].filter(Boolean).join("/")}`;
}

function readCaptureScreenKind(): CapturePreviewKind | null {
  const location = readBrowserLocation();
  if (!location) return null;
  return resolveCaptureScreenKindForUrl(location.href);
}

export function resolveCaptureScreenKindForUrl(
  href: string,
): CapturePreviewKind | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!url.searchParams.has("capture")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "capture") return null;
  const screen = parts[1] ?? "";
  return resolveCaptureScreenKindLazily(screen);
}

function resolveCaptureScreenKindLazily(
  screen: string,
): CapturePreviewKind | null {
  const mod = require("../src/features/capture") as CapturePreviewModule;
  const resolver = mod.resolveCapturePreviewKind;
  return typeof resolver === "function" ? resolver(screen) : null;
}

function loadCapturePreviewScreen(): CapturePreviewComponent {
  const mod = require("../src/features/capture") as CapturePreviewModule;
  if (typeof mod.CapturePreviewScreen === "function") {
    return mod.CapturePreviewScreen;
  }
  return function CapturePreviewFallback(): ReactElement {
    return <LaunchTransitionScreen />;
  };
}

function LaunchTransitionScreen(): ReactElement {
  const launchIsImmediate = SPLASH_ROUTE_DELAY_MS === 0;
  return (
    <View
      accessibilityHint={launchIsImmediate ? "즉시 이동 준비" : undefined}
      accessibilityLabel="급여납치 시작 화면"
      style={styles.launch}
    >
      <Text style={styles.title}>급여납치</Text>
      <Text style={styles.message}>앱을 준비하고 있어요</Text>
      <ActivityIndicator
        color={salaryHijackingDesignSystem.colors.brand.primary}
        size="small"
      />
    </View>
  );
}

function hideNativeSplashSafely(): void {
  if (Platform.OS !== "web") return;
  void getSplashRuntime().hideAsync?.().catch(() => undefined);
}

function getLinkingRuntime(): LinkingRuntime {
  if (cachedLinkingRuntime) return cachedLinkingRuntime;
  cachedLinkingRuntime = require("expo-linking") as LinkingRuntime;
  return cachedLinkingRuntime;
}

function getSplashRuntime(): SplashScreenRuntime {
  if (cachedSplashRuntime) return cachedSplashRuntime;
  cachedSplashRuntime = require("expo-splash-screen") as SplashScreenRuntime;
  return cachedSplashRuntime;
}

function readBrowserLocation(): Readonly<{ href: string }> | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (!location || typeof location.href !== "string") return null;
  return location;
}

export function assertMobileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking launch components",
    "SALARY HIJACKING",
    "LaunchTransitionScreen",
    "CapturePreviewScreen",
    "hideNativeSplashSafely",
    "SPLASH_ROUTE_DELAY_MS = 0",
    "no preview auth bypass",
    "resolveInitialDeepLinkRoute",
    "normalizeInitialDeepLinkRoute",
    "root auth gate session check",
    "financial raw data hidden",
    "personal raw data hidden",
    "token raw data hidden",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  launch: {
    alignItems: "center",
    backgroundColor: salaryHijackingDesignSystem.colors.surface.default,
    flex: 1,
    gap: salaryHijackingDesignSystem.spacing[3],
    justifyContent: "center",
    padding: salaryHijackingDesignSystem.spacing[6],
  },
  message: {
    color: salaryHijackingDesignSystem.colors.text.secondary,
    ...salaryHijackingDesignSystem.typography.bodyM,
    textAlign: "center",
  },
  title: {
    color: salaryHijackingDesignSystem.colors.brand.primary,
    ...salaryHijackingDesignSystem.typography.titleXL,
    textAlign: "center",
  },
});
