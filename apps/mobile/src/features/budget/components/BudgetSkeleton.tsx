import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export type BudgetSkeletonProps = Readonly<{
  label?: string;
}>;

export function BudgetSkeleton({
  label = "오늘 예산을 불러오는 중",
}: BudgetSkeletonProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <ActivityIndicator color="#176B5B" size="small" />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.lineWide} />
      <View style={styles.lineShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 188,
    justifyContent: "center",
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  label: {
    color: "#4B5563",
    fontSize: 14,
  },
  lineWide: {
    width: "76%",
    height: 18,
    borderRadius: 4,
    backgroundColor: "#EEF0F2",
  },
  lineShort: {
    width: "48%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "#EEF0F2",
  },
});
