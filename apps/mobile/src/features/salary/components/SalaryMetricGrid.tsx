import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

export type SalaryMetric = Readonly<{
  label: string;
  amount?: number;
  value?: string;
}>;

export type SalaryMetricGridProps = Readonly<{
  metrics: readonly SalaryMetric[];
}>;

export function SalaryMetricGrid({
  metrics,
}: SalaryMetricGridProps): React.ReactElement {
  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <SurfaceCard accessibilityLabel={metric.label} key={metric.label}>
          <Text style={styles.label}>{metric.label}</Text>
          {typeof metric.amount === "number" ? (
            <MoneyText
              accessibilityLabel={metric.label}
              amount={metric.amount}
            />
          ) : (
            <Text style={styles.value}>{metric.value ?? "-"}</Text>
          )}
        </SurfaceCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.md,
  },
  label: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
  value: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.amountL,
  },
});
