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
}>;

export function DailyBudgetSection({
  configuredAmount,
  spentAmount,
  remainingAmount,
  onRefresh,
}: DailyBudgetSectionProps): React.ReactElement {
  const usageRate =
    configuredAmount > 0
      ? Math.round((spentAmount / configuredAmount) * 100)
      : 0;
  return (
    <SurfaceCard accessibilityLabel="오늘 예산">
      <View style={styles.header}>
        <Text style={styles.title}>오늘 쓸 수 있는 돈</Text>
        <Text style={styles.badge}>
          {remainingAmount >= 0 ? "안전" : "초과"}
        </Text>
      </View>
      <MoneyText accessibilityLabel="오늘 남은 예산" amount={remainingAmount} />
      <ProgressBar accessibilityLabel="오늘 예산 사용률" value={usageRate} />
      <Text style={styles.caption}>
        설정 {configuredAmount.toLocaleString("ko-KR")}원 · 사용{" "}
        {spentAmount.toLocaleString("ko-KR")}원
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
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
  },
});
