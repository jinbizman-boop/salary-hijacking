import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
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
import { appIconAssets } from "../../../shared/assets/icons";
import { appImageAssets } from "../../../shared/assets/images";
import {
  createMobileBudgetApi,
  createMobilePlanCommitmentsApi,
} from "../../../shared/api/mobile-api";
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
  type PlanItem,
  type ReminderCategory,
  type VariableExpenseItem,
} from "../../payroll-reminders/interactive-state";

const BRAND_GREEN = "#209252";
const HERO_GREEN = "#259849";
const TEXT_BLACK = "#191B1F";
const LINE = "#E7EBEF";
const PAID_GRAY = "#C7C9CC";
const WARNING_ORANGE = "#E9872F";
const MONEY_YELLOW = "#F8F439";
const DANGER_RED = "#B92133";
const SALARY_SAVE_ERROR =
  "\uC11C\uBC84 \uC800\uC7A5\uC774 \uC2E4\uD328\uD574 \uC9C0\uCD9C\uC744 \uBC18\uC601\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
const payrollReminderSecureStore = createSecureStoreRuntime(
  Platform.OS,
  SecureStore,
);

type ItemDraft = Readonly<{
  amount: string;
  category: string;
  content: string;
}>;

export type SalaryHomeScreenProps = Readonly<{
  onOpenNotifications?: (() => void) | undefined;
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
}>;

export function resetSalaryHomePreviewCacheForTests(): void {
  resetPayrollReminderStateForTests();
}

export function SalaryHomeScreen({
  onOpenNotifications,
  planCommitmentsApi,
  variableExpenseApi,
}: SalaryHomeScreenProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const variableFormTopRef = useRef(0);
  const contentWidth = Math.min(width, 430);
  const scale = clamp(width / 393, 0.9, 1.08);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState(getPayrollReminderState());
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
  const currentSpent = 773000 + dailySpent + variableTotal;
  const currentHijacked = Math.max(0, 2700000 - currentSpent);

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
    variableSaveInFlightRef.current = true;
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
      variableSaveInFlightRef.current = false;
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
        <View style={[styles.topHeader, { height: 54 * scale }]}>
          <View style={styles.brandHeaderLeft}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={appImageAssets.brand.platformLogo}
              style={[
                styles.headerLogo,
                { height: 24 * scale, width: 24 * scale },
              ]}
            />
            <Text allowFontScaling={false} style={styles.headerBrand}>
              <Text style={styles.headerBrandGreen}>SALARY </Text>
              HIJACKING
            </Text>
          </View>
          <Pressable
            accessibilityLabel="알림 화면 열기"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onOpenNotifications}
            style={styles.iconButton}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={appIconAssets.common.alarm}
              style={styles.alarmIcon}
            />
          </Pressable>
        </View>

        {salaryError ? (
          <Text
            accessibilityRole="alert"
            allowFontScaling={false}
            style={styles.errorText}
          >
            {salaryError}
          </Text>
        ) : null}

        <View style={styles.heroPanel}>
          <View style={styles.heroLeft}>
            <Text allowFontScaling={false} style={styles.heroDate}>
              {kst.text}
            </Text>
            <Text allowFontScaling={false} style={styles.heroTitle}>
              내 급여 납치{"\n"}현황
            </Text>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={appIconAssets.money.coins}
              style={styles.heroCoin}
            />
            <Text allowFontScaling={false} style={styles.heroSub}>
              전체 누적 납치 금액
            </Text>
            <Text allowFontScaling={false} style={styles.heroAmount}>
              5,780,000원
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
            <HeroMetric label="수령 금액" value="2,700,000원" />
            <HeroMetric label="지출 금액" value={formatKrw(currentSpent)} />
            <HeroMetric
              emphasized
              label="납치 금액"
              value={formatKrw(currentHijacked)}
            />
          </View>
        </View>

        <GoogleAdSlot />

        <View style={styles.card}>
          <Text allowFontScaling={false} style={styles.cardTitle}>
            홍길동님이 설정한 금일 고정 지출
          </Text>
          {getVisiblePlanReminderItems(
            state.planItems,
            kst.monthKey,
            kst.day,
          ).map((item) => (
            <PlanReminderRow
              key={item.id}
              item={item}
              kstDay={kst.day}
              onComplete={() => void completePlanReminder(item)}
            />
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text allowFontScaling={false} style={styles.cardTitle}>
              홍길동님이 설정한 일일 사용 예산
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
        </View>

        <View style={styles.card}>
          <View style={styles.variableHeader}>
            <Text allowFontScaling={false} style={styles.cardTitle}>
              홍길동님이 사용한 금일 변동 지출
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
        </View>
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

function GoogleAdSlot(): React.ReactElement {
  return (
    <View accessibilityLabel="Google Ad 광고 영역" style={styles.googleAd}>
      <View style={styles.adLeft}>
        <Text allowFontScaling={false} style={styles.adSmall}>
          Google Ad
        </Text>
        <Text allowFontScaling={false} style={styles.adTitle}>
          지금 강세일 특가!
        </Text>
        <Text allowFontScaling={false} style={styles.adText}>
          짜장면 구매 타이밍
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
  addInlineButton: {
    alignItems: "center",
    backgroundColor: "#EDF7F1",
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 40,
  },
  addInlineText: {
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: "900",
  },
  addText: {
    color: TEXT_BLACK,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  adDish: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    backgroundColor: "#F2E6D0",
    flex: 0.38,
    padding: 8,
  },
  adDiscount: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    color: "#7A2DBA",
    fontSize: 15,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  adLeft: {
    flex: 0.62,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  adSmall: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.82,
  },
  adText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },
  adTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  alarmIcon: {
    height: 27,
    tintColor: TEXT_BLACK,
    width: 27,
  },
  brandHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  budgetAmount: {
    color: TEXT_BLACK,
    fontSize: 17,
    fontWeight: "900",
    minWidth: 76,
  },
  budgetIcon: {
    borderRadius: 12,
    height: 25,
    width: 25,
  },
  budgetRow: {
    alignItems: "center",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
  },
  budgetSummary: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 10,
  },
  budgetSummaryItem: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  budgetSummaryLabel: {
    backgroundColor: BRAND_GREEN,
    color: "#FFFFFF",
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    paddingVertical: 7,
    textAlign: "center",
  },
  budgetSummaryValue: {
    backgroundColor: "#F5F7F8",
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    paddingVertical: 7,
    textAlign: "center",
  },
  budgetText: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    minWidth: 0,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 3,
    borderWidth: 1,
    elevation: 3,
    marginHorizontal: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    shadowColor: "#17251D",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardTitle: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 13,
  },
  content: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
  },
  editRow: {
    alignItems: "center",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
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
    color: BRAND_GREEN,
    fontSize: 12,
    fontWeight: "900",
  },
  editRowText: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    backgroundColor: "#FFF4F1",
    borderColor: "#F1B7A8",
    borderRadius: 5,
    borderWidth: 1,
    color: DANGER_RED,
    fontSize: 13,
    fontWeight: "900",
    marginHorizontal: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fixedAmount: {
    color: TEXT_BLACK,
    fontSize: 15,
    fontWeight: "900",
    minWidth: 75,
  },
  fixedIcon: {
    borderRadius: 8,
    height: 31,
    width: 31,
  },
  fixedLabel: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    minWidth: 0,
  },
  fixedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 46,
  },
  formCaption: {
    color: "#4A4F55",
    fontSize: 12,
    fontWeight: "800",
  },
  googleAd: {
    backgroundColor: "#76209D",
    flexDirection: "row",
    height: 74,
    overflow: "hidden",
    width: "100%",
  },
  headerBrand: {
    color: TEXT_BLACK,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
  },
  headerBrandGreen: {
    color: BRAND_GREEN,
  },
  headerLogo: {
    borderRadius: 12,
  },
  heroAmount: {
    color: MONEY_YELLOW,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 4,
  },
  heroCoin: {
    height: 68,
    marginBottom: 4,
    marginTop: 14,
    width: 68,
  },
  heroDate: {
    color: "#EAF6EF",
    fontSize: 15,
    fontWeight: "700",
  },
  heroLeft: {
    flex: 1.2,
    justifyContent: "space-between",
    minWidth: 0,
    paddingLeft: 18,
    paddingVertical: 16,
  },
  heroPanel: {
    backgroundColor: HERO_GREEN,
    flexDirection: "row",
    minHeight: 270,
    paddingBottom: 10,
    paddingRight: 10,
    width: "100%",
  },
  heroRight: {
    flex: 1,
    gap: 7,
    justifyContent: "center",
    minWidth: 0,
  },
  heroSub: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 6,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  inlineForm: {
    backgroundColor: "#F8FAF9",
    borderColor: LINE,
    borderRadius: 5,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 10,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 5,
    borderWidth: 1,
    color: TEXT_BLACK,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  itemEditor: {
    gap: 8,
  },
  metricBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
    minHeight: 45,
    paddingHorizontal: 8,
  },
  metricEmphasis: {
    borderColor: MONEY_YELLOW,
    borderWidth: 2,
  },
  metricLabel: {
    color: "#4A4F55",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "800",
  },
  metricValue: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    minWidth: 0,
    textAlign: "right",
  },
  paydayCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    flex: 1,
    justifyContent: "center",
    minHeight: 66,
    paddingHorizontal: 4,
  },
  paydayDanger: {
    color: DANGER_RED,
  },
  paydayLabel: {
    color: "#4A4F55",
    fontSize: 10,
    fontWeight: "900",
  },
  paydayRow: {
    flexDirection: "row",
    gap: 7,
  },
  paydayValue: {
    color: BRAND_GREEN,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: BRAND_GREEN,
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  screen: {
    backgroundColor: "#F3F4F5",
    flex: 1,
  },
  smallActionButton: {
    alignItems: "center",
    backgroundColor: "#EDF7F1",
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 10,
  },
  smallActionText: {
    color: BRAND_GREEN,
    fontSize: 12,
    fontWeight: "900",
  },
  statusGray: {
    alignItems: "center",
    backgroundColor: PAID_GRAY,
    borderRadius: 2,
    justifyContent: "center",
    minHeight: 29,
    minWidth: 62,
    paddingHorizontal: 8,
  },
  statusGreen: {
    backgroundColor: BRAND_GREEN,
  },
  statusOverdue: {
    backgroundColor: WARNING_ORANGE,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  tableHeader: {
    flexDirection: "row",
    gap: 2,
  },
  tableActionButton: {
    alignItems: "center",
    backgroundColor: BRAND_GREEN,
    borderRadius: 3,
    justifyContent: "center",
    minHeight: 28,
    minWidth: 38,
    paddingHorizontal: 6,
  },
  tableActionText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  tableActions: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "flex-end",
    minWidth: 82,
  },
  tableDeleteButton: {
    backgroundColor: PAID_GRAY,
  },
  tableHeaderText: {
    backgroundColor: BRAND_GREEN,
    color: "#FFFFFF",
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    paddingVertical: 8,
    textAlign: "center",
  },
  tableMoney: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  tableRow: {
    alignItems: "center",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 42,
  },
  tableText: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  topHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    width: "100%",
  },
  variableForm: {
    backgroundColor: "#F8FAF9",
    borderColor: LINE,
    borderRadius: 5,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 10,
  },
  variableHeader: {
    marginBottom: 5,
  },
  variableTotal: {
    alignSelf: "flex-end",
    flexDirection: "row",
    marginTop: -3,
  },
  variableTotalLabel: {
    backgroundColor: BRAND_GREEN,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  variableTotalValue: {
    backgroundColor: "#F5F7F8",
    color: TEXT_BLACK,
    fontSize: 10,
    fontWeight: "900",
    minWidth: 82,
    paddingVertical: 7,
    textAlign: "center",
  },
});
