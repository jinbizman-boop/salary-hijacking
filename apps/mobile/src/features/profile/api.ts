import {
  PROFILE_CONSENTS_PATH,
  PROFILE_MY_PAGE_SUMMARY_PATH,
  PROFILE_ONBOARDING_COMPLETE_PATH,
  PROFILE_PATH,
  PROFILE_PRIVACY_EXPORT_PATH,
  PROFILE_SAFE_ERROR_MESSAGE,
  PROFILE_SUPPORT_TICKETS_PATH,
  PROFILE_WITHDRAWAL_REQUEST_PATH,
} from "./constants";
import type {
  ProfileAccountSettings,
  ProfileAccountSettingsRequest,
  ProfileActionRequest,
  ProfileActivity,
  ProfileApiClient,
  ProfileExportStatus,
  ProfileMyPageSummary,
  ProfilePrivacy,
  ProfileSnapshot,
  ProfileSupportTicket,
  ProfileSupportTicketCategory,
  ProfileSupportTicketRequest,
  ProfileSummary,
  ProfileUpdateRequest,
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
const SUPPORT_TICKET_CATEGORIES = new Set<ProfileSupportTicketCategory>([
  "ACCOUNT",
  "PAYMENT",
  "PRIVACY",
  "BUG",
  "OTHER",
]);
const SUPPORT_TICKET_STATUSES = new Set<ProfileSupportTicket["status"]>([
  "OPEN",
  "IN_PROGRESS",
  "ANSWERED",
  "CLOSED",
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

function normalizeMyPageSummary(value: unknown): ProfileMyPageSummary {
  if (!isRecord(value) || !isRecord(value.data)) return invalidResponse();
  const data = value.data;
  if (
    typeof data.adPartnerAccepted !== "boolean" ||
    data.adsFinancialTargetingUsed !== false ||
    !isNonNegativeInteger(data.communityComments) ||
    !isNonNegativeInteger(data.communityPosts) ||
    typeof data.contentRecommendationAccepted !== "boolean" ||
    data.financialRawDataExposed !== false ||
    !isNonNegativeInteger(data.level) ||
    !isNonNegativeInteger(data.levelXp) ||
    !nonEmptyString(data.nextActions) ||
    !isNonNegativeInteger(data.notificationUnread) ||
    !isNonNegativeInteger(data.privacyExportCount) ||
    typeof data.profileCompleted !== "boolean" ||
    data.rawPersonalDataExposed !== false ||
    data.rawTokenExposed !== false ||
    !isNonNegativeInteger(data.selfCareScore) ||
    data.sensitiveFinancialTargetingAccepted !== false ||
    !nonEmptyString(data.status) ||
    !nonEmptyString(data.theme) ||
    !isNonNegativeInteger(data.totalExp)
  ) {
    return invalidResponse();
  }
  return {
    adPartnerAccepted: data.adPartnerAccepted,
    adsFinancialTargetingUsed: false,
    communityComments: data.communityComments,
    communityPosts: data.communityPosts,
    contentRecommendationAccepted: data.contentRecommendationAccepted,
    financialRawDataExposed: false,
    latestExportRequestedAt: normalizeNullableTimestamp(
      data.latestExportRequestedAt,
    ),
    latestExportStatus:
      data.latestExportStatus === null || data.latestExportStatus === undefined
        ? null
        : nonEmptyString(data.latestExportStatus)
          ? data.latestExportStatus
          : invalidResponse(),
    level: data.level,
    levelXp: data.levelXp,
    nextActions: data.nextActions,
    notificationUnread: data.notificationUnread,
    privacyExportCount: data.privacyExportCount,
    profileCompleted: data.profileCompleted,
    rawPersonalDataExposed: false,
    rawTokenExposed: false,
    selfCareScore: data.selfCareScore,
    sensitiveFinancialTargetingAccepted: false,
    status: data.status,
    theme: data.theme,
    totalExp: data.totalExp,
  };
}

function normalizeAccountSettings(value: unknown): ProfileAccountSettings {
  if (!isRecord(value) || !isRecord(value.data)) return invalidResponse();
  const data = value.data;
  if (
    typeof data.adPartnerAccepted !== "boolean" ||
    data.adPartnerFinancialRawDataUsed !== false ||
    typeof data.analyticsAccepted !== "boolean" ||
    !nonEmptyString(data.consentVersion) ||
    typeof data.contentRecommendationAccepted !== "boolean" ||
    typeof data.marketingAccepted !== "boolean" ||
    typeof data.privacyAccepted !== "boolean" ||
    data.sensitiveFinancialTargetingAccepted !== false ||
    typeof data.termsAccepted !== "boolean"
  ) {
    return invalidResponse();
  }
  return {
    adPartnerAccepted: data.adPartnerAccepted,
    adPartnerFinancialRawDataUsed: false,
    analyticsAccepted: data.analyticsAccepted,
    consentVersion: data.consentVersion,
    contentRecommendationAccepted: data.contentRecommendationAccepted,
    marketingAccepted: data.marketingAccepted,
    privacyAccepted: data.privacyAccepted,
    sensitiveFinancialTargetingAccepted: false,
    termsAccepted: data.termsAccepted,
    updatedAt: normalizeNullableTimestamp(data.updatedAt),
  };
}

export function mergeProfileSnapshotWithMyPageSummary(
  snapshot: ProfileSnapshot,
  myPageSummary: ProfileMyPageSummary | null,
): ProfileSnapshot {
  if (!myPageSummary) return snapshot;
  return {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      communityComments: myPageSummary.communityComments,
      communityPosts: myPageSummary.communityPosts,
      currentLevel: myPageSummary.level,
      levelXp: myPageSummary.levelXp,
      notificationUnread: myPageSummary.notificationUnread,
      privacyPassRate:
        myPageSummary.financialRawDataExposed === false &&
        myPageSummary.rawPersonalDataExposed === false &&
        myPageSummary.rawTokenExposed === false &&
        myPageSummary.adsFinancialTargetingUsed === false &&
        myPageSummary.sensitiveFinancialTargetingAccepted === false
          ? "100.00%"
          : snapshot.summary.privacyPassRate,
      selfCareScore: myPageSummary.selfCareScore,
    },
    privacy: {
      ...snapshot.privacy,
      exportRequestedAt:
        myPageSummary.latestExportRequestedAt ??
        snapshot.privacy.exportRequestedAt,
      exportStatus: normalizeExportStatus(
        myPageSummary.latestExportStatus ?? snapshot.privacy.exportStatus,
      ),
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    },
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

function normalizeSupportTicket(value: unknown): ProfileSupportTicket {
  if (!isRecord(value) || !isRecord(value.data)) return invalidResponse();
  const data = value.data;
  if (
    !nonEmptyString(data.id) ||
    typeof data.category !== "string" ||
    !SUPPORT_TICKET_CATEGORIES.has(
      data.category as ProfileSupportTicketCategory,
    ) ||
    typeof data.status !== "string" ||
    !SUPPORT_TICKET_STATUSES.has(
      data.status as ProfileSupportTicket["status"],
    ) ||
    !nonEmptyString(data.subject) ||
    !isIsoTimestamp(data.createdAt) ||
    data.rawFinancialDataExposed !== false ||
    data.rawPersonalDataExposed !== false ||
    data.rawPushTokenExposed !== false ||
    data.adsFinancialTargetingUsed !== false
  ) {
    return invalidResponse();
  }

  return {
    adsFinancialTargetingUsed: false,
    category: data.category as ProfileSupportTicketCategory,
    createdAt: data.createdAt,
    id: data.id,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    status: data.status as ProfileSupportTicket["status"],
    subject: data.subject,
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

function validSupportTicketRequest(
  value: ProfileSupportTicketRequest,
): boolean {
  const text = `${value.subject} ${value.message}`;
  return (
    SUPPORT_TICKET_CATEGORIES.has(value.category) &&
    nonEmptyString(value.subject) &&
    value.subject.length <= 80 &&
    nonEmptyString(value.message) &&
    value.message.length <= 1_000 &&
    !/salary|income|expense|saving|hijack|token|email|phone|card|accountNumber/iu.test(
      text,
    )
  );
}

function validProfileUpdateRequest(value: ProfileUpdateRequest): boolean {
  const keys = Object.keys(value);
  if (!keys.length) return false;
  if (value.nickname !== undefined) {
    if (
      !nonEmptyString(value.nickname) ||
      value.nickname.length < 2 ||
      value.nickname.length > 40
    ) {
      return false;
    }
  }
  if (value.displayBio !== undefined && value.displayBio !== null) {
    if (typeof value.displayBio !== "string" || value.displayBio.length > 300) {
      return false;
    }
  }
  if (
    value.avatarAttachmentId !== undefined &&
    value.avatarAttachmentId !== null
  ) {
    if (
      typeof value.avatarAttachmentId !== "string" ||
      value.avatarAttachmentId.length > 160
    ) {
      return false;
    }
  }
  if (value.birthYear !== undefined && value.birthYear !== null) {
    if (
      !Number.isSafeInteger(value.birthYear) ||
      value.birthYear < 1900 ||
      value.birthYear > 2100
    ) {
      return false;
    }
  }
  if (
    value.occupationCategory !== undefined &&
    value.occupationCategory !== null
  ) {
    if (
      typeof value.occupationCategory !== "string" ||
      value.occupationCategory.length > 80
    ) {
      return false;
    }
  }
  return true;
}

function validAccountSettingsRequest(
  value: ProfileAccountSettingsRequest,
): boolean {
  return (
    typeof value.adPartnerAccepted === "boolean" &&
    typeof value.analyticsAccepted === "boolean" &&
    nonEmptyString(value.consentVersion) &&
    value.consentVersion.length <= 60 &&
    typeof value.contentRecommendationAccepted === "boolean" &&
    typeof value.marketingAccepted === "boolean" &&
    value.privacyAccepted === true &&
    value.termsAccepted === true
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

function accountSettingsPayload(
  request: ProfileAccountSettingsRequest,
): string {
  if (!validAccountSettingsRequest(request)) {
    throw new ProfileApiError(
      0,
      "PROFILE_INVALID_ACCOUNT_SETTINGS_REQUEST",
      PROFILE_SAFE_ERROR_MESSAGE,
    );
  }
  return JSON.stringify({
    adPartnerAccepted: request.adPartnerAccepted,
    adsFinancialTargetingUsed: false,
    analyticsAccepted: request.analyticsAccepted,
    consentVersion: request.consentVersion,
    contentRecommendationAccepted: request.contentRecommendationAccepted,
    marketingAccepted: request.marketingAccepted,
    privacyAccepted: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    sensitiveFinancialTargetingAccepted: false,
    termsAccepted: true,
  });
}

function profileUpdatePayload(request: ProfileUpdateRequest): string {
  if (!validProfileUpdateRequest(request)) {
    throw new ProfileApiError(
      0,
      "PROFILE_INVALID_UPDATE_REQUEST",
      PROFILE_SAFE_ERROR_MESSAGE,
    );
  }
  return JSON.stringify({
    adsFinancialTargetingUsed: false,
    ...request,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
  });
}

function onboardingCompletePayload(): string {
  return JSON.stringify({
    adsFinancialTargetingUsed: false,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
  });
}

function supportTicketPayload(request: ProfileSupportTicketRequest): string {
  if (!validSupportTicketRequest(request)) {
    throw new ProfileApiError(
      0,
      "PROFILE_INVALID_SUPPORT_TICKET_REQUEST",
      PROFILE_SAFE_ERROR_MESSAGE,
    );
  }
  return JSON.stringify({
    adsFinancialTargetingUsed: false,
    category: request.category,
    message: request.message.trim(),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    subject: request.subject.trim(),
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

  async function requestSupportTicket(
    path: string,
    init: RequestInit,
  ): Promise<ProfileSupportTicket> {
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": createCorrelationId(),
      ...PRIVACY_HEADERS,
    });
    headers.set("content-type", "application/json");

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
    return normalizeSupportTicket(parsed);
  }

  async function requestMyPageSummary(): Promise<ProfileMyPageSummary> {
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": createCorrelationId(),
      ...PRIVACY_HEADERS,
    });

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${PROFILE_MY_PAGE_SUMMARY_PATH}`, {
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
    return normalizeMyPageSummary(parsed);
  }

  async function requestAccountSettings(
    accountRequest: ProfileAccountSettingsRequest,
  ): Promise<ProfileAccountSettings> {
    const headers = new Headers({
      accept: "application/json",
      "content-type": "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": createCorrelationId(),
      ...PRIVACY_HEADERS,
    });

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${PROFILE_CONSENTS_PATH}`, {
          body: accountSettingsPayload(accountRequest),
          headers,
          method: "PATCH",
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
    return normalizeAccountSettings(parsed);
  }

  return {
    getProfile(): Promise<ProfileSnapshot> {
      return request(PROFILE_PATH);
    },

    getMyPageSummary(): Promise<ProfileMyPageSummary> {
      return requestMyPageSummary();
    },

    updateAccountSettings(
      accountRequest: ProfileAccountSettingsRequest,
    ): Promise<ProfileAccountSettings> {
      return requestAccountSettings(accountRequest);
    },

    updateProfile(
      profileRequest: ProfileUpdateRequest,
    ): Promise<ProfileSnapshot> {
      return request(PROFILE_PATH, {
        body: profileUpdatePayload(profileRequest),
        method: "PATCH",
      });
    },

    completeOnboarding(): Promise<ProfileSnapshot> {
      return request(PROFILE_ONBOARDING_COMPLETE_PATH, {
        body: onboardingCompletePayload(),
        method: "POST",
      });
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

    createSupportTicket(
      supportRequest: ProfileSupportTicketRequest,
    ): Promise<ProfileSupportTicket> {
      return requestSupportTicket(PROFILE_SUPPORT_TICKETS_PATH, {
        body: supportTicketPayload(supportRequest),
        method: "POST",
      });
    },
  };
}
