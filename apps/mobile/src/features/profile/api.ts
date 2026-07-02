import {
  PROFILE_PATH,
  PROFILE_PRIVACY_EXPORT_PATH,
  PROFILE_SAFE_ERROR_MESSAGE,
  PROFILE_WITHDRAWAL_REQUEST_PATH,
} from "./constants";
import type {
  ProfileActionRequest,
  ProfileActivity,
  ProfileApiClient,
  ProfileExportStatus,
  ProfilePrivacy,
  ProfileSnapshot,
  ProfileSummary,
  ProfileUser,
} from "./types";

export type ProfileApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export class ProfileApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProfileApiError";
    this.status = status;
    this.code = code;
  }
}

const PRIVACY_HEADERS = Object.freeze({
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting-used": "false",
});

const EXPORT_STATUSES = new Set<ProfileExportStatus>([
  "NONE",
  "REQUESTED",
  "READY",
  "EXPIRED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now().toString(36)}`
  );
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new ProfileApiError(
      0,
      "PROFILE_INVALID_BASE_URL",
      PROFILE_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new ProfileApiError(
      0,
      "PROFILE_INSECURE_BASE_URL",
      PROFILE_SAFE_ERROR_MESSAGE,
    );
  }
  return normalized;
}

function errorCode(value: unknown): string {
  if (
    !isRecord(value) ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string"
  ) {
    return "PROFILE_REQUEST_FAILED";
  }
  return value.error.code;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function invalidResponse(): never {
  throw new ProfileApiError(
    0,
    "PROFILE_INVALID_RESPONSE",
    PROFILE_SAFE_ERROR_MESSAGE,
  );
}

function normalizeExportStatus(value: unknown): ProfileExportStatus {
  if (
    typeof value === "string" &&
    EXPORT_STATUSES.has(value as ProfileExportStatus)
  ) {
    return value as ProfileExportStatus;
  }
  return invalidResponse();
}

function normalizeNullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (isIsoTimestamp(value)) return value;
  return invalidResponse();
}

function normalizeUser(value: unknown): ProfileUser {
  if (!isRecord(value)) return invalidResponse();
  if (
    !nonEmptyString(value.idHash) ||
    !nonEmptyString(value.nickname) ||
    !nonEmptyString(value.role) ||
    typeof value.emailVerified !== "boolean" ||
    typeof value.onboardingCompleted !== "boolean" ||
    !isIsoTimestamp(value.joinedAt) ||
    !isNonNegativeInteger(value.level) ||
    !nonEmptyString(value.title) ||
    !nonEmptyString(value.avatarEmoji) ||
    typeof value.marketingConsent !== "boolean" ||
    typeof value.notificationConsent !== "boolean" ||
    !nonEmptyString(value.communityDisplayName) ||
    value.rawEmailExposed !== false ||
    value.rawPhoneExposed !== false ||
    value.rawFinancialDataExposed !== false ||
    value.rawPushTokenExposed !== false ||
    value.adsFinancialTargetingUsed !== false
  ) {
    return invalidResponse();
  }
  return {
    idHash: value.idHash,
    nickname: value.nickname,
    role: value.role,
    emailVerified: value.emailVerified,
    onboardingCompleted: value.onboardingCompleted,
    joinedAt: value.joinedAt,
    level: value.level,
    title: value.title,
    avatarEmoji: value.avatarEmoji,
    marketingConsent: value.marketingConsent,
    notificationConsent: value.notificationConsent,
    communityDisplayName: value.communityDisplayName,
    rawEmailExposed: false,
    rawPhoneExposed: false,
    rawFinancialDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeSummary(value: unknown): ProfileSummary {
  if (!isRecord(value)) return invalidResponse();
  if (
    !isNonNegativeInteger(value.totalHijackSaved) ||
    !isNonNegativeInteger(value.currentMonthHijack) ||
    !isNonNegativeInteger(value.currentLevel) ||
    !isNonNegativeInteger(value.levelXp) ||
    !isNonNegativeInteger(value.nextLevelXp) ||
    !isNonNegativeInteger(value.selfCareScore) ||
    !isNonNegativeInteger(value.completedGrowthTasks) ||
    !isNonNegativeInteger(value.communityPosts) ||
    !isNonNegativeInteger(value.communityComments) ||
    !isNonNegativeInteger(value.notificationUnread) ||
    !nonEmptyString(value.privacyPassRate)
  ) {
    return invalidResponse();
  }
  return {
    totalHijackSaved: value.totalHijackSaved,
    currentMonthHijack: value.currentMonthHijack,
    currentLevel: value.currentLevel,
    levelXp: value.levelXp,
    nextLevelXp: value.nextLevelXp,
    selfCareScore: value.selfCareScore,
    completedGrowthTasks: value.completedGrowthTasks,
    communityPosts: value.communityPosts,
    communityComments: value.communityComments,
    notificationUnread: value.notificationUnread,
    privacyPassRate: value.privacyPassRate,
  };
}

function normalizePrivacy(value: unknown): ProfilePrivacy {
  if (!isRecord(value)) return invalidResponse();
  if (
    typeof value.withdrawalRequested !== "boolean" ||
    value.adPersonalization !== false ||
    value.financialDataForAds !== false ||
    value.rawPushTokenLogging !== false ||
    value.tokenHashOnly !== true
  ) {
    return invalidResponse();
  }
  return {
    exportStatus: normalizeExportStatus(value.exportStatus),
    exportRequestedAt: normalizeNullableTimestamp(value.exportRequestedAt),
    withdrawalRequested: value.withdrawalRequested,
    adPersonalization: false,
    financialDataForAds: false,
    rawPushTokenLogging: false,
    tokenHashOnly: true,
  };
}

function normalizeActivity(value: unknown): ProfileActivity {
  if (!isRecord(value)) return invalidResponse();
  if (
    !nonEmptyString(value.id) ||
    !(value.kind === "NOTICE" || value.kind === "SECURITY") ||
    !nonEmptyString(value.title) ||
    !nonEmptyString(value.description) ||
    !isIsoTimestamp(value.createdAt) ||
    !nonEmptyString(value.route) ||
    value.rawFinancialDataExposed !== false ||
    value.rawPersonalDataExposed !== false ||
    value.adsFinancialTargetingUsed !== false
  ) {
    return invalidResponse();
  }
  return {
    id: value.id,
    kind: value.kind,
    title: value.title,
    description: value.description,
    createdAt: value.createdAt,
    route: value.route,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeSnapshot(value: unknown): ProfileSnapshot {
  if (!isRecord(value) || !isRecord(value.data)) return invalidResponse();
  const data = value.data;
  if (!Array.isArray(data.activities)) return invalidResponse();
  return {
    user: normalizeUser(data.user),
    summary: normalizeSummary(data.summary),
    privacy: normalizePrivacy(data.privacy),
    activities: data.activities.map(normalizeActivity),
  };
}

function validActionRequest(value: ProfileActionRequest): boolean {
  return (
    nonEmptyString(value.reason) &&
    value.reason.length <= 120 &&
    !/salary|income|expense|saving|hijack|token|email|phone|card|account/iu.test(
      value.reason,
    )
  );
}

function actionPayload(request: ProfileActionRequest): string {
  if (!validActionRequest(request)) {
    throw new ProfileApiError(
      0,
      "PROFILE_INVALID_ACTION_REQUEST",
      PROFILE_SAFE_ERROR_MESSAGE,
    );
  }
  return JSON.stringify({
    adsFinancialTargetingUsed: false,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    reason: request.reason,
  });
}

export function createProfileApi(options: ProfileApiOptions): ProfileApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;

  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<ProfileSnapshot> {
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": createCorrelationId(),
      ...PRIVACY_HEADERS,
    });
    if (init.body !== undefined) {
      headers.set("content-type", "application/json");
    }

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${path}`, {
          ...init,
          headers,
          credentials: "include",
        }),
      );
    } catch {
      throw new ProfileApiError(
        0,
        "PROFILE_NETWORK_ERROR",
        PROFILE_SAFE_ERROR_MESSAGE,
      );
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new ProfileApiError(
        response.status,
        errorCode(parsed),
        PROFILE_SAFE_ERROR_MESSAGE,
      );
    }
    return normalizeSnapshot(parsed);
  }

  return {
    getProfile(): Promise<ProfileSnapshot> {
      return request(PROFILE_PATH);
    },

    requestPrivacyExport(
      profileRequest: ProfileActionRequest,
    ): Promise<ProfileSnapshot> {
      return request(PROFILE_PRIVACY_EXPORT_PATH, {
        body: actionPayload(profileRequest),
        method: "POST",
      });
    },

    requestWithdrawalRequest(
      profileRequest: ProfileActionRequest,
    ): Promise<ProfileSnapshot> {
      return request(PROFILE_WITHDRAWAL_REQUEST_PATH, {
        body: actionPayload(profileRequest),
        method: "POST",
      });
    },
  };
}
