import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components/tokens";
import type { AuthSocialProvider } from "../types";
import { authVisualColors } from "./AuthVisualFrame";

const typography = salaryHijackingDesignSystem.typography;
const designSystem = salaryHijackingDesignSystem;

const SOCIAL_PROVIDERS: readonly {
  readonly backgroundColor: string;
  readonly foregroundColor: string;
  readonly label: string;
  readonly provider: AuthSocialProvider;
  readonly shortLabel: string;
}[] = [
  {
    backgroundColor: salaryHijackingDesignSystem.providerBrand.kakao,
    foregroundColor: componentColors.textPrimary,
    label: "카카오로 계속하기",
    provider: "KAKAO",
    shortLabel: "Kakao",
  },
  {
    backgroundColor: salaryHijackingDesignSystem.providerBrand.naver,
    foregroundColor: designSystem.colors.text.inverse,
    label: "네이버로 계속하기",
    provider: "NAVER",
    shortLabel: "Naver",
  },
];

export type SocialLoginButtonsProps = Readonly<{
  onSelectProvider: (provider: AuthSocialProvider) => void;
  onSignupPress?: () => void;
}>;

export function SocialLoginButtons({
  onSelectProvider,
}: SocialLoginButtonsProps): React.ReactElement {
  return (
    <View accessibilityLabel="소셜 로그인" style={styles.wrap}>
      <View accessibilityElementsHidden style={styles.dividerRow}>
        <View style={styles.line} />
        <Text allowFontScaling={false} style={styles.orText}>
          또는
        </Text>
        <View style={styles.line} />
      </View>
      <View style={styles.buttonStack}>
        {SOCIAL_PROVIDERS.map((provider) => (
          <Pressable
            accessibilityLabel={provider.label}
            accessibilityRole="button"
            hitSlop={8}
            key={provider.provider ?? provider.label}
            onPress={() => {
              onSelectProvider(provider.provider);
            }}
            style={[
              styles.socialButton,
              { backgroundColor: provider.backgroundColor },
            ]}
          >
            <Text
              allowFontScaling={false}
              accessibilityElementsHidden
              style={[styles.socialMark, { color: provider.foregroundColor }]}
            >
              {provider.shortLabel}
            </Text>
            <Text
              allowFontScaling={false}
              style={[styles.socialLabel, { color: provider.foregroundColor }]}
            >
              {provider.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityLabel="Apple로 로그인"
          accessibilityRole="button"
          onPress={() => onSelectProvider("APPLE")}
          style={[styles.socialButton, styles.appleButton]}
        >
          <Text allowFontScaling={false} style={styles.appleGlyph}>
            Apple
          </Text>
          <Text allowFontScaling={false} style={styles.appleLabel}>
            Apple로 로그인
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appleButton: {
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.surface.default,
  },
  appleGlyph: {
    color: authVisualColors.ink,
    ...typography.labelM,
    width: 52,
  },
  appleLabel: {
    color: authVisualColors.ink,
    ...typography.labelL,
    flex: 1,
    textAlign: "center",
  },
  buttonStack: {
    gap: componentSpacing.sm,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.md,
    marginBottom: componentSpacing.lg,
    marginTop: componentSpacing.xxl,
  },
  line: {
    backgroundColor: designSystem.colors.border.default,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    color: authVisualColors.muted,
    ...typography.caption,
    minWidth: 34,
    textAlign: "center",
  },
  socialButton: {
    alignItems: "center",
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: componentSpacing.md,
    minHeight: 56,
    justifyContent: "flex-start",
    overflow: "hidden",
    paddingHorizontal: componentSpacing.lg,
    width: "100%",
  },
  socialMark: {
    ...typography.labelM,
    textAlign: "left",
    width: 52,
  },
  socialLabel: {
    ...typography.labelL,
    flex: 1,
    textAlign: "center",
  },
  wrap: {
    alignSelf: "center",
    maxWidth: 365,
    width: "100%",
  },
});
