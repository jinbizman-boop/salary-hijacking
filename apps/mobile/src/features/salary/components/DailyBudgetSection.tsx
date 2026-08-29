import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  PrimaryButton,
  ProgressBar,
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

export type DailyBudgetSectionProps = Readonly<{
  configuredAmount: number;
  spentAmount: number;
  remainingAmount: number;
  onRefresh: () => void;
  title?: string;
}>;

export function DailyBudgetSection({
  configuredAmount,
  spentAmount,
  remainingAmount,
  onRefresh,
  title = "사용자님이 설정한 일일 사용 예산",
}: DailyBudgetSectionProps): React.ReactElement {
  const usageRate =
    configuredAmount > 0
      ? Math.round((spentAmount / configuredAmount) * 100)
      : 0;
  const overspent = remainingAmount < 0 || usageRate > 100;

  return (
    <SurfaceCard accessibilityLabel="오늘 예산">
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.badge, overspent && styles.dangerBadge]}>
          {overspent ? "예산 초과" : "사용 가능"}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <View style={styles.amountCell}>
          <Text style={styles.amountLabel}>설정 금액</Text>
          <MoneyText
            accessibilityLabel="일일 예산 설정 금액"
            amount={configuredAmount}
          />
        </View>
        <View style={styles.amountCell}>
          <Text style={styles.amountLabel}>남은 금액</Text>
          <MoneyText
            accessibilityLabel="오늘 남은 예산"
            amount={remainingAmount}
          />
        </View>
      </View>
      <ProgressBar accessibilityLabel="오늘 예산 사용률" value={usageRate} />
      <Text style={[styles.caption, overspent && styles.dangerText]}>
        사용 {spentAmount.toLocaleString("ko-KR")}원 · 남은 예산{" "}
        {remainingAmount.toLocaleString("ko-KR")}원
      </Text>
      <PrimaryButton
        accessibilityLabel="오늘 예산 새로고침"
        label="새로고침"
        onPress={onRefresh}
        variant="secondary"
      />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  amountCell: {
    flex: 1,
    gap: componentSpacing.xs,
    padding: componentSpacing.sm,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surfaceSoft,
  },
  amountLabel: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  amountRow: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  badge: {
    overflow: "hidden",
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.xs,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  caption: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  dangerBadge: {
    backgroundColor: salaryHijackingDesignSystem.colors.semantic.dangerSoft,
    color: componentColors.dangerRed,
  },
  dangerText: {
    color: componentColors.dangerRed,
    fontWeight: typography.labelM.fontWeight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  title: {
    flex: 1,
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
});
