import { useEffect, useMemo, useState } from "react";
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
  calculateOfflineDailyBudgetPreview,
  parseKrwInputAmount,
} from "../../features/budget/utils";
import { createMobileBudgetApi } from "../api/mobile-api";
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
}>;
type CommunityBoard =
  | "전체 게시판"
  | "자유 게시판"
  | "레벨업 인증"
  | "취미 게시판";
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

const fixedExpenses = [
  { name: "ChatGPT", amount: "30,000원", status: "납부완료" },
  { name: "넷플릭스", amount: "15,000원", status: "납부완료" },
  { name: "유튜브 프리미엄", amount: "15,000원", status: "납부완료" },
] as const;

const variableExpenses: readonly VariableExpenseEntry[] = [
  { id: "coffee", name: "커피", amount: 2000, icon: appIcons.coffee },
  { id: "lunch", name: "점심", amount: 6500, icon: appIcons.meal },
  { id: "store", name: "편의점", amount: 4500, icon: appIcons.expense },
] as const;

const missions: readonly Mission[] = [
  {
    id: "reading",
    icon: appIcons.reading,
    title: "독서하기",
    description: "AI 추천 도서 한 챕터를 읽고 오늘의 생각을 남겨요.",
    routeLabel: "독서 시작",
    xp: 30,
  },
  {
    id: "news",
    icon: appIcons.news,
    title: "뉴스보기",
    description: "경제/기술 뉴스 3개를 보고 돈의 흐름을 익혀요.",
    routeLabel: "뉴스 보기",
    xp: 25,
  },
  {
    id: "english",
    icon: appIcons.english,
    title: "영어연습",
    description: "듣기와 말하기 루틴으로 출퇴근 시간을 회수해요.",
    routeLabel: "영어 연습",
    xp: 25,
  },
  {
    id: "health",
    icon: appIcons.health,
    title: "홈트하기",
    description: "20분 움직이고 소비 통제에 필요한 체력을 채워요.",
    routeLabel: "운동 완료",
    xp: 35,
  },
] as const;

const communityPosts = [
  {
    board: "레벨업 인증",
    title: "퇴근 후 20분 홈트 18일째 인증",
    summary: "월급도 지키고 체력도 지키는 루틴으로 이번 달을 버티는 중이에요.",
    stats: "조회 1,284 · 좋아요 96 · 댓글 18",
    thumb: "🏃",
  },
  {
    board: "자유 게시판",
    title: "구독 서비스 정리하고 60,000원 지켰어요",
    summary: "자동결제 목록을 펼쳐보니 생각보다 빠져나가는 돈이 많았네요.",
    stats: "조회 842 · 좋아요 71 · 댓글 12",
    thumb: "🔁",
  },
  {
    board: "취미 게시판",
    title: "돈 안 드는 주말 루틴 추천 받아요",
    summary: "이번 주는 무지출 주말로 보내려고 합니다.",
    stats: "조회 512 · 좋아요 34 · 댓글 22",
    thumb: "☕",
  },
] as const;

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
  const [board, setBoard] = useState<CommunityBoard>("자유 게시판");
  const [anonymous, setAnonymous] = useState(true);
  const [question, setQuestion] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState(
    "제목, 본문, 게시판을 확인한 뒤 등록할 수 있어요.",
  );

  const valid = title.trim().length >= 2 && body.trim().length >= 5;

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
            disabled={!valid}
            onPress={() =>
              setToast("게시글이 등록되었습니다. 커뮤니티로 이동합니다.")
            }
            style={[styles.doneButton, !valid ? styles.disabled : null]}
          >
            <Text style={styles.doneButtonText}>완료</Text>
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
  const [agreed, setAgreed] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState(
    "급여·지출·저축 정보는 민감 정보 보호 기준으로 다룹니다.",
  );
  const valid =
    email.includes("@") &&
    nickname.trim().length >= 2 &&
    signupConsentLabels.every((label) => agreed.has(label));

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
            placeholder="비밀번호"
            placeholderTextColor={theme.color.text.disabled}
            secureTextEntry
            style={styles.input}
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
          disabled={!valid}
          onPress={() =>
            setToast("회원가입 요청을 서버 권위 API로 보낼 준비가 됐어요.")
          }
          style={[styles.primaryButton, !valid ? styles.disabled : null]}
        >
          <Text style={styles.primaryButtonText}>가입 완료</Text>
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

export function CleanFintechPostDetailScreen(): React.ReactElement {
  const post = communityPosts[0];
  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState("레벨업 인증 게시글을 안전하게 열었어요.");

  return (
    <AppScreen title="커뮤니티" subtitle="레벨업 인증">
      <Toast message={toast} />
      <SectionCard>
        <Text style={styles.boardBadge}>{post.board}</Text>
        <Text style={styles.postDetailTitle}>{post.title}</Text>
        <Text style={styles.bodyText}>{post.summary}</Text>
        <View style={styles.attachmentRow}>
          <SmallButton label="조회 1,284" />
          <SmallButton label="좋아요 96" />
          <SmallButton label="댓글 18" />
          <SmallButton label="공유" />
        </View>
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>인증 내용</Text>
        <Text style={styles.bodyText}>
          고정지출을 먼저 분리하고 남은 생활비 안에서 홈트 루틴을 지켰습니다.
          금액 원문, 계좌, 카드, 토큰 정보는 게시글에 노출하지 않습니다.
        </Text>
        <View style={styles.attachmentRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLiked((value) => !value);
              setToast(liked ? "좋아요를 취소했어요." : "좋아요를 눌렀어요.");
            }}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              {liked ? "좋아요 취소" : "좋아요"}
            </Text>
          </Pressable>
          <SmallButton label="댓글" />
          <SmallButton label="공유" />
        </View>
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>댓글</Text>
        {postComments.map((comment) => (
          <ListRow key={comment} icon="💬" title="익명 사용자" meta={comment} />
        ))}
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

function SalaryHomeScreen(): React.ReactElement {
  const budgetApi = useMemo(() => createMobileBudgetApi(), []);
  const [expenseDraft, setExpenseDraft] = useState("");
  const [addedExpenses, setAddedExpenses] = useState<
    readonly VariableExpenseEntry[]
  >([]);
  const [toast, setToast] = useState(
    "서버 응답이 없을 때만 안전한 오프라인 미리보기를 보여줘요.",
  );
  const [prioritizeDailyBudget, setPrioritizeDailyBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

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

  const preview = calculateOfflineDailyBudgetPreview({
    addedExpenseAmounts: addedExpenses.map((item) => item.amount),
    baseMonthHijack: 1_927_000,
    baseMonthlyExpense: 773_000,
    baseSpentToday: 13_000,
    dailyLimit: 20_000,
  });
  const dailyLimit = preview.dailyLimit;
  const used = preview.spentToday;
  const remaining = preview.remainingToday;
  const allVariableExpenses = [...variableExpenses, ...addedExpenses];

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
          설정 20,000원 · 사용 {formatMoney(used)}원
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
        {fixedExpenses.map((item) => (
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

function PlanScreen(): React.ReactElement {
  const [salary, setSalary] = useState("2700000");
  const [expense, setExpense] = useState("773000");
  const [target, setTarget] = useState("2200000");
  const expectedHijack = Math.max(
    0,
    nonNegative(salary) - nonNegative(expense),
  );
  const achievement = Math.min(
    100,
    Math.round((expectedHijack / Math.max(1, nonNegative(target))) * 100),
  );

  return (
    <AppScreen title="계획" subtitle="급여 흐름을 먼저 분리해요">
      <SectionCard>
        <View style={styles.between}>
          <View>
            <Text style={styles.sectionTitle}>목표 달성률</Text>
            <Text style={styles.money}>{achievement}%</Text>
          </View>
          <StatusPill label="서버 기준" />
        </View>
        <ProgressBar value={achievement} />
        <Text style={styles.bodyText}>
          예상 납치금액 {formatMoney(expectedHijack)}원 · 목표{" "}
          {formatMoney(nonNegative(target))}원
        </Text>
      </SectionCard>
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
      <PlanSummaryCard
        title="고정저축"
        amount="650,000원"
        meta="급여 직후 자동 분리 · 납치금액 보호"
      />
      <PlanSummaryCard
        title="생활비"
        amount="900,000원"
        meta="하루 30,000원 기준 · 초과 시 알림"
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

function LevelScreen(): React.ReactElement {
  const [completed, setCompleted] = useState<ReadonlySet<string>>(
    () => new Set(["health"]),
  );
  const [toast, setToast] = useState(
    "오늘 완료한 미션 1/4 · 루틴을 끝내면 XP가 올라가요.",
  );
  const xp = 380 + Array.from(completed).length * 25;
  const progress = Math.min(100, (xp / 999) * 100);

  return (
    <AppScreen title="LV UP" subtitle="매일 조금씩 성장하는 루틴">
      <SectionCard>
        <View style={styles.between}>
          <View>
            <Text style={styles.sectionTitle}>현재 레벨</Text>
            <Text style={styles.money}>18Lv</Text>
          </View>
          <StatusPill label={`완료 ${completed.size}/4`} />
        </View>
        <ProgressBar value={progress} />
        <Text style={styles.bodyText}>
          {formatMoney(xp)} / 999 XP · 금융 앱 안의 가벼운 성장 루틴
        </Text>
      </SectionCard>
      <Toast message={toast} />
      <View style={styles.gridTwo}>
        {missions.map((mission) => {
          const done = completed.has(mission.id);
          return (
            <Pressable
              accessibilityRole="button"
              key={mission.id}
              onPress={() => {
                setCompleted((current) => new Set(current).add(mission.id));
                setToast(
                  `${mission.title} 완료! +${mission.xp} XP가 반영됐어요.`,
                );
              }}
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

function NotificationsScreen(): React.ReactElement {
  return (
    <AppScreen title="알림" subtitle="새로운 알림이 있어요">
      <SectionCard>
        <Text style={styles.sectionTitle}>중요 알림</Text>
        <ListRow
          icon="🏅"
          title="목표 달성"
          meta="누적 납치금액 5,780,000원 달성"
          unread
        />
        <ListRow
          icon={appIcons.warning}
          title="예산 초과 주의"
          meta="오늘 남은 예산이 0원 아래로 내려갈 수 있어요."
          unread
        />
        <ListRow
          icon={appIcons.reward}
          title="이벤트 포인트"
          meta="납치금액 달성 이벤트 500P 지급 예정"
        />
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>루틴 알림</Text>
        <ListRow
          icon={appIcons.reading}
          title="독서 루틴"
          meta="오늘 추천 도서를 10분만 읽어볼까요?"
        />
        <ListRow
          icon={appIcons.news}
          title="뉴스 루틴"
          meta="경제 뉴스 3개로 하루 감각을 열어요."
        />
        <ListRow
          icon={appIcons.english}
          title="영어 루틴"
          meta="출퇴근 5문장 듣기 미션이 기다려요."
        />
        <ListRow
          icon={appIcons.health}
          title="건강 루틴"
          meta="20분 홈트로 소비 통제 체력을 채워요."
        />
      </SectionCard>
      <GuardBox />
    </AppScreen>
  );
}

function CommunityScreen(): React.ReactElement {
  const [board, setBoard] = useState<CommunityBoard>("전체 게시판");
  const boards: readonly CommunityBoard[] = [
    "전체 게시판",
    "자유 게시판",
    "레벨업 인증",
    "취미 게시판",
  ];
  const filtered =
    board === "전체 게시판"
      ? communityPosts
      : communityPosts.filter((post) => post.board === board);

  return (
    <AppScreen title="커뮤니티" subtitle="가볍고 친근한 생활형 게시판">
      <PillRow
        items={boards}
        selected={board}
        onSelect={(next) => setBoard(next as CommunityBoard)}
      />
      <SectionCard>
        <Text style={styles.sectionTitle}>인기 게시글</Text>
        {communityPosts.slice(0, 3).map((post) => (
          <CommunityPostRow key={post.title} post={post} />
        ))}
      </SectionCard>
      <SectionCard>
        <Text style={styles.sectionTitle}>{board}</Text>
        {filtered.map((post) => (
          <CommunityPostRow key={`${board}-${post.title}`} post={post} />
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
  return (
    <AppScreen title="MY" subtitle="성과와 계정을 한곳에서 관리해요">
      <SectionCard>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>홍길동 기획자님</Text>
            <Text style={styles.bodyText}>
              급여 방어 루틴러 · 익명 커뮤니티 활동 중
            </Text>
          </View>
        </View>
        <View style={styles.attachmentRow}>
          <SmallButton label="프로필 설정" />
          <SmallButton label="계정 설정" />
        </View>
      </SectionCard>
      <MetricGrid
        metrics={[
          { label: "누적 납치금액", value: "5,780,000원" },
          { label: "레벨업 현황", value: "18Lv" },
          { label: "자기관리 성과", value: "4.2점" },
        ]}
      />
      <SectionCard>
        <Text style={styles.sectionTitle}>관리 메뉴</Text>
        <ListRow
          icon="📝"
          title="내 게시글 관리"
          meta="내가 쓴 글, 댓글, 인증글"
        />
        <ListRow
          icon={appIcons.level}
          title="내 레벨업 관리"
          meta="미션, 배지, 성장 기록"
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
        <SectionCard>
          <TextInput
            accessibilityLabel="이메일"
            autoCapitalize="none"
            inputMode="email"
            placeholder="이메일"
            placeholderTextColor={theme.color.text.disabled}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="비밀번호"
            placeholder="비밀번호"
            placeholderTextColor={theme.color.text.disabled}
            secureTextEntry
            style={styles.input}
          />
          <Pressable accessibilityRole="button" style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>로그인</Text>
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
  unread = false,
}: Readonly<{
  icon: string;
  title: string;
  meta: string;
  unread?: boolean;
}>): React.ReactElement {
  return (
    <View style={[styles.listRow, unread ? styles.unreadRow : null]}>
      <Text style={styles.listIcon}>{icon}</Text>
      <View style={styles.flex}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listMeta}>{meta}</Text>
      </View>
      {unread ? <View style={styles.greenDot} /> : null}
    </View>
  );
}

function CommunityPostRow({
  post,
}: Readonly<{ post: (typeof communityPosts)[number] }>): React.ReactElement {
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
}: Readonly<{ label: string }>): React.ReactElement {
  return (
    <Pressable accessibilityRole="button" style={styles.smallButton}>
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
