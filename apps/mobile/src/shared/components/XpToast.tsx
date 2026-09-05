import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  salaryHijackingDesignSystem,
} from "./tokens";

const designSystem = salaryHijackingDesignSystem;

export type XpToastProps = Readonly<{
  earnedXp: number;
  label?: string;
}>;

export function XpToast({
  earnedXp,
  label = "XP 증가",
}: XpToastProps): React.ReactElement {
  const safeXp = Math.max(0, Math.trunc(earnedXp));
  return (
    <View
      accessibilityLabel={`${label} ${safeXp} XP`}
      accessibilityLiveRegion="polite"
      style={styles.toast}
    >
      <Text style={styles.text}>{`${label} +${safeXp} XP`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: "flex-start",
    paddingHorizontal: designSystem.spacing[4],
    paddingVertical: designSystem.spacing[2],
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  text: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
});
