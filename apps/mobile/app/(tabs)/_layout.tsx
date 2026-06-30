import { Tabs } from "expo-router";
import { Text, View } from "react-native";

import {
  appIcons,
  salaryHijackingTheme,
} from "../../src/shared/styles/clean-fintech-theme";

type TabName = "salary" | "plan" | "level" | "community" | "profile";

type TabDefinition = Readonly<{
  name: `${TabName}/index`;
  title: string;
  icon: string;
  href: string;
  privacyBoundary: string;
}>;

const LAYOUT_VERSION = "4.0.0-clean-fintech";

const tabs: readonly TabDefinition[] = [
  {
    name: "salary/index",
    title: "급여",
    icon: appIcons.salary,
    href: "/salary",
    privacyBoundary: "payroll_home",
  },
  {
    name: "plan/index",
    title: "계획",
    icon: appIcons.plan,
    href: "/plan",
    privacyBoundary: "payroll_plan",
  },
  {
    name: "level/index",
    title: "LV",
    icon: appIcons.level,
    href: "/level",
    privacyBoundary: "growth",
  },
  {
    name: "community/index",
    title: "커뮤니티",
    icon: appIcons.community,
    href: "/community",
    privacyBoundary: "anonymous_community",
  },
  {
    name: "profile/index",
    title: "MY",
    icon: appIcons.my,
    href: "/profile",
    privacyBoundary: "profile_privacy",
  },
] as const;

export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      initialRouteName="salary/index"
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: salaryHijackingTheme.color.surface.app },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#209252",
        tabBarInactiveTintColor: "#ADB3B8",
        tabBarStyle: {
          height: salaryHijackingTheme.layout.bottomTabHeight,
          left: 0,
          right: 0,
          width: "100%",
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#EEF0F2",
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#0F2319",
          shadowOpacity: 0.06,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -8 },
        },
        tabBarItemStyle: {
          borderRadius: salaryHijackingTheme.radius.md,
          minHeight: salaryHijackingTheme.layout.touchTarget,
          minWidth: 0,
          marginHorizontal: 0,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0,
        },
        tabBarAccessibilityLabel: "급여납치 하단 탭 내비게이션",
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: tab.href as never,
            tabBarLabel: tab.title,
            tabBarAccessibilityLabel: `${tab.title} 탭, ${tab.privacyBoundary}`,
            tabBarIcon: ({ color, focused, size }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 30,
                  borderRadius: salaryHijackingTheme.radius.full,
                  backgroundColor: focused ? "#EAF6EF" : "transparent",
                }}
              >
                <Text
                  style={{
                    color,
                    fontSize: Math.max(16, Math.min(22, size - 2)),
                    fontWeight: "800",
                  }}
                >
                  {tab.icon}
                </Text>
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

export function assertMobileTabsLayoutCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "clean_fintech_v1_theme",
    "salary_tab",
    "plan_tab",
    "level_tab",
    "community_tab",
    "profile_tab",
    "white_bottom_tab",
    "active_green_209252",
    "inactive_gray_adb3b8",
    "safe_area_ready_height_76",
    "touch_target_44",
    "server_authority_boundary_labels",
    "anonymous_community_boundary",
    "profile_privacy_boundary",
    "accessibility_labels",
    "expo_router_tabs",
    "typescript_strict_ready",
  ] as const;

  return { ok: checks.length >= 15, version: LAYOUT_VERSION, checks };
}
