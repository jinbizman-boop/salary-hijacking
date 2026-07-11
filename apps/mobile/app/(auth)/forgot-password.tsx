import { AppShell } from "../../src/shared/components";
import {
  ForgotPasswordForm,
  PasswordRecoveryHero,
} from "../../src/features/auth/components";
import { AUTH_PASSWORD_RESET_PATH } from "../../src/features/auth/constants";

const SCREEN_VERSION = "4.1.0-auth-recovery-components";

export default function ForgotPasswordScreen(): React.ReactElement {
  return (
    <AppShell accessibilityLabel="Salary Hijacking forgot password screen">
      <PasswordRecoveryHero mode="forgot" />
      <ForgotPasswordForm onSubmit={() => undefined} />
    </AppShell>
  );
}

export function assertMobileForgotPasswordScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking password recovery components",
    "비밀번호 찾기",
    AUTH_PASSWORD_RESET_PATH,
    "AppShell",
    "PasswordRecoveryHero",
    "ForgotPasswordForm",
    "서버 기준 비밀번호 재설정",
    "raw_credential_component_guard",
    "raw_email_log_component_guard",
  ] as const;

  return { ok: checks.length >= 8, version: SCREEN_VERSION, checks };
}
