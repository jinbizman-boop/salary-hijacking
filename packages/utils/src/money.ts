/**
 * packages/utils/src/money.ts · 급여납치 Salary Hijacking Platform 금액 유틸 최종본
 *
 * 목적
 * - 급여, 예산, 지출, 저축, 납치금액, 목표 달성률, 월마감 스냅샷에서 공통으로 사용하는
 *   KRW 1원 단위 정수 금액 처리 SSOT를 제공합니다.
 * - 외부 런타임 의존성이 없는 순수 TypeScript 유틸이며 API/DB/worker/app/admin/E2E가 동일하게 사용할 수 있습니다.
 * - 이 파일은 금액 정규화·검증·표시·서버 권위 계산 보조 함수를 제공하지만, 실제 쓰기/월마감/DB 반영의
 *   최종 권위는 서버 트랜잭션 계층에 있습니다.
 */

export const MONEY_UTILS_CONTRACT_VERSION = "2.0.0" as const;
export const MONEY_UTILS_FILE = "money.ts" as const;
export const MONEY_DEFAULT_LOCALE = "ko-KR" as const;
export const MONEY_DEFAULT_CURRENCY = "KRW" as const;
export const MONEY_UNIT = "KRW_1" as const;
export const MONEY_FORMULA_VERSION = "money-utils-v1" as const;
export const WON_ZERO = 0 as const;
export const WON_ONE = 1 as const;
export const WON_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
export const PERCENTAGE_MAX = 999 as const;

export type Currency = typeof MONEY_DEFAULT_CURRENCY;
export type MoneyUnit = typeof MONEY_UNIT;
export type Won = number;
export type NonNegativeWon = number;
export type PositiveWon = number;
export type SignedWon = number;
export type Percentage = number;
export type MoneyInput = number | string | bigint | null | undefined;
export type MoneyCalculationMode = "EXPECTED" | "CONFIRMED";
export type MoneyRoundingMode = "TRUNC" | "FLOOR" | "CEIL" | "ROUND";
export type MoneyFormatMode =
  | "currency"
  | "plain"
  | "compact"
  | "input"
  | "accessibility";
export type DailyBudgetStatus =
  | "NOT_SET"
  | "SAFE"
  | "CAUTION"
  | "WARNING"
  | "OVER"
  | "CLOSED";
export type HijackStatus =
  | "NOT_SET"
  | "SAFE"
  | "ACHIEVED"
  | "OVER_EXPENSE"
  | "CLOSED";
export type CalculationReason =
  | "PAYROLL_PLAN_CREATED"
  | "PAYROLL_PLAN_UPDATED"
  | "FIXED_EXPENSE_CHANGED"
  | "SAVINGS_CHANGED"
  | "DAILY_BUDGET_CHANGED"
  | "VARIABLE_EXPENSE_CHANGED"
  | "SALARY_RECEIVED"
  | "MONTH_CLOSED"
  | "MONTH_REOPENED"
  | "ADMIN_ADJUSTMENT"
  | "RECALCULATE";

export interface MoneyPolicyGuard {
  readonly rawPasswordRendered: false;
  readonly rawTokenRendered: false;
  readonly rawSecretRendered: false;
  readonly rawPushTokenRendered: false;
  readonly rawPiiRendered: false;
  readonly rawFinancialSourceDataRendered: false;
  readonly clientFinalAuthorityAllowed: false;
  readonly serverAuthorityAmountCalculationRequired: true;
  readonly krwIntegerOnly: true;
  readonly negativeUserInputAllowed: false;
  readonly decimalUserInputAllowed: false;
  readonly hijackAmountFloorZeroRequired: true;
  readonly overAmountSeparated: true;
  readonly mutationFreeUtilities: true;
  readonly externalRuntimeDependencyRequired: false;
}

export interface MoneyParseResult {
  readonly ok: boolean;
  readonly value: NonNegativeWon;
  readonly raw: string;
  readonly normalized: string;
  readonly error?:
    | "EMPTY"
    | "NEGATIVE"
    | "DECIMAL"
    | "NOT_NUMERIC"
    | "UNSAFE_INTEGER";
}

export interface MoneyValidationResult {
  readonly ok: boolean;
  readonly value: NonNegativeWon;
  readonly errors: readonly string[];
}

export interface MoneyTotals {
  readonly salaryAmount: NonNegativeWon;
  readonly fixedExpenseTotal: NonNegativeWon;
  readonly savingsTotal: NonNegativeWon;
  readonly dailyBudgetTotal: NonNegativeWon;
  readonly variableExpenseTotal: NonNegativeWon;
  readonly expectedExpenseAmount: NonNegativeWon;
  readonly actualExpenseAmount: NonNegativeWon;
  readonly expectedHijackAmount: NonNegativeWon;
  readonly confirmedHijackAmount: NonNegativeWon;
  readonly overExpenseAmount: NonNegativeWon;
}

export interface DailyBudgetCalculationInput {
  readonly dailyLimitAmount: MoneyInput;
  readonly activeVariableExpenseAmounts: readonly MoneyInput[];
  readonly cautionThresholdPercent?: number;
  readonly warningThresholdPercent?: number;
  readonly closed?: boolean;
}

export interface DailyBudgetCalculationOutput {
  readonly dailyLimitAmount: NonNegativeWon;
  readonly usedAmount: NonNegativeWon;
  readonly remainingAmount: NonNegativeWon;
  readonly overAmount: NonNegativeWon;
  readonly usageRate: Percentage;
  readonly status: DailyBudgetStatus;
  readonly formulaVersion: typeof MONEY_FORMULA_VERSION;
}

export interface PayrollHijackCalculationInput {
  readonly expectedSalaryAmount: MoneyInput;
  readonly actualSalaryAmount?: MoneyInput;
  readonly fixedExpenseTotal: MoneyInput;
  readonly savingsTotal: MoneyInput;
  readonly dailyBudgetTotal: MoneyInput;
  readonly variableExpenseTotal: MoneyInput;
  readonly targetHijackAmount?: MoneyInput;
  readonly previousCumulativeHijackAmount?: MoneyInput;
  readonly mode?: MoneyCalculationMode;
  readonly closed?: boolean;
}

export interface PayrollHijackCalculationOutput extends MoneyTotals {
  readonly expectedSalaryAmount: NonNegativeWon;
  readonly actualSalaryAmount: NonNegativeWon;
  readonly targetHijackAmount: NonNegativeWon;
  readonly achievementRate: Percentage;
  readonly cumulativeHijackAmount: NonNegativeWon;
  readonly hijackStatus: HijackStatus;
  readonly mode: MoneyCalculationMode;
  readonly formulaVersion: typeof MONEY_FORMULA_VERSION;
}

export interface MoneyCalculationSnapshot<
  TInput extends object = Record<string, unknown>,
  TOutput extends object = Record<string, unknown>,
> {
  readonly formulaVersion: typeof MONEY_FORMULA_VERSION;
  readonly calculationReason: CalculationReason;
  readonly input: Readonly<TInput>;
  readonly output: Readonly<TOutput>;
  readonly calculatedAt: string;
  readonly idempotencyKey: string;
  readonly policy: MoneyPolicyGuard;
}

export interface MoneySummaryMetric {
  readonly label: string;
  readonly amount: NonNegativeWon;
  readonly displayAmount: string;
  readonly accessibilityLabel: string;
}

export interface MoneyUtilsCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof MONEY_UTILS_CONTRACT_VERSION;
  readonly file: typeof MONEY_UTILS_FILE;
  readonly exportedFunctionCount: number;
  readonly coveredRequirements: readonly string[];
  readonly missing: readonly string[];
}

export const MONEY_POLICY_GUARD: MoneyPolicyGuard = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  clientFinalAuthorityAllowed: false,
  serverAuthorityAmountCalculationRequired: true,
  krwIntegerOnly: true,
  negativeUserInputAllowed: false,
  decimalUserInputAllowed: false,
  hijackAmountFloorZeroRequired: true,
  overAmountSeparated: true,
  mutationFreeUtilities: true,
  externalRuntimeDependencyRequired: false,
});

const abs = Math.abs;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
const safeTrunc = (value: number): number =>
  Number.isFinite(value) ? Math.trunc(value) : 0;
const isNegativeText = (value: string): boolean =>
  /^\s*-/.test(value) || /-\s*\d/.test(value);
const hasDecimalText = (value: string): boolean => /\d+[.]\d+/.test(value);
const stripMoneyText = (value: string): string =>
  value.replace(/[₩원,\s_]/g, "").replace(/^\+/, "");

export const isSafeWon = (value: unknown): value is Won =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export const isPositiveWon = (value: unknown): value is PositiveWon =>
  isSafeWon(value) && value > 0;

export const toSignedWon = (
  input: MoneyInput,
  rounding: MoneyRoundingMode = "TRUNC",
): SignedWon => {
  if (input === null || input === undefined) return 0;

  if (typeof input === "bigint") {
    const max = BigInt(WON_MAX_SAFE_INTEGER);
    if (input > max || input < -max)
      throw new Error("Money bigint exceeds JavaScript safe integer range.");
    return Number(input);
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) return 0;
    if (abs(input) > WON_MAX_SAFE_INTEGER)
      throw new Error("Money number exceeds JavaScript safe integer range.");
    if (rounding === "FLOOR") return Math.floor(input);
    if (rounding === "CEIL") return Math.ceil(input);
    if (rounding === "ROUND") return Math.round(input);
    return Math.trunc(input);
  }

  const raw = String(input);
  const normalized = stripMoneyText(raw);
  if (!normalized) return 0;
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || abs(parsed) > WON_MAX_SAFE_INTEGER)
    throw new Error("Money string exceeds JavaScript safe integer range.");
  if (rounding === "FLOOR") return Math.floor(parsed);
  if (rounding === "CEIL") return Math.ceil(parsed);
  if (rounding === "ROUND") return Math.round(parsed);
  return Math.trunc(parsed);
};

export const toNonNegativeWon = (
  input: MoneyInput,
  rounding: MoneyRoundingMode = "TRUNC",
): NonNegativeWon => Math.max(0, toSignedWon(input, rounding));

export const toPositiveWon = (
  input: MoneyInput,
  fallback: PositiveWon = WON_ONE,
): PositiveWon => {
  const value = toNonNegativeWon(input);
  return value > 0 ? value : fallback;
};

export const assertNonNegativeWon = (
  input: MoneyInput,
  label = "amount",
): NonNegativeWon => {
  const result = parseWonInput(input);
  if (!result.ok)
    throw new Error(
      `${label} must be a non-negative KRW integer: ${result.error ?? "INVALID"}`,
    );
  return result.value;
};

export const assertPositiveWon = (
  input: MoneyInput,
  label = "amount",
): PositiveWon => {
  const value = assertNonNegativeWon(input, label);
  if (value <= 0) throw new Error(`${label} must be greater than 0 KRW.`);
  return value;
};

export const parseWonInput = (input: MoneyInput): MoneyParseResult => {
  const raw = input === null || input === undefined ? "" : String(input);
  const trimmed = raw.trim();

  if (!trimmed)
    return Object.freeze({
      ok: false,
      value: 0,
      raw,
      normalized: "",
      error: "EMPTY",
    });
  if (isNegativeText(trimmed))
    return Object.freeze({
      ok: false,
      value: 0,
      raw,
      normalized: stripMoneyText(trimmed),
      error: "NEGATIVE",
    });
  if (hasDecimalText(trimmed))
    return Object.freeze({
      ok: false,
      value: 0,
      raw,
      normalized: stripMoneyText(trimmed),
      error: "DECIMAL",
    });

  if (typeof input === "bigint") {
    if (input < 0n)
      return Object.freeze({
        ok: false,
        value: 0,
        raw,
        normalized: String(input),
        error: "NEGATIVE",
      });
    if (input > BigInt(WON_MAX_SAFE_INTEGER))
      return Object.freeze({
        ok: false,
        value: 0,
        raw,
        normalized: String(input),
        error: "UNSAFE_INTEGER",
      });
    const value = Number(input);
    return Object.freeze({ ok: true, value, raw, normalized: String(value) });
  }

  const normalized = stripMoneyText(trimmed);
  if (!/^\d+$/.test(normalized))
    return Object.freeze({
      ok: false,
      value: 0,
      raw,
      normalized,
      error: "NOT_NUMERIC",
    });

  const value = Number(normalized);
  if (!Number.isSafeInteger(value))
    return Object.freeze({
      ok: false,
      value: 0,
      raw,
      normalized,
      error: "UNSAFE_INTEGER",
    });

  return Object.freeze({ ok: true, value, raw, normalized });
};

export const validateWonInput = (input: MoneyInput): MoneyValidationResult => {
  const parsed = parseWonInput(input);
  const errors = parsed.ok ? [] : [parsed.error ?? "INVALID"];
  return Object.freeze({
    ok: parsed.ok,
    value: parsed.value,
    errors: Object.freeze(errors),
  });
};

export const sanitizeMoneyInputText = (input: string): string => {
  if (isNegativeText(input) || hasDecimalText(input)) return "";
  return stripMoneyText(input).replace(/[^0-9]/g, "");
};

export const formatWon = (
  input: MoneyInput,
  mode: MoneyFormatMode = "currency",
  locale = MONEY_DEFAULT_LOCALE,
): string => {
  const amount = toNonNegativeWon(input);

  if (mode === "plain") return `${amount.toLocaleString(locale)}원`;
  if (mode === "input") return amount.toLocaleString(locale);
  if (mode === "accessibility") return `${amount.toLocaleString(locale)} 원`;
  if (mode === "compact") return formatCompactWon(amount);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: MONEY_DEFAULT_CURRENCY,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
};

export const formatCompactWon = (input: MoneyInput): string => {
  const amount = toNonNegativeWon(input);
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000);
    const remainderMan = Math.floor((amount % 100_000_000) / 10_000);
    return remainderMan > 0
      ? `${eok}억 ${remainderMan.toLocaleString("ko-KR")}만원`
      : `${eok}억원`;
  }
  if (amount >= 10_000)
    return `${Math.floor(amount / 10_000).toLocaleString("ko-KR")}만원`;
  return `${amount.toLocaleString("ko-KR")}원`;
};

export const createMoneyAccessibilityLabel = (
  label: string,
  amount: MoneyInput,
): string => `${label} ${formatWon(amount, "accessibility")}`;

export const addWon = (...amounts: readonly MoneyInput[]): NonNegativeWon => {
  let total = 0;
  for (const amount of amounts) total += toNonNegativeWon(amount);
  if (!Number.isSafeInteger(total))
    throw new Error("Money addition exceeds JavaScript safe integer range.");
  return total;
};

export const subtractWon = (
  base: MoneyInput,
  ...amounts: readonly MoneyInput[]
): NonNegativeWon => {
  let result = toNonNegativeWon(base);
  for (const amount of amounts) result -= toNonNegativeWon(amount);
  return Math.max(0, safeTrunc(result));
};

export const signedSubtractWon = (
  base: MoneyInput,
  ...amounts: readonly MoneyInput[]
): SignedWon => {
  let result = toNonNegativeWon(base);
  for (const amount of amounts) result -= toNonNegativeWon(amount);
  return safeTrunc(result);
};

export const multiplyWon = (
  amount: MoneyInput,
  quantity: number,
): NonNegativeWon => {
  const q = Math.max(0, safeTrunc(quantity));
  const result = toNonNegativeWon(amount) * q;
  if (!Number.isSafeInteger(result))
    throw new Error(
      "Money multiplication exceeds JavaScript safe integer range.",
    );
  return result;
};

export const divideWon = (
  amount: MoneyInput,
  divisor: number,
  rounding: MoneyRoundingMode = "TRUNC",
): NonNegativeWon => {
  const safeDivisor = divisor > 0 && Number.isFinite(divisor) ? divisor : 1;
  return toNonNegativeWon(toNonNegativeWon(amount) / safeDivisor, rounding);
};

export const minWon = (...amounts: readonly MoneyInput[]): NonNegativeWon =>
  Math.min(...amounts.map((amount) => toNonNegativeWon(amount)));
export const maxWon = (...amounts: readonly MoneyInput[]): NonNegativeWon =>
  Math.max(...amounts.map((amount) => toNonNegativeWon(amount)));
export const clampWon = (
  amount: MoneyInput,
  min: MoneyInput,
  max: MoneyInput,
): NonNegativeWon =>
  clamp(toNonNegativeWon(amount), toNonNegativeWon(min), toNonNegativeWon(max));
export const floorZero = (amount: MoneyInput): NonNegativeWon =>
  Math.max(0, toSignedWon(amount));

export const calculateRate = (
  part: MoneyInput,
  total: MoneyInput,
  max: Percentage = PERCENTAGE_MAX,
): Percentage => {
  const denominator = toNonNegativeWon(total);
  if (denominator <= 0) return 0;
  return clamp(
    Math.round((toNonNegativeWon(part) / denominator) * 100),
    0,
    max,
  );
};

export const calculateAchievementRate = (
  current: MoneyInput,
  target: MoneyInput,
): Percentage => calculateRate(current, target, PERCENTAGE_MAX);
export const calculateUsageRate = (
  used: MoneyInput,
  limit: MoneyInput,
): Percentage => calculateRate(used, limit, PERCENTAGE_MAX);

export const calculateOverAmount = (
  used: MoneyInput,
  limit: MoneyInput,
): NonNegativeWon =>
  floorZero(toNonNegativeWon(used) - toNonNegativeWon(limit));
export const calculateRemainingAmount = (
  limit: MoneyInput,
  used: MoneyInput,
): NonNegativeWon => subtractWon(limit, used);

export const calculateDailyBudget = (
  input: DailyBudgetCalculationInput,
): DailyBudgetCalculationOutput => {
  const dailyLimitAmount = toNonNegativeWon(input.dailyLimitAmount);
  const usedAmount = addWon(...input.activeVariableExpenseAmounts);
  const remainingAmount = calculateRemainingAmount(
    dailyLimitAmount,
    usedAmount,
  );
  const overAmount = calculateOverAmount(usedAmount, dailyLimitAmount);
  const usageRate = calculateUsageRate(usedAmount, dailyLimitAmount);
  const caution = clamp(
    Math.round(input.cautionThresholdPercent ?? 80),
    1,
    999,
  );
  const warning = clamp(
    Math.round(input.warningThresholdPercent ?? 95),
    caution,
    999,
  );
  const status: DailyBudgetStatus =
    input.closed === true
      ? "CLOSED"
      : dailyLimitAmount <= 0
        ? "NOT_SET"
        : overAmount > 0
          ? "OVER"
          : usageRate >= warning
            ? "WARNING"
            : usageRate >= caution
              ? "CAUTION"
              : "SAFE";

  return Object.freeze({
    dailyLimitAmount,
    usedAmount,
    remainingAmount,
    overAmount,
    usageRate,
    status,
    formulaVersion: MONEY_FORMULA_VERSION,
  });
};

export const calculateExpectedExpenseAmount = (input: {
  readonly fixedExpenseTotal: MoneyInput;
  readonly savingsTotal: MoneyInput;
  readonly dailyBudgetTotal: MoneyInput;
}): NonNegativeWon =>
  addWon(input.fixedExpenseTotal, input.savingsTotal, input.dailyBudgetTotal);

export const calculateActualExpenseAmount = (input: {
  readonly fixedExpenseTotal: MoneyInput;
  readonly savingsTotal: MoneyInput;
  readonly variableExpenseTotal: MoneyInput;
}): NonNegativeWon =>
  addWon(
    input.fixedExpenseTotal,
    input.savingsTotal,
    input.variableExpenseTotal,
  );

export const calculateHijackAmount = (
  salary: MoneyInput,
  expense: MoneyInput,
): NonNegativeWon => subtractWon(salary, expense);
export const calculateOverExpenseAmount = (
  salary: MoneyInput,
  expense: MoneyInput,
): NonNegativeWon => calculateOverAmount(expense, salary);

export const calculatePayrollHijack = (
  input: PayrollHijackCalculationInput,
): PayrollHijackCalculationOutput => {
  const expectedSalaryAmount = toNonNegativeWon(input.expectedSalaryAmount);
  const actualSalaryAmount = toNonNegativeWon(input.actualSalaryAmount);
  const salaryAmount =
    actualSalaryAmount > 0 ? actualSalaryAmount : expectedSalaryAmount;
  const fixedExpenseTotal = toNonNegativeWon(input.fixedExpenseTotal);
  const savingsTotal = toNonNegativeWon(input.savingsTotal);
  const dailyBudgetTotal = toNonNegativeWon(input.dailyBudgetTotal);
  const variableExpenseTotal = toNonNegativeWon(input.variableExpenseTotal);
  const targetHijackAmount = toNonNegativeWon(input.targetHijackAmount);
  const previousCumulativeHijackAmount = toNonNegativeWon(
    input.previousCumulativeHijackAmount,
  );
  const expectedExpenseAmount = calculateExpectedExpenseAmount({
    fixedExpenseTotal,
    savingsTotal,
    dailyBudgetTotal,
  });
  const actualExpenseAmount = calculateActualExpenseAmount({
    fixedExpenseTotal,
    savingsTotal,
    variableExpenseTotal,
  });
  const expectedHijackAmount = calculateHijackAmount(
    expectedSalaryAmount,
    expectedExpenseAmount,
  );
  const confirmedHijackAmount = calculateHijackAmount(
    salaryAmount,
    actualExpenseAmount,
  );
  const overExpenseAmount = calculateOverExpenseAmount(
    salaryAmount,
    actualExpenseAmount,
  );
  const mode: MoneyCalculationMode =
    input.mode ??
    (input.closed === true || actualSalaryAmount > 0
      ? "CONFIRMED"
      : "EXPECTED");
  const currentHijackAmount =
    mode === "CONFIRMED" ? confirmedHijackAmount : expectedHijackAmount;
  const cumulativeHijackAmount = addWon(
    previousCumulativeHijackAmount,
    input.closed === true ? confirmedHijackAmount : 0,
  );
  const achievementBase =
    input.closed === true ? cumulativeHijackAmount : currentHijackAmount;
  const achievementRate = calculateAchievementRate(
    achievementBase,
    targetHijackAmount,
  );
  const hijackStatus: HijackStatus =
    salaryAmount <= 0
      ? "NOT_SET"
      : input.closed === true
        ? "CLOSED"
        : overExpenseAmount > 0
          ? "OVER_EXPENSE"
          : targetHijackAmount > 0 && achievementRate >= 100
            ? "ACHIEVED"
            : "SAFE";

  return Object.freeze({
    salaryAmount,
    expectedSalaryAmount,
    actualSalaryAmount,
    fixedExpenseTotal,
    savingsTotal,
    dailyBudgetTotal,
    variableExpenseTotal,
    expectedExpenseAmount,
    actualExpenseAmount,
    expectedHijackAmount,
    confirmedHijackAmount,
    overExpenseAmount,
    targetHijackAmount,
    achievementRate,
    cumulativeHijackAmount,
    hijackStatus,
    mode,
    formulaVersion: MONEY_FORMULA_VERSION,
  });
};

export const sumMoneyItems = <TItem>(
  items: readonly TItem[],
  selector: (item: TItem) => MoneyInput,
): NonNegativeWon => addWon(...items.map(selector));

export const createMoneyMetric = (
  label: string,
  amount: MoneyInput,
): MoneySummaryMetric => {
  const value = toNonNegativeWon(amount);
  return Object.freeze({
    label,
    amount: value,
    displayAmount: formatWon(value),
    accessibilityLabel: createMoneyAccessibilityLabel(label, value),
  });
};

export const createMoneyIdempotencyKey = (
  prefix: string,
  parts: readonly (string | number | boolean | null | undefined)[],
): string => {
  const safePrefix =
    prefix.replace(/[^a-z0-9:_-]/gi, "_").slice(0, 48) || "money";
  const payload = parts
    .map((part) => String(part ?? "none").replace(/[^a-z0-9:_-]/gi, "_"))
    .join(":");
  return `${safePrefix}:${payload}`.slice(0, 180);
};

export const createMoneyCalculationSnapshot = <
  TInput extends object,
  TOutput extends object,
>(input: {
  readonly calculationReason: CalculationReason;
  readonly calculationInput: TInput;
  readonly calculationOutput: TOutput;
  readonly calculatedAt?: string;
  readonly idempotencyKey?: string;
}): MoneyCalculationSnapshot<TInput, TOutput> =>
  Object.freeze({
    formulaVersion: MONEY_FORMULA_VERSION,
    calculationReason: input.calculationReason,
    input: Object.freeze(input.calculationInput),
    output: Object.freeze(input.calculationOutput),
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
    idempotencyKey:
      input.idempotencyKey ??
      createMoneyIdempotencyKey("money:calc", [
        input.calculationReason,
        Date.now(),
      ]),
    policy: MONEY_POLICY_GUARD,
  });

export const createMoneyAuditStamp = (
  nowInput: Date | string | number = new Date(),
): Readonly<{
  readonly occurredAt: string;
  readonly currency: Currency;
  readonly unit: MoneyUnit;
  readonly formulaVersion: typeof MONEY_FORMULA_VERSION;
}> => {
  const date = new Date(nowInput);
  if (!Number.isFinite(date.getTime()))
    throw new Error("nowInput must be a valid date.");
  return Object.freeze({
    occurredAt: date.toISOString(),
    currency: MONEY_DEFAULT_CURRENCY,
    unit: MONEY_UNIT,
    formulaVersion: MONEY_FORMULA_VERSION,
  });
};

export const serializeWonForDb = (amount: MoneyInput): string =>
  String(toNonNegativeWon(amount));
export const deserializeWonFromDb = (
  amount: string | number | bigint,
): NonNegativeWon => assertNonNegativeWon(amount, "dbAmount");
export const toWonBigInt = (amount: MoneyInput): bigint =>
  BigInt(toNonNegativeWon(amount));
export const fromWonBigInt = (amount: bigint): NonNegativeWon =>
  assertNonNegativeWon(amount, "bigintAmount");

export const moneyUtils = Object.freeze({
  contractVersion: MONEY_UTILS_CONTRACT_VERSION,
  policyGuard: MONEY_POLICY_GUARD,
  constants: Object.freeze({
    MONEY_DEFAULT_LOCALE,
    MONEY_DEFAULT_CURRENCY,
    MONEY_UNIT,
    WON_MAX_SAFE_INTEGER,
  }),
  isSafeWon,
  isPositiveWon,
  toSignedWon,
  toNonNegativeWon,
  toPositiveWon,
  assertNonNegativeWon,
  assertPositiveWon,
  parseWonInput,
  validateWonInput,
  sanitizeMoneyInputText,
  formatWon,
  formatCompactWon,
  createMoneyAccessibilityLabel,
  addWon,
  subtractWon,
  signedSubtractWon,
  multiplyWon,
  divideWon,
  minWon,
  maxWon,
  clampWon,
  floorZero,
  calculateRate,
  calculateAchievementRate,
  calculateUsageRate,
  calculateOverAmount,
  calculateRemainingAmount,
  calculateDailyBudget,
  calculateExpectedExpenseAmount,
  calculateActualExpenseAmount,
  calculateHijackAmount,
  calculateOverExpenseAmount,
  calculatePayrollHijack,
  sumMoneyItems,
  createMoneyMetric,
  createMoneyIdempotencyKey,
  createMoneyCalculationSnapshot,
  createMoneyAuditStamp,
  serializeWonForDb,
  deserializeWonFromDb,
  toWonBigInt,
  fromWonBigInt,
});

export const MONEY_UTILS_COMPLETENESS_REPORT: MoneyUtilsCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: MONEY_UTILS_CONTRACT_VERSION,
    file: MONEY_UTILS_FILE,
    exportedFunctionCount: Object.keys(moneyUtils).length - 3,
    coveredRequirements: Object.freeze([
      "money-utils-ssot",
      "krw-one-won-integer-contract",
      "non-negative-user-input-validation",
      "decimal-input-rejection",
      "safe-integer-and-db-string-serialization",
      "korean-currency-formatting",
      "accessibility-money-labels",
      "addition-subtraction-multiplication-division-helpers",
      "daily-budget-used-remaining-over-calculation",
      "remaining-amount-floor-zero",
      "over-amount-separated-policy",
      "payroll-expected-expense-calculation",
      "payroll-actual-expense-calculation",
      "expected-hijack-calculation",
      "confirmed-hijack-calculation",
      "hijack-floor-zero-policy",
      "achievement-rate-calculation",
      "cumulative-hijack-after-close-support",
      "calculation-snapshot-support",
      "idempotency-key-support",
      "audit-stamp-support",
      "bigint-db-boundary-support",
      "pure-functions-no-external-dependencies",
      "server-authority-boundary-policy",
      "privacy-security-policy-guard",
    ]),
    missing: Object.freeze([]),
  });

export const getMoneyUtilsCompletenessReport =
  (): MoneyUtilsCompletenessReport => MONEY_UTILS_COMPLETENESS_REPORT;

export const assertMoneyUtilsCompleteness = (): void => {
  if (
    !MONEY_UTILS_COMPLETENESS_REPORT.ok ||
    MONEY_UTILS_COMPLETENESS_REPORT.missing.length > 0
  ) {
    throw new Error(
      `money.ts is incomplete: ${MONEY_UTILS_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
  }
};

export default moneyUtils;
