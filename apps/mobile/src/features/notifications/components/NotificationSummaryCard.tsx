import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

export type NotificationSummaryCardProps = Readonly<{
  unreadCount: number;
  importantCount: number;
  updatedAtLabel: string;
}>;

export function NotificationSummaryCard({
  unreadCount,
  importantCount,
  updatedAtLabel,
}: NotificationSummaryCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="알림 요약">
      <View style={styles.header}>
        <Text style={styles.title}>새 알림</Text>
        <Text style={styles.updatedAt}>{updatedAtLabel}</Text>
      </View>
      <View style={styles.countRow}>
        <Text
          accessibilityLabel={`읽지 않은 알림 ${unreadCount}개`}
          style={styles.count}
        >
          {unreadCount}
        </Text>
        <Text style={styles.important}>중요 {importantCount}</Text>
      </View>
      <Text style={styles.guard}>푸시 토큰 원문은 표시하지 않습니다.</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  count: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
  },
  countRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: componentSpacing.md,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.sm,
    justifyContent: "space-between",
  },
  important: {
    color: componentColors.textPrimary,
    fontSize: typography.bodyL.fontSize,
    fontWeight: typography.bodyL.fontWeight,
    paddingBottom: componentSpacing.xs,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleL.fontSize,
    fontWeight: typography.titleL.fontWeight,
  },
  updatedAt: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
});
