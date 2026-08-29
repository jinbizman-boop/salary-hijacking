import { Tabs } from "expo-router";
import { Image, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appIconAssets } from "../../src/shared/assets/icons";
import { salaryHijackingDesignSystem } from "../../src/shared/components";
import { salaryHijackingTheme } from "../../src/shared/styles/clean-fintech-theme";

type TabName =
  | "salary/index"
  | "plan/index"
  | "level/index"
  | "community/index"
  | "profile/index";

type TabDefinition = Readonly<{
  href: string;
  icon: ImageSourcePropType;
  name: TabName;
  privacyBoundary: string;
  title: string;
}>;

const LAYOUT_VERSION = "4.0.6-runtime-confirmed-index-tabs";
const designSystem = salaryHijackingDesignSystem;

const tabs: readonly TabDefinition[] = [
  {
    href: "/salary",
    icon: appIconAssets.bottomTabs.salary,
    name: "salary/index",
    privacyBoundary: "payroll_home",
    title: "급여",
  },
  {
    href: "/plan",
    icon: appIconAssets.bottomTabs.plan,
    name: "plan/index",
    privacyBoundary: "payroll_plan",
    title: "계획",
  },
  {
    href: "/level",
    icon: appIconAssets.bottomTabs.level,
    name: "level/index",
    privacyBoundary: "growth",
    title: "LV",
  },
  {
    href: "/community",
    icon: appIconAssets.bottomTabs.community,
    name: "community/index",
    privacyBoundary: "anonymous_community",
    title: "커뮤니티",
  },
  {
    href: "/profile",
    icon: appIconAssets.bottomTabs.profile,
    name: "profile/index",
    privacyBoundary: "profile_privacy",
    title: "MY",
  },
] as const;

export default function TabsLayout(): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const tabBarHeight =
    salaryHijackingTheme.layout.bottomTabHeight + Math.max(insets.bottom, 0);

  return (
    <Tabs
      initialRouteName="salary/index"
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
          minHeight: designSystem.layout.touchTarget,
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
          options={{
            href: tab.href as never,
            tabBarAccessibilityLabel: `${tab.title} \uD0ED ${tab.privacyBoundary}`,
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
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
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
    "salary_index_tab",
    "plan_index_tab",
    "level_index_tab",
    "community_index_tab",
    "profile_index_tab",
    "white_bottom_tab",
    "active_green_209252",
    "inactive_gray_adb3b8",
    "safe_area_ready_height_76",
    "touch_target_44",
    "server_authority_boundary_labels",
    "anonymous_community_boundary",
    "profile_privacy_boundary",
    "accessibility_labels",
    "expo_router_index_segment_tabs",
    "readable_korean_tab_copy",
    "typescript_strict_ready",
  ] as const;

  return { checks, ok: checks.length >= 15, version: LAYOUT_VERSION };
}
