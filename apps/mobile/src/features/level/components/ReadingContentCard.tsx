import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

const typography = salaryHijackingDesignSystem.typography;

export type ReadingContentCardProps = Readonly<{
  content: GrowthContentItem;
  onStart: (content: GrowthContentItem) => void;
  onRecord: (content: GrowthContentItem) => void;
}>;

export function ReadingContentCard({
  content,
  onStart,
  onRecord,
}: ReadingContentCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel={`${content.title} 독서 콘텐츠`}>
      <Text style={styles.category}>{content.category}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.summary}>{content.summary}</Text>
      <ContentPolicyPills content={content} />
      <Text style={styles.source}>출처 {content.sourceTitle}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="독서 시작"
          accessibilityRole="button"
          onPress={() => onStart(content)}
          style={styles.primaryAction}
        >
          <Text style={styles.primaryText}>독서 시작</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="기록하기"
          accessibilityRole="button"
          onPress={() => onRecord(content)}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryText}>기록하기</Text>
        </Pressable>
      </View>
      <RecordPreview question={content.recordQuestion} />
    </SurfaceCard>
  );
}

function RecordPreview({
  question,
}: Readonly<{ question: string }>): React.ReactElement {
  return (
    <View style={styles.recordPreview}>
      <Text style={styles.recordLabel}>비공개 LV UP 기록</Text>
      <Text style={styles.recordQuestion}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  category: {
    color: componentColors.primaryGreen,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  primaryAction: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.primaryGreen,
  },
  primaryText: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontWeight: typography.labelM.fontWeight,
  },
  recordLabel: {
    color: componentColors.textPrimary,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  recordPreview: {
    gap: componentSpacing.xs,
    padding: componentSpacing.sm,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surfaceSoft,
  },
  recordQuestion: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
  },
  secondaryAction: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
  },
  secondaryText: {
    color: componentColors.primaryGreenDark,
    fontWeight: typography.labelM.fontWeight,
  },
  source: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  summary: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleL.fontSize,
    fontWeight: typography.titleL.fontWeight,
  },
});
