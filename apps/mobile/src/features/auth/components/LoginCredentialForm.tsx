import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import type { AuthLoginRequest } from "../types";
import { authVisualColors } from "./AuthVisualFrame";

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
        placeholderTextColor="#D6D9DC"
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
        placeholderTextColor="#D6D9DC"
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
    backgroundColor: "#FFFFFF",
    borderColor: authVisualColors.fieldLine,
    borderRadius: 0,
    borderWidth: 1,
    color: authVisualColors.ink,
    fontSize: 17,
    fontWeight: "700",
    height: 55,
    includeFontPadding: false,
    letterSpacing: 0,
    paddingHorizontal: 17,
  },
});
