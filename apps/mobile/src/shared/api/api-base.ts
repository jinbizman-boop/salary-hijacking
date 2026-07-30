import Constants from "expo-constants";
import { Platform } from "react-native";
import { isValidUrlString, parseMobileBaseUrlParts } from "./url-validation";

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

const PRODUCTION_API_BASE_URL = "https://api.salaryhijacking.com";
const STAGING_API_BASE_URL = "https://api-staging.salaryhijacking.com";

export function resolveMobileApiBaseUrl(options: MobileApiBaseOptions): string {
  const candidates = [options.explicitUrl, options.configuredUrl];
  const hadCandidate = candidates.some((candidate) =>
    Boolean(candidate?.trim()),
  );

  for (const candidate of candidates) {
    const normalized = normalizeApiBase(
      candidate,
      options.platform,
      options.environment,
    );
    if (normalized) return normalized;
  }

  if (options.environment === "production") return PRODUCTION_API_BASE_URL;
  if (hadCandidate) return STAGING_API_BASE_URL;
  if (options.environment === "local") {
    return options.platform === "android"
      ? "http://10.0.2.2:8787"
      : "http://127.0.0.1:8787";
  }
  return STAGING_API_BASE_URL;
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
    const stripped = value
      .trim()
      .replace(/[?#].*$/u, "")
      .replace(/\/+$/u, "");
    if (!isValidUrlString(stripped)) throw new Error("INVALID_URL");
    const baseUrlParts = parseMobileBaseUrlParts(stripped);
    if (!baseUrlParts || baseUrlParts.containsCredentials) return "";
    const localHost =
      baseUrlParts.hostname === "localhost" ||
      baseUrlParts.hostname === "127.0.0.1";

    if (environment === "production" && baseUrlParts.protocol !== "https:") {
      return "";
    }
    if (
      baseUrlParts.protocol !== "https:" &&
      !(
        environment === "local" &&
        baseUrlParts.protocol === "http:" &&
        localHost
      )
    ) {
      return "";
    }

    if (platform === "android" && localHost) {
      return stripped
        .replace(
          /^http:\/\/(?:localhost|127\.0\.0\.1)(?=[:/]|$)/iu,
          "http://10.0.2.2",
        )
        .replace(/\/$/u, "");
    }

    return stripped;
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
    : "staging";
}
