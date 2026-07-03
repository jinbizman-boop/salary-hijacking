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

export function mobileClientPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return "web";
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
