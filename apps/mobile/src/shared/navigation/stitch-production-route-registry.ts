export const STITCH_NATIVE_PRODUCTION_SURFACE =
  "SOURCE_NATIVE_ROUTE_COMPONENT_READY_VISUAL_A11Y_PENDING" as const;

type StitchProductionInput = Readonly<{
  artifactType: string;
  primaryCode: string;
  routeOrOverlay: string;
  stateCode: string;
  variantSlug: string;
}>;

export type StitchProductionStateMapping = Readonly<{
  acceptanceStage: typeof STITCH_NATIVE_PRODUCTION_SURFACE;
  artifactType: string;
  implementationFile: string;
  nativeComponent: string;
  productionRoute: string;
  routeFile: string;
  stateCode: string;
}>;

type ProductionSurface = Readonly<{
  implementationFile: string;
  nativeComponent: string;
  productionRoute: string;
  routeFile: string;
}>;

const screenSurfaces = {
  "SCR-001": {
    implementationFile:
      "apps/mobile/src/features/auth/components/SplashLaunchScreen.tsx",
    nativeComponent: "SplashLaunchScreen",
    productionRoute: "/",
    routeFile: "apps/mobile/app/index.tsx",
  },
  "SCR-002": {
    implementationFile: "apps/mobile/src/features/auth/components/index.ts",
    nativeComponent: "LoginHero/LoginCredentialForm",
    productionRoute: "/(auth)/login",
    routeFile: "apps/mobile/app/(auth)/login.tsx",
  },
  "SCR-003": {
    implementationFile: "apps/mobile/src/features/auth/components/index.ts",
    nativeComponent: "SignupHero/SignupForm/SignupAgreementCard",
    productionRoute: "/(auth)/signup",
    routeFile: "apps/mobile/app/(auth)/signup.tsx",
  },
  "SCR-004": {
    implementationFile: "apps/mobile/app/onboarding.tsx",
    nativeComponent: "OnboardingScreen",
    productionRoute: "/onboarding",
    routeFile: "apps/mobile/app/onboarding.tsx",
  },
  "SCR-005": {
    implementationFile:
      "apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx",
    nativeComponent: "SalaryHomeScreen",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
  },
  "SCR-006": {
    implementationFile:
      "apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx",
    nativeComponent: "VariableExpenseQuickAdd/SalaryHomeScreen",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
  },
  "SCR-007": {
    implementationFile:
      "apps/mobile/src/features/notifications/components/NotificationScreen.tsx",
    nativeComponent: "NotificationScreen",
    productionRoute: "/notifications",
    routeFile: "apps/mobile/app/notifications/index.tsx",
  },
  "SCR-008": {
    implementationFile: "apps/mobile/src/features/plan/components/PlanScreen.tsx",
    nativeComponent: "PlanScreen",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "SCR-009": {
    implementationFile:
      "apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx",
    nativeComponent: "FixedExpenseFormScreen",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "SCR-010": {
    implementationFile:
      "apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx",
    nativeComponent: "FixedSavingsFormScreen",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "SCR-011": {
    implementationFile:
      "apps/mobile/src/features/plan/components/DailyBudgetFormScreen.tsx",
    nativeComponent: "DailyBudgetFormScreen",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "SCR-012": {
    implementationFile: "apps/mobile/src/features/level/components/index.ts",
    nativeComponent: "LevelHeroCard/LevelActionGrid",
    productionRoute: "/level",
    routeFile: "apps/mobile/app/(tabs)/level/index.tsx",
  },
  "SCR-013": {
    implementationFile: "apps/mobile/src/shared/styles/clean-fintech-screens.tsx",
    nativeComponent: "CleanFintechLevelDetailScreen",
    productionRoute: "/level/reading",
    routeFile: "apps/mobile/app/level/reading.tsx",
  },
  "SCR-014": {
    implementationFile: "apps/mobile/src/shared/styles/clean-fintech-screens.tsx",
    nativeComponent: "CleanFintechLevelDetailScreen",
    productionRoute: "/level/news",
    routeFile: "apps/mobile/app/level/news.tsx",
  },
  "SCR-015": {
    implementationFile: "apps/mobile/src/shared/styles/clean-fintech-screens.tsx",
    nativeComponent: "CleanFintechLevelDetailScreen",
    productionRoute: "/level/english",
    routeFile: "apps/mobile/app/level/english.tsx",
  },
  "SCR-016": {
    implementationFile: "apps/mobile/src/shared/styles/clean-fintech-screens.tsx",
    nativeComponent: "CleanFintechLevelDetailScreen",
    productionRoute: "/level/health",
    routeFile: "apps/mobile/app/level/health.tsx",
  },
  "SCR-017": {
    implementationFile:
      "apps/mobile/src/features/community/components/PopularPostSection.tsx",
    nativeComponent: "CommunityTabBar/PopularPostSection",
    productionRoute: "/community",
    routeFile: "apps/mobile/app/(tabs)/community/index.tsx",
  },
  "SCR-018": {
    implementationFile: "apps/mobile/app/community/[postId].tsx",
    nativeComponent: "CommunityPostDetailScreen",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
  },
  "SCR-019": {
    implementationFile:
      "apps/mobile/src/features/community/components/CommunityWriteForm.tsx",
    nativeComponent: "CommunityWriteForm",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
  },
  "SCR-020": {
    implementationFile:
      "apps/mobile/src/features/community/components/CommunityCommentItem.tsx",
    nativeComponent: "CommunityCommentItem",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
  },
  "SCR-021": {
    implementationFile:
      "apps/mobile/src/features/profile/components/ProfileScreen.tsx",
    nativeComponent: "ProfileScreen",
    productionRoute: "/profile",
    routeFile: "apps/mobile/app/(tabs)/profile/index.tsx",
  },
  "SCR-022": {
    implementationFile: "apps/mobile/app/profile/settings.tsx",
    nativeComponent: "ProfileDetailScreen",
    productionRoute: "/profile/settings",
    routeFile: "apps/mobile/app/profile/settings.tsx",
  },
  "SCR-023": {
    implementationFile: "apps/mobile/app/profile/account.tsx",
    nativeComponent: "ProfileDetailScreen",
    productionRoute: "/profile/account",
    routeFile: "apps/mobile/app/profile/account.tsx",
  },
  "SCR-024": {
    implementationFile: "apps/mobile/app/profile/community.tsx",
    nativeComponent: "ProfileDetailScreen",
    productionRoute: "/profile/community",
    routeFile: "apps/mobile/app/profile/community.tsx",
  },
  "SCR-025": {
    implementationFile: "apps/mobile/app/profile/level.tsx",
    nativeComponent: "ProfileDetailScreen",
    productionRoute: "/profile/level",
    routeFile: "apps/mobile/app/profile/level.tsx",
  },
  "SCR-026": {
    implementationFile: "apps/mobile/app/profile/support.tsx",
    nativeComponent: "ProfileDetailScreen",
    productionRoute: "/profile/support",
    routeFile: "apps/mobile/app/profile/support.tsx",
  },
  "SCR-027": {
    implementationFile: "apps/mobile/app/profile/notices.tsx",
    nativeComponent: "ProfileDetailScreen",
    productionRoute: "/profile/notices",
    routeFile: "apps/mobile/app/profile/notices.tsx",
  },
  "SCR-028": {
    implementationFile: "apps/mobile/app/(auth)/signup.tsx",
    nativeComponent: "SignupAgreementCard",
    productionRoute: "/(auth)/signup",
    routeFile: "apps/mobile/app/(auth)/signup.tsx",
  },
  "SCR-030": {
    implementationFile: "apps/mobile/src/shared/ui/states/CommonStateScreen.tsx",
    nativeComponent: "CommonStateScreen/ErrorBoundary",
    productionRoute: "/",
    routeFile: "apps/mobile/app/_layout.tsx",
  },
} satisfies Readonly<Record<string, ProductionSurface>>;

const overlaySurfaces = {
  "BS-001": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/SelectionBottomSheet.tsx",
    nativeComponent: "SelectionBottomSheet",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
  },
  "BS-002": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/DateSelectionBottomSheet.tsx",
    nativeComponent: "DateSelectionBottomSheet",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "BS-003": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/RecurrenceBottomSheet.tsx",
    nativeComponent: "RecurrenceBottomSheet",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "BS-004": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/AttachmentBottomSheet.tsx",
    nativeComponent: "AttachmentBottomSheet",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
  },
  "BS-005": {
    implementationFile: "apps/mobile/src/shared/ui/sheets/ShareBottomSheet.tsx",
    nativeComponent: "ShareBottomSheet",
    productionRoute: "/level/reading",
    routeFile: "apps/mobile/app/level/reading.tsx",
  },
  "BS-006": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/SelectionBottomSheet.tsx",
    nativeComponent: "SelectionBottomSheet",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
  },
  "BS-007": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/SortFilterBottomSheet.tsx",
    nativeComponent: "SortFilterBottomSheet",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
  },
  "BS-008": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/SortFilterBottomSheet.tsx",
    nativeComponent: "SortFilterBottomSheet",
    productionRoute: "/community",
    routeFile: "apps/mobile/app/(tabs)/community/index.tsx",
  },
  "BS-010": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/VisibilityBottomSheet.tsx",
    nativeComponent: "VisibilityBottomSheet",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
  },
  "BS-011": {
    implementationFile: "apps/mobile/src/shared/components/ConfirmDialog.tsx",
    nativeComponent: "ConfirmDialog",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
  },
  "BS-012": {
    implementationFile:
      "apps/mobile/src/shared/ui/sheets/DevicePermissionBottomSheet.tsx",
    nativeComponent: "DevicePermissionBottomSheet",
    productionRoute: "/notifications/settings",
    routeFile: "apps/mobile/app/notifications/settings.tsx",
  },
  "MOD-001": {
    implementationFile:
      "apps/mobile/src/shared/ui/dialogs/AmountInputErrorDialog.tsx",
    nativeComponent: "AmountInputErrorDialog",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
  },
  "MOD-002": {
    implementationFile: "apps/mobile/src/shared/components/ConfirmDialog.tsx",
    nativeComponent: "ConfirmDialog",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
  },
  "MOD-003": {
    implementationFile: "apps/mobile/src/shared/components/XpToast.tsx",
    nativeComponent: "XpToast",
    productionRoute: "/plan",
    routeFile: "apps/mobile/app/(tabs)/plan/index.tsx",
  },
  "MOD-004": {
    implementationFile: "apps/mobile/src/shared/components/ErrorState.tsx",
    nativeComponent: "ErrorState",
    productionRoute: "/salary",
    routeFile: "apps/mobile/app/(tabs)/salary/index.tsx",
  },
  "MOD-005": {
    implementationFile: "apps/mobile/src/shared/components/XpToast.tsx",
    nativeComponent: "XpToast",
    productionRoute: "/level",
    routeFile: "apps/mobile/app/(tabs)/level/index.tsx",
  },
  "MOD-006": {
    implementationFile: "apps/mobile/src/shared/components/XpToast.tsx",
    nativeComponent: "XpToast",
    productionRoute: "/level",
    routeFile: "apps/mobile/app/(tabs)/level/index.tsx",
  },
  "MOD-007": {
    implementationFile: "apps/mobile/src/shared/components/XpToast.tsx",
    nativeComponent: "XpToast",
    productionRoute: "/community/write",
    routeFile: "apps/mobile/app/community/write.tsx",
  },
  "MOD-008": {
    implementationFile: "apps/mobile/src/shared/components/ConfirmDialog.tsx",
    nativeComponent: "ConfirmDialog",
    productionRoute: "/community/[postId]",
    routeFile: "apps/mobile/app/community/[postId].tsx",
  },
  "MOD-009": {
    implementationFile: "apps/mobile/src/shared/components/ConfirmDialog.tsx",
    nativeComponent: "ConfirmDialog",
    productionRoute: "/profile/settings",
    routeFile: "apps/mobile/app/profile/settings.tsx",
  },
  "MOD-010": {
    implementationFile: "apps/mobile/src/shared/components/ConfirmDialog.tsx",
    nativeComponent: "ConfirmDialog",
    productionRoute: "/profile/account",
    routeFile: "apps/mobile/app/profile/account.tsx",
  },
} satisfies Readonly<Record<string, ProductionSurface>>;

export function resolveProductionStitchState({
  artifactType,
  primaryCode,
  routeOrOverlay,
  stateCode,
  variantSlug,
}: StitchProductionInput): StitchProductionStateMapping | null {
  const normalizedPrimary = primaryCode.trim();
  const surface =
    overlaySurfaces[normalizedPrimary as keyof typeof overlaySurfaces] ??
    screenSurfaces[normalizedPrimary as keyof typeof screenSurfaces] ??
    resolveSurfaceFromRoute(routeOrOverlay.trim(), variantSlug.trim());

  if (!surface) return null;

  return {
    acceptanceStage: STITCH_NATIVE_PRODUCTION_SURFACE,
    artifactType: artifactType.trim(),
    implementationFile: surface.implementationFile,
    nativeComponent: surface.nativeComponent,
    productionRoute: surface.productionRoute,
    routeFile: surface.routeFile,
    stateCode: stateCode.trim(),
  };
}

function resolveSurfaceFromRoute(
  routeOrOverlay: string,
  variantSlug: string,
): ProductionSurface | null {
  if (routeOrOverlay === "/terms" || variantSlug.startsWith("terms-")) {
    return screenSurfaces["SCR-028"];
  }
  if (routeOrOverlay.startsWith("/lv-up/reading")) return screenSurfaces["SCR-013"];
  if (routeOrOverlay.startsWith("/lv-up/news")) return screenSurfaces["SCR-014"];
  if (routeOrOverlay.startsWith("/lv-up/english")) return screenSurfaces["SCR-015"];
  if (routeOrOverlay.startsWith("/lv-up/health")) return screenSurfaces["SCR-016"];
  if (routeOrOverlay.startsWith("/community/posts")) {
    return screenSurfaces["SCR-018"];
  }
  return null;
}
