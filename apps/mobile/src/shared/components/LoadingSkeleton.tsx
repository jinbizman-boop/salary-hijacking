import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

const typography = salaryHijackingDesignSystem.typography;

export type LoadingSkeletonProps = Readonly<{
  label: string;
}>;

export function LoadingSkeleton({
  label,
}: LoadingSkeletonProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.box}
    >
      <View style={styles.lineWide} />
      <View style={styles.line} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: componentSpacing.sm,
    padding: componentSpacing.md,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
  },
  lineWide: {
    width: "72%",
    height: 12,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.line,
  },
  line: {
    width: "48%",
    height: 12,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.line,
  },
  text: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
});
