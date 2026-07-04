import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { createAuthApi } from "../../features/auth/api";
import type { AuthApiClient, AuthTokenStore } from "../../features/auth/types";
import { createBudgetApi } from "../../features/budget/api";
import type { BudgetApiClient } from "../../features/budget/types";
import { createCommunityApi } from "../../features/community/api";
import { createCommunityService } from "../../features/community/community.service";
import type { CommunityService } from "../../features/community/community.types";
import { createGrowthApi } from "../../features/level/api";
import type { GrowthApiClient } from "../../features/level/types";
import { createNotificationsApi } from "../../features/notifications/api";
import type { NotificationsApiClient } from "../../features/notifications/types";
import { createPayrollApi } from "../../features/payroll/api";
import type { PayrollApiClient } from "../../features/payroll/types";
import { createPlanCommitmentsApi } from "../../features/plan/api";
import type { PlanCommitmentsApiClient } from "../../features/plan/types";
import { createProfileApi } from "../../features/profile/api";
import type { ProfileApiClient } from "../../features/profile/types";
import { createUploadsApi } from "../../features/uploads/api";
import type { UploadsApiClient } from "../../features/uploads/types";
import { readMobileApiBaseUrl } from "./api-base";
import {
  attachMobileBearerToken,
  type MobileBearerTokenStore,
} from "../storage/auth-token";

export type MobileApiFactoryOptions = Readonly<{
  baseUrl?: string;
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
  tokenStore?: MobileApiTokenStore;
}>;

export type MobileAuthenticatedFetcherOptions = Readonly<{
  baseUrl?: string;
  createCorrelationId?: () => string;
  fetcher?: typeof fetch;
  refreshAccessToken?: () => Promise<unknown>;
  tokenStore?: MobileApiTokenStore;
}>;

export type MobileApiTokenStore = MobileBearerTokenStore &
  Partial<AuthTokenStore>;

export type MobilePublicAppLinks = Readonly<{
  landingUrl: string;
  partnerBenefitsUrl: string;
  privacyUrl: string;
  supportUrl: string;
  termsUrl: string;
}>;

export type MobilePublicAppPrivacy = Readonly<{
  rawPayrollDataForAds: false;
  rawExpenseDataForAds: false;
  rawSavingsDataForAds: false;
  advertiserUserIdentifierExposure: false;
}>;

export type MobilePublicAppConfig = Readonly<{
  links: MobilePublicAppLinks;
  privacy: MobilePublicAppPrivacy;
}>;

export type MobilePublicConfigApiClient = Readonly<{
  getPublicAppConfig: () => Promise<MobilePublicAppConfig>;
}>;

const FORBIDDEN_PUBLIC_CONFIG_KEYS = new Set(
  [
    "salaryAmount",
    "incomeAmount",
    "expenseAmount",
    "savingsAmount",
    "hijackAmount",
    "payrollAmount",
    "accountNumber",
    "cardNumber",
    "loanAmount",
    "residentNumber",
    "email",
    "phone",
    "authToken",
    "refreshToken",
    "sessionToken",
    "pushToken",
    "deviceIdentifier",
    "DATABASE_URL",
    "JWT_SECRET",
    "privateKey",
    "serviceAccount",
    "FCM_SERVER_KEY",
  ].map((key) => key.toLowerCase()),
);
const FORBIDDEN_PUBLIC_CONFIG_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/u,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/u,
  /\b(?:token|authorization|bearer|session|refresh|push|fcm)\b\s*[:=]?\s*[A-Z0-9._~+/=-]{8,}/iu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
  /\b(?:salary|income|expense|savings?|hijack|payroll)\b[^\d]{0,24}(?:\d{1,3}(?:,\d{3})+|\d{6,})\b/iu,
] as const;

export function mobileClientPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return "web";
}

export function createMobilePublicConfigApi(
  options: MobileApiFactoryOptions = {},
): MobilePublicConfigApiClient {
  const baseUrl = options.baseUrl ?? readMobileApiBaseUrl();
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? (() => `mobile-public-${Date.now()}`);

  return {
    async getPublicAppConfig(): Promise<MobilePublicAppConfig> {
      const response = await fetcher(`${baseUrl}/api/v1/public/app-config`, {
        credentials: "include",
        headers: {
          accept: "application/json",
          "x-client-platform": mobileClientPlatform(),
          "x-correlation-id": createCorrelationId(),
          "x-raw-financial-data-exposed": "false",
          "x-raw-personal-data-exposed": "false",
          "x-ad-financial-targeting-used": "false",
        },
      });
      const parsed = await response.json();
      if (!response.ok) throw new Error("PUBLIC_APP_CONFIG_REQUEST_FAILED");
      if (containsForbiddenPublicConfigPayload(parsed)) {
        throw new Error("PUBLIC_APP_CONFIG_SENSITIVE_PAYLOAD");
      }
      return normalizeMobilePublicAppConfig(parsed);
    },
  };
}

export function createMobileAuthenticatedFetcher(
  options: MobileAuthenticatedFetcherOptions = {},
): typeof fetch {
  const fetcher = options.fetcher ?? fetch;
  const tokenStore = options.tokenStore ?? SecureStore;
  const refreshAccessToken =
    options.refreshAccessToken ??
    createDefaultRefreshAccessToken(options, tokenStore);
  let refreshInFlight: Promise<unknown> | null = null;
  return async (input, init) => {
    const request = new Request(input, init);
    const response = await fetcher(
      await authorizeRequest(request.clone(), tokenStore),
    );
    if (response.status !== 401 || !refreshAccessToken) return response;

    try {
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      await refreshInFlight;
    } catch {
      return response;
    }
    return fetcher(await authorizeRequest(request.clone(), tokenStore));
  };
}

export function createMobileAuthApi(
  options: MobileApiFactoryOptions = {},
): AuthApiClient {
  const tokenStore = hasAuthTokenWriter(options.tokenStore)
    ? options.tokenStore
    : SecureStore;
  return createAuthApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    tokenStore,
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

function normalizeMobilePublicAppConfig(input: unknown): MobilePublicAppConfig {
  const data = recordValue(input, "data");
  const links = recordValue(data, "links");
  const privacy = recordValue(data, "privacy");
  return {
    links: {
      landingUrl: stringValue(links, "landingUrl"),
      partnerBenefitsUrl: stringValue(links, "partnerBenefitsUrl"),
      privacyUrl: stringValue(links, "privacyUrl"),
      supportUrl: stringValue(links, "supportUrl"),
      termsUrl: stringValue(links, "termsUrl"),
    },
    privacy: {
      rawPayrollDataForAds: boolFalse(privacy, "rawPayrollDataForAds"),
      rawExpenseDataForAds: boolFalse(privacy, "rawExpenseDataForAds"),
      rawSavingsDataForAds: boolFalse(privacy, "rawSavingsDataForAds"),
      advertiserUserIdentifierExposure: boolFalse(
        privacy,
        "advertiserUserIdentifierExposure",
      ),
    },
  };
}

function containsForbiddenPublicConfigPayload(
  input: unknown,
  seen = new Set<object>(),
): boolean {
  if (!input || typeof input !== "object") return false;
  if (seen.has(input)) return false;
  seen.add(input);
  if (Array.isArray(input)) {
    return input.some((item) =>
      containsForbiddenPublicConfigPayload(item, seen),
    );
  }
  return Object.entries(input as Readonly<Record<string, unknown>>).some(
    ([key, value]) =>
      FORBIDDEN_PUBLIC_CONFIG_KEYS.has(key.toLowerCase()) ||
      containsForbiddenPublicConfigValue(value) ||
      containsForbiddenPublicConfigPayload(value, seen),
  );
}

function containsForbiddenPublicConfigValue(value: unknown): boolean {
  return (
    typeof value === "string" &&
    FORBIDDEN_PUBLIC_CONFIG_VALUE_PATTERNS.some((pattern) =>
      pattern.test(value),
    )
  );
}

function recordValue(
  input: unknown,
  key: string,
): Readonly<Record<string, unknown>> {
  const candidate =
    input && typeof input === "object"
      ? (input as Readonly<Record<string, unknown>>)[key]
      : null;
  return candidate && typeof candidate === "object"
    ? (candidate as Readonly<Record<string, unknown>>)
    : {};
}

function stringValue(
  input: Readonly<Record<string, unknown>>,
  key: string,
): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

function boolFalse(
  input: Readonly<Record<string, unknown>>,
  key: string,
): false {
  if (input[key] !== false) throw new Error("PUBLIC_APP_CONFIG_PRIVACY_UNSAFE");
  return false;
}

function hasAuthTokenWriter(
  tokenStore: MobileApiTokenStore | undefined,
): tokenStore is MobileApiTokenStore & AuthTokenStore {
  return typeof tokenStore?.setItemAsync === "function";
}

async function authorizeRequest(
  request: Request,
  tokenStore: MobileBearerTokenStore,
): Promise<Request> {
  const headers = await attachMobileBearerToken(
    new Headers(request.headers),
    tokenStore,
  );
  return new Request(request, { headers });
}

function createDefaultRefreshAccessToken(
  options: MobileAuthenticatedFetcherOptions,
  tokenStore: MobileApiTokenStore,
): (() => Promise<unknown>) | null {
  if (!hasAuthTokenWriter(tokenStore)) return null;
  return () =>
    createAuthApi({
      baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
      platform: mobileClientPlatform(),
      tokenStore,
      ...(options.fetcher ? { fetcher: options.fetcher } : {}),
      ...(options.createCorrelationId
        ? { createCorrelationId: options.createCorrelationId }
        : {}),
    }).refresh();
}

export function createMobileCommunityService(
  options: MobileApiFactoryOptions = {},
): CommunityService {
  const fetcher = createMobileAuthenticatedFetcher(options);
  const api = createCommunityApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
  return createCommunityService(api);
}

export function createMobileBudgetApi(
  options: MobileApiFactoryOptions = {},
): BudgetApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createBudgetApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobilePayrollApi(
  options: MobileApiFactoryOptions = {},
): PayrollApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createPayrollApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobilePlanCommitmentsApi(
  options: MobileApiFactoryOptions = {},
): PlanCommitmentsApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createPlanCommitmentsApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileNotificationsApi(
  options: MobileApiFactoryOptions = {},
): NotificationsApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createNotificationsApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileGrowthApi(
  options: MobileApiFactoryOptions = {},
): GrowthApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createGrowthApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileProfileApi(
  options: MobileApiFactoryOptions = {},
): ProfileApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createProfileApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileUploadsApi(
  options: MobileApiFactoryOptions = {},
): UploadsApiClient {
  const fetcher = createMobileAuthenticatedFetcher(options);
  return createUploadsApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    fetcher,
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}
