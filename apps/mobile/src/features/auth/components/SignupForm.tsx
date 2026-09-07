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
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [serviceAccepted, setServiceAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const requiredConsentMissing =
    !termsAccepted || !privacyAccepted || !serviceAccepted;

  const submit = (): void => {
    if (passwordConfirm && password !== passwordConfirm) return;
    if (!termsAccepted || !privacyAccepted || !serviceAccepted) return;
    onSubmit({
      birthDate: birthDate.trim(),
      email: email.trim(),
      name: name.trim(),
      nickname: nickname.trim(),
      password,
      phoneNumber: phoneNumber.trim(),
      privacyAccepted,
      serviceAccepted,
      termsAccepted,
      marketingAccepted,
    });
  };

  return (
    <View accessibilityLabel="회원가입 입력" style={styles.form}>
      <Text style={styles.sectionTitle}>계정 정보</Text>
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
        accessibilityLabel="이름"
        allowFontScaling={false}
        autoCapitalize="none"
        onChangeText={setName}
        placeholder="이름"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="next"
        style={styles.input}
        textContentType="name"
        value={name}
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
      <View style={styles.twoColumn}>
        <TextInput
          accessibilityLabel="생년월일"
          allowFontScaling={false}
          inputMode="numeric"
          onChangeText={setBirthDate}
          placeholder="YYYY.MM.DD"
          placeholderTextColor={authVisualColors.placeholder}
          returnKeyType="next"
          style={[styles.input, styles.columnInput]}
          value={birthDate}
        />
        <TextInput
          accessibilityLabel="휴대폰 번호"
          allowFontScaling={false}
          inputMode="tel"
          onChangeText={setPhoneNumber}
          placeholder="010.0000.0000"
          placeholderTextColor={authVisualColors.placeholder}
          returnKeyType="next"
          style={[styles.input, styles.columnInput]}
          textContentType="telephoneNumber"
          value={phoneNumber}
        />
      </View>
      <Text style={styles.sectionTitle}>보안</Text>
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
      <TextInput
        accessibilityLabel="비밀번호 확인"
        allowFontScaling={false}
        autoCapitalize="none"
        autoComplete="password-new"
        onChangeText={setPasswordConfirm}
        onSubmitEditing={submit}
        placeholder="비밀번호 확인"
        placeholderTextColor={authVisualColors.placeholder}
        returnKeyType="done"
        secureTextEntry
        style={styles.input}
        textContentType="newPassword"
        value={passwordConfirm}
      />
      <View accessibilityLabel="약관 동의" style={styles.consentBox}>
        <ConsentToggle
          accepted={termsAccepted}
          label="이용약관 필수 동의"
          onPress={() => setTermsAccepted((accepted) => !accepted)}
        />
        <ConsentToggle
          accepted={privacyAccepted}
          label="개인정보 처리방침 필수 동의"
          onPress={() => setPrivacyAccepted((accepted) => !accepted)}
        />
        <ConsentToggle
          accepted={serviceAccepted}
          label="서비스 이용 필수 동의"
          onPress={() => setServiceAccepted((accepted) => !accepted)}
        />
        <ConsentToggle
          accepted={marketingAccepted}
          label="마케팅 정보 선택 동의"
          onPress={() => setMarketingAccepted((accepted) => !accepted)}
        />
      </View>
      <Pressable
        accessibilityLabel="회원가입 완료"
        accessibilityRole="button"
        accessibilityState={{
          disabled: loading || requiredConsentMissing,
        }}
        disabled={loading || requiredConsentMissing}
        onPress={submit}
        unstable_pressDelay={0}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && !loading ? styles.submitPressed : null,
          loading || requiredConsentMissing ? styles.submitDisabled : null,
        ]}
      >
        <Text allowFontScaling={false} style={styles.submitText}>
          {loading ? "가입 중" : "회원가입 완료"}
        </Text>
      </Pressable>
    </View>
  );
}

function ConsentToggle({
  accepted,
  label,
  onPress,
}: Readonly<{
  accepted: boolean;
  label: string;
  onPress: () => void;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
      onPress={onPress}
      style={styles.consentRow}
    >
      <View style={[styles.checkBox, accepted ? styles.checkBoxActive : null]}>
        {accepted ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.consentText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    alignSelf: "center",
    maxWidth: 365,
    gap: designSystem.spacing[3],
    width: "100%",
  },
  checkBox: {
    alignItems: "center",
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.border.strong,
    borderRadius: designSystem.radius.sm,
    borderWidth: 1,
    height: designSystem.spacing[6],
    justifyContent: "center",
    width: designSystem.spacing[6],
  },
  checkBoxActive: {
    backgroundColor: designSystem.colors.brand.primary,
    borderColor: designSystem.colors.brand.primary,
  },
  checkMark: {
    color: designSystem.colors.text.inverse,
    ...designSystem.typography.caption,
  },
  columnInput: {
    flex: 1,
    minWidth: 0,
  },
  consentBox: {
    backgroundColor: designSystem.colors.surface.soft,
    borderColor: designSystem.colors.border.default,
    borderRadius: designSystem.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: designSystem.spacing[1],
    padding: designSystem.spacing[3],
  },
  consentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[2],
    minHeight: designSystem.layout.touchTarget,
  },
  consentText: {
    color: authVisualColors.ink,
    flex: 1,
    ...designSystem.typography.bodyS,
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
  sectionTitle: {
    color: authVisualColors.ink,
    ...designSystem.typography.labelL,
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
  twoColumn: {
    flexDirection: "row",
    gap: designSystem.spacing[2],
  },
});
