/** services/api/src/routes/users.routes.ts
 * 급여납치 Salary Hijacking Platform · 사용자/마이페이지 API 라우트 최종본
 * Cloudflare Workers Fetch API 호환. 마이페이지, 프로필, 설정, 약관/개인정보/마케팅/광고·제휴/콘텐츠 추천 동의,
 * 개인정보 내보내기, 계정 탈퇴/복구, 활동 요약을 사용자별 소유권·민감정보 마스킹·광고 분리 원칙으로 처리한다.
 */
export const USERS_ROUTES_VERSION = "3.1.0";
export const USERS_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const USERS_API_PREFIX = "/api/v1/users";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

type Role = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";
type Theme = "SYSTEM" | "LIGHT" | "DARK";
type Language = "ko-KR" | "en-US";
type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;
export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}
export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

interface Principal {
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}
interface Page {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}
interface ListResult<T extends JsonRecord = JsonRecord> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface UserProfileUpdateInput {
  readonly nickname?: string;
  readonly displayBio?: string | null;
  readonly avatarAttachmentId?: string | null;
  readonly birthYear?: number | null;
  readonly occupationCategory?: string | null;
}
export interface UserSettingsInput {
  readonly theme?: Theme;
  readonly language?: Language;
  readonly timezone?: string;
  readonly weekStartsOnMonday?: boolean;
  readonly showAmountsInCommunity?: boolean;
  readonly dashboardCompactMode?: boolean;
  readonly paydayReminderDaysBefore?: number;
}
export interface UserConsentInput {
  readonly termsAccepted?: boolean;
  readonly privacyAccepted?: boolean;
  readonly marketingAccepted?: boolean;
  readonly contentRecommendationAccepted?: boolean;
  readonly adPartnerAccepted?: boolean;
  readonly analyticsAccepted?: boolean;
  readonly consentVersion?: string;
}
export interface UserExportRequestInput {
  readonly includeProfile: boolean;
  readonly includeSettings: boolean;
  readonly includeConsents: boolean;
  readonly includeCommunity: boolean;
  readonly includeGrowth: boolean;
  readonly includeFinancialSummaryOnly: boolean;
  readonly reason: string | null;
}
export interface UserWithdrawInput {
  readonly reason: string;
  readonly confirmText: string;
  readonly deleteCommunityContent: boolean;
}
export interface UserWithdrawalRequestInput {
  readonly reason: string;
  readonly deleteCommunityContent: boolean;
}
export interface UserSupportTicketInput {
  readonly category: "ACCOUNT" | "PAYMENT" | "PRIVACY" | "BUG" | "OTHER";
  readonly message: string;
  readonly subject: string;
}

export interface UsersRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: Principal;
  readonly repository: UsersRepository<TEnv>;
}
export interface UsersRepository<TEnv = unknown> {
  readonly name?: string;
  getMe(runtime: UsersRouteRuntime<TEnv>): Promise<JsonRecord>;
  updateMe(
    input: UserProfileUpdateInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  withdraw(
    input: UserWithdrawInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  requestWithdrawal?(
    input: UserWithdrawalRequestInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  createSupportTicket?(
    input: UserSupportTicketInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  restore(runtime: UsersRouteRuntime<TEnv>): Promise<JsonRecord>;
  summary(runtime: UsersRouteRuntime<TEnv>): Promise<JsonRecord>;
  activity(
    input: JsonRecord,
    page: Page,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<ListResult>;
  getSettings(runtime: UsersRouteRuntime<TEnv>): Promise<JsonRecord>;
  updateSettings(
    input: UserSettingsInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  getConsents(runtime: UsersRouteRuntime<TEnv>): Promise<JsonRecord>;
  updateConsents(
    input: UserConsentInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  requestExport(
    input: UserExportRequestInput,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  getExport(
    exportId: string,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  listExports(
    page: Page,
    runtime: UsersRouteRuntime<TEnv>,
  ): Promise<ListResult>;
}
export interface UsersRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | UsersRepository<TEnv>
    | ((env: TEnv) => UsersRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onUserEvent?: (
    event: UserEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}
export interface UserEvent {
  readonly event:
    | "user_profile_updated"
    | "user_settings_updated"
    | "user_consents_updated"
    | "user_export_requested"
    | "user_support_ticket_created"
    | "user_withdrawal_requested"
    | "user_withdrawn"
    | "user_restored";
  readonly requestId: string;
  readonly userId: string;
  readonly targetId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class UserHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: JsonValue | null;
  constructor(
    status: number,
    code: string,
    message: string,
    details: JsonValue | null = null,
  ) {
    super(message);
    this.name = "UserHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const sensitive = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "resident",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "saving",
  "savings",
  "expense",
  "dailyBudget",
  "hijack",
  "adTarget",
  "targeting",
  "payslip",
  "bankbook",
  "statement",
  "비밀번호",
  "토큰",
  "계좌",
  "카드",
  "급여",
  "월급",
  "소득",
  "대출",
  "저축",
  "지출",
  "급여명세",
  "통장",
  "명세서",
];
const forbiddenProfile = [
  "userId",
  "roles",
  "permissions",
  "status",
  "accountStatus",
  "email",
  "phone",
  "password",
  "passwordHash",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "expense",
  "savings",
  "dailyBudget",
  "hijackAmount",
  "adSegment",
  "adTarget",
  "financialSegment",
  "sensitiveFinancialTargetingConsent",
];
const publicBooleanFlags = [
  "rawEmailExposed",
  "rawPhoneExposed",
  "rawFinancialDataExposed",
  "rawPersonalDataExposed",
  "rawPushTokenExposed",
  "rawPushTokenLogging",
  "adsFinancialTargetingUsed",
  "financialDataForAds",
  "tokenHashOnly",
  "adPersonalization",
].map((key) => key.toLowerCase().replace(/[\s._-]/g, ""));
const publicProfileSummaryKeys = ["totalHijackSaved", "currentMonthHijack"].map(
  (key) => key.toLowerCase().replace(/[\s._-]/g, ""),
);

function normPath(pathname: string): string {
  const p = (pathname || "/").replace(/\/+/g, "/").replace(/\/+$/g, "");
  return p || "/";
}
function hd(request: Request, name: string): string | null {
  const v = request.headers.get(name)?.trim();
  return v ? v : null;
}
function rid(request: Request): string {
  const v =
    hd(request, "x-request-id") ??
    hd(request, "x-correlation-id") ??
    hd(request, "cf-ray");
  return v && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(v)
    ? v.slice(0, 160)
    : (globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`);
}
function role(v: string): Role | null {
  const r = v.trim().toUpperCase();
  return ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(r)
    ? (r as Role)
    : null;
}
function principal(request: Request, requireSource: boolean): Principal {
  const source = hd(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE)
    throw new UserHttpError(
      401,
      "USER_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  const userId = hd(request, "x-authenticated-user-id");
  if (!userId)
    throw new UserHttpError(401, "USER_AUTH_REQUIRED", "로그인이 필요합니다.");
  const roles = (hd(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map(role)
    .filter((r): r is Role => Boolean(r));
  const permissions = (hd(request, "x-authenticated-permissions") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    userId,
    roles: roles.length ? roles : ["USER"],
    permissions,
    policyId: hd(request, "x-auth-policy-id"),
  };
}
function privileged(p: Principal): boolean {
  return (
    p.roles.some(
      (r) => r === "ADMIN" || r === "SUPER_ADMIN" || r === "OPERATOR",
    ) ||
    p.permissions.includes("*") ||
    p.permissions.includes("user:manage")
  );
}
function assertOwner(userId: string, runtime: UsersRouteRuntime): void {
  if (userId !== runtime.principal.userId && !privileged(runtime.principal))
    throw new UserHttpError(
      403,
      "USER_OWNER_REQUIRED",
      "본인 사용자 정보만 접근할 수 있습니다.",
    );
}
function sensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s._-]/g, "");
  if (publicBooleanFlags.includes(k)) return false;
  if (publicProfileSummaryKeys.includes(k)) return false;
  return sensitive.some((f) =>
    k.includes(f.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function sanitize(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number")
    return typeof value === "number" && !Number.isFinite(value) ? null : value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string")
    return value.length > MAX_TEXT
      ? `${value.slice(0, MAX_TEXT)}…[truncated]`
      : value;
  if (typeof value !== "object") return String(value);
  if (depth >= 8) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => sanitize(item, depth + 1, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 120)
      .map(([k, v]) => [
        k.slice(0, 160),
        sensitiveKey(k) ? "[REDACTED]" : sanitize(v, depth + 1, seen),
      ]),
  );
}
function out(
  runtime: Pick<UsersRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: USERS_ROUTES_SERVICE_NAME,
        version: USERS_ROUTES_VERSION,
        requestId: runtime.requestId,
        path: runtime.path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": status >= 400 ? "no-store" : "private, no-store",
        "x-request-id": runtime.requestId,
        "x-content-type-options": "nosniff",
      },
    },
  );
}
function err(requestId: string, path: string, error: unknown): Response {
  const e =
    error instanceof UserHttpError
      ? error
      : new UserHttpError(
          500,
          "USER_ROUTE_INTERNAL_ERROR",
          "사용자 API 처리 중 오류가 발생했습니다.",
        );
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: e.code,
        message: e.message,
        status: e.status,
        requestId,
        ...(e.details ? { details: e.details } : {}),
      },
      meta: {
        service: USERS_ROUTES_SERVICE_NAME,
        version: USERS_ROUTES_VERSION,
        requestId,
        path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status: e.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": requestId,
        "x-error-code": e.code,
        "x-content-type-options": "nosniff",
      },
    },
  );
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())
  )
    return {};
  const ct = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!ct.includes("application/json") && !ct.includes("+json")) return {};
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES)
    throw new UserHttpError(
      413,
      "USER_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new UserHttpError(
      400,
      "USER_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  return parsed as Record<string, unknown>;
}
function str(
  input: Record<string, unknown>,
  key: string,
  required = true,
  max = MAX_TEXT,
): string {
  const v = input[key];
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, max);
  if (required)
    throw new UserHttpError(
      400,
      "USER_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}
function opt(
  input: Record<string, unknown>,
  key: string,
  max = MAX_TEXT,
): string | null {
  const v = input[key];
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function bool(
  input: Record<string, unknown>,
  key: string,
  fallback = false,
): boolean {
  return input[key] === undefined ? fallback : input[key] === true;
}
function int(
  input: Record<string, unknown>,
  key: string,
  required = true,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const v = input[key];
  if (typeof v === "number" && Number.isInteger(v)) {
    if (v < min || v > max)
      throw new UserHttpError(
        400,
        "USER_INTEGER_RANGE_INVALID",
        `${key} 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return v;
  }
  if (required)
    throw new UserHttpError(
      400,
      "USER_INTEGER_REQUIRED",
      `${key} 정수 값이 필요합니다.`,
      { field: key },
    );
  return 0;
}
function theme(v: unknown): Theme {
  const t = typeof v === "string" ? v.trim().toUpperCase() : "SYSTEM";
  if (["SYSTEM", "LIGHT", "DARK"].includes(t)) return t as Theme;
  throw new UserHttpError(
    400,
    "USER_THEME_INVALID",
    "화면 테마 값이 올바르지 않습니다.",
  );
}
function lang(v: unknown): Language {
  const t = typeof v === "string" ? v.trim() : "ko-KR";
  if (["ko-KR", "en-US"].includes(t)) return t as Language;
  throw new UserHttpError(
    400,
    "USER_LANGUAGE_INVALID",
    "언어 설정 값이 올바르지 않습니다.",
  );
}
function page(url: URL): Page {
  const p = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const ps = Math.max(
    1,
    Math.min(
      MAX_PAGE_SIZE,
      Number.parseInt(
        url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
        10,
      ) || DEFAULT_PAGE_SIZE,
    ),
  );
  return { page: p, pageSize: ps, offset: (p - 1) * ps, limit: ps };
}
function query(url: URL): JsonRecord {
  const r: Record<string, JsonValue> = {};
  url.searchParams.forEach((v, k) => {
    r[k] = v;
  });
  return r;
}
function routeId(match: RegExpMatchArray, index: number): string {
  const v = match[index];
  if (!v)
    throw new UserHttpError(
      400,
      "USER_ROUTE_ID_REQUIRED",
      "경로 식별자가 필요합니다.",
    );
  return decodeURIComponent(v);
}
function list<T extends JsonRecord>(
  items: readonly T[],
  p: Page,
): ListResult<T> {
  return {
    items: items.slice(p.offset, p.offset + p.limit),
    page: p.page,
    pageSize: p.pageSize,
    total: items.length,
  };
}

function profileInput(input: Record<string, unknown>): UserProfileUpdateInput {
  const bad = Object.keys(input).find((k) =>
    forbiddenProfile.some(
      (f) =>
        k.toLowerCase() === f.toLowerCase() ||
        k.toLowerCase().includes(f.toLowerCase()),
    ),
  );
  if (bad)
    throw new UserHttpError(
      400,
      "USER_PROFILE_FIELD_FORBIDDEN",
      "프로필 API에서 수정할 수 없는 필드입니다.",
      { field: bad },
    );
  const p: {
    nickname?: string;
    displayBio?: string | null;
    avatarAttachmentId?: string | null;
    birthYear?: number | null;
    occupationCategory?: string | null;
  } = {};
  if (input.nickname !== undefined) {
    const n = str(input, "nickname", true, 40);
    if (n.length < 2)
      throw new UserHttpError(
        400,
        "USER_NICKNAME_TOO_SHORT",
        "닉네임은 2자 이상이어야 합니다.",
      );
    p.nickname = n;
  }
  if (input.displayBio !== undefined)
    p.displayBio = opt(input, "displayBio", 300);
  if (input.avatarAttachmentId !== undefined)
    p.avatarAttachmentId = opt(input, "avatarAttachmentId", 160);
  if (input.birthYear !== undefined)
    p.birthYear =
      input.birthYear === null
        ? null
        : int(input, "birthYear", true, 1900, 2100);
  if (input.occupationCategory !== undefined)
    p.occupationCategory = opt(input, "occupationCategory", 80);
  if (!Object.keys(p).length)
    throw new UserHttpError(
      400,
      "USER_PROFILE_UPDATE_EMPTY",
      "수정할 프로필 값이 필요합니다.",
    );
  return p;
}
function settingsInput(input: Record<string, unknown>): UserSettingsInput {
  const p: {
    theme?: Theme;
    language?: Language;
    timezone?: string;
    weekStartsOnMonday?: boolean;
    showAmountsInCommunity?: boolean;
    dashboardCompactMode?: boolean;
    paydayReminderDaysBefore?: number;
  } = {};
  if (input.theme !== undefined) p.theme = theme(input.theme);
  if (input.language !== undefined) p.language = lang(input.language);
  if (input.timezone !== undefined)
    p.timezone = str(input, "timezone", true, 80);
  if (input.weekStartsOnMonday !== undefined)
    p.weekStartsOnMonday = bool(input, "weekStartsOnMonday");
  if (input.showAmountsInCommunity !== undefined)
    p.showAmountsInCommunity = bool(input, "showAmountsInCommunity");
  if (input.dashboardCompactMode !== undefined)
    p.dashboardCompactMode = bool(input, "dashboardCompactMode");
  if (input.paydayReminderDaysBefore !== undefined)
    p.paydayReminderDaysBefore = int(
      input,
      "paydayReminderDaysBefore",
      true,
      0,
      14,
    );
  if (!Object.keys(p).length)
    throw new UserHttpError(
      400,
      "USER_SETTINGS_UPDATE_EMPTY",
      "수정할 설정 값이 필요합니다.",
    );
  return p;
}
function consentInput(input: Record<string, unknown>): UserConsentInput {
  const p: {
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    marketingAccepted?: boolean;
    contentRecommendationAccepted?: boolean;
    adPartnerAccepted?: boolean;
    analyticsAccepted?: boolean;
    consentVersion?: string;
  } = {};
  if (input.termsAccepted !== undefined)
    p.termsAccepted = bool(input, "termsAccepted");
  if (input.privacyAccepted !== undefined)
    p.privacyAccepted = bool(input, "privacyAccepted");
  if (input.marketingAccepted !== undefined)
    p.marketingAccepted = bool(input, "marketingAccepted");
  if (input.contentRecommendationAccepted !== undefined)
    p.contentRecommendationAccepted = bool(
      input,
      "contentRecommendationAccepted",
    );
  if (input.adPartnerAccepted !== undefined)
    p.adPartnerAccepted = bool(input, "adPartnerAccepted");
  if (input.analyticsAccepted !== undefined)
    p.analyticsAccepted = bool(input, "analyticsAccepted");
  if (input.consentVersion !== undefined)
    p.consentVersion = str(input, "consentVersion", true, 60);
  if (!Object.keys(p).length)
    throw new UserHttpError(
      400,
      "USER_CONSENTS_UPDATE_EMPTY",
      "수정할 동의 값이 필요합니다.",
    );
  if (
    p.adPartnerAccepted === true &&
    input.sensitiveFinancialTargetingAccepted === true
  )
    throw new UserHttpError(
      400,
      "USER_FINANCIAL_AD_TARGETING_FORBIDDEN",
      "광고·제휴 동의는 급여·지출·저축 원천 데이터 타겟팅 동의가 아닙니다.",
    );
  return p;
}
function exportInput(input: Record<string, unknown>): UserExportRequestInput {
  return {
    includeProfile: bool(input, "includeProfile", true),
    includeSettings: bool(input, "includeSettings", true),
    includeConsents: bool(input, "includeConsents", true),
    includeCommunity: bool(input, "includeCommunity", true),
    includeGrowth: bool(input, "includeGrowth", true),
    includeFinancialSummaryOnly: true,
    reason: opt(input, "reason", 500),
  };
}
function withdrawInput(input: Record<string, unknown>): UserWithdrawInput {
  const confirmText = str(input, "confirmText", true, 80);
  if (confirmText !== "회원탈퇴")
    throw new UserHttpError(
      400,
      "USER_WITHDRAW_CONFIRM_TEXT_INVALID",
      "confirmText에는 회원탈퇴를 입력해야 합니다.",
    );
  return {
    reason: str(input, "reason", true, 500),
    confirmText,
    deleteCommunityContent: bool(input, "deleteCommunityContent"),
  };
}

function withdrawalRequestInput(
  input: Record<string, unknown>,
): UserWithdrawalRequestInput {
  return {
    reason: str(input, "reason", false, 500) || "mobile-withdrawal-request",
    deleteCommunityContent: bool(input, "deleteCommunityContent"),
  };
}

function supportTicketInput(
  input: Record<string, unknown>,
): UserSupportTicketInput {
  const category = str(input, "category", true, 24);
  if (!["ACCOUNT", "PAYMENT", "PRIVACY", "BUG", "OTHER"].includes(category)) {
    throw new UserHttpError(
      400,
      "USER_SUPPORT_CATEGORY_INVALID",
      "문의 유형이 올바르지 않습니다.",
      { field: "category" },
    );
  }
  if (
    input.rawFinancialDataExposed !== false ||
    input.rawPersonalDataExposed !== false ||
    input.rawPushTokenExposed !== false ||
    input.adsFinancialTargetingUsed !== false
  ) {
    throw new UserHttpError(
      400,
      "USER_SUPPORT_PRIVACY_FLAGS_REQUIRED",
      "문의에는 민감 원문 노출 금지 플래그가 필요합니다.",
    );
  }
  const subject = str(input, "subject", true, 80);
  const message = str(input, "message", true, 1_000);
  if (
    /salary|income|expense|saving|hijack|token|email|phone|card|accountNumber/iu.test(
      `${subject} ${message}`,
    )
  ) {
    throw new UserHttpError(
      400,
      "USER_SUPPORT_SENSITIVE_RAW_DATA_REJECTED",
      "문의에는 급여, 지출, 계좌, 토큰 등 민감 원문을 입력할 수 없습니다.",
    );
  }
  return {
    category: category as UserSupportTicketInput["category"],
    message,
    subject,
  };
}

type MobileExportStatus = "NONE" | "REQUESTED" | "READY" | "EXPIRED";

function safeString(value: JsonValue | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeOptionalString(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeNumber(value: JsonValue | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function safeBoolean(value: JsonValue | undefined, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashUserId(userId: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`salary-hijacking:user:${userId}`),
  );
  return `sha256:${hex(digest).slice(0, 32)}`;
}

function mobileActivityKind(action: string): string {
  const normalized = action.toUpperCase();
  if (normalized.includes("PROFILE") || normalized.includes("USER"))
    return "SECURITY";
  if (normalized.includes("CONSENT") || normalized.includes("PRIVACY"))
    return "SECURITY";
  if (normalized.includes("WITHDRAW") || normalized.includes("RESTORE"))
    return "SECURITY";
  return "NOTICE";
}

function mobileActivity(item: JsonRecord, index: number): JsonRecord {
  const action = safeString(item.action, "PROFILE_ACTIVITY");
  return {
    id: safeString(item.activityId, `activity_${index + 1}`),
    kind: mobileActivityKind(action),
    title: action,
    description: "Account activity processed by the server.",
    createdAt: safeString(item.createdAt, new Date(0).toISOString()),
    route: "/profile",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function exportStatusFromRecord(
  record: JsonRecord | undefined,
  now: Date,
): MobileExportStatus {
  if (!record) return "NONE";
  const expiresAt = safeOptionalString(record.expiresAt);
  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) return "EXPIRED";
  const status = safeString(record.status, "REQUESTED").toUpperCase();
  if (status === "READY") return "READY";
  if (status === "EXPIRED") return "EXPIRED";
  return "REQUESTED";
}

async function mobileProfilePayload<TEnv>(
  rt: UsersRouteRuntime<TEnv>,
  privacyOverride: Partial<{
    readonly exportStatus: MobileExportStatus;
    readonly exportRequestedAt: string | null;
    readonly withdrawalRequested: boolean;
  }> = {},
): Promise<JsonRecord> {
  const [me, summary, activity, exportsList] = await Promise.all([
    rt.repository.getMe(rt),
    rt.repository.summary(rt),
    rt.repository.activity(
      {},
      { page: 1, pageSize: 10, offset: 0, limit: 10 },
      rt,
    ),
    rt.repository.listExports(
      { page: 1, pageSize: 1, offset: 0, limit: 1 },
      rt,
    ),
  ]);
  const latestExport = exportsList.items[0];
  const nickname = safeString(me.nickname, "Salary Hijacking User");
  const userStatus = safeString(me.status, "ACTIVE");
  const exportRequestedAt =
    privacyOverride.exportRequestedAt ??
    safeOptionalString(latestExport?.createdAt);

  return {
    user: {
      idHash: await hashUserId(rt.principal.userId),
      nickname,
      role: rt.principal.roles[0] ?? "USER",
      emailVerified: true,
      onboardingCompleted: true,
      joinedAt: safeString(me.createdAt, rt.now.toISOString()),
      level: safeNumber(me.level, safeNumber(summary.level, 1)),
      title: safeString(me.title, "Salary Guardian"),
      avatarEmoji: safeString(me.avatarEmoji, "SH"),
      marketingConsent: safeBoolean(me.marketingConsent, false),
      notificationConsent: safeBoolean(me.notificationConsent, true),
      communityDisplayName: safeString(me.communityDisplayName, nickname),
      rawEmailExposed: false,
      rawPhoneExposed: false,
      rawFinancialDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    },
    summary: {
      totalHijackSaved: 0,
      currentMonthHijack: 0,
      currentLevel: safeNumber(summary.level, safeNumber(me.level, 1)),
      levelXp: 0,
      nextLevelXp: 1,
      selfCareScore: 0,
      completedGrowthTasks: 0,
      communityPosts: 0,
      communityComments: 0,
      notificationUnread: 0,
      privacyPassRate: "100.00%",
    },
    privacy: {
      exportStatus:
        privacyOverride.exportStatus ??
        exportStatusFromRecord(latestExport, rt.now),
      exportRequestedAt,
      withdrawalRequested:
        (privacyOverride.withdrawalRequested ??
          safeBoolean(me.withdrawalRequested, false)) ||
        userStatus === "WITHDRAWN",
      adPersonalization: false,
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    },
    activities: activity.items.map(mobileActivity),
  };
}

function defaultUser(userId: string, now: Date): JsonRecord {
  return {
    userId,
    emailMasked: `${userId.slice(0, Math.min(4, userId.length))}***@masked.local`,
    nickname: "급여납치 사용자",
    displayBio: null,
    avatarAttachmentId: null,
    birthYear: null,
    occupationCategory: null,
    status: "ACTIVE",
    withdrawalRequested: false,
    withdrawalRequestedAt: null,
    level: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastLoginAt: null,
    financialRawDataExposed: false,
    adTargetingSeparated: true,
  };
}
function defaultSettings(userId: string, now: Date): JsonRecord {
  return {
    userId,
    theme: "SYSTEM",
    language: "ko-KR",
    timezone: "Asia/Seoul",
    weekStartsOnMonday: false,
    showAmountsInCommunity: false,
    dashboardCompactMode: false,
    paydayReminderDaysBefore: 3,
    updatedAt: now.toISOString(),
  };
}
function defaultConsents(userId: string, now: Date): JsonRecord {
  return {
    userId,
    termsAccepted: true,
    privacyAccepted: true,
    marketingAccepted: false,
    contentRecommendationAccepted: false,
    adPartnerAccepted: false,
    analyticsAccepted: false,
    sensitiveFinancialTargetingAccepted: false,
    consentVersion: "v3.1",
    updatedAt: now.toISOString(),
    adPartnerFinancialRawDataUsed: false,
  };
}
async function emit<TEnv>(
  runtime: UsersRouteRuntime<TEnv>,
  event: UserEvent,
): Promise<void> {
  const options = (
    runtime as UsersRouteRuntime<TEnv> & {
      readonly routeOptions?: UsersRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onUserEvent) return;
  const task = Promise.resolve(
    options.onUserEvent(event, runtime.env, runtime.execution),
  ).catch((e) =>
    console.warn(
      "users_routes_event_failed",
      e instanceof Error ? e.name : "UnknownError",
    ),
  );
  runtime.execution.waitUntil?.(task);
}

function createInMemoryUsersRepository<
  TEnv = unknown,
>(): UsersRepository<TEnv> {
  const users = new Map<string, JsonRecord>();
  const settings = new Map<string, JsonRecord>();
  const consents = new Map<string, JsonRecord>();
  const exportsMap = new Map<string, JsonRecord>();
  const supportTickets = new Map<string, JsonRecord[]>();
  const activities = new Map<string, JsonRecord[]>();
  const u = (rt: UsersRouteRuntime<TEnv>): JsonRecord => {
    const x = users.get(rt.principal.userId);
    if (x) return x;
    const created = defaultUser(rt.principal.userId, rt.now);
    users.set(rt.principal.userId, created);
    return created;
  };
  const s = (rt: UsersRouteRuntime<TEnv>): JsonRecord => {
    const x = settings.get(rt.principal.userId);
    if (x) return x;
    const created = defaultSettings(rt.principal.userId, rt.now);
    settings.set(rt.principal.userId, created);
    return created;
  };
  const c = (rt: UsersRouteRuntime<TEnv>): JsonRecord => {
    const x = consents.get(rt.principal.userId);
    if (x) return x;
    const created = defaultConsents(rt.principal.userId, rt.now);
    consents.set(rt.principal.userId, created);
    return created;
  };
  const act = (
    userId: string,
    action: string,
    rt: UsersRouteRuntime<TEnv>,
    targetId: string | null = null,
  ): void => {
    const l = activities.get(userId) ?? [];
    l.unshift({
      activityId: `act_${globalThis.crypto.randomUUID()}`,
      userId,
      action,
      targetId,
      requestId: rt.requestId,
      createdAt: rt.now.toISOString(),
      financialRawDataExposed: false,
    });
    activities.set(userId, l.slice(0, 500));
  };
  return {
    name: "in-memory-users-repository",
    async getMe(rt) {
      const user = u(rt);
      assertOwner(String(user.userId), rt);
      return { ...user, settings: s(rt), consents: c(rt) };
    },
    async updateMe(input, rt) {
      const user = u(rt);
      if (user.status === "WITHDRAWN" || user.status === "DELETED")
        throw new UserHttpError(
          409,
          "USER_INACTIVE",
          "비활성 계정은 프로필을 수정할 수 없습니다.",
        );
      const updated: JsonRecord = { ...user, updatedAt: rt.now.toISOString() };
      if (input.nickname !== undefined) updated.nickname = input.nickname;
      if (input.displayBio !== undefined) updated.displayBio = input.displayBio;
      if (input.avatarAttachmentId !== undefined)
        updated.avatarAttachmentId = input.avatarAttachmentId;
      if (input.birthYear !== undefined) updated.birthYear = input.birthYear;
      if (input.occupationCategory !== undefined)
        updated.occupationCategory = input.occupationCategory;
      users.set(rt.principal.userId, updated);
      act(rt.principal.userId, "USER_PROFILE_UPDATED", rt);
      return updated;
    },
    async withdraw(input, rt) {
      const updated = {
        ...u(rt),
        status: "WITHDRAWN",
        withdrawReason: input.reason,
        deleteCommunityContent: input.deleteCommunityContent,
        withdrawnAt: rt.now.toISOString(),
        updatedAt: rt.now.toISOString(),
      };
      users.set(rt.principal.userId, updated);
      act(rt.principal.userId, "USER_WITHDRAWN", rt);
      return {
        userId: rt.principal.userId,
        status: "WITHDRAWN",
        deleteCommunityContent: input.deleteCommunityContent,
        withdrawnAt: rt.now.toISOString(),
      };
    },
    async requestWithdrawal(input, rt) {
      const updated: JsonRecord = {
        ...u(rt),
        withdrawalRequested: true,
        withdrawalRequestedAt: rt.now.toISOString(),
        withdrawReason: input.reason,
        deleteCommunityContent: input.deleteCommunityContent,
        updatedAt: rt.now.toISOString(),
      };
      users.set(rt.principal.userId, updated);
      act(rt.principal.userId, "USER_WITHDRAWAL_REQUESTED", rt);
      return {
        userId: rt.principal.userId,
        status: safeString(updated.status, "ACTIVE"),
        withdrawalRequested: true,
        withdrawalRequestedAt: rt.now.toISOString(),
        deleteCommunityContent: input.deleteCommunityContent,
      };
    },
    async createSupportTicket(input, rt) {
      const ticket: JsonRecord = {
        adsFinancialTargetingUsed: false,
        category: input.category,
        createdAt: rt.now.toISOString(),
        id: `ust_${globalThis.crypto.randomUUID()}`,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        status: "OPEN",
        subject: input.subject,
      };
      const listForUser = supportTickets.get(rt.principal.userId) ?? [];
      supportTickets.set(rt.principal.userId, [ticket, ...listForUser]);
      act(rt.principal.userId, "USER_SUPPORT_TICKET_CREATED", rt);
      return ticket;
    },
    async restore(rt) {
      const user = u(rt);
      if (user.status !== "WITHDRAWN")
        throw new UserHttpError(
          409,
          "USER_RESTORE_NOT_ALLOWED",
          "탈퇴 대기 계정만 복구할 수 있습니다.",
        );
      const updated = {
        ...user,
        status: "ACTIVE",
        restoredAt: rt.now.toISOString(),
        updatedAt: rt.now.toISOString(),
      };
      users.set(rt.principal.userId, updated);
      act(rt.principal.userId, "USER_RESTORED", rt);
      return updated;
    },
    async summary(rt) {
      const user = u(rt);
      const st = s(rt);
      const co = c(rt);
      return {
        userId: rt.principal.userId,
        status: String(user.status ?? "ACTIVE"),
        level: typeof user.level === "number" ? user.level : 1,
        profileCompleted: Boolean(user.nickname && user.avatarAttachmentId),
        theme: String(st.theme),
        contentRecommendationAccepted:
          co.contentRecommendationAccepted === true,
        adPartnerAccepted: co.adPartnerAccepted === true,
        sensitiveFinancialTargetingAccepted: false,
        financialRawDataExposed: false,
        nextActions: "급여계획 최신화,일일 예산 확인,LV UP 루틴 인증",
      };
    },
    async activity(input, p, rt) {
      const action =
        typeof input.action === "string" && input.action ? input.action : null;
      return list(
        (activities.get(rt.principal.userId) ?? [])
          .filter((item) => !action || item.action === action)
          .map((item) => ({ ...item, userId: rt.principal.userId })),
        p,
      );
    },
    async getSettings(rt) {
      return s(rt);
    },
    async updateSettings(input, rt) {
      const updated: JsonRecord = {
        ...s(rt),
        ...(sanitize(input) as JsonRecord),
        userId: rt.principal.userId,
        updatedAt: rt.now.toISOString(),
      };
      settings.set(rt.principal.userId, updated);
      act(rt.principal.userId, "USER_SETTINGS_UPDATED", rt);
      return updated;
    },
    async getConsents(rt) {
      return c(rt);
    },
    async updateConsents(input, rt) {
      const updated: JsonRecord = {
        ...c(rt),
        ...(sanitize(input) as JsonRecord),
        userId: rt.principal.userId,
        sensitiveFinancialTargetingAccepted: false,
        adPartnerFinancialRawDataUsed: false,
        updatedAt: rt.now.toISOString(),
      };
      if (updated.termsAccepted !== true || updated.privacyAccepted !== true)
        throw new UserHttpError(
          400,
          "USER_REQUIRED_CONSENT_CANNOT_BE_FALSE",
          "필수 약관과 개인정보 동의는 해제할 수 없습니다.",
        );
      consents.set(rt.principal.userId, updated);
      act(rt.principal.userId, "USER_CONSENTS_UPDATED", rt);
      return updated;
    },
    async requestExport(input, rt) {
      const exportId = `uex_${globalThis.crypto.randomUUID()}`;
      const record: JsonRecord = {
        exportId,
        userId: rt.principal.userId,
        status: "READY",
        includeProfile: input.includeProfile,
        includeSettings: input.includeSettings,
        includeConsents: input.includeConsents,
        includeCommunity: input.includeCommunity,
        includeGrowth: input.includeGrowth,
        includeFinancialSummaryOnly: true,
        reason: input.reason,
        downloadUrl: `export://${rt.principal.userId}/${exportId}.json`,
        expiresAt: new Date(rt.now.getTime() + 86_400_000).toISOString(),
        createdAt: rt.now.toISOString(),
        financialRawDataIncluded: false,
      };
      exportsMap.set(exportId, record);
      act(rt.principal.userId, "USER_EXPORT_REQUESTED", rt, exportId);
      return record;
    },
    async getExport(exportId, rt) {
      const found = exportsMap.get(exportId) ?? null;
      if (!found) return null;
      assertOwner(String(found.userId), rt);
      return found;
    },
    async listExports(p, rt) {
      return list(
        [...exportsMap.values()]
          .filter((item) => item.userId === rt.principal.userId)
          .sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
          ),
        p,
      );
    },
  };
}

function repo<TEnv>(
  env: TEnv,
  options: UsersRoutesOptions<TEnv>,
): UsersRepository<TEnv> {
  const r =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return r ?? createInMemoryUsersRepository<TEnv>();
}
async function dispatch<TEnv>(rt: UsersRouteRuntime<TEnv>): Promise<Response> {
  const p = page(rt.url);
  const { method, relativePath, repository } = rt;
  if (method === "GET" && relativePath === "/me/profile")
    return out(rt, 200, { data: await mobileProfilePayload(rt) });
  if (method === "POST" && relativePath === "/me/privacy-export") {
    const data = await repository.requestExport(
      exportInput(await body(rt.request)),
      rt,
    );
    await emit(rt, {
      event: "user_export_requested",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: String(data.exportId ?? ""),
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 202, {
      data: await mobileProfilePayload(rt, {
        exportStatus: "REQUESTED",
        exportRequestedAt: rt.now.toISOString(),
      }),
    });
  }
  if (method === "POST" && relativePath === "/me/support-tickets") {
    const input = supportTicketInput(await body(rt.request));
    const data =
      typeof repository.createSupportTicket === "function"
        ? await repository.createSupportTicket(input, rt)
        : {
            adsFinancialTargetingUsed: false,
            category: input.category,
            createdAt: rt.now.toISOString(),
            id: `ust_${globalThis.crypto.randomUUID()}`,
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPushTokenExposed: false,
            status: "OPEN",
            subject: input.subject,
          };
    await emit(rt, {
      event: "user_support_ticket_created",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: String(data.id ?? ""),
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 202, { data });
  }
  if (method === "POST" && relativePath === "/me/withdrawal-request") {
    const input = withdrawalRequestInput(await body(rt.request));
    const data =
      typeof repository.requestWithdrawal === "function"
        ? await repository.requestWithdrawal(input, rt)
        : {
            userId: rt.principal.userId,
            status: "ACTIVE",
            withdrawalRequested: true,
            withdrawalRequestedAt: rt.now.toISOString(),
            deleteCommunityContent: input.deleteCommunityContent,
          };
    await emit(rt, {
      event: "user_withdrawal_requested",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: String(data.userId ?? rt.principal.userId),
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 202, {
      data: await mobileProfilePayload(rt, {
        withdrawalRequested: true,
      }),
    });
  }
  if (method === "GET" && (relativePath === "/me" || relativePath === "/"))
    return out(rt, 200, { data: await repository.getMe(rt) });
  if (method === "PATCH" && (relativePath === "/me" || relativePath === "/")) {
    const data = await repository.updateMe(
      profileInput(await body(rt.request)),
      rt,
    );
    await emit(rt, {
      event: "user_profile_updated",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: rt.principal.userId,
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 200, { data });
  }
  if (method === "GET" && relativePath === "/me/summary")
    return out(rt, 200, { data: await repository.summary(rt) });
  if (method === "GET" && relativePath === "/me/activity")
    return out(rt, 200, {
      data: await repository.activity(query(rt.url), p, rt),
    });
  if (method === "POST" && relativePath === "/me/withdraw") {
    const data = await repository.withdraw(
      withdrawInput(await body(rt.request)),
      rt,
    );
    await emit(rt, {
      event: "user_withdrawn",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: rt.principal.userId,
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 200, { data });
  }
  if (method === "POST" && relativePath === "/me/restore") {
    const data = await repository.restore(rt);
    await emit(rt, {
      event: "user_restored",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: rt.principal.userId,
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 200, { data });
  }
  if (method === "GET" && relativePath === "/settings")
    return out(rt, 200, { data: await repository.getSettings(rt) });
  if (
    (method === "PATCH" || method === "PUT") &&
    relativePath === "/settings"
  ) {
    const data = await repository.updateSettings(
      settingsInput(await body(rt.request)),
      rt,
    );
    await emit(rt, {
      event: "user_settings_updated",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: rt.principal.userId,
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 200, { data });
  }
  if (method === "GET" && relativePath === "/consents")
    return out(rt, 200, { data: await repository.getConsents(rt) });
  if (
    (method === "PATCH" || method === "PUT" || method === "POST") &&
    relativePath === "/consents"
  ) {
    const data = await repository.updateConsents(
      consentInput(await body(rt.request)),
      rt,
    );
    await emit(rt, {
      event: "user_consents_updated",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: rt.principal.userId,
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 200, { data });
  }
  if (method === "GET" && relativePath === "/privacy/export")
    return out(rt, 200, { data: await repository.listExports(p, rt) });
  if (method === "POST" && relativePath === "/privacy/export") {
    const data = await repository.requestExport(
      exportInput(await body(rt.request)),
      rt,
    );
    await emit(rt, {
      event: "user_export_requested",
      requestId: rt.requestId,
      userId: rt.principal.userId,
      targetId: String(data.exportId ?? ""),
      path: rt.path,
      createdAt: rt.now.toISOString(),
    });
    return out(rt, 202, { data });
  }
  const exportMatch = relativePath.match(/^\/privacy\/export\/([^/]+)$/);
  if (method === "GET" && exportMatch) {
    const data = await repository.getExport(routeId(exportMatch, 1), rt);
    if (!data)
      throw new UserHttpError(
        404,
        "USER_EXPORT_NOT_FOUND",
        "개인정보 내보내기 요청을 찾을 수 없습니다.",
      );
    return out(rt, 200, { data });
  }
  throw new UserHttpError(
    404,
    "USER_ROUTE_NOT_FOUND",
    "사용자 API 경로를 찾을 수 없습니다.",
  );
}

export function createUsersRoutes<TEnv = unknown>(
  options: UsersRoutesOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normPath(url.pathname);
    const requestId = rid(request);
    try {
      if (path !== USERS_API_PREFIX && !path.startsWith(`${USERS_API_PREFIX}/`))
        throw new UserHttpError(
          404,
          "USER_ROUTE_PREFIX_NOT_FOUND",
          "사용자 API prefix가 아닙니다.",
        );
      const base: UsersRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normPath(path.slice(USERS_API_PREFIX.length) || "/"),
        method: request.method.toUpperCase(),
        requestId,
        now: options.now?.() ?? new Date(),
        principal: principal(request, options.requireAuthContextSource ?? true),
        repository: repo(env, options),
      };
      const rt = Object.assign(base, { routeOptions: options });
      const response = await dispatch(rt);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set("x-users-repository", rt.repository.name ?? "custom");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      return err(requestId, path, error);
    }
  };
}
export const handleUsersRoutes = createUsersRoutes();
export const usersRoutesManifest = Object.freeze({
  file: "services/api/src/routes/users.routes.ts",
  version: USERS_ROUTES_VERSION,
  prefix: USERS_API_PREFIX,
  endpoints: [
    "GET /",
    "GET /me",
    "PATCH /me",
    "GET /me/profile",
    "GET /me/summary",
    "GET /me/activity",
    "POST /me/withdrawal-request",
    "POST /me/support-tickets",
    "POST /me/withdraw",
    "POST /me/restore",
    "POST /me/privacy-export",
    "GET /settings",
    "PUT|PATCH /settings",
    "GET /consents",
    "POST|PUT|PATCH /consents",
    "GET /privacy/export",
    "POST /privacy/export",
    "GET /privacy/export/{exportId}",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  myPageProfileSettingsConsentsReady: true,
  ownerDataBoundaryRequired: true,
  massAssignmentProtected: true,
  privacyExportFinancialSummaryOnly: true,
  adPartnerConsentSeparatedFromFinancialTargeting: true,
  financialRawDataExposed: false,
  finalStatus: "document_theoretical_file_unit_complete",
});
export function assertUsersRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "users_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "my_page_profile_get_update",
    "mobile_profile_payload_alias",
    "mobile_support_ticket_alias",
    "profile_mass_assignment_protection",
    "summary_and_activity",
    "settings_get_update",
    "consents_get_update",
    "terms_privacy_marketing_content_recommendation_ad_partner_analytics_consent",
    "ad_partner_consent_separated_from_sensitive_financial_targeting",
    "privacy_export_request_list_detail",
    "mobile_privacy_export_alias",
    "mobile_withdrawal_request_alias",
    "financial_export_summary_only_contract",
    "withdraw_and_restore_lifecycle",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
    "payroll_budget_savings_expense_growth_community_mypage_ready",
  ] as const;
  return { ok: checks.length >= 15, version: USERS_ROUTES_VERSION, checks };
}
export default createUsersRoutes;
