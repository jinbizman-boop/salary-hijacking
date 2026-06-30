import { Platform } from "react-native";

import { createBudgetApi } from "../../features/budget/api";
import type { BudgetApiClient } from "../../features/budget/types";
import { createCommunityApi } from "../../features/community/api";
import { createCommunityService } from "../../features/community/community.service";
import type { CommunityService } from "../../features/community/community.types";
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
