import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";
import type { AuthRegisterRequest } from "../types";

export type SignupFormProps = Readonly<{
  onSubmit: (request: AuthRegisterRequest) => void;
  loading?: boolean;
}>;

export function SignupForm({
  onSubmit,
  loading = false,
}: SignupFormProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SurfaceCard accessibilityLabel="signup-form">
      <Text style={styles.title}>계정 만들기</Text>
      <TextInput
        accessibilityLabel="가입 이메일"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        onChangeText={setEmail}
        placeholder="email@example.com"
        style={styles.input}
        textContentType="username"
        value={email}
      />
      <TextInput
        accessibilityLabel="닉네임"
        autoCapitalize="none"
        onChangeText={setNickname}
        placeholder="닉네임"
        style={styles.input}
        textContentType="nickname"
        value={nickname}
      />
      <TextInput
        accessibilityLabel="가입 비밀번호"
        autoCapitalize="none"
        autoComplete="password-new"
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={styles.input}
        textContentType="newPassword"
        value={password}
      />
      <PrimaryButton
        accessibilityLabel="서버 기준 가입"
        disabled={loading}
        label={loading ? "확인 중" : "서버 기준 가입"}
        onPress={() =>
          onSubmit({
            email: email.trim(),
            nickname: nickname.trim(),
            password,
            privacyAccepted: true,
            termsAccepted: true,
            marketingAccepted: false,
          })
        }
      />
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
