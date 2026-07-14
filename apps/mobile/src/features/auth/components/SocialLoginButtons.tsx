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
import type { AuthSocialProvider } from "../types";
import { TextLink, authVisualColors } from "./AuthVisualFrame";

const SOCIAL_PROVIDERS: readonly {
  readonly backgroundColor: string;
  readonly icon: ImageSourcePropType;
  readonly label: string;
  readonly provider?: AuthSocialProvider;
}[] = [
  {
    backgroundColor: "#03C75A",
    icon: appIconAssets.social.naver,
    label: "네이버 로그인",
    provider: "NAVER",
  },
  {
    backgroundColor: "#FEE500",
    icon: appIconAssets.social.kakao,
    label: "카카오 로그인",
    provider: "KAKAO",
  },
  {
    backgroundColor: "#1877F2",
    icon: appIconAssets.social.facebook,
    label: "페이스북 로그인 준비 중",
  },
  {
    backgroundColor: "#FFFFFF",
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
    gap: 4,
  },
  autoLoginText: {
    color: authVisualColors.ink,
    fontSize: 14,
    fontWeight: "800",
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 20,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#303030",
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
    fontSize: 14,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: 20,
  },
  iconRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
  },
  memberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginTop: 10,
  },
  socialButton: {
    alignItems: "center",
    borderColor: "#E5E7EB",
    borderRadius: 6,
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
