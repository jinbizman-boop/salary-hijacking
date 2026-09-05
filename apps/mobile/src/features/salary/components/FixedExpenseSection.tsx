import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

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
      <Text style={styles.guard}>계좌 원문 없이 결제 상태만 표시해요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
    paddingVertical: componentSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: componentColors.line,
  },
  copy: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  name: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  status: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
});
