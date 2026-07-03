import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import officialBiLogo from "../../../assets/brand/salary-hijacking-platform-logo.png";
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
} from "../../features/budget/utils";
import type { DailyBudgetSnapshot } from "../../features/budget/types";
import type { GrowthDashboard, GrowthTask } from "../../features/level/types";
import type {
  PayrollCalculation,
  PayrollPlanSnapshot,
} from "../../features/payroll/types";
import type {
  PlanFixedExpenseCommitment,
  PlanSavingsGoalCommitment,
} from "../../features/plan/types";
import type { ProfileSnapshot } from "../../features/profile/types";
import type {
  NotificationItem,
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
} from "../api/mobile-api";
import { appIcons, salaryHijackingTheme } from "./clean-fintech-theme";

type ScreenKind =
  | "salary"
  | "plan"
  | "level"
  | "notifications"
  | "community"
  | "profile"
  | "login";

type MoneyMetric = Readonly<{ label: string; value: string; tone?: "danger" }>;
type VariableExpenseEntry = Readonly<{
  amount: number;
  icon: string;
  id: string;
  name: string;
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
type LevelDetailKind = "reading" | "news" | "english" | "health";
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
  }>[];
  progressLabel: string;
  progressValue: number;
}>;
type NotificationScreenItem = Readonly<{
  id: string;
  icon: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
}>;
type PlanCommitmentRow = Readonly<{
  amountMinor: number;
  id: string;
  meta: string;
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
    id: "fallback_goal",
    icon: "🏅",
    title: "목표 달성",
    message: "누적 납치금액 5,780,000원 달성",
    type: "SAVINGS_GOAL",
    priority: "HIGH",
    status: "UNREAD",
  },
  {
    id: "fallback_budget",
    icon: appIcons.warning,
    title: "예산 초과 주의",
    message: "오늘 남은 예산이 0원 아래로 내려갈 수 있어요.",
    type: "BUDGET_WARNING",
    priority: "HIGH",
    status: "UNREAD",
  },
  {
    id: "fallback_reward",
    icon: appIcons.reward,
    title: "이벤트 포인트",
    message: "납치금액 달성 이벤트 500P 지급 예정",
    type: "NOTICE",
    priority: "NORMAL",
    status: "READ",
  },
  {
    id: "fallback_reading",
    icon: appIcons.reading,
    title: "독서 루틴",
    message: "오늘 추천 도서를 10분만 읽어볼까요?",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    status: "READ",
  },
  {
    id: "fallback_news",
    icon: appIcons.news,
    title: "뉴스 루틴",
    message: "경제 뉴스 3개로 하루 감각을 열어요.",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    status: "READ",
  },
  {
    id: "fallback_english",
    icon: appIcons.english,
    title: "영어 루틴",
    message: "출퇴근 5문장 듣기 미션이 기다려요.",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
    status: "READ",
  },
  {
    id: "fallback_health",
    icon: appIcons.health,
    title: "건강 루틴",
    message: "20분 홈트로 소비 통제 체력을 채워요.",
    type: "CONTENT_RECOMMENDATION",
    priority: "NORMAL",
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
        },
        {
          title: "월급 이후의 현금흐름",
          meta: "경제/경영 · 핵심 요약 + 노트",
          action: "생각 남기기",
          icon: "📗",
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
        },
        {
          title: "구독 경제와 자동결제 관리 트렌드",
          meta: "산업 · 오늘 09:30 · 댓글 8",
          action: "북마크",
          icon: "📌",
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
        },
        {
          title: "생활비를 줄였어요",
          meta: "I saved money on daily expenses.",
          action: "말하기 연습",
          icon: "🗣️",
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
        },
        {
          title: "물 1,500ml 채우기",
          meta: "현재 900ml · 60% 달성",
          action: "물 마심 기록",
          icon: "💧",
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
  const writeCommunityService = useMemo(
    () => createMobileCommunityService(),
    [],
  );
  const [board, setBoard] = useState<CommunityBoard>("자유 게시판");
  const [anonymous, setAnonymous] = useState(true);
  const [question, setQuestion] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(
    "제목, 본문, 게시판을 확인한 뒤 등록할 수 있어요.",
  );

  const valid = title.trim().length >= 2 && body.trim().length >= 5;
  const submitCommunityPost = useCallback(() => {
    if (!valid || submitting) return;
    const draft: CommunityPostDraft = {
      anonymous,
      boardType: communityBoardApiMap[board] ?? "FREE",
      content: body.trim(),
      tags: question ? ["질문"] : [],
      title: title.trim(),
    };

    setSubmitting(true);
    setToast("게시글을 서버 커뮤니티에 등록하는 중이에요.");
    void writeCommunityService
      .publishPost(draft)
      .then(() => {
        setTitle("");
        setBody("");
        setToast("게시글이 서버에 등록되었습니다. 커뮤니티로 이동합니다.");
      })
      .catch(() => {
        setToast(
          "게시글을 등록하지 못했어요. 민감 정보와 네트워크 상태를 확인해 주세요.",
        );
      })
      .finally(() => setSubmitting(false));
  }, [
    anonymous,
    board,
    body,
    question,
    submitting,
    title,
    valid,
    writeCommunityService,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.composeHeader}>
          <Pressable accessibilityRole="button" style={styles.iconButton}>
            <Text style={styles.iconButtonText}>×</Text>
          </Pressable>
          <Text style={styles.composeTitle}>글쓰기</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!valid || submitting}
            onPress={submitCommunityPost}
            style={[
              styles.doneButton,
              !valid || submitting ? styles.disabled : null,
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
              selected={board}
              onSelect={(next) => setBoard(next as CommunityBoard)}
            />
          </SectionCard>
          <SectionCard>
            <TextInput
              accessibilityLabel="제목"
              onChangeText={setTitle}
              placeholder="제목"
              placeholderTextColor={theme.color.text.disabled}
              style={styles.composeInput}
              value={title}
            />
            <TextInput
              accessibilityLabel="본문"
              multiline
              onChangeText={setBody}
              placeholder="본문을 입력하세요. 급여, 지출, 계좌, 연락처 같은 민감 정보는 공개하지 마세요."
              placeholderTextColor={theme.color.text.disabled}
              style={[styles.composeInput, styles.composeBody]}
              value={body}
            />
            <View style={styles.attachmentRow}>
              <SmallButton label="사진" />
              <SmallButton label="이미지" />
              <SmallButton label="파일" />
            </View>
          </SectionCard>
          <SectionCard>
            <ToggleRow
              active={question}
              label="질문"
              onPress={() => setQuestion((value) => !value)}
            />
            <ToggleRow
              active={anonymous}
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
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState<ReadonlySet<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(
    "급여·지출·저축 정보는 민감 정보 보호 기준으로 다룹니다.",
  );
  const signupAuthApi = useMemo(() => createMobileAuthApi(), []);
  const valid =
    email.includes("@") &&
    nickname.trim().length >= 2 &&
    password.trim().length >= 8 &&
    signupConsentLabels.every((label) => agreed.has(label));
  const submitSignup = useCallback(async () => {
    if (!valid || submitting) return;
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
        setToast("가입 요청을 서버에 등록했어요. 서버 인증이 완료됐어요.");
      } else if (response.data?.status === "EMAIL_VERIFICATION_REQUIRED") {
        setToast("가입 요청을 서버에 등록했어요. 이메일 인증을 확인해 주세요.");
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
      setSubmitting(false);
    }
  }, [email, nickname, password, signupAuthApi, submitting, valid]);

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
            inputMode="email"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="회원가입 닉네임"
            onChangeText={setNickname}
            placeholder="닉네임"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={nickname}
          />
          <TextInput
            accessibilityLabel="회원가입 비밀번호"
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor={theme.color.text.disabled}
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </SectionCard>
        <SectionCard>
          <Text style={styles.sectionTitle}>민감 정보 보호 및 약관 동의</Text>
          {signupConsentLabels.map((label) => (
            <ToggleRow
              active={agreed.has(label)}
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
  const [selectedTab, setSelectedTab] = useState(config.tabs[0] ?? "");
  const [toast, setToast] = useState(
    `${config.progressLabel}: 완료하면 XP와 진행률이 올라가요.`,
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
        {config.cards.map((card) => (
          <Pressable
            accessibilityRole="button"
            key={card.title}
            onPress={() => setToast(`${card.title}: ${card.action}`)}
            style={styles.detailCardRow}
          >
            <Text style={styles.listIcon}>{card.icon}</Text>
            <View style={styles.flex}>
              <Text style={styles.listTitle}>{card.title}</Text>
              <Text style={styles.listMeta}>{card.meta}</Text>
            </View>
            <Text style={styles.linkText}>{card.action}</Text>
          </Pressable>
        ))}
      </SectionCard>
      <AdSlot />
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
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState(
    "커뮤니티 상세와 댓글을 서버 기준으로 확인하는 중이에요.",
  );
  const activeDetail = serverCommunityDetail ?? fallbackPostDetail;
  const activeComments =
    serverCommunityComments.length > 0
      ? serverCommunityComments
      : activeDetail.comments;
  const post = toCommunityScreenPost(activeDetail.post);
  const commentReady = commentDraft.trim().length >= 2;

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
      setToast(
        `서버 커뮤니티 상세 동기화 · 댓글 ${formatCommunityCount(
          nextComments.length,
        )}개`,
      );
    } catch {
      setServerCommunityDetail(null);
      setServerCommunityComments([]);
      setToast("서버 연결 전까지 안전한 예시 상세 화면을 보여드려요.");
    }
  }, [detailCommunityService, postId]);

  const togglePostLike = useCallback((): void => {
    const nextLiked = !liked;
    const targetPostId = activeDetail.post.id;
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
            },
          };
        });
        setToast(
          nextLiked ? "좋아요가 서버에 반영됐어요." : "좋아요를 취소했어요.",
        );
      })
      .catch(() => {
        setLiked(!nextLiked);
        setToast("좋아요를 서버에 반영하지 못했어요. 다시 시도해 주세요.");
      });
  }, [activeDetail.post.id, detailCommunityService, liked]);

  const submitCommunityComment = useCallback((): void => {
    const content = commentDraft.trim();
    if (!content || !commentReady || commentSubmitting) return;

    const targetPostId = activeDetail.post.id;
    setCommentSubmitting(true);
    setToast("댓글을 서버 커뮤니티에 등록하는 중이에요.");
    void detailCommunityService
      .createComment(targetPostId, { content, anonymous: true })
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
      .finally(() => setCommentSubmitting(false));
  }, [
    activeDetail.post.id,
    commentDraft,
    commentReady,
    commentSubmitting,
    detailCommunityService,
  ]);

  const reportCommunityPost = useCallback((): void => {
    const targetPostId = activeDetail.post.id;
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
      });
  }, [activeDetail.post.id, detailCommunityService]);

  const reportCommunityComment = useCallback(
    (comment: CommunityComment): void => {
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
        });
    },
    [detailCommunityService],
  );

  const deleteCommunityPost = useCallback((): void => {
    const targetPostId = activeDetail.post.id;
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
      });
  }, [activeDetail.post.id, detailCommunityService, detailRouter]);

  const deleteCommunityComment = useCallback(
    (comment: CommunityComment): void => {
      const targetPostId = activeDetail.post.id;
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
          <SmallButton label={post.stats} />
          <SmallButton label="공유" />
          <SmallButton label="신고" onPress={reportCommunityPost} />
          <SmallButton label="삭제" onPress={deleteCommunityPost} />
        </View>
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>인증 내용</Text>
        <Text style={styles.bodyText}>
          {activeDetail.content || post.summary}
        </Text>
        <View style={styles.attachmentRow}>
          <Pressable
            accessibilityRole="button"
            onPress={togglePostLike}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              {liked ? "좋아요 취소" : "좋아요"}
            </Text>
          </Pressable>
          <SmallButton label="댓글" />
          <SmallButton label="공유" />
          <SmallButton label="신고" onPress={reportCommunityPost} />
          <SmallButton label="삭제" onPress={deleteCommunityPost} />
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
            <View style={styles.attachmentRow}>
              <SmallButton
                label="신고"
                onPress={() => reportCommunityComment(comment)}
              />
              <SmallButton
                label="삭제"
                onPress={() => deleteCommunityComment(comment)}
              />
            </View>
          </View>
        ))}
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel="커뮤니티 댓글 입력"
            multiline
            onChangeText={setCommentDraft}
            placeholder="민감 정보 없이 댓글을 입력하세요"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={commentDraft}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!commentReady || commentSubmitting}
            onPress={submitCommunityComment}
            style={[
              styles.primaryButton,
              !commentReady || commentSubmitting ? styles.disabled : null,
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
  const salaryPlanCommitmentsApi = useMemo(
    () => createMobilePlanCommitmentsApi(),
    [],
  );
  const [expenseDraft, setExpenseDraft] = useState("");
  const [addedExpenses, setAddedExpenses] = useState<
    readonly VariableExpenseEntry[]
  >([]);
  const [toast, setToast] = useState(
    "서버 응답이 없을 때만 안전한 오프라인 미리보기를 보여줘요.",
  );
  const [prioritizeDailyBudget, setPrioritizeDailyBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [serverBudgetSnapshot, setServerBudgetSnapshot] =
    useState<DailyBudgetSnapshot | null>(null);
  const [salaryFixedExpenses, setSalaryFixedExpenses] = useState<
    readonly PlanFixedExpenseCommitment[]
  >([]);

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
  const salaryFixedExpenseRows = salaryFixedExpenses.map(
    fixedExpenseRowFromServer,
  );

  const handleAddExpense = async (): Promise<void> => {
    const amount = parseKrwInputAmount(expenseDraft);
    if (amount === null) {
      setToast(
        "0보다 큰 KRW 정수만 입력해 주세요. 음수와 소수점은 제외됩니다.",
      );
      return;
    }

    const nextIndex = addedExpenses.length + 1;
    const title = `추가 지출 ${nextIndex}`;
    const offlineEntry = {
      amount,
      icon: appIcons.expense,
      id: `offline-expense-${nextIndex}-${amount}`,
      name: title,
    } satisfies VariableExpenseEntry;
    setExpenseDraft("");

    try {
      setSavingExpense(true);
      const result = await budgetApi.createVariableExpense({
        amountMinor: amount,
        category: "ETC",
        dailyBudgetId: null,
        idempotencyKey: `mobile-salary-home-${Date.now()}-${amount}`,
        memo: null,
        merchantName: null,
        paymentMethod: "ETC",
        receiptAttachmentId: null,
        source: "MANUAL",
        spentAt: new Date().toISOString(),
        tags: [],
        title,
      });
      if (result.serverAuthority !== true) {
        throw new Error("serverAuthority response required");
      }
      setAddedExpenses((current) => [
        ...current,
        {
          amount: result.netAmountMinor,
          icon: appIcons.expense,
          id: result.expenseId,
          name: result.title,
        },
      ]);
      void refreshServerBudgetSnapshot({ clearLocalPreview: true });
      setToast(
        `서버에 지출을 기록했어요. ${formatMoney(result.netAmountMinor)}원 기준으로 다시 계산했습니다.`,
      );
    } catch {
      setAddedExpenses((current) => [...current, offlineEntry]);
      setToast(
        `${formatMoney(amount)}원 지출을 오프라인 미리보기로 반영했어요. 서버 연결 후 다시 동기화가 필요합니다.`,
      );
    } finally {
      setSavingExpense(false);
    }
  };

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
            accessibilityLabel="지출 추가 금액"
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={12}
            onChangeText={setExpenseDraft}
            onSubmitEditing={handleAddExpense}
            placeholder="예: 5000"
            placeholderTextColor={theme.color.text.disabled}
            returnKeyType="done"
            style={styles.input}
            value={expenseDraft}
          />
          <Pressable
            accessibilityRole="button"
            disabled={savingExpense}
            onPress={handleAddExpense}
            style={[
              styles.primaryButton,
              savingExpense ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {savingExpense ? "저장 중..." : "지출 추가하기"}
            </Text>
          </Pressable>
        </View>
      </SectionCard>
      <Toast message={toast} />
      <SectionCard>
        <Text style={styles.sectionTitle}>오늘 빠져나간 고정지출</Text>
        {salaryFixedExpenseRows.length > 0
          ? salaryFixedExpenseRows.map((item) => (
              <ListRow
                key={item.id}
                icon={appIcons.subscription}
                title={item.title}
                meta={`${formatMoney(item.amountMinor)}원 · ${item.meta}`}
              />
            ))
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
        {allVariableExpenses.map((item) => (
          <ListRow
            key={item.id}
            icon={item.icon}
            title={item.name}
            meta={`${formatMoney(item.amount)}원`}
          />
        ))}
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

function fixedExpenseRowFromServer(
  item: PlanFixedExpenseCommitment,
): PlanCommitmentRow {
  return {
    amountMinor: item.amountMinor,
    id: item.id,
    meta: `${item.dueLabel} · 서버 기준 ${item.status}`,
    title: item.title,
  };
}

function savingsGoalRowFromServer(
  item: PlanSavingsGoalCommitment,
): PlanCommitmentRow {
  return {
    amountMinor: item.fixedSaveAmountMinor,
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
  const [planToast, setPlanToast] = useState(
    "서버 급여 계획이 없으면 로컬 미리보기로 계산해요.",
  );
  const [recalculatingPlan, setRecalculatingPlan] = useState(false);

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
        setExpense(String(commitments.fixedExpenseTotalMinor));
        setTarget(String(commitments.fixedSavingsTotalMinor));
        setPlanToast("서버 고정지출과 고정저축을 계획에 반영했어요.");
      })
      .catch(() => {
        if (!cancelled) {
          setServerFixedExpenses([]);
          setServerSavingsGoals([]);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshServerPayrollCalculation();
    }, 400);

    return () => clearTimeout(timer);
  }, [refreshServerPayrollCalculation]);

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
  const fixedExpenseRows =
    serverFixedExpenses.length > 0
      ? serverFixedExpenses.map(fixedExpenseRowFromServer)
      : fallbackPlanFixedExpenseRows;
  const savingsRows =
    serverSavingsGoals.length > 0
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
      <PlanInputCard
        label="급여 계획"
        value={salary}
        onChange={setSalary}
        helper="급여일 매월 25일 · KRW 정수만 입력"
      />
      <PlanInputCard
        label="고정지출"
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
            meta={`${formatMoney(item.amountMinor)}원 · ${item.meta}`}
          />
        ))}
      </SectionCard>
      <PlanSummaryCard
        title="고정저축"
        amount={`${formatMoney(nonNegative(target))}원`}
        meta={`${savingsRows.length}개 목표 · 급여 직후 자동 분리`}
      />
      <SectionCard>
        <Text style={styles.sectionTitle}>서버 고정저축 목표</Text>
        {savingsRows.map((item) => (
          <ListRow
            key={item.id}
            icon={appIcons.saving}
            title={item.title}
            meta={`${formatMoney(item.amountMinor)}원 · ${item.meta}`}
          />
        ))}
      </SectionCard>
      <PlanSummaryCard
        title="생활비"
        amount={`${formatMoney(livingBudgetPreview)}원`}
        meta="서버 추천 일일예산 기준 · 초과 시 알림"
      />
      <PlanInputCard
        label="목표금액"
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

function LevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverGrowthDashboard, setServerGrowthDashboard] =
    useState<GrowthDashboard | null>(null);
  const [serverGrowthTasks, setServerGrowthTasks] = useState<
    readonly GrowthTask[]
  >([]);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() =>
    completedMissionIds(fallbackMissions),
  );
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

  const completeMission = useCallback(
    (mission: Mission, done: boolean) => {
      if (done) return;
      setCompleted((current) => new Set(current).add(mission.id));
      if (!mission.serverTaskId) {
        setToast(`${mission.title} 완료! +${mission.xp} XP가 반영됐어요.`);
        return;
      }

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
          setToast(
            `${mission.title} 서버 기록 완료! +${result.expDelta} XP가 반영됐어요.`,
          );
        })
        .catch(() => {
          setToast(
            "서버 기록은 실패했지만 앱 화면에는 임시 완료로 반영했어요.",
          );
        });
    },
    [growthApi],
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
          return (
            <Pressable
              accessibilityRole="button"
              key={mission.id}
              onPress={() => completeMission(mission, done)}
              style={[styles.card, done ? styles.softGreen : null]}
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
    id: item.notificationId,
    icon: notificationIcon(item.type),
    title: item.title,
    message: item.message,
    type: item.type,
    priority: item.priority,
    status: item.status,
  };
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

function toCommunityScreenPost(post: CommunityPost): CommunityScreenPost {
  if (
    post.rawFinancialDataExposed ||
    post.rawPersonalDataExposed ||
    post.adsFinancialTargetingUsed
  ) {
    throw new Error("unsafe community post payload");
  }
  return {
    board: communityBoardLabelMap[post.boardType],
    id: post.id,
    stats: `좋아요 ${formatCommunityCount(post.likeCount)} · 댓글 ${formatCommunityCount(
      post.commentCount,
    )} · 북마크 ${formatCommunityCount(post.bookmarkCount)}`,
    summary: post.bodyPreview,
    thumb: communityBoardThumbMap[post.boardType],
    title: post.title,
  };
}

function toCommunityScreenPosts(
  serverCommunityFeed: CommunityFeedPage | null,
): readonly CommunityScreenPost[] {
  if (!serverCommunityFeed) return [];
  return serverCommunityFeed.items.map(toCommunityScreenPost);
}

function popularCommunityPosts(
  posts: readonly CommunityScreenPost[],
): readonly CommunityScreenPost[] {
  return [...posts]
    .sort((first, second) => second.stats.localeCompare(first.stats, "ko-KR"))
    .slice(0, 3);
}

function NotificationsScreen(): React.ReactElement {
  const notificationsApi = useMemo(() => createMobileNotificationsApi(), []);
  const [serverNotifications, setServerNotifications] = useState<
    readonly NotificationScreenItem[]
  >(fallbackNotifications);
  const [unreadCount, setUnreadCount] = useState(
    fallbackNotifications.filter((item) => item.status === "UNREAD").length,
  );
  const [syncLabel, setSyncLabel] = useState("서버 알림을 확인하는 중이에요.");

  useEffect(() => {
    let mounted = true;

    async function hydrateNotifications(): Promise<void> {
      try {
        const [listResult, unreadResult] = await Promise.all([
          notificationsApi.list({ page: 1, pageSize: 20 }),
          notificationsApi.unreadCount(),
        ]);
        if (!mounted) return;

        const nextNotifications = listResult.items
          .filter((item) => item.status !== "DELETED")
          .map(toNotificationScreenItem);
        setServerNotifications(
          nextNotifications.length ? nextNotifications : fallbackNotifications,
        );
        setUnreadCount(unreadResult.unreadCount);
        setSyncLabel("서버 알림 기준으로 동기화됐어요.");
      } catch {
        if (!mounted) return;
        setServerNotifications(fallbackNotifications);
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

  const markRead = useCallback(
    (item: NotificationScreenItem) => {
      if (item.status !== "UNREAD") return;
      setServerNotifications((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, status: "READ" }
            : candidate,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      void notificationsApi.markRead(item.id).catch(() => {
        setSyncLabel("읽음 처리는 서버 연결 후 다시 확인해 주세요.");
      });
    },
    [notificationsApi],
  );

  return (
    <AppScreen title="알림" subtitle="새로운 알림이 있어요">
      <Toast message={`${syncLabel} · 읽지 않은 알림 ${unreadCount}개`} />
      <SectionCard>
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>중요 알림</Text>
          <StatusPill label={`${unreadCount} unread`} />
        </View>
        {importantNotifications.length ? (
          importantNotifications.map((item) => (
            <ListRow
              icon={item.icon}
              key={item.id}
              meta={item.message}
              onPress={() => markRead(item)}
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
              icon={item.icon}
              key={item.id}
              meta={item.message}
              onPress={() => markRead(item)}
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
          <CommunityPostRow key={`popular-${post.id}`} post={post} />
        ))}
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>{board}</Text>
        {visibleCommunityPosts.map((post) => (
          <CommunityPostRow key={`${board}-${post.id}`} post={post} />
        ))}
      </SectionCard>
      <Pressable accessibilityRole="button" style={styles.fab}>
        <Text style={styles.fabText}>글쓰기</Text>
      </Pressable>
      <GuardBox />
    </AppScreen>
  );
}

function ProfileScreen(): React.ReactElement {
  const profileApi = useMemo(() => createMobileProfileApi(), []);
  const profileAuthApi = useMemo(() => createMobileAuthApi(), []);
  const router = useRouter();
  const [serverProfileSnapshot, setServerProfileSnapshot] =
    useState<ProfileSnapshot | null>(null);
  const [profileToast, setProfileToast] = useState(
    "서버 MY 정보를 확인하는 중이에요.",
  );

  useEffect(() => {
    let mounted = true;

    async function hydrateProfile(): Promise<void> {
      try {
        const snapshot = await profileApi.getProfile();
        if (!mounted) return;
        setServerProfileSnapshot(snapshot);
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
      });
  }, [profileApi]);

  const requestWithdrawal = useCallback(() => {
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
      });
  }, [profileApi]);

  const logoutSession = useCallback(() => {
    setProfileToast("로그아웃을 서버에 요청하는 중이에요.");
    void profileAuthApi
      .logout()
      .then(() => {
        setServerProfileSnapshot(null);
        setProfileToast("로그아웃됐어요. 다시 로그인해 주세요.");
        router.replace("/(auth)/login");
      })
      .catch(() => {
        setProfileToast(
          "로그아웃을 완료하지 못했어요. 네트워크 상태를 확인해 주세요.",
        );
      });
  }, [profileAuthApi, router]);

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
          <SmallButton label="프로필 설정" />
          <SmallButton label="계정 설정" />
          <SmallButton label="데이터 내보내기" onPress={requestPrivacyExport} />
          <SmallButton label="탈퇴 요청" onPress={requestWithdrawal} />
          <SmallButton label="로그아웃" onPress={logoutSession} />
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
          icon="📝"
          title="내 게시글 관리"
          meta={`${profileSnapshot.summary.communityPosts}개 글 · 댓글 ${profileSnapshot.summary.communityComments}개`}
        />
        <ListRow
          icon={appIcons.level}
          title="내 레벨업 관리"
          meta={`미션 ${profileSnapshot.summary.completedGrowthTasks}개 · XP ${profileSnapshot.summary.levelXp}/${profileSnapshot.summary.nextLevelXp}`}
        />
        <ListRow icon="💬" title="1:1 문의" meta="계정, 결제, 개인정보 문의" />
        <ListRow icon="📣" title="공지사항" meta="서비스 안내와 이벤트" />
      </SectionCard>
      <AdSlot />
      <GuardBox />
    </AppScreen>
  );
}

function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(
    "서버 권위 인증으로 급여 데이터를 안전하게 불러옵니다.",
  );
  const loginAuthApi = useMemo(() => createMobileAuthApi(), []);
  const valid = email.includes("@") && password.trim().length >= 8;
  const submitLogin = useCallback(async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const response = await loginAuthApi.login({
        email,
        password,
        rememberMe: true,
      });
      if (response.data?.status === "AUTHENTICATED") {
        setToast("서버 인증이 완료됐어요. 급여 홈 데이터를 불러올 수 있어요.");
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
      setSubmitting(false);
    }
  }, [email, loginAuthApi, password, submitting, valid]);

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
            inputMode="email"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="비밀번호"
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor={theme.color.text.disabled}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
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
          <View style={styles.attachmentRow}>
            <SmallButton label="Kakao" />
            <SmallButton label="Naver" />
            <SmallButton label="Apple" />
            <SmallButton label="Google" />
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
  label,
  value,
  helper,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  helper: string;
  onChange: (value: string) => void;
}>): React.ReactElement {
  return (
    <SectionCard>
      <View style={styles.between}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <StatusPill label="수정" />
      </View>
      <TextInput
        accessibilityLabel={label}
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
  icon,
  title,
  meta,
  onPress,
  unread = false,
}: Readonly<{
  icon: string;
  title: string;
  meta: string;
  onPress?: () => void;
  unread?: boolean;
}>): React.ReactElement {
  const content = (
    <>
      <Text style={styles.listIcon}>{icon}</Text>
      <View style={styles.flex}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listMeta}>{meta}</Text>
      </View>
      {unread ? <View style={styles.greenDot} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.listRow, unread ? styles.unreadRow : null]}
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
  post,
}: Readonly<{ post: CommunityScreenPost }>): React.ReactElement {
  return (
    <View style={styles.postRow}>
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
    </View>
  );
}

function PillRow({
  items,
  selected,
  onSelect,
}: Readonly<{
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
            accessibilityState={{ selected: item === selected }}
            key={item}
            onPress={() => onSelect(item)}
            style={[styles.pill, item === selected ? styles.pillActive : null]}
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
  label,
  onPress,
}: Readonly<{
  active: boolean;
  label: string;
  onPress: () => void;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={styles.toggleRow}
    >
      <View style={[styles.checkbox, active ? styles.checkboxActive : null]}>
        <Text style={styles.checkboxText}>{active ? "✓" : ""}</Text>
      </View>
      <Text style={styles.listTitle}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress?: () => void }>): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.smallButton}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function AdSlot(): React.ReactElement {
  return (
    <View style={styles.adSlot}>
      <Text style={styles.adLabel}>제휴/광고</Text>
      <Text style={styles.adTitle}>
        생활비를 아끼는 혜택만 가볍게 보여드려요
      </Text>
      <Text style={styles.adText}>
        contextual-only · 금융 금액 기반 타겟팅 금지
      </Text>
    </View>
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
