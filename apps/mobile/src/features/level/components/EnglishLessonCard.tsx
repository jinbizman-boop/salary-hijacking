import { Pressable, StyleSheet, Text } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

export type EnglishLessonCardProps = Readonly<{
  content: GrowthContentItem;
  onRecord: (content: GrowthContentItem) => void;
}>;

export function EnglishLessonCard({
  content,
  onRecord,
}: EnglishLessonCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel={`${content.title} 영어 루틴`}>
      <Text style={styles.mode}>듣기 · 말하기 · 읽기 · 쓰기</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.summary}>{content.missionPrompt}</Text>
      <ContentPolicyPills content={content} />
      <Pressable
        accessibilityLabel="기록하기"
        accessibilityRole="button"
        onPress={() => onRecord(content)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>문장 기록</Text>
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  mode: {
    color: componentColors.primaryGreen,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
  title: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.titleM,
  },
  summary: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.bodyS,
  },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.primaryGreen,
  },
  buttonText: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    ...salaryHijackingDesignSystem.typography.labelL,
  },
});
