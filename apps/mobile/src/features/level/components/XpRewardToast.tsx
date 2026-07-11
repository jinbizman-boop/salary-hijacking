import { StyleSheet, Text, View } from "react-native";

import { XpToast, componentColors } from "../../../shared/components";

export type XpRewardToastProps = Readonly<{
  earnedXp: number;
  rewardSource: string;
}>;

export function XpRewardToast({
  earnedXp,
  rewardSource,
}: XpRewardToastProps): React.ReactElement {
  return (
    <View style={styles.wrapper}>
      <XpToast earnedXp={earnedXp} label={rewardSource} />
      <Text style={styles.guard}>serverAuthority=true</Text>
      <Text style={styles.guard}>idempotencyRequired=true</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
});
