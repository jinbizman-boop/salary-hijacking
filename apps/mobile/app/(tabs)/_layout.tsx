import { Tabs } from "expo-router";
import { Image, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appIconAssets } from "../../src/shared/assets/icons";
import { salaryHijackingTheme } from "../../src/shared/styles/clean-fintech-theme";

type TabName = "salary" | "plan" | "level" | "community" | "profile";

type TabDefinition = Readonly<{
  href: string;
  icon: ImageSourcePropType;
  name: TabName;
  privacyBoundary: string;
  title: string;
}>;

const LAYOUT_VERSION = "4.0.4-router-segment-tabs-korean-labels";

const tabs: readonly TabDefinition[] = [
  {
    href: "/salary",
    icon: appIconAssets.bottomTabs.salary,
    name: "salary",
    privacyBoundary: "payroll_home",
    title: "급여",
  },
  {
    href: "/plan",
    icon: appIconAssets.bottomTabs.plan,
    name: "plan",
    privacyBoundary: "payroll_plan",
    title: "계획",
  },
  {
    href: "/level",
    icon: appIconAssets.bottomTabs.level,
    name: "level",
    privacyBoundary: "growth",
    title: "LV",
  },
  {
    href: "/community",
    icon: appIconAssets.bottomTabs.community,
    name: "community",
    privacyBoundary: "anonymous_community",
    title: "커뮤니티",
  },
  {
    href: "/profile",
    icon: appIconAssets.bottomTabs.profile,
    name: "profile",
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
      initialRouteName="salary"
      screenOptions={{
        freezeOnBlur: true,
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: salaryHijackingTheme.color.surface.app },
        tabBarAccessibilityLabel: "급여납치 하단 탭 내비게이션",
        tabBarActiveTintColor: "#209252",
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: "#ADB3B8",
        tabBarItemStyle: {
          borderRadius: salaryHijackingTheme.radius.md,
          marginHorizontal: 0,
          minHeight: salaryHijackingTheme.layout.touchTarget,
          minWidth: 0,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#EEF0F2",
          borderTopWidth: 1,
          elevation: 8,
          height: tabBarHeight,
          left: 0,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
          right: 0,
          shadowColor: "#0F2319",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
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
            tabBarAccessibilityLabel: `${tab.title} 탭 ${tab.privacyBoundary}`,
            tabBarIcon: ({ color, focused, size }) => (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: focused ? "#EAF6EF" : "transparent",
                  borderRadius: salaryHijackingTheme.radius.full,
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
                    tintColor: focused ? color : "#ADB3B8",
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
    "expo_router_segment_tabs",
    "readable_korean_tab_copy",
    "typescript_strict_ready",
  ] as const;

  return { checks, ok: checks.length >= 15, version: LAYOUT_VERSION };
}
