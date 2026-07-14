import type { ImageSourcePropType } from "react-native";

import { appIconAssets } from "../../shared/assets/icons";
import type { SecureStoreOptions } from "../../shared/storage/secure-store";

export type PreviewCategory =
  | "음식"
  | "카페"
  | "담배"
  | "구독"
  | "대출"
  | "적금"
  | "교통"
  | "기타";

export type DailyBudgetItem = Readonly<{
  amount: number;
  category: PreviewCategory;
  completed: boolean;
  content: string;
  id: string;
}>;

export type VariableExpenseItem = Readonly<{
  amount: number;
  category: string;
  content: string;
  id: string;
}>;

export type PlanItem = Readonly<{
  amount: number;
  category: PreviewCategory;
  content: string;
  day: number;
  id: string;
  section: "fixed" | "saving";
  usedMonthKey?: string;
}>;

export type PreviewState = Readonly<{
  dailyItems: readonly DailyBudgetItem[];
  dailyLimit: number;
  livingDays: number;
  planItems: readonly PlanItem[];
  variableExpenses: readonly VariableExpenseItem[];
}>;

export type PreviewStateSecureStorage = Readonly<{
  WHEN_UNLOCKED_THIS_DEVICE_ONLY?: number;
  deleteItemAsync: (key: string, options?: SecureStoreOptions) => Promise<void>;
  getItemAsync: (
    key: string,
    options?: SecureStoreOptions,
  ) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: SecureStoreOptions,
  ) => Promise<void>;
}>;

export const PREVIEW_STATE_STORAGE_KEY = "salary-hijacking.qa-preview-state.v1";

const PERSISTED_PREVIEW_SCHEMA_VERSION = 1;
const MAX_PREVIEW_ROWS = 100;
const MAX_TEXT_LENGTH = 80;
const SENSITIVE_TEXT_PATTERNS: readonly RegExp[] = [
  /\b01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b/u,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /\b\d{2,6}[-\s.]?\d{2,6}[-\s.]?\d{2,8}\b/u,
  /\b(?:token|secret|password|passwd|jwt|api[_-]?key)\b/iu,
  /(?:계좌|카드|주민|비밀번호|토큰|시크릿)/u,
];
const initialState: PreviewState = {
  dailyLimit: 20000,
  livingDays: 30,
  dailyItems: [
    {
      amount: 2000,
      category: "카페",
      completed: false,
      content: "빽다방 아이스 아메리카노",
      id: "daily-coffee",
    },
    {
      amount: 6500,
      category: "음식",
      completed: false,
      content: "KT광화문지사 구내식당 점심 식사",
      id: "daily-lunch",
    },
    {
      amount: 4500,
      category: "담배",
      completed: true,
      content: "GS25 어묵사라꼬치 1mm 담배",
      id: "daily-store",
    },
    {
      amount: 3000,
      category: "카페",
      completed: true,
      content: "크라제버거 Hot 아메리카노",
      id: "daily-hot-coffee",
    },
    {
      amount: 4000,
      category: "음식",
      completed: true,
      content: "봉구스 밥버거 오므라이스 토핑 주문",
      id: "daily-rice-burger",
    },
  ],
  variableExpenses: [
    {
      amount: 15000,
      category: "게임 결제",
      content: "폴드센스 파스콘 구입",
      id: "variable-game",
    },
  ],
  planItems: [
    {
      amount: 14900,
      category: "구독",
      content: "유튜브 프리미엄",
      day: 10,
      id: "plan-fixed-youtube",
      section: "fixed",
    },
    {
      amount: 32000,
      category: "구독",
      content: "ChatGPT",
      day: 10,
      id: "plan-fixed-chatgpt",
      section: "fixed",
    },
    {
      amount: 13500,
      category: "구독",
      content: "MS오피스",
      day: 10,
      id: "plan-fixed-office",
      section: "fixed",
    },
    {
      amount: 200000,
      category: "대출",
      content: "학자금 대출",
      day: 25,
      id: "plan-fixed-loan",
      section: "fixed",
    },
    {
      amount: 200000,
      category: "적금",
      content: "여행, 방학",
      day: 25,
      id: "plan-saving-travel",
      section: "saving",
    },
    {
      amount: 200000,
      category: "적금",
      content: "수시 투자",
      day: 25,
      id: "plan-saving-invest",
      section: "saving",
    },
  ],
};

let previewState: PreviewState = initialState;
let previewStateStorage: PreviewStateSecureStorage | null = null;

export function resetPreviewStateForTests(): void {
  previewState = initialState;
  previewStateStorage = null;
}

export function configurePreviewStatePersistence(
  storage: PreviewStateSecureStorage | null,
): void {
  previewStateStorage = storage;
}

export function getPreviewState(): PreviewState {
  return previewState;
}

export function getVisiblePlanReminderItems(
  planItems: readonly PlanItem[],
  currentMonthKey: string,
): readonly PlanItem[] {
  return planItems.filter(
    (item) =>
      (item.section === "fixed" || item.section === "saving") &&
      item.usedMonthKey !== currentMonthKey,
  );
}

export function updatePreviewState(
  updater: (state: PreviewState) => PreviewState,
): PreviewState {
  const nextState = sanitizePreviewState(updater(previewState));
  if (!nextState) return previewState;

  previewState = nextState;
  void persistPreviewState(previewState);
  return previewState;
}

export async function hydratePreviewStateFromStorage(): Promise<PreviewState> {
  if (!previewStateStorage) return previewState;

  const raw = await previewStateStorage.getItemAsync(
    PREVIEW_STATE_STORAGE_KEY,
    secureStoreOptions(previewStateStorage),
  );
  if (!raw) return previewState;

  const restored = parsePersistedPreviewState(raw);
  if (!restored) {
    await previewStateStorage.deleteItemAsync(
      PREVIEW_STATE_STORAGE_KEY,
      secureStoreOptions(previewStateStorage),
    );
    return previewState;
  }

  previewState = restored;
  return previewState;
}

export function formatKrw(value: number): string {
  return `${Math.trunc(value).toLocaleString("ko-KR")}원`;
}

export function parseKrwInput(value: string): number {
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function getKstParts(now = new Date()): {
  day: number;
  month: number;
  monthKey: string;
  text: string;
  year: number;
} {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "numeric",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);

  return {
    day,
    month,
    monthKey: `${year}-${String(month).padStart(2, "0")}`,
    text: `${year}년 ${month}월 ${day}일`,
    year,
  };
}

export function iconForCategory(category: string): ImageSourcePropType {
  if (category.includes("음식") || category.includes("식사")) {
    return appIconAssets.money.bibimbap;
  }
  if (category.includes("카페") || category.includes("커피")) {
    return appIconAssets.money.coffee;
  }
  if (category.includes("담배")) return appIconAssets.money.cigarettes;
  if (category.includes("구독")) return appIconAssets.brands.chatGpt;
  return appIconAssets.money.coins;
}

async function persistPreviewState(state: PreviewState): Promise<void> {
  if (!previewStateStorage) return;
  await previewStateStorage.setItemAsync(
    PREVIEW_STATE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: PERSISTED_PREVIEW_SCHEMA_VERSION,
      state,
    }),
    secureStoreOptions(previewStateStorage),
  );
}

function secureStoreOptions(
  storage: PreviewStateSecureStorage,
): SecureStoreOptions | undefined {
  return typeof storage.WHEN_UNLOCKED_THIS_DEVICE_ONLY === "number"
    ? { keychainAccessible: storage.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    : undefined;
}

function parsePersistedPreviewState(raw: string): PreviewState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.schemaVersion !== PERSISTED_PREVIEW_SCHEMA_VERSION) return null;
    return sanitizePreviewState(parsed.state);
  } catch {
    return null;
  }
}

function sanitizePreviewState(value: unknown): PreviewState | null {
  if (!isRecord(value)) return null;
  if (!isNonNegativeInteger(value.dailyLimit)) return null;
  if (!isPositiveDayCount(value.livingDays)) return null;

  const dailyItems = sanitizeArray(value.dailyItems, sanitizeDailyBudgetItem);
  const planItems = sanitizeArray(value.planItems, sanitizePlanItem);
  const variableExpenses = sanitizeArray(
    value.variableExpenses,
    sanitizeVariableExpenseItem,
  );
  if (!dailyItems || !planItems || !variableExpenses) return null;

  return {
    dailyItems,
    dailyLimit: value.dailyLimit,
    livingDays: value.livingDays,
    planItems,
    variableExpenses,
  };
}

function sanitizeDailyBudgetItem(value: unknown): DailyBudgetItem | null {
  if (!isRecord(value)) return null;
  const category = sanitizePreviewCategory(value.category);
  if (!category) return null;
  if (!isNonNegativeInteger(value.amount)) return null;
  if (typeof value.completed !== "boolean") return null;
  const content = sanitizeText(value.content);
  const id = sanitizePreviewId(value.id);
  if (!content || !id) return null;

  return {
    amount: value.amount,
    category,
    completed: value.completed,
    content,
    id,
  };
}

function sanitizeVariableExpenseItem(
  value: unknown,
): VariableExpenseItem | null {
  if (!isRecord(value)) return null;
  if (!isNonNegativeInteger(value.amount)) return null;
  const category = sanitizeText(value.category);
  const content = sanitizeText(value.content);
  const id = sanitizePreviewId(value.id);
  if (!category || !content || !id) return null;

  return {
    amount: value.amount,
    category,
    content,
    id,
  };
}

function sanitizePlanItem(value: unknown): PlanItem | null {
  if (!isRecord(value)) return null;
  const category = sanitizePreviewCategory(value.category);
  if (!category) return null;
  if (!isNonNegativeInteger(value.amount)) return null;
  if (!isCalendarDay(value.day)) return null;
  if (value.section !== "fixed" && value.section !== "saving") return null;
  const content = sanitizeText(value.content);
  const id = sanitizePreviewId(value.id);
  if (!content || !id) return null;
  const usedMonthKey =
    value.usedMonthKey === undefined
      ? undefined
      : sanitizeMonthKey(value.usedMonthKey);
  if (value.usedMonthKey !== undefined && !usedMonthKey) return null;

  return {
    amount: value.amount,
    category,
    content,
    day: value.day,
    id,
    section: value.section,
    ...(usedMonthKey ? { usedMonthKey } : {}),
  };
}

function sanitizeArray<T>(
  value: unknown,
  mapper: (row: unknown) => T | null,
): readonly T[] | null {
  if (!Array.isArray(value) || value.length > MAX_PREVIEW_ROWS) return null;
  const rows = value.map(mapper);
  return rows.every((row): row is T => row !== null) ? rows : null;
}

function sanitizePreviewCategory(value: unknown): PreviewCategory | null {
  const text = sanitizeText(value);
  return text ? (text as PreviewCategory) : null;
}

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH) return null;
  return SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(text))
    ? null
    : text;
}

function sanitizePreviewId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length === 0 || text.length > 120) return null;
  return /^[A-Za-z0-9_-]+$/u.test(text) ? text : null;
}

function sanitizeMonthKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}$/.test(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveDayCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 31
  );
}

function isCalendarDay(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 31
  );
}
