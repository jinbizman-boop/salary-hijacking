import { StyleSheet, View } from "react-native";

import type { BudgetRiskLevel } from "../types";

export type BudgetProgressBarProps = Readonly<{
  usageRate: number;
  riskLevel: BudgetRiskLevel;
  accessibilityLabel?: string;
}>;

const FILL_COLORS: Readonly<Record<BudgetRiskLevel, string>> = {
  SAFE: "#16855B",
  WATCH: "#B87300",
  WARNING: "#D05200",
  OVER: "#C53030",
};

export function BudgetProgressBar({
  usageRate,
  riskLevel,
  accessibilityLabel = "오늘 예산 사용률",
}: BudgetProgressBarProps): React.ReactElement {
  const normalized = Number.isFinite(usageRate)
    ? Math.max(0, Math.min(100, usageRate))
    : 0;

  return (
    <View
      accessibilityLabel={`${accessibilityLabel} ${Math.round(Math.max(0, usageRate))}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(normalized) }}
      style={styles.track}
    >
      <View
        style={[
          styles.fill,
          {
            backgroundColor: FILL_COLORS[riskLevel],
            width: `${normalized}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
  },
});
