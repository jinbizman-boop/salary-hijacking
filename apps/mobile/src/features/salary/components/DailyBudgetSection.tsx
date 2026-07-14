import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  PrimaryButton,
  ProgressBar,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";

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
  title = "홍길동님이 설정한 일일 사용 예산",
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
    gap: 4,
  },
  amountLabel: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  amountRow: {
    flexDirection: "row",
    gap: 10,
  },
  badge: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: componentColors.primaryGreenSoft,
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  caption: {
    color: componentColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  dangerBadge: {
    backgroundColor: "#FDECEC",
    color: componentColors.dangerRed,
  },
  dangerText: {
    color: componentColors.dangerRed,
    fontWeight: "800",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
});
