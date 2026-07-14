import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import type { AuthRegisterRequest } from "../types";
import { authVisualColors } from "./AuthVisualFrame";

export type SignupFormProps = Readonly<{
  onSubmit: (request: AuthRegisterRequest) => void;
  loading?: boolean;
}>;

export function SignupForm({ onSubmit }: SignupFormProps): React.ReactElement {
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
        placeholderTextColor="#D6D9DC"
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
        placeholderTextColor="#D6D9DC"
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
        placeholderTextColor="#D6D9DC"
        returnKeyType="done"
        secureTextEntry
        style={styles.input}
        textContentType="newPassword"
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
