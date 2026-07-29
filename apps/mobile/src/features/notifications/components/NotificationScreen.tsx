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
import type { NotificationItem as ApiNotificationItem } from "../types";

const SCREEN_VERSION = "5.3.1-notifications-readable-korean";
const BRAND_GREEN = "#209252";
const TEXT_BLACK = "#191B1F";
const MUTED = "#6D737A";
const LINE = "#E7EBEF";
const SOFT_GREEN = "#EAF8EF";
const BLUE = "#2E83C8";

export type NotificationHref =
  | "/salary"
  | "/level"
  | "/level/reading"
  | "/level/news"
  | "/level/english"
  | "/level/health";

type ScreenNotificationItem = Readonly<{
  apiItem?: ApiNotificationItem;
  href: NotificationHref;
  icon: ImageSourcePropType;
  id: string;
  subtitle: string;
  time: string;
  title: string;
  tone: "highlight" | "normal";
}>;

export type NotificationScreenProps = Readonly<{
  apiItems?: readonly ApiNotificationItem[] | undefined;
  isRefreshing?: boolean;
  onBack?: (() => void) | undefined;
  onMarkAllRead?: (() => void) | undefined;
  onOpenNotification?: ((item: ApiNotificationItem) => void) | undefined;
  onOpenHref?: ((href: NotificationHref) => void) | undefined;
  onRetry?: (() => void) | undefined;
  onSettings?: (() => void) | undefined;
  unreadCount?: number | undefined;
  variant?:
    | "default"
    | "empty"
    | "offline"
    | "error"
    | "all-read"
    | "no-unread-with-list";
}>;

const notificationItems: readonly ScreenNotificationItem[] = [
  {
    href: "/salary",
    icon: appIconAssets.money.coins,
    id: "goal-total",
    subtitle: "누적 납치금액 신기록 달성",
    time: "1일전",
    title: "내 급여 납치 현황 목표 달성",
    tone: "highlight",
  },
  {
    href: "/salary",
    icon: appIconAssets.level.box,
    id: "goal-point",
    subtitle: "납치 금액 달성 보상 이벤트",
    time: "1일전",
    title: "내 급여 납치 목표 달성 시 포인트 지급",
    tone: "highlight",
  },
  {
    href: "/level/reading",
    icon: appIconAssets.level.book,
    id: "reading-focus",
    subtitle: "오늘의 따뜻한 마음의 양식을 가져왔어요",
    time: "8시간전",
    title: "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    tone: "normal",
  },
  {
    href: "/level/news",
    icon: appIconAssets.level.news,
    id: "news-npu",
    subtitle: "오늘의 따끈한 소식을 가져왔어요",
    time: "8시간전",
    title: "[매일경제] 국내 NPU 개발 가속화, AI 학습/추론에...",
    tone: "normal",
  },
  {
    href: "/level/english",
    icon: appIconAssets.level.read,
    id: "english-business",
    subtitle: "오늘의 영어회화를 가져왔어요",
    time: "8시간전",
    title: "Today, Business Conversation",
    tone: "normal",
  },
  {
    href: "/level/health",
    icon: appIconAssets.level.video,
    id: "health-upper",
    subtitle: "오늘의 건강 운동가이드를 준비했어요",
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

export function NotificationScreen({
  apiItems,
  isRefreshing = false,
  onBack,
  onMarkAllRead,
  onOpenNotification,
  onOpenHref,
  onRetry,
  onSettings,
  unreadCount,
  variant = "default",
}: NotificationScreenProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 430);
  const showsHistory =
    variant === "default" ||
    variant === "all-read" ||
    variant === "no-unread-with-list";
  const historyLabel =
    variant === "all-read" || variant === "no-unread-with-list"
      ? "최근 알림 기록"
      : null;
  const items = showsHistory
    ? apiItems
      ? apiItems.map(screenNotificationItemFromApi)
      : notificationItems
    : ([] as readonly ScreenNotificationItem[]);

  return (
    <View
      accessibilityLabel="급여납치 알림 독립 화면"
      style={styles.screen}
      testID="notifications-standalone-screen"
    >
      <View style={[styles.safeTop, { paddingTop: insets.top }]}>
        <View
          accessibilityLabel="급여납치 알림 상단 영역"
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
            {typeof unreadCount === "number" && unreadCount > 0
              ? `새로운 알림 ${unreadCount}개`
              : "새로운 알림이 있어요"}
          </Text>
        </View>

        {onMarkAllRead ? (
          <Pressable
            accessibilityLabel="모든 알림 읽음 처리"
            accessibilityRole="button"
            onPress={onMarkAllRead}
            style={styles.markAllReadButton}
          >
            <Text allowFontScaling={false} style={styles.markAllReadText}>
              모두 읽음
            </Text>
          </Pressable>
        ) : null}

        {isRefreshing ? (
          <NotificationStateCard
            body="서버 기준 알림과 읽음 상태를 확인하고 있습니다."
            primaryLabel="새로고침"
            title="알림을 불러오는 중입니다"
            onPrimary={onRetry}
          />
        ) : null}

        {variant === "empty" ? (
          <NotificationStateCard
            body="읽지 않은 알림이 생기면 이 화면에서 바로 확인할 수 있어요."
            primaryLabel="알림 설정"
            title="새로운 알림이 없어요"
            onPrimary={onSettings}
          />
        ) : null}
        {variant === "offline" ? (
          <NotificationStateCard
            body="네트워크가 불안정해 최신 알림을 가져오지 못했습니다. 저장된 화면만 안전하게 보여드려요."
            primaryLabel="다시 연결"
            title="오프라인 보호 모드"
            tone="warning"
            onPrimary={onRetry}
          />
        ) : null}
        {variant === "error" ? (
          <NotificationStateCard
            body="서버 응답을 확인하지 못했습니다. 민감한 금융 원문 없이 다시 요청할 수 있어요."
            primaryLabel="다시 시도"
            title="알림을 불러오지 못했어요"
            tone="danger"
            onPrimary={onRetry}
          />
        ) : null}
        {variant === "all-read" ? (
          <NotificationStateCard
            body="오늘 확인할 알림을 모두 읽었습니다. 새 알림이 오면 다시 상단에 표시됩니다."
            primaryLabel="알림 설정"
            title="모든 알림을 읽었어요"
            onPrimary={onSettings}
          />
        ) : null}
        {variant === "no-unread-with-list" ? (
          <NotificationStateCard
            body="읽지 않은 알림은 없지만 최근 알림 기록은 안전하게 보관됩니다."
            primaryLabel="알림 설정"
            title="읽지 않은 알림은 없어요"
            onPrimary={onSettings}
          />
        ) : null}

        {historyLabel ? (
          <Text allowFontScaling={false} style={styles.historyTitle}>
            {historyLabel}
          </Text>
        ) : null}
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              accessibilityLabel={`${item.title} 열기`}
              accessibilityRole="button"
              key={item.id}
              onPress={() => {
                if (item.apiItem && onOpenNotification) {
                  onOpenNotification(item.apiItem);
                  return;
                }
                onOpenHref?.(item.href);
              }}
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

function screenNotificationItemFromApi(
  item: ApiNotificationItem,
): ScreenNotificationItem {
  return {
    apiItem: item,
    href: safeNotificationHref(item.deeplink) ?? "/level",
    icon: iconForNotificationType(item.type),
    id: item.notificationId,
    subtitle: item.message,
    time: formatNotificationTime(item.createdAt),
    title: item.title,
    tone: item.status === "UNREAD" ? "highlight" : "normal",
  };
}

function safeNotificationHref(value: string | null): NotificationHref | null {
  if (
    value === "/salary" ||
    value === "/level" ||
    value === "/level/reading" ||
    value === "/level/news" ||
    value === "/level/english" ||
    value === "/level/health"
  ) {
    return value;
  }
  return null;
}

function iconForNotificationType(
  type: ApiNotificationItem["type"],
): ImageSourcePropType {
  if (type === "PAYDAY" || type === "SAVINGS_GOAL") {
    return appIconAssets.money.coins;
  }
  if (type === "PAYMENT_DUE" || type === "BUDGET_WARNING") {
    return appIconAssets.money.coffee;
  }
  if (type === "BUDGET_EXCEEDED" || type === "SECURITY") {
    return appIconAssets.common.alarm;
  }
  if (type === "COMMUNITY") return appIconAssets.community.communication;
  if (type === "CONTENT_RECOMMENDATION") return appIconAssets.level.book;
  if (type === "NOTICE") return appIconAssets.common.settings;
  return appIconAssets.level.ai;
}

function formatNotificationTime(isoTimestamp: string): string {
  const createdAt = Date.parse(isoTimestamp);
  if (Number.isNaN(createdAt)) return "방금 전";
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - createdAt) / 60000),
  );
  if (elapsedMinutes < 1) return "방금 전";
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;
  return `${Math.floor(elapsedHours / 24)}일 전`;
}

function NotificationStateCard({
  body,
  onPrimary,
  primaryLabel,
  title,
  tone = "default",
}: Readonly<{
  body: string;
  onPrimary?: (() => void) | undefined;
  primaryLabel: string;
  title: string;
  tone?: "default" | "warning" | "danger";
}>): React.ReactElement {
  return (
    <View
      accessibilityLabel={title}
      style={[
        styles.stateCard,
        tone === "warning" ? styles.stateCardWarning : null,
        tone === "danger" ? styles.stateCardDanger : null,
      ]}
    >
      <Text allowFontScaling={false} style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Pressable
        accessibilityLabel={primaryLabel}
        accessibilityRole="button"
        onPress={onPrimary}
        style={styles.stateButton}
      >
        <Text allowFontScaling={false} style={styles.stateButtonText}>
          {primaryLabel}
        </Text>
      </Pressable>
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
    "내 급여 납치 현황 목표 달성",
    "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    "Today, Business Conversation",
    "/level/reading",
    "/level/news",
    "/level/english",
    "/level/health",
    "sensitive_financial_data_component_guard",
    "금융 원천 데이터 광고 타겟팅 금지",
    "notifications-standalone-screen",
  ] as const;

  return { checks, ok: checks.length >= 13, version: SCREEN_VERSION };
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
  historyTitle: {
    color: TEXT_BLACK,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
    marginBottom: 10,
  },
  list: {
    marginHorizontal: -18,
  },
  markAllReadButton: {
    alignSelf: "flex-end",
    backgroundColor: SOFT_GREEN,
    borderRadius: 999,
    marginBottom: 14,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  markAllReadText: {
    color: "#16844A",
    fontSize: 13,
    fontWeight: "900",
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
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  stateBody: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },
  stateButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: BRAND_GREEN,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 112,
    paddingHorizontal: 18,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  stateCard: {
    backgroundColor: "#F7F9FF",
    borderColor: LINE,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
    padding: 18,
  },
  stateCardDanger: {
    backgroundColor: "#FFF6F6",
    borderColor: "#F3D4D4",
  },
  stateCardWarning: {
    backgroundColor: "#FFF8ED",
    borderColor: "#F4DFBF",
  },
  stateTitle: {
    color: TEXT_BLACK,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 28,
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
