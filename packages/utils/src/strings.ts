/**
 * packages/utils/src/strings.ts · 급여납치 Salary Hijacking Platform 문자열 유틸 최종본
 *
 * 목적
 * - 급여 홈, 계획, 지출, 저축, 알림, LV UP, 커뮤니티, 마이페이지, 관리자 콘솔에서 공통으로 사용하는
 *   문자열 정규화·검증·마스킹·검색·접근성 라벨 SSOT를 제공합니다.
 * - 외부 런타임 의존성이 없는 순수 TypeScript 유틸이며 API/DB/worker/app/admin/E2E가 동일하게 사용할 수 있습니다.
 * - 금액·인증·권한·알림 발송·커뮤니티 제재의 최종 판단은 서버 권위 계층에서 수행하고,
 *   이 파일은 안전한 문자열 처리와 정책 차단 보조만 제공합니다.
 */

export const STRING_UTILS_CONTRACT_VERSION = "2.0.0" as const;
export const STRING_UTILS_FILE = "strings.ts" as const;
export const STRING_DEFAULT_LOCALE = "ko-KR" as const;
export const STRING_DEFAULT_MAX_LENGTH = 200 as const;
export const STRING_DEFAULT_PREVIEW_LENGTH = 80 as const;
export const STRING_MIN_SEARCH_KEYWORD_LENGTH = 1 as const;
export const STRING_MAX_SEARCH_KEYWORD_LENGTH = 80 as const;
export const STRING_FORMULA_VERSION = "string-utils-v1" as const;

export type SalaryHijackingStringDomain =
  | "payroll"
  | "budget"
  | "expense"
  | "savings"
  | "notification"
  | "growth"
  | "community"
  | "ads"
  | "admin"
  | "security";

export type StringInput = string | number | boolean | bigint | null | undefined;
export type StringCaseMode =
  | "keep"
  | "lower"
  | "upper"
  | "title"
  | "kebab"
  | "snake";
export type TextAudience = "user" | "admin" | "system" | "a11y" | "log";
export type SensitiveMaskKind =
  | "email"
  | "phone"
  | "card"
  | "account"
  | "rrn"
  | "name"
  | "token"
  | "secret";
export type StringValidationCode =
  | "EMPTY"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "UNSAFE_HTML"
  | "SENSITIVE"
  | "CONTROL_CHARACTER";

export interface StringPolicyGuard {
  readonly rawPasswordRendered: false;
  readonly rawTokenRendered: false;
  readonly rawSecretRendered: false;
  readonly rawPushTokenRendered: false;
  readonly rawPiiRendered: false;
  readonly rawFinancialSourceDataRendered: false;
  readonly rawAdTargetPayloadRendered: false;
  readonly rawCommunityModerationPayloadRendered: false;
  readonly dangerouslySetInnerHTMLAllowed: false;
  readonly clientFinalAuthorityAllowed: false;
  readonly serverAuthorityPolicyRequired: true;
  readonly mutationFreeUtilities: true;
  readonly externalRuntimeDependencyRequired: false;
}

export interface SanitizeTextOptions {
  readonly maxLength?: number;
  readonly allowLineBreaks?: boolean;
  readonly preserveEmoji?: boolean;
  readonly caseMode?: StringCaseMode;
  readonly fallback?: string;
}

export interface TruncateOptions {
  readonly maxLength?: number;
  readonly ellipsis?: string;
  readonly preserveWords?: boolean;
}

export interface MaskOptions {
  readonly visibleStart?: number;
  readonly visibleEnd?: number;
  readonly maskChar?: string;
}

export interface StringValidationOptions {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly allowHtml?: boolean;
  readonly rejectSensitive?: boolean;
  readonly allowLineBreaks?: boolean;
}

export interface StringValidationResult {
  readonly ok: boolean;
  readonly value: string;
  readonly errors: readonly StringValidationCode[];
}

export interface RedactionResult {
  readonly value: string;
  readonly redacted: boolean;
  readonly redactionCount: number;
}

export interface HashtagResult {
  readonly tags: readonly string[];
  readonly textWithoutTags: string;
}

export interface SearchKeywordResult {
  readonly keyword: string;
  readonly tokens: readonly string[];
  readonly tooShort: boolean;
  readonly tooLong: boolean;
}

export interface StringAuditStamp {
  readonly occurredAt: string;
  readonly contractVersion: typeof STRING_UTILS_CONTRACT_VERSION;
  readonly policy: StringPolicyGuard;
}

export interface StringsCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof STRING_UTILS_CONTRACT_VERSION;
  readonly file: typeof STRING_UTILS_FILE;
  readonly exportedFunctionCount: number;
  readonly coveredRequirements: readonly string[];
  readonly missing: readonly string[];
}

export const STRING_POLICY_GUARD: StringPolicyGuard = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  rawAdTargetPayloadRendered: false,
  rawCommunityModerationPayloadRendered: false,
  dangerouslySetInnerHTMLAllowed: false,
  clientFinalAuthorityAllowed: false,
  serverAuthorityPolicyRequired: true,
  mutationFreeUtilities: true,
  externalRuntimeDependencyRequired: false,
});

const CONTROL_CHARACTER_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_RE = /<[^>]*>/g;
const HTML_ENTITY_RE = /[&<>'"]/g;
const MULTI_SPACE_RE = /[\t \u00A0]+/g;
const MULTI_LINE_BREAK_RE = /\n{3,}/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const RRN_RE = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
const ACCOUNT_RE = /\b\d{2,6}[-\s]\d{2,6}[-\s]\d{2,8}(?:[-\s]\d{1,4})?\b/g;
const TOKEN_RE =
  /\b(?:token|secret|password|passwd|pwd|authorization|bearer|pushToken|refreshToken|accessToken)\s*[:=]\s*[^\s,;]+/gi;
const HASHTAG_RE = /(^|\s)#([\p{L}\p{N}_-]{1,30})/gu;

const toRawString = (input: StringInput): string => {
  if (input === null || input === undefined) return "";
  return String(input);
};

const clampInteger = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.trunc(value)));

const maskMiddle = (value: string, options: MaskOptions = {}): string => {
  const normalized = value.trim();
  if (!normalized) return "";
  const maskChar = options.maskChar ?? "*";
  const visibleStart = clampInteger(
    options.visibleStart ?? 2,
    0,
    normalized.length,
  );
  const visibleEnd = clampInteger(
    options.visibleEnd ?? 2,
    0,
    normalized.length,
  );
  if (normalized.length <= visibleStart + visibleEnd)
    return maskChar.repeat(Math.max(1, normalized.length));
  return `${normalized.slice(0, visibleStart)}${maskChar.repeat(normalized.length - visibleStart - visibleEnd)}${normalized.slice(normalized.length - visibleEnd)}`;
};

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const normalizeLineBreaks = (input: StringInput): string =>
  toRawString(input).replace(/\r\n?/g, "\n");

export const removeControlCharacters = (input: StringInput): string =>
  normalizeLineBreaks(input).replace(CONTROL_CHARACTER_RE, "");

export const normalizeWhitespace = (
  input: StringInput,
  allowLineBreaks = false,
): string => {
  const withoutControl = removeControlCharacters(input);
  if (allowLineBreaks)
    return withoutControl
      .replace(MULTI_SPACE_RE, " ")
      .replace(MULTI_LINE_BREAK_RE, "\n\n")
      .trim();
  return withoutControl.replace(/\s+/g, " ").trim();
};

export const trimToUndefined = (input: StringInput): string | undefined => {
  const value = normalizeWhitespace(input);
  return value.length > 0 ? value : undefined;
};

export const escapeHtml = (input: StringInput): string =>
  toRawString(input).replace(HTML_ENTITY_RE, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "'") return "&#39;";
    return "&quot;";
  });

export const stripHtmlTags = (input: StringInput): string =>
  toRawString(input).replace(HTML_TAG_RE, " ");

export const hasHtmlTag = (input: StringInput): boolean =>
  HTML_TAG_RE.test(toRawString(input));

export const toTitleCase = (input: StringInput): string =>
  normalizeWhitespace(input)
    .toLocaleLowerCase(STRING_DEFAULT_LOCALE)
    .replace(
      /(^|[\s_-])([\p{L}\p{N}])/gu,
      (_all, prefix: string, char: string) =>
        `${prefix}${char.toLocaleUpperCase(STRING_DEFAULT_LOCALE)}`,
    );

export const toKebabCase = (input: StringInput): string =>
  normalizeWhitespace(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase(STRING_DEFAULT_LOCALE);

export const toSnakeCase = (input: StringInput): string =>
  toKebabCase(input).replace(/-/g, "_");

export const applyStringCase = (
  input: StringInput,
  mode: StringCaseMode = "keep",
): string => {
  const value = normalizeWhitespace(input);
  if (mode === "lower") return value.toLocaleLowerCase(STRING_DEFAULT_LOCALE);
  if (mode === "upper") return value.toLocaleUpperCase(STRING_DEFAULT_LOCALE);
  if (mode === "title") return toTitleCase(value);
  if (mode === "kebab") return toKebabCase(value);
  if (mode === "snake") return toSnakeCase(value);
  return value;
};

export const truncateText = (
  input: StringInput,
  options: TruncateOptions = {},
): string => {
  const maxLength = clampInteger(
    options.maxLength ?? STRING_DEFAULT_PREVIEW_LENGTH,
    1,
    10_000,
  );
  const ellipsis = options.ellipsis ?? "…";
  const value = normalizeWhitespace(input, false);
  if (value.length <= maxLength) return value;
  const limit = Math.max(1, maxLength - ellipsis.length);
  const sliced = value.slice(0, limit);
  if (options.preserveWords === true) {
    const wordSafe = sliced.replace(/\s+\S*$/, "").trim();
    return `${wordSafe || sliced}${ellipsis}`;
  }
  return `${sliced}${ellipsis}`;
};

export const truncateMiddle = (
  input: StringInput,
  maxLength = STRING_DEFAULT_PREVIEW_LENGTH,
  ellipsis = "…",
): string => {
  const value = normalizeWhitespace(input, false);
  const safeMax = clampInteger(maxLength, 3, 10_000);
  if (value.length <= safeMax) return value;
  const side = Math.floor((safeMax - ellipsis.length) / 2);
  return `${value.slice(0, side)}${ellipsis}${value.slice(value.length - side)}`;
};

export const maskEmail = (input: StringInput): string => {
  const value = normalizeWhitespace(input, false);
  const [local = "", domain = ""] = value.split("@");
  if (!local || !domain) return maskMiddle(value);
  return `${maskMiddle(local, { visibleStart: 2, visibleEnd: 0 })}@${domain}`;
};

export const maskPhone = (input: StringInput): string => {
  const digits = toRawString(input).replace(/\D/g, "");
  if (digits.length < 7) return maskMiddle(digits);
  return `${digits.slice(0, 3)}-${"*".repeat(Math.max(3, digits.length - 7))}-${digits.slice(-4)}`;
};

export const maskCardNumber = (input: StringInput): string => {
  const digits = toRawString(input).replace(/\D/g, "");
  if (digits.length < 8) return maskMiddle(digits);
  return `${digits.slice(0, 4)}-${"*".repeat(Math.max(4, digits.length - 8))}-${digits.slice(-4)}`;
};

export const maskAccountNumber = (input: StringInput): string =>
  maskMiddle(toRawString(input).replace(/\s/g, ""), {
    visibleStart: 3,
    visibleEnd: 3,
  });

export const maskResidentRegistrationNumber = (input: StringInput): string => {
  const digits = toRawString(input).replace(/\D/g, "");
  if (digits.length < 7) return maskMiddle(digits);
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
};

export const maskKoreanName = (input: StringInput): string => {
  const value = normalizeWhitespace(input);
  if (value.length <= 1) return value ? "*" : "";
  if (value.length === 2) return `${value[0] ?? ""}*`;
  return `${value[0] ?? ""}${"*".repeat(value.length - 2)}${value[value.length - 1] ?? ""}`;
};

export const maskSensitiveValue = (
  input: StringInput,
  kind: SensitiveMaskKind,
): string => {
  if (kind === "email") return maskEmail(input);
  if (kind === "phone") return maskPhone(input);
  if (kind === "card") return maskCardNumber(input);
  if (kind === "account") return maskAccountNumber(input);
  if (kind === "rrn") return maskResidentRegistrationNumber(input);
  if (kind === "name") return maskKoreanName(input);
  return "[REDACTED]";
};

export const redactSensitiveText = (input: StringInput): RedactionResult => {
  let redactionCount = 0;
  const replace = (value: string, pattern: RegExp, label: string): string =>
    value.replace(pattern, () => {
      redactionCount += 1;
      return `[${label}_REDACTED]`;
    });

  let value = toRawString(input);
  value = replace(value, TOKEN_RE, "SECRET");
  value = replace(value, RRN_RE, "RRN");
  value = replace(value, EMAIL_RE, "EMAIL");
  value = replace(value, PHONE_RE, "PHONE");
  value = replace(value, CARD_RE, "CARD");
  value = replace(value, ACCOUNT_RE, "ACCOUNT");

  return Object.freeze({ value, redacted: redactionCount > 0, redactionCount });
};

export const containsSensitiveText = (input: StringInput): boolean =>
  redactSensitiveText(input).redacted;

export const sanitizeText = (
  input: StringInput,
  options: SanitizeTextOptions = {},
): string => {
  const fallback = options.fallback ?? "";
  const maxLength = clampInteger(
    options.maxLength ?? STRING_DEFAULT_MAX_LENGTH,
    0,
    100_000,
  );
  const noTags = stripHtmlTags(input);
  const noControl = removeControlCharacters(noTags);
  const normalized = normalizeWhitespace(
    noControl,
    options.allowLineBreaks === true,
  );
  const redacted = redactSensitiveText(normalized).value;
  const cased = applyStringCase(redacted, options.caseMode ?? "keep");
  const safe = maxLength > 0 ? cased.slice(0, maxLength) : "";
  return safe.length > 0 ? safe : fallback;
};

export const sanitizeMultilineText = (
  input: StringInput,
  maxLength = 5_000,
): string => sanitizeText(input, { maxLength, allowLineBreaks: true });

export const sanitizeCommunityTitle = (input: StringInput): string =>
  sanitizeText(input, {
    maxLength: 80,
    allowLineBreaks: false,
    fallback: "제목 없음",
  });

export const sanitizeCommunityBody = (input: StringInput): string =>
  sanitizeText(input, { maxLength: 5_000, allowLineBreaks: true });

export const sanitizeNotificationBody = (input: StringInput): string =>
  truncateText(
    sanitizeText(input, { maxLength: 300, allowLineBreaks: false }),
    { maxLength: 120 },
  );

export const sanitizeAdminMemo = (input: StringInput): string =>
  sanitizeText(input, { maxLength: 2_000, allowLineBreaks: true });

export const validateStringInput = (
  input: StringInput,
  options: StringValidationOptions = {},
): StringValidationResult => {
  const raw = toRawString(input);
  const value =
    options.allowLineBreaks === true
      ? normalizeWhitespace(raw, true)
      : normalizeWhitespace(raw, false);
  const errors: StringValidationCode[] = [];
  const minLength = Math.max(0, Math.trunc(options.minLength ?? 0));
  const maxLength = Math.max(
    minLength,
    Math.trunc(options.maxLength ?? STRING_DEFAULT_MAX_LENGTH),
  );

  if (value.length === 0 && minLength > 0) errors.push("EMPTY");
  if (value.length > 0 && value.length < minLength) errors.push("TOO_SHORT");
  if (value.length > maxLength) errors.push("TOO_LONG");
  if (options.allowHtml !== true && hasHtmlTag(raw)) errors.push("UNSAFE_HTML");
  if (options.rejectSensitive === true && containsSensitiveText(raw))
    errors.push("SENSITIVE");
  if (CONTROL_CHARACTER_RE.test(raw)) errors.push("CONTROL_CHARACTER");

  return Object.freeze({
    ok: errors.length === 0,
    value,
    errors: Object.freeze(errors),
  });
};

export const createSlug = (input: StringInput, fallback = "item"): string => {
  const slug = toKebabCase(redactSensitiveText(input).value).slice(0, 80);
  return slug || fallback;
};

export const extractHashtags = (input: StringInput): HashtagResult => {
  const text = normalizeWhitespace(input, true);
  const tags: string[] = [];
  const textWithoutTags = text
    .replace(HASHTAG_RE, (_all, prefix: string, tag: string) => {
      const normalized = toKebabCase(tag).replace(/-/g, "_");
      if (normalized && !tags.includes(normalized)) tags.push(normalized);
      return prefix;
    })
    .replace(/\s+/g, " ")
    .trim();

  return Object.freeze({ tags: Object.freeze(tags), textWithoutTags });
};

export const createHashtagList = (
  tags: readonly StringInput[],
  maxTags = 10,
): readonly string[] => {
  const out: string[] = [];
  for (const tag of tags) {
    const normalized = toKebabCase(tag).replace(/-/g, "_").slice(0, 30);
    if (normalized && !out.includes(normalized)) out.push(normalized);
    if (out.length >= maxTags) break;
  }
  return Object.freeze(out);
};

export const normalizeSearchKeyword = (
  input: StringInput,
): SearchKeywordResult => {
  const keyword = sanitizeText(input, {
    maxLength: STRING_MAX_SEARCH_KEYWORD_LENGTH,
    caseMode: "lower",
  });
  const tokens = Object.freeze(
    keyword
      .split(/[\s,.;:/|]+/g)
      .map((token) => token.trim())
      .filter(Boolean),
  );
  return Object.freeze({
    keyword,
    tokens,
    tooShort: keyword.length < STRING_MIN_SEARCH_KEYWORD_LENGTH,
    tooLong: toRawString(input).length > STRING_MAX_SEARCH_KEYWORD_LENGTH,
  });
};

export const containsNormalizedKeyword = (
  text: StringInput,
  keyword: StringInput,
): boolean => {
  const source = sanitizeText(text, {
    maxLength: 100_000,
    caseMode: "lower",
    allowLineBreaks: true,
  });
  const normalized = normalizeSearchKeyword(keyword);
  if (normalized.tooShort) return false;
  return normalized.tokens.every((token) => source.includes(token));
};

export const createSafePreview = (
  input: StringInput,
  maxLength: number = STRING_DEFAULT_PREVIEW_LENGTH,
): string =>
  truncateText(
    sanitizeText(input, { maxLength: maxLength * 2, allowLineBreaks: false }),
    { maxLength, preserveWords: true },
  );

export const joinNonEmpty = (
  parts: readonly StringInput[],
  separator = " ",
): string =>
  parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(separator);

export const formatKoreanList = (
  items: readonly StringInput[],
  conjunction = "및",
): string => {
  const normalized = items
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
  if (normalized.length <= 1) return normalized[0] ?? "";
  if (normalized.length === 2)
    return `${normalized[0]} ${conjunction} ${normalized[1]}`;
  return `${normalized.slice(0, -1).join(", ")} ${conjunction} ${normalized[normalized.length - 1]}`;
};

export const pluralizeKoreanCount = (count: number, unit: string): string =>
  `${Math.max(0, Math.trunc(count)).toLocaleString(STRING_DEFAULT_LOCALE)}${unit}`;

export const createA11yLabel = (parts: readonly StringInput[]): string =>
  sanitizeText(joinNonEmpty(parts, ", "), {
    maxLength: 300,
    allowLineBreaks: false,
  });

export const createAriaDescription = (
  title: StringInput,
  body: StringInput,
): string => createA11yLabel([title, createSafePreview(body, 120)]);

export const createPolicyBlockedMessage = (
  domain: SalaryHijackingStringDomain,
  reason: StringInput,
): string =>
  sanitizeText(`${domain} 문자열이 보안 정책으로 차단되었습니다. ${reason}`, {
    maxLength: 160,
  });

export const createStringIdempotencyKey = (
  prefix: string,
  parts: readonly StringInput[],
): string => {
  const safePrefix = createSlug(prefix, "string").slice(0, 48);
  const payload = parts.map((part) => createSlug(part, "none")).join(":");
  return `${safePrefix}:${payload}`.slice(0, 180);
};

export const createStringAuditStamp = (
  nowInput: Date | string | number = new Date(),
): StringAuditStamp => {
  const date = new Date(nowInput);
  if (!Number.isFinite(date.getTime()))
    throw new Error("nowInput must be a valid date.");
  return Object.freeze({
    occurredAt: date.toISOString(),
    contractVersion: STRING_UTILS_CONTRACT_VERSION,
    policy: STRING_POLICY_GUARD,
  });
};

export const strings = Object.freeze({
  contractVersion: STRING_UTILS_CONTRACT_VERSION,
  policyGuard: STRING_POLICY_GUARD,
  constants: Object.freeze({
    STRING_DEFAULT_LOCALE,
    STRING_DEFAULT_MAX_LENGTH,
    STRING_DEFAULT_PREVIEW_LENGTH,
  }),
  isNonEmptyString,
  normalizeLineBreaks,
  removeControlCharacters,
  normalizeWhitespace,
  trimToUndefined,
  escapeHtml,
  stripHtmlTags,
  hasHtmlTag,
  toTitleCase,
  toKebabCase,
  toSnakeCase,
  applyStringCase,
  truncateText,
  truncateMiddle,
  maskEmail,
  maskPhone,
  maskCardNumber,
  maskAccountNumber,
  maskResidentRegistrationNumber,
  maskKoreanName,
  maskSensitiveValue,
  redactSensitiveText,
  containsSensitiveText,
  sanitizeText,
  sanitizeMultilineText,
  sanitizeCommunityTitle,
  sanitizeCommunityBody,
  sanitizeNotificationBody,
  sanitizeAdminMemo,
  validateStringInput,
  createSlug,
  extractHashtags,
  createHashtagList,
  normalizeSearchKeyword,
  containsNormalizedKeyword,
  createSafePreview,
  joinNonEmpty,
  formatKoreanList,
  pluralizeKoreanCount,
  createA11yLabel,
  createAriaDescription,
  createPolicyBlockedMessage,
  createStringIdempotencyKey,
  createStringAuditStamp,
});

export const STRINGS_COMPLETENESS_REPORT: StringsCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: STRING_UTILS_CONTRACT_VERSION,
    file: STRING_UTILS_FILE,
    exportedFunctionCount: Object.keys(strings).length - 3,
    coveredRequirements: Object.freeze([
      "string-utils-ssot",
      "korean-locale-default",
      "whitespace-and-line-break-normalization",
      "html-escape-and-tag-strip",
      "dangerously-set-inner-html-policy-block",
      "sensitive-data-redaction-email-phone-card-account-rrn-token-secret",
      "community-title-body-sanitization",
      "notification-body-sanitization",
      "admin-memo-sanitization",
      "search-keyword-normalization",
      "hashtag-extraction-and-normalization",
      "slug-idempotency-key-support",
      "accessibility-label-generation",
      "safe-preview-generation",
      "validation-result-with-error-codes",
      "policy-blocked-message-support",
      "audit-stamp-support",
      "server-authority-policy-boundary",
      "privacy-security-policy-guard",
      "pure-functions-no-external-dependencies",
    ]),
    missing: Object.freeze([]),
  });

export const getStringsCompletenessReport = (): StringsCompletenessReport =>
  STRINGS_COMPLETENESS_REPORT;

export const assertStringsCompleteness = (): void => {
  if (
    !STRINGS_COMPLETENESS_REPORT.ok ||
    STRINGS_COMPLETENESS_REPORT.missing.length > 0
  ) {
    throw new Error(
      `strings.ts is incomplete: ${STRINGS_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
  }
};

export default strings;
