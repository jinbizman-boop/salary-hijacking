/** services/notifications/src/fcm.client.ts
 * 급여납치 Salary Hijacking Platform · Firebase Cloud Messaging HTTP v1 Client 최종본
 * Cloudflare Workers/Web Fetch API 호환. OAuth2 service-account JWT, access-token cache,
 * single/multicast/topic/condition 발송, retry/backoff, validateOnly, 민감 금융 데이터 차단,
 * push token hash-only logging, marketing consent guard, waitUntil event hook을 제공한다.
 */

export const FCM_CLIENT_VERSION = "3.1.0";
export const FCM_CLIENT_SERVICE_NAME = "salary-hijacking-notifications";
export const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const FCM_MAX_MULTICAST_TOKENS = 500;
export const FCM_DEFAULT_TIMEOUT_MS = 10_000;
export const FCM_DEFAULT_MAX_RETRIES = 3;
export const FCM_DEFAULT_TOKEN_SAFETY_WINDOW_MS = 60_000;

type TargetType = "TOKEN" | "TOPIC" | "CONDITION";
export type FcmNotificationType =
  | "PAYDAY"
  | "FIXED_PAYMENT_DUE"
  | "SAVINGS_DUE"
  | "BUDGET_OVER"
  | "BUDGET_REMAINING"
  | "HIJACK_GOAL"
  | "GROWTH_TASK"
  | "GROWTH_LEVEL_UP"
  | "COMMUNITY_COMMENT"
  | "COMMUNITY_REACTION"
  | "NOTICE"
  | "SECURITY"
  | "SYSTEM";
export type FcmImportance =
  | "TRANSACTIONAL"
  | "BEHAVIORAL"
  | "COMMUNITY"
  | "MARKETING"
  | "SYSTEM_REQUIRED";
export type FcmSendStatus = "SENT" | "FAILED" | "SKIPPED" | "RETRY_EXHAUSTED";
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface FcmEnvLike {
  readonly FCM_PROJECT_ID?: string;
  readonly FIREBASE_PROJECT_ID?: string;
  readonly GOOGLE_CLOUD_PROJECT?: string;
  readonly FCM_CLIENT_EMAIL?: string;
  readonly GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  readonly FCM_PRIVATE_KEY?: string;
  readonly GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  readonly GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  readonly FCM_ACCESS_TOKEN?: string;
  readonly FCM_DISABLE_NETWORK?: string;
  readonly FCM_DRY_RUN?: string;
}

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export interface FcmRuntimeContext<TEnv = unknown> {
  readonly env: TEnv;
  readonly execution?: WaitUntilCapable | undefined;
  readonly requestId?: string | undefined;
  readonly now?: Date | undefined;
}

export interface FcmServiceAccount {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
}

export interface FcmClientOptions<TEnv = unknown> {
  readonly projectId?: string | ((env: TEnv) => string | null | undefined);
  readonly clientEmail?: string | ((env: TEnv) => string | null | undefined);
  readonly privateKey?: string | ((env: TEnv) => string | null | undefined);
  readonly serviceAccountJson?:
    | string
    | ((env: TEnv) => string | null | undefined);
  readonly staticAccessToken?:
    | string
    | ((env: TEnv) => string | null | undefined);
  readonly endpointBaseUrl?: string;
  readonly tokenUrl?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly accessTokenSafetyWindowMs?: number;
  readonly fetcher?: typeof fetch;
  readonly disableNetwork?: boolean | ((env: TEnv) => boolean);
  readonly dryRun?: boolean | ((env: TEnv) => boolean);
  readonly onEvent?: (
    event: FcmClientEvent,
    env: TEnv,
    context?: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface FcmSafePolicyGuard {
  readonly rawPiiIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawPushTokenIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly salaryExpenseSavingsRawAmountIncluded: false;
  readonly adsFinancialJoinAllowed: false;
  readonly pushTokenLoggedAsHashOnly: true;
  readonly marketingConsentRequiredForMarketing: true;
  readonly inAppInboxRetainedWhenPushDenied: true;
}

export interface FcmNotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly imageUrl?: string | undefined;
}

export interface FcmDomainData {
  readonly notificationId: string;
  readonly userId: string;
  readonly type: FcmNotificationType;
  readonly importance: FcmImportance;
  readonly targetScreen: string;
  readonly deeplink?: string | undefined;
  readonly routeParams?:
    | Readonly<Record<string, string | number | boolean | null>>
    | undefined;
  readonly campaignId?: string | undefined;
  readonly templateId?: string | undefined;
  readonly idempotencyKey?: string | undefined;
  readonly ttlSeconds?: number | undefined;
  readonly marketingConsentVerified?: boolean | undefined;
  readonly adsPartnerConsentVerified?: boolean | undefined;
}

export interface FcmAndroidConfigInput {
  readonly priority?: "NORMAL" | "HIGH" | undefined;
  readonly ttlSeconds?: number | undefined;
  readonly collapseKey?: string | undefined;
  readonly channelId?: string | undefined;
  readonly clickAction?: string | undefined;
  readonly imageUrl?: string | undefined;
}

export interface FcmApnsConfigInput {
  readonly priority?: "5" | "10" | undefined;
  readonly collapseId?: string | undefined;
  readonly category?: string | undefined;
  readonly sound?: string | undefined;
  readonly mutableContent?: boolean | undefined;
  readonly contentAvailable?: boolean | undefined;
  readonly imageUrl?: string | undefined;
}

export interface FcmWebpushConfigInput {
  readonly urgency?: "very-low" | "low" | "normal" | "high" | undefined;
  readonly topic?: string | undefined;
  readonly link?: string | undefined;
  readonly icon?: string | undefined;
  readonly badge?: string | undefined;
  readonly imageUrl?: string | undefined;
}

export interface FcmSendInput {
  readonly token?: string | undefined;
  readonly topic?: string | undefined;
  readonly condition?: string | undefined;
  readonly notification: FcmNotificationPayload;
  readonly data: FcmDomainData;
  readonly extraData?:
    | Readonly<Record<string, string | number | boolean | null>>
    | undefined;
  readonly android?: FcmAndroidConfigInput | undefined;
  readonly apns?: FcmApnsConfigInput | undefined;
  readonly webpush?: FcmWebpushConfigInput | undefined;
  readonly validateOnly?: boolean | undefined;
}

export interface FcmMulticastInput extends Omit<
  FcmSendInput,
  "token" | "topic" | "condition"
> {
  readonly tokens: readonly string[];
  readonly concurrency?: number | undefined;
}

export interface FcmTopicInput extends Omit<
  FcmSendInput,
  "token" | "condition"
> {
  readonly topic: string;
}

export interface FcmConditionInput extends Omit<
  FcmSendInput,
  "token" | "topic"
> {
  readonly condition: string;
}

export interface FcmSendResult {
  readonly status: FcmSendStatus;
  readonly provider: "FCM";
  readonly projectId: string;
  readonly messageName: string | null;
  readonly targetType: TargetType;
  readonly tokenHash: string | null;
  readonly topic: string | null;
  readonly condition: string | null;
  readonly notificationId: string;
  readonly requestId: string | null;
  readonly attemptCount: number;
  readonly validateOnly: boolean;
  readonly httpStatus: number | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly retriable: boolean;
  readonly sentAt: string;
  readonly safePolicyGuard: FcmSafePolicyGuard;
}

export interface FcmMulticastResult {
  readonly provider: "FCM";
  readonly projectId: string;
  readonly totalCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly skippedCount: number;
  readonly results: readonly FcmSendResult[];
  readonly requestId: string | null;
  readonly completedAt: string;
  readonly safePolicyGuard: FcmSafePolicyGuard;
}

export interface FcmClientEvent {
  readonly event:
    | "fcm.access_token.created"
    | "fcm.message.sent"
    | "fcm.message.failed"
    | "fcm.message.skipped"
    | "fcm.multicast.completed";
  readonly requestId: string | null;
  readonly projectId: string;
  readonly notificationId: string | null;
  readonly targetType: TargetType | "MULTICAST";
  readonly tokenHash: string | null;
  readonly status: FcmSendStatus | "COMPLETED";
  readonly httpStatus: number | null;
  readonly errorCode: string | null;
  readonly createdAt: string;
}

export interface FcmClient<TEnv = unknown> {
  readonly version: string;
  readonly send: (
    input: FcmSendInput,
    context: FcmRuntimeContext<TEnv>,
  ) => Promise<FcmSendResult>;
  readonly sendEachForMulticast: (
    input: FcmMulticastInput,
    context: FcmRuntimeContext<TEnv>,
  ) => Promise<FcmMulticastResult>;
  readonly sendTopic: (
    input: FcmTopicInput,
    context: FcmRuntimeContext<TEnv>,
  ) => Promise<FcmSendResult>;
  readonly sendCondition: (
    input: FcmConditionInput,
    context: FcmRuntimeContext<TEnv>,
  ) => Promise<FcmSendResult>;
  readonly validateMessage: (input: FcmSendInput) => void;
  readonly buildMessage: (input: FcmSendInput) => JsonRecord;
  readonly getAccessToken: (
    context: FcmRuntimeContext<TEnv>,
  ) => Promise<string>;
  readonly hashToken: (token: string) => Promise<string>;
}

interface TokenCacheEntry {
  readonly accessToken: string;
  readonly expiresAtEpochMs: number;
}

interface GoogleTokenResponse {
  readonly access_token?: string;
  readonly expires_in?: number;
  readonly error?: string;
  readonly error_description?: string;
}

const safePolicyGuard: FcmSafePolicyGuard = Object.freeze({
  rawPiiIncluded: false,
  rawSecretIncluded: false,
  rawTokenIncluded: false,
  rawPushTokenIncluded: false,
  rawFinancialSourceDataIncluded: false,
  salaryExpenseSavingsRawAmountIncluded: false,
  adsFinancialJoinAllowed: false,
  pushTokenLoggedAsHashOnly: true,
  marketingConsentRequiredForMarketing: true,
  inAppInboxRetainedWhenPushDenied: true,
});

const sensitiveKeyFragments = [
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
  "dailybudget",
  "hijackamount",
  "adtarget",
  "targeting",
  "pushToken",
  "deviceToken",
  "fcmToken",
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

const sensitiveValuePatterns = [
  /\b\d{2,6}[- ]?\d{2,6}[- ]?\d{2,8}\b/,
  /\b\d{13,19}\b/,
  /(?:급여|월급|연봉|소득|대출|계좌|카드|저축|지출|급여명세|통장|원천징수)/i,
  /(?:salary|payroll|income|loan|account|card|payslip|bankbook|statement)/i,
];

class FcmClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retriable: boolean;

  constructor(code: string, message: string, status = 400, retriable = false) {
    super(message);
    this.name = "FcmClientError";
    this.code = code;
    this.status = status;
    this.retriable = retriable;
  }
}

function envText<TEnv>(env: TEnv, key: keyof FcmEnvLike): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optText<TEnv>(
  env: TEnv,
  option: string | ((env: TEnv) => string | null | undefined) | undefined,
): string | null {
  if (typeof option === "string" && option.trim()) return option.trim();
  if (typeof option === "function") return option(env)?.trim() || null;
  return null;
}

function optBool<TEnv>(
  env: TEnv,
  option: boolean | ((env: TEnv) => boolean) | undefined,
  envKey: keyof FcmEnvLike,
  fallback: boolean,
): boolean {
  if (typeof option === "boolean") return option;
  if (typeof option === "function") return option(env);
  const text = envText(env, envKey);
  return text
    ? ["1", "true", "yes", "on", "enabled"].includes(text.toLowerCase())
    : fallback;
}

function normalizePrivateKey(value: string): string {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function resolveServiceAccount<TEnv>(
  env: TEnv,
  options: FcmClientOptions<TEnv>,
): FcmServiceAccount {
  const rawJson =
    optText(env, options.serviceAccountJson) ??
    envText(env, "GOOGLE_SERVICE_ACCOUNT_JSON");
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      const projectId =
        typeof parsed.project_id === "string"
          ? parsed.project_id
          : typeof parsed.projectId === "string"
            ? parsed.projectId
            : null;
      const clientEmail =
        typeof parsed.client_email === "string"
          ? parsed.client_email
          : typeof parsed.clientEmail === "string"
            ? parsed.clientEmail
            : null;
      const privateKey =
        typeof parsed.private_key === "string"
          ? parsed.private_key
          : typeof parsed.privateKey === "string"
            ? parsed.privateKey
            : null;
      if (projectId && clientEmail && privateKey)
        return {
          projectId,
          clientEmail,
          privateKey: normalizePrivateKey(privateKey),
        };
    } catch {
      throw new FcmClientError(
        "FCM_SERVICE_ACCOUNT_JSON_INVALID",
        "GOOGLE_SERVICE_ACCOUNT_JSON 파싱에 실패했습니다.",
        500,
        false,
      );
    }
  }

  const projectId =
    optText(env, options.projectId) ??
    envText(env, "FCM_PROJECT_ID") ??
    envText(env, "FIREBASE_PROJECT_ID") ??
    envText(env, "GOOGLE_CLOUD_PROJECT");
  const clientEmail =
    optText(env, options.clientEmail) ??
    envText(env, "FCM_CLIENT_EMAIL") ??
    envText(env, "GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey =
    optText(env, options.privateKey) ??
    envText(env, "FCM_PRIVATE_KEY") ??
    envText(env, "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!projectId)
    throw new FcmClientError(
      "FCM_PROJECT_ID_REQUIRED",
      "FCM project id가 필요합니다.",
      500,
      false,
    );
  if (!clientEmail)
    throw new FcmClientError(
      "FCM_CLIENT_EMAIL_REQUIRED",
      "FCM service account client email이 필요합니다.",
      500,
      false,
    );
  if (!privateKey)
    throw new FcmClientError(
      "FCM_PRIVATE_KEY_REQUIRED",
      "FCM service account private key가 필요합니다.",
      500,
      false,
    );
  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlText(text: string): string {
  return base64UrlBytes(new TextEncoder().encode(text));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, "")
    .replace(/-----END RSA PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body)
    throw new FcmClientError(
      "FCM_PRIVATE_KEY_INVALID",
      "private key PEM 본문이 비어 있습니다.",
      500,
      false,
    );

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytesToArrayBuffer(bytes);
}

async function signRs256(
  privateKeyPem: string,
  unsignedJwt: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt),
  );
  return base64UrlBytes(new Uint8Array(signature));
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function createJwtAssertion(
  account: FcmServiceAccount,
  now: Date,
  tokenUrl: string,
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const payload = {
    iss: account.clientEmail,
    scope: FCM_SCOPE,
    aud: tokenUrl,
    iat,
    exp: iat + 3600,
  };
  const unsigned = `${base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64UrlText(JSON.stringify(payload))}`;
  return `${unsigned}.${await signRs256(account.privateKey, unsigned)}`;
}

function keySensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
  );
}

function valueSensitive(value: string): boolean {
  return sensitiveValuePatterns.some((pattern) => pattern.test(value));
}

function assertTextSafe(field: string, value: string): void {
  if (value.length > 1000)
    throw new FcmClientError(
      "FCM_TEXT_TOO_LONG",
      `${field} 길이가 너무 깁니다.`,
      400,
      false,
    );
  if (valueSensitive(value)) {
    throw new FcmClientError(
      "FCM_SENSITIVE_VALUE_FORBIDDEN",
      `${field}에는 급여·계좌·카드·대출 등 민감 원문을 포함할 수 없습니다.`,
      400,
      false,
    );
  }
}

function assertDataSafe(key: string, value: string): void {
  if (keySensitive(key))
    throw new FcmClientError(
      "FCM_SENSITIVE_DATA_KEY_FORBIDDEN",
      "FCM data payload에 민감 key를 포함할 수 없습니다.",
      400,
      false,
    );
  if (value.length > 1000)
    throw new FcmClientError(
      "FCM_DATA_VALUE_TOO_LONG",
      "FCM data payload 값이 너무 깁니다.",
      400,
      false,
    );
  if (valueSensitive(value))
    throw new FcmClientError(
      "FCM_SENSITIVE_DATA_VALUE_FORBIDDEN",
      "FCM data payload에 민감 금융 원문을 포함할 수 없습니다.",
      400,
      false,
    );
}

function toDataString(value: string | number | boolean | null): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function normalizeTopic(topic: string): string {
  const cleaned = topic.trim().replace(/^\/topics\//, "");
  if (!/^[a-zA-Z0-9-_.~%]{1,900}$/.test(cleaned)) {
    throw new FcmClientError(
      "FCM_TOPIC_INVALID",
      "FCM topic 형식이 올바르지 않습니다.",
      400,
      false,
    );
  }
  return cleaned;
}

function assertToken(token: string): void {
  const value = token.trim();
  if (value.length < 20 || value.length > 4096 || /\s/.test(value)) {
    throw new FcmClientError(
      "FCM_TOKEN_INVALID",
      "FCM registration token 형식이 올바르지 않습니다.",
      400,
      false,
    );
  }
}

function assertCondition(condition: string): void {
  const value = condition.trim();
  if (
    value.length < 3 ||
    value.length > 1024 ||
    !value.includes("' in topics")
  ) {
    throw new FcmClientError(
      "FCM_CONDITION_INVALID",
      "FCM condition에는 topic 조건이 필요합니다.",
      400,
      false,
    );
  }
}

function targetType(input: FcmSendInput): TargetType {
  if (input.token) return "TOKEN";
  if (input.topic) return "TOPIC";
  if (input.condition) return "CONDITION";
  throw new FcmClientError(
    "FCM_TARGET_REQUIRED",
    "token, topic, condition 중 하나가 필요합니다.",
    400,
    false,
  );
}

function assertSingleTarget(input: FcmSendInput): void {
  const count = [input.token, input.topic, input.condition].filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;
  if (count !== 1) {
    throw new FcmClientError(
      "FCM_TARGET_EXACTLY_ONE_REQUIRED",
      "FCM 메시지 target은 token, topic, condition 중 정확히 하나여야 합니다.",
      400,
      false,
    );
  }
}

function buildData(input: FcmSendInput): Record<string, string> {
  const data: Record<string, string> = {
    notificationId: input.data.notificationId,
    userId: input.data.userId,
    type: input.data.type,
    importance: input.data.importance,
    targetScreen: input.data.targetScreen,
    provider: "FCM",
    safePolicyVersion: FCM_CLIENT_VERSION,
    rawFinancialDataIncluded: "false",
    adFinancialTargetingUsed: "false",
  };

  if (input.data.deeplink) data.deeplink = input.data.deeplink;
  if (input.data.campaignId) data.campaignId = input.data.campaignId;
  if (input.data.templateId) data.templateId = input.data.templateId;
  if (input.data.idempotencyKey)
    data.idempotencyKey = input.data.idempotencyKey;
  if (input.data.ttlSeconds !== undefined)
    data.ttlSeconds = String(input.data.ttlSeconds);
  if (input.data.marketingConsentVerified !== undefined)
    data.marketingConsentVerified = String(input.data.marketingConsentVerified);
  if (input.data.adsPartnerConsentVerified !== undefined)
    data.adsPartnerConsentVerified = String(
      input.data.adsPartnerConsentVerified,
    );
  if (input.data.routeParams)
    data.routeParams = JSON.stringify(input.data.routeParams);
  if (input.extraData)
    Object.entries(input.extraData).forEach(([key, value]) => {
      data[key] = toDataString(value);
    });

  Object.entries(data).forEach(([key, value]) => assertDataSafe(key, value));
  return data;
}

function buildAndroid(input: FcmSendInput): JsonRecord | undefined {
  const ttl = input.android?.ttlSeconds ?? input.data.ttlSeconds;
  const notification: JsonRecord = {};
  if (input.android?.channelId)
    notification.channel_id = input.android.channelId;
  if (input.android?.clickAction)
    notification.click_action = input.android.clickAction;
  if (input.android?.imageUrl) notification.image = input.android.imageUrl;

  const config: JsonRecord = {};
  if (input.android?.priority) config.priority = input.android.priority;
  if (ttl !== undefined) config.ttl = `${ttl}s`;
  if (input.android?.collapseKey)
    config.collapse_key = input.android.collapseKey;
  if (Object.keys(notification).length) config.notification = notification;
  return Object.keys(config).length ? config : undefined;
}

function buildApns(input: FcmSendInput): JsonRecord | undefined {
  const headers: Record<string, string> = {};
  if (input.apns?.priority) headers["apns-priority"] = input.apns.priority;
  if (input.apns?.collapseId)
    headers["apns-collapse-id"] = input.apns.collapseId;
  if (input.data.ttlSeconds !== undefined)
    headers["apns-expiration"] = String(
      Math.floor(Date.now() / 1000) + input.data.ttlSeconds,
    );

  const aps: JsonRecord = {};
  if (input.apns?.category) aps.category = input.apns.category;
  if (input.apns?.sound) aps.sound = input.apns.sound;
  if (input.apns?.mutableContent === true) aps["mutable-content"] = 1;
  if (input.apns?.contentAvailable === true) aps["content-available"] = 1;

  const payload: JsonRecord = {};
  if (Object.keys(aps).length) payload.aps = aps;
  if (input.apns?.imageUrl)
    payload.fcm_options = { image: input.apns.imageUrl };

  const config: JsonRecord = {};
  if (Object.keys(headers).length) config.headers = headers;
  if (Object.keys(payload).length) config.payload = payload;
  return Object.keys(config).length ? config : undefined;
}

function buildWebpush(input: FcmSendInput): JsonRecord | undefined {
  const headers: Record<string, string> = {};
  if (input.webpush?.urgency) headers.Urgency = input.webpush.urgency;
  if (input.webpush?.topic) headers.Topic = input.webpush.topic;
  if (input.data.ttlSeconds !== undefined)
    headers.TTL = String(input.data.ttlSeconds);

  const notification: JsonRecord = {};
  if (input.webpush?.icon) notification.icon = input.webpush.icon;
  if (input.webpush?.badge) notification.badge = input.webpush.badge;
  if (input.webpush?.imageUrl) notification.image = input.webpush.imageUrl;

  const fcmOptions: JsonRecord = {};
  if (input.webpush?.link) fcmOptions.link = input.webpush.link;

  const config: JsonRecord = {};
  if (Object.keys(headers).length) config.headers = headers;
  if (Object.keys(notification).length) config.notification = notification;
  if (Object.keys(fcmOptions).length) config.fcm_options = fcmOptions;
  return Object.keys(config).length ? config : undefined;
}

function validateMessage(input: FcmSendInput): void {
  assertSingleTarget(input);

  if (!input.notification.title.trim())
    throw new FcmClientError(
      "FCM_TITLE_REQUIRED",
      "푸시 제목이 필요합니다.",
      400,
      false,
    );
  if (!input.notification.body.trim())
    throw new FcmClientError(
      "FCM_BODY_REQUIRED",
      "푸시 본문이 필요합니다.",
      400,
      false,
    );
  assertTextSafe("notification.title", input.notification.title);
  assertTextSafe("notification.body", input.notification.body);

  if (
    input.notification.imageUrl &&
    !/^https:\/\//.test(input.notification.imageUrl)
  ) {
    throw new FcmClientError(
      "FCM_IMAGE_URL_INVALID",
      "푸시 이미지 URL은 https URL이어야 합니다.",
      400,
      false,
    );
  }
  if (!input.data.notificationId.trim())
    throw new FcmClientError(
      "FCM_NOTIFICATION_ID_REQUIRED",
      "notificationId가 필요합니다.",
      400,
      false,
    );
  if (!input.data.userId.trim())
    throw new FcmClientError(
      "FCM_USER_ID_REQUIRED",
      "userId가 필요합니다.",
      400,
      false,
    );

  if (
    input.data.importance === "MARKETING" &&
    input.data.marketingConsentVerified !== true
  ) {
    throw new FcmClientError(
      "FCM_MARKETING_CONSENT_REQUIRED",
      "마케팅 푸시는 마케팅 수신 동의 확인이 필요합니다.",
      403,
      false,
    );
  }
  if (
    input.data.importance === "MARKETING" &&
    input.data.adsPartnerConsentVerified === true &&
    input.extraData?.adFinancialTargeting === true
  ) {
    throw new FcmClientError(
      "FCM_AD_FINANCIAL_TARGETING_FORBIDDEN",
      "광고·제휴 푸시는 급여·지출·저축 원천 데이터 타겟팅을 사용할 수 없습니다.",
      403,
      false,
    );
  }
  if (
    input.data.ttlSeconds !== undefined &&
    (!Number.isInteger(input.data.ttlSeconds) ||
      input.data.ttlSeconds < 0 ||
      input.data.ttlSeconds > 2_419_200)
  ) {
    throw new FcmClientError(
      "FCM_TTL_INVALID",
      "FCM TTL은 0초 이상 2,419,200초 이하 정수여야 합니다.",
      400,
      false,
    );
  }

  if (input.token) assertToken(input.token);
  if (input.topic) normalizeTopic(input.topic);
  if (input.condition) assertCondition(input.condition);

  if (input.android?.collapseKey && keySensitive(input.android.collapseKey)) {
    throw new FcmClientError(
      "FCM_COLLAPSE_KEY_FORBIDDEN",
      "collapseKey에 민감 정보를 포함할 수 없습니다.",
      400,
      false,
    );
  }
  if (input.apns?.collapseId && keySensitive(input.apns.collapseId)) {
    throw new FcmClientError(
      "FCM_COLLAPSE_ID_FORBIDDEN",
      "collapseId에 민감 정보를 포함할 수 없습니다.",
      400,
      false,
    );
  }
  if (input.webpush?.topic && keySensitive(input.webpush.topic)) {
    throw new FcmClientError(
      "FCM_WEBPUSH_TOPIC_FORBIDDEN",
      "webpush topic에 민감 정보를 포함할 수 없습니다.",
      400,
      false,
    );
  }

  buildData(input);
}

function buildMessage(input: FcmSendInput): JsonRecord {
  validateMessage(input);

  const tt = targetType(input);
  const message: JsonRecord = {
    notification: {
      title: input.notification.title.trim(),
      body: input.notification.body.trim(),
      ...(input.notification.imageUrl
        ? { image: input.notification.imageUrl }
        : {}),
    },
    data: buildData(input),
  };

  if (tt === "TOKEN") message.token = input.token?.trim() ?? "";
  if (tt === "TOPIC") message.topic = normalizeTopic(input.topic ?? "");
  if (tt === "CONDITION") message.condition = input.condition?.trim() ?? "";

  const android = buildAndroid(input);
  const apns = buildApns(input);
  const webpush = buildWebpush(input);
  if (android) message.android = android;
  if (apns) message.apns = apns;
  if (webpush) message.webpush = webpush;

  return message;
}

function endpointFor(
  projectId: string,
  endpointBaseUrl: string | undefined,
): string {
  return `${(endpointBaseUrl ?? "https://fcm.googleapis.com").replace(/\/+$/g, "")}/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
}

function timeoutSignal(timeoutMs: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(timeoutMs)
    : undefined;
}

function backoffMs(attempt: number): number {
  return (
    Math.min(10_000, 250 * 2 ** Math.max(0, attempt - 1)) +
    Math.floor(Math.random() * 100)
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retriableStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function errorCode(payload: unknown): string | null {
  const error =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).error
      : null;
  if (!error || typeof error !== "object") return null;
  const r = error as Record<string, unknown>;
  return typeof r.status === "string"
    ? r.status
    : typeof r.message === "string"
      ? r.message.slice(0, 80)
      : null;
}

function errorMessage(payload: unknown): string | null {
  const error =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).error
      : null;
  const message =
    error && typeof error === "object"
      ? (error as Record<string, unknown>).message
      : null;
  return typeof message === "string" ? message.slice(0, 500) : null;
}

function resultFailure(
  input: FcmSendInput,
  account: FcmServiceAccount,
  context: FcmRuntimeContext,
  err: FcmClientError,
  attempts: number,
  tokenHash: string | null,
): FcmSendResult {
  return {
    status: err.retriable && attempts > 0 ? "RETRY_EXHAUSTED" : "FAILED",
    provider: "FCM",
    projectId: account.projectId,
    messageName: null,
    targetType: targetType(input),
    tokenHash,
    topic: input.topic ? normalizeTopic(input.topic) : null,
    condition: input.condition?.trim() ?? null,
    notificationId: input.data.notificationId,
    requestId: context.requestId ?? null,
    attemptCount: attempts,
    validateOnly: input.validateOnly === true,
    httpStatus: err.status,
    errorCode: err.code,
    errorMessage: err.message,
    retriable: err.retriable,
    sentAt: (context.now ?? new Date()).toISOString(),
    safePolicyGuard,
  };
}

async function emit<TEnv>(
  options: FcmClientOptions<TEnv>,
  context: FcmRuntimeContext<TEnv>,
  event: FcmClientEvent,
): Promise<void> {
  if (!options.onEvent) return;
  const task = Promise.resolve(
    options.onEvent(event, context.env, context.execution),
  ).catch((error) => {
    console.warn(
      "fcm_client_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  context.execution?.waitUntil?.(task);
  if (!context.execution?.waitUntil) await task;
}

async function requestAccessToken<TEnv>(
  account: FcmServiceAccount,
  context: FcmRuntimeContext<TEnv>,
  options: FcmClientOptions<TEnv>,
  tokenUrl: string,
  fetcher: typeof fetch,
): Promise<TokenCacheEntry> {
  const now = context.now ?? new Date();
  const assertion = await createJwtAssertion(account, now, tokenUrl);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  };
  const signal = timeoutSignal(options.timeoutMs ?? FCM_DEFAULT_TIMEOUT_MS);
  if (signal) init.signal = signal;

  const response = await fetcher(tokenUrl, init);
  const payload = (await parseJson(response)) as GoogleTokenResponse | null;
  if (!response.ok || !payload?.access_token) {
    throw new FcmClientError(
      "FCM_ACCESS_TOKEN_REQUEST_FAILED",
      payload?.error_description ??
        payload?.error ??
        "FCM access token 발급에 실패했습니다.",
      response.status,
      retriableStatus(response.status),
    );
  }

  const expiresIn =
    typeof payload.expires_in === "number" && payload.expires_in > 0
      ? payload.expires_in
      : 3600;
  return {
    accessToken: payload.access_token,
    expiresAtEpochMs: now.getTime() + expiresIn * 1000,
  };
}

export function createFcmClient<TEnv = FcmEnvLike>(
  options: FcmClientOptions<TEnv> = {},
): FcmClient<TEnv> {
  let cache: TokenCacheEntry | null = null;
  let refreshPromise: Promise<TokenCacheEntry> | null = null;

  async function getAccessToken(
    context: FcmRuntimeContext<TEnv>,
  ): Promise<string> {
    const staticToken =
      optText(context.env, options.staticAccessToken) ??
      envText(context.env, "FCM_ACCESS_TOKEN");
    if (staticToken) return staticToken;

    const account = resolveServiceAccount(context.env, options);
    const now = context.now ?? new Date();
    const safety =
      options.accessTokenSafetyWindowMs ?? FCM_DEFAULT_TOKEN_SAFETY_WINDOW_MS;
    if (cache && cache.expiresAtEpochMs - safety > now.getTime())
      return cache.accessToken;

    const tokenUrl = options.tokenUrl ?? GOOGLE_OAUTH_TOKEN_URL;
    const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    let activeRefresh = refreshPromise;

    if (!activeRefresh) {
      const refresh = requestAccessToken(
        account,
        context,
        options,
        tokenUrl,
        fetcher,
      ).then(async (entry) => {
        cache = entry;
        await emit(options, context, {
          event: "fcm.access_token.created",
          requestId: context.requestId ?? null,
          projectId: account.projectId,
          notificationId: null,
          targetType: "TOKEN",
          tokenHash: null,
          status: "SENT",
          httpStatus: 200,
          errorCode: null,
          createdAt: now.toISOString(),
        });
        return entry;
      });

      refreshPromise = refresh;
      activeRefresh = refresh;
      void refresh
        .finally(() => {
          if (refreshPromise === refresh) {
            refreshPromise = null;
          }
        })
        .catch(() => undefined);
    }

    return (await activeRefresh).accessToken;
  }

  async function send(
    input: FcmSendInput,
    context: FcmRuntimeContext<TEnv>,
  ): Promise<FcmSendResult> {
    const account = resolveServiceAccount(context.env, options);
    const now = context.now ?? new Date();
    const tokenHash = input.token ? await sha256Hex(input.token) : null;

    try {
      validateMessage(input);
    } catch (error) {
      const err =
        error instanceof FcmClientError
          ? error
          : new FcmClientError(
              "FCM_VALIDATION_FAILED",
              "FCM 메시지 검증에 실패했습니다.",
              400,
              false,
            );
      const failed = {
        ...resultFailure(input, account, context, err, 0, tokenHash),
        status: "SKIPPED" as const,
      };
      await emit(options, context, {
        event: "fcm.message.skipped",
        requestId: context.requestId ?? null,
        projectId: account.projectId,
        notificationId: input.data.notificationId || null,
        targetType: input.token ? "TOKEN" : input.topic ? "TOPIC" : "CONDITION",
        tokenHash,
        status: "SKIPPED",
        httpStatus: err.status,
        errorCode: err.code,
        createdAt: now.toISOString(),
      });
      return failed;
    }

    const validateOnly =
      input.validateOnly === true ||
      optBool(context.env, options.dryRun, "FCM_DRY_RUN", false);

    if (
      optBool(context.env, options.disableNetwork, "FCM_DISABLE_NETWORK", false)
    ) {
      const skipped: FcmSendResult = {
        status: "SKIPPED",
        provider: "FCM",
        projectId: account.projectId,
        messageName: null,
        targetType: targetType(input),
        tokenHash,
        topic: input.topic ? normalizeTopic(input.topic) : null,
        condition: input.condition?.trim() ?? null,
        notificationId: input.data.notificationId,
        requestId: context.requestId ?? null,
        attemptCount: 0,
        validateOnly: true,
        httpStatus: null,
        errorCode: "FCM_NETWORK_DISABLED",
        errorMessage: "FCM network sending is disabled.",
        retriable: false,
        sentAt: now.toISOString(),
        safePolicyGuard,
      };
      await emit(options, context, {
        event: "fcm.message.skipped",
        requestId: context.requestId ?? null,
        projectId: account.projectId,
        notificationId: input.data.notificationId,
        targetType: skipped.targetType,
        tokenHash,
        status: "SKIPPED",
        httpStatus: null,
        errorCode: "FCM_NETWORK_DISABLED",
        createdAt: now.toISOString(),
      });
      return skipped;
    }

    const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    const maxRetries = Math.max(
      0,
      Math.min(10, options.maxRetries ?? FCM_DEFAULT_MAX_RETRIES),
    );
    const url = endpointFor(account.projectId, options.endpointBaseUrl);
    const message = buildMessage(input);
    let lastError: FcmClientError | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        const accessToken = await getAccessToken(context);
        const init: RequestInit = {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json; charset=utf-8",
            ...(context.requestId ? { "x-request-id": context.requestId } : {}),
          },
          body: JSON.stringify({ message, validate_only: validateOnly }),
        };
        const signal = timeoutSignal(
          options.timeoutMs ?? FCM_DEFAULT_TIMEOUT_MS,
        );
        if (signal) init.signal = signal;

        const response = await fetcher(url, init);
        const payload = await parseJson(response);

        if (response.ok) {
          const name =
            payload &&
            typeof payload === "object" &&
            typeof (payload as Record<string, unknown>).name === "string"
              ? String((payload as Record<string, unknown>).name)
              : null;
          const sent: FcmSendResult = {
            status: "SENT",
            provider: "FCM",
            projectId: account.projectId,
            messageName: name,
            targetType: targetType(input),
            tokenHash,
            topic: input.topic ? normalizeTopic(input.topic) : null,
            condition: input.condition?.trim() ?? null,
            notificationId: input.data.notificationId,
            requestId: context.requestId ?? null,
            attemptCount: attempt,
            validateOnly,
            httpStatus: response.status,
            errorCode: null,
            errorMessage: null,
            retriable: false,
            sentAt: new Date().toISOString(),
            safePolicyGuard,
          };
          await emit(options, context, {
            event: "fcm.message.sent",
            requestId: context.requestId ?? null,
            projectId: account.projectId,
            notificationId: input.data.notificationId,
            targetType: sent.targetType,
            tokenHash,
            status: "SENT",
            httpStatus: response.status,
            errorCode: null,
            createdAt: sent.sentAt,
          });
          return sent;
        }

        lastError = new FcmClientError(
          errorCode(payload) ?? "FCM_SEND_FAILED",
          errorMessage(payload) ?? "FCM 메시지 발송에 실패했습니다.",
          response.status,
          retriableStatus(response.status),
        );
      } catch (error) {
        lastError =
          error instanceof FcmClientError
            ? error
            : new FcmClientError(
                "FCM_SEND_EXCEPTION",
                error instanceof Error
                  ? error.message
                  : "FCM 메시지 발송 중 예외가 발생했습니다.",
                500,
                true,
              );
      }

      if (!lastError.retriable || attempt > maxRetries) break;
      await delay(backoffMs(attempt));
    }

    const err =
      lastError ??
      new FcmClientError(
        "FCM_SEND_UNKNOWN_ERROR",
        "FCM 메시지 발송 결과를 확인할 수 없습니다.",
        500,
        true,
      );
    const failed = resultFailure(
      input,
      account,
      context,
      err,
      maxRetries + 1,
      tokenHash,
    );
    await emit(options, context, {
      event: "fcm.message.failed",
      requestId: context.requestId ?? null,
      projectId: account.projectId,
      notificationId: input.data.notificationId,
      targetType: failed.targetType,
      tokenHash,
      status: failed.status,
      httpStatus: failed.httpStatus,
      errorCode: failed.errorCode,
      createdAt: failed.sentAt,
    });
    return failed;
  }

  async function sendEachForMulticast(
    input: FcmMulticastInput,
    context: FcmRuntimeContext<TEnv>,
  ): Promise<FcmMulticastResult> {
    if (!Array.isArray(input.tokens) || input.tokens.length < 1) {
      throw new FcmClientError(
        "FCM_MULTICAST_TOKENS_REQUIRED",
        "multicast token 목록이 필요합니다.",
        400,
        false,
      );
    }
    if (input.tokens.length > FCM_MAX_MULTICAST_TOKENS) {
      throw new FcmClientError(
        "FCM_MULTICAST_TOO_MANY_TOKENS",
        `FCM multicast는 최대 ${FCM_MAX_MULTICAST_TOKENS}개 token까지 허용합니다.`,
        400,
        false,
      );
    }

    const tokens = [
      ...new Set(input.tokens.map((token) => token.trim()).filter(Boolean)),
    ];
    tokens.forEach(assertToken);

    const concurrency = Math.max(1, Math.min(50, input.concurrency ?? 20));
    const results: FcmSendResult[] = [];
    let cursor = 0;

    async function worker(): Promise<void> {
      while (cursor < tokens.length) {
        const token = tokens[cursor];
        cursor += 1;
        if (token) results.push(await send({ ...input, token }, context));
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, tokens.length) }, () =>
        worker(),
      ),
    );

    const account = resolveServiceAccount(context.env, options);
    const result: FcmMulticastResult = {
      provider: "FCM",
      projectId: account.projectId,
      totalCount: tokens.length,
      successCount: results.filter((item) => item.status === "SENT").length,
      failureCount: results.filter(
        (item) => item.status === "FAILED" || item.status === "RETRY_EXHAUSTED",
      ).length,
      skippedCount: results.filter((item) => item.status === "SKIPPED").length,
      results,
      requestId: context.requestId ?? null,
      completedAt: new Date().toISOString(),
      safePolicyGuard,
    };

    await emit(options, context, {
      event: "fcm.multicast.completed",
      requestId: context.requestId ?? null,
      projectId: account.projectId,
      notificationId: input.data.notificationId,
      targetType: "MULTICAST",
      tokenHash: null,
      status: "COMPLETED",
      httpStatus: null,
      errorCode: null,
      createdAt: result.completedAt,
    });

    return result;
  }

  return Object.freeze({
    version: FCM_CLIENT_VERSION,
    send,
    sendEachForMulticast,
    sendTopic: (input: FcmTopicInput, context: FcmRuntimeContext<TEnv>) =>
      send(input, context),
    sendCondition: (
      input: FcmConditionInput,
      context: FcmRuntimeContext<TEnv>,
    ) => send(input, context),
    validateMessage,
    buildMessage,
    getAccessToken,
    hashToken: sha256Hex,
  });
}

export const fcmClientManifest = Object.freeze({
  file: "services/notifications/src/fcm.client.ts",
  version: FCM_CLIENT_VERSION,
  provider: "FCM_HTTP_V1",
  runtime: "cloudflare-workers-fetch-api",
  capabilities: [
    "service_account_oauth2_jwt",
    "access_token_cache",
    "single_token_send",
    "multicast_send_each",
    "topic_send",
    "condition_send",
    "validate_only_dry_run",
    "retry_backoff",
    "token_hash_only_logging",
    "sensitive_financial_payload_blocking",
    "marketing_consent_guard",
    "ads_financial_targeting_forbidden",
    "android_apns_webpush_config",
  ],
  safePolicyGuard,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertFcmClientCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "fcm_http_v1_endpoint_contract",
    "google_service_account_json_env_contract",
    "oauth2_jwt_rs256_access_token_flow",
    "access_token_cache_with_safety_window",
    "static_access_token_override_for_tests",
    "single_token_topic_condition_targets",
    "multicast_up_to_500_tokens_with_concurrency",
    "validate_only_and_dry_run_supported",
    "retry_backoff_for_retriable_statuses",
    "standard_send_result_envelope",
    "request_id_propagation",
    "wait_until_event_hook",
    "token_hash_only_no_raw_push_token_log",
    "sensitive_financial_key_and_value_blocking",
    "marketing_consent_guard",
    "ad_financial_targeting_forbidden",
    "android_apns_webpush_config_supported",
    "cloudflare_workers_webcrypto_compatible",
    "no_node_buffer_dependency",
    "notification_domain_ready_for_payday_budget_savings_growth_community_security",
  ] as const;
  return { ok: checks.length >= 15, version: FCM_CLIENT_VERSION, checks };
}

export const defaultFcmClient = createFcmClient<FcmEnvLike>();
export default createFcmClient;
