export type RequiredExtensionStateKind =
  | "VALIDATION"
  | "DESTRUCTIVE"
  | "PERMISSION"
  | "OFFLINE"
  | "RETRY"
  | "SUCCESS";

export type RequiredExtensionState = Readonly<{
  id: string;
  kind: RequiredExtensionStateKind;
  productionRoute: string;
  routeFile: string;
  nativeComponent: string;
  designSystemComponent: string;
  trigger: string;
  recoveryAction: string;
  nativeImplemented: boolean;
}>;

export const requiredExtensionStateRegistry = [
  {
    id: "amount-input-invalid",
    kind: "VALIDATION",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
    nativeComponent: "AmountInputErrorDialog",
    designSystemComponent: "InfoModal",
    trigger: "invalid KRW amount input",
    recoveryAction: "return to amount input",
    nativeImplemented: true,
  },
  {
    id: "required-field-validation",
    kind: "VALIDATION",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
    nativeComponent: "CommunityWriteForm",
    designSystemComponent: "ErrorState",
    trigger: "required title/body missing",
    recoveryAction: "focus invalid field",
    nativeImplemented: true,
  },
  {
    id: "login-error",
    kind: "VALIDATION",
    productionRoute: "/(auth)/login",
    routeFile: "apps/mobile/app/(auth)/login.tsx",
    nativeComponent: "LoginCredentialForm",
    designSystemComponent: "ErrorState",
    trigger: "authentication rejected",
    recoveryAction: "retry login",
    nativeImplemented: true,
  },
  {
    id: "password-reset-error",
    kind: "VALIDATION",
    productionRoute: "/(auth)/reset-password",
    routeFile: "apps/mobile/app/(auth)/reset-password.tsx",
    nativeComponent: "ResetPasswordScreen",
    designSystemComponent: "ErrorState",
    trigger: "reset token or password validation failure",
    recoveryAction: "retry password reset",
    nativeImplemented: true,
  },
  {
    id: "payroll-invalid-state",
    kind: "VALIDATION",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
    nativeComponent: "PlanScreen",
    designSystemComponent: "ErrorState",
    trigger: "payroll plan rejected by server authority",
    recoveryAction: "correct payroll plan",
    nativeImplemented: true,
  },
  {
    id: "budget-invalid-state",
    kind: "VALIDATION",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
    nativeComponent: "PlanScreen",
    designSystemComponent: "ErrorState",
    trigger: "daily budget rejected by server authority",
    recoveryAction: "correct daily budget",
    nativeImplemented: true,
  },
  {
    id: "notification-permission-denied",
    kind: "PERMISSION",
    productionRoute: "/notifications/settings",
    routeFile: "apps/mobile/app/notifications/settings.tsx",
    nativeComponent: "NotificationSettingsScreen",
    designSystemComponent: "PermissionState",
    trigger: "Android notification permission denied",
    recoveryAction: "open settings or retry permission request",
    nativeImplemented: true,
  },
  {
    id: "offline-submit",
    kind: "OFFLINE",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
    nativeComponent: "CommunityWriteForm",
    designSystemComponent: "OfflineState",
    trigger: "submit attempted while API unavailable",
    recoveryAction: "save draft and retry",
    nativeImplemented: true,
  },
  {
    id: "retry-recovery",
    kind: "RETRY",
    productionRoute: "/",
    routeFile: "apps/mobile/app/_layout.tsx",
    nativeComponent: "CommonStateScreen/ErrorBoundary",
    designSystemComponent: "ErrorState",
    trigger: "recoverable runtime or server error",
    recoveryAction: "retry current request",
    nativeImplemented: true,
  },
  {
    id: "duplicate-submit",
    kind: "VALIDATION",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
    nativeComponent: "CommunityWriteForm",
    designSystemComponent: "PrimaryButton",
    trigger: "submit pressed while request pending",
    recoveryAction: "disable duplicate submit",
    nativeImplemented: true,
  },
  {
    id: "idempotency-conflict",
    kind: "VALIDATION",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
    nativeComponent: "SalaryHomeScreen",
    designSystemComponent: "ErrorState",
    trigger: "server idempotency conflict",
    recoveryAction: "server readback and retry",
    nativeImplemented: true,
  },
  {
    id: "financial-over-budget-warning",
    kind: "VALIDATION",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
    nativeComponent: "OverspendNotice",
    designSystemComponent: "ErrorState",
    trigger: "expense exceeds daily budget",
    recoveryAction: "review budget or confirm expense",
    nativeImplemented: true,
  },
  {
    id: "variable-expense-delete-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
    nativeComponent: "ExpenseDeleteDialog",
    designSystemComponent: "DestructiveConfirmModal",
    trigger: "delete variable expense",
    recoveryAction: "confirm or cancel delete",
    nativeImplemented: true,
  },
  {
    id: "saving-delete-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
    nativeComponent: "ConfirmDialog",
    designSystemComponent: "DestructiveConfirmModal",
    trigger: "delete savings goal",
    recoveryAction: "confirm or cancel delete",
    nativeImplemented: true,
  },
  {
    id: "plan-overwrite-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
    nativeComponent: "ConfirmDialog",
    designSystemComponent: "ConfirmModal",
    trigger: "overwrite important plan values",
    recoveryAction: "confirm or cancel overwrite",
    nativeImplemented: true,
  },
  {
    id: "community-post-delete-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
    nativeComponent: "CommunityPostDetailScreen",
    designSystemComponent: "DestructiveConfirmModal",
    trigger: "delete community post",
    recoveryAction: "confirm or cancel delete",
    nativeImplemented: true,
  },
  {
    id: "community-comment-delete-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
    nativeComponent: "CommunityCommentItem",
    designSystemComponent: "DestructiveConfirmModal",
    trigger: "delete community comment",
    recoveryAction: "confirm or cancel delete",
    nativeImplemented: true,
  },
  {
    id: "attachment-delete-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
    nativeComponent: "CommunityAttachmentList",
    designSystemComponent: "DestructiveConfirmModal",
    trigger: "remove uploaded attachment",
    recoveryAction: "confirm or cancel removal",
    nativeImplemented: true,
  },
  {
    id: "account-withdrawal-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/profile/account",
    routeFile: "apps/mobile/app/profile/account.tsx",
    nativeComponent: "AccountWithdrawalDialog",
    designSystemComponent: "DestructiveConfirmModal",
    trigger: "request account withdrawal",
    recoveryAction: "confirm or cancel withdrawal request",
    nativeImplemented: true,
  },
  {
    id: "logout-confirm",
    kind: "DESTRUCTIVE",
    productionRoute: "/profile/settings",
    routeFile: "apps/mobile/app/profile/settings.tsx",
    nativeComponent: "ProfileDetailScreen",
    designSystemComponent: "ConfirmModal",
    trigger: "logout from account",
    recoveryAction: "confirm or cancel logout",
    nativeImplemented: true,
  },
] as const satisfies readonly RequiredExtensionState[];

export const PRODUCT_REQUIRED_EXTENSION_STATES =
  requiredExtensionStateRegistry.length;
export const CANONICAL_VALIDATION_STATE_TOTAL =
  requiredExtensionStateRegistry.filter(
    (state) =>
      state.kind === "VALIDATION" ||
      state.kind === "PERMISSION" ||
      state.kind === "OFFLINE" ||
      state.kind === "RETRY",
  ).length;
export const CANONICAL_DESTRUCTIVE_STATE_TOTAL =
  requiredExtensionStateRegistry.filter(
    (state) => state.kind === "DESTRUCTIVE",
  ).length;
export const PRODUCT_REQUIRED_EXTENSION_IMPLEMENTED =
  requiredExtensionStateRegistry.filter(
    (state) => state.nativeImplemented,
  ).length;
export const PRODUCT_REQUIRED_EXTENSION_UNIMPLEMENTED =
  PRODUCT_REQUIRED_EXTENSION_STATES - PRODUCT_REQUIRED_EXTENSION_IMPLEMENTED;
