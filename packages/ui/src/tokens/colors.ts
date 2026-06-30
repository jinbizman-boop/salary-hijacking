/** packages/ui/src/tokens/colors.ts · 급여납치 UI Color Tokens 최종본 */
export const COLORS_CONTRACT_VERSION = "2.0.0" as const;
export const COLORS_TOKEN_FILE = "colors.ts" as const;
export const COLORS_DEFAULT_MODE = "light" as const;
export const COLORS_MINIMUM_CONTRAST_NORMAL_TEXT = 4.5 as const;
export const COLORS_MINIMUM_CONTRAST_LARGE_TEXT = 3 as const;

export type ColorMode = "light" | "dark";
export type HexColor = `#${string}`;
export type RgbaColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type ColorValue = HexColor | RgbaColor | "transparent" | "currentColor";
export type PlatformColorDomain =
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
export type PlatformColorStatus =
  | "idle"
  | "draft"
  | "scheduled"
  | "active"
  | "success"
  | "safe"
  | "info"
  | "caution"
  | "warning"
  | "danger"
  | "error"
  | "disabled"
  | "locked"
  | "deleted";
export type ExpenseCategoryColorKey =
  | "subscription"
  | "loan"
  | "insurance"
  | "telecom"
  | "housing"
  | "transport"
  | "card"
  | "tax"
  | "education"
  | "medical"
  | "meal"
  | "cafe"
  | "shopping"
  | "cultureGame"
  | "living"
  | "gift"
  | "travel"
  | "saving"
  | "other";

export interface ColorScale {
  readonly 0: HexColor;
  readonly 25: HexColor;
  readonly 50: HexColor;
  readonly 100: HexColor;
  readonly 200: HexColor;
  readonly 300: HexColor;
  readonly 400: HexColor;
  readonly 500: HexColor;
  readonly 600: HexColor;
  readonly 700: HexColor;
  readonly 800: HexColor;
  readonly 900: HexColor;
  readonly 950: HexColor;
}
export interface ToneColorSet {
  readonly foreground: ColorValue;
  readonly background: ColorValue;
  readonly border: ColorValue;
  readonly emphasis: ColorValue;
  readonly muted: ColorValue;
}
export interface SemanticColorScheme {
  readonly mode: ColorMode;
  readonly brand: Readonly<
    Record<
      | "primary"
      | "primaryHover"
      | "primaryPressed"
      | "primarySoft"
      | "primaryText"
      | "accent"
      | "accentSoft"
      | "logo",
      ColorValue
    >
  >;
  readonly background: Readonly<
    Record<
      | "canvas"
      | "surface"
      | "surfaceRaised"
      | "surfaceSunken"
      | "overlay"
      | "scrim"
      | "inverse",
      ColorValue
    >
  >;
  readonly text: Readonly<
    Record<
      | "primary"
      | "secondary"
      | "tertiary"
      | "disabled"
      | "inverse"
      | "link"
      | "danger"
      | "success"
      | "warning",
      ColorValue
    >
  >;
  readonly border: Readonly<
    Record<
      | "default"
      | "muted"
      | "strong"
      | "focus"
      | "danger"
      | "success"
      | "warning",
      ColorValue
    >
  >;
  readonly status: Readonly<Record<PlatformColorStatus, ToneColorSet>>;
  readonly domain: Readonly<Record<PlatformColorDomain, ToneColorSet>>;
  readonly expenseCategory: Readonly<
    Record<ExpenseCategoryColorKey, ToneColorSet>
  >;
  readonly notificationChannel: Readonly<
    Record<"push" | "inApp" | "email" | "sms" | "mock", ToneColorSet>
  >;
  readonly chart: Readonly<
    Record<
      | "series1"
      | "series2"
      | "series3"
      | "series4"
      | "series5"
      | "series6"
      | "grid"
      | "axis"
      | "positive"
      | "negative"
      | "neutral",
      ColorValue
    >
  >;
  readonly focus: Readonly<
    Record<"ring" | "ringOffset" | "highContrast", ColorValue>
  >;
  readonly shadow: Readonly<Record<"subtle" | "raised" | "modal", ColorValue>>;
}
export interface ColorCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof COLORS_CONTRACT_VERSION;
  readonly tokenFile: typeof COLORS_TOKEN_FILE;
  readonly primitiveScaleCount: number;
  readonly semanticModeCount: number;
  readonly domainCount: number;
  readonly statusCount: number;
  readonly expenseCategoryCount: number;
  readonly coveredRequirements: readonly string[];
  readonly missing: readonly string[];
}

const sc = (c: readonly HexColor[]): ColorScale =>
  Object.freeze({
    0: c[0]!,
    25: c[1]!,
    50: c[2]!,
    100: c[3]!,
    200: c[4]!,
    300: c[5]!,
    400: c[6]!,
    500: c[7]!,
    600: c[8]!,
    700: c[9]!,
    800: c[10]!,
    900: c[11]!,
    950: c[12]!,
  });
const tn = (
  foreground: ColorValue,
  background: ColorValue,
  border: ColorValue,
  emphasis: ColorValue,
  muted: ColorValue,
): ToneColorSet =>
  Object.freeze({ foreground, background, border, emphasis, muted });

export const COLORS_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  salaryAmountEncodedInColor: false,
  expenseAmountEncodedInColor: false,
  savingsAmountEncodedInColor: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  colorOnlyMeaningAllowed: false,
  accessibleContrastUtilitiesIncluded: true,
  darkModeIncluded: true,
  highContrastStateIncluded: true,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
});

export const colorPrimitives = Object.freeze({
  slate: sc([
    "#ffffff",
    "#fcfdff",
    "#f8fafc",
    "#f1f5f9",
    "#e2e8f0",
    "#cbd5e1",
    "#94a3b8",
    "#64748b",
    "#475569",
    "#334155",
    "#1e293b",
    "#0f172a",
    "#020617",
  ]),
  blue: sc([
    "#ffffff",
    "#f5f9ff",
    "#eff6ff",
    "#dbeafe",
    "#bfdbfe",
    "#93c5fd",
    "#60a5fa",
    "#3b82f6",
    "#2563eb",
    "#1d4ed8",
    "#1e40af",
    "#1e3a8a",
    "#172554",
  ]),
  green: sc([
    "#ffffff",
    "#f6fff9",
    "#f0fdf4",
    "#dcfce7",
    "#bbf7d0",
    "#86efac",
    "#4ade80",
    "#22c55e",
    "#16a34a",
    "#15803d",
    "#166534",
    "#14532d",
    "#052e16",
  ]),
  red: sc([
    "#ffffff",
    "#fff8f8",
    "#fef2f2",
    "#fee2e2",
    "#fecaca",
    "#fca5a5",
    "#f87171",
    "#ef4444",
    "#dc2626",
    "#b91c1c",
    "#991b1b",
    "#7f1d1d",
    "#450a0a",
  ]),
  amber: sc([
    "#ffffff",
    "#fffcf5",
    "#fffbeb",
    "#fef3c7",
    "#fde68a",
    "#fcd34d",
    "#fbbf24",
    "#f59e0b",
    "#d97706",
    "#b45309",
    "#92400e",
    "#78350f",
    "#451a03",
  ]),
  violet: sc([
    "#ffffff",
    "#fbfaff",
    "#f5f3ff",
    "#ede9fe",
    "#ddd6fe",
    "#c4b5fd",
    "#a78bfa",
    "#8b5cf6",
    "#7c3aed",
    "#6d28d9",
    "#5b21b6",
    "#4c1d95",
    "#2e1065",
  ]),
  cyan: sc([
    "#ffffff",
    "#f5fdff",
    "#ecfeff",
    "#cffafe",
    "#a5f3fc",
    "#67e8f9",
    "#22d3ee",
    "#06b6d4",
    "#0891b2",
    "#0e7490",
    "#155e75",
    "#164e63",
    "#083344",
  ]),
  pink: sc([
    "#ffffff",
    "#fff7fb",
    "#fdf2f8",
    "#fce7f3",
    "#fbcfe8",
    "#f9a8d4",
    "#f472b6",
    "#ec4899",
    "#db2777",
    "#be185d",
    "#9d174d",
    "#831843",
    "#500724",
  ]),
  gold: sc([
    "#ffffff",
    "#fffdf2",
    "#fff9db",
    "#fff3b0",
    "#ffe477",
    "#f7d34d",
    "#eab308",
    "#ca8a04",
    "#a16207",
    "#854d0e",
    "#713f12",
    "#422006",
    "#281304",
  ]),
} as const);
const p = colorPrimitives;

const status = Object.freeze({
  idle: tn(
    p.slate[700],
    p.slate[100],
    p.slate[200],
    p.slate[900],
    p.slate[500],
  ),
  draft: tn(
    p.slate[700],
    p.slate[100],
    p.slate[200],
    p.slate[900],
    p.slate[500],
  ),
  scheduled: tn(p.blue[700], p.blue[50], p.blue[200], p.blue[800], p.blue[600]),
  active: tn(p.blue[700], p.blue[100], p.blue[200], p.blue[800], p.blue[600]),
  success: tn(
    p.green[700],
    p.green[50],
    p.green[200],
    p.green[800],
    p.green[600],
  ),
  safe: tn(
    p.green[700],
    p.green[100],
    p.green[200],
    p.green[800],
    p.green[600],
  ),
  info: tn(p.blue[700], p.blue[50], p.blue[200], p.blue[800], p.blue[600]),
  caution: tn(
    p.amber[800],
    p.amber[50],
    p.amber[200],
    p.amber[900],
    p.amber[700],
  ),
  warning: tn(
    p.amber[800],
    p.amber[100],
    p.amber[300],
    p.amber[900],
    p.amber[700],
  ),
  danger: tn(p.red[700], p.red[50], p.red[200], p.red[800], p.red[600]),
  error: tn(p.red[700], p.red[100], p.red[200], p.red[800], p.red[600]),
  disabled: tn(
    p.slate[400],
    p.slate[100],
    p.slate[200],
    p.slate[500],
    p.slate[400],
  ),
  locked: tn(
    p.slate[600],
    p.slate[200],
    p.slate[300],
    p.slate[700],
    p.slate[500],
  ),
  deleted: tn(p.red[700], p.red[50], p.red[200], p.red[800], p.red[600]),
}) satisfies Readonly<Record<PlatformColorStatus, ToneColorSet>>;
const domain = Object.freeze({
  payroll: tn(p.blue[700], p.blue[50], p.blue[200], p.blue[800], p.blue[600]),
  budget: tn(p.cyan[700], p.cyan[50], p.cyan[200], p.cyan[800], p.cyan[600]),
  expense: tn(p.red[700], p.red[50], p.red[200], p.red[800], p.red[600]),
  savings: tn(
    p.green[700],
    p.green[50],
    p.green[200],
    p.green[800],
    p.green[600],
  ),
  notification: tn(
    p.violet[700],
    p.violet[50],
    p.violet[200],
    p.violet[800],
    p.violet[600],
  ),
  growth: tn(p.gold[700], p.gold[50], p.gold[200], p.gold[800], p.gold[600]),
  community: tn(p.pink[700], p.pink[50], p.pink[200], p.pink[800], p.pink[600]),
  ads: tn(p.cyan[700], p.cyan[50], p.cyan[200], p.cyan[800], p.cyan[600]),
  admin: tn(
    p.slate[700],
    p.slate[100],
    p.slate[300],
    p.slate[900],
    p.slate[600],
  ),
  security: tn(p.red[700], p.red[50], p.red[200], p.red[800], p.red[600]),
}) satisfies Readonly<Record<PlatformColorDomain, ToneColorSet>>;
const expenseCategory = Object.freeze({
  subscription: domain.notification,
  loan: domain.expense,
  insurance: domain.payroll,
  telecom: domain.budget,
  housing: status.caution,
  transport: domain.payroll,
  card: domain.admin,
  tax: domain.expense,
  education: domain.notification,
  medical: domain.savings,
  meal: status.caution,
  cafe: domain.growth,
  shopping: domain.community,
  cultureGame: domain.notification,
  living: domain.admin,
  gift: domain.community,
  travel: domain.budget,
  saving: domain.savings,
  other: domain.admin,
}) satisfies Readonly<Record<ExpenseCategoryColorKey, ToneColorSet>>;
const notificationChannel = Object.freeze({
  push: domain.payroll,
  inApp: domain.notification,
  email: domain.savings,
  sms: status.caution,
  mock: domain.admin,
});

export const lightColorScheme: SemanticColorScheme = Object.freeze({
  mode: "light",
  brand: Object.freeze({
    primary: p.blue[600],
    primaryHover: p.blue[700],
    primaryPressed: p.blue[800],
    primarySoft: p.blue[100],
    primaryText: p.blue[700],
    accent: p.gold[300],
    accentSoft: p.gold[50],
    logo: p.blue[700],
  }),
  background: Object.freeze({
    canvas: p.slate[50],
    surface: p.slate[0],
    surfaceRaised: p.slate[0],
    surfaceSunken: p.slate[100],
    overlay: "rgba(15, 23, 42, 0.64)",
    scrim: "rgba(2, 6, 23, 0.48)",
    inverse: p.slate[900],
  }),
  text: Object.freeze({
    primary: p.slate[900],
    secondary: p.slate[700],
    tertiary: p.slate[500],
    disabled: p.slate[400],
    inverse: p.slate[0],
    link: p.blue[700],
    danger: p.red[700],
    success: p.green[700],
    warning: p.amber[700],
  }),
  border: Object.freeze({
    default: p.slate[200],
    muted: p.slate[100],
    strong: p.slate[300],
    focus: p.blue[500],
    danger: p.red[200],
    success: p.green[200],
    warning: p.amber[200],
  }),
  status,
  domain,
  expenseCategory,
  notificationChannel,
  chart: Object.freeze({
    series1: p.blue[600],
    series2: p.green[600],
    series3: p.amber[500],
    series4: p.violet[600],
    series5: p.pink[600],
    series6: p.cyan[600],
    grid: p.slate[200],
    axis: p.slate[500],
    positive: p.green[600],
    negative: p.red[600],
    neutral: p.slate[500],
  }),
  focus: Object.freeze({
    ring: p.blue[500],
    ringOffset: p.slate[0],
    highContrast: p.gold[300],
  }),
  shadow: Object.freeze({
    subtle: "rgba(15, 23, 42, 0.06)",
    raised: "rgba(15, 23, 42, 0.12)",
    modal: "rgba(2, 6, 23, 0.44)",
  }),
});
export const darkColorScheme: SemanticColorScheme = Object.freeze({
  ...lightColorScheme,
  mode: "dark",
  brand: Object.freeze({
    primary: p.blue[400],
    primaryHover: p.blue[300],
    primaryPressed: p.blue[200],
    primarySoft: "rgba(59, 130, 246, 0.18)",
    primaryText: p.blue[200],
    accent: p.gold[300],
    accentSoft: "rgba(247, 211, 77, 0.15)",
    logo: p.blue[300],
  }),
  background: Object.freeze({
    canvas: p.slate[950],
    surface: p.slate[900],
    surfaceRaised: p.slate[800],
    surfaceSunken: p.slate[950],
    overlay: "rgba(2, 6, 23, 0.76)",
    scrim: "rgba(2, 6, 23, 0.72)",
    inverse: p.slate[0],
  }),
  text: Object.freeze({
    primary: p.slate[50],
    secondary: p.slate[200],
    tertiary: p.slate[400],
    disabled: p.slate[600],
    inverse: p.slate[950],
    link: p.blue[300],
    danger: p.red[300],
    success: p.green[300],
    warning: p.amber[300],
  }),
  border: Object.freeze({
    default: p.slate[700],
    muted: p.slate[800],
    strong: p.slate[600],
    focus: p.blue[400],
    danger: p.red[700],
    success: p.green[700],
    warning: p.amber[700],
  }),
  chart: Object.freeze({
    series1: p.blue[400],
    series2: p.green[400],
    series3: p.amber[300],
    series4: p.violet[400],
    series5: p.pink[400],
    series6: p.cyan[400],
    grid: p.slate[700],
    axis: p.slate[400],
    positive: p.green[400],
    negative: p.red[400],
    neutral: p.slate[400],
  }),
  focus: Object.freeze({
    ring: p.blue[400],
    ringOffset: p.slate[950],
    highContrast: p.gold[300],
  }),
  shadow: Object.freeze({
    subtle: "rgba(0, 0, 0, 0.18)",
    raised: "rgba(0, 0, 0, 0.32)",
    modal: "rgba(0, 0, 0, 0.72)",
  }),
});
export const colorSchemes: Readonly<Record<ColorMode, SemanticColorScheme>> =
  Object.freeze({ light: lightColorScheme, dark: darkColorScheme });
export const colorAliases = Object.freeze({
  paycheckBlue: p.blue[600],
  hijackGold: p.gold[300],
  salarySafeGreen: p.green[600],
  overExpenseRed: p.red[600],
  budgetCyan: p.cyan[600],
  levelUpViolet: p.violet[600],
  communityPink: p.pink[600],
  adminSlate: p.slate[700],
});

const parseHex = (value: string): readonly [number, number, number] | null => {
  const s = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(s);
  if (short) {
    const h = short[1] ?? "000";
    return [
      parseInt(`${h[0]}${h[0]}`, 16),
      parseInt(`${h[1]}${h[1]}`, 16),
      parseInt(`${h[2]}${h[2]}`, 16),
    ];
  }
  const full = /^#([0-9a-f]{6})$/i.exec(s);
  if (!full) return null;
  const h = full[1] ?? "000000";
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};
const normalizeAlpha = (alpha: number): number =>
  Number.isFinite(alpha)
    ? Math.max(0, Math.min(1, Math.round(alpha * 1000) / 1000))
    : 1;
export const isHexColor = (value: unknown): value is HexColor =>
  typeof value === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
export const withAlpha = (color: ColorValue, alpha: number): ColorValue => {
  if (!isHexColor(color)) return color;
  const rgb = parseHex(color);
  if (!rgb) return color;
  const [red, green, blue] = rgb;
  return `rgba(${red}, ${green}, ${blue}, ${normalizeAlpha(alpha)})`;
};
const linearize = (channel: number): number => {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};
export const getRelativeLuminance = (color: ColorValue): number => {
  if (!isHexColor(color)) return 0;
  const rgb = parseHex(color);
  if (!rgb) return 0;
  const [red, green, blue] = rgb;
  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
};
export const getContrastRatio = (
  foreground: ColorValue,
  background: ColorValue,
): number => {
  const fg = getRelativeLuminance(foreground);
  const bg = getRelativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
};
export const meetsWcagAaNormalText = (
  foreground: ColorValue,
  background: ColorValue,
): boolean =>
  getContrastRatio(foreground, background) >=
  COLORS_MINIMUM_CONTRAST_NORMAL_TEXT;
export const meetsWcagAaLargeText = (
  foreground: ColorValue,
  background: ColorValue,
): boolean =>
  getContrastRatio(foreground, background) >=
  COLORS_MINIMUM_CONTRAST_LARGE_TEXT;
export const getAccessibleTextColor = (
  background: ColorValue,
  mode: ColorMode = COLORS_DEFAULT_MODE,
): ColorValue => {
  const scheme = colorSchemes[mode];
  const darkText = mode === "dark" ? scheme.text.primary : p.slate[900];
  const lightText = p.slate[0];
  return getContrastRatio(darkText, background) >=
    getContrastRatio(lightText, background)
    ? darkText
    : lightText;
};
export const getColorScheme = (
  mode: ColorMode = COLORS_DEFAULT_MODE,
): SemanticColorScheme => colorSchemes[mode];
export const getDomainColors = (
  key: PlatformColorDomain,
  mode: ColorMode = COLORS_DEFAULT_MODE,
): ToneColorSet => colorSchemes[mode].domain[key];
export const getStatusColors = (
  key: PlatformColorStatus,
  mode: ColorMode = COLORS_DEFAULT_MODE,
): ToneColorSet => colorSchemes[mode].status[key];
export const getExpenseCategoryColors = (
  key: ExpenseCategoryColorKey,
  mode: ColorMode = COLORS_DEFAULT_MODE,
): ToneColorSet => colorSchemes[mode].expenseCategory[key];
const kebab = (value: string): string =>
  value
    .replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
const flattenColors = (
  input: unknown,
  path: readonly string[],
  output: Record<string, string>,
  prefix: string,
): void => {
  if (typeof input === "string") {
    output[`${prefix}-${path.map(kebab).join("-")}`] = input;
    return;
  }
  if (!input || typeof input !== "object") return;
  for (const [key, value] of Object.entries(input))
    flattenColors(value, [...path, key], output, prefix);
};
export const createColorCssVariables = (
  scheme: SemanticColorScheme = lightColorScheme,
  prefix = "--sh-color",
): Readonly<Record<string, string>> => {
  const output: Record<string, string> = {};
  flattenColors(scheme, [], output, prefix);
  return Object.freeze(output);
};
export const lightColorCssVariables = createColorCssVariables(lightColorScheme);
export const darkColorCssVariables = createColorCssVariables(darkColorScheme);

export const colors = Object.freeze({
  contractVersion: COLORS_CONTRACT_VERSION,
  policyGuard: COLORS_POLICY_GUARD,
  primitives: colorPrimitives,
  aliases: colorAliases,
  schemes: colorSchemes,
  light: lightColorScheme,
  dark: darkColorScheme,
  cssVariables: Object.freeze({
    light: lightColorCssVariables,
    dark: darkColorCssVariables,
  }),
  utils: Object.freeze({
    isHexColor,
    withAlpha,
    getRelativeLuminance,
    getContrastRatio,
    meetsWcagAaNormalText,
    meetsWcagAaLargeText,
    getAccessibleTextColor,
    getColorScheme,
    getDomainColors,
    getStatusColors,
    getExpenseCategoryColors,
    createColorCssVariables,
  }),
});
export const COLORS_COMPLETENESS_REPORT: ColorCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: COLORS_CONTRACT_VERSION,
    tokenFile: COLORS_TOKEN_FILE,
    primitiveScaleCount: Object.keys(colorPrimitives).length,
    semanticModeCount: Object.keys(colorSchemes).length,
    domainCount: Object.keys(lightColorScheme.domain).length,
    statusCount: Object.keys(lightColorScheme.status).length,
    expenseCategoryCount: Object.keys(lightColorScheme.expenseCategory).length,
    coveredRequirements: Object.freeze([
      "brand-color-ssot",
      "light-mode-scheme",
      "dark-mode-scheme",
      "payroll-domain-colors",
      "budget-domain-colors",
      "expense-domain-colors",
      "savings-domain-colors",
      "notification-domain-colors",
      "growth-level-up-domain-colors",
      "community-domain-colors",
      "ads-partner-separated-colors",
      "admin-operation-colors",
      "security-danger-colors",
      "fixed-variable-expense-category-colors",
      "notification-channel-colors",
      "status-safe-caution-danger-disabled-locked-colors",
      "chart-series-colors",
      "focus-ring-colors",
      "shadow-overlay-colors",
      "wcag-contrast-utilities",
      "css-variable-generation",
      "react-jsx-runtime-not-required",
      "global-jsx-augmentation-not-required",
      "privacy-financial-source-policy-guard",
    ]),
    missing: Object.freeze([]),
  });
export const getColorsCompletenessReport = (): ColorCompletenessReport =>
  COLORS_COMPLETENESS_REPORT;
export const assertColorsCompleteness = (): void => {
  if (!COLORS_COMPLETENESS_REPORT.ok)
    throw new Error(
      `colors.ts is incomplete: ${COLORS_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
};
export default colors;
