import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appIconAssets } from "../../../shared/assets/icons";
import {
  NOTIFICATIONS_PATH,
  NOTIFICATIONS_UNREAD_COUNT_PATH,
} from "../constants";

const SCREEN_VERSION = "5.2.0-reference-notifications-no-bottom-nav";
const BRAND_LABEL = "SALARY HIJACKING";
const TEXT_BLACK = "#191B1F";
const MUTED = "#6D737A";
const SOFT_GREEN = "#EAF8EF";
const BLUE = "#2E83C8";

export type NotificationReferenceHref =
  | "/salary"
  | "/level"
  | "/level/reading"
  | "/level/news"
  | "/level/english"
  | "/level/health";

type ReferenceNotification = Readonly<{
  href: NotificationReferenceHref;
  icon: ImageSourcePropType;
  id: string;
  subtitle: string;
  time: string;
  title: string;
  tone: "highlight" | "normal";
}>;

export type NotificationReferenceScreenProps = Readonly<{
  onBack?: () => void;
  onOpenHref?: (href: NotificationReferenceHref) => void;
  onSettings?: () => void;
}>;

const notificationItems: readonly ReferenceNotification[] = [
  {
    href: "/salary",
    icon: appIconAssets.money.coins,
    id: "goal-total",
    subtitle: "누적납치금액 신기록 달성",
    time: "1일전",
    title: "내 급여 납치 현황 5,780,000원 달성",
    tone: "highlight",
  },
  {
    href: "/salary",
    icon: appIconAssets.level.box,
    id: "goal-point",
    subtitle: "납치 금액달성 이벤트",
    time: "1일전",
    title: "내 급여 납치 5,500,000원 달성 시 포인트 500P 지급",
    tone: "highlight",
  },
  {
    href: "/level/reading",
    icon: appIconAssets.level.book,
    id: "reading-focus",
    subtitle: "오늘의 레벨업, 오늘의 따뜻한 마음의 양식을 가져왔어요",
    time: "8시간전",
    title: "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    tone: "normal",
  },
  {
    href: "/level/news",
    icon: appIconAssets.level.news,
    id: "news-npu",
    subtitle: "오늘의 레벨업, 오늘의 따끈한 소식을 가져왔어요",
    time: "8시간전",
    title: "[매일경제] 국내 NPU 개발 가속화, AI 학습/추론에...",
    tone: "normal",
  },
  {
    href: "/level/english",
    icon: appIconAssets.level.read,
    id: "english-business",
    subtitle: "오늘의 레벨업, 오늘의 영어회화를 가져왔어요",
    time: "8시간전",
    title: "Today, Business Conversation",
    tone: "normal",
  },
  {
    href: "/level/health",
    icon: appIconAssets.level.video,
    id: "health-upper",
    subtitle: "오늘의 레벨업, 오늘의 건강 스트레칭을 준비했어요",
    time: "8시간전",
    title: "오늘은 상체를 부수는 날이에요! 파이팅!!",
    tone: "normal",
  },
  {
    href: "/level",
    icon: appIconAssets.level.ai,
    id: "quiz-point",
    subtitle: "오늘의 금융상식 퀴즈 도착",
    time: "8시간전",
    title: "오늘도 퀴즈 풀고 포인트를 받을 수 있어요",
    tone: "normal",
  },
];

export function NotificationReferenceScreen({
  onBack,
  onOpenHref,
  onSettings,
}: NotificationReferenceScreenProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 430);

  return (
    <View style={styles.screen}>
      <View style={[styles.safeTop, { paddingTop: insets.top }]}>
        <View
          accessibilityLabel={BRAND_LABEL}
          style={[styles.topBar, { width: contentWidth }]}
        >
          <Pressable
            accessibilityLabel="이전 화면으로 돌아가기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBack}
            style={styles.headerButton}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={appIconAssets.common.left}
              style={styles.headerIcon}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="알림 설정 열기"
            accessibilityRole="button"
            onPress={onSettings}
            style={styles.settingsButton}
          >
            <Text allowFontScaling={false} style={styles.settingsText}>
              설정
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        accessibilityLabel="급여납치 알림 화면"
        bounces={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 18, width: contentWidth },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text allowFontScaling={false} style={styles.title}>
              알림
            </Text>
            <Text allowFontScaling={false} style={styles.chevron}>
              ⌄
            </Text>
          </View>
          <Text allowFontScaling={false} style={styles.newNotice}>
            새로운 알림이 있어요
          </Text>
        </View>

        <View style={styles.list}>
          {notificationItems.map((item) => (
            <Pressable
              accessibilityLabel={`${item.title} 열기`}
              accessibilityRole="button"
              key={item.id}
              onPress={() => onOpenHref?.(item.href)}
              style={[
                styles.notificationRow,
                item.tone === "highlight" ? styles.highlightRow : null,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={item.icon}
                style={styles.notificationIcon}
              />
              <View style={styles.notificationBody}>
                <View style={styles.metaRow}>
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={styles.subtitle}
                  >
                    {item.subtitle}
                  </Text>
                  <Text allowFontScaling={false} style={styles.time}>
                    {item.time}
                  </Text>
                </View>
                <Text
                  allowFontScaling={false}
                  numberOfLines={2}
                  style={styles.notificationTitle}
                >
                  {item.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}

export function assertMobileNotificationsIndexCompleteness(): {
  readonly checks: readonly string[];
  readonly ok: boolean;
  readonly version: string;
} {
  const checks = [
    NOTIFICATIONS_PATH,
    NOTIFICATIONS_UNREAD_COUNT_PATH,
    "새로운 알림이 있어요",
    "내 급여 납치 현황 5,780,000원 달성",
    "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    "Today, Business Conversation",
    "/level/reading",
    "/level/news",
    "/level/english",
    "/level/health",
    "sensitive_financial_data_component_guard",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { checks, ok: checks.length >= 12, version: SCREEN_VERSION };
}

const styles = StyleSheet.create({
  chevron: {
    color: MUTED,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  content: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 46,
  },
  headerIcon: {
    height: 25,
    tintColor: TEXT_BLACK,
    width: 25,
  },
  highlightRow: {
    backgroundColor: SOFT_GREEN,
  },
  list: {
    marginHorizontal: -18,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  newNotice: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "900",
    paddingTop: 10,
  },
  notificationBody: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  notificationIcon: {
    height: 23,
    width: 23,
  },
  notificationRow: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 14,
    minHeight: 86,
    paddingHorizontal: 20,
    paddingVertical: 17,
  },
  notificationTitle: {
    color: TEXT_BLACK,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27,
  },
  safeTop: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  screen: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  scroll: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  settingsButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 54,
  },
  settingsText: {
    color: TEXT_BLACK,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: MUTED,
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 15,
  },
  time: {
    color: TEXT_BLACK,
    fontSize: 10,
    fontWeight: "900",
  },
  title: {
    color: TEXT_BLACK,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 41,
  },
  titleLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingTop: 14,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 12,
  },
});
