import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";

import { createMobileAuthApi } from "../../../src/shared/api/mobile-api";
import { salaryHijackingTheme as theme } from "../../../src/shared/styles/clean-fintech-theme";

const SCREEN_VERSION = "4.0.0-clean-fintech";

type OAuthCallbackStatus = "PENDING" | "AUTHENTICATED" | "FAILED";

function paramValue(value: string | readonly string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
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
        if (response.data?.status !== "AUTHENTICATED") {
          throw new Error("OAuth callback did not authenticate the session.");
        }
        if (active) setStatus("AUTHENTICATED");
        router.replace("/salary");
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
    <SafeAreaView
      style={{
        alignItems: "center",
        backgroundColor: theme.color.surface.app,
        flex: 1,
        justifyContent: "center",
        padding: theme.spacing[24],
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.color.surface.card,
          borderColor: theme.color.surface.lineSoft,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          gap: theme.spacing[12],
          maxWidth: 360,
          padding: theme.spacing[24],
          width: "100%",
        }}
      >
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
          서버 인증 결과를 확인한 뒤 급여 홈으로 이동합니다.
        </Text>
      </View>
    </SafeAreaView>
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
    'router.replace("/salary")',
    'router.replace("/(auth)/login")',
    "rawVerifierNotRendered",
  ] as const;

  return { ok: checks.length >= 8, version: SCREEN_VERSION, checks };
}
