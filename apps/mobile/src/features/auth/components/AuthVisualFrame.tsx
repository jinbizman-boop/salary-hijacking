import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appImageAssets } from "../../../shared/assets/images";

const BRAND_GREEN = "#209252";
const BRAND_INK = "#202327";
const BRAND_MUTED = "#6D737A";
const FIELD_LINE = "#E4E7EA";

export const authVisualColors = {
  brandGreen: BRAND_GREEN,
  fieldLine: FIELD_LINE,
  ink: BRAND_INK,
  muted: BRAND_MUTED,
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
            paddingBottom: Math.max(insets.bottom, 0),
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
        source={appImageAssets.brand.platformLogo}
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
  const logoWidth = clampValue(width * 0.58, 214, 340);
  const logoHeight = logoWidth * 0.158;

  return (
    <View style={styles.eurekaRow}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Eureka World 공식 로고"
        resizeMode="contain"
        source={appImageAssets.brand.eurekaWorldLogo}
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
    color: BRAND_INK,
    fontWeight: "800",
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 31,
    marginTop: 8,
    textAlign: "center",
  },
  brandTitle: {
    color: BRAND_GREEN,
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 68,
    marginTop: 18,
    textAlign: "center",
  },
  eurekaRow: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
  },
  frame: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  frameContent: {
    backgroundColor: "#FFFFFF",
  },
  linkText: {
    color: BRAND_INK,
    fontSize: 14,
    fontWeight: "800",
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 20,
  },
});

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}
