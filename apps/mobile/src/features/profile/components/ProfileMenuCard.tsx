import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

export type ProfileMenuKey =
  | "PROFILE"
  | "ACCOUNT_SECURITY"
  | "MY_POSTS"
  | "MY_LEVEL"
  | "NOTIFICATION_SETTINGS"
  | "SUPPORT"
  | "NOTICES";

export type ProfileMenuCardProps = Readonly<{
  onSelect: (key: ProfileMenuKey) => void;
}>;

const menuItems: readonly Readonly<{
  key: ProfileMenuKey;
  label: string;
  accessibilityLabel: string;
}>[] = [
  {
    key: "PROFILE",
    label: "프로필",
    accessibilityLabel: "프로필 관리",
  },
  {
    key: "ACCOUNT_SECURITY",
    label: "계정/보안",
    accessibilityLabel: "계정 보안 관리",
  },
  {
    key: "MY_POSTS",
    label: "내 게시글",
    accessibilityLabel: "내 게시글 관리",
  },
  {
    key: "MY_LEVEL",
    label: "내 LV UP",
    accessibilityLabel: "내 레벨업 관리",
  },
  {
    key: "NOTIFICATION_SETTINGS",
    label: "알림 설정",
    accessibilityLabel: "알림 설정",
  },
  {
    key: "SUPPORT",
    label: "고객지원",
    accessibilityLabel: "1:1 문의",
  },
  {
    key: "NOTICES",
    label: "공지사항",
    accessibilityLabel: "공지사항",
  },
];

export function ProfileMenuCard({
  onSelect,
}: ProfileMenuCardProps): React.ReactElement {
  return (
    <View accessibilityLabel="마이페이지 메뉴" style={styles.stack}>
      <SurfaceCard accessibilityLabel="마이페이지 메뉴 목록">
        <View style={styles.list}>
          {menuItems.map((item) => (
            <Pressable
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="button"
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <Text style={styles.title}>{item.label}</Text>
              <Text style={styles.chevron}>열기</Text>
            </Pressable>
          ))}
        </View>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: componentColors.primaryGreenDark,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
  list: {
    gap: componentSpacing.xs,
  },
  row: {
    alignItems: "center",
    borderColor: componentColors.line,
    borderRadius: salaryHijackingDesignSystem.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: componentSpacing.sm,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: componentSpacing.md,
  },
  rowPressed: {
    backgroundColor: componentColors.primaryGreenSoft,
  },
  stack: {
    gap: componentSpacing.sm,
  },
  title: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.labelM,
  },
});
