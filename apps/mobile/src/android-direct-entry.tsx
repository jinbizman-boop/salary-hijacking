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

import { CommunityWriteForm } from "./features/community/components/CommunityWriteForm";
import { CommunityTabBar } from "./features/community/components/CommunityTabBar";
import { PopularPostSection } from "./features/community/components/PopularPostSection";
import type {
  CommunityBoardType,
  CommunityPostDraft,
  CommunityValidationIssue,
  CommunityValidationResult,
  CommunityPost,
} from "./features/community/community.types";
import {
  EnglishLessonCard,
  LevelActionGrid,
  LevelHeroCard,
  NewsBalanceCard,
  ReadingContentCard,
  WorkoutTimerCard,
} from "./features/level/components";
import { levelDetailContent } from "./features/level/detail-content";
import type { GrowthDashboard } from "./features/level/types";
import {
  NotificationScreen,
  type NotificationHref,
} from "./features/notifications/components";
import { PlanScreen } from "./features/plan/components";
import {
  ProfileDetailScreen,
  ProfileScreen,
  type ProfileDetailVariant,
  type ProfileMenuKey,
} from "./features/profile/components";
import { SalaryHomeScreen } from "./features/salary/components";
import { appIconAssets } from "./shared/assets/icons";
import { AppHeader, AppShell, PrimaryButton } from "./shared/components";

type DirectTab = "salary" | "plan" | "level" | "community" | "profile";
type DirectLevelDetail =
  | "level-reading"
  | "level-news"
  | "level-english"
  | "level-health";
type DirectProfileDetail =
  | "profile-community"
  | "profile-level"
  | "profile-support"
  | "profile-notices"
  | "profile-account";
type DirectScreen =
  | DirectTab
  | DirectLevelDetail
  | DirectProfileDetail
  | "community-write"
  | "notification-settings"
  | "notifications";

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

type AndroidDirectErrorBoundaryState = Readonly<{ failed: boolean }>;

class AndroidDirectErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AndroidDirectErrorBoundaryState
> {
  override state: AndroidDirectErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AndroidDirectErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(): void {
    // Intentionally avoid printing raw error objects because startup payloads can
    // include environment or device details. QA uses logcat native fatal filters.
  }

  override render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <SafeAreaProvider>
        <View style={styles.root}>
          <View style={styles.errorCard}>
            <Text accessibilityRole="header" style={styles.errorTitle}>
              급여납치 실행 오류
            </Text>
            <Text style={styles.errorText}>
              화면을 준비하는 중 문제가 발생했습니다. 앱을 다시 열어 주세요.
            </Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }
}

function AndroidDirectRoot(): React.ReactElement {
  return (
    <AndroidDirectErrorBoundary>
      <AndroidDirectApp />
    </AndroidDirectErrorBoundary>
  );
}

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
  if (screen === "level") {
    return (
      <DirectLevelScreen
        onOpenDetail={(detailScreen) => setScreen(detailScreen)}
      />
    );
  }
  if (screen.startsWith("level-")) {
    return renderLevelDetailScreen(screen as DirectLevelDetail, () =>
      setScreen("level"),
    );
  }
  if (screen === "community") {
    return (
      <DirectCommunityScreen onWrite={() => setScreen("community-write")} />
    );
  }
  if (screen === "community-write") {
    return renderCommunityWriteScreen(() => setScreen("community"));
  }
  if (screen === "profile") {
    return (
      <ProfileScreen
        onSelectMenu={(key: ProfileMenuKey) =>
          setScreen(screenForProfileMenu(key))
        }
      />
    );
  }
  if (screen.startsWith("profile-")) {
    return renderProfileDetailScreen(screen as DirectProfileDetail, () =>
      setScreen("profile"),
    );
  }
  if (screen === "notification-settings") {
    return renderNotificationSettingsScreen(() => setScreen("notifications"));
  }
  return (
    <NotificationScreen
      onBack={() => setScreen("salary")}
      onOpenHref={(href: NotificationHref) => setScreen(screenForHref(href))}
      onSettings={() => setScreen("notification-settings")}
    />
  );
}

function DirectLevelScreen({
  onOpenDetail,
}: Readonly<{
  onOpenDetail: (screen: DirectLevelDetail) => void;
}>): React.ReactElement {
  const [message, setMessage] =
    React.useState("오늘의 레벨업을 선택해 주세요.");
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
        onSelect={(key) => {
          setMessage(`${key} 레벨업 화면으로 이동합니다.`);
          if (key === "reading") onOpenDetail("level-reading");
          else if (key === "news") onOpenDetail("level-news");
          else if (key === "english") onOpenDetail("level-english");
          else if (key === "health") onOpenDetail("level-health");
        }}
      />
      <View accessibilityLiveRegion="polite" style={styles.inlineStatus}>
        <Text style={styles.inlineStatusText}>{message}</Text>
      </View>
      <View style={styles.quickActions}>
        <PrimaryButton
          accessibilityLabel="독서 레벨업 열기"
          label="독서"
          onPress={() => onOpenDetail("level-reading")}
          variant="secondary"
        />
      </View>
    </AppShell>
  );
}

function DirectCommunityScreen({
  onWrite,
}: Readonly<{ onWrite: () => void }>): React.ReactElement {
  const [board, setBoard] = React.useState<CommunityBoardType>("FREE");
  const [message, setMessage] = React.useState(
    "게시판을 선택하거나 글쓰기를 열어 주세요.",
  );
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
        onPress={onWrite}
      />
      <PrimaryButton
        accessibilityLabel="커뮤니티 글쓰기 화면 열기"
        label="글쓰기 화면 열기"
        onPress={onWrite}
        variant="secondary"
      />
      <Text accessibilityLiveRegion="polite" style={styles.inlineStatusText}>
        {message}
      </Text>
      <PopularPostSection
        posts={popularPosts}
        onPressPost={(post) =>
          setMessage(`${post.title} 상세 화면을 준비합니다.`)
        }
      />
    </AppShell>
  );
}

function renderLevelDetailScreen(
  screen: DirectLevelDetail,
  onBack: () => void,
): React.ReactElement {
  return <DirectLevelDetailScreen onBack={onBack} screen={screen} />;
}

function DirectLevelDetailScreen({
  onBack,
  screen,
}: Readonly<{
  onBack: () => void;
  screen: DirectLevelDetail;
}>): React.ReactElement {
  const content =
    screen === "level-reading"
      ? levelDetailContent.READING
      : screen === "level-news"
        ? levelDetailContent.NEWS
        : screen === "level-english"
          ? levelDetailContent.ENGLISH
          : levelDetailContent.HEALTH;
  const [message, setMessage] = React.useState(
    "기록을 남기면 XP가 서버 기준으로 반영됩니다.",
  );
  const record = (): void =>
    setMessage("기록을 저장했습니다. 서버 동기화를 기다리는 중입니다.");

  return (
    <AppShell
      accessibilityLabel={`${content.title} 상세`}
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="LV UP"
          title={content.title}
        />
      }
    >
      <PrimaryButton
        accessibilityLabel="LV UP 메인으로 돌아가기"
        label="뒤로"
        onPress={onBack}
        variant="secondary"
      />
      {screen === "level-reading" ? (
        <ReadingContentCard
          content={content}
          onRecord={record}
          onStart={record}
        />
      ) : null}
      {screen === "level-news" ? (
        <NewsBalanceCard content={content} onRecord={record} />
      ) : null}
      {screen === "level-english" ? (
        <EnglishLessonCard content={content} onRecord={record} />
      ) : null}
      {screen === "level-health" ? (
        <WorkoutTimerCard content={content} onRecord={record} />
      ) : null}
      <Text accessibilityLiveRegion="polite" style={styles.inlineStatusText}>
        {message}
      </Text>
    </AppShell>
  );
}

const emptyCommunityDraft: CommunityPostDraft = {
  anonymous: true,
  boardType: "FREE",
  content: "",
  tags: [],
  title: "",
};

function validateDirectCommunityDraft(
  draft: CommunityPostDraft,
): CommunityValidationResult {
  const issues: CommunityValidationIssue[] = [];
  if (draft.title.trim().length < 2) {
    issues.push({
      code: "TOO_SHORT",
      field: "title",
      message: "제목을 입력해 주세요.",
    });
  }
  if (draft.content.trim().length < 5) {
    issues.push({
      code: "TOO_SHORT",
      field: "content",
      message: "본문을 입력해 주세요.",
    });
  }
  return {
    issues,
    moderationStatus: issues.length > 0 ? "REVIEW" : "SAFE",
    valid: issues.length === 0,
  };
}

function renderCommunityWriteScreen(onBack: () => void): React.ReactElement {
  return <DirectCommunityWriteScreen onBack={onBack} />;
}

function DirectCommunityWriteScreen({
  onBack,
}: Readonly<{ onBack: () => void }>): React.ReactElement {
  const [draft, setDraft] =
    React.useState<CommunityPostDraft>(emptyCommunityDraft);
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState("글쓰기 임시 저장 상태입니다.");
  const validation = validateDirectCommunityDraft(draft);

  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티 글쓰기"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="커뮤니티"
          title="글쓰기"
        />
      }
    >
      <PrimaryButton
        accessibilityLabel="커뮤니티로 돌아가기"
        label="뒤로"
        onPress={onBack}
        variant="secondary"
      />
      <CommunityWriteForm
        draft={draft}
        onChange={(nextDraft) => {
          setDraft(nextDraft);
          setMessage("작성 중인 글은 이 화면에 보존됩니다.");
        }}
        onPreview={() => setMessage("미리보기 준비가 완료되었습니다.")}
        onSubmit={() => {
          setSubmitting(true);
          setMessage(
            "게시 요청을 접수했습니다. QA 모드에서는 서버 응답 대기 상태로 표시합니다.",
          );
          setSubmitting(false);
        }}
        submitting={submitting}
        validation={validation}
      />
      <Text accessibilityLiveRegion="polite" style={styles.inlineStatusText}>
        {message}
      </Text>
    </AppShell>
  );
}

function renderProfileDetailScreen(
  screen: DirectProfileDetail,
  onBack: () => void,
): React.ReactElement {
  const variant: ProfileDetailVariant =
    screen === "profile-community"
      ? "community"
      : screen === "profile-level"
        ? "level"
        : screen === "profile-support"
          ? "support"
          : screen === "profile-notices"
            ? "notices"
            : "account";
  return (
    <AppShell accessibilityLabel="급여납치 MY 상세">
      <PrimaryButton
        accessibilityLabel="MY로 돌아가기"
        label="뒤로"
        onPress={onBack}
        variant="secondary"
      />
      <ProfileDetailScreen variant={variant} />
    </AppShell>
  );
}

function renderNotificationSettingsScreen(
  onBack: () => void,
): React.ReactElement {
  return <DirectNotificationSettingsScreen onBack={onBack} />;
}

function DirectNotificationSettingsScreen({
  onBack,
}: Readonly<{ onBack: () => void }>): React.ReactElement {
  const [enabled, setEnabled] = React.useState(true);
  return (
    <AppShell
      accessibilityLabel="급여납치 알림 설정"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="알림"
          title="알림 설정"
        />
      }
    >
      <PrimaryButton
        accessibilityLabel="알림 목록으로 돌아가기"
        label="뒤로"
        onPress={onBack}
        variant="secondary"
      />
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>푸시 알림</Text>
        <Text style={styles.settingDescription}>
          급여일, 지출 예정, LV UP, 커뮤니티 반응을 한곳에서 관리합니다.
        </Text>
        <PrimaryButton
          accessibilityLabel={enabled ? "푸시 알림 끄기" : "푸시 알림 켜기"}
          label={enabled ? "켜짐" : "끄짐"}
          onPress={() => setEnabled((value) => !value)}
          variant={enabled ? "primary" : "secondary"}
        />
      </View>
    </AppShell>
  );
}

function screenForHref(href: NotificationHref): DirectTab {
  if (href.startsWith("/level")) return "level";
  return "salary";
}

function screenForProfileMenu(key: ProfileMenuKey): DirectProfileDetail {
  if (key === "MY_POSTS") return "profile-community";
  if (key === "MY_LEVEL") return "profile-level";
  if (key === "SUPPORT") return "profile-support";
  if (key === "NOTICES") return "profile-notices";
  return "profile-account";
}

AppRegistry.registerComponent("main", () => AndroidDirectRoot);

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
    "renderLevelDetailScreen",
    "renderCommunityWriteScreen",
    "renderProfileDetailScreen",
    "renderNotificationSettingsScreen",
    "AndroidDirectErrorBoundary",
    "android_crash_bypass_entry",
  ] as const;
  return { ok: checks.length >= 10, version: DIRECT_ENTRY_VERSION, checks };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F8FA" },
  body: { flex: 1 },
  errorCard: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    gap: 10,
    margin: 24,
    marginTop: 96,
    padding: 20,
  },
  errorText: {
    color: "#5B6268",
    fontSize: 14,
    lineHeight: 21,
  },
  errorTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
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
  inlineStatus: {
    borderRadius: 12,
    backgroundColor: "#EAF6EF",
    padding: 12,
  },
  inlineStatusText: {
    color: "#176B5B",
    fontSize: 12,
    fontWeight: "800",
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  settingCard: {
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  settingDescription: {
    color: "#5B6268",
    fontSize: 13,
    lineHeight: 19,
  },
  settingTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  tabIcon: { height: 24, opacity: 0.44, tintColor: "#ADB3B8", width: 24 },
  tabIconActive: { opacity: 1, tintColor: "#209252" },
  tabLabel: { color: "#ADB3B8", fontSize: 10, fontWeight: "800" },
  tabLabelActive: { color: "#209252" },
});
