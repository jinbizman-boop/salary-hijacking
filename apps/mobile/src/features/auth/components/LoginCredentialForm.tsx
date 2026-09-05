import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AuthLoginRequest } from "../types";
import { TextLink, authVisualColors } from "./AuthVisualFrame";
import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";
import {
  markReleaseInteractionPerf,
  markReleasePerf,
} from "../../../shared/performance/release-perf";

const designSystem = salaryHijackingDesignSystem;
let loginInteractiveMarkerEmitted = false;

export type LoginCredentialFormProps = Readonly<{
  onSubmit: (request: AuthLoginRequest) => void;
  onForgotPasswordPress?: () => void;
  loading?: boolean;
  keyboardCompact?: boolean;
}>;

export function LoginCredentialForm({
  keyboardCompact = false,
  loading = false,
  onForgotPasswordPress,
  onSubmit,
}: LoginCredentialFormProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  if (!loginInteractiveMarkerEmitted) {
    loginInteractiveMarkerEmitted = true;
    markReleasePerf("route.login.interactive");
  }

  const submit = (): void => {
    onSubmit({
      email: email.trim(),
      password,
      rememberMe,
    });
  };

  return (
    <View accessibilityLabel="로그인 입력" style={styles.form}>
      <Text
        allowFontScaling={false}
        style={[styles.title, keyboardCompact ? styles.titleKeyboardHidden : null]}
      >
        로그인
      </Text>
      <Text
        allowFontScaling={false}
        style={[styles.label, keyboardCompact ? styles.labelCompact : null]}
      >
        아이디
      </Text>
      <TextInput
        accessibilityLabel="아이디"
        allowFontScaling={false}
        autoCapitalize="none"
        autoComplete="email"
        editable={!loading}
        inputMode="email"
        onChangeText={setEmail}
        onSubmitEditing={submit}
        placeholder="아이디를 입력하세요"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="next"
        style={[styles.input, keyboardCompact ? styles.inputCompact : null]}
        textContentType="username"
        value={email}
      />
      <Text
        allowFontScaling={false}
        style={[styles.label, keyboardCompact ? styles.labelCompact : null]}
      >
        비밀번호
      </Text>
      <View
        style={[
          styles.passwordField,
          keyboardCompact ? styles.passwordFieldCompact : null,
        ]}
      >
        <TextInput
          accessibilityLabel="비밀번호"
          allowFontScaling={false}
          autoCapitalize="none"
          autoComplete="password"
          editable={!loading}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          placeholder="비밀번호를 입력하세요"
          placeholderTextColor={authVisualColors.placeholder}
          returnKeyType="done"
          secureTextEntry={!passwordVisible}
          style={[
            styles.passwordInput,
            keyboardCompact ? styles.passwordInputCompact : null,
          ]}
          textContentType="password"
          value={password}
        />
        <Pressable
          accessibilityLabel={
            passwordVisible ? "비밀번호 숨기기" : "비밀번호 보기"
          }
          accessibilityRole="button"
          hitSlop={designSystem.spacing[2]}
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={styles.visibilityButton}
        >
          <Text allowFontScaling={false} style={styles.visibilityText}>
            {passwordVisible ? "숨김" : "보기"}
          </Text>
        </Pressable>
      </View>
      <View
        style={[styles.optionRow, keyboardCompact ? styles.optionRowCompact : null]}
      >
        <Pressable
          accessibilityLabel="자동 로그인"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
          hitSlop={designSystem.spacing[2]}
          onPress={() => setRememberMe((value) => !value)}
          style={styles.autoLogin}
        >
          <View style={styles.checkbox}>
            {rememberMe ? <View style={styles.checkboxFill} /> : null}
          </View>
          <Text allowFontScaling={false} style={styles.optionText}>
            자동 로그인
          </Text>
        </Pressable>
        <TextLink label="비밀번호 찾기" onPress={onForgotPasswordPress} />
      </View>
      <Pressable
        accessibilityLabel="로그인"
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
        disabled={loading}
        onPressIn={(event) =>
          markReleaseInteractionPerf("interaction.login.submit.press", event)
        }
        onPress={submit}
        unstable_pressDelay={0}
        style={({ pressed }) => [
          styles.submitButton,
          keyboardCompact ? styles.submitButtonCompact : null,
          pressed && !loading ? styles.submitPressed : null,
          loading ? styles.submitDisabled : null,
        ]}
      >
        <Text allowFontScaling={false} style={styles.submitText}>
          {loading ? "로그인 중" : "로그인"}
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
  autoLogin: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[2],
    minHeight: designSystem.layout.touchTarget,
    paddingRight: designSystem.spacing[2],
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.border.strong,
    borderRadius: designSystem.radius.sm,
    borderWidth: 1.5,
    height: designSystem.spacing[6],
    justifyContent: "center",
    width: designSystem.spacing[6],
  },
  checkboxFill: {
    backgroundColor: authVisualColors.brandGreen,
    borderRadius: designSystem.radius.sm - 2,
    height: designSystem.spacing[4],
    width: designSystem.spacing[4],
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
  inputCompact: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
  },
  label: {
    color: authVisualColors.ink,
    ...designSystem.typography.labelL,
    marginBottom: designSystem.spacing[2],
    marginTop: designSystem.spacing[4],
  },
  labelCompact: {
    marginBottom: designSystem.spacing[1],
    marginTop: designSystem.spacing[2],
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: designSystem.spacing[4],
  },
  optionRowCompact: {
    marginTop: designSystem.spacing[2],
  },
  optionText: {
    color: authVisualColors.ink,
    ...designSystem.typography.bodyS,
  },
  passwordField: {
    alignItems: "center",
    backgroundColor: designSystem.colors.surface.default,
    borderColor: authVisualColors.fieldLine,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[3],
    paddingHorizontal: designSystem.spacing[4],
  },
  passwordFieldCompact: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
  },
  passwordInput: {
    color: authVisualColors.ink,
    flex: 1,
    ...designSystem.typography.bodyL,
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[3],
    padding: designSystem.spacing[0],
  },
  passwordInputCompact: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: authVisualColors.brandGreen,
    borderRadius: designSystem.radius.md,
    justifyContent: "center",
    marginTop: designSystem.spacing[5],
    minHeight: 56,
    ...designSystem.elevation.low,
  },
  submitButtonCompact: {
    marginTop: designSystem.spacing[3],
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
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
  title: {
    color: authVisualColors.ink,
    ...designSystem.typography.display,
    marginBottom: designSystem.spacing[1],
  },
  titleKeyboardHidden: {
    display: "none",
  },
  visibilityButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget,
    minWidth: designSystem.layout.touchTarget,
  },
  visibilityText: {
    color: authVisualColors.muted,
    ...designSystem.typography.labelS,
  },
});
