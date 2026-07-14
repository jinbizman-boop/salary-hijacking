import { StyleSheet, Text, View } from "react-native";

import { XpToast, componentColors } from "../../../shared/components";

export type XpRewardToastProps = Readonly<{
  earnedXp: number;
  rewardSource: string;
}>;

const rewardSourceLabels: Readonly<Record<string, string>> = {
  ENGLISH_COMPLETE: "영어 기록 완료",
  NEWS_BALANCE_COMPLETE: "뉴스 균형 읽기 완료",
  READING_COMPLETE: "독서 기록 완료",
  WORKOUT_COMPLETE: "운동 기록 완료",
};

const rewardLabel = (rewardSource: string): string =>
  rewardSourceLabels[rewardSource] ?? "레벨업 기록 완료";

export function XpRewardToast({
  earnedXp,
  rewardSource,
}: XpRewardToastProps): React.ReactElement {
  return (
    <View style={styles.wrapper}>
      <XpToast earnedXp={earnedXp} label={rewardLabel(rewardSource)} />
      <Text style={styles.guard}>중복 없이 한 번만 반영했어요</Text>
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
