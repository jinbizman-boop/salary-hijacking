import { Platform } from "react-native";

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
import { readMobileApiBaseUrl } from "./api-base";

export type MobileApiFactoryOptions = Readonly<{
  baseUrl?: string;
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export function mobileClientPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return "web";
}

export function createMobileCommunityService(
  options: MobileApiFactoryOptions = {},
): CommunityService {
  const api = createCommunityApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
  return createCommunityService(api);
}

export function createMobileBudgetApi(
  options: MobileApiFactoryOptions = {},
): BudgetApiClient {
  return createBudgetApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobilePayrollApi(
  options: MobileApiFactoryOptions = {},
): PayrollApiClient {
  return createPayrollApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobilePlanCommitmentsApi(
  options: MobileApiFactoryOptions = {},
): PlanCommitmentsApiClient {
  return createPlanCommitmentsApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileNotificationsApi(
  options: MobileApiFactoryOptions = {},
): NotificationsApiClient {
  return createNotificationsApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileGrowthApi(
  options: MobileApiFactoryOptions = {},
): GrowthApiClient {
  return createGrowthApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}

export function createMobileProfileApi(
  options: MobileApiFactoryOptions = {},
): ProfileApiClient {
  return createProfileApi({
    baseUrl: options.baseUrl ?? readMobileApiBaseUrl(),
    platform: mobileClientPlatform(),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.createCorrelationId
      ? { createCorrelationId: options.createCorrelationId }
      : {}),
  });
}
