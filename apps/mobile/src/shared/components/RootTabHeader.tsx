/* eslint-disable @typescript-eslint/no-require-imports */
import type * as React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { componentColors, salaryHijackingDesignSystem } from "./tokens";

const designSystem = salaryHijackingDesignSystem;
const rootHeaderLogo =
  require("../assets/images/brand/salary-hijacking-platform-logo.png") as ImageSourcePropType;
const notificationIcon =
  require("../assets/icons/common/alarm.png") as ImageSourcePropType;
const settingsIcon =
  require("../assets/icons/common/settings.png") as ImageSourcePropType;

export type RootTabHeaderTab =
  | "home"
  | "plan"
  | "level"
  | "community"
  | "profile";

type RootHeaderAction = "notification" | "goal-management" | "my-posts";

export const ROOT_HEADER_BRAND_TEXT = "Salary HiJacking" as const;

export const ROOT_TAB_HEADER_CONTRACT: Readonly<
  Record<
    RootTabHeaderTab,
    Readonly<{
      subtitle: string;
      action: RootHeaderAction | null;
      gate: string;
    }>
  >
> = {
  home: {
    action: "notification",
    gate: "HOME_HEADER_ACTIONS=NOTIFICATION_ONLY",
    subtitle: "급여납치 메인",
  },
  plan: {
    action: null,
    gate: "PLAN_HEADER_ACTIONS=NONE",
    subtitle: "급여납치 계획",
  },
  level: {
    action: "goal-management",
    gate: "LVUP_HEADER_ACTIONS=GOAL_MANAGEMENT_ONLY",
    subtitle: "급여납치 레벨업",
  },
  community: {
    action: "my-posts",
    gate: "COMMUNITY_HEADER_ACTIONS=MY_POSTS_MANAGEMENT_ONLY",
    subtitle: "급여납치 커뮤니티",
  },
  profile: {
    action: null,
    gate: "MY_HEADER_ACTIONS=NONE",
    subtitle: "급여납치 마이페이지",
  },
};

export type RootTabHeaderProps = Readonly<{
  tab: RootTabHeaderTab;
  onOpenNotifications?: (() => void) | undefined;
  onOpenGoalManagement?: (() => void) | undefined;
  onOpenMyPostsManagement?: (() => void) | undefined;
}>;

export function RootTabHeader({
  onOpenGoalManagement,
  onOpenMyPostsManagement,
  onOpenNotifications,
  tab,
}: RootTabHeaderProps): React.ReactElement {
  const contract = ROOT_TAB_HEADER_CONTRACT[tab];
  const action = renderAction({
    action: contract.action,
    onOpenGoalManagement,
    onOpenMyPostsManagement,
    onOpenNotifications,
  });

  return (
    <View
      accessibilityLabel={`${ROOT_HEADER_BRAND_TEXT} ${contract.subtitle}`}
      style={styles.header}
    >
      <View style={styles.brandBlock}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="급여납치 공식 로고"
          resizeMode="contain"
          source={rootHeaderLogo}
          style={styles.logo}
        />
        <View style={styles.copy}>
          <Text allowFontScaling={false} style={styles.brandText}>
            {ROOT_HEADER_BRAND_TEXT}
          </Text>
          <Text allowFontScaling={false} style={styles.subtitle}>
            {contract.subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.actionSlot}>{action}</View>
    </View>
  );
}

function renderAction({
  action,
  onOpenGoalManagement,
  onOpenMyPostsManagement,
  onOpenNotifications,
}: Readonly<{
  action: RootHeaderAction | null;
  onOpenNotifications?: (() => void) | undefined;
  onOpenGoalManagement?: (() => void) | undefined;
  onOpenMyPostsManagement?: (() => void) | undefined;
}>): React.ReactElement | null {
  if (action === "notification") {
    return (
      <RootHeaderIconButton
        accessibilityLabel="알림"
        icon={notificationIcon}
        onPress={onOpenNotifications}
      />
    );
  }
  if (action === "goal-management") {
    return (
      <RootHeaderIconButton
        accessibilityLabel="목표 관리"
        icon={settingsIcon}
        onPress={onOpenGoalManagement}
      />
    );
  }
  if (action === "my-posts") {
    return (
      <RootHeaderIconButton
        accessibilityLabel="내 게시글 관리"
        icon={settingsIcon}
        onPress={onOpenMyPostsManagement}
      />
    );
  }
  return null;
}

function RootHeaderIconButton({
  accessibilityLabel,
  icon,
  onPress,
}: Readonly<{
  accessibilityLabel: string;
  icon: ImageSourcePropType;
  onPress?: (() => void) | undefined;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={!onPress}
      hitSlop={designSystem.spacing[3]}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        !onPress ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={icon}
        style={styles.actionIcon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: componentColors.surface,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
  },
  actionIcon: {
    height: designSystem.navigation.bottomTabs.iconSize,
    tintColor: componentColors.textPrimary,
    width: designSystem.navigation.bottomTabs.iconSize,
  },
  actionSlot: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
  },
  brandBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: designSystem.spacing[3],
    minWidth: 0,
  },
  brandText: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.titleM,
  },
  copy: {
    flex: 1,
    gap: designSystem.spacing[1],
    minWidth: 0,
  },
  disabled: {
    opacity: 0.4,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
    minHeight: designSystem.header.height,
  },
  logo: {
    borderRadius: designSystem.radius.md,
    height: 40,
    width: 40,
  },
  pressed: {
    backgroundColor: componentColors.primaryGreenSoft,
  },
  subtitle: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelM,
  },
});
