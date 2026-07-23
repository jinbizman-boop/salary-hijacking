import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

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
    fontSize: 42,
    fontWeight: "900",
  },
  countRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: componentSpacing.md,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.sm,
    justifyContent: "space-between",
  },
  important: {
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    paddingBottom: 7,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
  },
  updatedAt: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
