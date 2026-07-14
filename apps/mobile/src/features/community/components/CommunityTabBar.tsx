import { Pressable, StyleSheet, Text, View } from "react-native";

import { COMMUNITY_BOARD_LABELS } from "../community.constants";
import type { CommunityBoardType } from "../community.types";

export type CommunityTabBarProps = Readonly<{
  tabs: readonly CommunityBoardType[];
  selected: CommunityBoardType;
  counts?: Partial<Record<CommunityBoardType, number>>;
  onSelect: (boardType: CommunityBoardType) => void;
}>;

export function CommunityTabBar({
  tabs,
  selected,
  counts = {},
  onSelect,
}: CommunityTabBarProps): React.ReactElement {
  return (
    <View style={styles.wrapper}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map((tab) => {
          const count = Math.max(0, Math.trunc(counts[tab] ?? 0));
          const isSelected = tab === selected;
          const label = COMMUNITY_BOARD_LABELS[tab];
          return (
            <Pressable
              accessibilityLabel={`${label} 게시판 ${count}개 글`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={tab}
              onPress={() => onSelect(tab)}
              style={[styles.tab, isSelected && styles.selectedTab]}
            >
              <Text
                style={[styles.tabLabel, isSelected && styles.selectedLabel]}
              >
                {label}
              </Text>
              <Text
                style={[styles.tabCount, isSelected && styles.selectedLabel]}
              >
                {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.guard}>익명 경계를 유지해요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    minHeight: 44,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  selectedTab: {
    borderColor: "#176B5B",
    backgroundColor: "#E8F4F1",
  },
  tabLabel: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "800",
  },
  tabCount: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "700",
  },
  selectedLabel: {
    color: "#155E52",
  },
  guard: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
});
