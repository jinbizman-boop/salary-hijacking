import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { appIconAssets } from "../../../shared/assets/icons";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { AuthSocialProvider } from "../types";
import { TextLink, authVisualColors } from "./AuthVisualFrame";

const typography = salaryHijackingDesignSystem.typography;

const SOCIAL_PROVIDERS: readonly {
  readonly backgroundColor: string;
  readonly icon: ImageSourcePropType;
  readonly label: string;
  readonly provider?: AuthSocialProvider;
}[] = [
  {
    backgroundColor: salaryHijackingDesignSystem.providerBrand.naver,
    icon: appIconAssets.social.naver,
    label: "네이버 로그인",
    provider: "NAVER",
  },
  {
    backgroundColor: salaryHijackingDesignSystem.providerBrand.kakao,
    icon: appIconAssets.social.kakao,
    label: "카카오 로그인",
    provider: "KAKAO",
  },
  {
    backgroundColor: salaryHijackingDesignSystem.providerBrand.facebook,
    icon: appIconAssets.social.facebook,
    label: "페이스북 로그인 준비 중",
  },
  {
    backgroundColor: salaryHijackingDesignSystem.providerBrand.google,
    icon: appIconAssets.social.google,
    label: "구글 로그인",
    provider: "GOOGLE",
  },
];

export type SocialLoginButtonsProps = Readonly<{
  onSelectProvider: (provider: AuthSocialProvider) => void;
  onSignupPress?: () => void;
}>;

export function SocialLoginButtons({
  onSelectProvider,
  onSignupPress,
}: SocialLoginButtonsProps): React.ReactElement {
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <View accessibilityLabel="소셜 로그인" style={styles.wrap}>
      <View style={styles.iconRow}>
        {SOCIAL_PROVIDERS.map((provider) => (
          <Pressable
            accessibilityLabel={provider.label}
            accessibilityRole="button"
            hitSlop={8}
            key={provider.provider ?? provider.label}
            onPress={() => {
              if (provider.provider) onSelectProvider(provider.provider);
            }}
            style={[
              styles.socialButton,
              { backgroundColor: provider.backgroundColor },
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={provider.icon}
              style={styles.socialIcon}
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.memberRow}>
        <TextLink label="회원가입" onPress={onSignupPress} />
        <Text allowFontScaling={false} style={styles.divider}>
          |
        </Text>
        <Pressable
          accessibilityLabel="자동 로그인"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
          hitSlop={10}
          onPress={() => setRememberMe((value) => !value)}
          style={styles.autoLogin}
        >
          <View style={styles.checkbox}>
            {rememberMe ? <View style={styles.checkboxFill} /> : null}
          </View>
          <Text allowFontScaling={false} style={styles.autoLoginText}>
            자동 로그인
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  autoLogin: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.xs,
  },
  autoLoginText: {
    color: authVisualColors.ink,
    fontSize: typography.bodyS.fontSize,
    fontWeight: typography.bodyS.fontWeight,
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: typography.bodyS.lineHeight,
  },
  checkbox: {
    alignItems: "center",
    borderColor: componentColors.textPrimary,
    borderWidth: 1,
    height: 14,
    justifyContent: "center",
    width: 14,
  },
  checkboxFill: {
    backgroundColor: authVisualColors.brandGreen,
    height: 8,
    width: 8,
  },
  divider: {
    color: authVisualColors.ink,
    fontSize: typography.bodyS.fontSize,
    fontWeight: typography.bodyS.fontWeight,
    includeFontPadding: false,
    lineHeight: typography.bodyS.lineHeight,
  },
  iconRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.sm,
    justifyContent: "center",
  },
  memberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.xs,
    justifyContent: "center",
    marginTop: componentSpacing.sm,
  },
  socialButton: {
    alignItems: "center",
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42,
  },
  socialIcon: {
    height: 30,
    width: 30,
  },
  wrap: {
    alignItems: "center",
  },
});
