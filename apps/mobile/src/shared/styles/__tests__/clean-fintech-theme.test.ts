/* eslint-disable no-template-curly-in-string */
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

  it("keeps root bootstrap failure toasts free from raw exception messages", () => {
    const rootLayout = source("_layout.tsx");

    expect(rootLayout).toContain("safeBootstrapErrorMessage");
    expect(rootLayout).not.toContain("message: error.message");
    expect(rootLayout).not.toContain("error instanceof Error");
    expect(rootLayout).not.toContain("String(error");
  });

  it("keeps the bottom navigation on the approved five-tab IA", () => {
    const tabs = source("(tabs)/_layout.tsx");

    for (const label of ["급여", "계획", "LV", "커뮤니티", "MY"]) {
      expect(tabs).toContain(label);
    }

    expect(tabs).toContain("급여납치 하단 탭 내비게이션");
    expect(tabs).not.toMatch(/湲됱|怨꾪|而ㅻ|덊떚/u);
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
    expect(cleanScreens).toContain("expenseTitleDraft");
    expect(cleanScreens).toContain('accessibilityLabel="지출 추가 제목"');
    expect(cleanScreens).toContain("title: expenseTitle");
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
    expect(cleanScreens).toContain(
      "accessibilityState={{ disabled: salaryHomeExpenseSubmitDisabled }}",
    );
    expect(cleanScreens).toContain(
      "accessibilityState={{ disabled: savingDailyBudget }}",
    );
  });

  it("keeps salary home expense and daily budget amount drafts sanitized as KRW integers", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const salaryHomeSource =
      cleanScreens.match(
        /function SalaryHomeScreen\(\): React\.ReactElement \{[\s\S]*?function PlanScreen/u,
      )?.[0] ?? "";

    expect(salaryHomeSource).toContain("setSanitizedExpenseDraft");
    expect(salaryHomeSource).toContain("sanitizeKrwIntegerInput(value)");
    expect(salaryHomeSource).toContain(
      "onChangeText={setSanitizedExpenseDraft}",
    );
    expect(salaryHomeSource).not.toContain("onChangeText={setExpenseDraft}");
  });

  it("keeps salary home daily budget draft separate from variable expense drafts", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const salaryHomeSource =
      cleanScreens.match(
        /function SalaryHomeScreen\(\): React\.ReactElement \{[\s\S]*?function PlanScreen/u,
      )?.[0] ?? "";

    expect(salaryHomeSource).toContain("dailyBudgetDraft");
    expect(salaryHomeSource).toContain("setSanitizedDailyBudgetDraft");
    expect(salaryHomeSource).toContain(
      "const dailyBudgetAmount = parseKrwInputAmount(dailyBudgetDraft)",
    );
    expect(salaryHomeSource).toContain("plannedAmountMinor: dailyBudgetAmount");
    expect(salaryHomeSource).toContain('setDailyBudgetDraft("")');
    expect(salaryHomeSource).toContain("salaryHomeDailyBudgetSubmitDisabled");
    expect(salaryHomeSource).toMatch(
      /accessibilityState=\{\{\s*disabled:\s*salaryHomeDailyBudgetSubmitDisabled,\s*\}\}/u,
    );
    expect(salaryHomeSource).toContain(
      "disabled={salaryHomeDailyBudgetSubmitDisabled}",
    );
    expect(salaryHomeSource).toContain(
      "onChangeText={setSanitizedDailyBudgetDraft}",
    );
  });

  it("locks salary home amount input while expense or daily budget save is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const salaryHomeSource =
      cleanScreens.match(
        /function SalaryHomeScreen\(\): React\.ReactElement \{[\s\S]*?function PlanScreen/u,
      )?.[0] ?? "";

    expect(salaryHomeSource).toContain(
      "const salaryHomeAmountPending = savingExpense || savingDailyBudget",
    );
    expect(salaryHomeSource).toContain(
      "accessibilityState={{ disabled: salaryHomeAmountPending }}",
    );
    expect(salaryHomeSource).toContain("editable={!salaryHomeAmountPending}");
  });

  it("disables salary home expense submit until the draft amount is a valid KRW integer", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const salaryHomeSource =
      cleanScreens.match(
        /function SalaryHomeScreen\(\): React\.ReactElement \{[\s\S]*?function NotificationsScreen/u,
      )?.[0] ?? "";

    expect(salaryHomeSource).toContain("salaryHomeExpenseSubmitDisabled");
    expect(salaryHomeSource).toContain(
      "parseKrwInputAmount(expenseDraft) === null",
    );
    expect(salaryHomeSource).toContain(
      "accessibilityState={{ disabled: salaryHomeExpenseSubmitDisabled }}",
    );
    expect(salaryHomeSource).toContain(
      "disabled={salaryHomeExpenseSubmitDisabled}",
    );
    expect(salaryHomeSource).toMatch(
      /salaryHomeExpenseSubmitDisabled\s*\?\s*styles\.disabled\s*:\s*null/u,
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

  it("locks plan fixed expense and savings creation inputs while server save is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(
      planSource.match(/editable=\{!savingPlanCommitment\}/gu) ?? [],
    ).toHaveLength(4);
    expect(
      planSource.match(
        /accessibilityState=\{\{ disabled: savingPlanCommitment \}\}/gu,
      ) ?? [],
    ).toHaveLength(4);
    expect(planSource).toContain("planFixedExpenseSubmitDisabled");
    expect(planSource).toContain("planSavingsGoalSubmitDisabled");
  });

  it("keeps plan commitment creation fields empty until the user types real values", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(planSource).toContain(
      'const [planFixedExpenseTitle, setPlanFixedExpenseTitle] = useState("");',
    );
    expect(planSource).toContain(
      'const [planFixedExpenseAmount, setPlanFixedExpenseAmount] = useState("");',
    );
    expect(planSource).toContain(
      'const [planSavingsGoalTitle, setPlanSavingsGoalTitle] = useState("");',
    );
    expect(planSource).toContain(
      'const [planSavingsGoalAmount, setPlanSavingsGoalAmount] = useState("");',
    );
    expect(planSource).toContain('placeholder="예: OTT 구독"');
    expect(planSource).toContain('placeholder="예: 19000"');
    expect(planSource).toContain('placeholder="예: 비상금"');
    expect(planSource).toContain('placeholder="예: 80000"');
    expect(planSource).not.toContain('useState("새 고정지출")');
    expect(planSource).not.toContain('useState("19000")');
    expect(planSource).not.toContain('useState("새 고정저축")');
    expect(planSource).not.toContain('useState("80000")');
  });

  it("keeps plan screen server-authoritative copy readable in Korean", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    for (const label of [
      "급여 계획 저장",
      "급여 계획",
      "고정지출",
      "서버 고정지출 목록",
      "고정저축",
      "서버 고정저축 목표",
      "생활비",
      "목표금액",
      "저장 중",
      "삭제",
      "수정",
      "매월 25일",
    ]) {
      expect(planSource).toContain(label);
    }

    expect(planSource).not.toMatch(mojibakePattern);
    expect(planSource).not.toMatch(/[�]|[?][가-힣]|[가-힣][?]/u);
  });

  it("keeps plan completion toasts free from internal privacy flags", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    for (const visibleCopy of [
      "급여 계획을 서버 기준으로 저장했어요.",
      "고정지출을 삭제했어요.",
      "고정저축 목표를 삭제했어요.",
      "고정지출을 서버 기준으로 수정했어요.",
      "저축 목표를 서버 기준으로 수정했어요.",
    ]) {
      expect(planSource).toContain(visibleCopy);
    }

    expect(planSource).not.toContain("rawFinancialDataExposed=false");
    expect(planSource).not.toContain("serverAuthority=true");
    expect(planSource).not.toContain("adsFinancialTargetingUsed=false");
  });

  it("keeps plan server-save status pill readable for users", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(planSource).toContain('<StatusPill label="서버 저장" />');
    expect(planSource).not.toContain('<StatusPill label="serverAuthority" />');
  });

  it("disables plan commitment submit buttons until required drafts are valid", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(planSource).toContain("planFixedExpenseDraftReady");
    expect(planSource).toContain("planSavingsGoalDraftReady");
    expect(planSource).toContain("const planFixedExpenseSubmitDisabled =");
    expect(planSource).toContain("const planSavingsGoalSubmitDisabled =");
    expect(planSource).toContain(
      "accessibilityState={{ disabled: planFixedExpenseSubmitDisabled }}",
    );
    expect(planSource).toContain("disabled={planFixedExpenseSubmitDisabled}");
    expect(planSource).toContain(
      "accessibilityState={{ disabled: planSavingsGoalSubmitDisabled }}",
    );
    expect(planSource).toContain("disabled={planSavingsGoalSubmitDisabled}");
  });

  it("blocks sensitive raw plan commitment drafts at the UI boundary", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(planSource).toContain("planFixedExpenseDraftSensitive");
    expect(planSource).toContain("planSavingsGoalDraftSensitive");
    expect(planSource).toMatch(
      /containsSensitiveCommunityContent\(\s*planFixedExpenseTitle,?\s*\)/u,
    );
    expect(planSource).toMatch(
      /containsSensitiveCommunityContent\(\s*planSavingsGoalTitle,?\s*\)/u,
    );
    expect(planSource).toMatch(
      /const planFixedExpenseSubmitDisabled =\s*savingPlanCommitment \|\|\s*!planFixedExpenseDraftReady \|\|\s*planFixedExpenseDraftSensitive;/u,
    );
    expect(planSource).toMatch(
      /const planSavingsGoalSubmitDisabled =\s*savingPlanCommitment \|\|\s*!planSavingsGoalDraftReady \|\|\s*planSavingsGoalDraftSensitive;/u,
    );
  });

  it("blocks sensitive raw plan commitment update drafts before server update", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";
    const updateFixedSource =
      planSource.match(
        /const updatePlanFixedExpense = useCallback\([\s\S]*?const updatePlanSavingsGoal = useCallback/u,
      )?.[0] ?? "";
    const updateSavingsSource =
      planSource.match(
        /const updatePlanSavingsGoal = useCallback\([\s\S]*?const recordPlanSavingsDeposit = useCallback/u,
      )?.[0] ?? "";

    expect(updateFixedSource).toMatch(
      /containsSensitiveCommunityContent\(\s*title,?\s*\)/u,
    );
    expect(updateSavingsSource).toMatch(
      /containsSensitiveCommunityContent\(\s*title,?\s*\)/u,
    );

    const fixedSensitiveIndex = updateFixedSource.indexOf(
      "containsSensitiveCommunityContent",
    );
    const fixedServerIndex = updateFixedSource.indexOf("updateFixedExpense(");
    const fixedReturnAfterSensitiveCheck = updateFixedSource
      .slice(fixedSensitiveIndex, fixedServerIndex)
      .includes("return;");
    expect(fixedSensitiveIndex).toBeGreaterThan(-1);
    expect(fixedServerIndex).toBeGreaterThan(fixedSensitiveIndex);
    expect(fixedReturnAfterSensitiveCheck).toBe(true);

    const savingsSensitiveIndex = updateSavingsSource.indexOf(
      "containsSensitiveCommunityContent",
    );
    const savingsServerIndex =
      updateSavingsSource.indexOf("updateSavingsGoal(");
    const savingsReturnAfterSensitiveCheck = updateSavingsSource
      .slice(savingsSensitiveIndex, savingsServerIndex)
      .includes("return;");
    expect(savingsSensitiveIndex).toBeGreaterThan(-1);
    expect(savingsServerIndex).toBeGreaterThan(savingsSensitiveIndex);
    expect(savingsReturnAfterSensitiveCheck).toBe(true);
  });

  it("keeps plan fixed expense and savings amount drafts sanitized as KRW integers", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("sanitizeKrwIntegerInput");
    expect(planSource).toContain("setSanitizedPlanFixedExpenseAmount");
    expect(planSource).toContain("setSanitizedPlanSavingsGoalAmount");
    expect(planSource).toContain(
      "onChangeText={setSanitizedPlanFixedExpenseAmount}",
    );
    expect(planSource).toContain(
      "onChangeText={setSanitizedPlanSavingsGoalAmount}",
    );
  });

  it("keeps plan payroll summary amount inputs sanitized as KRW integers", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(planSource).toContain("setSanitizedPlanPayrollAmount");
    expect(planSource).toContain("setSanitizedPlanFixedExpenseTotal");
    expect(planSource).toContain("setSanitizedPlanSavingsTarget");
    expect(planSource).toContain("onChange={setSanitizedPlanPayrollAmount}");
    expect(planSource).toContain(
      "onChange={setSanitizedPlanFixedExpenseTotal}",
    );
    expect(planSource).toContain("onChange={setSanitizedPlanSavingsTarget}");
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
    expect(cleanScreens).toContain("고정지출을 삭제했어요.");
    expect(cleanScreens).toContain("고정저축 목표를 삭제했어요.");
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
    expect(cleanScreens).toMatch(
      /if\s*\(\s*!valid\s*\|\|\s*loginSubmitInFlightRef\.current\s*\|\|\s*socialLoginSubmitInFlightRef\.current\s*\)\s*return;/u,
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

  it("locks login and signup auth inputs while server auth requests are pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const signupSource =
      cleanScreens.match(
        /export function CleanFintechSignupScreen[\s\S]*?export function CleanFintechLevelDetailScreen/u,
      )?.[0] ?? "";
    const loginSource =
      cleanScreens.match(
        /function LoginScreen[\s\S]*?function AppScreen/u,
      )?.[0] ?? "";

    expect(loginSource).toMatch(
      /if\s*\(\s*submitting\s*\)\s*return;\s*loginRouter\.push\("\/\(auth\)\/signup"\)/u,
    );
    expect(loginSource).toMatch(
      /if\s*\(\s*submitting\s*\)\s*return;\s*loginRouter\.push\("\/\(auth\)\/forgot-password"\)/u,
    );
    expect(loginSource).toMatch(
      /if\s*\(\s*socialLoginSubmitInFlightRef\.current\s*\|\|\s*loginSubmitInFlightRef\.current\s*\)\s*return;/u,
    );
    expect(loginSource).toMatch(
      /if\s*\(\s*!valid\s*\|\|\s*loginSubmitInFlightRef\.current\s*\|\|\s*socialLoginSubmitInFlightRef\.current\s*\)\s*return;/u,
    );
    expect(loginSource.match(/editable=\{!submitting\}/gu)).toHaveLength(2);
    expect(
      loginSource.match(/accessibilityState=\{\{ disabled: submitting \}\}/gu),
    ).toHaveLength(2);
    expect(loginSource.match(/disabled=\{submitting\}/gu)).toHaveLength(3);
    expect(loginSource).toContain(
      "accessibilityState={{ disabled: !valid || submitting }}",
    );
    expect(signupSource.match(/editable=\{!submitting\}/gu)).toHaveLength(3);
    expect(
      signupSource.match(/accessibilityState=\{\{ disabled: submitting \}\}/gu),
    ).toHaveLength(3);
    expect(signupSource).toContain(
      "accessibilityState={{ disabled: !valid || submitting }}",
    );
    expect(signupSource).toMatch(
      /<ToggleRow\s+active=\{agreed\.has\(label\)\}\s+disabled=\{submitting\}/u,
    );
  });

  it("keeps login screen routed to the signup flow instead of leaving signup as a no-op", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("loginRouter");
    expect(cleanScreens).toContain("openSignup");
    expect(cleanScreens).toContain('loginRouter.push("/(auth)/signup")');
    expect(cleanScreens).toMatch(
      /<SmallButton\s+disabled=\{submitting\}\s+label="회원가입"\s+onPress=\{openSignup\}/u,
    );
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
    expect(cleanScreens).toMatch(
      /<SmallButton\s+disabled=\{submitting\}\s+label="비밀번호 찾기"\s+onPress=\{openForgotPassword\}/u,
    );
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
    expect(cleanScreens).toMatch(
      /if\s*\(\s*socialLoginSubmitInFlightRef\.current\s*\|\|\s*loginSubmitInFlightRef\.current\s*\)\s*return;/u,
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
    expect(cleanScreens).toContain("OAuth 로그인을 시작하는 중입니다.");
    expect(cleanScreens).toContain("OAuth 인증 창을 열었어요.");
    expect(cleanScreens).toContain(
      "OAuth 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(cleanScreens).not.toMatch(
      /OAuth could not start|Please try again later|browser session was opened|server OAuth start request is in progress/u,
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

  it("exposes onboarding completion pending state to assistive technology", () => {
    const onboardingRoute = source("onboarding.tsx");

    expect(onboardingRoute).toContain("completeOnboarding");
    expect(onboardingRoute).toContain("onboardingCompletionInFlightRef");
    expect(
      onboardingRoute.match(/disabled=\{submitting !== null\}/gu),
    ).toHaveLength(2);
    expect(
      onboardingRoute.match(
        /accessibilityState=\{\{\s*disabled: submitting !== null\s*\}\}/gu,
      ) ?? [],
    ).toHaveLength(2);
  });

  it("keeps verify-email screen recoverable with server-side resend instead of a dead end", () => {
    const verifyRoute = source("(auth)/verify-email.tsx");

    expect(verifyRoute).toContain("requestEmailVerification");
    expect(verifyRoute).toContain("/api/v1/auth/verify-email/resend");
    expect(verifyRoute).toContain("resendEmailVerification");
    expect(verifyRoute).toContain("인증 메일 다시 보내기");
    expect(verifyRoute).toContain("메일 주소");
    expect(verifyRoute).toContain(
      "개인정보 원문 없이 서버에서 인증 상태를 확인해요.",
    );
    expect(verifyRoute).not.toContain("rawPersonalData=false");
    expect(verifyRoute).not.toContain("?대찓");
    expect(verifyRoute).not.toContain("濡쒓렇");
  });

  it("locks verify-email resend inputs and login return while resend is pending", () => {
    const verifyRoute = source("(auth)/verify-email.tsx");

    expect(verifyRoute).toContain("resendPending");
    expect(verifyRoute).toContain("resendEmailVerificationInFlightRef");
    expect(verifyRoute).toContain("editable={!resendPending}");
    expect(verifyRoute).toContain(
      "accessibilityState={{ disabled: resendPending }}",
    );
    expect(verifyRoute).toContain(
      "accessibilityState={{ disabled: !canResend }}",
    );
    expect(verifyRoute).toContain(
      "const returnToLogin = (): void => {\n    if (resendPending) return;",
    );
    expect(verifyRoute).toContain("disabled={resendPending}");
    expect(verifyRoute).toContain("onPress={returnToLogin}");
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

  it("locks password recovery inputs and login return while reset requests are pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const forgotSource =
      cleanScreens.match(
        /export function CleanFintechForgotPasswordScreen[\s\S]*?export function CleanFintechResetPasswordScreen/u,
      )?.[0] ?? "";
    const resetSource =
      cleanScreens.match(
        /export function CleanFintechResetPasswordScreen[\s\S]*?function LoginScreen/u,
      )?.[0] ?? "";

    expect(forgotSource).toContain("editable={!submitting}");
    expect(forgotSource).toContain(
      "accessibilityState={{ disabled: submitting }}",
    );
    expect(forgotSource).toMatch(
      /const backToLogin = useCallback\(\(\): void => \{\s*if\s*\(\s*submitting\s*\)\s*return;\s*forgotPasswordRouter\.replace\("\/\(auth\)\/login"\)/u,
    );
    expect(forgotSource).toMatch(
      /<SmallButton\s+disabled=\{submitting\}\s+label="로그인으로 돌아가기"\s+onPress=\{backToLogin\}/u,
    );
    expect(forgotSource).toContain(
      "accessibilityState={{ disabled: !valid || submitting }}",
    );
    expect(resetSource.match(/editable=\{!submitting\}/gu)).toHaveLength(2);
    expect(
      resetSource.match(/accessibilityState=\{\{ disabled: submitting \}\}/gu),
    ).toHaveLength(2);
    expect(resetSource).toMatch(
      /const backToResetLogin = useCallback\(\(\) => \{\s*if\s*\(\s*submitting\s*\)\s*return;\s*resetPasswordRouter\.replace\("\/\(auth\)\/login"\)/u,
    );
    expect(resetSource.match(/disabled=\{submitting\}/gu)).toHaveLength(2);
    expect(resetSource).toContain(
      "accessibilityState={{ disabled: !valid || submitting }}",
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

  it("keeps auth form email gating aligned with the server auth email policy", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("isServerAuthEmailCandidate(email)");
    expect(cleanScreens).not.toContain('email.includes("@")');
    expect(cleanScreens).not.toContain('email.trim().includes("@")');
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

  it("locks plan payroll input cards while payroll plan save is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planInputCardSource =
      cleanScreens.match(
        /function PlanInputCard\([\s\S]*?function PlanSummaryCard/u,
      )?.[0] ?? "";
    const planSource =
      cleanScreens.match(
        /function PlanScreen\(\): React\.ReactElement \{[\s\S]*?function growthTaskIcon/u,
      )?.[0] ?? "";

    expect(planInputCardSource).toContain("disabled = false");
    expect(planInputCardSource).toContain("disabled?: boolean");
    expect(planInputCardSource).toContain("accessibilityState={{ disabled }}");
    expect(planInputCardSource).toContain("editable={!disabled}");
    expect(
      planSource.match(
        /<PlanInputCard[\s\S]*?disabled=\{savingPayrollPlan\}[\s\S]*?\/>/gu,
      ) ?? [],
    ).toHaveLength(3);
    expect(planSource).toContain(
      "accessibilityState={{ disabled: savingPayrollPlan }}",
    );
  });

  it("shows save-pending status copy on locked plan payroll input cards", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const planInputCardSource =
      cleanScreens.match(
        /function PlanInputCard\([\s\S]*?function PlanSummaryCard/u,
      )?.[0] ?? "";

    expect(planInputCardSource).toContain(
      'label={disabled ? "저장 중" : "수정"}',
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

  it("sanitizes notification community post deeplink ids before navigation", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const routeSource =
      cleanScreens.match(
        /function safeNotificationRoute[\s\S]*?function safeProfileActivityRoute/u,
      )?.[0] ?? "";

    expect(routeSource).toMatch(
      /\^\\\/community\\\/\(\[A-Za-z0-9_-\]\{3,160\}\)\$/u,
    );
    expect(routeSource).toMatch(
      /containsSensitiveCommunityContent\(communityPostMatch\[1\]\)/u,
    );
    expect(routeSource).not.toContain("[A-Za-z0-9_-]{1,80}");
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

  it("locks notification row navigation while archive or delete is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const openNotificationSource =
      cleanScreens.match(
        /const openNotification = useCallback\([\s\S]*?const restoreAllNotificationsReadOnFailure = useCallback/u,
      )?.[0] ?? "";
    const disabledRowCount = (
      cleanScreens.match(
        /disabled=\{\s*notificationRowActionPendingId !== null(?:\s*\|\|\s*item\.isMandatory)?\s*\}/gu,
      ) ?? []
    ).length;

    expect(openNotificationSource).toContain(
      "if (notificationRowActionPendingId !== null) return",
    );
    expect(disabledRowCount).toBeGreaterThanOrEqual(6);
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
    expect(cleanScreens).toContain("방해 금지");
    expect(cleanScreens).toContain("금융 금액");
    expect(cleanScreens).toContain("기반 알림 타겟팅은 사용하지 않아요.");
    expect(cleanScreens).not.toContain("financial\n            targeting off");
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
    expect(cleanScreens).toContain("사용 중");
    expect(cleanScreens).toContain(
      "푸시 토큰 원문 없이 해시 기준으로만 관리해요.",
    );
    expect(cleanScreens).not.toContain("pushTokenHashOnly=");
  });

  it("keeps notification unread count status pill localized", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationsSource =
      cleanScreens.match(
        /function NotificationsScreen\(\): React\.ReactElement \{[\s\S]*?function CommunityScreen/u,
      )?.[0] ?? "";

    expect(notificationsSource).toContain("label={`안 읽음 ${unreadCount}`}");
    expect(notificationsSource).not.toContain(
      "label={`${unreadCount} unread`}",
    );
  });

  it("keeps notification archive and delete row actions localized", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationsSource =
      cleanScreens.match(
        /function NotificationsScreen\(\): React\.ReactElement \{[\s\S]*?function CommunityScreen/u,
      )?.[0] ?? "";

    expect(notificationsSource).toContain('? "보관 중"');
    expect(notificationsSource).toContain(': "보관"');
    expect(notificationsSource).toContain('? "삭제 중"');
    expect(notificationsSource).toContain(': "삭제"');
    expect(notificationsSource).not.toContain('"Archiving"');
    expect(notificationsSource).not.toContain('"Archive"');
    expect(notificationsSource).not.toContain('"Deleting"');
    expect(notificationsSource).not.toContain('"Delete"');
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

  it("renders LV UP mission completion pending state on the pressed mission card", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("submittingMissionId");
    expect(cleanScreens).toContain("setSubmittingMissionId(mission.id)");
    expect(cleanScreens).toContain("setSubmittingMissionId(null)");
    expect(cleanScreens).toContain(
      "const missionPending = submittingMissionId === mission.id;",
    );
    expect(cleanScreens).toContain(
      "accessibilityState={{ disabled: missionPending }}",
    );
    expect(cleanScreens).toContain("disabled={missionPending}");
    expect(cleanScreens).toContain("missionPending ? styles.disabled : null");
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

  it("disables completed or pending LV UP detail content cards at the UI boundary", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const levelDetailSource =
      cleanScreens.match(
        /export function CleanFintechLevelDetailScreen[\s\S]*?export function CleanFintechSettingsScreen/u,
      )?.[0] ?? "";

    expect(levelDetailSource).toContain("const contentActionLocked");
    expect(levelDetailSource).toMatch(
      /submittingContentId === card\.contentId\s*\|\|\s*completedContentIds\.has\(card\.contentId\)/u,
    );
    expect(levelDetailSource).toContain(
      "accessibilityState={{ disabled: contentActionLocked }}",
    );
    expect(levelDetailSource).toContain("disabled={contentActionLocked}");
    expect(levelDetailSource).toMatch(
      /contentActionLocked\s*\?\s*\[styles\.detailCardRow,\s*styles\.disabled\]\s*:\s*styles\.detailCardRow/u,
    );
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
    expect(cleanScreens).toContain("profileApi.listPrivacyExports");
    expect(cleanScreens).toContain("latestPrivacyExport");
    expect(cleanScreens).toContain("openPrivacyExportDownload");
    expect(cleanScreens).toContain("WebBrowser.openBrowserAsync");
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

  it("keeps MY privacy export download available only for safe ready exports", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileSource =
      cleanScreens.match(
        /function ProfileScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechForgotPasswordScreen/u,
      )?.[0] ?? "";

    expect(profileSource).toContain("profileApi.listPrivacyExports");
    expect(profileSource).toContain("profileApi.getPrivacyExport");
    expect(profileSource).toContain(
      'item.status === "READY" && item.downloadUrl',
    );
    expect(profileSource).toContain("openPrivacyExportDownload");
    expect(profileSource).toContain(
      "const refreshedExport = await profileApi.getPrivacyExport(",
    );
    expect(profileSource).toContain(
      "await WebBrowser.openBrowserAsync(refreshedExport.downloadUrl)",
    );
    expect(profileSource).toContain(
      'profileActionInFlightRef.current = "privacy-export-download"',
    );
    expect(profileSource).not.toContain("export://");
    expect(profileSource).not.toContain("rawReason");
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

  it("exposes disabled accessibility state for shared small buttons", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const smallButtonSource =
      cleanScreens.match(
        /function SmallButton\(\{[\s\S]*?function AdSlot/u,
      )?.[0] ?? "";

    expect(smallButtonSource).toContain("accessibilityState={{ disabled }}");
    expect(smallButtonSource).toContain("disabled={disabled}");
  });

  it("opens ad slots through a fixed contextual partner URL without financial payloads", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mobileApi = mobileSource("src/shared/api/mobile-api.ts");
    const adSlotLink = mobileSource("src/shared/styles/ad-slot-link.ts");
    const adSlotSource =
      cleanScreens.match(
        /function AdSlot\(\): React\.ReactElement \{[\s\S]*?function Toast/u,
      )?.[0] ?? "";

    expect(mobileApi).toContain("createMobilePublicConfigApi");
    expect(adSlotLink).toContain("createMobilePublicConfigApi");
    expect(adSlotLink).toContain("partnerBenefitsUrlInFlight");
    expect(adSlotLink).toContain("cachedPartnerBenefitsUrl");
    expect(cleanScreens).toContain("loadPartnerBenefitsUrl");
    expect(cleanScreens).toContain("SALARY_HIJACKING_PARTNER_BENEFITS_URL");
    expect(adSlotSource).toContain("loadPartnerBenefitsUrl");
    expect(adSlotSource).toContain("setPartnerBenefitsUrl");
    expect(adSlotSource).toContain('accessibilityRole="link"');
    expect(adSlotSource).toContain("WebBrowser.openBrowserAsync");
    expect(adSlotSource).toContain("SALARY_HIJACKING_PARTNER_BENEFITS_URL");
    expect(adSlotSource).toContain("문맥형 광고로만 보여드려요.");
    expect(adSlotSource).toContain("금융 금액으로 맞춤 타겟팅하지 않아요.");
    expect(adSlotSource).not.toContain("contextual-only");
    expect(adSlotSource).not.toContain("salaryAmount");
    expect(adSlotSource).not.toContain("expenseAmount");
    expect(adSlotSource).not.toContain("savingsAmount");
    expect(adSlotSource).not.toContain("hijackAmount");
  });

  it("exposes disabled accessibility state for shared toggle rows", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const toggleRowSource =
      cleanScreens.match(
        /function ToggleRow\(\{[\s\S]*?function SmallButton/u,
      )?.[0] ?? "";

    expect(toggleRowSource).toContain(
      "accessibilityState={{ checked: active, disabled }}",
    );
    expect(toggleRowSource).toContain("disabled={disabled}");
  });

  it("locks MY navigation while a privacy-sensitive profile action is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileSource =
      cleanScreens.match(
        /function ProfileScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechForgotPasswordScreen/u,
      )?.[0] ?? "";

    for (const handler of [
      "openMyCommunityPosts",
      "openMyLevelProgress",
      "openSupportInquiry",
      "openProfileNotices",
      "openProfileSettings",
      "openAccountSettings",
    ]) {
      expect(profileSource).toContain(`const ${handler} = useCallback(() => {
    if (profileActionPending !== null) return;`);
    }

    expect(
      profileSource.match(/disabled=\{profileActionPending !== null\}/gu) ?? [],
    ).toHaveLength(10);
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
    expect(cleanScreens).toContain("서버 기준으로 최신 현황을 확인했어요.");
    expect(cleanScreens).toContain("안전한 성장 루틴");
    expect(source("profile/level.tsx")).toContain(
      "<CleanFintechMyLevelProgressScreen />",
    );
  });

  it("keeps MY level progress visible copy free from internal privacy flags", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myLevelSource =
      cleanScreens.match(
        /export function CleanFintechMyLevelProgressScreen\(\): React\.ReactElement \{[\s\S]*?function LevelScreen\(\): React\.ReactElement/u,
      )?.[0] ?? "";

    expect(myLevelSource).toContain("서버 기준으로 최신 현황을 확인했어요.");
    expect(myLevelSource).toContain("안전한 성장 루틴");
    expect(myLevelSource).toContain("완료된 성장 루틴");
    expect(myLevelSource).not.toContain("rawFinancialDataExposed=false");
    expect(myLevelSource).not.toContain("serverAuthority=true");
    expect(myLevelSource).not.toContain("adsFinancialTargetingUsed=false");
    expect(myLevelSource).not.toContain(
      "label={`${activeMissions.length} active`}",
    );
    expect(myLevelSource).not.toContain(
      "label={`${completedMissions.length} completed`}",
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

  it("renders MY level progress mission pending state on the pressed mission row", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myLevelSource =
      cleanScreens.match(
        /export function CleanFintechMyLevelProgressScreen\(\): React\.ReactElement \{[\s\S]*?function LevelScreen\(\): React\.ReactElement/u,
      )?.[0] ?? "";

    expect(myLevelSource).toContain("myLevelSubmittingMissionId");
    expect(myLevelSource).toContain(
      "setMyLevelSubmittingMissionId(mission.id)",
    );
    expect(myLevelSource).toContain("setMyLevelSubmittingMissionId(null)");
    expect(myLevelSource).toContain(
      "const missionPending = myLevelSubmittingMissionId === mission.id;",
    );
    expect(myLevelSource).toContain("disabled={missionPending}");
  });

  it("locks MY level progress close navigation while mission completion is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myLevelSource =
      cleanScreens.match(
        /export function CleanFintechMyLevelProgressScreen\(\): React\.ReactElement \{[\s\S]*?function LevelScreen\(\): React\.ReactElement/u,
      )?.[0] ?? "";

    expect(myLevelSource).toContain(
      "if (myLevelSubmittingMissionId !== null) return;",
    );
    expect(myLevelSource).toMatch(
      /<SmallButton\s+disabled=\{myLevelSubmittingMissionId !== null\}\s+label="MY로 돌아가기"\s+onPress=\{closeMyLevelProgress\}/u,
    );
  });

  it("locks MY level completed mission navigation while mission completion is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myLevelSource =
      cleanScreens.match(
        /export function CleanFintechMyLevelProgressScreen\(\): React\.ReactElement \{[\s\S]*?function LevelScreen\(\): React\.ReactElement/u,
      )?.[0] ?? "";

    expect(myLevelSource).toMatch(
      /completedMissions\.map\(\(mission\) => \(\s*<ListRow\s+disabled=\{myLevelSubmittingMissionId !== null\}/u,
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
    expect(cleanScreens).toContain("safeProfileActivityRoute");
    expect(cleanScreens).toContain("openProfileActivity");
    expect(cleanScreens).toContain("profileNoticesRouter.push(route)");
    expect(cleanScreens).toContain(
      "onPress={() => openProfileActivity(activity)}",
    );
    expect(source("profile/notices.tsx")).toContain(
      "<CleanFintechProfileNoticesScreen />",
    );
  });

  it("keeps MY notices visible activity rows free from internal privacy flags", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileNoticesSource =
      cleanScreens.match(
        /export function CleanFintechProfileNoticesScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechSupportScreen/u,
      )?.[0] ?? "";

    expect(profileNoticesSource).toContain(
      "서버 공지사항을 개인정보 보호 기준으로 동기화했어요.",
    );
    expect(profileNoticesSource).toContain(
      "meta={`${activity.description} · ${formatNoticeDate(activity.createdAt)}`}",
    );
    expect(profileNoticesSource).not.toContain("rawFinancialDataExposed=");
    expect(profileNoticesSource).not.toContain("adsFinancialTargetingUsed=");
  });

  it("sanitizes MY profile activity community route ids before navigation", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const routeSource =
      cleanScreens.match(
        /function safeProfileActivityRoute[\s\S]*?function isImportantNotification/u,
      )?.[0] ?? "";

    expect(routeSource).toMatch(
      /\^\\\/community\\\/\(\[A-Za-z0-9_-\]\{3,160\}\)\$/u,
    );
    expect(routeSource).toMatch(
      /containsSensitiveCommunityContent\(communityPostMatch\[1\]\)/u,
    );
    expect(routeSource).not.toContain("[A-Za-z0-9_-]{1,80}");
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
    const profileSettingsSource =
      cleanScreens.match(
        /const submitProfileSettings = useCallback\([\s\S]*?const submitAccountSettings = useCallback/u,
      )?.[0] ?? "";

    expect(profileApi).toContain("updateProfile");
    expect(cleanScreens).toMatch(/profileSettingsApi\s*\.?\s*updateProfile/);
    expect(cleanScreens).toContain("profileNickname");
    expect(cleanScreens).toContain("profileDisplayBio");
    expect(cleanScreens).toContain("profileOccupationCategory");
    expect(cleanScreens).toContain("submitProfileSettings");
    expect(profileSettingsSource).toContain(
      "프로필 설정을 서버 기준으로 저장했어요.",
    );
    expect(profileSettingsSource).not.toContain(
      "rawFinancialDataExposed=false",
    );
    expect(profileSettingsSource).not.toContain("adsFinancialTargetingUsed=");
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

  it("blocks profile settings submission when profile fields contain sensitive raw content", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const submitProfileSource =
      cleanScreens.match(
        /const submitProfileSettings = useCallback\(\(\) => \{[\s\S]*?const submitAccountSettings/u,
      )?.[0] ?? "";

    expect(submitProfileSource).toContain("containsSensitiveCommunityContent");
    expect(submitProfileSource).toMatch(
      /containsSensitiveCommunityContent\(\s*`\$\{profileNickname\}\\n\$\{profileDisplayBio\}\\n\$\{profileOccupationCategory\}`,\s*\)/u,
    );
    expect(submitProfileSource).toContain(
      "프로필에는 급여, 지출, 계좌, 카드, 연락처, 토큰 같은 민감 원문을 넣을 수 없어요.",
    );

    const sensitiveCheckIndex = submitProfileSource.indexOf(
      "containsSensitiveCommunityContent",
    );
    const serverSubmitIndex = submitProfileSource.indexOf("updateProfile");
    const returnAfterSensitiveCheck = submitProfileSource
      .slice(sensitiveCheckIndex, serverSubmitIndex)
      .includes("return;");

    expect(sensitiveCheckIndex).toBeGreaterThan(-1);
    expect(serverSubmitIndex).toBeGreaterThan(sensitiveCheckIndex);
    expect(returnAfterSensitiveCheck).toBe(true);
  });

  it("locks profile settings inputs while the server profile save is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const profileSettingsSource =
      cleanScreens.match(
        /kind === "profile" \? \([\s\S]*?\{kind === "account" \? \(/u,
      )?.[0] ?? "";

    expect(profileSettingsSource).toContain("profileSettingsSaving");
    expect(
      profileSettingsSource.match(/editable=\{!profileSettingsSaving\}/gu),
    ).toHaveLength(3);
    expect(
      profileSettingsSource.match(
        /accessibilityState=\{\{ disabled: profileSettingsSaving \}\}/gu,
      ),
    ).toHaveLength(3);
    expect(profileSettingsSource).toContain(
      "disabled={!profileSettingsValid || profileSettingsSaving}",
    );
    expect(profileSettingsSource).toMatch(
      /accessibilityState=\{\{\s*disabled:\s*!profileSettingsValid \|\| profileSettingsSaving,\s*\}\}/u,
    );
    expect(profileSettingsSource).toMatch(
      /!profileSettingsValid \|\| profileSettingsSaving\s*\?\s*styles\.disabled\s*:\s*null/u,
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
    expect(cleanScreens).toContain("계정 동의 저장 완료");
    expect(cleanScreens).toContain(
      "금융 원문 없이 광고·제휴 동의를 분리해 저장했어요.",
    );
    expect(cleanScreens).not.toContain(
      "sensitiveFinancialTargetingAccepted=false",
    );
    expect(cleanScreens).not.toContain("adPartnerFinancialRawDataUsed=");
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

  it("locks account settings toggles while the server consent save is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const accountSettingsStart = cleanScreens.indexOf('kind === "account" ? (');
    const accountSettingsEnd = cleanScreens.indexOf(
      "<Text style={styles.sectionTitle}>설정 항목",
      accountSettingsStart,
    );
    const accountSettingsSource = cleanScreens.slice(
      accountSettingsStart,
      accountSettingsEnd,
    );

    expect(accountSettingsSource).toContain("accountSettingsSaving");
    expect(
      accountSettingsSource.match(/disabled=\{accountSettingsSaving\}/gu),
    ).toHaveLength(5);
    expect(
      accountSettingsSource.match(/if \(accountSettingsSaving\) return;/gu),
    ).toHaveLength(4);
    expect(accountSettingsSource).toContain(
      "accountSettingsSaving ? styles.disabled : null",
    );
    expect(accountSettingsSource).toContain(
      "accessibilityState={{ disabled: accountSettingsSaving }}",
    );
  });

  it("locks settings close navigation while profile or account save is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const settingsSource =
      cleanScreens.match(
        /export function CleanFintechSettingsScreen[\s\S]*?export function CleanFintechSupportScreen/u,
      )?.[0] ?? "";

    expect(settingsSource).toContain("settingsSavePending");
    expect(settingsSource).toContain(
      "profileSettingsSaving || accountSettingsSaving",
    );
    expect(settingsSource).toContain("if (settingsSavePending) return");
    expect(settingsSource).toContain(
      '<SmallButton\n          disabled={settingsSavePending}\n          label="MY로 돌아가기"\n          onPress={closeSettingsScreen}\n        />',
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
    expect(cleanScreens).toContain("급여, 지출, 계좌,");
    expect(cleanScreens).toContain("카드,");
    expect(cleanScreens).toContain(
      "토큰 같은 민감 정보는 제외하고 접수합니다.",
    );
    expect(cleanScreens).not.toContain(
      "rawFinancialData=false ·\n              rawPersonalData=false",
    );
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

  it("locks MY support inquiry inputs and close while the server ticket submit is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const supportSource =
      cleanScreens.match(
        /export function CleanFintechSupportScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechMyCommunityScreen/u,
      )?.[0] ?? "";

    expect(supportSource).toContain("submitting");
    expect(supportSource).toContain("disabled={submitting}");
    expect(supportSource).toMatch(
      /styles\.iconButton,\s*submitting\s*\?\s*styles\.disabled\s*:\s*null/u,
    );
    expect(supportSource.match(/editable=\{!submitting\}/gu)).toHaveLength(2);
    expect(
      supportSource.match(
        /accessibilityState=\{\{ disabled: submitting \}\}/gu,
      ),
    ).toHaveLength(3);
    expect(supportSource).toContain(
      "accessibilityState={{ disabled: !valid || submitting }}",
    );
    expect(supportSource).toMatch(/if\s*\(submitting\)\s*return;/u);
  });

  it("locks MY support inquiry category pills while the server ticket submit is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const supportSource =
      cleanScreens.match(
        /export function CleanFintechSupportScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechMyCommunityScreen/u,
      )?.[0] ?? "";

    expect(supportSource).toMatch(
      /<PillRow[\s\S]*?disabled=\{submitting\}[\s\S]*?items=\{\["ACCOUNT", "PAYMENT", "PRIVACY", "BUG", "OTHER"\]\}/u,
    );
  });

  it("blocks MY support inquiry submission when the draft contains sensitive raw content", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const supportSource =
      cleanScreens.match(
        /export function CleanFintechSupportScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechMyCommunityScreen/u,
      )?.[0] ?? "";

    expect(supportSource).toContain("containsSensitiveCommunityContent");
    expect(supportSource).toContain(
      "containsSensitiveCommunityContent(`${supportSubject}\\n${supportMessage}`)",
    );
    expect(supportSource).toContain(
      "문의에는 급여, 지출, 계좌, 카드, 연락처, 토큰 같은 민감 원문을 넣을 수 없어요.",
    );
    const sensitiveCheckIndex = supportSource.indexOf(
      "containsSensitiveCommunityContent(`${supportSubject}\\n${supportMessage}`)",
    );
    const serverSubmitIndex = supportSource.indexOf("createSupportTicket");
    const returnAfterSensitiveCheck = supportSource
      .slice(sensitiveCheckIndex, serverSubmitIndex)
      .includes("return;");

    expect(sensitiveCheckIndex).toBeGreaterThan(-1);
    expect(serverSubmitIndex).toBeGreaterThan(sensitiveCheckIndex);
    expect(returnAfterSensitiveCheck).toBe(true);
  });

  it("exposes disabled accessibility state for shared pill rows", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const pillRowSource =
      cleanScreens.match(
        /function PillRow\([\s\S]*?function StatusPill/u,
      )?.[0] ?? "";

    expect(pillRowSource).toContain(
      "accessibilityState={{ disabled, selected: item === selected }}",
    );
    expect(pillRowSource).toContain("disabled={disabled}");
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

  it("keeps MY community management deletions persisted through the server API", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myCommunitySource =
      cleanScreens.match(
        /export function CleanFintechMyCommunityScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechPostDetailScreen/u,
      )?.[0] ?? "";

    expect(myCommunitySource).toContain("myCommunityActionPending");
    expect(myCommunitySource).toContain("myCommunityActionInFlightRef");
    expect(myCommunitySource).toContain("deleteMyCommunityPost");
    expect(myCommunitySource).toContain("deleteMyCommunityComment");
    expect(myCommunitySource).toContain(".deletePost(post.id)");
    expect(myCommunitySource).toContain(".deleteComment(comment.id)");
    expect(myCommunitySource).toMatch(
      /setMyCommunityPosts\(\(current\)\s*=>\s*current\.filter/u,
    );
    expect(myCommunitySource).toMatch(
      /setMyCommunityComments\(\(current\)\s*=>\s*current\.filter/u,
    );
    expect(myCommunitySource).toContain(
      "myCommunityActionInFlightRef.current = `post:${post.id}`",
    );
    expect(myCommunitySource).toContain(
      "myCommunityActionInFlightRef.current = `comment:${comment.id}`",
    );
    expect(myCommunitySource).toContain(
      "disabled={myCommunityActionPending !== null}",
    );
  });

  it("keeps MY community comment rows free from internal privacy flags", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myCommunitySource =
      cleanScreens.match(
        /export function CleanFintechMyCommunityScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechPostDetailScreen/u,
      )?.[0] ?? "";

    expect(myCommunitySource).toContain(
      "meta={formatNoticeDate(comment.createdAt)}",
    );
    expect(myCommunitySource).not.toContain("rawFinancialDataExposed=");
  });

  it("keeps MY community count status pills localized", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myCommunitySource =
      cleanScreens.match(
        /export function CleanFintechMyCommunityScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechPostDetailScreen/u,
      )?.[0] ?? "";

    expect(myCommunitySource).toContain(
      "label={`게시글 ${myCommunityPosts.length}`}",
    );
    expect(myCommunitySource).toContain(
      "label={`댓글 ${myCommunityComments.length}`}",
    );
    expect(myCommunitySource).not.toContain(
      "label={`${myCommunityPosts.length} posts`}",
    );
    expect(myCommunitySource).not.toContain(
      "label={`${myCommunityComments.length} comments`}",
    );
  });

  it("locks MY community management close while delete is pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myCommunitySource =
      cleanScreens.match(
        /export function CleanFintechMyCommunityScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechPostDetailScreen/u,
      )?.[0] ?? "";

    expect(myCommunitySource).toContain(
      "if (myCommunityActionPending !== null) return",
    );
    expect(myCommunitySource).toContain(
      '<SmallButton\n        disabled={myCommunityActionPending !== null}\n        label="MY로 돌아가기"\n        onPress={closeMyCommunityScreen}\n      />',
    );
  });

  it("keeps MY community management navigation behind safe community route IDs", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const myCommunitySource =
      cleanScreens.match(
        /export function CleanFintechMyCommunityScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechPostDetailScreen/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("function safeCommunityPostDetailRoute");
    expect(myCommunitySource).toContain(
      "const route = safeCommunityPostDetailRoute(post.id)",
    );
    expect(myCommunitySource).toContain(
      "const route = safeCommunityPostDetailRoute(comment.postId)",
    );
    expect(myCommunitySource).not.toContain(
      "myCommunityRouter.push(`/community/${post.id}`)",
    );
    expect(myCommunitySource).not.toContain(
      "myCommunityRouter.push(`/community/${comment.postId}`)",
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

  it("exposes a descriptive accessibility label for community post rows", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const communityPostRowSource =
      cleanScreens.match(
        /function CommunityPostRow\([\s\S]*?function PillRow/u,
      )?.[0] ?? "";

    expect(communityPostRowSource).toContain('accessibilityRole="button"');
    expect(communityPostRowSource).toContain(
      "accessibilityLabel={`${post.board} ${post.title} ${post.stats}`}",
    );
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
    const communityScreenSource =
      cleanScreens.match(
        /function CommunityScreen\(\): React\.ReactElement \{[\s\S]*?function CommunityPostRow/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("openCommunityPost");
    expect(cleanScreens).toContain("function safeCommunityPostDetailRoute");
    expect(communityScreenSource).toContain(
      "const route = safeCommunityPostDetailRoute(post.id)",
    );
    expect(communityScreenSource).not.toContain(
      "communityRouter.push(`/community/${post.id}`)",
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
    expect(writeScreenSource).toContain(
      "accessibilityState={{ disabled: submitting || uploadingAttachment }}",
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

  it("derives safe attachment filenames when native picker omits asset names", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeSource =
      cleanScreens.match(
        /const pickCommunityAttachment = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";
    const receiptSource =
      cleanScreens.match(
        /const pickVariableExpenseReceipt = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("function uploadFileName(");
    expect(cleanScreens).toContain('"image/jpeg": "jpg"');
    expect(cleanScreens).toContain('"application/pdf": "pdf"');
    expect(writeSource).toMatch(
      /fileName:\s*uploadFileName\(\s*asset\.name,\s*contentType,\s*"community-attachment",\s*\)/u,
    );
    expect(receiptSource).toMatch(
      /fileName:\s*uploadFileName\(\s*asset\.name,\s*contentType,\s*"variable-expense-receipt",\s*\)/u,
    );
    expect(writeSource).not.toContain('asset.name || "community-attachment"');
    expect(receiptSource).not.toContain(
      'asset.name || "variable-expense-receipt"',
    );
  });

  it("derives upload content types from picker file extensions when mime metadata is generic", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const writeSource =
      cleanScreens.match(
        /const pickCommunityAttachment = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";
    const receiptSource =
      cleanScreens.match(
        /const pickVariableExpenseReceipt = useCallback\(\(\) => \{[\s\S]*?\}, \[/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("const UPLOAD_CONTENT_TYPE_BY_EXTENSION");
    expect(cleanScreens).toMatch(/jpeg:\s*"image\/jpeg"/u);
    expect(cleanScreens).toContain("function uploadContentType(");
    expect(writeSource).toMatch(
      /uploadContentType\(\s*asset\.mimeType,\s*response\.headers\.get/u,
    );
    expect(receiptSource).toMatch(
      /uploadContentType\(\s*asset\.mimeType,\s*response\.headers\.get/u,
    );
    expect(writeSource).toMatch(/asset\.name\s*\?\?\s*asset\.uri/u);
    expect(receiptSource).toMatch(/asset\.name\s*\?\?\s*asset\.uri/u);
    expect(writeSource).not.toContain('"application/octet-stream"');
    expect(receiptSource).not.toContain('"application/octet-stream"');
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
    expect(writeScreenSource).toMatch(
      /accessibilityState=\{\{\s*disabled:\s*!valid \|\| submitting \|\| uploadingAttachment,\s*\}\}/u,
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
    expect(
      writeScreenSource.match(
        /accessibilityState=\{\{ disabled: submitting \}\}/gu,
      ),
    ).toHaveLength(2);
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

  it("drops unsafe community feed items without discarding the whole server feed", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const mapperSource =
      cleanScreens.match(
        /function toCommunityScreenPost\([\s\S]*?function popularCommunityPosts/u,
      )?.[0] ?? "";

    expect(mapperSource).toMatch(
      /function toCommunityScreenPost\(\s*post: CommunityPost,\s*\): CommunityScreenPost \| null/u,
    );
    expect(mapperSource).toContain("return null");
    expect(mapperSource).toContain("serverCommunityFeed.items.flatMap");
    expect(mapperSource).toContain(
      "const screenPost = toCommunityScreenPost(post)",
    );
    expect(mapperSource).not.toContain(
      'throw new Error("unsafe community post payload")',
    );
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

  it("shows live server upload copy for salary home receipt pending state", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("uploadingExpenseReceipt");
    expect(cleanScreens).toContain("영수증 서버 업로드 중");
    expect(cleanScreens).not.toContain("영수증 업로드 준비 중");
    expect(cleanScreens).not.toContain("영수증 업로드를 준비하지 못했어요");
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
      "if (communityDetailActionBusy || communityLikeInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("communityLikeInFlightRef.current = true");
    expect(cleanScreens).toContain("communityLikeInFlightRef.current = false");
    expect(cleanScreens).toContain("setLikePending(true)");
    expect(cleanScreens).toContain("setLikePending(false)");
    expect(cleanScreens).toContain(
      "disabled={likePending || communityDetailActionBusy}",
    );
    expect(cleanScreens).toContain("bookmarked");
    expect(cleanScreens).toContain("bookmarkPending");
    expect(cleanScreens).toContain("communityBookmarkInFlightRef");
    expect(cleanScreens).toContain(
      "setPostBookmarked(targetPostId, nextBookmarked)",
    );
    expect(cleanScreens).toContain(
      "setBookmarked(nextDetail.post.bookmarkedByMe === true)",
    );
    expect(cleanScreens).toContain("fallbackPostDetail");
    expect(cleanScreens).toContain("rawPersonalDataExposed");
    expect(cleanScreens).toContain(
      "setLiked(nextDetail.post.likedByMe === true)",
    );
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
    expect(cleanScreens).toContain("communityDetailActionBusy ||");
    expect(cleanScreens).toContain("!commentReady ||");
    expect(cleanScreens).toContain("communityCommentSubmitInFlightRef.current");
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
    expect(cleanScreens).toContain("commentAnonymous");
    expect(cleanScreens).toContain("setCommentAnonymous");
    expect(cleanScreens).toContain("anonymous: commentAnonymous");
    expect(cleanScreens).toContain('label="익명 댓글"');
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
    expect(cleanScreens).toContain("서버 검토 큐");
    expect(cleanScreens).not.toContain("server moderation");
  });

  it("locks community detail editing and comment inputs while moderation actions are pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";

    expect(detailSource).toContain(
      "const communityDetailActionBusy = communityDetailActionPending !== null",
    );
    expect(detailSource).toContain(
      "editable={!postEditing && !communityDetailActionBusy}",
    );
    expect(detailSource).toContain(
      "editable={commentEditingId === null && !communityDetailActionBusy}",
    );
    expect(detailSource).toContain(
      "editable={!communityDetailActionBusy && !commentSubmitting}",
    );
    expect(detailSource).toContain(
      "disabled={postEditing || communityDetailActionBusy}",
    );
    expect(detailSource).toMatch(
      /disabled=\{\s*commentEditingId !== null \|\| communityDetailActionBusy\s*\}/u,
    );
    expect(detailSource).toMatch(
      /disabled=\{\s*!commentReady \|\| commentSubmitting \|\| communityDetailActionBusy\s*\}/u,
    );
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
    expect(cleanScreens).toContain("communityDetailActionBusy ||");
    expect(cleanScreens).toContain("!postEditReady ||");
    expect(cleanScreens).toContain("communityPostEditInFlightRef.current");
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
    expect(cleanScreens).toContain(
      "disabled={postEditing || communityDetailActionBusy}",
    );
    expect(cleanScreens).toContain("commentEditingId !== null");
    expect(cleanScreens).toMatch(
      /disabled=\{\s*commentEditingId !== null \|\| communityDetailActionBusy\s*\}/u,
    );
    expect(cleanScreens).toContain("setServerCommunityDetail((current)");
  });

  it("keeps community detail edit anonymity controlled by the visible edit toggles", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";
    const updateSource =
      detailSource.match(
        /const updateCommunityPost[\s\S]*?const deleteCommunityPost/u,
      )?.[0] ?? "";

    expect(detailSource).toContain("postEditAnonymous");
    expect(detailSource).toContain("setPostEditAnonymous");
    expect(detailSource).toContain("commentEditAnonymousDrafts");
    expect(detailSource).toContain("setCommentEditAnonymousDrafts");
    expect(detailSource).toContain(
      "setPostEditAnonymous(nextDetail.post.anonymous ?? true)",
    );
    expect(detailSource).toContain("comment.anonymous ?? true");
    expect(updateSource).toContain("anonymous: postEditAnonymous");
    expect(updateSource).toContain(
      "const nextAnonymous = commentEditAnonymousDrafts[comment.id] ?? true",
    );
    expect(updateSource).toContain("anonymous: nextAnonymous");
    expect(detailSource).toContain('label="익명 게시글 수정"');
    expect(detailSource).toContain('label="익명 댓글 수정"');
    expect(updateSource).not.toContain("anonymous: true");
  });

  it("locks community detail edit inputs while server saves are pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain(
      "editable={!postEditing && !communityDetailActionBusy}",
    );
    expect(cleanScreens).toContain(
      "editable={commentEditingId === null && !communityDetailActionBusy}",
    );
  });

  it("locks community detail like save and share actions while moderation actions are pending", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";

    expect(detailSource).toMatch(
      /if\s*\(\s*communityDetailActionBusy\s*\|\|\s*communityLikeInFlightRef\.current\s*\)\s*return;/u,
    );
    expect(detailSource).toMatch(
      /if\s*\(\s*communityDetailActionBusy\s*\|\|\s*communityBookmarkInFlightRef\.current\s*\)\s*return;/u,
    );
    expect(detailSource).toMatch(
      /if\s*\(\s*communityDetailActionBusy\s*\|\|\s*communityShareInFlightRef\.current\s*\)\s*return;/u,
    );
    expect(detailSource).toContain("setCommentLiked(comment.id, nextLiked)");
    expect(detailSource).toContain("commentLikePendingId");
    expect(detailSource).toContain("좋아요 저장중");
    expect(detailSource).toContain(
      "`좋아요 ${formatCommunityCount(comment.likeCount)}`",
    );
    expect(detailSource).toContain(
      "disabled={likePending || communityDetailActionBusy}",
    );
    expect(detailSource).toMatch(
      /accessibilityState=\{\{\s*disabled:\s*likePending \|\| communityDetailActionBusy,\s*\}\}/u,
    );
    expect(
      detailSource.match(
        /disabled=\{\s*sharePending \|\| communityDetailActionBusy\s*\}/gu,
      ),
    ).toHaveLength(2);
    expect(detailSource).toMatch(
      /accessibilityState=\{\{\s*disabled:\s*!commentReady \|\| commentSubmitting \|\| communityDetailActionBusy,\s*\}\}/u,
    );
    expect(
      detailSource.match(
        /disabled=\{\s*bookmarkPending \|\| communityDetailActionBusy\s*\}/gu,
      ),
    ).toHaveLength(2);
    expect(detailSource).toMatch(
      /likePending\s*\|\|\s*communityDetailActionBusy\s*\?\s*styles\.disabled\s*:\s*null/u,
    );
  });

  it("keeps mandatory notifications from being archived or deleted by the app UI", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const notificationsSource =
      cleanScreens.match(
        /function NotificationsScreen\(\): React\.ReactElement \{[\s\S]*?export function CleanFintechForgotPasswordScreen/u,
      )?.[0] ?? "";

    expect(cleanScreens).toContain("isMandatory: item.isMandatory === true");
    expect(notificationsSource).toContain("if (item.isMandatory) {");
    expect(notificationsSource).toContain("필수 알림은 보관할 수 없어요.");
    expect(notificationsSource).toContain("필수 알림은 삭제할 수 없어요.");
    expect(notificationsSource).toMatch(
      /disabled=\{\s*notificationRowActionPendingId !== null\s*\|\|\s*item\.isMandatory\s*\}/u,
    );
    expect(notificationsSource).toMatch(
      /label=\{\s*item\.isMandatory\s*\?\s*"필수"\s*:/u,
    );
  });

  it("restores community detail like and bookmark state when server toggles fail", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";

    expect(detailSource).toContain("restoreCommunityLikeState");
    expect(detailSource).toContain("restoreCommunityBookmarkState");
    expect(detailSource).toMatch(
      /restoreCommunityLikeState\(targetPostId,\s*!nextLiked\);/u,
    );
    expect(detailSource).toMatch(
      /restoreCommunityBookmarkState\(targetPostId,\s*!nextBookmarked\);/u,
    );
    expect(detailSource).toMatch(
      /likedByMe:\s*previousLiked,\s*likeCount:\s*Math\.max\(0,\s*current\.post\.likeCount \+ delta\)/u,
    );
    expect(detailSource).toMatch(
      /bookmarkedByMe:\s*previousBookmarked,\s*bookmarkCount:\s*Math\.max\(0,\s*current\.post\.bookmarkCount \+ delta\)/u,
    );
  });

  it("keeps community detail share action wired to the native app share sheet", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain("Share,");
    expect(cleanScreens).toContain("shareCommunityPost");
    expect(cleanScreens).toContain("Share.share({");
    expect(cleanScreens).toContain(
      'recordPostShare(targetPostId, "SYSTEM_SHARE")',
    );
    expect(cleanScreens).toContain("serverShareCount");
    expect(cleanScreens).toContain("shareCount");
    expect(cleanScreens).toContain("https://salaryhijacking.com/community/");
    expect(cleanScreens).toContain("sharePending");
    expect(cleanScreens).toContain("communityShareInFlightRef");
    expect(cleanScreens).toContain(
      "if (communityDetailActionBusy || communityShareInFlightRef.current) return",
    );
    expect(cleanScreens).toContain("communityShareInFlightRef.current = true");
    expect(cleanScreens).toContain("communityShareInFlightRef.current = false");
    expect(cleanScreens).toContain("setSharePending(true)");
    expect(cleanScreens).toContain("setSharePending(false)");
    expect(cleanScreens).toContain(
      "disabled={sharePending || communityDetailActionBusy}",
    );
    expect(cleanScreens).toContain("onPress={shareCommunityPost}");
    expect(cleanScreens).toContain("공유할 수 있는 화면을 열었어요.");
  });

  it("sanitizes community detail share titles before native sharing", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";

    expect(detailSource).toContain("sanitizeCommunityShareTitle");
    expect(detailSource).toMatch(
      /const title = sanitizeCommunityShareTitle\(activeDetail\.post\.title\);/u,
    );
    expect(detailSource).toMatch(
      /containsSensitiveCommunityContent\(candidate\)/u,
    );
    expect(detailSource).toContain("Salary Hijacking community post");
    expect(detailSource).not.toContain(
      "const title = activeDetail.post.title;",
    );
  });

  it("sanitizes community detail share post ids before building public URLs", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";

    expect(detailSource).toContain("sanitizeCommunitySharePostId");
    expect(detailSource).toMatch(
      /const sharePostId = sanitizeCommunitySharePostId\(targetPostId\);/u,
    );
    expect(detailSource).toMatch(/encodeURIComponent\(sharePostId\)/u);
    expect(detailSource).toMatch(
      /containsSensitiveCommunityContent\(candidate\)/u,
    );
    expect(detailSource).toContain("community-post");
    expect(detailSource).not.toContain(
      "const encodedPostId = encodeURIComponent(targetPostId);",
    );
  });

  it("sanitizes community detail route post ids before API hydration", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const detailSource =
      cleanScreens.match(
        /export function CleanFintechPostDetailScreen[\s\S]*?function SalaryHomeScreen/u,
      )?.[0] ?? "";

    expect(detailSource).toContain("sanitizeCommunityDetailPostId");
    expect(detailSource).toMatch(
      /const safePostId = sanitizeCommunityDetailPostId\(postId\);/u,
    );
    expect(detailSource).toMatch(
      /containsSensitiveCommunityContent\(candidate\)/u,
    );
    expect(detailSource).toContain("fallbackPostDetail.post.id");
    expect(detailSource).not.toContain(
      "const safePostId = postId.trim() || fallbackPostDetail.post.id;",
    );
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
