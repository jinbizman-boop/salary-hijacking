import { StyleSheet, View } from "react-native";

import { componentColors } from "./tokens";

export type ProgressBarProps = Readonly<{
  value: number;
  accessibilityLabel?: string;
}>;

export function ProgressBar({
  value,
  accessibilityLabel = "진행률",
}: ProgressBarProps): React.ReactElement {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View
      accessibilityLabel={`${accessibilityLabel} ${percent}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#E9EEF1",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: componentColors.primaryGreen,
  },
});
