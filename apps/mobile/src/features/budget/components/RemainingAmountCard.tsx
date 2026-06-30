import { StyleSheet, Text, View } from "react-native";

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
    gap: 5,
  },
  eyebrow: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
  amount: {
    color: "#111827",
    fontSize: 32,
    fontWeight: "800",
  },
  synced: {
    color: "#6B7280",
    fontSize: 12,
  },
});
