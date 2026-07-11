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
    <SurfaceCard accessibilityLabel="notification-summary-card">
      <View style={styles.header}>
        <Text style={styles.title}>새 알림</Text>
        <Text style={styles.updatedAt}>{updatedAtLabel}</Text>
      </View>
      <View style={styles.countRow}>
        <Text
          accessibilityLabel={`읽지 않은 알림 ${unreadCount}`}
          style={styles.count}
        >
          {unreadCount}
        </Text>
        <Text style={styles.important}>중요 {importantCount}</Text>
      </View>
      <Text style={styles.guard}>pushTokenRendered=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
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
  countRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: componentSpacing.md,
  },
  count: {
    color: componentColors.primaryGreenDark,
    fontSize: 42,
    fontWeight: "900",
  },
  important: {
    paddingBottom: 7,
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
