import { Pressable, StyleSheet, Text } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ActivityFlowChecklist } from "./ActivityFlowChecklist";
import { ContentPolicyPills } from "./ContentPolicyPills";

const typography = salaryHijackingDesignSystem.typography;

export type NewsBalanceCardProps = Readonly<{
  content: GrowthContentItem;
  onRecord: (content: GrowthContentItem) => void;
}>;

export function NewsBalanceCard({
  content,
  onRecord,
}: NewsBalanceCardProps): React.ReactElement {
  return (
    <SurfaceCard
      accessibilityLabel={`${content.title} 뉴스 균형 카드`}
      style={styles.card}
    >
      <Text style={styles.label}>팩트 먼저 보기</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.summary}>{content.summary}</Text>
      <Text style={styles.viewpoint}>
        관점 태그 {content.viewpointTag ?? "FACT_BRIEF"}
      </Text>
      <ActivityFlowChecklist
        steps={[
          { label: "기사 선택", value: content.sourceTitle },
          { label: "읽음", value: `${content.estimatedMinutes}분 요약 확인` },
          { label: "한 줄 생각", value: content.recordQuestion },
          {
            label: "관점 비교 선택",
            value: content.viewpointTag ?? "FACT_BRIEF",
          },
          { label: "완료", value: `${content.xpReward} XP 기록` },
        ]}
      />
      <ContentPolicyPills content={content} />
      <Pressable
        accessibilityLabel="기록하기"
        accessibilityRole="button"
        onPress={() => onRecord(content)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>생각 기록</Text>
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: salaryHijackingDesignSystem.radius.xl,
    padding: componentSpacing.lg,
  },
  label: {
    alignSelf: "flex-start",
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: componentRadius.pill,
    color: componentColors.primaryGreen,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
    overflow: "hidden",
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.xs,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleL.fontSize,
    fontWeight: typography.titleL.fontWeight,
    lineHeight: typography.titleL.lineHeight,
  },
  summary: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyM.fontSize,
    lineHeight: typography.bodyM.lineHeight,
  },
  viewpoint: {
    alignSelf: "flex-start",
    backgroundColor: salaryHijackingDesignSystem.colors.semantic.warningSoft,
    borderRadius: componentRadius.pill,
    color: componentColors.textPrimary,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
    overflow: "hidden",
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.xs,
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.primaryGreen,
  },
  buttonText: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontWeight: typography.labelM.fontWeight,
  },
});
