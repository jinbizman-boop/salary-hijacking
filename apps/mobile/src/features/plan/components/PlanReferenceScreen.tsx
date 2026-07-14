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
import { appImageAssets } from "../../../shared/assets/images";
import { createSecureStoreRuntime } from "../../../shared/storage/secure-store";
import {
  configurePreviewStatePersistence,
  formatKrw,
  getPreviewState,
  getKstParts,
  hydratePreviewStateFromStorage,
  parseKrwInput,
  updatePreviewState,
  type DailyBudgetItem,
  type PlanItem,
  type PreviewCategory,
} from "../../preview/interactive-state";

const BRAND_GREEN = "#209252";
const TEXT_BLACK = "#191B1F";
const LINE = "#E7EBEF";
const MUTED = "#6D737A";
const DANGER_RED = "#B92133";
const PLAN_SAVE_ERROR =
  "\uC11C\uBC84 \uC800\uC7A5\uC774 \uC2E4\uD328\uD574 \uACC4\uD68D\uC744 \uBC18\uC601\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
const previewSecureStore = createSecureStoreRuntime(Platform.OS, SecureStore);

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

export type PlanReferenceScreenProps = Readonly<{
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
}>;

export function PlanReferenceScreen({
  budgetApi,
  planCommitmentsApi,
  payrollApi,
}: PlanReferenceScreenProps = {}): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 430);
  const scale = clamp(width / 393, 0.9, 1.08);
  const [state, setState] = useState(getPreviewState());
  const [monthlyTarget, setMonthlyTarget] = useState(500000);
  const [payrollDraft, setPayrollDraft] = useState<PayrollDraft>({
    expenseAmount: "700000",
    hijackAmount: "2000000",
    payday: "25",
    payrollAmount: "2700000",
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

  useEffect(() => {
    let mounted = true;
    const current = getPreviewState();
    configurePreviewStatePersistence(previewSecureStore);
    if (process.env.JEST_WORKER_ID) return undefined;
    void hydratePreviewStateFromStorage().then((restored) => {
      if (mounted && restored !== current) setState(restored);
    });
    return () => {
      mounted = false;
    };
  }, []);

  function sync(next: ReturnType<typeof getPreviewState>): void {
    setState(next);
  }

  function applyPayrollPlanSnapshot(snapshot: PayrollPlanSnapshot): void {
    setPayrollDraft(payrollDraftFromSnapshot(snapshot));
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
  }

  async function savePlanItem(section: "fixed" | "saving"): Promise<void> {
    setPlanError(null);
    const amount = parseKrwInput(draft.amount);
    const content = draft.content.trim();
    if (amount <= 0 || !content) return;
    const category = normalizeCategory(draft.category);
    const day = clamp(parseKrwInput(draft.day) || 25, 1, 31);
    if (
      section === "fixed" &&
      editingId &&
      serverPlanCommitmentsApi?.updateFixedExpense !== undefined
    ) {
      try {
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
          savePlanItemInPreview({
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
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    if (
      section === "saving" &&
      editingId &&
      serverPlanCommitmentsApi?.updateSavingsGoal !== undefined
    ) {
      try {
        const saved = await serverPlanCommitmentsApi.updateSavingsGoal(
          editingId,
          buildSavingsGoalUpdateRequest({
            amount,
            category,
            content,
          }),
        );
        sync(
          savePlanItemInPreview({
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
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    if (
      section === "fixed" &&
      !editingId &&
      serverPlanCommitmentsApi?.createFixedExpense !== undefined
    ) {
      try {
        const saved = await serverPlanCommitmentsApi.createFixedExpense(
          buildFixedExpenseCreateRequest({
            amount,
            category,
            content,
            day,
          }),
        );
        sync(
          savePlanItemInPreview({
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
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    if (
      section === "saving" &&
      !editingId &&
      serverPlanCommitmentsApi?.createSavingsGoal !== undefined
    ) {
      try {
        const saved = await serverPlanCommitmentsApi.createSavingsGoal(
          buildSavingsGoalCreateRequest({
            amount,
            category,
            content,
          }),
        );
        sync(
          savePlanItemInPreview({
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
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    sync(
      savePlanItemInPreview({
        amount,
        category,
        content,
        day,
        id: editingId ?? `plan-${section}-${Date.now()}`,
        section,
      }),
    );
    clearDraft();
  }

  async function saveLivingItem(): Promise<void> {
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
    if (serverBudgetApi?.recalculate !== undefined) {
      try {
        await serverBudgetApi.recalculate(
          buildDailyLivingItemsRecalculateRequest(
            nextDailyLivingItems(state.dailyItems, nextItem),
            state.livingDays,
          ),
        );
        sync(saveDailyLivingItemInPreview(nextItem));
        clearDraft();
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    sync(saveDailyLivingItemInPreview(nextItem));
    clearDraft();
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
      updatePreviewState((previous) => ({
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
          updatePreviewState((previous) => ({
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
      updatePreviewState((previous) => ({
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
        sync(deleteEditingItemInPreview(editingId));
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
        sync(deleteEditingItemInPreview(editingId));
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
        sync(deleteEditingItemInPreview(editingId));
        clearDraft();
        return;
      } catch {
        setPlanError(PLAN_SAVE_ERROR);
        return;
      }
    }
    sync(deleteEditingItemInPreview(editingId));
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
      <ScrollView
        accessibilityLabel="\uAE09\uC5EC\uB0A9\uCE58 \uACC4\uD68D \uD654\uBA74"
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
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={appIconAssets.common.settings}
            style={styles.headerSettingsIcon}
          />
        </View>

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
              홍길동님의 급여 납치 목표 달성률
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
                  2,500,000원
                </Text>
              </View>
            </View>
          </View>
          <Text allowFontScaling={false} style={styles.goalPercent}>
            88%
          </Text>
        </View>

        <PlanSection
          open={openSection === "payroll"}
          rows={[
            [
              `\uB9E4\uC6D4 ${clamp(parseKrwInput(payrollDraft.payday) || 25, 1, 31)}\uC77C`,
              formatKrw(parseKrwInput(payrollDraft.payrollAmount)),
              formatKrw(parseKrwInput(payrollDraft.expenseAmount)),
              formatKrw(parseKrwInput(payrollDraft.hijackAmount)),
            ],
          ]}
          settingLabel="\uB0B4 \uAE09\uC5EC \uB0A9\uCE58 \uACC4\uD68D/\uC124\uC815 \uC124\uC815"
          settingTestID="payroll-section-settings-button"
          title="\uB0B4 \uAE09\uC5EC \uB0A9\uCE58 \uACC4\uD68D/\uC124\uC815"
          headers={[
            "\uAE09\uC5EC \uBC1B\uB294\uB0A0",
            "\uC218\uB839 \uC608\uC0C1 \uAE09\uC5EC",
            "\uC9C0\uCD9C \uC608\uC0C1 \uAE08\uC561",
            "\uC608\uC0C1 \uB0A9\uCE58 \uAE08\uC561",
          ]}
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
        </PlanSection>

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
          draft={draft}
          setDraft={setDraft}
        />

        <PlanSection
          open={openSection === "living"}
          rows={[
            [
              formatKrw(state.dailyLimit),
              String(state.livingDays),
              formatKrw(livingTotal),
            ],
          ]}
          settingLabel="일일 생활비 계획/설정 설정"
          settingTestID="living-section-settings-button"
          title="일일 생활비 계획/설정"
          headers={["일일 생활비 총액", "일수", "월별 생활비 총액"]}
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
          <View style={styles.livingRows}>
            {state.dailyItems.map((item) => (
              <Pressable
                accessibilityLabel={`${item.content} 수정하기`}
                accessibilityRole="button"
                key={item.id}
                onPress={() => {
                  setOpenSection("living");
                  setEditingId(item.id);
                  setDraft({
                    amount: String(item.amount),
                    category: item.category,
                    content: item.content,
                    day: "1",
                  });
                }}
                style={styles.livingRow}
                testID={`living-item-edit-${item.id}`}
              >
                <Text allowFontScaling={false} style={styles.livingText}>
                  {item.category}
                </Text>
                <Text allowFontScaling={false} style={styles.livingText}>
                  {item.content}
                </Text>
                <Text allowFontScaling={false} style={styles.livingMoney}>
                  {formatKrw(item.amount)}
                </Text>
              </Pressable>
            ))}
          </View>
          {draft.content || draft.amount || draft.day ? (
            <PlanItemForm
              draft={draft}
              setDraft={setDraft}
              onSave={saveLivingItem}
              onDelete={editingId ? deleteEditingItem : undefined}
            />
          ) : null}
        </PlanSection>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function savePlanItemInPreview(
  nextItem: PlanItem,
): ReturnType<typeof getPreviewState> {
  return updatePreviewState((previous) => ({
    ...previous,
    planItems: previous.planItems.some((item) => item.id === nextItem.id)
      ? previous.planItems.map((item) =>
          item.id === nextItem.id ? nextItem : item,
        )
      : [...previous.planItems, nextItem],
  }));
}

function saveDailyLivingItemInPreview(
  nextItem: DailyBudgetItem,
): ReturnType<typeof getPreviewState> {
  return updatePreviewState((previous) => ({
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

function deleteEditingItemInPreview(
  editingId: string,
): ReturnType<typeof getPreviewState> {
  return updatePreviewState((previous) => ({
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
): ReturnType<typeof getPreviewState> {
  return updatePreviewState((previous) => ({
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

function PlanSection({
  children,
  headers,
  onToggle,
  open,
  rows,
  settingLabel,
  settingTestID,
  title,
}: Readonly<{
  children?: React.ReactNode;
  headers: readonly string[];
  onToggle: () => void;
  open: boolean;
  rows: readonly (readonly string[])[];
  settingLabel: string;
  settingTestID?: string;
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
      <PlanTable headers={headers} rows={rows} />
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
  section: "fixed" | "saving";
  setDraft: (draft: Draft) => void;
  settingLabel: string;
  title: string;
}>) {
  return (
    <PlanSection
      headers={["지출일", "구분명", "소비명", "단가", "수량", "금액"]}
      onToggle={() => onOpenEditor(section)}
      open={open}
      rows={items.map((item) => [
        `${item.day}일`,
        item.category,
        item.content,
        "-",
        "1",
        formatKrw(item.amount),
      ])}
      settingLabel={settingLabel}
      settingTestID={`${section}-section-settings-button`}
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
      {items.map((item) => (
        <Pressable
          accessibilityLabel={`${item.content} 수정하기`}
          accessibilityRole="button"
          key={`edit-${item.id}`}
          onPress={() => onOpenEditor(section, item)}
          style={styles.editRow}
          testID={`${section}-item-edit-${item.id}`}
        >
          <Text allowFontScaling={false} style={styles.editText}>
            수정: {item.content}
          </Text>
          <Text allowFontScaling={false} style={styles.editMoney}>
            금액 {formatKrw(item.amount)}
          </Text>
        </Pressable>
      ))}
      {(draft.content || draft.amount || draft.day) && open ? (
        <PlanItemForm
          draft={draft}
          setDraft={setDraft}
          onSave={onSave}
          onDelete={editingId ? onDelete : undefined}
        />
      ) : null}
    </PlanSection>
  );
}

function PlanTable({
  headers,
  rows,
}: Readonly<{
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}>) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        {headers.map((header, headerIndex) => (
          <View
            key={`header-${headerIndex}-${header}`}
            style={styles.tableHeaderCell}
          >
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.tableHeaderText}
            >
              {header}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={`row-${index}`} style={styles.tableRow}>
          {row.map((cell, cellIndex) => (
            <View key={`${cell}-${cellIndex}`} style={styles.tableCell}>
              <Text
                adjustsFontSizeToFit
                allowFontScaling={false}
                numberOfLines={1}
                style={styles.tableText}
              >
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function PlanItemForm({
  draft,
  onDelete,
  onSave,
  setDraft,
}: Readonly<{
  draft: Draft;
  onDelete?: (() => void) | undefined;
  onSave: () => Promise<void> | void;
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
        onPress={() => {
          void onSave();
        }}
        style={styles.saveButton}
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

function normalizeCategory(value: string): PreviewCategory {
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
    color: TEXT_BLACK,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  brandHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  content: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: DANGER_RED,
    borderRadius: 3,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  editMoney: {
    color: BRAND_GREEN,
    fontSize: 12,
    fontWeight: "900",
  },
  editRow: {
    alignItems: "center",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 38,
  },
  editText: {
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
  goalCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 2,
    borderWidth: 1,
    elevation: 3,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginTop: 12,
    minHeight: 112,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  goalCopy: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  goalMeta: {
    flex: 1,
    minWidth: 0,
  },
  goalMetaRow: {
    flexDirection: "row",
    gap: 18,
  },
  goalPercent: {
    color: BRAND_GREEN,
    fontSize: 45,
    fontWeight: "900",
    minWidth: 116,
    textAlign: "right",
  },
  goalTitle: {
    color: TEXT_BLACK,
    fontSize: 17,
    fontWeight: "900",
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
  headerSettingsIcon: {
    height: 30,
    tintColor: TEXT_BLACK,
    width: 30,
  },
  inlineForm: {
    backgroundColor: "#F8FAF9",
    borderColor: LINE,
    borderRadius: 5,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
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
  livingMoney: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  livingRow: {
    alignItems: "center",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 38,
  },
  livingRows: {
    marginTop: 10,
  },
  livingText: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  metaGreen: {
    color: BRAND_GREEN,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  metaLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "900",
  },
  metaRed: {
    color: DANGER_RED,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
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
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 2,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: 8,
    marginTop: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  sectionSettingsIcon: {
    height: 28,
    tintColor: "#42464B",
    width: 28,
  },
  sectionTitle: {
    color: TEXT_BLACK,
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    minWidth: 0,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  smallIconButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  table: {
    borderColor: "#E4E7EA",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    alignItems: "center",
    borderBottomColor: "#E4E7EA",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#E4E7EA",
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 3,
  },
  tableHeaderCell: {
    alignItems: "center",
    backgroundColor: BRAND_GREEN,
    borderBottomColor: "#D6E8DD",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#D6E8DD",
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
  },
  tableText: {
    color: TEXT_BLACK,
    fontSize: 9.5,
    fontWeight: "700",
    textAlign: "center",
  },
  topHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    width: "100%",
  },
});
