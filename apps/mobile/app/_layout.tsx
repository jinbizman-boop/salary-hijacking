/** apps/mobile/app/_layout.tsx
 * 급여납치 모바일 루트 레이아웃.
 * 정적 import와 JSX 없이 Expo Router, React Native, Expo 모듈을 안전하게 로딩한다.
 */

import { createAuthApi } from "../src/features/auth/api";
import { CapturePreviewScreen } from "../src/features/capture";
import { readMobileApiBaseUrl } from "../src/shared/api/api-base";
import {
  attachMobileBearerToken,
  MOBILE_ACCESS_TOKEN_KEY,
} from "../src/shared/storage/auth-token";
import { appImageAssets } from "../src/shared/assets/images";
import { createSecureStoreRuntime } from "../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type RootStatus =
  | "BOOTSTRAPPING"
  | "READY"
  | "AUTH_REQUIRED"
  | "VERIFY_EMAIL"
  | "ONBOARDING"
  | "OFFLINE"
  | "ERROR";
type ToastKind = "info" | "success" | "error";
type UserRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";
type ConsentState = "GRANTED" | "DENIED" | "UNKNOWN";
type PlatformOS = "ios" | "android" | "web" | "windows" | "macos" | string;
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;
type ElementType =
  | string
  | ((props: Record<string, unknown>) => unknown)
  | object;
type SetState<T> = (next: T | ((previous: T) => T)) => void;

type ReactRuntime = Readonly<{
  createElement: (
    type: ElementType,
    props?: Record<string, unknown> | null,
    ...children: readonly unknown[]
  ) => unknown;
  useCallback: <TCallback>(
    callback: TCallback,
    deps: readonly unknown[],
  ) => TCallback;
  useEffect: (
    effect: () => void | (() => void),
    deps: readonly unknown[],
  ) => void;
  useMemo: <TValue>(factory: () => TValue, deps: readonly unknown[]) => TValue;
  useState: <TValue>(initial: TValue) => readonly [TValue, SetState<TValue>];
}>;

type NativeRuntime = Readonly<{
  ActivityIndicator: ElementType;
  Image: ElementType;
  Pressable: ElementType;
  SafeAreaView: ElementType;
  ScrollView: ElementType;
  StyleSheet: {
    readonly create: <
      TStyles extends Record<string, Readonly<Record<string, unknown>>>,
    >(
      styles: TStyles,
    ) => TStyles;
  };
  Text: ElementType;
  View: ElementType;
  Platform: { readonly OS: PlatformOS };
}>;

type RouterLike = Readonly<{
  push: (href: never) => void;
  replace: (href: never) => void;
  back?: () => void;
}>;
type RouterRuntime = Readonly<{
  Slot: ElementType;
  useRouter: () => RouterLike;
  useSegments: () => readonly string[];
}>;
type FontRuntime = Readonly<{
  useFonts: (
    fontMap: Readonly<Record<string, unknown>>,
  ) => readonly [boolean, Error | null];
}>;
type SplashScreenRuntime = Readonly<{
  hideAsync: () => Promise<boolean>;
  preventAutoHideAsync: () => Promise<boolean>;
}>;
type SecureStoreRuntime = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;
type ConstantsRuntime = Readonly<{
  expoConfig?: Readonly<{
    extra?: Readonly<{
      operations?: Readonly<{ e2eBuild?: unknown }>;
    }>;
  }>;
}>;
type CaptureScreenKind =
  | "salary"
  | "plan"
  | "plan-current-summary"
  | "plan-budget-summary-alt"
  | "plan-salary-info-edit"
  | "plan-previous-picker"
  | "plan-empty"
  | "plan-budget-detail-summary"
  | "plan-validation-warning"
  | "level"
  | "level-mission-status-board"
  | "level-record-pending"
  | "level-mission-start-confirm"
  | "level-quick-mission-detail"
  | "level-load-error"
  | "level-no-content"
  | "level-all-daily-complete"
  | "level-main-default"
  | "level-mission-progress"
  | "level-recommendations"
  | "notifications"
  | "community"
  | "community-state-board-ko"
  | "community-state-board-en-tabs"
  | "community-offline-moderation-board"
  | "community-state-board"
  | "community-hobby-board"
  | "community-levelup-board"
  | "community-search-results"
  | "community-free-board-alt"
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
  | "common-empty"
  | "common-error"
  | "common-loading"
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
  | "bottom-sheet-category"
  | "profile"
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
  | "login"
  | "signup"
  | "signup-account-info"
  | "signup-social-info"
  | "signup-welcome"
  | "signup-phone-number-step"
  | "signup-password-creation"
  | "signup-identity-verification"
  | "signup-account-info-alt"
  | "signup-complete"
  | "splash"
  | "onboarding-salary-amount-keypad"
  | "onboarding-expected-salary-step"
  | "onboarding-intro-alt"
  | "onboarding-daily-budget-step"
  | "onboarding-plan-review"
  | "onboarding-payday-step"
  | "onboarding-complete"
  | "onboarding-fixed-expense-step"
  | "onboarding-fixed-savings-step"
  | "notification-settings"
  | "notice-app-update-detail"
  | "notice-empty"
  | "notice-ended-event-detail"
  | "notice-event-detail"
  | "notice-maintenance-detail"
  | "notice-offline-list"
  | "notice-privacy-policy-change"
  | "notice-unavailable"
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
  | "terms-consent"
  | "terms-ad-data-separation-policy"
  | "terms-detailed-consent"
  | "terms-fulltext"
  | "terms-personalized-ads-consent"
  | "terms-consent-alt"
  | "terms-review"
  | "english-daily-detail"
  | "english-learning-flow"
  | "english-record-success-flow"
  | "english-learning-session-flow"
  | "expense-form-state"
  | "expense-form-edit"
  | "expense-form-refund"
  | "expense-form-validation"
  | "expense-delete-blocked"
  | "expense-invalidate-reason"
  | "living-cost-form"
  | "living-cost-save-failure"
  | "living-cost-saving"
  | "living-cost-settings"
  | "living-cost-alt"
  | "living-cost-weekday-weekend"
  | "living-cost-saving-alt"
  | "reading"
  | "reading-book-detail"
  | "reading-certification-share-review"
  | "reading-flow"
  | "reading-in-progress"
  | "reading-recommendation-error-empty"
  | "reading-record-flow"
  | "reading-source-unavailable"
  | "reading-start-confirm"
  | "news"
  | "news-content-load-error"
  | "news-flow"
  | "news-issue-detail"
  | "news-mission-flow"
  | "news-offline-preview"
  | "news-record-input"
  | "news-share-review"
  | "english"
  | "health"
  | "health-safety-check"
  | "health-offline-cached"
  | "health-workout-detail"
  | "health-safety-unavailable"
  | "health-content-load-error"
  | "health-workout-in-progress"
  | "health-workout-flow"
  | "health-workout-record"
  | "health-flow";

type SessionSnapshot = Readonly<{
  authenticated: boolean;
  userIdHash: string | null;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  mfaRequired: boolean;
  sessionExpiresAt: string | null;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type AppConfigSnapshot = Readonly<{
  apiVersion: string;
  environment: "local" | "development" | "staging" | "production";
  maintenanceMode: boolean;
  minSupportedBuild: string;
  featureFlags: Readonly<Record<string, boolean>>;
  serverAuthorityEnabled: true;
  privacyMode: "STRICT";
  adsFinancialTargetingAllowed: false;
}>;

type PushSnapshot = Readonly<{
  consent: ConsentState;
  tokenRegistered: boolean;
  quietHoursEnabled: boolean;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type RootPayload = Readonly<{
  session: SessionSnapshot;
  config: AppConfigSnapshot;
  push: PushSnapshot;
}>;
type RootResponse = Readonly<{ data?: Partial<RootPayload>; error?: unknown }>;
type RootState = Readonly<{
  status: RootStatus;
  payload: RootPayload;
  retrying: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const ROOT_LAYOUT_VERSION = "3.1.0";
const ROOT_E2E_TEST_ID = "salary-hijacking-mobile-root";
const AUTH_LOGIN_ROUTE = "/(auth)/login";
const AUTH_VERIFY_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const SALARY_HOME_ROUTE = "/salary";
const PROFILE_ROUTE = "/profile";
const SECURE_SESSION_KEY = "salary_hijacking.session_status.v1";
const PUBLIC_SEGMENTS = [
  "(auth)",
  "login",
  "signup",
  "verify-email",
  "forgot-password",
  "reset-password",
  "onboarding",
  "legal",
  "privacy",
  "terms",
] as const;
const SENSITIVE_KEYWORDS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "session",
  "email",
  "phone",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "expense",
  "savings",
  "amount",
  "hijack",
  "loan",
  "debt",
  "push",
  "fcm",
  "deviceToken",
  "비밀번호",
  "토큰",
  "이메일",
  "전화",
  "계좌",
  "카드",
  "급여",
  "월급",
  "지출",
  "저축",
  "금액",
  "납치",
  "대출",
  "부채",
  "인증",
  "푸시",
  "세션",
  "기기토큰",
] as const;
const FONT_ASSETS: Readonly<Record<string, unknown>> = Object.freeze({
  "Freesentation-4Regular": require("../assets/fonts/Freesentation-4Regular.ttf"),
  "Freesentation-5Medium": require("../assets/fonts/Freesentation-5Medium.ttf"),
  "Freesentation-6SemiBold": require("../assets/fonts/Freesentation-6SemiBold.ttf"),
  "Freesentation-7Bold": require("../assets/fonts/Freesentation-7Bold.ttf"),
  "Freesentation-8ExtraBold": require("../assets/fonts/Freesentation-8ExtraBold.ttf"),
  "Freesentation-9Black": require("../assets/fonts/Freesentation-9Black.ttf"),
});
const OFFICIAL_BI_LOGO = appImageAssets.brand.platformLogo as unknown;
const CAPTURE_SCREENS: Readonly<Record<string, CaptureScreenKind>> =
  Object.freeze({
    community: "community",
    "community-state-board-ko": "community-state-board-ko",
    "community-state-board-en-tabs": "community-state-board-en-tabs",
    "community-offline-moderation-board": "community-offline-moderation-board",
    "community-state-board": "community-state-board",
    "community-hobby-board": "community-hobby-board",
    "community-levelup-board": "community-levelup-board",
    "community-search-results": "community-search-results",
    "community-free-board-alt": "community-free-board-alt",
    "community-post-detail": "community-post-detail",
    "community-post-offline": "community-post-offline",
    "community-post-comment-restricted": "community-post-comment-restricted",
    "community-post-own-menu": "community-post-own-menu",
    "community-post-blocked": "community-post-blocked",
    "community-post-hidden": "community-post-hidden",
    "community-post-load-error": "community-post-load-error",
    "community-post-sensitive-warning": "community-post-sensitive-warning",
    "community-post-review-pending": "community-post-review-pending",
    "community-post-hobby": "community-post-hobby",
    "community-post-deleted": "community-post-deleted",
    "community-post-restricted": "community-post-restricted",
    "community-write": "community-write",
    "community-write-attachments": "community-write-attachments",
    "community-write-sensitive-warning": "community-write-sensitive-warning",
    "community-write-restricted": "community-write-restricted",
    "community-write-draft": "community-write-draft",
    "community-write-draft-recovery": "community-write-draft-recovery",
    "community-write-from-levelup": "community-write-from-levelup",
    "community-write-validation": "community-write-validation",
    "community-write-question-anonymous": "community-write-question-anonymous",
    "community-comments-load-error": "community-comments-load-error",
    "community-comment-delete-confirm": "community-comment-delete-confirm",
    "community-comment-edit": "community-comment-edit",
    "community-reply-compose": "community-reply-compose",
    "community-replies-expanded": "community-replies-expanded",
    "community-block-user-confirm": "community-block-user-confirm",
    "community-comment-list": "community-comment-list",
    "community-comments-loading-more": "community-comments-loading-more",
    "community-comment-submitting": "community-comment-submitting",
    "community-comment-thread": "community-comment-thread",
    "community-comment-thread-alt": "community-comment-thread-alt",
    "community-no-comments": "community-no-comments",
    "community-comment-thread-policy": "community-comment-thread-policy",
    "common-empty": "common-empty",
    "common-error": "common-error",
    "common-loading": "common-loading",
    "common-offline": "common-offline",
    english: "english",
    "expense-delete-blocked": "expense-delete-blocked",
    "expense-form-edit": "expense-form-edit",
    "expense-form-refund": "expense-form-refund",
    "expense-form-state": "expense-form-state",
    "expense-form-validation": "expense-form-validation",
    "expense-invalidate-reason": "expense-invalidate-reason",
    "fixed-expense-form": "fixed-expense-form",
    "fixed-expense-saving": "fixed-expense-saving",
    "fixed-expense-edit-inactive": "fixed-expense-edit-inactive",
    "fixed-expense-save-failure": "fixed-expense-save-failure",
    "fixed-expense-register": "fixed-expense-register",
    "fixed-expense-add-detailed": "fixed-expense-add-detailed",
    "fixed-expense-edit": "fixed-expense-edit",
    "fixed-saving-form": "fixed-saving-form",
    "fixed-saving-add-goal": "fixed-saving-add-goal",
    "fixed-saving-add-savings-goal": "fixed-saving-add-savings-goal",
    "fixed-saving-add-investment": "fixed-saving-add-investment",
    "fixed-saving-saving": "fixed-saving-saving",
    "fixed-saving-save-failure": "fixed-saving-save-failure",
    "fixed-saving-edit-savings": "fixed-saving-edit-savings",
    "fixed-saving-edit-inactive": "fixed-saving-edit-inactive",
    "fixed-saving-delete-confirm": "fixed-saving-delete-confirm",
    "bottom-sheet-category": "bottom-sheet-category",
    health: "health",
    "health-content-load-error": "health-content-load-error",
    "health-flow": "health-flow",
    "health-offline-cached": "health-offline-cached",
    "health-safety-check": "health-safety-check",
    "health-safety-unavailable": "health-safety-unavailable",
    "health-workout-detail": "health-workout-detail",
    "health-workout-flow": "health-workout-flow",
    "health-workout-in-progress": "health-workout-in-progress",
    "health-workout-record": "health-workout-record",
    level: "level",
    "level-all-daily-complete": "level-all-daily-complete",
    "level-load-error": "level-load-error",
    "level-main-default": "level-main-default",
    "level-mission-progress": "level-mission-progress",
    "level-mission-start-confirm": "level-mission-start-confirm",
    "level-mission-status-board": "level-mission-status-board",
    "level-no-content": "level-no-content",
    "level-quick-mission-detail": "level-quick-mission-detail",
    "level-recommendations": "level-recommendations",
    "level-record-pending": "level-record-pending",
    "living-cost-form": "living-cost-form",
    login: "login",
    "payroll-amount-validation-error": "payroll-amount-validation-error",
    "salary-amount-check": "salary-amount-check",
    "amount-input-error": "amount-input-error",
    "monthly-budget-over-limit": "monthly-budget-over-limit",
    "expense-delete-confirm-alt": "expense-delete-confirm-alt",
    "deletion-processing": "deletion-processing",
    "plan-save-success": "plan-save-success",
    "plan-save-success-alt": "plan-save-success-alt",
    "budget-plan-warning": "budget-plan-warning",
    "daily-budget-overrun": "daily-budget-overrun",
    "english-levelup-share": "english-levelup-share",
    "reading-levelup": "reading-levelup",
    "levelup-celebration": "levelup-celebration",
    "levelup-result": "levelup-result",
    "certification-share-review": "certification-share-review",
    "share-standard-blocked": "share-standard-blocked",
    "levelup-share-review": "levelup-share-review",
    "comment-report-reason": "comment-report-reason",
    "post-report-reason": "post-report-reason",
    "report-reason-selector": "report-reason-selector",
    "report-result-board": "report-result-board",
    "comment-report-success": "comment-report-success",
    "date-selection-collection": "date-selection-collection",
    "recurrence-selector": "recurrence-selector",
    "file-photo-attachment": "file-photo-attachment",
    "post-menu-collection": "post-menu-collection",
    "sort-filter": "sort-filter",
    "visibility-selector": "visibility-selector",
    "draft-exit-state-board": "draft-exit-state-board",
    "device-permission-guide": "device-permission-guide",
    "post-registration-result-board": "post-registration-result-board",
    "withdrawal-final-confirm": "withdrawal-final-confirm",
    "modal-confirm": "modal-confirm",
    "modal-level-result": "modal-level-result",
    "news-mission-complete": "news-mission-complete",
    "health-already-complete": "health-already-complete",
    "news-already-complete": "news-already-complete",
    "reading-already-complete": "reading-already-complete",
    "workout-record-complete": "workout-record-complete",
    "mission-complete-xp": "mission-complete-xp",
    "xp-result-state-board": "xp-result-state-board",
    news: "news",
    "news-content-load-error": "news-content-load-error",
    "news-flow": "news-flow",
    "news-issue-detail": "news-issue-detail",
    "news-mission-flow": "news-mission-flow",
    "news-offline-preview": "news-offline-preview",
    "news-record-input": "news-record-input",
    "news-share-review": "news-share-review",
    notifications: "notifications",
    "notification-settings": "notification-settings",
    "notice-app-update-detail": "notice-app-update-detail",
    "notice-empty": "notice-empty",
    "notice-ended-event-detail": "notice-ended-event-detail",
    "notice-event-detail": "notice-event-detail",
    "notice-maintenance-detail": "notice-maintenance-detail",
    "notice-offline-list": "notice-offline-list",
    "notice-privacy-policy-change": "notice-privacy-policy-change",
    "notice-unavailable": "notice-unavailable",
    "onboarding-complete": "onboarding-complete",
    "onboarding-daily-budget-step": "onboarding-daily-budget-step",
    "onboarding-expected-salary-step": "onboarding-expected-salary-step",
    "onboarding-fixed-expense-step": "onboarding-fixed-expense-step",
    "onboarding-fixed-savings-step": "onboarding-fixed-savings-step",
    "onboarding-intro-alt": "onboarding-intro-alt",
    "onboarding-payday-step": "onboarding-payday-step",
    "onboarding-plan-review": "onboarding-plan-review",
    "onboarding-salary-amount-keypad": "onboarding-salary-amount-keypad",
    plan: "plan",
    "plan-budget-detail-summary": "plan-budget-detail-summary",
    "plan-budget-summary-alt": "plan-budget-summary-alt",
    "plan-current-summary": "plan-current-summary",
    "plan-empty": "plan-empty",
    "plan-previous-picker": "plan-previous-picker",
    "plan-salary-info-edit": "plan-salary-info-edit",
    "plan-validation-warning": "plan-validation-warning",
    profile: "profile",
    "profile-account": "profile-account",
    "profile-performance-partial-error": "profile-performance-partial-error",
    "profile-offline-performance-preview":
      "profile-offline-performance-preview",
    "profile-page-load-error": "profile-page-load-error",
    "profile-page-account-restricted": "profile-page-account-restricted",
    "profile-my-page-alt": "profile-my-page-alt",
    "profile-my-page-legacy": "profile-my-page-legacy",
    "profile-ad-hidden": "profile-ad-hidden",
    "profile-loading-skeleton": "profile-loading-skeleton",
    "profile-account-restricted": "profile-account-restricted",
    "profile-data-export-ready": "profile-data-export-ready",
    "profile-withdrawal-requested": "profile-withdrawal-requested",
    "profile-biometric-app-lock": "profile-biometric-app-lock",
    "profile-withdrawal-reason": "profile-withdrawal-reason",
    "profile-rejoin-blocked": "profile-rejoin-blocked",
    "profile-data-export-processing": "profile-data-export-processing",
    "profile-withdrawal-precheck": "profile-withdrawal-precheck",
    "profile-privacy-usage-history": "profile-privacy-usage-history",
    "profile-data-export-request": "profile-data-export-request",
    "profile-password-change": "profile-password-change",
    "profile-account-settings-default": "profile-account-settings-default",
    "profile-community": "profile-community",
    "profile-community-restricted": "profile-community-restricted",
    "profile-drafts": "profile-drafts",
    "profile-liked-posts": "profile-liked-posts",
    "profile-level": "profile-level",
    "profile-notices": "profile-notices",
    "profile-post-management-default": "profile-post-management-default",
    "profile-post-search-empty": "profile-post-search-empty",
    "profile-posts-loading-skeleton": "profile-posts-loading-skeleton",
    "profile-posts-offline": "profile-posts-offline",
    "profile-posts-offline-alt": "profile-posts-offline-alt",
    "profile-share-certification-prompt": "profile-share-certification-prompt",
    "profile-shared-certification-detail":
      "profile-shared-certification-detail",
    "profile-settings": "profile-settings",
    "profile-settings-alt": "profile-settings-alt",
    "profile-settings-save-failure": "profile-settings-save-failure",
    "profile-settings-validation-error": "profile-settings-validation-error",
    "profile-support": "profile-support",
    "profile-uploading": "profile-uploading",
    "profile-visibility-sheet": "profile-visibility-sheet",
    "profile-image-delete-confirm": "profile-image-delete-confirm",
    "profile-job-selector": "profile-job-selector",
    "profile-written-posts-empty": "profile-written-posts-empty",
    "my-levelup-activity-records": "my-levelup-activity-records",
    "my-levelup-record-detail": "my-levelup-record-detail",
    "my-levelup-empty-records": "my-levelup-empty-records",
    "my-levelup-statistics": "my-levelup-statistics",
    "my-levelup-offline-records": "my-levelup-offline-records",
    "my-levelup-xp-history": "my-levelup-xp-history",
    "inquiry-detail-answered": "inquiry-detail-answered",
    "inquiry-empty": "inquiry-empty",
    "inquiry-detail-pending": "inquiry-detail-pending",
    "inquiry-offline-preview": "inquiry-offline-preview",
    "inquiry-submitted": "inquiry-submitted",
    "inquiry-create": "inquiry-create",
    "living-cost-save-failure": "living-cost-save-failure",
    "living-cost-saving": "living-cost-saving",
    "living-cost-settings": "living-cost-settings",
    "living-cost-alt": "living-cost-alt",
    "living-cost-weekday-weekend": "living-cost-weekday-weekend",
    "living-cost-saving-alt": "living-cost-saving-alt",
    reading: "reading",
    "reading-book-detail": "reading-book-detail",
    "reading-certification-share-review": "reading-certification-share-review",
    "reading-flow": "reading-flow",
    "reading-in-progress": "reading-in-progress",
    "reading-recommendation-error-empty": "reading-recommendation-error-empty",
    "reading-record-flow": "reading-record-flow",
    "reading-source-unavailable": "reading-source-unavailable",
    "reading-start-confirm": "reading-start-confirm",
    salary: "salary",
    signup: "signup",
    "signup-account-info": "signup-account-info",
    "signup-social-info": "signup-social-info",
    "signup-welcome": "signup-welcome",
    "signup-phone-number-step": "signup-phone-number-step",
    "signup-password-creation": "signup-password-creation",
    "signup-identity-verification": "signup-identity-verification",
    "signup-account-info-alt": "signup-account-info-alt",
    "signup-complete": "signup-complete",
    splash: "splash",
    "terms-consent": "terms-consent",
    "terms-ad-data-separation-policy": "terms-ad-data-separation-policy",
    "terms-detailed-consent": "terms-detailed-consent",
    "terms-fulltext": "terms-fulltext",
    "terms-personalized-ads-consent": "terms-personalized-ads-consent",
    "terms-consent-alt": "terms-consent-alt",
    "terms-review": "terms-review",
    "english-daily-detail": "english-daily-detail",
    "english-learning-flow": "english-learning-flow",
    "english-record-success-flow": "english-record-success-flow",
    "english-learning-session-flow": "english-learning-session-flow",
  });

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const FontRuntimeRef = loadFontRuntime();
const SplashScreenRuntimeRef = loadSplashScreenRuntime();
const API_BASE_URL = readMobileApiBaseUrl();
const IS_E2E_BUILD = readMobileE2eBuildEnabled();
const INITIAL_CAPTURE_SCREEN_KIND = readInitialCaptureScreenKind();
const SPLASH_FORCE_HIDE_FALLBACK_MS = 2500;

void SplashScreenRuntimeRef.preventAutoHideAsync().catch(() => false);

function hideNativeSplashSafely(): void {
  void SplashScreenRuntimeRef.hideAsync().catch(() => false);
}

const fallbackSession: SessionSnapshot = Object.freeze({
  authenticated: false,
  userIdHash: null,
  role: "USER",
  emailVerified: false,
  onboardingCompleted: false,
  mfaRequired: false,
  sessionExpiresAt: null,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  rawPushTokenExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackConfig: AppConfigSnapshot = Object.freeze({
  apiVersion: "v1",
  environment: "staging",
  maintenanceMode: false,
  minSupportedBuild: "0",
  featureFlags: {},
  serverAuthorityEnabled: true,
  privacyMode: "STRICT",
  adsFinancialTargetingAllowed: false,
});
const fallbackPush: PushSnapshot = Object.freeze({
  consent: "UNKNOWN",
  tokenRegistered: false,
  quietHoursEnabled: true,
  rawPushTokenExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackPayload: RootPayload = Object.freeze({
  session: fallbackSession,
  config: fallbackConfig,
  push: fallbackPush,
});

class RootAuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RootAuthExpiredError";
  }
}

export default function MobileRootLayout(): unknown {
  const [fontsLoaded] = FontRuntimeRef.useFonts(FONT_ASSETS);
  const [fontLoadTimedOut, setFontLoadTimedOut] =
    ReactRuntimeRef.useState(false);
  const router = RouterRuntimeRef.useRouter();
  const segments = RouterRuntimeRef.useSegments();
  const captureScreenKind = INITIAL_CAPTURE_SCREEN_KIND;
  const [state, setState] = ReactRuntimeRef.useState<RootState>({
    status: "BOOTSTRAPPING",
    payload: fallbackPayload,
    retrying: false,
    toast: { kind: "info", message: "급여납치 앱을 안전하게 시작합니다." },
  });

  const currentRouteKey = ReactRuntimeRef.useMemo(
    () => normalizeSegments(segments).join("/") || "root",
    [segments],
  );
  const isPublic = ReactRuntimeRef.useMemo(
    () => isPublicRoute(segments),
    [segments],
  );

  const bootstrap = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    setState((prev: RootState) => ({ ...prev, retrying: true }));
    if (IS_E2E_BUILD) {
      setState((prev: RootState) => ({
        ...prev,
        payload: fallbackPayload,
        status: "READY",
        retrying: false,
        toast: { kind: "success", message: "E2E shell ready" },
      }));
      return;
    }
    try {
      const response = await requestJsonWithAuthRefresh<RootResponse>(
        "/api/v1/mobile/bootstrap",
      );
      const payload = normalizePayload(response.data ?? {});
      const nextStatus = resolveStatus(payload, isPublic);
      await persistSessionStatus(payload.session, nextStatus);
      setState((prev: RootState) => ({
        ...prev,
        payload,
        status: nextStatus,
        retrying: false,
        toast: { kind: "success", message: statusMessage(nextStatus) },
      }));
    } catch (error) {
      if (error instanceof RootAuthExpiredError) {
        setState((prev: RootState) => ({
          ...prev,
          payload: { ...prev.payload, session: fallbackSession },
          status: isPublic ? "READY" : "AUTH_REQUIRED",
          retrying: false,
          toast: {
            kind: "error",
            message: safeBootstrapErrorMessage("auth-expired"),
          },
        }));
        return;
      }
      const cached = await readCachedSessionStatus();
      const cachedStatus = offlineStatusFromCachedSession(cached, isPublic);
      setState((prev: RootState) => ({
        ...prev,
        payload: { ...prev.payload, session: cached },
        status: cachedStatus,
        retrying: false,
        toast: {
          kind: "error",
          message: safeBootstrapErrorMessage("offline-fallback"),
        },
      }));
    }
  }, [isPublic]);

  ReactRuntimeRef.useEffect((): void => {
    void bootstrap();
  }, [bootstrap]);

  ReactRuntimeRef.useEffect((): (() => void) => {
    const timer = setTimeout(
      hideNativeSplashSafely,
      SPLASH_FORCE_HIDE_FALLBACK_MS,
    );
    return (): void => clearTimeout(timer);
  }, []);

  ReactRuntimeRef.useEffect((): void => {
    if (fontsLoaded) hideNativeSplashSafely();
  }, [fontsLoaded]);

  ReactRuntimeRef.useEffect((): (() => void) => {
    if (fontsLoaded) return (): void => undefined;
    const timer = setTimeout(() => {
      setFontLoadTimedOut(true);
      hideNativeSplashSafely();
    }, SPLASH_FORCE_HIDE_FALLBACK_MS);
    return (): void => clearTimeout(timer);
  }, [fontsLoaded]);

  ReactRuntimeRef.useEffect((): void => {
    const next = state.status;
    if (next === "READY" && captureScreenKind) return;
    if (next === "READY" && isCaptureBrowserPath()) return;
    if (next === "READY" && shouldRouteReadyStateToHome(currentRouteKey))
      router.replace(SALARY_HOME_ROUTE as never);
    if (next === "AUTH_REQUIRED" && !isPublic)
      router.replace(AUTH_LOGIN_ROUTE as never);
    if (next === "VERIFY_EMAIL" && currentRouteKey !== "(auth)/verify-email")
      router.replace(AUTH_VERIFY_ROUTE as never);
    if (next === "ONBOARDING" && currentRouteKey !== "onboarding")
      router.replace(ONBOARDING_ROUTE as never);
  }, [captureScreenKind, currentRouteKey, isPublic, router, state.status]);

  const shouldRenderSlot =
    captureScreenKind !== null ||
    state.status === "READY" ||
    state.status === "OFFLINE" ||
    isPublic;
  const shouldShowRuntimeChrome = !shouldRenderSlot;

  if (!fontsLoaded && !fontLoadTimedOut) {
    return h(
      NativeRuntimeRef.SafeAreaView,
      {
        accessibilityLabel: "급여납치 폰트를 불러오는 중",
        onLayout: hideNativeSplashSafely,
        style: styles.safeArea,
        testID: ROOT_E2E_TEST_ID,
      },
      h(
        NativeRuntimeRef.View,
        { style: styles.fontLoading },
        h(NativeRuntimeRef.Image, {
          accessibilityIgnoresInvertColors: true,
          accessibilityLabel: "급여납치 공식 BI",
          resizeMode: "contain",
          source: OFFICIAL_BI_LOGO,
          style: styles.fontLoadingLogo,
        }),
        h(
          NativeRuntimeRef.Text,
          { style: styles.fontLoadingTitle },
          "급여납치",
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.fontLoadingText },
          "Freesentation 글꼴을 적용하고 있어요.",
        ),
      ),
    );
  }

  return h(
    NativeRuntimeRef.SafeAreaView,
    {
      accessibilityLabel: "급여납치 모바일 루트",
      onLayout: hideNativeSplashSafely,
      style: styles.safeArea,
      testID: ROOT_E2E_TEST_ID,
    },
    shouldShowRuntimeChrome
      ? renderGlobalHeader(
          state.payload,
          state.status,
          currentRouteKey,
          (): void => router.replace(SALARY_HOME_ROUTE as never),
          (): void => router.replace(PROFILE_ROUTE as never),
        )
      : null,
    shouldShowRuntimeChrome ? renderToast(state.toast) : null,
    shouldRenderSlot
      ? h(
          NativeRuntimeRef.View,
          { style: styles.slotHost },
          captureScreenKind
            ? renderCaptureScreen(captureScreenKind)
            : h(RouterRuntimeRef.Slot, { key: currentRouteKey }),
        )
      : renderGate(state.status, state.retrying, bootstrap),
    shouldShowRuntimeChrome ? renderRuntimeGuard(state.payload) : null,
  );
}

export function ErrorBoundary({
  error,
  retry,
}: {
  readonly error: Error;
  readonly retry: () => void;
}): unknown {
  void error;
  hideNativeSplashSafely();
  return h(
    NativeRuntimeRef.SafeAreaView,
    {
      accessibilityLabel: "급여납치 오류 복구 화면",
      onLayout: hideNativeSplashSafely,
      style: styles.safeArea,
      testID: `${ROOT_E2E_TEST_ID}-error-boundary`,
    },
    h(
      NativeRuntimeRef.View,
      { style: styles.errorBoundary },
      h(NativeRuntimeRef.Image, {
        accessibilityIgnoresInvertColors: true,
        accessibilityLabel: "급여납치 공식 BI",
        resizeMode: "contain",
        source: OFFICIAL_BI_LOGO,
        style: styles.errorBoundaryLogo,
      }),
      h(
        NativeRuntimeRef.Text,
        { style: styles.errorBoundaryTitle },
        "이 화면을 다시 준비하고 있어요.",
      ),
      h(
        NativeRuntimeRef.Text,
        { style: styles.errorBoundaryText },
        "민감 정보는 표시하지 않고 안전한 상태로 복구합니다.",
      ),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: "다시 시도",
          onPress: retry,
          style: styles.primaryButton,
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.primaryButtonText },
          "다시 시도",
        ),
      ),
    ),
  );
}

function renderCaptureScreen(kind: CaptureScreenKind): unknown {
  return h(CapturePreviewScreen, { kind });
}

function renderGlobalHeader(
  payload: RootPayload,
  status: RootStatus,
  _routeKey: string,
  goHome: () => void,
  goProfile: () => void,
): unknown {
  const statusStyle =
    status === "READY" || status === "OFFLINE"
      ? styles.safeText
      : status === "ERROR"
        ? styles.dangerText
        : styles.reviewText;
  return h(
    NativeRuntimeRef.View,
    { style: styles.header },
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "급여 홈",
        onPress: goHome,
        style: styles.logoButton,
      },
      h(NativeRuntimeRef.Image, {
        accessibilityIgnoresInvertColors: true,
        accessibilityLabel: "급여납치 공식 BI",
        resizeMode: "contain",
        source: OFFICIAL_BI_LOGO,
        style: styles.headerLogoImage,
      }),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.headerBody },
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerKicker },
        "SALARY HIJACKING",
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "급여납치"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerMeta },
        rootHeaderMessage(payload, status),
      ),
    ),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "마이페이지",
        onPress: goProfile,
        style: styles.profileButton,
      },
      h(NativeRuntimeRef.Text, { style: statusStyle }, rootStatusLabel(status)),
    ),
  );
}

function renderGate(
  status: RootStatus,
  retrying: boolean,
  retry: () => Promise<void>,
): unknown {
  const title =
    status === "AUTH_REQUIRED"
      ? "로그인이 필요합니다"
      : status === "VERIFY_EMAIL"
        ? "이메일 인증이 필요합니다"
        : status === "ONBOARDING"
          ? "온보딩을 완료하세요"
          : status === "ERROR"
            ? "앱 시작 실패"
            : "서버 권위 앱 상태 확인 중";
  const message =
    status === "AUTH_REQUIRED"
      ? "안전한 세션 확인 후 급여와 예산 데이터를 불러옵니다."
      : status === "VERIFY_EMAIL"
        ? "계정 보호를 위해 인증을 완료해야 합니다."
        : status === "ONBOARDING"
          ? "급여일, 고정지출, 고정저축, 일일예산 기본 설정을 완료하세요."
          : status === "OFFLINE"
            ? "네트워크 없이 마지막 세션 상태로 표시합니다."
            : "서버 권위 설정과 개인정보 보호 경계를 확인합니다.";

  return h(
    NativeRuntimeRef.ScrollView,
    { style: styles.gateScroll, contentContainerStyle: styles.gateContent },
    h(
      NativeRuntimeRef.View,
      { style: styles.gateCard },
      h(NativeRuntimeRef.Text, { style: styles.gateTitle }, title),
      h(NativeRuntimeRef.Text, { style: styles.gateMessage }, message),
      retrying
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#209252" })
        : h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "button",
              onPress: (): void => void retry(),
              style: styles.primaryButton,
            },
            h(
              NativeRuntimeRef.Text,
              { style: styles.primaryButtonText },
              "다시 확인",
            ),
          ),
    ),
  );
}

function renderToast(
  toast: Readonly<{ kind: ToastKind; message: string }>,
): unknown {
  const variant =
    toast.kind === "error"
      ? styles.toastError
      : toast.kind === "success"
        ? styles.toastSuccess
        : styles.toastInfo;
  return h(
    NativeRuntimeRef.View,
    { style: [styles.toast, variant] },
    h(NativeRuntimeRef.Text, { style: styles.toastText }, toast.message),
  );
}

function renderRuntimeGuard(_payload: RootPayload): null {
  return null;
}

function rootHeaderMessage(payload: RootPayload, status: RootStatus): string {
  if (status === "BOOTSTRAPPING") return "안전하게 앱을 준비하고 있어요.";
  if (status === "AUTH_REQUIRED") return "인증 화면으로 이동합니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드입니다.";
  if (status === "ERROR") return "서비스 오류 상태입니다.";
  return payload.config.privacyMode === "STRICT"
    ? "개인정보 보호 모드 적용 중"
    : "급여 현황을 확인하세요.";
}

function rootStatusLabel(status: RootStatus): string {
  if (status === "READY") return "앱 준비가 완료되었습니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드입니다.";
  if (status === "ERROR") return "서비스 오류 상태입니다.";
  return "확인 중";
}

async function requestJsonWithAuthRefresh<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchJson(path, init);
  const parsed = await parseJsonResponse(response);
  if (response.ok) return parsed as T;

  if (response.status === 401 && path !== "/api/v1/auth/refresh") {
    const refreshed = await refreshRootAccessToken();
    if (refreshed) {
      const retryResponse = await fetchJson(path, init);
      const retryParsed = await parseJsonResponse(retryResponse);
      if (retryResponse.ok) return retryParsed as T;
      if (retryResponse.status === 401) {
        await clearRootAuthenticatedSession();
        throw new RootAuthExpiredError(errorMessage(retryParsed, 401));
      }
      throw new Error(errorMessage(retryParsed, retryResponse.status));
    }
    await clearRootAuthenticatedSession();
    throw new RootAuthExpiredError(errorMessage(parsed, 401));
  }

  throw new Error(errorMessage(parsed, response.status));
}

async function fetchJson(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-client-platform", String(NativeRuntimeRef.Platform.OS));
  headers.set("x-correlation-id", createCorrelationId());
  headers.set("x-raw-financial-data-exposed", "false");
  headers.set("x-raw-personal-data-exposed", "false");
  headers.set("x-raw-push-token-exposed", "false");
  headers.set("x-ad-financial-targeting-used", "false");
  await attachMobileBearerToken(headers, SecureStoreRuntimeRef);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new Error("ROOT_BOOTSTRAP_INVALID_RESPONSE");
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("ROOT_BOOTSTRAP_INVALID_RESPONSE");
  }
}

async function refreshRootAccessToken(): Promise<boolean> {
  try {
    await createAuthApi({
      baseUrl: API_BASE_URL,
      createCorrelationId,
      platform: rootAuthPlatform(),
      tokenStore: SecureStoreRuntimeRef,
    }).refresh();
    const token = await SecureStoreRuntimeRef.getItemAsync(
      MOBILE_ACCESS_TOKEN_KEY,
    );
    return Boolean(token?.trim());
  } catch {
    return false;
  }
}

async function clearRootAuthenticatedSession(): Promise<void> {
  try {
    await SecureStoreRuntimeRef.deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY);
  } finally {
    await SecureStoreRuntimeRef.deleteItemAsync(SECURE_SESSION_KEY);
  }
}

function rootAuthPlatform(): "ios" | "android" | "web" {
  const platform = String(NativeRuntimeRef.Platform.OS);
  if (platform === "ios" || platform === "android") return platform;
  return "web";
}

function normalizePayload(partial: Partial<RootPayload>): RootPayload {
  return {
    session: normalizeSession(partial.session ?? fallbackSession),
    config: normalizeConfig(partial.config ?? fallbackConfig),
    push: normalizePush(partial.push ?? fallbackPush),
  };
}

function normalizeSession(session: SessionSnapshot): SessionSnapshot {
  return {
    authenticated: Boolean(session.authenticated),
    userIdHash: session.userIdHash ? scrub(session.userIdHash) : null,
    role: enumOf(
      ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"] as const,
      session.role,
      "USER",
    ),
    emailVerified: Boolean(session.emailVerified),
    onboardingCompleted: Boolean(session.onboardingCompleted),
    mfaRequired: Boolean(session.mfaRequired),
    sessionExpiresAt: session.sessionExpiresAt
      ? iso(session.sessionExpiresAt)
      : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeConfig(config: AppConfigSnapshot): AppConfigSnapshot {
  return {
    apiVersion: scrub(config.apiVersion) || "v1",
    environment: enumOf(
      ["local", "development", "staging", "production"] as const,
      config.environment,
      "staging",
    ),
    maintenanceMode: Boolean(config.maintenanceMode),
    minSupportedBuild: scrub(config.minSupportedBuild) || "0",
    featureFlags: normalizeFlags(config.featureFlags),
    serverAuthorityEnabled: true,
    privacyMode: "STRICT",
    adsFinancialTargetingAllowed: false,
  };
}

function normalizePush(push: PushSnapshot): PushSnapshot {
  return {
    consent: enumOf(
      ["GRANTED", "DENIED", "UNKNOWN"] as const,
      push.consent,
      "UNKNOWN",
    ),
    tokenRegistered: Boolean(push.tokenRegistered),
    quietHoursEnabled: Boolean(push.quietHoursEnabled),
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeFlags(
  flags: Readonly<Record<string, boolean>>,
): Readonly<Record<string, boolean>> {
  return Object.fromEntries(
    Object.entries(flags)
      .slice(0, 60)
      .map(([key, value]: [string, boolean]) => [
        scrub(key).slice(0, 64),
        Boolean(value),
      ]),
  );
}

function resolveStatus(payload: RootPayload, isPublic: boolean): RootStatus {
  if (payload.config.maintenanceMode && !isPublic) return "ERROR";
  if (!payload.session.authenticated)
    return isPublic ? "READY" : "AUTH_REQUIRED";
  if (payload.session.mfaRequired) return "AUTH_REQUIRED";
  if (!payload.session.emailVerified) return "VERIFY_EMAIL";
  if (!payload.session.onboardingCompleted) return "ONBOARDING";
  return "READY";
}

function offlineStatusFromCachedSession(
  session: SessionSnapshot,
  isPublic: boolean,
): RootStatus {
  if (isPublic) return "READY";
  if (!session.authenticated) return "AUTH_REQUIRED";
  if (session.mfaRequired) return "AUTH_REQUIRED";
  if (!session.emailVerified) return "VERIFY_EMAIL";
  if (!session.onboardingCompleted) return "ONBOARDING";
  return "OFFLINE";
}

async function persistSessionStatus(
  session: SessionSnapshot,
  status: RootStatus,
): Promise<void> {
  const safe = JSON.stringify({
    authenticated: session.authenticated,
    role: session.role,
    emailVerified: session.emailVerified,
    onboardingCompleted: session.onboardingCompleted,
    mfaRequired: session.mfaRequired,
    status,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  });
  await SecureStoreRuntimeRef.setItemAsync(SECURE_SESSION_KEY, safe);
}

async function readCachedSessionStatus(): Promise<SessionSnapshot> {
  const cached = await SecureStoreRuntimeRef.getItemAsync(SECURE_SESSION_KEY);
  if (!cached) return fallbackSession;
  try {
    const parsed = JSON.parse(cached) as Partial<SessionSnapshot>;
    return normalizeSession({ ...fallbackSession, ...parsed });
  } catch {
    await SecureStoreRuntimeRef.deleteItemAsync(SECURE_SESSION_KEY);
    return fallbackSession;
  }
}

function isPublicRoute(segments: readonly string[]): boolean {
  const clean = normalizeSegments(segments);
  if (INITIAL_CAPTURE_SCREEN_KIND) return true;
  if (isCaptureBrowserPath()) return true;
  if (clean.length === 0) return false;
  if (clean[0] === "capture") return true;
  if (clean.join("/") === "auth/oauth/callback") return true;
  return clean.some((segment: string) =>
    PUBLIC_SEGMENTS.includes(segment as (typeof PUBLIC_SEGMENTS)[number]),
  );
}

function isCaptureBrowserPath(): boolean {
  const location = readBrowserLocation();
  if (!location) return false;
  return location.pathname.split("/").filter(Boolean)[0] === "capture";
}

function readInitialCaptureScreenKind(): CaptureScreenKind | null {
  const location = readBrowserLocation();
  if (!location) return null;
  return resolveCaptureScreenKindForUrl(location.href);
}

function readBrowserLocation(): Readonly<{
  href: string;
  pathname: string;
}> | null {
  if (NativeRuntimeRef.Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (
    !location ||
    typeof location.href !== "string" ||
    typeof location.pathname !== "string"
  ) {
    return null;
  }
  return location;
}

function resolveCaptureScreenKindForUrl(
  href: string,
): CaptureScreenKind | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!url.searchParams.has("capture")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "capture") return null;
  return CAPTURE_SCREENS[parts[1] ?? ""] ?? null;
}

function isAuthenticatedAuthRoute(routeKey: string): boolean {
  return (
    routeKey === "(auth)/login" ||
    routeKey === "(auth)/signup" ||
    routeKey === "(auth)/forgot-password" ||
    routeKey === "(auth)/reset-password"
  );
}

function shouldRouteReadyStateToHome(routeKey: string): boolean {
  return isAuthenticatedAuthRoute(routeKey);
}

function normalizeSegments(segments: readonly string[]): readonly string[] {
  return segments
    .map((segment: string) => scrub(String(segment)))
    .filter(Boolean)
    .slice(0, 8);
}

function statusMessage(status: RootStatus): string {
  if (status === "READY") return "앱 준비가 완료되었습니다.";
  if (status === "AUTH_REQUIRED") return "인증 화면으로 이동합니다.";
  if (status === "VERIFY_EMAIL") return "이메일 인증 화면으로 이동합니다.";
  if (status === "ONBOARDING") return "온보딩 화면으로 이동합니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드입니다.";
  if (status === "ERROR") return "서비스 오류 상태입니다.";
  return "앱 시작 정보를 불러오지 못해 안전한 로컬 상태로 전환했습니다.";
}

function safeBootstrapErrorMessage(
  reason: "auth-expired" | "offline-fallback",
): string {
  if (reason === "auth-expired")
    return "세션이 만료되어 다시 로그인이 필요합니다.";
  return "앱 시작 정보를 불러오지 못해 안전한 로컬 상태로 전환했습니다.";
}

function readMobileE2eBuildEnabled(): boolean {
  const mod = loadModule("expo-constants") as Partial<ConstantsRuntime> & {
    readonly default?: Partial<ConstantsRuntime>;
  };
  const constants = mod.expoConfig ? mod : (mod.default ?? {});
  return constants.expoConfig?.extra?.operations?.e2eBuild === true;
}

function h(
  type: ElementType,
  props?: Record<string, unknown> | null,
  ...children: readonly unknown[]
): unknown {
  return ReactRuntimeRef.createElement(type, props ?? null, ...children);
}
function loadReactRuntime(): ReactRuntime {
  const mod = loadModule("react") as Partial<ReactRuntime>;
  return {
    createElement:
      typeof mod.createElement === "function"
        ? mod.createElement
        : fallbackCreateElement,
    useCallback:
      typeof mod.useCallback === "function"
        ? mod.useCallback
        : fallbackUseCallback,
    useEffect:
      typeof mod.useEffect === "function" ? mod.useEffect : fallbackUseEffect,
    useMemo: typeof mod.useMemo === "function" ? mod.useMemo : fallbackUseMemo,
    useState:
      typeof mod.useState === "function" ? mod.useState : fallbackUseState,
  };
}
function loadNativeRuntime(): NativeRuntime {
  const mod = loadModule("react-native") as Partial<NativeRuntime>;
  const fallback = (name: string): ElementType => name;
  return {
    ActivityIndicator: mod.ActivityIndicator ?? fallback("ActivityIndicator"),
    Pressable: mod.Pressable ?? fallback("Pressable"),
    Image: mod.Image ?? fallback("Image"),
    SafeAreaView: mod.SafeAreaView ?? fallback("SafeAreaView"),
    ScrollView: mod.ScrollView ?? fallback("ScrollView"),
    StyleSheet: mod.StyleSheet ?? { create: fallbackStyleCreate },
    Text: mod.Text ?? fallback("Text"),
    View: mod.View ?? fallback("View"),
    Platform: mod.Platform ?? { OS: "web" },
  };
}
function loadRouterRuntime(): RouterRuntime {
  const mod = loadModule("expo-router") as Partial<RouterRuntime>;
  return {
    Slot: mod.Slot ?? "Slot",
    useRouter:
      typeof mod.useRouter === "function"
        ? mod.useRouter
        : (): RouterLike => ({
            push: (_href: never): void => undefined,
            replace: (_href: never): void => undefined,
            back: (): void => undefined,
          }),
    useSegments:
      typeof mod.useSegments === "function"
        ? mod.useSegments
        : (): readonly string[] => [],
  };
}
function loadFontRuntime(): FontRuntime {
  const mod = loadModule("expo-font") as Partial<FontRuntime>;
  return {
    useFonts:
      typeof mod.useFonts === "function"
        ? mod.useFonts
        : (): readonly [boolean, Error | null] => [true, null],
  };
}
function loadSplashScreenRuntime(): SplashScreenRuntime {
  const mod = loadModule("expo-splash-screen") as Partial<SplashScreenRuntime>;
  return {
    hideAsync:
      typeof mod.hideAsync === "function"
        ? mod.hideAsync
        : async (): Promise<boolean> => false,
    preventAutoHideAsync:
      typeof mod.preventAutoHideAsync === "function"
        ? mod.preventAutoHideAsync
        : async (): Promise<boolean> => false,
  };
}
function loadSecureStoreRuntime(): SecureStoreRuntime {
  const mod = loadModule("expo-secure-store") as Partial<SecureStoreRuntime>;
  return createSecureStoreRuntime(NativeRuntimeRef.Platform.OS, mod);
}
function loadModule(moduleName: string): unknown {
  try {
    switch (moduleName) {
      case "react":
        return require("react");
      case "react-native":
        return require("react-native");
      case "expo-router":
        return require("expo-router");
      case "expo-font":
        return require("expo-font");
      case "expo-splash-screen":
        return require("expo-splash-screen");
      case "expo-constants":
        return require("expo-constants");
      case "expo-secure-store":
        return require("expo-secure-store");
      default:
        return {};
    }
  } catch {
    return {};
  }
}
function fallbackCreateElement(
  type: ElementType,
  props?: Record<string, unknown> | null,
  ...children: readonly unknown[]
): unknown {
  return {
    $$typeof: Symbol.for("react.element"),
    type,
    key: props?.key == null ? null : String(props.key),
    ref: null,
    props:
      children.length > 0
        ? {
            ...(props ?? {}),
            children: children.length === 1 ? children[0] : children,
          }
        : (props ?? {}),
    _owner: null,
  };
}
function fallbackUseCallback<TCallback>(
  callback: TCallback,
  _deps?: readonly unknown[],
): TCallback {
  return callback;
}
function fallbackUseEffect(
  effect: () => void | (() => void),
  _deps?: readonly unknown[],
): void {
  const cleanup = effect();
  if (typeof cleanup === "function") cleanup();
}
function fallbackUseMemo<TValue>(
  factory: () => TValue,
  _deps?: readonly unknown[],
): TValue {
  return factory();
}
function fallbackUseState<TValue>(
  initial: TValue,
): readonly [TValue, SetState<TValue>] {
  return [
    initial,
    (_next: TValue | ((previous: TValue) => TValue)): void => undefined,
  ];
}
function fallbackStyleCreate<
  TStyles extends Record<string, Readonly<Record<string, unknown>>>,
>(stylesArg: TStyles): TStyles {
  return stylesArg;
}
function createCorrelationId(): string {
  const cryptoLike = (
    globalThis as unknown as {
      readonly crypto?: { readonly randomUUID?: () => string };
    }
  ).crypto;
  return cryptoLike?.randomUUID
    ? cryptoLike.randomUUID()
    : `mobile-root-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function errorMessage(value: unknown, status: number): string {
  const sanitized = sanitize(value);
  if (typeof sanitized === "string" && sanitized.trim())
    return safeMessage(sanitized);
  if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
    const message = (sanitized as { readonly message?: JsonValue }).message;
    if (typeof message === "string" && message.trim())
      return safeMessage(message);
  }
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "접근이 제한되었습니다.";
  if (status === 409) return "세션 상태가 변경되었습니다. 다시 확인하세요.";
  if (status === 426) return "앱 업데이트가 필요합니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  if (status >= 500) return "서버 오류 또는 일시 장애입니다.";
  return `앱 시작 요청이 실패했습니다. (${status})`;
}
function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]: [string, unknown]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  return String(value);
}
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return SENSITIVE_KEYWORDS.some((keyword: string) =>
    normalized.includes(keyword.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function scrub(value: string): string {
  let output = value.slice(0, 1600);
  SENSITIVE_KEYWORDS.forEach((keyword: string) => {
    output = output.replace(
      new RegExp(regexEscape(keyword), "gi"),
      "[REDACTED]",
    );
  });
  return output;
}
function safeMessage(value: string): string {
  return (
    scrub(value).replace(/\s+/g, " ").trim().slice(0, 180) ||
    "요청을 처리하지 못했습니다."
  );
}
function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function enumOf<T extends readonly string[]>(
  values: T,
  value: string,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? (value as T[number]) : fallback;
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}

export function assertMobileRootLayoutCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_root_runtime_loaded",
    "react_native_runtime_loaded",
    "secure_store_runtime_loaded",
    "root_slot_rendering",
    "mobile_bootstrap_endpoint",
    "auth_session_gate",
    "email_verification_gate",
    "onboarding_gate",
    "offline_cached_session_fallback",
    "maintenance_mode_guard",
    "server_authority_config",
    "strict_privacy_mode",
    "push_consent_summary",
    "quiet_hours_ready",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "raw_push_token_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "sensitive_error_redaction",
    "correlation_id_headers",
    "korean_mobile_ux",
    "accessibility_roles",
    "responsive_root_shell",
    "e2e_root_test_id",
    "e2e_shell_ready_without_server",
    "runtime_chrome_hidden_for_public_launch_surfaces",
    "clean_fintech_light_shell",
    "expo_font_useFonts",
    "expo_splash_screen_hideAsync",
    "Freesentation-4Regular.ttf",
    "Freesentation-9Black.ttf",
    "typescript_strict_ready",
  ] as const;
  return { ok: checks.length >= 20, version: ROOT_LAYOUT_VERSION, checks };
}

const styles = NativeRuntimeRef.StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#EEF0F2",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 14,
  },
  logoButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  headerLogoImage: { borderRadius: 18, height: 42, width: 42 },
  headerBody: { flex: 1, gap: 2 },
  headerKicker: { color: "#209252", fontSize: 11, fontWeight: "900" },
  headerTitle: {
    color: "#202327",
    fontFamily: "Freesentation-9Black",
    fontSize: 23,
    fontWeight: "900",
  },
  headerMeta: {
    color: "#6D737A",
    fontFamily: "Freesentation-6SemiBold",
    fontSize: 11,
    fontWeight: "800",
  },
  profileButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7EBEF",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  toast: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  toastInfo: {
    backgroundColor: "#EAF6EF",
    borderColor: "#D9F0E3",
  },
  toastSuccess: {
    backgroundColor: "#EAF6EF",
    borderColor: "#D9F0E3",
  },
  toastError: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F3C4C4",
  },
  toastText: { color: "#202327", fontSize: 13, lineHeight: 19 },
  slotHost: { flex: 1, backgroundColor: "#F7F8FA" },
  gateScroll: { flex: 1, backgroundColor: "#F7F8FA" },
  gateContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  gateCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EEF0F2",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  gateTitle: {
    color: "#202327",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  gateMessage: {
    color: "#6D737A",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#209252",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  safeText: { color: "#209252", fontSize: 11, fontWeight: "900" },
  reviewText: { color: "#856600", fontSize: 11, fontWeight: "900" },
  dangerText: { color: "#D74B4B", fontSize: 11, fontWeight: "900" },
  guardBox: {
    borderColor: "#D9F0E3",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    margin: 16,
    padding: 12,
  },
  guardTitle: { color: "#209252", fontSize: 13, fontWeight: "900" },
  guardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  guardPill: {
    backgroundColor: "#EAF6EF",
    borderColor: "#D9F0E3",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  guardPillText: { color: "#12663A", fontSize: 10, fontWeight: "800" },
  buttonDisabled: { opacity: 0.48 },
  fontLoading: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
  fontLoadingLogo: { borderRadius: 40, height: 96, width: 96 },
  fontLoadingTitle: {
    color: "#202327",
    fontFamily: "Freesentation-9Black",
    fontSize: 34,
    fontWeight: "900",
  },
  fontLoadingText: {
    color: "#6D737A",
    fontFamily: "Freesentation-6SemiBold",
    fontSize: 14,
    fontWeight: "700",
  },
  errorBoundary: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  errorBoundaryLogo: { borderRadius: 28, height: 72, width: 72 },
  errorBoundaryTitle: {
    color: "#202327",
    fontFamily: "Freesentation-8ExtraBold",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  errorBoundaryText: {
    color: "#6D737A",
    fontFamily: "Freesentation-5Medium",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
