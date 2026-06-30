/**
 * packages/security/src/masking.ts
 * 급여납치 Salary Hijacking Platform · log-safe masking and redaction contract.
 *
 * Scope
 * - Server/edge/browser-safe pure TypeScript masking utilities; no runtime dependency.
 * - Prevents raw token, secret, PII, payroll, expense, saving, ads-partner and community
 *   cross-domain financial leakage in logs, API responses, analytics and audit metadata.
 * - Provides deterministic redaction policies, deep object sanitization, URL/header masking,
 *   error masking, leak detection and completeness gates for commercial release.
 */

export const SECURITY_MASKING_CONTRACT_VERSION = "2.0.0" as const;
export const SECURITY_MASKING_PACKAGE_SCOPE =
  "packages/security/src/masking.ts" as const;

export type MaskingMode = "strict" | "balanced" | "display";
export type MaskingAction =
  | "drop"
  | "redact"
  | "mask"
  | "hash-placeholder"
  | "allow";
export type MaskingRuntime = "server" | "edge" | "browser" | "test";

export type SensitiveFieldClass =
  | "raw-secret"
  | "auth-token"
  | "password"
  | "pii-name"
  | "pii-email"
  | "pii-phone"
  | "pii-identity"
  | "financial-account"
  | "financial-card"
  | "financial-amount"
  | "payroll"
  | "expense"
  | "saving"
  | "device"
  | "network"
  | "community"
  | "ads-partner"
  | "unknown";

export interface MaskingOptions {
  readonly mode?: MaskingMode;
  readonly runtime?: MaskingRuntime;
  readonly maxDepth?: number;
  readonly maxArrayLength?: number;
  readonly maxStringLength?: number;
  readonly preserveShape?: boolean;
  readonly allowDisplayLast4?: boolean;
  readonly allowFinancialAmountDisplay?: boolean;
  readonly allowCommunityTextPreview?: boolean;
  readonly dropUndefined?: boolean;
}

export interface MaskingClassification {
  readonly fieldClass: SensitiveFieldClass;
  readonly action: MaskingAction;
  readonly reason: string;
}

export interface MaskingCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof SECURITY_MASKING_CONTRACT_VERSION;
  readonly packageScope: typeof SECURITY_MASKING_PACKAGE_SCOPE;
  readonly sensitiveFieldClassCount: number;
  readonly redactionKeyCount: number;
  readonly invariantCount: number;
  readonly missing: readonly string[];
}

export class SecurityMaskingError extends Error {
  public readonly code: string;
  public readonly safeMessage: string;

  public constructor(code: string, safeMessage: string) {
    super(safeMessage);
    this.name = "SecurityMaskingError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

const fail = (code: string, safeMessage: string): never => {
  throw new SecurityMaskingError(code, safeMessage);
};

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_ARRAY_LENGTH = 50;
const DEFAULT_MAX_STRING_LENGTH = 2_000;
const MAX_OBJECT_KEYS = 500;
const REDACTED = "[REDACTED]";
const DROPPED = "[DROPPED]";
const MASKED = "[MASKED]";
const TRUNCATED = "[TRUNCATED]";
const CIRCULAR = "[Circular]";

const SENSITIVE_FIELD_CLASSES: readonly SensitiveFieldClass[] = [
  "raw-secret",
  "auth-token",
  "password",
  "pii-name",
  "pii-email",
  "pii-phone",
  "pii-identity",
  "financial-account",
  "financial-card",
  "financial-amount",
  "payroll",
  "expense",
  "saving",
  "device",
  "network",
  "community",
  "ads-partner",
  "unknown",
] as const;

const NORMALIZED_SECRET_KEY_PATTERNS: readonly RegExp[] = [
  /(^|_)(password|passwd|pwd|passphrase|pin|otp|mfa|totp|secret|privatekey|apikey|api_key|accesskey|clientsecret|webhooksecret)($|_)/i,
  /(^|_)(token|accesstoken|refresh|refreshtoken|idtoken|jwt|bearer|session|cookie|authorization)($|_)/i,
  /(^|_)(salt|pepper|signature|hmac|hashinput|rawtoken|rawsecret)($|_)/i,
];

const NORMALIZED_PII_KEY_PATTERNS: readonly [SensitiveFieldClass, RegExp][] = [
  ["pii-email", /(^|_)(email|emailaddress|mail)($|_)/i],
  ["pii-phone", /(^|_)(phone|phonenumber|mobile|tel|telephone)($|_)/i],
  [
    "pii-name",
    /(^|_)(name|username|nickname|realname|displayname|holdername)($|_)/i,
  ],
  [
    "pii-identity",
    /(^|_)(rrn|resident|residentnumber|registrationnumber|birth|birthday|dob|identity|identitynumber|passport|driverlicense)($|_)/i,
  ],
  [
    "device",
    /(^|_)(deviceid|pushtoken|fcm|apnstoken|endpoint|useragent)($|_)/i,
  ],
  ["network", /(^|_)(ip|ipaddress|ipv4|ipv6|remoteaddr|forwardedfor)($|_)/i],
];

const NORMALIZED_FINANCIAL_KEY_PATTERNS: readonly [
  SensitiveFieldClass,
  RegExp,
][] = [
  [
    "financial-account",
    /(^|_)(account|accountnumber|bankaccount|iban|virtualaccount|depositaccount)($|_)/i,
  ],
  [
    "financial-card",
    /(^|_)(card|cardnumber|pan|cvc|cvv|expiry|cardexpiry)($|_)/i,
  ],
  [
    "financial-amount",
    /(^|_)(amount|salary|income|payroll|expense|saving|budget|balance|price|cost|fee|loan|debt)($|_)/i,
  ],
  [
    "payroll",
    /(^|_)(payroll|payday|salary|income|hijack|hijackamount|monthlyincome)($|_)/i,
  ],
  [
    "expense",
    /(^|_)(expense|receipt|merchant|spending|fixedexpense|variableexpense)($|_)/i,
  ],
  [
    "saving",
    /(^|_)(saving|deposit|installment|investment|goalamount|targetamount)($|_)/i,
  ],
  [
    "ads-partner",
    /(^|_)(ad|ads|partner|campaign|placement|creative|tracking|clickid)($|_)/i,
  ],
  [
    "community",
    /(^|_)(post|comment|body|content|message|anonymous|community)($|_)/i,
  ],
];

const RAW_SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /postgres(?:ql)?:\/\/[^\s]+/i,
  /mysql:\/\/[^\s]+/i,
  /mongodb(?:\+srv)?:\/\/[^\s]+/i,
  /redis:\/\/[^\s]+/i,
  /bearer\s+[a-z0-9._~+/=-]{16,}/i,
  /sk_(?:live|test)_[a-z0-9]{16,}/i,
  /xox[baprs]-[a-z0-9-]{20,}/i,
  /AKIA[0-9A-Z]{16}/,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /refresh[_-]?token[\s:=]+[a-z0-9._~+/=-]{12,}/i,
  /password[\s:=]+[^\s]{4,}/i,
];

const EMAIL_PATTERN = /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
const KOREAN_PHONE_PATTERN =
  /(?:\+82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}/g;
const RRN_PATTERN = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
const CARD_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;
const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER_PATTERN = /bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi;
const IP_V4_PATTERN =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

const normalizeKey = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const stringifyPrimitive = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  )
    return String(value);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return Object.prototype.toString.call(value);
};

const clip = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength))}${TRUNCATED}`;
};

const onlyDigits = (value: string): string => value.replace(/\D/g, "");

const keepEdges = (
  value: string,
  left: number,
  right: number,
  mask = "*",
): string => {
  if (value.length <= left + right)
    return mask.repeat(Math.max(1, value.length));
  return `${value.slice(0, left)}${mask.repeat(Math.max(3, value.length - left - right))}${value.slice(value.length - right)}`;
};

export const maskEmail = (email: string): string => {
  const trimmed = email.trim();
  const match = /^([^@]+)@(.+)$/.exec(trimmed);
  if (!match) return MASKED;
  const local = match[1] ?? "";
  const domain = match[2] ?? "";
  const maskedLocal =
    local.length <= 2 ? `${local.slice(0, 1)}***` : `${local.slice(0, 2)}***`;
  const domainParts = domain.split(".");
  const root = domainParts[0] ?? "";
  const suffix = domainParts.slice(1).join(".");
  const maskedRoot =
    root.length <= 2 ? `${root.slice(0, 1)}***` : keepEdges(root, 1, 1);
  return `${maskedLocal}@${suffix ? `${maskedRoot}.${suffix}` : maskedRoot}`;
};

export const maskPhone = (phone: string): string => {
  const digits = onlyDigits(phone);
  if (digits.length < 7) return MASKED;
  if (digits.startsWith("82") && digits.length >= 11)
    return `+82-${digits.slice(2, 4)}**-****-${digits.slice(-2)}`;
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-***-${digits.slice(-4)}`;
  return keepEdges(digits, 2, 4);
};

export const maskName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return MASKED;
  if (trimmed.length === 1) return "*";
  if (/^[가-힣]{2,5}$/.test(trimmed))
    return `${trimmed.slice(0, 1)}${"*".repeat(trimmed.length - 1)}`;
  const parts = trimmed.split(/\s+/);
  return parts
    .map((part) =>
      part.length <= 1
        ? "*"
        : `${part.slice(0, 1)}${"*".repeat(part.length - 1)}`,
    )
    .join(" ");
};

export const maskResidentRegistrationNumber = (value: string): string => {
  const digits = onlyDigits(value);
  if (digits.length !== 13) return MASKED;
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
};

export const maskAccountNumber = (value: string): string => {
  const normalized = value.replace(/[^0-9A-Za-z]/g, "");
  if (normalized.length < 6) return MASKED;
  return keepEdges(normalized, 2, 4);
};

const luhnLikeEnoughForCard = (digits: string): boolean =>
  digits.length >= 13 && digits.length <= 19;

export const maskCardNumber = (value: string): string => {
  const digits = onlyDigits(value);
  if (!luhnLikeEnoughForCard(digits)) return MASKED;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
    .replace(/(.{4})/g, "$1 ")
    .trim();
};

export const maskKrwAmount = (
  value: number | bigint | string,
  options: Pick<MaskingOptions, "allowFinancialAmountDisplay"> = {},
): string => {
  if (options.allowFinancialAmountDisplay !== true) return "₩[REDACTED]";
  const raw =
    typeof value === "bigint"
      ? value.toString()
      : typeof value === "number"
        ? Math.trunc(value).toString()
        : onlyDigits(value);
  if (!raw) return "₩0";
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(numeric)) return "₩[MASKED]";
  return `₩${numeric.toLocaleString("ko-KR")}`;
};

export const maskIpAddress = (value: string): string => {
  if (value.includes(":")) {
    const segments = value.split(":");
    if (segments.length >= 3) return `${segments[0]}:${segments[1]}::****`;
  }
  return value.replace(IP_V4_PATTERN, (match) => {
    const parts = match.split(".");
    return `${parts[0] ?? "0"}.${parts[1] ?? "0"}.***.***`;
  });
};

export const maskToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return REDACTED;
  if (trimmed.length <= 12) return REDACTED;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
};

export const maskJwt = (value: string): string => {
  const parts = value.split(".");
  if (parts.length !== 3) return maskToken(value);
  return `${maskToken(parts[0] ?? "")}.${REDACTED}.${maskToken(parts[2] ?? "")}`;
};

export const maskBearerToken = (value: string): string =>
  value.replace(BEARER_PATTERN, (match) => {
    const token = match.replace(/^bearer\s+/i, "");
    return `Bearer ${maskToken(token)}`;
  });

export const maskUrl = (value: string): string => {
  try {
    const url = new URL(value);
    const sensitiveQueryKeys: string[] = [];
    url.searchParams.forEach((_paramValue, key) => {
      const classification = classifySensitiveKey(key);
      if (classification.action !== "allow") sensitiveQueryKeys.push(key);
    });
    for (const key of sensitiveQueryKeys) url.searchParams.set(key, REDACTED);
    if (url.username) url.username = REDACTED;
    if (url.password) url.password = REDACTED;
    return url.toString();
  } catch {
    return maskFreeText(value);
  }
};

export const maskFreeText = (
  value: string,
  options: MaskingOptions = {},
): string => {
  const maxLength = options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;
  let output = value;
  output = output.replace(JWT_PATTERN, (match) => maskJwt(match));
  output = maskBearerToken(output);
  output = output.replace(EMAIL_PATTERN, (match) => maskEmail(match));
  output = output.replace(KOREAN_PHONE_PATTERN, (match) => maskPhone(match));
  output = output.replace(RRN_PATTERN, (match) =>
    maskResidentRegistrationNumber(match),
  );
  output = output.replace(CARD_PATTERN, (match) => {
    const digits = onlyDigits(match);
    return luhnLikeEnoughForCard(digits) ? maskCardNumber(match) : match;
  });
  output = maskIpAddress(output);
  for (const pattern of RAW_SECRET_VALUE_PATTERNS)
    output = output.replace(pattern, REDACTED);
  return clip(output, maxLength);
};

export const classifySensitiveKey = (key: string): MaskingClassification => {
  const normalized = normalizeKey(key);
  if (!normalized)
    return Object.freeze({
      fieldClass: "unknown",
      action: "allow",
      reason: "empty-key",
    });

  if (
    NORMALIZED_SECRET_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return Object.freeze({
      fieldClass:
        normalized.includes("password") || normalized.includes("pwd")
          ? "password"
          : "auth-token",
      action: "redact",
      reason: "secret-key-pattern",
    });
  }

  for (const [fieldClass, pattern] of NORMALIZED_PII_KEY_PATTERNS) {
    if (pattern.test(normalized))
      return Object.freeze({
        fieldClass,
        action: "mask",
        reason: "pii-key-pattern",
      });
  }

  for (const [fieldClass, pattern] of NORMALIZED_FINANCIAL_KEY_PATTERNS) {
    if (pattern.test(normalized)) {
      const action: MaskingAction =
        fieldClass === "financial-amount"
          ? "mask"
          : fieldClass === "community"
            ? "mask"
            : "redact";
      return Object.freeze({
        fieldClass,
        action,
        reason: "financial-or-domain-key-pattern",
      });
    }
  }

  return Object.freeze({
    fieldClass: "unknown",
    action: "allow",
    reason: "no-sensitive-pattern",
  });
};

const maskByClass = (
  value: unknown,
  fieldClass: SensitiveFieldClass,
  options: MaskingOptions,
): unknown => {
  if (value === null || value === undefined) return value;
  const asString = stringifyPrimitive(value);

  switch (fieldClass) {
    case "raw-secret":
    case "auth-token":
    case "password":
      return REDACTED;
    case "pii-email":
      return maskEmail(asString);
    case "pii-phone":
      return maskPhone(asString);
    case "pii-name":
      return maskName(asString);
    case "pii-identity":
      return maskResidentRegistrationNumber(asString);
    case "financial-account":
      return options.allowDisplayLast4 === true
        ? maskAccountNumber(asString)
        : REDACTED;
    case "financial-card":
      return options.allowDisplayLast4 === true
        ? maskCardNumber(asString)
        : REDACTED;
    case "financial-amount":
    case "payroll":
    case "expense":
    case "saving":
      return maskKrwAmount(asString, options);
    case "device":
      return maskToken(asString);
    case "network":
      return maskIpAddress(asString);
    case "community":
      return options.allowCommunityTextPreview === true
        ? maskFreeText(asString, {
            ...options,
            maxStringLength: Math.min(options.maxStringLength ?? 160, 160),
          })
        : REDACTED;
    case "ads-partner":
      return REDACTED;
    case "unknown":
      return maskFreeText(asString, options);
  }
};

export const maskHeaderValue = (key: string, value: string): string => {
  const normalized = key.toLowerCase();
  if (
    [
      "authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
      "x-auth-token",
      "proxy-authorization",
    ].includes(normalized)
  )
    return REDACTED;
  if (normalized.includes("forwarded") || normalized === "x-real-ip")
    return maskIpAddress(value);
  return maskFreeText(value);
};

const isReadonlyStringArray = (
  value: string | readonly string[],
): value is readonly string[] => Array.isArray(value);

export const maskHeaders = (
  headers: Readonly<Record<string, string | readonly string[] | undefined>>,
): Record<string, string | readonly string[]> => {
  const output: Record<string, string | readonly string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    output[key] = isReadonlyStringArray(value)
      ? value.map((item) => maskHeaderValue(key, item))
      : maskHeaderValue(key, value);
  }
  return output;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const maskDeepInternal = (
  value: unknown,
  options: Required<
    Pick<
      MaskingOptions,
      | "maxDepth"
      | "maxArrayLength"
      | "maxStringLength"
      | "preserveShape"
      | "allowDisplayLast4"
      | "allowFinancialAmountDisplay"
      | "allowCommunityTextPreview"
      | "dropUndefined"
    >
  > &
    Pick<MaskingOptions, "mode" | "runtime">,
  seen: WeakSet<object>,
  depth: number,
  keyHint?: string,
): unknown => {
  if (depth > options.maxDepth) return TRUNCATED;
  if (value === undefined)
    return options.dropUndefined ? undefined : "undefined";
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    if (keyHint) {
      const classified = classifySensitiveKey(keyHint);
      if (classified.action !== "allow")
        return maskByClass(value, classified.fieldClass, options);
    }
    return value;
  }
  if (typeof value === "bigint")
    return keyHint
      ? maskByClass(value, classifySensitiveKey(keyHint).fieldClass, options)
      : value.toString();
  if (typeof value === "string") {
    if (keyHint) {
      const classified = classifySensitiveKey(keyHint);
      if (classified.action === "drop") return DROPPED;
      if (classified.action === "redact") return REDACTED;
      if (classified.action === "mask")
        return maskByClass(value, classified.fieldClass, options);
    }
    return maskFreeText(value, options);
  }
  if (typeof value === "function" || typeof value === "symbol")
    return `[${typeof value}]`;

  if (value instanceof Error) return maskError(value, options);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return maskUrl(value.toString());
  if (value instanceof RegExp) return value.toString();

  if (typeof value === "object") {
    if (seen.has(value)) return CIRCULAR;
    seen.add(value);

    if (Array.isArray(value)) {
      const visibleItems = value
        .slice(0, options.maxArrayLength)
        .map((item) =>
          maskDeepInternal(item, options, seen, depth + 1, keyHint),
        );
      if (value.length > options.maxArrayLength) visibleItems.push(TRUNCATED);
      seen.delete(value);
      return visibleItems.filter(
        (item) => item !== undefined || !options.dropUndefined,
      );
    }

    if (!isPlainObject(value)) {
      seen.delete(value);
      return maskFreeText(String(value), options);
    }

    const output: Record<string, unknown> = {};
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    for (const [key, nestedValue] of entries) {
      const classified = classifySensitiveKey(key);
      if (classified.action === "drop") {
        if (options.preserveShape) output[key] = DROPPED;
        continue;
      }
      if (classified.action === "redact") {
        output[key] = REDACTED;
        continue;
      }
      const maskedValue =
        classified.action === "mask"
          ? maskByClass(nestedValue, classified.fieldClass, options)
          : maskDeepInternal(nestedValue, options, seen, depth + 1, key);
      if (maskedValue !== undefined || !options.dropUndefined)
        output[key] = maskedValue;
    }
    if (Object.keys(value).length > MAX_OBJECT_KEYS)
      output["__truncatedKeys"] = Object.keys(value).length - MAX_OBJECT_KEYS;
    seen.delete(value);
    return output;
  }

  return MASKED;
};

const normalizeOptions = (
  options: MaskingOptions = {},
): Required<
  Pick<
    MaskingOptions,
    | "maxDepth"
    | "maxArrayLength"
    | "maxStringLength"
    | "preserveShape"
    | "allowDisplayLast4"
    | "allowFinancialAmountDisplay"
    | "allowCommunityTextPreview"
    | "dropUndefined"
  >
> &
  Pick<MaskingOptions, "mode" | "runtime"> => {
  const mode = options.mode ?? "strict";
  return {
    mode,
    ...(options.runtime ? { runtime: options.runtime } : {}),
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxArrayLength: options.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH,
    maxStringLength: options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH,
    preserveShape: options.preserveShape ?? true,
    allowDisplayLast4: options.allowDisplayLast4 ?? mode === "display",
    allowFinancialAmountDisplay:
      options.allowFinancialAmountDisplay ?? mode === "display",
    allowCommunityTextPreview:
      options.allowCommunityTextPreview ?? mode !== "strict",
    dropUndefined: options.dropUndefined ?? true,
  };
};

export const maskDeep = <T = unknown>(
  value: T,
  options: MaskingOptions = {},
): unknown =>
  maskDeepInternal(value, normalizeOptions(options), new WeakSet<object>(), 0);

export const sanitizeLogPayload = (
  value: unknown,
  options: MaskingOptions = {},
): unknown =>
  maskDeep(value, {
    mode: "strict",
    runtime: "server",
    ...options,
    allowFinancialAmountDisplay: false,
    allowCommunityTextPreview: false,
  });

export const sanitizeApiResponse = (
  value: unknown,
  options: MaskingOptions = {},
): unknown => maskDeep(value, { mode: "balanced", ...options });

export const sanitizeDisplayPayload = (
  value: unknown,
  options: MaskingOptions = {},
): unknown =>
  maskDeep(value, {
    mode: "display",
    allowDisplayLast4: true,
    allowFinancialAmountDisplay: true,
    ...options,
  });

export const maskError = (
  error: Error,
  options: MaskingOptions = {},
): Record<string, unknown> => {
  const normalized = normalizeOptions(options);
  return {
    name: error.name,
    message: maskFreeText(error.message, normalized),
    code:
      typeof (error as Error & { readonly code?: unknown }).code === "string"
        ? maskFreeText(
            (error as Error & { readonly code: string }).code,
            normalized,
          )
        : undefined,
    stack:
      normalized.mode === "strict"
        ? REDACTED
        : maskFreeText(error.stack ?? "", {
            ...normalized,
            maxStringLength: Math.min(normalized.maxStringLength, 4_000),
          }),
  };
};

export const assertNoSensitiveLeak = (
  value: unknown,
  label = "payload",
): void => {
  const serialized =
    typeof value === "string"
      ? value
      : JSON.stringify(value, (_key, nestedValue: unknown) =>
          typeof nestedValue === "bigint"
            ? nestedValue.toString()
            : nestedValue,
        );
  if (serialized === undefined) return;
  const leaks = RAW_SECRET_VALUE_PATTERNS.filter((pattern) =>
    pattern.test(serialized),
  );
  if (leaks.length > 0)
    fail(
      "SENSITIVE_LEAK_DETECTED",
      `Sensitive raw value detected in ${label}.`,
    );
};

export const createMaskingPolicySnapshot = (): Readonly<
  Record<string, unknown>
> =>
  Object.freeze({
    contractVersion: SECURITY_MASKING_CONTRACT_VERSION,
    packageScope: SECURITY_MASKING_PACKAGE_SCOPE,
    modes: ["strict", "balanced", "display"] as const,
    sensitiveFieldClasses: SENSITIVE_FIELD_CLASSES,
    secretPatternCount: NORMALIZED_SECRET_KEY_PATTERNS.length,
    piiPatternCount: NORMALIZED_PII_KEY_PATTERNS.length,
    financialPatternCount: NORMALIZED_FINANCIAL_KEY_PATTERNS.length,
    rawSecretValuePatternCount: RAW_SECRET_VALUE_PATTERNS.length,
    rawSecretLoggingAllowed: false,
    rawTokenLoggingAllowed: false,
    rawPiiLoggingAllowed: false,
    rawFinancialDataInAdsOrCommunityAllowed: false,
    clientFinalCalculationAllowed: false,
  });

export const getMaskingCompletenessReport = (): MaskingCompletenessReport => {
  const missing: string[] = [];
  const invariants: readonly [string, boolean][] = [
    ["contract version", SECURITY_MASKING_CONTRACT_VERSION === "2.0.0"],
    ["secret key patterns", NORMALIZED_SECRET_KEY_PATTERNS.length >= 3],
    ["PII key patterns", NORMALIZED_PII_KEY_PATTERNS.length >= 6],
    ["financial key patterns", NORMALIZED_FINANCIAL_KEY_PATTERNS.length >= 8],
    ["raw secret value patterns", RAW_SECRET_VALUE_PATTERNS.length >= 10],
    ["email masking", maskEmail("user@example.com") !== "user@example.com"],
    ["phone masking", maskPhone("010-1234-5678") !== "010-1234-5678"],
    [
      "RRN masking",
      maskResidentRegistrationNumber("900101-1234567") === "900101-1******",
    ],
    ["card masking", maskCardNumber("1234 5678 9012 3456").includes("3456")],
    ["token masking", maskToken("abcdefghijklmnopqrstuvwxyz").includes("…")],
    [
      "free text masking",
      !maskFreeText("user@example.com").includes("user@example.com"),
    ],
    ["deep masking", typeof maskDeep({ password: "secret" }) === "object"],
    ["log sanitizer", typeof sanitizeLogPayload === "function"],
    ["API sanitizer", typeof sanitizeApiResponse === "function"],
    ["display sanitizer", typeof sanitizeDisplayPayload === "function"],
    ["leak assertion", typeof assertNoSensitiveLeak === "function"],
  ];

  for (const [name, ok] of invariants) if (!ok) missing.push(name);
  for (const fieldClass of SENSITIVE_FIELD_CLASSES)
    if (!fieldClass) missing.push("empty sensitive field class");

  return Object.freeze({
    ok: missing.length === 0,
    contractVersion: SECURITY_MASKING_CONTRACT_VERSION,
    packageScope: SECURITY_MASKING_PACKAGE_SCOPE,
    sensitiveFieldClassCount: SENSITIVE_FIELD_CLASSES.length,
    redactionKeyCount:
      NORMALIZED_SECRET_KEY_PATTERNS.length +
      NORMALIZED_PII_KEY_PATTERNS.length +
      NORMALIZED_FINANCIAL_KEY_PATTERNS.length,
    invariantCount: invariants.length,
    missing,
  });
};

export const assertMaskingModuleCompleteness = (): void => {
  const report = getMaskingCompletenessReport();
  if (!report.ok)
    fail(
      "MASKING_MODULE_INCOMPLETE",
      `Masking module is incomplete: ${report.missing.join(", ")}`,
    );
};

export const runMaskingSelfTest = (): MaskingCompletenessReport => {
  const sample = {
    email: "user@example.com",
    phone: "010-1234-5678",
    password: "super-secret",
    authorization: "Bearer abcdefghijklmnopqrstuvwxyz0123456789",
    salaryAmount: 2_700_000,
    accountNumber: "123-456-789012",
    communityBody: "이메일 user@example.com 포함",
  };
  const masked = sanitizeLogPayload(sample) as Record<string, unknown>;
  assertNoSensitiveLeak(masked, "masking self-test output");
  if (masked["password"] !== REDACTED)
    fail("SELF_TEST_PASSWORD_MASK_FAILED", "Masking self-test failed.");
  if (String(masked["email"]).includes("user@example.com"))
    fail("SELF_TEST_EMAIL_MASK_FAILED", "Masking self-test failed.");
  const report = getMaskingCompletenessReport();
  if (!report.ok)
    fail(
      "SELF_TEST_COMPLETENESS_FAILED",
      "Masking completeness self-test failed.",
    );
  return report;
};

assertMaskingModuleCompleteness();

export const maskingSecurityContract = Object.freeze({
  contractVersion: SECURITY_MASKING_CONTRACT_VERSION,
  packageScope: SECURITY_MASKING_PACKAGE_SCOPE,
  redactedPlaceholder: REDACTED,
  maskedPlaceholder: MASKED,
  sensitiveFieldClasses: SENSITIVE_FIELD_CLASSES,
  policySnapshot: createMaskingPolicySnapshot(),
  rawSecretLoggingAllowed: false,
  rawTokenLoggingAllowed: false,
  rawPiiLoggingAllowed: false,
  rawFinancialDataInAdsOrCommunityAllowed: false,
  clientFinalCalculationAllowed: false,
  functions: Object.freeze({
    maskEmail: true,
    maskPhone: true,
    maskName: true,
    maskResidentRegistrationNumber: true,
    maskAccountNumber: true,
    maskCardNumber: true,
    maskKrwAmount: true,
    maskIpAddress: true,
    maskToken: true,
    maskJwt: true,
    maskBearerToken: true,
    maskUrl: true,
    maskFreeText: true,
    maskHeaders: true,
    maskDeep: true,
    sanitizeLogPayload: true,
    sanitizeApiResponse: true,
    sanitizeDisplayPayload: true,
    assertNoSensitiveLeak: true,
  }),
});

export default maskingSecurityContract;
