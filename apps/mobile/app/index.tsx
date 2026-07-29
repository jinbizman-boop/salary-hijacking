import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { SplashLaunchScreen } from "../src/features/auth/components";
import {
  CapturePreviewScreen,
  type CapturePreviewKind,
} from "../src/features/capture";
import { MOBILE_ACCESS_TOKEN_KEY } from "../src/shared/storage/auth-token";

const SCREEN_VERSION = "4.1.0-launch-components";
const SPLASH_ROUTE_DELAY_MS = 1200;
const LOGIN_ROUTE = "/(auth)/login";
const SALARY_HOME_ROUTE = "/salary";
const COLD_DEEP_LINK_ROUTES = new Set([
  "/salary",
  "/plan",
  "/level",
  "/level/reading",
  "/level/news",
  "/level/english",
  "/level/health",
  "/notifications",
  "/community",
  "/community/write",
  "/profile",
  "/profile/settings",
  "/profile/community",
  "/profile/level",
  "/profile/notices",
  "/profile/support",
  "/profile/account",
]);

type InitialRoute = typeof LOGIN_ROUTE | typeof SALARY_HOME_ROUTE;
type AppRoute = string;
const captureScreens: Readonly<Record<string, CapturePreviewKind>> =
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
    "living-cost-save-failure": "living-cost-save-failure",
    "living-cost-saving": "living-cost-saving",
    "living-cost-settings": "living-cost-settings",
    "living-cost-alt": "living-cost-alt",
    "living-cost-weekday-weekend": "living-cost-weekday-weekend",
    "living-cost-saving-alt": "living-cost-saving-alt",
    login: "login",
    "login-credential-error": "login-credential-error",
    "login-logout-complete": "login-logout-complete",
    "login-password-recovery": "login-password-recovery",
    "bottom-sheet-category": "bottom-sheet-category",
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
    "onboarding-complete": "onboarding-complete",
    "onboarding-daily-budget-step": "onboarding-daily-budget-step",
    "onboarding-expected-salary-step": "onboarding-expected-salary-step",
    "onboarding-fixed-expense-step": "onboarding-fixed-expense-step",
    "onboarding-fixed-savings-step": "onboarding-fixed-savings-step",
    "onboarding-intro-alt": "onboarding-intro-alt",
    "onboarding-payday-step": "onboarding-payday-step",
    "onboarding-plan-review": "onboarding-plan-review",
    "onboarding-salary-amount-keypad": "onboarding-salary-amount-keypad",
    "notification-settings": "notification-settings",
    "notice-app-update-detail": "notice-app-update-detail",
    "notice-empty": "notice-empty",
    "notice-ended-event-detail": "notice-ended-event-detail",
    "notice-event-detail": "notice-event-detail",
    "notice-maintenance-detail": "notice-maintenance-detail",
    "notice-offline-list": "notice-offline-list",
    "notice-privacy-policy-change": "notice-privacy-policy-change",
    "notice-unavailable": "notice-unavailable",
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

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function MobileIndexScreen(): React.ReactElement {
  const router = useRouter();
  const captureScreenKind = readCaptureScreenKind();

  useEffect(() => {
    if (captureScreenKind) {
      void SplashScreen.hideAsync().catch(() => undefined);
      return undefined;
    }

    let mounted = true;
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const route = normalizeInitialDeepLinkRoute(url);
      if (route) router.replace(route as never);
    });
    void SplashScreen.hideAsync().catch(() => undefined);
    const timer = setTimeout(() => {
      void resolveInitialLaunchTarget()
        .then((route) => {
          if (!mounted) return;
          router.replace(route as never);
        })
        .catch(() => {
          if (mounted) router.replace(LOGIN_ROUTE as never);
        });
    }, SPLASH_ROUTE_DELAY_MS);

    return () => {
      mounted = false;
      subscription.remove();
      clearTimeout(timer);
    };
  }, [captureScreenKind, router]);

  if (captureScreenKind) {
    return <CapturePreviewScreen kind={captureScreenKind} />;
  }

  return <SplashLaunchScreen routeDelayMs={SPLASH_ROUTE_DELAY_MS} />;
}

export async function resolveInitialLaunchTarget(): Promise<AppRoute> {
  const deepLinkRoute = await resolveInitialDeepLinkRoute();
  if (deepLinkRoute) return deepLinkRoute;
  return resolveInitialRoute();
}

export async function resolveInitialRoute(): Promise<InitialRoute> {
  try {
    const token = await SplashSecureStore.getItemAsync(MOBILE_ACCESS_TOKEN_KEY);
    return isUsableAccessToken(token) ? SALARY_HOME_ROUTE : LOGIN_ROUTE;
  } catch {
    return LOGIN_ROUTE;
  }
}

export async function resolveInitialDeepLinkRoute(): Promise<AppRoute | null> {
  try {
    const raw = await Linking.getInitialURL();
    const route = normalizeInitialDeepLinkRoute(raw);
    if (route) return route;
    const parsed = await Linking.parseInitialURLAsync();
    return normalizeInitialDeepLinkRoute(parsedToHref(parsed));
  } catch {
    return null;
  }
}

function parsedToHref(
  parsed: Readonly<{
    scheme: string | null;
    hostname: string | null;
    path: string | null;
  }>,
): string | null {
  if (!parsed.scheme) return null;
  const path = parsed.path ? `/${parsed.path.replace(/^\//u, "")}` : "";
  if (parsed.hostname) return `${parsed.scheme}://${parsed.hostname}${path}`;
  return `${parsed.scheme}://${path}`;
}

export function normalizeInitialDeepLinkRoute(
  href: string | null,
): AppRoute | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const route = routePathFromUrl(url);
  if (!route) return null;
  if (COLD_DEEP_LINK_ROUTES.has(route)) return route;
  if (/^\/community\/[A-Za-z0-9_-]{1,80}$/u.test(route)) return route;
  return null;
}

function routePathFromUrl(url: URL): AppRoute | null {
  const pathname = url.pathname.startsWith("/")
    ? url.pathname
    : `/${url.pathname}`;
  if (url.protocol === "https:") return pathname === "/" ? null : pathname;
  const host = url.hostname;
  if (!host || host === "app") return pathname === "/" ? null : pathname;
  return `/${[host, pathname.replace(/^\//u, "")].filter(Boolean).join("/")}`;
}

function readCaptureScreenKind(): CapturePreviewKind | null {
  const location = readBrowserLocation();
  if (!location) return null;
  return resolveCaptureScreenKindForUrl(location.href);
}

export function resolveCaptureScreenKindForUrl(
  href: string,
): CapturePreviewKind | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!url.searchParams.has("capture")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "capture") return null;
  return captureScreens[parts[1] ?? ""] ?? null;
}

function isUsableAccessToken(value: string | null): boolean {
  const token = value?.trim();
  return Boolean(token && token.length <= 8192 && !/\s/u.test(token));
}

function readBrowserLocation(): Readonly<{ href: string }> | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (!location || typeof location.href !== "string") return null;
  return location;
}

const SplashSecureStore = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      const store = await import("expo-secure-store");
      return await store.getItemAsync(key);
    } catch {
      return null;
    }
  },
};

export function assertMobileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking launch components",
    "SALARY HIJACKING",
    "SplashLaunchScreen",
    "CapturePreviewScreen",
    "SplashScreen.hideAsync",
    "SPLASH_ROUTE_DELAY_MS = 1200",
    LOGIN_ROUTE,
    SALARY_HOME_ROUTE,
    "no preview auth bypass",
    "resolveInitialRoute",
    "resolveInitialLaunchTarget",
    "resolveInitialDeepLinkRoute",
    "normalizeInitialDeepLinkRoute",
    "server authoritative session check",
    "financial raw data hidden",
    "personal raw data hidden",
    "token raw data hidden",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
