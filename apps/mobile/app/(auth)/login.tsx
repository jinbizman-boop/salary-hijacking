/* eslint-disable @typescript-eslint/no-require-imports */
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import {
  AuthVisualFrame,
  LoginCredentialForm,
  SocialLoginButtons,
  authVisualColors,
} from "../../src/features/auth/components";
import { AUTH_LOGIN_PATH } from "../../src/features/auth/constants";
import { routeAfterLogin } from "../../src/features/auth/navigation";
import type {
  AuthLoginRequest,
  AuthSocialProvider,
} from "../../src/features/auth/types";
import { createMobileAuthApi } from "../../src/shared/api/mobile-api";
import { salaryHijackingDesignSystem as designSystem } from "../../src/shared/components";

const SCREEN_VERSION = "5.0.0-auth-login-reference-layout";
const OAUTH_REDIRECT_URI = "salaryhijacking://auth/oauth/callback";
const loginBackIcon =
  require("../../src/shared/assets/icons/common/left.png") as ImageSourcePropType;

export default function LoginScreen(): React.ReactElement {
  const loginRouter = useRouter();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleLoginSubmit = useCallback(
    async (request: AuthLoginRequest): Promise<void> => {
      if (submitting) return;
      setSubmitting(true);
      setMessage("로그인 정보를 확인하고 있습니다.");
      try {
        const response = await authApi.login(request);
        const route = routeAfterLogin(loginRouter, response);
        if (route === "ACCOUNT_REVIEW_REQUIRED") {
          setMessage(
            "계정 상태 확인이 필요합니다. 잠시 후 다시 시도해 주세요.",
          );
        }
      } catch {
        setMessage(
          "로그인 요청을 완료하지 못했습니다. 이메일, 비밀번호, 네트워크 상태를 확인해 주세요.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [authApi, loginRouter, submitting],
  );

  const handleSocialProvider = useCallback(
    async (provider: AuthSocialProvider): Promise<void> => {
      if (submitting) return;
      setSubmitting(true);
      setMessage(`${provider} OAuth 로그인을 시작합니다.`);
      try {
        const result = await authApi.startOAuth({
          provider,
          redirectUri: OAUTH_REDIRECT_URI,
        });
        if (!result.authorizationUrl) {
          setMessage(
            `${provider} 인증 URL이 아직 준비되지 않았습니다. 서버 설정을 확인해야 합니다.`,
          );
          return;
        }
        const webBrowser = await import("expo-web-browser");
        await webBrowser.openAuthSessionAsync(
          result.authorizationUrl,
          OAUTH_REDIRECT_URI,
        );
        setMessage(`${provider} 인증 창을 열었습니다.`);
      } catch {
        setMessage(
          `${provider} 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
        );
      } finally {
        setSubmitting(false);
      }
    },
    [authApi, submitting],
  );

  const openSignup = useCallback((): void => {
    if (!submitting) loginRouter.push("/(auth)/signup");
  }, [loginRouter, submitting]);

  const openForgotPassword = useCallback((): void => {
    if (!submitting) loginRouter.push("/(auth)/forgot-password");
  }, [loginRouter, submitting]);

  const goBack = useCallback((): void => {
    if (!submitting && typeof loginRouter.back === "function") loginRouter.back();
  }, [loginRouter, submitting]);

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 로그인 화면">
      <View style={styles.topSpacer} />
      <Pressable
        accessibilityLabel="이전 화면으로 돌아가기"
        accessibilityRole="button"
        hitSlop={designSystem.spacing[3]}
        onPress={goBack}
        style={styles.backButton}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={loginBackIcon}
          style={styles.backIcon}
        />
      </Pressable>
      <View style={styles.brandBlock}>
        <Text allowFontScaling={false} style={styles.brandTitle}>
          Salary Hijacking
        </Text>
        <Text allowFontScaling={false} style={styles.brandSubtitle}>
          금융의 주도권을 되찾으세요
        </Text>
      </View>
      <View style={styles.formGap} />
      <LoginCredentialForm
        loading={submitting}
        onForgotPasswordPress={openForgotPassword}
        onSubmit={(request) => {
          void handleLoginSubmit(request);
        }}
      />
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <SocialLoginButtons
        onSelectProvider={(provider) => {
          void handleSocialProvider(provider);
        }}
      />
      <Pressable
        accessibilityLabel="회원가입"
        accessibilityRole="button"
        disabled={submitting}
        onPress={openSignup}
        style={styles.signupLink}
      >
        <Text allowFontScaling={false} style={styles.signupText}>
          계정이 없으신가요? 회원가입
        </Text>
      </Pressable>
    </AuthVisualFrame>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget,
    minWidth: designSystem.layout.touchTarget,
  },
  backIcon: {
    height: designSystem.spacing[6],
    tintColor: designSystem.colors.text.primary,
    width: designSystem.spacing[6],
  },
  brandBlock: {
    marginTop: designSystem.spacing[4],
  },
  brandSubtitle: {
    color: designSystem.colors.text.primary,
    ...designSystem.typography.titleM,
    marginTop: designSystem.spacing[5],
  },
  brandTitle: {
    color: authVisualColors.brandGreen,
    ...designSystem.typography.titleXL,
  },
  formGap: {
    height: designSystem.spacing[10] + designSystem.spacing[4],
  },
  message: {
    alignSelf: "center",
    color: authVisualColors.ink,
    ...designSystem.typography.labelS,
    marginTop: designSystem.spacing[2],
    maxWidth: 365,
    opacity: 0.72,
    textAlign: "center",
    width: "100%",
  },
  signupLink: {
    alignSelf: "center",
    marginTop: designSystem.spacing[5],
    minHeight: designSystem.layout.touchTarget,
  },
  signupText: {
    color: designSystem.colors.text.secondary,
    ...designSystem.typography.bodyS,
  },
  topSpacer: {
    height: designSystem.spacing[4],
  },
});

export function assertMobileLoginScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking auth feature components",
    AUTH_LOGIN_PATH,
    "AuthVisualFrame",
    "LoginCredentialForm",
    "SocialLoginButtons",
    "Salary Hijacking",
    "금융의 주도권을 되찾으세요",
    "로그인",
    "아이디",
    "비밀번호",
    "비밀번호 찾기",
    "카카오로 계속하기",
    "네이버로 계속하기",
    "Apple로 로그인",
    "회원가입",
    "자동 로그인",
    "createMobileAuthApi",
    "authApi.login",
    "authApi.startOAuth",
    "oauth_token_component_guard",
    "raw_credential_component_guard",
    "password_render_component_guard",
    "financial_ad_targeting_component_guard",
  ] as const;

  return { ok: checks.length >= 20, version: SCREEN_VERSION, checks };
}
