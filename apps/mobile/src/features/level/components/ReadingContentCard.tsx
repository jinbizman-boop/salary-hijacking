import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard, componentColors } from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

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
    gap: 8,
  },
  category: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  primaryAction: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: componentColors.primaryGreen,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  recordLabel: {
    color: componentColors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  recordPreview: {
    gap: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  recordQuestion: {
    color: componentColors.textSecondary,
    fontSize: 12,
  },
  secondaryAction: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: 14,
  },
  secondaryText: {
    color: componentColors.textPrimary,
    fontWeight: "900",
  },
  source: {
    color: componentColors.textSecondary,
    fontSize: 12,
  },
  summary: {
    color: componentColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 19,
    fontWeight: "900",
  },
});
