import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  SurfaceCard,
  componentColors,
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
    gap: 12,
  },
  label: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  value: {
    color: componentColors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
});
