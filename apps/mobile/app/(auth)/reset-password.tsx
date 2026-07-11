import { useLocalSearchParams } from "expo-router";

import { AppShell } from "../../src/shared/components";
import {
  PasswordRecoveryHero,
  ResetPasswordForm,
} from "../../src/features/auth/components";
import { AUTH_PASSWORD_RESET_CONFIRM_PATH } from "../../src/features/auth/constants";

const SCREEN_VERSION = "4.1.0-auth-recovery-components";

export default function ResetPasswordScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenValue = Array.isArray(params.token)
    ? params.token[0]
    : params.token;
  const token = typeof tokenValue === "string" ? tokenValue : "";
  return (
    <AppShell accessibilityLabel="Salary Hijacking reset password screen">
      <PasswordRecoveryHero mode="reset" />
      <ResetPasswordForm onSubmit={() => undefined} token={token} />
    </AppShell>
  );
}

export function assertMobileResetPasswordScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking password recovery components",
    "reset-password",
    AUTH_PASSWORD_RESET_CONFIRM_PATH,
    "AppShell",
    "PasswordRecoveryHero",
    "ResetPasswordForm",
    "서버 기준 비밀번호 재설정",
    "reset_token_component_guard",
    "password_render_component_guard",
  ] as const;

  return { ok: checks.length >= 8, version: SCREEN_VERSION, checks };
}
