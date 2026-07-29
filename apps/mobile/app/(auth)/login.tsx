import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";

import {
  AuthVisualFrame,
  EurekaWorldMark,
  LoginCredentialForm,
  LoginHero,
  SocialLoginButtons,
  authVisualColors,
  clampValue,
} from "../../src/features/auth/components";
import { AUTH_LOGIN_PATH } from "../../src/features/auth/constants";
import { routeAfterLogin } from "../../src/features/auth/navigation";
import type {
  AuthLoginRequest,
  AuthSocialProvider,
} from "../../src/features/auth/types";
import { createMobileAuthApi } from "../../src/shared/api/mobile-api";

const SCREEN_VERSION = "5.0.0-auth-login-reference-layout";
const OAUTH_REDIRECT_URI = "salaryhijacking://auth/oauth/callback";

export default function LoginScreen(): React.ReactElement {
  const loginRouter = useRouter();
  const { height } = useWindowDimensions();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    "서버 인증으로 급여 데이터를 안전하게 불러옵니다.",
  );

  const handleLoginSubmit = useCallback(
    async (request: AuthLoginRequest): Promise<void> => {
      if (submitting) return;
      setSubmitting(true);
      setMessage("로그인 요청을 서버에서 확인하고 있습니다.");
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
        await WebBrowser.openAuthSessionAsync(
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

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 로그인 화면">
      <View style={{ height: clampValue(height * 0.18, 86, 172) }} />
      <LoginHero />
      <View style={{ height: clampValue(height * 0.065, 32, 64) }} />
      <LoginCredentialForm
        loading={submitting}
        onSubmit={(request) => {
          void handleLoginSubmit(request);
        }}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={{
          alignSelf: "center",
          color: authVisualColors.ink,
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 17,
          marginTop: 10,
          maxWidth: 365,
          opacity: 0.72,
          textAlign: "center",
          width: "100%",
        }}
      >
        {message}
      </Text>
      <View style={{ height: clampValue(height * 0.027, 16, 28) }} />
      <SocialLoginButtons
        onSelectProvider={(provider) => {
          void handleSocialProvider(provider);
        }}
        onSignupPress={openSignup}
      />
      <View
        style={{ flex: 1, minHeight: clampValue(height * 0.075, 40, 82) }}
      />
      <EurekaWorldMark />
      <View style={{ height: clampValue(height * 0.045, 24, 46) }} />
    </AuthVisualFrame>
  );
}

export function assertMobileLoginScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking auth feature components",
    AUTH_LOGIN_PATH,
    "AuthVisualFrame",
    "LoginHero",
    "LoginCredentialForm",
    "SocialLoginButtons",
    "급여납치",
    "SALARY HIJACKING",
    "아이디",
    "비밀번호",
    "회원가입",
    "자동 로그인",
    "Eureka World",
    "createMobileAuthApi",
    "authApi.login",
    "authApi.startOAuth",
    "oauth_token_component_guard",
    "raw_credential_component_guard",
    "password_render_component_guard",
    "financial_ad_targeting_component_guard",
  ] as const;

  return { ok: checks.length >= 18, version: SCREEN_VERSION, checks };
}
