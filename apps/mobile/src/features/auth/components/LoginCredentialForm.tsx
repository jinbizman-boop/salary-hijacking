import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import type { AuthLoginRequest } from "../types";
import { authVisualColors } from "./AuthVisualFrame";
import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";

const designSystem = salaryHijackingDesignSystem;

export type LoginCredentialFormProps = Readonly<{
  onSubmit: (request: AuthLoginRequest) => void;
  loading?: boolean;
}>;

export function LoginCredentialForm({
  onSubmit,
}: LoginCredentialFormProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (): void => {
    onSubmit({
      email: email.trim(),
      password,
      rememberMe: true,
    });
  };

  return (
    <View accessibilityLabel="로그인 입력" style={styles.form}>
      <TextInput
        accessibilityLabel="아이디"
        allowFontScaling={false}
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        onChangeText={setEmail}
        onSubmitEditing={submit}
        placeholder="아이디"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="next"
        style={styles.input}
        textContentType="username"
        value={email}
      />
      <TextInput
        accessibilityLabel="비밀번호"
        allowFontScaling={false}
        autoCapitalize="none"
        autoComplete="password"
        onChangeText={setPassword}
        onSubmitEditing={submit}
        placeholder="비밀번호"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="done"
        secureTextEntry
        style={styles.input}
        textContentType="password"
        value={password}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    alignSelf: "center",
    maxWidth: 365,
    width: "100%",
  },
  input: {
    backgroundColor: designSystem.colors.surface.default,
    borderColor: authVisualColors.fieldLine,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    color: authVisualColors.ink,
    fontSize: designSystem.typography.bodyL.fontSize,
    fontWeight: designSystem.typography.bodyL.fontWeight,
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[3],
    includeFontPadding: false,
    letterSpacing: designSystem.typography.bodyL.letterSpacing,
    paddingHorizontal: designSystem.spacing[4],
  },
});
