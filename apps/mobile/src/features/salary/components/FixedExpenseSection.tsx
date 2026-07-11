import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";

export type FixedExpenseItem = Readonly<{
  id: string;
  title: string;
  amount: number;
  status: string;
}>;

export type FixedExpenseSectionProps = Readonly<{
  expenses: readonly FixedExpenseItem[];
}>;

export function FixedExpenseSection({
  expenses,
}: FixedExpenseSectionProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="오늘 빠져나간 고정지출">
      <Text style={styles.title}>오늘 빠져나간 고정지출</Text>
      {expenses.map((expense) => (
        <View key={expense.id} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.name}>{expense.title}</Text>
            <Text style={styles.status}>{expense.status}</Text>
          </View>
          <MoneyText amount={expense.amount} muted />
        </View>
      ))}
      <Text style={styles.guard}>rawAccountData=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: componentColors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  status: {
    color: componentColors.textSecondary,
    fontSize: 12,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
});
