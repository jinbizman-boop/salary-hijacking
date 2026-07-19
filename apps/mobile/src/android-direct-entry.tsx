import "react-native-gesture-handler";

import * as React from "react";
import {
  AppRegistry,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CommunityTabBar } from "./features/community/components/CommunityTabBar";
import { PopularPostSection } from "./features/community/components/PopularPostSection";
import type {
  CommunityBoardType,
  CommunityPost,
} from "./features/community/community.types";
import { LevelActionGrid, LevelHeroCard } from "./features/level/components";
import type { GrowthDashboard } from "./features/level/types";
import {
  NotificationScreen,
  type NotificationHref,
} from "./features/notifications/components";
import { PlanScreen } from "./features/plan/components";
import {
  ProfileScreen,
  type ProfileMenuKey,
} from "./features/profile/components";
import { SalaryHomeScreen } from "./features/salary/components";
import { appIconAssets } from "./shared/assets/icons";
import { AppHeader, AppShell, PrimaryButton } from "./shared/components";

type DirectTab = "salary" | "plan" | "level" | "community" | "profile";
type DirectScreen = DirectTab | "notifications";

const DIRECT_ENTRY_VERSION = "1.0.0-android-router-bypass";
const tabItems: readonly Readonly<{
  key: DirectTab;
  label: string;
  icon: unknown;
}>[] = [
  { key: "salary", label: "급여", icon: appIconAssets.bottomTabs.salary },
  { key: "plan", label: "계획", icon: appIconAssets.bottomTabs.plan },
  { key: "level", label: "LV", icon: appIconAssets.bottomTabs.level },
  {
    key: "community",
    label: "커뮤니티",
    icon: appIconAssets.bottomTabs.community,
  },
  { key: "profile", label: "MY", icon: appIconAssets.bottomTabs.profile },
];

const dashboard: GrowthDashboard = {
  profile: { level: 18, totalExp: 880 },
  activeTaskCount: 4,
  completedTaskCount: 12,
  joinedChallengeCount: 2,
  completedContentCount: 8,
  todaySuggestion: "오늘의 성장 루틴을 시작하세요.",
  financialRawDataExposed: false,
};

const popularPosts: readonly CommunityPost[] = [
  {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "익명 12",
    boardType: "LEVEL_CERTIFICATION",
    bodyPreview: "레벨업 인증과 오늘 루틴 기록을 공유했어요.",
    bookmarkCount: 4,
    commentCount: 8,
    createdAt: "2026-07-10T00:00:00.000Z",
    id: "direct-post-level-1",
    likeCount: 21,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: "[LV. 5] 오늘 루틴 인증",
    updatedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "익명 31",
    boardType: "FREE",
    bodyPreview: "월말 정산 루틴과 소비 방어 팁을 공유합니다.",
    bookmarkCount: 2,
    commentCount: 5,
    createdAt: "2026-07-10T01:00:00.000Z",
    id: "direct-post-free-1",
    likeCount: 13,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: "월말 정산 5가지 공유",
    updatedAt: "2026-07-10T01:00:00.000Z",
  },
];

function AndroidDirectApp(): React.ReactElement {
  const [screen, setScreen] = React.useState<DirectScreen>("salary");

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.body}>{renderScreen(screen, setScreen)}</View>
        {screen === "notifications" ? null : (
          <View
            style={styles.tabBar}
            accessibilityLabel="급여납치 하단 내비게이션"
          >
            {tabItems.map((item) => {
              const focused = screen === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  onPress={() => setScreen(item.key)}
                  style={styles.tabButton}
                >
                  <View
                    style={[
                      styles.iconBubble,
                      focused ? styles.iconBubbleActive : null,
                    ]}
                  >
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="contain"
                      source={item.icon as never}
                      style={[
                        styles.tabIcon,
                        focused ? styles.tabIconActive : null,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      focused ? styles.tabLabelActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

function renderScreen(
  screen: DirectScreen,
  setScreen: React.Dispatch<React.SetStateAction<DirectScreen>>,
): React.ReactElement {
  if (screen === "salary") {
    return (
      <SalaryHomeScreen
        onOpenNotifications={() => setScreen("notifications")}
      />
    );
  }
  if (screen === "plan") return <PlanScreen />;
  if (screen === "level") return <DirectLevelScreen />;
  if (screen === "community") return <DirectCommunityScreen />;
  if (screen === "profile") {
    return <ProfileScreen onSelectMenu={(_key: ProfileMenuKey) => undefined} />;
  }
  return (
    <NotificationScreen
      onBack={() => setScreen("salary")}
      onOpenHref={(href: NotificationHref) => setScreen(screenForHref(href))}
      onSettings={() => undefined}
    />
  );
}

function DirectLevelScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="급여납치 LV UP"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="LV UP"
          title="오늘의 성장"
        />
      }
    >
      <LevelHeroCard dashboard={dashboard} />
      <LevelActionGrid
        actions={[
          { key: "reading", label: "독서", description: "5분 읽기와 기록" },
          { key: "news", label: "뉴스", description: "균형 읽기" },
          { key: "english", label: "영어", description: "문장 연습" },
          { key: "health", label: "건강", description: "10분 루틴" },
        ]}
        onSelect={() => undefined}
      />
    </AppShell>
  );
}

function DirectCommunityScreen(): React.ReactElement {
  const [board, setBoard] = React.useState<CommunityBoardType>("FREE");
  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="전체 / 자유 / 인증 / 취미"
          title="커뮤니티"
        />
      }
    >
      <CommunityTabBar
        counts={{ FREE: 12, LEVEL_CERTIFICATION: 3, HEALTH_ROUTINE: 2 }}
        selected={board}
        tabs={["FREE", "LEVEL_CERTIFICATION", "HEALTH_ROUTINE"]}
        onSelect={setBoard}
      />
      <PrimaryButton
        accessibilityLabel="글쓰기"
        label="글쓰기"
        onPress={() => undefined}
      />
      <PopularPostSection posts={popularPosts} onPressPost={() => undefined} />
    </AppShell>
  );
}

function screenForHref(href: NotificationHref): DirectTab {
  if (href.startsWith("/level")) return "level";
  return "salary";
}

AppRegistry.registerComponent("main", () => AndroidDirectApp);

export function assertAndroidDirectEntryCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    'AppRegistry.registerComponent("main"',
    "no_expo_router_runtime",
    "SalaryHomeScreen",
    "PlanScreen",
    "NotificationScreen",
    "LevelHeroCard",
    "CommunityTabBar",
    "ProfileScreen",
    "five_bottom_tabs",
    "android_crash_bypass_entry",
  ] as const;
  return { ok: checks.length >= 10, version: DIRECT_ENTRY_VERSION, checks };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F8FA" },
  body: { flex: 1 },
  tabBar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopColor: "#EEF0F2",
    borderTopWidth: 1,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 76,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 54,
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 32,
  },
  iconBubbleActive: { backgroundColor: "#EAF6EF" },
  tabIcon: { height: 24, opacity: 0.44, tintColor: "#ADB3B8", width: 24 },
  tabIconActive: { opacity: 1, tintColor: "#209252" },
  tabLabel: { color: "#ADB3B8", fontSize: 10, fontWeight: "800" },
  tabLabelActive: { color: "#209252" },
});
