import Constants from "expo-constants";
import { Platform } from "react-native";

declare const process: {
  readonly env: {
    readonly EXPO_PUBLIC_API_BASE_URL?: string;
  };
};

type EnvironmentName = "local" | "development" | "staging" | "production";

export type MobileApiBaseOptions = Readonly<{
  explicitUrl?: string;
  configuredUrl?: string;
  environment: EnvironmentName;
  platform: string;
}>;

type ExpoExtra = Readonly<{
  api?: Readonly<{ baseUrl?: unknown }>;
  app?: Readonly<{ environment?: unknown }>;
}>;

export function resolveMobileApiBaseUrl(options: MobileApiBaseOptions): string {
  const candidates = [options.explicitUrl, options.configuredUrl];

  for (const candidate of candidates) {
    const normalized = normalizeApiBase(
      candidate,
      options.platform,
      options.environment,
    );
    if (normalized) return normalized;
  }

  if (options.environment === "production") return "";
  return options.platform === "android"
    ? "http://10.0.2.2:8787"
    : "http://localhost:8787";
}

export function readMobileApiBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  const explicitUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const configuredUrl =
    typeof extra.api?.baseUrl === "string"
      ? extra.api.baseUrl.trim()
      : undefined;
  const environment = normalizeEnvironment(extra.app?.environment);

  return resolveMobileApiBaseUrl({
    environment,
    platform: String(Platform.OS),
    ...(explicitUrl ? { explicitUrl } : {}),
    ...(configuredUrl ? { configuredUrl } : {}),
  });
}

function normalizeApiBase(
  value: string | undefined,
  platform: string,
  environment: EnvironmentName,
): string {
  if (!value?.trim()) return "";

  try {
    const url = new URL(value.trim());
    const localHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (environment === "production" && url.protocol !== "https:") return "";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
      return "";
    }

    if (platform === "android" && localHost) {
      url.hostname = "10.0.2.2";
    }

    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeEnvironment(value: unknown): EnvironmentName {
  return value === "local" ||
    value === "development" ||
    value === "staging" ||
    value === "production"
    ? value
    : "development";
}
