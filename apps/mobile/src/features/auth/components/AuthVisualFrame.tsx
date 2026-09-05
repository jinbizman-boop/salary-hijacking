/* eslint-disable @typescript-eslint/no-require-imports */
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";

const AUTH_VISUAL_MIN_BOTTOM_SAFE_GAP = 36;
const designSystem = salaryHijackingDesignSystem;

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
