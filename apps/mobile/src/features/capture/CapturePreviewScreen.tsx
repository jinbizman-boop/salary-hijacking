import {
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import {
  AuthVisualFrame,
  EurekaWorldMark,
  ForgotPasswordForm,
  LoginCredentialForm,
  LoginHero,
  PasswordRecoveryHero,
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
  BottomSheet,
  ConfirmDialog,
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
import { resolveCaptureKindForStitchSlug } from "./stitch-state-registry";
import {
  NotificationPreferenceStrip,
  NotificationScreen,
} from "../notifications/components";
import { ProfileDetailScreen } from "../profile/components";
import { CommunityCommentItem } from "../community/components/CommunityCommentItem";
import { CommunityPostCard } from "../community/components/CommunityPostCard";
import { CommunityWriteForm } from "../community/components/CommunityWriteForm";
import type {
  CommunityComment,
  CommunityPost,
  CommunityPostDraft,
} from "../community/community.types";
import { validatePostDraft } from "../community/community.validators";

export type CapturePreviewKind =
  | "salary"
  | "salary-no-plan"
  | "salary-compact"
  | "salary-detailed"
  | "salary-offline"
  | "plan"
  | "plan-current-summary"
  | "plan-budget-summary-alt"
  | "plan-salary-info-edit"
  | "plan-previous-picker"
  | "plan-empty"
  | "plan-budget-detail-summary"
  | "plan-validation-warning"
  | "level"
  | "notifications"
  | "notifications-empty"
  | "notifications-offline"
  | "notifications-error"
  | "notifications-all-read"
  | "notifications-no-unread-list"
  | "community"
  | "community-state-board-ko"
  | "community-state-board-en-tabs"
  | "community-offline-moderation-board"
  | "community-state-board"
  | "community-hobby-board"
  | "community-levelup-board"
  | "community-search-results"
  | "community-free-board-alt"
  | "profile"
  | "login"
  | "login-credential-error"
  | "login-password-recovery"
  | "login-logout-complete"
  | "splash"
  | "signup"
  | "signup-account-info"
  | "signup-social-info"
  | "signup-welcome"
  | "signup-phone-number-step"
  | "signup-password-creation"
  | "signup-identity-verification"
  | "signup-account-info-alt"
  | "signup-complete"
  | "onboarding-salary-amount-keypad"
  | "onboarding-expected-salary-step"
  | "onboarding-intro-alt"
  | "onboarding-daily-budget-step"
  | "onboarding-plan-review"
  | "onboarding-payday-step"
  | "onboarding-complete"
  | "onboarding-fixed-expense-step"
  | "onboarding-fixed-savings-step"
  | "community-write"
  | "community-write-attachments"
  | "community-write-sensitive-warning"
  | "community-write-restricted"
  | "community-write-draft"
  | "community-write-draft-recovery"
  | "community-write-from-levelup"
  | "community-write-validation"
  | "community-write-question-anonymous"
  | "community-comments-load-error"
  | "community-comment-delete-confirm"
  | "community-comment-edit"
  | "community-reply-compose"
  | "community-replies-expanded"
  | "community-block-user-confirm"
  | "community-comment-list"
  | "community-comments-loading-more"
  | "community-comment-submitting"
  | "community-comment-thread"
  | "community-comment-thread-alt"
  | "community-no-comments"
  | "community-comment-thread-policy"
  | "profile-level"
  | "profile-settings"
  | "profile-account"
  | "profile-performance-partial-error"
  | "profile-offline-performance-preview"
  | "profile-page-load-error"
  | "profile-page-account-restricted"
  | "profile-my-page-alt"
  | "profile-my-page-legacy"
  | "profile-ad-hidden"
  | "profile-loading-skeleton"
  | "profile-account-restricted"
  | "profile-data-export-ready"
  | "profile-withdrawal-requested"
  | "profile-biometric-app-lock"
  | "profile-withdrawal-reason"
  | "profile-rejoin-blocked"
  | "profile-data-export-processing"
  | "profile-withdrawal-precheck"
  | "profile-privacy-usage-history"
  | "profile-data-export-request"
  | "profile-password-change"
  | "profile-account-settings-default"
  | "profile-community"
  | "profile-settings-validation-error"
  | "profile-settings-save-failure"
  | "profile-settings-alt"
  | "profile-visibility-sheet"
  | "profile-image-delete-confirm"
  | "profile-uploading"
  | "profile-job-selector"
  | "profile-posts-loading-skeleton"
  | "profile-posts-offline"
  | "profile-posts-offline-alt"
  | "profile-liked-posts"
  | "profile-drafts"
  | "profile-share-certification-prompt"
  | "profile-community-restricted"
  | "profile-shared-certification-detail"
  | "profile-post-search-empty"
  | "profile-post-management-default"
  | "profile-written-posts-empty"
  | "my-levelup-activity-records"
  | "my-levelup-record-detail"
  | "my-levelup-empty-records"
  | "my-levelup-statistics"
  | "my-levelup-offline-records"
  | "my-levelup-xp-history"
  | "inquiry-detail-answered"
  | "inquiry-empty"
  | "inquiry-detail-pending"
  | "inquiry-offline-preview"
  | "inquiry-submitted"
  | "inquiry-create"
  | "profile-support"
  | "profile-notices"
  | "notice-event-detail"
  | "notice-ended-event-detail"
  | "notice-privacy-policy-change"
  | "notice-maintenance-detail"
  | "notice-offline-list"
  | "notice-unavailable"
  | "notice-app-update-detail"
  | "notice-empty"
  | "community-post-detail"
  | "community-post-offline"
  | "community-post-comment-restricted"
  | "community-post-own-menu"
  | "community-post-blocked"
  | "community-post-hidden"
  | "community-post-load-error"
  | "community-post-sensitive-warning"
  | "community-post-review-pending"
  | "community-post-hobby"
  | "community-post-deleted"
  | "community-post-restricted"
  | "notification-settings"
  | "common-loading"
  | "common-empty"
  | "common-error"
  | "common-offline"
  | "fixed-expense-form"
  | "fixed-expense-saving"
  | "fixed-expense-edit-inactive"
  | "fixed-expense-save-failure"
  | "fixed-expense-register"
  | "fixed-expense-add-detailed"
  | "fixed-expense-edit"
  | "fixed-saving-form"
  | "fixed-saving-add-goal"
  | "fixed-saving-add-savings-goal"
  | "fixed-saving-add-investment"
  | "fixed-saving-saving"
  | "fixed-saving-save-failure"
  | "fixed-saving-edit-savings"
  | "fixed-saving-edit-inactive"
  | "fixed-saving-delete-confirm"
  | "living-cost-form"
  | "living-cost-save-failure"
  | "living-cost-saving"
  | "living-cost-settings"
  | "living-cost-alt"
  | "living-cost-weekday-weekend"
  | "living-cost-saving-alt"
  | "terms-consent"
  | "terms-ad-data-separation-policy"
  | "terms-detailed-consent"
  | "terms-fulltext"
  | "terms-personalized-ads-consent"
  | "terms-consent-alt"
  | "terms-review"
  | "expense-form-state"
  | "expense-form-edit"
  | "expense-form-refund"
  | "expense-form-validation"
  | "expense-delete-blocked"
  | "expense-invalidate-reason"
  | "payroll-amount-validation-error"
  | "salary-amount-check"
  | "amount-input-error"
  | "monthly-budget-over-limit"
  | "expense-delete-confirm-alt"
  | "deletion-processing"
  | "plan-save-success"
  | "plan-save-success-alt"
  | "budget-plan-warning"
  | "daily-budget-overrun"
  | "english-levelup-share"
  | "reading-levelup"
  | "levelup-celebration"
  | "levelup-result"
  | "certification-share-review"
  | "share-standard-blocked"
  | "levelup-share-review"
  | "comment-report-reason"
  | "post-report-reason"
  | "report-reason-selector"
  | "report-result-board"
  | "comment-report-success"
  | "date-selection-collection"
  | "recurrence-selector"
  | "file-photo-attachment"
  | "post-menu-collection"
  | "sort-filter"
  | "visibility-selector"
  | "draft-exit-state-board"
  | "device-permission-guide"
  | "post-registration-result-board"
  | "withdrawal-final-confirm"
  | "modal-confirm"
  | "modal-level-result"
  | "news-mission-complete"
  | "health-already-complete"
  | "news-already-complete"
  | "reading-already-complete"
  | "workout-record-complete"
  | "mission-complete-xp"
  | "xp-result-state-board"
  | "bottom-sheet-category"
  | "reading"
  | "reading-source-unavailable"
  | "reading-certification-share-review"
  | "reading-book-detail"
  | "reading-flow"
  | "reading-record-flow"
  | "reading-recommendation-error-empty"
  | "reading-start-confirm"
  | "reading-in-progress"
  | "news"
  | "news-mission-flow"
  | "news-share-review"
  | "news-offline-preview"
  | "news-flow"
  | "news-record-input"
  | "news-content-load-error"
  | "news-issue-detail"
  | "english"
  | "english-daily-detail"
  | "english-learning-flow"
  | "english-record-success-flow"
  | "english-learning-session-flow"
  | "health"
  | "health-safety-check"
  | "health-offline-cached"
  | "health-workout-detail"
  | "health-safety-unavailable"
  | "health-content-load-error"
  | "health-workout-in-progress"
  | "health-workout-flow"
  | "health-workout-record"
  | "health-flow"
  | "level-mission-status-board"
  | "level-record-pending"
  | "level-mission-start-confirm"
  | "level-quick-mission-detail"
  | "level-load-error"
  | "level-no-content"
  | "level-all-daily-complete"
  | "level-main-default"
  | "level-mission-progress"
  | "level-recommendations";

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

export function resolveCapturePreviewKind(
  screen: string,
): CapturePreviewKind | null {
  const normalized = screen.trim();
  if (!/^[A-Za-z0-9_-]{1,96}$/u.test(normalized)) return null;
  return (
    resolveCaptureKindForStitchSlug(normalized) ??
    (normalized as CapturePreviewKind)
  );
}

export function CapturePreviewScreen({
  kind,
}: CapturePreviewScreenProps): React.ReactElement {
  if (kind === "splash") {
    return <SplashLaunchScreen routeDelayMs={1200} />;
  }

  if (
    kind === "login" ||
    kind === "login-credential-error" ||
    kind === "login-password-recovery" ||
    kind === "login-logout-complete" ||
    kind === "signup"
  ) {
    return <AuthCapturePreview kind={kind} />;
  }

  if (
    kind === "signup-account-info" ||
    kind === "signup-social-info" ||
    kind === "signup-welcome" ||
    kind === "signup-phone-number-step" ||
    kind === "signup-password-creation" ||
    kind === "signup-identity-verification" ||
    kind === "signup-account-info-alt" ||
    kind === "signup-complete"
  ) {
    return <SignupStateCapturePreview variant={kind} />;
  }

  if (
    kind === "onboarding-salary-amount-keypad" ||
    kind === "onboarding-expected-salary-step" ||
    kind === "onboarding-intro-alt" ||
    kind === "onboarding-daily-budget-step" ||
    kind === "onboarding-plan-review" ||
    kind === "onboarding-payday-step" ||
    kind === "onboarding-complete" ||
    kind === "onboarding-fixed-expense-step" ||
    kind === "onboarding-fixed-savings-step"
  ) {
    return <OnboardingStateCapturePreview variant={kind} />;
  }

  if (kind === "salary") {
    return <SalaryHomeScreen />;
  }

  if (kind === "salary-no-plan") {
    return <SalaryHomeScreen previewVariant="no-plan" />;
  }

  if (kind === "salary-compact") {
    return <SalaryHomeScreen previewVariant="compact" />;
  }

  if (kind === "salary-detailed") {
    return <SalaryHomeScreen previewVariant="detailed" />;
  }

  if (kind === "salary-offline") {
    return <SalaryHomeScreen previewVariant="offline" />;
  }

  if (kind === "plan") {
    return <PlanScreen />;
  }

  if (
    kind === "plan-current-summary" ||
    kind === "plan-budget-summary-alt" ||
    kind === "plan-salary-info-edit" ||
    kind === "plan-previous-picker" ||
    kind === "plan-empty" ||
    kind === "plan-budget-detail-summary" ||
    kind === "plan-validation-warning"
  ) {
    return <PlanStateCapturePreview variant={kind} />;
  }

  if (kind === "notifications") {
    return <NotificationScreen />;
  }

  if (kind === "notifications-empty") {
    return <NotificationScreen variant="empty" />;
  }

  if (kind === "notifications-offline") {
    return <NotificationScreen variant="offline" />;
  }

  if (kind === "notifications-error") {
    return <NotificationScreen variant="error" />;
  }

  if (kind === "notifications-all-read") {
    return <NotificationScreen variant="all-read" />;
  }

  if (kind === "notifications-no-unread-list") {
    return <NotificationScreen variant="no-unread-with-list" />;
  }

  if (kind === "profile-settings") {
    return <ProfileDetailScreen variant="settings" />;
  }

  if (kind === "profile-account") {
    return <ProfileDetailScreen variant="account" />;
  }

  if (
    kind === "profile-performance-partial-error" ||
    kind === "profile-offline-performance-preview" ||
    kind === "profile-page-load-error" ||
    kind === "profile-page-account-restricted" ||
    kind === "profile-my-page-alt" ||
    kind === "profile-my-page-legacy" ||
    kind === "profile-ad-hidden" ||
    kind === "profile-loading-skeleton"
  ) {
    return <ProfilePageStateCapturePreview variant={kind} />;
  }

  if (
    kind === "profile-settings-validation-error" ||
    kind === "profile-settings-save-failure" ||
    kind === "profile-settings-alt" ||
    kind === "profile-visibility-sheet" ||
    kind === "profile-image-delete-confirm" ||
    kind === "profile-uploading" ||
    kind === "profile-job-selector"
  ) {
    return <ProfileSettingsStateCapturePreview variant={kind} />;
  }

  if (
    kind === "profile-account-restricted" ||
    kind === "profile-data-export-ready" ||
    kind === "profile-withdrawal-requested" ||
    kind === "profile-biometric-app-lock" ||
    kind === "profile-withdrawal-reason" ||
    kind === "profile-rejoin-blocked" ||
    kind === "profile-data-export-processing" ||
    kind === "profile-withdrawal-precheck" ||
    kind === "profile-privacy-usage-history" ||
    kind === "profile-data-export-request" ||
    kind === "profile-password-change" ||
    kind === "profile-account-settings-default"
  ) {
    return <ProfileAccountStateCapturePreview variant={kind} />;
  }

  if (kind === "profile-community") {
    return <ProfileDetailScreen variant="community" />;
  }

  if (
    kind === "profile-posts-loading-skeleton" ||
    kind === "profile-posts-offline" ||
    kind === "profile-posts-offline-alt" ||
    kind === "profile-liked-posts" ||
    kind === "profile-drafts" ||
    kind === "profile-share-certification-prompt" ||
    kind === "profile-community-restricted" ||
    kind === "profile-shared-certification-detail" ||
    kind === "profile-post-search-empty" ||
    kind === "profile-post-management-default" ||
    kind === "profile-written-posts-empty"
  ) {
    return <ProfilePostStateCapturePreview variant={kind} />;
  }

  if (
    kind === "my-levelup-activity-records" ||
    kind === "my-levelup-record-detail" ||
    kind === "my-levelup-empty-records" ||
    kind === "my-levelup-statistics" ||
    kind === "my-levelup-offline-records" ||
    kind === "my-levelup-xp-history"
  ) {
    return <MyLevelUpStateCapturePreview variant={kind} />;
  }

  if (
    kind === "inquiry-detail-answered" ||
    kind === "inquiry-empty" ||
    kind === "inquiry-detail-pending" ||
    kind === "inquiry-offline-preview" ||
    kind === "inquiry-submitted" ||
    kind === "inquiry-create"
  ) {
    return <InquiryStateCapturePreview variant={kind} />;
  }

  if (kind === "profile-support") {
    return <ProfileDetailScreen variant="support" />;
  }

  if (kind === "profile-notices") {
    return <ProfileDetailScreen variant="notices" />;
  }

  if (
    kind === "notice-event-detail" ||
    kind === "notice-ended-event-detail" ||
    kind === "notice-privacy-policy-change" ||
    kind === "notice-maintenance-detail" ||
    kind === "notice-offline-list" ||
    kind === "notice-unavailable" ||
    kind === "notice-app-update-detail" ||
    kind === "notice-empty"
  ) {
    return <NoticeStateCapturePreview variant={kind} />;
  }

  if (
    kind === "community-state-board-ko" ||
    kind === "community-state-board-en-tabs" ||
    kind === "community-offline-moderation-board" ||
    kind === "community-state-board" ||
    kind === "community-hobby-board" ||
    kind === "community-levelup-board" ||
    kind === "community-search-results" ||
    kind === "community-free-board-alt"
  ) {
    return <CommunityBoardStateCapturePreview variant={kind} />;
  }

  if (
    kind === "community-post-detail" ||
    kind === "community-post-offline" ||
    kind === "community-post-comment-restricted" ||
    kind === "community-post-own-menu" ||
    kind === "community-post-blocked" ||
    kind === "community-post-hidden" ||
    kind === "community-post-load-error" ||
    kind === "community-post-sensitive-warning" ||
    kind === "community-post-review-pending" ||
    kind === "community-post-hobby" ||
    kind === "community-post-deleted" ||
    kind === "community-post-restricted"
  ) {
    return <CommunityPostDetailCapturePreview variant={kind} />;
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

  if (kind === "fixed-expense-form") {
    return <PlanFormStateCapturePreview variant="fixedExpense" />;
  }

  if (
    kind === "fixed-expense-saving" ||
    kind === "fixed-expense-edit-inactive" ||
    kind === "fixed-expense-save-failure" ||
    kind === "fixed-expense-register" ||
    kind === "fixed-expense-add-detailed" ||
    kind === "fixed-expense-edit"
  ) {
    return <FixedExpenseFormStateCapturePreview variant={kind} />;
  }

  if (kind === "fixed-saving-form") {
    return <PlanFormStateCapturePreview variant="fixedSaving" />;
  }

  if (
    kind === "fixed-saving-add-goal" ||
    kind === "fixed-saving-add-savings-goal" ||
    kind === "fixed-saving-add-investment" ||
    kind === "fixed-saving-saving" ||
    kind === "fixed-saving-save-failure" ||
    kind === "fixed-saving-edit-savings" ||
    kind === "fixed-saving-edit-inactive" ||
    kind === "fixed-saving-delete-confirm"
  ) {
    return <FixedSavingFormStateCapturePreview variant={kind} />;
  }

  if (kind === "living-cost-form") {
    return <PlanFormStateCapturePreview variant="livingCost" />;
  }

  if (
    kind === "living-cost-save-failure" ||
    kind === "living-cost-saving" ||
    kind === "living-cost-settings" ||
    kind === "living-cost-alt" ||
    kind === "living-cost-weekday-weekend" ||
    kind === "living-cost-saving-alt"
  ) {
    return <LivingCostStateCapturePreview variant={kind} />;
  }

  if (kind === "terms-consent") {
    return <TermsConsentCapturePreview />;
  }

  if (
    kind === "terms-ad-data-separation-policy" ||
    kind === "terms-detailed-consent" ||
    kind === "terms-fulltext" ||
    kind === "terms-personalized-ads-consent" ||
    kind === "terms-consent-alt" ||
    kind === "terms-review"
  ) {
    return <TermsConsentStateCapturePreview variant={kind} />;
  }

  if (kind === "expense-form-state") {
    return <ExpenseFormStateCapturePreview />;
  }

  if (
    kind === "expense-form-edit" ||
    kind === "expense-form-refund" ||
    kind === "expense-form-validation" ||
    kind === "expense-delete-blocked" ||
    kind === "expense-invalidate-reason"
  ) {
    return <ExpenseFormVariantCapturePreview variant={kind} />;
  }

  if (kind === "modal-confirm") {
    return <ModalConfirmCapturePreview />;
  }

  if (
    kind === "payroll-amount-validation-error" ||
    kind === "salary-amount-check" ||
    kind === "amount-input-error" ||
    kind === "monthly-budget-over-limit"
  ) {
    return <AmountInputErrorDialogCapturePreview variant={kind} />;
  }

  if (
    kind === "expense-delete-confirm-alt" ||
    kind === "deletion-processing" ||
    kind === "plan-save-success" ||
    kind === "plan-save-success-alt" ||
    kind === "budget-plan-warning" ||
    kind === "daily-budget-overrun"
  ) {
    return <PlanExpenseModalCapturePreview variant={kind} />;
  }

  if (
    kind === "english-levelup-share" ||
    kind === "reading-levelup" ||
    kind === "levelup-celebration" ||
    kind === "levelup-result"
  ) {
    return <LevelUpResultModalCapturePreview variant={kind} />;
  }

  if (
    kind === "certification-share-review" ||
    kind === "share-standard-blocked" ||
    kind === "levelup-share-review" ||
    kind === "comment-report-reason" ||
    kind === "post-report-reason" ||
    kind === "report-reason-selector" ||
    kind === "report-result-board" ||
    kind === "comment-report-success" ||
    kind === "date-selection-collection" ||
    kind === "recurrence-selector" ||
    kind === "file-photo-attachment" ||
    kind === "post-menu-collection" ||
    kind === "sort-filter" ||
    kind === "visibility-selector" ||
    kind === "draft-exit-state-board" ||
    kind === "device-permission-guide" ||
    kind === "post-registration-result-board" ||
    kind === "withdrawal-final-confirm"
  ) {
    return <RemainingOverlayCapturePreview variant={kind} />;
  }

  if (kind === "modal-level-result") {
    return <ModalLevelResultCapturePreview />;
  }

  if (
    kind === "news-mission-complete" ||
    kind === "health-already-complete" ||
    kind === "news-already-complete" ||
    kind === "reading-already-complete" ||
    kind === "workout-record-complete" ||
    kind === "mission-complete-xp" ||
    kind === "xp-result-state-board"
  ) {
    return <MissionCompleteModalCapturePreview variant={kind} />;
  }

  if (kind === "bottom-sheet-category") {
    return <BottomSheetCategoryCapturePreview />;
  }

  if (
    kind === "english-daily-detail" ||
    kind === "english-learning-flow" ||
    kind === "english-record-success-flow" ||
    kind === "english-learning-session-flow"
  ) {
    return <EnglishStateCapturePreview variant={kind} />;
  }

  if (
    kind === "health-safety-check" ||
    kind === "health-offline-cached" ||
    kind === "health-workout-detail" ||
    kind === "health-safety-unavailable" ||
    kind === "health-content-load-error" ||
    kind === "health-workout-in-progress" ||
    kind === "health-workout-flow" ||
    kind === "health-workout-record" ||
    kind === "health-flow"
  ) {
    return <HealthStateCapturePreview variant={kind} />;
  }

  if (
    kind === "level-mission-status-board" ||
    kind === "level-record-pending" ||
    kind === "level-mission-start-confirm" ||
    kind === "level-quick-mission-detail" ||
    kind === "level-load-error" ||
    kind === "level-no-content" ||
    kind === "level-all-daily-complete" ||
    kind === "level-main-default" ||
    kind === "level-mission-progress" ||
    kind === "level-recommendations"
  ) {
    return <LevelStateCapturePreview variant={kind} />;
  }

  if (
    kind === "reading-source-unavailable" ||
    kind === "reading-certification-share-review" ||
    kind === "reading-book-detail" ||
    kind === "reading-flow" ||
    kind === "reading-record-flow" ||
    kind === "reading-recommendation-error-empty" ||
    kind === "reading-start-confirm" ||
    kind === "reading-in-progress"
  ) {
    return <ReadingStateCapturePreview variant={kind} />;
  }

  if (
    kind === "news-mission-flow" ||
    kind === "news-share-review" ||
    kind === "news-offline-preview" ||
    kind === "news-flow" ||
    kind === "news-record-input" ||
    kind === "news-content-load-error" ||
    kind === "news-issue-detail"
  ) {
    return <NewsStateCapturePreview variant={kind} />;
  }

  if (
    kind === "community-write" ||
    kind === "community-write-attachments" ||
    kind === "community-write-sensitive-warning" ||
    kind === "community-write-restricted" ||
    kind === "community-write-draft" ||
    kind === "community-write-draft-recovery" ||
    kind === "community-write-from-levelup" ||
    kind === "community-write-validation" ||
    kind === "community-write-question-anonymous"
  ) {
    return <CommunityWriteCapturePreview variant={kind} />;
  }

  if (
    kind === "community-comments-load-error" ||
    kind === "community-comment-delete-confirm" ||
    kind === "community-comment-edit" ||
    kind === "community-reply-compose" ||
    kind === "community-replies-expanded" ||
    kind === "community-block-user-confirm" ||
    kind === "community-comment-list" ||
    kind === "community-comments-loading-more" ||
    kind === "community-comment-submitting" ||
    kind === "community-comment-thread" ||
    kind === "community-comment-thread-alt" ||
    kind === "community-no-comments" ||
    kind === "community-comment-thread-policy"
  ) {
    return <CommunityCommentCapturePreview variant={kind} />;
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
}: Readonly<{
  kind:
    | "login"
    | "login-credential-error"
    | "login-password-recovery"
    | "login-logout-complete"
    | "signup";
}>): React.ReactElement {
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

  if (kind === "login-password-recovery") {
    return (
      <AuthVisualFrame accessibilityLabel="급여납치 비밀번호 찾기 화면 캡처">
        <View style={{ height: clampValue(height * 0.14, 72, 148) }} />
        <LoginHero />
        <View style={{ height: clampValue(height * 0.052, 24, 54) }} />
        <PasswordRecoveryHero mode="forgot" />
        <View style={{ height: clampValue(height * 0.024, 14, 24) }} />
        <ForgotPasswordForm onSubmit={() => undefined} />
        <View
          style={{ flex: 1, minHeight: clampValue(height * 0.085, 48, 96) }}
        />
        <EurekaWorldMark />
        <View style={{ height: clampValue(height * 0.06, 34, 68) }} />
      </AuthVisualFrame>
    );
  }

  const stateMessage =
    kind === "login-credential-error"
      ? "로그인 요청을 완료하지 못했습니다."
      : kind === "login-logout-complete"
        ? "로그아웃되었습니다."
        : null;
  const stateDescription =
    kind === "login-credential-error"
      ? "아이디, 비밀번호, 네트워크 상태를 확인해 주세요."
      : kind === "login-logout-complete"
        ? "다시 로그인하면 급여 계획을 이어서 볼 수 있어요."
        : null;

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 로그인 화면 캡처">
      <View style={{ height: clampValue(height * 0.245, 118, 245) }} />
      <LoginHero />
      <View style={{ height: clampValue(height * 0.095, 42, 92) }} />
      <LoginCredentialForm onSubmit={() => undefined} />
      {stateMessage ? (
        <View style={styles.authStateMessage}>
          <Text style={styles.authStateTitle}>{stateMessage}</Text>
          {stateDescription ? (
            <Text style={styles.authStateDescription}>{stateDescription}</Text>
          ) : null}
        </View>
      ) : null}
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

type SignupStateCaptureKind = Extract<
  CapturePreviewKind,
  | "signup-account-info"
  | "signup-social-info"
  | "signup-welcome"
  | "signup-phone-number-step"
  | "signup-password-creation"
  | "signup-identity-verification"
  | "signup-account-info-alt"
  | "signup-complete"
>;

const signupStateContent: Record<
  SignupStateCaptureKind,
  Readonly<{
    title: string;
    description: string;
    step: string;
    fields: readonly string[];
    action: string;
    footer: string;
    success?: boolean;
  }>
> = {
  "signup-account-info": {
    action: "다음",
    description:
      "이메일과 비밀번호는 검증 후 전송하고 토큰이나 원문 비밀번호를 로그에 남기지 않습니다.",
    fields: ["이메일", "비밀번호", "비밀번호 확인"],
    footer: "필수 약관 동의 후 계속할 수 있어요.",
    step: "1/5",
    title: "계정 정보를 입력하세요",
  },
  "signup-social-info": {
    action: "소셜 계정 연결",
    description:
      "소셜 provider는 state/nonce 검증을 거치며 자격증명 없이는 가짜 성공으로 처리하지 않습니다.",
    fields: ["소셜 제공자", "닉네임", "이용 약관"],
    footer: "연결 실패 시 일반 가입으로 돌아갈 수 있습니다.",
    step: "1/5",
    title: "소셜 가입 정보 확인",
  },
  "signup-welcome": {
    action: "가입 시작",
    description:
      "급여 납치 계획을 안전하게 관리하기 위해 최소 정보만 먼저 확인합니다.",
    fields: ["서비스 소개", "개인정보 보호", "광고 데이터 분리"],
    footer: "민감 금융정보는 커뮤니티와 광고에 공유하지 않습니다.",
    step: "시작",
    title: "급여납치에 오신 것을 환영합니다",
  },
  "signup-phone-number-step": {
    action: "인증번호 받기",
    description:
      "전화번호는 인증 목적으로만 사용하며 화면과 로그에는 전체값을 노출하지 않습니다.",
    fields: ["휴대폰 번호", "인증번호", "인증 제한 안내"],
    footer: "인증 실패 시 재전송 대기시간을 표시합니다.",
    step: "2/5",
    title: "휴대폰 인증",
  },
  "signup-password-creation": {
    action: "비밀번호 저장",
    description:
      "비밀번호 강도와 확인값을 검증하고 실패 시 입력값을 보존합니다.",
    fields: ["새 비밀번호", "비밀번호 확인", "보안 강도"],
    footer: "비밀번호와 refresh token은 안전 저장소 정책을 따릅니다.",
    step: "3/5",
    title: "비밀번호 만들기",
  },
  "signup-identity-verification": {
    action: "본인 확인",
    description:
      "본인 확인 단계는 민감 식별번호 전체를 저장하지 않고 검증 결과만 보관합니다.",
    fields: ["이름", "생년월일", "인증 상태"],
    footer: "주민번호, 계좌번호, 카드번호 입력은 차단합니다.",
    step: "4/5",
    title: "본인 확인",
  },
  "signup-account-info-alt": {
    action: "계정 생성",
    description:
      "대체 계정 정보 시안은 공식 브랜드와 동일한 입력 구조로 정규화합니다.",
    fields: ["아이디", "이메일", "마케팅 동의 선택"],
    footer: "선택 동의는 서비스 이용 필수 조건이 아닙니다.",
    step: "1/5",
    title: "계정 정보",
  },
  "signup-complete": {
    action: "급여 설정 시작",
    description:
      "회원가입이 완료되었습니다. 다음 단계에서 급여일과 예산을 설정합니다.",
    fields: ["계정 생성 완료", "세션 복원 준비", "초기 급여 설정 이동"],
    footer:
      "가입 완료 후에도 앱은 외부 서버 실패 시 안전한 재시도 화면을 표시합니다.",
    step: "완료",
    success: true,
    title: "가입이 완료됐어요",
  },
};

function SignupStateCapturePreview({
  variant,
}: Readonly<{
  variant: SignupStateCaptureKind;
}>): React.ReactElement {
  const { height } = useWindowDimensions();
  const content = signupStateContent[variant];

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 회원가입 상태 캡처">
      <View style={{ height: clampValue(height * 0.12, 56, 124) }} />
      <View testID={`capture-${variant}`} style={styles.signupStateFrame}>
        <SignupHero />
        <SurfaceCard accessibilityLabel="회원가입 단계">
          <Text style={styles.kicker}>{content.step}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          <Text style={styles.body}>{content.description}</Text>
        </SurfaceCard>
        <SurfaceCard accessibilityLabel="회원가입 입력 필드">
          {content.fields.map((field, index) => (
            <TextInput
              accessibilityLabel={field}
              editable={!content.success}
              key={field}
              placeholder={field}
              placeholderTextColor={componentColors.textMuted}
              secureTextEntry={field.includes("비밀번호")}
              style={styles.singleLineInput}
              value={content.success ? field : index === 0 ? "" : undefined}
            />
          ))}
          <PrimaryButton label={content.action} onPress={() => undefined} />
        </SurfaceCard>
        <SignupAgreementCard
          marketingAccepted={variant !== "signup-account-info-alt"}
          privacyAccepted
          termsAccepted
        />
        <Text style={styles.guard}>{content.footer}</Text>
      </View>
      <View style={{ flex: 1, minHeight: clampValue(height * 0.05, 24, 60) }} />
      <EurekaWorldMark />
      <View style={{ height: clampValue(height * 0.05, 24, 56) }} />
    </AuthVisualFrame>
  );
}

type OnboardingStateCaptureKind = Extract<
  CapturePreviewKind,
  | "onboarding-salary-amount-keypad"
  | "onboarding-expected-salary-step"
  | "onboarding-intro-alt"
  | "onboarding-daily-budget-step"
  | "onboarding-plan-review"
  | "onboarding-payday-step"
  | "onboarding-complete"
  | "onboarding-fixed-expense-step"
  | "onboarding-fixed-savings-step"
>;

const onboardingStepContent: Record<
  OnboardingStateCaptureKind,
  Readonly<{
    step: string;
    title: string;
    description: string;
    amountLabel: string;
    amountValue: string;
    rows: readonly string[];
    actionLabel: string;
  }>
> = {
  "onboarding-salary-amount-keypad": {
    actionLabel: "다음",
    amountLabel: "월급 실수령액",
    amountValue: "3,200,000원",
    description:
      "급여는 KRW 정수로만 입력하고 서버 권위 계산에 전달합니다. 원천 금액은 광고 타겟팅에 쓰지 않습니다.",
    rows: ["숫자 키패드", "원 단위 자동 포맷", "중복 저장 방지"],
    step: "1/7",
    title: "월급을 입력해 주세요",
  },
  "onboarding-expected-salary-step": {
    actionLabel: "예상 납치금액 보기",
    amountLabel: "예상 수령 급여",
    amountValue: "서버 기준 금액",
    description:
      "세금·공제 후 실제 사용할 수 있는 금액을 기준으로 계획과 홈 요약이 이어집니다.",
    rows: ["수령 예상 급여", "공제 후 기준", "서버 계산 대기"],
    step: "2/7",
    title: "이번 달 수령액을 확인해요",
  },
  "onboarding-intro-alt": {
    actionLabel: "급여 계획 시작",
    amountLabel: "설정 목표",
    amountValue: "5분",
    description:
      "급여일, 고정지출, 고정저축, 일일 생활비를 먼저 잡아 내 급여가 어디로 가는지 보여줍니다.",
    rows: ["급여일과 월급", "고정지출 먼저 분리", "고정저축 먼저 확보"],
    step: "시작",
    title: "급여가 사라지기 전에 먼저 붙잡아요",
  },
  "onboarding-daily-budget-step": {
    actionLabel: "생활비 저장",
    amountLabel: "일일 생활비",
    amountValue: "42,000원",
    description:
      "하루에 쓸 수 있는 금액을 정하면 홈에서 사용 예정·사용 완료 상태와 남은 금액을 즉시 확인합니다.",
    rows: ["음식", "교통", "카페", "기타"],
    step: "5/7",
    title: "매일 쓸 돈을 정해요",
  },
  "onboarding-plan-review": {
    actionLabel: "서버 기준 저장",
    amountLabel: "예상 납치금액",
    amountValue: "서버 기준 금액",
    description:
      "입력한 급여·지출·저축·생활비를 검토하고 서버 저장 성공 후에만 홈으로 이동합니다.",
    rows: ["수령 급여 서버 기준", "고정지출 서버 기준", "생활비 서버 기준"],
    step: "검토",
    title: "계획을 마지막으로 확인해요",
  },
  "onboarding-payday-step": {
    actionLabel: "급여일 적용",
    amountLabel: "매월 급여일",
    amountValue: "25일",
    description:
      "급여일은 한국 표준시간 기준 주기 계산에 사용하고, 월말·윤년 경계에서도 서버 기준으로 보정합니다.",
    rows: ["이번 급여일 11월 25일", "다음 급여일 12월 24일", "KST 기준"],
    step: "3/7",
    title: "급여일을 선택해요",
  },
  "onboarding-complete": {
    actionLabel: "급여 홈으로 이동",
    amountLabel: "온보딩 완료",
    amountValue: "PASS",
    description:
      "서버가 온보딩 완료를 확인하면 홈과 계획이 같은 summary를 사용하도록 연결됩니다.",
    rows: ["프로필 완료", "계획 동기화", "광고 데이터 분리"],
    step: "완료",
    title: "준비가 끝났어요",
  },
  "onboarding-fixed-expense-step": {
    actionLabel: "고정지출 추가",
    amountLabel: "고정지출",
    amountValue: "서버 기준 금액",
    description:
      "구독료·대출상환처럼 매월 반복되는 지출은 template와 occurrence를 분리해 관리합니다.",
    rows: ["유튜브 프리미엄", "ChatGPT", "학자금 대출"],
    step: "4/7",
    title: "고정지출을 먼저 분리해요",
  },
  "onboarding-fixed-savings-step": {
    actionLabel: "고정저축 추가",
    amountLabel: "고정저축",
    amountValue: "400,000원",
    description:
      "급여 직후 빠져나갈 저축을 먼저 고정하면 실제 생활비와 납치금액이 더 정확해집니다.",
    rows: ["여행 방학", "수시 투자", "비상금"],
    step: "6/7",
    title: "저축을 먼저 확보해요",
  },
};

function OnboardingStateCapturePreview({
  variant,
}: Readonly<{
  variant: OnboardingStateCaptureKind;
}>): React.ReactElement {
  const content = onboardingStepContent[variant];
  const isInput =
    variant === "onboarding-salary-amount-keypad" ||
    variant === "onboarding-expected-salary-step" ||
    variant === "onboarding-daily-budget-step" ||
    variant === "onboarding-payday-step" ||
    variant === "onboarding-fixed-expense-step" ||
    variant === "onboarding-fixed-savings-step";

  return (
    <AppShell
      accessibilityLabel="급여납치 초기 급여 설정 Stitch 상태 화면 캡처"
      header={<AppHeader subtitle="초기 설정" title="급여 계획 시작" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="초기 급여 설정 단계">
          <Text style={styles.kicker}>{content.step}</Text>
          <Text style={styles.heroAmount}>{content.amountValue}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          <Text style={styles.body}>{content.description}</Text>
          <ProgressBar
            value={
              variant === "onboarding-complete"
                ? 100
                : variant === "onboarding-plan-review"
                  ? 86
                  : 42
            }
          />
        </SurfaceCard>

        {isInput ? (
          <SurfaceCard accessibilityLabel={`${content.amountLabel} 입력`}>
            <Text style={styles.formLabel}>{content.amountLabel}</Text>
            <TextInput
              accessibilityLabel={content.amountLabel}
              keyboardType="number-pad"
              placeholder="금액 또는 일자를 입력"
              placeholderTextColor={componentColors.textMuted}
              style={styles.singleLineInput}
              value={content.amountValue}
            />
            <Text style={styles.guard}>
              입력값은 저장 성공 전까지 로컬 성공값으로 확정 표시하지 않습니다.
            </Text>
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="초기 설정 세부 항목">
          {content.rows.map((row) => (
            <View key={row} style={styles.detailRow}>
              <Text style={styles.detailText}>{row}</Text>
              <Text style={styles.detailStatus}>
                {variant === "onboarding-complete" ? "완료" : "확인"}
              </Text>
            </View>
          ))}
          <PrimaryButton
            label={content.actionLabel}
            onPress={() => undefined}
          />
        </SurfaceCard>
      </View>
    </AppShell>
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

type CommunityBoardStateCaptureKind = Extract<
  CapturePreviewKind,
  | "community-state-board-ko"
  | "community-state-board-en-tabs"
  | "community-offline-moderation-board"
  | "community-state-board"
  | "community-hobby-board"
  | "community-levelup-board"
  | "community-search-results"
  | "community-free-board-alt"
>;

const communityBoardStateContent: Record<
  CommunityBoardStateCaptureKind,
  Readonly<{
    title: string;
    subtitle: string;
    activeTab: string;
    query?: string;
    statusLabel: string;
    statusTone?: "default" | "warning";
    summaryRows: readonly string[];
    posts: readonly CommunityPost[];
  }>
> = {
  "community-state-board-ko": {
    activeTab: "전체",
    posts: [
      makeCommunityBoardPost(
        "board-ko-1",
        "LEVEL_CERTIFICATION",
        "[LV.5] 오늘 운동, 1년 차 야근 체력 탈출 후기",
        "레벨업 인증과 소비 습관 개선 기록을 민감 금액 없이 공유했어요.",
        26,
        7,
      ),
      makeCommunityBoardPost(
        "board-ko-2",
        "FREE",
        "회계팀 홍길동입니다. 연말정산 준비 5가지 공유",
        "회사명과 실명 대신 익명 표시로 커뮤니티 안전 정책을 지켜요.",
        18,
        4,
      ),
    ],
    statusLabel: "실시간 검수 정상",
    subtitle: "한국어 탭 보드",
    summaryRows: ["전체 게시판", "자유 게시판", "레벨업 인증", "취미 게시판"],
    title: "커뮤니티",
  },
  "community-state-board-en-tabs": {
    activeTab: "All",
    posts: [
      makeCommunityBoardPost(
        "board-en-1",
        "BUDGET_TIP",
        "Budget routine without exposing salary details",
        "English tab labels remain a visual variant while moderation still runs on native state.",
        12,
        2,
      ),
      makeCommunityBoardPost(
        "board-en-2",
        "SAVINGS_GOAL",
        "Savings goal recap after payday",
        "Raw salary and account data are never exposed to the feed or ad slots.",
        15,
        3,
      ),
    ],
    statusLabel: "English tab variant",
    subtitle: "영문 탭 보드",
    summaryRows: ["All", "Free", "Level up", "Hobby"],
    title: "Community",
  },
  "community-offline-moderation-board": {
    activeTab: "검수",
    posts: [
      makeCommunityBoardPost(
        "board-offline-1",
        "LEVEL_CERTIFICATION",
        "오프라인 임시저장 글은 읽기 전용으로 표시돼요",
        "네트워크 복구 전까지 좋아요와 댓글은 대기 상태로 유지됩니다.",
        9,
        1,
        "REVIEW",
      ),
      makeCommunityBoardPost(
        "board-offline-2",
        "FREE",
        "신고 검수 중인 게시글",
        "관리자 검수 전에는 민감 정보가 포함된 본문을 확산하지 않습니다.",
        4,
        0,
        "REVIEW",
      ),
    ],
    statusLabel: "오프라인/검수 대기",
    statusTone: "warning",
    subtitle: "오프라인 검수",
    summaryRows: ["캐시된 목록", "검수 대기 2건", "신규 작성 잠시 제한"],
    title: "커뮤니티 보호 모드",
  },
  "community-state-board": {
    activeTab: "전체",
    posts: [
      makeCommunityBoardPost(
        "board-state-1",
        "SIDE_HUSTLE",
        "커리어/부업 보드는 범위 검토 후 일반 자유글로 정규화",
        "범위 이탈 후보는 공식 게시판 구조 안에서 안전하게 표시합니다.",
        11,
        2,
      ),
      makeCommunityBoardPost(
        "board-state-2",
        "EXPENSE_CUT",
        "고정지출 줄인 후기",
        "개별 급여 원문 없이 절약 루틴만 공유합니다.",
        24,
        5,
      ),
    ],
    statusLabel: "범위 정규화",
    subtitle: "상태 보드",
    summaryRows: ["범위 검토", "광고 분리", "개인정보 마스킹"],
    title: "커뮤니티 상태",
  },
  "community-hobby-board": {
    activeTab: "취미",
    posts: [
      makeCommunityBoardPost(
        "board-hobby-1",
        "HEALTH_ROUTINE",
        "퇴근 후 1시간 독서와 산책 루틴",
        "취미 게시판은 자기관리 기록과 소비 기록을 분리합니다.",
        31,
        8,
      ),
      makeCommunityBoardPost(
        "board-hobby-2",
        "FREE",
        "이번 주 그림 모임 후기",
        "위치와 연락처 없이 모임 경험만 공유합니다.",
        13,
        3,
      ),
    ],
    statusLabel: "취미 게시판",
    subtitle: "취미 보드",
    summaryRows: ["운동", "독서", "취미 루틴"],
    title: "커뮤니티",
  },
  "community-levelup-board": {
    activeTab: "레벨업 인증",
    posts: [
      makeCommunityBoardPost(
        "board-level-1",
        "LEVEL_CERTIFICATION",
        "[독서 LV.UP] 기획의 정석 2장 완료",
        "서버 권위 XP 지급 후 공유된 인증 글입니다.",
        42,
        11,
      ),
      makeCommunityBoardPost(
        "board-level-2",
        "LEVEL_CERTIFICATION",
        "[홈트 LV.UP] 10분 루틴 완료",
        "건강 조언은 보장 문구 없이 안전 문구와 함께 표시합니다.",
        29,
        6,
      ),
    ],
    statusLabel: "레벨업 인증",
    subtitle: "레벨업 인증 보드",
    summaryRows: ["독서", "뉴스", "영어", "건강"],
    title: "커뮤니티",
  },
  "community-search-results": {
    activeTab: "검색",
    posts: [
      makeCommunityBoardPost(
        "board-search-1",
        "BUDGET_TIP",
        "검색어: 자동결제",
        "구독료 자동결제 관리 팁을 민감 계정정보 없이 보여줍니다.",
        20,
        5,
      ),
      makeCommunityBoardPost(
        "board-search-2",
        "EXPENSE_CUT",
        "넷플릭스와 유튜브 구독료 점검 루틴",
        "제휴나 광고 데이터와 개인 지출 원문은 분리됩니다.",
        17,
        4,
      ),
    ],
    query: "자동결제",
    statusLabel: "검색 결과 2건",
    subtitle: "검색 결과",
    summaryRows: ["최신순", "댓글 많은 순", "저장한 글"],
    title: "커뮤니티 검색",
  },
  "community-free-board-alt": {
    activeTab: "자유",
    posts: [
      makeCommunityBoardPost(
        "board-free-1",
        "FREE",
        "직장인 부업? 주식 말고 독서모임 운영 수익률 이야기",
        "투자 권유가 아닌 경험 공유로 검수됩니다.",
        16,
        6,
      ),
      makeCommunityBoardPost(
        "board-free-2",
        "FREE",
        "회사 점심값 아끼는 현실적인 방법",
        "구체 계좌나 카드번호 없이 생활 팁만 남깁니다.",
        22,
        8,
      ),
    ],
    statusLabel: "자유 게시판",
    subtitle: "자유 보드",
    summaryRows: ["인기글", "최신글", "신고 숨김 0건"],
    title: "커뮤니티",
  },
};

function makeCommunityBoardPost(
  id: string,
  boardType: CommunityPost["boardType"],
  title: string,
  bodyPreview: string,
  likeCount: number,
  commentCount: number,
  moderationStatus: CommunityPost["moderationStatus"] = "SAFE",
): CommunityPost {
  return {
    adsFinancialTargetingUsed: false,
    anonymous: true,
    anonymousDisplayName: "익명 직장인",
    boardType,
    bodyPreview,
    bookmarkCount: Math.max(1, Math.floor(likeCount / 4)),
    bookmarkedByMe: false,
    commentCount,
    createdAt: "2026-07-12T01:20:00.000Z",
    id,
    likeCount,
    likedByMe: false,
    moderationStatus,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    shareCount: Math.max(1, Math.floor(commentCount / 2)),
    title,
    updatedAt: "2026-07-12T01:20:00.000Z",
  };
}

function CommunityBoardStateCapturePreview({
  variant,
}: Readonly<{
  variant: CommunityBoardStateCaptureKind;
}>): React.ReactElement {
  const content = communityBoardStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티 Stitch 보드 상태 캡처"
      header={<AppHeader subtitle={content.subtitle} title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="커뮤니티 보드 상태 요약">
          <Text style={styles.kicker}>{content.statusLabel}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          {content.query ? (
            <Text style={styles.body}>검색어: {content.query}</Text>
          ) : (
            <Text style={styles.body}>
              전체, 자유, 레벨업 인증, 취미 게시판을 민감 금융정보 없이
              탐색합니다.
            </Text>
          )}
          {content.statusTone === "warning" ? (
            <View style={styles.warningBox}>
              <Text style={styles.errorText}>
                오프라인/검수 상태에서는 성공처럼 표시하지 않고 재시도와 읽기
                전용 상태를 분리합니다.
              </Text>
            </View>
          ) : null}
        </SurfaceCard>

        <View style={styles.segmentRow}>
          {content.summaryRows.map((row) => {
            const active = row === content.activeTab;
            return (
              <View
                key={row}
                style={[styles.segmentChip, active && styles.segmentChipActive]}
              >
                <Text
                  style={[
                    styles.segmentChipText,
                    active && styles.segmentChipTextActive,
                  ]}
                >
                  {row}
                </Text>
              </View>
            );
          })}
        </View>

        {content.posts.map((post) => (
          <CommunityPostCard
            key={post.id}
            liked={post.likedByMe === true}
            onLike={() => undefined}
            onPress={() => undefined}
            post={post}
          />
        ))}

        <SurfaceCard accessibilityLabel="커뮤니티 정책 가드">
          <Text style={styles.guard}>
            광고/제휴 노출은 게시글 문맥과 분리되며 급여, 대출, 저축 원문으로
            타겟팅하지 않습니다.
          </Text>
        </SurfaceCard>
      </View>
    </AppShell>
  );
}

type ProfilePageStateCaptureKind = Extract<
  CapturePreviewKind,
  | "profile-performance-partial-error"
  | "profile-offline-performance-preview"
  | "profile-page-load-error"
  | "profile-page-account-restricted"
  | "profile-my-page-alt"
  | "profile-my-page-legacy"
  | "profile-ad-hidden"
  | "profile-loading-skeleton"
>;

const profilePageStateContent: Record<
  ProfilePageStateCaptureKind,
  Readonly<{
    title: string;
    subtitle: string;
    status: string;
    description: string;
    stats: readonly CaptureMetric[];
    menuRows: readonly string[];
    notice?: string;
    loading?: boolean;
    error?: boolean;
    emptyAd?: boolean;
  }>
> = {
  "profile-performance-partial-error": {
    description:
      "프로필과 계정 메뉴는 정상 표시하고 성과 카드만 재시도 상태로 분리합니다.",
    error: true,
    menuRows: ["내 게시글 관리", "내 레벨업 관리", "1:1 문의", "공지사항"],
    notice: "성과 일부를 불러오지 못했어요. 민감 금액 없이 다시 시도합니다.",
    stats: [
      { label: "누적 납치금액", value: "서버 기준 금액" },
      { label: "레벨", value: "18LV" },
      { label: "성과", value: "재시도" },
    ],
    status: "부분 오류",
    subtitle: "성과 오류",
    title: "마이페이지",
  },
  "profile-offline-performance-preview": {
    description:
      "오프라인에서는 마지막 안전 캐시를 읽기 전용으로 보여주고 저장 성공처럼 표시하지 않습니다.",
    menuRows: ["내 게시글 관리", "내 레벨업 관리", "오프라인 문의 대기"],
    notice: "네트워크 연결 후 최신 성과로 동기화됩니다.",
    stats: [
      { label: "캐시 납치금액", value: "서버 기준 금액" },
      { label: "캐시 레벨", value: "18LV" },
      { label: "동기화", value: "대기" },
    ],
    status: "오프라인",
    subtitle: "오프라인 성과",
    title: "마이페이지",
  },
  "profile-page-load-error": {
    description:
      "마이페이지 전체 로딩 실패 시 빈 화면으로 멈추지 않고 재시도와 고객지원 경로를 표시합니다.",
    error: true,
    menuRows: ["다시 시도", "1:1 문의", "공지사항"],
    notice: "서버 오류가 있어도 앱 프로세스는 종료하지 않습니다.",
    stats: [],
    status: "로드 실패",
    subtitle: "오류 상태",
    title: "마이페이지",
  },
  "profile-page-account-restricted": {
    description:
      "제재 또는 인증 문제로 일부 기능이 제한되면 사유와 문의 경로를 표시합니다.",
    menuRows: ["제한 사유 확인", "1:1 문의", "공지사항"],
    notice: "토큰, 전화번호, 이메일 전체값은 화면에 노출하지 않습니다.",
    stats: [
      { label: "계정 상태", value: "제한" },
      { label: "문의", value: "가능" },
      { label: "금융정보", value: "비노출" },
    ],
    status: "계정 제한",
    subtitle: "접근 제한",
    title: "마이페이지",
  },
  "profile-my-page-alt": {
    description:
      "대체 마이페이지 구성은 같은 공식 브랜드 토큰과 메뉴 구조를 유지합니다.",
    menuRows: ["성과 리포트", "내 게시글", "내 레벨업", "계정 설정"],
    stats: [
      { label: "이번 달 절약", value: "500,000원" },
      { label: "누적 납치", value: "서버 기준 금액" },
      { label: "연속 성장", value: "12일" },
    ],
    status: "대체 레이아웃",
    subtitle: "마이 대체",
    title: "마이페이지",
  },
  "profile-my-page-legacy": {
    description:
      "레거시 시안의 핵심 정보는 공식 급여납치 구조로 정규화해 유지합니다.",
    menuRows: ["내 게시글 관리", "내 레벨업 관리", "1:1 문의", "공지사항"],
    stats: [
      { label: "누적 납치금액", value: "서버 기준 금액" },
      { label: "레벨 현황", value: "18LV" },
      { label: "자기관리", value: "4.2점" },
    ],
    status: "레거시 정규화",
    subtitle: "레거시 시안",
    title: "마이페이지",
  },
  "profile-ad-hidden": {
    description:
      "광고 미노출 상태에서도 핵심 마이 메뉴와 성과 카드는 흔들리지 않습니다.",
    emptyAd: true,
    menuRows: ["내 게시글 관리", "내 레벨업 관리", "계정 설정"],
    stats: [
      { label: "누적 납치금액", value: "서버 기준 금액" },
      { label: "레벨", value: "18LV" },
      { label: "광고", value: "숨김" },
    ],
    status: "광고 숨김",
    subtitle: "광고 상태",
    title: "마이페이지",
  },
  "profile-loading-skeleton": {
    description:
      "마이페이지 초기 로딩 중에는 safe-area를 지키는 스켈레톤을 보여줍니다.",
    loading: true,
    menuRows: [],
    stats: [],
    status: "로딩",
    subtitle: "로딩 상태",
    title: "마이페이지",
  },
};

function ProfilePageStateCapturePreview({
  variant,
}: Readonly<{
  variant: ProfilePageStateCaptureKind;
}>): React.ReactElement {
  const content = profilePageStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="급여납치 마이페이지 Stitch 상태 캡처"
      header={<AppHeader subtitle={content.subtitle} title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        {content.loading ? (
          <>
            <LoadingSkeleton label="마이페이지 정보를 불러오는 중" />
            <LoadingSkeleton label="성과 카드 준비 중" />
            <LoadingSkeleton label="메뉴 목록 준비 중" />
          </>
        ) : (
          <>
            <SurfaceCard accessibilityLabel="프로필 요약">
              <Text style={styles.kicker}>{content.status}</Text>
              <Text style={styles.sectionTitle}>홍길동 기획자님</Text>
              <Text style={styles.body}>{content.description}</Text>
              {content.notice ? (
                <View style={styles.warningBox}>
                  <Text style={content.error ? styles.errorText : styles.guard}>
                    {content.notice}
                  </Text>
                </View>
              ) : null}
            </SurfaceCard>

            {content.stats.length > 0 ? (
              <View style={styles.metricGrid}>
                {content.stats.map((metric) => (
                  <View key={metric.label} style={styles.metricCard}>
                    <SurfaceCard>
                      <Text style={styles.metricLabel}>{metric.label}</Text>
                      <Text style={styles.metricValue}>{metric.value}</Text>
                    </SurfaceCard>
                  </View>
                ))}
              </View>
            ) : (
              <ErrorState
                message="요청이 실패했습니다. 앱은 종료하지 않고 다시 시도할 수 있습니다."
                onRetry={() => undefined}
                title="마이페이지를 불러오지 못했어요"
              />
            )}

            {content.emptyAd ? (
              <EmptyState
                description="마케팅 동의가 없거나 광고가 없으면 제휴 배너를 숨깁니다."
                title="광고 없음"
              />
            ) : null}

            <SurfaceCard accessibilityLabel="마이페이지 메뉴">
              {content.menuRows.map((row) => (
                <View key={row} style={styles.detailRow}>
                  <Text style={styles.detailText}>{row}</Text>
                  <Text style={styles.detailStatus}>관리하기</Text>
                </View>
              ))}
            </SurfaceCard>
          </>
        )}
      </View>
    </AppShell>
  );
}

type ProfileSettingsStateCaptureKind = Extract<
  CapturePreviewKind,
  | "profile-settings-validation-error"
  | "profile-settings-save-failure"
  | "profile-settings-alt"
  | "profile-visibility-sheet"
  | "profile-image-delete-confirm"
  | "profile-uploading"
  | "profile-job-selector"
>;

function ProfileSettingsStateCapturePreview({
  variant,
}: Readonly<{
  variant: ProfileSettingsStateCaptureKind;
}>): React.ReactElement {
  if (variant === "profile-settings-save-failure") {
    return (
      <View testID={`capture-${variant}`}>
        <ConfirmDialog
          cancelLabel="Keep editing"
          confirmLabel="Retry save"
          description="Profile changes were not saved. The draft remains on device and no sensitive contact value is logged."
          onCancel={() => undefined}
          onConfirm={() => undefined}
          title="Profile save failed"
        />
      </View>
    );
  }

  if (variant === "profile-image-delete-confirm") {
    return (
      <View testID={`capture-${variant}`}>
        <ConfirmDialog
          cancelLabel="Cancel"
          confirmLabel="Delete image"
          destructive
          description="Delete only the profile image reference. Posts, comments, and financial records are not changed."
          onCancel={() => undefined}
          onConfirm={() => undefined}
          title="Delete profile image?"
        />
      </View>
    );
  }

  if (variant === "profile-visibility-sheet") {
    return (
      <View testID={`capture-${variant}`} style={{ flex: 1 }}>
        <BottomSheet
          actions={[
            {
              description: "Show nickname and level only",
              key: "public",
              label: "Public profile",
            },
            {
              description: "Hide activity except community posts",
              key: "limited",
              label: "Limited profile",
            },
            {
              description: "Private by default",
              key: "private",
              label: "Private profile",
            },
          ]}
          onClose={() => undefined}
          onSelect={() => undefined}
          title="Profile visibility"
        />
      </View>
    );
  }

  if (variant === "profile-job-selector") {
    return (
      <View testID={`capture-${variant}`} style={{ flex: 1 }}>
        <BottomSheet
          actions={[
            {
              description: "Planning and operations roles",
              key: "planner",
              label: "Planner",
            },
            {
              description: "Development and product roles",
              key: "developer",
              label: "Developer",
            },
            {
              description: "Do not show job information",
              key: "hidden",
              label: "Do not disclose",
            },
          ]}
          onClose={() => undefined}
          onSelect={() => undefined}
          title="Select job category"
        />
      </View>
    );
  }

  const isValidation = variant === "profile-settings-validation-error";
  const isUploading = variant === "profile-uploading";
  const isAlt = variant === "profile-settings-alt";

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking profile settings Stitch state capture"
      header={<AppHeader subtitle="MY" title="Profile settings" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="Profile settings summary">
          <Text style={styles.kicker}>
            {isUploading
              ? "Uploading"
              : isValidation
                ? "Validation"
                : "Profile"}
          </Text>
          <Text style={styles.sectionTitle}>
            {isAlt ? "Profile settings" : "Edit public profile"}
          </Text>
          <Text style={styles.body}>
            Nickname, job category, profile image, and visibility can be changed
            without exposing salary, account, email, or phone raw values.
          </Text>
          {isUploading ? <ProgressBar value={64} /> : null}
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="Profile form fields">
          <Text style={styles.formLabel}>Nickname</Text>
          <TextInput
            accessibilityLabel="Nickname"
            onChangeText={() => undefined}
            placeholder="Nickname"
            style={[
              styles.singleLineInput,
              isValidation ? styles.inputError : null,
            ]}
            value={isValidation ? "" : "Hong planner"}
          />
          {isValidation ? (
            <Text style={styles.errorText}>Nickname is required.</Text>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Job category</Text>
            <Text style={styles.detailStatus}>
              {isAlt ? "Hidden" : "Planner"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Visibility</Text>
            <Text style={styles.detailStatus}>
              {isAlt ? "Private" : "Limited"}
            </Text>
          </View>
        </SurfaceCard>

        {isUploading ? (
          <View style={styles.warningBox}>
            <Text style={styles.guard}>
              Upload progress is isolated from profile save. Failed uploads do
              not erase the existing image.
            </Text>
          </View>
        ) : null}

        <View style={styles.metricGrid}>
          {[
            ["PII logs", "Masked"],
            ["Draft", isValidation ? "Kept" : "Saved"],
            ["Image", isUploading ? "Uploading" : "Optional"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={isUploading ? "Uploading..." : "Save profile"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

type LivingCostStateCaptureKind = Extract<
  CapturePreviewKind,
  | "living-cost-save-failure"
  | "living-cost-saving"
  | "living-cost-settings"
  | "living-cost-alt"
  | "living-cost-weekday-weekend"
  | "living-cost-saving-alt"
>;

const livingCostStateContent: Record<
  LivingCostStateCaptureKind,
  Readonly<{
    title: string;
    subtitle: string;
    status: string;
    amount: string;
    description: string;
    rows: readonly [string, string][];
    categories: readonly [string, string, string][];
    mode?: "saving" | "error" | "split";
  }>
> = {
  "living-cost-alt": {
    amount: "22,000원",
    categories: [
      ["음식", "점심 식사", "8,000원"],
      ["교통", "지하철/버스", "3,000원"],
      ["카페", "아메리카노", "4,000원"],
    ],
    description:
      "대체 시안은 같은 기능 계약을 유지하면서 카테고리, 내용, 금액을 한 화면에서 수정할 수 있게 정리합니다.",
    rows: [
      ["일수", "30일"],
      ["월별 생활비 총액", "660,000원"],
      ["홈 반영", "오늘 예정 항목"],
    ],
    status: "설정 대체",
    subtitle: "일일 생활비",
    title: "일일 생활비 계획/설정",
  },
  "living-cost-save-failure": {
    amount: "20,000원",
    categories: [
      ["음식", "백다방 모닝커피", "2,000원"],
      ["점심", "KT광화문지사 구내식당", "6,500원"],
      ["편의점", "생수", "1,000원"],
    ],
    description:
      "저장 실패 시 입력값을 지우지 않고 재시도 상태로 유지합니다. 서버 성공 전에는 홈 요약을 성공값처럼 바꾸지 않습니다.",
    mode: "error",
    rows: [
      ["저장 상태", "실패"],
      ["입력 보존", "유지"],
      ["서버 권위", "재시도 필요"],
    ],
    status: "저장 실패",
    subtitle: "생활비 저장 오류",
    title: "생활비 설정을 저장하지 못했어요",
  },
  "living-cost-saving": {
    amount: "20,000원",
    categories: [
      ["음식", "점심 식사", "6,500원"],
      ["카페", "아메리카노", "2,000원"],
      ["간식", "편의점", "1,500원"],
    ],
    description:
      "생활비 총액과 세부 항목을 서버에 저장하는 중입니다. 중복 제출을 막고 실패 시 초안으로 복구합니다.",
    mode: "saving",
    rows: [
      ["저장 진행률", "64%"],
      ["중복 제출", "차단"],
      ["동기화", "대기"],
    ],
    status: "저장 중",
    subtitle: "생활비 저장",
    title: "일일 생활비 설정 저장 중",
  },
  "living-cost-saving-alt": {
    amount: "18,000원",
    categories: [
      ["평일", "점심/카페", "14,000원"],
      ["주말", "외식 예비", "22,000원"],
      ["비상", "남은 예산", "4,000원"],
    ],
    description:
      "평일/주말 예산을 저장하는 동안 화면 전환과 키보드 닫힘에도 초안이 유지되는 상태입니다.",
    mode: "saving",
    rows: [
      ["저장 진행률", "82%"],
      ["초안", "보존"],
      ["홈 반영", "서버 성공 후"],
    ],
    status: "저장 중",
    subtitle: "평일/주말 생활비",
    title: "생활비 세부 설정 저장 중",
  },
  "living-cost-settings": {
    amount: "20,000원",
    categories: [
      ["음식", "백다방 아이스 아메리카노", "2,000원"],
      ["점심 식사", "KT광화문지사 구내식당", "6,500원"],
      ["편의점", "GS25 생수", "1,000원"],
    ],
    description:
      "일일 생활비는 하루 기준 금액입니다. 앱은 일일 생활비 총액에 일수를 곱해 월별 생활비 총액을 산출합니다.",
    rows: [
      ["일수", "30일"],
      ["월별 생활비 총액", "600,000원"],
      ["수정 가능", "카테고리, 금액, 내용"],
    ],
    status: "기본 설정",
    subtitle: "생활비 설정",
    title: "일일 생활비 계획/설정",
  },
  "living-cost-weekday-weekend": {
    amount: "평일 18,000원 / 주말 28,000원",
    categories: [
      ["평일 음식", "구내식당", "6,500원"],
      ["평일 카페", "아메리카노", "2,000원"],
      ["주말 외식", "예비 식비", "20,000원"],
    ],
    description:
      "요일별 생활비는 날짜 기준으로 홈에 동기화됩니다. 지난 예정 항목은 주황색 경고, 완료 항목은 현재 주기에서 완료 처리됩니다.",
    mode: "split",
    rows: [
      ["평일 합계", "18,000원"],
      ["주말 합계", "28,000원"],
      ["월 예상", "648,000원"],
    ],
    status: "요일별",
    subtitle: "생활비 분기",
    title: "평일/주말 생활비 계획",
  },
};

function LivingCostStateCapturePreview({
  variant,
}: Readonly<{ variant: LivingCostStateCaptureKind }>): React.ReactElement {
  const content = livingCostStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking daily living cost Stitch state capture"
      header={<AppHeader subtitle={content.subtitle} title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.heroAmount}>{content.amount}</Text>
          <Text style={styles.body}>{content.description}</Text>
          {content.mode === "saving" ? <ProgressBar value={70} /> : null}
        </SurfaceCard>

        {content.mode === "error" ? (
          <SurfaceCard accessibilityLabel="생활비 저장 실패">
            <ErrorState
              message="네트워크 또는 서버 응답 실패로 저장하지 못했습니다. 작성 중인 카테고리, 금액, 내용은 유지됩니다."
              onRetry={() => undefined}
              title="생활비 설정 저장 실패"
            />
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="생활비 입력 항목">
          <Text style={styles.formLabel}>카테고리</Text>
          <TextInput
            accessibilityLabel="생활비 카테고리"
            onChangeText={() => undefined}
            placeholder="음식"
            style={styles.singleLineInput}
            value={content.categories[0]?.[0] ?? "음식"}
          />
          <Text style={styles.formLabel}>세부 내용</Text>
          <TextInput
            accessibilityLabel="생활비 세부 내용"
            onChangeText={() => undefined}
            placeholder="백다방 아이스 아메리카노"
            style={styles.singleLineInput}
            value={content.categories[0]?.[1] ?? "점심 식사"}
          />
          <Text style={styles.formLabel}>금액</Text>
          <TextInput
            accessibilityLabel="생활비 금액"
            keyboardType="number-pad"
            onChangeText={() => undefined}
            placeholder="20000"
            style={styles.singleLineInput}
            value={content.categories[0]?.[2] ?? "20,000원"}
          />
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="생활비 계산 요약">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="생활비 세부 항목">
          <View style={styles.planTableRow}>
            {["카테고리", "내용", "금액"].map((label) => (
              <Text key={label} style={[styles.planCell, styles.planCellHead]}>
                {label}
              </Text>
            ))}
          </View>
          {content.categories.map(([category, description, amount]) => (
            <View
              key={`${category}-${description}`}
              style={styles.planTableRow}
            >
              <Text style={styles.planCell}>{category}</Text>
              <Text style={styles.planCell}>{description}</Text>
              <Text style={styles.planCell}>{amount}</Text>
            </View>
          ))}
          <Text style={styles.addLine}>+ 추가하기</Text>
        </SurfaceCard>

        <View style={styles.warningBox}>
          <Text style={styles.guard}>
            계획 화면과 홈 화면은 같은 서버 권위 생활비 계약을 사용합니다. 광고
            영역에는 생활비 원문 세부 데이터가 전달되지 않습니다.
          </Text>
        </View>

        <PrimaryButton
          label={content.mode === "saving" ? "저장 중..." : "저장"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

type NoticeStateCaptureKind = Extract<
  CapturePreviewKind,
  | "notice-event-detail"
  | "notice-ended-event-detail"
  | "notice-privacy-policy-change"
  | "notice-maintenance-detail"
  | "notice-offline-list"
  | "notice-unavailable"
  | "notice-app-update-detail"
  | "notice-empty"
>;

const noticeStateContent: Record<
  NoticeStateCaptureKind,
  Readonly<{
    title: string;
    subtitle: string;
    status: string;
    body: string;
    rows: readonly [string, string][];
    mode?: "empty" | "error" | "offline";
  }>
> = {
  "notice-app-update-detail": {
    body: "QA APK and store builds use the same safe startup path. Update notices explain version, rollout, and required action without exposing device tokens.",
    rows: [
      ["Version", "1.0.1"],
      ["Required", "No"],
      ["Action", "Open update guide"],
    ],
    status: "App update",
    subtitle: "Notice detail",
    title: "App update notice",
  },
  "notice-empty": {
    body: "There are no current notices. The screen stays usable and keeps the back navigation available.",
    mode: "empty",
    rows: [
      ["Unread", "0"],
      ["Archive", "Available"],
      ["Fallback", "No fake notice"],
    ],
    status: "Empty",
    subtitle: "Notice empty",
    title: "No notices",
  },
  "notice-ended-event-detail": {
    body: "Ended event detail keeps the historical explanation visible while disabling reward entry and preventing duplicate point payout.",
    rows: [
      ["Event", "Hijack milestone bonus"],
      ["Period", "Ended"],
      ["Reward", "Closed"],
    ],
    status: "Ended",
    subtitle: "Event detail",
    title: "Ended event",
  },
  "notice-event-detail": {
    body: "Event detail opens from the notice list, marks the notice read, and routes only through validated in-app targets.",
    rows: [
      ["Event", "July savings challenge"],
      ["Benefit", "500P after server check"],
      ["Deep link", "Validated"],
    ],
    status: "Live",
    subtitle: "Event detail",
    title: "Event notice",
  },
  "notice-maintenance-detail": {
    body: "Maintenance notice separates service status from salary data and shows a retry-safe window for API degradation.",
    rows: [
      ["Window", "02:00 - 03:00 KST"],
      ["Impact", "Read-only budget view"],
      ["Data", "Preserved"],
    ],
    status: "Maintenance",
    subtitle: "System notice",
    title: "Scheduled maintenance",
  },
  "notice-offline-list": {
    body: "Offline notice list renders cached notices read-only. Mark-read and archive wait for reconnection.",
    mode: "offline",
    rows: [
      ["Cached notices", "3"],
      ["Write action", "Paused"],
      ["Sync", "Pending"],
    ],
    status: "Offline",
    subtitle: "Cached notices",
    title: "Offline notices",
  },
  "notice-privacy-policy-change": {
    body: "Privacy policy changes require explicit viewing and keep marketing consent separate from mandatory service notices.",
    rows: [
      ["Policy", "Privacy v2026.07"],
      ["Consent", "Required review"],
      ["Ads data", "Separated"],
    ],
    status: "Policy",
    subtitle: "Policy notice",
    title: "Privacy policy update",
  },
  "notice-unavailable": {
    body: "Unavailable detail shows a recoverable error instead of a blank screen. The app does not mark the notice read until the server succeeds.",
    mode: "error",
    rows: [
      ["Request", "Failed"],
      ["Read state", "Unchanged"],
      ["Retry", "Available"],
    ],
    status: "Error",
    subtitle: "Notice error",
    title: "Notice unavailable",
  },
};

function NoticeStateCapturePreview({
  variant,
}: Readonly<{ variant: NoticeStateCaptureKind }>): React.ReactElement {
  const content = noticeStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking notice Stitch state capture"
      header={<AppHeader subtitle={content.subtitle} title="Notices" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          <Text style={styles.body}>{content.body}</Text>
        </SurfaceCard>

        {content.mode === "empty" ? (
          <SurfaceCard accessibilityLabel="Notice empty state">
            <EmptyState
              description="New notices will appear here without showing a bottom tab on the notice detail stack."
              title="No notices"
            />
          </SurfaceCard>
        ) : null}

        {content.mode === "error" ? (
          <SurfaceCard accessibilityLabel="Notice error state">
            <ErrorState
              message="The notice could not be loaded. Retry keeps the current read state and never crashes the app."
              onRetry={() => undefined}
              title="Notice unavailable"
            />
          </SurfaceCard>
        ) : null}

        {content.mode === "offline" ? (
          <View style={styles.warningBox}>
            <Text style={styles.guard}>
              Offline mode is read-only. Mark-read and archive actions resume
              after server sync.
            </Text>
          </View>
        ) : null}

        <SurfaceCard accessibilityLabel="Notice metadata">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            ["Deep link", "Validated"],
            ["Read state", content.mode === "error" ? "Held" : "Tracked"],
            ["Sensitive data", "Masked"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={content.mode === "error" ? "Retry" : "Back to notices"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

type CommunityWriteCaptureKind = Extract<
  CapturePreviewKind,
  | "community-write"
  | "community-write-attachments"
  | "community-write-sensitive-warning"
  | "community-write-restricted"
  | "community-write-draft"
  | "community-write-draft-recovery"
  | "community-write-from-levelup"
  | "community-write-validation"
  | "community-write-question-anonymous"
>;

function CommunityWriteCapturePreview({
  variant,
}: Readonly<{
  variant: CommunityWriteCaptureKind;
}>): React.ReactElement {
  if (variant === "community-write-sensitive-warning") {
    return (
      <ConfirmDialog
        cancelLabel="수정하기"
        confirmLabel="검토 요청"
        description="급여, 계좌, 카드번호, 연락처 원문은 커뮤니티에 노출하지 않습니다. 민감정보가 의심되는 글은 저장 전 검토 상태로 전환됩니다."
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title="민감정보가 포함될 수 있어요"
      />
    );
  }

  if (variant === "community-write-draft-recovery") {
    return (
      <ConfirmDialog
        cancelLabel="새로 쓰기"
        confirmLabel="이어서 쓰기"
        description="기기에 안전하게 임시저장된 제목, 본문, 게시판 선택을 불러옵니다. 게시 성공 전에는 서버 성공값처럼 표시하지 않습니다."
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title="임시저장 글을 이어서 쓸까요?"
      />
    );
  }

  if (variant === "community-write-restricted") {
    return (
      <AppShell
        accessibilityLabel="급여납치 커뮤니티 글쓰기 제한 화면 캡처"
        header={<AppHeader subtitle="커뮤니티" title="글쓰기" />}
      >
        <SurfaceCard accessibilityLabel="글쓰기 제한">
          <EmptyState
            description="신고 검토 또는 운영 정책에 따라 새 글 작성이 제한됐습니다. 제한 사유는 마이페이지 > 1:1 문의에서 확인할 수 있습니다."
            title="글쓰기가 제한됐어요"
          />
        </SurfaceCard>
      </AppShell>
    );
  }

  const draft = createCommunityWriteDraft(variant);
  const validation =
    variant === "community-write-validation"
      ? {
          valid: false,
          moderationStatus: "BLOCKED" as const,
          issues: [
            {
              code: "FINANCIAL_DATA" as const,
              field: "content" as const,
              message: "급여·계좌·카드번호 원문은 커뮤니티에 올릴 수 없습니다.",
            },
          ],
        }
      : validatePostDraft(draft);
  const submitting = variant === "community-write-attachments";

  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티 글쓰기 화면 캡처"
      header={<AppHeader subtitle="커뮤니티" title="글쓰기" />}
    >
      {variant === "community-write-attachments" ? (
        <SurfaceCard accessibilityLabel="첨부 업로드 상태">
          <Text style={styles.sectionTitle}>첨부 업로드 중</Text>
          <Text style={styles.body}>
            이미지와 파일은 MIME, 용량, 민감정보 검사를 통과한 뒤 게시 요청에
            포함됩니다.
          </Text>
        </SurfaceCard>
      ) : null}
      {variant === "community-write-draft" ? (
        <SurfaceCard accessibilityLabel="임시저장된 글">
          <Text style={styles.sectionTitle}>임시저장된 글</Text>
          <Text style={styles.body}>
            화면 이동 후 돌아와도 작성 중인 제목, 본문, 태그, 익명 설정을
            복원합니다.
          </Text>
        </SurfaceCard>
      ) : null}
      {variant === "community-write-from-levelup" ? (
        <SurfaceCard accessibilityLabel="LV UP 공유 글쓰기">
          <Text style={styles.sectionTitle}>LV UP 인증 공유</Text>
          <Text style={styles.body}>
            완료된 미션 기록만 서버 권위 응답 기준으로 커뮤니티 글쓰기 초안에
            연결합니다.
          </Text>
        </SurfaceCard>
      ) : null}
      {variant === "community-write-question-anonymous" ? (
        <SurfaceCard accessibilityLabel="질문 익명 설정">
          <Text style={styles.sectionTitle}>질문·익명 설정</Text>
          <Text style={styles.body}>
            질문형 글은 익명 기본값을 유지하고, 개인정보와 금융 원문은 저장 전
            차단합니다.
          </Text>
        </SurfaceCard>
      ) : null}
      <SurfaceCard accessibilityLabel="커뮤니티 글쓰기 입력 폼">
        <CommunityWriteForm
          draft={draft}
          submitting={submitting}
          validation={validation}
          onChange={() => undefined}
          onPreview={() => undefined}
          onSubmit={() => undefined}
        />
      </SurfaceCard>
    </AppShell>
  );
}

function createCommunityWriteDraft(
  variant: CommunityWriteCaptureKind,
): CommunityPostDraft {
  if (variant === "community-write-validation") {
    return {
      anonymous: true,
      boardType: "FREE",
      content: "이번 달 급여와 계좌번호 원문을 그대로 공유하려고 합니다.",
      tags: ["검토필요"],
      title: "민감정보 검토가 필요한 글",
    };
  }

  if (variant === "community-write-from-levelup") {
    return {
      anonymous: true,
      boardType: "LEVEL_CERTIFICATION",
      content:
        "오늘 독서 미션을 완료했습니다. 개인 급여 원문 없이 루틴과 배운 점만 공유합니다.",
      tags: ["레벨업인증", "독서"],
      title: "[LV UP] 독서 미션 완료 인증",
    };
  }

  if (variant === "community-write-question-anonymous") {
    return {
      anonymous: true,
      boardType: "FREE",
      content:
        "고정지출을 줄이는 루틴을 만들고 싶은데 어떤 순서로 시작하면 좋을까요?",
      tags: ["질문", "익명글"],
      title: "질문: 고정지출 루틴은 어디서 시작할까요?",
    };
  }

  return {
    anonymous: true,
    boardType: "FREE",
    content:
      "오늘은 변동지출을 기록하고 다음 급여일까지 지킬 루틴을 정리했습니다.",
    tags: ["자유게시판", "루틴"],
    title: "이번 주 예산 루틴 공유",
  };
}

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

const communityExpandedComments: readonly CommunityComment[] = [
  ...communityDetailComments,
  {
    anonymous: true,
    anonymousDisplayName: "익명 답글러",
    content:
      "저는 같은 카테고리끼리 묶어서 완료 처리하니 다음 급여일까지 흐름을 보기 쉬웠어요.",
    createdAt: "2026-07-12T04:20:00.000Z",
    id: "capture-comment-reply-001",
    likeCount: 2,
    likedByMe: false,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T04:20:00.000Z",
  },
  {
    anonymous: true,
    anonymousDisplayName: "익명 예산러",
    content:
      "민감 금액은 숨기고 성공 여부만 공유하는 게 커뮤니티 운영 기준에도 맞습니다.",
    createdAt: "2026-07-12T04:30:00.000Z",
    id: "capture-comment-reply-002",
    likeCount: 4,
    likedByMe: true,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T04:30:00.000Z",
  },
  {
    anonymous: true,
    anonymousDisplayName: "내 댓글",
    content:
      "좋아요. 다음에는 사용 예정과 완료 상태를 나눠서 인증해 보겠습니다.",
    createdAt: "2026-07-12T04:42:00.000Z",
    id: "capture-comment-own",
    likeCount: 1,
    likedByMe: false,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T04:42:00.000Z",
  },
];

const communityAltComments: readonly CommunityComment[] = [
  {
    anonymous: true,
    anonymousDisplayName: "익명 건강러",
    content:
      "홈트 인증은 통증이나 질병 정보를 세부적으로 노출하지 않고 루틴 완료 여부만 남기면 안전해요.",
    createdAt: "2026-07-12T05:15:00.000Z",
    id: "capture-comment-alt-001",
    likeCount: 7,
    likedByMe: false,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T05:15:00.000Z",
  },
  {
    anonymous: true,
    anonymousDisplayName: "익명 질문러",
    content:
      "질문 글도 개인 계좌나 급여 원문 없이 패턴 중심으로 작성하면 답변을 받기 좋아요.",
    createdAt: "2026-07-12T05:25:00.000Z",
    id: "capture-comment-alt-002",
    likeCount: 6,
    likedByMe: true,
    moderationStatus: "SAFE",
    postId: "capture-post-001",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: "2026-07-12T05:25:00.000Z",
  },
];

type CommunityPostDetailCaptureKind = Extract<
  CapturePreviewKind,
  | "community-post-detail"
  | "community-post-offline"
  | "community-post-comment-restricted"
  | "community-post-own-menu"
  | "community-post-blocked"
  | "community-post-hidden"
  | "community-post-load-error"
  | "community-post-sensitive-warning"
  | "community-post-review-pending"
  | "community-post-hobby"
  | "community-post-deleted"
  | "community-post-restricted"
>;

function createCommunityDetailPost(
  overrides: Partial<CommunityPost>,
): CommunityPost {
  return {
    ...communityDetailPost,
    ...overrides,
    adsFinancialTargetingUsed: false,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
  };
}

function CommunityPostUnavailableCapturePreview({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel={`급여납치 커뮤니티 ${title} 화면 캡처`}
      header={<AppHeader subtitle="커뮤니티" title="게시글 상세" />}
    >
      <SurfaceCard accessibilityLabel={title}>
        <EmptyState description={description} title={title} />
      </SurfaceCard>
      <Text style={styles.guard}>
        커뮤니티 보호 상태는 서버 검수 결과를 따르며, 민감 금융 원문은 화면과
        로그에 남기지 않습니다.
      </Text>
    </AppShell>
  );
}

function CommunityPostDetailCapturePreview({
  variant = "community-post-detail",
}: Readonly<{
  variant?: CommunityPostDetailCaptureKind;
}>): React.ReactElement {
  if (variant === "community-post-load-error") {
    return (
      <AppShell
        accessibilityLabel="급여납치 커뮤니티 게시글 상세 오류 화면 캡처"
        header={<AppHeader subtitle="커뮤니티" title="게시글 상세" />}
      >
        <SurfaceCard accessibilityLabel="게시글 로드 오류">
          <ErrorState
            message="네트워크를 확인하고 다시 시도해 주세요. 실패 상태에서는 민감 급여·지출 데이터를 노출하지 않습니다."
            onRetry={() => undefined}
            title="게시글을 불러오지 못했어요"
          />
        </SurfaceCard>
      </AppShell>
    );
  }

  if (variant === "community-post-sensitive-warning") {
    return (
      <ConfirmDialog
        cancelLabel="계속 보기"
        confirmLabel="신고하기"
        description="급여, 계좌, 카드번호, 연락처 원문은 커뮤니티에 노출하지 않습니다. 민감정보가 의심되는 내용은 신고 후 검토 상태로 전환됩니다."
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title="민감정보가 포함될 수 있어요"
      />
    );
  }

  if (variant === "community-post-own-menu") {
    return (
      <BottomSheet
        actions={[
          {
            key: "edit",
            label: "수정하기",
            description: "제목, 본문, 첨부를 다시 검수 후 저장",
          },
          {
            key: "hide",
            label: "숨김 처리",
            description: "내 프로필과 목록에서만 숨김",
          },
          {
            key: "delete",
            label: "삭제 요청",
            description: "댓글과 신고 이력은 감사 기록으로 보존",
          },
        ]}
        onClose={() => undefined}
        onSelect={() => undefined}
        title="게시글 관리"
      />
    );
  }

  if (variant === "community-post-blocked") {
    return (
      <CommunityPostUnavailableCapturePreview
        description="차단한 사용자의 게시글은 본문과 댓글을 표시하지 않습니다. 차단 관리는 마이페이지에서 변경할 수 있습니다."
        title="차단한 사용자의 글입니다"
      />
    );
  }

  if (variant === "community-post-hidden") {
    return (
      <CommunityPostUnavailableCapturePreview
        description="운영 정책 검토가 끝날 때까지 본문, 댓글, 공유 버튼이 제한됩니다."
        title="운영 정책에 따라 숨김 처리됐어요"
      />
    );
  }

  if (variant === "community-post-deleted") {
    return (
      <CommunityPostUnavailableCapturePreview
        description="작성자 또는 운영 정책에 의해 삭제되어 내용을 볼 수 없습니다."
        title="삭제된 게시글입니다"
      />
    );
  }

  if (variant === "community-post-restricted") {
    return (
      <CommunityPostUnavailableCapturePreview
        description="제한 사유와 해제 요청은 마이페이지 > 1:1 문의에서 확인할 수 있습니다."
        title="커뮤니티 이용이 제한됐어요"
      />
    );
  }

  const isOffline = variant === "community-post-offline";
  const isCommentRestricted = variant === "community-post-comment-restricted";
  const isReviewPending = variant === "community-post-review-pending";
  const isHobby = variant === "community-post-hobby";
  const post = createCommunityDetailPost(
    isHobby
      ? {
          boardType: "FREE",
          bodyPreview:
            "퇴근 후 30분 루틴을 유지하는 방법을 공유합니다. 개인 급여 원문 없이 습관과 시간표만 기록합니다.",
          commentCount: 7,
          likeCount: 31,
          title: "[취미] 퇴근 후 루틴을 오래 유지하는 작은 장치",
        }
      : isReviewPending
        ? { moderationStatus: "REVIEW" }
        : {},
  );

  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티 상세 화면 캡처"
      header={<AppHeader subtitle="커뮤니티" title="게시글 상세" />}
    >
      {isOffline ? (
        <SurfaceCard accessibilityLabel="오프라인 상세">
          <Text style={styles.sectionTitle}>오프라인 상세</Text>
          <Text style={styles.body}>
            저장된 본문과 댓글만 표시합니다. 좋아요, 댓글 작성, 신고는 연결 후
            서버 응답 기준으로 동기화됩니다.
          </Text>
        </SurfaceCard>
      ) : null}
      {isReviewPending ? (
        <SurfaceCard accessibilityLabel="신고 검토 중">
          <Text style={styles.sectionTitle}>신고 검토 중</Text>
          <Text style={styles.body}>
            운영 검토가 끝날 때까지 댓글과 공유가 제한됩니다. 검토 화면에서도
            급여·지출 원문은 노출하지 않습니다.
          </Text>
        </SurfaceCard>
      ) : null}
      <CommunityPostCard
        liked
        onLike={() => undefined}
        onPress={() => undefined}
        post={post}
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
        {isCommentRestricted ? (
          <View style={styles.warningBox}>
            <Text style={styles.sectionTitle}>댓글 작성이 제한됐어요</Text>
            <Text style={styles.body}>
              신고 검토 중인 글에는 새 댓글을 달 수 없습니다. 기존 댓글은
              민감정보 마스킹 후 읽기 전용으로 표시됩니다.
            </Text>
          </View>
        ) : null}
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

type CommunityCommentCaptureKind = Extract<
  CapturePreviewKind,
  | "community-comments-load-error"
  | "community-comment-delete-confirm"
  | "community-comment-edit"
  | "community-reply-compose"
  | "community-replies-expanded"
  | "community-block-user-confirm"
  | "community-comment-list"
  | "community-comments-loading-more"
  | "community-comment-submitting"
  | "community-comment-thread"
  | "community-comment-thread-alt"
  | "community-no-comments"
  | "community-comment-thread-policy"
>;

function CommunityCommentCapturePreview({
  variant,
}: Readonly<{
  variant: CommunityCommentCaptureKind;
}>): React.ReactElement {
  if (variant === "community-comment-delete-confirm") {
    return (
      <ConfirmDialog
        cancelLabel="취소"
        confirmLabel="삭제"
        description="삭제한 댓글은 목록에서 숨김 처리되고, 신고와 운영 감사 기록은 보존됩니다."
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title="댓글을 삭제할까요?"
      />
    );
  }

  if (variant === "community-block-user-confirm") {
    return (
      <ConfirmDialog
        cancelLabel="취소"
        confirmLabel="차단"
        description="차단하면 이 사용자의 글과 댓글이 내 커뮤니티 화면에 표시되지 않습니다."
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title="이 사용자를 차단할까요?"
      />
    );
  }

  if (variant === "community-comments-load-error") {
    return (
      <AppShell
        accessibilityLabel="급여납치 댓글 로드 오류 화면 캡처"
        header={<AppHeader subtitle="커뮤니티" title="댓글" />}
      >
        <SurfaceCard accessibilityLabel="댓글 로드 오류">
          <ErrorState
            message="네트워크 상태를 확인하고 다시 시도해 주세요. 실패 상태에서도 급여·지출 원문은 로그나 화면에 노출하지 않습니다."
            onRetry={() => undefined}
            title="댓글을 불러오지 못했어요"
          />
        </SurfaceCard>
      </AppShell>
    );
  }

  if (variant === "community-no-comments") {
    return (
      <AppShell
        accessibilityLabel="급여납치 댓글 빈 상태 화면 캡처"
        header={<AppHeader subtitle="커뮤니티" title="댓글" />}
      >
        <CommunityPostCard
          liked
          onLike={() => undefined}
          onPress={() => undefined}
          post={communityDetailPost}
        />
        <SurfaceCard accessibilityLabel="댓글 없음">
          <EmptyState
            description="첫 댓글을 남기면 작성 전 민감정보 검사가 먼저 실행됩니다."
            title="아직 댓글이 없어요"
          />
        </SurfaceCard>
      </AppShell>
    );
  }

  const isEdit = variant === "community-comment-edit";
  const isReply = variant === "community-reply-compose";
  const isExpanded = variant === "community-replies-expanded";
  const isLoadingMore = variant === "community-comments-loading-more";
  const isSubmitting = variant === "community-comment-submitting";
  const isAlt = variant === "community-comment-thread-alt";
  const isPolicy = variant === "community-comment-thread-policy";
  const title = isEdit ? "댓글 수정" : isReply ? "답글 작성" : "댓글";
  const comments = isAlt
    ? communityAltComments
    : isExpanded
      ? communityExpandedComments
      : communityDetailComments;

  return (
    <AppShell
      accessibilityLabel="급여납치 댓글과 반응 화면 캡처"
      header={<AppHeader subtitle="커뮤니티" title={title} />}
    >
      <CommunityPostCard
        liked
        onLike={() => undefined}
        onPress={() => undefined}
        post={communityDetailPost}
      />
      {isPolicy ? (
        <SurfaceCard accessibilityLabel="댓글 보호 정책">
          <Text style={styles.sectionTitle}>댓글 보호 정책</Text>
          <Text style={styles.body}>
            댓글에는 급여, 계좌, 카드번호, 연락처 원문을 남길 수 없습니다.
            신고·차단·삭제 처리는 서버 기준으로 기록되고 광고 데이터와
            분리됩니다.
          </Text>
        </SurfaceCard>
      ) : null}
      {(isEdit || isReply || isSubmitting) && (
        <SurfaceCard accessibilityLabel={isReply ? "답글 작성" : "댓글 수정"}>
          <Text style={styles.sectionTitle}>
            {isReply ? "답글 작성" : isEdit ? "댓글 수정" : "댓글 저장 중"}
          </Text>
          <TextInput
            accessibilityLabel="댓글 내용"
            multiline
            placeholder="민감정보 없이 응원과 조언을 남겨 주세요"
            style={styles.multilineInput}
            value={
              isReply
                ? "답글로 루틴을 더 자세히 공유해 볼게요."
                : "금액 원문 없이 루틴만 공유하는 방식이 좋아요."
            }
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? "저장 중" : "저장"}
            onPress={() => undefined}
          />
        </SurfaceCard>
      )}
      {isExpanded ? (
        <SurfaceCard accessibilityLabel="답글 3개 펼침">
          <Text style={styles.sectionTitle}>답글 3개 펼침</Text>
          <Text style={styles.body}>
            대댓글은 부모 댓글 아래에 묶어서 표시하고, 신고·차단 상태는 즉시
            반영합니다.
          </Text>
        </SurfaceCard>
      ) : null}
      <SurfaceCard accessibilityLabel="댓글 목록">
        <Text style={styles.sectionTitle}>
          {variant === "community-comment-list" ? "댓글 목록" : "댓글 스레드"}
        </Text>
        {comments.map((comment) => (
          <CommunityCommentItem
            key={comment.id}
            canDelete={comment.id === "capture-comment-own"}
            comment={comment}
            onDelete={() => undefined}
            onReport={() => undefined}
          />
        ))}
        {isLoadingMore ? (
          <View style={styles.loadingMore}>
            <LoadingSkeleton label="댓글을 더 불러오는 중" />
          </View>
        ) : null}
      </SurfaceCard>
    </AppShell>
  );
}

type MyLevelUpStateCaptureKind = Extract<
  CapturePreviewKind,
  | "my-levelup-activity-records"
  | "my-levelup-record-detail"
  | "my-levelup-empty-records"
  | "my-levelup-statistics"
  | "my-levelup-offline-records"
  | "my-levelup-xp-history"
>;

const myLevelUpStateContent: Record<
  MyLevelUpStateCaptureKind,
  Readonly<{
    title: string;
    status: string;
    description: string;
    rows: readonly [string, string][];
    mode?: "detail" | "empty" | "offline" | "stats" | "xp";
  }>
> = {
  "my-levelup-activity-records": {
    description:
      "최근 독서, 뉴스, 영어, 건강 완료 기록을 서버 기준 완료 시간과 함께 보여줍니다.",
    rows: [
      ["독서", "기획의 정석 완료"],
      ["뉴스", "AI 산업 균형 읽기 완료"],
      ["건강", "상체 루틴 기록 완료"],
    ],
    status: "최근 활동",
    title: "내 레벨업 관리",
  },
  "my-levelup-empty-records": {
    description:
      "아직 완료 기록이 없을 때 빈 화면과 오늘의 추천 미션 CTA를 보여줍니다.",
    mode: "empty",
    rows: [
      ["완료 기록", "0개"],
      ["추천", "오늘의 LV UP 시작"],
      ["XP", "미지급"],
    ],
    status: "빈 상태",
    title: "레벨업 기록 없음",
  },
  "my-levelup-offline-records": {
    description:
      "오프라인에서는 마지막으로 캐시된 기록만 읽기 전용으로 보여주고 완료/공유/XP 지급은 재연결 후 처리합니다.",
    mode: "offline",
    rows: [
      ["캐시 기록", "5개"],
      ["쓰기 작업", "일시 중지"],
      ["동기화", "대기"],
    ],
    status: "오프라인",
    title: "오프라인 레벨업 기록",
  },
  "my-levelup-record-detail": {
    description:
      "단일 미션 상세는 기록 내용, 완료 시간, 지급 XP, 공유 상태를 민감 금융정보 없이 확인합니다.",
    mode: "detail",
    rows: [
      ["미션", "뉴스 균형 읽기"],
      ["완료 시간", "2026-07-22 08:30 KST"],
      ["지급 XP", "35 XP"],
    ],
    status: "상세",
    title: "레벨업 기록 상세",
  },
  "my-levelup-statistics": {
    description:
      "주간 완료율, 카테고리별 기록, 연속 달성 일수를 집계로만 보여주며 급여·지출 원문과 연결하지 않습니다.",
    mode: "stats",
    rows: [
      ["주간 완료율", "82%"],
      ["연속 달성", "12일"],
      ["최다 분야", "뉴스"],
    ],
    status: "통계",
    title: "레벨업 통계",
  },
  "my-levelup-xp-history": {
    description:
      "XP ledger 이력은 지급, 중복 차단, 취소를 분리해 보여주고 같은 일일 미션의 중복 지급을 막습니다.",
    mode: "xp",
    rows: [
      ["지급", "+35 XP"],
      ["중복 차단", "뉴스 1건"],
      ["누적", "1,240 XP"],
    ],
    status: "XP 이력",
    title: "XP 지급 이력",
  },
};

function MyLevelUpStateCapturePreview({
  variant,
}: Readonly<{ variant: MyLevelUpStateCaptureKind }>): React.ReactElement {
  const content = myLevelUpStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking my level-up management Stitch capture"
      header={<AppHeader subtitle="MY" title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.heroAmount}>
            {content.mode === "xp"
              ? "1,240 XP"
              : content.mode === "stats"
                ? "82%"
                : "18LV"}
          </Text>
          <Text style={styles.body}>{content.description}</Text>
          {content.mode === "stats" ? <ProgressBar value={82} /> : null}
        </SurfaceCard>

        {content.mode === "empty" ? (
          <EmptyState
            description="오늘의 독서, 뉴스, 영어, 건강 미션 중 하나를 시작하면 이곳에 기록됩니다."
            title="아직 완료한 레벨업이 없어요"
          />
        ) : null}

        {content.mode === "offline" ? (
          <View style={styles.warningBox}>
            <Text style={styles.guard}>
              오프라인 기록은 읽기 전용입니다. 완료, XP, 커뮤니티 공유는 서버
              재확인 후 반영됩니다.
            </Text>
          </View>
        ) : null}

        <SurfaceCard accessibilityLabel="레벨업 기록 목록">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            ["중복 지급", "차단"],
            ["공유 검토", "민감정보 제거"],
            ["서버 기록", "필수"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="오늘의 LV UP 보기" onPress={() => undefined} />
      </View>
    </AppShell>
  );
}

type InquiryStateCaptureKind = Extract<
  CapturePreviewKind,
  | "inquiry-detail-answered"
  | "inquiry-empty"
  | "inquiry-detail-pending"
  | "inquiry-offline-preview"
  | "inquiry-submitted"
  | "inquiry-create"
>;

const inquiryStateContent: Record<
  InquiryStateCaptureKind,
  Readonly<{
    title: string;
    status: string;
    description: string;
    mode: "answered" | "empty" | "pending" | "offline" | "submitted" | "create";
    rows: readonly [string, string][];
  }>
> = {
  "inquiry-create": {
    description:
      "문의 유형, 제목, 내용을 입력하면 민감 금융정보 원문을 검사한 뒤 서버 접수 요청으로 전송합니다.",
    mode: "create",
    rows: [
      ["문의 유형", "앱 이용"],
      ["첨부", "선택"],
      ["개인정보", "원문 입력 차단"],
    ],
    status: "작성 중",
    title: "1:1 문의 작성",
  },
  "inquiry-detail-answered": {
    description:
      "운영자가 답변한 문의는 원문 급여·계좌·토큰을 마스킹한 상태로 상세 내용을 확인합니다.",
    mode: "answered",
    rows: [
      ["문의", "일일 예산 저장이 보이지 않아요"],
      ["답변", "최신 앱에서 서버 동기화 후 표시됩니다."],
      ["처리", "답변 완료"],
    ],
    status: "답변 완료",
    title: "문의 상세",
  },
  "inquiry-detail-pending": {
    description:
      "접수된 문의는 답변 전까지 수정 가능 상태를 유지하고, 중복 제출을 막는 접수 번호를 표시합니다.",
    mode: "pending",
    rows: [
      ["문의", "알림 딥링크가 열리지 않아요"],
      ["접수 번호", "INQ-20260722-019"],
      ["예상 답변", "영업일 기준 1일"],
    ],
    status: "답변 대기",
    title: "문의 상세",
  },
  "inquiry-empty": {
    description:
      "아직 등록한 문의가 없을 때 바로 문의를 작성할 수 있는 빈 상태를 제공합니다.",
    mode: "empty",
    rows: [
      ["최근 문의", "0건"],
      ["도움말", "공지사항 먼저 확인"],
      ["작성", "가능"],
    ],
    status: "빈 목록",
    title: "1:1 문의",
  },
  "inquiry-offline-preview": {
    description:
      "네트워크가 끊겨도 기존 문의를 읽기 전용으로 보여주고 새 문의 내용은 성공처럼 표시하지 않습니다.",
    mode: "offline",
    rows: [
      ["동기화", "대기"],
      ["작성 초안", "기기 안에 임시 보관"],
      ["서버 접수", "재연결 후 가능"],
    ],
    status: "오프라인",
    title: "1:1 문의",
  },
  "inquiry-submitted": {
    description:
      "문의 접수 성공 후 접수 번호와 알림 수신 상태를 보여주고, 상세 화면으로 이동할 수 있습니다.",
    mode: "submitted",
    rows: [
      ["접수 번호", "INQ-20260722-021"],
      ["알림", "답변 시 앱 알림"],
      ["저장", "서버 접수 완료"],
    ],
    status: "접수 완료",
    title: "문의가 접수됐어요",
  },
};

function InquiryStateCapturePreview({
  variant,
}: Readonly<{ variant: InquiryStateCaptureKind }>): React.ReactElement {
  const content = inquiryStateContent[variant];
  const isCreate = content.mode === "create";

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking inquiry Stitch state capture"
      header={<AppHeader subtitle="MY" title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          <Text style={styles.body}>{content.description}</Text>
          {content.mode === "offline" ? (
            <View style={styles.warningBox}>
              <Text style={styles.guard}>
                오프라인 상태에서는 문의를 성공 처리하지 않고, 재연결 후 서버
                접수 결과를 확인합니다.
              </Text>
            </View>
          ) : null}
        </SurfaceCard>

        {content.mode === "empty" ? (
          <EmptyState
            description="앱 이용, 계정, 지출 저장, 알림 문제를 안전하게 문의할 수 있습니다."
            title="등록된 문의가 없어요"
          />
        ) : null}

        {isCreate ? (
          <SurfaceCard accessibilityLabel="1:1 문의 입력">
            <Text style={styles.sectionTitle}>문의 내용</Text>
            <TextInput
              accessibilityLabel="문의 유형"
              editable={false}
              style={styles.singleLineInput}
              value="앱 이용"
            />
            <TextInput
              accessibilityLabel="문의 제목"
              editable={false}
              style={styles.singleLineInput}
              value="일일 예산 저장 후 홈 동기화 확인"
            />
            <TextInput
              accessibilityLabel="문의 본문"
              editable={false}
              multiline
              style={styles.multilineInput}
              value="저장 실패 시 입력값을 보존하고 민감 금융정보 원문은 자동 차단해 주세요."
            />
            <Text style={styles.guard}>
              계좌번호, 카드번호, 토큰, 급여 원문은 문의 본문에 그대로 저장하지
              않습니다.
            </Text>
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="문의 처리 정보">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            ["민감정보", "마스킹"],
            ["접수", content.mode === "offline" ? "대기" : "서버 기준"],
            ["알림", "답변 딥링크"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={isCreate ? "문의 접수" : "문의 목록으로"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

type ProfileAccountStateCaptureKind = Extract<
  CapturePreviewKind,
  | "profile-account-restricted"
  | "profile-data-export-ready"
  | "profile-withdrawal-requested"
  | "profile-biometric-app-lock"
  | "profile-withdrawal-reason"
  | "profile-rejoin-blocked"
  | "profile-data-export-processing"
  | "profile-withdrawal-precheck"
  | "profile-privacy-usage-history"
  | "profile-data-export-request"
  | "profile-password-change"
  | "profile-account-settings-default"
>;

const profileAccountStateContent: Record<
  ProfileAccountStateCaptureKind,
  Readonly<{
    title: string;
    description: string;
    rows: readonly string[];
    actionLabel: string;
    inputLabel?: string;
  }>
> = {
  "profile-account-restricted": {
    actionLabel: "1:1 문의하기",
    description:
      "비정상 로그인 시도 또는 운영 제재가 있으면 계정 기능을 제한하고 사유만 안전하게 표시합니다.",
    rows: [
      "사유는 요약으로 표시",
      "토큰·기기 원문 비노출",
      "해제 요청은 서버 기록 기준",
    ],
    title: "계정 접근이 제한됐어요",
  },
  "profile-data-export-ready": {
    actionLabel: "파일 받기",
    description:
      "개인정보 내보내기 파일이 준비됐습니다. 다운로드 링크는 만료 시간이 있고 재무 원천 데이터는 정책 기준으로 분리됩니다.",
    rows: ["요청 ID 표시", "만료 시간 표시", "다운로드 전 재인증 필요"],
    title: "내보내기 파일이 준비됐어요",
  },
  "profile-withdrawal-requested": {
    actionLabel: "요청 취소",
    description:
      "탈퇴 요청이 접수됐고 유예 기간 동안 취소할 수 있습니다. 법정 보존 대상은 별도 보관 정책을 따릅니다.",
    rows: [
      "탈퇴 예정일 표시",
      "커뮤니티 익명화 예정",
      "광고 식별 데이터 분리 삭제",
    ],
    title: "탈퇴 요청이 접수됐어요",
  },
  "profile-biometric-app-lock": {
    actionLabel: "앱 잠금 켜기",
    description:
      "앱 실행과 백그라운드 복귀 시 기기 보안 인증을 요청합니다. 생체정보 원문은 앱 서버에 저장하지 않습니다.",
    rows: [
      "기기 보안 사용",
      "실패 시 비밀번호 재인증",
      "알림 내용 미리보기 숨김",
    ],
    title: "앱 잠금 설정",
  },
  "profile-withdrawal-reason": {
    actionLabel: "탈퇴 요청 저장",
    description:
      "탈퇴 사유는 서비스 개선용 집계로만 사용하며 민감 금융 정보 입력을 차단합니다.",
    inputLabel: "탈퇴 사유",
    rows: ["사유 선택", "자유 입력", "마케팅 동의 별도 철회"],
    title: "탈퇴 사유 입력",
  },
  "profile-rejoin-blocked": {
    actionLabel: "정책 확인",
    description:
      "제재 또는 탈퇴 유예 기간에는 재가입이 제한될 수 있습니다. 제한 근거와 해제 예정일을 표시합니다.",
    rows: ["해제 예정일", "문의 경로", "개인정보 보존 근거"],
    title: "재가입이 제한됐어요",
  },
  "profile-data-export-processing": {
    actionLabel: "요청 상태 새로고침",
    description:
      "내보내기 파일을 생성 중입니다. 처리 중에도 앱은 종료되지 않고 상태만 갱신합니다.",
    rows: ["처리 중", "완료 시 알림", "원문 토큰 비노출"],
    title: "내보내기 파일을 준비 중이에요",
  },
  "profile-withdrawal-precheck": {
    actionLabel: "탈퇴 계속",
    description:
      "탈퇴 전 미결 문의, 신고 처리, 법정 보존 대상 데이터를 확인합니다.",
    rows: ["미결 문의 0건", "정산 대기 0건", "보존 대상 안내"],
    title: "탈퇴 전 확인",
  },
  "profile-privacy-usage-history": {
    actionLabel: "자세히 보기",
    description:
      "개인정보 이용 내역은 목적, 보관 기간, 처리 상태만 표시하고 급여·계좌 원문은 노출하지 않습니다.",
    rows: ["로그인 보안 기록", "알림 토큰 처리", "광고 동의 변경 이력"],
    title: "개인정보 이용 내역",
  },
  "profile-data-export-request": {
    actionLabel: "내보내기 요청",
    description:
      "요청 범위와 이메일 수신 여부를 선택합니다. 요청 전 비밀번호 재확인을 거칩니다.",
    inputLabel: "요청 메모",
    rows: ["프로필 정보", "커뮤니티 활동", "LV UP 기록"],
    title: "데이터 내보내기 요청",
  },
  "profile-password-change": {
    actionLabel: "비밀번호 변경",
    description:
      "현재 비밀번호와 새 비밀번호를 검증하고, 변경 후 모든 기기 세션을 서버에서 재확인합니다.",
    inputLabel: "새 비밀번호",
    rows: ["8자 이상", "재사용 방지", "토큰 재발급"],
    title: "비밀번호 변경",
  },
  "profile-account-settings-default": {
    actionLabel: "보안 점검",
    description:
      "로그인, 자동 로그인, 소셜 연결, 데이터 내보내기, 탈퇴 요청을 한 곳에서 관리합니다.",
    rows: ["자동 로그인 켜짐", "소셜 연결 2개", "데이터 내보내기 가능"],
    title: "계정 설정",
  },
};

function ProfileAccountStateCapturePreview({
  variant,
}: Readonly<{
  variant: ProfileAccountStateCaptureKind;
}>): React.ReactElement {
  const content = profileAccountStateContent[variant];
  return (
    <AppShell
      accessibilityLabel={`급여납치 ${content.title} 화면 캡처`}
      header={<AppHeader subtitle="MY" title={content.title} />}
    >
      <SurfaceCard accessibilityLabel="계정 보안 요약">
        <Text style={styles.sectionTitle}>계정 보안 요약</Text>
        <Text style={styles.body}>
          세션, 자동 로그인, 소셜 연결, 데이터 내보내기, 탈퇴 요청은 모두 서버
          기록 기준으로 처리합니다.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>세션</Text>
            <Text style={styles.metricValue}>보호 중</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>소셜 연결</Text>
            <Text style={styles.metricValue}>2개</Text>
          </View>
        </View>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel={content.title}>
        <Text style={styles.sectionTitle}>{content.title}</Text>
        <Text style={styles.body}>{content.description}</Text>
        {content.inputLabel ? (
          <TextInput
            accessibilityLabel={content.inputLabel}
            placeholder={content.inputLabel}
            secureTextEntry={variant === "profile-password-change"}
            style={styles.singleLineInput}
            value={
              variant === "profile-password-change"
                ? "********"
                : "서비스 개선을 위한 요청 메모"
            }
          />
        ) : null}
        {content.rows.map((row) => (
          <View key={row} style={styles.detailRow}>
            <Text style={styles.detailText}>{row}</Text>
            <Text style={styles.detailStatus}>보호</Text>
          </View>
        ))}
        {variant === "profile-data-export-processing" ? (
          <LoadingSkeleton label="내보내기 파일 생성 중" />
        ) : null}
        <PrimaryButton label={content.actionLabel} onPress={() => undefined} />
      </SurfaceCard>
      <Text style={styles.guard}>
        계정 화면은 토큰, 비밀번호, 이메일 전체, 전화번호 전체, 금융 원문을
        표시하지 않습니다.
      </Text>
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

type TermsConsentStateCaptureKind = Extract<
  CapturePreviewKind,
  | "terms-ad-data-separation-policy"
  | "terms-detailed-consent"
  | "terms-fulltext"
  | "terms-personalized-ads-consent"
  | "terms-consent-alt"
  | "terms-review"
>;

const termsConsentStateContent: Record<
  TermsConsentStateCaptureKind,
  Readonly<{
    title: string;
    status: string;
    description: string;
    mode: "policy" | "detail" | "fulltext" | "ads" | "alt" | "review";
    rows: readonly [string, string][];
  }>
> = {
  "terms-ad-data-separation-policy": {
    description:
      "급여, 지출, 저축 원문 데이터는 광고 타겟팅·제휴 리포트와 분리하고 집계 지표만 별도 동의 기준으로 사용합니다.",
    mode: "policy",
    rows: [
      ["급여 원문", "광고 미사용"],
      ["지출 세부", "광고 미사용"],
      ["제휴 리포트", "익명 집계"],
    ],
    status: "광고 데이터 분리",
    title: "광고·제휴 데이터 정책",
  },
  "terms-consent-alt": {
    description:
      "필수 동의와 선택 동의를 같은 화면에서 확인하되, 선택 동의 거절이 서비스 이용을 막지 않도록 분리합니다.",
    mode: "alt",
    rows: [
      ["서비스 약관", "필수"],
      ["개인정보 처리", "필수"],
      ["마케팅 알림", "선택"],
    ],
    status: "동의 선택",
    title: "약관 동의",
  },
  "terms-detailed-consent": {
    description:
      "항목별 수집 목적, 보관 기간, 철회 경로를 확인하고 동의 버전을 서버 감사 로그로 남깁니다.",
    mode: "detail",
    rows: [
      ["인증 정보", "계정 생성·로그인"],
      ["급여 계획", "예산 계산"],
      ["커뮤니티", "신고·운영"],
    ],
    status: "상세 동의",
    title: "개인정보 상세 동의",
  },
  "terms-fulltext": {
    description:
      "이용약관 전문은 긴 본문에서도 safe area와 스크롤 여백을 유지하고, 최신 약관 버전을 명확히 표시합니다.",
    mode: "fulltext",
    rows: [
      ["버전", "2026.07.12"],
      ["적용", "급여납치 모바일 앱"],
      ["문의", "support@salaryhijacking.com"],
    ],
    status: "전문 보기",
    title: "이용약관 전문",
  },
  "terms-personalized-ads-consent": {
    description:
      "개인화 광고는 선택 동의이며, 민감 금융 원문·계좌·토큰·커뮤니티 신고 정보는 광고에 제공하지 않습니다.",
    mode: "ads",
    rows: [
      ["개인화 광고", "선택"],
      ["민감 금융정보", "제공 금지"],
      ["철회", "마이페이지에서 가능"],
    ],
    status: "선택 동의",
    title: "개인화 광고 동의",
  },
  "terms-review": {
    description:
      "동의 전 최종 확인 단계에서 필수 항목 누락, 선택 항목 상태, 약관 버전을 한 번 더 검토합니다.",
    mode: "review",
    rows: [
      ["필수 동의", "완료"],
      ["선택 동의", "거절 가능"],
      ["버전 기록", "서버 저장 대기"],
    ],
    status: "검토",
    title: "동의 내용 확인",
  },
};

function TermsConsentStateCapturePreview({
  variant,
}: Readonly<{ variant: TermsConsentStateCaptureKind }>): React.ReactElement {
  const content = termsConsentStateContent[variant];
  const progress =
    content.mode === "review" ? 90 : content.mode === "fulltext" ? 64 : 72;

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking terms consent Stitch state capture"
      header={<AppHeader subtitle="약관" title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          <Text style={styles.body}>{content.description}</Text>
          <ProgressBar value={progress} />
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="동의 항목">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            ["필수/선택", content.mode === "ads" ? "선택" : "분리"],
            ["철회 경로", "MY 제공"],
            ["민감 원문", "광고 차단"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        {content.mode === "fulltext" ? (
          <SurfaceCard accessibilityLabel="이용약관 본문 요약">
            <Text style={styles.body}>
              서비스 이용, 계정 보안, 급여 계획 계산, 커뮤니티 운영, 광고 데이터
              분리, 문의와 탈퇴 절차를 최신 약관 버전으로 안내합니다.
            </Text>
          </SurfaceCard>
        ) : null}

        <PrimaryButton
          label={content.mode === "ads" ? "선택 저장" : "확인"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
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

function ExpenseFormVariantCapturePreview({
  variant,
}: Readonly<{
  variant:
    | "expense-form-edit"
    | "expense-form-refund"
    | "expense-form-validation"
    | "expense-delete-blocked"
    | "expense-invalidate-reason";
}>): React.ReactElement {
  if (variant === "expense-delete-blocked") {
    return (
      <AppShell
        accessibilityLabel="급여납치 지출 삭제 제한 모달 캡처"
        header={<AppHeader subtitle="지출 관리" title="변동 지출" />}
      >
        <ConfirmDialog
          cancelLabel="닫기"
          confirmLabel="취소 요청하기"
          description="정산이 완료된 지출은 취소 요청으로 처리합니다."
          onCancel={() => undefined}
          onConfirm={() => undefined}
          title="삭제할 수 없는 지출입니다"
        />
      </AppShell>
    );
  }

  if (variant === "expense-invalidate-reason") {
    return (
      <AppShell
        accessibilityLabel="급여납치 지출 무효 처리 사유 바텀시트 캡처"
        header={<AppHeader subtitle="지출 관리" title="지출 무효 처리" />}
      >
        <SurfaceCard accessibilityLabel="지출 무효 처리 안내">
          <Text style={styles.sectionTitle}>무효 사유 입력</Text>
          <Text style={styles.body}>
            사유는 감사 로그에 남고 금액 원문은 광고 데이터와 분리됩니다.
          </Text>
        </SurfaceCard>
        <BottomSheet
          actions={[
            {
              key: "duplicate",
              label: "중복 입력",
              description: "같은 지출이 두 번 저장된 경우 선택합니다.",
            },
            {
              key: "refund",
              label: "환불/취소",
              description: "결제 취소 또는 환불이 확인된 경우 선택합니다.",
            },
            {
              key: "wrong-amount",
              label: "잘못된 금액",
              description:
                "금액 또는 카테고리를 정정해야 하는 경우 선택합니다.",
            },
          ]}
          onClose={() => undefined}
          onSelect={() => undefined}
          title="무효 처리 사유"
        />
      </AppShell>
    );
  }

  if (variant === "expense-form-refund") {
    return (
      <AppShell
        accessibilityLabel="급여납치 환불 처리 바텀시트 캡처"
        header={<AppHeader subtitle="지출 관리" title="환불 처리" />}
      >
        <SurfaceCard accessibilityLabel="환불 처리 안내">
          <Text style={styles.sectionTitle}>환불 처리</Text>
          <Text style={styles.body}>
            서버 승인 전에는 지출 합계에 반영하지 않습니다.
          </Text>
        </SurfaceCard>
        <BottomSheet
          actions={[
            {
              key: "card",
              label: "카드 결제 취소",
              description: "승인 취소 확인 후 납치 금액을 재계산합니다.",
            },
            {
              key: "cash",
              label: "현금 환불",
              description: "환불 메모와 금액을 남기고 검토 대기합니다.",
            },
          ]}
          onClose={() => undefined}
          onSelect={() => undefined}
          title="환불 유형 선택"
        />
      </AppShell>
    );
  }

  const isValidation = variant === "expense-form-validation";

  return (
    <AppShell
      accessibilityLabel="급여납치 변동 지출 편집 화면 캡처"
      header={
        <AppHeader
          subtitle={isValidation ? "입력 오류" : "지출 관리"}
          title={isValidation ? "입력값을 확인해 주세요" : "변동 지출 수정"}
        />
      }
    >
      <SurfaceCard accessibilityLabel="변동 지출 편집 카드">
        <Text style={styles.sectionTitle}>
          {isValidation ? "입력값을 확인해 주세요" : "변동 지출 수정"}
        </Text>
        <Text style={styles.body}>
          카테고리, 내용, 금액을 수정하면 서버 응답 기준으로 급여 홈 요약을 다시
          계산합니다.
        </Text>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="지출 입력 폼">
        <Text style={styles.formLabel}>카테고리</Text>
        <View style={styles.segmentRow}>
          {["게임", "식비", "교통", "기타"].map((category) => (
            <View
              key={category}
              style={[
                styles.segmentChip,
                category === "게임" ? styles.segmentChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentChipText,
                  category === "게임" ? styles.segmentChipTextActive : null,
                ]}
              >
                {category}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.formLabel}>세부 내용</Text>
        <TextInput
          accessibilityLabel="세부 내용"
          onChangeText={() => undefined}
          placeholder="무엇에 썼는지 입력"
          placeholderTextColor={componentColors.textMuted}
          style={styles.singleLineInput}
          value={isValidation ? "" : "폴드센스 파스콘 구입"}
        />
        <Text style={styles.formLabel}>금액</Text>
        <TextInput
          accessibilityLabel="금액"
          keyboardType="number-pad"
          onChangeText={() => undefined}
          placeholder="금액"
          placeholderTextColor={componentColors.textMuted}
          style={[
            styles.singleLineInput,
            isValidation ? styles.inputError : null,
          ]}
          value={isValidation ? "0" : "15,000"}
        />
        {isValidation ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            금액은 1원 이상이어야 합니다.
          </Text>
        ) : null}
        <PrimaryButton
          accessibilityLabel={
            isValidation ? "입력값 다시 확인" : "지출 수정 저장"
          }
          label={isValidation ? "다시 확인" : "수정 저장"}
          onPress={() => undefined}
        />
      </SurfaceCard>
    </AppShell>
  );
}

function ModalConfirmCapturePreview(): React.ReactElement {
  return (
    <ConfirmDialog
      cancelLabel="취소"
      confirmLabel="사용 완료"
      description="오늘 예정된 지출을 사용 완료로 변경하면 이번 급여주기 요약에만 반영되고 다음 급여주기에는 다시 사용 예정으로 생성됩니다."
      onCancel={() => undefined}
      onConfirm={() => undefined}
      title="지출 상태 변경"
    />
  );
}

type AmountInputErrorDialogCaptureKind = Extract<
  CapturePreviewKind,
  | "payroll-amount-validation-error"
  | "salary-amount-check"
  | "amount-input-error"
  | "monthly-budget-over-limit"
>;

const amountInputErrorDialogContent: Record<
  AmountInputErrorDialogCaptureKind,
  Readonly<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
  }>
> = {
  "amount-input-error": {
    cancelLabel: "닫기",
    confirmLabel: "다시 입력",
    description:
      "금액은 0원보다 큰 정수로 입력해야 합니다. 쉼표와 원 표시는 화면에서만 적용하고 저장값에는 포함하지 않습니다.",
    title: "금액을 다시 확인해주세요",
  },
  "monthly-budget-over-limit": {
    cancelLabel: "계속 수정",
    confirmLabel: "생활비 계획 보기",
    description:
      "일일 생활비 합계가 월별 사용 가능 예산을 초과했습니다. 초과 상태는 주황색 경고와 함께 표시하고 서버 권위 계산을 변경하지 않습니다.",
    title: "생활비 예산을 초과했어요",
  },
  "payroll-amount-validation-error": {
    cancelLabel: "닫기",
    confirmLabel: "급여 다시 입력",
    description:
      "수령 예상 급여는 원 단위 정수로 입력해야 합니다. 급여, 지출, 저축 원문은 광고나 커뮤니티 payload로 전달하지 않습니다.",
    title: "급여 금액 입력 오류",
  },
  "salary-amount-check": {
    cancelLabel: "계속 입력",
    confirmLabel: "확인 후 저장",
    description:
      "입력한 급여보다 지출 예정 금액이 큽니다. 저장 전 예상 납치금액과 오늘 예산을 다시 확인하세요.",
    title: "급여 계획을 확인해주세요",
  },
};

function AmountInputErrorDialogCapturePreview({
  variant,
}: Readonly<{
  variant: AmountInputErrorDialogCaptureKind;
}>): React.ReactElement {
  const content = amountInputErrorDialogContent[variant];

  return (
    <View testID={`capture-${variant}`}>
      <ConfirmDialog
        cancelLabel={content.cancelLabel}
        confirmLabel={content.confirmLabel}
        description={content.description}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title={content.title}
      />
      <View style={styles.warningBox}>
        <Text style={styles.guard}>
          입력 실패 상태는 성공 저장값처럼 표시하지 않고, 사용자가 입력한 초안은
          화면에 보존합니다.
        </Text>
      </View>
    </View>
  );
}

type PlanExpenseModalCaptureKind = Extract<
  CapturePreviewKind,
  | "expense-delete-confirm-alt"
  | "deletion-processing"
  | "plan-save-success"
  | "plan-save-success-alt"
  | "budget-plan-warning"
  | "daily-budget-overrun"
>;

const planExpenseModalContent: Record<
  PlanExpenseModalCaptureKind,
  Readonly<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    destructive?: boolean;
  }>
> = {
  "budget-plan-warning": {
    cancelLabel: "계획 수정",
    confirmLabel: "초과 항목 보기",
    description:
      "이번 급여주기의 예정 지출이 목표 납치금액을 침범합니다. 홈과 계획은 같은 서버 권위 요약을 기준으로 경고를 표시합니다.",
    title: "목표 달성률이 낮아졌어요",
  },
  "daily-budget-overrun": {
    cancelLabel: "닫기",
    confirmLabel: "지출 조정",
    description:
      "오늘 사용액이 일일 예산을 초과했습니다. 초과 금액은 빨간색 상태와 안내 문구로 함께 표시합니다.",
    title: "오늘 예산을 넘었어요",
  },
  "deletion-processing": {
    cancelLabel: "목록 보기",
    confirmLabel: "처리 상태 확인",
    description:
      "삭제 요청을 서버에 반영하는 중입니다. 성공 전에는 목록에서 영구 삭제된 것처럼 표시하지 않습니다.",
    title: "삭제 처리 중",
  },
  "expense-delete-confirm-alt": {
    cancelLabel: "취소",
    confirmLabel: "삭제",
    description:
      "반복 지출 템플릿은 보존하고 현재 급여주기의 선택 항목만 삭제합니다. 이미 완료된 지출의 감사 기록은 유지됩니다.",
    destructive: true,
    title: "이 지출을 삭제할까요?",
  },
  "plan-save-success": {
    cancelLabel: "계속 편집",
    confirmLabel: "홈에서 확인",
    description:
      "급여 계획이 저장되었습니다. 급여일, 고정지출, 고정저축, 일일 생활비가 홈 화면 예정 항목과 동기화됩니다.",
    title: "계획 저장 완료",
  },
  "plan-save-success-alt": {
    cancelLabel: "닫기",
    confirmLabel: "다음 급여주기 보기",
    description:
      "변경 사항은 현재 급여주기에 반영되고, 반복 항목은 다음 급여주기에 새 예정 항목으로 다시 생성됩니다.",
    title: "급여 계획이 반영됐어요",
  },
};

function PlanExpenseModalCapturePreview({
  variant,
}: Readonly<{
  variant: PlanExpenseModalCaptureKind;
}>): React.ReactElement {
  const content = planExpenseModalContent[variant];

  return (
    <View testID={`capture-${variant}`}>
      <ConfirmDialog
        cancelLabel={content.cancelLabel}
        confirmLabel={content.confirmLabel}
        description={content.description}
        {...(content.destructive ? { destructive: true } : {})}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title={content.title}
      />
      <View style={styles.warningBox}>
        <Text style={styles.guard}>
          서버 응답 전에는 성공, 삭제, 저장 완료 상태를 영구 결과처럼 표시하지
          않습니다.
        </Text>
      </View>
    </View>
  );
}

type LevelUpResultModalCaptureKind = Extract<
  CapturePreviewKind,
  | "english-levelup-share"
  | "reading-levelup"
  | "levelup-celebration"
  | "levelup-result"
>;

const levelUpResultModalContent: Record<
  LevelUpResultModalCaptureKind,
  Readonly<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    reward: string;
  }>
> = {
  "english-levelup-share": {
    cancelLabel: "닫기",
    confirmLabel: "커뮤니티 공유",
    description:
      "오늘의 영어 회화 미션 완료가 서버에 기록되었습니다. 공유 문구에는 급여, 지출, 저축 원문을 포함하지 않습니다.",
    reward: "+35 XP",
    title: "영어 LV UP 달성",
  },
  "levelup-celebration": {
    cancelLabel: "계속하기",
    confirmLabel: "성과 보기",
    description:
      "일일 미션 누적 기록이 레벨 기준을 넘었습니다. 중복 완료와 중복 XP 지급은 서버에서 차단됩니다.",
    reward: "19 LV",
    title: "레벨이 올랐어요",
  },
  "levelup-result": {
    cancelLabel: "닫기",
    confirmLabel: "LV UP 홈",
    description:
      "이번 레벨업 결과는 XP ledger, streak, 콘텐츠 완료 기록을 기준으로 계산되었습니다.",
    reward: "성장 점수 +4.2",
    title: "오늘의 성장 결과",
  },
  "reading-levelup": {
    cancelLabel: "닫기",
    confirmLabel: "독서 기록 보기",
    description:
      "독서 미션 완료가 저장되었고 추천 도서 기록이 갱신되었습니다. 같은 날짜의 중복 완료는 XP를 다시 지급하지 않습니다.",
    reward: "+30 XP",
    title: "독서 LV UP 달성",
  },
};

function LevelUpResultModalCapturePreview({
  variant,
}: Readonly<{
  variant: LevelUpResultModalCaptureKind;
}>): React.ReactElement {
  const content = levelUpResultModalContent[variant];

  return (
    <View testID={`capture-${variant}`}>
      <ConfirmDialog
        cancelLabel={content.cancelLabel}
        confirmLabel={content.confirmLabel}
        description={content.description}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title={content.title}
      />
      <SurfaceCard accessibilityLabel={`${content.title} 보상`}>
        <Text style={styles.kicker}>서버 권위 보상</Text>
        <Text style={styles.heroAmount}>{content.reward}</Text>
        <Text style={styles.body}>
          완료 성공, 중복 완료, 공유 검토 상태를 분리하고 성공 전에는 보상을
          지급된 것처럼 표시하지 않습니다.
        </Text>
      </SurfaceCard>
    </View>
  );
}

type RemainingOverlayCaptureKind = Extract<
  CapturePreviewKind,
  | "certification-share-review"
  | "share-standard-blocked"
  | "levelup-share-review"
  | "comment-report-reason"
  | "post-report-reason"
  | "report-reason-selector"
  | "report-result-board"
  | "comment-report-success"
  | "date-selection-collection"
  | "recurrence-selector"
  | "file-photo-attachment"
  | "post-menu-collection"
  | "sort-filter"
  | "visibility-selector"
  | "draft-exit-state-board"
  | "device-permission-guide"
  | "post-registration-result-board"
  | "withdrawal-final-confirm"
>;

const remainingBottomSheetContent: Partial<
  Record<
    RemainingOverlayCaptureKind,
    Readonly<{
      title: string;
      actions: ReadonlyArray<{
        key: string;
        label: string;
        description: string;
      }>;
    }>
  >
> = {
  "certification-share-review": {
    actions: [
      {
        description: "미션명, 레벨, 완료 시각만 공유",
        key: "safe",
        label: "안전 공유",
      },
      {
        description: "급여, 지출, 저축 원문 제거 후 검토",
        key: "review",
        label: "검토 요청",
      },
    ],
    title: "인증 공유 검토",
  },
  "comment-report-reason": {
    actions: [
      {
        description: "계좌, 카드, 연락처, 급여 원문 포함",
        key: "private",
        label: "개인정보 의심",
      },
      {
        description: "욕설, 혐오, 반복 홍보",
        key: "abuse",
        label: "부적절한 댓글",
      },
    ],
    title: "댓글 신고 사유",
  },
  "date-selection-collection": {
    actions: [
      {
        description: "현재 급여주기의 오늘 날짜",
        key: "today",
        label: "오늘",
      },
      {
        description: "KST 기준 다음 예정일",
        key: "next",
        label: "다음 예정일",
      },
      {
        description: "직접 날짜를 선택",
        key: "custom",
        label: "날짜 선택",
      },
    ],
    title: "날짜 선택",
  },
  "file-photo-attachment": {
    actions: [
      {
        description: "사진 권한 허용 후 이미지 첨부",
        key: "photo",
        label: "사진",
      },
      {
        description: "파일 크기와 MIME 검증 후 업로드",
        key: "file",
        label: "파일",
      },
      {
        description: "임시 첨부 목록에서 제거",
        key: "remove",
        label: "첨부 삭제",
      },
    ],
    title: "첨부 선택",
  },
  "levelup-share-review": {
    actions: [
      {
        description: "레벨업 인증 게시판으로 공유",
        key: "level",
        label: "레벨업 인증",
      },
      {
        description: "익명 공유 전 민감정보 재검토",
        key: "anonymous",
        label: "익명 공유",
      },
    ],
    title: "LV UP 공유",
  },
  "post-menu-collection": {
    actions: [
      {
        description: "작성자 본인 게시글 수정",
        key: "edit",
        label: "수정하기",
      },
      {
        description: "숨김 처리 후 감사 기록 보존",
        key: "delete",
        label: "삭제하기",
      },
      {
        description: "부적절한 게시글 신고",
        key: "report",
        label: "신고하기",
      },
    ],
    title: "게시글 메뉴",
  },
  "post-report-reason": {
    actions: [
      {
        description: "민감 금융정보 원문 노출",
        key: "finance",
        label: "금융정보 노출",
      },
      {
        description: "광고, 도배, 외부 링크 유도",
        key: "spam",
        label: "스팸",
      },
    ],
    title: "게시글 신고 사유",
  },
  "recurrence-selector": {
    actions: [
      {
        description: "매월 같은 날짜에 예정 항목 생성",
        key: "monthly",
        label: "매월",
      },
      {
        description: "매주 같은 요일에 생활비 항목 생성",
        key: "weekly",
        label: "매주",
      },
      {
        description: "이번 급여주기에만 적용",
        key: "once",
        label: "한 번만",
      },
    ],
    title: "반복 주기",
  },
  "report-reason-selector": {
    actions: [
      {
        description: "급여, 계좌, 카드, 연락처 원문 포함",
        key: "sensitive",
        label: "민감정보",
      },
      {
        description: "욕설, 혐오, 괴롭힘",
        key: "abuse",
        label: "부적절한 내용",
      },
      {
        description: "광고 또는 피싱 의심",
        key: "spam",
        label: "스팸/사기",
      },
    ],
    title: "신고 사유 선택",
  },
  "share-standard-blocked": {
    actions: [
      {
        description: "민감정보 제거 후 다시 공유",
        key: "sanitize",
        label: "내용 정리",
      },
      {
        description: "운영자 검토 요청",
        key: "review",
        label: "검토 요청",
      },
    ],
    title: "공유 기준 확인",
  },
  "sort-filter": {
    actions: [
      {
        description: "최신 작성 순",
        key: "latest",
        label: "최신순",
      },
      {
        description: "좋아요와 댓글 반응 기준",
        key: "popular",
        label: "인기순",
      },
      {
        description: "내가 참여한 글",
        key: "mine",
        label: "참여글",
      },
    ],
    title: "정렬과 필터",
  },
  "visibility-selector": {
    actions: [
      {
        description: "닉네임과 레벨만 공개",
        key: "public",
        label: "공개",
      },
      {
        description: "내 활동 관리 화면에서만 노출",
        key: "private",
        label: "비공개",
      },
    ],
    title: "프로필 공개 범위",
  },
};

const remainingDialogContent: Partial<
  Record<
    RemainingOverlayCaptureKind,
    Readonly<{
      title: string;
      description: string;
      confirmLabel: string;
      cancelLabel: string;
      destructive?: boolean;
    }>
  >
> = {
  "comment-report-success": {
    cancelLabel: "닫기",
    confirmLabel: "신고 내역 보기",
    description:
      "댓글 신고가 접수되었습니다. 운영 검수 전까지 신고 대상과 신고자 정보는 서로에게 노출되지 않습니다.",
    title: "신고가 접수됐어요",
  },
  "device-permission-guide": {
    cancelLabel: "나중에",
    confirmLabel: "설정 열기",
    description:
      "사진, 알림, 카메라 권한이 거절되어도 앱은 종료되지 않습니다. 필요한 기능에서만 시스템 설정으로 안내합니다.",
    title: "권한 설정이 필요해요",
  },
  "draft-exit-state-board": {
    cancelLabel: "계속 작성",
    confirmLabel: "임시저장 후 나가기",
    description:
      "작성 중인 제목, 본문, 첨부, 익명/질문 선택을 기기에 안전하게 보존합니다.",
    title: "작성 중인 글이 있어요",
  },
  "post-registration-result-board": {
    cancelLabel: "목록 보기",
    confirmLabel: "작성글 보기",
    description:
      "게시글 등록이 완료되었습니다. 민감정보 검수 대상은 공개 전 검토 상태로 분리됩니다.",
    title: "게시글이 등록됐어요",
  },
  "report-result-board": {
    cancelLabel: "닫기",
    confirmLabel: "처리 기준 보기",
    description:
      "신고가 접수되었고 운영 큐에 추가되었습니다. 신고 사유와 대상 식별자는 운영 감사 로그에만 저장됩니다.",
    title: "신고 접수 완료",
  },
  "withdrawal-final-confirm": {
    cancelLabel: "취소",
    confirmLabel: "탈퇴 요청",
    description:
      "탈퇴 요청 후 법적 보존 대상 기록을 제외한 개인 데이터 삭제 절차가 시작됩니다. 이 작업은 다시 한 번 확인이 필요합니다.",
    destructive: true,
    title: "정말 탈퇴할까요?",
  },
};

function RemainingOverlayCapturePreview({
  variant,
}: Readonly<{
  variant: RemainingOverlayCaptureKind;
}>): React.ReactElement {
  const sheet = remainingBottomSheetContent[variant];
  if (sheet) {
    return (
      <View testID={`capture-${variant}`} style={{ flex: 1 }}>
        <BottomSheet
          actions={sheet.actions}
          onClose={() => undefined}
          onSelect={() => undefined}
          title={sheet.title}
        />
      </View>
    );
  }

  const dialog = remainingDialogContent[variant];
  if (dialog) {
    return (
      <View testID={`capture-${variant}`}>
        <ConfirmDialog
          cancelLabel={dialog.cancelLabel}
          confirmLabel={dialog.confirmLabel}
          description={dialog.description}
          {...(dialog.destructive ? { destructive: true } : {})}
          onCancel={() => undefined}
          onConfirm={() => undefined}
          title={dialog.title}
        />
        <SurfaceCard accessibilityLabel={`${dialog.title} 처리 원칙`}>
          <Text style={styles.kicker}>운영/개인정보 원칙</Text>
          <Text style={styles.body}>
            성공 전에는 영구 결과처럼 표시하지 않고, 신고와 삭제성 요청은 감사
            로그와 검수 상태를 분리합니다.
          </Text>
        </SurfaceCard>
      </View>
    );
  }

  return (
    <View testID={`capture-${variant}`}>
      <SurfaceCard accessibilityLabel="오버레이 상태">
        <Text style={styles.kicker}>오버레이 상태</Text>
        <Text style={styles.heroAmount}>검토 필요</Text>
        <Text style={styles.body}>
          해당 상태는 공통 보호 화면으로 표시되며 민감한 금융 원문을 노출하지
          않습니다.
        </Text>
      </SurfaceCard>
    </View>
  );
}

function ModalLevelResultCapturePreview(): React.ReactElement {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel="커뮤니티 공유"
      description="독서 미션 완료가 서버 기준으로 기록되었고 30 XP가 지급되었습니다. 같은 미션은 오늘 다시 완료할 수 없습니다."
      onCancel={() => undefined}
      onConfirm={() => undefined}
      title="LV UP 완료"
    />
  );
}

type MissionCompleteModalCaptureKind = Extract<
  CapturePreviewKind,
  | "news-mission-complete"
  | "health-already-complete"
  | "news-already-complete"
  | "reading-already-complete"
  | "workout-record-complete"
  | "mission-complete-xp"
  | "xp-result-state-board"
>;

const missionCompleteContent: Record<
  Exclude<MissionCompleteModalCaptureKind, "xp-result-state-board">,
  Readonly<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    duplicate?: boolean;
  }>
> = {
  "health-already-complete": {
    cancelLabel: "닫기",
    confirmLabel: "건강 기록 보기",
    description:
      "오늘의 건강 미션은 이미 서버에 기록되었습니다. 같은 날짜의 XP는 다시 지급하지 않고 기존 완료 기록만 보여줍니다.",
    duplicate: true,
    title: "오늘 홈트 미션 완료됨",
  },
  "mission-complete-xp": {
    cancelLabel: "닫기",
    confirmLabel: "LV UP 보기",
    description:
      "미션 완료가 서버 중복 검사와 XP ledger 트랜잭션을 통과했습니다. 지급된 XP와 연속 기록만 공유할 수 있습니다.",
    title: "30 XP가 지급됐어요",
  },
  "news-already-complete": {
    cancelLabel: "닫기",
    confirmLabel: "뉴스 기록 보기",
    description:
      "오늘의 뉴스 미션은 이미 완료되었습니다. 같은 기사 또는 같은 일일 미션은 중복 완료로 처리하지 않습니다.",
    duplicate: true,
    title: "뉴스 미션 완료됨",
  },
  "news-mission-complete": {
    cancelLabel: "닫기",
    confirmLabel: "커뮤니티 공유",
    description:
      "뉴스 균형 읽기 기록이 저장되었고 35 XP가 지급되었습니다. 공유 전 민감 급여·지출 원문은 자동으로 차단됩니다.",
    title: "뉴스 미션 완료",
  },
  "reading-already-complete": {
    cancelLabel: "닫기",
    confirmLabel: "독서 기록 보기",
    description:
      "오늘의 독서 미션은 이미 완료되었습니다. 앱은 기존 완료 상태를 유지하고 XP 중복 지급을 막습니다.",
    duplicate: true,
    title: "독서 미션 완료됨",
  },
  "workout-record-complete": {
    cancelLabel: "닫기",
    confirmLabel: "홈트 기록 보기",
    description:
      "운동 기록과 통증 체크가 저장되었습니다. 건강 콘텐츠는 의료 효과를 보장하지 않고 안전 안내를 함께 보여줍니다.",
    title: "홈트 기록 완료",
  },
};

function MissionCompleteModalCapturePreview({
  variant,
}: Readonly<{
  variant: MissionCompleteModalCaptureKind;
}>): React.ReactElement {
  if (variant === "xp-result-state-board") {
    return (
      <AppShell
        accessibilityLabel="Salary Hijacking XP result state board"
        header={<AppHeader subtitle="LV UP" title="XP 결과" />}
      >
        <View testID={`capture-${variant}`}>
          <SurfaceCard accessibilityLabel="XP 결과 상태">
            <Text style={styles.kicker}>서버 권위 완료 결과</Text>
            <Text style={styles.heroAmount}>+30 XP</Text>
            <Text style={styles.body}>
              완료, 중복 완료, 지급 실패, 공유 검토 상태를 한 흐름으로
              분리합니다. 성공 전에는 XP를 지급된 것처럼 표시하지 않습니다.
            </Text>
            <ProgressBar value={76} />
          </SurfaceCard>
          {(
            [
              ["완료", "XP ledger 기록 완료"],
              ["중복 완료", "오늘 이미 지급됨"],
              ["공유 검토", "민감정보 제거 후 가능"],
            ] as const
          ).map(([label, value]) => (
            <SurfaceCard key={label} accessibilityLabel={label}>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>{label}</Text>
                <Text style={styles.detailStatus}>{value}</Text>
              </View>
            </SurfaceCard>
          ))}
        </View>
      </AppShell>
    );
  }

  const content = missionCompleteContent[variant];

  return (
    <View testID={`capture-${variant}`}>
      <ConfirmDialog
        cancelLabel={content.cancelLabel}
        confirmLabel={content.confirmLabel}
        description={content.description}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        title={content.title}
      />
      {content.duplicate ? (
        <View style={styles.warningBox}>
          <Text style={styles.guard}>
            중복 완료는 성공으로 재처리하지 않으며 서버의 XP ledger 결과를
            그대로 따릅니다.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function BottomSheetCategoryCapturePreview(): React.ReactElement {
  return (
    <BottomSheet
      actions={[
        {
          key: "food",
          label: "음식",
          description: "식사, 카페, 간식 지출",
        },
        {
          key: "subscription",
          label: "구독료",
          description: "정기 결제와 자동 납부",
        },
        {
          key: "saving",
          label: "저축",
          description: "고정 저축과 투자 계획",
        },
        {
          key: "etc",
          label: "기타",
          description: "직접 입력이 필요한 항목",
        },
      ]}
      onClose={() => undefined}
      onSelect={() => undefined}
      title="카테고리 선택"
    />
  );
}

type FixedExpenseFormStateCaptureKind = Extract<
  CapturePreviewKind,
  | "fixed-expense-saving"
  | "fixed-expense-edit-inactive"
  | "fixed-expense-save-failure"
  | "fixed-expense-register"
  | "fixed-expense-add-detailed"
  | "fixed-expense-edit"
>;

const fixedExpenseStateContent: Record<
  FixedExpenseFormStateCaptureKind,
  Readonly<{
    title: string;
    status: string;
    description: string;
    category: string;
    detail: string;
    amount: string;
    payday: string;
    rows: readonly [string, string][];
    mode?: "saving" | "error" | "inactive" | "detail";
  }>
> = {
  "fixed-expense-add-detailed": {
    amount: "32,000원",
    category: "구독료",
    description:
      "세부 추가 화면은 지출일, 구분명, 소비명, 단가, 수량, 금액을 모두 수정할 수 있게 제공합니다.",
    detail: "ChatGPT",
    mode: "detail",
    payday: "매월 10일",
    rows: [
      ["반복 템플릿", "유지"],
      ["이번 주기 occurrence", "예정 생성"],
      ["홈 동기화", "해당 날짜 표시"],
    ],
    status: "상세 추가",
    title: "월별 고정 지출 추가",
  },
  "fixed-expense-edit": {
    amount: "14,900원",
    category: "구독료 납부",
    description:
      "수정 화면은 현재 급여주기 occurrence와 다음 반복 템플릿 영향을 분리해 보여줍니다.",
    detail: "유튜브 프리미엄",
    payday: "매월 10일",
    rows: [
      ["수정 범위", "이번 주기 + 다음 반복 선택"],
      ["완료 상태", "예정"],
      ["감사 로그", "수정 사유 기록"],
    ],
    status: "수정",
    title: "고정 지출 수정",
  },
  "fixed-expense-edit-inactive": {
    amount: "13,500원",
    category: "구독료",
    description:
      "비활성 항목은 과거 기록을 보존하되 현재 급여주기 지출 합계에는 포함하지 않습니다.",
    detail: "MS오피스",
    mode: "inactive",
    payday: "비활성",
    rows: [
      ["현재 주기", "미반영"],
      ["이력", "보존"],
      ["다음 생성", "중지"],
    ],
    status: "비활성 수정",
    title: "비활성 고정 지출",
  },
  "fixed-expense-register": {
    amount: "200,000원",
    category: "대출금 상환",
    description:
      "고정지출 등록은 카테고리, 금액, 내용, 지출일을 입력하고 서버 성공 후 홈 예정 항목으로 동기화됩니다.",
    detail: "학자금 대출",
    payday: "매월 25일",
    rows: [
      ["지출일", "25일"],
      ["상태", "사용 예정"],
      ["광고 데이터", "금융 원문 분리"],
    ],
    status: "등록",
    title: "고정 지출 등록",
  },
  "fixed-expense-save-failure": {
    amount: "32,000원",
    category: "구독료",
    description:
      "저장 실패 시 작성한 값은 유지되고 홈 화면에는 성공한 지출처럼 반영하지 않습니다.",
    detail: "ChatGPT",
    mode: "error",
    payday: "매월 10일",
    rows: [
      ["저장", "실패"],
      ["입력값", "보존"],
      ["재시도", "가능"],
    ],
    status: "저장 실패",
    title: "고정 지출 저장 실패",
  },
  "fixed-expense-saving": {
    amount: "32,000원",
    category: "구독료",
    description:
      "고정지출을 저장하는 동안 중복 제출을 막고 서버 응답 전 성공 상태로 표시하지 않습니다.",
    detail: "ChatGPT",
    mode: "saving",
    payday: "매월 10일",
    rows: [
      ["진행률", "68%"],
      ["중복 요청", "차단"],
      ["홈 반영", "대기"],
    ],
    status: "저장 중",
    title: "고정 지출 저장 중",
  },
};

function FixedExpenseFormStateCapturePreview({
  variant,
}: Readonly<{
  variant: FixedExpenseFormStateCaptureKind;
}>): React.ReactElement {
  const content = fixedExpenseStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking fixed expense Stitch state capture"
      header={<AppHeader subtitle="계획" title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.heroAmount}>{content.amount}</Text>
          <Text style={styles.body}>{content.description}</Text>
          {content.mode === "saving" ? <ProgressBar value={68} /> : null}
        </SurfaceCard>

        {content.mode === "error" ? (
          <SurfaceCard accessibilityLabel="고정 지출 저장 실패">
            <ErrorState
              message="서버 저장에 실패했습니다. 입력한 카테고리, 내용, 금액, 지출일은 그대로 유지됩니다."
              onRetry={() => undefined}
              title="저장하지 못했어요"
            />
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="고정 지출 입력">
          <Text style={styles.formLabel}>카테고리</Text>
          <TextInput
            accessibilityLabel="고정 지출 카테고리"
            onChangeText={() => undefined}
            placeholder="구독료"
            style={styles.singleLineInput}
            value={content.category}
          />
          <Text style={styles.formLabel}>세부 내용</Text>
          <TextInput
            accessibilityLabel="고정 지출 세부 내용"
            onChangeText={() => undefined}
            placeholder="서비스명 또는 상환명"
            style={styles.singleLineInput}
            value={content.detail}
          />
          <Text style={styles.formLabel}>금액</Text>
          <TextInput
            accessibilityLabel="고정 지출 금액"
            keyboardType="number-pad"
            onChangeText={() => undefined}
            placeholder="32000"
            style={styles.singleLineInput}
            value={content.amount}
          />
          <Text style={styles.formLabel}>지출일</Text>
          <TextInput
            accessibilityLabel="고정 지출일"
            onChangeText={() => undefined}
            placeholder="매월 10일"
            style={styles.singleLineInput}
            value={content.payday}
          />
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="고정 지출 저장 계약">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
          <Text style={styles.addLine}>+ 추가하기</Text>
        </SurfaceCard>

        {content.mode === "inactive" ? (
          <View style={styles.warningBox}>
            <Text style={styles.guard}>
              비활성 항목은 삭제하지 않고 다음 occurrence 생성을 멈춥니다. 기존
              완료/예정 기록은 감사 추적을 위해 보존됩니다.
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          label={content.mode === "saving" ? "저장 중..." : "저장"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

type FixedSavingFormStateCaptureKind = Extract<
  CapturePreviewKind,
  | "fixed-saving-add-goal"
  | "fixed-saving-add-savings-goal"
  | "fixed-saving-add-investment"
  | "fixed-saving-saving"
  | "fixed-saving-save-failure"
  | "fixed-saving-edit-savings"
  | "fixed-saving-edit-inactive"
  | "fixed-saving-delete-confirm"
>;

const fixedSavingStateContent: Record<
  FixedSavingFormStateCaptureKind,
  Readonly<{
    title: string;
    description: string;
    category: string;
    detail: string;
    amount: string;
    payday: string;
    actionLabel: string;
    stateLabel: string;
    warning?: string;
    disabled?: boolean;
    destructive?: boolean;
  }>
> = {
  "fixed-saving-add-goal": {
    actionLabel: "목표 저축 추가",
    amount: "200,000원",
    category: "목표저축",
    description:
      "급여일마다 반복되는 저축 목표를 템플릿으로 저장하고, 현재 급여주기 발생분은 서버 권위 계산에만 반영합니다.",
    detail: "여행 방학 목표",
    payday: "매월 25일",
    stateLabel: "신규 목표",
    title: "고정 저축 목표 추가",
  },
  "fixed-saving-add-savings-goal": {
    actionLabel: "저축 목표 저장",
    amount: "300,000원",
    category: "적금",
    description:
      "은행명과 계좌번호 원문 없이 목표명, 납입일, 금액만 저장해 홈과 계획 요약을 동기화합니다.",
    detail: "비상금 적금",
    payday: "매월 25일",
    stateLabel: "신규 적금",
    title: "고정 적금 추가",
  },
  "fixed-saving-add-investment": {
    actionLabel: "투자 계획 저장",
    amount: "150,000원",
    category: "투자",
    description:
      "투자 수익을 보장하지 않고 반복 저축성 계획으로만 표시합니다. 광고 타겟팅에는 원천 금액을 넘기지 않습니다.",
    detail: "지수형 장기 투자",
    payday: "매월 25일",
    stateLabel: "신규 투자",
    title: "고정 투자 계획 추가",
  },
  "fixed-saving-saving": {
    actionLabel: "저장 중",
    amount: "200,000원",
    category: "적금",
    description:
      "저장 요청이 진행 중입니다. 서버 성공 전에는 홈 화면에 영구 성공값처럼 표시하지 않습니다.",
    detail: "NH투자증권 수시 투자",
    payday: "매월 25일",
    stateLabel: "저장 중",
    title: "고정저축 저장 중",
  },
  "fixed-saving-save-failure": {
    actionLabel: "다시 저장",
    amount: "200,000원",
    category: "적금",
    description:
      "네트워크 또는 서버 오류로 저장하지 못했습니다. 입력값은 유지하고 재시도할 수 있습니다.",
    detail: "NH투자증권 수시 투자",
    payday: "매월 25일",
    stateLabel: "저장 실패",
    title: "고정저축 저장 실패",
    warning: "서버 저장 실패: 입력값을 지우지 않고 그대로 보존합니다.",
  },
  "fixed-saving-edit-savings": {
    actionLabel: "수정 저장",
    amount: "250,000원",
    category: "적금",
    description:
      "반복 템플릿과 현재 급여주기 발생분을 구분해 수정합니다. 이미 완료된 occurrence는 감사 기록을 유지합니다.",
    detail: "비상금 적금 금액 수정",
    payday: "매월 25일",
    stateLabel: "수정",
    title: "고정저축 수정",
  },
  "fixed-saving-edit-inactive": {
    actionLabel: "다시 활성화",
    amount: "0원",
    category: "중지됨",
    description:
      "비활성 항목은 현재 홈 예정 목록에 노출하지 않습니다. 다시 활성화하면 다음 급여주기부터 예정으로 생성됩니다.",
    detail: "종료된 여행 적금",
    disabled: true,
    payday: "비활성",
    stateLabel: "비활성",
    title: "비활성 고정저축",
    warning: "비활성 상태에서는 이번 주기 납치금액 계산에 포함하지 않습니다.",
  },
  "fixed-saving-delete-confirm": {
    actionLabel: "삭제",
    amount: "200,000원",
    category: "적금",
    description:
      "삭제는 미래 반복 템플릿만 중단하고 과거 완료/취소 기록은 보존합니다.",
    detail: "NH농협은행 여행 방학",
    destructive: true,
    payday: "매월 25일",
    stateLabel: "삭제 확인",
    title: "고정저축 삭제 확인",
    warning: "이 계획을 삭제해도 이미 완료된 저축 기록은 지워지지 않습니다.",
  },
};

function FixedSavingFormStateCapturePreview({
  variant,
}: Readonly<{
  variant: FixedSavingFormStateCaptureKind;
}>): React.ReactElement {
  const content = fixedSavingStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="급여납치 고정저축 폼 Stitch 상태 캡처"
      header={<AppHeader subtitle="계획" title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="고정저축 상태 설명">
          <Text style={styles.kicker}>{content.stateLabel}</Text>
          <Text style={styles.sectionTitle}>{content.title}</Text>
          <Text style={styles.body}>{content.description}</Text>
          {content.warning ? (
            <View style={styles.warningBox}>
              <Text style={styles.errorText}>{content.warning}</Text>
            </View>
          ) : null}
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="고정저축 입력값">
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>카테고리</Text>
            <Text style={styles.detailStatus}>{content.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>내용</Text>
            <Text style={styles.meta}>{content.detail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>금액</Text>
            <Text style={styles.detailStatus}>{content.amount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>반복일</Text>
            <Text style={styles.meta}>{content.payday}</Text>
          </View>
          {content.destructive ? (
            <ConfirmDialog
              cancelLabel="취소"
              confirmLabel="삭제"
              description={content.warning ?? "반복 저축 계획을 삭제합니다."}
              destructive
              onCancel={() => undefined}
              onConfirm={() => undefined}
              title="삭제하시겠어요?"
            />
          ) : (
            <PrimaryButton
              disabled={content.disabled === true}
              label={content.actionLabel}
              onPress={() => undefined}
            />
          )}
        </SurfaceCard>

        <Text style={styles.guard}>
          고정저축 폼은 서버 성공 응답 이후에만 홈/계획 요약을 갱신하며
          계좌번호와 토큰 원문을 저장하지 않습니다.
        </Text>
      </View>
    </AppShell>
  );
}

function PlanFormStateCapturePreview({
  variant,
}: Readonly<{
  variant: "fixedExpense" | "fixedSaving" | "livingCost";
}>): React.ReactElement {
  const copy = {
    fixedExpense: {
      amount: "32,000원",
      body: "월별 반복 지출은 템플릿과 이번 급여주기 발생분을 분리해서 저장합니다.",
      category: "구독료",
      detail: "ChatGPT 자동 결제",
      title: "월별 고정 지출 설정",
    },
    fixedSaving: {
      amount: "200,000원",
      body: "고정 적금은 완료 처리 시 현재 주기 발생분만 반영하고 다음 주기에는 예정으로 다시 생성합니다.",
      category: "저축",
      detail: "NH투자증권 수시 투자",
      title: "월별 고정 적금 설정",
    },
    livingCost: {
      amount: "6,500원",
      body: "일일 생활비는 하루 기준 금액을 저장하고 서버 기준 일수로 월별 생활비 총액을 계산합니다.",
      category: "점심 식사",
      detail: "KT광화문지사 구내식당",
      title: "일일 생활비 설정",
    },
  }[variant];

  return (
    <AppShell
      accessibilityLabel={`급여납치 ${copy.title} 화면 캡처`}
      header={<AppHeader subtitle="계획" title={copy.title} />}
    >
      <SurfaceCard accessibilityLabel={`${copy.title} 안내`}>
        <Text style={styles.sectionTitle}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel={`${copy.title} 입력 폼`}>
        <View style={styles.detailRow}>
          <Text style={styles.detailText}>카테고리</Text>
          <Text style={styles.detailStatus}>{copy.category}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailText}>내용</Text>
          <Text style={styles.meta}>{copy.detail}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailText}>금액</Text>
          <Text style={styles.detailStatus}>{copy.amount}</Text>
        </View>
        <PrimaryButton label="저장" onPress={() => undefined} />
      </SurfaceCard>
      <Text style={styles.guard}>
        계획 화면 설정은 서버 권위 API 응답 기준으로 홈 화면과 동기화됩니다.
      </Text>
    </AppShell>
  );
}

function PlanStateCapturePreview({
  variant,
}: Readonly<{
  variant:
    | "plan-current-summary"
    | "plan-budget-summary-alt"
    | "plan-salary-info-edit"
    | "plan-previous-picker"
    | "plan-empty"
    | "plan-budget-detail-summary"
    | "plan-validation-warning";
}>): React.ReactElement {
  const isEmpty = variant === "plan-empty";
  const isWarning = variant === "plan-validation-warning";
  const isSalaryEdit = variant === "plan-salary-info-edit";
  const isPreviousPicker = variant === "plan-previous-picker";
  const isBudgetDetail = variant === "plan-budget-detail-summary";
  const isAltSummary = variant === "plan-budget-summary-alt";

  return (
    <AppShell
      accessibilityLabel="급여납치 계획 Stitch 상태 화면 캡처"
      header={<AppHeader subtitle="계획" title="SALARY HIJACKING" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="급여 납치 목표 달성률">
          <View style={styles.metricGrid}>
            <View style={[styles.metricCard, styles.planHeroCopy]}>
              <Text style={styles.sectionTitle}>
                홍길동님의 급여 납치 목표 달성률
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>이번달 목표 납치 금액</Text>
                <Text style={styles.detailStatus}>500,000원</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>총 누적 납치 금액</Text>
                <Text style={styles.dangerText}>2,500,000원</Text>
              </View>
            </View>
            <View style={styles.planPercentBox}>
              <Text style={styles.planPercentText}>
                {isAltSummary ? "72%" : "88%"}
              </Text>
            </View>
          </View>
          {isWarning ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              지출 예상 금액이 수령 예상 급여보다 큽니다. 금액을 다시 확인해
              주세요.
            </Text>
          ) : null}
        </SurfaceCard>

        {isSalaryEdit ? (
          <SurfaceCard accessibilityLabel="내 급여 납치 계획 수정">
            <Text style={styles.sectionTitle}>내 급여 납치 계획/설정</Text>
            <Text style={styles.body}>
              급여 받는 날, 수령 예상 급여, 지출 예상 금액, 예상 납치 금액을
              서버 권위 계산 기준으로 저장합니다.
            </Text>
            <Text style={styles.formLabel}>급여 받는 날</Text>
            <TextInput
              accessibilityLabel="급여 받는 날"
              onChangeText={() => undefined}
              style={styles.singleLineInput}
              value="매월 25일"
            />
            <Text style={styles.formLabel}>수령 예상 급여</Text>
            <TextInput
              accessibilityLabel="수령 예상 급여"
              keyboardType="number-pad"
              onChangeText={() => undefined}
              style={styles.singleLineInput}
              value="서버 기준"
            />
            <PrimaryButton label="저장" onPress={() => undefined} />
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="내 급여 납치 계획 설정 표">
          <View style={styles.planSectionHeader}>
            <Text style={styles.sectionTitle}>내 급여 납치 계획/설정</Text>
            <Text style={styles.planGear}>⚙</Text>
          </View>
          {isEmpty ? (
            <EmptyState
              description="아직 등록된 급여 계획이 없습니다. 추가하기를 눌러 첫 계획을 만드세요."
              title="계획이 비어 있어요"
            />
          ) : (
            <PlanMiniTable
              columns={[
                "급여 받는날",
                "수령 예상 급여",
                "지출 예상 금액",
                "예상 납치 금액",
              ]}
              rows={[["매월 25일", "서버 기준", "서버 기준", "서버 기준"]]}
            />
          )}
          <Text style={styles.addLine}>+추가하기</Text>
        </SurfaceCard>

        {isPreviousPicker ? (
          <SurfaceCard accessibilityLabel="지난 계획 불러오기">
            <Text style={styles.sectionTitle}>이전 계획 불러오기</Text>
            {["2025년 11월 계획", "2025년 10월 계획", "2025년 9월 계획"].map(
              (label) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailText}>{label}</Text>
                  <Text style={styles.detailStatus}>불러오기</Text>
                </View>
              ),
            )}
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="월별 고정 지출 계획 설정">
          <View style={styles.planSectionHeader}>
            <Text style={styles.sectionTitle}>월별 고정 지출 계획/설정</Text>
            <Text style={styles.planGear}>⚙</Text>
          </View>
          <PlanMiniTable
            columns={["지출일", "구분명", "소비명", "단가", "수량", "금액"]}
            rows={[
              [
                "10일",
                "구독료 납부",
                "유튜브 프리미엄",
                "14,900원",
                "1",
                "14,900원",
              ],
              ["10일", "구독료 납부", "ChatGPT", "32,000원", "1", "32,000원"],
              [
                "25일",
                "대출금 상환",
                "학자금 대출",
                "200,000원",
                "1",
                "200,000원",
              ],
            ]}
          />
          <Text style={styles.addLine}>+추가하기</Text>
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="월별 고정 적금 계획 설정">
          <View style={styles.planSectionHeader}>
            <Text style={styles.sectionTitle}>월별 고정 적금 계획/설정</Text>
            <Text style={styles.planGear}>⚙</Text>
          </View>
          <PlanMiniTable
            columns={["지출일", "구분명", "소비명", "단가", "수량", "금액"]}
            rows={[
              [
                "25일",
                "NH농협은행",
                "여행, 방학",
                "200,000원",
                "1",
                "200,000원",
              ],
              [
                "25일",
                "NH투자증권",
                "수시 투자",
                "200,000원",
                "1",
                "200,000원",
              ],
            ]}
          />
          <Text style={styles.addLine}>+추가하기</Text>
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="일일 생활비 계획 설정">
          <View style={styles.planSectionHeader}>
            <Text style={styles.sectionTitle}>일일 생활비 계획/설정</Text>
            <Text style={styles.planGear}>⚙</Text>
          </View>
          <PlanMiniTable
            columns={["일일 생활비 총액", "일수", "월별 생활비 총액"]}
            rows={[["20,000원", "30", "600,000원"]]}
          />
          <PlanMiniTable
            columns={["소분류", "세부 내용", "금액"]}
            rows={[
              ["매점 커피", "빽다방 모닝커피", "2,000원"],
              ["점심 식사", "KT광화문지사 구내식당", "6,500원"],
            ]}
          />
          {isBudgetDetail ? (
            <Text style={styles.guard}>
              일일 생활비는 홈과 계획 화면에서 모두 수정되며 같은 서버 요약
              응답으로 동기화됩니다.
            </Text>
          ) : null}
          <Text style={styles.addLine}>+추가하기</Text>
        </SurfaceCard>
      </View>
    </AppShell>
  );
}

function PlanMiniTable({
  columns,
  rows,
}: Readonly<{
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}>): React.ReactElement {
  return (
    <View style={styles.planTable}>
      <View style={styles.planTableRow}>
        {columns.map((column) => (
          <Text key={column} style={[styles.planCell, styles.planCellHead]}>
            {column}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.join("-")} style={styles.planTableRow}>
          {row.map((cell, index) => (
            <Text key={`${row.join("-")}-${index}`} style={styles.planCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ProfilePostStateCapturePreview({
  variant,
}: Readonly<{
  variant:
    | "profile-posts-loading-skeleton"
    | "profile-posts-offline"
    | "profile-posts-offline-alt"
    | "profile-liked-posts"
    | "profile-drafts"
    | "profile-share-certification-prompt"
    | "profile-community-restricted"
    | "profile-shared-certification-detail"
    | "profile-post-search-empty"
    | "profile-post-management-default"
    | "profile-written-posts-empty";
}>): React.ReactElement {
  const tabLabel =
    variant === "profile-liked-posts"
      ? "좋아요"
      : variant === "profile-drafts"
        ? "임시저장"
        : "내 게시글";
  const isLoading = variant === "profile-posts-loading-skeleton";
  const isOffline =
    variant === "profile-posts-offline" ||
    variant === "profile-posts-offline-alt";
  const isEmpty =
    variant === "profile-post-search-empty" ||
    variant === "profile-written-posts-empty";
  const isRestricted = variant === "profile-community-restricted";
  const isSharePrompt = variant === "profile-share-certification-prompt";
  const isDetail = variant === "profile-shared-certification-detail";

  if (isSharePrompt) {
    return (
      <View testID={`capture-${variant}`}>
        <BottomSheet
          actions={[
            {
              key: "level",
              label: "레벨업 인증 글로 공유",
              description:
                "완료한 LV UP 기록만 커뮤니티에 공유하고 급여 원문은 포함하지 않습니다.",
            },
            {
              key: "draft",
              label: "임시저장으로 보관",
              description:
                "나중에 이어 쓸 수 있게 기기와 서버 초안에 보존합니다.",
            },
          ]}
          onClose={() => undefined}
          onSelect={() => undefined}
          title="성장 기록 공유"
        />
      </View>
    );
  }

  return (
    <AppShell
      accessibilityLabel="급여납치 내 게시글 관리 Stitch 상태 화면 캡처"
      header={<AppHeader subtitle="MY" title="내 게시글 관리" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="내 게시글 관리 요약">
          <Text style={styles.sectionTitle}>내 게시글 관리</Text>
          <Text style={styles.body}>
            작성글, 댓글, 좋아요, 임시저장을 한 곳에서 확인하고 신고/숨김 상태를
            민감 정보 없이 관리합니다.
          </Text>
          <View style={styles.pillRow}>
            {["내 게시글", "댓글", "좋아요", "임시저장"].map((label) => (
              <View
                key={label}
                style={[
                  styles.segmentChip,
                  label === tabLabel ? styles.segmentChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentChipText,
                    label === tabLabel ? styles.segmentChipTextActive : null,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        {isLoading ? (
          <SurfaceCard accessibilityLabel="내 게시글 로딩 중">
            <LoadingSkeleton label="내 게시글을 불러오는 중입니다" />
            <LoadingSkeleton label="커뮤니티 활동 요약을 확인하는 중입니다" />
          </SurfaceCard>
        ) : null}

        {isOffline ? (
          <SurfaceCard accessibilityLabel="오프라인 내 게시글">
            <ErrorState
              message="저장된 활동만 읽을 수 있습니다. 네트워크가 돌아오면 서버 기준으로 다시 동기화합니다."
              title="오프라인 상태입니다"
            />
          </SurfaceCard>
        ) : null}

        {isRestricted ? (
          <SurfaceCard accessibilityLabel="커뮤니티 제한 상태">
            <Text style={styles.sectionTitle}>커뮤니티 활동 제한</Text>
            <Text style={styles.body}>
              신고 검토 중인 계정은 새 글쓰기와 댓글 작성이 제한됩니다. 기존
              게시글은 읽기 전용으로만 표시됩니다.
            </Text>
            <Text style={styles.guard}>
              제한 사유와 해제 예정일은 관리자 감사 로그 기준으로 표시됩니다.
            </Text>
          </SurfaceCard>
        ) : null}

        {isEmpty ? (
          <SurfaceCard accessibilityLabel="내 게시글 빈 상태">
            <EmptyState
              description={
                variant === "profile-post-search-empty"
                  ? "검색어에 맞는 활동이 없습니다."
                  : "아직 작성한 게시글이 없습니다."
              }
              title={
                variant === "profile-post-search-empty"
                  ? "검색 결과가 없어요"
                  : "작성글이 비어 있어요"
              }
            />
          </SurfaceCard>
        ) : null}

        {isDetail ? (
          <SurfaceCard accessibilityLabel="공유한 레벨업 인증 상세">
            <Text style={styles.kicker}>레벨업 인증</Text>
            <Text style={styles.sectionTitle}>
              5일 연속 독서 미션을 완료했어요
            </Text>
            <Text style={styles.body}>
              완료 시간, XP, 연속 기록만 공유하고 급여/지출 원문은 커뮤니티에
              노출하지 않습니다.
            </Text>
          </SurfaceCard>
        ) : null}

        {!isLoading && !isOffline && !isRestricted && !isEmpty && !isDetail ? (
          <SurfaceCard accessibilityLabel="내 커뮤니티 활동 목록">
            {[
              ["[LV.5] 주 6일 운동, 1년 차 아픈 체형 탈출 후기", "레벨업 인증"],
              [
                "회계팀 홍길동입니다. 연말정산 체크리스트 5가지 공유!",
                "자유 게시판",
              ],
              [
                "직장인 부업? 주식 말고 독서모임 운영 수익률 200% 달성",
                "취미 게시판",
              ],
            ].map(([title, board]) => (
              <View key={title} style={styles.detailRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.detailText}>{title}</Text>
                  <Text style={styles.meta}>{board} · 좋아요 12 · 댓글 4</Text>
                </View>
                <Text style={styles.detailStatus}>관리</Text>
              </View>
            ))}
          </SurfaceCard>
        ) : null}
      </View>
    </AppShell>
  );
}

type EnglishStateCaptureKind = Extract<
  CapturePreviewKind,
  | "english-daily-detail"
  | "english-learning-flow"
  | "english-record-success-flow"
  | "english-learning-session-flow"
>;

const englishStateContent: Record<
  EnglishStateCaptureKind,
  Readonly<{
    title: string;
    status: string;
    description: string;
    hero: string;
    rows: readonly [string, string][];
    progress: number;
  }>
> = {
  "english-daily-detail": {
    description:
      "출근, 회의, 예산 주제의 짧은 문장을 듣고 따라 말한 뒤 기록을 남기는 상세 화면입니다.",
    hero: "5문장",
    progress: 24,
    rows: [
      ["Listening", "Bring your safety goggles."],
      ["Speaking", "Let's go out and explore."],
      ["Writing", "A model train."],
    ],
    status: "오늘의 영어",
    title: "영어 회화 상세",
  },
  "english-learning-flow": {
    description:
      "학습 시작, 듣기, 따라 말하기, 기록 저장, 완료 요청까지 단계별로 분리된 native flow입니다.",
    hero: "2/5",
    progress: 44,
    rows: [
      ["1단계", "문장 듣기"],
      ["2단계", "따라 말하기"],
      ["3단계", "짧은 해석 기록"],
    ],
    status: "학습 진행",
    title: "영어 학습 플로우",
  },
  "english-learning-session-flow": {
    description:
      "세션 중에는 중복 제출을 막고, 앱 이탈 후 돌아와도 현재 문장과 기록 상태를 유지합니다.",
    hero: "진행 중",
    progress: 58,
    rows: [
      ["현재 문장", "I'll phone Myungjin."],
      ["타이머", "04:32"],
      ["저장", "임시 기록 유지"],
    ],
    status: "세션 유지",
    title: "영어 세션",
  },
  "english-record-success-flow": {
    description:
      "서버 완료 응답 후 XP ledger와 streak를 반영하고, 같은 일일 미션의 중복 완료를 차단합니다.",
    hero: "+30 XP",
    progress: 100,
    rows: [
      ["완료", "서버 기준"],
      ["XP", "중복 지급 차단"],
      ["커뮤니티 공유", "민감정보 제거 후 가능"],
    ],
    status: "기록 완료",
    title: "영어 기록 성공",
  },
};

function EnglishStateCapturePreview({
  variant,
}: Readonly<{ variant: EnglishStateCaptureKind }>): React.ReactElement {
  const content = englishStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking English level-up Stitch state capture"
      header={<AppHeader subtitle="LV UP" title={content.title} />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.status}</Text>
          <Text style={styles.heroAmount}>{content.hero}</Text>
          <Text style={styles.body}>{content.description}</Text>
          <ProgressBar value={content.progress} />
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="영어 미션 단계">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            [
              "서버 완료",
              variant === "english-record-success-flow" ? "완료" : "대기",
            ],
            ["중복 완료", "차단"],
            ["기록 공개", "사용자 선택"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <RecordInputCard
          label="영어 기록"
          onChangeText={() => undefined}
          onSubmit={() => undefined}
          placeholder="오늘 익힌 표현을 적어보세요"
          value={
            variant === "english-record-success-flow"
              ? "Bring your safety goggles. 회의 전 안전 확인 문장으로 기록"
              : "A model train. 짧은 문장 듣기와 따라 말하기 진행 중"
          }
        />
      </View>
    </AppShell>
  );
}

function HealthStateCapturePreview({
  variant,
}: Readonly<{
  variant:
    | "health-safety-check"
    | "health-offline-cached"
    | "health-workout-detail"
    | "health-safety-unavailable"
    | "health-content-load-error"
    | "health-workout-in-progress"
    | "health-workout-flow"
    | "health-workout-record"
    | "health-flow";
}>): React.ReactElement {
  const isOffline = variant === "health-offline-cached";
  const isSafetyUnavailable = variant === "health-safety-unavailable";
  const isLoadError = variant === "health-content-load-error";
  const isProgress = variant === "health-workout-in-progress";
  const isRecord = variant === "health-workout-record";
  const isFlow = variant === "health-workout-flow" || variant === "health-flow";
  const isDetail = variant === "health-workout-detail";

  return (
    <AppShell
      accessibilityLabel="급여납치 건강 레벨업 Stitch 상태 화면 캡처"
      header={<AppHeader subtitle="LV UP" title="오늘의 홈트, 건강 레벨업" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="건강 레벨업 안전 요약">
          <Text style={styles.kicker}>
            {isOffline
              ? "오프라인 캐시 루틴"
              : isProgress
                ? "운동 진행 중"
                : "운동 전 안전 확인"}
          </Text>
          <Text style={styles.heroAmount}>
            {isProgress ? "04:32" : isFlow ? "3단계" : "10분"}
          </Text>
          <Text style={styles.body}>
            건강 레벨업은 초보자용 가벼운 루틴만 제공하고, 통증이나 불편감이
            있으면 즉시 중단하도록 안내합니다. 완료와 XP 지급은 서버 기록
            기준으로 처리합니다.
          </Text>
          <ProgressBar value={isProgress ? 62 : isFlow ? 34 : 20} />
        </SurfaceCard>

        {isSafetyUnavailable || isLoadError ? (
          <SurfaceCard accessibilityLabel="건강 콘텐츠 오류 상태">
            <ErrorState
              message={
                isSafetyUnavailable
                  ? "안전 안내를 불러오지 못해 운동 시작을 막았습니다. 캐시 루틴이나 재시도를 선택할 수 있습니다."
                  : "건강 콘텐츠 로드에 실패했습니다. 이전 기록은 유지하고 민감 데이터 없이 다시 시도합니다."
              }
              title={
                isSafetyUnavailable
                  ? "안전 정보 확인이 필요해요"
                  : "루틴을 불러오지 못했어요"
              }
            />
          </SurfaceCard>
        ) : null}

        {isRecord ? (
          <RecordInputCard
            label="오늘의 컨디션 기록"
            onChangeText={() => undefined}
            onSubmit={() => undefined}
            placeholder="불편했던 동작, 통증 여부, 다음에 조절할 강도를 적어주세요."
            value="통증 없음, 다음에는 어깨 루틴을 1분 줄여서 진행"
          />
        ) : null}

        <SurfaceCard accessibilityLabel="건강 루틴 체크리스트">
          <View style={styles.pillRow}>
            {["통증 없음", "초보 강도", "물 준비", "무리 금지"].map((label) => (
              <View key={label} style={styles.pill}>
                <Text style={styles.pillText}>{label}</Text>
              </View>
            ))}
          </View>

          {[
            ["목·어깨 풀기", isProgress ? "진행 중" : "사용 예정"],
            ["손목 스트레칭", isFlow ? "다음 단계" : "대기"],
            ["허리 안정 루틴", isDetail ? "상세 확인" : "대기"],
          ].map(([title, status]) => (
            <View key={title} style={styles.detailRow}>
              <Text style={styles.detailText}>{title}</Text>
              <Text
                style={[
                  styles.detailStatus,
                  status === "진행 중" ? styles.dangerText : null,
                ]}
              >
                {status}
              </Text>
            </View>
          ))}

          {isOffline ? (
            <Text style={styles.guard}>
              네트워크 없이도 캐시 루틴은 볼 수 있지만 완료 처리는 서버 재연결
              후 확정됩니다.
            </Text>
          ) : null}

          <PrimaryButton
            label={
              isProgress
                ? "운동 일시정지"
                : isRecord
                  ? "기록 저장"
                  : "운동 시작"
            }
            onPress={() => undefined}
          />
        </SurfaceCard>

        {isDetail || isFlow ? (
          <SurfaceCard accessibilityLabel="건강 루틴 상세 흐름">
            <Text style={styles.sectionTitle}>
              Desk recovery starter routine
            </Text>
            <Text style={styles.body}>
              1분 호흡, 3분 목·어깨, 3분 손목, 3분 허리 안정 순서로 진행합니다.
              의료 진단이나 치료 효과를 보장하지 않습니다.
            </Text>
          </SurfaceCard>
        ) : null}
      </View>
    </AppShell>
  );
}

function LevelStateCapturePreview({
  variant,
}: Readonly<{
  variant:
    | "level-mission-status-board"
    | "level-record-pending"
    | "level-mission-start-confirm"
    | "level-quick-mission-detail"
    | "level-load-error"
    | "level-no-content"
    | "level-all-daily-complete"
    | "level-main-default"
    | "level-mission-progress"
    | "level-recommendations";
}>): React.ReactElement {
  const isConfirm = variant === "level-mission-start-confirm";
  const isError = variant === "level-load-error";
  const isEmpty = variant === "level-no-content";
  const isComplete = variant === "level-all-daily-complete";
  const isProgress = variant === "level-mission-progress";
  const isRecommendations = variant === "level-recommendations";
  const isDetail = variant === "level-quick-mission-detail";
  const isPending = variant === "level-record-pending";

  if (isConfirm) {
    return (
      <View testID={`capture-${variant}`}>
        <ConfirmDialog
          cancelLabel="취소"
          confirmLabel="미션 시작"
          description="오늘의 LV UP 미션을 시작합니다. 완료 요청은 서버에서 중복 지급을 막은 뒤 XP ledger에 기록됩니다."
          onCancel={() => undefined}
          onConfirm={() => undefined}
          title="레벨업 미션 시작"
        />
      </View>
    );
  }

  return (
    <AppShell
      accessibilityLabel="급여납치 LV UP Stitch 상태 화면 캡처"
      header={<AppHeader subtitle="LV UP" title="오늘의 레벨업" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel="LV UP 상태 요약">
          <Text style={styles.kicker}>
            {isComplete ? "오늘 미션 완료" : "성장 루틴"}
          </Text>
          <Text style={styles.heroAmount}>{isComplete ? "4/4" : "18LV"}</Text>
          <Text style={styles.body}>
            독서, 뉴스, 영어, 건강 기록은 서버 기준으로 완료 처리하고 XP와 연속
            기록을 중복 없이 반영합니다.
          </Text>
          <ProgressBar value={isProgress ? 62 : isComplete ? 100 : 48} />
        </SurfaceCard>

        {isError ? (
          <SurfaceCard accessibilityLabel="LV UP 로드 오류">
            <ErrorState
              message="콘텐츠를 불러오지 못했습니다. 저장된 완료 기록은 유지하고 다시 시도할 수 있습니다."
              title="레벨업 콘텐츠 오류"
            />
          </SurfaceCard>
        ) : null}

        {isEmpty ? (
          <SurfaceCard accessibilityLabel="LV UP 콘텐츠 없음">
            <EmptyState
              description="오늘 제공 가능한 레벨업 콘텐츠가 없습니다. 알림으로 다음 콘텐츠를 안내합니다."
              title="오늘 콘텐츠가 없어요"
            />
          </SurfaceCard>
        ) : null}

        {isPending ? (
          <SurfaceCard accessibilityLabel="LV UP 기록 대기">
            <Text style={styles.sectionTitle}>기록 확인 중</Text>
            <Text style={styles.body}>
              완료 기록을 서버에 제출했고 중복 완료 여부와 XP 지급 가능 여부를
              확인하고 있습니다.
            </Text>
          </SurfaceCard>
        ) : null}

        {isDetail ? (
          <SurfaceCard accessibilityLabel="빠른 미션 상세">
            <Text style={styles.sectionTitle}>오늘의 독서, 역량 레벨업</Text>
            <Text style={styles.body}>
              추천 도서를 읽고 핵심 문장을 기록하면 30 XP가 지급됩니다.
            </Text>
            <PrimaryButton label="기록 시작" onPress={() => undefined} />
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="LV UP 미션 목록">
          <View style={styles.metricGrid}>
            {[
              ["독서", isComplete ? "완료" : "독서하기"],
              ["뉴스", isRecommendations ? "AI 추천" : "뉴스보기"],
              ["영어", isProgress ? "진행 중" : "연습하기"],
              ["건강", isComplete ? "완료" : "운동하기"],
            ].map(([title, status]) => (
              <View key={title} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{title}</Text>
                <Text style={styles.metricValue}>{status}</Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        {isRecommendations ? (
          <SurfaceCard accessibilityLabel="AI 추천 레벨업 콘텐츠">
            {[
              "기획의 정석 2장 FOCUS",
              "AI 학습/추론 뉴스",
              "비즈니스 회화",
            ].map((title) => (
              <View key={title} style={styles.detailRow}>
                <Text style={styles.detailText}>{title}</Text>
                <Text style={styles.detailStatus}>추천</Text>
              </View>
            ))}
          </SurfaceCard>
        ) : null}
      </View>
    </AppShell>
  );
}

type ReadingStateCaptureKind = Extract<
  CapturePreviewKind,
  | "reading-source-unavailable"
  | "reading-certification-share-review"
  | "reading-book-detail"
  | "reading-flow"
  | "reading-record-flow"
  | "reading-recommendation-error-empty"
  | "reading-start-confirm"
  | "reading-in-progress"
>;

const readingStateContent: Record<
  Exclude<ReadingStateCaptureKind, "reading-start-confirm">,
  Readonly<{
    title: string;
    kicker: string;
    amount: string;
    description: string;
    progress: number;
    rows: readonly [string, string][];
  }>
> = {
  "reading-book-detail": {
    amount: "30 XP",
    description:
      "Book detail keeps the source, category, mission goal, and non-sensitive reading record contract visible before starting.",
    kicker: "Book detail",
    progress: 35,
    rows: [
      ["Title", "The Art of Focus"],
      ["Category", "Planning / Work"],
      ["Record", "5-minute reflection required"],
    ],
    title: "Reading mission detail",
  },
  "reading-certification-share-review": {
    amount: "Review",
    description:
      "Certification sharing is held for privacy review so salary, account, or raw financial text cannot leak into community posts.",
    kicker: "Share review",
    progress: 92,
    rows: [
      ["Destination", "Level-up certification board"],
      ["Privacy", "Financial raw text blocked"],
      ["Status", "Pending moderation"],
    ],
    title: "Reading certification share",
  },
  "reading-flow": {
    amount: "Step 2/3",
    description:
      "The reading flow keeps the current step, remaining action, and server-owned completion rule in one native screen.",
    kicker: "Reading flow",
    progress: 60,
    rows: [
      ["Read", "Key paragraph completed"],
      ["Reflect", "One sentence pending"],
      ["Submit", "Server duplicate check"],
    ],
    title: "Today reading flow",
  },
  "reading-in-progress": {
    amount: "82%",
    description:
      "In-progress state survives navigation and app resume, then submits only once through the XP ledger transaction.",
    kicker: "In progress",
    progress: 82,
    rows: [
      ["Timer", "04:06"],
      ["Draft", "Saved locally until submit"],
      ["Reward", "Not paid before server success"],
    ],
    title: "Reading in progress",
  },
  "reading-recommendation-error-empty": {
    amount: "Retry",
    description:
      "Recommendation failure shows a recoverable empty/error state instead of a blank screen or fake content.",
    kicker: "Recommendation fallback",
    progress: 12,
    rows: [
      ["Source", "Temporarily unavailable"],
      ["Cached", "Last completed records remain"],
      ["Action", "Retry or choose category"],
    ],
    title: "No reading recommendation",
  },
  "reading-record-flow": {
    amount: "Draft",
    description:
      "Record input is keyboard-safe, preserves unsent text, and separates private reflection from public certification sharing.",
    kicker: "Record flow",
    progress: 78,
    rows: [
      ["Question", "What changed your plan today?"],
      ["Visibility", "Private by default"],
      ["Submit", "Idempotency key required"],
    ],
    title: "Reading record",
  },
  "reading-source-unavailable": {
    amount: "Blocked",
    description:
      "Content with an unverified source cannot be completed for XP; the user can retry or choose another verified reading.",
    kicker: "Source safety",
    progress: 8,
    rows: [
      ["Source", "Verification failed"],
      ["XP", "Blocked until source recovers"],
      ["Fallback", "Cached safe list available"],
    ],
    title: "Reading source unavailable",
  },
};

function ReadingStateCapturePreview({
  variant,
}: Readonly<{ variant: ReadingStateCaptureKind }>): React.ReactElement {
  if (variant === "reading-start-confirm") {
    return (
      <View testID={`capture-${variant}`}>
        <ConfirmDialog
          cancelLabel="Cancel"
          confirmLabel="Start reading"
          description="Start the verified reading mission. Completion is recorded only after the server duplicate check and XP ledger transaction succeed."
          onCancel={() => undefined}
          onConfirm={() => undefined}
          title="Start reading mission"
        />
      </View>
    );
  }

  const content = readingStateContent[variant];
  const isError =
    variant === "reading-source-unavailable" ||
    variant === "reading-recommendation-error-empty";
  const isRecord = variant === "reading-record-flow";

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking reading level-up Stitch state capture"
      header={<AppHeader subtitle="LV UP" title="Reading" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.kicker}</Text>
          <Text style={styles.heroAmount}>{content.amount}</Text>
          <Text style={styles.body}>{content.description}</Text>
          <ProgressBar value={content.progress} />
        </SurfaceCard>

        {isError ? (
          <SurfaceCard accessibilityLabel="Reading recoverable state">
            {variant === "reading-source-unavailable" ? (
              <ErrorState
                message="The reading source is not trusted yet. Cached verified content remains available without exposing private salary data."
                title="Source unavailable"
              />
            ) : (
              <EmptyState
                description="No recommendation is available right now. Retry keeps the current screen and does not grant XP."
                title="Recommendation unavailable"
              />
            )}
          </SurfaceCard>
        ) : null}

        {isRecord ? (
          <SurfaceCard accessibilityLabel="Reading record input">
            <Text style={styles.body}>
              Private notes are saved before navigation and can be shared only
              after privacy review.
            </Text>
            <RecordInputCard
              label="Reading reflection"
              onChangeText={() => undefined}
              onSubmit={() => undefined}
              placeholder="Write one sentence from today's reading."
              value="Budget decisions feel easier after a short reading pause."
            />
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="Reading state rows">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            ["Server check", "Required"],
            ["XP payout", variant.includes("review") ? "Pending" : "Safe"],
            ["Privacy", "Masked"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={isError ? "Retry safely" : "Continue"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

type NewsStateCaptureKind = Extract<
  CapturePreviewKind,
  | "news-mission-flow"
  | "news-share-review"
  | "news-offline-preview"
  | "news-flow"
  | "news-record-input"
  | "news-content-load-error"
  | "news-issue-detail"
>;

const newsStateContent: Record<
  NewsStateCaptureKind,
  Readonly<{
    title: string;
    kicker: string;
    amount: string;
    description: string;
    progress: number;
    rows: readonly [string, string][];
    mode?: "offline" | "error" | "input";
  }>
> = {
  "news-content-load-error": {
    amount: "Retry",
    description:
      "News content failures show a recoverable screen and keep prior XP and records unchanged until the server succeeds.",
    kicker: "Load error",
    mode: "error",
    progress: 10,
    rows: [
      ["Feed", "Unavailable"],
      ["Record", "Preserved"],
      ["XP", "Not paid"],
    ],
    title: "News unavailable",
  },
  "news-flow": {
    amount: "Step 2/4",
    description:
      "The news flow separates read, compare, summarize, and record steps so a mission cannot be completed by opening one article only.",
    kicker: "News flow",
    progress: 58,
    rows: [
      ["Read", "2 articles"],
      ["Compare", "Different perspectives"],
      ["Record", "Pending"],
    ],
    title: "Balanced news flow",
  },
  "news-issue-detail": {
    amount: "3 views",
    description:
      "Issue detail groups market, labor, and policy perspectives while showing source dates and no investment advice.",
    kicker: "Issue detail",
    progress: 45,
    rows: [
      ["Topic", "AI semiconductor policy"],
      ["Sources", "3 verified articles"],
      ["Guard", "No financial advice"],
    ],
    title: "News issue detail",
  },
  "news-mission-flow": {
    amount: "35 XP",
    description:
      "Mission flow keeps the server duplicate check, source verification, and completion ledger visible before XP is granted.",
    kicker: "Mission flow",
    progress: 66,
    rows: [
      ["Source", "Verified"],
      ["Summary", "Required"],
      ["Duplicate", "Server check"],
    ],
    title: "Today news mission",
  },
  "news-offline-preview": {
    amount: "Read-only",
    description:
      "Offline preview displays cached headlines but disables completion and sharing until the server reconnects.",
    kicker: "Offline",
    mode: "offline",
    progress: 22,
    rows: [
      ["Cached", "5 headlines"],
      ["Completion", "Paused"],
      ["Sync", "Waiting"],
    ],
    title: "Offline news preview",
  },
  "news-record-input": {
    amount: "Draft",
    description:
      "Record input captures a short summary and bias check, preserves the draft, and keeps community sharing private by default.",
    kicker: "Record input",
    mode: "input",
    progress: 74,
    rows: [
      ["Prompt", "What changed your view?"],
      ["Bias check", "Required"],
      ["Visibility", "Private"],
    ],
    title: "News reflection record",
  },
  "news-share-review": {
    amount: "Review",
    description:
      "Share review blocks raw salary, account, or private budget details before a news mission can be shared to community.",
    kicker: "Share review",
    progress: 88,
    rows: [
      ["Board", "Level-up certification"],
      ["Privacy", "Sensitive data scan"],
      ["Status", "Pending review"],
    ],
    title: "News share review",
  },
};

function NewsStateCapturePreview({
  variant,
}: Readonly<{ variant: NewsStateCaptureKind }>): React.ReactElement {
  const content = newsStateContent[variant];

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking news level-up Stitch state capture"
      header={<AppHeader subtitle="LV UP" title="News" />}
    >
      <View testID={`capture-${variant}`}>
        <SurfaceCard accessibilityLabel={content.title}>
          <Text style={styles.kicker}>{content.kicker}</Text>
          <Text style={styles.heroAmount}>{content.amount}</Text>
          <Text style={styles.body}>{content.description}</Text>
          <ProgressBar value={content.progress} />
        </SurfaceCard>

        {content.mode === "error" ? (
          <SurfaceCard accessibilityLabel="News load error">
            <ErrorState
              message="The news bundle could not be loaded. Retry keeps the prior record and never grants XP before server success."
              onRetry={() => undefined}
              title="News unavailable"
            />
          </SurfaceCard>
        ) : null}

        {content.mode === "offline" ? (
          <View style={styles.warningBox}>
            <Text style={styles.guard}>
              Offline mode is read-only. Completion, XP, and community share
              resume after source verification.
            </Text>
          </View>
        ) : null}

        {content.mode === "input" ? (
          <SurfaceCard accessibilityLabel="News record input">
            <RecordInputCard
              label="News reflection"
              onChangeText={() => undefined}
              onSubmit={() => undefined}
              placeholder="Summarize the issue and one opposite view."
              value="One source focused on growth, another warned about cost."
            />
          </SurfaceCard>
        ) : null}

        <SurfaceCard accessibilityLabel="News state rows">
          {content.rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailText}>{label}</Text>
              <Text style={styles.detailStatus}>{value}</Text>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.metricGrid}>
          {[
            ["Source dates", "Shown"],
            ["Advice risk", "Blocked"],
            ["XP ledger", variant.includes("share") ? "Pending" : "Required"],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={content.mode === "error" ? "Retry" : "Continue"}
          onPress={() => undefined}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: componentColors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
  },
  authStateDescription: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
    textAlign: "center",
  },
  authStateMessage: {
    alignSelf: "center",
    backgroundColor: componentColors.surfaceSoft,
    borderColor: componentColors.warningOrange,
    borderRadius: componentRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: componentSpacing.sm,
    maxWidth: 365,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
    width: "100%",
  },
  authStateTitle: {
    color: componentColors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center",
  },
  dangerText: {
    color: componentColors.dangerRed,
  },
  addLine: {
    color: componentColors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: componentSpacing.sm,
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
  errorText: {
    color: componentColors.dangerRed,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  warningBox: {
    gap: componentSpacing.xs,
    marginBottom: componentSpacing.sm,
    padding: componentSpacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: componentColors.warningOrange,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surfaceSoft,
  },
  formLabel: {
    color: componentColors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  flexOne: {
    flex: 1,
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
  multilineInput: {
    backgroundColor: componentColors.surfaceSoft,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    borderWidth: StyleSheet.hairlineWidth,
    color: componentColors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 116,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.md,
    textAlignVertical: "top",
  },
  loadingMore: {
    paddingTop: componentSpacing.md,
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
  planCell: {
    borderColor: componentColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    color: componentColors.textPrimary,
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 16,
    minWidth: 54,
    paddingHorizontal: 4,
    paddingVertical: 8,
    textAlign: "center",
  },
  planCellHead: {
    backgroundColor: componentColors.primaryGreen,
    color: componentColors.surface,
    fontWeight: "900",
  },
  planGear: {
    color: componentColors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
  planHeroCopy: {
    gap: componentSpacing.xs,
  },
  planPercentBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 118,
  },
  planPercentText: {
    color: componentColors.primaryGreen,
    fontSize: 52,
    fontWeight: "900",
  },
  planSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  planTable: {
    marginTop: componentSpacing.md,
  },
  planTableRow: {
    flexDirection: "row",
  },
  sectionTitle: {
    color: componentColors.textPrimary,
    fontSize: componentTypography.sectionTitle,
    fontWeight: "900",
  },
  signupStateFrame: {
    gap: componentSpacing.md,
    paddingHorizontal: componentSpacing.lg,
  },
  segmentChip: {
    borderColor: componentColors.line,
    borderRadius: componentRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
  },
  segmentChipActive: {
    backgroundColor: componentColors.primaryGreen,
    borderColor: componentColors.primaryGreen,
  },
  segmentChipText: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  segmentChipTextActive: {
    color: componentColors.surface,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.sm,
  },
  singleLineInput: {
    backgroundColor: componentColors.surfaceSoft,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    borderWidth: StyleSheet.hairlineWidth,
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
  },
  inputError: {
    borderColor: componentColors.dangerRed,
  },
});
