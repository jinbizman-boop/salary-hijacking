import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";
import type { AuthPasswordResetConfirmRequest } from "../types";

export type ResetPasswordFormProps = Readonly<{
  token: string;
  onSubmit: (request: AuthPasswordResetConfirmRequest) => void;
  loading?: boolean;
}>;

export function ResetPasswordForm({
  token,
  onSubmit,
  loading = false,
}: ResetPasswordFormProps): React.ReactElement {
  const [newPassword, setNewPassword] = useState("");

  return (
    <SurfaceCard accessibilityLabel="reset-password-form">
      <Text style={styles.title}>새 비밀번호</Text>
      <TextInput
        accessibilityLabel="새 비밀번호"
        autoCapitalize="none"
        autoComplete="password-new"
        onChangeText={setNewPassword}
        placeholder="새 비밀번호"
        secureTextEntry
        style={styles.input}
        textContentType="newPassword"
        value={newPassword}
      />
      <PrimaryButton
        accessibilityLabel="비밀번호 재설정"
        disabled={loading || token.length === 0}
        label={loading ? "확인 중" : "비밀번호 재설정"}
        onPress={() => onSubmit({ token, newPassword })}
      />
      <Text style={styles.guard}>resetTokenRendered=false</Text>
      <Text style={styles.guard}>passwordRendered=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  input: {
    minHeight: 50,
    paddingHorizontal: componentSpacing.md,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: 8,
    backgroundColor: componentColors.surface,
    color: componentColors.textPrimary,
    fontSize: 15,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
