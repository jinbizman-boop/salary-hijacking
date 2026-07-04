/* eslint-disable require-atomic-updates */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import officialBiLogo from "../../../assets/brand/salary-hijacking-platform-logo.png";
import { CommunityAttachmentList } from "../../features/community/components/CommunityAttachmentList";
import { containsSensitiveCommunityContent } from "../../features/community/community.redaction";
import {
  communityResponseData,
  parseCommunityComment,
  parseCommunityCommentPage,
  parseCommunityFeedPage,
  parseCommunityPostDetail,
} from "../../features/community/community.parsers";
import type {
  CommunityBoardType,
  CommunityComment,
  CommunityFeedPage,
  CommunityPost,
  CommunityPostDetail,
  CommunityPostDraft,
} from "../../features/community/community.types";
import {
  calculateOfflineDailyBudgetPreview,
  parseKrwInputAmount,
  sanitizeKrwIntegerInput,
} from "../../features/budget/utils";
import type {
  DailyBudgetSnapshot,
  VariableExpenseRecord,
} from "../../features/budget/types";
import type { GrowthDashboard, GrowthTask } from "../../features/level/types";
import type {
  PayrollCalculation,
  PayrollPlanSnapshot,
} from "../../features/payroll/types";
import type {
  PlanFixedExpenseCommitment,
  PlanSavingsGoalCommitment,
} from "../../features/plan/types";
import type {
  ProfileActivity,
  ProfileSnapshot,
  ProfileSupportTicketCategory,
} from "../../features/profile/types";
import type { UploadAttachment } from "../../features/uploads/types";
import { mergeProfileSnapshotWithMyPageSummary } from "../../features/profile/api";
import {
  AUTH_PASSWORD_POLICY_MESSAGE,
  isServerAuthPasswordCandidate,
} from "../../features/auth/password-policy";
import type {
  NotificationDevice,
  NotificationDeviceRegistrationRequest,
  NotificationItem,
  NotificationPreferences,
  NotificationPreferencesUpdateRequest,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "../../features/notifications/types";
import {
  createMobileAuthApi,
  createMobileBudgetApi,
  createMobileCommunityService,
  createMobileGrowthApi,
  createMobileNotificationsApi,
  createMobilePayrollApi,
  createMobilePlanCommitmentsApi,
  createMobileProfileApi,
  createMobileUploadsApi,
} from "../api/mobile-api";
import { createSecureStoreRuntime } from "../storage/secure-store";
import {
  SALARY_HIJACKING_PARTNER_BENEFITS_URL,
  loadPartnerBenefitsUrl,
} from "./ad-slot-link";
import { appIcons, salaryHijackingTheme } from "./clean-fintech-theme";

type ScreenKind =
  | "salary"
  | "plan"
  | "level"
  | "notifications"
  | "community"
  | "profile"
  | "login";
type LoginSocialProvider = "KAKAO" | "NAVER" | "GOOGLE" | "APPLE";

const SOCIAL_LOGIN_LABELS: ReadonlyArray<
  Readonly<{ label: string; provider: LoginSocialProvider }>
> = [
  { label: "Kakao", provider: "KAKAO" },
  { label: "Naver", provider: "NAVER" },
  { label: "Apple", provider: "APPLE" },
  { label: "Google", provider: "GOOGLE" },
];

type MoneyMetric = Readonly<{ label: string; value: string; tone?: "danger" }>;
type VariableExpenseEntry = Readonly<{
  amount: number;
  icon: string;
  id: string;
  name: string;
}>;
type VariableExpenseRow = VariableExpenseEntry &
  Readonly<{
    category: string;
    paymentMethod: string;
    source: "server" | "offline";
    spentAt: string | null;
  }>;
type Mission = Readonly<{
  id: string;
  icon: string;
  title: string;
  description: string;
  routeLabel: string;
  xp: number;
  progressCount: number;
  serverTaskId: string | null;
  status: "ACTIVE" | "COMPLETED";
  targetCount: number;
}>;
type CommunityBoard =
  | "전체 게시판"
  | "자유 게시판"
  | "레벨업 인증"
  | "취미 게시판";
type CommunityScreenPost = Readonly<{
  board: CommunityBoard;
  id: string;
  stats: string;
  summary: string;
  thumb: string;
  title: string;
}>;

const NOTIFICATION_DEVICE_ID_KEY = "salary-hijacking.notification.device-id";
const COMMUNITY_WRITE_DRAFT_KEY = "salary-hijacking.community.write-draft";
type LevelDetailKind = "reading" | "news" | "english" | "health";
type SettingsKind = "profile" | "account";
type StoredCommunityWriteDraft = Readonly<{
  schemaVersion: 1;
  board: CommunityBoard;
  anonymous: boolean;
  question: boolean;
  title: string;
  body: string;
}>;
type LevelDetailConfig = Readonly<{
  title: string;
  subtitle: string;
  icon: string;
  tabs: readonly string[];
  metrics: readonly MoneyMetric[];
  cards: readonly Readonly<{
    title: string;
    meta: string;
    action: string;
    icon: string;
    contentId: string;
  }>[];
  progressLabel: string;
  progressValue: number;
}>;
type NotificationScreenItem = Readonly<{
  deeplink: string | null;
  id: string;
  icon: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isMandatory: boolean;
  status: NotificationStatus;
}>;
type PlanCommitmentRow = Readonly<{
  amountMinor: number;
  currentAmountMinor?: number;
  id: string;
  lastPaidAt?: string | null;
  meta: string;
  paidTotalMinor?: number;
  title: string;
}>;

const fixedExpenses = [
  { name: "ChatGPT", amount: "30,000원", status: "납부완료" },
  { name: "넷플릭스", amount: "15,000원", status: "납부완료" },
  { name: "유튜브 프리미엄", amount: "15,000원", status: "납부완료" },
] as const;

const fallbackPlanFixedExpenseRows: readonly PlanCommitmentRow[] = [
  {
    amountMinor: 30_000,
    id: "fallback-fixed-chatgpt",
    meta: "서버 연결 전 예시 · 매월 20일",
    title: "ChatGPT",
  },
  {
    amountMinor: 70_000,
    id: "fallback-fixed-mobile",
    meta: "서버 연결 전 예시 · 매월 25일",
    title: "통신비",
  },
] as const;

const fallbackPlanSavingsRows: readonly PlanCommitmentRow[] = [
  {
    amountMinor: 150_000,
    id: "fallback-savings-emergency",
    meta: "서버 연결 전 예시 · 비상금",
    title: "비상금",
  },
  {
    amountMinor: 200_000,
    id: "fallback-savings-growth",
    meta: "서버 연결 전 예시 · 자기계발",
    title: "자기계발",
  },
] as const;

const variableExpenses: readonly VariableExpenseEntry[] = [
  { id: "coffee", name: "커피", amount: 2000, icon: appIcons.coffee },
  { id: "lunch", name: "점심", amount: 6500, icon: appIcons.meal },
  { id: "store", name: "편의점", amount: 4500, icon: appIcons.expense },
] as const;

const fallbackNotifications: readonly NotificationScreenItem[] = [
  {
    deeplink: "/plan",
    id: "fallback_goal",
    icon: "🏅",
    title: "목표 달성",
    message: "누적 납치금액 5,780,000원 달성",
    type: "SAVINGS_GOAL",
    priority: "HIGH",
    isMandatory: false,
    status: "UNREAD",
  },
  {
    deeplink: "/salary",
    id: "fallback_budget",
    icon: appIcons.warning,
    title: "예산 초과 주의",
    message: "오늘 남은 예산이 0원 아래로 내려갈 수 있어요.",
    type: "BUDGET_WARNING",
    priority: "HIGH",
    isMandatory: false,
    status: "UNREAD",
  },
  {
    deeplink: "/notifications",
    id: "fallback_reward",
    icon: appIcons.reward,
    title: "이벤트 포인트",
    message: "납치금액 달성 이벤트 500P 지급 예정",
    type: "NOTICE",
    priority: "NORMAL",
    isMandatory: true,
    status: "READ",
  },
  {
    deeplink: "/level/reading",
    id: "fallback_reading",
    icon: appIcons.reading,
    title: "독서 루틴",
    message: "오늘 추천 도서를 10분만 읽어볼까요?",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    isMandatory: false,
    status: "READ",
  },
  {
    deeplink: "/level/news",
    id: "fallback_news",
    icon: appIcons.news,
    title: "뉴스 루틴",
    message: "경제 뉴스 3개로 하루 감각을 열어요.",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    isMandatory: false,
    status: "READ",
  },
  {
    deeplink: "/level/english",
    id: "fallback_english",
    icon: appIcons.english,
    title: "영어 루틴",
    message: "출퇴근 5문장 듣기 미션이 기다려요.",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    isMandatory: false,
    status: "READ",
  },
  {
    deeplink: "/level/health",
    id: "fallback_health",
    icon: appIcons.health,
    title: "건강 루틴",
    message: "20분 홈트로 소비 통제 체력을 채워요.",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    isMandatory: false,
    status: "READ",
  },
] as const;

const fallbackMissions: readonly Mission[] = [
  {
    id: "reading",
    icon: appIcons.reading,
    title: "독서하기",
    description: "AI 추천 도서 한 챕터를 읽고 오늘의 생각을 남겨요.",
    routeLabel: "독서 시작",
    xp: 30,
    progressCount: 0,
    serverTaskId: null,
    status: "ACTIVE",
    targetCount: 1,
  },
  {
    id: "news",
    icon: appIcons.news,
    title: "뉴스보기",
    description: "경제/기술 뉴스 3개를 보고 돈의 흐름을 익혀요.",
    routeLabel: "뉴스 보기",
    xp: 25,
    progressCount: 0,
    serverTaskId: null,
    status: "ACTIVE",
    targetCount: 1,
  },
  {
    id: "english",
    icon: appIcons.english,
    title: "영어연습",
    description: "듣기와 말하기 루틴으로 출퇴근 시간을 회수해요.",
    routeLabel: "영어 연습",
    xp: 25,
    progressCount: 0,
    serverTaskId: null,
    status: "ACTIVE",
    targetCount: 1,
  },
  {
    id: "health",
    icon: appIcons.health,
    title: "홈트하기",
    description: "20분 움직이고 소비 통제에 필요한 체력을 채워요.",
    routeLabel: "운동 완료",
    xp: 35,
    progressCount: 1,
    serverTaskId: null,
    status: "COMPLETED",
    targetCount: 1,
  },
] as const;

const levelMissionRouteMap: Readonly<
  Record<
    string,
    "/level/reading" | "/level/news" | "/level/english" | "/level/health"
  >
> = {
  reading: "/level/reading",
  news: "/level/news",
  english: "/level/english",
  health: "/level/health",
};

type NotificationRoute =
  | "/salary"
  | "/plan"
  | "/level"
  | "/level/reading"
  | "/level/news"
  | "/level/english"
  | "/level/health"
  | "/community"
  | `/community/${string}`
  | "/notifications"
  | "/profile";

type ProfileActivityRoute =
  | NotificationRoute
  | "/profile/account"
  | "/profile/community"
  | "/profile/level"
  | "/profile/notices"
  | "/profile/settings"
  | "/profile/support";

const notificationRouteByType: Readonly<
  Record<NotificationType, NotificationRoute>
> = {
  AD_PARTNER: "/salary",
  BUDGET_EXCEEDED: "/salary",
  BUDGET_WARNING: "/salary",
  COMMUNITY: "/community",
  CONTENT_RECOMMENDATION: "/level",
  LEVEL_UP: "/level",
  NOTICE: "/notifications",
  PAYDAY: "/salary",
  PAYMENT_DUE: "/plan",
  SAVINGS_GOAL: "/plan",
  SECURITY: "/profile",
};

const notificationRouteAliases: Readonly<Record<string, NotificationRoute>> = {
  "/(tabs)/community": "/community",
  "/(tabs)/level": "/level",
  "/(tabs)/plan": "/plan",
  "/(tabs)/profile": "/profile",
  "/(tabs)/salary": "/salary",
  "/community": "/community",
  "/level": "/level",
  "/level/english": "/level/english",
  "/level/health": "/level/health",
  "/level/news": "/level/news",
  "/level/reading": "/level/reading",
  "/notifications": "/notifications",
  "/plan": "/plan",
  "/profile": "/profile",
  "/salary": "/salary",
  community: "/community",
  level: "/level",
  notifications: "/notifications",
  plan: "/plan",
  profile: "/profile",
  salary: "/salary",
};

const profileActivityRouteAliases: Readonly<
  Record<string, ProfileActivityRoute>
> = {
  ...notificationRouteAliases,
  "/profile/account": "/profile/account",
  "/profile/community": "/profile/community",
  "/profile/level": "/profile/level",
  "/profile/notices": "/profile/notices",
  "/profile/settings": "/profile/settings",
  "/profile/support": "/profile/support",
};

const fallbackProfileSnapshot: ProfileSnapshot = {
  user: {
    idHash: "sha256:fallback-profile",
    nickname: "짠테크 기획자님",
    role: "USER",
    emailVerified: true,
    onboardingCompleted: true,
    joinedAt: "2026-07-02T09:00:00.000Z",
    level: 18,
    title: "급여 방어 루틴러",
    avatarEmoji: "💸",
    marketingConsent: false,
    notificationConsent: true,
    communityDisplayName: "익명 방어자",
    rawEmailExposed: false,
    rawPhoneExposed: false,
    rawFinancialDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  },
  summary: {
    totalHijackSaved: 5_780_000,
    currentMonthHijack: 1_927_000,
    currentLevel: 18,
    levelXp: 380,
    nextLevelXp: 999,
    selfCareScore: 84,
    completedGrowthTasks: 11,
    communityPosts: 7,
    communityComments: 14,
    notificationUnread: 3,
    privacyPassRate: "100.00%",
  },
  privacy: {
    exportStatus: "NONE",
    exportRequestedAt: null,
    withdrawalRequested: false,
    adPersonalization: false,
    financialDataForAds: false,
    rawPushTokenLogging: false,
    tokenHashOnly: true,
  },
  activities: [],
};

const fallbackCommunityPosts = [
  {
    board: "레벨업 인증",
    id: "fallback-level-proof",
    title: "퇴근 후 20분 홈트 18일째 인증",
    summary: "월급도 지키고 체력도 지키는 루틴으로 이번 달을 버티는 중이에요.",
    stats: "조회 1,284 · 좋아요 96 · 댓글 18",
    thumb: "🏃",
  },
  {
    board: "자유 게시판",
    id: "fallback-free-subscription",
    title: "구독 서비스 정리하고 60,000원 지켰어요",
    summary: "자동결제 목록을 펼쳐보니 생각보다 빠져나가는 돈이 많았네요.",
    stats: "조회 842 · 좋아요 71 · 댓글 12",
    thumb: "🔁",
  },
  {
    board: "취미 게시판",
    id: "fallback-hobby-weekend",
    title: "돈 안 드는 주말 루틴 추천 받아요",
    summary: "이번 주는 무지출 주말로 보내려고 합니다.",
    stats: "조회 512 · 좋아요 34 · 댓글 22",
    thumb: "☕",
  },
] as const satisfies readonly CommunityScreenPost[];

const communityBoardApiMap: Readonly<
  Record<CommunityBoard, CommunityBoardType | null>
> = {
  "전체 게시판": null,
  "자유 게시판": "FREE",
  "레벨업 인증": "LEVEL_CERTIFICATION",
  "취미 게시판": "HEALTH_ROUTINE",
};

const communityBoardLabelMap: Readonly<
  Record<CommunityBoardType, CommunityBoard>
> = {
  SALARY_TALK: "자유 게시판",
  BUDGET_TIP: "자유 게시판",
  EXPENSE_CUT: "자유 게시판",
  SAVINGS_GOAL: "자유 게시판",
  LEVEL_CERTIFICATION: "레벨업 인증",
  SIDE_HUSTLE: "취미 게시판",
  HEALTH_ROUTINE: "취미 게시판",
  FREE: "자유 게시판",
};

const communityBoardThumbMap: Readonly<Record<CommunityBoardType, string>> = {
  SALARY_TALK: appIcons.salary,
  BUDGET_TIP: appIcons.budget,
  EXPENSE_CUT: appIcons.expense,
  SAVINGS_GOAL: appIcons.saving,
  LEVEL_CERTIFICATION: appIcons.level,
  SIDE_HUSTLE: "🧰",
  HEALTH_ROUTINE: appIcons.health,
  FREE: appIcons.community,
};

const settingsScreenConfig: Readonly<
  Record<
    SettingsKind,
    Readonly<{
      title: string;
      subtitle: string;
      rows: readonly Readonly<{
        icon: string;
        title: string;
        meta: string;
      }>[];
    }>
  >
> = {
  account: {
    title: "계정 설정",
    subtitle: "로그인, 보안, 알림 동의를 한곳에서 확인해요",
    rows: [
      {
        icon: "🔐",
        title: "서버 세션 보안",
        meta: "보호 API는 서버 세션, 만료, revoke 상태를 기준으로 확인해요.",
      },
      {
        icon: appIcons.notification,
        title: "알림 동의",
        meta: "푸시 토큰 원문 없이 알림 수신 상태만 관리해요.",
      },
      {
        icon: "🛡️",
        title: "개인정보 요청",
        meta: "내보내기와 탈퇴 요청은 운영 절차와 감사 로그 기준으로 처리해요.",
      },
    ],
  },
  profile: {
    title: "프로필 설정",
    subtitle: "커뮤니티 표시 이름과 자기관리 상태를 점검해요",
    rows: [
      {
        icon: appIcons.my,
        title: "커뮤니티 표시 이름",
        meta: "익명 옵션과 게시판 노출 이름을 분리해서 다룰 수 있게 준비해요.",
      },
      {
        icon: appIcons.level,
        title: "레벨 타이틀",
        meta: "LV UP 성과와 프로필 배지를 연결해 자기관리 동기를 유지해요.",
      },
      {
        icon: appIcons.salary,
        title: "광고 분리",
        meta: "급여, 지출, 저축, 납치금액 원문은 광고 타겟팅에 쓰지 않아요.",
      },
    ],
  },
};

const levelDetailConfigs: Readonly<Record<LevelDetailKind, LevelDetailConfig>> =
  {
    reading: {
      title: "독서",
      subtitle: "돈과 삶을 넓히는 읽기 루틴",
      icon: appIcons.reading,
      tabs: ["AI 추천", "소설", "경제/경영", "인문/철학", "기타"],
      metrics: [
        { label: "이번 주 독서", value: "120분" },
        { label: "완료 도서", value: "3권" },
        { label: "이해도", value: "86%" },
      ],
      cards: [
        {
          title: "부의 감각을 키우는 소비 일기",
          meta: "AI 추천 · 12분 읽기 · XP 30",
          action: "추천 도서 읽기",
          icon: "📘",
          contentId: "cnt_reading_recommendation",
        },
        {
          title: "월급 이후의 현금흐름",
          meta: "경제/경영 · 핵심 요약 + 노트",
          action: "생각 남기기",
          icon: "📗",
          contentId: "cnt_reading_note",
        },
      ],
      progressLabel: "오늘 독서 루틴",
      progressValue: 66,
    },
    news: {
      title: "뉴스",
      subtitle: "돈의 흐름을 읽는 짧은 뉴스 루틴",
      icon: appIcons.news,
      tabs: ["경제", "산업", "사회", "기술", "전체"],
      metrics: [
        { label: "읽은 뉴스", value: "6개" },
        { label: "저장", value: "12개" },
        { label: "퀴즈 정답률", value: "80%" },
      ],
      cards: [
        {
          title: "금리 변화가 생활비 계획에 주는 영향",
          meta: "경제 · 오늘 08:10 · 좋아요 42",
          action: "요약 보기",
          icon: "📰",
          contentId: "cnt_news_summary",
        },
        {
          title: "구독 경제와 자동결제 관리 트렌드",
          meta: "산업 · 오늘 09:30 · 댓글 8",
          action: "북마크",
          icon: "📌",
          contentId: "cnt_news_bookmark",
        },
      ],
      progressLabel: "오늘 뉴스 루틴",
      progressValue: 75,
    },
    english: {
      title: "영어",
      subtitle: "출퇴근 시간을 회수하는 영어 루틴",
      icon: appIcons.english,
      tabs: ["Listening", "Speaking", "Reading", "Writing"],
      metrics: [
        { label: "Listening", value: "72%" },
        { label: "Speaking", value: "64%" },
        { label: "Reading", value: "81%" },
        { label: "Writing", value: "58%" },
      ],
      cards: [
        {
          title: "오늘의 문장 5개 듣고 따라 말하기",
          meta: "A2 · 7분 · XP 25",
          action: "문장 학습",
          icon: "🎧",
          contentId: "cnt_english_sentence",
        },
        {
          title: "생활비를 줄였어요",
          meta: "I saved money on daily expenses.",
          action: "말하기 연습",
          icon: "🗣️",
          contentId: "cnt_english_speaking",
        },
      ],
      progressLabel: "오늘 영어 루틴",
      progressValue: 62,
    },
    health: {
      title: "건강",
      subtitle: "소비 통제 체력을 만드는 홈트 루틴",
      icon: appIcons.health,
      tabs: ["월", "화", "수", "목", "금", "토"],
      metrics: [
        { label: "신체", value: "82점" },
        { label: "영양", value: "74점" },
        { label: "회복", value: "68점" },
        { label: "정신", value: "86점" },
      ],
      cards: [
        {
          title: "퇴근 후 20분 전신 홈트",
          meta: "오늘 1/1 · XP 35 · 인증 가능",
          action: "홈트 완료",
          icon: "🏃",
          contentId: "cnt_health_homeworkout",
        },
        {
          title: "물 1,500ml 채우기",
          meta: "현재 900ml · 60% 달성",
          action: "물 마심 기록",
          icon: "💧",
          contentId: "cnt_health_water",
        },
      ],
      progressLabel: "오늘 건강 루틴",
      progressValue: 60,
    },
  };

const signupConsentLabels = [
  "약관 동의",
  "개인정보 처리방침 동의",
  "민감 정보 보호 정책 동의",
  "커뮤니티 운영정책 동의",
] as const;

const postComments = [
  "저도 이번 달 구독 정리하면서 4만원 지켰어요.",
  "레벨업 인증까지 같이 하니까 꾸준히 하게 되네요.",
] as const;

const fallbackPostDetail: CommunityPostDetail = {
  attachments: [],
  comments: postComments.map((content, index) => ({
    anonymousDisplayName: "익명 사용자",
    content,
    createdAt: `2026-07-03T00:0${index}:00.000Z`,
    id: `fallback-comment-${index + 1}`,
    likeCount: index + 2,
    likedByMe: false,
    moderationStatus: "SAFE",
    postId: "fallback-level-proof",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: `2026-07-03T00:0${index}:00.000Z`,
  })),
  content:
    "고정지출을 먼저 분리하고 남은 생활비 안에서 홈트 루틴을 지켰어요. 금액 원문, 계좌, 카드, 토큰 정보는 게시글에 노출하지 않습니다.",
  post: {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "익명 사용자",
    boardType: "LEVEL_CERTIFICATION",
    bodyPreview: fallbackCommunityPosts[0].summary,
    bookmarkCount: 0,
    commentCount: postComments.length,
    createdAt: "2026-07-03T00:00:00.000Z",
    id: fallbackCommunityPosts[0].id,
    likeCount: 96,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: fallbackCommunityPosts[0].title,
    updatedAt: "2026-07-03T00:00:00.000Z",
  },
  tags: ["레벨업", "홈트", "예산루틴"],
};

export function CleanFintechScreen({
  kind,
}: Readonly<{ kind: ScreenKind }>): React.ReactElement {
  if (kind === "salary") return <SalaryHomeScreen />;
  if (kind === "plan") return <PlanScreen />;
  if (kind === "level") return <LevelScreen />;
  if (kind === "notifications") return <NotificationsScreen />;
  if (kind === "community") return <CommunityScreen />;
  if (kind === "profile") return <ProfileScreen />;
  return <LoginScreen />;
}

export function CleanFintechWriteScreen(): React.ReactElement {
  const writeRouter = useRouter();
  const writeCommunityService = useMemo(
    () => createMobileCommunityService(),
    [],
  );
  const writeUploadsApi = useMemo(() => createMobileUploadsApi(), []);
  const writeDraftStore = useMemo(
    () =>
      createSecureStoreRuntime(Platform.OS, {
        deleteItemAsync: async (key: string) =>
          SecureStore.deleteItemAsync(key),
        getItemAsync: async (key: string) => SecureStore.getItemAsync(key),
        setItemAsync: async (key: string, value: string) =>
          SecureStore.setItemAsync(key, value),
      }),
    [],
  );
  const [board, setBoard] = useState<CommunityBoard>("자유 게시판");
  const [anonymous, setAnonymous] = useState(true);
  const [question, setQuestion] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [uploadedCommunityAttachments, setUploadedCommunityAttachments] =
    useState<readonly UploadAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const communityPostSubmitInFlightRef = useRef(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const communityAttachmentUploadInFlightRef = useRef(false);
  const [toast, setToast] = useState(
    "제목, 본문, 게시판을 확인한 뒤 등록할 수 있어요.",
  );

  useEffect(() => {
    let active = true;
    void writeDraftStore
      .getItemAsync(COMMUNITY_WRITE_DRAFT_KEY)
      .then((rawDraft) => {
        if (!active || !rawDraft) return;
        const parsed = JSON.parse(
          rawDraft,
        ) as Partial<StoredCommunityWriteDraft>;
        const boardDraft = parsed.board;
        if (
          parsed.schemaVersion !== 1 ||
          boardDraft === undefined ||
          !(boardDraft in communityBoardApiMap)
        ) {
          void writeDraftStore.deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY);
          return;
        }
        setBoard(boardDraft);
        setAnonymous(parsed.anonymous === true);
        setQuestion(parsed.question === true);
        setTitle(typeof parsed.title === "string" ? parsed.title : "");
        setBody(typeof parsed.body === "string" ? parsed.body : "");
      })
      .catch(() => {
        void writeDraftStore.deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY);
      })
      .finally(() => {
        if (active) setDraftRestored(true);
      });
    return () => {
      active = false;
    };
  }, [writeDraftStore]);

  useEffect(() => {
    if (!draftRestored) return;
    const hasDraft = Boolean(title.trim() || body.trim());
    if (!hasDraft) {
      void writeDraftStore.deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY);
      return;
    }
    if (containsSensitiveCommunityContent(`${title}\n${body}`)) return;
    const draftPayload: StoredCommunityWriteDraft = {
      anonymous,
      board,
      body,
      question,
      schemaVersion: 1,
      title,
    };
    void writeDraftStore.setItemAsync(
      COMMUNITY_WRITE_DRAFT_KEY,
      JSON.stringify(draftPayload),
    );
  }, [anonymous, board, body, draftRestored, question, title, writeDraftStore]);

  const valid = title.trim().length >= 2 && body.trim().length >= 5;
  const closeCommunityWrite = useCallback(() => {
    writeRouter.replace("/community");
  }, [writeRouter]);

  const attachUploadedCommunityAttachments = useCallback(
    async (postId: string): Promise<boolean> => {
      if (uploadedCommunityAttachments.length <= 0) return true;

      try {
        await Promise.all(
          uploadedCommunityAttachments.map((attachment) =>
            writeUploadsApi.attachToCommunityPost(
              attachment.attachmentId,
              postId,
            ),
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [uploadedCommunityAttachments, writeUploadsApi],
  );

  const pickCommunityAttachment = useCallback(() => {
    if (uploadingAttachment || communityAttachmentUploadInFlightRef.current) {
      return;
    }
    communityAttachmentUploadInFlightRef.current = true;
    setUploadingAttachment(true);
    setToast("첨부 파일을 선택하고 서버 업로드를 준비하고 있어요.");
    void DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    })
      .then(async (result) => {
        if (result.canceled) {
          setToast("첨부 선택을 취소했어요.");
          return;
        }
        const asset = result.assets[0];
        if (!asset) {
          setToast("선택한 첨부 파일을 확인하지 못했어요.");
          return;
        }
        const response = await fetch(asset.uri);
        const bytes = await response.arrayBuffer();
        const contentType =
          asset.mimeType ??
          response.headers.get("content-type") ??
          "application/octet-stream";
        const uploaded = await writeUploadsApi.directUploadCommunityAttachment({
          bytes,
          contentType,
          fileName: asset.name || "community-attachment",
          sizeBytes: asset.size ?? bytes.byteLength,
        });
        setUploadedCommunityAttachments((current) => [...current, uploaded]);
        setToast(
          "첨부 파일이 서버 업로드에 등록됐어요. 게시글 등록 시 연결됩니다.",
        );
      })
      .catch(() => {
        setToast(
          "첨부 파일을 업로드하지 못했어요. 파일 형식과 네트워크를 확인해 주세요.",
        );
      })
      .finally(() => {
        communityAttachmentUploadInFlightRef.current = false;
        setUploadingAttachment(false);
      });
  }, [uploadingAttachment, writeUploadsApi]);

  const submitCommunityPost = useCallback(() => {
    if (
      !valid ||
      uploadingAttachment ||
      communityAttachmentUploadInFlightRef.current ||
      communityPostSubmitInFlightRef.current
    )
      return;
    const draft: CommunityPostDraft = {
      anonymous,
      boardType: communityBoardApiMap[board] ?? "FREE",
      content: body.trim(),
      tags: question ? ["질문"] : [],
      title: title.trim(),
    };

    communityPostSubmitInFlightRef.current = true;
    setSubmitting(true);
    setToast("게시글을 서버 커뮤니티에 등록하는 중이에요.");
    void writeCommunityService
      .publishPost(draft)
      .then(async (response) => {
        const data = communityResponseData(response);
        const postId =
          typeof data === "object" &&
          data !== null &&
          "postId" in data &&
          typeof data.postId === "string"
            ? data.postId
            : null;
        const attachmentsAttached = postId
          ? await attachUploadedCommunityAttachments(postId)
          : true;
        setTitle("");
        setBody("");
        setUploadedCommunityAttachments([]);
        if (!attachmentsAttached) {
          setToast(
            "게시글은 서버에 등록됐지만 첨부 연결은 실패했어요. 필요한 파일은 다시 첨부해 주세요.",
          );
          return;
        }
        setToast("게시글이 서버에 등록되었습니다. 커뮤니티로 이동합니다.");
        await writeDraftStore.deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY);
        writeRouter.replace("/community");
      })
      .catch(() => {
        setToast(
          "게시글을 등록하지 못했어요. 민감 정보와 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        communityPostSubmitInFlightRef.current = false;
        setSubmitting(false);
      });
  }, [
    anonymous,
    attachUploadedCommunityAttachments,
    board,
    body,
    question,
    title,
    uploadingAttachment,
    uploadedCommunityAttachments.length,
    valid,
    writeCommunityService,
    writeDraftStore,
    writeRouter,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.composeHeader}>
          <Pressable
            accessibilityLabel="커뮤니티 글쓰기 닫기"
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting || uploadingAttachment }}
            disabled={submitting || uploadingAttachment}
            onPress={closeCommunityWrite}
            style={[
              styles.iconButton,
              submitting || uploadingAttachment ? styles.disabled : null,
            ]}
          >
            <Text style={styles.iconButtonText}>×</Text>
          </Pressable>
          <Text style={styles.composeTitle}>글쓰기</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: !valid || submitting || uploadingAttachment,
            }}
            disabled={!valid || submitting || uploadingAttachment}
            onPress={submitCommunityPost}
            style={[
              styles.doneButton,
              !valid || submitting || uploadingAttachment
                ? styles.disabled
                : null,
            ]}
          >
            <Text style={styles.doneButtonText}>
              {submitting ? "전송중" : "완료"}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Toast message={toast} />
          <SectionCard>
            <Text style={styles.sectionTitle}>게시판</Text>
            <PillRow
              items={["자유 게시판", "레벨업 인증", "취미 게시판"]}
              disabled={submitting}
              selected={board}
              onSelect={(next) => setBoard(next as CommunityBoard)}
            />
          </SectionCard>
          <SectionCard>
            <TextInput
              accessibilityLabel="제목"
              accessibilityState={{ disabled: submitting }}
              editable={!submitting}
              onChangeText={setTitle}
              placeholder="제목"
              placeholderTextColor={theme.color.text.disabled}
              style={styles.composeInput}
              value={title}
            />
            <TextInput
              accessibilityLabel="본문"
              accessibilityState={{ disabled: submitting }}
              multiline
              editable={!submitting}
              onChangeText={setBody}
              placeholder="본문을 입력하세요. 급여, 지출, 계좌, 연락처 같은 민감 정보는 공개하지 마세요."
              placeholderTextColor={theme.color.text.disabled}
              style={[styles.composeInput, styles.composeBody]}
              value={body}
            />
            <View style={styles.attachmentRow}>
              <SmallButton
                disabled={uploadingAttachment || submitting}
                label="사진"
                onPress={pickCommunityAttachment}
              />
              <SmallButton
                disabled={uploadingAttachment || submitting}
                label="이미지"
                onPress={pickCommunityAttachment}
              />
              <SmallButton
                disabled={uploadingAttachment || submitting}
                label="파일"
                onPress={pickCommunityAttachment}
              />
            </View>
            {uploadedCommunityAttachments.map((attachment) => (
              <ListRow
                icon="📎"
                key={attachment.attachmentId}
                meta={`${attachment.contentType} · ${attachment.scanStatus}`}
                title={attachment.fileName}
              />
            ))}
          </SectionCard>
          <SectionCard>
            <ToggleRow
              active={question}
              disabled={submitting}
              label="질문"
              onPress={() => setQuestion((value) => !value)}
            />
            <ToggleRow
              active={anonymous}
              disabled={submitting}
              label="익명"
              onPress={() => setAnonymous((value) => !value)}
            />
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function CleanFintechSplashScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.centerContent]}
      >
        <SalaryLogo large />
        <Text style={styles.splashKicker}>SALARY HIJACKING</Text>
        <Text style={styles.loginTitle}>급여납치</Text>
        <Text style={styles.loginSubtitle}>
          월급이 사라지기 전에 먼저 붙잡아요
        </Text>
        <SectionCard>
          <Text style={styles.sectionTitle}>이번 달 내가 지켜낼 돈</Text>
          <Text style={styles.money}>1,927,000원</Text>
          <Text style={styles.bodyText}>
            스플래시는 1.2초 안에 로그인 또는 급여 홈으로 자연스럽게 이어지는 첫
            화면 기준입니다.
          </Text>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CleanFintechSignupScreen(): React.ReactElement {
  const signupRouter = useRouter();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState<ReadonlySet<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const signupSubmitInFlightRef = useRef(false);
  const [toast, setToast] = useState(
    "급여·지출·저축 정보는 민감 정보 보호 기준으로 다룹니다.",
  );
  const signupAuthApi = useMemo(() => createMobileAuthApi(), []);
  const valid =
    email.includes("@") &&
    nickname.trim().length >= 2 &&
    isServerAuthPasswordCandidate(password) &&
    signupConsentLabels.every((label) => agreed.has(label));
  const submitSignup = useCallback(async () => {
    if (!valid || signupSubmitInFlightRef.current) return;
    signupSubmitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const response = await signupAuthApi.register({
        email,
        marketingAccepted: false,
        nickname,
        password,
        privacyAccepted: true,
        termsAccepted: true,
      });
      if (response.data?.status === "AUTHENTICATED") {
        if (response.data.emailVerificationRequired) {
          setToast(
            "가입 요청을 서버에 등록했어요. 이메일 인증을 확인해 주세요.",
          );
          signupRouter.replace("/(auth)/verify-email");
        } else if (response.data.onboardingRequired) {
          setToast(
            "가입 요청을 서버에 등록했어요. 급여 계획을 먼저 설정해 주세요.",
          );
          signupRouter.replace("/onboarding");
        } else {
          setToast("가입 요청을 서버에 등록했어요. 서버 인증이 완료됐어요.");
          signupRouter.replace("/salary");
        }
      } else if (response.data?.status === "EMAIL_VERIFICATION_REQUIRED") {
        setToast("가입 요청을 서버에 등록했어요. 이메일 인증을 확인해 주세요.");
        signupRouter.replace("/(auth)/verify-email");
      } else {
        setToast(
          "가입 요청을 서버에 등록했어요. 로그인 화면에서 계속해 주세요.",
        );
      }
    } catch {
      setToast(
        "회원가입 요청을 완료하지 못했어요. 입력값과 네트워크를 확인해 주세요.",
      );
    } finally {
      signupSubmitInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [email, nickname, password, signupAuthApi, signupRouter, valid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <SalaryLogo large />
        <Text style={styles.loginTitle}>계정 만들기</Text>
        <Text style={styles.loginSubtitle}>
          /api/v1/auth/register 기준으로 안전하게 가입해요
        </Text>
        <Toast message={toast} />
        <SectionCard>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          <TextInput
            accessibilityLabel="회원가입 이메일"
            autoCapitalize="none"
            accessibilityState={{ disabled: submitting }}
            editable={!submitting}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="회원가입 닉네임"
            accessibilityState={{ disabled: submitting }}
            editable={!submitting}
            onChangeText={setNickname}
            placeholder="닉네임"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={nickname}
          />
          <TextInput
            accessibilityLabel="회원가입 비밀번호"
            accessibilityState={{ disabled: submitting }}
            editable={!submitting}
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor={theme.color.text.disabled}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <Text style={styles.listMeta}>{AUTH_PASSWORD_POLICY_MESSAGE}</Text>
        </SectionCard>
        <SectionCard>
          <Text style={styles.sectionTitle}>민감 정보 보호 및 약관 동의</Text>
          {signupConsentLabels.map((label) => (
            <ToggleRow
              active={agreed.has(label)}
              disabled={submitting}
              key={label}
              label={label}
              onPress={() =>
                setAgreed((current) => {
                  const next = new Set(current);
                  if (next.has(label)) next.delete(label);
                  else next.add(label);
                  return next;
                })
              }
            />
          ))}
        </SectionCard>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !valid || submitting }}
          disabled={!valid || submitting}
          onPress={submitSignup}
          style={[
            styles.primaryButton,
            !valid || submitting ? styles.disabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? "가입 요청 중" : "가입 완료"}
          </Text>
        </Pressable>
        <GuardBox />
      </ScrollView>
    </SafeAreaView>
  );
}

export function CleanFintechLevelDetailScreen({
  kind,
}: Readonly<{ kind: LevelDetailKind }>): React.ReactElement {
  const config = levelDetailConfigs[kind];
  const growthDetailApi = useMemo(() => createMobileGrowthApi(), []);
  const [selectedTab, setSelectedTab] = useState(config.tabs[0] ?? "");
  const [toast, setToast] = useState(
    `${config.progressLabel}: 완료하면 XP와 진행률이 올라가요.`,
  );
  const [completedContentIds, setCompletedContentIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const levelDetailCompletionInFlightRef = useRef<Set<string>>(new Set());
  const [submittingContentId, setSubmittingContentId] = useState<string | null>(
    null,
  );
  const completeLevelContent = useCallback(
    async (card: LevelDetailConfig["cards"][number]): Promise<void> => {
      if (completedContentIds.has(card.contentId)) {
        setToast(`${card.title}: 이미 서버에 완료 기록이 있어요.`);
        return;
      }
      if (levelDetailCompletionInFlightRef.current.has(card.contentId)) {
        setToast(`${card.title}: 서버 기록 중이에요. 잠시만 기다려 주세요.`);
        return;
      }
      levelDetailCompletionInFlightRef.current.add(card.contentId);
      setSubmittingContentId(card.contentId);
      try {
        const result = await growthDetailApi.completeContent({
          contentId: card.contentId,
          idempotencyKey: `mobile-${card.contentId}-${new Date()
            .toISOString()
            .slice(0, 10)}`,
          note: "mobile level detail content complete",
        });
        if (result.completion.recommendationUsesSensitiveFinancialData) {
          setToast("민감 금융정보가 포함된 추천은 완료 처리하지 않아요.");
          return;
        }
        setCompletedContentIds((current) =>
          new Set(current).add(card.contentId),
        );
        setToast(
          `${card.title}: 서버 기록 완료! +${result.completion.expDelta} XP가 반영됐어요.`,
        );
      } catch {
        setToast(
          "서버에 LV UP 콘텐츠 완료를 기록하지 못했어요. 다시 시도해 주세요.",
        );
      } finally {
        levelDetailCompletionInFlightRef.current.delete(card.contentId);
        setSubmittingContentId(null);
      }
    },
    [completedContentIds, growthDetailApi],
  );

  return (
    <AppScreen title={config.title} subtitle={config.subtitle}>
      <PillRow
        items={config.tabs}
        selected={selectedTab}
        onSelect={setSelectedTab}
      />
      <SectionCard>
        <View style={styles.detailHero}>
          <Text style={styles.detailIcon}>{config.icon}</Text>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>내 역량/진행률</Text>
            <Text style={styles.bodyText}>{config.progressLabel}</Text>
          </View>
          <StatusPill label={`${Math.round(config.progressValue)}%`} />
        </View>
        <ProgressBar value={config.progressValue} />
      </SectionCard>
      <MetricGrid metrics={config.metrics} />
      <Toast message={toast} />
      <SectionCard>
        <Text style={styles.sectionTitle}>콘텐츠 리스트</Text>
        {config.cards.map((card) => {
          const contentActionLocked =
            submittingContentId === card.contentId ||
            completedContentIds.has(card.contentId);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: contentActionLocked }}
              disabled={contentActionLocked}
              key={card.title}
              onPress={() => {
                void completeLevelContent(card);
              }}
              style={
                contentActionLocked
                  ? [styles.detailCardRow, styles.disabled]
                  : styles.detailCardRow
              }
            >
              <Text style={styles.listIcon}>{card.icon}</Text>
              <View style={styles.flex}>
                <Text style={styles.listTitle}>{card.title}</Text>
                <Text style={styles.listMeta}>{card.meta}</Text>
              </View>
              <Text style={styles.linkText}>
                {submittingContentId === card.contentId
                  ? "기록 중"
                  : completedContentIds.has(card.contentId)
                    ? "완료됨"
                    : card.action}
              </Text>
            </Pressable>
          );
        })}
      </SectionCard>
      <AdSlot />
      <GuardBox />
    </AppScreen>
  );
}

export function CleanFintechSettingsScreen({
  kind,
}: Readonly<{ kind: SettingsKind }>): React.ReactElement {
  const settingsRouter = useRouter();
  const config = settingsScreenConfig[kind];
  const profileSettingsApi = useMemo(() => createMobileProfileApi(), []);
  const accountSettingsApi = useMemo(() => createMobileProfileApi(), []);
  const [profileNickname, setProfileNickname] = useState(
    fallbackProfileSnapshot.user.nickname,
  );
  const [profileDisplayBio, setProfileDisplayBio] =
    useState("월급을 먼저 지키는 루틴러");
  const [profileOccupationCategory, setProfileOccupationCategory] =
    useState("PRODUCT");
  const [profileSettingsToast, setProfileSettingsToast] = useState(
    "프로필 설정은 서버 MY 프로필 API 기준으로 저장됩니다.",
  );
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [contentRecommendationAccepted, setContentRecommendationAccepted] =
    useState(true);
  const [adPartnerAccepted, setAdPartnerAccepted] = useState(false);
  const [analyticsAccepted, setAnalyticsAccepted] = useState(false);
  const [accountSettingsToast, setAccountSettingsToast] = useState(
    "계정 동의 설정은 서버 consents API 기준으로 저장됩니다.",
  );
  const [profileSettingsSaving, setProfileSettingsSaving] = useState(false);
  const [accountSettingsSaving, setAccountSettingsSaving] = useState(false);
  const profileSettingsSaveInFlightRef = useRef(false);
  const accountSettingsSaveInFlightRef = useRef(false);
  const settingsSavePending = profileSettingsSaving || accountSettingsSaving;
  const profileSettingsValid =
    profileNickname.trim().length >= 2 &&
    profileDisplayBio.trim().length <= 300 &&
    profileOccupationCategory.trim().length >= 2;
  const closeSettingsScreen = useCallback(() => {
    if (settingsSavePending) return;
    settingsRouter.replace("/profile");
  }, [settingsRouter, settingsSavePending]);
  const submitProfileSettings = useCallback(() => {
    if (
      kind !== "profile" ||
      !profileSettingsValid ||
      profileSettingsSaveInFlightRef.current
    ) {
      return;
    }
    if (
      containsSensitiveCommunityContent(
        `${profileNickname}\n${profileDisplayBio}\n${profileOccupationCategory}`,
      )
    ) {
      setProfileSettingsToast(
        "프로필에는 급여, 지출, 계좌, 카드, 연락처, 토큰 같은 민감 원문을 넣을 수 없어요.",
      );
      return;
    }
    profileSettingsSaveInFlightRef.current = true;
    setProfileSettingsSaving(true);
    setProfileSettingsToast("프로필 설정을 서버에 저장하는 중이에요.");
    void profileSettingsApi
      .updateProfile({
        displayBio: profileDisplayBio.trim() || null,
        nickname: profileNickname.trim(),
        occupationCategory: profileOccupationCategory.trim() || null,
      })
      .then((snapshot) => {
        setProfileNickname(snapshot.user.nickname);
        setProfileSettingsToast(
          `프로필 설정 저장 완료 · rawFinancialDataExposed=false · adsFinancialTargetingUsed=${String(
            snapshot.user.adsFinancialTargetingUsed,
          )}`,
        );
      })
      .catch(() => {
        setProfileSettingsToast(
          "프로필 설정 저장에 실패했어요. 민감 정보 입력 여부와 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        profileSettingsSaveInFlightRef.current = false;
        setProfileSettingsSaving(false);
      });
  }, [
    kind,
    profileDisplayBio,
    profileNickname,
    profileOccupationCategory,
    profileSettingsApi,
    profileSettingsValid,
  ]);
  const submitAccountSettings = useCallback(() => {
    if (kind !== "account" || accountSettingsSaveInFlightRef.current) return;
    accountSettingsSaveInFlightRef.current = true;
    setAccountSettingsSaving(true);
    setAccountSettingsToast("계정 동의 설정을 서버에 저장하는 중이에요.");
    void accountSettingsApi
      .updateAccountSettings({
        adPartnerAccepted,
        analyticsAccepted,
        consentVersion: "mobile-v1",
        contentRecommendationAccepted,
        marketingAccepted,
        privacyAccepted: true,
        termsAccepted: true,
      })
      .then((settings) => {
        setMarketingAccepted(settings.marketingAccepted);
        setContentRecommendationAccepted(
          settings.contentRecommendationAccepted,
        );
        setAdPartnerAccepted(settings.adPartnerAccepted);
        setAnalyticsAccepted(settings.analyticsAccepted);
        setAccountSettingsToast(
          `계정 동의 저장 완료 · sensitiveFinancialTargetingAccepted=false · adPartnerFinancialRawDataUsed=${String(
            settings.adPartnerFinancialRawDataUsed,
          )}`,
        );
      })
      .catch(() => {
        setAccountSettingsToast(
          "계정 동의 저장에 실패했어요. 필수 약관과 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        accountSettingsSaveInFlightRef.current = false;
        setAccountSettingsSaving(false);
      });
  }, [
    accountSettingsApi,
    adPartnerAccepted,
    analyticsAccepted,
    contentRecommendationAccepted,
    kind,
    marketingAccepted,
  ]);

  return (
    <AppScreen title={config.title} subtitle={config.subtitle}>
      <SectionCard>
        <SmallButton
          disabled={settingsSavePending}
          label="MY로 돌아가기"
          onPress={closeSettingsScreen}
        />
      </SectionCard>
      {kind === "profile" ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>프로필 저장</Text>
          <Toast message={profileSettingsToast} />
          <TextInput
            accessibilityLabel="프로필 닉네임"
            accessibilityState={{ disabled: profileSettingsSaving }}
            editable={!profileSettingsSaving}
            onChangeText={setProfileNickname}
            placeholder="닉네임"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.composeInput}
            value={profileNickname}
          />
          <TextInput
            accessibilityLabel="프로필 소개"
            accessibilityState={{ disabled: profileSettingsSaving }}
            editable={!profileSettingsSaving}
            multiline
            onChangeText={setProfileDisplayBio}
            placeholder="커뮤니티에 표시할 자기소개"
            placeholderTextColor={theme.color.text.disabled}
            style={[styles.composeInput, styles.composeBody]}
            value={profileDisplayBio}
          />
          <TextInput
            accessibilityLabel="직무 또는 관심 카테고리"
            accessibilityState={{ disabled: profileSettingsSaving }}
            editable={!profileSettingsSaving}
            onChangeText={setProfileOccupationCategory}
            placeholder="예: PRODUCT"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.composeInput}
            value={profileOccupationCategory}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: !profileSettingsValid || profileSettingsSaving,
            }}
            disabled={!profileSettingsValid || profileSettingsSaving}
            onPress={submitProfileSettings}
            style={[
              styles.primaryButton,
              !profileSettingsValid || profileSettingsSaving
                ? styles.disabled
                : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>저장하기</Text>
          </Pressable>
        </SectionCard>
      ) : null}
      {kind === "account" ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>동의 설정 저장</Text>
          <Toast message={accountSettingsToast} />
          <ToggleRow
            active={contentRecommendationAccepted}
            disabled={accountSettingsSaving}
            label="LV UP 콘텐츠 추천 받기"
            onPress={() => {
              if (accountSettingsSaving) return;
              setContentRecommendationAccepted(
                (currentAccepted) => !currentAccepted,
              );
            }}
          />
          <ToggleRow
            active={marketingAccepted}
            disabled={accountSettingsSaving}
            label="마케팅 알림 받기"
            onPress={() => {
              if (accountSettingsSaving) return;
              setMarketingAccepted((currentAccepted) => !currentAccepted);
            }}
          />
          <ToggleRow
            active={analyticsAccepted}
            disabled={accountSettingsSaving}
            label="서비스 개선 분석 허용"
            onPress={() => {
              if (accountSettingsSaving) return;
              setAnalyticsAccepted((currentAccepted) => !currentAccepted);
            }}
          />
          <ToggleRow
            active={adPartnerAccepted}
            disabled={accountSettingsSaving}
            label="제휴 혜택 받기"
            onPress={() => {
              if (accountSettingsSaving) return;
              setAdPartnerAccepted((currentAccepted) => !currentAccepted);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: accountSettingsSaving }}
            disabled={accountSettingsSaving}
            onPress={submitAccountSettings}
            style={[
              styles.primaryButton,
              accountSettingsSaving ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>동의 설정 저장</Text>
          </Pressable>
        </SectionCard>
      ) : null}
      <SectionCard>
        <Text style={styles.sectionTitle}>설정 항목</Text>
        {config.rows.map((row) => (
          <ListRow
            icon={row.icon}
            key={`${kind}-${row.title}`}
            meta={row.meta}
            title={row.title}
          />
        ))}
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>설정 저장 운영 기준</Text>
        <Text style={styles.bodyText}>
          저장은 서버 API에 즉시 요청되며 실패하면 화면에서 다시 시도할 수
          있어요. 민감 금융 원문은 설정 저장 payload에 포함하지 않습니다.
        </Text>
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

export function CleanFintechProfileNoticesScreen(): React.ReactElement {
  const profileNoticesRouter = useRouter();
  const profileNoticesApi = useMemo(() => createMobileProfileApi(), []);
  const [profileActivities, setProfileActivities] = useState<
    readonly ProfileActivity[]
  >(fallbackProfileSnapshot.activities);
  const [toast, setToast] = useState(
    "공지사항을 서버 MY 활동에서 불러오는 중이에요.",
  );

  useEffect(() => {
    let mounted = true;

    async function hydrateProfileNotices(): Promise<void> {
      try {
        const snapshot = await profileNoticesApi.getProfile();
        if (!mounted) return;
        const safeActivities = snapshot.activities.filter(
          (activity) =>
            !activity.rawFinancialDataExposed &&
            !activity.rawPersonalDataExposed &&
            !activity.adsFinancialTargetingUsed,
        );
        setProfileActivities(
          safeActivities.length
            ? safeActivities
            : fallbackProfileSnapshot.activities,
        );
        setToast("서버 공지사항을 개인정보 보호 기준으로 동기화했어요.");
      } catch {
        if (!mounted) return;
        setProfileActivities(fallbackProfileSnapshot.activities);
        setToast(
          "서버 공지사항을 불러오지 못해 안전한 기본 안내를 보여드려요.",
        );
      }
    }

    void hydrateProfileNotices();

    return () => {
      mounted = false;
    };
  }, [profileNoticesApi]);

  const visibleActivities = profileActivities.length
    ? profileActivities
    : fallbackProfileSnapshot.activities;
  const closeProfileNotices = useCallback(() => {
    profileNoticesRouter.replace("/profile");
  }, [profileNoticesRouter]);
  const openProfileActivity = useCallback(
    (activity: ProfileActivity): void => {
      const route = safeProfileActivityRoute(activity);
      profileNoticesRouter.push(route);
    },
    [profileNoticesRouter],
  );

  return (
    <AppScreen title="공지사항" subtitle="MY 활동과 서비스 안내">
      <Toast message={toast} />
      <SectionCard>
        <Text style={styles.sectionTitle}>프로필 활동 공지</Text>
        {visibleActivities.length ? (
          visibleActivities.map((activity) => (
            <ListRow
              icon={activity.kind === "SECURITY" ? "🔐" : appIcons.notification}
              key={activity.id}
              meta={`${activity.description} · ${formatNoticeDate(
                activity.createdAt,
              )} · rawFinancialDataExposed=${String(
                activity.rawFinancialDataExposed,
              )} · adsFinancialTargetingUsed=${String(
                activity.adsFinancialTargetingUsed,
              )}`}
              onPress={() => openProfileActivity(activity)}
              title={activity.title}
            />
          ))
        ) : (
          <Text style={styles.bodyText}>
            아직 표시할 서버 공지사항이 없어요. 중요한 서비스·보안 안내는 금융,
            개인정보, 토큰, 광고 타겟팅 원문 없이 이곳에 표시됩니다.
          </Text>
        )}
      </SectionCard>
      <SmallButton label="MY로 돌아가기" onPress={closeProfileNotices} />
      <GuardBox />
    </AppScreen>
  );
}

export function CleanFintechSupportScreen(): React.ReactElement {
  const supportRouter = useRouter();
  const supportApi = useMemo(() => createMobileProfileApi(), []);
  const [supportCategory, setSupportCategory] =
    useState<ProfileSupportTicketCategory>("ACCOUNT");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supportTicketSubmitInFlightRef = useRef(false);
  const [toast, setToast] = useState(
    "문의 내용을 서버에 안전하게 접수할 준비가 됐어요.",
  );
  const valid =
    supportSubject.trim().length >= 2 && supportMessage.trim().length >= 5;
  const closeSupportInquiry = useCallback(() => {
    if (submitting) return;
    supportRouter.replace("/profile");
  }, [submitting, supportRouter]);
  const submitSupportTicket = useCallback(() => {
    if (!valid || supportTicketSubmitInFlightRef.current) return;
    if (
      containsSensitiveCommunityContent(`${supportSubject}\n${supportMessage}`)
    ) {
      setToast(
        "문의에는 급여, 지출, 계좌, 카드, 연락처, 토큰 같은 민감 원문을 넣을 수 없어요.",
      );
      return;
    }
    supportTicketSubmitInFlightRef.current = true;
    setSubmitting(true);
    setToast("1:1 문의를 서버에 접수하는 중이에요.");
    void supportApi
      .createSupportTicket({
        category: supportCategory,
        message: supportMessage.trim(),
        subject: supportSubject.trim(),
      })
      .then((ticket) => {
        setSupportMessage("");
        setSupportSubject("");
        setSupportCategory("ACCOUNT");
        setToast(`문의가 접수됐어요. 상태 ${ticket.status}`);
      })
      .catch(() => {
        setToast(
          "문의 접수에 실패했어요. 민감한 금융 원문은 문의에 적지 마세요.",
        );
      })
      .finally(() => {
        supportTicketSubmitInFlightRef.current = false;
        setSubmitting(false);
      });
  }, [supportApi, supportCategory, supportMessage, supportSubject, valid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.composeHeader}>
          <Pressable
            accessibilityLabel="MY로 돌아가기"
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            onPress={closeSupportInquiry}
            style={[styles.iconButton, submitting ? styles.disabled : null]}
          >
            <Text style={styles.iconButtonText}>×</Text>
          </Pressable>
          <Text style={styles.composeTitle}>1:1 문의</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !valid || submitting }}
            disabled={!valid || submitting}
            onPress={submitSupportTicket}
            style={[
              styles.doneButton,
              !valid || submitting ? styles.disabled : null,
            ]}
          >
            <Text style={styles.doneButtonText}>
              {submitting ? "접수중" : "완료"}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Toast message={toast} />
          <SectionCard>
            <Text style={styles.sectionTitle}>문의 유형</Text>
            <PillRow
              disabled={submitting}
              items={["ACCOUNT", "PAYMENT", "PRIVACY", "BUG", "OTHER"]}
              selected={supportCategory}
              onSelect={(next) => {
                if (!submitting)
                  setSupportCategory(next as ProfileSupportTicketCategory);
              }}
            />
          </SectionCard>
          <SectionCard>
            <TextInput
              accessibilityLabel="문의 제목"
              accessibilityState={{ disabled: submitting }}
              editable={!submitting}
              onChangeText={setSupportSubject}
              placeholder="문의 제목"
              placeholderTextColor={theme.color.text.disabled}
              style={styles.composeInput}
              value={supportSubject}
            />
            <TextInput
              accessibilityLabel="문의 내용"
              accessibilityState={{ disabled: submitting }}
              editable={!submitting}
              multiline
              onChangeText={setSupportMessage}
              placeholder="문의 내용을 입력하세요. 급여, 지출, 계좌, 카드, 토큰 같은 민감 원문은 제외해 주세요."
              placeholderTextColor={theme.color.text.disabled}
              style={[styles.composeInput, styles.composeBody]}
              value={supportMessage}
            />
          </SectionCard>
          <SectionCard>
            <Text style={styles.sectionTitle}>개인정보 보호 기준</Text>
            <Text style={styles.bodyText}>
              민감한 금융 원문은 문의에 적지 마세요. rawFinancialData=false ·
              rawPersonalData=false · rawPushToken=false 기준으로만 접수합니다.
            </Text>
            <Text style={styles.listMeta}>support@salaryhijacking.com</Text>
          </SectionCard>
          <GuardBox />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function CleanFintechMyCommunityScreen(): React.ReactElement {
  const myCommunityRouter = useRouter();
  const myCommunityService = useMemo(() => createMobileCommunityService(), []);
  const [myCommunityPosts, setMyCommunityPosts] = useState<
    readonly CommunityScreenPost[]
  >(fallbackCommunityPosts);
  const [myCommunityComments, setMyCommunityComments] = useState<
    readonly CommunityComment[]
  >(fallbackPostDetail.comments);
  const [toast, setToast] = useState(
    "내 게시글과 댓글을 서버 기준으로 확인하는 중이에요.",
  );
  const [myCommunityActionPending, setMyCommunityActionPending] = useState<
    string | null
  >(null);
  const myCommunityActionInFlightRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function hydrateMyCommunity(): Promise<void> {
      try {
        const [postsResponse, commentsResponse] = await Promise.all([
          myCommunityService.listMyPosts(1, 20),
          myCommunityService.listMyComments(1, 20),
        ]);
        if (!mounted) return;

        const posts = toCommunityScreenPosts(
          parseCommunityFeedPage(communityResponseData(postsResponse)),
        );
        const comments = parseCommunityCommentPage(
          communityResponseData(commentsResponse),
        ).items;

        setMyCommunityPosts(posts.length ? posts : fallbackCommunityPosts);
        setMyCommunityComments(
          comments.length ? comments : fallbackPostDetail.comments,
        );
        setToast(
          `서버 내 커뮤니티 동기화 · 글 ${formatCommunityCount(
            posts.length,
          )}개 · 댓글 ${formatCommunityCount(comments.length)}개`,
        );
      } catch {
        if (!mounted) return;
        setMyCommunityPosts(fallbackCommunityPosts);
        setMyCommunityComments(fallbackPostDetail.comments);
        setToast("서버 연결 전까지 안전한 예시 내 활동을 보여드려요.");
      }
    }

    void hydrateMyCommunity();

    return () => {
      mounted = false;
    };
  }, [myCommunityService]);

  const openManagedPost = useCallback(
    (post: CommunityScreenPost): void => {
      myCommunityRouter.push(`/community/${post.id}`);
    },
    [myCommunityRouter],
  );
  const closeMyCommunityScreen = useCallback(() => {
    if (myCommunityActionPending !== null) return;
    myCommunityRouter.replace("/profile");
  }, [myCommunityActionPending, myCommunityRouter]);

  const deleteMyCommunityPost = useCallback(
    (post: CommunityScreenPost): void => {
      if (myCommunityActionInFlightRef.current !== null) return;
      myCommunityActionInFlightRef.current = `post:${post.id}`;
      setMyCommunityActionPending(`post:${post.id}`);
      setToast("내 게시글 삭제를 서버에 요청하는 중이에요.");
      void myCommunityService
        .deletePost(post.id)
        .then(() => {
          setMyCommunityPosts((current) =>
            current.filter((item) => item.id !== post.id),
          );
          setToast("내 게시글이 서버에서 삭제됐어요.");
        })
        .catch(() => {
          setToast(
            "내 게시글을 삭제하지 못했어요. 권한과 네트워크를 확인해 주세요.",
          );
        })
        .finally(() => {
          myCommunityActionInFlightRef.current = null;
          setMyCommunityActionPending(null);
        });
    },
    [myCommunityService],
  );

  const deleteMyCommunityComment = useCallback(
    (comment: CommunityComment): void => {
      if (myCommunityActionInFlightRef.current !== null) return;
      myCommunityActionInFlightRef.current = `comment:${comment.id}`;
      setMyCommunityActionPending(`comment:${comment.id}`);
      setToast("내 댓글 삭제를 서버에 요청하는 중이에요.");
      void myCommunityService
        .deleteComment(comment.id)
        .then(() => {
          setMyCommunityComments((current) =>
            current.filter((item) => item.id !== comment.id),
          );
          setToast("내 댓글이 서버에서 삭제됐어요.");
        })
        .catch(() => {
          setToast(
            "내 댓글을 삭제하지 못했어요. 권한과 네트워크를 확인해 주세요.",
          );
        })
        .finally(() => {
          myCommunityActionInFlightRef.current = null;
          setMyCommunityActionPending(null);
        });
    },
    [myCommunityService],
  );

  return (
    <AppScreen title="내 게시글 관리" subtitle="내 커뮤니티 활동">
      <Toast message={toast} />
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>내 게시글</Text>
          <StatusPill label={`${myCommunityPosts.length} posts`} />
        </View>
        {myCommunityPosts.map((post) => (
          <View key={post.id} style={styles.detailCardRow}>
            <View style={styles.flex}>
              <CommunityPostRow
                onPress={() => openManagedPost(post)}
                post={post}
              />
            </View>
            <SmallButton
              disabled={myCommunityActionPending !== null}
              label={
                myCommunityActionPending === `post:${post.id}`
                  ? "삭제 중"
                  : "삭제"
              }
              onPress={() => deleteMyCommunityPost(post)}
            />
          </View>
        ))}
      </SectionCard>
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>내 댓글</Text>
          <StatusPill label={`${myCommunityComments.length} comments`} />
        </View>
        {myCommunityComments.map((comment) => (
          <View key={comment.id} style={styles.detailCardRow}>
            <View style={styles.flex}>
              <ListRow
                icon="💬"
                meta={`${formatNoticeDate(comment.createdAt)} · rawFinancialDataExposed=${String(
                  comment.rawFinancialDataExposed,
                )}`}
                onPress={() =>
                  myCommunityRouter.push(`/community/${comment.postId}`)
                }
                title={comment.content}
              />
            </View>
            <SmallButton
              disabled={myCommunityActionPending !== null}
              label={
                myCommunityActionPending === `comment:${comment.id}`
                  ? "삭제 중"
                  : "삭제"
              }
              onPress={() => deleteMyCommunityComment(comment)}
            />
          </View>
        ))}
      </SectionCard>
      <SmallButton
        disabled={myCommunityActionPending !== null}
        label="MY로 돌아가기"
        onPress={closeMyCommunityScreen}
      />
      <GuardBox />
    </AppScreen>
  );
}

export function CleanFintechPostDetailScreen({
  postId = fallbackPostDetail.post.id,
}: Readonly<{ postId?: string }>): React.ReactElement {
  const detailRouter = useRouter();
  const detailCommunityService = useMemo(
    () => createMobileCommunityService(),
    [],
  );
  const [serverCommunityDetail, setServerCommunityDetail] =
    useState<CommunityPostDetail | null>(null);
  const [serverCommunityComments, setServerCommunityComments] = useState<
    readonly CommunityComment[]
  >([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const communityCommentSubmitInFlightRef = useRef(false);
  const commentInputRef = useRef<TextInput | null>(null);
  const [postEditTitle, setPostEditTitle] = useState(
    fallbackPostDetail.post.title,
  );
  const [postEditContent, setPostEditContent] = useState(
    fallbackPostDetail.content,
  );
  const [postEditing, setPostEditing] = useState(false);
  const communityPostEditInFlightRef = useRef(false);
  const [commentEditDrafts, setCommentEditDrafts] = useState<
    Record<string, string>
  >({});
  const [commentEditingId, setCommentEditingId] = useState<string | null>(null);
  const communityCommentEditInFlightRef = useRef<string | null>(null);
  const [communityDetailActionPending, setCommunityDetailActionPending] =
    useState<
      "report-post" | "delete-post" | "report-comment" | "delete-comment" | null
    >(null);
  const communityDetailMutationInFlightRef = useRef<
    "report-post" | "delete-post" | "report-comment" | "delete-comment" | null
  >(null);
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const communityLikeInFlightRef = useRef(false);
  const [commentLikePendingId, setCommentLikePendingId] = useState<
    string | null
  >(null);
  const commentLikeInFlightRef = useRef<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const communityBookmarkInFlightRef = useRef(false);
  const [sharePending, setSharePending] = useState(false);
  const communityShareInFlightRef = useRef(false);
  const [toast, setToast] = useState(
    "커뮤니티 상세와 댓글을 서버 기준으로 확인하는 중이에요.",
  );
  const activeDetail = serverCommunityDetail ?? fallbackPostDetail;
  const activeComments =
    serverCommunityComments.length > 0
      ? serverCommunityComments
      : activeDetail.comments;
  const post = toCommunityScreenPost(activeDetail.post) ?? {
    board: "레벨업 인증",
    id: fallbackPostDetail.post.id,
    stats: "좋아요 0 · 댓글 0 · 북마크 0 · 공유 0",
    summary: "민감 정보가 제거된 게시글입니다.",
    thumb: "💬",
    title: "안전한 커뮤니티 게시글",
  };
  const commentReady = commentDraft.trim().length >= 2;
  const communityDetailActionBusy = communityDetailActionPending !== null;
  const postEditReady =
    postEditTitle.trim().length >= 2 && postEditContent.trim().length >= 5;

  const refreshCommunityDetail = useCallback(async (): Promise<void> => {
    const safePostId = postId.trim() || fallbackPostDetail.post.id;
    try {
      const [detailResponse, commentsResponse] = await Promise.all([
        detailCommunityService.getPost(safePostId),
        detailCommunityService.listComments(safePostId, 1, 100),
      ]);
      const nextDetail = parseCommunityPostDetail(
        communityResponseData(detailResponse),
      );
      const nextComments = parseCommunityCommentPage(
        communityResponseData(commentsResponse),
      ).items;

      setServerCommunityDetail({ ...nextDetail, comments: nextComments });
      setServerCommunityComments(nextComments);
      setLiked(nextDetail.post.likedByMe === true);
      setBookmarked(nextDetail.post.bookmarkedByMe === true);
      setPostEditTitle(nextDetail.post.title);
      setPostEditContent(nextDetail.content || nextDetail.post.bodyPreview);
      setCommentEditDrafts(
        Object.fromEntries(
          nextComments.map((comment) => [comment.id, comment.content]),
        ),
      );
      setToast(
        `서버 커뮤니티 상세 동기화 · 댓글 ${formatCommunityCount(
          nextComments.length,
        )}개`,
      );
    } catch {
      setServerCommunityDetail(null);
      setServerCommunityComments([]);
      setLiked(false);
      setBookmarked(false);
      setPostEditTitle(fallbackPostDetail.post.title);
      setPostEditContent(fallbackPostDetail.content);
      setCommentEditDrafts(
        Object.fromEntries(
          fallbackPostDetail.comments.map((comment) => [
            comment.id,
            comment.content,
          ]),
        ),
      );
      setToast("서버 연결 전까지 안전한 예시 상세 화면을 보여드려요.");
    }
  }, [detailCommunityService, postId]);

  const restoreCommunityLikeState = useCallback(
    (targetPostId: string, previousLiked: boolean): void => {
      setLiked(previousLiked);
      setServerCommunityDetail((current) => {
        if (!current || current.post.id !== targetPostId) return current;
        if (current.post.likedByMe === previousLiked) return current;
        const delta = previousLiked ? 1 : -1;
        return {
          ...current,
          post: {
            ...current.post,
            likedByMe: previousLiked,
            likeCount: Math.max(0, current.post.likeCount + delta),
          },
        };
      });
    },
    [],
  );

  const restoreCommunityBookmarkState = useCallback(
    (targetPostId: string, previousBookmarked: boolean): void => {
      setBookmarked(previousBookmarked);
      setServerCommunityDetail((current) => {
        if (!current || current.post.id !== targetPostId) return current;
        if (current.post.bookmarkedByMe === previousBookmarked) return current;
        const delta = previousBookmarked ? 1 : -1;
        return {
          ...current,
          post: {
            ...current.post,
            bookmarkedByMe: previousBookmarked,
            bookmarkCount: Math.max(0, current.post.bookmarkCount + delta),
          },
        };
      });
    },
    [],
  );

  const togglePostLike = useCallback((): void => {
    if (communityDetailActionBusy || communityLikeInFlightRef.current) return;
    communityLikeInFlightRef.current = true;
    const nextLiked = !liked;
    const targetPostId = activeDetail.post.id;
    setLikePending(true);
    setLiked(nextLiked);
    setToast(
      nextLiked
        ? "좋아요를 서버에 반영하는 중이에요."
        : "좋아요 취소를 서버에 반영하는 중이에요.",
    );
    void detailCommunityService
      .setPostLiked(targetPostId, nextLiked)
      .then(() => {
        setServerCommunityDetail((current) => {
          if (!current || current.post.id !== targetPostId) return current;
          const delta = nextLiked ? 1 : -1;
          return {
            ...current,
            post: {
              ...current.post,
              likeCount: Math.max(0, current.post.likeCount + delta),
              likedByMe: nextLiked,
            },
          };
        });
        setToast(
          nextLiked ? "좋아요가 서버에 반영됐어요." : "좋아요를 취소했어요.",
        );
      })
      .catch(() => {
        restoreCommunityLikeState(targetPostId, !nextLiked);
        setToast("좋아요를 서버에 반영하지 못했어요. 다시 시도해 주세요.");
      })
      .finally(() => {
        communityLikeInFlightRef.current = false;
        setLikePending(false);
      });
  }, [
    activeDetail.post.id,
    communityDetailActionBusy,
    detailCommunityService,
    liked,
    restoreCommunityLikeState,
  ]);

  const togglePostBookmark = useCallback((): void => {
    if (communityDetailActionBusy || communityBookmarkInFlightRef.current)
      return;
    communityBookmarkInFlightRef.current = true;
    const nextBookmarked = !bookmarked;
    const targetPostId = activeDetail.post.id;
    setBookmarkPending(true);
    setBookmarked(nextBookmarked);
    setToast(
      nextBookmarked
        ? "게시글을 서버 북마크에 저장하는 중이에요."
        : "게시글 저장을 서버에서 해제하는 중이에요.",
    );
    void detailCommunityService
      .setPostBookmarked(targetPostId, nextBookmarked)
      .then((response) => {
        const data = communityResponseData(response);
        const serverBookmarkCount =
          typeof data === "object" &&
          data !== null &&
          "bookmarkCount" in data &&
          typeof data.bookmarkCount === "number" &&
          Number.isSafeInteger(data.bookmarkCount) &&
          data.bookmarkCount >= 0
            ? data.bookmarkCount
            : null;
        setServerCommunityDetail((current) => {
          if (!current || current.post.id !== targetPostId) return current;
          const delta = nextBookmarked ? 1 : -1;
          return {
            ...current,
            post: {
              ...current.post,
              bookmarkCount:
                serverBookmarkCount ??
                Math.max(0, current.post.bookmarkCount + delta),
              bookmarkedByMe: nextBookmarked,
            },
          };
        });
        setToast(
          nextBookmarked
            ? "게시글이 서버 북마크에 저장됐어요."
            : "게시글 저장이 해제됐어요.",
        );
      })
      .catch(() => {
        restoreCommunityBookmarkState(targetPostId, !nextBookmarked);
        setToast("게시글 저장 상태를 반영하지 못했어요. 다시 시도해 주세요.");
      })
      .finally(() => {
        communityBookmarkInFlightRef.current = false;
        setBookmarkPending(false);
      });
  }, [
    activeDetail.post.id,
    bookmarked,
    communityDetailActionBusy,
    detailCommunityService,
    restoreCommunityBookmarkState,
  ]);

  const shareCommunityPost = useCallback((): void => {
    if (communityDetailActionBusy || communityShareInFlightRef.current) return;
    communityShareInFlightRef.current = true;
    const targetPostId = activeDetail.post.id;
    const encodedPostId = encodeURIComponent(targetPostId);
    const url = `https://salaryhijacking.com/community/${encodedPostId}`;
    const title = activeDetail.post.title;

    setSharePending(true);
    setToast("공유할 수 있는 화면을 열었어요.");
    void Share.share({
      message: `${title}\n${url}`,
      title,
      url,
    })
      .then(() =>
        detailCommunityService
          .recordPostShare(targetPostId, "SYSTEM_SHARE")
          .then((response) => {
            const data = communityResponseData(response);
            const serverShareCount =
              typeof data === "object" &&
              data !== null &&
              "shareCount" in data &&
              typeof data.shareCount === "number" &&
              Number.isSafeInteger(data.shareCount) &&
              data.shareCount >= 0
                ? data.shareCount
                : null;
            setServerCommunityDetail((current) => {
              if (!current || current.post.id !== targetPostId) return current;
              return {
                ...current,
                post: {
                  ...current.post,
                  shareCount:
                    serverShareCount ?? (current.post.shareCount ?? 0) + 1,
                },
              };
            });
            setToast("공유 기록이 서버에 반영됐어요.");
          })
          .catch(() => {
            setToast("공유 화면은 열렸지만 서버 기록은 반영하지 못했어요.");
          }),
      )
      .catch(() => {
        setToast("공유 화면을 열지 못했어요. 다시 시도해 주세요.");
      })
      .finally(() => {
        communityShareInFlightRef.current = false;
        setSharePending(false);
      });
  }, [
    activeDetail.post.id,
    activeDetail.post.title,
    communityDetailActionBusy,
    detailCommunityService,
  ]);

  const focusCommunityCommentInput = useCallback((): void => {
    if (communityDetailActionBusy) return;
    commentInputRef.current?.focus();
    setToast("댓글 입력칸으로 이동했어요.");
  }, [communityDetailActionBusy]);

  const submitCommunityComment = useCallback((): void => {
    const content = commentDraft.trim();
    if (
      communityDetailActionBusy ||
      !content ||
      !commentReady ||
      communityCommentSubmitInFlightRef.current
    )
      return;
    communityCommentSubmitInFlightRef.current = true;

    const targetPostId = activeDetail.post.id;
    setCommentSubmitting(true);
    setToast("댓글을 서버 커뮤니티에 등록하는 중이에요.");
    void detailCommunityService
      .createComment(targetPostId, { content, anonymous: commentAnonymous })
      .then((response) => {
        const nextComment = parseCommunityComment(
          communityResponseData(response),
        );
        setServerCommunityComments((current) => [...current, nextComment]);
        setServerCommunityDetail((current) => {
          if (!current || current.post.id !== targetPostId) return current;
          return {
            ...current,
            comments: [...current.comments, nextComment],
            post: {
              ...current.post,
              commentCount: current.post.commentCount + 1,
            },
          };
        });
        setCommentDraft("");
        setToast("댓글이 서버에 등록됐어요.");
      })
      .catch(() => {
        setToast(
          "댓글을 등록하지 못했어요. 민감 정보와 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        communityCommentSubmitInFlightRef.current = false;
        setCommentSubmitting(false);
      });
  }, [
    activeDetail.post.id,
    commentAnonymous,
    commentDraft,
    commentReady,
    communityDetailActionBusy,
    detailCommunityService,
  ]);

  const updateCommunityPost = useCallback((): void => {
    if (
      communityDetailActionBusy ||
      !postEditReady ||
      communityPostEditInFlightRef.current
    )
      return;
    communityPostEditInFlightRef.current = true;
    const targetPostId = activeDetail.post.id;
    const draft: CommunityPostDraft = {
      anonymous: true,
      boardType: activeDetail.post.boardType,
      content: postEditContent.trim(),
      tags: activeDetail.tags,
      title: postEditTitle.trim(),
    };

    setPostEditing(true);
    setToast("게시글 수정을 서버 커뮤니티에 저장하는 중이에요.");
    void detailCommunityService
      .updatePost(targetPostId, draft)
      .then(() => {
        setServerCommunityDetail((current) => {
          const base = current ?? activeDetail;
          if (base.post.id !== targetPostId) return current;
          return {
            ...base,
            content: draft.content,
            post: {
              ...base.post,
              bodyPreview: draft.content.slice(0, 180),
              title: draft.title,
            },
            tags: draft.tags,
          };
        });
        setToast("게시글 수정이 서버에 저장됐어요.");
      })
      .catch(() => {
        setToast(
          "게시글 수정을 저장하지 못했어요. 민감 정보와 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        communityPostEditInFlightRef.current = false;
        setPostEditing(false);
      });
  }, [
    activeDetail,
    communityDetailActionBusy,
    detailCommunityService,
    postEditContent,
    postEditReady,
    postEditTitle,
  ]);

  const updateCommunityComment = useCallback(
    (comment: CommunityComment): void => {
      const content = (commentEditDrafts[comment.id] ?? comment.content).trim();
      if (
        communityDetailActionBusy ||
        content.length < 2 ||
        communityCommentEditInFlightRef.current !== null
      )
        return;
      communityCommentEditInFlightRef.current = comment.id;
      const targetPostId = activeDetail.post.id;

      setCommentEditingId(comment.id);
      setToast("댓글 수정을 서버 커뮤니티에 저장하는 중이에요.");
      void detailCommunityService
        .updateComment(comment.id, { content, anonymous: true })
        .then(() => {
          const updateComment = (item: CommunityComment): CommunityComment =>
            item.id === comment.id ? { ...item, content } : item;
          setServerCommunityComments((current) =>
            (current.length > 0 ? current : activeComments).map(updateComment),
          );
          setServerCommunityDetail((current) => {
            if (!current || current.post.id !== targetPostId) return current;
            return {
              ...current,
              comments: current.comments.map(updateComment),
            };
          });
          setToast("댓글 수정이 서버에 저장됐어요.");
        })
        .catch(() => {
          setToast(
            "댓글 수정을 저장하지 못했어요. 민감 정보와 네트워크 상태를 확인해 주세요.",
          );
        })
        .finally(() => {
          communityCommentEditInFlightRef.current = null;
          setCommentEditingId(null);
        });
    },
    [
      activeComments,
      activeDetail.post.id,
      commentEditDrafts,
      communityDetailActionBusy,
      detailCommunityService,
    ],
  );

  const reportCommunityPost = useCallback((): void => {
    if (communityDetailMutationInFlightRef.current !== null) return;
    const targetPostId = activeDetail.post.id;
    communityDetailMutationInFlightRef.current = "report-post";
    setCommunityDetailActionPending("report-post");
    setToast("게시글 신고를 server moderation 큐에 전달하는 중이에요.");
    void detailCommunityService
      .reportPost(targetPostId, "ABUSE", "mobile community detail report")
      .then(() => {
        setToast("게시글 신고가 접수됐어요. 운영 정책에 따라 검토할게요.");
      })
      .catch(() => {
        setToast(
          "게시글 신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      })
      .finally(() => {
        communityDetailMutationInFlightRef.current = null;
        setCommunityDetailActionPending(null);
      });
  }, [activeDetail.post.id, detailCommunityService]);

  const reportCommunityComment = useCallback(
    (comment: CommunityComment): void => {
      if (communityDetailMutationInFlightRef.current !== null) return;
      communityDetailMutationInFlightRef.current = "report-comment";
      setCommunityDetailActionPending("report-comment");
      setToast("댓글 신고를 server moderation 큐에 전달하는 중이에요.");
      void detailCommunityService
        .reportComment(comment.id, "ABUSE", "mobile community comment report")
        .then(() => {
          setToast("댓글 신고가 접수됐어요. 운영 정책에 따라 검토할게요.");
        })
        .catch(() => {
          setToast(
            "댓글 신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
        })
        .finally(() => {
          communityDetailMutationInFlightRef.current = null;
          setCommunityDetailActionPending(null);
        });
    },
    [detailCommunityService],
  );

  const toggleCommunityCommentLike = useCallback(
    (comment: CommunityComment): void => {
      if (
        commentLikeInFlightRef.current !== null ||
        communityDetailMutationInFlightRef.current !== null
      )
        return;
      const nextLiked = comment.likedByMe !== true;
      const optimistic = (item: CommunityComment): CommunityComment =>
        item.id === comment.id
          ? {
              ...item,
              likedByMe: nextLiked,
              likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)),
            }
          : item;
      commentLikeInFlightRef.current = comment.id;
      setCommentLikePendingId(comment.id);
      setServerCommunityComments((current) =>
        (current.length > 0 ? current : activeComments).map(optimistic),
      );
      setToast(
        nextLiked
          ? "댓글 좋아요를 서버에 저장하는 중이에요."
          : "댓글 좋아요 취소를 서버에 저장하는 중이에요.",
      );
      void detailCommunityService
        .setCommentLiked(comment.id, nextLiked)
        .then((response) => {
          const data = communityResponseData(response);
          const likeCount =
            typeof data === "object" &&
            data !== null &&
            "likeCount" in data &&
            typeof data.likeCount === "number"
              ? data.likeCount
              : null;
          setServerCommunityComments((current) =>
            (current.length > 0 ? current : activeComments).map((item) =>
              item.id === comment.id
                ? {
                    ...item,
                    likedByMe: nextLiked,
                    likeCount: likeCount ?? item.likeCount,
                  }
                : item,
            ),
          );
          setToast(
            nextLiked
              ? "댓글 좋아요를 저장했어요."
              : "댓글 좋아요를 취소했어요.",
          );
        })
        .catch(() => {
          setServerCommunityComments((current) =>
            (current.length > 0 ? current : activeComments).map((item) =>
              item.id === comment.id ? comment : item,
            ),
          );
          setToast(
            "댓글 좋아요를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
        })
        .finally(() => {
          commentLikeInFlightRef.current = null;
          setCommentLikePendingId(null);
        });
    },
    [activeComments, detailCommunityService],
  );

  const deleteCommunityPost = useCallback((): void => {
    if (communityDetailMutationInFlightRef.current !== null) return;
    const targetPostId = activeDetail.post.id;
    communityDetailMutationInFlightRef.current = "delete-post";
    setCommunityDetailActionPending("delete-post");
    setToast("게시글 삭제를 서버 커뮤니티에 요청하는 중이에요.");
    void detailCommunityService
      .deletePost(targetPostId)
      .then(() => {
        setServerCommunityDetail(null);
        setServerCommunityComments([]);
        setToast("게시글이 서버에서 삭제됐어요. 커뮤니티로 이동합니다.");
        detailRouter.replace("/community");
      })
      .catch(() => {
        setToast(
          "게시글을 삭제하지 못했어요. 권한과 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        communityDetailMutationInFlightRef.current = null;
        setCommunityDetailActionPending(null);
      });
  }, [activeDetail.post.id, detailCommunityService, detailRouter]);

  const deleteCommunityComment = useCallback(
    (comment: CommunityComment): void => {
      if (communityDetailMutationInFlightRef.current !== null) return;
      const targetPostId = activeDetail.post.id;
      communityDetailMutationInFlightRef.current = "delete-comment";
      setCommunityDetailActionPending("delete-comment");
      setToast("댓글 삭제를 서버 커뮤니티에 요청하는 중이에요.");
      void detailCommunityService
        .deleteComment(comment.id)
        .then(() => {
          setServerCommunityComments((current) =>
            (current.length > 0 ? current : activeComments).filter(
              (item) => item.id !== comment.id,
            ),
          );
          setServerCommunityDetail((current) => {
            if (!current || current.post.id !== targetPostId) return current;
            return {
              ...current,
              comments: current.comments.filter(
                (item) => item.id !== comment.id,
              ),
              post: {
                ...current.post,
                commentCount: Math.max(0, current.post.commentCount - 1),
              },
            };
          });
          setToast("댓글이 서버에서 삭제됐어요.");
        })
        .catch(() => {
          setToast(
            "댓글을 삭제하지 못했어요. 권한과 네트워크 상태를 확인해 주세요.",
          );
        })
        .finally(() => {
          communityDetailMutationInFlightRef.current = null;
          setCommunityDetailActionPending(null);
        });
    },
    [activeComments, activeDetail.post.id, detailCommunityService],
  );

  useEffect(() => {
    void refreshCommunityDetail();
  }, [refreshCommunityDetail]);

  return (
    <AppScreen title="커뮤니티" subtitle="레벨업 인증">
      <Toast message={toast} />
      <SectionCard>
        <Text style={styles.boardBadge}>{post.board}</Text>
        <Text style={styles.postDetailTitle}>{post.title}</Text>
        <Text style={styles.bodyText}>{post.summary}</Text>
        <View style={styles.attachmentRow}>
          <StatusPill label={post.stats} />
          <SmallButton
            disabled={sharePending || communityDetailActionBusy}
            label={sharePending ? "공유중" : "공유"}
            onPress={shareCommunityPost}
          />
          <SmallButton
            disabled={bookmarkPending || communityDetailActionBusy}
            label={
              bookmarkPending ? "저장중" : bookmarked ? "저장 취소" : "저장"
            }
            onPress={togglePostBookmark}
          />
          <SmallButton
            disabled={communityDetailActionBusy}
            label={
              communityDetailActionPending === "report-post" ? "신고중" : "신고"
            }
            onPress={reportCommunityPost}
          />
          <SmallButton
            disabled={communityDetailActionBusy}
            label={
              communityDetailActionPending === "delete-post" ? "삭제중" : "삭제"
            }
            onPress={deleteCommunityPost}
          />
        </View>
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>인증 내용</Text>
        <Text style={styles.bodyText}>
          {activeDetail.content || post.summary}
        </Text>
        <CommunityAttachmentList attachments={activeDetail.attachments} />
        <TextInput
          accessibilityLabel="커뮤니티 게시글 제목 수정"
          editable={!postEditing && !communityDetailActionBusy}
          onChangeText={setPostEditTitle}
          placeholder="게시글 제목"
          placeholderTextColor={theme.color.text.disabled}
          style={styles.input}
          value={postEditTitle}
        />
        <TextInput
          accessibilityLabel="커뮤니티 게시글 본문 수정"
          editable={!postEditing && !communityDetailActionBusy}
          multiline
          onChangeText={setPostEditContent}
          placeholder="게시글 본문"
          placeholderTextColor={theme.color.text.disabled}
          style={[styles.input, styles.composeBody]}
          value={postEditContent}
        />
        <View style={styles.attachmentRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: likePending || communityDetailActionBusy,
            }}
            disabled={likePending || communityDetailActionBusy}
            onPress={togglePostLike}
            style={[
              styles.smallButton,
              likePending || communityDetailActionBusy ? styles.disabled : null,
            ]}
          >
            <Text style={styles.smallButtonText}>
              {likePending ? "반영 중" : liked ? "좋아요 취소" : "좋아요"}
            </Text>
          </Pressable>
          <SmallButton
            disabled={communityDetailActionBusy}
            label="댓글"
            onPress={focusCommunityCommentInput}
          />
          <SmallButton
            disabled={sharePending || communityDetailActionBusy}
            label={sharePending ? "공유중" : "공유"}
            onPress={shareCommunityPost}
          />
          <SmallButton
            disabled={bookmarkPending || communityDetailActionBusy}
            label={
              bookmarkPending ? "저장중" : bookmarked ? "저장 취소" : "저장"
            }
            onPress={togglePostBookmark}
          />
          <SmallButton
            disabled={postEditing || communityDetailActionBusy}
            label={postEditing ? "수정 중" : "수정 저장"}
            onPress={updateCommunityPost}
          />
          <SmallButton
            disabled={communityDetailActionBusy}
            label={
              communityDetailActionPending === "report-post" ? "신고중" : "신고"
            }
            onPress={reportCommunityPost}
          />
          <SmallButton
            disabled={communityDetailActionBusy}
            label={
              communityDetailActionPending === "delete-post" ? "삭제중" : "삭제"
            }
            onPress={deleteCommunityPost}
          />
        </View>
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>댓글</Text>
        {activeComments.map((comment) => (
          <View key={comment.id}>
            <ListRow
              icon="💬"
              title={comment.anonymousDisplayName}
              meta={comment.content}
            />
            <TextInput
              accessibilityLabel="커뮤니티 댓글 수정"
              editable={commentEditingId === null && !communityDetailActionBusy}
              multiline
              onChangeText={(value) =>
                setCommentEditDrafts((current) => ({
                  ...current,
                  [comment.id]: value,
                }))
              }
              placeholder="댓글 수정"
              placeholderTextColor={theme.color.text.disabled}
              style={styles.input}
              value={commentEditDrafts[comment.id] ?? comment.content}
            />
            <View style={styles.attachmentRow}>
              <SmallButton
                disabled={
                  commentLikePendingId !== null || communityDetailActionBusy
                }
                label={
                  commentLikePendingId === comment.id
                    ? "좋아요 저장중"
                    : `좋아요 ${formatCommunityCount(comment.likeCount)}`
                }
                onPress={() => toggleCommunityCommentLike(comment)}
              />
              <SmallButton
                disabled={
                  commentEditingId !== null || communityDetailActionBusy
                }
                label={
                  commentEditingId === comment.id ? "수정 중" : "수정 저장"
                }
                onPress={() => updateCommunityComment(comment)}
              />
              <SmallButton
                disabled={communityDetailActionBusy}
                label={
                  communityDetailActionPending === "report-comment"
                    ? "신고중"
                    : "신고"
                }
                onPress={() => reportCommunityComment(comment)}
              />
              <SmallButton
                disabled={communityDetailActionBusy}
                label={
                  communityDetailActionPending === "delete-comment"
                    ? "삭제중"
                    : "삭제"
                }
                onPress={() => deleteCommunityComment(comment)}
              />
            </View>
          </View>
        ))}
        <ToggleRow
          active={commentAnonymous}
          disabled={communityDetailActionBusy || commentSubmitting}
          label="익명 댓글"
          onPress={() => setCommentAnonymous((current) => !current)}
        />
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel="커뮤니티 댓글 입력"
            editable={!communityDetailActionBusy && !commentSubmitting}
            multiline
            onChangeText={setCommentDraft}
            placeholder="민감 정보 없이 댓글을 입력하세요"
            placeholderTextColor={theme.color.text.disabled}
            ref={commentInputRef}
            style={styles.input}
            value={commentDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled:
                !commentReady || commentSubmitting || communityDetailActionBusy,
            }}
            disabled={
              !commentReady || commentSubmitting || communityDetailActionBusy
            }
            onPress={submitCommunityComment}
            style={[
              styles.primaryButton,
              !commentReady || commentSubmitting || communityDetailActionBusy
                ? styles.disabled
                : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {commentSubmitting ? "등록중" : "댓글 등록"}
            </Text>
          </Pressable>
        </View>
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

function SalaryHomeScreen(): React.ReactElement {
  const budgetApi = useMemo(() => createMobileBudgetApi(), []);
  const salaryUploadsApi = useMemo(() => createMobileUploadsApi(), []);
  const salaryPlanCommitmentsApi = useMemo(
    () => createMobilePlanCommitmentsApi(),
    [],
  );
  const [expenseDraft, setExpenseDraft] = useState("");
  const [expenseTitleDraft, setExpenseTitleDraft] = useState("");
  const [dailyBudgetDraft, setDailyBudgetDraft] = useState("");
  const [addedExpenses, setAddedExpenses] = useState<
    readonly VariableExpenseEntry[]
  >([]);
  const [toast, setToast] = useState(
    "서버 응답이 없을 때만 안전한 오프라인 미리보기를 보여줘요.",
  );
  const [prioritizeDailyBudget, setPrioritizeDailyBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingDailyBudget, setSavingDailyBudget] = useState(false);
  const expenseCreateInFlightRef = useRef(false);
  const dailyBudgetSaveInFlightRef = useRef(false);
  const [uploadedExpenseReceipt, setUploadedExpenseReceipt] =
    useState<UploadAttachment | null>(null);
  const [uploadingExpenseReceipt, setUploadingExpenseReceipt] = useState(false);
  const salaryReceiptUploadInFlightRef = useRef(false);
  const [serverBudgetSnapshot, setServerBudgetSnapshot] =
    useState<DailyBudgetSnapshot | null>(null);
  const [serverVariableExpenses, setServerVariableExpenses] = useState<
    readonly VariableExpenseRecord[]
  >([]);
  const [variableExpensesHydrated, setVariableExpensesHydrated] =
    useState(false);
  const [salaryFixedExpenses, setSalaryFixedExpenses] = useState<
    readonly PlanFixedExpenseCommitment[]
  >([]);
  const [payingFixedExpenseId, setPayingFixedExpenseId] = useState<
    string | null
  >(null);
  const payingFixedExpenseInFlightRef = useRef<string | null>(null);
  const [updatingVariableExpenseId, setUpdatingVariableExpenseId] = useState<
    string | null
  >(null);
  const [deletingVariableExpenseId, setDeletingVariableExpenseId] = useState<
    string | null
  >(null);
  const variableExpenseActionInFlightRef = useRef<string | null>(null);

  const refreshServerBudgetSnapshot = useCallback(
    async (
      options: Readonly<{ clearLocalPreview?: boolean }> = {},
    ): Promise<void> => {
      try {
        const response = await budgetApi.getToday();
        const nextSnapshot = response?.data.snapshot;
        if (!nextSnapshot) return;

        setServerBudgetSnapshot(nextSnapshot);
        if (options.clearLocalPreview) setAddedExpenses([]);
        setToast("서버 예산 기준으로 오늘 예산을 동기화했어요.");
      } catch {
        // Keep the existing offline preview when the API is unreachable.
      }
    },
    [budgetApi],
  );

  const refreshServerVariableExpenses = useCallback(async (): Promise<void> => {
    try {
      const response = await budgetApi.listVariableExpenses({
        page: 1,
        pageSize: 20,
      });
      setServerVariableExpenses(response.items);
      setVariableExpensesHydrated(true);
    } catch {
      // Keep the existing offline preview when the API is unreachable.
    }
  }, [budgetApi]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const shouldScrollToDailyBudget = window.location.hash === "#daily-budget";
    const shouldFocusDailyBudget =
      shouldScrollToDailyBudget ||
      window.location.search.includes("focus=daily-budget");
    if (!shouldFocusDailyBudget) return;

    setPrioritizeDailyBudget(true);

    if (!shouldScrollToDailyBudget) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById("daily-budget")
        ?.scrollIntoView({ block: "start" });
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void refreshServerBudgetSnapshot();
  }, [refreshServerBudgetSnapshot]);

  useEffect(() => {
    void refreshServerVariableExpenses();
  }, [refreshServerVariableExpenses]);

  useEffect(() => {
    let cancelled = false;
    const commitmentsPromise = salaryPlanCommitmentsApi.getCommitments();
    void commitmentsPromise
      .then((commitments) => {
        if (cancelled) return;
        setSalaryFixedExpenses(commitments.fixedExpenses);
      })
      .catch(() => {
        if (!cancelled) setSalaryFixedExpenses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [salaryPlanCommitmentsApi]);

  const baseDailyLimit = serverBudgetSnapshot?.dailyLimit ?? 20_000;
  const baseSpentToday = serverBudgetSnapshot?.spentToday ?? 13_000;
  const baseMonthlyExpense = serverBudgetSnapshot
    ? Math.max(0, 773_000 - 13_000 + serverBudgetSnapshot.spentToday)
    : 773_000;
  const baseMonthHijack = serverBudgetSnapshot
    ? Math.max(0, 1_927_000 + 13_000 - serverBudgetSnapshot.spentToday)
    : 1_927_000;
  const preview = calculateOfflineDailyBudgetPreview({
    addedExpenseAmounts: addedExpenses.map((item) => item.amount),
    baseMonthHijack,
    baseMonthlyExpense,
    baseSpentToday,
    dailyLimit: baseDailyLimit,
  });
  const dailyLimit = preview.dailyLimit;
  const used = preview.spentToday;
  const remaining = preview.remainingToday;
  const allVariableExpenses = [...variableExpenses, ...addedExpenses];
  const serverVariableExpenseRows = serverVariableExpenses.map(
    variableExpenseRowFromServer,
  );
  const salaryFixedExpenseRows = salaryFixedExpenses.map(
    fixedExpenseRowFromServer,
  );

  const setSanitizedExpenseDraft = useCallback((value: string) => {
    const next = sanitizeKrwIntegerInput(value);
    if (next !== null) setExpenseDraft(next);
  }, []);
  const setSanitizedExpenseTitleDraft = useCallback((value: string) => {
    setExpenseTitleDraft(value.replace(/\s+/gu, " ").slice(0, 40));
  }, []);
  const setSanitizedDailyBudgetDraft = useCallback((value: string) => {
    const next = sanitizeKrwIntegerInput(value);
    if (next !== null) setDailyBudgetDraft(next);
  }, []);
  const salaryHomeAmountPending = savingExpense || savingDailyBudget;
  const salaryHomeExpenseSubmitDisabled =
    salaryHomeAmountPending || parseKrwInputAmount(expenseDraft) === null;
  const salaryHomeDailyBudgetSubmitDisabled =
    savingDailyBudget || parseKrwInputAmount(dailyBudgetDraft) === null;

  const saveSalaryDailyBudget = useCallback(async (): Promise<void> => {
    if (dailyBudgetSaveInFlightRef.current) return;
    const dailyBudgetAmount = parseKrwInputAmount(dailyBudgetDraft);
    if (dailyBudgetAmount === null) {
      setToast("저장할 오늘 예산을 0보다 큰 KRW 정수로 입력해 주세요.");
      return;
    }

    try {
      dailyBudgetSaveInFlightRef.current = true;
      setSavingDailyBudget(true);
      const response = await budgetApi.saveDailyBudget({
        budgetDate: serverBudgetSnapshot?.date ?? todayDateInSeoul(),
        budgetId: serverBudgetSnapshot?.budgetId ?? null,
        memo: "mobile salary home daily budget save",
        plannedAmountMinor: dailyBudgetAmount,
      });
      setServerBudgetSnapshot(response.data.snapshot);
      setAddedExpenses([]);
      setDailyBudgetDraft("");
      setToast(
        `오늘 예산을 ${formatMoney(response.data.snapshot.dailyLimit)}원으로 서버 저장했어요.`,
      );
    } catch {
      setToast("오늘 예산 저장에 실패했어요. 서버 연결 후 다시 시도해 주세요.");
    } finally {
      dailyBudgetSaveInFlightRef.current = false;
      setSavingDailyBudget(false);
    }
  }, [budgetApi, dailyBudgetDraft, serverBudgetSnapshot]);

  const pickVariableExpenseReceipt = useCallback(() => {
    if (uploadingExpenseReceipt || salaryReceiptUploadInFlightRef.current) {
      return;
    }
    salaryReceiptUploadInFlightRef.current = true;
    setUploadingExpenseReceipt(true);
    setToast("영수증 파일을 선택하면 서버 업로드를 바로 시작해요.");
    void DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    })
      .then(async (result) => {
        if (result.canceled) {
          setToast("영수증 선택이 취소되었어요.");
          return;
        }

        const asset = result.assets[0];
        if (!asset) {
          setToast("선택한 영수증 파일을 확인하지 못했어요.");
          return;
        }

        const response = await fetch(asset.uri);
        const bytes = await response.arrayBuffer();
        const contentType =
          asset.mimeType ??
          response.headers.get("content-type") ??
          "application/octet-stream";
        const uploaded =
          await salaryUploadsApi.directUploadVariableExpenseReceipt({
            bytes,
            contentType,
            fileName: asset.name || "variable-expense-receipt",
            sizeBytes: asset.size ?? bytes.byteLength,
          });

        setUploadedExpenseReceipt(uploaded);
        setToast(
          "영수증이 서버 업로드에 등록되었어요. 지출 추가 시 함께 연결합니다.",
        );
      })
      .catch(() => {
        setToast(
          "영수증 업로드에 실패했어요. 파일 형식과 네트워크를 확인해 주세요.",
        );
      })
      .finally(() => {
        salaryReceiptUploadInFlightRef.current = false;
        setUploadingExpenseReceipt(false);
      });
  }, [salaryUploadsApi, uploadingExpenseReceipt]);

  const attachReceiptToCreatedExpense = useCallback(
    async (expenseId: string): Promise<boolean> => {
      if (!uploadedExpenseReceipt) return true;

      try {
        await salaryUploadsApi.attachToVariableExpense(
          uploadedExpenseReceipt.attachmentId,
          expenseId,
        );
        setUploadedExpenseReceipt(null);
        return true;
      } catch {
        setUploadedExpenseReceipt(null);
        return false;
      }
    },
    [salaryUploadsApi, uploadedExpenseReceipt],
  );

  const handleAddExpense = async (): Promise<void> => {
    if (expenseCreateInFlightRef.current) return;
    const amount = parseKrwInputAmount(expenseDraft);
    if (amount === null) {
      setToast(
        "0보다 큰 KRW 정수만 입력해 주세요. 음수와 소수점은 제외됩니다.",
      );
      return;
    }

    const nextIndex = addedExpenses.length + 1;
    const expenseTitle = expenseTitleDraft.trim() || `추가 지출 ${nextIndex}`;
    const offlineEntry = {
      amount,
      icon: appIcons.expense,
      id: `offline-expense-${nextIndex}-${amount}`,
      name: expenseTitle,
    } satisfies VariableExpenseEntry;
    setExpenseDraft("");
    setExpenseTitleDraft("");

    try {
      expenseCreateInFlightRef.current = true;
      setSavingExpense(true);
      const result = await budgetApi.createVariableExpense({
        amountMinor: amount,
        category: "ETC",
        dailyBudgetId: null,
        idempotencyKey: `mobile-salary-home-${Date.now()}-${amount}`,
        memo: null,
        merchantName: null,
        paymentMethod: "ETC",
        receiptAttachmentId: uploadedExpenseReceipt?.attachmentId ?? null,
        source: "MANUAL",
        spentAt: new Date().toISOString(),
        tags: [],
        title: expenseTitle,
      });
      if (result.serverAuthority !== true) {
        throw new Error("serverAuthority response required");
      }
      const receiptAttached = await attachReceiptToCreatedExpense(
        result.expenseId,
      );
      setServerVariableExpenses((current) => [
        result,
        ...current.filter(
          (expenseItem) => expenseItem.expenseId !== result.expenseId,
        ),
      ]);
      setVariableExpensesHydrated(true);
      void refreshServerVariableExpenses();
      void refreshServerBudgetSnapshot({ clearLocalPreview: true });
      if (!receiptAttached) {
        setToast(
          "지출은 서버에 저장됐지만 영수증 연결은 실패했어요. 영수증은 다시 첨부해 주세요.",
        );
        return;
      }
      setToast(
        `서버에 지출을 기록했어요. ${formatMoney(result.netAmountMinor)}원 기준으로 다시 계산했습니다.`,
      );
    } catch {
      setAddedExpenses((current) => [...current, offlineEntry]);
      setToast(
        `${formatMoney(amount)}원 지출을 오프라인 미리보기로 반영했어요. 서버 연결 후 다시 동기화가 필요합니다.`,
      );
    } finally {
      expenseCreateInFlightRef.current = false;
      setSavingExpense(false);
    }
  };

  const updateSalaryVariableExpense = useCallback(
    async (item: VariableExpenseRow): Promise<void> => {
      if (
        item.source !== "server" ||
        updatingVariableExpenseId !== null ||
        variableExpenseActionInFlightRef.current !== null
      )
        return;
      const amount = parseKrwInputAmount(expenseDraft);
      if (amount === null) {
        setToast("수정할 지출 금액을 0보다 큰 KRW 정수로 먼저 입력해 주세요.");
        return;
      }

      try {
        variableExpenseActionInFlightRef.current = `update:${item.id}`;
        setUpdatingVariableExpenseId(item.id);
        const updated = await budgetApi.updateVariableExpense(item.id, {
          amountMinor: amount,
          memo: "mobile salary home correction",
          title: item.name,
        });
        setServerVariableExpenses((current) =>
          current.map((expenseItem) =>
            expenseItem.expenseId === updated.expenseId ? updated : expenseItem,
          ),
        );
        setExpenseDraft("");
        void refreshServerBudgetSnapshot({ clearLocalPreview: true });
        setToast(
          `${item.name} 지출을 ${formatMoney(updated.netAmountMinor)}원으로 수정했어요.`,
        );
      } catch {
        setToast(
          "지출 수정이 서버에 반영되지 않았어요. 연결을 확인한 뒤 다시 시도해 주세요.",
        );
      } finally {
        variableExpenseActionInFlightRef.current = null;
        setUpdatingVariableExpenseId(null);
      }
    },
    [
      budgetApi,
      expenseDraft,
      refreshServerBudgetSnapshot,
      updatingVariableExpenseId,
    ],
  );

  const deleteSalaryVariableExpense = useCallback(
    async (item: VariableExpenseRow): Promise<void> => {
      if (
        item.source !== "server" ||
        deletingVariableExpenseId !== null ||
        variableExpenseActionInFlightRef.current !== null
      )
        return;

      try {
        variableExpenseActionInFlightRef.current = `delete:${item.id}`;
        setDeletingVariableExpenseId(item.id);
        await budgetApi.deleteVariableExpense(item.id, {
          reason: "mobile salary home user deleted variable expense",
        });
        setServerVariableExpenses((current) =>
          current.filter((expenseItem) => expenseItem.expenseId !== item.id),
        );
        void refreshServerBudgetSnapshot({ clearLocalPreview: true });
        setToast(`${item.name} 지출을 삭제했어요.`);
      } catch {
        setToast(
          "지출 삭제가 서버에 반영되지 않았어요. 연결을 확인한 뒤 다시 시도해 주세요.",
        );
      } finally {
        variableExpenseActionInFlightRef.current = null;
        setDeletingVariableExpenseId(null);
      }
    },
    [budgetApi, deletingVariableExpenseId, refreshServerBudgetSnapshot],
  );

  const paySalaryFixedExpense = useCallback(
    async (item: PlanCommitmentRow): Promise<void> => {
      if (payingFixedExpenseInFlightRef.current !== null) return;

      try {
        payingFixedExpenseInFlightRef.current = item.id;
        setPayingFixedExpenseId(item.id);
        const paid = await salaryPlanCommitmentsApi.recordFixedExpensePayment(
          item.id,
          {
            amountMinor: item.amountMinor,
            idempotencyKey: `mobile-fixed-payment-${item.id}-${Date.now()}`,
            memo: "mobile salary home fixed expense payment",
            paidAt: new Date().toISOString(),
          },
        );
        setSalaryFixedExpenses((current) =>
          current.map((expenseItem) =>
            expenseItem.id === paid.id ? paid : expenseItem,
          ),
        );
        setToast(
          `${paid.title} ${formatMoney(paid.amountMinor)}원 납부를 서버 기준으로 기록했어요.`,
        );
      } catch {
        setToast(
          "고정지출 납부를 서버에 기록하지 못했어요. 네트워크 확인 후 다시 시도해 주세요.",
        );
      } finally {
        payingFixedExpenseInFlightRef.current = null;
        setPayingFixedExpenseId(null);
      }
    },
    [salaryPlanCommitmentsApi],
  );

  const metrics: readonly MoneyMetric[] = [
    { label: "수령금액", value: "2,700,000원" },
    { label: "지출금액", value: `${formatMoney(preview.monthlyExpense)}원` },
    {
      label: "이번 달 납치금액",
      value: `${formatMoney(preview.monthHijack)}원`,
    },
    { label: "다음 급여일 D-day", value: "D-14" },
  ];

  return (
    <AppScreen title="SALARY HIJACKING" subtitle="급여">
      <View style={prioritizeDailyBudget ? styles.webCaptureHidden : undefined}>
        <MoneyHeroCard
          label="이번 달 내가 지켜낸 돈"
          value="5,780,000원"
          description="지난달보다 +420,000원 더 지켰어요"
        />
        <MetricGrid metrics={metrics} />
      </View>
      <SectionCard nativeID="daily-budget">
        <View style={styles.between}>
          <View>
            <Text style={styles.sectionTitle}>오늘 쓸 수 있는 돈</Text>
            <Text
              accessibilityLabel={`오늘 남은 예산 ${remaining}원`}
              style={[styles.money, remaining < 0 ? styles.dangerText : null]}
            >
              남은 {formatMoney(remaining)}원
            </Text>
          </View>
          <StatusPill
            label={remaining < 0 ? "예산 초과" : "안전"}
            danger={remaining < 0}
          />
        </View>
        <ProgressBar
          value={Math.min(100, (used / dailyLimit) * 100)}
          danger={remaining < 0}
        />
        <Text style={styles.bodyText}>
          설정 {formatMoney(dailyLimit)}원 · 사용 {formatMoney(used)}원{" "}
          {remaining < 0
            ? " · 초과 금액은 빨간색과 문구로 함께 안내합니다."
            : ""}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel="지출 추가 제목"
            accessibilityState={{ disabled: salaryHomeAmountPending }}
            editable={!salaryHomeAmountPending}
            maxLength={40}
            onChangeText={setSanitizedExpenseTitleDraft}
            onSubmitEditing={handleAddExpense}
            placeholder="예: 점심"
            placeholderTextColor={theme.color.text.disabled}
            returnKeyType="next"
            style={styles.input}
            value={expenseTitleDraft}
          />
          <TextInput
            accessibilityLabel="지출 추가 금액"
            accessibilityState={{ disabled: salaryHomeAmountPending }}
            editable={!salaryHomeAmountPending}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={12}
            onChangeText={setSanitizedExpenseDraft}
            onSubmitEditing={handleAddExpense}
            placeholder="예: 5000"
            placeholderTextColor={theme.color.text.disabled}
            returnKeyType="done"
            style={styles.input}
            value={expenseDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: salaryHomeExpenseSubmitDisabled }}
            disabled={salaryHomeExpenseSubmitDisabled}
            onPress={handleAddExpense}
            style={[
              styles.primaryButton,
              salaryHomeExpenseSubmitDisabled ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {savingExpense ? "저장 중..." : "지출 추가하기"}
            </Text>
          </Pressable>
          <TextInput
            accessibilityLabel="오늘 예산 저장 금액"
            accessibilityState={{ disabled: savingDailyBudget }}
            editable={!savingDailyBudget}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={12}
            onChangeText={setSanitizedDailyBudgetDraft}
            onSubmitEditing={() => {
              void saveSalaryDailyBudget();
            }}
            placeholder="예: 20000"
            placeholderTextColor={theme.color.text.disabled}
            returnKeyType="done"
            style={styles.input}
            value={dailyBudgetDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: salaryHomeDailyBudgetSubmitDisabled,
            }}
            disabled={salaryHomeDailyBudgetSubmitDisabled}
            onPress={() => {
              void saveSalaryDailyBudget();
            }}
            style={[
              styles.primaryButton,
              salaryHomeDailyBudgetSubmitDisabled ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {savingDailyBudget ? "예산 저장중" : "오늘 예산 저장"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.attachmentRow}>
          <SmallButton
            label={
              uploadingExpenseReceipt
                ? "영수증 서버 업로드 중"
                : uploadedExpenseReceipt
                  ? `영수증 연결됨 · ${uploadedExpenseReceipt.fileName}`
                  : "영수증 첨부"
            }
            onPress={pickVariableExpenseReceipt}
          />
          {uploadedExpenseReceipt ? (
            <SmallButton
              label="영수증 제거"
              onPress={() => setUploadedExpenseReceipt(null)}
            />
          ) : null}
        </View>
      </SectionCard>
      <Toast message={toast} />
      <SectionCard>
        <Text style={styles.sectionTitle}>오늘 빠져나간 고정지출</Text>
        {salaryFixedExpenseRows.length > 0
          ? salaryFixedExpenseRows.map((item) => {
              const fixedExpensePaymentStatusLabel =
                payingFixedExpenseId === item.id ? "납부 기록 중" : undefined;
              return (
                <ListRow
                  disabled={payingFixedExpenseId !== null}
                  key={item.id}
                  icon={appIcons.subscription}
                  title={item.title}
                  meta={`${formatMoney(item.amountMinor)}원 · ${
                    item.lastPaidAt ? "납부 완료" : "탭해서 납부 완료"
                  } · ${item.meta}${
                    payingFixedExpenseId === item.id ? " · 서버 기록 중" : ""
                  }`}
                  onPress={() => {
                    void paySalaryFixedExpense(item);
                  }}
                  trailing={
                    fixedExpensePaymentStatusLabel ? (
                      <StatusPill label={fixedExpensePaymentStatusLabel} />
                    ) : undefined
                  }
                />
              );
            })
          : fixedExpenses.map((item) => (
              <ListRow
                key={item.name}
                icon={appIcons.subscription}
                title={item.name}
                meta={`${item.amount} · ${item.status}`}
              />
            ))}
      </SectionCard>
      <AdSlot />
      <SectionCard>
        <Text style={styles.sectionTitle}>오늘 쓴 돈</Text>
        {serverVariableExpenseRows.length > 0 ? (
          serverVariableExpenseRows.map((item) => (
            <VariableExpenseActionRow
              key={item.id}
              deleting={deletingVariableExpenseId === item.id}
              item={item}
              onDelete={() => {
                void deleteSalaryVariableExpense(item);
              }}
              onUpdate={() => {
                void updateSalaryVariableExpense(item);
              }}
              updating={updatingVariableExpenseId === item.id}
            />
          ))
        ) : variableExpensesHydrated ? (
          <Text style={styles.bodyText}>
            오늘 서버에 기록된 변동지출이 아직 없어요.
          </Text>
        ) : (
          allVariableExpenses.map((item) => (
            <ListRow
              key={item.id}
              icon={item.icon}
              title={item.name}
              meta={`${formatMoney(item.amount)}원`}
            />
          ))
        )}
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

function variableExpenseRowFromServer(
  item: VariableExpenseRecord,
): VariableExpenseRow {
  return {
    amount: item.netAmountMinor,
    category: item.category,
    icon: appIcons.expense,
    id: item.expenseId,
    name: item.title,
    paymentMethod: item.paymentMethod,
    source: "server",
    spentAt: item.spentAt,
  };
}

function VariableExpenseActionRow({
  deleting,
  item,
  onDelete,
  onUpdate,
  updating,
}: Readonly<{
  deleting: boolean;
  item: VariableExpenseRow;
  onDelete: () => void;
  onUpdate: () => void;
  updating: boolean;
}>): React.ReactElement {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listIcon}>{item.icon}</Text>
      <View style={styles.flex}>
        <Text style={styles.listTitle}>{item.name}</Text>
        <Text style={styles.listMeta}>
          {formatMoney(item.amount)}원 · 서버 기준 {item.category} ·{" "}
          {item.paymentMethod}
        </Text>
      </View>
      <SmallButton
        disabled={updating}
        label={updating ? "수정중" : "수정"}
        onPress={onUpdate}
      />
      <SmallButton
        disabled={deleting}
        label={deleting ? "삭제중" : "삭제"}
        onPress={onDelete}
      />
    </View>
  );
}

function SavingsGoalActionRow({
  deleting,
  depositing,
  item,
  onDelete,
  onDeposit,
  onUpdate,
  serverEnabled,
  updating,
}: Readonly<{
  deleting: boolean;
  depositing: boolean;
  item: PlanCommitmentRow;
  onDelete: () => void;
  onDeposit: () => void;
  onUpdate: () => void;
  serverEnabled: boolean;
  updating: boolean;
}>): React.ReactElement {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listIcon}>{appIcons.saving}</Text>
      <View style={styles.flex}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listMeta}>
          {formatMoney(item.amountMinor)}원 · 현재{" "}
          {formatMoney(item.currentAmountMinor ?? 0)}원 · {item.meta}
        </Text>
      </View>
      {serverEnabled ? (
        <>
          <SmallButton
            disabled={updating}
            label={updating ? "수정중" : "수정"}
            onPress={onUpdate}
          />
          <SmallButton
            disabled={depositing}
            label={depositing ? "납입중" : "납입"}
            onPress={onDeposit}
          />
          <SmallButton
            disabled={deleting}
            label={deleting ? "삭제중" : "삭제"}
            onPress={onDelete}
          />
        </>
      ) : null}
    </View>
  );
}

function fixedExpenseRowFromServer(
  item: PlanFixedExpenseCommitment,
): PlanCommitmentRow {
  return {
    amountMinor: item.amountMinor,
    id: item.id,
    lastPaidAt: item.lastPaidAt,
    meta: `${item.dueLabel} · 서버 기준 ${item.status}`,
    paidTotalMinor: item.paidTotalMinor,
    title: item.title,
  };
}

function savingsGoalRowFromServer(
  item: PlanSavingsGoalCommitment,
): PlanCommitmentRow {
  return {
    amountMinor: item.fixedSaveAmountMinor,
    currentAmountMinor: item.currentAmountMinor,
    id: item.id,
    meta: `목표 ${formatMoney(item.targetAmountMinor)}원 · 서버 기준 ${item.status}`,
    title: item.title,
  };
}

function PlanScreen(): React.ReactElement {
  const payrollApi = useMemo(() => createMobilePayrollApi(), []);
  const planCommitmentsApi = useMemo(
    () => createMobilePlanCommitmentsApi(),
    [],
  );
  const [salary, setSalary] = useState("2700000");
  const [expense, setExpense] = useState("773000");
  const [target, setTarget] = useState("2200000");
  const [serverPayrollPlan, setServerPayrollPlan] =
    useState<PayrollPlanSnapshot | null>(null);
  const [serverPayrollCalculation, setServerPayrollCalculation] =
    useState<PayrollCalculation | null>(null);
  const [serverFixedExpenses, setServerFixedExpenses] = useState<
    readonly PlanFixedExpenseCommitment[]
  >([]);
  const [serverSavingsGoals, setServerSavingsGoals] = useState<
    readonly PlanSavingsGoalCommitment[]
  >([]);
  const [planCommitmentsHydrated, setPlanCommitmentsHydrated] = useState(false);
  const [planToast, setPlanToast] = useState(
    "서버 급여 계획이 없으면 로컬 미리보기로 계산해요.",
  );
  const [recalculatingPlan, setRecalculatingPlan] = useState(false);
  const [savingPayrollPlan, setSavingPayrollPlan] = useState(false);
  const payrollPlanSaveInFlightRef = useRef(false);
  const [planFixedExpenseTitle, setPlanFixedExpenseTitle] = useState("");
  const [planFixedExpenseAmount, setPlanFixedExpenseAmount] = useState("");
  const [planSavingsGoalTitle, setPlanSavingsGoalTitle] = useState("");
  const [planSavingsGoalAmount, setPlanSavingsGoalAmount] = useState("");
  const [savingPlanCommitment, setSavingPlanCommitment] = useState(false);
  const planCommitmentSaveInFlightRef = useRef<"fixed" | "savings" | null>(
    null,
  );
  const [deletingPlanCommitmentId, setDeletingPlanCommitmentId] = useState<
    string | null
  >(null);
  const planCommitmentDeleteInFlightRef = useRef<string | null>(null);
  const [updatingPlanCommitmentId, setUpdatingPlanCommitmentId] = useState<
    string | null
  >(null);
  const planCommitmentUpdateInFlightRef = useRef<string | null>(null);
  const [depositingSavingsGoalId, setDepositingSavingsGoalId] = useState<
    string | null
  >(null);
  const planSavingsDepositInFlightRef = useRef<string | null>(null);

  const applyServerPayrollPlan = useCallback(
    (nextPlan: PayrollPlanSnapshot): void => {
      setServerPayrollPlan(nextPlan);
      setServerPayrollCalculation(nextPlan.calculation);
      setSalary(String(nextPlan.payrollAmountMinor));
      setExpense(String(nextPlan.fixedExpenseTotalMinor));
      setTarget(String(nextPlan.fixedSavingsTotalMinor));
      setPlanToast("서버 급여 계획을 불러왔어요.");
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const currentPlanPromise = payrollApi.getCurrent();
    void currentPlanPromise
      .then((nextPlan) => {
        if (cancelled || !nextPlan) return;
        applyServerPayrollPlan(nextPlan);
      })
      .catch(() => {
        if (!cancelled) setPlanToast("서버 연결 전 로컬 미리보기로 계산해요.");
      });

    return () => {
      cancelled = true;
    };
  }, [applyServerPayrollPlan, payrollApi]);

  useEffect(() => {
    let cancelled = false;
    const commitmentsPromise = planCommitmentsApi.getCommitments();
    void commitmentsPromise
      .then((commitments) => {
        if (cancelled) return;
        setServerFixedExpenses(commitments.fixedExpenses);
        setServerSavingsGoals(commitments.savingsGoals);
        setPlanCommitmentsHydrated(true);
        setExpense(String(commitments.fixedExpenseTotalMinor));
        setTarget(String(commitments.fixedSavingsTotalMinor));
        setPlanToast("서버 고정지출과 고정저축을 계획에 반영했어요.");
      })
      .catch(() => {
        if (!cancelled) {
          setServerFixedExpenses([]);
          setServerSavingsGoals([]);
          setPlanCommitmentsHydrated(false);
          setPlanToast("서버 계획 상세 연결 전 미리보기 목록으로 표시해요.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [planCommitmentsApi]);

  const refreshServerPayrollCalculation =
    useCallback(async (): Promise<void> => {
      const payrollAmountMinor = nonNegative(salary);
      if (payrollAmountMinor <= 0) {
        setServerPayrollCalculation(null);
        setPlanToast("급여는 0보다 큰 KRW 정수로 입력해 주세요.");
        return;
      }

      try {
        setRecalculatingPlan(true);
        const result = await payrollApi.recalculate({
          alreadySpentAmountMinor: 0,
          carryOverAmountMinor: serverPayrollPlan?.carryOverAmountMinor ?? 0,
          emergencyBufferMinor: serverPayrollPlan?.emergencyBufferMinor ?? 0,
          fixedExpenseTotalMinor: nonNegative(expense),
          fixedSavingsTotalMinor: nonNegative(target),
          overwritePlan: false,
          payrollAmountMinor,
          periodEndDate: serverPayrollPlan?.periodEndDate ?? "2026-07-31",
          periodStartDate: serverPayrollPlan?.periodStartDate ?? "2026-07-01",
          planId: serverPayrollPlan?.planId ?? null,
          reason: "mobile plan preview",
          variableExpenseReserveMinor:
            serverPayrollPlan?.variableExpenseReserveMinor ?? 0,
        });
        setServerPayrollCalculation(result.calculation);
        if (result.updatedPlan) applyServerPayrollPlan(result.updatedPlan);
        setPlanToast("서버 기준으로 급여 계획을 다시 계산했어요.");
      } catch {
        setServerPayrollCalculation(null);
        setPlanToast("서버 재계산 전 로컬 미리보기로 계산해요.");
      } finally {
        setRecalculatingPlan(false);
      }
    }, [
      applyServerPayrollPlan,
      expense,
      payrollApi,
      salary,
      serverPayrollPlan,
      target,
    ]);

  const saveServerPayrollPlan = useCallback(async (): Promise<void> => {
    if (payrollPlanSaveInFlightRef.current) return;
    const payrollAmountMinor = nonNegative(salary);
    const fixedExpenseTotalMinor = nonNegative(expense);
    const fixedSavingsTotalMinor = nonNegative(target);
    if (payrollAmountMinor <= 0) {
      setPlanToast("급여를 0보다 큰 KRW 정수로 입력해 주세요.");
      return;
    }

    try {
      payrollPlanSaveInFlightRef.current = true;
      setSavingPayrollPlan(true);
      const saved = await payrollApi.savePlan({
        carryOverAmountMinor: serverPayrollPlan?.carryOverAmountMinor ?? 0,
        emergencyBufferMinor: serverPayrollPlan?.emergencyBufferMinor ?? 0,
        firstPayrollDate: serverPayrollPlan?.firstPayrollDate ?? "2026-07-25",
        fixedExpenseTotalMinor,
        fixedSavingsTotalMinor,
        incomeType: serverPayrollPlan?.incomeType ?? "NET",
        memo: serverPayrollPlan?.memo ?? "mobile plan save",
        payday: serverPayrollPlan?.payday ?? 25,
        payrollAmountMinor,
        payrollCycle: serverPayrollPlan?.payrollCycle ?? "MONTHLY",
        periodEndDate: serverPayrollPlan?.periodEndDate ?? "2026-07-31",
        periodStartDate: serverPayrollPlan?.periodStartDate ?? "2026-07-01",
        planId: serverPayrollPlan?.planId ?? null,
        reservePolicy: serverPayrollPlan?.reservePolicy ?? "ZERO_BASE",
        title: serverPayrollPlan?.title ?? "모바일 급여 계획",
        variableExpenseReserveMinor:
          serverPayrollPlan?.variableExpenseReserveMinor ?? 0,
      });
      applyServerPayrollPlan(saved);
      setPlanToast(
        "급여 계획을 서버 권위 기준으로 저장했어요. rawFinancialDataExposed=false",
      );
    } catch {
      setPlanToast("급여 계획 저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      payrollPlanSaveInFlightRef.current = false;
      setSavingPayrollPlan(false);
    }
  }, [
    applyServerPayrollPlan,
    expense,
    payrollApi,
    salary,
    serverPayrollPlan,
    target,
  ]);

  const setSanitizedPlanFixedExpenseAmount = useCallback((value: string) => {
    const next = sanitizeKrwIntegerInput(value);
    if (next !== null) setPlanFixedExpenseAmount(next);
  }, []);

  const setSanitizedPlanSavingsGoalAmount = useCallback((value: string) => {
    const next = sanitizeKrwIntegerInput(value);
    if (next !== null) setPlanSavingsGoalAmount(next);
  }, []);
  const planFixedExpenseDraftReady =
    planFixedExpenseTitle.trim().length > 0 &&
    parseKrwInputAmount(planFixedExpenseAmount) !== null;
  const planSavingsGoalDraftReady =
    planSavingsGoalTitle.trim().length > 0 &&
    parseKrwInputAmount(planSavingsGoalAmount) !== null;
  const planFixedExpenseSubmitDisabled =
    savingPlanCommitment || !planFixedExpenseDraftReady;
  const planSavingsGoalSubmitDisabled =
    savingPlanCommitment || !planSavingsGoalDraftReady;

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshServerPayrollCalculation();
    }, 400);

    return () => clearTimeout(timer);
  }, [refreshServerPayrollCalculation]);

  const submitPlanFixedExpense = useCallback(async (): Promise<void> => {
    if (planCommitmentSaveInFlightRef.current !== null) return;
    const amountMinor = nonNegative(planFixedExpenseAmount);
    const title = planFixedExpenseTitle.trim();
    if (!title || amountMinor <= 0) {
      setPlanToast("고정지출 이름과 1원 이상 KRW 정수 금액을 입력해 주세요.");
      return;
    }
    try {
      planCommitmentSaveInFlightRef.current = "fixed";
      setSavingPlanCommitment(true);
      const created = await planCommitmentsApi.createFixedExpense({
        amountMinor,
        category: "SUBSCRIPTION",
        paymentDay: 25,
        title,
      });
      setServerFixedExpenses((current) => [created, ...current]);
      setExpense((current) =>
        String(nonNegative(current) + created.amountMinor),
      );
      setPlanFixedExpenseTitle("");
      setPlanFixedExpenseAmount("");
      setPlanToast("서버에 고정지출 계획을 저장했어요.");
    } catch {
      setPlanToast(
        "고정지출 계획을 서버에 저장하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      planCommitmentSaveInFlightRef.current = null;
      setSavingPlanCommitment(false);
    }
  }, [planCommitmentsApi, planFixedExpenseAmount, planFixedExpenseTitle]);

  const submitPlanSavingsGoal = useCallback(async (): Promise<void> => {
    if (planCommitmentSaveInFlightRef.current !== null) return;
    const fixedSaveAmountMinor = nonNegative(planSavingsGoalAmount);
    const title = planSavingsGoalTitle.trim();
    if (!title || fixedSaveAmountMinor <= 0) {
      setPlanToast("고정저축 이름과 1원 이상 KRW 정수 금액을 입력해 주세요.");
      return;
    }
    try {
      planCommitmentSaveInFlightRef.current = "savings";
      setSavingPlanCommitment(true);
      const created = await planCommitmentsApi.createSavingsGoal({
        fixedSaveAmountMinor,
        goalType: "CUSTOM",
        targetAmountMinor: Math.max(fixedSaveAmountMinor, nonNegative(target)),
        title,
      });
      setServerSavingsGoals((current) => [created, ...current]);
      setTarget((current) =>
        String(nonNegative(current) + created.fixedSaveAmountMinor),
      );
      setPlanSavingsGoalTitle("");
      setPlanSavingsGoalAmount("");
      setPlanToast("서버에 고정저축 목표를 저장했어요.");
    } catch {
      setPlanToast(
        "고정저축 목표를 서버에 저장하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      planCommitmentSaveInFlightRef.current = null;
      setSavingPlanCommitment(false);
    }
  }, [planCommitmentsApi, planSavingsGoalAmount, planSavingsGoalTitle, target]);

  const deletePlanFixedExpense = useCallback(
    async (expenseId: string): Promise<void> => {
      if (
        !planCommitmentsHydrated ||
        planCommitmentDeleteInFlightRef.current !== null
      )
        return;
      planCommitmentDeleteInFlightRef.current = expenseId;
      setDeletingPlanCommitmentId(expenseId);
      setPlanToast("고정지출을 서버에서 삭제하는 중이에요.");
      try {
        const deleted = await planCommitmentsApi.deleteFixedExpense(expenseId);
        setServerFixedExpenses((current) => {
          const next = current.filter((item) => item.id !== deleted.id);
          setExpense(
            String(next.reduce((sum, item) => sum + item.amountMinor, 0)),
          );
          return next;
        });
        setPlanToast(
          "고정지출을 삭제했어요. serverAuthority=true · rawFinancialDataExposed=false",
        );
      } catch {
        setPlanToast("고정지출 삭제에 실패했어요. 다시 시도해 주세요.");
      } finally {
        planCommitmentDeleteInFlightRef.current = null;
        setDeletingPlanCommitmentId(null);
      }
    },
    [planCommitmentsApi, planCommitmentsHydrated],
  );

  const deletePlanSavingsGoal = useCallback(
    async (goalId: string): Promise<void> => {
      if (
        !planCommitmentsHydrated ||
        planCommitmentDeleteInFlightRef.current !== null
      )
        return;
      planCommitmentDeleteInFlightRef.current = goalId;
      setDeletingPlanCommitmentId(goalId);
      setPlanToast("고정저축 목표를 서버에서 삭제하는 중이에요.");
      try {
        const deleted = await planCommitmentsApi.deleteSavingsGoal(goalId);
        setServerSavingsGoals((current) => {
          const next = current.filter((item) => item.id !== deleted.id);
          setTarget(
            String(
              next.reduce((sum, item) => sum + item.fixedSaveAmountMinor, 0),
            ),
          );
          return next;
        });
        setPlanToast(
          "고정저축 목표를 삭제했어요. serverAuthority=true · rawFinancialDataExposed=false",
        );
      } catch {
        setPlanToast("고정저축 목표 삭제에 실패했어요. 다시 시도해 주세요.");
      } finally {
        planCommitmentDeleteInFlightRef.current = null;
        setDeletingPlanCommitmentId(null);
      }
    },
    [planCommitmentsApi, planCommitmentsHydrated],
  );

  const updatePlanFixedExpense = useCallback(
    async (item: PlanCommitmentRow): Promise<void> => {
      if (
        !planCommitmentsHydrated ||
        planCommitmentUpdateInFlightRef.current !== null
      )
        return;
      const amountMinor =
        nonNegative(planFixedExpenseAmount) || item.amountMinor;
      const title = planFixedExpenseTitle.trim() || item.title;
      if (!title || amountMinor <= 0) {
        setPlanToast("수정할 고정지출 이름과 KRW 정수 금액을 확인해 주세요.");
        return;
      }

      planCommitmentUpdateInFlightRef.current = `fixed:${item.id}`;
      setUpdatingPlanCommitmentId(item.id);
      setPlanToast("고정지출을 서버 기준으로 수정하는 중이에요.");
      try {
        const updated = await planCommitmentsApi.updateFixedExpense(item.id, {
          amountMinor,
          category: "SUBSCRIPTION",
          paymentDay: 25,
          title,
        });
        setServerFixedExpenses((current) => {
          const next = current.map((expenseItem) =>
            expenseItem.id === updated.id ? updated : expenseItem,
          );
          setExpense(
            String(
              next.reduce(
                (sum, expenseItem) => sum + expenseItem.amountMinor,
                0,
              ),
            ),
          );
          return next;
        });
        setPlanToast(
          `${updated.title} 고정지출을 서버 기준으로 수정했어요. rawFinancialDataExposed=false`,
        );
      } catch {
        setPlanToast("고정지출 수정에 실패했어요. 다시 시도해 주세요.");
      } finally {
        planCommitmentUpdateInFlightRef.current = null;
        setUpdatingPlanCommitmentId(null);
      }
    },
    [
      planCommitmentsApi,
      planCommitmentsHydrated,
      planFixedExpenseAmount,
      planFixedExpenseTitle,
    ],
  );

  const updatePlanSavingsGoal = useCallback(
    async (item: PlanCommitmentRow): Promise<void> => {
      if (
        !planCommitmentsHydrated ||
        planCommitmentUpdateInFlightRef.current !== null
      )
        return;
      const fixedSaveAmountMinor =
        nonNegative(planSavingsGoalAmount) || item.amountMinor;
      const currentAmountMinor = item.currentAmountMinor ?? 0;
      const title = planSavingsGoalTitle.trim() || item.title;
      const targetAmountMinor = Math.max(
        fixedSaveAmountMinor,
        currentAmountMinor,
        nonNegative(target),
      );
      if (!title || fixedSaveAmountMinor <= 0) {
        setPlanToast("수정할 고정저축 이름과 KRW 정수 금액을 확인해 주세요.");
        return;
      }

      planCommitmentUpdateInFlightRef.current = `savings:${item.id}`;
      setUpdatingPlanCommitmentId(item.id);
      setPlanToast("고정저축 목표를 서버 기준으로 수정하는 중이에요.");
      try {
        const updated = await planCommitmentsApi.updateSavingsGoal(item.id, {
          fixedSaveAmountMinor,
          goalType: "CUSTOM",
          targetAmountMinor,
          title,
        });
        setServerSavingsGoals((current) => {
          const next = current.map((goal) =>
            goal.id === updated.id ? updated : goal,
          );
          setTarget(
            String(
              next.reduce((sum, goal) => sum + goal.fixedSaveAmountMinor, 0),
            ),
          );
          return next;
        });
        setPlanToast(
          `${updated.title} 저축 목표를 서버 기준으로 수정했어요. rawFinancialDataExposed=false`,
        );
      } catch {
        setPlanToast("고정저축 목표 수정에 실패했어요. 다시 시도해 주세요.");
      } finally {
        planCommitmentUpdateInFlightRef.current = null;
        setUpdatingPlanCommitmentId(null);
      }
    },
    [
      planCommitmentsApi,
      planCommitmentsHydrated,
      planSavingsGoalAmount,
      planSavingsGoalTitle,
      target,
    ],
  );

  const recordPlanSavingsDeposit = useCallback(
    async (item: PlanCommitmentRow): Promise<void> => {
      if (
        !planCommitmentsHydrated ||
        planSavingsDepositInFlightRef.current !== null
      )
        return;
      planSavingsDepositInFlightRef.current = item.id;
      setDepositingSavingsGoalId(item.id);
      setPlanToast("고정저축 납입을 서버에 기록하는 중이에요.");
      try {
        const deposited = await planCommitmentsApi.recordSavingsDeposit(
          item.id,
          {
            amountMinor: item.amountMinor,
            idempotencyKey: `mobile-savings-deposit-${item.id}-${Date.now()}`,
            memo: "mobile plan savings deposit",
            occurredAt: new Date().toISOString(),
          },
        );
        setServerSavingsGoals((current) =>
          current.map((goal) => (goal.id === deposited.id ? deposited : goal)),
        );
        setPlanToast(
          `${deposited.title} ${formatMoney(item.amountMinor)}원 납입을 서버 기준으로 기록했어요.`,
        );
      } catch {
        setPlanToast("고정저축 납입 기록에 실패했어요. 다시 시도해 주세요.");
      } finally {
        planSavingsDepositInFlightRef.current = null;
        setDepositingSavingsGoalId(null);
      }
    },
    [planCommitmentsApi, planCommitmentsHydrated],
  );

  const localExpectedHijack = Math.max(
    0,
    nonNegative(salary) - nonNegative(expense),
  );
  const expectedHijack =
    serverPayrollCalculation?.availableForDailyBudgetMinor ??
    localExpectedHijack;
  const achievement = Math.min(
    100,
    Math.round((expectedHijack / Math.max(1, nonNegative(target))) * 100),
  );
  const fixedExpenseRows = planCommitmentsHydrated
    ? serverFixedExpenses.map(fixedExpenseRowFromServer)
    : fallbackPlanFixedExpenseRows;
  const savingsRows = planCommitmentsHydrated
    ? serverSavingsGoals.map(savingsGoalRowFromServer)
    : fallbackPlanSavingsRows;
  const livingBudgetPreview =
    serverPayrollCalculation?.recommendedDailyBudgetMinor ??
    Math.max(
      0,
      Math.round(
        (nonNegative(salary) - nonNegative(expense) - nonNegative(target)) / 31,
      ),
    );

  return (
    <AppScreen title="계획" subtitle="급여 흐름을 먼저 분리해요">
      <SectionCard>
        <View style={styles.between}>
          <View>
            <Text style={styles.sectionTitle}>목표 달성률</Text>
            <Text style={styles.money}>{achievement}%</Text>
          </View>
          <StatusPill label={recalculatingPlan ? "재계산" : "서버 기준"} />
        </View>
        <ProgressBar value={achievement} />
        <Text style={styles.bodyText}>
          예상 납치금액 {formatMoney(expectedHijack)}원 · 목표{" "}
          {formatMoney(nonNegative(target))}원
        </Text>
      </SectionCard>
      <Toast message={planToast} />
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>급여 계획 저장</Text>
          <StatusPill label="serverAuthority" />
        </View>
        <Text style={styles.bodyText}>
          급여, 고정지출, 고정저축 입력값을 서버 기준 계획으로 저장하고 응답
          계산값으로 화면을 다시 맞춥니다.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: savingPayrollPlan }}
          disabled={savingPayrollPlan}
          onPress={() => {
            void saveServerPayrollPlan();
          }}
          style={[
            styles.primaryButton,
            savingPayrollPlan ? styles.disabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {savingPayrollPlan ? "저장 중" : "급여 계획 서버 저장"}
          </Text>
        </Pressable>
      </SectionCard>
      <PlanInputCard
        label="급여 계획"
        disabled={savingPayrollPlan}
        value={salary}
        onChange={setSalary}
        helper="급여일 매월 25일 · KRW 정수만 입력"
      />
      <PlanInputCard
        label="고정지출"
        disabled={savingPayrollPlan}
        value={expense}
        onChange={setExpense}
        helper="월세, 구독, 통신비를 먼저 분리"
      />
      <SectionCard>
        <Text style={styles.sectionTitle}>서버 고정지출 목록</Text>
        {fixedExpenseRows.map((item) => (
          <ListRow
            key={item.id}
            icon={appIcons.subscription}
            title={item.title}
            trailing={
              planCommitmentsHydrated ? (
                <>
                  <SmallButton
                    label={
                      updatingPlanCommitmentId === item.id ? "수정중" : "수정"
                    }
                    onPress={() => {
                      void updatePlanFixedExpense(item);
                    }}
                  />
                  <SmallButton
                    label={
                      deletingPlanCommitmentId === item.id ? "삭제중" : "삭제"
                    }
                    onPress={() => {
                      void deletePlanFixedExpense(item.id);
                    }}
                  />
                </>
              ) : null
            }
            meta={`${formatMoney(item.amountMinor)}원 · ${item.meta}${
              deletingPlanCommitmentId === item.id ? " · 삭제 중" : ""
            }`}
            {...(planCommitmentsHydrated
              ? {
                  onPress: () => {
                    void deletePlanFixedExpense(item.id);
                  },
                }
              : {})}
          />
        ))}
        <TextInput
          accessibilityLabel="고정지출 이름"
          accessibilityState={{ disabled: savingPlanCommitment }}
          editable={!savingPlanCommitment}
          onChangeText={setPlanFixedExpenseTitle}
          placeholder="예: OTT 구독"
          placeholderTextColor={theme.color.text.disabled}
          style={styles.input}
          value={planFixedExpenseTitle}
        />
        <TextInput
          accessibilityLabel="고정지출 금액"
          accessibilityState={{ disabled: savingPlanCommitment }}
          editable={!savingPlanCommitment}
          keyboardType="numeric"
          onChangeText={setSanitizedPlanFixedExpenseAmount}
          placeholder="예: 19000"
          placeholderTextColor={theme.color.text.disabled}
          style={styles.input}
          value={planFixedExpenseAmount}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: planFixedExpenseSubmitDisabled }}
          disabled={planFixedExpenseSubmitDisabled}
          onPress={() => {
            void submitPlanFixedExpense();
          }}
          style={[
            styles.primaryButton,
            planFixedExpenseSubmitDisabled ? styles.disabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {savingPlanCommitment ? "저장 중" : "고정지출 서버 저장"}
          </Text>
        </Pressable>
      </SectionCard>
      <PlanSummaryCard
        title="고정저축"
        amount={`${formatMoney(nonNegative(target))}원`}
        meta={`${savingsRows.length}개 목표 · 급여 직후 자동 분리`}
      />
      <SectionCard>
        <Text style={styles.sectionTitle}>서버 고정저축 목표</Text>
        {savingsRows.map((item) => (
          <SavingsGoalActionRow
            key={item.id}
            deleting={deletingPlanCommitmentId === item.id}
            depositing={depositingSavingsGoalId === item.id}
            item={item}
            onDelete={() => {
              void deletePlanSavingsGoal(item.id);
            }}
            onDeposit={() => {
              void recordPlanSavingsDeposit(item);
            }}
            onUpdate={() => {
              void updatePlanSavingsGoal(item);
            }}
            serverEnabled={planCommitmentsHydrated}
            updating={updatingPlanCommitmentId === item.id}
          />
        ))}
        <TextInput
          accessibilityLabel="고정저축 목표 이름"
          accessibilityState={{ disabled: savingPlanCommitment }}
          editable={!savingPlanCommitment}
          onChangeText={setPlanSavingsGoalTitle}
          placeholder="예: 비상금"
          placeholderTextColor={theme.color.text.disabled}
          style={styles.input}
          value={planSavingsGoalTitle}
        />
        <TextInput
          accessibilityLabel="고정저축 금액"
          accessibilityState={{ disabled: savingPlanCommitment }}
          editable={!savingPlanCommitment}
          keyboardType="numeric"
          onChangeText={setSanitizedPlanSavingsGoalAmount}
          placeholder="예: 80000"
          placeholderTextColor={theme.color.text.disabled}
          style={styles.input}
          value={planSavingsGoalAmount}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: planSavingsGoalSubmitDisabled }}
          disabled={planSavingsGoalSubmitDisabled}
          onPress={() => {
            void submitPlanSavingsGoal();
          }}
          style={[
            styles.primaryButton,
            planSavingsGoalSubmitDisabled ? styles.disabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {savingPlanCommitment ? "저장 중" : "고정저축 서버 저장"}
          </Text>
        </Pressable>
      </SectionCard>
      <PlanSummaryCard
        title="생활비"
        amount={`${formatMoney(livingBudgetPreview)}원`}
        meta="서버 추천 일일예산 기준 · 초과 시 알림"
      />
      <PlanInputCard
        label="목표금액"
        disabled={savingPayrollPlan}
        value={target}
        onChange={setTarget}
        helper="목표 달성률 재계산 기준"
      />
      <GuardBox />
    </AppScreen>
  );
}

function growthTaskIcon(task: GrowthTask): string {
  if (task.taskType === "READING") return appIcons.reading;
  if (task.taskType === "EXERCISE") return appIcons.health;
  if (task.taskType === "STUDY") return appIcons.english;
  if (task.taskType === "CONTENT") return appIcons.news;
  if (task.taskType === "EXPENSE_LOG" || task.taskType === "BUDGET_REVIEW") {
    return appIcons.budget;
  }
  return appIcons.level;
}

function missionFromGrowthTask(task: GrowthTask): Mission {
  const completed =
    task.status === "COMPLETED" || task.progressCount >= task.targetCount;
  return {
    id: task.taskId,
    icon: growthTaskIcon(task),
    title: task.title,
    description:
      task.note ??
      `${task.progressCount}/${task.targetCount}회 진행 · 서버 권위 LV UP 과제`,
    routeLabel: completed ? "완료됨" : `${task.expReward} XP 받기`,
    xp: task.expReward,
    progressCount: task.progressCount,
    serverTaskId: task.taskId,
    status: completed ? "COMPLETED" : "ACTIVE",
    targetCount: task.targetCount,
  };
}

function completedMissionIds(items: readonly Mission[]): ReadonlySet<string> {
  return new Set(
    items
      .filter(
        (item) =>
          item.status === "COMPLETED" || item.progressCount >= item.targetCount,
      )
      .map((item) => item.id),
  );
}

export function CleanFintechMyLevelProgressScreen(): React.ReactElement {
  const myLevelRouter = useRouter();
  const myLevelGrowthApi = useMemo(() => createMobileGrowthApi(), []);
  const [myLevelDashboard, setMyLevelDashboard] =
    useState<GrowthDashboard | null>(null);
  const [myLevelActiveTasks, setMyLevelActiveTasks] = useState<
    readonly GrowthTask[]
  >([]);
  const [myLevelCompletedTasks, setMyLevelCompletedTasks] = useState<
    readonly GrowthTask[]
  >([]);
  const [myLevelSubmittingMissionId, setMyLevelSubmittingMissionId] = useState<
    string | null
  >(null);
  const myLevelMissionCompletionInFlightRef = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState(
    "내 레벨업 현황을 서버 기준으로 확인하는 중이에요.",
  );

  const refreshMyLevelProgress = useCallback(async (): Promise<void> => {
    try {
      const [dashboard, activeTasks, completedTasks] = await Promise.all([
        myLevelGrowthApi.getDashboard(),
        myLevelGrowthApi.listTasks({ page: 1, pageSize: 20, status: "ACTIVE" }),
        myLevelGrowthApi.listTasks({
          page: 1,
          pageSize: 20,
          status: "COMPLETED",
        }),
      ]);
      setMyLevelDashboard(dashboard);
      setMyLevelActiveTasks(activeTasks.items);
      setMyLevelCompletedTasks(completedTasks.items);
      setToast(
        `${dashboard.todaySuggestion} · serverAuthority=true · rawFinancialDataExposed=false`,
      );
    } catch {
      setMyLevelDashboard(null);
      setMyLevelActiveTasks([]);
      setMyLevelCompletedTasks([]);
      setToast("서버 연결 전까지 안전한 기본 레벨업 현황을 보여드려요.");
    }
  }, [myLevelGrowthApi]);

  useEffect(() => {
    void refreshMyLevelProgress();
  }, [refreshMyLevelProgress]);

  const activeMissions = myLevelActiveTasks.length
    ? myLevelActiveTasks.map(missionFromGrowthTask)
    : fallbackMissions.filter((mission) => mission.status !== "COMPLETED");
  const completedMissions = myLevelCompletedTasks.length
    ? myLevelCompletedTasks.map(missionFromGrowthTask)
    : fallbackMissions.filter((mission) => mission.status === "COMPLETED");
  const totalExp = myLevelDashboard?.profile.totalExp ?? 380;
  const level = myLevelDashboard?.profile.level ?? 18;
  const progress = Math.min(100, (totalExp / 999) * 100);
  const closeMyLevelProgress = useCallback(() => {
    if (myLevelSubmittingMissionId !== null) return;
    myLevelRouter.replace("/profile");
  }, [myLevelRouter, myLevelSubmittingMissionId]);

  const completeMyLevelTask = useCallback(
    (mission: Mission): void => {
      if (!mission.serverTaskId) {
        myLevelRouter.push("/level");
        return;
      }
      if (myLevelMissionCompletionInFlightRef.current.has(mission.id)) return;
      myLevelMissionCompletionInFlightRef.current.add(mission.id);
      setMyLevelSubmittingMissionId(mission.id);
      const occurredAt = new Date().toISOString();
      setToast("레벨업 진행을 서버에 기록하는 중이에요.");
      void myLevelGrowthApi
        .recordTaskProgress(mission.serverTaskId, {
          idempotencyKey: `mobile-my-level-${mission.serverTaskId}-${occurredAt}`,
          note: "mobile MY level progress complete",
          occurredAt,
          progressCount: Math.max(
            1,
            mission.targetCount - mission.progressCount,
          ),
        })
        .then((result) => {
          setMyLevelDashboard((current) =>
            current
              ? {
                  ...current,
                  completedTaskCount:
                    result.task.status === "COMPLETED"
                      ? current.completedTaskCount + 1
                      : current.completedTaskCount,
                  profile: {
                    ...current.profile,
                    totalExp: current.profile.totalExp + result.expDelta,
                  },
                }
              : current,
          );
          setMyLevelActiveTasks((current) =>
            current.map((task) =>
              task.taskId === result.task.taskId ? result.task : task,
            ),
          );
          setToast(
            `${mission.title} 서버 기록 완료 · +${result.expDelta} XP · rawFinancialDataExposed=false`,
          );
        })
        .catch(() => {
          setToast("서버 기록에 실패했어요. LV 탭에서 다시 시도해 주세요.");
        })
        .finally(() => {
          myLevelMissionCompletionInFlightRef.current.delete(mission.id);
          setMyLevelSubmittingMissionId(null);
        });
    },
    [myLevelGrowthApi, myLevelRouter],
  );

  return (
    <AppScreen title="내 레벨업 관리" subtitle="MY 성장 루틴">
      <SectionCard>
        <View style={styles.between}>
          <View>
            <Text style={styles.sectionTitle}>현재 레벨</Text>
            <Text style={styles.money}>{formatMoney(level)}Lv</Text>
          </View>
          <StatusPill
            label={`완료 ${completedMissions.length} · 진행 ${activeMissions.length}`}
          />
        </View>
        <ProgressBar value={progress} />
        <Text style={styles.bodyText}>
          {formatMoney(totalExp)} / 999 XP · serverAuthority=true
        </Text>
      </SectionCard>
      <Toast message={toast} />
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>진행 중인 미션</Text>
          <StatusPill label={`${activeMissions.length} active`} />
        </View>
        {activeMissions.map((mission) => {
          const missionPending = myLevelSubmittingMissionId === mission.id;
          return (
            <ListRow
              disabled={missionPending}
              icon={mission.icon}
              key={mission.id}
              meta={`${mission.progressCount}/${mission.targetCount} · ${mission.xp} XP · rawFinancialDataExposed=false`}
              onPress={() => completeMyLevelTask(mission)}
              title={mission.title}
            />
          );
        })}
      </SectionCard>
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>완료한 미션</Text>
          <StatusPill label={`${completedMissions.length} completed`} />
        </View>
        {completedMissions.map((mission) => (
          <ListRow
            disabled={myLevelSubmittingMissionId !== null}
            icon={mission.icon}
            key={mission.id}
            meta={`${mission.xp} XP · adsFinancialTargetingUsed=false`}
            onPress={() => myLevelRouter.push("/level")}
            title={mission.title}
          />
        ))}
      </SectionCard>
      <SmallButton
        disabled={myLevelSubmittingMissionId !== null}
        label="MY로 돌아가기"
        onPress={closeMyLevelProgress}
      />
      <GuardBox />
    </AppScreen>
  );
}

function LevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const levelRouter = useRouter();
  const [serverGrowthDashboard, setServerGrowthDashboard] =
    useState<GrowthDashboard | null>(null);
  const [serverGrowthTasks, setServerGrowthTasks] = useState<
    readonly GrowthTask[]
  >([]);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() =>
    completedMissionIds(fallbackMissions),
  );
  const [submittingMissionId, setSubmittingMissionId] = useState<string | null>(
    null,
  );
  const growthMissionCompletionInFlightRef = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState("서버 LV UP 데이터를 확인하는 중이에요.");

  useEffect(() => {
    let mounted = true;

    async function hydrateGrowth(): Promise<void> {
      try {
        const [dashboard, taskResult] = await Promise.all([
          growthApi.getDashboard(),
          growthApi.listTasks({ page: 1, pageSize: 20, status: "ACTIVE" }),
        ]);
        if (!mounted) return;
        setServerGrowthDashboard(dashboard);
        setServerGrowthTasks(taskResult.items);
        const nextMissions = taskResult.items.length
          ? taskResult.items.map(missionFromGrowthTask)
          : fallbackMissions;
        setCompleted(completedMissionIds(nextMissions));
        setToast(
          taskResult.items.length
            ? dashboard.todaySuggestion
            : "서버 과제가 아직 없어 기본 루틴 미션을 보여줘요.",
        );
      } catch {
        if (!mounted) return;
        setServerGrowthDashboard(null);
        setServerGrowthTasks([]);
        setCompleted(completedMissionIds(fallbackMissions));
        setToast("서버 연결 전이라 앱 기준 루틴 미션을 보여줘요.");
      }
    }

    void hydrateGrowth();

    return () => {
      mounted = false;
    };
  }, [growthApi]);

  const visibleMissions = serverGrowthTasks.length
    ? serverGrowthTasks.map(missionFromGrowthTask)
    : fallbackMissions;
  const xp =
    serverGrowthDashboard?.profile.totalExp ?? 380 + completed.size * 25;
  const level = serverGrowthDashboard?.profile.level ?? 18;
  const progress = Math.min(100, (xp / 999) * 100);

  const markMissionCompleteAfterServerAck = useCallback((missionId: string) => {
    setCompleted((current) => new Set(current).add(missionId));
  }, []);

  const revertMissionCompletionOnServerFailure = useCallback(
    (missionId: string) => {
      setCompleted((current) => {
        const next = new Set(current);
        next.delete(missionId);
        return next;
      });
    },
    [],
  );

  const completeMission = useCallback(
    (mission: Mission, done: boolean) => {
      if (done) return;
      if (!mission.serverTaskId) {
        markMissionCompleteAfterServerAck(mission.id);
        setToast(`${mission.title} 완료! +${mission.xp} XP가 반영됐어요.`);
        return;
      }

      if (growthMissionCompletionInFlightRef.current.has(mission.id)) return;
      growthMissionCompletionInFlightRef.current.add(mission.id);
      setSubmittingMissionId(mission.id);

      const occurredAt = new Date().toISOString();
      void growthApi
        .recordTaskProgress(mission.serverTaskId, {
          idempotencyKey: `mobile-${mission.serverTaskId}-${occurredAt}`,
          note: "mobile LV UP mission complete",
          occurredAt,
          progressCount: Math.max(
            1,
            mission.targetCount - mission.progressCount,
          ),
        })
        .then((result) => {
          setServerGrowthTasks((current) =>
            current.map((task) =>
              task.taskId === result.task.taskId ? result.task : task,
            ),
          );
          setServerGrowthDashboard((current) =>
            current
              ? {
                  ...current,
                  profile: {
                    ...current.profile,
                    totalExp: current.profile.totalExp + result.expDelta,
                  },
                  completedTaskCount:
                    result.task.status === "COMPLETED"
                      ? current.completedTaskCount + 1
                      : current.completedTaskCount,
                }
              : current,
          );
          markMissionCompleteAfterServerAck(mission.id);
          setToast(
            `${mission.title} 서버 기록 완료! +${result.expDelta} XP가 반영됐어요.`,
          );
        })
        .catch(() => {
          revertMissionCompletionOnServerFailure(mission.id);
          setToast("서버 기록에 실패했어요. 미션 완료는 반영하지 않았어요.");
        })
        .finally(() => {
          growthMissionCompletionInFlightRef.current.delete(mission.id);
          setSubmittingMissionId(null);
        });
    },
    [
      growthApi,
      markMissionCompleteAfterServerAck,
      revertMissionCompletionOnServerFailure,
    ],
  );
  const openMission = useCallback(
    (mission: Mission, done: boolean) => {
      const route = levelMissionRouteMap[mission.id];
      if (route) {
        levelRouter.push(route);
        return;
      }
      completeMission(mission, done);
    },
    [completeMission, levelRouter],
  );

  return (
    <AppScreen title="LV UP" subtitle="매일 조금씩 성장하는 루틴">
      <SectionCard>
        <View style={styles.between}>
          <View>
            <Text style={styles.sectionTitle}>현재 레벨</Text>
            <Text style={styles.money}>{formatMoney(level)}Lv</Text>
          </View>
          <StatusPill
            label={`완료 ${completed.size}/${visibleMissions.length}`}
          />
        </View>
        <ProgressBar value={progress} />
        <Text style={styles.bodyText}>
          {formatMoney(xp)} / 999 XP · 금융 앱 안의 가벼운 성장 루틴
        </Text>
      </SectionCard>
      <Toast message={toast} />
      <View style={styles.gridTwo}>
        {visibleMissions.map((mission) => {
          const done =
            completed.has(mission.id) || mission.status === "COMPLETED";
          const missionPending = submittingMissionId === mission.id;
          return (
            <Pressable
              accessibilityState={{ disabled: missionPending }}
              accessibilityRole="button"
              disabled={missionPending}
              key={mission.id}
              onPress={() => openMission(mission, done)}
              style={[
                styles.card,
                done ? styles.softGreen : null,
                missionPending ? styles.disabled : null,
              ]}
            >
              <Text style={styles.cardIcon}>{mission.icon}</Text>
              <Text style={styles.cardTitle}>{mission.title}</Text>
              <Text style={styles.cardText}>{mission.description}</Text>
              <Text style={styles.linkText}>
                {done ? "완료됨" : mission.routeLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <AdSlot />
      <GuardBox />
    </AppScreen>
  );
}

function notificationIcon(type: NotificationType): string {
  if (type === "BUDGET_WARNING" || type === "BUDGET_EXCEEDED") {
    return appIcons.warning;
  }
  if (type === "SAVINGS_GOAL") return "🏅";
  if (type === "LEVEL_UP") return appIcons.level;
  if (type === "COMMUNITY") return appIcons.community;
  if (type === "CONTENT_RECOMMENDATION") return appIcons.reading;
  if (type === "SECURITY") return "🔒";
  if (type === "AD_PARTNER") return appIcons.reward;
  return appIcons.notification;
}

function toNotificationScreenItem(
  item: NotificationItem,
): NotificationScreenItem {
  return {
    deeplink: item.deeplink,
    id: item.notificationId,
    icon: notificationIcon(item.type),
    title: item.title,
    message: item.message,
    type: item.type,
    priority: item.priority,
    isMandatory: item.isMandatory === true,
    status: item.status,
  };
}

function safeNotificationRoute(
  item: NotificationScreenItem,
): NotificationRoute {
  const deeplink = item.deeplink?.trim();
  if (!deeplink) return notificationRouteByType[item.type];

  const aliasedRoute = notificationRouteAliases[deeplink];
  if (aliasedRoute) return aliasedRoute;

  const communityPostMatch = /^\/community\/([A-Za-z0-9_-]{1,80})$/u.exec(
    deeplink,
  );
  if (communityPostMatch?.[1]) {
    return `/community/${communityPostMatch[1]}`;
  }

  return notificationRouteByType[item.type];
}

function safeProfileActivityRoute(
  activity: ProfileActivity,
): ProfileActivityRoute {
  const route = activity.route.trim();
  const aliasedRoute = profileActivityRouteAliases[route];
  if (aliasedRoute) return aliasedRoute;

  const communityPostMatch = /^\/community\/([A-Za-z0-9_-]{1,80})$/u.exec(
    route,
  );
  if (communityPostMatch?.[1]) {
    return `/community/${communityPostMatch[1]}`;
  }

  return activity.kind === "SECURITY" ? "/profile" : "/notifications";
}

function isImportantNotification(item: NotificationScreenItem): boolean {
  return (
    item.priority === "HIGH" ||
    item.priority === "URGENT" ||
    item.type === "PAYDAY" ||
    item.type === "PAYMENT_DUE" ||
    item.type === "BUDGET_WARNING" ||
    item.type === "BUDGET_EXCEEDED" ||
    item.type === "SAVINGS_GOAL" ||
    item.type === "SECURITY" ||
    item.type === "NOTICE"
  );
}

function formatCommunityCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.trunc(value)));
}

function toCommunityScreenPost(
  post: CommunityPost,
): CommunityScreenPost | null {
  if (
    post.rawFinancialDataExposed ||
    post.rawPersonalDataExposed ||
    post.adsFinancialTargetingUsed
  ) {
    return null;
  }
  return {
    board: communityBoardLabelMap[post.boardType],
    id: post.id,
    stats: `좋아요 ${formatCommunityCount(post.likeCount)} · 댓글 ${formatCommunityCount(
      post.commentCount,
    )} · 북마크 ${formatCommunityCount(post.bookmarkCount)} · 공유 ${formatCommunityCount(
      post.shareCount ?? 0,
    )}`,
    summary: post.bodyPreview,
    thumb: communityBoardThumbMap[post.boardType],
    title: post.title,
  };
}

function toCommunityScreenPosts(
  serverCommunityFeed: CommunityFeedPage | null,
): readonly CommunityScreenPost[] {
  if (!serverCommunityFeed) return [];
  return serverCommunityFeed.items.flatMap((post) => {
    const screenPost = toCommunityScreenPost(post);
    return screenPost ? [screenPost] : [];
  });
}

function popularCommunityPosts(
  posts: readonly CommunityScreenPost[],
): readonly CommunityScreenPost[] {
  return [...posts]
    .sort((first, second) => second.stats.localeCompare(first.stats, "ko-KR"))
    .slice(0, 3);
}

function notificationPlatform(): NotificationDeviceRegistrationRequest["platform"] {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
}

function createLocalDeviceId(): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `salary-hijacking-${Platform.OS}-${randomPart}`;
}

async function readOrCreateNotificationDeviceId(): Promise<string> {
  const store = await import("expo-secure-store");
  const cached = await store.getItemAsync(NOTIFICATION_DEVICE_ID_KEY);
  if (cached && /^[A-Za-z0-9_.:-]+$/u.test(cached)) return cached;

  const nextDeviceId = createLocalDeviceId();
  await store.setItemAsync(NOTIFICATION_DEVICE_ID_KEY, nextDeviceId);
  return nextDeviceId;
}

async function createNativeNotificationRegistrationRequest(): Promise<NotificationDeviceRegistrationRequest> {
  const [{ default: Constants }, Notifications] = await Promise.all([
    import("expo-constants"),
    import("expo-notifications"),
  ]);
  const currentPermission = await Notifications.getPermissionsAsync();
  const finalPermission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();
  if (!finalPermission.granted) {
    throw new Error("NOTIFICATION_PERMISSION_DENIED");
  }

  const easProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const tokenResult =
    typeof easProjectId === "string" && easProjectId.trim()
      ? await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })
      : await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenResult.data.trim();
  if (!pushToken) throw new Error("NOTIFICATION_PUSH_TOKEN_UNAVAILABLE");

  return {
    appVersion: Constants.expoConfig?.version ?? null,
    deviceId: await readOrCreateNotificationDeviceId(),
    locale: "ko-KR",
    platform: notificationPlatform(),
    pushToken,
  };
}

function NotificationsScreen(): React.ReactElement {
  const notificationsApi = useMemo(() => createMobileNotificationsApi(), []);
  const notificationRouter = useRouter();
  const [serverNotifications, setServerNotifications] = useState<
    readonly NotificationScreenItem[]
  >(fallbackNotifications);
  const [unreadCount, setUnreadCount] = useState(
    fallbackNotifications.filter((item) => item.status === "UNREAD").length,
  );
  const [serverNotificationPreferences, setServerNotificationPreferences] =
    useState<NotificationPreferences | null>(null);
  const [notificationPreferencePending, setNotificationPreferencePending] =
    useState(false);
  const notificationPreferenceInFlightRef = useRef(false);
  const [notificationReadAllPending, setNotificationReadAllPending] =
    useState(false);
  const notificationMarkReadInFlightRef = useRef<Set<string>>(new Set());
  const notificationReadAllInFlightRef = useRef(false);
  const [serverNotificationDevices, setServerNotificationDevices] = useState<
    readonly NotificationDevice[]
  >([]);
  const [notificationDeviceActionPending, setNotificationDeviceActionPending] =
    useState<"register" | "revoke" | null>(null);
  const notificationDeviceActionInFlightRef = useRef<
    "register" | "revoke" | null
  >(null);
  const [notificationRowActionPendingId, setNotificationRowActionPendingId] =
    useState<string | null>(null);
  const notificationRowActionInFlightRef = useRef<string | null>(null);
  const [syncLabel, setSyncLabel] = useState("서버 알림을 확인하는 중이에요.");

  useEffect(() => {
    let mounted = true;

    async function hydrateNotifications(): Promise<void> {
      try {
        const [listResult, unreadResult, preferencesResult, devicesResult] =
          await Promise.all([
            notificationsApi.list({ page: 1, pageSize: 20 }),
            notificationsApi.unreadCount(),
            notificationsApi.getPreferences(),
            notificationsApi.listDevices(),
          ]);
        if (!mounted) return;

        const nextNotifications = listResult.items
          .filter(
            (item) => item.status !== "DELETED" && item.status !== "ARCHIVED",
          )
          .map(toNotificationScreenItem);
        setServerNotifications(
          nextNotifications.length ? nextNotifications : fallbackNotifications,
        );
        setUnreadCount(unreadResult.unreadCount);
        setServerNotificationPreferences(preferencesResult);
        setServerNotificationDevices(devicesResult);
        setSyncLabel("서버 알림 기준으로 동기화됐어요.");
      } catch {
        if (!mounted) return;
        setServerNotifications(fallbackNotifications);
        setServerNotificationPreferences(null);
        setServerNotificationDevices([]);
        setUnreadCount(
          fallbackNotifications.filter((item) => item.status === "UNREAD")
            .length,
        );
        setSyncLabel("서버 연결 전이라 앱 기준 예시 알림을 보여줘요.");
      }
    }

    void hydrateNotifications();

    return () => {
      mounted = false;
    };
  }, [notificationsApi]);

  const importantNotifications = serverNotifications.filter(
    isImportantNotification,
  );
  const routineNotifications = serverNotifications.filter(
    (item) => !isImportantNotification(item),
  );
  const activeNotificationDevices = serverNotificationDevices.filter(
    (device) => device.status === "ACTIVE",
  );
  const primaryNotificationDevice = activeNotificationDevices[0] ?? null;

  const restoreNotificationReadOnFailure = useCallback(
    (item: NotificationScreenItem) => {
      setServerNotifications((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? item : candidate,
        ),
      );
      if (item.status === "UNREAD") {
        setUnreadCount((current) => current + 1);
      }
    },
    [],
  );

  const markRead = useCallback(
    (item: NotificationScreenItem) => {
      if (item.status !== "UNREAD") return;
      if (notificationMarkReadInFlightRef.current.has(item.id)) return;
      notificationMarkReadInFlightRef.current.add(item.id);
      setServerNotifications((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, status: "READ" }
            : candidate,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      void notificationsApi
        .markRead(item.id)
        .finally(() => {
          notificationMarkReadInFlightRef.current.delete(item.id);
        })
        .catch(() => {
          restoreNotificationReadOnFailure(item);
          setSyncLabel("읽음 처리는 서버 연결 후 다시 확인해 주세요.");
        });
    },
    [notificationsApi, restoreNotificationReadOnFailure],
  );

  const openNotification = useCallback(
    (item: NotificationScreenItem) => {
      if (notificationRowActionPendingId !== null) return;
      markRead(item);
      const notificationRoute = safeNotificationRoute(item);
      notificationRouter.push(notificationRoute);
    },
    [markRead, notificationRouter, notificationRowActionPendingId],
  );

  const restoreAllNotificationsReadOnFailure = useCallback(
    (
      previousNotifications: readonly NotificationScreenItem[],
      previousUnreadCount: number,
    ) => {
      setServerNotifications([...previousNotifications]);
      setUnreadCount(previousUnreadCount);
    },
    [],
  );

  const markAllNotificationsRead = useCallback(() => {
    if (notificationReadAllInFlightRef.current || unreadCount <= 0) return;
    notificationReadAllInFlightRef.current = true;
    const previousNotifications = serverNotifications;
    const previousUnreadCount = unreadCount;
    setNotificationReadAllPending(true);
    setServerNotifications((current) =>
      current.map((item) => ({ ...item, status: "READ" })),
    );
    setUnreadCount(0);
    void notificationsApi
      .markAllRead()
      .then(({ markedReadCount }) => {
        setSyncLabel(
          `서버에 ${markedReadCount}개 알림 읽음 처리를 저장했어요.`,
        );
      })
      .catch(() => {
        restoreAllNotificationsReadOnFailure(
          previousNotifications,
          previousUnreadCount,
        );
        setSyncLabel(
          "전체 읽음 처리를 서버에 저장하지 못했어요. 다시 확인해 주세요.",
        );
      })
      .finally(() => {
        notificationReadAllInFlightRef.current = false;
        setNotificationReadAllPending(false);
      });
  }, [
    notificationsApi,
    restoreAllNotificationsReadOnFailure,
    serverNotifications,
    unreadCount,
  ]);

  const restoreNotificationOnFailure = useCallback(
    (item: NotificationScreenItem) => {
      setServerNotifications((current) =>
        current.some((candidate) => candidate.id === item.id)
          ? current
          : [item, ...current],
      );
    },
    [],
  );

  const restoreUnreadCountOnFailure = useCallback(
    (item: NotificationScreenItem) => {
      if (item.status === "UNREAD") {
        setUnreadCount((current) => current + 1);
      }
    },
    [],
  );

  const archiveNotification = useCallback(
    (item: NotificationScreenItem) => {
      if (notificationRowActionInFlightRef.current !== null) return;
      if (item.isMandatory) {
        setSyncLabel("필수 알림은 보관할 수 없어요.");
        return;
      }
      notificationRowActionInFlightRef.current = `archive:${item.id}`;
      setNotificationRowActionPendingId(`archive:${item.id}`);
      setServerNotifications((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      if (item.status === "UNREAD") {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      void notificationsApi
        .archive(item.id)
        .catch((error) => {
          restoreNotificationOnFailure(item);
          restoreUnreadCountOnFailure(item);
          throw error;
        })
        .then(() => {
          setSyncLabel("서버에 알림 보관을 저장했어요.");
        })
        .catch(() => {
          setSyncLabel(
            "알림 보관을 서버에 저장하지 못했어요. 다시 확인해 주세요.",
          );
        })
        .finally(() => {
          notificationRowActionInFlightRef.current = null;
          setNotificationRowActionPendingId(null);
        });
    },
    [
      notificationsApi,
      restoreNotificationOnFailure,
      restoreUnreadCountOnFailure,
    ],
  );

  const deleteNotification = useCallback(
    (item: NotificationScreenItem) => {
      if (notificationRowActionInFlightRef.current !== null) return;
      if (item.isMandatory) {
        setSyncLabel("필수 알림은 삭제할 수 없어요.");
        return;
      }
      notificationRowActionInFlightRef.current = `delete:${item.id}`;
      setNotificationRowActionPendingId(`delete:${item.id}`);
      setServerNotifications((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      if (item.status === "UNREAD") {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      void notificationsApi
        .delete(item.id)
        .catch((error) => {
          restoreNotificationOnFailure(item);
          restoreUnreadCountOnFailure(item);
          throw error;
        })
        .then(() => {
          setSyncLabel("서버에 알림 삭제를 저장했어요.");
        })
        .catch(() => {
          setSyncLabel(
            "알림 삭제를 서버에 저장하지 못했어요. 다시 확인해 주세요.",
          );
        })
        .finally(() => {
          notificationRowActionInFlightRef.current = null;
          setNotificationRowActionPendingId(null);
        });
    },
    [
      notificationsApi,
      restoreNotificationOnFailure,
      restoreUnreadCountOnFailure,
    ],
  );

  const updateNotificationPreference = useCallback(
    (preferencesRequest: NotificationPreferencesUpdateRequest) => {
      if (notificationPreferenceInFlightRef.current) return;
      const current = serverNotificationPreferences;
      if (!current) {
        setSyncLabel("서버 알림 설정을 먼저 불러와야 해요.");
        return;
      }
      const optimistic = { ...current, ...preferencesRequest };
      notificationPreferenceInFlightRef.current = true;
      setNotificationPreferencePending(true);
      setServerNotificationPreferences(optimistic);
      void notificationsApi
        .updatePreferences({
          ...preferencesRequest,
        })
        .then((updated) => {
          setServerNotificationPreferences(updated);
          setSyncLabel("서버에 알림 설정을 저장했어요.");
        })
        .catch(() => {
          setServerNotificationPreferences(current);
          setSyncLabel(
            "알림 설정을 서버에 저장하지 못했어요. 다시 확인해 주세요.",
          );
        })
        .finally(() => {
          notificationPreferenceInFlightRef.current = false;
          setNotificationPreferencePending(false);
        });
    },
    [notificationsApi, serverNotificationPreferences],
  );

  const registerNotificationDevice = useCallback(() => {
    if (notificationDeviceActionInFlightRef.current !== null) return;
    notificationDeviceActionInFlightRef.current = "register";
    setNotificationDeviceActionPending("register");
    setSyncLabel("푸시 기기 등록을 서버에 저장하고 있어요.");
    void createNativeNotificationRegistrationRequest()
      .then((registrationRequest) =>
        notificationsApi.registerDevice({
          appVersion: registrationRequest.appVersion ?? null,
          deviceId: registrationRequest.deviceId,
          locale: registrationRequest.locale ?? null,
          platform: registrationRequest.platform,
          pushToken: registrationRequest.pushToken,
        }),
      )
      .then((registeredDevice) => {
        setServerNotificationDevices((current) => [
          registeredDevice,
          ...current.filter(
            (device) => device.deviceId !== registeredDevice.deviceId,
          ),
        ]);
        setSyncLabel("서버에 푸시 기기 등록을 저장했어요.");
      })
      .catch(() => {
        setSyncLabel("푸시 권한, Expo 설정, 또는 서버 연결을 확인해 주세요.");
      })
      .finally(() => {
        notificationDeviceActionInFlightRef.current = null;
        setNotificationDeviceActionPending(null);
      });
  }, [notificationsApi]);

  const revokeNotificationDevice = useCallback(
    (deviceId: string) => {
      if (notificationDeviceActionInFlightRef.current !== null) return;
      notificationDeviceActionInFlightRef.current = "revoke";
      setNotificationDeviceActionPending("revoke");
      void notificationsApi
        .revokeDevice(deviceId)
        .then((revokedDevice) => {
          setServerNotificationDevices((current) =>
            current.map((device) =>
              device.deviceId === revokedDevice.deviceId
                ? revokedDevice
                : device,
            ),
          );
          setSyncLabel("서버에 푸시 기기 해제를 저장했어요.");
        })
        .catch(() => {
          setSyncLabel("푸시 기기 해제를 서버에 저장하지 못했어요.");
        })
        .finally(() => {
          notificationDeviceActionInFlightRef.current = null;
          setNotificationDeviceActionPending(null);
        });
    },
    [notificationsApi],
  );

  return (
    <AppScreen title="알림" subtitle="새로운 알림이 있어요">
      <Toast message={`${syncLabel} · 읽지 않은 알림 ${unreadCount}개`} />
      {serverNotificationPreferences ? (
        <SectionCard>
          <View style={styles.between}>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <StatusPill label={serverNotificationPreferences.timezone} />
          </View>
          <ToggleRow
            active={serverNotificationPreferences.pushEnabled}
            disabled={notificationPreferencePending}
            label="푸시 알림"
            onPress={() =>
              updateNotificationPreference({
                pushEnabled: !serverNotificationPreferences.pushEnabled,
              })
            }
          />
          <ToggleRow
            active={serverNotificationPreferences.contentRecommendationEnabled}
            disabled={notificationPreferencePending}
            label="LV UP 추천 알림"
            onPress={() =>
              updateNotificationPreference({
                contentRecommendationEnabled:
                  !serverNotificationPreferences.contentRecommendationEnabled,
              })
            }
          />
          <Text style={styles.listMeta}>
            Quiet {serverNotificationPreferences.quietHoursStart ?? "--:--"}-
            {serverNotificationPreferences.quietHoursEnd ?? "--:--"} · financial
            targeting off
          </Text>
        </SectionCard>
      ) : null}
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>푸시 기기</Text>
          <StatusPill label={`${activeNotificationDevices.length} active`} />
        </View>
        <Text style={styles.listMeta}>
          {primaryNotificationDevice
            ? `${primaryNotificationDevice.platform} · ${primaryNotificationDevice.pushTokenPreview ?? "hashOnly"} · pushTokenHashOnly=${String(primaryNotificationDevice.pushTokenHashOnly)}`
            : "기기 등록 전에는 원문 푸시 토큰을 보관하지 않아요."}
        </Text>
        <View style={styles.notificationActions}>
          <SmallButton
            disabled={notificationDeviceActionPending !== null}
            label={
              notificationDeviceActionPending === "register"
                ? "등록 중"
                : "기기 등록"
            }
            onPress={registerNotificationDevice}
          />
          {primaryNotificationDevice ? (
            <SmallButton
              disabled={notificationDeviceActionPending !== null}
              label={
                notificationDeviceActionPending === "revoke"
                  ? "해제 중"
                  : "기기 해제"
              }
              onPress={() =>
                revokeNotificationDevice(primaryNotificationDevice.deviceId)
              }
            />
          ) : null}
        </View>
      </SectionCard>
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>중요 알림</Text>
          <StatusPill label={`${unreadCount} unread`} />
        </View>
        <SmallButton
          disabled={notificationReadAllPending || unreadCount <= 0}
          label={notificationReadAllPending ? "읽음 처리 중" : "전체 읽음"}
          onPress={markAllNotificationsRead}
        />
        {importantNotifications.length ? (
          importantNotifications.map((item) => (
            <ListRow
              disabled={notificationRowActionPendingId !== null}
              icon={item.icon}
              key={item.id}
              meta={item.message}
              onPress={() => openNotification(item)}
              trailing={
                <View style={styles.notificationActions}>
                  <SmallButton
                    disabled={
                      notificationRowActionPendingId !== null ||
                      item.isMandatory
                    }
                    label={
                      item.isMandatory
                        ? "필수"
                        : notificationRowActionPendingId ===
                            `archive:${item.id}`
                          ? "Archiving"
                          : "Archive"
                    }
                    onPress={() => archiveNotification(item)}
                  />
                  <SmallButton
                    disabled={
                      notificationRowActionPendingId !== null ||
                      item.isMandatory
                    }
                    label={
                      item.isMandatory
                        ? "필수"
                        : notificationRowActionPendingId === `delete:${item.id}`
                          ? "Deleting"
                          : "Delete"
                    }
                    onPress={() => deleteNotification(item)}
                  />
                </View>
              }
              title={item.title}
              unread={item.status === "UNREAD"}
            />
          ))
        ) : (
          <ListRow
            icon={appIcons.success}
            meta="예산 초과, 보안, 목표 달성 같은 긴급 알림이 없습니다."
            title="중요 알림 없음"
          />
        )}
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>루틴 알림</Text>
        {routineNotifications.length ? (
          routineNotifications.map((item) => (
            <ListRow
              disabled={notificationRowActionPendingId !== null}
              icon={item.icon}
              key={item.id}
              meta={item.message}
              onPress={() => openNotification(item)}
              trailing={
                <View style={styles.notificationActions}>
                  <SmallButton
                    disabled={
                      notificationRowActionPendingId !== null ||
                      item.isMandatory
                    }
                    label={
                      item.isMandatory
                        ? "필수"
                        : notificationRowActionPendingId ===
                            `archive:${item.id}`
                          ? "Archiving"
                          : "Archive"
                    }
                    onPress={() => archiveNotification(item)}
                  />
                  <SmallButton
                    disabled={
                      notificationRowActionPendingId !== null ||
                      item.isMandatory
                    }
                    label={
                      item.isMandatory
                        ? "필수"
                        : notificationRowActionPendingId === `delete:${item.id}`
                          ? "Deleting"
                          : "Delete"
                    }
                    onPress={() => deleteNotification(item)}
                  />
                </View>
              }
              title={item.title}
              unread={item.status === "UNREAD"}
            />
          ))
        ) : (
          <ListRow
            icon={appIcons.notification}
            meta="오늘 확인할 독서, 뉴스, 영어, 건강 루틴 알림이 없습니다."
            title="루틴 알림 없음"
          />
        )}
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

function CommunityScreen(): React.ReactElement {
  const communityService = useMemo(() => createMobileCommunityService(), []);
  const communityRouter = useRouter();
  const [board, setBoard] = useState<CommunityBoard>("전체 게시판");
  const [serverCommunityFeed, setServerCommunityFeed] =
    useState<CommunityFeedPage | null>(null);
  const [communitySyncLabel, setCommunitySyncLabel] = useState(
    "서버 커뮤니티 피드를 확인하는 중이에요.",
  );
  const boards: readonly CommunityBoard[] = [
    "전체 게시판",
    "자유 게시판",
    "레벨업 인증",
    "취미 게시판",
  ];

  useEffect(() => {
    let mounted = true;

    async function hydrateCommunityFeed(): Promise<void> {
      try {
        const boardType = communityBoardApiMap[board];
        const response = await communityService.listPosts({
          ...(boardType ? { boardType } : {}),
          page: 1,
          pageSize: 20,
          sort: "LATEST",
        });
        const parsed = parseCommunityFeedPage(communityResponseData(response));
        if (!mounted) return;
        setServerCommunityFeed(parsed);
        setCommunitySyncLabel(
          `서버 커뮤니티 동기화 · ${formatCommunityCount(parsed.meta.total)}개 글`,
        );
      } catch {
        if (!mounted) return;
        setServerCommunityFeed(null);
        setCommunitySyncLabel(
          "서버 연결 전이라 기본 커뮤니티 예시를 보여드려요.",
        );
      }
    }

    void hydrateCommunityFeed();

    return () => {
      mounted = false;
    };
  }, [board, communityService]);

  const serverCommunityPosts = toCommunityScreenPosts(serverCommunityFeed);
  const fallbackFiltered =
    board === "전체 게시판"
      ? fallbackCommunityPosts
      : fallbackCommunityPosts.filter((post) => post.board === board);
  const visibleCommunityPosts = serverCommunityPosts.length
    ? serverCommunityPosts
    : fallbackFiltered;
  const visiblePopularPosts = popularCommunityPosts(
    serverCommunityPosts.length ? serverCommunityPosts : fallbackCommunityPosts,
  );
  const openCommunityWrite = useCallback(() => {
    communityRouter.push("/community/write");
  }, [communityRouter]);
  const openCommunityPost = useCallback(
    (post: CommunityScreenPost) => {
      communityRouter.push(`/community/${post.id}`);
    },
    [communityRouter],
  );

  return (
    <AppScreen title="커뮤니티" subtitle="가볍고 친근한 생활형 게시판">
      <PillRow
        items={boards}
        selected={board}
        onSelect={(next) => setBoard(next as CommunityBoard)}
      />
      <Toast message={communitySyncLabel} />
      <SectionCard>
        <Text style={styles.sectionTitle}>인기 게시글</Text>
        {visiblePopularPosts.map((post) => (
          <CommunityPostRow
            key={`popular-${post.id}`}
            onPress={() => openCommunityPost(post)}
            post={post}
          />
        ))}
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>{board}</Text>
        {visibleCommunityPosts.map((post) => (
          <CommunityPostRow
            key={`${board}-${post.id}`}
            onPress={() => openCommunityPost(post)}
            post={post}
          />
        ))}
      </SectionCard>
      <Pressable
        accessibilityRole="button"
        onPress={openCommunityWrite}
        style={styles.fab}
      >
        <Text style={styles.fabText}>글쓰기</Text>
      </Pressable>
      <GuardBox />
    </AppScreen>
  );
}

function ProfileScreen(): React.ReactElement {
  const profileApi = useMemo(() => createMobileProfileApi(), []);
  const profileAuthApi = useMemo(() => createMobileAuthApi(), []);
  const profileRouter = useRouter();
  const [serverProfileSnapshot, setServerProfileSnapshot] =
    useState<ProfileSnapshot | null>(null);
  const [profileActionPending, setProfileActionPending] = useState<
    "privacy-export" | "withdrawal" | "logout" | null
  >(null);
  const profileActionInFlightRef = useRef<
    "privacy-export" | "withdrawal" | "logout" | null
  >(null);
  const [profileToast, setProfileToast] = useState(
    "서버 MY 정보를 확인하는 중이에요.",
  );

  useEffect(() => {
    let mounted = true;

    async function hydrateProfile(): Promise<void> {
      try {
        const [snapshot, myPageSummary] = await Promise.all([
          profileApi.getProfile(),
          profileApi.getMyPageSummary().catch(() => null),
        ]);
        if (!mounted) return;
        const mergedSnapshot = mergeProfileSnapshotWithMyPageSummary(
          snapshot,
          myPageSummary,
        );
        setServerProfileSnapshot(mergedSnapshot);
        setProfileToast(
          `서버 MY 동기화 · 개인정보 보호율 ${snapshot.summary.privacyPassRate}`,
        );
      } catch {
        if (!mounted) return;
        setServerProfileSnapshot(null);
        setProfileToast("서버 연결 전이라 앱 기본 MY 정보를 보여줘요.");
      }
    }

    void hydrateProfile();

    return () => {
      mounted = false;
    };
  }, [profileApi]);

  const requestPrivacyExport = useCallback(() => {
    if (profileActionInFlightRef.current !== null) return;
    profileActionInFlightRef.current = "privacy-export";
    setProfileActionPending("privacy-export");
    setProfileToast("개인정보 내보내기 요청을 서버에 전달하는 중이에요.");
    void profileApi
      .requestPrivacyExport({ reason: "app-my-page" })
      .then((snapshot) => {
        setServerProfileSnapshot(snapshot);
        setProfileToast(
          `내보내기 요청 접수 · 상태 ${snapshot.privacy.exportStatus}`,
        );
      })
      .catch(() => {
        setProfileToast(
          "내보내기 요청을 처리하지 못했어요. 다시 시도해 주세요.",
        );
      })
      .finally(() => {
        profileActionInFlightRef.current = null;
        setProfileActionPending(null);
      });
  }, [profileApi]);

  const requestWithdrawal = useCallback(() => {
    if (profileActionInFlightRef.current !== null) return;
    profileActionInFlightRef.current = "withdrawal";
    setProfileActionPending("withdrawal");
    setProfileToast("탈퇴 요청을 서버에 전달하는 중이에요.");
    void profileApi
      .requestWithdrawalRequest({ reason: "app-my-page" })
      .then((snapshot) => {
        setServerProfileSnapshot(snapshot);
        setProfileToast(
          snapshot.privacy.withdrawalRequested
            ? "탈퇴 요청이 접수됐어요. 즉시 삭제가 아니라 운영 절차로 검토돼요."
            : "탈퇴 요청 상태를 서버에서 다시 확인했어요.",
        );
      })
      .catch(() => {
        setProfileToast("탈퇴 요청을 처리하지 못했어요. 다시 시도해 주세요.");
      })
      .finally(() => {
        profileActionInFlightRef.current = null;
        setProfileActionPending(null);
      });
  }, [profileApi]);

  const logoutSession = useCallback(() => {
    if (profileActionInFlightRef.current !== null) return;
    profileActionInFlightRef.current = "logout";
    setProfileActionPending("logout");
    setProfileToast("로그아웃을 서버에 요청하는 중이에요.");
    void profileAuthApi
      .logout()
      .then(() => {
        setServerProfileSnapshot(null);
        setProfileToast("로그아웃됐어요. 다시 로그인해 주세요.");
        profileRouter.replace("/(auth)/login");
      })
      .catch(() => {
        setProfileToast(
          "로그아웃을 완료하지 못했어요. 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => {
        profileActionInFlightRef.current = null;
        setProfileActionPending(null);
      });
  }, [profileAuthApi, profileRouter]);

  const openMyCommunityPosts = useCallback(() => {
    if (profileActionPending !== null) return;
    profileRouter.push("/profile/community");
  }, [profileActionPending, profileRouter]);

  const openMyLevelProgress = useCallback(() => {
    if (profileActionPending !== null) return;
    profileRouter.push("/profile/level");
  }, [profileActionPending, profileRouter]);

  const openSupportInquiry = useCallback(() => {
    if (profileActionPending !== null) return;
    profileRouter.push("/profile/support");
  }, [profileActionPending, profileRouter]);

  const openProfileNotices = useCallback(() => {
    if (profileActionPending !== null) return;
    profileRouter.push("/profile/notices");
  }, [profileActionPending, profileRouter]);

  const openProfileSettings = useCallback(() => {
    if (profileActionPending !== null) return;
    profileRouter.push("/profile/settings");
  }, [profileActionPending, profileRouter]);

  const openAccountSettings = useCallback(() => {
    if (profileActionPending !== null) return;
    profileRouter.push("/profile/account");
  }, [profileActionPending, profileRouter]);

  const profileSnapshot = serverProfileSnapshot ?? fallbackProfileSnapshot;
  const profileSyncLabel = serverProfileSnapshot
    ? "서버 MY 동기화"
    : "앱 기본 MY";
  const privacyTargetingLabel = profileSnapshot.privacy.financialDataForAds
    ? "차단 필요"
    : "사용 안 함";

  return (
    <AppScreen title="MY" subtitle="성과와 계정을 한곳에서 관리해요">
      <Toast message={profileToast} />
      <SectionCard>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profileSnapshot.user.avatarEmoji}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>
              {profileSnapshot.user.nickname}
            </Text>
            <Text style={styles.bodyText}>
              {profileSnapshot.user.title} ·{" "}
              {profileSnapshot.user.communityDisplayName} · {profileSyncLabel}
            </Text>
          </View>
        </View>
        <View style={styles.attachmentRow}>
          <SmallButton
            disabled={profileActionPending !== null}
            label="프로필 설정"
            onPress={openProfileSettings}
          />
          <SmallButton
            disabled={profileActionPending !== null}
            label="계정 설정"
            onPress={openAccountSettings}
          />
          <SmallButton
            disabled={profileActionPending !== null}
            label={
              profileActionPending === "privacy-export"
                ? "내보내기 요청 중"
                : "데이터 내보내기"
            }
            onPress={requestPrivacyExport}
          />
          <SmallButton
            disabled={profileActionPending !== null}
            label={
              profileActionPending === "withdrawal"
                ? "탈퇴 요청 중"
                : "탈퇴 요청"
            }
            onPress={requestWithdrawal}
          />
          <SmallButton
            disabled={profileActionPending !== null}
            label={
              profileActionPending === "logout" ? "로그아웃 중" : "로그아웃"
            }
            onPress={logoutSession}
          />
        </View>
      </SectionCard>
      <MetricGrid
        metrics={[
          {
            label: "누적 납치금액",
            value: `${formatMoney(profileSnapshot.summary.totalHijackSaved)}원`,
          },
          {
            label: "레벨업 현황",
            value: `${profileSnapshot.summary.currentLevel}Lv`,
          },
          {
            label: "자기관리 성과",
            value: `${profileSnapshot.summary.selfCareScore}점`,
          },
        ]}
      />
      <SectionCard>
        <Text style={styles.sectionTitle}>개인정보 보호</Text>
        <ListRow
          icon="🛡️"
          title="금융 데이터 광고 타겟팅"
          meta={`financialDataForAds=${String(
            profileSnapshot.privacy.financialDataForAds,
          )} · ${privacyTargetingLabel}`}
        />
        <ListRow
          icon="🔐"
          title="푸시 토큰 로그"
          meta={
            profileSnapshot.privacy.rawPushTokenLogging
              ? "차단 필요"
              : "원문 저장 안 함 · tokenHashOnly"
          }
        />
        <ListRow
          icon="📤"
          title="개인정보 내보내기"
          meta={`상태 ${profileSnapshot.privacy.exportStatus} · 보호율 ${profileSnapshot.summary.privacyPassRate}`}
        />
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>관리 메뉴</Text>
        <ListRow
          disabled={profileActionPending !== null}
          icon="📝"
          title="내 게시글 관리"
          meta={`${profileSnapshot.summary.communityPosts}개 글 · 댓글 ${profileSnapshot.summary.communityComments}개`}
          onPress={openMyCommunityPosts}
        />
        <ListRow
          disabled={profileActionPending !== null}
          icon={appIcons.level}
          title="내 레벨업 관리"
          meta={`미션 ${profileSnapshot.summary.completedGrowthTasks}개 · XP ${profileSnapshot.summary.levelXp}/${profileSnapshot.summary.nextLevelXp}`}
          onPress={openMyLevelProgress}
        />
        <ListRow
          disabled={profileActionPending !== null}
          icon="💬"
          meta="계정, 결제, 개인정보 문의"
          onPress={openSupportInquiry}
          title="1:1 문의"
        />
        <ListRow
          disabled={profileActionPending !== null}
          icon="📣"
          meta="서비스 안내와 이벤트"
          onPress={openProfileNotices}
          title="공지사항"
        />
      </SectionCard>
      <AdSlot />
      <GuardBox />
    </AppScreen>
  );
}

export function CleanFintechForgotPasswordScreen(): React.ReactElement {
  const forgotPasswordRouter = useRouter();
  const forgotPasswordAuthApi = useMemo(() => createMobileAuthApi(), []);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const forgotPasswordSubmitInFlightRef = useRef(false);
  const [toast, setToast] = useState(
    "가입한 이메일로 비밀번호 재설정 안내를 받을 수 있어요.",
  );
  const valid = email.trim().includes("@");

  const submitPasswordReset = useCallback(async () => {
    if (!valid || forgotPasswordSubmitInFlightRef.current) return;
    forgotPasswordSubmitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const result = await forgotPasswordAuthApi.requestPasswordReset({
        email,
      });
      if (result.accepted) {
        setToast(
          "비밀번호 재설정 요청을 서버에 접수했어요. 이메일 안내를 확인해 주세요.",
        );
      } else {
        setToast("요청 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setToast(
        "비밀번호 재설정 요청을 완료하지 못했어요. 이메일과 네트워크를 확인해 주세요.",
      );
    } finally {
      forgotPasswordSubmitInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [email, forgotPasswordAuthApi, valid]);

  const backToLogin = useCallback((): void => {
    if (submitting) return;
    forgotPasswordRouter.replace("/(auth)/login");
  }, [forgotPasswordRouter, submitting]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.centerContent]}
      >
        <SalaryLogo large />
        <Text style={styles.loginTitle}>비밀번호 찾기</Text>
        <Text style={styles.loginSubtitle}>
          서버 권위 인증으로 계정 복구 요청을 안전하게 보냅니다
        </Text>
        <Toast message={toast} />
        <SectionCard>
          <TextInput
            accessibilityLabel="비밀번호 재설정 이메일"
            autoCapitalize="none"
            accessibilityState={{ disabled: submitting }}
            editable={!submitting}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="가입 이메일"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={email}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !valid || submitting }}
            disabled={!valid || submitting}
            onPress={submitPasswordReset}
            style={[
              styles.primaryButton,
              !valid || submitting ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "요청 중" : "재설정 메일 받기"}
            </Text>
          </Pressable>
          <SmallButton
            disabled={submitting}
            label="로그인으로 돌아가기"
            onPress={backToLogin}
          />
        </SectionCard>
        <GuardBox />
      </ScrollView>
    </SafeAreaView>
  );
}

export function CleanFintechResetPasswordScreen({
  token,
}: Readonly<{ token: string }>): React.ReactElement {
  const resetPasswordRouter = useRouter();
  const resetPasswordAuthApi = useMemo(() => createMobileAuthApi(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resetPasswordSubmitInFlightRef = useRef(false);
  const missingResetToken = token.trim().length < 8;
  const [toast, setToast] = useState(
    missingResetToken
      ? "재설정 링크가 올바르지 않아요."
      : "새 비밀번호를 입력해 주세요.",
  );
  const valid =
    !missingResetToken &&
    isServerAuthPasswordCandidate(newPassword) &&
    newPassword === confirmPassword;

  const backToResetLogin = useCallback(() => {
    if (submitting) return;
    resetPasswordRouter.replace("/(auth)/login");
  }, [resetPasswordRouter, submitting]);

  const submitPasswordResetConfirm = useCallback(async () => {
    if (!valid || resetPasswordSubmitInFlightRef.current) return;
    resetPasswordSubmitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const result = await resetPasswordAuthApi.confirmPasswordReset({
        token,
        newPassword,
      });
      if (result.completed) {
        setToast("비밀번호가 서버에서 변경됐어요. 다시 로그인해 주세요.");
        resetPasswordRouter.replace("/(auth)/login");
      } else {
        setToast("변경 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setToast(
        "비밀번호 변경을 완료하지 못했어요. 링크와 입력값을 확인해 주세요.",
      );
    } finally {
      resetPasswordSubmitInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [newPassword, resetPasswordAuthApi, resetPasswordRouter, token, valid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.centerContent]}
      >
        <SalaryLogo large />
        <Text style={styles.loginTitle}>새 비밀번호 설정</Text>
        <Text style={styles.loginSubtitle}>
          재설정 토큰은 서버 확인에만 사용하고 앱에 저장하지 않습니다
        </Text>
        <Toast message={toast} />
        <SectionCard>
          {missingResetToken ? (
            <>
              <Text style={styles.sectionTitle}>
                재설정 링크가 올바르지 않아요.
              </Text>
              <Text style={styles.bodyText}>
                이메일의 최신 비밀번호 재설정 링크로 다시 열어 주세요.
              </Text>
              <SmallButton
                disabled={submitting}
                label="로그인으로 돌아가기"
                onPress={backToResetLogin}
              />
            </>
          ) : (
            <>
              <TextInput
                accessibilityLabel="새 비밀번호"
                accessibilityState={{ disabled: submitting }}
                editable={!submitting}
                onChangeText={setNewPassword}
                placeholder="새 비밀번호"
                placeholderTextColor={theme.color.text.disabled}
                secureTextEntry
                style={styles.input}
                value={newPassword}
              />
              <TextInput
                accessibilityLabel="새 비밀번호 확인"
                accessibilityState={{ disabled: submitting }}
                editable={!submitting}
                onChangeText={setConfirmPassword}
                placeholder="새 비밀번호 확인"
                placeholderTextColor={theme.color.text.disabled}
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
              <Text style={styles.listMeta}>
                {AUTH_PASSWORD_POLICY_MESSAGE}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !valid || submitting }}
                disabled={!valid || submitting}
                onPress={submitPasswordResetConfirm}
                style={[
                  styles.primaryButton,
                  !valid || submitting ? styles.disabled : null,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? "변경 중" : "비밀번호 변경"}
                </Text>
              </Pressable>
              <SmallButton
                disabled={submitting}
                label="로그인으로 돌아가기"
                onPress={backToResetLogin}
              />
            </>
          )}
        </SectionCard>
        <GuardBox />
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen(): React.ReactElement {
  const loginRouter = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loginSubmitInFlightRef = useRef(false);
  const socialLoginSubmitInFlightRef = useRef(false);
  const [toast, setToast] = useState(
    "서버 권위 인증으로 급여 데이터를 안전하게 불러옵니다.",
  );
  const loginAuthApi = useMemo(() => createMobileAuthApi(), []);
  const socialRedirectUri = useMemo(
    () => Linking.createURL("auth/oauth/callback"),
    [],
  );
  const valid = email.includes("@") && password.trim().length >= 8;

  const openSignup = useCallback((): void => {
    if (submitting) return;
    loginRouter.push("/(auth)/signup");
  }, [loginRouter, submitting]);

  const openForgotPassword = useCallback((): void => {
    if (submitting) return;
    loginRouter.push("/(auth)/forgot-password");
  }, [loginRouter, submitting]);

  const startSocialLogin = useCallback(
    async (provider: LoginSocialProvider): Promise<void> => {
      if (
        socialLoginSubmitInFlightRef.current ||
        loginSubmitInFlightRef.current
      )
        return;
      socialLoginSubmitInFlightRef.current = true;
      setSubmitting(true);
      setToast(`${provider} server OAuth start request is in progress.`);
      try {
        const result = await loginAuthApi.startOAuth({
          provider,
          redirectUri: socialRedirectUri,
        });
        if (result.authorizationUrl) {
          await WebBrowser.openAuthSessionAsync(
            result.authorizationUrl,
            socialRedirectUri,
          );
          setToast(`${provider} OAuth browser session was opened.`);
          return;
        }
        setToast(
          `${provider} OAuth state is ready. Provider authorization URL is waiting for server configuration.`,
        );
      } catch {
        setToast(`${provider} OAuth could not start. Please try again later.`);
      } finally {
        socialLoginSubmitInFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [loginAuthApi, socialRedirectUri],
  );

  const submitLogin = useCallback(async () => {
    if (
      !valid ||
      loginSubmitInFlightRef.current ||
      socialLoginSubmitInFlightRef.current
    )
      return;
    loginSubmitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const response = await loginAuthApi.login({
        email,
        password,
        rememberMe: true,
      });
      if (response.data?.status === "AUTHENTICATED") {
        if (!response.data.user.emailVerified) {
          setToast("서버 인증이 완료됐어요. 이메일 인증을 먼저 확인해 주세요.");
          loginRouter.replace("/(auth)/verify-email");
        } else if (!response.data.user.onboardingCompleted) {
          setToast("서버 인증이 완료됐어요. 급여 계획을 먼저 설정해 주세요.");
          loginRouter.replace("/onboarding");
        } else {
          setToast(
            "서버 인증이 완료됐어요. 급여 홈 데이터를 불러올 수 있어요.",
          );
          loginRouter.replace("/salary");
        }
      } else if (response.data?.status === "MFA_REQUIRED") {
        setToast("추가 인증이 필요해요. 등록된 인증 수단을 확인해 주세요.");
      } else {
        setToast("계정 상태 확인이 필요해요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setToast(
        "로그인 요청을 완료하지 못했어요. 이메일과 비밀번호를 확인해 주세요.",
      );
    } finally {
      loginSubmitInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [email, loginAuthApi, loginRouter, password, valid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.centerContent]}
      >
        <SalaryLogo large />
        <Text style={styles.loginTitle}>급여납치</Text>
        <Text style={styles.loginSubtitle}>
          월급이 사라지기 전에 먼저 붙잡아요
        </Text>
        <Toast message={toast} />
        <SectionCard>
          <TextInput
            accessibilityLabel="이메일"
            autoCapitalize="none"
            accessibilityState={{ disabled: submitting }}
            editable={!submitting}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="비밀번호"
            accessibilityState={{ disabled: submitting }}
            editable={!submitting}
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor={theme.color.text.disabled}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !valid || submitting }}
            disabled={!valid || submitting}
            onPress={submitLogin}
            style={[
              styles.primaryButton,
              !valid || submitting ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "로그인 중" : "로그인"}
            </Text>
          </Pressable>
          <SmallButton
            disabled={submitting}
            label="회원가입"
            onPress={openSignup}
          />
          <SmallButton
            disabled={submitting}
            label="비밀번호 찾기"
            onPress={openForgotPassword}
          />
          <View style={styles.attachmentRow}>
            {SOCIAL_LOGIN_LABELS.map(({ label, provider }) => (
              <SmallButton
                disabled={submitting}
                key={provider}
                label={label}
                onPress={() => startSocialLogin(provider)}
              />
            ))}
          </View>
        </SectionCard>
        <GuardBox />
      </ScrollView>
    </SafeAreaView>
  );
}

function AppScreen({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{title}</Text>
            <Text style={styles.screenTitle}>{subtitle}</Text>
          </View>
          <SalaryLogo />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function SalaryLogo({
  large = false,
}: Readonly<{ large?: boolean }>): React.ReactElement {
  const size = large ? 86 : 42;
  return (
    <View
      style={[
        styles.logo,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="급여납치 공식 BI"
        resizeMode="contain"
        source={officialBiLogo}
        style={[styles.logoImage, { width: size, height: size }]}
      />
    </View>
  );
}

function MoneyHeroCard({
  label,
  value,
  description,
}: Readonly<{
  label: string;
  value: string;
  description: string;
}>): React.ReactElement {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroMoney}>{value}</Text>
      <Text style={styles.heroDescription}>{description}</Text>
    </View>
  );
}

function MetricGrid({
  metrics,
}: Readonly<{ metrics: readonly MoneyMetric[] }>): React.ReactElement {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text
            style={[
              styles.metricValue,
              metric.tone === "danger" ? styles.dangerText : null,
            ]}
          >
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionCard({
  children,
  nativeID,
}: Readonly<{
  children: React.ReactNode;
  nativeID?: string;
}>): React.ReactElement {
  return (
    <View nativeID={nativeID} style={styles.card}>
      {children}
    </View>
  );
}

function PlanInputCard({
  disabled = false,
  label,
  value,
  helper,
  onChange,
}: Readonly<{
  disabled?: boolean;
  label: string;
  value: string;
  helper: string;
  onChange: (value: string) => void;
}>): React.ReactElement {
  return (
    <SectionCard>
      <View style={styles.between}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <StatusPill label={disabled ? "저장 중" : "수정"} />
      </View>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        editable={!disabled}
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={onChange}
        style={styles.input}
        value={value}
      />
      <Text style={styles.bodyText}>{helper}</Text>
    </SectionCard>
  );
}

function PlanSummaryCard({
  title,
  amount,
  meta,
}: Readonly<{
  title: string;
  amount: string;
  meta: string;
}>): React.ReactElement {
  return (
    <SectionCard>
      <View style={styles.between}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.cardAmount}>{amount}</Text>
      </View>
      <Text style={styles.bodyText}>{meta}</Text>
    </SectionCard>
  );
}

function ProgressBar({
  value,
  danger = false,
}: Readonly<{ value: number; danger?: boolean }>): React.ReactElement {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.max(0, Math.min(100, value))}%` },
          danger ? styles.progressDanger : null,
        ]}
      />
    </View>
  );
}

function ListRow({
  disabled = false,
  icon,
  title,
  meta,
  onPress,
  trailing,
  unread = false,
}: Readonly<{
  icon: string;
  title: string;
  meta: string;
  disabled?: boolean;
  onPress?: () => void;
  trailing?: React.ReactNode;
  unread?: boolean;
}>): React.ReactElement {
  const content = (
    <>
      <Text style={styles.listIcon}>{icon}</Text>
      <View style={styles.flex}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listMeta}>{meta}</Text>
      </View>
      {trailing ?? (unread ? <View style={styles.greenDot} /> : null)}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.listRow,
          unread ? styles.unreadRow : null,
          disabled ? styles.disabled : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[styles.listRow, unread ? styles.unreadRow : null]}>
      {content}
    </View>
  );
}

function CommunityPostRow({
  onPress,
  post,
}: Readonly<{
  onPress: () => void;
  post: CommunityScreenPost;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${post.board} ${post.title} ${post.stats}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.postRow}
    >
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailText}>{post.thumb}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.boardBadge}>{post.board}</Text>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text numberOfLines={2} style={styles.bodyText}>
          {post.summary}
        </Text>
        <Text style={styles.listMeta}>{post.stats}</Text>
      </View>
    </Pressable>
  );
}

function PillRow({
  disabled = false,
  items,
  selected,
  onSelect,
}: Readonly<{
  disabled?: boolean;
  items: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}>): React.ReactElement {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.pillRow}>
        {items.map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ disabled, selected: item === selected }}
            disabled={disabled}
            key={item}
            onPress={() => onSelect(item)}
            style={[
              styles.pill,
              item === selected ? styles.pillActive : null,
              disabled ? styles.disabled : null,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                item === selected ? styles.pillTextActive : null,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function StatusPill({
  label,
  danger = false,
}: Readonly<{ label: string; danger?: boolean }>): React.ReactElement {
  return (
    <View style={[styles.statusPill, danger ? styles.statusDanger : null]}>
      <Text
        style={[styles.statusText, danger ? styles.statusDangerText : null]}
      >
        {label}
      </Text>
    </View>
  );
}

function ToggleRow({
  active,
  disabled = false,
  label,
  onPress,
}: Readonly<{
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.toggleRow, disabled ? styles.disabled : null]}
    >
      <View style={[styles.checkbox, active ? styles.checkboxActive : null]}>
        <Text style={styles.checkboxText}>{active ? "✓" : ""}</Text>
      </View>
      <Text style={styles.listTitle}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({
  disabled = false,
  label,
  onPress,
}: Readonly<{
  disabled?: boolean;
  label: string;
  onPress: () => void;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.smallButton, disabled ? styles.disabled : null]}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function AdSlot(): React.ReactElement {
  const [partnerBenefitsUrl, setPartnerBenefitsUrl] = useState(
    SALARY_HIJACKING_PARTNER_BENEFITS_URL,
  );

  useEffect(() => {
    let mounted = true;
    loadPartnerBenefitsUrl()
      .then((config) => {
        if (mounted) setPartnerBenefitsUrl(config);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Pressable
      accessibilityHint="금융 금액 원문 없이 문맥형 제휴 혜택 페이지를 엽니다."
      accessibilityLabel="제휴 광고 생활비 혜택 열기"
      accessibilityRole="link"
      onPress={() => {
        void WebBrowser.openBrowserAsync(partnerBenefitsUrl);
      }}
      style={({ pressed }) => [styles.adSlot, pressed ? styles.pressed : null]}
    >
      <Text style={styles.adLabel}>제휴/광고</Text>
      <Text style={styles.adTitle}>
        생활비를 아끼는 혜택만 가볍게 보여드려요
      </Text>
      <Text style={styles.adText}>
        contextual-only · 금융 금액 기반 타겟팅 금지
      </Text>
    </Pressable>
  );
}

function Toast({ message }: Readonly<{ message: string }>): React.ReactElement {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

function GuardBox(): React.ReactElement {
  return (
    <View style={styles.guardBox}>
      <Text style={styles.guardTitle}>민감 정보 보호</Text>
      <Text style={styles.guardText}>
        급여, 지출, 저축, 납치금액 원문은 광고·제휴·분석에 사용하지 않아요.
      </Text>
      <Text style={styles.guardText}>
        최종 급여·예산·지출·저축 계산은 안전한 서버 응답 기준으로 확인합니다.
      </Text>
    </View>
  );
}

export function normalizeGrowthDashboardForCleanFintech(input: {
  readonly profile?: { readonly level?: number; readonly totalExp?: number };
  readonly financialRawDataExposed?: boolean;
}): {
  readonly profile: {
    readonly level: number;
    readonly title: string;
    readonly totalXp: number;
  };
  readonly tasks: readonly Mission[];
  readonly stats: { readonly privacyPassRate: string };
} {
  return {
    profile: {
      level: Math.max(1, Math.trunc(input.profile?.level ?? 1)),
      title: "루틴 지킴이",
      totalXp: Math.max(0, Math.trunc(input.profile?.totalExp ?? 0)),
    },
    tasks: [],
    stats: {
      privacyPassRate: input.financialRawDataExposed ? "0.00%" : "100.00%",
    },
  };
}

function nonNegative(value: string): number {
  return parseKrwInputAmount(value) ?? 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.trunc(value));
}

function formatNoticeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 확인 중";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function todayDateInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

const theme = salaryHijackingTheme;
const font = theme.font.native;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.color.surface.app },
  flex: { flex: 1 },
  webCaptureHidden: { display: "none" },
  content: {
    gap: 14,
    paddingBottom: 110,
    paddingTop: 16,
  },
  centerContent: { flexGrow: 1, justifyContent: "center" },
  header: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: theme.layout.headerHeight,
    width: "92%",
  },
  kicker: {
    color: theme.color.text.muted,
    fontFamily: font.extraBold,
    fontSize: 12,
    fontWeight: "800",
  },
  screenTitle: {
    color: theme.color.text.primary,
    fontFamily: font.black,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
  },
  logo: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    overflow: "hidden",
    ...theme.shadow.card,
  },
  logoImage: { borderRadius: theme.radius.full },
  loginTitle: {
    color: theme.color.text.primary,
    fontFamily: font.black,
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  splashKicker: {
    color: theme.color.brand.primary,
    fontFamily: font.black,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  loginSubtitle: {
    color: theme.color.text.secondary,
    fontFamily: font.semibold,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  heroCard: {
    alignSelf: "center",
    backgroundColor: theme.color.brand.primary,
    borderRadius: theme.radius.xl,
    gap: 8,
    padding: 22,
    width: "92%",
    ...theme.shadow.card,
  },
  heroLabel: {
    color: "#FFFFFF",
    fontFamily: font.extraBold,
    fontSize: 15,
    fontWeight: "800",
  },
  heroMoney: {
    color: "#FFFFFF",
    fontFamily: font.black,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 42,
  },
  heroDescription: {
    color: "#EAF6EF",
    fontFamily: font.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  metricGrid: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "92%",
  },
  metricCard: {
    backgroundColor: theme.color.surface.card,
    borderColor: theme.color.surface.lineSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "48%",
    minWidth: "47%",
    padding: 13,
  },
  metricLabel: {
    color: theme.color.text.muted,
    fontFamily: font.semibold,
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  card: {
    alignSelf: "center",
    backgroundColor: theme.color.surface.card,
    borderColor: theme.color.surface.lineSoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    width: "92%",
    ...theme.shadow.card,
  },
  softGreen: {
    backgroundColor: theme.color.brand.soft,
    borderColor: theme.color.brand.soft2,
  },
  between: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
  },
  bodyText: {
    color: theme.color.text.secondary,
    fontFamily: font.regular,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
  },
  money: {
    color: theme.color.text.primary,
    fontFamily: font.black,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
  },
  dangerText: { color: theme.color.semantic.danger },
  progressTrack: {
    backgroundColor: theme.color.surface.lineSoft,
    borderRadius: theme.radius.full,
    height: 10,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: theme.color.brand.primary,
    borderRadius: theme.radius.full,
    height: 10,
  },
  progressDanger: { backgroundColor: theme.color.semantic.danger },
  inputRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    backgroundColor: theme.color.surface.soft,
    borderColor: theme.color.surface.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.text.primary,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.color.brand.primary,
    borderRadius: theme.radius.md,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: font.extraBold,
    fontSize: 15,
    fontWeight: "800",
  },
  listRow: {
    alignItems: "center",
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    padding: 10,
  },
  unreadRow: { backgroundColor: theme.color.brand.soft },
  listIcon: { fontSize: 22, width: 28 },
  listTitle: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  listMeta: {
    color: theme.color.text.muted,
    fontFamily: font.medium,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  notificationActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
  },
  greenDot: {
    backgroundColor: theme.color.brand.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  adSlot: {
    alignSelf: "center",
    backgroundColor: "#FFF8D8",
    borderColor: "#F1DF8D",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 5,
    padding: 16,
    width: "92%",
  },
  adLabel: {
    color: "#856600",
    fontFamily: font.black,
    fontSize: 12,
    fontWeight: "900",
  },
  adTitle: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 16,
    fontWeight: "800",
  },
  adText: {
    color: "#856600",
    fontFamily: font.bold,
    fontSize: 12,
    fontWeight: "700",
  },
  toast: {
    alignSelf: "center",
    backgroundColor: theme.color.brand.soft,
    borderRadius: theme.radius.md,
    padding: 12,
    width: "92%",
  },
  toastText: {
    color: theme.color.brand.dark,
    fontFamily: font.bold,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  statusPill: {
    backgroundColor: theme.color.brand.soft,
    borderRadius: theme.radius.full,
    flexShrink: 1,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: theme.color.brand.primary,
    fontFamily: font.extraBold,
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },
  statusDanger: { backgroundColor: "#FFF1F1" },
  statusDangerText: { color: theme.color.semantic.danger },
  cardAmount: {
    color: theme.color.brand.primary,
    fontFamily: font.extraBold,
    fontSize: 18,
    fontWeight: "800",
  },
  gridTwo: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "92%",
  },
  cardIcon: { fontSize: 28 },
  cardTitle: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 16,
    fontWeight: "800",
  },
  cardText: {
    color: theme.color.text.secondary,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  linkText: {
    color: theme.color.brand.primary,
    fontFamily: font.extraBold,
    fontSize: 13,
    fontWeight: "800",
  },
  pillRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  pill: {
    backgroundColor: theme.color.surface.card,
    borderColor: theme.color.surface.line,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  pillActive: {
    backgroundColor: theme.color.brand.soft,
    borderColor: theme.color.brand.primary,
  },
  pillText: {
    color: theme.color.text.muted,
    fontFamily: font.extraBold,
    fontSize: 13,
    fontWeight: "800",
  },
  pillTextActive: { color: theme.color.brand.primary },
  postRow: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  thumbnail: {
    alignItems: "center",
    backgroundColor: theme.color.brand.soft,
    borderRadius: theme.radius.md,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  thumbnailText: { fontSize: 28 },
  boardBadge: {
    color: theme.color.brand.primary,
    fontFamily: font.black,
    fontSize: 12,
    fontWeight: "900",
  },
  postTitle: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  postDetailTitle: {
    color: theme.color.text.primary,
    fontFamily: font.black,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
  },
  detailHero: { alignItems: "center", flexDirection: "row", gap: 12 },
  detailIcon: { fontSize: 34 },
  detailCardRow: {
    alignItems: "center",
    borderColor: theme.color.surface.lineSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 70,
    padding: 12,
  },
  fab: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: theme.color.brand.primary,
    borderRadius: theme.radius.full,
    bottom: 16,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
    position: "absolute",
    right: 16,
    ...theme.shadow.floating,
  },
  fabText: {
    color: "#FFFFFF",
    fontFamily: font.black,
    fontSize: 15,
    fontWeight: "900",
  },
  profileRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  avatar: {
    alignItems: "center",
    backgroundColor: theme.color.brand.soft,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: { fontSize: 32 },
  attachmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallButton: {
    alignItems: "center",
    borderColor: theme.color.surface.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  smallButtonText: {
    color: theme.color.text.secondary,
    fontFamily: font.extraBold,
    fontSize: 13,
    fontWeight: "800",
  },
  composeHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: theme.color.surface.lineSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconButtonText: {
    color: theme.color.text.primary,
    fontSize: 30,
    fontWeight: "600",
  },
  composeTitle: {
    color: theme.color.text.primary,
    fontFamily: font.extraBold,
    fontSize: 18,
    fontWeight: "800",
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: theme.color.brand.primary,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 58,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontFamily: font.black,
    fontSize: 14,
    fontWeight: "900",
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  composeInput: {
    backgroundColor: theme.color.surface.soft,
    borderColor: theme.color.surface.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.text.primary,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  composeBody: { minHeight: 180, textAlignVertical: "top" },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    alignItems: "center",
    borderColor: theme.color.surface.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxActive: {
    backgroundColor: theme.color.brand.primary,
    borderColor: theme.color.brand.primary,
  },
  checkboxText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  guardBox: {
    alignSelf: "center",
    borderColor: theme.color.brand.soft2,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 6,
    padding: 14,
    width: "92%",
  },
  guardTitle: {
    color: theme.color.brand.primary,
    fontFamily: font.black,
    fontSize: 13,
    fontWeight: "900",
  },
  guardText: {
    color: theme.color.text.muted,
    fontFamily: font.semibold,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
  },
});
