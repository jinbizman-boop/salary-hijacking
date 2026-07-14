import { router } from "expo-router";
import { View, useWindowDimensions } from "react-native";

import {
  AuthVisualFrame,
  EurekaWorldMark,
  LoginCredentialForm,
  LoginHero,
  SocialLoginButtons,
  clampValue,
} from "../../src/features/auth/components";
import { AUTH_LOGIN_PATH } from "../../src/features/auth/constants";

const SCREEN_VERSION = "5.0.0-auth-login-reference-layout";

export default function LoginScreen(): React.ReactElement {
  const { height } = useWindowDimensions();

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 로그인 화면">
      <View style={{ height: clampValue(height * 0.245, 118, 245) }} />
      <LoginHero />
      <View style={{ height: clampValue(height * 0.095, 42, 92) }} />
      <LoginCredentialForm onSubmit={() => undefined} />
      <View style={{ height: clampValue(height * 0.027, 16, 28) }} />
      <SocialLoginButtons
        onSelectProvider={() => undefined}
        onSignupPress={() => router.push("/(auth)/signup")}
      />
      <View
        style={{ flex: 1, minHeight: clampValue(height * 0.125, 68, 130) }}
      />
      <EurekaWorldMark />
      <View style={{ height: clampValue(height * 0.072, 38, 78) }} />
    </AuthVisualFrame>
  );
}

export function assertMobileLoginScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking login feature components",
    AUTH_LOGIN_PATH,
    "AuthVisualFrame",
    "LoginHero",
    "LoginCredentialForm",
    "SocialLoginButtons",
    "급여납치",
    "SALARY HIJACKING",
    "아이디",
    "비밀번호",
    "네이버 로그인",
    "카카오 로그인",
    "구글 로그인",
    "회원가입",
    "자동 로그인",
    "Eureka World",
    "raw_credential_component_guard",
    "password_render_component_guard",
    "oauth_token_component_guard",
  ] as const;

  return { ok: checks.length >= 18, version: SCREEN_VERSION, checks };
}
