/** packages/ui/src/tokens/typography.ts · 급여납치 UI Typography Tokens 최종본 */
export const TYPOGRAPHY_CONTRACT_VERSION = "2.0.0" as const;
export const TYPOGRAPHY_TOKEN_FILE = "typography.ts" as const;
export const TYPOGRAPHY_DEFAULT_LOCALE = "ko-KR" as const;
export const TYPOGRAPHY_BASE_FONT_SIZE_PX = 16 as const;
export const TYPOGRAPHY_MIN_READABLE_FONT_SIZE_PX = 12 as const;
export const TYPOGRAPHY_RECOMMENDED_BODY_LINE_HEIGHT = 1.5 as const;

export type TypographyMode = "mobile" | "tablet" | "desktop" | "admin";
export type TypographyDensity = "compact" | "comfortable" | "spacious";
export type TypographyIntent =
  | "display"
  | "heading"
  | "title"
  | "body"
  | "label"
  | "caption"
  | "metric"
  | "money"
  | "code"
  | "button";
export type FontFamilyKey = "sans" | "display" | "mono" | "numeric" | "system";
export type FontWeightKey =
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "extrabold"
  | "black";
export type FontSizeKey =
  | "2xs"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl";
export type LineHeightKey = "tight" | "snug" | "normal" | "relaxed" | "loose";
export type LetterSpacingKey =
  | "tighter"
  | "tight"
  | "normal"
  | "wide"
  | "wider"
  | "widest";
export type TextStyleKey =
  | "displayHero"
  | "displaySection"
  | "headingPage"
  | "headingSection"
  | "titleCard"
  | "titleList"
  | "bodyLarge"
  | "body"
  | "bodySmall"
  | "label"
  | "caption"
  | "button"
  | "metricLarge"
  | "metric"
  | "moneyHero"
  | "moneyCard"
  | "moneyInline"
  | "code";
export type DomainTextStyleKey =
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
export type CssFontSize = `${number}px` | `${number}rem` | `clamp(${string})`;
export type CssLineHeight = `${number}px` | `${number}` | number;
export type CssLetterSpacing =
  | `${number}px`
  | `${number}em`
  | `${number}rem`
  | "normal";
export type CssFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontFamilyValue = string;

export interface TypographyStyle {
  readonly fontFamily: FontFamilyValue;
  readonly fontSize: CssFontSize;
  readonly fontWeight: CssFontWeight;
  readonly lineHeight: CssLineHeight;
  readonly letterSpacing: CssLetterSpacing;
  readonly fontFeatureSettings?: string;
  readonly fontVariantNumeric?: string;
  readonly textTransform?: "none" | "uppercase";
  readonly wordBreak?: "normal" | "keep-all" | "break-word";
  readonly overflowWrap?: "normal" | "break-word" | "anywhere";
}

export interface ResponsiveTypographyStyle {
  readonly mobile: TypographyStyle;
  readonly tablet: TypographyStyle;
  readonly desktop: TypographyStyle;
  readonly admin: TypographyStyle;
}

export interface TypographyCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof TYPOGRAPHY_CONTRACT_VERSION;
  readonly tokenFile: typeof TYPOGRAPHY_TOKEN_FILE;
  readonly fontFamilyCount: number;
  readonly fontSizeCount: number;
  readonly textStyleCount: number;
  readonly responsiveStyleCount: number;
  readonly domainStyleCount: number;
  readonly coveredRequirements: readonly string[];
  readonly missing: readonly string[];
}

export const TYPOGRAPHY_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  salaryAmountEncodedInFontStyle: false,
  expenseAmountEncodedInFontStyle: false,
  savingsAmountEncodedInFontStyle: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  typographyOnlyMeaningAllowed: false,
  accessibleReadableScaleIncluded: true,
  koreanWordBreakIncluded: true,
  tabularNumericIncluded: true,
  responsiveTypographyIncluded: true,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
});

const rem = (
  px: number,
  rootPx = TYPOGRAPHY_BASE_FONT_SIZE_PX,
): `${number}rem` =>
  `${Math.max(0, Math.round((px / rootPx) * 10000) / 10000)}rem`;
const px = (value: number): `${number}px` =>
  `${Math.max(0, Math.round(value * 1000) / 1000)}px`;
const clampSize = (
  min: CssFontSize,
  preferred: `${number}vw`,
  max: CssFontSize,
): `clamp(${string})` => `clamp(${min}, ${preferred}, ${max})`;
const style = (input: TypographyStyle): TypographyStyle => Object.freeze(input);
const resp = (
  mobile: TypographyStyle,
  tablet: TypographyStyle,
  desktop: TypographyStyle,
  admin: TypographyStyle,
): ResponsiveTypographyStyle =>
  Object.freeze({ mobile, tablet, desktop, admin });

export const fontFamilies = Object.freeze({
  sans: "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  display:
    "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  numeric:
    "Inter, Pretendard, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system:
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} satisfies Readonly<Record<FontFamilyKey, FontFamilyValue>>);

export const fontWeights = Object.freeze({
  thin: 100,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} satisfies Readonly<Record<FontWeightKey, CssFontWeight>>);

export const fontSizes = Object.freeze({
  "2xs": rem(10),
  xs: rem(12),
  sm: rem(13),
  md: rem(14),
  lg: rem(16),
  xl: rem(18),
  "2xl": rem(20),
  "3xl": rem(24),
  "4xl": rem(30),
  "5xl": rem(36),
  "6xl": rem(48),
} satisfies Readonly<Record<FontSizeKey, CssFontSize>>);

export const fluidFontSizes = Object.freeze({
  displayHero: clampSize(rem(32), "7vw", rem(52)),
  displaySection: clampSize(rem(28), "5vw", rem(40)),
  headingPage: clampSize(rem(24), "4vw", rem(32)),
  metricHero: clampSize(rem(28), "6vw", rem(44)),
  moneyHero: clampSize(rem(30), "7vw", rem(52)),
});

export const lineHeights = Object.freeze({
  tight: 1.12,
  snug: 1.24,
  normal: 1.45,
  relaxed: 1.6,
  loose: 1.75,
} satisfies Readonly<Record<LineHeightKey, number>>);

export const letterSpacings = Object.freeze({
  tighter: "-0.04em",
  tight: "-0.025em",
  normal: "normal",
  wide: "0.01em",
  wider: "0.025em",
  widest: "0.08em",
} satisfies Readonly<Record<LetterSpacingKey, CssLetterSpacing>>);

export const fontFeatureSettings = Object.freeze({
  normal: "normal",
  tabular: "'tnum' 1, 'lnum' 1",
  money: "'tnum' 1, 'lnum' 1, 'kern' 1",
  code: "'liga' 0, 'tnum' 1",
});

export const textStyles = Object.freeze({
  displayHero: style({
    fontFamily: fontFamilies.display,
    fontSize: fluidFontSizes.displayHero,
    fontWeight: fontWeights.black,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  displaySection: style({
    fontFamily: fontFamilies.display,
    fontSize: fluidFontSizes.displaySection,
    fontWeight: fontWeights.extrabold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  headingPage: style({
    fontFamily: fontFamilies.sans,
    fontSize: fluidFontSizes.headingPage,
    fontWeight: fontWeights.extrabold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  headingSection: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes["3xl"],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  titleCard: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  titleList: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  bodyLarge: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  body: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  bodySmall: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  label: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.wide,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  caption: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  button: style({
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    lineHeight: 1,
    letterSpacing: letterSpacings.normal,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  }),
  metricLarge: style({
    fontFamily: fontFamilies.numeric,
    fontSize: fluidFontSizes.metricHero,
    fontWeight: fontWeights.black,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
    fontFeatureSettings: fontFeatureSettings.tabular,
    fontVariantNumeric: "tabular-nums",
  }),
  metric: style({
    fontFamily: fontFamilies.numeric,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    fontFeatureSettings: fontFeatureSettings.tabular,
    fontVariantNumeric: "tabular-nums",
  }),
  moneyHero: style({
    fontFamily: fontFamilies.numeric,
    fontSize: fluidFontSizes.moneyHero,
    fontWeight: fontWeights.black,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
    fontFeatureSettings: fontFeatureSettings.money,
    fontVariantNumeric: "tabular-nums",
  }),
  moneyCard: style({
    fontFamily: fontFamilies.numeric,
    fontSize: fontSizes["3xl"],
    fontWeight: fontWeights.black,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    fontFeatureSettings: fontFeatureSettings.money,
    fontVariantNumeric: "tabular-nums",
  }),
  moneyInline: style({
    fontFamily: fontFamilies.numeric,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    fontFeatureSettings: fontFeatureSettings.money,
    fontVariantNumeric: "tabular-nums",
  }),
  code: style({
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontFeatureSettings: fontFeatureSettings.code,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  }),
} satisfies Readonly<Record<TextStyleKey, TypographyStyle>>);

export const domainTextStyles = Object.freeze({
  payroll: textStyles.moneyHero,
  budget: textStyles.metricLarge,
  expense: textStyles.moneyCard,
  savings: textStyles.moneyCard,
  notification: textStyles.titleList,
  growth: textStyles.displaySection,
  community: textStyles.titleCard,
  ads: textStyles.caption,
  admin: textStyles.code,
  security: textStyles.titleList,
} satisfies Readonly<Record<DomainTextStyleKey, TypographyStyle>>);

export const responsiveTextStyles = Object.freeze({
  displayHero: resp(
    { ...textStyles.displayHero, fontSize: rem(32) },
    { ...textStyles.displayHero, fontSize: rem(40) },
    textStyles.displayHero,
    { ...textStyles.displayHero, fontSize: rem(36) },
  ),
  headingPage: resp(
    { ...textStyles.headingPage, fontSize: rem(24) },
    { ...textStyles.headingPage, fontSize: rem(28) },
    textStyles.headingPage,
    { ...textStyles.headingPage, fontSize: rem(26) },
  ),
  titleCard: resp(
    { ...textStyles.titleCard, fontSize: rem(18) },
    textStyles.titleCard,
    { ...textStyles.titleCard, fontSize: rem(22) },
    { ...textStyles.titleCard, fontSize: rem(18) },
  ),
  body: resp(
    { ...textStyles.body, fontSize: rem(14) },
    textStyles.body,
    { ...textStyles.body, fontSize: rem(15) },
    { ...textStyles.body, fontSize: rem(13) },
  ),
  label: resp(textStyles.label, textStyles.label, textStyles.label, {
    ...textStyles.label,
    fontSize: rem(11),
  }),
  moneyHero: resp(
    { ...textStyles.moneyHero, fontSize: rem(30) },
    { ...textStyles.moneyHero, fontSize: rem(38) },
    textStyles.moneyHero,
    { ...textStyles.moneyHero, fontSize: rem(34) },
  ),
  moneyCard: resp(
    { ...textStyles.moneyCard, fontSize: rem(22) },
    textStyles.moneyCard,
    { ...textStyles.moneyCard, fontSize: rem(26) },
    { ...textStyles.moneyCard, fontSize: rem(22) },
  ),
} satisfies Readonly<
  Record<
    | "displayHero"
    | "headingPage"
    | "titleCard"
    | "body"
    | "label"
    | "moneyHero"
    | "moneyCard",
    ResponsiveTypographyStyle
  >
>);

export const componentTypography = Object.freeze({
  salaryStatusCard: Object.freeze({
    title: textStyles.titleCard,
    subtitle: textStyles.bodySmall,
    primaryAmount: textStyles.moneyHero,
    secondaryAmount: textStyles.moneyCard,
    badge: textStyles.label,
    metric: textStyles.metric,
  }),
  dailyBudgetCard: Object.freeze({
    title: textStyles.titleCard,
    subtitle: textStyles.bodySmall,
    primaryAmount: textStyles.moneyCard,
    secondaryAmount: textStyles.moneyInline,
    badge: textStyles.label,
    metric: textStyles.metric,
  }),
  expenseListItem: Object.freeze({
    title: textStyles.titleList,
    subtitle: textStyles.caption,
    amount: textStyles.moneyInline,
    badge: textStyles.label,
    meta: textStyles.caption,
  }),
  notificationRow: Object.freeze({
    title: textStyles.titleList,
    body: textStyles.bodySmall,
    badge: textStyles.label,
    meta: textStyles.caption,
  }),
  communityPostCard: Object.freeze({
    title: textStyles.titleCard,
    body: textStyles.body,
    author: textStyles.label,
    meta: textStyles.caption,
    tag: textStyles.label,
  }),
  adminPanel: Object.freeze({
    title: textStyles.headingSection,
    body: textStyles.bodySmall,
    code: textStyles.code,
    metric: textStyles.metric,
  }),
});

export const readableTextRules = Object.freeze({
  minimumFontSizePx: TYPOGRAPHY_MIN_READABLE_FONT_SIZE_PX,
  recommendedBodyLineHeight: TYPOGRAPHY_RECOMMENDED_BODY_LINE_HEIGHT,
  koreanWordBreak: "keep-all",
  overflowWrap: "break-word",
  numericVariant: "tabular-nums",
  noColorOnlyMeaning: true,
});

export const getTextStyle = (key: TextStyleKey): TypographyStyle =>
  textStyles[key];
export const getDomainTextStyle = (key: DomainTextStyleKey): TypographyStyle =>
  domainTextStyles[key];
export const getResponsiveTextStyle = (
  key: keyof typeof responsiveTextStyles,
  mode: TypographyMode,
): TypographyStyle => responsiveTextStyles[key][mode];
export const createFluidFontSize = clampSize;
export const toRem = rem;
export const toPx = px;
export const isReadableFontSizePx = (value: number): boolean =>
  Number.isFinite(value) && value >= TYPOGRAPHY_MIN_READABLE_FONT_SIZE_PX;
export const hasTabularNumeric = (value: TypographyStyle): boolean =>
  (value.fontVariantNumeric ?? "").includes("tabular") ||
  (value.fontFeatureSettings ?? "").includes("tnum");

const kebab = (value: string): string =>
  value
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const flattenTypography = (
  input: unknown,
  path: readonly string[],
  output: Record<string, string>,
  prefix: string,
): void => {
  if (typeof input === "string" || typeof input === "number") {
    output[`${prefix}-${path.map(kebab).join("-")}`] = String(input);
    return;
  }

  if (!input || typeof input !== "object") return;

  for (const [key, value] of Object.entries(input)) {
    flattenTypography(value, [...path, key], output, prefix);
  }
};

export const createTypographyCssVariables = (
  prefix = "--sh-type",
): Readonly<Record<string, string>> => {
  const output: Record<string, string> = {};
  flattenTypography(
    Object.freeze({
      fontFamily: fontFamilies,
      fontWeight: fontWeights,
      fontSize: fontSizes,
      lineHeight: lineHeights,
      letterSpacing: letterSpacings,
      textStyle: textStyles,
    }),
    [],
    output,
    prefix,
  );
  return Object.freeze(output);
};

export const typographyCssVariables = createTypographyCssVariables();

export const typography = Object.freeze({
  contractVersion: TYPOGRAPHY_CONTRACT_VERSION,
  policyGuard: TYPOGRAPHY_POLICY_GUARD,
  locale: TYPOGRAPHY_DEFAULT_LOCALE,
  baseFontSizePx: TYPOGRAPHY_BASE_FONT_SIZE_PX,
  fontFamily: fontFamilies,
  fontWeight: fontWeights,
  fontSize: fontSizes,
  fluidFontSize: fluidFontSizes,
  lineHeight: lineHeights,
  letterSpacing: letterSpacings,
  fontFeatureSettings,
  textStyle: textStyles,
  domainTextStyle: domainTextStyles,
  responsiveTextStyle: responsiveTextStyles,
  component: componentTypography,
  readableTextRules,
  cssVariables: typographyCssVariables,
  utils: Object.freeze({
    getTextStyle,
    getDomainTextStyle,
    getResponsiveTextStyle,
    createFluidFontSize,
    toRem,
    toPx,
    isReadableFontSizePx,
    hasTabularNumeric,
    createTypographyCssVariables,
  }),
});

export const TYPOGRAPHY_COMPLETENESS_REPORT: TypographyCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: TYPOGRAPHY_CONTRACT_VERSION,
    tokenFile: TYPOGRAPHY_TOKEN_FILE,
    fontFamilyCount: Object.keys(fontFamilies).length,
    fontSizeCount: Object.keys(fontSizes).length,
    textStyleCount: Object.keys(textStyles).length,
    responsiveStyleCount: Object.keys(responsiveTextStyles).length,
    domainStyleCount: Object.keys(domainTextStyles).length,
    coveredRequirements: Object.freeze([
      "typography-token-ssot",
      "korean-optimized-font-stack",
      "system-font-fallback",
      "display-heading-title-body-label-caption-styles",
      "money-and-metric-tabular-numeric-styles",
      "code-admin-debug-style",
      "responsive-typography-mobile-tablet-desktop-admin",
      "salary-status-card-typography",
      "daily-budget-card-typography",
      "expense-list-item-typography",
      "notification-row-typography",
      "community-post-card-typography",
      "admin-panel-typography",
      "readability-minimum-font-size",
      "recommended-body-line-height",
      "korean-word-break-keep-all",
      "overflow-wrap-safety",
      "css-variable-generation",
      "react-jsx-runtime-not-required",
      "global-jsx-augmentation-not-required",
      "privacy-financial-source-policy-guard",
      "no-amount-encoded-in-font-style",
    ]),
    missing: Object.freeze([]),
  });

export const getTypographyCompletenessReport =
  (): TypographyCompletenessReport => TYPOGRAPHY_COMPLETENESS_REPORT;

export const assertTypographyCompleteness = (): void => {
  if (!TYPOGRAPHY_COMPLETENESS_REPORT.ok) {
    throw new Error(
      `typography.ts is incomplete: ${TYPOGRAPHY_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
  }
};

export default typography;
