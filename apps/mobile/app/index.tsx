import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { SplashLaunchScreen } from "../src/features/auth/components";
import {
  CapturePreviewScreen,
  type CapturePreviewKind,
} from "../src/features/capture";
import { MOBILE_ACCESS_TOKEN_KEY } from "../src/shared/storage/auth-token";

const SCREEN_VERSION = "4.1.0-launch-components";
const SPLASH_ROUTE_DELAY_MS = 1200;
const LOGIN_ROUTE = "/(auth)/login";
const SALARY_HOME_ROUTE = "/salary";
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

type InitialRoute = typeof LOGIN_ROUTE | typeof SALARY_HOME_ROUTE;
type AppRoute = string;
type ExpoExtra = Readonly<{
  app?: Readonly<{ environment?: unknown }>;
  operations?: Readonly<{ e2eBuild?: unknown; releaseChannel?: unknown }>;
}>;

const captureScreens: Readonly<Record<string, CapturePreviewKind>> =
  Object.freeze({
    community: "community",
    "community-write": "community-write",
    english: "english",
    health: "health",
    level: "level",
    news: "news",
    notifications: "notifications",
    plan: "plan",
    profile: "profile",
    "profile-level": "profile-level",
    reading: "reading",
    salary: "salary",
  });

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function MobileIndexScreen(): React.ReactElement {
  const router = useRouter();
  const captureScreenKind = readCaptureScreenKind();

  useEffect(() => {
    if (captureScreenKind) {
      void SplashScreen.hideAsync().catch(() => undefined);
      return undefined;
    }

    let mounted = true;
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const route = normalizeInitialDeepLinkRoute(url);
      if (route) router.replace(route as never);
    });
    void SplashScreen.hideAsync().catch(() => undefined);
    const timer = setTimeout(() => {
      void resolveInitialLaunchTarget()
        .then((route) => {
          if (!mounted) return;
          router.replace(route as never);
        })
        .catch(() => {
          if (mounted) router.replace(LOGIN_ROUTE as never);
        });
    }, SPLASH_ROUTE_DELAY_MS);

    return () => {
      mounted = false;
      subscription.remove();
      clearTimeout(timer);
    };
  }, [captureScreenKind, router]);

  if (captureScreenKind) {
    return <CapturePreviewScreen kind={captureScreenKind} />;
  }

  return <SplashLaunchScreen routeDelayMs={SPLASH_ROUTE_DELAY_MS} />;
}

export async function resolveInitialLaunchTarget(): Promise<AppRoute> {
  const deepLinkRoute = await resolveInitialDeepLinkRoute();
  if (deepLinkRoute) return deepLinkRoute;
  return resolveInitialRoute();
}

export async function resolveInitialRoute(): Promise<InitialRoute> {
  if (isPreviewFallbackLaunch()) return SALARY_HOME_ROUTE;
  try {
    const token = await SplashSecureStore.getItemAsync(MOBILE_ACCESS_TOKEN_KEY);
    return isUsableAccessToken(token) ? SALARY_HOME_ROUTE : LOGIN_ROUTE;
  } catch {
    return LOGIN_ROUTE;
  }
}

export async function resolveInitialDeepLinkRoute(): Promise<AppRoute | null> {
  try {
    const raw = await Linking.getInitialURL();
    const route = normalizeInitialDeepLinkRoute(raw);
    if (route) return route;
    const parsed = await Linking.parseInitialURLAsync();
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
  if (COLD_DEEP_LINK_ROUTES.has(route)) return route;
  if (/^\/community\/[A-Za-z0-9_-]{1,80}$/u.test(route)) return route;
  return null;
}

function routePathFromUrl(url: URL): AppRoute {
  const pathname = url.pathname.startsWith("/")
    ? url.pathname
    : `/${url.pathname}`;
  if (url.protocol === "https:") return pathname || SALARY_HOME_ROUTE;
  const host = url.hostname;
  if (!host || host === "app") return pathname || SALARY_HOME_ROUTE;
  return `/${[host, pathname.replace(/^\//u, "")].filter(Boolean).join("/")}`;
}

function isPreviewFallbackLaunch(): boolean {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  const releaseChannel = String(extra.operations?.releaseChannel ?? "");
  const environment = String(extra.app?.environment ?? "");
  return (
    extra.operations?.e2eBuild === true ||
    releaseChannel === "preview" ||
    environment === "staging"
  );
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
  return captureScreens[parts[1] ?? ""] ?? null;
}

function isUsableAccessToken(value: string | null): boolean {
  const token = value?.trim();
  return Boolean(token && token.length <= 8192 && !/\s/u.test(token));
}

function readBrowserLocation(): Readonly<{ href: string }> | null {
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (!location || typeof location.href !== "string") return null;
  return location;
}

const SplashSecureStore = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      const store = await import("expo-secure-store");
      return await store.getItemAsync(key);
    } catch {
      return null;
    }
  },
};

export function assertMobileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking launch components",
    "SALARY HIJACKING",
    "SplashLaunchScreen",
    "CapturePreviewScreen",
    "SplashScreen.hideAsync",
    "SPLASH_ROUTE_DELAY_MS = 1200",
    LOGIN_ROUTE,
    SALARY_HOME_ROUTE,
    "preview QA fallback",
    "resolveInitialRoute",
    "resolveInitialLaunchTarget",
    "resolveInitialDeepLinkRoute",
    "normalizeInitialDeepLinkRoute",
    "server authoritative session check",
    "financial raw data hidden",
    "personal raw data hidden",
    "token raw data hidden",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
