import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
  componentRadius,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { AuthPasswordResetRequest } from "../types";

export type ForgotPasswordFormProps = Readonly<{
  onSubmit: (request: AuthPasswordResetRequest) => void;
  loading?: boolean;
}>;

export function ForgotPasswordForm({
  onSubmit,
  loading = false,
}: ForgotPasswordFormProps): React.ReactElement {
  const [email, setEmail] = useState("");

  return (
    <SurfaceCard accessibilityLabel="forgot-password-form">
      <Text style={styles.title}>이메일 확인</Text>
      <TextInput
        accessibilityLabel="재설정 이메일"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        onChangeText={setEmail}
        placeholder="email@example.com"
        style={styles.input}
        textContentType="username"
        value={email}
      />
      <PrimaryButton
        accessibilityLabel="재설정 링크 받기"
        disabled={loading}
        label={loading ? "확인 중" : "재설정 링크 받기"}
        onPress={() => onSubmit({ email: email.trim() })}
      />
      <Text style={styles.guard}>이메일 원문은 로그에 남기지 않아요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.amountM,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: componentSpacing.md,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surface,
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.bodyM,
  },
  guard: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
});
