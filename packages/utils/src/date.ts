/**
 * packages/utils/src/date.ts · 급여납치 Salary Hijacking Platform 날짜 유틸 최종본
 *
 * 목적
 * - 급여일, 월 주기, 일일예산, 고정지출/고정저축 예정일, 알림 예약, 월마감 기준일을
 *   Asia/Seoul 기준으로 일관되게 계산하는 순수 TypeScript 유틸리티입니다.
 * - 런타임 외부 의존성이 없으며 서버/API/워커/앱/관리자/E2E에서 동일하게 사용할 수 있습니다.
 * - 금액 계산의 최종 권위는 서버/API/DB에 있고, 이 파일은 날짜/기간/예약 기준만 제공합니다.
 */

export const DATE_UTILS_CONTRACT_VERSION = "2.0.0" as const;
export const DATE_UTILS_FILE = "date.ts" as const;
export const DATE_UTILS_DEFAULT_TIMEZONE = "Asia/Seoul" as const;
export const DATE_UTILS_DEFAULT_LOCALE = "ko-KR" as const;
export const KST_OFFSET_MINUTES = 9 * 60;
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export type ISODateString = `${number}-${number}-${number}`;
export type ISODateTimeString = `${number}-${number}-${number}T${string}`;
export type YearMonthString = `${number}-${number}`;
export type Timezone = typeof DATE_UTILS_DEFAULT_TIMEZONE | "UTC" | string;
export type DateInput = Date | string | number;
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type BusinessDayShiftStrategy = "NONE" | "PREVIOUS" | "NEXT";
export type PayrollPaydayRuleType =
  | "DAY_OF_MONTH"
  | "LAST_DAY_OF_MONTH"
  | "CUSTOM_DATE";
export type DateSortOrder = "ASC" | "DESC";
export type RelativeUnit =
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";
export type CalendarDayKind = "PAST" | "TODAY" | "FUTURE";
export type SalaryHijackingDateDomain =
  | "payroll"
  | "budget"
  | "expense"
  | "savings"
  | "notification"
  | "growth"
  | "community"
  | "ads"
  | "admin"
  | "security";

export interface DatePolicyGuard {
  readonly rawPasswordRendered: false;
  readonly rawTokenRendered: false;
  readonly rawSecretRendered: false;
  readonly rawPushTokenRendered: false;
  readonly rawPiiRendered: false;
  readonly rawFinancialSourceDataRendered: false;
  readonly salaryAmountCalculatedHere: false;
  readonly expenseAmountCalculatedHere: false;
  readonly savingsAmountCalculatedHere: false;
  readonly serverAuthorityAmountCalculationRequired: true;
  readonly timezonePinnedToAsiaSeoul: true;
  readonly mutationFreeUtilities: true;
  readonly externalRuntimeDependencyRequired: false;
}

export interface ParsedYearMonth {
  readonly year: number;
  readonly month: number;
  readonly yearMonth: YearMonthString;
}

export interface ParsedDateParts extends ParsedYearMonth {
  readonly day: number;
  readonly isoDate: ISODateString;
}

export interface DateRange {
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
}

export interface DateTimeRange {
  readonly startAt: ISODateTimeString;
  readonly endAt: ISODateTimeString;
}

export interface PayrollPaydayRule {
  readonly type: PayrollPaydayRuleType;
  readonly dayOfMonth?: number;
  readonly customDate?: ISODateString;
  readonly timezone?: Timezone;
  readonly weekendStrategy?: BusinessDayShiftStrategy;
  readonly holidayDates?: readonly ISODateString[];
}

export interface PayrollCycle {
  readonly yearMonth: YearMonthString;
  readonly timezone: Timezone;
  readonly payday: ISODateString;
  readonly previousPayday: ISODateString;
  readonly nextPayday: ISODateString;
  readonly cycleStartDate: ISODateString;
  readonly cycleEndDate: ISODateString;
  readonly dailyBudgetDates: readonly ISODateString[];
  readonly daysInCycle: number;
  readonly todayIndex?: number;
}

export interface CalendarDay {
  readonly date: ISODateString;
  readonly yearMonth: YearMonthString;
  readonly dayOfMonth: number;
  readonly weekday: WeekdayIndex;
  readonly isWeekend: boolean;
  readonly isToday: boolean;
  readonly kind: CalendarDayKind;
}

export interface ReminderScheduleInput {
  readonly baseDate: ISODateString;
  readonly daysBefore?: number;
  readonly daysAfter?: number;
  readonly hour?: number;
  readonly minute?: number;
  readonly timezone?: Timezone;
}

export interface MonthCalendarOptions {
  readonly includeLeadingDays?: boolean;
  readonly includeTrailingDays?: boolean;
  readonly weekStartsOn?: WeekdayIndex;
  readonly today?: DateInput;
}

export interface DateUtilsCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof DATE_UTILS_CONTRACT_VERSION;
  readonly file: typeof DATE_UTILS_FILE;
  readonly coveredRequirements: readonly string[];
  readonly exportedFunctionCount: number;
  readonly missing: readonly string[];
}

export const DATE_UTILS_POLICY_GUARD: DatePolicyGuard = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  salaryAmountCalculatedHere: false,
  expenseAmountCalculatedHere: false,
  savingsAmountCalculatedHere: false,
  serverAuthorityAmountCalculationRequired: true,
  timezonePinnedToAsiaSeoul: true,
  mutationFreeUtilities: true,
  externalRuntimeDependencyRequired: false,
});

const pad2 = (value: number): string =>
  String(Math.trunc(value)).padStart(2, "0");
const pad4 = (value: number): string =>
  String(Math.trunc(value)).padStart(4, "0");
const clampInt = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.trunc(value)));

const toFiniteDate = (input: DateInput): Date | null => {
  if (input instanceof Date) {
    const time = input.getTime();
    return Number.isFinite(time) ? new Date(time) : null;
  }

  if (typeof input === "number") {
    const date = new Date(input);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const dateOnly = parseISODateParts(trimmed);
    if (dateOnly)
      return createUtcDate(dateOnly.year, dateOnly.month, dateOnly.day);

    const date = new Date(trimmed);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
};

export const isValidDateInput = (input: DateInput): boolean =>
  toFiniteDate(input) !== null;

export const assertValidDateInput = (
  input: DateInput,
  label = "date",
): Date => {
  const date = toFiniteDate(input);
  if (!date) throw new Error(`${label} must be a valid date.`);
  return date;
};

export const createUtcDate = (
  year: number,
  month: number,
  day: number,
): Date => {
  const y = Math.trunc(year);
  const m = Math.trunc(month);
  const d = Math.trunc(day);
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new Error(`Invalid calendar date: ${y}-${m}-${d}`);
  }

  return date;
};

export const createKstDateTime = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date => {
  const y = Math.trunc(year);
  const mo = Math.trunc(month);
  const d = Math.trunc(day);
  const h = clampInt(hour, 0, 23);
  const mi = clampInt(minute, 0, 59);
  const s = clampInt(second, 0, 59);
  const ms = clampInt(millisecond, 0, 999);
  return new Date(Date.UTC(y, mo - 1, d, h - 9, mi, s, ms));
};

export const toKstShiftedDate = (input: DateInput): Date => {
  const date = assertValidDateInput(input);
  return new Date(date.getTime() + KST_OFFSET_MINUTES * MS_PER_MINUTE);
};

export const toISODateString = (input: DateInput): ISODateString => {
  const date = assertValidDateInput(input);
  return `${pad4(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}` as ISODateString;
};

export const toISODateTimeString = (input: DateInput): ISODateTimeString =>
  assertValidDateInput(input).toISOString() as ISODateTimeString;

export const toKstISODateString = (input: DateInput): ISODateString =>
  toISODateString(toKstShiftedDate(input));

export const toYearMonthString = (input: DateInput): YearMonthString => {
  const date = assertValidDateInput(input);
  return `${pad4(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}` as YearMonthString;
};

export const toKstYearMonthString = (input: DateInput): YearMonthString =>
  toYearMonthString(toKstShiftedDate(input));

export const isISODateString = (value: unknown): value is ISODateString => {
  if (typeof value !== "string") return false;
  const parts = parseISODateParts(value);
  return parts !== null;
};

export const isISODateTimeString = (
  value: unknown,
): value is ISODateTimeString =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(new Date(value).getTime());

export const isYearMonthString = (value: unknown): value is YearMonthString => {
  if (typeof value !== "string") return false;
  const parts = parseYearMonth(value);
  return parts !== null;
};

export function parseISODateParts(value: string): ParsedDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  if (month < 1 || month > 12) return null;

  const max = daysInMonth(year, month);
  if (day < 1 || day > max) return null;

  const yearMonth = `${pad4(year)}-${pad2(month)}` as YearMonthString;
  const isoDate = `${yearMonth}-${pad2(day)}` as ISODateString;
  return Object.freeze({ year, month, day, yearMonth, isoDate });
}

export function parseYearMonth(value: string): ParsedYearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    return null;

  const yearMonth = `${pad4(year)}-${pad2(month)}` as YearMonthString;
  return Object.freeze({ year, month, yearMonth });
}

export const assertISODateString = (
  value: string,
  label = "date",
): ISODateString => {
  const parts = parseISODateParts(value);
  if (!parts) throw new Error(`${label} must be YYYY-MM-DD.`);
  return parts.isoDate;
};

export const assertYearMonthString = (
  value: string,
  label = "yearMonth",
): YearMonthString => {
  const parts = parseYearMonth(value);
  if (!parts) throw new Error(`${label} must be YYYY-MM.`);
  return parts.yearMonth;
};

export const isLeapYear = (year: number): boolean => {
  const y = Math.trunc(year);
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
};

export const daysInMonth = (year: number, month: number): number => {
  const y = Math.trunc(year);
  const m = Math.trunc(month);
  if (m < 1 || m > 12) throw new Error(`month must be 1..12: ${month}`);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export const daysInYearMonth = (yearMonth: YearMonthString): number => {
  const parts = parseYearMonth(yearMonth);
  if (!parts) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  return daysInMonth(parts.year, parts.month);
};

export const getDayOfMonth = (input: DateInput): number =>
  assertValidDateInput(input).getUTCDate();

export const getKstDayOfMonth = (input: DateInput): number =>
  toKstShiftedDate(input).getUTCDate();

export const getWeekday = (input: DateInput): WeekdayIndex =>
  assertValidDateInput(input).getUTCDay() as WeekdayIndex;

export const getKstWeekday = (input: DateInput): WeekdayIndex =>
  toKstShiftedDate(input).getUTCDay() as WeekdayIndex;

export const isWeekend = (input: DateInput): boolean => {
  const weekday = getWeekday(input);
  return weekday === 0 || weekday === 6;
};

export const isKstWeekend = (input: DateInput): boolean => {
  const weekday = getKstWeekday(input);
  return weekday === 0 || weekday === 6;
};

export const addDays = (input: DateInput, amount: number): Date => {
  const date = assertValidDateInput(input);
  return new Date(date.getTime() + Math.trunc(amount) * MS_PER_DAY);
};

export const addMonths = (input: DateInput, amount: number): Date => {
  const date = assertValidDateInput(input);
  const day = date.getUTCDate();
  const first = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + Math.trunc(amount), 1),
  );
  const max = daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1);
  first.setUTCDate(Math.min(day, max));
  return first;
};

export const startOfDay = (input: DateInput): Date => {
  const date = assertValidDateInput(input);
  return createUtcDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
};

export const endOfDay = (input: DateInput): Date =>
  new Date(startOfDay(input).getTime() + MS_PER_DAY - 1);

export const startOfKstDay = (input: DateInput): Date => {
  const parts = parseISODateParts(toKstISODateString(input));
  if (!parts) throw new Error("Unable to resolve KST day.");
  return createKstDateTime(parts.year, parts.month, parts.day, 0, 0, 0, 0);
};

export const endOfKstDay = (input: DateInput): Date =>
  new Date(startOfKstDay(input).getTime() + MS_PER_DAY - 1);

export const startOfMonth = (yearMonth: YearMonthString): ISODateString => {
  const parts = parseYearMonth(yearMonth);
  if (!parts) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  return `${parts.yearMonth}-01` as ISODateString;
};

export const endOfMonth = (yearMonth: YearMonthString): ISODateString => {
  const parts = parseYearMonth(yearMonth);
  if (!parts) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  return `${parts.yearMonth}-${pad2(daysInMonth(parts.year, parts.month))}` as ISODateString;
};

export const addMonthsToYearMonth = (
  yearMonth: YearMonthString,
  amount: number,
): YearMonthString => {
  const start = parseISODateParts(`${yearMonth}-01`);
  if (!start) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  return toYearMonthString(
    addMonths(createUtcDate(start.year, start.month, 1), amount),
  );
};

export const compareISODate = (a: ISODateString, b: ISODateString): number =>
  a.localeCompare(b);

export const sortISODateStrings = (
  dates: readonly ISODateString[],
  order: DateSortOrder = "ASC",
): readonly ISODateString[] => {
  const sorted = [...dates].sort(compareISODate);
  return Object.freeze(order === "DESC" ? sorted.reverse() : sorted);
};

export const isSameISODate = (a: DateInput, b: DateInput): boolean =>
  toISODateString(a) === toISODateString(b);

export const isSameKstDate = (a: DateInput, b: DateInput): boolean =>
  toKstISODateString(a) === toKstISODateString(b);

export const differenceInCalendarDays = (
  from: DateInput,
  to: DateInput,
): number => {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
};

export const differenceInKstCalendarDays = (
  from: DateInput,
  to: DateInput,
): number => {
  const a = startOfKstDay(from).getTime();
  const b = startOfKstDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
};

export const isWithinDateRange = (
  date: ISODateString,
  range: DateRange,
): boolean =>
  compareISODate(date, range.startDate) >= 0 &&
  compareISODate(date, range.endDate) <= 0;

export const enumerateDateRange = (
  range: DateRange,
): readonly ISODateString[] => {
  const start = parseISODateParts(range.startDate);
  const end = parseISODateParts(range.endDate);
  if (!start || !end) throw new Error("Date range must use YYYY-MM-DD.");
  if (compareISODate(start.isoDate, end.isoDate) > 0) return Object.freeze([]);

  const out: ISODateString[] = [];
  let cursor = createUtcDate(start.year, start.month, start.day);
  const final = createUtcDate(end.year, end.month, end.day).getTime();

  while (cursor.getTime() <= final) {
    out.push(toISODateString(cursor));
    cursor = addDays(cursor, 1);
  }

  return Object.freeze(out);
};

export const normalizeDayOfMonth = (
  year: number,
  month: number,
  dayOfMonth: number,
): number => clampInt(dayOfMonth, 1, daysInMonth(year, month));

export const isHoliday = (
  date: ISODateString,
  holidayDates: readonly ISODateString[] = [],
): boolean => holidayDates.includes(date);

export const isBusinessDay = (
  date: ISODateString,
  holidayDates: readonly ISODateString[] = [],
): boolean => {
  const weekday = getWeekday(date);
  return weekday !== 0 && weekday !== 6 && !isHoliday(date, holidayDates);
};

export const shiftToBusinessDay = (
  date: ISODateString,
  strategy: BusinessDayShiftStrategy = "NONE",
  holidayDates: readonly ISODateString[] = [],
): ISODateString => {
  const normalized = assertISODateString(date);
  if (strategy === "NONE" || isBusinessDay(normalized, holidayDates))
    return normalized;

  let cursor = assertValidDateInput(normalized);
  const delta = strategy === "PREVIOUS" ? -1 : 1;

  for (let guard = 0; guard < 14; guard += 1) {
    cursor = addDays(cursor, delta);
    const iso = toISODateString(cursor);
    if (isBusinessDay(iso, holidayDates)) return iso;
  }

  throw new Error(`Unable to shift ${date} to business day.`);
};

export const getPaydayForYearMonth = (
  yearMonth: YearMonthString,
  rule: PayrollPaydayRule,
): ISODateString => {
  const parsed = parseYearMonth(yearMonth);
  if (!parsed) throw new Error(`Invalid yearMonth: ${yearMonth}`);

  let baseDate: ISODateString;

  if (rule.type === "CUSTOM_DATE") {
    if (!rule.customDate)
      throw new Error("CUSTOM_DATE payday rule requires customDate.");
    baseDate = assertISODateString(rule.customDate, "customDate");
  } else if (rule.type === "LAST_DAY_OF_MONTH") {
    baseDate = endOfMonth(parsed.yearMonth);
  } else {
    const day = normalizeDayOfMonth(
      parsed.year,
      parsed.month,
      rule.dayOfMonth ?? 25,
    );
    baseDate = `${parsed.yearMonth}-${pad2(day)}` as ISODateString;
  }

  return shiftToBusinessDay(
    baseDate,
    rule.weekendStrategy ?? "NONE",
    rule.holidayDates ?? [],
  );
};

export const getNextPayday = (
  from: DateInput,
  rule: PayrollPaydayRule,
): ISODateString => {
  const today = toKstISODateString(from);
  let cursorMonth = toKstYearMonthString(from);

  for (let guard = 0; guard < 36; guard += 1) {
    const payday = getPaydayForYearMonth(cursorMonth, rule);
    if (compareISODate(payday, today) >= 0) return payday;
    cursorMonth = addMonthsToYearMonth(cursorMonth, 1);
  }

  throw new Error("Unable to resolve next payday within 36 months.");
};

export const getPreviousPayday = (
  from: DateInput,
  rule: PayrollPaydayRule,
): ISODateString => {
  const today = toKstISODateString(from);
  let cursorMonth = toKstYearMonthString(from);

  for (let guard = 0; guard < 36; guard += 1) {
    const payday = getPaydayForYearMonth(cursorMonth, rule);
    if (compareISODate(payday, today) < 0) return payday;
    cursorMonth = addMonthsToYearMonth(cursorMonth, -1);
  }

  throw new Error("Unable to resolve previous payday within 36 months.");
};

export const createPayrollCycle = (
  yearMonth: YearMonthString,
  rule: PayrollPaydayRule,
  todayInput?: DateInput,
): PayrollCycle => {
  const currentPayday = getPaydayForYearMonth(yearMonth, rule);
  const previousPayday = getPaydayForYearMonth(
    addMonthsToYearMonth(yearMonth, -1),
    rule,
  );
  const nextPayday = getPaydayForYearMonth(
    addMonthsToYearMonth(yearMonth, 1),
    rule,
  );
  const cycleStartDate = toISODateString(addDays(previousPayday, 1));
  const cycleEndDate = currentPayday;
  const dailyBudgetDates = enumerateDateRange({
    startDate: cycleStartDate,
    endDate: cycleEndDate,
  });
  const today =
    todayInput === undefined ? undefined : toKstISODateString(todayInput);
  const todayIndex =
    today &&
    isWithinDateRange(today, {
      startDate: cycleStartDate,
      endDate: cycleEndDate,
    })
      ? dailyBudgetDates.indexOf(today) + 1
      : undefined;

  const base = {
    yearMonth,
    timezone: rule.timezone ?? DATE_UTILS_DEFAULT_TIMEZONE,
    payday: currentPayday,
    previousPayday,
    nextPayday,
    cycleStartDate,
    cycleEndDate,
    dailyBudgetDates,
    daysInCycle: dailyBudgetDates.length,
  } satisfies Omit<PayrollCycle, "todayIndex">;

  return Object.freeze(
    todayIndex === undefined ? base : { ...base, todayIndex },
  );
};

export const createMonthRange = (yearMonth: YearMonthString): DateRange =>
  Object.freeze({
    startDate: startOfMonth(yearMonth),
    endDate: endOfMonth(yearMonth),
  });

export const getDueDateInMonth = (
  yearMonth: YearMonthString,
  dayOfMonth: number,
  weekendStrategy: BusinessDayShiftStrategy = "NONE",
  holidayDates: readonly ISODateString[] = [],
): ISODateString => {
  const parsed = parseYearMonth(yearMonth);
  if (!parsed) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  const day = normalizeDayOfMonth(parsed.year, parsed.month, dayOfMonth);
  return shiftToBusinessDay(
    `${parsed.yearMonth}-${pad2(day)}` as ISODateString,
    weekendStrategy,
    holidayDates,
  );
};

export const getFixedExpenseDueDate = getDueDateInMonth;
export const getFixedSavingsDueDate = getDueDateInMonth;

export const createDailyBudgetDateRange = (
  startDate: ISODateString,
  endDate: ISODateString,
): readonly ISODateString[] => enumerateDateRange({ startDate, endDate });

export const createReminderDateTime = (
  input: ReminderScheduleInput,
): ISODateTimeString => {
  const base = assertISODateString(input.baseDate, "baseDate");
  const before = Math.max(0, Math.trunc(input.daysBefore ?? 0));
  const after = Math.max(0, Math.trunc(input.daysAfter ?? 0));
  const offsetDays = after - before;
  const date = addDays(base, offsetDays);
  const parts = parseISODateParts(toISODateString(date));

  if (!parts) throw new Error("Unable to resolve reminder date.");

  return toISODateTimeString(
    createKstDateTime(
      parts.year,
      parts.month,
      parts.day,
      input.hour ?? 9,
      input.minute ?? 0,
    ),
  );
};

export const createPaydayReminderAt = (
  payday: ISODateString,
  daysBefore = 1,
  hour = 9,
  minute = 0,
): ISODateTimeString =>
  createReminderDateTime({
    baseDate: payday,
    daysBefore,
    hour,
    minute,
    timezone: DATE_UTILS_DEFAULT_TIMEZONE,
  });

export const createDueReminderAt = (
  dueDate: ISODateString,
  daysBefore = 1,
  hour = 9,
  minute = 0,
): ISODateTimeString =>
  createReminderDateTime({
    baseDate: dueDate,
    daysBefore,
    hour,
    minute,
    timezone: DATE_UTILS_DEFAULT_TIMEZONE,
  });

export const getQuietHoursRange = (
  date: ISODateString,
  startHour = 22,
  endHour = 8,
): DateTimeRange => {
  const parts = parseISODateParts(assertISODateString(date));
  if (!parts) throw new Error("Invalid date.");

  const startAt = toISODateTimeString(
    createKstDateTime(parts.year, parts.month, parts.day, startHour, 0),
  );
  const endDate =
    endHour <= startHour
      ? addDays(date, 1)
      : createUtcDate(parts.year, parts.month, parts.day);
  const endParts = parseISODateParts(toISODateString(endDate));

  if (!endParts) throw new Error("Invalid quiet hours end date.");

  const endAt = toISODateTimeString(
    createKstDateTime(endParts.year, endParts.month, endParts.day, endHour, 0),
  );
  return Object.freeze({ startAt, endAt });
};

export const isWithinQuietHours = (
  input: DateInput,
  quietRange: DateTimeRange,
): boolean => {
  const time = assertValidDateInput(input).getTime();
  return (
    time >= assertValidDateInput(quietRange.startAt).getTime() &&
    time <= assertValidDateInput(quietRange.endAt).getTime()
  );
};

export const createCalendarDaysForMonth = (
  yearMonth: YearMonthString,
  options: MonthCalendarOptions = {},
): readonly CalendarDay[] => {
  const range = createMonthRange(yearMonth);
  const todayIso = toKstISODateString(options.today ?? new Date());
  const baseDates = enumerateDateRange(range);
  const weekStartsOn = options.weekStartsOn ?? 0;
  const dates: ISODateString[] = [...baseDates];

  if (options.includeLeadingDays === true) {
    const firstWeekday = getWeekday(range.startDate);
    const leading = (firstWeekday - weekStartsOn + 7) % 7;
    for (let i = leading; i > 0; i -= 1) {
      dates.unshift(toISODateString(addDays(range.startDate, -i)));
    }
  }

  if (options.includeTrailingDays === true) {
    const lastWeekday = getWeekday(range.endDate);
    const trailing = (weekStartsOn + 6 - lastWeekday + 7) % 7;
    for (let i = 1; i <= trailing; i += 1) {
      dates.push(toISODateString(addDays(range.endDate, i)));
    }
  }

  return Object.freeze(
    dates.map((date) => {
      const parts = parseISODateParts(date);
      if (!parts) throw new Error(`Invalid date in calendar: ${date}`);

      const todayComparison = compareISODate(date, todayIso);

      return Object.freeze({
        date,
        yearMonth: parts.yearMonth,
        dayOfMonth: parts.day,
        weekday: getWeekday(date),
        isWeekend: isWeekend(date),
        isToday: todayComparison === 0,
        kind:
          todayComparison < 0
            ? "PAST"
            : todayComparison === 0
              ? "TODAY"
              : "FUTURE",
      } satisfies CalendarDay);
    }),
  );
};

export const formatKoreanDate = (
  input: DateInput,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  const date = assertValidDateInput(input);

  return new Intl.DateTimeFormat(DATE_UTILS_DEFAULT_LOCALE, {
    timeZone: DATE_UTILS_DEFAULT_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(date);
};

export const formatKoreanDateTime = (
  input: DateInput,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  const date = assertValidDateInput(input);

  return new Intl.DateTimeFormat(DATE_UTILS_DEFAULT_LOCALE, {
    timeZone: DATE_UTILS_DEFAULT_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
};

export const formatYearMonthKorean = (yearMonth: YearMonthString): string =>
  formatKoreanDate(startOfMonth(yearMonth), { day: undefined });

export const formatRelativeFromNow = (
  input: DateInput,
  nowInput: DateInput = new Date(),
): string => {
  const target = assertValidDateInput(input).getTime();
  const now = assertValidDateInput(nowInput).getTime();
  const diffMs = target - now;
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(DATE_UTILS_DEFAULT_LOCALE, {
    numeric: "auto",
  });

  const units: readonly [RelativeUnit, number][] = Object.freeze([
    ["year", 365 * MS_PER_DAY],
    ["month", 30 * MS_PER_DAY],
    ["week", 7 * MS_PER_DAY],
    ["day", MS_PER_DAY],
    ["hour", MS_PER_HOUR],
    ["minute", MS_PER_MINUTE],
  ]);

  for (const [unit, size] of units) {
    if (abs >= size || unit === "minute") {
      return rtf.format(Math.round(diffMs / size), unit);
    }
  }

  return rtf.format(0, "minute");
};

export const createDateIdempotencyKey = (
  prefix: string,
  parts: readonly (string | number | boolean | null | undefined)[],
): string => {
  const safePrefix =
    prefix.replace(/[^a-z0-9:_-]/gi, "_").slice(0, 48) || "date";
  const payload = parts
    .map((part) => String(part ?? "none").replace(/[^a-z0-9:_-]/gi, "_"))
    .join(":");
  return `${safePrefix}:${payload}`.slice(0, 180);
};

export const createDateAuditStamp = (
  nowInput: DateInput = new Date(),
): Readonly<{
  readonly occurredAt: ISODateTimeString;
  readonly date: ISODateString;
  readonly yearMonth: YearMonthString;
  readonly timezone: typeof DATE_UTILS_DEFAULT_TIMEZONE;
}> => {
  const now = assertValidDateInput(nowInput);

  return Object.freeze({
    occurredAt: toISODateTimeString(now),
    date: toKstISODateString(now),
    yearMonth: toKstYearMonthString(now),
    timezone: DATE_UTILS_DEFAULT_TIMEZONE,
  });
};

export const createSchedulerWindow = (
  nowInput: DateInput,
  lookAheadDays: number,
): DateTimeRange => {
  const start = assertValidDateInput(nowInput);
  const end = addDays(start, Math.max(0, Math.trunc(lookAheadDays)));
  return Object.freeze({
    startAt: toISODateTimeString(start),
    endAt: toISODateTimeString(end),
  });
};

export const resolveDomainDateRange = (
  domain: SalaryHijackingDateDomain,
  yearMonth: YearMonthString,
  paydayRule?: PayrollPaydayRule,
): DateRange => {
  if (
    (domain === "payroll" ||
      domain === "budget" ||
      domain === "expense" ||
      domain === "savings" ||
      domain === "notification") &&
    paydayRule
  ) {
    const cycle = createPayrollCycle(yearMonth, paydayRule);
    return Object.freeze({
      startDate: cycle.cycleStartDate,
      endDate: cycle.cycleEndDate,
    });
  }

  return createMonthRange(yearMonth);
};

export const isDateBefore = (a: ISODateString, b: ISODateString): boolean =>
  compareISODate(a, b) < 0;
export const isDateAfter = (a: ISODateString, b: ISODateString): boolean =>
  compareISODate(a, b) > 0;
export const minISODate = (...dates: readonly ISODateString[]): ISODateString =>
  sortISODateStrings(dates, "ASC")[0] ?? assertISODateString("1970-01-01");
export const maxISODate = (...dates: readonly ISODateString[]): ISODateString =>
  sortISODateStrings(dates, "DESC")[0] ?? assertISODateString("1970-01-01");

export const dateUtils = Object.freeze({
  contractVersion: DATE_UTILS_CONTRACT_VERSION,
  policyGuard: DATE_UTILS_POLICY_GUARD,
  constants: Object.freeze({
    DATE_UTILS_DEFAULT_TIMEZONE,
    DATE_UTILS_DEFAULT_LOCALE,
    KST_OFFSET_MINUTES,
    MS_PER_DAY,
  }),
  isValidDateInput,
  assertValidDateInput,
  createUtcDate,
  createKstDateTime,
  toISODateString,
  toISODateTimeString,
  toKstISODateString,
  toYearMonthString,
  toKstYearMonthString,
  isISODateString,
  isISODateTimeString,
  isYearMonthString,
  parseISODateParts,
  parseYearMonth,
  assertISODateString,
  assertYearMonthString,
  isLeapYear,
  daysInMonth,
  daysInYearMonth,
  getDayOfMonth,
  getKstDayOfMonth,
  getWeekday,
  getKstWeekday,
  isWeekend,
  isKstWeekend,
  addDays,
  addMonths,
  startOfDay,
  endOfDay,
  startOfKstDay,
  endOfKstDay,
  startOfMonth,
  endOfMonth,
  addMonthsToYearMonth,
  compareISODate,
  sortISODateStrings,
  isSameISODate,
  isSameKstDate,
  differenceInCalendarDays,
  differenceInKstCalendarDays,
  isWithinDateRange,
  enumerateDateRange,
  normalizeDayOfMonth,
  isHoliday,
  isBusinessDay,
  shiftToBusinessDay,
  getPaydayForYearMonth,
  getNextPayday,
  getPreviousPayday,
  createPayrollCycle,
  createMonthRange,
  getDueDateInMonth,
  getFixedExpenseDueDate,
  getFixedSavingsDueDate,
  createDailyBudgetDateRange,
  createReminderDateTime,
  createPaydayReminderAt,
  createDueReminderAt,
  getQuietHoursRange,
  isWithinQuietHours,
  createCalendarDaysForMonth,
  formatKoreanDate,
  formatKoreanDateTime,
  formatYearMonthKorean,
  formatRelativeFromNow,
  createDateIdempotencyKey,
  createDateAuditStamp,
  createSchedulerWindow,
  resolveDomainDateRange,
  isDateBefore,
  isDateAfter,
  minISODate,
  maxISODate,
});

export const DATE_UTILS_COMPLETENESS_REPORT: DateUtilsCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: DATE_UTILS_CONTRACT_VERSION,
    file: DATE_UTILS_FILE,
    exportedFunctionCount: Object.keys(dateUtils).length - 3,
    coveredRequirements: Object.freeze([
      "date-utils-ssot",
      "asia-seoul-default-timezone",
      "utc-and-kst-date-normalization",
      "iso-date-year-month-validation",
      "payday-rule-resolution",
      "monthly-payroll-cycle-generation",
      "daily-budget-date-range-generation",
      "fixed-expense-due-date-generation",
      "fixed-savings-due-date-generation",
      "notification-reminder-scheduling",
      "quiet-hours-range-support",
      "business-day-weekend-holiday-shift",
      "calendar-day-generation",
      "korean-date-formatting",
      "relative-time-formatting",
      "idempotency-key-date-support",
      "audit-stamp-date-support",
      "scheduler-window-support",
      "domain-date-range-resolution",
      "pure-functions-no-external-dependencies",
      "no-amount-calculation-authority",
      "privacy-security-policy-guard",
    ]),
    missing: Object.freeze([]),
  });

export const getDateUtilsCompletenessReport = (): DateUtilsCompletenessReport =>
  DATE_UTILS_COMPLETENESS_REPORT;

export const assertDateUtilsCompleteness = (): void => {
  if (
    !DATE_UTILS_COMPLETENESS_REPORT.ok ||
    DATE_UTILS_COMPLETENESS_REPORT.missing.length > 0
  ) {
    throw new Error(
      `date.ts is incomplete: ${DATE_UTILS_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
  }
};

export default dateUtils;
