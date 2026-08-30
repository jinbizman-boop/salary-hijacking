/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";

const AUTH_VISUAL_MIN_BOTTOM_SAFE_GAP = 36;
const EUREKA_WORLD_LOGO_ASPECT_RATIO = 177 / 1280;
const designSystem = salaryHijackingDesignSystem;
const platformLogo =
  require("../../../shared/assets/images/brand/salary-hijacking-platform-logo.png") as ImageSourcePropType;
const eurekaWorldLogo =
  require("../../../shared/assets/images/brand/eureka-world-logo.jpg") as ImageSourcePropType;

export const authVisualColors = {
  brandGreen: designSystem.colors.brand.primary,
  fieldLine: designSystem.colors.border.default,
  ink: designSystem.colors.text.primary,
  muted: designSystem.colors.text.secondary,
  placeholder: designSystem.colors.text.disabled,
} as const;

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type AuthVisualFrameProps = Readonly<{
  accessibilityLabel: string;
  children: React.ReactNode;
}>;

export function AuthVisualFrame({
  accessibilityLabel,
  children,
}: AuthVisualFrameProps): React.ReactElement {
  const { height, width } = useWindowDimensions();
  const insets = useOptionalSafeAreaInsets();
  const horizontalPadding = clampValue(width * 0.105, 24, 58);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
      style={styles.frame}
    >
      <ScrollView
        accessibilityLabel={accessibilityLabel}
        alwaysBounceVertical={false}
        automaticallyAdjustKeyboardInsets
        bounces={false}
        contentContainerStyle={[
          styles.frameContent,
          {
            minHeight: Math.max(height, 640),
            paddingBottom: Math.max(
              insets.bottom + AUTH_VISUAL_MIN_BOTTOM_SAFE_GAP,
              64,
            ),
            paddingHorizontal: horizontalPadding,
            paddingTop: Math.max(insets.top, 0),
          },
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.frame}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export type AuthBrandLogoProps = Readonly<{
  compact?: boolean;
}>;

export function AuthBrandLogo({
  compact = false,
}: AuthBrandLogoProps): React.ReactElement {
  const { width } = useWindowDimensions();
  const iconSize = compact
    ? clampValue(width * 0.23, 78, 112)
    : clampValue(width * 0.25, 88, 124);
  const titleSize = compact
    ? clampValue(width * 0.132, 42, 58)
    : clampValue(width * 0.14, 46, 62);
  const subtitleSize = compact
    ? clampValue(width * 0.057, 18, 25)
    : clampValue(width * 0.061, 20, 27);

  return (
    <View accessibilityLabel="급여납치 브랜드 로고" style={styles.brandBlock}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={platformLogo}
        style={{ height: iconSize, width: iconSize }}
      />
      <Text
        allowFontScaling={false}
        selectable
        style={[styles.brandTitle, { fontSize: titleSize }]}
      >
        급여납치
      </Text>
      <Text
        allowFontScaling={false}
        selectable
        style={[styles.brandSubtitle, { fontSize: subtitleSize }]}
      >
        SALARY HIJACKING
      </Text>
    </View>
  );
}

export function EurekaWorldMark(): React.ReactElement {
  const { width } = useWindowDimensions();
  const logoWidth = clampValue(width * 0.52, 190, Math.min(300, width * 0.84));
  const logoHeight = logoWidth * EUREKA_WORLD_LOGO_ASPECT_RATIO;

  return (
    <View style={styles.eurekaRow}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Eureka World 공식 로고"
        resizeMode="contain"
        source={eurekaWorldLogo}
        style={{ height: logoHeight, width: logoWidth }}
      />
    </View>
  );
}

export type TextLinkProps = Readonly<{
  label: string;
  onPress?: (() => void) | undefined;
}>;

export function TextLink({
  label,
  onPress,
}: TextLinkProps): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
    >
      <Text allowFontScaling={false} style={styles.linkText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: "center",
    width: "100%",
  },
  brandSubtitle: {
    color: authVisualColors.ink,
    fontSize: designSystem.typography.titleL.fontSize,
    fontWeight: designSystem.typography.titleL.fontWeight,
    includeFontPadding: false,
    letterSpacing: designSystem.typography.titleL.letterSpacing,
    lineHeight: designSystem.typography.titleL.lineHeight,
    marginTop: designSystem.spacing[2],
    textAlign: "center",
  },
  brandTitle: {
    color: authVisualColors.brandGreen,
    fontSize: designSystem.typography.display.fontSize,
    fontWeight: designSystem.typography.display.fontWeight,
    includeFontPadding: false,
    letterSpacing: designSystem.typography.display.letterSpacing,
    lineHeight: designSystem.typography.display.lineHeight,
    marginTop: designSystem.spacing[5],
    textAlign: "center",
  },
  eurekaRow: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
  },
  frame: {
    backgroundColor: designSystem.colors.surface.default,
    flex: 1,
  },
  frameContent: {
    backgroundColor: designSystem.colors.surface.default,
  },
  linkText: {
    color: authVisualColors.ink,
    fontSize: designSystem.typography.labelM.fontSize,
    fontWeight: designSystem.typography.labelM.fontWeight,
    includeFontPadding: false,
    letterSpacing: designSystem.typography.labelM.letterSpacing,
    lineHeight: designSystem.typography.labelM.lineHeight,
  },
});

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}
