import { StyleSheet, Text, View } from "react-native";

import { componentColors, componentRadius } from "./tokens";

export type LoadingSkeletonProps = Readonly<{
  label: string;
}>;

export function LoadingSkeleton({
  label,
}: LoadingSkeletonProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.box}
    >
      <View style={styles.lineWide} />
      <View style={styles.line} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 8,
    padding: 16,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
  },
  lineWide: {
    width: "72%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#EDF1F3",
  },
  line: {
    width: "48%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#EDF1F3",
  },
  text: {
    color: componentColors.textSecondary,
    fontSize: 12,
  },
});
