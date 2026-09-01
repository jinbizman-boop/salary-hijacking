/* eslint-disable @typescript-eslint/no-require-imports */
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  BudgetApiClient,
  BudgetApiResponse,
  DailyBudgetSaveRequest,
  VariableExpenseCategory,
  VariableExpenseCreateRequest,
  VariableExpenseUpdateRequest,
} from "../../../features/budget/types";
import type {
  PlanCommitmentsApiClient,
  PlanFixedExpensePaymentRequest,
  PlanSavingsDepositRequest,
} from "../../../features/plan/types";
import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";
import {
  createMobileBudgetApi,
  createMobilePlanCommitmentsApi,
} from "../../../shared/api/mobile-api";
import {
  markReleaseInteractionPerf,
  markReleasePerf,
} from "../../../shared/performance/release-perf";
import { createSecureStoreRuntime } from "../../../shared/storage/secure-store";
import {
  configurePayrollReminderStatePersistence,
  formatKrw,
  getKstParts,
  getPayrollReminderState,
  getVisiblePlanReminderItems,
  hydratePayrollReminderStateFromStorage,
  iconForCategory,
  isDailyBudgetItemCompletedOnDate,
  parseKrwInput,
  resetPayrollReminderStateForTests,
  updatePayrollReminderState,
  type DailyBudgetItem,
  type PayrollReminderState,
  type PlanItem,
  type ReminderCategory,
  type VariableExpenseItem,
} from "../../payroll-reminders/interactive-state";

const designSystem = salaryHijackingDesignSystem;
const salaryScreenColors = {
  brand: designSystem.colors.brand.primary,
  brandSoft: designSystem.colors.brand.primarySoft,
  brandSurface: designSystem.colors.brand.surface,
  dangerBorder: designSystem.colors.semantic.dangerSoft,
  dangerSurface: designSystem.colors.semantic.dangerSoft,
  hero: designSystem.colors.brand.secondary,
  info: designSystem.colors.semantic.info,
  inverse: designSystem.colors.text.inverse,
  line: designSystem.colors.border.default,
  muted: designSystem.colors.text.secondary,
  money: designSystem.colors.semantic.warning,
  paid: designSystem.colors.text.disabled,
  screen: designSystem.colors.surface.subtle,
  soft: designSystem.colors.surface.soft,
  surface: designSystem.colors.surface.default,
  text: designSystem.colors.text.primary,
  warning: designSystem.colors.semantic.warningStrong,
  danger: designSystem.colors.semantic.dangerStrong,
} as const;
const salaryScreenSpacing = designSystem.spacing;
const salaryScreenRadius = designSystem.radius;
const salaryScreenTypography = designSystem.typography;
const salaryScreenElevation = designSystem.elevation;
const salaryCoinsIcon =
  require("../../../shared/assets/icons/money/coins.png") as ImageSourcePropType;
const salaryAlarmIcon =
  require("../../../shared/assets/icons/common/alarm.png") as ImageSourcePropType;
const salarySettingsIcon =
  require("../../../shared/assets/icons/common/settings.png") as ImageSourcePropType;
const salaryBrandLogo =
  require("../../../shared/assets/images/brand/salary-hijacking-platform-logo.png") as ImageSourcePropType;
const SALARY_SAVE_ERROR =
  "\uC11C\uBC84 \uC800\uC7A5\uC774 \uC2E4\uD328\uD574 \uC9C0\uCD9C\uC744 \uBC18\uC601\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
let cachedPayrollReminderSecureStore: ReturnType<
  typeof createSecureStoreRuntime
> | null = null;

type ItemDraft = Readonly<{
  amount: string;
  category: string;
  content: string;
}>;

export type SalaryHomePreviewVariant =
  | "default"
  | "no-plan"
  | "compact"
  | "detailed"
  | "offline";

export type SalaryHomeScreenProps = Readonly<{
  displayName?: string | undefined;
  onOpenNotifications?: (() => void) | undefined;
  onOpenSettings?: (() => void) | undefined;
  planCommitmentsApi?:
    | Partial<
        Pick<
          PlanCommitmentsApiClient,
          "recordFixedExpensePayment" | "recordSavingsDeposit"
        >
      >
    | null
    | undefined;
  variableExpenseApi?:
    | Partial<
        Pick<
          BudgetApiClient,
          | "createVariableExpense"
          | "deleteVariableExpense"
          | "saveDailyBudget"
          | "updateVariableExpense"
        >
      >
    | null
    | undefined;
  previewVariant?: SalaryHomePreviewVariant | undefined;
}>;

export function resetSalaryHomePreviewCacheForTests(): void {
  resetPayrollReminderStateForTests();
}

export function SalaryHomeScreen({
  displayName = "\uC0AC\uC6A9\uC790",
  onOpenNotifications,
  onOpenSettings,
  planCommitmentsApi,
  previewVariant = "default",
  variableExpenseApi,
}: SalaryHomeScreenProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const variableFormTopRef = useRef(0);
  const contentWidth = Math.min(width, 430);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState(() =>
    createSalaryHomeVariantState(getPayrollReminderState(), previewVariant),
  );
  const [dailySettingsOpen, setDailySettingsOpen] = useState(false);
  const [dailyEditorOpen, setDailyEditorOpen] = useState(false);
  const [editingDailyId, setEditingDailyId] = useState<string | null>(null);
  const [dailyDraft, setDailyDraft] = useState<ItemDraft>({
    amount: "",
    category: "",
    content: "",
  });
  const [variableFormOpen, setVariableFormOpen] = useState(false);
  const variableSaveInFlightRef = useRef(false);
  const setVariableSaveInFlight = React.useCallback((value: boolean) => {
    variableSaveInFlightRef.current = value;
  }, []);
  const [editingVariableId, setEditingVariableId] = useState<string | null>(
    null,
  );
  const [variableDraft, setVariableDraft] = useState<ItemDraft>({
    amount: "",
    category: "",
    content: "",
  });
  const [variableSavePending, setVariableSavePending] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const serverVariableExpenseApi = useMemo(
    () =>
      variableExpenseApi ??
      (process.env.JEST_WORKER_ID ? null : createMobileBudgetApi()),
    [variableExpenseApi],
  );
  const serverPlanCommitmentsApi = useMemo(
    () =>
      planCommitmentsApi ??
      (process.env.JEST_WORKER_ID ? null : createMobilePlanCommitmentsApi()),
    [planCommitmentsApi],
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    markReleasePerf("route.home.shell_interactive", { route: "salary" });
  }, []);

  useEffect(() => {
    let mounted = true;
    const current = getPayrollReminderState();
    configurePayrollReminderStatePersistence(getPayrollReminderSecureStore());
    if (process.env.JEST_WORKER_ID || previewVariant !== "default") {
      return undefined;
    }
    void hydratePayrollReminderStateFromStorage().then((restored) => {
      if (mounted && restored !== current) setState(restored);
    });
    return () => {
      mounted = false;
    };
  }, [previewVariant]);

  const kst = useMemo(() => getKstParts(), [tick]);
  const salaryCycle = useMemo(
    () => getSalaryCyclePaydayLabels(new Date()),
    [tick],
  );
  const dailyItemsForToday = useMemo(
    () =>
      state.dailyItems.map((item) => ({
        ...item,
        completed: isDailyBudgetItemCompletedOnDate(item, kst.dateKey),
      })),
    [kst.dateKey, state.dailyItems],
  );
  const dailySpent = dailyItemsForToday
    .filter((item) => item.completed)
    .reduce((total, item) => total + item.amount, 0);
  const variableTotal = state.variableExpenses.reduce(
    (total, item) => total + item.amount,
    0,
  );
  const dailyRemaining = Math.max(0, state.dailyLimit - dailySpent);
  const currentSpent =
    state.financialSummary.fixedExpenseBaseline + dailySpent + variableTotal;
  const currentHijacked = Math.max(
    0,
    state.financialSummary.receivedAmount - currentSpent,
  );
  const visiblePlanReminderItems = useMemo(
    () => getVisiblePlanReminderItems(state.planItems, kst.monthKey, kst.day),
    [kst.day, kst.monthKey, state.planItems],
  );

  function sync(next: ReturnType<typeof getPayrollReminderState>): void {
    setState(next);
  }

  async function saveDailyLimit(value: string): Promise<void> {
    setSalaryError(null);
    const dailyLimit = parseKrwInput(value);
    if (dailyLimit <= 0) return;
    if (serverVariableExpenseApi?.saveDailyBudget !== undefined) {
      try {
        sync(
          applyDailyBudgetSnapshot(
            await serverVariableExpenseApi.saveDailyBudget(
              buildDailyBudgetSaveRequest(dailyLimit),
            ),
          ),
        );
        return;
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
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

  function openDailyEditor(item?: DailyBudgetItem): void {
    setSalaryError(null);
    setDailyEditorOpen(true);
    setEditingDailyId(item?.id ?? null);
    setDailyDraft({
      amount: item ? String(item.amount) : "",
      category: item?.category ?? "",
      content: item?.content ?? "",
    });
  }

  async function saveDailyItem(): Promise<void> {
    setSalaryError(null);
    const amount = parseKrwInput(dailyDraft.amount);
    const content = dailyDraft.content.trim();
    if (amount <= 0 || !content) return;
    const category = normalizeCategory(dailyDraft.category);
    const currentItem = state.dailyItems.find(
      (item) => item.id === editingDailyId,
    );
    if (
      editingDailyId !== null &&
      currentItem?.completed === true &&
      serverVariableExpenseApi?.updateVariableExpense !== undefined
    ) {
      try {
        const saved = await serverVariableExpenseApi.updateVariableExpense(
          editingDailyId,
          buildVariableExpenseUpdateRequest({ amount, category, content }),
        );
        sync(
          replaceDailyBudgetItem(editingDailyId, {
            amount: saved.netAmountMinor,
            category: normalizeCategory(saved.merchantName ?? category),
            completed: true,
            content: saved.title,
            id: saved.expenseId,
            usedDateKey: kst.dateKey,
          }),
        );
        setDailyDraft({ amount: "", category: "", content: "" });
        setDailyEditorOpen(false);
        setEditingDailyId(null);
        return;
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
    }
    const next = updatePayrollReminderState((previous) => {
      const previousItem = previous.dailyItems.find(
        (item) => item.id === editingDailyId,
      );
      const nextItem: DailyBudgetItem = {
        amount,
        category,
        completed: previousItem
          ? isDailyBudgetItemCompletedOnDate(previousItem, kst.dateKey)
          : false,
        content,
        id: editingDailyId ?? `daily-${Date.now()}`,
        ...(previousItem &&
        isDailyBudgetItemCompletedOnDate(previousItem, kst.dateKey)
          ? { usedDateKey: kst.dateKey }
          : {}),
      };
      return {
        ...previous,
        dailyItems: editingDailyId
          ? previous.dailyItems.map((item) =>
              item.id === editingDailyId ? nextItem : item,
            )
          : [...previous.dailyItems, nextItem],
      };
    });
    setDailyDraft({ amount: "", category: "", content: "" });
    setDailyEditorOpen(false);
    setEditingDailyId(null);
    sync(next);
  }

  async function toggleDailyItem(item: DailyBudgetItem): Promise<void> {
    setSalaryError(null);
    if (!item.completed && serverVariableExpenseApi?.createVariableExpense) {
      try {
        const saved = await serverVariableExpenseApi.createVariableExpense(
          buildVariableExpenseCreateRequest({
            amount: item.amount,
            category: item.category,
            content: item.content,
          }),
        );
        sync(
          replaceDailyBudgetItem(item.id, {
            amount: saved.netAmountMinor,
            category: normalizeCategory(saved.merchantName ?? item.category),
            completed: true,
            content: saved.title,
            id: saved.expenseId,
            usedDateKey: kst.dateKey,
          }),
        );
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
      return;
    }

    if (item.completed && serverVariableExpenseApi?.deleteVariableExpense) {
      try {
        await serverVariableExpenseApi.deleteVariableExpense(item.id, {
          reason: "USER_REVERTED_DAILY_BUDGET_COMPLETION",
        });
        const { usedDateKey: _usedDateKey, ...scheduledItem } = item;
        sync(
          replaceDailyBudgetItem(item.id, {
            ...scheduledItem,
            completed: false,
          }),
        );
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
      return;
    }

    sync(
      updatePayrollReminderState((previous) => ({
        ...previous,
        dailyItems: previous.dailyItems.map((row) =>
          row.id === item.id
            ? !item.completed
              ? {
                  ...row,
                  completed: true,
                  usedDateKey: kst.dateKey,
                }
              : (() => {
                  const { usedDateKey: _usedDateKey, ...scheduledRow } = row;
                  return {
                    ...scheduledRow,
                    completed: false,
                  };
                })()
            : row,
        ),
      })),
    );
  }

  async function deleteDailyItem(item: DailyBudgetItem): Promise<void> {
    setSalaryError(null);
    if (item.completed && serverVariableExpenseApi?.deleteVariableExpense) {
      try {
        await serverVariableExpenseApi.deleteVariableExpense(item.id, {
          reason: "USER_DELETED_DAILY_BUDGET_DETAIL",
        });
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
    }

    if (editingDailyId === item.id) {
      setDailyDraft({ amount: "", category: "", content: "" });
      setDailyEditorOpen(false);
      setEditingDailyId(null);
    }
    sync(removeDailyBudgetItem(item.id));
  }

  async function completePlanReminder(item: PlanItem): Promise<void> {
    setSalaryError(null);
    if (
      item.section === "saving" &&
      serverPlanCommitmentsApi?.recordSavingsDeposit !== undefined
    ) {
      try {
        await serverPlanCommitmentsApi.recordSavingsDeposit(
          item.id,
          buildSavingsDepositRequest(item, kst.monthKey),
        );
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
    } else if (
      item.section === "fixed" &&
      serverPlanCommitmentsApi?.recordFixedExpensePayment !== undefined
    ) {
      try {
        await serverPlanCommitmentsApi.recordFixedExpensePayment(
          item.id,
          buildFixedExpensePaymentRequest(item, kst.monthKey),
        );
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
    }

    sync(
      updatePayrollReminderState((previous) => ({
        ...previous,
        planItems: previous.planItems.map((row) =>
          row.id === item.id ? { ...row, usedMonthKey: kst.monthKey } : row,
        ),
      })),
    );
  }

  async function saveVariableExpense(): Promise<void> {
    setSalaryError(null);
    if (variableSaveInFlightRef.current) return;
    const amount = parseKrwInput(variableDraft.amount);
    const content = variableDraft.content.trim();
    if (amount <= 0 || !content) return;
    setVariableSaveInFlight(true);
    setVariableSavePending(true);
    try {
      const category = variableDraft.category.trim() || "변동 지출";

      if (editingVariableId !== null) {
        const localExpense: VariableExpenseItem = {
          amount,
          category,
          content,
          id: editingVariableId,
        };
        if (serverVariableExpenseApi?.updateVariableExpense !== undefined) {
          try {
            const saved = await serverVariableExpenseApi.updateVariableExpense(
              editingVariableId,
              buildVariableExpenseUpdateRequest({ amount, category, content }),
            );
            sync(
              replaceVariableExpense({
                amount: saved.netAmountMinor,
                category,
                content: saved.title,
                id: saved.expenseId,
              }),
            );
            closeVariableForm();
            return;
          } catch {
            setSalaryError(SALARY_SAVE_ERROR);
            return;
          }
        }
        sync(replaceVariableExpense(localExpense));
        closeVariableForm();
        return;
      }

      const localExpense: VariableExpenseItem = {
        amount,
        category,
        content,
        id: `variable-${Date.now()}-${state.variableExpenses.length}`,
      };
      if (serverVariableExpenseApi?.createVariableExpense !== undefined) {
        try {
          const saved = await serverVariableExpenseApi.createVariableExpense(
            buildVariableExpenseCreateRequest({ amount, category, content }),
          );
          sync(
            appendVariableExpense({
              amount: saved.netAmountMinor,
              category,
              content: saved.title,
              id: saved.expenseId,
            }),
          );
          closeVariableForm();
          return;
        } catch {
          setSalaryError(SALARY_SAVE_ERROR);
          return;
        }
      }
      sync(appendVariableExpense(localExpense));
      closeVariableForm();
    } finally {
      setVariableSaveInFlight(false);
      setVariableSavePending(false);
    }
  }

  async function saveVariableExpenseCreateOnly(): Promise<void> {
    setSalaryError(null);
    const amount = parseKrwInput(variableDraft.amount);
    const content = variableDraft.content.trim();
    if (amount <= 0 || !content) return;
    const category = variableDraft.category.trim() || "변동 지출";
    const localExpense: VariableExpenseItem = {
      amount,
      category,
      content,
      id: `variable-${Date.now()}-${state.variableExpenses.length}`,
    };
    if (serverVariableExpenseApi?.createVariableExpense !== undefined) {
      try {
        const saved = await serverVariableExpenseApi.createVariableExpense(
          buildVariableExpenseCreateRequest({
            amount,
            category,
            content,
          }),
        );
        sync(
          appendVariableExpense({
            amount: saved.netAmountMinor,
            category,
            content: saved.title,
            id: saved.expenseId,
          }),
        );
        setVariableDraft({ amount: "", category: "", content: "" });
        setVariableFormOpen(false);
        return;
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
    }
    sync(appendVariableExpense(localExpense));
    setVariableDraft({ amount: "", category: "", content: "" });
    setVariableFormOpen(false);
  }

  function openVariableEditor(item?: VariableExpenseItem): void {
    setSalaryError(null);
    setEditingVariableId(item?.id ?? null);
    setVariableDraft({
      amount: item ? String(item.amount) : "",
      category: item?.category ?? "",
      content: item?.content ?? "",
    });
    setVariableFormOpen(true);
    scrollVariableFormIntoView();
  }

  async function deleteVariableExpense(
    item: VariableExpenseItem,
  ): Promise<void> {
    setSalaryError(null);
    if (serverVariableExpenseApi?.deleteVariableExpense !== undefined) {
      try {
        await serverVariableExpenseApi.deleteVariableExpense(item.id, {
          reason: "USER_REQUESTED_DELETE",
        });
        sync(removeVariableExpense(item.id));
      } catch {
        setSalaryError(SALARY_SAVE_ERROR);
        return;
      }
      return;
    }
    sync(removeVariableExpense(item.id));
  }

  function closeVariableForm(): void {
    setVariableDraft({ amount: "", category: "", content: "" });
    setEditingVariableId(null);
    setVariableFormOpen(false);
  }

  void saveVariableExpenseCreateOnly;

  function scrollVariableFormIntoView(): void {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      style={styles.screen}
    >
      <ScrollView
        ref={scrollRef}
        accessibilityLabel="급여납치 급여 메인 화면"
        automaticallyAdjustKeyboardInsets
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 340,
            paddingTop: insets.top,
            width: contentWidth,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader
          onOpenNotifications={onOpenNotifications}
          onOpenSettings={onOpenSettings}
        />

        {salaryError ? (
          <Text
            accessibilityRole="alert"
            allowFontScaling={false}
            style={styles.errorText}
          >
            {salaryError}
          </Text>
        ) : null}

        <SalaryHomeVariantBanner variant={previewVariant} />

        <ProtectedMoneyHeroCard>
          <View style={styles.heroLeft}>
            <Text allowFontScaling={false} style={styles.heroDate}>
              {kst.text}
            </Text>
            <Text allowFontScaling={false} style={styles.heroGreeting}>
              {displayName}님, 오늘도 지켜냈어요
            </Text>
            <Text allowFontScaling={false} style={styles.heroTitle}>
              지켜낸 돈
            </Text>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={salaryCoinsIcon}
              style={styles.heroCoin}
            />
            <Text allowFontScaling={false} style={styles.heroSub}>
              누적 납치금액
            </Text>
            <Text allowFontScaling={false} style={styles.heroAmount}>
              {formatKrw(state.financialSummary.cumulativeHijacked)}
            </Text>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.paydayRow}>
              <PaydayCard
                label="이번 달 급여일"
                value={salaryCycle.currentLabel}
              />
              <PaydayCard
                danger
                label="다음 달 급여일"
                value={salaryCycle.nextLabel}
              />
            </View>
            <HeroMetric
              label="수령 금액"
              value={formatKrw(state.financialSummary.receivedAmount)}
            />
            <HeroMetric label="지출 금액" value={formatKrw(currentSpent)} />
            <HeroMetric
              emphasized
              label="저축 금액"
              value={formatKrw(currentHijacked)}
            />
          </View>
        </ProtectedMoneyHeroCard>

        <DailySafeToSpendCard>
          <View style={styles.titleRow}>
            <Text allowFontScaling={false} style={styles.cardTitle}>
              오늘 사용 가능 금액
            </Text>
            <Pressable
              accessibilityLabel="일일 사용 예산 설정하기"
              accessibilityRole="button"
              onPress={() => setDailySettingsOpen((open) => !open)}
              style={styles.smallActionButton}
            >
              <Text allowFontScaling={false} style={styles.smallActionText}>
                설정
              </Text>
            </Pressable>
          </View>
          <View style={styles.budgetSummary}>
            <BudgetSummary
              label="설정 금액"
              value={formatKrw(state.dailyLimit)}
            />
            <BudgetSummary label="사용 금액" value={formatKrw(dailySpent)} />
            <BudgetSummary
              label="남은 금액"
              value={formatKrw(dailyRemaining)}
            />
          </View>
          {dailySettingsOpen ? (
            <View style={styles.inlineForm}>
              <Text allowFontScaling={false} style={styles.formCaption}>
                일일 사용 총 금액과 세부 항목을 수정합니다
              </Text>
              <TextInput
                accessibilityLabel="일일 사용 총 금액"
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={(value) => {
                  void saveDailyLimit(value);
                }}
                placeholder="일일 사용 총 금액"
                style={styles.input}
                value={String(state.dailyLimit)}
              />
              <Pressable
                accessibilityLabel="세부 항목 추가"
                accessibilityRole="button"
                onPress={() => openDailyEditor()}
                style={styles.addInlineButton}
              >
                <Text allowFontScaling={false} style={styles.addInlineText}>
                  세부 항목 추가
                </Text>
              </Pressable>
              {state.dailyItems.map((item) => (
                <View key={`edit-${item.id}`} style={styles.editRow}>
                  <Pressable
                    accessibilityLabel={`${item.content} 수정하기`}
                    accessibilityRole="button"
                    onPress={() => openDailyEditor(item)}
                    style={styles.editRowMain}
                  >
                    <Text allowFontScaling={false} style={styles.editRowText}>
                      수정: {item.content}
                    </Text>
                    <Text allowFontScaling={false} style={styles.editRowMoney}>
                      금액 {formatKrw(item.amount)}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`${item.content} 삭제하기`}
                    accessibilityRole="button"
                    onPress={() => void deleteDailyItem(item)}
                    style={[styles.tableActionButton, styles.tableDeleteButton]}
                  >
                    <Text
                      allowFontScaling={false}
                      style={styles.tableActionText}
                    >
                      삭제
                    </Text>
                  </Pressable>
                </View>
              ))}
              {dailyEditorOpen ? (
                <EditableItemForm
                  amountLabel="일일 항목 금액"
                  categoryLabel="일일 항목 카테고리"
                  contentLabel="일일 항목 내용"
                  draft={dailyDraft}
                  saveLabel="일일 항목 저장"
                  onChange={setDailyDraft}
                  onSave={() => {
                    void saveDailyItem();
                  }}
                />
              ) : null}
            </View>
          ) : null}
          {dailyItemsForToday.map((item) => (
            <DailyBudgetRow
              item={item}
              key={item.id}
              onToggle={() => void toggleDailyItem(item)}
            />
          ))}
        </DailySafeToSpendCard>

        <UpcomingFixedExpenseSection>
          <Text allowFontScaling={false} style={styles.cardTitle}>
            예정 고정지출
          </Text>
          {visiblePlanReminderItems.length === 0 ? (
            <SalaryEmptyState
              body="계획 탭에서 급여일과 고정지출을 설정해 주세요."
              title="아직 급여 계획이 없어요"
            />
          ) : null}
          {visiblePlanReminderItems.map((item) => (
            <PlanReminderRow
              key={item.id}
              item={item}
              kstDay={kst.day}
              onComplete={() => void completePlanReminder(item)}
            />
          ))}
        </UpcomingFixedExpenseSection>

        <VariableExpenseSection>
          <View style={styles.variableHeader}>
            <Text allowFontScaling={false} style={styles.cardTitle}>
              변동지출
            </Text>
            <View
              accessibilityLabel={`변동 지출 합계 ${formatKrw(variableTotal)}`}
              style={styles.variableTotal}
            >
              <Text allowFontScaling={false} style={styles.variableTotalLabel}>
                사용 금액 합계
              </Text>
              <Text allowFontScaling={false} style={styles.variableTotalValue}>
                {formatKrw(variableTotal)}
              </Text>
            </View>
          </View>
          {variableFormOpen ? (
            <View
              onLayout={(event) => {
                variableFormTopRef.current = event.nativeEvent.layout.y;
              }}
              style={styles.variableForm}
            >
              <Text allowFontScaling={false} style={styles.formCaption}>
                금일 사용한 변동 지출을 바로 저장합니다
              </Text>
              <TextInput
                accessibilityLabel="변동 지출 항목 입력"
                onChangeText={(category) =>
                  setVariableDraft((previous) => ({ ...previous, category }))
                }
                onFocus={scrollVariableFormIntoView}
                placeholder="항목"
                style={styles.input}
                testID="variable-expense-category-input"
                value={variableDraft.category}
              />
              <TextInput
                accessibilityLabel="변동 지출 세부 내용 입력"
                onChangeText={(content) =>
                  setVariableDraft((previous) => ({ ...previous, content }))
                }
                onFocus={scrollVariableFormIntoView}
                placeholder="세부 내용"
                style={styles.input}
                testID="variable-expense-content-input"
                value={variableDraft.content}
              />
              <TextInput
                accessibilityLabel="변동 지출 금액 입력"
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={(amount) =>
                  setVariableDraft((previous) => ({ ...previous, amount }))
                }
                onFocus={scrollVariableFormIntoView}
                placeholder="금액"
                style={styles.input}
                testID="variable-expense-amount-input"
                value={variableDraft.amount}
              />
              <Pressable
                accessibilityLabel="변동 지출 저장"
                accessibilityRole="button"
                accessibilityState={{ disabled: variableSavePending }}
                disabled={variableSavePending}
                onPress={saveVariableExpense}
                style={[
                  styles.saveButton,
                  variableSavePending ? styles.disabledButton : null,
                ]}
                testID="variable-expense-save-button"
              >
                <Text allowFontScaling={false} style={styles.saveButtonText}>
                  {variableSavePending ? "저장 중" : "저장"}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <VariableExpenseTable
            onDelete={deleteVariableExpense}
            onEdit={openVariableEditor}
            rows={state.variableExpenses}
          />
          <Pressable
            accessibilityLabel="변동 지출 추가하기"
            accessibilityRole="button"
            onPressIn={(event) =>
              markReleaseInteractionPerf(
                "interaction.quick_expense.press",
                event,
              )
            }
            onPress={() => {
              const nextOpen = !variableFormOpen;
              if (nextOpen) openVariableEditor();
              else closeVariableForm();
            }}
          >
            <Text allowFontScaling={false} style={styles.addText}>
              +추가하기
            </Text>
          </Pressable>
        </VariableExpenseSection>

        <FinanceInsightSection
          dailyRemaining={dailyRemaining}
          protectedAmount={currentHijacked}
          variableTotal={variableTotal}
        />

        <SponsoredSlot />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function appendVariableExpense(
  expense: VariableExpenseItem,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    variableExpenses: [...previous.variableExpenses, expense],
  }));
}

function replaceDailyBudgetItem(
  currentItemId: string,
  item: DailyBudgetItem,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    dailyItems: previous.dailyItems.map((row) =>
      row.id === currentItemId ? item : row,
    ),
  }));
}

function removeDailyBudgetItem(
  itemId: string,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    dailyItems: previous.dailyItems.filter((row) => row.id !== itemId),
  }));
}

function replaceVariableExpense(
  expense: VariableExpenseItem,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    variableExpenses: previous.variableExpenses.map((row) =>
      row.id === expense.id ? expense : row,
    ),
  }));
}

function removeVariableExpense(
  expenseId: string,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    variableExpenses: previous.variableExpenses.filter(
      (row) => row.id !== expenseId,
    ),
  }));
}

function createSalaryHomeVariantState(
  base: PayrollReminderState,
  variant: SalaryHomePreviewVariant,
): PayrollReminderState {
  if (variant !== "no-plan") return base;
  return {
    ...base,
    dailyItems: [],
    dailyLimit: 0,
    financialSummary: {
      cumulativeHijacked: 0,
      fixedExpenseBaseline: 0,
      receivedAmount: 0,
    },
    planItems: [],
    variableExpenses: [],
  };
}

function SalaryHomeVariantBanner({
  variant,
}: Readonly<{ variant: SalaryHomePreviewVariant }>): React.ReactElement | null {
  if (variant === "default" || variant === "no-plan") return null;
  const content =
    variant === "offline"
      ? {
          body: "저장된 급여 데이터를 안전하게 보여드리고 있어요.",
          title: "오프라인 미리보기",
        }
      : variant === "compact"
        ? {
            body: "핵심 금액만 빠르게 확인합니다.",
            title: "간단 보기",
          }
        : {
            body: "고정 지출, 일일 예산, 변동 지출을 함께 확인합니다.",
            title: "상세 보기",
          };

  return (
    <View accessibilityLabel={content.title} style={styles.variantBanner}>
      <Text allowFontScaling={false} style={styles.variantTitle}>
        {content.title}
      </Text>
      <Text allowFontScaling={false} style={styles.variantBody}>
        {content.body}
      </Text>
    </View>
  );
}

function SalaryEmptyState({
  body,
  title,
}: Readonly<{ body: string; title: string }>): React.ReactElement {
  return (
    <View accessibilityLabel={title} style={styles.emptyState}>
      <Text allowFontScaling={false} style={styles.emptyTitle}>
        {title}
      </Text>
      <Text allowFontScaling={false} style={styles.emptyBody}>
        {body}
      </Text>
    </View>
  );
}

function BrandHeader({
  onOpenNotifications,
  onOpenSettings,
}: Readonly<{
  onOpenNotifications?: (() => void) | undefined;
  onOpenSettings?: (() => void) | undefined;
}>): React.ReactElement {
  return (
    <View accessibilityLabel="급여납치 홈 헤더" style={styles.brandHeader}>
      <View style={styles.brandIdentity}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="급여납치 로고"
          resizeMode="contain"
          source={salaryBrandLogo}
          style={styles.brandLogo}
        />
        <View style={styles.brandCopy}>
          <Text allowFontScaling={false} style={styles.brandName}>
            Salary Hijacking
          </Text>
          <Text allowFontScaling={false} style={styles.brandKorean}>
            SALARY HIJACKING
          </Text>
        </View>
      </View>
      <View style={styles.brandActions}>
        <Pressable
          accessibilityLabel="알림 화면 열기"
          accessibilityRole="button"
          hitSlop={designSystem.spacing[3]}
          onPress={onOpenNotifications}
          style={styles.headerActionButton}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={salaryAlarmIcon}
            style={styles.headerActionIcon}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="설정 화면 열기"
          accessibilityRole="button"
          hitSlop={designSystem.spacing[3]}
          onPress={onOpenSettings}
          style={styles.headerActionButton}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={salarySettingsIcon}
            style={styles.headerActionIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

function ProtectedMoneyHeroCard({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <View style={styles.heroPanel}>{children}</View>;
}

function DailySafeToSpendCard({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <View style={styles.card}>{children}</View>;
}

function UpcomingFixedExpenseSection({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <View style={styles.card}>{children}</View>;
}

function VariableExpenseSection({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <View style={styles.card}>{children}</View>;
}

function buildFixedExpensePaymentRequest(
  item: PlanItem,
  monthKey: string,
): PlanFixedExpensePaymentRequest {
  return {
    amountMinor: item.amount,
    idempotencyKey: `fixed-payment-${item.id}-${monthKey}`,
    memo: "Salary Home fixed reminder completed",
    paidAt: new Date().toISOString(),
  };
}

function buildSavingsDepositRequest(
  item: PlanItem,
  monthKey: string,
): PlanSavingsDepositRequest {
  return {
    amountMinor: item.amount,
    idempotencyKey: `savings-deposit-${item.id}-${monthKey}`,
    memo: "Salary Home savings reminder completed",
    occurredAt: new Date().toISOString(),
  };
}

function getSalaryCyclePaydayLabels(
  now = new Date(),
  paydayDay = 25,
): { currentLabel: string; nextLabel: string } {
  const { day, month, year } = getKstParts(now);
  const currentStartMonth =
    day >= paydayDay ? { month, year } : addMonths(year, month, -1);
  const currentStartDay = clampMonthDay(
    currentStartMonth.year,
    currentStartMonth.month,
    paydayDay,
  );
  const nextStartMonth = addMonths(
    currentStartMonth.year,
    currentStartMonth.month,
    1,
  );
  const nextStartDay = clampMonthDay(
    nextStartMonth.year,
    nextStartMonth.month,
    paydayDay,
  );
  const nextCycleEnd = addCalendarDays(
    nextStartMonth.year,
    nextStartMonth.month,
    nextStartDay,
    -1,
  );

  return {
    currentLabel: formatMonthDay(currentStartMonth.month, currentStartDay),
    nextLabel: formatMonthDay(nextCycleEnd.month, nextCycleEnd.day),
  };
}

function addMonths(
  year: number,
  month: number,
  delta: number,
): { month: number; year: number } {
  const zeroBased = month - 1 + delta;
  const nextYear = year + Math.floor(zeroBased / 12);
  const nextMonth = ((zeroBased % 12) + 12) % 12;
  return { month: nextMonth + 1, year: nextYear };
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { day: number; month: number; year: number } {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function clampMonthDay(year: number, month: number, day: number): number {
  return Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate());
}

function formatMonthDay(month: number, day: number): string {
  return `${month}월 ${day}일`;
}

function buildDailyBudgetSaveRequest(
  plannedAmountMinor: number,
): DailyBudgetSaveRequest {
  const { day, month, year } = getKstParts();
  return {
    budgetDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    budgetId: null,
    memo: null,
    plannedAmountMinor,
  };
}

function buildVariableExpenseCreateRequest({
  amount,
  category,
  content,
}: Readonly<{
  amount: number;
  category: string;
  content: string;
}>): VariableExpenseCreateRequest {
  const now = new Date();
  return {
    amountMinor: amount,
    category: toServerVariableExpenseCategory(category),
    dailyBudgetId: null,
    idempotencyKey: `mobile-variable-${now.getTime()}-${amount}`,
    memo: null,
    merchantName: category,
    paymentMethod: "ETC",
    receiptAttachmentId: null,
    source: "MANUAL",
    spentAt: now.toISOString(),
    tags: [],
    title: content,
  };
}

function applyDailyBudgetSnapshot(
  saved: BudgetApiResponse,
): ReturnType<typeof getPayrollReminderState> {
  return updatePayrollReminderState((previous) => ({
    ...previous,
    dailyLimit: saved.data.snapshot.dailyLimit,
  }));
}

function buildVariableExpenseUpdateRequest({
  amount,
  category,
  content,
}: Readonly<{
  amount: number;
  category: string;
  content: string;
}>): VariableExpenseUpdateRequest {
  return {
    amountMinor: amount,
    category: toServerVariableExpenseCategory(category),
    dailyBudgetId: null,
    memo: null,
    merchantName: category,
    paymentMethod: "ETC",
    receiptAttachmentId: null,
    tags: [],
    title: content,
  };
}

function toServerVariableExpenseCategory(
  category: string,
): VariableExpenseCategory {
  const normalized = category.trim().toLowerCase();
  if (/(식|밥|점심|저녁|아침|음식|김밥|국밥|버거|라면)/u.test(normalized))
    return "MEAL";
  if (/(커피|카페|아메리카노|라떼)/u.test(normalized)) return "CAFE";
  if (/(교통|택시|버스|지하철|기차)/u.test(normalized)) return "TRANSPORT";
  if (/(장보기|마트|식료품)/u.test(normalized)) return "GROCERIES";
  if (/(쇼핑|구매|옷|신발)/u.test(normalized)) return "SHOPPING";
  if (/(건강|병원|약|운동)/u.test(normalized)) return "HEALTH";
  if (/(게임|넷플릭스|유튜브|구독|콘텐츠|영화)/u.test(normalized))
    return "CONTENT";
  if (/(교육|강의|책|독서)/u.test(normalized)) return "EDUCATION";
  if (/(가족|부모|자녀)/u.test(normalized)) return "FAMILY";
  if (/(선물|축하)/u.test(normalized)) return "GIFT";
  if (/(여행|숙박|항공)/u.test(normalized)) return "TRAVEL";
  return "ETC";
}

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}

function PaydayCard({
  danger = false,
  label,
  value,
}: Readonly<{ danger?: boolean; label: string; value: string }>) {
  return (
    <View style={styles.paydayCard}>
      <Text allowFontScaling={false} style={styles.paydayLabel}>
        {label}
      </Text>
      <Text
        allowFontScaling={false}
        style={[styles.paydayValue, danger ? styles.paydayDanger : null]}
      >
        {value}
      </Text>
    </View>
  );
}

function HeroMetric({
  emphasized = false,
  label,
  value,
}: Readonly<{ emphasized?: boolean; label: string; value: string }>) {
  return (
    <View style={[styles.metricBox, emphasized ? styles.metricEmphasis : null]}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.metricLabel}
      >
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.metricValue}
      >
        {value}
      </Text>
    </View>
  );
}

function SponsoredSlot(): React.ReactElement {
  return (
    <View accessibilityLabel="Sponsored 광고 영역" style={styles.googleAd}>
      <View style={styles.adLeft}>
        <Text allowFontScaling={false} style={styles.adSmall}>
          Sponsored
        </Text>
        <Text allowFontScaling={false} style={styles.adTitle}>
          생활비 혜택
        </Text>
        <Text allowFontScaling={false} style={styles.adText}>
          금융 데이터와 분리된 문맥형 안내
        </Text>
      </View>
      <View style={styles.adDish}>
        <Text allowFontScaling={false} style={styles.adDiscount}>
          10%
        </Text>
      </View>
    </View>
  );
}

function FinanceInsightSection({
  dailyRemaining,
  protectedAmount,
  variableTotal,
}: Readonly<{
  dailyRemaining: number;
  protectedAmount: number;
  variableTotal: number;
}>): React.ReactElement {
  const performanceCopy =
    protectedAmount > variableTotal
      ? "지켜낸 금액이 변동지출보다 커서 흐름이 안정적이에요."
      : "변동지출이 커지고 있어요. 빠른 추가 후 계획을 다시 맞춰보세요.";
  const riskCopy =
    dailyRemaining > 0
      ? `오늘은 ${formatKrw(dailyRemaining)}까지 안전하게 사용할 수 있어요.`
      : "오늘 예산을 모두 사용했어요. 다음 지출은 한 번 더 확인해 주세요.";

  return (
    <View accessibilityLabel="성과/위험 인사이트" style={styles.insightCard}>
      <Text allowFontScaling={false} style={styles.cardTitle}>
        성과/위험 인사이트
      </Text>
      <View style={styles.insightRow}>
        <View style={styles.insightPill}>
          <Text allowFontScaling={false} style={styles.insightLabel}>
            성과
          </Text>
          <Text allowFontScaling={false} style={styles.insightText}>
            {performanceCopy}
          </Text>
        </View>
        <View style={styles.insightPill}>
          <Text allowFontScaling={false} style={styles.insightLabel}>
            위험
          </Text>
          <Text allowFontScaling={false} style={styles.insightText}>
            {riskCopy}
          </Text>
        </View>
      </View>
    </View>
  );
}

function BudgetSummary({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.budgetSummaryItem}>
      <Text allowFontScaling={false} style={styles.budgetSummaryLabel}>
        {label}
      </Text>
      <Text allowFontScaling={false} style={styles.budgetSummaryValue}>
        {value}
      </Text>
    </View>
  );
}

function PlanReminderRow({
  item,
  kstDay,
  onComplete,
}: Readonly<{
  item: { amount: number; category: string; content: string; day: number };
  kstDay: number;
  onComplete: () => void;
}>) {
  const overdue = item.day < kstDay;
  const statusLabel = overdue ? "기한 지남: " : "";
  return (
    <View style={styles.fixedRow}>
      <Image source={iconForCategory(item.category)} style={styles.fixedIcon} />
      <Text allowFontScaling={false} style={styles.fixedAmount}>
        {formatKrw(item.amount)}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.fixedLabel}
      >
        {item.content}
      </Text>
      <Pressable
        accessibilityLabel={`${statusLabel}${item.content} 사용 완료 처리`}
        accessibilityRole="button"
        onPress={onComplete}
        style={[styles.statusGray, overdue ? styles.statusOverdue : null]}
      >
        <Text allowFontScaling={false} style={styles.statusText}>
          {overdue ? "지남" : "사용 예정"}
        </Text>
      </Pressable>
    </View>
  );
}

function DailyBudgetRow({
  item,
  onToggle,
}: Readonly<{ item: DailyBudgetItem; onToggle: () => void }>) {
  return (
    <View style={styles.budgetRow}>
      <Image
        source={iconForCategory(item.category)}
        style={styles.budgetIcon}
      />
      <Text allowFontScaling={false} style={styles.budgetAmount}>
        {formatKrw(item.amount)}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.budgetText}
      >
        {item.content}
      </Text>
      <Pressable
        accessibilityLabel={`${item.content} ${
          item.completed ? "사용 예정으로 변경" : "사용 완료로 변경"
        }`}
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.statusGray, item.completed ? null : styles.statusGreen]}
      >
        <Text allowFontScaling={false} style={styles.statusText}>
          {item.completed ? "사용 완료" : "사용 예정"}
        </Text>
      </Pressable>
    </View>
  );
}

function EditableItemForm({
  amountLabel,
  categoryLabel,
  contentLabel,
  draft,
  onChange,
  onSave,
  saveLabel,
}: Readonly<{
  amountLabel: string;
  categoryLabel: string;
  contentLabel: string;
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  onSave: () => void;
  saveLabel: string;
}>) {
  return (
    <View style={styles.itemEditor}>
      <TextInput
        accessibilityLabel={categoryLabel}
        onChangeText={(category) => onChange({ ...draft, category })}
        placeholder="카테고리"
        style={styles.input}
        value={draft.category}
      />
      <TextInput
        accessibilityLabel={contentLabel}
        onChangeText={(content) => onChange({ ...draft, content })}
        placeholder="내용"
        style={styles.input}
        value={draft.content}
      />
      <TextInput
        accessibilityLabel={amountLabel}
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(amount) => onChange({ ...draft, amount })}
        placeholder="금액"
        style={styles.input}
        value={draft.amount}
      />
      <Pressable
        accessibilityLabel={saveLabel}
        accessibilityRole="button"
        onPress={onSave}
        style={styles.saveButton}
      >
        <Text allowFontScaling={false} style={styles.saveButtonText}>
          저장
        </Text>
      </Pressable>
    </View>
  );
}

function VariableExpenseTable({
  onDelete,
  onEdit,
  rows,
}: Readonly<{
  onDelete: (row: VariableExpenseItem) => void | Promise<void>;
  onEdit: (row: VariableExpenseItem) => void;
  rows: readonly VariableExpenseItem[];
}>) {
  return (
    <>
      <View style={styles.tableHeader}>
        <Text allowFontScaling={false} style={styles.tableHeaderText}>
          항목
        </Text>
        <Text allowFontScaling={false} style={styles.tableHeaderText}>
          세부 내용
        </Text>
        <Text allowFontScaling={false} style={styles.tableHeaderText}>
          사용 금액
        </Text>
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.tableRow}>
          <Text allowFontScaling={false} style={styles.tableText}>
            {row.category}
          </Text>
          <Text allowFontScaling={false} style={styles.tableText}>
            {row.content}
          </Text>
          <Text allowFontScaling={false} style={styles.tableMoney}>
            {formatKrw(row.amount)}
          </Text>
          <View style={styles.tableActions}>
            <Pressable
              accessibilityLabel={`${row.content} 변동 지출 수정`}
              accessibilityRole="button"
              onPress={() => onEdit(row)}
              style={styles.tableActionButton}
              testID={`variable-expense-edit-${row.id}`}
            >
              <Text allowFontScaling={false} style={styles.tableActionText}>
                수정
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`${row.content} 변동 지출 삭제`}
              accessibilityRole="button"
              onPress={() => void onDelete(row)}
              style={[styles.tableActionButton, styles.tableDeleteButton]}
              testID={`variable-expense-delete-${row.id}`}
            >
              <Text allowFontScaling={false} style={styles.tableActionText}>
                삭제
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );
}

function getPayrollReminderSecureStore(): ReturnType<
  typeof createSecureStoreRuntime
> {
  if (cachedPayrollReminderSecureStore) return cachedPayrollReminderSecureStore;
  const secureStoreModule = require("expo-secure-store") as Parameters<
    typeof createSecureStoreRuntime
  >[1];
  cachedPayrollReminderSecureStore = createSecureStoreRuntime(
    Platform.OS,
    secureStoreModule,
  );
  return cachedPayrollReminderSecureStore;
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

const styles = StyleSheet.create({
  addInlineButton: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.brandSoft,
    borderRadius: salaryScreenRadius.sm,
    justifyContent: "center",
    minHeight: 40,
  },
  addInlineText: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.labelM.fontSize,
    fontWeight: salaryScreenTypography.labelM.fontWeight,
  },
  addText: {
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.labelM.fontSize,
    fontWeight: salaryScreenTypography.labelM.fontWeight,
    marginTop: salaryScreenSpacing[2],
  },
  adDish: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    backgroundColor: salaryScreenColors.brandSurface,
    flex: 0.38,
    padding: salaryScreenSpacing[2],
  },
  adDiscount: {
    backgroundColor: salaryScreenColors.surface,
    borderRadius: salaryScreenRadius.sm,
    color: salaryScreenColors.info,
    fontSize: salaryScreenTypography.labelL.fontSize,
    fontWeight: salaryScreenTypography.labelL.fontWeight,
    paddingHorizontal: salaryScreenSpacing[2],
    paddingVertical: salaryScreenSpacing[1],
  },
  adLeft: {
    flex: 0.62,
    justifyContent: "center",
    paddingHorizontal: salaryScreenSpacing[5],
  },
  adSmall: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
    opacity: 0.82,
  },
  adText: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.labelL.fontSize,
    fontWeight: salaryScreenTypography.labelL.fontWeight,
    marginTop: salaryScreenSpacing[1],
  },
  adTitle: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    marginTop: salaryScreenSpacing[1],
  },
  budgetAmount: {
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    minWidth: 76,
  },
  budgetIcon: {
    borderRadius: salaryScreenRadius.md,
    height: 25,
    width: 25,
  },
  budgetRow: {
    alignItems: "center",
    borderBottomColor: salaryScreenColors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: salaryScreenSpacing[2],
    minHeight: 52,
  },
  budgetSummary: {
    flexDirection: "row",
    gap: salaryScreenSpacing[1],
    marginBottom: salaryScreenSpacing[2],
  },
  budgetSummaryItem: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  budgetSummaryLabel: {
    backgroundColor: salaryScreenColors.brand,
    color: salaryScreenColors.inverse,
    flex: 1,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
    paddingVertical: salaryScreenSpacing[2],
    textAlign: "center",
  },
  budgetSummaryValue: {
    backgroundColor: salaryScreenColors.soft,
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
    paddingVertical: salaryScreenSpacing[2],
    textAlign: "center",
  },
  budgetText: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
    minWidth: 0,
  },
  brandActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: salaryScreenSpacing[2],
  },
  brandCopy: {
    gap: salaryScreenSpacing[1],
  },
  brandHeader: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: designSystem.header.height,
    paddingHorizontal: salaryScreenSpacing[5],
    paddingVertical: salaryScreenSpacing[3],
  },
  brandIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: salaryScreenSpacing[3],
    minWidth: 0,
  },
  brandKorean: {
    color: salaryScreenColors.muted,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
    letterSpacing: salaryScreenTypography.caption.letterSpacing,
  },
  brandLogo: {
    borderRadius: salaryScreenRadius.md,
    height: 44,
    width: 44,
  },
  brandName: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    lineHeight: salaryScreenTypography.titleM.lineHeight,
  },
  card: {
    backgroundColor: salaryScreenColors.surface,
    borderColor: salaryScreenColors.line,
    borderRadius: salaryScreenRadius.md,
    borderWidth: 1,
    ...salaryScreenElevation.low,
    marginHorizontal: salaryScreenSpacing[2],
    marginTop: salaryScreenSpacing[3],
    paddingHorizontal: salaryScreenSpacing[3],
    paddingVertical: salaryScreenSpacing[4],
  },
  cardTitle: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    marginBottom: salaryScreenSpacing[3],
  },
  content: {
    alignSelf: "center",
    backgroundColor: salaryScreenColors.surface,
  },
  editRow: {
    alignItems: "center",
    borderBottomColor: salaryScreenColors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: salaryScreenSpacing[2],
    justifyContent: "space-between",
    minHeight: 38,
  },
  disabledButton: {
    opacity: 0.62,
  },
  editRowMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minWidth: 0,
  },
  editRowMoney: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
  },
  editRowText: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
  },
  emptyBody: {
    color: salaryScreenColors.muted,
    fontSize: salaryScreenTypography.bodyS.fontSize,
    fontWeight: salaryScreenTypography.bodyS.fontWeight,
    lineHeight: salaryScreenTypography.bodyS.lineHeight,
    marginTop: salaryScreenSpacing[1],
  },
  emptyState: {
    backgroundColor: salaryScreenColors.soft,
    borderColor: salaryScreenColors.line,
    borderRadius: salaryScreenRadius.md,
    borderWidth: 1,
    marginTop: salaryScreenSpacing[3],
    padding: salaryScreenSpacing[4],
  },
  emptyTitle: {
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    lineHeight: salaryScreenTypography.titleM.lineHeight,
  },
  errorText: {
    backgroundColor: salaryScreenColors.dangerSurface,
    borderColor: salaryScreenColors.dangerBorder,
    borderRadius: salaryScreenRadius.sm,
    borderWidth: 1,
    color: salaryScreenColors.danger,
    fontSize: salaryScreenTypography.labelM.fontSize,
    fontWeight: salaryScreenTypography.labelM.fontWeight,
    marginHorizontal: salaryScreenSpacing[2],
    marginTop: salaryScreenSpacing[2],
    paddingHorizontal: salaryScreenSpacing[3],
    paddingVertical: salaryScreenSpacing[2],
  },
  fixedAmount: {
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.labelL.fontSize,
    fontWeight: salaryScreenTypography.labelL.fontWeight,
    minWidth: 75,
  },
  fixedIcon: {
    borderRadius: salaryScreenRadius.sm,
    height: 31,
    width: 31,
  },
  fixedLabel: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
    minWidth: 0,
  },
  fixedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: salaryScreenSpacing[3],
    minHeight: 46,
  },
  formCaption: {
    color: salaryScreenColors.muted,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
  },
  googleAd: {
    backgroundColor: salaryScreenColors.info,
    flexDirection: "row",
    height: 74,
    overflow: "hidden",
    width: "100%",
  },
  headerActionButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: designSystem.header.actionSize,
    minWidth: designSystem.header.actionSize,
  },
  headerActionIcon: {
    height: designSystem.navigation.bottomTabs.iconSize,
    tintColor: salaryScreenColors.text,
    width: designSystem.navigation.bottomTabs.iconSize,
  },
  heroAmount: {
    color: salaryScreenColors.money,
    fontSize: salaryScreenTypography.amountL.fontSize,
    fontWeight: salaryScreenTypography.amountL.fontWeight,
    marginTop: salaryScreenSpacing[1],
  },
  heroCoin: {
    height: 68,
    marginBottom: salaryScreenSpacing[1],
    marginTop: salaryScreenSpacing[3],
    width: 68,
  },
  heroDate: {
    color: salaryScreenColors.brandSoft,
    fontSize: salaryScreenTypography.bodyM.fontSize,
    fontWeight: salaryScreenTypography.bodyM.fontWeight,
  },
  heroGreeting: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.bodyS.fontSize,
    fontWeight: salaryScreenTypography.bodyS.fontWeight,
    lineHeight: salaryScreenTypography.bodyS.lineHeight,
    marginTop: salaryScreenSpacing[1],
    opacity: 0.86,
  },
  heroLeft: {
    flex: 1.2,
    justifyContent: "space-between",
    minWidth: 0,
    paddingLeft: salaryScreenSpacing[5],
    paddingVertical: salaryScreenSpacing[4],
  },
  heroPanel: {
    backgroundColor: salaryScreenColors.hero,
    flexDirection: "row",
    minHeight: 270,
    paddingBottom: salaryScreenSpacing[2],
    paddingRight: salaryScreenSpacing[2],
    width: "100%",
  },
  heroRight: {
    flex: 1,
    gap: salaryScreenSpacing[2],
    justifyContent: "center",
    minWidth: 0,
  },
  heroSub: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.bodyL.fontSize,
    fontWeight: salaryScreenTypography.bodyL.fontWeight,
    marginTop: salaryScreenSpacing[1],
  },
  heroTitle: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.titleL.fontSize,
    fontWeight: salaryScreenTypography.titleL.fontWeight,
    lineHeight: salaryScreenTypography.titleL.lineHeight,
    marginTop: salaryScreenSpacing[1],
  },
  inlineForm: {
    backgroundColor: salaryScreenColors.soft,
    borderColor: salaryScreenColors.line,
    borderRadius: salaryScreenRadius.sm,
    borderWidth: 1,
    gap: salaryScreenSpacing[2],
    marginBottom: salaryScreenSpacing[3],
    padding: salaryScreenSpacing[3],
  },
  insightCard: {
    backgroundColor: salaryScreenColors.surface,
    borderColor: salaryScreenColors.line,
    borderRadius: salaryScreenRadius.md,
    borderWidth: 1,
    ...salaryScreenElevation.low,
    gap: salaryScreenSpacing[3],
    marginHorizontal: salaryScreenSpacing[2],
    marginTop: salaryScreenSpacing[3],
    paddingHorizontal: salaryScreenSpacing[3],
    paddingVertical: salaryScreenSpacing[4],
  },
  insightLabel: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.labelM.fontSize,
    fontWeight: salaryScreenTypography.labelM.fontWeight,
  },
  insightPill: {
    backgroundColor: salaryScreenColors.brandSoft,
    borderColor: salaryScreenColors.brandSurface,
    borderRadius: salaryScreenRadius.md,
    borderWidth: 1,
    flex: 1,
    gap: salaryScreenSpacing[1],
    minWidth: 0,
    paddingHorizontal: salaryScreenSpacing[3],
    paddingVertical: salaryScreenSpacing[3],
  },
  insightRow: {
    flexDirection: "row",
    gap: salaryScreenSpacing[2],
  },
  insightText: {
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.bodyS.fontSize,
    fontWeight: salaryScreenTypography.bodyS.fontWeight,
    lineHeight: salaryScreenTypography.bodyS.lineHeight,
  },
  input: {
    backgroundColor: salaryScreenColors.surface,
    borderColor: salaryScreenColors.line,
    borderRadius: salaryScreenRadius.sm,
    borderWidth: 1,
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.bodyM.fontSize,
    fontWeight: salaryScreenTypography.bodyM.fontWeight,
    minHeight: 48,
    paddingHorizontal: salaryScreenSpacing[3],
  },
  itemEditor: {
    gap: salaryScreenSpacing[2],
  },
  metricBox: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.surface,
    borderRadius: salaryScreenRadius.sm,
    flexDirection: "row",
    gap: salaryScreenSpacing[1],
    justifyContent: "space-between",
    minHeight: 45,
    paddingHorizontal: salaryScreenSpacing[2],
  },
  metricEmphasis: {
    borderColor: salaryScreenColors.money,
    borderWidth: 2,
  },
  metricLabel: {
    color: salaryScreenColors.muted,
    flexShrink: 0,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
  },
  metricValue: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    minWidth: 0,
    textAlign: "right",
  },
  paydayCard: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.surface,
    borderRadius: salaryScreenRadius.sm,
    flex: 1,
    justifyContent: "center",
    minHeight: 66,
    paddingHorizontal: salaryScreenSpacing[1],
  },
  paydayDanger: {
    color: salaryScreenColors.danger,
  },
  paydayLabel: {
    color: salaryScreenColors.muted,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
  },
  paydayRow: {
    flexDirection: "row",
    gap: salaryScreenSpacing[2],
  },
  paydayValue: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    marginTop: salaryScreenSpacing[1],
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.brand,
    borderRadius: salaryScreenRadius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: salaryScreenSpacing[3],
  },
  saveButtonText: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.labelM.fontSize,
    fontWeight: salaryScreenTypography.labelM.fontWeight,
  },
  screen: {
    backgroundColor: salaryScreenColors.screen,
    flex: 1,
  },
  smallActionButton: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.brandSoft,
    borderRadius: salaryScreenRadius.sm,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: salaryScreenSpacing[2],
  },
  smallActionText: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
  },
  statusGray: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.paid,
    borderRadius: salaryScreenRadius.sm,
    justifyContent: "center",
    minHeight: 29,
    minWidth: 62,
    paddingHorizontal: salaryScreenSpacing[2],
  },
  statusGreen: {
    backgroundColor: salaryScreenColors.brand,
  },
  statusOverdue: {
    backgroundColor: salaryScreenColors.warning,
  },
  statusText: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
  },
  tableHeader: {
    flexDirection: "row",
    gap: salaryScreenSpacing[1] / 2,
  },
  tableActionButton: {
    alignItems: "center",
    backgroundColor: salaryScreenColors.brand,
    borderRadius: salaryScreenRadius.sm,
    justifyContent: "center",
    minHeight: 28,
    minWidth: 38,
    paddingHorizontal: salaryScreenSpacing[1],
  },
  tableActionText: {
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
  },
  tableActions: {
    flexDirection: "row",
    gap: salaryScreenSpacing[1],
    justifyContent: "flex-end",
    minWidth: 82,
  },
  tableDeleteButton: {
    backgroundColor: salaryScreenColors.paid,
  },
  tableHeaderText: {
    backgroundColor: salaryScreenColors.brand,
    color: salaryScreenColors.inverse,
    flex: 1,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
    paddingVertical: salaryScreenSpacing[2],
    textAlign: "center",
  },
  tableMoney: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.labelM.fontSize,
    fontWeight: salaryScreenTypography.labelM.fontWeight,
    textAlign: "center",
  },
  tableRow: {
    alignItems: "center",
    borderBottomColor: salaryScreenColors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 42,
  },
  tableText: {
    color: salaryScreenColors.text,
    flex: 1,
    fontSize: salaryScreenTypography.labelS.fontSize,
    fontWeight: salaryScreenTypography.labelS.fontWeight,
    textAlign: "center",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: salaryScreenSpacing[2],
  },
  variableForm: {
    backgroundColor: salaryScreenColors.soft,
    borderColor: salaryScreenColors.line,
    borderRadius: salaryScreenRadius.sm,
    borderWidth: 1,
    gap: salaryScreenSpacing[2],
    marginBottom: salaryScreenSpacing[3],
    padding: salaryScreenSpacing[3],
  },
  variableHeader: {
    marginBottom: salaryScreenSpacing[1],
  },
  variableTotal: {
    alignSelf: "flex-end",
    flexDirection: "row",
    marginTop: -salaryScreenSpacing[1],
  },
  variableTotalLabel: {
    backgroundColor: salaryScreenColors.brand,
    color: salaryScreenColors.inverse,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
    paddingHorizontal: salaryScreenSpacing[5],
    paddingVertical: salaryScreenSpacing[2],
  },
  variableTotalValue: {
    backgroundColor: salaryScreenColors.soft,
    color: salaryScreenColors.text,
    fontSize: salaryScreenTypography.caption.fontSize,
    fontWeight: salaryScreenTypography.caption.fontWeight,
    minWidth: 82,
    paddingVertical: salaryScreenSpacing[2],
    textAlign: "center",
  },
  variantBanner: {
    backgroundColor: salaryScreenColors.brandSoft,
    borderColor: salaryScreenColors.brandSurface,
    borderRadius: salaryScreenRadius.md,
    borderWidth: 1,
    gap: salaryScreenSpacing[1],
    marginBottom: salaryScreenSpacing[2],
    paddingHorizontal: salaryScreenSpacing[4],
    paddingVertical: salaryScreenSpacing[3],
  },
  variantBody: {
    color: salaryScreenColors.muted,
    fontSize: salaryScreenTypography.bodyS.fontSize,
    fontWeight: salaryScreenTypography.bodyS.fontWeight,
    lineHeight: salaryScreenTypography.bodyS.lineHeight,
  },
  variantTitle: {
    color: salaryScreenColors.brand,
    fontSize: salaryScreenTypography.titleM.fontSize,
    fontWeight: salaryScreenTypography.titleM.fontWeight,
    lineHeight: salaryScreenTypography.titleM.lineHeight,
  },
});
