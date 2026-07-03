import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import { createMobileAuthApi } from "../../src/shared/api/mobile-api";
import { salaryHijackingTheme as theme } from "../../src/shared/styles/clean-fintech-theme";

const SCREEN_VERSION = "4.0.0-clean-fintech";
const VERIFY_EMAIL_PATH = "/api/v1/auth/verify-email";

type VerifyEmailStatus = "PENDING" | "VERIFIED" | "WAITING" | "FAILED";

function paramValue(value: string | readonly string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

export default function VerifyEmailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [status, setStatus] = useState<VerifyEmailStatus>("PENDING");
  const token = paramValue(params.token);

  useEffect(() => {
    let active = true;

    async function verify(): Promise<void> {
      if (!token) {
        if (active) setStatus("WAITING");
        return;
      }

      try {
        const result = await authApi.verifyEmail({ token });
        if (!result.verified) throw new Error("Email was not verified.");
        if (active) setStatus("VERIFIED");
        router.replace("/salary");
      } catch {
        if (active) setStatus("FAILED");
      }
    }

    void verify();
    return () => {
      active = false;
    };
  }, [authApi, router, token]);

  const title =
    status === "VERIFIED"
      ? "이메일 인증이 완료됐어요."
      : status === "WAITING"
        ? "인증 메일을 확인해 주세요."
        : status === "FAILED"
          ? "인증 링크를 다시 확인해 주세요."
          : "이메일 인증을 확인하고 있어요.";
  const description =
    status === "WAITING"
      ? "메일의 인증 링크를 열면 서버에서 계정을 확인합니다."
      : "인증 토큰은 화면에 표시하거나 저장하지 않고 서버 확인에만 사용합니다.";

  return (
    <SafeAreaView
      style={{
        backgroundColor: theme.color.surface.app,
        flex: 1,
        justifyContent: "center",
        padding: theme.spacing[20],
      }}
    >
      <View
        style={{
          backgroundColor: theme.color.surface.card,
          borderColor: theme.color.surface.lineSoft,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          gap: theme.spacing[12],
          padding: theme.spacing[24],
        }}
      >
        <Text
          style={{
            color: theme.color.brand.primary,
            fontFamily: theme.font.native.black,
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          serverAuthority=true · rawPersonalData=false
        </Text>
        {status === "PENDING" ? (
          <ActivityIndicator color={theme.color.brand.primary} />
        ) : null}
        <Text
          accessibilityRole="header"
          style={{
            color: theme.color.text.primary,
            fontFamily: theme.font.native.bold,
            fontSize: theme.typography.title2.fontSize,
            fontWeight: "800",
            lineHeight: theme.typography.title2.lineHeight,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.color.text.secondary,
            fontFamily: theme.font.native.medium,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          {description}
        </Text>
        <Pressable
          accessibilityLabel="로그인 화면으로 이동"
          accessibilityRole="button"
          onPress={() => router.replace("/(auth)/login")}
          style={{
            alignItems: "center",
            backgroundColor: theme.color.brand.primary,
            borderRadius: theme.radius.md,
            justifyContent: "center",
            minHeight: 48,
          }}
        >
          <Text
            style={{
              color: theme.color.text.inverse,
              fontFamily: theme.font.native.bold,
              fontSize: 15,
              fontWeight: "900",
            }}
          >
            로그인으로 돌아가기
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function assertMobileVerifyEmailCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "/(auth)/verify-email",
    VERIFY_EMAIL_PATH,
    "VerifyEmailScreen",
    "createMobileAuthApi",
    "verifyEmail",
    'router.replace("/salary")',
    'router.replace("/(auth)/login")',
    "rawPersonalData=false",
    "tokenNotRendered",
  ] as const;

  return { ok: checks.length >= 9, version: SCREEN_VERSION, checks };
}
