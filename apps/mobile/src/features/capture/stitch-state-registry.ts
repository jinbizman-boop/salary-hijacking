import type { CapturePreviewKind } from "./CapturePreviewScreen";

type StitchStateInput = Readonly<{
  primaryCode: string;
  variantSlug: string;
}>;

const slugAliases = {
  "account-info": "signup-account-info",
  "account-info-alt": "signup-account-info-alt",
  "add-expense": "expense-form-state",
  "add-expense-compact": "expense-form-state",
  "add-expense-detail": "expense-form-state",
  "add-expense-empty": "expense-form-state",
  "add-expense-mobile": "expense-form-state",
  "add-expense-validation": "expense-form-validation",
  "add-fixed-expense": "fixed-expense-form",
  "add-fixed-expense-detailed": "fixed-expense-add-detailed",
  "add-goal": "fixed-saving-add-goal",
  "add-investment": "fixed-saving-add-investment",
  "add-savings": "fixed-saving-form",
  "add-savings-goal": "fixed-saving-add-savings-goal",
  "all-daily-complete": "level-all-daily-complete",
  "app-init-error-alt": "common-error",
  "app-init-error-offbrand": "common-error",
  "app-init-error-wrong-brand": "common-error",
  "app-initialization-error": "common-error",
  "auth-check": "splash",
  "blocked-user-post": "community-post-blocked",
  "brand-loading": "splash",
  "brand-loading-alt": "splash",
  "certification-post-detail": "community-post-detail",
  "comments-tab": "profile-community",
  "commenting-restricted": "community-post-comment-restricted",
  "compose-default": "community-write",
  "compose-draft": "community-write-draft",
  "compose-from-levelup": "community-write-from-levelup",
  "compose-question-anonymous": "community-write-question-anonymous",
  "compose-with-attachments": "community-write-attachments",
  "current-plan-summary": "plan-current-summary",
  "daily-budget-alt": "living-cost-alt",
  "daily-budget-input": "living-cost-form",
  "daily-budget-settings": "living-cost-settings",
  "daily-english-detail": "english-daily-detail",
  "delete-confirm": "fixed-saving-delete-confirm",
  "delete-failure": "expense-delete-blocked",
  "delete-not-allowed": "expense-delete-blocked",
  "deleted-post": "community-post-deleted",
  "edit-comment": "community-comment-edit",
  "edit-fixed-expense": "fixed-expense-edit",
  "edit-inactive": "fixed-expense-edit-inactive",
  "edit-savings": "fixed-saving-edit-savings",
  "edit-status-management": "expense-form-edit",
  "edit-status-management-alt": "expense-form-edit",
  "ended-event-detail": "notice-ended-event-detail",
  "english-home": "english",
  "event-detail": "notice-event-detail",
  "expense-category-selector": "bottom-sheet-category",
  "expense-delete-confirm": "expense-delete-confirm-alt",
  "fixed-expense-delete-confirm": "expense-delete-confirm-alt",
  "fixed-expense-step": "onboarding-fixed-expense-step",
  "fixed-savings-step": "onboarding-fixed-savings-step",
  "financial-institution-selector": "bottom-sheet-category",
  "free-board-alt": "community-free-board-alt",
  "health-home": "health",
  "health-levelup": "levelup-result",
  "hidden-by-policy": "community-post-hidden",
  "hobby-board": "community-hobby-board",
  "identity-verification": "signup-identity-verification",
  "issue-detail": "news-issue-detail",
  "learning-session-flow": "english-learning-session-flow",
  "levelup-board": "community-levelup-board",
  "load-error": "community-post-load-error",
  "login-default-alt": "login",
  "login-state-check": "splash",
  "logout-complete": "login-logout-complete",
  "logout-confirm": "modal-confirm",
  "main-default": "level-main-default",
  "mission-progress": "level-mission-progress",
  "mission-start-confirm": "level-mission-start-confirm",
  "mission-status-board": "level-mission-status-board",
  "my-page-default": "profile",
  "no-new-notifications": "notifications-empty",
  "no-plan": "salary-no-plan",
  "no-unread-with-list": "notifications-no-unread-list",
  "notice-list": "profile-notices",
  "notices-empty": "notice-empty",
  "offline-cached-routine": "health-offline-cached",
  "password-creation": "signup-password-creation",
  "password-login": "login",
  "password-recovery": "login-password-recovery",
  "payday-step": "onboarding-payday-step",
  "perspective-comparison": "news",
  "phone-number-step": "signup-phone-number-step",
  "plan-default": "plan",
  "post-detail-comments": "community-post-detail",
  "post-detail-hobby": "community-post-hobby",
  "post-detail-with-comments": "community-post-detail",
  "pre-workout-safety-check": "health-safety-check",
  "previous-plan-picker": "plan-previous-picker",
  "quick-mission-detail": "level-quick-mission-detail",
  "reading-home": "reading",
  "reading-mission-complete": "reading-already-complete",
  "recommendation-error-empty": "reading-recommendation-error-empty",
  "recommendations": "level-recommendations",
  "record-input": "news-record-input",
  "record-pending": "level-record-pending",
  "record-success-flow": "english-record-success-flow",
  "refund-form": "expense-form-refund",
  "refund-processing": "expense-form-refund",
  "register-fixed-expense": "fixed-expense-register",
  "report-review-pending": "community-post-review-pending",
  "safety-info-unavailable": "health-safety-unavailable",
  "salary-amount-keypad": "onboarding-salary-amount-keypad",
  "salary-home-compact": "salary-compact",
  "salary-home-default": "salary",
  "salary-home-detailed": "salary-detailed",
  "save-failure": "fixed-expense-save-failure",
  "saving-alt": "living-cost-saving-alt",
  "search-results": "community-search-results",
  "sensitive-data-warning": "community-write-sensitive-warning",
  "social-account-connections": "profile-account",
  "social-login": "login",
  "social-signup-info": "signup-social-info",
  "splash-default": "splash",
  "splash-default-alt": "splash",
  "splash-static": "splash",
  "splash-static-alt": "splash",
  "unavailable-notice": "notice-unavailable",
  "validation-state-board": "community-write-validation",
  "weekday-weekend-budget": "living-cost-weekday-weekend",
  "workout-in-progress": "health-workout-in-progress",
  "writing-restricted": "community-write-restricted",
} satisfies Readonly<Record<string, CapturePreviewKind>>;

export function resolveCaptureKindForStitchSlug(
  variantSlug: string,
): CapturePreviewKind | null {
  const slug = variantSlug.trim();
  if (!slug) return null;
  return slugAliases[slug as keyof typeof slugAliases] ?? null;
}

export function resolveCaptureKindForStitchState({
  primaryCode,
  variantSlug,
}: StitchStateInput): CapturePreviewKind | null {
  const slug = variantSlug.trim();
  if (!slug) return null;

  const direct = resolveDirectByPrimary(primaryCode.trim(), slug);
  if (direct) return direct;
  return resolveCaptureKindForStitchSlug(slug);
}

function resolveDirectByPrimary(
  primaryCode: string,
  slug: string,
): CapturePreviewKind | null {
  switch (primaryCode) {
    case "BS-002":
    case "BS-003":
    case "BS-004":
    case "BS-005":
    case "BS-006":
    case "BS-007":
    case "BS-008":
    case "BS-010":
    case "BS-011":
    case "BS-012":
    case "MOD-001":
    case "MOD-002":
    case "MOD-003":
    case "MOD-004":
    case "MOD-007":
    case "MOD-008":
    case "MOD-010":
    case "SCR-028":
      return slug as CapturePreviewKind;
    case "MOD-005":
      return slug === "reading-mission-complete"
        ? "reading-already-complete"
        : (slug as CapturePreviewKind);
    case "MOD-006":
      return slug === "health-levelup"
        ? "levelup-result"
        : (slug as CapturePreviewKind);
    case "SCR-001":
      return "splash";
    case "SCR-002":
      return resolveAuthSlug(slug);
    case "SCR-003":
      return resolveSignupSlug(slug);
    case "SCR-004":
      return resolveOnboardingSlug(slug);
    case "SCR-005":
      return resolveSalarySlug(slug);
    case "SCR-006":
      return resolveExpenseSlug(slug);
    case "SCR-007":
      return resolveNotificationsSlug(slug);
    case "SCR-008":
      return resolvePlanSlug(slug);
    case "SCR-009":
      return resolveFixedExpenseSlug(slug);
    case "SCR-010":
      return resolveFixedSavingSlug(slug);
    case "SCR-011":
      return resolveLivingCostSlug(slug);
    case "SCR-012":
      return resolveLevelSlug(slug);
    case "SCR-013":
      return resolveReadingSlug(slug);
    case "SCR-014":
      return resolveNewsSlug(slug);
    case "SCR-015":
      return resolveEnglishSlug(slug);
    case "SCR-016":
      return resolveHealthSlug(slug);
    case "SCR-017":
      return resolveCommunityBoardSlug(slug);
    case "SCR-018":
      return resolveCommunityPostSlug(slug);
    case "SCR-019":
      return resolveCommunityWriteSlug(slug);
    case "SCR-020":
      return resolveCommunityCommentSlug(slug);
    case "SCR-021":
      return resolveProfileSlug(slug);
    case "SCR-022":
      return resolveProfileSettingsSlug(slug);
    case "SCR-023":
      return resolveProfileAccountSlug(slug);
    case "SCR-024":
      return resolveProfilePostsSlug(slug);
    case "SCR-025":
      return resolveMyLevelUpSlug(slug);
    case "SCR-026":
      return resolveInquirySlug(slug);
    case "SCR-027":
      return resolveNoticeSlug(slug);
    case "SCR-030":
      return "common-error";
    default:
      return null;
  }
}

const resolveAuthSlug = (slug: string): CapturePreviewKind =>
  slug === "login-credential-error" ||
  slug === "password-recovery" ||
  slug === "logout-complete"
    ? (slugAliases[slug as keyof typeof slugAliases] ?? (slug as CapturePreviewKind))
    : "login";

const resolveSignupSlug = (slug: string): CapturePreviewKind =>
  slug === "signup-review"
    ? "signup"
    : (slugAliases[slug as keyof typeof slugAliases] ??
      (`signup-${slug}` as CapturePreviewKind));

const resolveOnboardingSlug = (slug: string): CapturePreviewKind =>
  slug === "onboarding-intro"
    ? "onboarding-intro-alt"
    : (slugAliases[slug as keyof typeof slugAliases] ??
      (`onboarding-${slug}` as CapturePreviewKind));

const resolveSalarySlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "offline-preview" ? "salary-offline" : (`salary-${slug}` as CapturePreviewKind));

function resolveExpenseSlug(slug: string): CapturePreviewKind {
  if (slug === "invalidate-confirm") return "expense-invalidate-reason";
  return slugAliases[slug as keyof typeof slugAliases] ?? "expense-form-state";
}

function resolveNotificationsSlug(slug: string): CapturePreviewKind {
  if (slug === "all-read") return "notifications-all-read";
  if (slug === "notification-load-error") return "notifications-error";
  if (slug === "notification-list") return "notifications";
  if (slug === "notifications-empty-alt") return "notifications-empty";
  if (slug === "offline-preview") return "notifications-offline";
  if (slug === "salary-career-notifications") return "notifications";
  return slugAliases[slug as keyof typeof slugAliases] ?? (`notifications-${slug}` as CapturePreviewKind);
}

const resolvePlanSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "budget-summary-alt"
    ? "plan-budget-summary-alt"
    : slug === "budget-detail-summary"
      ? "plan-budget-detail-summary"
      : slug === "salary-info-edit"
        ? "plan-salary-info-edit"
        : (`plan-${slug}` as CapturePreviewKind));

const resolveFixedExpenseSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "saving" ? "fixed-expense-saving" : (`fixed-expense-${slug}` as CapturePreviewKind));

const resolveFixedSavingSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "saving" ? "fixed-saving-saving" : (`fixed-saving-${slug}` as CapturePreviewKind));

const resolveLivingCostSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "saving" ? "living-cost-saving" : (`living-cost-${slug}` as CapturePreviewKind));

const resolveLevelSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "home-default" ? "level" : (`level-${slug}` as CapturePreviewKind));

const resolveReadingSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "reading-home" ? "reading" : (`reading-${slug}` as CapturePreviewKind));

const resolveNewsSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "share-review"
    ? "news-share-review"
    : slug === "offline-preview"
      ? "news-offline-preview"
      : (`news-${slug}` as CapturePreviewKind));

const resolveEnglishSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "english-home" ? "english" : (`english-${slug}` as CapturePreviewKind));

const resolveHealthSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "content-load-error"
    ? "health-content-load-error"
    : slug === "health-home"
      ? "health"
      : (`health-${slug}` as CapturePreviewKind));

const resolveCommunityBoardSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "community-default" ? "community" : (`community-${slug}` as CapturePreviewKind));

const resolveCommunityPostSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "offline-preview"
    ? "community-post-offline"
    : slug === "load-error"
      ? "community-post-load-error"
      : (`community-post-${slug}` as CapturePreviewKind));

const resolveCommunityWriteSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ?? (`community-write-${slug}` as CapturePreviewKind);

const resolveCommunityCommentSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ?? (`community-${slug}` as CapturePreviewKind);

const resolveProfileSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "my-page-default" ? "profile" : (`profile-${slug}` as CapturePreviewKind));

const resolveProfileSettingsSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "profile-settings" ? "profile-settings" : (`profile-settings-${slug}` as CapturePreviewKind));

const resolveProfileAccountSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ?? (`profile-${slug}` as CapturePreviewKind);

function resolveProfilePostsSlug(slug: string): CapturePreviewKind {
  if (slug === "comments-tab") return "profile-community";
  if (slug === "drafts-tab") return "profile-drafts";
  if (slug === "offline-preview") return "profile-posts-offline";
  if (slug === "offline-preview-alt") return "profile-posts-offline-alt";
  if (slug === "loading-skeleton") return "profile-posts-loading-skeleton";
  return slugAliases[slug as keyof typeof slugAliases] ?? (`profile-${slug}` as CapturePreviewKind);
}

const resolveMyLevelUpSlug = (slug: string): CapturePreviewKind =>
  slug === "overview"
    ? "profile-level"
    : (slugAliases[slug as keyof typeof slugAliases] ??
      (`my-levelup-${slug}` as CapturePreviewKind));

const resolveInquirySlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "inquiry-list"
    ? "profile-support"
    : slug === "offline-preview"
      ? "inquiry-offline-preview"
      : slug);

const resolveNoticeSlug = (slug: string): CapturePreviewKind =>
  slugAliases[slug as keyof typeof slugAliases] ??
  (slug === "notice-list"
    ? "profile-notices"
    : slug === "offline-notice-list"
      ? "notice-offline-list"
      : slug.startsWith("notice-")
        ? (slug as CapturePreviewKind)
        : (`notice-${slug}` as CapturePreviewKind));
