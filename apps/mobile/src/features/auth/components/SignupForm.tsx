import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AuthRegisterRequest } from "../types";
import { authVisualColors } from "./AuthVisualFrame";
import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";

const designSystem = salaryHijackingDesignSystem;

export type SignupFormProps = Readonly<{
  onSubmit: (request: AuthRegisterRequest) => void;
  loading?: boolean;
}>;

export function SignupForm({
  loading = false,
  onSubmit,
}: SignupFormProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  const submit = (): void => {
    onSubmit({
      email: email.trim(),
      nickname: nickname.trim(),
      password,
      privacyAccepted: true,
      termsAccepted: true,
      marketingAccepted: false,
    });
  };

  return (
    <View accessibilityLabel="회원가입 입력" style={styles.form}>
      <TextInput
        accessibilityLabel="아이디"
        allowFontScaling={false}
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        onChangeText={setEmail}
        placeholder="아이디"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="next"
        style={styles.input}
        textContentType="username"
        value={email}
      />
      <TextInput
        accessibilityLabel="닉네임"
        allowFontScaling={false}
        autoCapitalize="none"
        onChangeText={setNickname}
        placeholder="닉네임"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="next"
        style={styles.input}
        textContentType="nickname"
        value={nickname}
      />
      <TextInput
        accessibilityLabel="비밀번호"
        allowFontScaling={false}
        autoCapitalize="none"
        autoComplete="password-new"
        onChangeText={setPassword}
        onSubmitEditing={submit}
        placeholder="비밀번호"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="done"
        secureTextEntry
        style={styles.input}
        textContentType="newPassword"
        value={password}
      />
      <Pressable
        accessibilityLabel="회원가입 완료"
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
        disabled={loading}
        onPress={submit}
        unstable_pressDelay={0}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && !loading ? styles.submitPressed : null,
          loading ? styles.submitDisabled : null,
        ]}
      >
        <Text allowFontScaling={false} style={styles.submitText}>
          {loading ? "가입 중" : "회원가입 완료"}
        </Text>
      </Pressable>
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
  submitButton: {
    alignItems: "center",
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.radius.md,
    justifyContent: "center",
    marginTop: designSystem.spacing[4],
    minHeight: 56,
    ...designSystem.elevation.low,
  },
  submitDisabled: {
    backgroundColor: designSystem.colors.text.disabled,
  },
  submitPressed: {
    backgroundColor: designSystem.colors.brand.primaryPressed,
  },
  submitText: {
    color: designSystem.colors.text.inverse,
    ...designSystem.typography.labelL,
  },
});
