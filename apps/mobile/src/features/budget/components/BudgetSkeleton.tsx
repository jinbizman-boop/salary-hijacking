import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

export type BudgetSkeletonProps = Readonly<{
  label?: string;
}>;

export function BudgetSkeleton({
  label = "오늘 예산을 불러오는 중",
}: BudgetSkeletonProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <ActivityIndicator color={componentColors.primaryGreen} size="small" />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.lineWide} />
      <View style={styles.lineShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 188,
    justifyContent: "center",
    gap: componentSpacing.sm,
    padding: componentSpacing.lg,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
  },
  label: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
  },
  lineWide: {
    width: "76%",
    height: 18,
    borderRadius: salaryHijackingDesignSystem.radius.sm,
    backgroundColor: componentColors.line,
  },
  lineShort: {
    width: "48%",
    height: 12,
    borderRadius: salaryHijackingDesignSystem.radius.sm,
    backgroundColor: componentColors.line,
  },
});
