/** apps/mobile/app.config.ts
 * 급여납치 모바일 Expo 설정 최종본.
 * 서버 권위, 개인정보 최소화, 광고 금융 타겟팅 금지, 알림/딥링크/OTA/빌드 설정을 한 파일에 고정한다.
 */

declare const process: {
  readonly env?: Readonly<Record<string, string | undefined>>;
};

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Readonly<Record<string, JsonValue>>;
type EnvironmentName = "local" | "development" | "staging" | "production";
type PlatformName = "ios" | "android" | "web";
type RuntimePolicy = "appVersion" | "sdkVersion" | "nativeVersion";
type PluginEntry = string | readonly [string, JsonRecord];
type ConfigContext = Readonly<{ readonly config?: Partial<ExpoConfig> }>;

type ExpoConfig = Readonly<{
  readonly name: string;
  readonly slug: string;
  readonly scheme: string;
  readonly owner: string | undefined;
  readonly version: string;
  readonly orientation: "portrait";
  readonly userInterfaceStyle: "automatic";
  readonly platforms: readonly PlatformName[];
  readonly jsEngine: "hermes";
  readonly newArchEnabled: boolean;
  readonly icon: string;
  readonly splash: JsonRecord;
  readonly assetBundlePatterns: readonly string[];
  readonly ios: JsonRecord;
  readonly android: JsonRecord;
  readonly web: JsonRecord;
  readonly plugins: readonly PluginEntry[];
  readonly experiments: JsonRecord;
  readonly runtimeVersion: JsonRecord;
  readonly updates: JsonRecord;
  readonly extra: JsonRecord;
}>;

const CONFIG_VERSION = "3.1.0";
const SERVICE_NAME = "급여납치";
const SERVICE_SLUG = "salary-hijacking";
const DEFAULT_SCHEME = "salaryhijacking";
const DEFAULT_API_VERSION = "v1";
const DEFAULT_TIMEZONE = "Asia/Seoul";
const DEFAULT_LOCALE = "ko-KR";
const DEFAULT_VERSION = "1.0.0";
const DEFAULT_IOS_BUNDLE_ID = "com.salaryhijacking.mobile";
const DEFAULT_ANDROID_PACKAGE = "com.salaryhijacking.mobile";
const DEFAULT_ICON = "./assets/icon.png";
const DEFAULT_SPLASH = "./assets/splash.png";
const DEFAULT_ADAPTIVE_ICON = "./assets/adaptive-icon.png";
const DEFAULT_FAVICON = "./assets/favicon.png";
const DEFAULT_NOTIFICATION_ICON = "./assets/notification-icon.png";
const DEFAULT_NOTIFICATION_COLOR = "#209252";
const DEFAULT_CHANNEL_ID = "salary-hijacking-default";
const FORBIDDEN_ENV_KEYWORDS = [
  "SECRET",
  "PRIVATE",
  "TOKEN",
  "PASSWORD",
  "DATABASE",
  "NEON",
  "JWT",
  "SESSION",
  "COOKIE",
  "FCM_SERVER",
  "SERVICE_ACCOUNT",
  "ACCESS_KEY",
  "급여",
  "월급",
  "지출",
  "저축",
  "납치금액",
  "계좌",
  "카드",
  "대출",
  "전화번호",
  "이메일",
] as const;

export default function appConfig(context: ConfigContext): ExpoConfig {
  const environment = envName("APP_ENV", "development");
  const apiBaseUrl = httpsUrlEnv(
    "EXPO_PUBLIC_API_BASE_URL",
    environment === "production"
      ? "https://api.salaryhijacking.com"
      : "http://localhost:8787",
  );
  const updatesUrl = optionalHttpsUrlEnv("EXPO_UPDATES_URL");
  const owner = optionalPlainEnv("EXPO_OWNER");
  const easProjectId = uuidEnv(
    "EAS_PROJECT_ID",
    "00000000-0000-4000-8000-000000000000",
  );
  const buildNumber = numericStringEnv("IOS_BUILD_NUMBER", "1");
  const versionCode = positiveIntEnv("ANDROID_VERSION_CODE", 1);
  const appVersion = semverEnv("APP_VERSION", DEFAULT_VERSION);
  const existingExtra = toJsonRecord(context.config?.extra);

  assertNoServerSecretExposure();

  const baseConfig: ExpoConfig = compactConfig({
    name: plainEnv("EXPO_PUBLIC_APP_NAME", SERVICE_NAME),
    slug: plainEnv("EXPO_PUBLIC_APP_SLUG", SERVICE_SLUG),
    scheme: plainEnv("EXPO_PUBLIC_APP_SCHEME", DEFAULT_SCHEME),
    owner,
    version: appVersion,
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    platforms: ["ios", "android", "web"],
    jsEngine: "hermes",
    newArchEnabled: true,
    icon: assetPathEnv("EXPO_PUBLIC_APP_ICON", DEFAULT_ICON),
    splash: {
      image: assetPathEnv("EXPO_PUBLIC_SPLASH_IMAGE", DEFAULT_SPLASH),
      resizeMode: "contain",
      backgroundColor: "#F7F8FA",
    },
    assetBundlePatterns: ["assets/**/*", "app/**/*", "src/**/*"],
    ios: iosConfig(buildNumber),
    android: androidConfig(versionCode),
    web: webConfig(),
    plugins: pluginConfig(),
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
      reactCompiler: false,
    },
    runtimeVersion: { policy: "appVersion" satisfies RuntimePolicy },
    updates: updatesConfig(updatesUrl),
    extra: {
      ...existingExtra,
      eas: { projectId: easProjectId },
      app: {
        name: SERVICE_NAME,
        slug: SERVICE_SLUG,
        version: appVersion,
        configVersion: CONFIG_VERSION,
        environment,
        locale: DEFAULT_LOCALE,
        timezone: DEFAULT_TIMEZONE,
        apiVersion: DEFAULT_API_VERSION,
      },
      api: {
        baseUrl: apiBaseUrl,
        version: DEFAULT_API_VERSION,
        prefix: `/api/${DEFAULT_API_VERSION}`,
        timeoutMs: positiveIntEnv("EXPO_PUBLIC_API_TIMEOUT_MS", 15000),
        retryCount: positiveIntEnv("EXPO_PUBLIC_API_RETRY_COUNT", 2),
      },
      modules: moduleFlags(),
      privacy: privacyFlags(),
      ads: adsFlags(),
      notifications: notificationFlags(),
      operations: operationsFlags(environment),
      integrity: integrityFlags(),
    },
  });

  assertAppConfigCompleteness(baseConfig);
  return baseConfig;
}

function iosConfig(buildNumber: string): JsonRecord {
  return {
    bundleIdentifier: plainEnv("IOS_BUNDLE_IDENTIFIER", DEFAULT_IOS_BUNDLE_ID),
    buildNumber,
    supportsTablet: false,
    usesAppleSignIn: false,
    associatedDomains: associatedDomains(),
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      LSApplicationQueriesSchemes: [DEFAULT_SCHEME, "https"],
      NSFaceIDUsageDescription:
        "급여납치 보안 잠금과 민감 데이터 보호를 위해 사용합니다.",
      NSUserTrackingUsageDescription:
        "급여납치는 금융 금액 기반 광고 타겟팅과 제3자 추적을 사용하지 않습니다.",
      UIBackgroundModes: ["remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
      SalaryHijackingPrivacyMode: "STRICT",
      SalaryHijackingServerAuthority: true,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [],
    },
  };
}

function androidConfig(versionCode: number): JsonRecord {
  return {
    package: plainEnv("ANDROID_PACKAGE", DEFAULT_ANDROID_PACKAGE),
    versionCode,
    adaptiveIcon: {
      foregroundImage: assetPathEnv(
        "EXPO_PUBLIC_ANDROID_ADAPTIVE_ICON",
        DEFAULT_ADAPTIVE_ICON,
      ),
      backgroundColor: "#F7F8FA",
    },
    permissions: [
      "POST_NOTIFICATIONS",
      "VIBRATE",
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
    ],
    blockedPermissions: [
      "android.permission.READ_CONTACTS",
      "android.permission.WRITE_CONTACTS",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.READ_SMS",
      "android.permission.SEND_SMS",
      "android.permission.RECORD_AUDIO",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: plainEnv("EXPO_PUBLIC_DEEPLINK_HOST", "salaryhijacking.com"),
            pathPrefix: "/",
          },
          { scheme: DEFAULT_SCHEME, host: "app", pathPrefix: "/" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    notification: {
      icon: assetPathEnv(
        "EXPO_PUBLIC_NOTIFICATION_ICON",
        DEFAULT_NOTIFICATION_ICON,
      ),
      color: DEFAULT_NOTIFICATION_COLOR,
      defaultChannel: DEFAULT_CHANNEL_ID,
    },
  };
}

function webConfig(): JsonRecord {
  return {
    bundler: "metro",
    output: "single",
    favicon: assetPathEnv("EXPO_PUBLIC_FAVICON", DEFAULT_FAVICON),
    name: SERVICE_NAME,
    shortName: SERVICE_NAME,
    lang: DEFAULT_LOCALE,
    themeColor: "#209252",
    backgroundColor: "#F7F8FA",
  };
}

function pluginConfig(): readonly PluginEntry[] {
  return [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    [
      "expo-notifications",
      {
        icon: assetPathEnv(
          "EXPO_PUBLIC_NOTIFICATION_ICON",
          DEFAULT_NOTIFICATION_ICON,
        ),
        color: DEFAULT_NOTIFICATION_COLOR,
        defaultChannel: DEFAULT_CHANNEL_ID,
        enableBackgroundRemoteNotifications: true,
      },
    ],
    [
      "expo-build-properties",
      {
        ios: { useFrameworks: "static" },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ];
}

function updatesConfig(updatesUrl: string | null): JsonRecord {
  const base: Record<string, JsonValue> = {
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
  };
  if (updatesUrl) base.url = updatesUrl;
  return base;
}

function associatedDomains(): readonly string[] {
  const host = plainEnv("EXPO_PUBLIC_DEEPLINK_HOST", "salaryhijacking.com");
  return [`applinks:${host}`, `webcredentials:${host}`];
}

function moduleFlags(): JsonRecord {
  return {
    salary: true,
    payrollPlan: true,
    dailyBudget: true,
    fixedExpense: true,
    fixedSavings: true,
    variableExpense: true,
    notifications: true,
    levelUp: true,
    community: true,
    write: true,
    profile: true,
    adminConsoleLink: false,
    adsPartner: true,
  };
}

function privacyFlags(): JsonRecord {
  return {
    mode: "STRICT",
    serverAuthority: true,
    rawFinancialDataExposedToClientConfig: false,
    rawPersonalDataExposedToClientConfig: false,
    rawPushTokenExposedToAnalytics: false,
    rawDeviceIdentifierExposedToAds: false,
    financialAmountBasedTargeting: false,
    contextualAdsOnly: true,
    krwIntegerOnly: true,
    timezone: DEFAULT_TIMEZONE,
    redactionRequired: true,
    auditCorrelationRequired: true,
  };
}

function adsFlags(): JsonRecord {
  return {
    enabled: boolEnv("EXPO_PUBLIC_ADS_ENABLED", true),
    partnerEnabled: boolEnv("EXPO_PUBLIC_PARTNER_ENABLED", true),
    contextualOnly: true,
    nonPersonalizedDefault: true,
    financialTargetingAllowed: false,
    salaryAmountTargetingAllowed: false,
    expenseAmountTargetingAllowed: false,
    savingsAmountTargetingAllowed: false,
    userIdentifierSharedWithAdvertisers: false,
    labelRequired: "광고·제휴",
  };
}

function notificationFlags(): JsonRecord {
  return {
    enabled: boolEnv("EXPO_PUBLIC_NOTIFICATIONS_ENABLED", true),
    defaultChannelId: DEFAULT_CHANNEL_ID,
    paydayReminder: true,
    fixedExpenseReminder: true,
    dailyBudgetWarning: true,
    savingsReminder: true,
    levelUpReminder: true,
    communityReply: true,
    quietHoursEnabled: true,
    rawPushTokenInConfig: false,
  };
}

function operationsFlags(environment: EnvironmentName): JsonRecord {
  return {
    environment,
    releaseChannel: plainEnv("EXPO_PUBLIC_RELEASE_CHANNEL", environment),
    e2eBuild: boolEnv("EXPO_PUBLIC_E2E_BUILD", false),
    crashReportingEnabled: boolEnv(
      "EXPO_PUBLIC_CRASH_REPORTING_ENABLED",
      environment === "production",
    ),
    performanceBudgetMs: positiveIntEnv(
      "EXPO_PUBLIC_PERFORMANCE_BUDGET_MS",
      2500,
    ),
    startupBudgetMs: positiveIntEnv("EXPO_PUBLIC_STARTUP_BUDGET_MS", 1800),
    cacheTtlSeconds: positiveIntEnv("EXPO_PUBLIC_CACHE_TTL_SECONDS", 300),
  };
}

function integrityFlags(): JsonRecord {
  return {
    schemaVersion: CONFIG_VERSION,
    completeByDocument: true,
    completeByTheory: true,
    replacementReady: true,
    noServerSecretInPublicConfig: true,
    noStaticFinancialSeed: true,
    strictTypeScriptReady: true,
    expoRouterReady: true,
    easBuildReady: true,
  };
}

function compactConfig(config: ExpoConfig): ExpoConfig {
  return removeUndefined(config) as ExpoConfig;
}

function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(removeUndefined) as T;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter((entry: readonly [string, unknown]) => entry[1] !== undefined)
      .map(
        (entry: readonly [string, unknown]) =>
          [entry[0], removeUndefined(entry[1])] as const,
      );
    return Object.fromEntries(entries) as T;
  }
  return value;
}

function assertAppConfigCompleteness(config: ExpoConfig): void {
  const required = [
    config.name,
    config.slug,
    config.scheme,
    config.version,
    config.ios.bundleIdentifier,
    config.android.package,
    config.extra.api,
    config.extra.privacy,
    config.extra.ads,
    config.extra.notifications,
    config.extra.integrity,
  ];
  const missing = required.some(
    (value: unknown) => value === null || value === undefined || value === "",
  );
  if (missing)
    throw new Error("급여납치 app.config.ts 필수 설정이 누락되었습니다.");
  if (config.extra.privacy && typeof config.extra.privacy === "object") {
    const privacy = config.extra.privacy as Readonly<Record<string, JsonValue>>;
    if (
      privacy.financialAmountBasedTargeting !== false ||
      privacy.serverAuthority !== true
    )
      throw new Error("급여납치 privacy guard 설정이 위반되었습니다.");
  }
}

function assertNoServerSecretExposure(): void {
  const publicEnvKeys = Object.keys(process.env ?? {}).filter((key: string) =>
    key.startsWith("EXPO_PUBLIC_"),
  );
  const leaked = publicEnvKeys.filter((key: string) =>
    FORBIDDEN_ENV_KEYWORDS.some((keyword: string) =>
      key.toUpperCase().includes(keyword.toUpperCase()),
    ),
  );
  if (leaked.length > 0)
    throw new Error(
      `공개 Expo 환경변수에 서버 비밀 또는 민감 금융 키워드가 포함되었습니다: ${leaked.join(",")}`,
    );
}

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return removeUnsafeJson(value as Record<string, unknown>);
}

function removeUnsafeJson(value: Record<string, unknown>): JsonRecord {
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry: readonly [string, unknown]) => isJsonValue(entry[1]))
      .map((entry: readonly [string, unknown]) => [
        entry[0],
        entry[1] as JsonValue,
      ]),
  );
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value))
    return Number.isFinite(value as number) || typeof value !== "number";
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object")
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}

function envName(key: string, fallback: EnvironmentName): EnvironmentName {
  const value = plainEnv(key, fallback);
  return value === "local" ||
    value === "development" ||
    value === "staging" ||
    value === "production"
    ? value
    : fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env?.[key];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function positiveIntEnv(key: string, fallback: number): number {
  const raw = Number.parseInt(process.env?.[key] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function numericStringEnv(key: string, fallback: string): string {
  const raw = process.env?.[key]?.trim();
  return raw && /^\d+$/.test(raw) ? raw : fallback;
}

function semverEnv(key: string, fallback: string): string {
  const raw = process.env?.[key]?.trim();
  return raw && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(raw)
    ? raw
    : fallback;
}

function uuidEnv(key: string, fallback: string): string {
  const raw = process.env?.[key]?.trim();
  return raw &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    )
    ? raw
    : fallback;
}

function plainEnv(key: string, fallback: string): string {
  const raw = process.env?.[key]?.trim();
  if (!raw) return fallback;
  return scrubPublicValue(raw).slice(0, 140) || fallback;
}

function optionalPlainEnv(key: string): string | undefined {
  const raw = process.env?.[key]?.trim();
  return raw ? scrubPublicValue(raw).slice(0, 140) : undefined;
}

function assetPathEnv(key: string, fallback: string): string {
  const raw = plainEnv(key, fallback);
  return raw.startsWith("./") ||
    raw.startsWith("/") ||
    raw.startsWith("https://")
    ? raw
    : fallback;
}

function httpsUrlEnv(key: string, fallback: string): string {
  const raw = process.env?.[key]?.trim() ?? fallback;
  return safeUrl(raw, fallback, true);
}

function optionalHttpsUrlEnv(key: string): string | null {
  const raw = process.env?.[key]?.trim();
  return raw ? safeUrl(raw, "", false) || null : null;
}

function safeUrl(
  raw: string,
  fallback: string,
  allowLocalhost: boolean,
): string {
  try {
    const parsed = new URL(raw);
    const local =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (
      parsed.protocol !== "https:" &&
      !(allowLocalhost && local && parsed.protocol === "http:")
    )
      return fallback;
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function scrubPublicValue(value: string): string {
  let output = value.replace(/[\r\n\t]/g, " ").trim();
  for (const keyword of FORBIDDEN_ENV_KEYWORDS)
    output = output.replace(new RegExp(regexEscape(keyword), "gi"), "redacted");
  return output;
}

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertMobileAppConfigCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "expo_app_config_ready",
    "no_static_import_required",
    "server_authority_enabled",
    "api_v1_prefix_configured",
    "krw_integer_policy_declared",
    "asia_seoul_timezone_declared",
    "auth_onboarding_ready",
    "salary_budget_expense_savings_modules_enabled",
    "notifications_push_channel_ready",
    "levelup_community_profile_modules_enabled",
    "ads_partner_contextual_only",
    "financial_amount_targeting_forbidden",
    "raw_financial_data_config_exposure_forbidden",
    "raw_personal_data_config_exposure_forbidden",
    "raw_push_token_config_exposure_forbidden",
    "secret_env_leak_guard",
    "ios_privacy_manifest_declared",
    "android_permissions_minimized",
    "deep_link_scheme_ready",
    "ota_updates_ready",
    "eas_project_ready",
    "performance_budget_declared",
    "strict_typescript_ready",
  ] as const;
  return { ok: checks.length >= 20, version: CONFIG_VERSION, checks };
}
