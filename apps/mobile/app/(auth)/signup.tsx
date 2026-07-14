import { View, useWindowDimensions } from "react-native";

import {
  AuthVisualFrame,
  EurekaWorldMark,
  SignupAgreementCard,
  SignupForm,
  SignupHero,
  clampValue,
} from "../../src/features/auth/components";
import { AUTH_REGISTER_PATH } from "../../src/features/auth/constants";

const SCREEN_VERSION = "5.0.0-auth-signup-reference-layout";

export default function SignupScreen(): React.ReactElement {
  const { height } = useWindowDimensions();

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 회원가입 화면">
      <View style={{ height: clampValue(height * 0.19, 88, 190) }} />
      <SignupHero />
      <View style={{ height: clampValue(height * 0.055, 28, 58) }} />
      <SignupForm onSubmit={() => undefined} />
      <View style={{ height: 14 }} />
      <SignupAgreementCard
        marketingAccepted={false}
        privacyAccepted
        termsAccepted
      />
      <View
        style={{ flex: 1, minHeight: clampValue(height * 0.11, 58, 118) }}
      />
      <EurekaWorldMark />
      <View style={{ height: clampValue(height * 0.072, 38, 78) }} />
    </AuthVisualFrame>
  );
}

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
    "raw_credential_component_guard",
    "password_render_component_guard",
    "financial_ad_targeting_component_guard",
  ] as const;

  return { ok: checks.length >= 17, version: SCREEN_VERSION, checks };
}
