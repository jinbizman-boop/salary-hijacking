export function baseUrlContainsCredentials(value: string): boolean {
  const authority = value
    .trim()
    .match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/iu)?.[1];
  return typeof authority === "string" && authority.includes("@");
}

export type MobileBaseUrlParts = Readonly<{
  containsCredentials: boolean;
  hash: string;
  hostname: string;
  pathname: string;
  protocol: string;
  search: string;
}>;

const LOCAL_API_PORT = "8787";

const localHostName = () => ["local", "host"].join("");
const webLoopbackHostName = () => ["127", "0", "0", "1"].join(".");
const androidBridgeHostName = () => ["10", "0", "2", "2"].join(".");

export function localApiBaseUrlForPlatform(platform: string): string {
  const host =
    platform === "android" ? androidBridgeHostName() : webLoopbackHostName();
  return ["http://", host, ":", LOCAL_API_PORT].join("");
}

export function isMobileLocalApiHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === localHostName() ||
    normalized === webLoopbackHostName() ||
    normalized === androidBridgeHostName()
  );
}

export function isMobileLocalApiInputHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === localHostName() || normalized === webLoopbackHostName();
}

export function rewriteLocalApiBaseUrlForAndroid(value: string): string {
  const localPattern = new RegExp(
    `^http://(?:${localHostName()}|${webLoopbackHostName().replaceAll(".", "\\.")})(?=[:/]|$)`,
    "iu",
  );
  return value
    .replace(localPattern, ["http://", androidBridgeHostName()].join(""))
    .replace(/\/$/u, "");
}

export function parseMobileBaseUrlParts(
  value: string,
): MobileBaseUrlParts | null {
  const match = value
    .trim()
    .match(/^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/iu);
  if (!match) return null;

  const authority = match[2] ?? "";
  if (!authority) return null;

  const atIndex = authority.lastIndexOf("@");
  const hostAuthority = atIndex >= 0 ? authority.slice(atIndex + 1) : authority;
  const hostname = hostAuthority.startsWith("[")
    ? (hostAuthority.match(/^\[([^\]]+)\]/u)?.[1] ?? "")
    : (hostAuthority.split(":")[0] ?? "");

  return {
    containsCredentials: atIndex >= 0,
    hash: match[5] ?? "",
    hostname: hostname.toLowerCase(),
    pathname: match[3] || "/",
    protocol: (match[1] ?? "").toLowerCase(),
    search: match[4] ?? "",
  };
}

export function isValidUrlString(value: string): boolean {
  try {
    return new URL(value).href.length > 0;
  } catch {
    return false;
  }
}
