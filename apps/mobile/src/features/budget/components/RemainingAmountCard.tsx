import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

export type RemainingAmountCardProps = Readonly<{
  remainingLabel: string;
  lastSyncedLabel: string;
}>;

export function RemainingAmountCard({
  remainingLabel,
  lastSyncedLabel,
}: RemainingAmountCardProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={`오늘 남은 예산 ${remainingLabel}`}
      style={styles.container}
    >
      <Text style={styles.eyebrow}>오늘 남은 예산</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>
        {remainingLabel}
      </Text>
      <Text style={styles.synced}>서버 동기화 {lastSyncedLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: componentSpacing.xs,
  },
  eyebrow: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    fontWeight: typography.bodyS.fontWeight,
  },
  amount: {
    color: componentColors.textPrimary,
    fontSize: typography.amountXL.fontSize,
    fontWeight: typography.amountXL.fontWeight,
  },
  synced: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
});
