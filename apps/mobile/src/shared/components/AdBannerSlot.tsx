import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

const typography = salaryHijackingDesignSystem.typography;

export type AdBannerSlotProps = Readonly<{
  label: "광고" | "제휴" | "제휴/광고";
  title: string;
  description: string;
}>;

export function AdBannerSlot({
  label,
  title,
  description,
}: AdBannerSlotProps): React.ReactElement {
  return (
    <View accessibilityLabel={`${label} ${title}`} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.guard}>
        민감 금융 데이터로 맞춤 타겟팅하지 않아요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: componentSpacing.xs,
    padding: componentSpacing.md,
    borderWidth: 1,
    borderColor: salaryHijackingDesignSystem.colors.semantic.warning,
    borderRadius: componentRadius.card,
    backgroundColor: salaryHijackingDesignSystem.colors.semantic.warningSoft,
  },
  label: {
    color: componentColors.warningOrange,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  guard: {
    color: componentColors.textPrimary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
});
