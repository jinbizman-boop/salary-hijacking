import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import {
  COMMUNITY_BOARD_LABELS,
  COMMUNITY_BOARD_TYPES,
} from "../community.constants";
import type { CommunityBoardType } from "../community.types";

const typography = salaryHijackingDesignSystem.typography;
const COMMUNITY_CATEGORY_COUNT = COMMUNITY_BOARD_TYPES.length;

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
  if (
    tabs.length !== COMMUNITY_CATEGORY_COUNT ||
    COMMUNITY_BOARD_TYPES.some((category) => !tabs.includes(category))
  ) {
    throw new Error("CommunityTabBar requires exactly 3 canonical categories.");
  }

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
    gap: componentSpacing.sm,
  },
  tabs: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  tab: {
    minHeight: salaryHijackingDesignSystem.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: componentSpacing.sm,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.surface,
  },
  selectedTab: {
    borderColor: componentColors.primaryGreen,
    backgroundColor: componentColors.primaryGreen,
  },
  tabLabel: {
    color: componentColors.textSecondary,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  tabCount: {
    color: componentColors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  selectedLabel: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
  },
  guard: {
    color: componentColors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
});
