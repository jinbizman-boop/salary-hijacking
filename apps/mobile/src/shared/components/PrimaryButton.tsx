import { Pressable, StyleSheet, Text } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";
import {
  markReleaseInteractionPerf,
  type ReleasePerfMarkerName,
} from "../performance/release-perf";

const designSystem = salaryHijackingDesignSystem;

export type PrimaryButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  perfMarker?: ReleasePerfMarkerName;
  variant?: "primary" | "secondary" | "danger";
}>;

export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel = label,
  disabled = false,
  perfMarker,
  variant = "primary",
}: PrimaryButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={(event) => {
        if (perfMarker && !disabled)
          markReleaseInteractionPerf(perfMarker, event);
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[styles.text, variant === "secondary" && styles.secondaryText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: componentSpacing.lg,
    borderRadius: componentRadius.button,
  },
  primary: {
    backgroundColor: componentColors.primaryGreen,
  },
  secondary: {
    borderWidth: 1,
    borderColor: componentColors.line,
    backgroundColor: componentColors.surfaceSoft,
  },
  danger: {
    backgroundColor: componentColors.dangerRed,
  },
  disabled: {
    backgroundColor: componentColors.disabledGray,
  },
  pressed: {
    opacity: 0.82,
  },
  text: {
    color: componentColors.surface,
    ...designSystem.typography.labelL,
  },
  secondaryText: {
    color: componentColors.primaryGreenDark,
  },
});
