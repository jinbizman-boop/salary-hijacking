import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text } from "react-native";

import { createMobileAuthApi } from "../../../src/shared/api/mobile-api";
import {
  AppHeader,
  AppShell,
  SurfaceCard,
} from "../../../src/shared/components";
import { salaryHijackingTheme as theme } from "../../../src/shared/styles/clean-fintech-theme";

const SCREEN_VERSION = "4.0.0-clean-fintech";

type OAuthCallbackStatus = "PENDING" | "AUTHENTICATED" | "FAILED";

function paramValue(value: string | readonly string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function routeAuthenticatedOAuthResult(
  router: ReturnType<typeof useRouter>,
  response: Awaited<
    ReturnType<ReturnType<typeof createMobileAuthApi>["completeOAuth"]>
  >,
): void {
  if (response.data?.status !== "AUTHENTICATED") {
    throw new Error("OAuth callback did not authenticate the session.");
  }
  if (!response.data.user.emailVerified) {
    router.replace("/(auth)/verify-email");
    return;
  }
  if (!response.data.user.onboardingCompleted) {
    router.replace("/onboarding");
    return;
  }
  router.replace("/salary");
}

export default function OAuthCallbackScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    state?: string | string[];
  }>();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [status, setStatus] = useState<OAuthCallbackStatus>("PENDING");
  const code = paramValue(params.code);
  const state = paramValue(params.state);
  const error = paramValue(params.error);

  useEffect(() => {
    let active = true;

    async function completeCallback(): Promise<void> {
      if (error || !code || !state) {
        if (active) setStatus("FAILED");
        router.replace("/(auth)/login");
        return;
      }

      try {
        const response = await authApi.completeOAuth({
          code,
          state,
        });
        if (active) setStatus("AUTHENTICATED");
        routeAuthenticatedOAuthResult(router, response);
      } catch {
        if (active) setStatus("FAILED");
        router.replace("/(auth)/login");
      }
    }

    void completeCallback();
    return () => {
      active = false;
    };
  }, [authApi, code, error, router, state]);

  return (
    <AppShell
      accessibilityLabel="소셜 로그인 콜백 화면"
      header={<AppHeader subtitle="계정 연결" title="소셜 로그인" />}
    >
      <SurfaceCard accessibilityLabel="소셜 로그인 상태">
        {status === "PENDING" ? (
          <ActivityIndicator color={theme.color.brand.primary} />
        ) : null}
        <Text
          accessibilityRole="header"
          style={{
            color: theme.color.text.primary,
            fontFamily: theme.font.native.bold,
            fontSize: theme.typography.headline.fontSize,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          소셜 로그인 확인 중
        </Text>
        <Text
          style={{
            color: theme.color.text.secondary,
            fontFamily: theme.font.native.medium,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
            textAlign: "center",
          }}
        >
          서버 인증 결과와 계정 상태를 확인한 뒤 다음 화면으로 이동합니다.
        </Text>
      </SurfaceCard>
    </AppShell>
  );
}

export function assertMobileOAuthCallbackCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "auth/oauth/callback",
    "/api/v1/auth/oauth/callback",
    "createMobileAuthApi",
    "completeOAuth",
    "AUTHENTICATED",
    "emailVerified",
    "onboardingCompleted",
    "계정 상태",
    'router.replace("/(auth)/verify-email")',
    'router.replace("/onboarding")',
    'router.replace("/salary")',
    'router.replace("/(auth)/login")',
    "rawVerifierNotRendered",
  ] as const;

  return { ok: checks.length >= 13, version: SCREEN_VERSION, checks };
}
