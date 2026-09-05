import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  BudgetApiClient,
  BudgetApiResponse,
  DailyBudgetRecalculateRequest,
  DailyBudgetSaveRequest,
} from "../../../features/budget/types";
import type {
  PlanCommitmentsApiClient,
  PlanFixedExpenseCreateRequest,
  PlanFixedExpenseUpdateRequest,
  PlanSavingsGoalCreateRequest,
  PlanSavingsGoalUpdateRequest,
} from "../../../features/plan/types";
import type {
  PayrollApiClient,
  PayrollPlanSaveRequest,
  PayrollPlanSnapshot,
} from "../../../features/payroll/types";
import {
  createMobileBudgetApi,
  createMobilePayrollApi,
  createMobilePlanCommitmentsApi,
} from "../../../shared/api/mobile-api";
import { appIconAssets } from "../../../shared/assets/icons";
import {
  AppHeader,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import {
  markReleaseInteractionPerf,
} from "../../../shared/performance/release-perf";
import { createSecureStoreRuntime } from "../../../shared/storage/secure-store";
import {
  configurePayrollReminderStatePersistence,
  formatKrw,
  getPayrollReminderState,
  getKstParts,
  hydratePayrollReminderStateFromStorage,
  parseKrwInput,
  updatePayrollReminderState,
  type DailyBudgetItem,
  type PlanItem,
  type ReminderCategory,
} from "../../payroll-reminders/interactive-state";

const designSystem = salaryHijackingDesignSystem;
const planScreenColors = {
  brand: designSystem.colors.brand.primary,
  danger: designSystem.colors.semantic.dangerStrong,
  dangerBorder: designSystem.colors.semantic.dangerSoft,
  dangerSurface: designSystem.colors.semantic.dangerSoft,
  disabled: designSystem.colors.text.disabled,
  inverse: designSystem.colors.text.inverse,
  line: designSystem.colors.border.default,
  lineStrong: designSystem.colors.border.strong,
  muted: designSystem.colors.text.secondary,
  screen: designSystem.colors.surface.subtle,
  soft: designSystem.colors.surface.soft,
  surface: designSystem.colors.surface.default,
  text: designSystem.colors.text.primary,
} as const;
const planScreenSpacing = designSystem.spacing;
const planScreenRadius = designSystem.radius;
const planScreenTypography = designSystem.typography;
const planScreenElevation = designSystem.elevation;
const PLAN_SAVE_ERROR =
  "\uC11C\uBC84 \uC800\uC7A5\uC774 \uC2E4\uD328\uD574 \uACC4\uD68D\uC744 \uBC18\uC601\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
const payrollReminderSecureStore = createSecureStoreRuntime(
  Platform.OS,
  SecureStore,
);

type SectionKey = "payroll" | "fixed" | "saving" | "living";
type Draft = Readonly<{
  amount: string;
  category: string;
  content: string;
  day: string;
}>;
type PayrollDraft = Readonly<{
  expenseAmount: string;
  hijackAmount: string;
  payday: string;
  payrollAmount: string;
}>;

export type PlanScreenProps = Readonly<{
  budgetApi?:
    | Partial<
        Pick<
          BudgetApiClient,
          | "createVariableExpense"
          | "deleteVariableExpense"
          | "recalculate"
          | "saveDailyBudget"
          | "updateVariableExpense"
        >
      >
    | null
    | undefined;
  planCommitmentsApi?:
    | Partial<
        Pick<
          PlanCommitmentsApiClient,
          | "createFixedExpense"
          | "createSavingsGoal"
          | "deleteFixedExpense"
          | "deleteSavingsGoal"
          | "updateFixedExpense"
          | "updateSavingsGoal"
        >
      >
    | null
    | undefined;
  payrollApi?:
    | Partial<Pick<PayrollApiClient, "getCurrent" | "savePlan">>
    | null
    | undefined;
  displayName?: string | undefined;
}>;

export function PlanScreen({
  budgetApi,
  displayName = "\uC0AC\uC6A9\uC790",
  planCommitmentsApi,
  payrollApi,
}: PlanScreenProps = {}): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalGutter = planScreenSpacing[5];
  const contentWidth = Math.min(Math.max(width - horizontalGutter * 2, 0), 430);
  const [state, setState] = useState(getPayrollReminderState());
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [payrollDraft, setPayrollDraft] = useState<PayrollDraft>({
    expenseAmount: "",
    hijackAmount: "",
    payday: "25",
    payrollAmount: "",
  });
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    amount: "",
    category: "",
    content: "",
    day: "",
  });
  const [planError, setPlanError] = useState<string | null>(null);
  const [planItemSavePending, setPlanItemSavePending] = useState(false);
  const planItemSaveInFlightRef = React.useRef(false);
  const setPlanItemSaveInFlight = React.useCallback((value: boolean) => {
    planItemSaveInFlightRef.current = value;
  }, []);
  const [livingItemSavePending, setLivingItemSavePending] = useState(false);
  const livingItemSaveInFlightRef = React.useRef(false);
  const setLivingItemSaveInFlight = React.useCallback((value: boolean) => {
    livingItemSaveInFlightRef.current = value;
  }, []);
  const serverPlanCommitmentsApi = useMemo(
    () =>
      planCommitmentsApi ??
      (process.env.JEST_WORKER_ID ? null : createMobilePlanCommitmentsApi()),
    [planCommitmentsApi],
  );
  const serverBudgetApi = useMemo(
    () =>
      budgetApi ??
      (process.env.JEST_WORKER_ID ? null : createMobileBudgetApi()),
    [budgetApi],
  );
  const serverPayrollApi = useMemo(
    () =>
      payrollApi ??
      (process.env.JEST_WORKER_ID ? null : createMobilePayrollApi()),
    [payrollApi],
  );

  const fixedItems = state.planItems.filter((item) => item.section === "fixed");
  const savingItems = state.planItems.filter(
    (item) => item.section === "saving",
  );
  const livingTotal = state.dailyLimit * state.livingDays;
  const cumulativeHijacked = state.financialSummary.cumulativeHijacked;
  const goalPercent =
    monthlyTarget > 0
      ? clamp(Math.round((cumulativeHijacked / monthlyTarget) * 100), 0, 100)
      : 0;

  useEffect(() => {
    let mounted = true;
    const current = getPayrollReminderState();
    configurePayrollReminderStatePersistence(payrollReminderSecureStore);
    if (process.env.JEST_WORKER_ID) return undefined;
    void hydratePayrollReminderStateFromStorage().then((restored) => {
      if (mounted && restored !== current) setState(restored);
    });
    return () => {
      mounted = false;
    };
  }, []);

  function sync(next: ReturnType<typeof getPayrollReminderState>): void {
    setState(next);
  }

  function applyPayrollPlanSnapshot(snapshot: PayrollPlanSnapshot): void {
    setPayrollDraft(payrollDraftFromSnapshot(snapshot));
    sync(
      updatePayrollReminderState((previous) => ({
        ...previous,
        financialSummary: {
          ...previous.financialSummary,
          fixedExpenseBaseline: snapshot.fixedExpenseTotalMinor,
          receivedAmount: snapshot.payrollAmountMinor,
        },
      })),
    );
  }

  function openEditor(section: SectionKey, item?: PlanItem): void {
    setPlanError(null);
    setOpenSection(section);
    setEditingId(item?.id ?? null);
    setDraft({
      amount: item ? String(item.amount) : "",
      category: item?.category ?? "",
      content: item?.content ?? "",
      day: item ? String(item.day) : section === "living" ? "1" : "25",
    });
  }

  async function savePayrollPlan(): Promise<void> {
    setPlanError(null);
    const payday = clamp(parseKrwInput(payrollDraft.payday) || 25, 1, 31);
    const payrollAmount = parseKrwInput(payrollDraft.payrollAmount);
    const fixedExpenseTotal = parseKrwInput(payrollDraft.expenseAmount);
    if (payrollAmount <= 0) return;
    if (serverPayrollApi?.savePlan !== undefined) {
      try {
        applyPayrollPlanSnapshot(
          await serverPayrollApi.savePlan(
            buildPayrollPlanSaveRequest({
              fixedExpenseTotal,
              payday,
              payrollAmount,
            }),
          ),
        );
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    setPayrollDraft({
      expenseAmount: String(fixedExpenseTotal),
      hijackAmount: String(Math.max(payrollAmount - fixedExpenseTotal, 0)),
      payday: String(payday),
      payrollAmount: String(payrollAmount),
    });
    sync(
      updatePayrollReminderState((previous) => ({
        ...previous,
        financialSummary: {
          ...previous.financialSummary,
          fixedExpenseBaseline: fixedExpenseTotal,
          receivedAmount: payrollAmount,
        },
      })),
    );
  }

  async function savePlanItem(section: "fixed" | "saving"): Promise<void> {
    if (planItemSaveInFlightRef.current) return;
    setPlanError(null);
    const amount = parseKrwInput(draft.amount);
    const content = draft.content.trim();
    if (amount <= 0 || !content) return;
    const category = normalizeCategory(draft.category);
    const day = clamp(parseKrwInput(draft.day) || 25, 1, 31);
    setPlanItemSaveInFlight(true);
    setPlanItemSavePending(true);
    try {
      if (
        section === "fixed" &&
        editingId &&
        serverPlanCommitmentsApi?.updateFixedExpense !== undefined
      ) {
        const saved = await serverPlanCommitmentsApi.updateFixedExpense(
          editingId,
          buildFixedExpenseUpdateRequest({
            amount,
            category,
            content,
            day,
          }),
        );
        sync(
          savePlanItemInPayrollReminderState({
            amount: saved.amountMinor,
            category: normalizeCategory(saved.category ?? category),
            content: saved.title,
            day: saved.dueDay ?? day,
            id: saved.id,
            section,
          }),
        );
        clearDraft();
        return;
      }
      if (
        section === "saving" &&
        editingId &&
        serverPlanCommitmentsApi?.updateSavingsGoal !== undefined
      ) {
        const saved = await serverPlanCommitmentsApi.updateSavingsGoal(
          editingId,
          buildSavingsGoalUpdateRequest({
            amount,
            category,
            content,
          }),
        );
        sync(
          savePlanItemInPayrollReminderState({
            amount: saved.fixedSaveAmountMinor,
            category: normalizeCategory(saved.goalType ?? category),
            content: saved.title,
            day,
            id: saved.id,
            section,
          }),
        );
        clearDraft();
        return;
      }
      if (
        section === "fixed" &&
        !editingId &&
        serverPlanCommitmentsApi?.createFixedExpense !== undefined
      ) {
        const saved = await serverPlanCommitmentsApi.createFixedExpense(
          buildFixedExpenseCreateRequest({
            amount,
            category,
            content,
            day,
          }),
        );
        sync(
          savePlanItemInPayrollReminderState({
            amount: saved.amountMinor,
            category: normalizeCategory(saved.category ?? category),
            content: saved.title,
            day: saved.dueDay ?? day,
            id: saved.id,
            section,
          }),
        );
        clearDraft();
        return;
      }
      if (
        section === "saving" &&
        !editingId &&
        serverPlanCommitmentsApi?.createSavingsGoal !== undefined
      ) {
        const saved = await serverPlanCommitmentsApi.createSavingsGoal(
          buildSavingsGoalCreateRequest({
            amount,
            category,
            content,
          }),
        );
        sync(
          savePlanItemInPayrollReminderState({
            amount: saved.fixedSaveAmountMinor,
            category: normalizeCategory(saved.goalType ?? category),
            content: saved.title,
            day,
            id: saved.id,
            section,
          }),
        );
        clearDraft();
        return;
      }
      sync(
        savePlanItemInPayrollReminderState({
          amount,
          category,
          content,
          day,
          id: editingId ?? `plan-${section}-${Date.now()}`,
          section,
        }),
      );
      clearDraft();
    } catch {
      setPlanError(PLAN_SAVE_ERROR);
    } finally {
      setPlanItemSaveInFlight(false);
      setPlanItemSavePending(false);
    }
  }

  async function saveLivingItem(): Promise<void> {
    if (livingItemSaveInFlightRef.current) return;
    setPlanError(null);
    const amount = parseKrwInput(draft.amount);
    const content = draft.content.trim();
    if (amount <= 0 || !content) return;
    const category = normalizeCategory(draft.category);
    const nextItem: DailyBudgetItem = {
      amount,
      category,
      completed: false,
      content,
      id: editingId ?? `daily-plan-${Date.now()}`,
    };
    setLivingItemSaveInFlight(true);
    setLivingItemSavePending(true);
    try {
      if (serverBudgetApi?.recalculate !== undefined) {
        await serverBudgetApi.recalculate(
          buildDailyLivingItemsRecalculateRequest(
            nextDailyLivingItems(state.dailyItems, nextItem),
            state.livingDays,
          ),
        );
        sync(saveDailyLivingItemInPayrollReminderState(nextItem));
        clearDraft();
        return;
      }
      sync(saveDailyLivingItemInPayrollReminderState(nextItem));
      clearDraft();
    } catch {
      setPlanError(PLAN_SAVE_ERROR);
    } finally {
      setLivingItemSaveInFlight(false);
      setLivingItemSavePending(false);
    }
  }

  async function updateDailyLimit(value: string): Promise<void> {
    setPlanError(null);
    const dailyLimit = parseKrwInput(value);
    if (dailyLimit <= 0) return;
    if (serverBudgetApi?.saveDailyBudget !== undefined) {
      try {
        sync(
          applyDailyBudgetSnapshot(
            await serverBudgetApi.saveDailyBudget(
              buildDailyBudgetSaveRequest(dailyLimit),
            ),
          ),
        );
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    sync(
      updatePayrollReminderState((previous) => ({
        ...previous,
        dailyLimit,
      })),
    );
  }

  async function updateLivingDays(value: string): Promise<void> {
    setPlanError(null);
    const livingDays = clamp(parseKrwInput(value), 1, 31);
    if (serverBudgetApi?.recalculate !== undefined) {
      try {
        await serverBudgetApi.recalculate(
          buildDailyBudgetRecalculateRequest(state.dailyLimit, livingDays),
        );
        sync(
          updatePayrollReminderState((previous) => ({
            ...previous,
            livingDays,
          })),
        );
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    sync(
      updatePayrollReminderState((previous) => ({
        ...previous,
        livingDays,
      })),
    );
  }

  async function deleteEditingItem(): Promise<void> {
    setPlanError(null);
    if (!editingId) return;
    const editingPlanItem = state.planItems.find(
      (item) => item.id === editingId,
    );
    const editingDailyItem = state.dailyItems.find(
      (item) => item.id === editingId,
    );
    if (
      editingPlanItem?.section === "fixed" &&
      serverPlanCommitmentsApi?.deleteFixedExpense !== undefined
    ) {
      try {
        await serverPlanCommitmentsApi.deleteFixedExpense(editingId);
        sync(deleteEditingItemInPayrollReminderState(editingId));
        clearDraft();
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    if (
      editingPlanItem?.section === "saving" &&
      serverPlanCommitmentsApi?.deleteSavingsGoal !== undefined
    ) {
      try {
        await serverPlanCommitmentsApi.deleteSavingsGoal(editingId);
        sync(deleteEditingItemInPayrollReminderState(editingId));
        clearDraft();
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    if (
      editingDailyItem !== undefined &&
      serverBudgetApi?.recalculate !== undefined
    ) {
      try {
        await serverBudgetApi.recalculate(
          buildDailyLivingItemsRecalculateRequest(
            state.dailyItems.filter((item) => item.id !== editingId),
            state.livingDays,
          ),
        );
        sync(deleteEditingItemInPayrollReminderState(editingId));
        clearDraft();
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    sync(deleteEditingItemInPayrollReminderState(editingId));
    clearDraft();
  }

  function clearDraft(): void {
    setEditingId(null);
    setDraft({ amount: "", category: "", content: "", day: "" });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
      style={styles.screen}
    >
      <StatusBar
        backgroundColor={planScreenColors.surface}
        barStyle="dark-content"
      />
      <ScrollView
        accessibilityLabel="\uAE09\uC5EC\uB0A9\uCE58 \uACC4\uD68D \uD654\uBA74"
        automaticallyAdjustKeyboardInsets
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 96,
            paddingTop: insets.top,
            width: contentWidth,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader subtitle="월급을 지키는 계획" title="계획" variant="ROOT" />

        {planError ? (
          <Text
            accessibilityRole="alert"
            allowFontScaling={false}
            style={styles.errorText}
          >
            {planError}
          </Text>
        ) : null}

        <View style={styles.goalCard}>
          <View style={styles.goalCopy}>
            <Text allowFontScaling={false} style={styles.goalTitle}>
              {displayName}님의 급여 납치 목표 달성률
            </Text>
            <View style={styles.goalMetaRow}>
              <View style={styles.goalMeta}>
                <Text allowFontScaling={false} style={styles.metaLabel}>
                  이번달 목표 납치 금액
                </Text>
                <Text allowFontScaling={false} style={styles.metaGreen}>
                  {formatKrw(monthlyTarget)}
                </Text>
              </View>
              <View style={styles.goalMeta}>
                <Text allowFontScaling={false} style={styles.metaLabel}>
                  총 누적 납치 금액
                </Text>
                <Text allowFontScaling={false} style={styles.metaRed}>
                  {formatKrw(cumulativeHijacked)}
                </Text>
              </View>
            </View>
          </View>
          <Text allowFontScaling={false} style={styles.goalPercent}>
            {goalPercent}%
          </Text>
        </View>

        <MobilePlanSection
          open={openSection === "payroll"}
          summary={[
            {
              label: "\uAE09\uC5EC \uBC1B\uB294\uB0A0",
              value: `\uB9E4\uC6D4 ${clamp(parseKrwInput(payrollDraft.payday) || 25, 1, 31)}\uC77C`,
            },
            {
              label: "\uC218\uB839 \uC608\uC0C1 \uAE09\uC5EC",
              value: formatKrw(parseKrwInput(payrollDraft.payrollAmount)),
            },
            {
              label: "\uC9C0\uCD9C \uC608\uC0C1 \uAE08\uC561",
              value: formatKrw(parseKrwInput(payrollDraft.expenseAmount)),
            },
            {
              label: "\uC608\uC0C1 \uB0A9\uCE58 \uAE08\uC561",
              tone: "brand",
              value: formatKrw(parseKrwInput(payrollDraft.hijackAmount)),
            },
          ]}
          settingLabel="내 급여 납치 계획/설정 설정"
          settingTestID="payroll-section-settings-button"
          title="내 급여 납치 계획/설정"
          onToggle={() =>
            setOpenSection(openSection === "payroll" ? null : "payroll")
          }
        >
          <View style={styles.inlineForm}>
            <TextInput
              accessibilityLabel="payroll-payday-input"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(payday) =>
                setPayrollDraft({ ...payrollDraft, payday })
              }
              placeholder="\uAE09\uC5EC\uC77C"
              style={styles.input}
              value={payrollDraft.payday}
            />
            <TextInput
              accessibilityLabel="payroll-amount-input"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(payrollAmount) =>
                setPayrollDraft({ ...payrollDraft, payrollAmount })
              }
              placeholder="\uC218\uB839 \uC608\uC0C1 \uAE09\uC5EC"
              style={styles.input}
              value={payrollDraft.payrollAmount}
            />
            <TextInput
              accessibilityLabel="payroll-expense-input"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(expenseAmount) =>
                setPayrollDraft({ ...payrollDraft, expenseAmount })
              }
              placeholder="\uC9C0\uCD9C \uC608\uC0C1 \uAE08\uC561"
              style={styles.input}
              value={payrollDraft.expenseAmount}
            />
            <TextInput
              accessibilityLabel="monthly-hijack-target-input"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(value) => {
                const parsed = parseKrwInput(value);
                if (parsed > 0) setMonthlyTarget(parsed);
              }}
              placeholder="\uC774\uBC88\uB2EC \uBAA9\uD45C \uB0A9\uCE58 \uAE08\uC561"
              style={styles.input}
              value={String(monthlyTarget)}
            />
            <Pressable
              accessibilityLabel="payroll-plan-save-button"
              accessibilityRole="button"
              onPressIn={(event) => {
                markReleaseInteractionPerf(
                  "interaction.plan_save.press",
                  event,
                );
              }}
              onPress={() => {
                void savePayrollPlan();
              }}
              style={styles.saveButton}
            >
              <Text allowFontScaling={false} style={styles.saveButtonText}>
                {"\uC800\uC7A5"}
              </Text>
            </Pressable>
          </View>
        </MobilePlanSection>

        <EditablePlanSection
          editingId={editingId}
          items={fixedItems}
          open={openSection === "fixed"}
          section="fixed"
          settingLabel="월별 고정 지출 계획/설정 설정"
          title="월별 고정 지출 계획/설정"
          onOpenEditor={openEditor}
          onDelete={deleteEditingItem}
          onSave={() => savePlanItem("fixed")}
          savePending={planItemSavePending}
          draft={draft}
          setDraft={setDraft}
        />

        <EditablePlanSection
          editingId={editingId}
          items={savingItems}
          open={openSection === "saving"}
          section="saving"
          settingLabel="월별 고정 적금 계획/설정 설정"
          title="월별 고정 적금 계획/설정"
          onOpenEditor={openEditor}
          onDelete={deleteEditingItem}
          onSave={() => savePlanItem("saving")}
          savePending={planItemSavePending}
          draft={draft}
          setDraft={setDraft}
        />

        <MobilePlanSection
          open={openSection === "living"}
          summary={[
            {
              label: "일일 생활비 총액",
              value: formatKrw(state.dailyLimit),
            },
            {
              label: "일수",
              value: `${state.livingDays}일`,
            },
            {
              label: "월별 생활비 총액",
              tone: "brand",
              value: formatKrw(livingTotal),
            },
          ]}
          settingLabel="일일 생활비 계획/설정 설정"
          settingTestID="living-section-settings-button"
          title="일일 생활비 계획/설정"
          onToggle={() => {
            setOpenSection(openSection === "living" ? null : "living");
            clearDraft();
          }}
        >
          <View style={styles.inlineForm}>
            <TextInput
              accessibilityLabel="일일 생활비 총액 설정"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(value) => {
                void updateDailyLimit(value);
              }}
              placeholder="일일 생활비 총액"
              style={styles.input}
              value={String(state.dailyLimit)}
            />
            <TextInput
              accessibilityLabel="일수 설정"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(value) => {
                void updateLivingDays(value);
              }}
              placeholder="일수"
              style={styles.input}
              value={String(state.livingDays)}
            />
          </View>
          <Pressable
            accessibilityLabel="일일 생활비 추가하기"
            accessibilityRole="button"
            onPress={() => openEditor("living")}
            testID="living-section-add-button"
          >
            <Text allowFontScaling={false} style={styles.addText}>
              +추가하기
            </Text>
          </Pressable>
          <PlanCommitmentList
            items={state.dailyItems.map((item) => ({
              amount: item.amount,
              category: item.category,
              content: item.content,
              dayLabel: "매일",
              id: item.id,
              testID: `living-item-edit-${item.id}`,
            }))}
            onPress={(itemId) => {
              const item = state.dailyItems.find((row) => row.id === itemId);
              if (!item) return;
              setOpenSection("living");
              setEditingId(item.id);
              setDraft({
                amount: String(item.amount),
                category: item.category,
                content: item.content,
                day: "1",
              });
            }}
          />
          {draft.content || draft.amount || draft.day ? (
            <PlanItemForm
              draft={draft}
              setDraft={setDraft}
              onSave={saveLivingItem}
              onDelete={editingId ? deleteEditingItem : undefined}
              savePending={livingItemSavePending}
            />
          ) : null}
        </MobilePlanSection>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function savePlanItemInPayrollReminderState(
  nextItem: PlanItem,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    planItems: previous.planItems.some((item) => item.id === nextItem.id)
      ? previous.planItems.map((item) =>
          item.id === nextItem.id ? nextItem : item,
        )
      : [...previous.planItems, nextItem],
  }));
}

function saveDailyLivingItemInPayrollReminderState(
  nextItem: DailyBudgetItem,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    dailyItems: previous.dailyItems.some((item) => item.id === nextItem.id)
      ? previous.dailyItems.map((item) =>
          item.id === nextItem.id ? nextItem : item,
        )
      : [...previous.dailyItems, nextItem],
  }));
}

function nextDailyLivingItems(
  currentItems: readonly DailyBudgetItem[],
  nextItem: DailyBudgetItem,
): readonly DailyBudgetItem[] {
  return currentItems.some((item) => item.id === nextItem.id)
    ? currentItems.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...currentItems, nextItem];
}

function buildPayrollPlanSaveRequest({
  fixedExpenseTotal,
  payday,
  payrollAmount,
}: Readonly<{
  fixedExpenseTotal: number;
  payday: number;
  payrollAmount: number;
}>): PayrollPlanSaveRequest {
  const { month, year } = getKstParts();
  const periodStartDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const periodEndDate = addDaysToIsoDate(
    `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`,
    -1,
  );
  const monthEndDay = Number(periodEndDate.slice(-2)) || payday;
  const firstPayrollDay = Math.min(payday, monthEndDay);
  const firstPayrollDate = `${year}-${String(month).padStart(2, "0")}-${String(firstPayrollDay).padStart(2, "0")}`;
  return {
    carryOverAmountMinor: 0,
    emergencyBufferMinor: 0,
    firstPayrollDate,
    fixedExpenseTotalMinor: fixedExpenseTotal,
    fixedSavingsTotalMinor: 0,
    incomeType: "NET",
    memo: "mobile plan payroll settings",
    payday,
    payrollAmountMinor: payrollAmount,
    payrollCycle: "MONTHLY",
    periodEndDate,
    periodStartDate,
    planId: null,
    reservePolicy: "ZERO_BASE",
    title: "Mobile payroll plan",
    variableExpenseReserveMinor: 0,
  };
}

function payrollDraftFromSnapshot(snapshot: PayrollPlanSnapshot): PayrollDraft {
  return {
    expenseAmount: String(snapshot.fixedExpenseTotalMinor),
    hijackAmount: String(snapshot.calculation.remainderMinor),
    payday: String(snapshot.payday ?? 25),
    payrollAmount: String(snapshot.payrollAmountMinor),
  };
}

function deleteEditingItemInPayrollReminderState(
  editingId: string,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    dailyItems: previous.dailyItems.filter((item) => item.id !== editingId),
    planItems: previous.planItems.filter((item) => item.id !== editingId),
  }));
}

function buildFixedExpenseCreateRequest({
  amount,
  category,
  content,
  day,
}: Readonly<{
  amount: number;
  category: string;
  content: string;
  day: number;
}>): PlanFixedExpenseCreateRequest {
  return {
    amountMinor: amount,
    category,
    paymentDay: day,
    title: content,
  };
}

function buildFixedExpenseUpdateRequest({
  amount,
  category,
  content,
  day,
}: {
  amount: number;
  category: string;
  content: string;
  day: number;
}): PlanFixedExpenseUpdateRequest {
  return {
    amountMinor: amount,
    category,
    paymentDay: day,
    title: content,
  };
}

function buildSavingsGoalCreateRequest({
  amount,
  category,
  content,
}: {
  amount: number;
  category: string;
  content: string;
}): PlanSavingsGoalCreateRequest {
  return {
    fixedSaveAmountMinor: amount,
    goalType: category,
    targetAmountMinor: amount,
    title: content,
  };
}

function buildSavingsGoalUpdateRequest({
  amount,
  category,
  content,
}: {
  amount: number;
  category: string;
  content: string;
}): PlanSavingsGoalUpdateRequest {
  return {
    fixedSaveAmountMinor: amount,
    goalType: category,
    targetAmountMinor: amount,
    title: content,
  };
}

function buildDailyBudgetSaveRequest(
  plannedAmountMinor: number,
): DailyBudgetSaveRequest {
  const budgetDate = getCurrentKstDate();
  return {
    budgetDate,
    budgetId: null,
    memo: null,
    plannedAmountMinor,
  };
}

function buildDailyBudgetRecalculateRequest(
  dailyLimit: number,
  livingDays: number,
): DailyBudgetRecalculateRequest {
  const periodStartDate = getCurrentKstDate();
  return {
    alreadySpentAmountMinor: 0,
    availableAmountMinor: dailyLimit * livingDays,
    carryOverAmountMinor: 0,
    memo: "mobile plan daily living days recalculation",
    overwriteExisting: true,
    periodEndDate: addDaysToIsoDate(periodStartDate, livingDays - 1),
    periodStartDate,
  };
}

function buildDailyLivingItemsRecalculateRequest(
  dailyItems: readonly DailyBudgetItem[],
  livingDays: number,
): DailyBudgetRecalculateRequest {
  const dailyLivingTotal = dailyItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  return {
    ...buildDailyBudgetRecalculateRequest(dailyLivingTotal, livingDays),
    memo: "mobile plan daily living item recalculation",
  };
}

function getCurrentKstDate(): string {
  const { day, month, year } = getKstParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return `${utcDate.getUTCFullYear()}-${String(
    utcDate.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
}

function applyDailyBudgetSnapshot(
  saved: BudgetApiResponse,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    dailyLimit: saved.data.snapshot.dailyLimit,
  }));
}

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}

type PlanSummaryItem = Readonly<{
  label: string;
  tone?: "brand" | "danger" | "default";
  value: string;
}>;

type PlanListItem = Readonly<{
  amount: number;
  category: string;
  content: string;
  dayLabel: string;
  id: string;
  testID: string;
}>;

function MobilePlanSection({
  children,
  onToggle,
  open,
  settingLabel,
  settingTestID,
  summary,
  title,
}: Readonly<{
  children?: React.ReactNode;
  onToggle: () => void;
  open: boolean;
  settingLabel: string;
  settingTestID?: string;
  summary: readonly PlanSummaryItem[];
  title: string;
}>) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTitleRow}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>
          {title}
        </Text>
        <Pressable
          accessibilityLabel={settingLabel}
          accessibilityRole="button"
          testID={settingTestID}
          onPress={onToggle}
          style={styles.smallIconButton}
        >
          <Image
            source={appIconAssets.common.settings}
            style={styles.sectionSettingsIcon}
          />
        </Pressable>
      </View>
      <PlanSummaryGrid summary={summary} />
      {open ? children : null}
    </View>
  );
}

function EditablePlanSection({
  draft,
  editingId,
  items,
  onDelete,
  onOpenEditor,
  onSave,
  open,
  savePending,
  section,
  setDraft,
  settingLabel,
  title,
}: Readonly<{
  draft: Draft;
  editingId: string | null;
  items: readonly PlanItem[];
  onDelete: () => void;
  onOpenEditor: (section: SectionKey, item?: PlanItem) => void;
  onSave: () => void;
  open: boolean;
  savePending: boolean;
  section: "fixed" | "saving";
  setDraft: (draft: Draft) => void;
  settingLabel: string;
  title: string;
}>) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const nextItem = items[0];
  return (
    <MobilePlanSection
      onToggle={() => onOpenEditor(section)}
      open={open}
      settingLabel={settingLabel}
      settingTestID={`${section}-section-settings-button`}
      summary={[
        {
          label: "등록 항목",
          value: `${items.length}개`,
        },
        {
          label: section === "fixed" ? "월 고정지출" : "월 고정저축",
          tone: section === "fixed" ? "danger" : "brand",
          value: formatKrw(total),
        },
        {
          label: "다음 예정",
          value: nextItem ? `${nextItem.day}일 ${nextItem.content}` : "대기",
        },
      ]}
      title={title}
    >
      <Pressable
        accessibilityLabel={`${title.replace(" 계획/설정", "")} 추가하기`}
        accessibilityRole="button"
        onPress={() => onOpenEditor(section)}
        testID={`${section}-section-add-button`}
      >
        <Text allowFontScaling={false} style={styles.addText}>
          +추가하기
        </Text>
      </Pressable>
      <PlanCommitmentList
        items={items.map((item) => ({
          amount: item.amount,
          category: item.category,
          content: item.content,
          dayLabel: `${item.day}일`,
          id: item.id,
          testID: `${section}-item-edit-${item.id}`,
        }))}
        onPress={(itemId) => {
          const item = items.find((row) => row.id === itemId);
          if (item) onOpenEditor(section, item);
        }}
      />
      {(draft.content || draft.amount || draft.day) && open ? (
        <PlanItemForm
          draft={draft}
          setDraft={setDraft}
          onSave={onSave}
          savePending={savePending}
          onDelete={editingId ? onDelete : undefined}
        />
      ) : null}
    </MobilePlanSection>
  );
}

function PlanSummaryGrid({
  summary,
}: Readonly<{
  summary: readonly PlanSummaryItem[];
}>) {
  return (
    <View accessibilityLabel="계획 요약" style={styles.summaryGrid}>
      {summary.map((item) => (
        <View key={`${item.label}-${item.value}`} style={styles.summaryTile}>
          <Text allowFontScaling={false} style={styles.summaryLabel}>
            {item.label}
          </Text>
          <Text
            allowFontScaling={false}
            numberOfLines={2}
            style={[
              styles.summaryValue,
              item.tone === "brand" ? styles.summaryValueBrand : null,
              item.tone === "danger" ? styles.summaryValueDanger : null,
            ]}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PlanCommitmentList({
  items,
  onPress,
}: Readonly<{
  items: readonly PlanListItem[];
  onPress: (itemId: string) => void;
}>) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyPlanList}>
        <Text allowFontScaling={false} style={styles.emptyPlanTitle}>
          아직 등록된 항목이 없습니다
        </Text>
        <Text allowFontScaling={false} style={styles.emptyPlanBody}>
          추가하기로 이번 급여주기에 필요한 계획을 넣어두세요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.planList}>
      {items.map((item) => (
        <Pressable
          accessibilityLabel={`${item.content} 수정하기`}
          accessibilityRole="button"
          key={`edit-${item.id}`}
          onPress={() => onPress(item.id)}
          style={({ pressed }) => [
            styles.planListRow,
            pressed ? styles.planListRowPressed : null,
          ]}
          testID={item.testID}
        >
          <View style={styles.planListMain}>
            <Text allowFontScaling={false} style={styles.planListTitle}>
              {item.content}
            </Text>
            <Text allowFontScaling={false} style={styles.planListMeta}>
              {item.dayLabel} · {item.category}
            </Text>
          </View>
          <Text allowFontScaling={false} style={styles.planListMoney}>
            {formatKrw(item.amount)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlanItemForm({
  draft,
  onDelete,
  onSave,
  savePending = false,
  setDraft,
}: Readonly<{
  draft: Draft;
  onDelete?: (() => void) | undefined;
  onSave: () => Promise<void> | void;
  savePending?: boolean;
  setDraft: (draft: Draft) => void;
}>) {
  return (
    <View style={styles.inlineForm}>
      <TextInput
        accessibilityLabel="계획 항목 카테고리"
        onChangeText={(category) => setDraft({ ...draft, category })}
        placeholder="카테고리"
        style={styles.input}
        testID="plan-item-category-input"
        value={draft.category}
      />
      <TextInput
        accessibilityLabel="계획 항목 내용"
        onChangeText={(content) => setDraft({ ...draft, content })}
        placeholder="내용"
        style={styles.input}
        testID="plan-item-content-input"
        value={draft.content}
      />
      <TextInput
        accessibilityLabel="계획 항목 금액"
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(amount) => setDraft({ ...draft, amount })}
        placeholder="금액"
        style={styles.input}
        testID="plan-item-amount-input"
        value={draft.amount}
      />
      <TextInput
        accessibilityLabel="계획 항목 일자"
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(day) => setDraft({ ...draft, day })}
        placeholder="일자"
        style={styles.input}
        testID="plan-item-day-input"
        value={draft.day}
      />
      <Pressable
        accessibilityLabel="계획 항목 저장"
        accessibilityRole="button"
        accessibilityState={{ disabled: savePending }}
        disabled={savePending}
        onPressIn={(event) => {
          if (!savePending)
            markReleaseInteractionPerf("interaction.plan_save.press", event);
        }}
        onPress={() => {
          void onSave();
        }}
        style={[
          styles.saveButton,
          savePending ? styles.saveButtonDisabled : null,
        ]}
        testID="plan-item-save-button"
      >
        <Text allowFontScaling={false} style={styles.saveButtonText}>
          저장
        </Text>
      </Pressable>
      {onDelete ? (
        <Pressable
          accessibilityLabel="계획 항목 삭제"
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.deleteButton}
          testID="plan-item-delete-button"
        >
          <Text allowFontScaling={false} style={styles.deleteButtonText}>
            삭제
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function normalizeCategory(value: string): ReminderCategory {
  const category = value.trim();
  if (category.includes("음식") || category.includes("식사")) return "음식";
  if (category.includes("카페") || category.includes("커피")) return "카페";
  if (category.includes("담배")) return "담배";
  if (category.includes("구독")) return "구독";
  if (category.includes("대출")) return "대출";
  if (category.includes("적금")) return "적금";
  if (category.includes("교통")) return "교통";
  return "기타";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  addText: {
    color: planScreenColors.text,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
    marginTop: planScreenSpacing[2],
  },
  content: {
    alignSelf: "center",
    backgroundColor: planScreenColors.surface,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: planScreenColors.danger,
    borderRadius: planScreenRadius.sm,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: planScreenSpacing[3],
  },
  deleteButtonText: {
    color: planScreenColors.inverse,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
  },
  editMoney: {
    color: planScreenColors.brand,
    fontSize: planScreenTypography.labelS.fontSize,
    fontWeight: planScreenTypography.labelS.fontWeight,
  },
  editRow: {
    alignItems: "center",
    borderBottomColor: planScreenColors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 38,
  },
  editText: {
    color: planScreenColors.text,
    flex: 1,
    fontSize: planScreenTypography.labelS.fontSize,
    fontWeight: planScreenTypography.labelS.fontWeight,
  },
  errorText: {
    backgroundColor: planScreenColors.dangerSurface,
    borderColor: planScreenColors.dangerBorder,
    borderRadius: planScreenRadius.sm,
    borderWidth: 1,
    color: planScreenColors.danger,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
    marginHorizontal: planScreenSpacing[2],
    marginTop: planScreenSpacing[2],
    paddingHorizontal: planScreenSpacing[3],
    paddingVertical: planScreenSpacing[2],
  },
  goalCard: {
    alignItems: "center",
    backgroundColor: planScreenColors.surface,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.md,
    borderWidth: 1,
    ...planScreenElevation.low,
    flexDirection: "row",
    gap: planScreenSpacing[3],
    justifyContent: "space-between",
    marginHorizontal: planScreenSpacing[2],
    marginTop: planScreenSpacing[3],
    minHeight: 112,
    paddingHorizontal: planScreenSpacing[4],
    paddingVertical: planScreenSpacing[4],
  },
  goalCopy: {
    flex: 1,
    gap: planScreenSpacing[3],
    minWidth: 0,
  },
  goalMeta: {
    flex: 1,
    minWidth: 0,
  },
  goalMetaRow: {
    flexDirection: "row",
    gap: planScreenSpacing[5],
  },
  goalPercent: {
    color: planScreenColors.brand,
    fontSize: planScreenTypography.display.fontSize,
    fontWeight: planScreenTypography.display.fontWeight,
    minWidth: 116,
    textAlign: "right",
  },
  goalTitle: {
    color: planScreenColors.text,
    fontSize: planScreenTypography.titleM.fontSize,
    fontWeight: planScreenTypography.titleM.fontWeight,
  },
  inlineForm: {
    backgroundColor: planScreenColors.soft,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.sm,
    borderWidth: 1,
    gap: planScreenSpacing[2],
    marginTop: planScreenSpacing[2],
    padding: planScreenSpacing[3],
  },
  input: {
    backgroundColor: planScreenColors.surface,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.sm,
    borderWidth: 1,
    color: planScreenColors.text,
    fontSize: planScreenTypography.bodyM.fontSize,
    fontWeight: planScreenTypography.bodyM.fontWeight,
    minHeight: 48,
    paddingHorizontal: planScreenSpacing[3],
  },
  metaGreen: {
    color: planScreenColors.brand,
    fontSize: planScreenTypography.titleM.fontSize,
    fontWeight: planScreenTypography.titleM.fontWeight,
    marginTop: planScreenSpacing[1] / 2,
  },
  metaLabel: {
    color: planScreenColors.muted,
    fontSize: planScreenTypography.caption.fontSize,
    fontWeight: planScreenTypography.caption.fontWeight,
  },
  metaRed: {
    color: planScreenColors.danger,
    fontSize: planScreenTypography.titleM.fontSize,
    fontWeight: planScreenTypography.titleM.fontWeight,
    marginTop: planScreenSpacing[1] / 2,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: planScreenColors.brand,
    borderRadius: planScreenRadius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: planScreenSpacing[3],
  },
  saveButtonDisabled: {
    backgroundColor: planScreenColors.disabled,
  },
  saveButtonText: {
    color: planScreenColors.inverse,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
  },
  screen: {
    backgroundColor: planScreenColors.screen,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: planScreenColors.surface,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.md,
    borderWidth: 1,
    ...planScreenElevation.low,
    marginHorizontal: planScreenSpacing[2],
    marginTop: planScreenSpacing[3],
    paddingHorizontal: planScreenSpacing[3],
    paddingVertical: planScreenSpacing[3],
  },
  sectionSettingsIcon: {
    height: 28,
    tintColor: planScreenColors.text,
    width: 28,
  },
  sectionTitle: {
    color: planScreenColors.text,
    flex: 1,
    fontSize: planScreenTypography.titleM.fontSize,
    fontWeight: planScreenTypography.titleM.fontWeight,
    minWidth: 0,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: planScreenSpacing[2],
  },
  smallIconButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  emptyPlanBody: {
    color: planScreenColors.muted,
    fontSize: planScreenTypography.bodyS.fontSize,
    fontWeight: planScreenTypography.bodyS.fontWeight,
    lineHeight: planScreenTypography.bodyS.lineHeight,
    marginTop: planScreenSpacing[1],
  },
  emptyPlanList: {
    backgroundColor: planScreenColors.soft,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.md,
    borderWidth: 1,
    marginTop: planScreenSpacing[2],
    paddingHorizontal: planScreenSpacing[3],
    paddingVertical: planScreenSpacing[3],
  },
  emptyPlanTitle: {
    color: planScreenColors.text,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
  },
  planList: {
    gap: planScreenSpacing[2],
    marginTop: planScreenSpacing[2],
  },
  planListMain: {
    flex: 1,
    minWidth: 0,
  },
  planListMeta: {
    color: planScreenColors.muted,
    fontSize: planScreenTypography.caption.fontSize,
    fontWeight: planScreenTypography.caption.fontWeight,
    marginTop: planScreenSpacing[1] / 2,
  },
  planListMoney: {
    color: planScreenColors.brand,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
    marginLeft: planScreenSpacing[2],
  },
  planListRow: {
    alignItems: "center",
    backgroundColor: planScreenColors.surface,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: planScreenSpacing[3],
    paddingVertical: planScreenSpacing[2],
  },
  planListRowPressed: {
    backgroundColor: planScreenColors.soft,
  },
  planListTitle: {
    color: planScreenColors.text,
    fontSize: planScreenTypography.labelM.fontSize,
    fontWeight: planScreenTypography.labelM.fontWeight,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: planScreenSpacing[2],
  },
  summaryLabel: {
    color: planScreenColors.muted,
    fontSize: planScreenTypography.caption.fontSize,
    fontWeight: planScreenTypography.caption.fontWeight,
  },
  summaryTile: {
    backgroundColor: planScreenColors.soft,
    borderColor: planScreenColors.line,
    borderRadius: planScreenRadius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 74,
    minWidth: "47%",
    paddingHorizontal: planScreenSpacing[3],
    paddingVertical: planScreenSpacing[2],
  },
  summaryValue: {
    color: planScreenColors.text,
    fontSize: planScreenTypography.labelL.fontSize,
    fontWeight: planScreenTypography.labelL.fontWeight,
    lineHeight: planScreenTypography.labelL.lineHeight,
    marginTop: planScreenSpacing[1] / 2,
  },
  summaryValueBrand: {
    color: planScreenColors.brand,
  },
  summaryValueDanger: {
    color: planScreenColors.danger,
  },
});
