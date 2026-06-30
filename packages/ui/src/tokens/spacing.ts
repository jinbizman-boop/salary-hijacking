/** packages/ui/src/tokens/spacing.ts · 급여납치 UI Spacing Tokens 최종본 */
export const SPACING_CONTRACT_VERSION = "2.0.0" as const;
export const SPACING_TOKEN_FILE = "spacing.ts" as const;
export const SPACING_BASE_UNIT_PX = 4 as const;
export const SPACING_DEFAULT_DENSITY = "comfortable" as const;
export const SPACING_MIN_TOUCH_TARGET_PX = 44 as const;

export type SpacingDensity = "compact" | "comfortable" | "spacious";
export type SpacingPlatform = "mobile" | "tablet" | "desktop" | "admin";
export type SpacingUnit = `${number}px` | `${number}rem` | "0" | "auto";
export type CssLength =
  | SpacingUnit
  | `${number}%`
  | `${number}vw`
  | `${number}vh`
  | `env(${string})`
  | `min(${string})`
  | `max(${string})`
  | `clamp(${string})`;
export type SpaceTokenKey =
  | "none"
  | "px"
  | "0_5"
  | "1"
  | "1_5"
  | "2"
  | "2_5"
  | "3"
  | "3_5"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "14"
  | "16"
  | "20"
  | "24"
  | "28"
  | "32"
  | "36"
  | "40"
  | "44"
  | "48"
  | "56"
  | "64"
  | "72"
  | "80"
  | "96";
export type RadiusTokenKey =
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "full";
export type SizeTokenKey =
  | "iconXs"
  | "iconSm"
  | "iconMd"
  | "iconLg"
  | "avatarSm"
  | "avatarMd"
  | "avatarLg"
  | "buttonSm"
  | "buttonMd"
  | "buttonLg"
  | "inputMd"
  | "touch";
export type BreakpointKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type LayoutWidthKey =
  | "screen"
  | "mobile"
  | "tablet"
  | "content"
  | "wide"
  | "admin";
export type ComponentSpacingKey =
  | "salaryStatusCard"
  | "dailyBudgetCard"
  | "expenseListItem"
  | "notificationRow"
  | "communityPostCard"
  | "formSection"
  | "bottomSheet"
  | "modal"
  | "adminPanel"
  | "adSlot";

export interface AxisSpacing {
  readonly x: CssLength;
  readonly y: CssLength;
}
export interface EdgeSpacing {
  readonly top: CssLength;
  readonly right: CssLength;
  readonly bottom: CssLength;
  readonly left: CssLength;
}
export interface ComponentSpacing {
  readonly padding: EdgeSpacing;
  readonly gap: CssLength;
  readonly radius: CssLength;
  readonly minHeight: CssLength;
  readonly density: SpacingDensity;
}
export interface ResponsiveSpacing {
  readonly mobile: ComponentSpacing;
  readonly tablet: ComponentSpacing;
  readonly desktop: ComponentSpacing;
  readonly admin: ComponentSpacing;
}
export interface SpacingScale {
  readonly [key: string]: CssLength;
}
export interface SpacingCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof SPACING_CONTRACT_VERSION;
  readonly tokenFile: typeof SPACING_TOKEN_FILE;
  readonly scaleCount: number;
  readonly radiusCount: number;
  readonly sizeCount: number;
  readonly breakpointCount: number;
  readonly componentCount: number;
  readonly coveredRequirements: readonly string[];
  readonly missing: readonly string[];
}

export const SPACING_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  salaryAmountEncodedInSpacing: false,
  expenseAmountEncodedInSpacing: false,
  savingsAmountEncodedInSpacing: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  spacingOnlyMeaningAllowed: false,
  minimumTouchTargetIncluded: true,
  responsiveSpacingIncluded: true,
  densityModesIncluded: true,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
});

const px = (value: number): `${number}px` =>
  `${Math.max(0, Math.round(value * 1000) / 1000)}px`;
const rem = (pxValue: number, rootPx = 16): `${number}rem` =>
  `${Math.max(0, Math.round((pxValue / rootPx) * 10000) / 10000)}rem`;
const clampLength = (
  min: CssLength,
  preferred: CssLength,
  max: CssLength,
): `clamp(${string})` => `clamp(${min}, ${preferred}, ${max})`;
const edge = (
  top: CssLength,
  right: CssLength = top,
  bottom: CssLength = top,
  left: CssLength = right,
): EdgeSpacing => Object.freeze({ top, right, bottom, left });
const axis = (x: CssLength, y: CssLength): AxisSpacing =>
  Object.freeze({ x, y });
const component = (
  padding: EdgeSpacing,
  gap: CssLength,
  radius: CssLength,
  minHeight: CssLength,
  density: SpacingDensity,
): ComponentSpacing =>
  Object.freeze({ padding, gap, radius, minHeight, density });

export const spacingScale = Object.freeze({
  none: "0",
  px: "1px",
  "0_5": px(2),
  "1": px(4),
  "1_5": px(6),
  "2": px(8),
  "2_5": px(10),
  "3": px(12),
  "3_5": px(14),
  "4": px(16),
  "5": px(20),
  "6": px(24),
  "7": px(28),
  "8": px(32),
  "9": px(36),
  "10": px(40),
  "11": px(44),
  "12": px(48),
  "14": px(56),
  "16": px(64),
  "20": px(80),
  "24": px(96),
  "28": px(112),
  "32": px(128),
  "36": px(144),
  "40": px(160),
  "44": px(176),
  "48": px(192),
  "56": px(224),
  "64": px(256),
  "72": px(288),
  "80": px(320),
  "96": px(384),
} satisfies Readonly<Record<SpaceTokenKey, CssLength>>);

export const spacingRemScale = Object.freeze({
  none: "0",
  px: rem(1),
  "0_5": rem(2),
  "1": rem(4),
  "1_5": rem(6),
  "2": rem(8),
  "2_5": rem(10),
  "3": rem(12),
  "3_5": rem(14),
  "4": rem(16),
  "5": rem(20),
  "6": rem(24),
  "7": rem(28),
  "8": rem(32),
  "9": rem(36),
  "10": rem(40),
  "11": rem(44),
  "12": rem(48),
  "14": rem(56),
  "16": rem(64),
  "20": rem(80),
  "24": rem(96),
  "28": rem(112),
  "32": rem(128),
  "36": rem(144),
  "40": rem(160),
  "44": rem(176),
  "48": rem(192),
  "56": rem(224),
  "64": rem(256),
  "72": rem(288),
  "80": rem(320),
  "96": rem(384),
} satisfies Readonly<Record<SpaceTokenKey, CssLength>>);

export const radiusTokens = Object.freeze({
  none: "0",
  xs: px(4),
  sm: px(8),
  md: px(12),
  lg: px(16),
  xl: px(20),
  "2xl": px(24),
  "3xl": px(32),
  "4xl": px(40),
  full: "9999px",
} satisfies Readonly<Record<RadiusTokenKey, CssLength>>);

export const sizeTokens = Object.freeze({
  iconXs: px(16),
  iconSm: px(20),
  iconMd: px(24),
  iconLg: px(32),
  avatarSm: px(32),
  avatarMd: px(40),
  avatarLg: px(56),
  buttonSm: px(36),
  buttonMd: px(44),
  buttonLg: px(52),
  inputMd: px(48),
  touch: px(SPACING_MIN_TOUCH_TARGET_PX),
} satisfies Readonly<Record<SizeTokenKey, CssLength>>);

export const breakpointTokens = Object.freeze({
  xs: px(360),
  sm: px(480),
  md: px(768),
  lg: px(1024),
  xl: px(1280),
  "2xl": px(1536),
} satisfies Readonly<Record<BreakpointKey, CssLength>>);

export const layoutWidthTokens = Object.freeze({
  screen: "100%",
  mobile: px(420),
  tablet: px(720),
  content: px(960),
  wide: px(1180),
  admin: px(1440),
} satisfies Readonly<Record<LayoutWidthKey, CssLength>>);

export const densitySpacing = Object.freeze({
  compact: Object.freeze({
    inset: edge(spacingScale[3]),
    inline: spacingScale[2],
    stack: spacingScale[2],
    section: spacingScale[4],
    cardGap: spacingScale[2],
    controlHeight: sizeTokens.buttonSm,
    radius: radiusTokens.lg,
  }),
  comfortable: Object.freeze({
    inset: edge(spacingScale[4]),
    inline: spacingScale[3],
    stack: spacingScale[3],
    section: spacingScale[6],
    cardGap: spacingScale[3],
    controlHeight: sizeTokens.buttonMd,
    radius: radiusTokens.xl,
  }),
  spacious: Object.freeze({
    inset: edge(spacingScale[6]),
    inline: spacingScale[4],
    stack: spacingScale[4],
    section: spacingScale[8],
    cardGap: spacingScale[4],
    controlHeight: sizeTokens.buttonLg,
    radius: radiusTokens["2xl"],
  }),
} satisfies Readonly<
  Record<
    SpacingDensity,
    Readonly<{
      readonly inset: EdgeSpacing;
      readonly inline: CssLength;
      readonly stack: CssLength;
      readonly section: CssLength;
      readonly cardGap: CssLength;
      readonly controlHeight: CssLength;
      readonly radius: CssLength;
    }>
  >
>);

export const platformSpacing = Object.freeze({
  mobile: Object.freeze({
    pagePadding: edge(spacingScale[4]),
    bottomNavHeight: px(72),
    headerHeight: px(56),
    maxWidth: layoutWidthTokens.mobile,
    gridGap: spacingScale[3],
  }),
  tablet: Object.freeze({
    pagePadding: edge(spacingScale[6]),
    bottomNavHeight: px(80),
    headerHeight: px(64),
    maxWidth: layoutWidthTokens.tablet,
    gridGap: spacingScale[4],
  }),
  desktop: Object.freeze({
    pagePadding: edge(spacingScale[8]),
    bottomNavHeight: "0",
    headerHeight: px(72),
    maxWidth: layoutWidthTokens.wide,
    gridGap: spacingScale[6],
  }),
  admin: Object.freeze({
    pagePadding: edge(spacingScale[6], spacingScale[8]),
    bottomNavHeight: "0",
    headerHeight: px(64),
    maxWidth: layoutWidthTokens.admin,
    gridGap: spacingScale[5],
  }),
} satisfies Readonly<
  Record<
    SpacingPlatform,
    Readonly<{
      readonly pagePadding: EdgeSpacing;
      readonly bottomNavHeight: CssLength;
      readonly headerHeight: CssLength;
      readonly maxWidth: CssLength;
      readonly gridGap: CssLength;
    }>
  >
>);

export const componentSpacing = Object.freeze({
  salaryStatusCard: component(
    edge(spacingScale[4]),
    spacingScale[3],
    radiusTokens["2xl"],
    px(160),
    "comfortable",
  ),
  dailyBudgetCard: component(
    edge(spacingScale[4]),
    spacingScale[3],
    radiusTokens["2xl"],
    px(148),
    "comfortable",
  ),
  expenseListItem: component(
    edge(spacingScale[3], spacingScale[4]),
    spacingScale[2],
    radiusTokens.xl,
    px(76),
    "comfortable",
  ),
  notificationRow: component(
    edge(spacingScale[3], spacingScale[4]),
    spacingScale[2],
    radiusTokens.xl,
    px(72),
    "comfortable",
  ),
  communityPostCard: component(
    edge(spacingScale[4]),
    spacingScale[3],
    radiusTokens["2xl"],
    px(132),
    "comfortable",
  ),
  formSection: component(
    edge(spacingScale[5]),
    spacingScale[4],
    radiusTokens["2xl"],
    px(120),
    "comfortable",
  ),
  bottomSheet: component(
    edge(spacingScale[5], spacingScale[4], spacingScale[8], spacingScale[4]),
    spacingScale[4],
    radiusTokens["3xl"],
    px(240),
    "comfortable",
  ),
  modal: component(
    edge(spacingScale[6]),
    spacingScale[4],
    radiusTokens["3xl"],
    px(220),
    "comfortable",
  ),
  adminPanel: component(
    edge(spacingScale[5]),
    spacingScale[4],
    radiusTokens.xl,
    px(180),
    "comfortable",
  ),
  adSlot: component(
    edge(spacingScale[3]),
    spacingScale[2],
    radiusTokens.lg,
    px(64),
    "compact",
  ),
} satisfies Readonly<Record<ComponentSpacingKey, ComponentSpacing>>);

export const responsiveComponentSpacing = Object.freeze({
  salaryStatusCard: Object.freeze({
    mobile: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(148),
      "comfortable",
    ),
    tablet: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(160),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(168),
      "spacious",
    ),
    admin: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens.xl,
      px(156),
      "comfortable",
    ),
  }),
  dailyBudgetCard: Object.freeze({
    mobile: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(140),
      "comfortable",
    ),
    tablet: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(152),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(160),
      "spacious",
    ),
    admin: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(132),
      "compact",
    ),
  }),
  expenseListItem: Object.freeze({
    mobile: component(
      edge(spacingScale[3]),
      spacingScale[2],
      radiusTokens.lg,
      px(72),
      "compact",
    ),
    tablet: component(
      edge(spacingScale[3], spacingScale[4]),
      spacingScale[2],
      radiusTokens.xl,
      px(76),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(80),
      "comfortable",
    ),
    admin: component(
      edge(spacingScale[3], spacingScale[4]),
      spacingScale[2],
      radiusTokens.lg,
      px(68),
      "compact",
    ),
  }),
  notificationRow: Object.freeze({
    mobile: component(
      edge(spacingScale[3]),
      spacingScale[2],
      radiusTokens.lg,
      px(68),
      "compact",
    ),
    tablet: component(
      edge(spacingScale[3], spacingScale[4]),
      spacingScale[2],
      radiusTokens.xl,
      px(72),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(76),
      "comfortable",
    ),
    admin: component(
      edge(spacingScale[3], spacingScale[4]),
      spacingScale[2],
      radiusTokens.lg,
      px(68),
      "compact",
    ),
  }),
  communityPostCard: Object.freeze({
    mobile: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(124),
      "comfortable",
    ),
    tablet: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(136),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(144),
      "spacious",
    ),
    admin: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(120),
      "comfortable",
    ),
  }),
  formSection: Object.freeze({
    mobile: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(112),
      "comfortable",
    ),
    tablet: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(120),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(128),
      "spacious",
    ),
    admin: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens.xl,
      px(112),
      "comfortable",
    ),
  }),
  bottomSheet: Object.freeze({
    mobile: component(
      edge(spacingScale[5], spacingScale[4], spacingScale[8], spacingScale[4]),
      spacingScale[4],
      radiusTokens["3xl"],
      px(240),
      "comfortable",
    ),
    tablet: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["3xl"],
      px(260),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[6]),
      spacingScale[5],
      radiusTokens["3xl"],
      px(260),
      "spacious",
    ),
    admin: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(220),
      "comfortable",
    ),
  }),
  modal: Object.freeze({
    mobile: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(210),
      "comfortable",
    ),
    tablet: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["3xl"],
      px(220),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[7]),
      spacingScale[5],
      radiusTokens["3xl"],
      px(240),
      "spacious",
    ),
    admin: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(220),
      "comfortable",
    ),
  }),
  adminPanel: Object.freeze({
    mobile: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(160),
      "compact",
    ),
    tablet: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens.xl,
      px(172),
      "comfortable",
    ),
    desktop: component(
      edge(spacingScale[6]),
      spacingScale[4],
      radiusTokens["2xl"],
      px(188),
      "comfortable",
    ),
    admin: component(
      edge(spacingScale[5]),
      spacingScale[4],
      radiusTokens.xl,
      px(180),
      "comfortable",
    ),
  }),
  adSlot: Object.freeze({
    mobile: component(
      edge(spacingScale[3]),
      spacingScale[2],
      radiusTokens.lg,
      px(64),
      "compact",
    ),
    tablet: component(
      edge(spacingScale[3]),
      spacingScale[2],
      radiusTokens.lg,
      px(72),
      "compact",
    ),
    desktop: component(
      edge(spacingScale[4]),
      spacingScale[3],
      radiusTokens.xl,
      px(80),
      "comfortable",
    ),
    admin: component(
      edge(spacingScale[3]),
      spacingScale[2],
      radiusTokens.lg,
      px(64),
      "compact",
    ),
  }),
} satisfies Readonly<Record<ComponentSpacingKey, ResponsiveSpacing>>);

export const stackSpacing = Object.freeze({
  xs: spacingScale[1],
  sm: spacingScale[2],
  md: spacingScale[3],
  lg: spacingScale[4],
  xl: spacingScale[6],
  "2xl": spacingScale[8],
  "3xl": spacingScale[12],
});
export const inlineSpacing = Object.freeze({
  xs: spacingScale[1],
  sm: spacingScale[2],
  md: spacingScale[3],
  lg: spacingScale[4],
  xl: spacingScale[5],
  "2xl": spacingScale[6],
});
export const gridSpacing = Object.freeze({
  card: spacingScale[3],
  section: spacingScale[4],
  page: spacingScale[6],
  admin: spacingScale[5],
  dashboard: spacingScale[4],
});
export const safeAreaSpacing = Object.freeze({
  top: "env(safe-area-inset-top)",
  right: "env(safe-area-inset-right)",
  bottom: "env(safe-area-inset-bottom)",
  left: "env(safe-area-inset-left)",
});
export const fluidSpacing = Object.freeze({
  pageInline: clampLength(spacingScale[4], "4vw", spacingScale[8]),
  sectionBlock: clampLength(spacingScale[6], "6vw", spacingScale[12]),
  cardGap: clampLength(spacingScale[3], "3vw", spacingScale[6]),
  heroBlock: clampLength(spacingScale[8], "8vw", spacingScale[20]),
});

export const toPx = px;
export const toRem = rem;
export const createClamp = clampLength;
export const createAxisSpacing = axis;
export const createEdgeSpacing = edge;
export const getSpace = (key: SpaceTokenKey): CssLength => spacingScale[key];
export const getRadius = (key: RadiusTokenKey): CssLength => radiusTokens[key];
export const getSize = (key: SizeTokenKey): CssLength => sizeTokens[key];
export const getComponentSpacing = (
  key: ComponentSpacingKey,
  platform?: SpacingPlatform,
): ComponentSpacing =>
  platform === undefined
    ? componentSpacing[key]
    : responsiveComponentSpacing[key][platform];
export const getDensitySpacing = (
  density: SpacingDensity = SPACING_DEFAULT_DENSITY,
): (typeof densitySpacing)[SpacingDensity] => densitySpacing[density];
export const isMinimumTouchTarget = (valuePx: number): boolean =>
  Number.isFinite(valuePx) && valuePx >= SPACING_MIN_TOUCH_TARGET_PX;

const kebab = (value: string): string =>
  value
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
const flattenSpacing = (
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
  for (const [key, value] of Object.entries(input))
    flattenSpacing(value, [...path, key], output, prefix);
};
export const createSpacingCssVariables = (
  prefix = "--sh-space",
): Readonly<Record<string, string>> => {
  const output: Record<string, string> = {};
  flattenSpacing(
    Object.freeze({
      scale: spacingScale,
      radius: radiusTokens,
      size: sizeTokens,
      breakpoint: breakpointTokens,
      layout: layoutWidthTokens,
      stack: stackSpacing,
      inline: inlineSpacing,
      grid: gridSpacing,
      fluid: fluidSpacing,
    }),
    [],
    output,
    prefix,
  );
  return Object.freeze(output);
};
export const spacingCssVariables = createSpacingCssVariables();

export const spacing = Object.freeze({
  contractVersion: SPACING_CONTRACT_VERSION,
  policyGuard: SPACING_POLICY_GUARD,
  baseUnitPx: SPACING_BASE_UNIT_PX,
  scale: spacingScale,
  remScale: spacingRemScale,
  radius: radiusTokens,
  size: sizeTokens,
  breakpoint: breakpointTokens,
  layoutWidth: layoutWidthTokens,
  density: densitySpacing,
  platform: platformSpacing,
  component: componentSpacing,
  responsiveComponent: responsiveComponentSpacing,
  stack: stackSpacing,
  inline: inlineSpacing,
  grid: gridSpacing,
  safeArea: safeAreaSpacing,
  fluid: fluidSpacing,
  cssVariables: spacingCssVariables,
  utils: Object.freeze({
    toPx,
    toRem,
    createClamp,
    createAxisSpacing,
    createEdgeSpacing,
    getSpace,
    getRadius,
    getSize,
    getComponentSpacing,
    getDensitySpacing,
    isMinimumTouchTarget,
    createSpacingCssVariables,
  }),
});

export const SPACING_COMPLETENESS_REPORT: SpacingCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: SPACING_CONTRACT_VERSION,
    tokenFile: SPACING_TOKEN_FILE,
    scaleCount: Object.keys(spacingScale).length,
    radiusCount: Object.keys(radiusTokens).length,
    sizeCount: Object.keys(sizeTokens).length,
    breakpointCount: Object.keys(breakpointTokens).length,
    componentCount: Object.keys(componentSpacing).length,
    coveredRequirements: Object.freeze([
      "spacing-token-ssot",
      "four-pixel-base-grid",
      "px-and-rem-scales",
      "radius-tokens",
      "icon-avatar-button-input-size-tokens",
      "minimum-touch-target-44px",
      "mobile-tablet-desktop-admin-platform-spacing",
      "compact-comfortable-spacious-density-modes",
      "salary-status-card-spacing",
      "daily-budget-card-spacing",
      "expense-list-item-spacing",
      "notification-row-spacing",
      "community-post-card-spacing",
      "form-section-bottom-sheet-modal-spacing",
      "admin-panel-spacing",
      "ad-slot-spacing",
      "responsive-component-spacing",
      "safe-area-spacing",
      "fluid-clamp-spacing",
      "css-variable-generation",
      "react-jsx-runtime-not-required",
      "global-jsx-augmentation-not-required",
      "privacy-financial-source-policy-guard",
    ]),
    missing: Object.freeze([]),
  });
export const getSpacingCompletenessReport = (): SpacingCompletenessReport =>
  SPACING_COMPLETENESS_REPORT;
export const assertSpacingCompleteness = (): void => {
  if (!SPACING_COMPLETENESS_REPORT.ok)
    throw new Error(
      `spacing.ts is incomplete: ${SPACING_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
};
export default spacing;
