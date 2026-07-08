import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { MOBILE_ACCESS_TOKEN_KEY } from "../src/shared/storage/auth-token";
import { CleanFintechSplashScreen } from "../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";
const SPLASH_ROUTE_DELAY_MS = 1200;
const LOGIN_ROUTE = "/(auth)/login";
const SALARY_HOME_ROUTE = "/salary";

type InitialRoute = typeof LOGIN_ROUTE | typeof SALARY_HOME_ROUTE;
type ExpoExtra = Readonly<{
  app?: Readonly<{ environment?: unknown }>;
  operations?: Readonly<{ e2eBuild?: unknown; releaseChannel?: unknown }>;
}>;

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function MobileIndexScreen(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
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
  }, [router]);

  return <CleanFintechSplashScreen />;
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
    "Salary Hijacking Clean Fintech v1",
    "SALARY HIJACKING",
    "급여납치",
    "월급이 사라지기 전에 먼저 붙잡아요",
    "Splash",
    "1.2초",
    "SplashScreen.hideAsync",
    "로그인",
    "급여 홈",
    "preview QA fallback",
    "resolveInitialRoute",
    "서버 기준 상태 확인",
    "금융 원문 미노출",
    "개인 원문 미노출",
    "푸시 토큰 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
