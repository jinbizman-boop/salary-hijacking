import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

const designSystem = salaryHijackingDesignSystem;

export type SurfaceCardProps = Readonly<{
  children: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({
  children,
  accessibilityLabel,
  style,
}: SurfaceCardProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, style]}
      testID={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
    ...designSystem.elevation.low,
  },
});
