import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

export type OverspendNoticeProps = Readonly<{
  overspentLabel: string;
  onOpenPlan?: () => void;
}>;

export function OverspendNotice({
  overspentLabel,
  onOpenPlan,
}: OverspendNoticeProps): React.ReactElement {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>예산 초과</Text>
        <Text style={styles.description}>
          오늘 예산을 {overspentLabel} 초과했습니다. 다음 계획을 확인해 주세요.
        </Text>
      </View>
      {onOpenPlan ? (
        <Pressable
          accessibilityLabel="예산 계획 열기"
          accessibilityRole="button"
          onPress={onOpenPlan}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>계획 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: componentSpacing.sm,
    padding: componentSpacing.sm,
    borderWidth: 1,
    borderColor: salaryHijackingDesignSystem.colors.semantic.dangerSoft,
    borderRadius: componentRadius.card,
    backgroundColor: salaryHijackingDesignSystem.colors.semantic.dangerSoft,
  },
  copy: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  title: {
    color: componentColors.dangerRed,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
  description: {
    color: componentColors.textPrimary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  button: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: componentSpacing.sm,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.dangerRed,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonLabel: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
});
