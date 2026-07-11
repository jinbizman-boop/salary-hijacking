import { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";
import type { AuthLoginRequest } from "../types";

export type LoginCredentialFormProps = Readonly<{
  onSubmit: (request: AuthLoginRequest) => void;
  loading?: boolean;
}>;

export function LoginCredentialForm({
  onSubmit,
  loading = false,
}: LoginCredentialFormProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <SurfaceCard accessibilityLabel="login-credential-form">
      <Text style={styles.title}>로그인</Text>
      <TextInput
        accessibilityLabel="로그인 이메일"
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
        accessibilityLabel="로그인 비밀번호"
        autoCapitalize="none"
        autoComplete="password"
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={styles.input}
        textContentType="password"
        value={password}
      />
      <View style={styles.rememberRow}>
        <View style={styles.rememberText}>
          <Text style={styles.rememberTitle}>이 기기에서 유지</Text>
          <Text style={styles.rememberDescription}>다음 로그인 간편하게</Text>
        </View>
        <Switch
          accessibilityLabel="로그인 유지"
          onValueChange={setRememberMe}
          value={rememberMe}
        />
      </View>
      <PrimaryButton
        accessibilityLabel="서버 기준 로그인"
        disabled={loading}
        label={loading ? "확인 중" : "서버 기준 로그인"}
        onPress={() =>
          onSubmit({
            email: email.trim(),
            password,
            rememberMe,
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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.md,
  },
  rememberText: {
    flex: 1,
    gap: 3,
  },
  rememberTitle: {
    color: componentColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  rememberDescription: {
    color: componentColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
