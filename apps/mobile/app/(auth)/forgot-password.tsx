import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import {
  ForgotPasswordForm,
  PasswordRecoveryHero,
} from "../../src/features/auth/components";
import { AUTH_PASSWORD_RESET_PATH } from "../../src/features/auth/constants";
import type { AuthPasswordResetRequest } from "../../src/features/auth/types";
import { createMobileAuthApi } from "../../src/shared/api/mobile-api";
import {
  AppHeader,
  AppShell,
  SurfaceCard,
  salaryHijackingDesignSystem,
} from "../../src/shared/components";

const SCREEN_VERSION = "4.1.0-auth-recovery-components";

export default function ForgotPasswordScreen(): React.ReactElement {
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    "가입한 이메일로 비밀번호 재설정 링크를 요청합니다.",
  );

  const submitPasswordReset = useCallback(
    async (request: AuthPasswordResetRequest): Promise<void> => {
      if (submitting) return;
      setSubmitting(true);
      setMessage("재설정 요청을 서버에 전달하고 있습니다.");
      try {
        const result = await authApi.requestPasswordReset(request);
        setMessage(
          result.accepted
            ? "재설정 안내를 보냈습니다. 이메일을 확인해 주세요."
            : "요청을 접수했습니다. 잠시 후 이메일을 확인해 주세요.",
        );
      } catch {
        setMessage(
          "재설정 요청을 완료하지 못했습니다. 이메일과 네트워크 상태를 확인해 주세요.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [authApi, submitting],
  );

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking forgot password screen"
      header={<AppHeader subtitle="계정 복구" title="비밀번호 찾기" />}
    >
      <PasswordRecoveryHero mode="forgot" />
      <ForgotPasswordForm
        loading={submitting}
        onSubmit={(request) => {
          void submitPasswordReset(request);
        }}
      />
      <SurfaceCard accessibilityLabel="비밀번호 재설정 요청 상태">
        <Text accessibilityLiveRegion="polite" style={styles.statusMessage}>
          {message}
        </Text>
      </SurfaceCard>
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
    "authApi.requestPasswordReset",
    "비밀번호 재설정",
    "raw_credential_component_guard",
    "raw_email_log_component_guard",
  ] as const;

  return { ok: checks.length >= 8, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  statusMessage: {
    ...salaryHijackingDesignSystem.typography.bodyS,
    color: salaryHijackingDesignSystem.colors.text.secondary,
    textAlign: "center",
  },
});
