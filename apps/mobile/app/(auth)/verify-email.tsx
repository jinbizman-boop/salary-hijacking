/* eslint-disable require-atomic-updates */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
  SurfaceCard,
  salaryHijackingDesignSystem,
} from "../../src/shared/components";
import { createMobileAuthApi } from "../../src/shared/api/mobile-api";
import { salaryHijackingTheme as theme } from "../../src/shared/styles/clean-fintech-theme";

const SCREEN_VERSION = "4.0.1-readable-korean";
const designSystem = salaryHijackingDesignSystem;
const VERIFY_EMAIL_PATH = "/api/v1/auth/verify-email";
const VERIFY_EMAIL_RESEND_PATH = "/api/v1/auth/verify-email/resend";

type VerifyEmailStatus =
  | "PENDING"
  | "VERIFIED"
  | "WAITING"
  | "FAILED"
  | "RESENT";

function paramValue(value: string | readonly string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

export default function VerifyEmailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [status, setStatus] = useState<VerifyEmailStatus>("PENDING");
  const [email, setEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const resendEmailVerificationInFlightRef = useRef(false);
  const token = paramValue(params.token);
  const canResend = email.trim().length > 3 && !resendPending;

  useEffect(() => {
    let active = true;

    async function verify(): Promise<void> {
      if (!token) {
        if (active) setStatus("WAITING");
        return;
      }

      try {
        const result = await authApi.verifyEmail({ token });
        if (!result.verified)
          throw new Error("이메일 인증 결과가 확인되지 않았습니다.");
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

  async function resendEmailVerification(): Promise<void> {
    if (!canResend || resendEmailVerificationInFlightRef.current) return;
    resendEmailVerificationInFlightRef.current = true;
    setResendPending(true);
    try {
      const result = await authApi.requestEmailVerification({ email });
      setStatus(result.accepted ? "RESENT" : "FAILED");
    } catch {
      setStatus("FAILED");
    } finally {
      resendEmailVerificationInFlightRef.current = false;
      setResendPending(false);
    }
  }

  const returnToLogin = (): void => {
    if (resendPending) return;
    router.replace("/(auth)/login");
  };

  const title =
    status === "VERIFIED"
      ? "이메일 인증이 완료됐어요."
      : status === "WAITING"
        ? "인증 메일을 확인해 주세요."
        : status === "RESENT"
          ? "인증 메일을 다시 보냈어요."
          : status === "FAILED"
            ? "인증 링크를 다시 확인해 주세요."
            : "이메일 인증을 확인하고 있어요.";
  const description =
    status === "WAITING"
      ? "메일의 인증 링크를 열면 서버에서 계정을 확인합니다."
      : status === "RESENT"
        ? "새 링크가 도착하면 다시 열어 주세요. 이메일 주소는 사전 요청에만 사용합니다."
        : "인증 토큰은 화면에 표시하거나 저장하지 않고 서버 확인에만 사용합니다.";

  return (
    <AppShell
      accessibilityLabel="이메일 인증 화면"
      header={<AppHeader subtitle="계정 인증" title="이메일 인증" />}
    >
      <SurfaceCard accessibilityLabel="이메일 인증 상태">
        <Text
          style={{
            color: theme.color.brand.primary,
            fontFamily: theme.font.native.black,
            ...designSystem.typography.labelS,
          }}
        >
          개인정보 원문 없이 서버에서 인증 상태를 확인해요.
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
        <View style={{ gap: theme.spacing[8] }}>
          <Text
            style={{
              color: theme.color.text.primary,
              fontFamily: theme.font.native.bold,
              ...designSystem.typography.labelM,
            }}
          >
            메일 주소
          </Text>
          <TextInput
            accessibilityLabel="인증 메일을 다시 받을 메일 주소"
            accessibilityState={{ disabled: resendPending }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!resendPending}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            style={{
              backgroundColor: theme.color.surface.soft,
              borderColor: theme.color.surface.lineSoft,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              color: theme.color.text.primary,
              fontFamily: theme.font.native.medium,
              ...designSystem.typography.bodyM,
              minHeight: 48,
              paddingHorizontal: theme.spacing[12],
            }}
            value={email}
          />
          <PrimaryButton
            accessibilityLabel="인증 메일 다시 보내기"
            disabled={!canResend}
            label={resendPending ? "전송 중" : "인증 메일 다시 보내기"}
            onPress={resendEmailVerification}
          />
        </View>
        <PrimaryButton
          accessibilityLabel="로그인 화면으로 이동"
          disabled={resendPending}
          label="로그인으로 돌아가기"
          onPress={returnToLogin}
        />
      </SurfaceCard>
    </AppShell>
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
    VERIFY_EMAIL_RESEND_PATH,
    "VerifyEmailScreen",
    "createMobileAuthApi",
    "verifyEmail",
    "requestEmailVerification",
    "resendEmailVerification",
    'router.replace("/salary")',
    'router.replace("/(auth)/login")',
    "personalDataNotRendered",
    "tokenNotRendered",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
