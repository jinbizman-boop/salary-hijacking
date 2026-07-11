import { Pressable, StyleSheet, Text } from "react-native";

import { componentColors, componentRadius, componentSpacing } from "./tokens";

export type PrimaryButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}>;

export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel = label,
  disabled = false,
  variant = "primary",
}: PrimaryButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
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
    minHeight: 48,
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
    backgroundColor: componentColors.surface,
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
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryText: {
    color: componentColors.textPrimary,
  },
});
