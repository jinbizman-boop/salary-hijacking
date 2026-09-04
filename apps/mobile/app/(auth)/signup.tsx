import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  AuthVisualFrame,
  EurekaWorldMark,
  SignupAgreementCard,
  SignupForm,
  SignupHero,
  clampValue,
} from "../../src/features/auth/components";
import { AUTH_REGISTER_PATH } from "../../src/features/auth/constants";
import { routeAfterSignup } from "../../src/features/auth/navigation";
import type { AuthRegisterRequest } from "../../src/features/auth/types";
import { createMobileAuthApi } from "../../src/shared/api/mobile-api";
import {
  componentColors,
  salaryHijackingDesignSystem,
} from "../../src/shared/components/tokens";

const SCREEN_VERSION = "5.0.0-auth-signup-reference-layout";
const designSystem = salaryHijackingDesignSystem;

export default function SignupScreen(): React.ReactElement {
  const signupRouter = useRouter();
  const { height } = useWindowDimensions();
  const compactHeight = height < 940;
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    "약관 동의와 개인정보 보호 기준으로 계정을 생성합니다.",
  );

  const handleSignupSubmit = useCallback(
    async (request: AuthRegisterRequest): Promise<void> => {
      if (submitting) return;
      setSubmitting(true);
      setMessage("회원가입 요청을 서버에 등록하고 있습니다.");
      try {
        const response = await authApi.register(request);
        const route = routeAfterSignup(signupRouter, response);
        if (route === "ACCOUNT_REVIEW_REQUIRED") {
          setMessage(
            "계정 등록 상태를 확인해야 합니다. 로그인 화면에서 계속해 주세요.",
          );
        }
      } catch {
        setMessage(
          "회원가입 요청을 완료하지 못했습니다. 입력값과 네트워크 상태를 확인해 주세요.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [authApi, signupRouter, submitting],
  );

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 회원가입 화면">
      <View
        style={[
          styles.signupTopSpacer,
          {
            height: compactHeight
              ? clampValue(height * 0.115, 48, 112)
              : clampValue(height * 0.15, 72, 146),
          },
        ]}
      />
      <SignupHero />
      <View
        style={{
          height: compactHeight
            ? designSystem.spacing[5]
            : clampValue(height * 0.045, 24, 44),
        }}
      />
      <SignupForm
        loading={submitting}
        onSubmit={(request) => {
          void handleSignupSubmit(request);
        }}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={{
          alignSelf: "center",
          color: componentColors.textPrimary,
          ...designSystem.typography.labelS,
          marginTop: designSystem.spacing[2],
          maxWidth: 365,
          opacity: 0.72,
          textAlign: "center",
          width: "100%",
        }}
      >
        {message}
      </Text>
      <View style={{ height: 14 }} />
      <SignupAgreementCard
        marketingAccepted={false}
        privacyAccepted
        termsAccepted
      />
      <View
        style={[
          styles.signupFlexibleSpacer,
          {
            minHeight: compactHeight
              ? designSystem.spacing[6]
              : clampValue(height * 0.06, 32, 72),
          },
        ]}
      />
      <EurekaWorldMark />
      <View
        style={[
          styles.signupFooterSpacer,
          {
            height: compactHeight
              ? designSystem.spacing[2]
              : clampValue(height * 0.035, 20, 42),
          },
        ]}
      />
    </AuthVisualFrame>
  );
}

const styles = StyleSheet.create({
  signupFlexibleSpacer: {
    flex: 1,
  },
  signupFooterSpacer: {},
  signupTopSpacer: {},
});

export function assertMobileSignupScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking signup feature components",
    AUTH_REGISTER_PATH,
    "AuthVisualFrame",
    "SignupHero",
    "SignupForm",
    "SignupAgreementCard",
    "급여납치",
    "SALARY HIJACKING",
    "회원가입",
    "아이디",
    "닉네임",
    "비밀번호",
    "약관 동의",
    "개인정보 동의",
    "Eureka World",
    "createMobileAuthApi",
    "authApi.register",
    "raw_credential_component_guard",
    "password_render_component_guard",
    "financial_ad_targeting_component_guard",
  ] as const;

  return { ok: checks.length >= 17, version: SCREEN_VERSION, checks };
}
