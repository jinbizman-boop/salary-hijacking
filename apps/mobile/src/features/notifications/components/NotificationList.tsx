import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";
import type { NotificationItem } from "../types";

export type NotificationListProps = Readonly<{
  items: readonly NotificationItem[];
  onOpenNotification: (item: NotificationItem) => void;
}>;

function priorityLabel(priority: NotificationItem["priority"]): string {
  if (priority === "URGENT") return "긴급";
  if (priority === "HIGH") return "중요";
  if (priority === "LOW") return "낮음";
  return "일반";
}

export function NotificationList({
  items,
  onOpenNotification,
}: NotificationListProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="notification-list">
      <Text style={styles.title}>알림함</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            accessibilityLabel={`${item.title} ${item.deeplink ?? ""}`.trim()}
            accessibilityRole="button"
            key={item.notificationId}
            onPress={() => onOpenNotification(item)}
            style={styles.row}
          >
            <View
              accessibilityLabel={
                item.status === "UNREAD" ? "읽지 않은 알림" : "읽은 알림"
              }
              style={[styles.dot, item.status !== "UNREAD" && styles.dotRead]}
            />
            <View style={styles.body}>
              <View style={styles.metaRow}>
                <Text style={styles.priority}>
                  {priorityLabel(item.priority)}
                </Text>
                <Text style={styles.route}>
                  {item.deeplink ?? "/notifications"}
                </Text>
              </View>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.guard}>sensitiveFinancialData=false</Text>
      <Text style={styles.guard}>adTargetingSeparated=true</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  list: {
    gap: componentSpacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: componentSpacing.sm,
    minHeight: 76,
    paddingVertical: componentSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: componentColors.line,
  },
  dot: {
    width: 10,
    height: 10,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: componentColors.primaryGreen,
  },
  dotRead: {
    backgroundColor: componentColors.disabledGray,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  priority: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  route: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  rowTitle: {
    color: componentColors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  message: {
    color: componentColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
