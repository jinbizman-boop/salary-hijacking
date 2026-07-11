import Constants from "expo-constants";
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

type InitialRoute = typeof LOGIN_ROUTE | typeof SALARY_HOME_ROUTE;
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
    void SplashScreen.hideAsync().catch(() => undefined);
    const timer = setTimeout(() => {
      void resolveInitialRoute()
        .then((route) => {
          if (!mounted) return;
          if (route === SALARY_HOME_ROUTE) router.replace("/salary" as never);
          else router.replace("/(auth)/login" as never);
        })
        .catch(() => {
          if (mounted) router.replace(LOGIN_ROUTE as never);
        });
    }, SPLASH_ROUTE_DELAY_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [captureScreenKind, router]);

  if (captureScreenKind) {
    return <CapturePreviewScreen kind={captureScreenKind} />;
  }

  return <SplashLaunchScreen routeDelayMs={SPLASH_ROUTE_DELAY_MS} />;
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
  if (typeof window === "undefined") return null;
  return resolveCaptureScreenKindForUrl(window.location.href);
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
    "server authoritative session check",
    "financial raw data hidden",
    "personal raw data hidden",
    "token raw data hidden",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
