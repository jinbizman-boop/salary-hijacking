import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { NotificationItem } from "../types";

const typography = salaryHijackingDesignSystem.typography;

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

function notificationCategoryLabel(item: NotificationItem): string {
  if (item.type === "PAYDAY") return "급여";
  if (item.type === "PAYMENT_DUE") return "고정지출";
  if (item.type === "BUDGET_WARNING" || item.type === "BUDGET_EXCEEDED") {
    return "예산";
  }
  if (item.type === "SAVINGS_GOAL") return "저축";
  if (item.type === "CONTENT_RECOMMENDATION") return "LV UP";
  if (item.type === "COMMUNITY") return "커뮤니티";
  if (item.type === "NOTICE") return "공지";
  return "성과";
}

export function NotificationList({
  items,
  onOpenNotification,
}: NotificationListProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="알림 목록">
      <Text style={styles.title}>전체 알림</Text>
      <View style={styles.filters}>
        {[
          "급여",
          "고정지출",
          "예산",
          "저축",
          "성과",
          "LV UP",
          "커뮤니티",
          "공지",
        ].map((label) => (
          <Text key={label} style={styles.filter}>
            {label}
          </Text>
        ))}
      </View>
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
                  {notificationCategoryLabel(item)}
                </Text>
              </View>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.guard}>민감 금액 원문은 알림에 담지 않습니다.</Text>
      <Text style={styles.guard}>광고 타겟팅 데이터와 분리합니다.</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  dot: {
    backgroundColor: componentColors.primaryGreen,
    borderRadius: componentRadius.pill,
    height: 10,
    marginTop: componentSpacing.xs,
    width: 10,
  },
  dotRead: {
    backgroundColor: componentColors.disabledGray,
  },
  filter: {
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: componentRadius.pill,
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.xs,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.xs,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  list: {
    gap: componentSpacing.sm,
  },
  message: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.sm,
    justifyContent: "space-between",
  },
  priority: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  route: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  row: {
    alignItems: "flex-start",
    borderBottomColor: componentColors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: componentSpacing.sm,
    minHeight: 76,
    paddingVertical: componentSpacing.sm,
  },
  rowTitle: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
});
