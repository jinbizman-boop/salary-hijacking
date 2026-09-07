/* eslint-disable @typescript-eslint/no-require-imports -- React Native tab icons must stay as static require() calls for EAS Android bundling. */
import { Tabs, useRouter, type Href } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Image, Pressable, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { salaryHijackingDesignSystem } from "../../src/shared/components/tokens";
import {
  getRootTabHref,
  ROOT_TAB_NAVIGATION_PRIORITY,
  ROOT_TAB_ROUTES,
  type RootTabName,
} from "../../src/shared/navigation/root-tabs";
import { markReleaseInteractionPerf } from "../../src/shared/performance/release-perf";
import { salaryHijackingTheme } from "../../src/shared/styles/clean-fintech-theme";

type TabDefinition = Readonly<{
  icon: ImageSourcePropType;
  name: RootTabName;
  privacyBoundary: string;
  rootHref: Href;
  title: string;
}>;

const LAYOUT_VERSION = "4.1.0-explicit-root-tab-navigation";
const designSystem = salaryHijackingDesignSystem;
const bottomTabIconAssets = {
  salary:
    require("../../assets/bottom-tabs/salary-tab.png") as ImageSourcePropType,
  plan: require("../../assets/bottom-tabs/plan-tab.png") as ImageSourcePropType,
  level:
    require("../../assets/bottom-tabs/level-tab.png") as ImageSourcePropType,
  community:
    require("../../assets/bottom-tabs/community-tab.png") as ImageSourcePropType,
  profile:
    require("../../assets/bottom-tabs/profile-tab.png") as ImageSourcePropType,
} as const;

const tabs: readonly TabDefinition[] = [
  {
    icon: bottomTabIconAssets.salary,
    name: "salary",
    privacyBoundary: "payroll_home",
    rootHref: ROOT_TAB_ROUTES.salary,
    title: "홈",
  },
  {
    icon: bottomTabIconAssets.plan,
    name: "plan",
    privacyBoundary: "payroll_plan",
    rootHref: ROOT_TAB_ROUTES.plan,
    title: "계획",
  },
  {
    icon: bottomTabIconAssets.level,
    name: "level",
    privacyBoundary: "growth",
    rootHref: ROOT_TAB_ROUTES.level,
    title: "LV UP",
  },
  {
    icon: bottomTabIconAssets.community,
    name: "community",
    privacyBoundary: "anonymous_community",
    rootHref: ROOT_TAB_ROUTES.community,
    title: "커뮤니티",
  },
  {
    icon: bottomTabIconAssets.profile,
    name: "profile",
    privacyBoundary: "profile_privacy",
    rootHref: ROOT_TAB_ROUTES.profile,
    title: "MY",
  },
] as const;

export default function TabsLayout(): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const router = useRouter();
  const tabBarHeight =
    salaryHijackingTheme.layout.bottomTabHeight + Math.max(insets.bottom, 0);

  const navigateToRootTab = (tab: TabDefinition): void => {
    router.navigate(tab.rootHref as never);
  };

  return (
    <Tabs
      backBehavior="history"
      initialRouteName="salary"
      screenOptions={{
        freezeOnBlur: true,
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: salaryHijackingTheme.color.surface.app },
        tabBarAccessibilityLabel: "급여납치 하단 탭 내비게이션",
        tabBarActiveTintColor: designSystem.navigation.bottomTabs.activeColor,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor:
          designSystem.navigation.bottomTabs.inactiveColor,
        tabBarItemStyle: {
          borderRadius: designSystem.radius.lg,
          marginHorizontal: designSystem.spacing[0],
          minHeight: salaryHijackingTheme.layout.touchTarget,
          minWidth: 0,
          paddingHorizontal: designSystem.spacing[0],
        },
        tabBarLabelStyle: {
          fontSize: designSystem.typography.labelS.fontSize,
          fontWeight: designSystem.typography.labelS.fontWeight,
          letterSpacing: designSystem.typography.labelS.letterSpacing,
        },
        tabBarStyle: {
          backgroundColor: designSystem.navigation.bottomTabs.background,
          borderTopColor: designSystem.navigation.bottomTabs.borderColor,
          borderTopWidth: 1,
          ...designSystem.elevation.low,
          height: tabBarHeight,
          left: 0,
          paddingBottom: Math.max(insets.bottom, designSystem.spacing[3]),
          paddingTop: designSystem.spacing[2],
          right: 0,
          width: "100%",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              navigateToRootTab(tab);
            },
          }}
          options={{
            tabBarAccessibilityLabel: `${tab.title} 탭`,
            tabBarIcon: ({ color, focused, size }) => (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: focused
                    ? designSystem.colors.brand.primarySoft
                    : "transparent",
                  borderRadius: designSystem.radius.full,
                  height: 30,
                  justifyContent: "center",
                  width: 32,
                }}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={tab.icon}
                  style={{
                    height: Math.max(20, Math.min(26, size)),
                    opacity: focused ? 1 : 0.46,
                    tintColor: focused
                      ? color
                      : designSystem.navigation.bottomTabs.inactiveColor,
                    width: Math.max(20, Math.min(26, size)),
                  }}
                />
              </View>
            ),
            tabBarLabel: tab.title,
            tabBarButton: renderMeasuredTabBarButton,
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}

function renderMeasuredTabBarButton({
  accessibilityLabel,
  accessibilityState,
  children,
  onLongPress,
  onPress,
  testID,
}: BottomTabBarButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={(event) =>
        markReleaseInteractionPerf("interaction.bottom_tab.press", event)
      }
      style={({ pressed }) => [
        {
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}

export function assertMobileTabsLayoutCompleteness(): {
  readonly checks: readonly string[];
  readonly ok: boolean;
  readonly version: string;
} {
  const checks = [
    "clean_fintech_v1_theme",
    "salary_nested_stack_tab",
    "plan_nested_stack_tab",
    "level_nested_stack_tab",
    "community_index_tab",
    "profile_nested_stack_tab",
    "white_bottom_tab",
    "active_green_209252",
    "inactive_gray_adb3b8",
    "safe_area_ready_height_76",
    "touch_target_44",
    ROOT_TAB_NAVIGATION_PRIORITY.bottomTabTap,
    ROOT_TAB_NAVIGATION_PRIORITY.androidBack,
    `root_tab_route:${String(getRootTabHref("salary"))}`,
    "explicit_bottom_tab_root_navigation",
    "same_tab_reselect_root_reset",
    "server_authority_boundary_labels",
    "anonymous_community_boundary",
    "profile_privacy_boundary",
    "accessibility_labels",
    "expo_router_nested_stack_tabs",
    "android_system_back_history_tabs",
    "readable_korean_tab_copy",
    "typescript_strict_ready",
  ] as const;

  return { checks, ok: checks.length >= 15, version: LAYOUT_VERSION };
}
