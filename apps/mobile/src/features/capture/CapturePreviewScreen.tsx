import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  AuthVisualFrame,
  EurekaWorldMark,
  LoginCredentialForm,
  LoginHero,
  SignupAgreementCard,
  SignupForm,
  SignupHero,
  SocialLoginButtons,
  SplashLaunchScreen,
  clampValue,
} from "../auth/components";

import {
  AppHeader,
  AppShell,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  ProgressBar,
  RecordInputCard,
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
} from "../../shared/components";
import { SalaryHomeScreen } from "../salary/components";
import { PlanScreen } from "../plan/components";
import {
  NotificationPreferenceStrip,
  NotificationScreen,
} from "../notifications/components";
import { ProfileDetailScreen } from "../profile/components";
import { CommunityCommentItem } from "../community/components/CommunityCommentItem";
import { CommunityPostCard } from "../community/components/CommunityPostCard";
import type {
  CommunityComment,
  CommunityPost,
} from "../community/community.types";

export type CapturePreviewKind =
  | "salary"
  | "plan"
  | "level"
  | "notifications"
  | "community"
  | "profile"
  | "login"
  | "splash"
  | "signup"
  | "community-write"
  | "profile-level"
  | "profile-settings"
  | "profile-account"
  | "profile-community"
  | "profile-support"
  | "profile-notices"
  | "community-post-detail"
  | "notification-settings"
  | "common-loading"
  | "common-empty"
  | "common-error"
  | "common-offline"
  | "terms-consent"
  | "expense-form-state"
  | "reading"
  | "news"
  | "english"
  | "health";

type CaptureMetric = Readonly<{
  label: string;
  value: string;
  tone?: "default" | "danger";
}>;

type CaptureContent = Readonly<{
  title: string;
  subtitle: string;
  heroLabel: string;
  heroAmount: string;
  body: string;
  primary: string;
  secondary: string;
  value: number;
  metrics: readonly CaptureMetric[];
  quickActions: readonly string[];
  detailRows: readonly string[];
}>;

const commonGuards = Object.freeze([
  "서버 기준으로 계산돼요",
  "민감 원문은 화면에 표시하지 않아요",
  "금융 금액은 광고 타겟팅에 쓰지 않아요",
]);

const contentByKind: Partial<Record<CapturePreviewKind, CaptureContent>> = {
  community: {
    body: "전체, 자유, 레벨업 인증, 취미 게시판을 민감정보 없이 탐색합니다.",
    detailRows: ["인기글", "최신글", "신고/숨김"],
    heroAmount: "128개",
    heroLabel: "오늘 올라온 안전 게시글",
    metrics: [
      { label: "전체", value: "72" },
      { label: "레벨업 인증", value: "31" },
      { label: "검수 대기", value: "5" },
    ],
    primary: "글쓰기",
    quickActions: ["전체", "자유", "레벨업 인증", "취미"],
    secondary: "문맥형 광고만 허용",
    subtitle: "커뮤니티",
    title: "커뮤니티",
    value: 62,
  },
  "community-write": {
    body: "제목, 본문, 첨부, 질문, 익명, 게시판 선택을 서버 검수 경계로 보냅니다.",
    detailRows: ["제목", "본문", "첨부", "게시판 선택", "질문", "익명"],
    heroAmount: "검수 후 게시",
    heroLabel: "민감정보 차단 글쓰기",
    metrics: [
      { label: "첨부", value: "이미지/문서" },
      { label: "게시판", value: "자유" },
      { label: "상태", value: "작성 중" },
    ],
    primary: "완료",
    quickActions: ["사진", "질문", "익명", "게시판 선택"],
    secondary: "계좌/연락처/급여 원문 차단",
    subtitle: "커뮤니티",
    title: "글쓰기",
    value: 44,
  },
  english: {
    body: "출근, 회의, 예산 주제의 짧은 영어 표현을 듣고 따라 말합니다.",
    detailRows: ["Listening", "Speaking", "Reading", "Writing"],
    heroAmount: "5문장",
    heroLabel: "오늘의 영어 루틴",
    metrics: [
      { label: "완료 XP", value: "30" },
      { label: "연속", value: "4일" },
      { label: "기록", value: "비공개" },
    ],
    primary: "문장 연습",
    quickActions: ["듣기", "말하기", "쓰기"],
    secondary: "업무 영어",
    subtitle: "LV UP",
    title: "영어",
    value: 50,
  },
  health: {
    body: "초보자 안전 범위의 5분, 10분, 20분 루틴과 통증 중단 안내를 보여줍니다.",
    detailRows: ["타이머", "세트", "반복", "통증 없음"],
    heroAmount: "10분",
    heroLabel: "오늘의 건강 루틴",
    metrics: [
      { label: "강도", value: "초급" },
      { label: "준비물", value: "없음" },
      { label: "안전", value: "확인" },
    ],
    primary: "운동 시작",
    quickActions: ["5분", "10분", "20분"],
    secondary: "의학적 진단 아님",
    subtitle: "LV UP",
    title: "건강",
    value: 58,
  },
  level: {
    body: "독서, 뉴스, 영어, 건강 미션 완료 시 상태와 XP가 서버 기록으로 반영됩니다.",
    detailRows: ["독서", "뉴스", "영어", "건강"],
    heroAmount: "1,240 XP",
    heroLabel: "이번 주 성장",
    metrics: [
      { label: "레벨", value: "LV 7" },
      { label: "오늘 완료", value: "2/4" },
      { label: "연속", value: "6일" },
    ],
    primary: "오늘의 미션",
    quickActions: ["독서", "뉴스", "영어", "건강"],
    secondary: "일일 XP cap 적용",
    subtitle: "LV UP",
    title: "레벨업",
    value: 78,
  },
  login: {
    body: "이메일, 비밀번호, 소셜 로그인, MFA 경계를 통과해 서버 세션을 확인합니다.",
    detailRows: ["이메일", "비밀번호", "카카오", "네이버", "Google", "Apple"],
    heroAmount: "안전 로그인",
    heroLabel: "토큰 원문 미노출",
    metrics: [
      { label: "세션", value: "서버 확인" },
      { label: "MFA", value: "지원" },
      { label: "자동 로그인", value: "선택" },
    ],
    primary: "로그인",
    quickActions: ["회원가입", "비밀번호 찾기"],
    secondary: "토큰 원문 미노출",
    subtitle: "인증",
    title: "로그인",
    value: 35,
  },
  news: {
    body: "서로 다른 관점의 뉴스 묶음을 비교하고 요약과 출처 링크만 기록합니다.",
    detailRows: ["시장/기업", "노동/복지", "중도/정책", "원문 링크"],
    heroAmount: "3관점",
    heroLabel: "오늘의 균형 읽기",
    metrics: [
      { label: "기사", value: "3개" },
      { label: "저장 원문", value: "없음" },
      { label: "완료 XP", value: "35" },
    ],
    primary: "균형 뉴스",
    quickActions: ["핵심 요약", "관점 비교", "생각 기록"],
    secondary: "출처 확인",
    subtitle: "LV UP",
    title: "뉴스",
    value: 54,
  },
  notifications: {
    body: "급여, 계좌, 토큰 원문 없이 성과, 예산, 커뮤니티 알림 상태만 표시합니다.",
    detailRows: ["예산 초과 주의", "루틴 리마인드", "댓글 알림"],
    heroAmount: "2개",
    heroLabel: "읽지 않은 알림",
    metrics: [
      { label: "푸시", value: "동의 필요" },
      { label: "조용한 시간", value: "ON" },
      { label: "원문 payload", value: "차단" },
    ],
    primary: "알림함",
    quickActions: ["전체", "성과", "이벤트", "커뮤니티"],
    secondary: "푸시 payload 안전",
    subtitle: "알림함",
    title: "알림",
    value: 40,
  },
  plan: {
    body: "급여 계획, 고정지출, 고정저축, 생활비 계산을 서버 결과 기준으로 저장합니다.",
    detailRows: ["급여 계획", "고정지출", "고정저축", "생활비"],
    heroAmount: "74%",
    heroLabel: "목표 달성률",
    metrics: [
      { label: "수령", value: "3,200,000원" },
      { label: "저축", value: "650,000원" },
      { label: "생활비", value: "42,000원" },
    ],
    primary: "계획 저장",
    quickActions: ["지출 추가", "저축 추가", "목표 수정"],
    secondary: "KRW 정수",
    subtitle: "계획",
    title: "계획",
    value: 68,
  },
  profile: {
    body: "프로필, 누적 성과, 개인정보 설정, 문의, 공지 메뉴를 카드로 이동합니다.",
    detailRows: ["내 게시글", "레벨업 기록", "개인정보", "고객지원"],
    heroAmount: "1,032,000원",
    heroLabel: "누적 납치금액",
    metrics: [
      { label: "레벨", value: "LV 7" },
      { label: "이번 달", value: "380,000원" },
      { label: "자기관리", value: "12회" },
    ],
    primary: "MY",
    quickActions: ["설정", "문의", "공지"],
    secondary: "개인정보 마스킹",
    subtitle: "마이페이지",
    title: "마이페이지",
    value: 72,
  },
  "profile-level": {
    body: "내 레벨과 XP, 주간 미션 진행도를 서버 기록으로 표시합니다.",
    detailRows: ["독서 완료", "뉴스 기록", "영어 연습", "건강 루틴"],
    heroAmount: "LV 7",
    heroLabel: "자기관리 레벨",
    metrics: [
      { label: "XP", value: "1240 / 1600" },
      { label: "연속", value: "6일" },
      { label: "완료", value: "9개" },
    ],
    primary: "성장 기록",
    quickActions: ["독서", "뉴스", "영어", "건강"],
    secondary: "1240 / 1600 XP",
    subtitle: "마이페이지",
    title: "내 레벨",
    value: 78,
  },
  reading: {
    body: "원문 전문 저장 없이 독서 미션, 요약, 기록 질문과 출처 링크를 제공합니다.",
    detailRows: ["AI 추천", "소설", "경제/경영", "인문/철학", "기타"],
    heroAmount: "5분",
    heroLabel: "오늘의 독서",
    metrics: [
      { label: "완료 XP", value: "30" },
      { label: "원문 저장", value: "없음" },
      { label: "기록", value: "비공개" },
    ],
    primary: "독서 시작",
    quickActions: ["요약", "미션", "기록"],
    secondary: "출처/저작권 확인",
    subtitle: "LV UP",
    title: "독서",
    value: 47,
  },
  salary: {
    body: "급여, 예산, 지출, 저축 계산은 서버 권한 결과만 보여줍니다.",
    detailRows: ["고정지출", "변동지출", "일일 예산", "제휴/광고"],
    heroAmount: "1,032,000원",
    heroLabel: "이번 달 지켜낸 돈",
    metrics: [
      { label: "이번 달 급여", value: "3,200,000원" },
      { label: "쓴 금액", value: "718,000원" },
      { label: "오늘 예산", value: "42,000원", tone: "default" },
    ],
    primary: "지출 추가",
    quickActions: ["식비", "교통", "카페", "기타"],
    secondary: "민감 금액 광고 미사용",
    subtitle: "급여",
    title: "급여 홈",
    value: 84,
  },
  signup: {
    body: "약관, 개인정보 동의, 이메일 확인을 서버 상태와 맞춥니다.",
    detailRows: ["이메일", "비밀번호", "필수 동의", "선택 동의"],
    heroAmount: "가입 준비",
    heroLabel: "서버 동의 기록",
    metrics: [
      { label: "필수 동의", value: "3개" },
      { label: "마케팅", value: "선택" },
      { label: "이메일", value: "확인" },
    ],
    primary: "회원가입",
    quickActions: ["로그인", "약관 보기"],
    secondary: "동의 기록 보존",
    subtitle: "인증",
    title: "가입",
    value: 30,
  },
  splash: {
    body: "서버 세션 상태를 확인하고 로그인 또는 급여 홈으로 이동합니다.",
    detailRows: ["로고", "세션 확인", "자동 이동", "안전 화면"],
    heroAmount: "급여납치",
    heroLabel: "SALARY HIJACKING",
    metrics: [
      { label: "스플래시", value: "1.2초" },
      { label: "강제 hide", value: "2.5초" },
      { label: "빈 화면", value: "방지" },
    ],
    primary: "시작",
    quickActions: ["로그인", "급여 홈"],
    secondary: "자동 전환",
    subtitle: "시작",
    title: "시작",
    value: 24,
  },
};

export type CapturePreviewScreenProps = Readonly<{
  kind: CapturePreviewKind;
}>;

export function CapturePreviewScreen({
  kind,
}: CapturePreviewScreenProps): React.ReactElement {
  if (kind === "splash") {
    return <SplashLaunchScreen routeDelayMs={1200} />;
  }

  if (kind === "login" || kind === "signup") {
    return <AuthCapturePreview kind={kind} />;
  }

  if (kind === "salary") {
    return <SalaryHomeScreen />;
  }

  if (kind === "plan") {
    return <PlanScreen />;
  }

  if (kind === "notifications") {
    return <NotificationScreen />;
  }

  if (kind === "profile-settings") {
    return <ProfileDetailScreen variant="settings" />;
  }

  if (kind === "profile-account") {
    return <ProfileDetailScreen variant="account" />;
  }

  if (kind === "profile-community") {
    return <ProfileDetailScreen variant="community" />;
  }

  if (kind === "profile-support") {
    return <ProfileDetailScreen variant="support" />;
  }

  if (kind === "profile-notices") {
    return <ProfileDetailScreen variant="notices" />;
  }

  if (kind === "community-post-detail") {
    return <CommunityPostDetailCapturePreview />;
  }

  if (kind === "notification-settings") {
    return <NotificationSettingsCapturePreview />;
  }

  if (kind === "common-loading") {
    return <CommonStateCapturePreview state="loading" />;
  }

  if (kind === "common-empty") {
    return <CommonStateCapturePreview state="empty" />;
  }

  if (kind === "common-error") {
    return <CommonStateCapturePreview state="error" />;
  }

  if (kind === "common-offline") {
    return <CommonStateCapturePreview state="offline" />;
  }

  if (kind === "terms-consent") {
    return <TermsConsentCapturePreview />;
  }

  if (kind === "expense-form-state") {
    return <ExpenseFormStateCapturePreview />;
  }

  const content = contentByKind[kind];
  if (!content) {
    return <CommonStateCapturePreview state="error" />;
  }

  return (
    <AppShell
      accessibilityLabel={`급여납치 캡처 ${kind}`}
      header={<AppHeader subtitle={content.subtitle} title={content.title} />}
    >
      <SurfaceCard accessibilityLabel={`${content.title} preview`}>
        <Text style={styles.kicker}>{content.heroLabel}</Text>
        <Text style={styles.heroAmount}>{content.heroAmount}</Text>
        <Text style={styles.body}>{content.body}</Text>
        <ProgressBar
          accessibilityLabel={`${content.title} progress`}
          value={content.value}
        />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{content.secondary}</Text>
          <Text style={styles.guard}>민감 원문 미표시</Text>
        </View>
      </SurfaceCard>

      <View style={styles.metricGrid}>
        {content.metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <SurfaceCard>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text
                style={[
                  styles.metricValue,
                  metric.tone === "danger" ? styles.dangerText : null,
                ]}
              >
                {metric.value}
              </Text>
            </SurfaceCard>
          </View>
        ))}
      </View>

      <View style={styles.pillRow}>
        {content.quickActions.map((action) => (
          <View key={action} style={styles.pill}>
            <Text style={styles.pillText}>{action}</Text>
          </View>
        ))}
      </View>

      <SurfaceCard accessibilityLabel={`${content.title} detail rows`}>
        <Text style={styles.sectionTitle}>핵심 기능</Text>
        {content.detailRows.map((row) => (
          <View key={row} style={styles.detailRow}>
            <Text style={styles.detailText}>{row}</Text>
            <Text style={styles.detailStatus}>준비됨</Text>
          </View>
        ))}
      </SurfaceCard>

      <PrimaryButton
        accessibilityLabel={`${content.title} primary action`}
        label={content.primary}
        onPress={() => undefined}
      />
      {commonGuards.map((guard) => (
        <Text key={guard} style={styles.guard}>
          {guard}
        </Text>
      ))}
    </AppShell>
  );
}

function AuthCapturePreview({
  kind,
}: Readonly<{ kind: "login" | "signup" }>): React.ReactElement {
  const { height } = useWindowDimensions();

  if (kind === "signup") {
    return (
      <AuthVisualFrame accessibilityLabel="급여납치 회원가입 화면 캡처">
        <View style={{ height: clampValue(height * 0.205, 96, 205) }} />
        <SignupHero />
        <View style={{ height: clampValue(height * 0.075, 32, 72) }} />
        <SignupForm onSubmit={() => undefined} />
        <View style={{ height: clampValue(height * 0.026, 14, 26) }} />
        <SignupAgreementCard
          marketingAccepted={false}
          privacyAccepted
          termsAccepted
        />
        <View
          style={{ flex: 1, minHeight: clampValue(height * 0.085, 48, 96) }}
        />
        <EurekaWorldMark />
        <View style={{ height: clampValue(height * 0.072, 38, 78) }} />
      </AuthVisualFrame>
    );
  }

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 로그인 화면 캡처">
      <View style={{ height: clampValue(height * 0.245, 118, 245) }} />
      <LoginHero />
      <View style={{ height: clampValue(height * 0.095, 42, 92) }} />
      <LoginCredentialForm onSubmit={() => undefined} />
      <View style={{ height: clampValue(height * 0.027, 16, 28) }} />
      <SocialLoginButtons
        onSelectProvider={() => undefined}
        onSignupPress={() => undefined}
      />
      <View
        style={{ flex: 1, minHeight: clampValue(height * 0.125, 68, 130) }}
      />
      <EurekaWorldMark />
      <View style={{ height: clampValue(height * 0.072, 38, 78) }} />
    </AuthVisualFrame>
  );
}

const communityDetailPost: CommunityPost = {
  adsFinancialTargetingUsed: false,
  anonymous: true,
  anonymousDisplayName: "익명 기획자",
  boardType: "LEVEL_CERTIFICATION",
  bodyPreview:
    "오늘 독서 미션을 완료하고 월 고정지출을 다시 점검했습니다. 민감한 급여 원문 없이 성장 기록만 공유합니다.",
  bookmarkCount: 8,
  bookmarkedByMe: false,
  commentCount: 2,
  createdAt: "2026-07-12T01:20:00.000Z",
  id: "capture-post-001",
  likeCount: 24,
  likedByMe: true,
  moderationStatus: "SAFE",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  shareCount: 4,
  title: "[LV.7] 독서 5일 완주, 예산 흔들림 없이 마감",
  updatedAt: "2026-07-12T01:20:00.000Z",
};

const communityDetailComments: readonly CommunityComment[] = [
  {
    anonymous: true,
    anonymousDisplayName: "익명 응원러",
    content:
      "좋아요. 다음 주기에도 같은 루틴으로 이어가면 충분히 안정적일 것 같아요.",
    createdAt: "2026-07-12T02:15:00.000Z",
    id: "capture-comment-001",
    likeCount: 3,
    likedByMe: false,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T02:15:00.000Z",
  },
  {
    anonymous: true,
    anonymousDisplayName: "익명 절약러",
    content:
      "개인 금액을 그대로 올리지 않고 비율로 공유한 점이 안전해서 좋습니다.",
    createdAt: "2026-07-12T03:10:00.000Z",
    id: "capture-comment-002",
    likeCount: 5,
    likedByMe: true,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T03:10:00.000Z",
  },
];

function CommunityPostDetailCapturePreview(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티 상세 화면 캡처"
      header={<AppHeader subtitle="커뮤니티" title="게시글 상세" />}
    >
      <CommunityPostCard
        liked
        onLike={() => undefined}
        onPress={() => undefined}
        post={communityDetailPost}
      />
      <SurfaceCard accessibilityLabel="게시글 본문">
        <Text style={styles.sectionTitle}>본문</Text>
        <Text style={styles.body}>
          오늘은 지출 원문을 공개하지 않고, 급여 납치 목표를 지키기 위해 독서와
          예산 점검을 함께 기록했습니다. 커뮤니티에는 개인정보와 금융 원천
          데이터를 올리지 않는 원칙을 지켰습니다.
        </Text>
        <View style={styles.pillRow}>
          {["#레벨업인증", "#예산점검", "#개인정보보호"].map((tag) => (
            <View key={tag} style={styles.pill}>
              <Text style={styles.pillText}>{tag}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="댓글 목록">
        <Text style={styles.sectionTitle}>댓글</Text>
        {communityDetailComments.map((comment) => (
          <CommunityCommentItem
            key={comment.id}
            comment={comment}
            onReport={() => undefined}
          />
        ))}
      </SurfaceCard>
    </AppShell>
  );
}

function NotificationSettingsCapturePreview(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="급여납치 알림 설정 화면 캡처"
      header={<AppHeader subtitle="알림" title="알림 설정" />}
    >
      <NotificationPreferenceStrip
        marketingEnabled={false}
        onMarkAllRead={() => undefined}
        pushEnabled
      />
      <SurfaceCard accessibilityLabel="알림 정책">
        <Text style={styles.sectionTitle}>수신 범위</Text>
        {[
          "급여일, 고정지출, 예산 임박 알림은 서비스 필수 알림으로 분리",
          "이벤트와 제휴 알림은 마케팅 동의가 있을 때만 발송",
          "알림 payload에는 급여와 지출 원문을 포함하지 않음",
        ].map((row) => (
          <View key={row} style={styles.detailRow}>
            <Text style={styles.detailText}>{row}</Text>
            <Text style={styles.detailStatus}>보호</Text>
          </View>
        ))}
      </SurfaceCard>
    </AppShell>
  );
}

function CommonStateCapturePreview({
  state,
}: Readonly<{
  state: "loading" | "empty" | "error" | "offline";
}>): React.ReactElement {
  const stateTitle = {
    empty: "빈 상태",
    error: "오류 상태",
    loading: "로딩 상태",
    offline: "오프라인 상태",
  }[state];

  return (
    <AppShell
      accessibilityLabel={`급여납치 공통 ${stateTitle} 화면 캡처`}
      header={<AppHeader subtitle="공통 상태" title={stateTitle} />}
    >
      <SurfaceCard accessibilityLabel={stateTitle}>
        {state === "loading" ? (
          <LoadingSkeleton label="서버 기준 데이터를 불러오는 중" />
        ) : null}
        {state === "empty" ? (
          <EmptyState
            description="아직 저장된 기록이 없습니다. 추가 버튼으로 첫 항목을 만들 수 있습니다."
            title="표시할 항목이 없어요"
          />
        ) : null}
        {state === "error" ? (
          <ErrorState
            message="요청이 실패했습니다. 민감 정보 없이 다시 시도할 수 있습니다."
            onRetry={() => undefined}
            title="데이터를 불러오지 못했어요"
          />
        ) : null}
        {state === "offline" ? (
          <ErrorState
            message="네트워크가 불안정합니다. 저장 성공으로 표시하지 않고 재시도 상태를 유지합니다."
            onRetry={() => undefined}
            retryLabel="다시 연결"
            title="오프라인 보호 모드"
          />
        ) : null}
      </SurfaceCard>
      <Text style={styles.guard}>
        보호 화면은 실제 저장 성공값처럼 표시하지 않습니다.
      </Text>
    </AppShell>
  );
}

function TermsConsentCapturePreview(): React.ReactElement {
  return (
    <AuthVisualFrame accessibilityLabel="급여납치 약관 동의 화면 캡처">
      <View style={{ height: 96 }} />
      <SignupHero />
      <View style={{ height: 40 }} />
      <SignupAgreementCard
        marketingAccepted={false}
        privacyAccepted
        termsAccepted
      />
      <View style={{ height: 24 }} />
      <PrimaryButton label="필수 동의 후 계속" onPress={() => undefined} />
      <View style={{ flex: 1, minHeight: 96 }} />
      <EurekaWorldMark />
      <View style={{ height: 48 }} />
    </AuthVisualFrame>
  );
}

function ExpenseFormStateCapturePreview(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="급여납치 변동지출 입력 화면 캡처"
      header={<AppHeader subtitle="급여" title="금일 변동 지출 저장" />}
    >
      <SurfaceCard accessibilityLabel="입력 안내">
        <Text style={styles.sectionTitle}>금일 사용한 변동 지출</Text>
        <Text style={styles.body}>
          항목, 세부 내용, 금액을 입력한 뒤 서버 저장 성공 기준으로 홈 요약을
          갱신합니다.
        </Text>
      </SurfaceCard>
      <RecordInputCard
        label="지출 내용"
        onChangeText={() => undefined}
        onSubmit={() => undefined}
        placeholder="예: 커피 / 백다방 아이스 아메리카노 / 2,000원"
        value={"커피\n백다방 아이스 아메리카노\n2,000원"}
      />
      <Text style={styles.guard}>
        키보드가 열려도 입력 필드와 저장 버튼은 safe area 안에 유지됩니다.
      </Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: componentColors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
  },
  dangerText: {
    color: componentColors.dangerRed,
  },
  detailRow: {
    alignItems: "center",
    borderTopColor: componentColors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: componentSpacing.sm,
  },
  detailStatus: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  detailText: {
    color: componentColors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  heroAmount: {
    color: componentColors.textPrimary,
    fontSize: componentTypography.heroAmount,
    fontWeight: "900",
  },
  kicker: {
    color: componentColors.primaryGreenDark,
    fontSize: 13,
    fontWeight: "900",
  },
  meta: {
    color: componentColors.textSecondary,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    padding: componentSpacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  metricLabel: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  metricValue: {
    color: componentColors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  pill: {
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: componentRadius.pill,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.sm,
  },
  pillText: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  sectionTitle: {
    color: componentColors.textPrimary,
    fontSize: componentTypography.sectionTitle,
    fontWeight: "900",
  },
});
