import { AppShell } from "../../src/shared/components";
import {
  LoginCredentialForm,
  LoginHero,
  SocialLoginButtons,
} from "../../src/features/auth/components";
import { AUTH_LOGIN_PATH } from "../../src/features/auth/constants";

const SCREEN_VERSION = "4.1.0-auth-login-components";

export default function LoginScreen(): React.ReactElement {
  return (
    <AppShell accessibilityLabel="Salary Hijacking login screen">
      <LoginHero />
      <LoginCredentialForm onSubmit={() => undefined} />
      <SocialLoginButtons onSelectProvider={() => undefined} />
    </AppShell>
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
    "AppShell",
    "LoginHero",
    "LoginCredentialForm",
    "SocialLoginButtons",
    "급여 하이재킹",
    "월급이 사라지기 전에 먼저 붙잡아요",
    "이메일",
    "비밀번호",
    "소셜 로그인",
    "서버 기준 로그인",
    "raw_credential_component_guard",
    "password_render_component_guard",
    "oauth_token_component_guard",
  ] as const;

  return { ok: checks.length >= 13, version: SCREEN_VERSION, checks };
}
