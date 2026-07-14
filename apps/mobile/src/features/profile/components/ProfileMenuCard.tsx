import { StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";

export type ProfileMenuKey =
  | "MY_POSTS"
  | "MY_LEVEL"
  | "SUPPORT"
  | "NOTICES"
  | "ACCOUNT_SETTINGS";

export type ProfileMenuCardProps = Readonly<{
  onSelect: (key: ProfileMenuKey) => void;
}>;

const menuItems: readonly Readonly<{
  key: ProfileMenuKey;
  label: string;
  accessibilityLabel: string;
}>[] = [
  {
    key: "MY_POSTS",
    label: "내 게시글 관리",
    accessibilityLabel: "내 게시글 관리",
  },
  {
    key: "MY_LEVEL",
    label: "내 레벨업 관리",
    accessibilityLabel: "내 레벨업 관리",
  },
  {
    key: "SUPPORT",
    label: "1:1 문의",
    accessibilityLabel: "1:1 문의",
  },
  {
    key: "NOTICES",
    label: "공지사항",
    accessibilityLabel: "공지사항",
  },
  {
    key: "ACCOUNT_SETTINGS",
    label: "계정 설정",
    accessibilityLabel: "계정 설정",
  },
];

export function ProfileMenuCard({
  onSelect,
}: ProfileMenuCardProps): React.ReactElement {
  return (
    <View accessibilityLabel="마이페이지 메뉴" style={styles.stack}>
      {menuItems.map((item) => (
        <SurfaceCard accessibilityLabel={item.label} key={item.key}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.label}</Text>
            <PrimaryButton
              accessibilityLabel={item.accessibilityLabel}
              label="관리하기"
              onPress={() => onSelect(item.key)}
              variant="secondary"
            />
          </View>
        </SurfaceCard>
      ))}
      <Text style={styles.guard}>금융 원문은 MY 메뉴에 표시하지 않아요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stack: {
    gap: 8,
  },
  title: {
    color: componentColors.primaryGreenDark,
    fontSize: 19,
    fontWeight: "900",
  },
});
