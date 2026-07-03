import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { salaryHijackingTheme } from "../clean-fintech-theme";

const appRoot = join(process.cwd(), "app");
const officialBiSha256 =
  "EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466";
const mojibakePattern = /[湲怨吏猷醫紐留吏理痍寃]/;

function source(path: string): string {
  return readFileSync(join(appRoot, path), "utf8");
}

function mobileSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Salary Hijacking Clean Fintech v1 mobile design contract", () => {
  it("exposes the approved green fintech theme tokens and Freesentation font map", () => {
    expect(salaryHijackingTheme.name).toBe("Salary Hijacking Clean Fintech v1");
    expect(salaryHijackingTheme.color.brand.primary).toBe("#209252");
    expect(salaryHijackingTheme.color.brand.secondary).toBe("#2FA86A");
    expect(salaryHijackingTheme.color.brand.soft).toBe("#EAF6EF");
    expect(salaryHijackingTheme.color.surface.app).toBe("#F7F8FA");
    expect(salaryHijackingTheme.color.surface.card).toBe("#FFFFFF");
    expect(salaryHijackingTheme.color.semantic.danger).toBe("#D74B4B");
    expect(salaryHijackingTheme.layout.bottomTabHeight).toBe(76);
    expect(salaryHijackingTheme.layout.touchTarget).toBe(44);
    expect(salaryHijackingTheme.font.native.regular).toBe(
      "Freesentation-4Regular",
    );
    expect(salaryHijackingTheme.font.native.black).toBe("Freesentation-9Black");
    expect(salaryHijackingTheme.font.family).toContain(
      "var(--font-presentation)",
    );
  });

  it("keeps Freesentation font assets bundled and loaded by the root layout", () => {
    const rootLayout = source("_layout.tsx");
    const expectedFonts = [
      "Freesentation-4Regular.ttf",
      "Freesentation-5Medium.ttf",
      "Freesentation-6SemiBold.ttf",
      "Freesentation-7Bold.ttf",
      "Freesentation-8ExtraBold.ttf",
      "Freesentation-9Black.ttf",
    ];

    expect(rootLayout).toContain("expo-font");
    expect(rootLayout).toContain("useFonts");

    for (const fontFile of expectedFonts) {
      const fontPath = join(process.cwd(), "assets", "fonts", fontFile);
      expect(existsSync(fontPath)).toBe(true);
      expect(statSync(fontPath).size).toBeGreaterThan(2_000_000);
      expect(rootLayout).toContain(fontFile);
    }
  });

  it("keeps the official BI logo bundled and used by app and release branding", () => {
    const brandLogo = join(
      process.cwd(),
      "assets",
      "brand",
      "salary-hijacking-platform-logo.png",
    );
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const rootLayout = source("_layout.tsx");
    const screenshotScript = readFileSync(
      join(
        process.cwd(),
        "..",
        "..",
        "scripts",
        "release",
        "capture-mobile-clean-fintech-screenshots.mjs",
      ),
      "utf8",
    );

    expect(existsSync(brandLogo)).toBe(true);
    expect(statSync(brandLogo).size).toBeGreaterThan(500_000);
    expect(
      createHash("sha256")
        .update(readFileSync(brandLogo))
        .digest("hex")
        .toUpperCase(),
    ).toBe(officialBiSha256);
    expect(cleanScreens).toContain("salary-hijacking-platform-logo.png");
    expect(rootLayout).toContain("salary-hijacking-platform-logo.png");
    expect(screenshotScript).toContain("salary-hijacking-platform-logo.png");
    expect(screenshotScript).toContain("/__brand-logo");
  });

  it("keeps clean mobile launch screens free from Korean mojibake", () => {
    const checkedSources = [
      "src/shared/styles/clean-fintech-theme.ts",
      "src/shared/styles/clean-fintech-screens.tsx",
      "app/(tabs)/_layout.tsx",
      "app/(tabs)/salary/index.tsx",
      "app/(tabs)/plan/index.tsx",
      "app/(tabs)/level/index.tsx",
      "app/(tabs)/community/index.tsx",
      "app/(tabs)/profile/index.tsx",
      "app/(auth)/login.tsx",
      "app/(auth)/signup.tsx",
      "app/notifications/index.tsx",
      "app/community/write.tsx",
      "app/community/[postId].tsx",
      "app/level/reading.tsx",
      "app/level/news.tsx",
      "app/level/english.tsx",
      "app/level/health.tsx",
    ];

    for (const relativePath of checkedSources) {
      const text = mobileSource(relativePath);
      expect(text).not.toMatch(mojibakePattern);
    }
  });

  it("keeps the bottom navigation on the approved five-tab IA", () => {
    const tabs = source("(tabs)/_layout.tsx");

    for (const label of ["급여", "계획", "LV", "커뮤니티", "MY"]) {
      expect(tabs).toContain(label);
    }

    expect(tabs).toContain("급여납치 하단 탭 내비게이션");
    expect(tabs).toContain("#209252");
    expect(tabs).toContain("#ADB3B8");
    expect(tabs).toContain("#FFFFFF");
    expect(tabs).not.toContain("#020617");
  });

  it("keeps Expo launch surfaces aligned with the clean fintech theme", () => {
    const config = mobileSource("app.config.ts");

    expect(config).toContain("#209252");
    expect(config).toContain("#F7F8FA");
    expect(config).toContain('"급여금액"');
    expect(config).toContain('"계좌번호"');
    expect(config).not.toContain('"급여",');
    expect(config).not.toContain('"월급",');
    expect(config).toContain("공개 Expo 환경변수에 서버 비밀");
    expect(config).not.toContain("#020617");
    expect(config).not.toContain("#67E8F9");
  });

  it("keeps the daily budget screenshot anchor available for store capture", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain('nativeID="daily-budget"');
    expect(cleanScreens).toContain("scrollIntoView");
    expect(cleanScreens).toContain("#daily-budget");
    expect(cleanScreens).toContain("focus=daily-budget");
  });

  it("keeps salary home expense entry connected to the server-authoritative API first", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("createMobileBudgetApi");
    expect(cleanScreens).toContain("createVariableExpense");
    expect(cleanScreens).toContain("serverAuthority");
    expect(cleanScreens).toContain("idempotencyKey");
    expect(cleanScreens).toContain("서버에 지출을 기록했어요");
    expect(cleanScreens).toContain("오프라인 미리보기로 반영했어요");
  });

  it("keeps salary home daily budget hydrated from the server before offline preview fallback", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("serverBudgetSnapshot");
    expect(cleanScreens).toContain("budgetApi.getToday");
    expect(cleanScreens).toContain("setServerBudgetSnapshot");
    expect(cleanScreens).toContain("baseSpentToday");
    expect(cleanScreens).toContain("baseDailyLimit");
    expect(cleanScreens).toContain("setAddedExpenses([]");
  });

  it("keeps salary home fixed expenses hydrated from the server before static fallback", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("salaryPlanCommitmentsApi");
    expect(cleanScreens).toContain("salaryFixedExpenses");
    expect(cleanScreens).toContain("salaryPlanCommitmentsApi.getCommitments");
    expect(cleanScreens).toContain(
      "setSalaryFixedExpenses(commitments.fixedExpenses)",
    );
    expect(cleanScreens).toContain("salaryFixedExpenseRows");
    expect(cleanScreens).toContain("fixedExpenseRowFromServer");
  });

  it("keeps login and signup submitted through the server auth API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobileAuthApi");
    expect(mobileApi).toContain("createDefaultRefreshAccessToken");
    expect(mobileApi).toContain(".refresh()");
    expect(cleanScreens).toContain("createMobileAuthApi");
    expect(cleanScreens).toContain("loginAuthApi");
    expect(cleanScreens).toContain("signupAuthApi");
    expect(cleanScreens).toContain("submitLogin");
    expect(cleanScreens).toContain("submitSignup");
    expect(cleanScreens).toContain("loginAuthApi.login");
    expect(cleanScreens).toContain("signupAuthApi.register");
    expect(cleanScreens).toContain("AUTHENTICATED");
    expect(cleanScreens).toContain("MFA_REQUIRED");
    expect(cleanScreens).toContain("서버 인증이 완료됐어요");
    expect(cleanScreens).toContain("가입 요청을 서버에 등록했어요");
    expect(cleanScreens).not.toContain(
      "회원가입 요청을 서버 권위 API로 보낼 준비가 됐어요.",
    );
  });

  it("keeps plan screen hydrated and recalculated through the server payroll API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobilePayrollApi");
    expect(mobileApi).toContain("createMobilePlanCommitmentsApi");
    expect(cleanScreens).toContain("createMobilePayrollApi");
    expect(cleanScreens).toContain("createMobilePlanCommitmentsApi");
    expect(cleanScreens).toContain("serverPayrollPlan");
    expect(cleanScreens).toContain("serverPayrollCalculation");
    expect(cleanScreens).toContain("serverFixedExpenses");
    expect(cleanScreens).toContain("serverSavingsGoals");
    expect(cleanScreens).toContain("planCommitmentsApi.getCommitments");
    expect(cleanScreens).toContain("payrollApi.getCurrent");
    expect(cleanScreens).toContain("payrollApi.recalculate");
    expect(cleanScreens).toContain(
      "setSalary(String(nextPlan.payrollAmountMinor))",
    );
    expect(cleanScreens).toContain(
      "setExpense(String(commitments.fixedExpenseTotalMinor))",
    );
    expect(cleanScreens).toContain(
      "setTarget(String(commitments.fixedSavingsTotalMinor))",
    );
    expect(cleanScreens).toContain(
      "fixedExpenseTotalMinor: nonNegative(expense)",
    );
    expect(cleanScreens).toContain(
      "fixedSavingsTotalMinor: nonNegative(target)",
    );
  });

  it("keeps notification screen hydrated from the server before static fallback", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobileNotificationsApi");
    expect(cleanScreens).toContain("createMobileNotificationsApi");
    expect(cleanScreens).toContain("serverNotifications");
    expect(cleanScreens).toContain("fallbackNotifications");
    expect(cleanScreens).toContain("notificationsApi.list");
    expect(cleanScreens).toContain("notificationsApi.unreadCount");
    expect(cleanScreens).toContain("중요 알림");
    expect(cleanScreens).toContain("루틴 알림");
  });

  it("keeps notification read-all persisted through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("markAllNotificationsRead");
    expect(cleanScreens).toContain(".markAllRead()");
    expect(cleanScreens).toContain('status: "READ"');
    expect(cleanScreens).toContain("setUnreadCount(0)");
    expect(cleanScreens).toContain("markedReadCount");
  });

  it("keeps notification taps marking read and following safe app deeplinks", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("deeplink: item.deeplink");
    expect(cleanScreens).toContain("safeNotificationRoute");
    expect(cleanScreens).toContain("openNotification");
    expect(cleanScreens).toContain("markRead(item)");
    expect(cleanScreens).toContain(
      "notificationRouter.push(notificationRoute)",
    );
    expect(cleanScreens).toContain("onPress={() => openNotification(item)}");
  });

  it("keeps LV UP screen hydrated from the server growth API before local fallback", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobileGrowthApi");
    expect(cleanScreens).toContain("createMobileGrowthApi");
    expect(cleanScreens).toContain("serverGrowthDashboard");
    expect(cleanScreens).toContain("serverGrowthTasks");
    expect(cleanScreens).toContain("growthApi.getDashboard");
    expect(cleanScreens).toContain("growthApi.listTasks");
    expect(cleanScreens).toContain("recordTaskProgress");
    expect(cleanScreens).toContain("fallbackMissions");
  });

  it("keeps fallback LV UP missions navigating to their detail screens", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("const levelRouter = useRouter()");
    expect(cleanScreens).toContain("levelMissionRouteMap");
    expect(cleanScreens).toContain('reading: "/level/reading"');
    expect(cleanScreens).toContain('news: "/level/news"');
    expect(cleanScreens).toContain('english: "/level/english"');
    expect(cleanScreens).toContain('health: "/level/health"');
    expect(cleanScreens).toContain("openMission");
    expect(cleanScreens).toContain("levelRouter.push(route)");
  });

  it("keeps LV UP detail content completion persisted through the growth API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const growthApi = mobileSource("src/features/level/api.ts");

    expect(growthApi).toContain("completeContent");
    expect(cleanScreens).toContain("contentId");
    expect(cleanScreens).toContain("completeLevelContent");
    expect(cleanScreens).toContain(".completeContent({");
    expect(cleanScreens).toContain("mobile level detail content complete");
    expect(cleanScreens).toContain("recommendationUsesSensitiveFinancialData");
  });

  it("keeps MY screen hydrated from the server profile API before static fallback", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobileProfileApi");
    expect(cleanScreens).toContain("createMobileProfileApi");
    expect(cleanScreens).toContain("serverProfileSnapshot");
    expect(cleanScreens).toContain("profileApi.getProfile");
    expect(cleanScreens).toContain("profileApi.getMyPageSummary");
    expect(cleanScreens).toContain("mergeProfileSnapshotWithMyPageSummary");
    expect(cleanScreens).toContain("requestPrivacyExport");
    expect(cleanScreens).toContain("requestWithdrawalRequest");
    expect(cleanScreens).toContain("profileAuthApi");
    expect(cleanScreens).toContain(".logout()");
    expect(cleanScreens).toContain("logoutSession");
    expect(cleanScreens).toContain("fallbackProfileSnapshot");
    expect(cleanScreens).toContain("privacyPassRate");
    expect(cleanScreens).toContain("financialDataForAds");
  });

  it("keeps MY management menu entries connected to app actions", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("openMyCommunityPosts");
    expect(cleanScreens).toContain('profileRouter.push("/community")');
    expect(cleanScreens).toContain("openMyLevelProgress");
    expect(cleanScreens).toContain('profileRouter.push("/level")');
    expect(cleanScreens).toContain("openProfileNotices");
    expect(cleanScreens).toContain('profileRouter.push("/profile/notices")');
    expect(cleanScreens).toContain("openSupportInquiry");
    expect(cleanScreens).toContain("onPress={openMyCommunityPosts}");
    expect(cleanScreens).toContain("onPress={openMyLevelProgress}");
    expect(cleanScreens).toContain("onPress={openSupportInquiry}");
    expect(cleanScreens).toContain("onPress={openProfileNotices}");
  });

  it("keeps MY notices routed to a server-backed profile activity screen", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("CleanFintechProfileNoticesScreen");
    expect(cleanScreens).toContain("profileNoticesApi.getProfile");
    expect(cleanScreens).toContain("profileActivities");
    expect(cleanScreens).toContain("fallbackProfileSnapshot.activities");
    expect(cleanScreens).toContain("rawFinancialDataExposed");
    expect(cleanScreens).toContain("adsFinancialTargetingUsed");
    expect(source("profile/notices.tsx")).toContain(
      "<CleanFintechProfileNoticesScreen />",
    );
  });

  it("keeps MY profile and account settings entry points routed", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("CleanFintechSettingsScreen");
    expect(cleanScreens).toContain("openProfileSettings");
    expect(cleanScreens).toContain('profileRouter.push("/profile/settings")');
    expect(cleanScreens).toContain("openAccountSettings");
    expect(cleanScreens).toContain('profileRouter.push("/profile/account")');
    expect(cleanScreens).toContain("onPress={openProfileSettings}");
    expect(cleanScreens).toContain("onPress={openAccountSettings}");
    expect(source("profile/settings.tsx")).toContain(
      'CleanFintechSettingsScreen kind="profile"',
    );
    expect(source("profile/account.tsx")).toContain(
      'CleanFintechSettingsScreen kind="account"',
    );
  });

  it("keeps profile settings saved through the server profile API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileApi = mobileSource("src/features/profile/api.ts");

    expect(profileApi).toContain("updateProfile");
    expect(cleanScreens).toMatch(/profileSettingsApi\s*\.?\s*updateProfile/);
    expect(cleanScreens).toContain("profileNickname");
    expect(cleanScreens).toContain("profileDisplayBio");
    expect(cleanScreens).toContain("profileOccupationCategory");
    expect(cleanScreens).toContain("submitProfileSettings");
    expect(cleanScreens).toContain("rawFinancialDataExposed=false");
    expect(source("profile/settings.tsx")).toContain(
      'CleanFintechSettingsScreen kind="profile"',
    );
  });

  it("keeps account settings saved through the server consent API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileApi = mobileSource("src/features/profile/api.ts");

    expect(profileApi).toContain("updateAccountSettings");
    expect(cleanScreens).toMatch(
      /accountSettingsApi\s*\.?\s*updateAccountSettings/,
    );
    expect(cleanScreens).toContain("marketingAccepted");
    expect(cleanScreens).toContain("contentRecommendationAccepted");
    expect(cleanScreens).toContain("sensitiveFinancialTargetingAccepted=false");
    expect(source("profile/account.tsx")).toContain(
      'CleanFintechSettingsScreen kind="account"',
    );
  });

  it("keeps MY support inquiry routed to a privacy-safe compose screen", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("CleanFintechSupportScreen");
    expect(cleanScreens).toContain("supportSubject");
    expect(cleanScreens).toContain("supportMessage");
    expect(cleanScreens).toContain("openSupportInquiry");
    expect(cleanScreens).toContain('profileRouter.push("/profile/support")');
    expect(cleanScreens).toContain("support@salaryhijacking.com");
    expect(cleanScreens).toContain("민감한 금융 원문은 문의에 적지 마세요.");
    expect(cleanScreens).toContain("rawFinancialData=false");
    expect(cleanScreens).toContain("rawPersonalData=false");
    expect(source("profile/support.tsx")).toContain(
      "<CleanFintechSupportScreen />",
    );
  });

  it("keeps community screen hydrated from the server feed service before static fallback", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobileCommunityService");
    expect(cleanScreens).toContain("createMobileCommunityService");
    expect(cleanScreens).toContain("serverCommunityFeed");
    expect(cleanScreens).toContain("communityService.listPosts");
    expect(cleanScreens).toContain("parseCommunityFeedPage");
    expect(cleanScreens).toContain("communityResponseData");
    expect(cleanScreens).toContain("fallbackCommunityPosts");
    expect(cleanScreens).toContain("rawFinancialDataExposed");
    expect(cleanScreens).toContain("adsFinancialTargetingUsed");
  });

  it("keeps community FAB navigating to the write flow", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("const communityRouter = useRouter()");
    expect(cleanScreens).toContain("openCommunityWrite");
    expect(cleanScreens).toContain('communityRouter.push("/community/write")');
    expect(cleanScreens).toContain("onPress={openCommunityWrite}");
  });

  it("keeps community list posts navigating to their detail route", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const postIdExpression = ["$", "{post.id}"].join("");

    expect(cleanScreens).toContain("openCommunityPost");
    expect(cleanScreens).toContain(
      ["communityRouter.push(`/community/", postIdExpression, "`)"].join(""),
    );
    expect(cleanScreens).toContain("onPress={onPress}");
    expect(cleanScreens).toContain("onPress={() => openCommunityPost(post)}");
  });

  it("keeps community write screen submitting through the server publish service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");

    expect(mobileApi).toContain("createMobileCommunityService");
    expect(cleanScreens).toContain("writeCommunityService");
    expect(cleanScreens).toContain("submitCommunityPost");
    expect(cleanScreens).toContain("publishPost(draft)");
    expect(cleanScreens).toContain('communityBoardApiMap[board] ?? "FREE"');
    expect(cleanScreens).toContain('tags: question ? ["질문"] : []');
    expect(cleanScreens).toContain("setSubmitting(true)");
    expect(cleanScreens).toContain("setSubmitting(false)");
    expect(cleanScreens).toContain('setTitle("")');
    expect(cleanScreens).toContain('setBody("")');
  });

  it("keeps community detail screen hydrated from the server detail and comments service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");
    const postRoute = mobileSource("app/community/[postId].tsx");

    expect(mobileApi).toContain("createMobileCommunityService");
    expect(postRoute).toContain("useLocalSearchParams");
    expect(postRoute).toContain("postId={postId}");
    expect(cleanScreens).toContain("detailCommunityService");
    expect(cleanScreens).toContain("serverCommunityDetail");
    expect(cleanScreens).toContain("serverCommunityComments");
    expect(cleanScreens).toContain("refreshCommunityDetail");
    expect(cleanScreens).toContain("detailCommunityService.getPost");
    expect(cleanScreens).toContain("detailCommunityService.listComments");
    expect(cleanScreens).toContain("parseCommunityPostDetail");
    expect(cleanScreens).toContain("parseCommunityCommentPage");
    expect(cleanScreens).toContain("setPostLiked(targetPostId, nextLiked)");
    expect(cleanScreens).toContain("fallbackPostDetail");
    expect(cleanScreens).toContain("rawPersonalDataExposed");
  });

  it("keeps community detail comments submitted through the server comment service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("commentDraft");
    expect(cleanScreens).toContain("commentSubmitting");
    expect(cleanScreens).toContain("submitCommunityComment");
    expect(cleanScreens).toContain("detailCommunityService");
    expect(cleanScreens).toContain(".createComment(targetPostId");
    expect(cleanScreens).toContain("parseCommunityComment");
    expect(cleanScreens).toContain("anonymous: true");
    expect(cleanScreens).toContain("setCommentSubmitting(true)");
    expect(cleanScreens).toContain("setCommentSubmitting(false)");
    expect(cleanScreens).toContain('setCommentDraft("")');
    expect(cleanScreens).toContain("setServerCommunityComments((current)");
  });

  it("keeps community detail report actions wired to the server moderation service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("reportCommunityPost");
    expect(cleanScreens).toContain("reportCommunityComment");
    expect(cleanScreens).toContain(".reportPost(targetPostId");
    expect(cleanScreens).toContain(".reportComment(comment.id");
    expect(cleanScreens).toContain("ABUSE");
    expect(cleanScreens).toContain("server moderation");
  });

  it("keeps community detail delete actions wired to the server moderation service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("deleteCommunityPost");
    expect(cleanScreens).toContain("deleteCommunityComment");
    expect(cleanScreens).toContain(".deletePost(targetPostId");
    expect(cleanScreens).toContain(".deleteComment(comment.id");
    expect(cleanScreens).toContain("setServerCommunityDetail(null)");
    expect(cleanScreens).toContain("setServerCommunityComments((current)");
    expect(cleanScreens).toContain('detailRouter.replace("/community")');
  });

  it("keeps community detail edit actions wired to the server update service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("updateCommunityPost");
    expect(cleanScreens).toContain("updateCommunityComment");
    expect(cleanScreens).toContain(".updatePost(targetPostId");
    expect(cleanScreens).toContain(".updateComment(comment.id");
    expect(cleanScreens).toContain("postEditTitle");
    expect(cleanScreens).toContain("postEditContent");
    expect(cleanScreens).toContain("commentEditDrafts");
    expect(cleanScreens).toContain("setServerCommunityDetail((current)");
  });

  it("keeps salary, plan, LV UP, community, compose, and profile launch copy visible", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    for (const marker of [
      "이번 달 내가 지켜낸 돈",
      "오늘 쓸 수 있는 돈",
      "수령금액",
      "지출금액",
      "이번 달 납치금액",
      "다음 급여일 D-day",
      "지출 추가하기",
      "제휴/광고",
      "목표 달성률",
      "급여 계획",
      "고정지출",
      "고정저축",
      "생활비",
      "현재 레벨",
      "독서하기",
      "뉴스보기",
      "영어연습",
      "홈트하기",
      "중요 알림",
      "루틴 알림",
      "전체 게시판",
      "자유 게시판",
      "레벨업 인증",
      "취미 게시판",
      "글쓰기",
      "제목",
      "본문",
      "익명",
      "누적 납치금액",
      "레벨업 현황",
      "자기관리 성과",
      "내 게시글 관리",
    ]) {
      expect(cleanScreens).toContain(marker);
    }
  });

  it("keeps splash, signup, LV detail, and community detail launch copy visible", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    for (const marker of [
      "SALARY HIJACKING",
      "월급이 사라지기 전에 먼저 붙잡아요",
      "민감 정보 보호",
      "약관 동의",
      "/api/v1/auth/register",
      "AI 추천",
      "소설",
      "경제/경영",
      "인문/철학",
      "Listening",
      "Speaking",
      "Reading",
      "Writing",
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "댓글",
      "공유",
    ]) {
      expect(cleanScreens).toContain(marker);
    }
  });
});
