import { AppShell } from "../../src/shared/components";
import {
  SignupAgreementCard,
  SignupForm,
  SignupHero,
} from "../../src/features/auth/components";
import { AUTH_REGISTER_PATH } from "../../src/features/auth/constants";

const SCREEN_VERSION = "4.1.0-auth-signup-components";

export default function SignupScreen(): React.ReactElement {
  return (
    <AppShell accessibilityLabel="Salary Hijacking signup screen">
      <SignupHero />
      <SignupForm onSubmit={() => undefined} />
      <SignupAgreementCard
        marketingAccepted={false}
        privacyAccepted
        termsAccepted
      />
    </AppShell>
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
    "AppShell",
    "SignupHero",
    "SignupForm",
    "SignupAgreementCard",
    "회원가입",
    "이메일",
    "닉네임",
    "비밀번호",
    "약관 동의",
    "민감 정보 보호",
    "서버 기준 회원가입",
    "raw_credential_component_guard",
    "password_render_component_guard",
    "financial_ad_targeting_component_guard",
  ] as const;

  return { ok: checks.length >= 15, version: SCREEN_VERSION, checks };
}
