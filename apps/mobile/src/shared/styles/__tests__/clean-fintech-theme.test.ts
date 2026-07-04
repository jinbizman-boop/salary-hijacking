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
      "app/(auth)/verify-email.tsx",
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

  it("keeps salary home daily budget saved through the server daily budget API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const budgetApi = mobileSource("src/features/budget/api.ts");

    expect(budgetApi).toContain("saveDailyBudget");
    expect(cleanScreens).toContain("saveSalaryDailyBudget");
    expect(cleanScreens).toContain("budgetApi.saveDailyBudget");
    expect(cleanScreens).toContain("setSavingDailyBudget");
    expect(cleanScreens).toContain("dailyBudgetSaveInFlightRef");
    expect(cleanScreens).toContain("dailyBudgetSaveInFlightRef.current");
    expect(cleanScreens).toContain("serverBudgetSnapshot?.budgetId ?? null");
  });

  it("prevents duplicate salary home expense create and daily budget save requests before React state updates", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const addExpenseSource =
      cleanScreens.match(
        /const handleAddExpense = async \(\): Promise<void> => \{[\s\S]*?const updateSalaryVariableExpense = useCallback/u,
      )?.[0] ?? "";
    const dailyBudgetSource =
      cleanScreens.match(
        /const saveSalaryDailyBudget = useCallback\([\s\S]*?const pickVariableExpenseReceipt = useCallback/u,
      )?.[0] ?? "";

    expect(addExpenseSource).toContain("expenseCreateInFlightRef");
    expect(addExpenseSource).toContain("expenseCreateInFlightRef.current");
    expect(addExpenseSource).toContain(
      "expenseCreateInFlightRef.current = true",
    );
    expect(addExpenseSource).toContain(
      "expenseCreateInFlightRef.current = false",
    );
    expect(dailyBudgetSource).toContain("dailyBudgetSaveInFlightRef");
    expect(dailyBudgetSource).toContain("dailyBudgetSaveInFlightRef.current");
    expect(dailyBudgetSource).toContain(
      "dailyBudgetSaveInFlightRef.current = true",
    );
    expect(dailyBudgetSource).toContain(
      "dailyBudgetSaveInFlightRef.current = false",
    );
  });

  it("keeps salary home variable expenses hydrated, editable, and deletable through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const budgetApi = mobileSource("src/features/budget/api.ts");

    expect(budgetApi).toContain("listVariableExpenses");
    expect(budgetApi).toContain("updateVariableExpense");
    expect(budgetApi).toContain("deleteVariableExpense");
    expect(cleanScreens).toContain("serverVariableExpenses");
    expect(cleanScreens).toContain("budgetApi.listVariableExpenses");
    expect(cleanScreens).toContain("updateSalaryVariableExpense");
    expect(cleanScreens).toContain(".updateVariableExpense(");
    expect(cleanScreens).toContain("deleteSalaryVariableExpense");
    expect(cleanScreens).toContain(".deleteVariableExpense(");
    expect(cleanScreens).toContain("setServerVariableExpenses");
    expect(cleanScreens).toContain("updatingVariableExpenseId !== null");
    expect(cleanScreens).toContain("deletingVariableExpenseId !== null");
    expect(cleanScreens).toContain("variableExpenseActionInFlightRef");
    expect(cleanScreens).toContain(
      "variableExpenseActionInFlightRef.current !== null",
    );
    expect(cleanScreens).toContain(
      "variableExpenseActionInFlightRef.current = `update:${item.id}`",
    );
    expect(cleanScreens).toContain(
      "variableExpenseActionInFlightRef.current = `delete:${item.id}`",
    );
    expect(cleanScreens).toContain(
      "variableExpenseActionInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("disabled={updating}");
    expect(cleanScreens).toContain("disabled={deleting}");
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

  it("keeps salary home fixed expense payment recorded through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planApi = mobileSource("src/features/plan/api.ts");

    expect(planApi).toContain("recordFixedExpensePayment");
    expect(planApi).toContain("/pay");
    expect(planApi).toContain("paidAmountMinor");
    expect(cleanScreens).toContain("paySalaryFixedExpense");
    expect(cleanScreens).toContain(".recordFixedExpensePayment(");
    expect(cleanScreens).toContain("setPayingFixedExpenseId");
    expect(cleanScreens).toContain("납부 완료");
  });

  it("prevents duplicate salary home fixed expense payment taps while the server request is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const listRowSource =
      cleanScreens.match(
        /function ListRow\([\s\S]*?function CommunityPostRow/u,
      )?.[0] ?? "";

    expect(listRowSource).toContain("disabled = false");
    expect(listRowSource).toContain("disabled?: boolean");
    expect(listRowSource).toContain("accessibilityState={{ disabled }}");
    expect(listRowSource).toContain("disabled={disabled}");
    expect(cleanScreens).toContain("disabled={payingFixedExpenseId !== null}");
    expect(cleanScreens).toContain("payingFixedExpenseInFlightRef");
    expect(cleanScreens).toContain(
      "if (payingFixedExpenseInFlightRef.current !== null) return",
    );
    expect(cleanScreens).toContain(
      "payingFixedExpenseInFlightRef.current = item.id",
    );
    expect(cleanScreens).toContain(
      "payingFixedExpenseInFlightRef.current = null",
    );
    expect(cleanScreens).toContain(
      'payingFixedExpenseId === item.id ? "납부 기록 중" : undefined',
    );
  });

  it("keeps plan screen fixed expense and savings creation persisted through server APIs", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planApi = mobileSource("src/features/plan/api.ts");

    expect(planApi).toContain("createFixedExpense");
    expect(planApi).toContain("createSavingsGoal");
    expect(cleanScreens).toContain("submitPlanFixedExpense");
    expect(cleanScreens).toContain("submitPlanSavingsGoal");
    expect(cleanScreens).toContain(".createFixedExpense({");
    expect(cleanScreens).toContain(".createSavingsGoal({");
    expect(cleanScreens).toContain("planCommitmentSaveInFlightRef");
    expect(cleanScreens).toContain(
      "if (planCommitmentSaveInFlightRef.current !== null) return",
    );
    expect(cleanScreens).toContain(
      'planCommitmentSaveInFlightRef.current = "fixed"',
    );
    expect(cleanScreens).toContain(
      'planCommitmentSaveInFlightRef.current = "savings"',
    );
    expect(cleanScreens).toContain(
      "planCommitmentSaveInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("setServerFixedExpenses");
    expect(cleanScreens).toContain("setServerSavingsGoals");
  });

  it("keeps plan screen fixed expense and savings deletion persisted through server APIs", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planApi = mobileSource("src/features/plan/api.ts");

    expect(planApi).toContain("deleteFixedExpense");
    expect(planApi).toContain("deleteSavingsGoal");
    expect(cleanScreens).toContain("deletePlanFixedExpense");
    expect(cleanScreens).toContain("deletePlanSavingsGoal");
    expect(cleanScreens).toContain("planCommitmentsApi.deleteFixedExpense");
    expect(cleanScreens).toContain("planCommitmentsApi.deleteSavingsGoal");
    expect(cleanScreens).toContain("planCommitmentDeleteInFlightRef");
    expect(cleanScreens).toContain("!planCommitmentsHydrated");
    expect(cleanScreens).toContain(
      "planCommitmentDeleteInFlightRef.current !== null",
    );
    expect(cleanScreens).toContain(
      "planCommitmentDeleteInFlightRef.current = expenseId",
    );
    expect(cleanScreens).toContain(
      "planCommitmentDeleteInFlightRef.current = goalId",
    );
    expect(cleanScreens).toContain(
      "planCommitmentDeleteInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("setServerFixedExpenses((current) =>");
    expect(cleanScreens).toContain("setServerSavingsGoals((current) =>");
    expect(cleanScreens).toContain("planCommitmentsHydrated");
    expect(cleanScreens).toContain("serverAuthority=true");
    expect(cleanScreens).toContain("rawFinancialDataExposed=false");
  });

  it("keeps plan screen fixed expense and savings updates persisted through server APIs", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planApi = mobileSource("src/features/plan/api.ts");

    expect(planApi).toContain("updateFixedExpense");
    expect(planApi).toContain("updateSavingsGoal");
    expect(cleanScreens).toContain("updatePlanFixedExpense");
    expect(cleanScreens).toContain("planCommitmentsApi.updateFixedExpense");
    expect(cleanScreens).toContain("updatePlanSavingsGoal");
    expect(cleanScreens).toContain("planCommitmentsApi.updateSavingsGoal");
    expect(cleanScreens).toContain("planCommitmentUpdateInFlightRef");
    expect(cleanScreens).toContain("!planCommitmentsHydrated");
    expect(cleanScreens).toContain(
      "planCommitmentUpdateInFlightRef.current !== null",
    );
    expect(cleanScreens).toContain(
      "planCommitmentUpdateInFlightRef.current = `fixed:${item.id}`",
    );
    expect(cleanScreens).toContain(
      "planCommitmentUpdateInFlightRef.current = `savings:${item.id}`",
    );
    expect(cleanScreens).toContain(
      "planCommitmentUpdateInFlightRef.current = null",
    );
  });

  it("keeps plan screen savings deposits recorded through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const savingsGoalActionRow = cleanScreens.slice(
      cleanScreens.indexOf("function SavingsGoalActionRow"),
      cleanScreens.indexOf("function savingsGoalRowFromServer"),
    );
    const planApi = mobileSource("src/features/plan/api.ts");

    expect(planApi).toContain("recordSavingsDeposit");
    expect(planApi).toContain("/deposit");
    expect(planApi).toContain('transactionType: "DEPOSIT"');
    expect(cleanScreens).toContain("recordPlanSavingsDeposit");
    expect(cleanScreens).toContain(".recordSavingsDeposit(");
    expect(cleanScreens).toContain("planSavingsDepositInFlightRef");
    expect(cleanScreens).toContain("!planCommitmentsHydrated");
    expect(cleanScreens).toContain(
      "planSavingsDepositInFlightRef.current !== null",
    );
    expect(cleanScreens).toContain(
      "planSavingsDepositInFlightRef.current = item.id",
    );
    expect(cleanScreens).toContain(
      "planSavingsDepositInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("setDepositingSavingsGoalId");
    expect(cleanScreens).toContain("depositingSavingsGoalId === item.id");
    expect(savingsGoalActionRow).toContain("disabled={updating}");
    expect(savingsGoalActionRow).toContain("disabled={depositing}");
    expect(savingsGoalActionRow).toContain("disabled={deleting}");
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
    expect(cleanScreens).toContain("loginSubmitInFlightRef");
    expect(cleanScreens).toContain(
      "if (!valid || loginSubmitInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("loginSubmitInFlightRef.current = true");
    expect(cleanScreens).toContain("loginSubmitInFlightRef.current = false");
    expect(cleanScreens).toContain("signupSubmitInFlightRef");
    expect(cleanScreens).toContain(
      "if (!valid || signupSubmitInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("signupSubmitInFlightRef.current = true");
    expect(cleanScreens).toContain("signupSubmitInFlightRef.current = false");
    expect(cleanScreens).toContain("AUTHENTICATED");
    expect(cleanScreens).toContain('loginRouter.replace("/salary")');
    expect(cleanScreens).toContain(
      'loginRouter.replace("/(auth)/verify-email")',
    );
    expect(cleanScreens).toContain('loginRouter.replace("/onboarding")');
    expect(cleanScreens).toContain("signupRouter");
    expect(cleanScreens).toContain('signupRouter.replace("/salary")');
    expect(cleanScreens).toContain(
      'signupRouter.replace("/(auth)/verify-email")',
    );
    expect(cleanScreens).toContain('signupRouter.replace("/onboarding")');
    expect(cleanScreens).toContain("MFA_REQUIRED");
    expect(cleanScreens).toContain("서버 인증이 완료됐어요");
    expect(cleanScreens).toContain("가입 요청을 서버에 등록했어요");
    expect(cleanScreens).not.toContain(
      "회원가입 요청을 서버 권위 API로 보낼 준비가 됐어요.",
    );
  });

  it("keeps login screen routed to the signup flow instead of leaving signup as a no-op", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("loginRouter");
    expect(cleanScreens).toContain("openSignup");
    expect(cleanScreens).toContain('loginRouter.push("/(auth)/signup")');
    expect(cleanScreens).toContain('SmallButton label="회원가입"');
    expect(cleanScreens).toContain("onPress={openSignup}");
  });

  it("keeps login screen routed to a server-backed password reset flow", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const forgotRoute = mobileSource("app/(auth)/forgot-password.tsx");

    expect(forgotRoute).toContain("CleanFintechForgotPasswordScreen");
    expect(cleanScreens).toContain("openForgotPassword");
    expect(cleanScreens).toContain(
      'loginRouter.push("/(auth)/forgot-password")',
    );
    expect(cleanScreens).toContain("requestPasswordReset");
    expect(cleanScreens).toContain("forgotPasswordAuthApi");
    expect(cleanScreens).toContain("forgotPasswordSubmitInFlightRef");
    expect(cleanScreens).toContain(
      "if (!valid || forgotPasswordSubmitInFlightRef.current) return",
    );
    expect(cleanScreens).toContain(
      "forgotPasswordSubmitInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "forgotPasswordSubmitInFlightRef.current = false",
    );
    expect(cleanScreens).toContain('SmallButton label="비밀번호 찾기"');
    expect(cleanScreens).toContain("onPress={openForgotPassword}");
  });

  it("keeps login social buttons starting the server OAuth flow instead of no-op buttons", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const authApi = mobileSource("src/features/auth/api.ts");

    expect(authApi).toContain("startOAuth");
    expect(cleanScreens).toContain("SOCIAL_LOGIN_LABELS");
    expect(cleanScreens).toContain("startSocialLogin");
    expect(cleanScreens).toContain("loginAuthApi.startOAuth");
    expect(cleanScreens).toContain("socialLoginSubmitInFlightRef");
    expect(cleanScreens).toContain(
      "if (socialLoginSubmitInFlightRef.current) return",
    );
    expect(cleanScreens).toContain(
      "socialLoginSubmitInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "socialLoginSubmitInFlightRef.current = false",
    );
    expect(cleanScreens).toContain('Linking.createURL("auth/oauth/callback")');
    expect(cleanScreens).toContain("WebBrowser.openAuthSessionAsync");
    expect(cleanScreens).toContain(
      "onPress={() => startSocialLogin(provider)}",
    );
  });

  it("keeps social OAuth callback routed through the server before entering the app", () => {
    const callbackRoute = source("auth/oauth/callback.tsx");
    const authApi = mobileSource("src/features/auth/api.ts");

    expect(authApi).toContain("completeOAuth");
    expect(callbackRoute).toContain("useLocalSearchParams");
    expect(callbackRoute).toContain("createMobileAuthApi");
    expect(callbackRoute).toContain(".completeOAuth({");
    expect(callbackRoute).toContain('router.replace("/salary")');
    expect(callbackRoute).toContain('router.replace("/(auth)/login")');
    expect(callbackRoute).toContain("AUTHENTICATED");
  });

  it("keeps social OAuth callback routed by verified email and onboarding state", () => {
    const callbackRoute = source("auth/oauth/callback.tsx");

    expect(callbackRoute).toContain("routeAuthenticatedOAuthResult");
    expect(callbackRoute).toContain("response.data.user.emailVerified");
    expect(callbackRoute).toContain("response.data.user.onboardingCompleted");
    expect(callbackRoute).toContain('router.replace("/(auth)/verify-email")');
    expect(callbackRoute).toContain('router.replace("/onboarding")');
    expect(
      callbackRoute.indexOf("!response.data.user.emailVerified"),
    ).toBeLessThan(
      callbackRoute.indexOf("!response.data.user.onboardingCompleted"),
    );
    expect(
      callbackRoute.indexOf("!response.data.user.onboardingCompleted"),
    ).toBeLessThan(callbackRoute.indexOf('router.replace("/salary")'));
  });

  it("keeps verify-email screen recoverable with server-side resend instead of a dead end", () => {
    const verifyRoute = source("(auth)/verify-email.tsx");

    expect(verifyRoute).toContain("requestEmailVerification");
    expect(verifyRoute).toContain("/api/v1/auth/verify-email/resend");
    expect(verifyRoute).toContain("resendEmailVerification");
    expect(verifyRoute).toContain("인증 메일 다시 보내기");
    expect(verifyRoute).toContain("메일 주소");
    expect(verifyRoute).toContain("rawPersonalData=false");
    expect(verifyRoute).not.toContain("?대찓");
    expect(verifyRoute).not.toContain("濡쒓렇");
  });

  it("keeps social OAuth callback copy readable and aligned with state routing", () => {
    const callbackRoute = source("auth/oauth/callback.tsx");

    expect(callbackRoute).toContain("소셜 로그인 확인 중");
    expect(callbackRoute).toContain(
      "서버 인증 결과와 계정 상태를 확인한 뒤 다음 화면으로 이동합니다.",
    );
    expect(callbackRoute).not.toMatch(/[?][가-힣]|[가-힣][?]|�/u);
    expect(callbackRoute).not.toContain("급여 홈으로 이동합니다");
    expect(callbackRoute).toContain("routeAuthenticatedOAuthResult");
  });

  it("keeps reset-password screen routed to the server password reset confirm flow", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const resetRoute = mobileSource("app/(auth)/reset-password.tsx");

    expect(resetRoute).toContain("CleanFintechResetPasswordScreen");
    expect(resetRoute).toContain("useLocalSearchParams");
    expect(resetRoute).toContain("token={token}");
    expect(cleanScreens).toContain("confirmPasswordReset");
    expect(cleanScreens).toContain("resetPasswordAuthApi");
    expect(cleanScreens).toContain("submitPasswordResetConfirm");
    expect(cleanScreens).toContain("resetPasswordSubmitInFlightRef");
    expect(cleanScreens).toContain(
      "if (!valid || resetPasswordSubmitInFlightRef.current) return",
    );
    expect(cleanScreens).toContain(
      "resetPasswordSubmitInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "resetPasswordSubmitInFlightRef.current = false",
    );
    expect(cleanScreens).toContain("isServerAuthPasswordCandidate");
    expect(cleanScreens).toContain("AUTH_PASSWORD_POLICY_MESSAGE");
    expect(cleanScreens).toContain(
      "재설정 토큰은 서버 확인에만 사용하고 앱에 저장하지 않습니다",
    );
    expect(cleanScreens).toContain(
      'resetPasswordRouter.replace("/(auth)/login")',
    );
  });

  it("keeps reset-password screen recoverable when the reset token is missing", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("missingResetToken");
    expect(cleanScreens).toContain("재설정 링크가 올바르지 않아요.");
    expect(cleanScreens).toContain(
      "이메일의 최신 비밀번호 재설정 링크로 다시 열어 주세요.",
    );
    expect(cleanScreens).toContain("backToResetLogin");
    expect(cleanScreens).toContain(
      'resetPasswordRouter.replace("/(auth)/login")',
    );
    expect(cleanScreens).toContain('label="로그인으로 돌아가기"');
    expect(cleanScreens).toContain("onPress={backToResetLogin}");
    expect(cleanScreens).not.toContain(
      "server password reset confirm 화면입니다",
    );
  });

  it("keeps signup submit gating aligned with the server auth password policy", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("CleanFintechSignupScreen");
    expect(cleanScreens).toContain("isServerAuthPasswordCandidate(password)");
    expect(cleanScreens).toContain("AUTH_PASSWORD_POLICY_MESSAGE");
    expect(cleanScreens).toContain("signupAuthApi.register");
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

  it("keeps plan screen payroll changes saved through the server payroll API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const payrollApi = mobileSource("src/features/payroll/api.ts");

    expect(payrollApi).toContain("savePlan");
    expect(payrollApi).toContain("PAYROLL_PLAN_PATH");
    expect(cleanScreens).toContain("saveServerPayrollPlan");
    expect(cleanScreens).toContain("payrollApi.savePlan");
    expect(cleanScreens).toContain("payrollPlanSaveInFlightRef");
    expect(cleanScreens).toContain(
      "if (payrollPlanSaveInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("payrollPlanSaveInFlightRef.current = true");
    expect(cleanScreens).toContain(
      "payrollPlanSaveInFlightRef.current = false",
    );
    expect(cleanScreens).toContain("setSavingPayrollPlan");
    expect(cleanScreens).toContain("applyServerPayrollPlan(saved)");
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

  it("restores all notification read states when mark-all-read fails on the server", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const markAllSource =
      cleanScreens.match(
        /const markAllNotificationsRead = useCallback\([\s\S]*?const restoreNotificationOnFailure = useCallback/u,
      )?.[0] ?? "";

    expect(markAllSource).toContain("restoreAllNotificationsReadOnFailure");
    expect(markAllSource).toContain("previousNotifications");
    expect(markAllSource).toContain("previousUnreadCount");
    expect(markAllSource).toContain(".markAllRead()");
  });

  it("prevents duplicate notification read-all mutations while the server request is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const markAllSource =
      cleanScreens.match(
        /const markAllNotificationsRead = useCallback\([\s\S]*?const restoreNotificationOnFailure = useCallback/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("notificationReadAllPending");
    expect(markAllSource).toContain("notificationReadAllInFlightRef");
    expect(markAllSource).toContain(
      "if (notificationReadAllInFlightRef.current || unreadCount <= 0) return",
    );
    expect(markAllSource).toContain(
      "notificationReadAllInFlightRef.current = true",
    );
    expect(markAllSource).toContain(
      "notificationReadAllInFlightRef.current = false",
    );
    expect(markAllSource).toContain("setNotificationReadAllPending(true)");
    expect(markAllSource).toContain("setNotificationReadAllPending(false)");
    expect(cleanScreens).toContain(
      "disabled={notificationReadAllPending || unreadCount <= 0}",
    );
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

  it("restores notification read state when the server mark-read mutation fails", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const markReadSource =
      cleanScreens.match(
        /const markRead = useCallback\([\s\S]*?const openNotification = useCallback/u,
      )?.[0] ?? "";

    expect(markReadSource).toContain("restoreNotificationReadOnFailure");
    expect(markReadSource).toContain("restoreNotificationReadOnFailure(item)");
    expect(markReadSource).toContain(".markRead(item.id)");
  });

  it("prevents duplicate notification mark-read mutations while one row is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const markReadSource =
      cleanScreens.match(
        /const markRead = useCallback\([\s\S]*?const openNotification = useCallback/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("notificationMarkReadInFlightRef");
    expect(markReadSource).toContain(
      "notificationMarkReadInFlightRef.current.has(item.id)",
    );
    expect(markReadSource).toContain(
      "notificationMarkReadInFlightRef.current.add(item.id)",
    );
    expect(markReadSource).toContain(
      "notificationMarkReadInFlightRef.current.delete(item.id)",
    );
  });

  it("keeps notification archive actions persisted through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");
    const notificationsApi = mobileSource("src/features/notifications/api.ts");

    expect(mobileApi).toContain("createMobileNotificationsApi");
    expect(notificationsApi).toContain("archive(");
    expect(notificationsApi).toContain(
      'notificationPath(notificationId, "archive")',
    );
    expect(cleanScreens).toContain("archiveNotification");
    expect(cleanScreens).toContain(".archive(item.id)");
    expect(cleanScreens).toContain(
      "setUnreadCount((current) => Math.max(0, current - 1))",
    );
    expect(cleanScreens).toContain("notificationRowActionPendingId");
    expect(cleanScreens).toContain(
      "setNotificationRowActionPendingId(`archive:${item.id}`)",
    );
    expect(cleanScreens).toContain(
      "notificationRowActionInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("setNotificationRowActionPendingId(null)");
  });

  it("keeps notification delete actions persisted through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationsApi = mobileSource("src/features/notifications/api.ts");

    expect(notificationsApi).toContain("delete(");
    expect(notificationsApi).toContain(
      "notificationResourcePath(notificationId)",
    );
    expect(cleanScreens).toContain("deleteNotification");
    expect(cleanScreens).toContain(".delete(item.id)");
    expect(cleanScreens).toContain(
      "setUnreadCount((current) => Math.max(0, current - 1))",
    );
    expect(cleanScreens).toContain(
      "setNotificationRowActionPendingId(`delete:${item.id}`)",
    );
    expect(cleanScreens).toContain(
      "disabled={notificationRowActionPendingId !== null}",
    );
  });

  it("prevents duplicate notification archive and delete mutations while one row action is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationMutationSource =
      cleanScreens.match(
        /const archiveNotification = useCallback\([\s\S]*?const updateNotificationPreference = useCallback/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("notificationRowActionInFlightRef");
    expect(notificationMutationSource).toContain(
      "if (notificationRowActionInFlightRef.current !== null) return",
    );
    expect(notificationMutationSource).toContain(
      "notificationRowActionInFlightRef.current = `archive:${item.id}`",
    );
    expect(notificationMutationSource).toContain(
      "notificationRowActionInFlightRef.current = `delete:${item.id}`",
    );
    expect(notificationMutationSource).toContain(
      "notificationRowActionInFlightRef.current = null",
    );
  });

  it("restores archived or deleted notifications when the server mutation fails", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationMutationSource =
      cleanScreens.match(
        /const archiveNotification = useCallback\([\s\S]*?const updateNotificationPreference = useCallback/u,
      )?.[0] ?? "";

    expect(notificationMutationSource).toContain(
      "restoreNotificationOnFailure",
    );
    expect(notificationMutationSource).toContain(
      "restoreNotificationOnFailure(item)",
    );
    expect(notificationMutationSource).toContain(
      "restoreUnreadCountOnFailure(item)",
    );
  });

  it("keeps notification preferences loaded and saved through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationsApi = mobileSource("src/features/notifications/api.ts");

    expect(notificationsApi).toContain("getPreferences");
    expect(notificationsApi).toContain("updatePreferences");
    expect(notificationsApi).toContain("NOTIFICATIONS_PREFERENCES_PATH");
    expect(cleanScreens).toContain("serverNotificationPreferences");
    expect(cleanScreens).toContain("updateNotificationPreference");
    expect(cleanScreens).toContain(".getPreferences()");
    expect(cleanScreens).toContain(".updatePreferences({");
    expect(cleanScreens).toContain("notificationPreferencePending");
    expect(cleanScreens).toContain(
      "if (notificationPreferenceInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("setNotificationPreferencePending(true)");
    expect(cleanScreens).toContain("setNotificationPreferencePending(false)");
    expect(cleanScreens).toContain("disabled={notificationPreferencePending}");
  });

  it("prevents duplicate notification preference saves before React state updates", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const preferenceSource =
      cleanScreens.match(
        /const updateNotificationPreference = useCallback\([\s\S]*?const registerNotificationDevice = useCallback/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("notificationPreferenceInFlightRef");
    expect(preferenceSource).toContain(
      "if (notificationPreferenceInFlightRef.current) return",
    );
    expect(preferenceSource).toContain(
      "notificationPreferenceInFlightRef.current = true",
    );
    expect(preferenceSource).toContain(
      "notificationPreferenceInFlightRef.current = false",
    );
  });

  it("keeps notification device registration and revocation wired to the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationsApi = mobileSource("src/features/notifications/api.ts");

    expect(notificationsApi).toContain("listDevices");
    expect(notificationsApi).toContain("registerDevice");
    expect(notificationsApi).toContain("revokeDevice");
    expect(notificationsApi).toContain("NOTIFICATIONS_DEVICES_PATH");
    expect(cleanScreens).toContain("serverNotificationDevices");
    expect(cleanScreens).toContain("registerNotificationDevice");
    expect(cleanScreens).toContain("revokeNotificationDevice");
    expect(cleanScreens).toContain(".registerDevice({");
    expect(cleanScreens).toContain(".revokeDevice(");
    expect(cleanScreens).toContain("notificationDeviceActionPending");
    expect(cleanScreens).toContain(
      'setNotificationDeviceActionPending("register")',
    );
    expect(cleanScreens).toContain(
      'setNotificationDeviceActionPending("revoke")',
    );
    expect(cleanScreens).toContain(
      "notificationDeviceActionInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("setNotificationDeviceActionPending(null)");
    expect(cleanScreens).toContain(
      "disabled={notificationDeviceActionPending !== null}",
    );
  });

  it("prevents duplicate notification device registration and revocation before React state updates", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const deviceSource =
      cleanScreens.match(
        /const registerNotificationDevice = useCallback\([\s\S]*?return \(/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("notificationDeviceActionInFlightRef");
    expect(deviceSource).toContain(
      "if (notificationDeviceActionInFlightRef.current !== null) return",
    );
    expect(deviceSource).toContain(
      'notificationDeviceActionInFlightRef.current = "register"',
    );
    expect(deviceSource).toContain(
      'notificationDeviceActionInFlightRef.current = "revoke"',
    );
    expect(deviceSource).toContain(
      "notificationDeviceActionInFlightRef.current = null",
    );
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

  it("keeps server-backed LV UP mission completion pending until the Growth API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const completeMissionSource =
      cleanScreens.match(
        /const completeMission = useCallback\([\s\S]*?const openMission = useCallback/u,
      )?.[0] ?? "";

    expect(completeMissionSource).toContain("recordTaskProgress");
    expect(completeMissionSource).toContain(
      "markMissionCompleteAfterServerAck",
    );
    expect(completeMissionSource).toContain(
      "revertMissionCompletionOnServerFailure",
    );
    expect(completeMissionSource).not.toMatch(
      /setCompleted\(\(current\) => new Set\(current\)\.add\(mission\.id\)\);\s*if \(!mission\.serverTaskId\)/u,
    );
  });

  it("prevents duplicate server-backed LV UP mission completion before the Growth API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const completeMissionSource =
      cleanScreens.match(
        /const completeMission = useCallback\([\s\S]*?const openMission = useCallback/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("growthMissionCompletionInFlightRef");
    expect(completeMissionSource).toContain(
      "growthMissionCompletionInFlightRef.current.has(mission.id)",
    );
    expect(completeMissionSource).toContain(
      "growthMissionCompletionInFlightRef.current.add(mission.id)",
    );
    expect(completeMissionSource).toContain(
      "growthMissionCompletionInFlightRef.current.delete(mission.id)",
    );
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

  it("prevents duplicate LV UP detail content completion before the Growth API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const completeLevelContentSource =
      cleanScreens.match(
        /const completeLevelContent = useCallback\([\s\S]*?return \(/u,
      )?.[0] ?? "";

    expect(completeLevelContentSource).toContain(
      "levelDetailCompletionInFlightRef",
    );
    expect(completeLevelContentSource).toContain(
      "levelDetailCompletionInFlightRef.current.has(card.contentId)",
    );
    expect(completeLevelContentSource).toContain(
      "levelDetailCompletionInFlightRef.current.add(card.contentId)",
    );
    expect(completeLevelContentSource).toContain(
      "levelDetailCompletionInFlightRef.current.delete(card.contentId)",
    );
    expect(cleanScreens).toContain("submittingContentId === card.contentId");
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

  it("prevents duplicate privacy-sensitive MY actions while one server request is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileSource =
      cleanScreens.match(
        /function ProfileScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechForgotPasswordScreen/u,
      )?.[0] ?? "";
    const smallButtonSource =
      cleanScreens.match(
        /function SmallButton\(\{[\s\S]*?function AdSlot/u,
      )?.[0] ?? "";

    expect(profileSource).toContain("profileActionPending");
    expect(profileSource).toContain("profileActionPending !== null");
    expect(profileSource).toContain("profileActionInFlightRef");
    expect(profileSource).toContain(
      "if (profileActionInFlightRef.current !== null) return",
    );
    expect(profileSource).toContain(
      'profileActionInFlightRef.current = "privacy-export"',
    );
    expect(profileSource).toContain(
      'profileActionInFlightRef.current = "withdrawal"',
    );
    expect(profileSource).toContain(
      'profileActionInFlightRef.current = "logout"',
    );
    expect(profileSource).toContain("profileActionInFlightRef.current = null");
    expect(profileSource).toContain(
      'setProfileActionPending("privacy-export")',
    );
    expect(profileSource).toContain('setProfileActionPending("withdrawal")');
    expect(profileSource).toContain('setProfileActionPending("logout")');
    expect(profileSource).toContain("setProfileActionPending(null)");
    expect(profileSource).toContain("disabled={profileActionPending !== null}");
    expect(smallButtonSource).toContain("disabled = false");
    expect(smallButtonSource).toContain("disabled={disabled}");
  });

  it("keeps MY management menu entries connected to app actions", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("openMyCommunityPosts");
    expect(cleanScreens).toContain('profileRouter.push("/profile/community")');
    expect(cleanScreens).toContain("openMyLevelProgress");
    expect(cleanScreens).toContain('profileRouter.push("/profile/level")');
    expect(cleanScreens).toContain("openProfileNotices");
    expect(cleanScreens).toContain('profileRouter.push("/profile/notices")');
    expect(cleanScreens).toContain("openSupportInquiry");
    expect(cleanScreens).toContain("onPress={openMyCommunityPosts}");
    expect(cleanScreens).toContain("onPress={openMyLevelProgress}");
    expect(cleanScreens).toContain("onPress={openSupportInquiry}");
    expect(cleanScreens).toContain("onPress={openProfileNotices}");
  });

  it("keeps MY level progress routed to a server-backed growth management screen", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const growthApi = mobileSource("src/features/level/api.ts");

    expect(growthApi).toContain("getDashboard");
    expect(growthApi).toContain("listTasks");
    expect(growthApi).toContain("recordTaskProgress");
    expect(cleanScreens).toContain("CleanFintechMyLevelProgressScreen");
    expect(cleanScreens).toContain("myLevelGrowthApi.getDashboard");
    expect(cleanScreens).toContain("myLevelGrowthApi.listTasks");
    expect(cleanScreens).toMatch(/myLevelGrowthApi\s*\.?\s*recordTaskProgress/);
    expect(cleanScreens).toContain('profileRouter.push("/profile/level")');
    expect(cleanScreens).toContain("closeMyLevelProgress");
    expect(cleanScreens).toContain('myLevelRouter.replace("/profile")');
    expect(cleanScreens).toContain("onPress={closeMyLevelProgress}");
    expect(cleanScreens).toContain("serverAuthority=true");
    expect(cleanScreens).toContain("rawFinancialDataExposed=false");
    expect(source("profile/level.tsx")).toContain(
      "<CleanFintechMyLevelProgressScreen />",
    );
  });

  it("prevents duplicate MY level progress mission completion before the Growth API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myLevelSource =
      cleanScreens.match(
        /export function CleanFintechMyLevelProgressScreen\(\): React\.ReactElement \{[\s\S]*?function LevelScreen\(\): React\.ReactElement/u,
      )?.[0] ?? "";

    expect(myLevelSource).toContain("myLevelMissionCompletionInFlightRef");
    expect(myLevelSource).toContain(
      "myLevelMissionCompletionInFlightRef.current.has(mission.id)",
    );
    expect(myLevelSource).toContain(
      "myLevelMissionCompletionInFlightRef.current.add(mission.id)",
    );
    expect(myLevelSource).toContain(
      "myLevelMissionCompletionInFlightRef.current.delete(mission.id)",
    );
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
    expect(cleanScreens).toContain("profileNoticesRouter");
    expect(cleanScreens).toContain("closeProfileNotices");
    expect(cleanScreens).toContain('profileNoticesRouter.replace("/profile")');
    expect(cleanScreens).toContain("onPress={closeProfileNotices}");
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
    expect(cleanScreens).toContain("settingsRouter");
    expect(cleanScreens).toContain("closeSettingsScreen");
    expect(cleanScreens).toContain('settingsRouter.replace("/profile")');
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

  it("prevents duplicate profile settings saves before the profile API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const submitProfileSource =
      cleanScreens.match(
        /const submitProfileSettings = useCallback\(\(\) => \{[\s\S]*?const submitAccountSettings/u,
      )?.[0] ?? "";

    expect(submitProfileSource).toContain("profileSettingsSaveInFlightRef");
    expect(submitProfileSource).toContain(
      "profileSettingsSaveInFlightRef.current",
    );
    expect(submitProfileSource).toContain(
      "profileSettingsSaveInFlightRef.current = true",
    );
    expect(submitProfileSource).toContain(
      "profileSettingsSaveInFlightRef.current = false",
    );
    expect(submitProfileSource).toMatch(
      /profileSettingsApi\s*\.?\s*updateProfile/,
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

  it("prevents duplicate account settings saves before the consent API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const submitAccountSource =
      cleanScreens.match(
        /const submitAccountSettings = useCallback\(\(\) => \{[\s\S]*?return \(/u,
      )?.[0] ?? "";

    expect(submitAccountSource).toContain("accountSettingsSaveInFlightRef");
    expect(submitAccountSource).toContain(
      "accountSettingsSaveInFlightRef.current",
    );
    expect(submitAccountSource).toContain(
      "accountSettingsSaveInFlightRef.current = true",
    );
    expect(submitAccountSource).toContain(
      "accountSettingsSaveInFlightRef.current = false",
    );
    expect(submitAccountSource).toMatch(
      /accountSettingsApi\s*\.?\s*updateAccountSettings/,
    );
  });

  it("keeps settings copy aligned with live server saves instead of deferred deployment wording", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).not.toContain("실제 수정 저장은 배포 API");
    expect(cleanScreens).toContain("설정 저장 운영 기준");
    expect(cleanScreens).toContain("저장은 서버 API에 즉시 요청되며");
    expect(cleanScreens).toContain("실패하면 화면에서 다시 시도");
    expect(cleanScreens).toContain(
      "민감 금융 원문은 설정 저장 payload에 포함하지 않습니다",
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
    expect(cleanScreens).toContain("supportRouter");
    expect(cleanScreens).toContain("supportTicketSubmitInFlightRef");
    expect(cleanScreens).toContain('setSupportCategory("ACCOUNT")');
    expect(cleanScreens).toMatch(/if\s*\(!submitting\)\s*setSupportCategory/u);
    expect(cleanScreens).toContain(
      "supportTicketSubmitInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "supportTicketSubmitInFlightRef.current = false",
    );
    expect(cleanScreens).toContain("closeSupportInquiry");
    expect(cleanScreens).toContain('supportRouter.replace("/profile")');
    expect(cleanScreens).toContain('accessibilityLabel="MY로 돌아가기"');
    expect(source("profile/support.tsx")).toContain(
      "<CleanFintechSupportScreen />",
    );
  });

  it("keeps MY community management routed to a server-backed own posts screen", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const communityService = mobileSource(
      "src/features/community/community.service.ts",
    );

    expect(communityService).toContain("listMyPosts");
    expect(communityService).toContain("listMyComments");
    expect(cleanScreens).toContain("CleanFintechMyCommunityScreen");
    expect(cleanScreens).toContain("myCommunityService.listMyPosts");
    expect(cleanScreens).toContain("myCommunityService.listMyComments");
    expect(cleanScreens).toContain('profileRouter.push("/profile/community")');
    expect(cleanScreens).toContain("closeMyCommunityScreen");
    expect(cleanScreens).toContain('myCommunityRouter.replace("/profile")');
    expect(cleanScreens).toContain("onPress={closeMyCommunityScreen}");
    expect(cleanScreens).toContain("내 게시글 관리");
    expect(cleanScreens).toContain("rawFinancialDataExposed");
    expect(cleanScreens).toContain("adsFinancialTargetingUsed");
    expect(source("profile/community.tsx")).toContain(
      "<CleanFintechMyCommunityScreen />",
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
    const submitSource =
      cleanScreens.match(
        /const submitCommunityPost = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(mobileApi).toContain("createMobileCommunityService");
    expect(cleanScreens).toContain("writeCommunityService");
    expect(cleanScreens).toContain("submitCommunityPost");
    expect(cleanScreens).toContain("publishPost(draft)");
    expect(cleanScreens).toContain('communityBoardApiMap[board] ?? "FREE"');
    expect(cleanScreens).toContain('tags: question ? ["질문"] : []');
    expect(cleanScreens).toContain("communityPostSubmitInFlightRef");
    expect(submitSource).toContain("!valid");
    expect(submitSource).toContain("communityPostSubmitInFlightRef.current");
    expect(cleanScreens).toContain(
      "communityPostSubmitInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "communityPostSubmitInFlightRef.current = false",
    );
    expect(cleanScreens).toContain("setSubmitting(true)");
    expect(cleanScreens).toContain("setSubmitting(false)");
    expect(cleanScreens).toContain('setTitle("")');
    expect(cleanScreens).toContain('setBody("")');
  });

  it("keeps community write success navigating back to the community feed", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const submitSource =
      cleanScreens.match(
        /const submitCommunityPost = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("const writeRouter = useRouter()");
    expect(submitSource).toContain('writeRouter.replace("/community")');
    const successToastIndex = submitSource.indexOf('setToast("게시글이 서버');
    const navigationIndex = submitSource.indexOf(
      'writeRouter.replace("/community")',
    );

    expect(successToastIndex).toBeGreaterThanOrEqual(0);
    expect(navigationIndex).toBeGreaterThan(successToastIndex);
  });

  it("keeps community write close button returning to the community feed", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeScreenSource =
      cleanScreens.match(
        /export function CleanFintechWriteScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechSplashScreen/u,
      )?.[0] ?? "";

    expect(writeScreenSource).toContain(
      "const closeCommunityWrite = useCallback",
    );
    expect(writeScreenSource).toContain('writeRouter.replace("/community")');
    expect(writeScreenSource).toContain("onPress={closeCommunityWrite}");
    expect(writeScreenSource).toContain(
      'accessibilityLabel="커뮤니티 글쓰기 닫기"',
    );
  });

  it("locks community write close while publish or attachment upload is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeScreenSource =
      cleanScreens.match(
        /export function CleanFintechWriteScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechSplashScreen/u,
      )?.[0] ?? "";

    expect(writeScreenSource).toContain(
      "disabled={submitting || uploadingAttachment}",
    );
    expect(writeScreenSource).toMatch(
      /submitting\s*\|\|\s*uploadingAttachment\s*\?\s*styles\.disabled\s*:\s*null/u,
    );
  });

  it("keeps community write drafts restored and cleared through safe local storage", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const submitSource =
      cleanScreens.match(
        /const submitCommunityPost = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("COMMUNITY_WRITE_DRAFT_KEY");
    expect(cleanScreens).toContain("createSecureStoreRuntime");
    expect(cleanScreens).toContain("containsSensitiveCommunityContent");
    expect(cleanScreens).toContain("getItemAsync(COMMUNITY_WRITE_DRAFT_KEY)");
    expect(cleanScreens).toContain("setItemAsync(");
    expect(cleanScreens).toContain(
      "deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY)",
    );
    expect(submitSource).toContain(
      "writeDraftStore.deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY)",
    );
  });

  it("keeps community write attachments connected to native picker and uploads API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");
    const uploadsApi = mobileSource("src/features/uploads/api.ts");

    expect(mobileApi).toContain("createMobileUploadsApi");
    expect(cleanScreens).toContain("DocumentPicker.getDocumentAsync");
    expect(cleanScreens).toContain("createMobileUploadsApi");
    expect(cleanScreens).toContain("pickCommunityAttachment");
    expect(cleanScreens).toContain("directUploadCommunityAttachment");
    expect(cleanScreens).toContain("uploadedCommunityAttachments");
    expect(cleanScreens).toContain("attachUploadedCommunityAttachments");
    expect(cleanScreens).toContain("attachToCommunityPost");
    expect(uploadsApi).toContain("x-upload-purpose");
  });

  it("prevents duplicate community attachment uploads before the uploads API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeScreenSource =
      cleanScreens.match(
        /export function CleanFintechWriteScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechSplashScreen/u,
      )?.[0] ?? "";
    const pickCommunityAttachmentSource =
      cleanScreens.match(
        /const pickCommunityAttachment = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(pickCommunityAttachmentSource).toContain(
      "communityAttachmentUploadInFlightRef",
    );
    expect(pickCommunityAttachmentSource).toContain(
      "communityAttachmentUploadInFlightRef.current",
    );
    expect(pickCommunityAttachmentSource).toContain(
      "communityAttachmentUploadInFlightRef.current = true",
    );
    expect(pickCommunityAttachmentSource).toContain(
      "communityAttachmentUploadInFlightRef.current = false",
    );
    expect(
      pickCommunityAttachmentSource.indexOf("DocumentPicker"),
    ).toBeLessThan(
      pickCommunityAttachmentSource.indexOf("directUploadCommunityAttachment"),
    );
    expect(writeScreenSource).toMatch(
      /<SmallButton\s+disabled=\{uploadingAttachment\s*\|\|\s*submitting\}\s+label="사진"/u,
    );
    expect(writeScreenSource).toMatch(
      /<SmallButton\s+disabled=\{uploadingAttachment\s*\|\|\s*submitting\}\s+label="이미지"/u,
    );
    expect(writeScreenSource).toMatch(
      /<SmallButton\s+disabled=\{uploadingAttachment\s*\|\|\s*submitting\}\s+label="파일"/u,
    );
  });

  it("prevents community post submission while an attachment upload is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeScreenSource =
      cleanScreens.match(
        /export function CleanFintechWriteScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechSplashScreen/u,
      )?.[0] ?? "";
    const submitSource =
      cleanScreens.match(
        /const submitCommunityPost = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(submitSource).toMatch(
      /uploadingAttachment\s*\|\|\s*communityAttachmentUploadInFlightRef\.current/u,
    );
    expect(writeScreenSource).toContain(
      "disabled={!valid || submitting || uploadingAttachment}",
    );
    expect(writeScreenSource).toMatch(
      /!valid\s*\|\|\s*submitting\s*\|\|\s*uploadingAttachment\s*\?\s*styles\.disabled\s*:\s*null/u,
    );
  });

  it("locks community write inputs while post submission is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeScreenSource =
      cleanScreens.match(
        /export function CleanFintechWriteScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechSplashScreen/u,
      )?.[0] ?? "";
    const pillRowSource =
      cleanScreens.match(
        /function PillRow\([\s\S]*?function StatusPill/u,
      )?.[0] ?? "";

    expect(pillRowSource).toContain("disabled?: boolean");
    expect(pillRowSource).toContain("disabled={disabled}");
    expect(writeScreenSource).toContain("<PillRow");
    expect(writeScreenSource).toContain("disabled={submitting}");
    expect(writeScreenSource).toContain("editable={!submitting}");
    expect(writeScreenSource).toMatch(
      /<ToggleRow\s+active=\{question\}\s+disabled=\{submitting\}/u,
    );
    expect(writeScreenSource).toMatch(
      /<ToggleRow\s+active=\{anonymous\}\s+disabled=\{submitting\}/u,
    );
  });

  it("keeps server-created community posts from being reported as failed when attachment linking fails", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const submitSource =
      cleanScreens.match(
        /const submitCommunityPost = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("async (postId: string): Promise<boolean>");
    expect(submitSource).toContain("attachmentsAttached");
    expect(submitSource).toContain(
      "attachUploadedCommunityAttachments(postId)",
    );
    expect(submitSource).toContain("setUploadedCommunityAttachments([])");
    expect(submitSource).toContain("return;");
    expect(submitSource.indexOf("publishPost")).toBeLessThan(
      submitSource.indexOf("attachUploadedCommunityAttachments(postId)"),
    );
    expect(
      submitSource.indexOf("attachUploadedCommunityAttachments(postId)"),
    ).toBeLessThan(submitSource.indexOf("setTitle"));
  });

  it("keeps salary home variable expense receipts connected to native picker and uploads API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const uploadsApi = mobileSource("src/features/uploads/api.ts");

    expect(cleanScreens).toContain("salaryUploadsApi");
    expect(cleanScreens).toContain("pickVariableExpenseReceipt");
    expect(cleanScreens).toContain("directUploadVariableExpenseReceipt");
    expect(cleanScreens).toContain("uploadedExpenseReceipt");
    expect(cleanScreens).toContain(
      "receiptAttachmentId: uploadedExpenseReceipt?.attachmentId ?? null",
    );
    expect(cleanScreens).toContain("attachToVariableExpense");
    expect(cleanScreens).toContain("setUploadedExpenseReceipt(null)");
    expect(uploadsApi).toContain("VARIABLE_EXPENSE_RECEIPT");
    expect(uploadsApi).toContain("VARIABLE_EXPENSE");
  });

  it("prevents duplicate variable expense receipt uploads before the uploads API acknowledges it", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const pickReceiptSource =
      cleanScreens.match(
        /const pickVariableExpenseReceipt = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(pickReceiptSource).toContain("salaryReceiptUploadInFlightRef");
    expect(pickReceiptSource).toContain(
      "salaryReceiptUploadInFlightRef.current",
    );
    expect(pickReceiptSource).toContain(
      "salaryReceiptUploadInFlightRef.current = true",
    );
    expect(pickReceiptSource).toContain(
      "salaryReceiptUploadInFlightRef.current = false",
    );
    expect(pickReceiptSource.indexOf("DocumentPicker")).toBeLessThan(
      pickReceiptSource.indexOf("directUploadVariableExpenseReceipt"),
    );
  });

  it("keeps server-created expenses from falling back to offline preview when receipt attach fails", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const addExpenseSource =
      cleanScreens.match(
        /const handleAddExpense = async \(\): Promise<void> => \{[\s\S]*?const updateSalaryVariableExpense = useCallback/u,
      )?.[0] ?? "";

    expect(addExpenseSource).toContain("attachReceiptToCreatedExpense");
    expect(addExpenseSource).toContain("receiptAttached");
    expect(addExpenseSource).toContain("return;");
    expect(addExpenseSource.indexOf("createVariableExpense")).toBeLessThan(
      addExpenseSource.indexOf("attachReceiptToCreatedExpense"),
    );
    expect(
      addExpenseSource.indexOf("attachReceiptToCreatedExpense"),
    ).toBeLessThan(addExpenseSource.indexOf("setAddedExpenses"));
  });

  it("keeps server-created salary home expenses visible as server rows before refresh can clear offline preview", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const addExpenseSource =
      cleanScreens.match(
        /const handleAddExpense = async \(\): Promise<void> => \{[\s\S]*?const updateSalaryVariableExpense = useCallback/u,
      )?.[0] ?? "";

    expect(addExpenseSource).toContain("setServerVariableExpenses((current)");
    expect(addExpenseSource).toContain(
      "expenseItem.expenseId !== result.expenseId",
    );
    expect(addExpenseSource.indexOf("createVariableExpense")).toBeLessThan(
      addExpenseSource.indexOf("setServerVariableExpenses((current)"),
    );
    expect(
      addExpenseSource.indexOf("setServerVariableExpenses((current)"),
    ).toBeLessThan(addExpenseSource.indexOf("refreshServerBudgetSnapshot"));
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
    expect(cleanScreens).toContain("likePending");
    expect(cleanScreens).toContain("communityLikeInFlightRef");
    expect(cleanScreens).toContain(
      "if (communityLikeInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("communityLikeInFlightRef.current = true");
    expect(cleanScreens).toContain("communityLikeInFlightRef.current = false");
    expect(cleanScreens).toContain("setLikePending(true)");
    expect(cleanScreens).toContain("setLikePending(false)");
    expect(cleanScreens).toContain("disabled={likePending}");
    expect(cleanScreens).toContain("fallbackPostDetail");
    expect(cleanScreens).toContain("rawPersonalDataExposed");
  });

  it("keeps community detail attachments rendered from the server detail payload", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("CommunityAttachmentList");
    expect(cleanScreens).toContain(
      "<CommunityAttachmentList attachments={activeDetail.attachments} />",
    );
  });

  it("keeps community detail chips from rendering no-op buttons", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("commentInputRef");
    expect(cleanScreens).toContain("focusCommunityCommentInput");
    expect(cleanScreens).toContain("ref={commentInputRef}");
    expect(cleanScreens).toContain('label="댓글"');
    expect(cleanScreens).toContain("onPress={focusCommunityCommentInput}");
    const smallButtonSource =
      cleanScreens.match(
        /function SmallButton\(\{[\s\S]*?function AdSlot/u,
      )?.[0] ?? "";

    expect(smallButtonSource).toContain("onPress: () => void;");
    expect(smallButtonSource).toContain("disabled?: boolean;");
    expect(cleanScreens).not.toContain("<SmallButton label={post.stats} />");
    expect(cleanScreens).not.toContain('<SmallButton label="댓글" />');
    expect(smallButtonSource).not.toContain("onPress?: () => void");
  });

  it("keeps community detail comments submitted through the server comment service", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("commentDraft");
    expect(cleanScreens).toContain("commentSubmitting");
    expect(cleanScreens).toContain("communityCommentSubmitInFlightRef");
    expect(cleanScreens).toContain(
      "!commentReady || communityCommentSubmitInFlightRef.current",
    );
    expect(cleanScreens).toContain(
      "communityCommentSubmitInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "communityCommentSubmitInFlightRef.current = false",
    );
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

    expect(cleanScreens).toContain("communityDetailActionPending");
    expect(cleanScreens).toContain("communityDetailMutationInFlightRef");
    expect(cleanScreens).toContain(
      "if (communityDetailMutationInFlightRef.current !== null) return",
    );
    expect(cleanScreens).toContain(
      'setCommunityDetailActionPending("report-post")',
    );
    expect(cleanScreens).toContain(
      'communityDetailMutationInFlightRef.current = "report-post"',
    );
    expect(cleanScreens).toContain(
      'setCommunityDetailActionPending("report-comment")',
    );
    expect(cleanScreens).toContain(
      'communityDetailMutationInFlightRef.current = "report-comment"',
    );
    expect(cleanScreens).toContain(
      "communityDetailMutationInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("setCommunityDetailActionPending(null)");
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

    expect(cleanScreens).toContain(
      'setCommunityDetailActionPending("delete-post")',
    );
    expect(cleanScreens).toContain(
      'communityDetailMutationInFlightRef.current = "delete-post"',
    );
    expect(cleanScreens).toContain(
      'setCommunityDetailActionPending("delete-comment")',
    );
    expect(cleanScreens).toContain(
      'communityDetailMutationInFlightRef.current = "delete-comment"',
    );
    expect(cleanScreens).toContain("setCommunityDetailActionPending(null)");
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
    expect(cleanScreens).toContain("communityPostEditInFlightRef");
    expect(cleanScreens).toContain("communityCommentEditInFlightRef");
    expect(cleanScreens).toContain(
      "!postEditReady || communityPostEditInFlightRef.current",
    );
    expect(cleanScreens).toContain(
      "communityPostEditInFlightRef.current = true",
    );
    expect(cleanScreens).toContain(
      "communityPostEditInFlightRef.current = false",
    );
    expect(cleanScreens).toContain(
      "communityCommentEditInFlightRef.current !== null",
    );
    expect(cleanScreens).toContain(
      "communityCommentEditInFlightRef.current = comment.id",
    );
    expect(cleanScreens).toContain(
      "communityCommentEditInFlightRef.current = null",
    );
    expect(cleanScreens).toContain("disabled={postEditing}");
    expect(cleanScreens).toContain("commentEditingId !== null");
    expect(cleanScreens).toContain("disabled={commentEditingId !== null}");
    expect(cleanScreens).toContain("setServerCommunityDetail((current)");
  });

  it("locks community detail edit inputs while server saves are pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("editable={!postEditing}");
    expect(cleanScreens).toContain("editable={commentEditingId === null}");
  });

  it("keeps community detail share action wired to the native app share sheet", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("Share,");
    expect(cleanScreens).toContain("shareCommunityPost");
    expect(cleanScreens).toContain("Share.share({");
    expect(cleanScreens).toContain("https://salaryhijacking.com/community/");
    expect(cleanScreens).toContain("sharePending");
    expect(cleanScreens).toContain("communityShareInFlightRef");
    expect(cleanScreens).toContain(
      "if (communityShareInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("communityShareInFlightRef.current = true");
    expect(cleanScreens).toContain("communityShareInFlightRef.current = false");
    expect(cleanScreens).toContain("setSharePending(true)");
    expect(cleanScreens).toContain("setSharePending(false)");
    expect(cleanScreens).toContain("disabled={sharePending}");
    expect(cleanScreens).toContain("onPress={shareCommunityPost}");
    expect(cleanScreens).toContain("공유할 수 있는 화면을 열었어요.");
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
