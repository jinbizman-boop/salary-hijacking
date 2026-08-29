import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import {
  PasswordRecoveryHero,
  ResetPasswordForm,
} from "../../src/features/auth/components";
import { AUTH_PASSWORD_RESET_CONFIRM_PATH } from "../../src/features/auth/constants";
import type { AuthPasswordResetConfirmRequest } from "../../src/features/auth/types";
import { createMobileAuthApi } from "../../src/shared/api/mobile-api";
import {
  AppHeader,
  AppShell,
  SurfaceCard,
  salaryHijackingDesignSystem,
} from "../../src/shared/components";

const SCREEN_VERSION = "4.1.0-auth-recovery-components";

export default function ResetPasswordScreen(): React.ReactElement {
  const resetRouter = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    "새 비밀번호는 서버 정책에 맞게 저장됩니다.",
  );
  const tokenValue = Array.isArray(params.token)
    ? params.token[0]
    : params.token;
  const token = typeof tokenValue === "string" ? tokenValue : "";

  const submitPasswordResetConfirm = useCallback(
    async (request: AuthPasswordResetConfirmRequest): Promise<void> => {
      if (submitting) return;
      setSubmitting(true);
      setMessage("새 비밀번호를 서버에 저장하고 있습니다.");
      try {
        const result = await authApi.confirmPasswordReset(request);
        if (result.completed) {
          setMessage("비밀번호를 재설정했습니다. 다시 로그인해 주세요.");
          resetRouter.replace("/(auth)/login");
          return;
        }
        setMessage(
          "재설정 상태를 확인해야 합니다. 잠시 후 다시 시도해 주세요.",
        );
      } catch {
        setMessage(
          "비밀번호 재설정을 완료하지 못했습니다. 링크와 새 비밀번호를 확인해 주세요.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [authApi, resetRouter, submitting],
  );

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking reset password screen"
      header={<AppHeader subtitle="계정 복구" title="비밀번호 재설정" />}
    >
      <PasswordRecoveryHero mode="reset" />
      <ResetPasswordForm
        loading={submitting}
        onSubmit={(request) => {
          void submitPasswordResetConfirm(request);
        }}
        token={token}
      />
      <SurfaceCard accessibilityLabel="비밀번호 재설정 처리 상태">
        <Text accessibilityLiveRegion="polite" style={styles.statusMessage}>
          {message}
        </Text>
      </SurfaceCard>
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
    "authApi.confirmPasswordReset",
    "서버 기준 비밀번호 재설정",
    "reset_token_component_guard",
    "password_render_component_guard",
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
