/**
 * packages/api-contract/src/common/error-code.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Common Error Code Contract
 *
 * 파일 목적:
 * - 모바일 앱, 관리자 콘솔, API, 알림 worker, scheduler, QA/E2E가 공유하는 표준 오류 코드를 정의한다.
 * - 인증/인가, 검증, 서버 권위 금액 계산, DB/RLS/RBAC, 보안/개인정보, 커뮤니티, 알림, 광고/제휴, 운영/배포 오류를 하나의 계약으로 통합한다.
 * - 사용자에게 노출 가능한 메시지와 내부 추적용 context를 분리한다.
 * - 급여액, 지출액, 저축액, 예산, 납치금액, token, secret, raw PII가 오류 payload에 섞이지 않도록 schema 레벨에서 제한한다.
 */

import { z } from "zod";

/* -----------------------------------------------------------------------------
 * 1. Contract metadata
 * -------------------------------------------------------------------------- */

export const ERROR_CODE_CONTRACT_VERSION = "1.0.0" as const;
export const ERROR_CODE_TIMEZONE = "Asia/Seoul" as const;
export const ERROR_CODE_LOCALE = "ko-KR" as const;

/* -----------------------------------------------------------------------------
 * 2. Primitive schemas
 * -------------------------------------------------------------------------- */

export const ErrorRequestIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Traceable request id. Must not include PII.");

export const ErrorTraceIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Trace id for observability. Must not include PII.");

export const ErrorFieldPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_.[\]-]+$/)
  .describe("Safe field path for validation errors.");

export const ErrorMessageSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .describe("Sanitized user-facing or developer-facing message.");

export const ErrorSafeDetailSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .describe(
    "Sanitized detail. No token, secret, raw PII or raw financial data.",
  );

export const IsoDateTimeWithOffsetSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO-8601 datetime with timezone offset.");

export const HttpStatusCodeSchema = z.number().int().min(100).max(599);

/* -----------------------------------------------------------------------------
 * 3. Category, severity, actor and retry schemas
 * -------------------------------------------------------------------------- */

export const ErrorCategorySchema = z.enum([
  "SYSTEM",
  "VALIDATION",
  "AUTH",
  "RBAC",
  "SECURITY",
  "DATABASE",
  "PAYROLL",
  "BUDGET",
  "EXPENSE",
  "SAVING",
  "NOTIFICATION",
  "GROWTH",
  "COMMUNITY",
  "ADMIN",
  "ADS_PARTNER",
  "OPERATIONS",
]);

export const ErrorSeveritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const ErrorActorSchema = z.enum([
  "USER",
  "ADMIN",
  "SYSTEM",
  "SCHEDULER",
  "NOTIFICATION_WORKER",
  "PARTNER",
  "UNKNOWN",
]);

export const ErrorRetryPolicySchema = z.enum([
  "DO_NOT_RETRY",
  "RETRY_IMMEDIATELY",
  "RETRY_WITH_BACKOFF",
  "REAUTHENTICATE",
  "REFRESH_TOKEN",
  "CONTACT_SUPPORT",
]);

export const ErrorVisibilitySchema = z.enum([
  "PUBLIC_SAFE",
  "PRIVATE_SAFE",
  "SECURITY_PRIVATE",
]);

export const ErrorSourceSchema = z.enum([
  "mobile",
  "admin",
  "api",
  "notifications",
  "scheduler",
  "database",
  "ci",
  "release",
  "unknown",
]);

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;
export type ErrorActor = z.infer<typeof ErrorActorSchema>;
export type ErrorRetryPolicy = z.infer<typeof ErrorRetryPolicySchema>;
export type ErrorVisibility = z.infer<typeof ErrorVisibilitySchema>;
export type ErrorSource = z.infer<typeof ErrorSourceSchema>;

/* -----------------------------------------------------------------------------
 * 4. Error code groups
 * -------------------------------------------------------------------------- */

export const SYSTEM_ERROR_CODES = [
  "SYSTEM_INTERNAL_ERROR",
  "SYSTEM_SERVICE_UNAVAILABLE",
  "SYSTEM_MAINTENANCE_MODE",
  "SYSTEM_REQUEST_TIMEOUT",
  "SYSTEM_CONFIGURATION_ERROR",
  "SYSTEM_UPSTREAM_SERVICE_ERROR",
] as const;

export const VALIDATION_ERROR_CODES = [
  "VALIDATION_FAILED",
  "VALIDATION_INVALID_REQUEST_BODY",
  "VALIDATION_INVALID_QUERY",
  "VALIDATION_INVALID_PARAM",
  "VALIDATION_INVALID_DATE_RANGE",
  "VALIDATION_INVALID_PAGINATION_CURSOR",
  "VALIDATION_UNSUPPORTED_LOCALE",
  "VALIDATION_UNSUPPORTED_TIMEZONE",
  "VALIDATION_UNSUPPORTED_CURRENCY",
  "VALIDATION_IDEMPOTENCY_KEY_REQUIRED",
  "VALIDATION_IDEMPOTENCY_KEY_CONFLICT",
] as const;

export const AUTH_ERROR_CODES = [
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_EMAIL_ALREADY_EXISTS",
  "AUTH_EMAIL_NOT_VERIFIED",
  "AUTH_ACCOUNT_SUSPENDED",
  "AUTH_ACCOUNT_WITHDRAWN",
  "AUTH_PROVIDER_NOT_SUPPORTED",
  "AUTH_PROVIDER_STATE_MISMATCH",
  "AUTH_PROVIDER_CODE_INVALID",
  "AUTH_TOKEN_MISSING",
  "AUTH_TOKEN_INVALID",
  "AUTH_TOKEN_EXPIRED",
  "AUTH_REFRESH_TOKEN_REUSED",
  "AUTH_SESSION_NOT_FOUND",
  "AUTH_SESSION_REVOKED",
  "AUTH_DEVICE_NOT_TRUSTED",
  "AUTH_MFA_REQUIRED",
  "AUTH_MFA_INVALID",
  "AUTH_CONSENT_REQUIRED",
  "AUTH_PASSWORD_POLICY_FAILED",
  "AUTH_RATE_LIMITED",
] as const;

export const RBAC_ERROR_CODES = [
  "RBAC_FORBIDDEN",
  "RBAC_ADMIN_FORBIDDEN",
  "RBAC_OWNER_REQUIRED",
  "RBAC_MODERATOR_REQUIRED",
  "RBAC_AUDIT_REASON_REQUIRED",
  "RBAC_PERMISSION_NOT_ASSIGNED",
] as const;

export const SECURITY_ERROR_CODES = [
  "SECURITY_POLICY_VIOLATION",
  "SECURITY_RATE_LIMITED",
  "SECURITY_CSRF_FAILED",
  "SECURITY_CORS_ORIGIN_DENIED",
  "SECURITY_PAYLOAD_TOO_LARGE",
  "SECURITY_FILE_TYPE_NOT_ALLOWED",
  "SECURITY_FILE_SIZE_EXCEEDED",
  "SECURITY_MALWARE_SCAN_FAILED",
  "SECURITY_SECRET_EXPOSURE_DETECTED",
  "SECURITY_RAW_FINANCIAL_DATA_BLOCKED",
  "SECURITY_PII_EXPOSURE_BLOCKED",
  "SECURITY_AD_FINANCIAL_JOIN_BLOCKED",
  "SECURITY_AUDIT_LOG_REQUIRED",
] as const;

export const DATABASE_ERROR_CODES = [
  "DATABASE_CONNECTION_FAILED",
  "DATABASE_TRANSACTION_FAILED",
  "DATABASE_CONSTRAINT_VIOLATION",
  "DATABASE_NOT_FOUND",
  "DATABASE_CONFLICT",
  "DATABASE_RLS_DENIED",
  "DATABASE_MIGRATION_REQUIRED",
  "DATABASE_READONLY_MODE",
  "DATABASE_BACKUP_REQUIRED",
  "DATABASE_RESTORE_CHECK_REQUIRED",
] as const;

export const PAYROLL_ERROR_CODES = [
  "PAYROLL_PLAN_NOT_FOUND",
  "PAYROLL_AMOUNT_INVALID",
  "PAYROLL_PAYDAY_INVALID",
  "PAYROLL_CYCLE_INVALID",
  "PAYROLL_CALCULATION_FAILED",
  "PAYROLL_SNAPSHOT_FAILED",
  "PAYROLL_SERVER_AUTHORITY_REQUIRED",
  "PAYROLL_HIJACK_AMOUNT_CLAMPED",
] as const;

export const BUDGET_ERROR_CODES = [
  "BUDGET_DAILY_NOT_FOUND",
  "BUDGET_DAILY_ALREADY_EXISTS",
  "BUDGET_AMOUNT_INVALID",
  "BUDGET_DATE_OUT_OF_RANGE",
  "BUDGET_OVER_AMOUNT_DETECTED",
  "BUDGET_RECALCULATION_REQUIRED",
] as const;

export const EXPENSE_ERROR_CODES = [
  "EXPENSE_VARIABLE_NOT_FOUND",
  "EXPENSE_VARIABLE_AMOUNT_INVALID",
  "EXPENSE_VARIABLE_DUPLICATE",
  "EXPENSE_VARIABLE_DATE_INVALID",
  "EXPENSE_FIXED_NOT_FOUND",
  "EXPENSE_FIXED_AMOUNT_INVALID",
  "EXPENSE_FIXED_SCHEDULE_INVALID",
  "EXPENSE_CATEGORY_INVALID",
] as const;

export const SAVING_ERROR_CODES = [
  "SAVING_FIXED_NOT_FOUND",
  "SAVING_FIXED_AMOUNT_INVALID",
  "SAVING_FIXED_SCHEDULE_INVALID",
  "SAVING_GOAL_INVALID",
] as const;

export const NOTIFICATION_ERROR_CODES = [
  "NOTIFICATION_NOT_FOUND",
  "NOTIFICATION_TEMPLATE_INVALID",
  "NOTIFICATION_PUSH_TOKEN_INVALID",
  "NOTIFICATION_PUSH_SEND_FAILED",
  "NOTIFICATION_OPT_OUT",
  "NOTIFICATION_RATE_LIMITED",
  "NOTIFICATION_QUEUE_FAILED",
] as const;

export const GROWTH_ERROR_CODES = [
  "GROWTH_TASK_NOT_FOUND",
  "GROWTH_TASK_ALREADY_COMPLETED",
  "GROWTH_DAILY_LIMIT_EXCEEDED",
  "GROWTH_CATEGORY_DISABLED",
  "GROWTH_REWARD_POLICY_INVALID",
] as const;

export const COMMUNITY_ERROR_CODES = [
  "COMMUNITY_POST_NOT_FOUND",
  "COMMUNITY_COMMENT_NOT_FOUND",
  "COMMUNITY_WRITE_BLOCKED",
  "COMMUNITY_REPORT_REQUIRED",
  "COMMUNITY_CONTENT_POLICY_VIOLATION",
  "COMMUNITY_ANONYMOUS_OWNER_PROTECTED",
  "COMMUNITY_MODERATION_REQUIRED",
  "COMMUNITY_ATTACHMENT_INVALID",
] as const;

export const ADMIN_ERROR_CODES = [
  "ADMIN_RESOURCE_NOT_FOUND",
  "ADMIN_ACTION_FORBIDDEN",
  "ADMIN_AUDIT_LOG_FAILED",
  "ADMIN_APPROVAL_REQUIRED",
  "ADMIN_INCIDENT_REQUIRED",
  "ADMIN_DASHBOARD_UNAVAILABLE",
] as const;

export const ADS_PARTNER_ERROR_CODES = [
  "ADS_CAMPAIGN_NOT_FOUND",
  "ADS_PLACEMENT_DISABLED",
  "ADS_CONSENT_REQUIRED",
  "ADS_EVENT_REJECTED",
  "ADS_RAW_FINANCIAL_DATA_REJECTED",
  "PARTNER_ACCOUNT_NOT_FOUND",
  "PARTNER_CONTRACT_INACTIVE",
  "PARTNER_WEBHOOK_INVALID",
  "PARTNER_RATE_LIMITED",
] as const;

export const OPERATIONS_ERROR_CODES = [
  "OPERATIONS_RELEASE_GATE_FAILED",
  "OPERATIONS_DEPLOYMENT_BLOCKED",
  "OPERATIONS_BACKUP_REQUIRED",
  "OPERATIONS_RESTORE_REHEARSAL_REQUIRED",
  "OPERATIONS_OBSERVABILITY_EVENT_FAILED",
  "OPERATIONS_INCIDENT_OPEN",
] as const;

export const ERROR_CODES = [
  ...SYSTEM_ERROR_CODES,
  ...VALIDATION_ERROR_CODES,
  ...AUTH_ERROR_CODES,
  ...RBAC_ERROR_CODES,
  ...SECURITY_ERROR_CODES,
  ...DATABASE_ERROR_CODES,
  ...PAYROLL_ERROR_CODES,
  ...BUDGET_ERROR_CODES,
  ...EXPENSE_ERROR_CODES,
  ...SAVING_ERROR_CODES,
  ...NOTIFICATION_ERROR_CODES,
  ...GROWTH_ERROR_CODES,
  ...COMMUNITY_ERROR_CODES,
  ...ADMIN_ERROR_CODES,
  ...ADS_PARTNER_ERROR_CODES,
  ...OPERATIONS_ERROR_CODES,
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/* -----------------------------------------------------------------------------
 * 5. Category mapping
 * -------------------------------------------------------------------------- */

const mapCodesToCategory = <TCode extends readonly ErrorCode[]>(
  codes: TCode,
  category: ErrorCategory,
): ReadonlyArray<readonly [TCode[number], ErrorCategory]> =>
  codes.map((code) => [code, category] as const);

export const ERROR_CATEGORY_BY_CODE = Object.freeze(
  Object.fromEntries([
    ...mapCodesToCategory(SYSTEM_ERROR_CODES, "SYSTEM"),
    ...mapCodesToCategory(VALIDATION_ERROR_CODES, "VALIDATION"),
    ...mapCodesToCategory(AUTH_ERROR_CODES, "AUTH"),
    ...mapCodesToCategory(RBAC_ERROR_CODES, "RBAC"),
    ...mapCodesToCategory(SECURITY_ERROR_CODES, "SECURITY"),
    ...mapCodesToCategory(DATABASE_ERROR_CODES, "DATABASE"),
    ...mapCodesToCategory(PAYROLL_ERROR_CODES, "PAYROLL"),
    ...mapCodesToCategory(BUDGET_ERROR_CODES, "BUDGET"),
    ...mapCodesToCategory(EXPENSE_ERROR_CODES, "EXPENSE"),
    ...mapCodesToCategory(SAVING_ERROR_CODES, "SAVING"),
    ...mapCodesToCategory(NOTIFICATION_ERROR_CODES, "NOTIFICATION"),
    ...mapCodesToCategory(GROWTH_ERROR_CODES, "GROWTH"),
    ...mapCodesToCategory(COMMUNITY_ERROR_CODES, "COMMUNITY"),
    ...mapCodesToCategory(ADMIN_ERROR_CODES, "ADMIN"),
    ...mapCodesToCategory(ADS_PARTNER_ERROR_CODES, "ADS_PARTNER"),
    ...mapCodesToCategory(OPERATIONS_ERROR_CODES, "OPERATIONS"),
  ]),
) as Readonly<Record<ErrorCode, ErrorCategory>>;

/* -----------------------------------------------------------------------------
 * 6. HTTP status mapping
 * -------------------------------------------------------------------------- */

export const DEFAULT_HTTP_STATUS_BY_CATEGORY = Object.freeze({
  SYSTEM: 500,
  VALIDATION: 400,
  AUTH: 401,
  RBAC: 403,
  SECURITY: 403,
  DATABASE: 500,
  PAYROLL: 422,
  BUDGET: 422,
  EXPENSE: 422,
  SAVING: 422,
  NOTIFICATION: 502,
  GROWTH: 422,
  COMMUNITY: 422,
  ADMIN: 403,
  ADS_PARTNER: 422,
  OPERATIONS: 503,
} satisfies Record<ErrorCategory, number>);

export const HTTP_STATUS_OVERRIDE_BY_CODE: Readonly<
  Partial<Record<ErrorCode, number>>
> = Object.freeze({
  SYSTEM_MAINTENANCE_MODE: 503,
  SYSTEM_SERVICE_UNAVAILABLE: 503,
  SYSTEM_REQUEST_TIMEOUT: 504,
  VALIDATION_IDEMPOTENCY_KEY_CONFLICT: 409,
  AUTH_EMAIL_ALREADY_EXISTS: 409,
  AUTH_TOKEN_MISSING: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_SESSION_NOT_FOUND: 401,
  AUTH_SESSION_REVOKED: 401,
  AUTH_CONSENT_REQUIRED: 428,
  AUTH_RATE_LIMITED: 429,
  RBAC_FORBIDDEN: 403,
  SECURITY_RATE_LIMITED: 429,
  SECURITY_PAYLOAD_TOO_LARGE: 413,
  DATABASE_NOT_FOUND: 404,
  DATABASE_CONFLICT: 409,
  DATABASE_READONLY_MODE: 503,
  PAYROLL_PLAN_NOT_FOUND: 404,
  BUDGET_DAILY_NOT_FOUND: 404,
  EXPENSE_VARIABLE_NOT_FOUND: 404,
  EXPENSE_FIXED_NOT_FOUND: 404,
  SAVING_FIXED_NOT_FOUND: 404,
  NOTIFICATION_NOT_FOUND: 404,
  NOTIFICATION_OPT_OUT: 409,
  NOTIFICATION_RATE_LIMITED: 429,
  GROWTH_TASK_NOT_FOUND: 404,
  GROWTH_TASK_ALREADY_COMPLETED: 409,
  COMMUNITY_POST_NOT_FOUND: 404,
  COMMUNITY_COMMENT_NOT_FOUND: 404,
  COMMUNITY_WRITE_BLOCKED: 403,
  ADMIN_RESOURCE_NOT_FOUND: 404,
  ADS_CAMPAIGN_NOT_FOUND: 404,
  PARTNER_ACCOUNT_NOT_FOUND: 404,
  PARTNER_RATE_LIMITED: 429,
  OPERATIONS_INCIDENT_OPEN: 503,
});

/* -----------------------------------------------------------------------------
 * 7. Severity mapping
 * -------------------------------------------------------------------------- */

export const DEFAULT_SEVERITY_BY_CATEGORY = Object.freeze({
  SYSTEM: "HIGH",
  VALIDATION: "LOW",
  AUTH: "MEDIUM",
  RBAC: "HIGH",
  SECURITY: "HIGH",
  DATABASE: "HIGH",
  PAYROLL: "HIGH",
  BUDGET: "MEDIUM",
  EXPENSE: "MEDIUM",
  SAVING: "MEDIUM",
  NOTIFICATION: "MEDIUM",
  GROWTH: "LOW",
  COMMUNITY: "MEDIUM",
  ADMIN: "HIGH",
  ADS_PARTNER: "HIGH",
  OPERATIONS: "HIGH",
} satisfies Record<ErrorCategory, ErrorSeverity>);

export const SEVERITY_OVERRIDE_BY_CODE: Readonly<
  Partial<Record<ErrorCode, ErrorSeverity>>
> = Object.freeze({
  SYSTEM_INTERNAL_ERROR: "CRITICAL",
  SYSTEM_CONFIGURATION_ERROR: "CRITICAL",
  AUTH_REFRESH_TOKEN_REUSED: "CRITICAL",
  RBAC_ADMIN_FORBIDDEN: "CRITICAL",
  SECURITY_SECRET_EXPOSURE_DETECTED: "CRITICAL",
  SECURITY_RAW_FINANCIAL_DATA_BLOCKED: "CRITICAL",
  SECURITY_PII_EXPOSURE_BLOCKED: "CRITICAL",
  SECURITY_AD_FINANCIAL_JOIN_BLOCKED: "CRITICAL",
  DATABASE_RLS_DENIED: "CRITICAL",
  DATABASE_MIGRATION_REQUIRED: "CRITICAL",
  PAYROLL_CALCULATION_FAILED: "CRITICAL",
  PAYROLL_SERVER_AUTHORITY_REQUIRED: "CRITICAL",
  PAYROLL_HIJACK_AMOUNT_CLAMPED: "HIGH",
  ADS_RAW_FINANCIAL_DATA_REJECTED: "CRITICAL",
  OPERATIONS_RELEASE_GATE_FAILED: "CRITICAL",
  OPERATIONS_DEPLOYMENT_BLOCKED: "CRITICAL",
});

/* -----------------------------------------------------------------------------
 * 8. Retry policy and visibility mapping
 * -------------------------------------------------------------------------- */

export const DEFAULT_RETRY_POLICY_BY_CATEGORY = Object.freeze({
  SYSTEM: "RETRY_WITH_BACKOFF",
  VALIDATION: "DO_NOT_RETRY",
  AUTH: "REAUTHENTICATE",
  RBAC: "DO_NOT_RETRY",
  SECURITY: "DO_NOT_RETRY",
  DATABASE: "RETRY_WITH_BACKOFF",
  PAYROLL: "DO_NOT_RETRY",
  BUDGET: "DO_NOT_RETRY",
  EXPENSE: "DO_NOT_RETRY",
  SAVING: "DO_NOT_RETRY",
  NOTIFICATION: "RETRY_WITH_BACKOFF",
  GROWTH: "DO_NOT_RETRY",
  COMMUNITY: "DO_NOT_RETRY",
  ADMIN: "DO_NOT_RETRY",
  ADS_PARTNER: "DO_NOT_RETRY",
  OPERATIONS: "CONTACT_SUPPORT",
} satisfies Record<ErrorCategory, ErrorRetryPolicy>);

export const RETRY_POLICY_OVERRIDE_BY_CODE: Readonly<
  Partial<Record<ErrorCode, ErrorRetryPolicy>>
> = Object.freeze({
  AUTH_TOKEN_EXPIRED: "REFRESH_TOKEN",
  AUTH_MFA_REQUIRED: "REAUTHENTICATE",
  AUTH_CONSENT_REQUIRED: "DO_NOT_RETRY",
  AUTH_RATE_LIMITED: "RETRY_WITH_BACKOFF",
  SECURITY_RATE_LIMITED: "RETRY_WITH_BACKOFF",
  SYSTEM_MAINTENANCE_MODE: "RETRY_WITH_BACKOFF",
  SYSTEM_REQUEST_TIMEOUT: "RETRY_WITH_BACKOFF",
  DATABASE_READONLY_MODE: "RETRY_WITH_BACKOFF",
  NOTIFICATION_PUSH_SEND_FAILED: "RETRY_WITH_BACKOFF",
  NOTIFICATION_QUEUE_FAILED: "RETRY_WITH_BACKOFF",
  PARTNER_RATE_LIMITED: "RETRY_WITH_BACKOFF",
});

export const DEFAULT_VISIBILITY_BY_CATEGORY = Object.freeze({
  SYSTEM: "PRIVATE_SAFE",
  VALIDATION: "PUBLIC_SAFE",
  AUTH: "PUBLIC_SAFE",
  RBAC: "PUBLIC_SAFE",
  SECURITY: "SECURITY_PRIVATE",
  DATABASE: "PRIVATE_SAFE",
  PAYROLL: "PUBLIC_SAFE",
  BUDGET: "PUBLIC_SAFE",
  EXPENSE: "PUBLIC_SAFE",
  SAVING: "PUBLIC_SAFE",
  NOTIFICATION: "PRIVATE_SAFE",
  GROWTH: "PUBLIC_SAFE",
  COMMUNITY: "PUBLIC_SAFE",
  ADMIN: "PRIVATE_SAFE",
  ADS_PARTNER: "PRIVATE_SAFE",
  OPERATIONS: "PRIVATE_SAFE",
} satisfies Record<ErrorCategory, ErrorVisibility>);

export const VISIBILITY_OVERRIDE_BY_CODE: Readonly<
  Partial<Record<ErrorCode, ErrorVisibility>>
> = Object.freeze({
  SECURITY_SECRET_EXPOSURE_DETECTED: "SECURITY_PRIVATE",
  SECURITY_RAW_FINANCIAL_DATA_BLOCKED: "SECURITY_PRIVATE",
  SECURITY_PII_EXPOSURE_BLOCKED: "SECURITY_PRIVATE",
  SECURITY_AD_FINANCIAL_JOIN_BLOCKED: "SECURITY_PRIVATE",
  DATABASE_RLS_DENIED: "SECURITY_PRIVATE",
  AUTH_REFRESH_TOKEN_REUSED: "SECURITY_PRIVATE",
  ADS_RAW_FINANCIAL_DATA_REJECTED: "SECURITY_PRIVATE",
});

/* -----------------------------------------------------------------------------
 * 9. Safe public messages
 * -------------------------------------------------------------------------- */

export const DEFAULT_PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  SYSTEM: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  VALIDATION: "입력값을 다시 확인해주세요.",
  AUTH: "인증 정보가 올바르지 않습니다.",
  RBAC: "요청한 작업을 수행할 권한이 없습니다.",
  SECURITY: "보안 정책에 따라 요청이 차단되었습니다.",
  DATABASE: "데이터 처리 중 오류가 발생했습니다.",
  PAYROLL: "급여 계산 정보를 처리할 수 없습니다.",
  BUDGET: "예산 정보를 처리할 수 없습니다.",
  EXPENSE: "지출 정보를 처리할 수 없습니다.",
  SAVING: "저축 정보를 처리할 수 없습니다.",
  NOTIFICATION: "알림을 처리할 수 없습니다.",
  GROWTH: "레벨업 활동을 처리할 수 없습니다.",
  COMMUNITY: "커뮤니티 요청을 처리할 수 없습니다.",
  ADMIN: "관리자 작업을 처리할 수 없습니다.",
  ADS_PARTNER: "광고 또는 제휴 요청을 처리할 수 없습니다.",
  OPERATIONS: "운영 상태로 인해 요청을 처리할 수 없습니다.",
} satisfies Record<ErrorCategory, string>);

export const PUBLIC_MESSAGE_OVERRIDE_BY_CODE: Readonly<
  Partial<Record<ErrorCode, string>>
> = Object.freeze({
  VALIDATION_IDEMPOTENCY_KEY_REQUIRED: "중복 요청 방지 키가 필요합니다.",
  VALIDATION_IDEMPOTENCY_KEY_CONFLICT: "이미 처리된 요청입니다.",
  AUTH_EMAIL_ALREADY_EXISTS: "이미 가입된 이메일입니다.",
  AUTH_EMAIL_NOT_VERIFIED: "이메일 인증이 필요합니다.",
  AUTH_ACCOUNT_SUSPENDED: "이 계정은 이용이 제한되었습니다.",
  AUTH_ACCOUNT_WITHDRAWN: "탈퇴 처리 중인 계정입니다.",
  AUTH_TOKEN_EXPIRED: "로그인이 만료되었습니다. 다시 로그인해주세요.",
  AUTH_MFA_REQUIRED: "추가 인증이 필요합니다.",
  AUTH_CONSENT_REQUIRED: "필수 약관 동의가 필요합니다.",
  SECURITY_RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  SECURITY_FILE_TYPE_NOT_ALLOWED: "허용되지 않는 파일 형식입니다.",
  SECURITY_FILE_SIZE_EXCEEDED: "파일 크기가 허용 범위를 초과했습니다.",
  PAYROLL_AMOUNT_INVALID: "급여 금액은 0원 이상의 KRW 정수여야 합니다.",
  PAYROLL_PAYDAY_INVALID: "급여일을 다시 확인해주세요.",
  PAYROLL_HIJACK_AMOUNT_CLAMPED:
    "납치금액은 표시 기준 0원 미만으로 내려가지 않습니다.",
  BUDGET_AMOUNT_INVALID: "예산 금액은 0원 이상의 KRW 정수여야 합니다.",
  BUDGET_OVER_AMOUNT_DETECTED: "오늘 예산을 초과했습니다.",
  EXPENSE_VARIABLE_DUPLICATE: "이미 등록된 지출 요청입니다.",
  EXPENSE_VARIABLE_AMOUNT_INVALID:
    "지출 금액은 0원 이상의 KRW 정수여야 합니다.",
  EXPENSE_FIXED_AMOUNT_INVALID:
    "고정지출 금액은 0원 이상의 KRW 정수여야 합니다.",
  SAVING_FIXED_AMOUNT_INVALID:
    "고정저축 금액은 0원 이상의 KRW 정수여야 합니다.",
  NOTIFICATION_OPT_OUT: "알림 수신 설정이 꺼져 있습니다.",
  GROWTH_TASK_ALREADY_COMPLETED: "이미 완료한 레벨업 활동입니다.",
  COMMUNITY_WRITE_BLOCKED: "현재 커뮤니티 글쓰기가 제한되었습니다.",
  COMMUNITY_CONTENT_POLICY_VIOLATION:
    "커뮤니티 운영 정책에 맞지 않는 내용입니다.",
  ADS_CONSENT_REQUIRED: "광고 또는 제휴 혜택 제공을 위한 동의가 필요합니다.",
  ADS_RAW_FINANCIAL_DATA_REJECTED:
    "재무 원천 데이터는 광고 이벤트에 사용할 수 없습니다.",
});

/* -----------------------------------------------------------------------------
 * 10. Error payload schemas
 * -------------------------------------------------------------------------- */

export const ErrorFieldIssueSchema = z
  .object({
    field: ErrorFieldPathSchema,
    code: z.string().trim().min(1).max(120),
    message: ErrorMessageSchema,
  })
  .strict();

export const SafeErrorDetailsSchema = z
  .record(
    z.string().trim().min(1).max(80),
    z.union([
      z.string().max(500),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(z.string().max(200)).max(20),
    ]),
  )
  .default({})
  .describe(
    "Sanitized detail map. No raw PII, token, secret or raw financial amount.",
  );

export const ErrorMetaSchema = z
  .object({
    requestId: ErrorRequestIdSchema.optional(),
    traceId: ErrorTraceIdSchema.optional(),
    source: ErrorSourceSchema.default("unknown"),
    actor: ErrorActorSchema.default("UNKNOWN"),
    serverTime: IsoDateTimeWithOffsetSchema,
    contractVersion: z.literal(ERROR_CODE_CONTRACT_VERSION),
  })
  .strict();

export const StandardErrorSchema = z
  .object({
    code: ErrorCodeSchema,
    category: ErrorCategorySchema,
    severity: ErrorSeveritySchema,
    httpStatus: HttpStatusCodeSchema,
    retry: ErrorRetryPolicySchema,
    visibility: ErrorVisibilitySchema,
    message: ErrorMessageSchema,
    fieldIssues: z.array(ErrorFieldIssueSchema).default([]),
    details: SafeErrorDetailsSchema,
  })
  .strict();

export const ErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    error: StandardErrorSchema,
    meta: ErrorMetaSchema,
  })
  .strict();

export const ErrorLogEventSchema = z
  .object({
    event: z.literal("api.error"),
    code: ErrorCodeSchema,
    category: ErrorCategorySchema,
    severity: ErrorSeveritySchema,
    httpStatus: HttpStatusCodeSchema,
    requestId: ErrorRequestIdSchema.optional(),
    traceId: ErrorTraceIdSchema.optional(),
    source: ErrorSourceSchema.default("unknown"),
    actor: ErrorActorSchema.default("UNKNOWN"),
    route: z.string().trim().min(1).max(240).optional(),
    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
      .optional(),
    sanitizedMessage: ErrorMessageSchema,
    sanitizedDetails: SafeErrorDetailsSchema,
    occurredAt: IsoDateTimeWithOffsetSchema,
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 11. Runtime helpers
 * -------------------------------------------------------------------------- */

export const getErrorCategory = (code: ErrorCode): ErrorCategory =>
  ERROR_CATEGORY_BY_CODE[code];

export const getHttpStatusForErrorCode = (code: ErrorCode): number =>
  HTTP_STATUS_OVERRIDE_BY_CODE[code] ??
  DEFAULT_HTTP_STATUS_BY_CATEGORY[getErrorCategory(code)];

export const getSeverityForErrorCode = (code: ErrorCode): ErrorSeverity =>
  SEVERITY_OVERRIDE_BY_CODE[code] ??
  DEFAULT_SEVERITY_BY_CATEGORY[getErrorCategory(code)];

export const getRetryPolicyForErrorCode = (code: ErrorCode): ErrorRetryPolicy =>
  RETRY_POLICY_OVERRIDE_BY_CODE[code] ??
  DEFAULT_RETRY_POLICY_BY_CATEGORY[getErrorCategory(code)];

export const getVisibilityForErrorCode = (code: ErrorCode): ErrorVisibility =>
  VISIBILITY_OVERRIDE_BY_CODE[code] ??
  DEFAULT_VISIBILITY_BY_CATEGORY[getErrorCategory(code)];

export const getPublicMessageForErrorCode = (code: ErrorCode): string =>
  PUBLIC_MESSAGE_OVERRIDE_BY_CODE[code] ??
  DEFAULT_PUBLIC_MESSAGE_BY_CATEGORY[getErrorCategory(code)];

export const isSecuritySensitiveErrorCode = (code: ErrorCode): boolean =>
  getVisibilityForErrorCode(code) === "SECURITY_PRIVATE" ||
  getSeverityForErrorCode(code) === "CRITICAL";

export const createStandardError = (
  code: ErrorCode,
  options: {
    message?: string;
    fieldIssues?: z.infer<typeof ErrorFieldIssueSchema>[];
    details?: z.infer<typeof SafeErrorDetailsSchema>;
  } = {},
): z.infer<typeof StandardErrorSchema> => {
  const error = {
    code,
    category: getErrorCategory(code),
    severity: getSeverityForErrorCode(code),
    httpStatus: getHttpStatusForErrorCode(code),
    retry: getRetryPolicyForErrorCode(code),
    visibility: getVisibilityForErrorCode(code),
    message: options.message ?? getPublicMessageForErrorCode(code),
    fieldIssues: options.fieldIssues ?? [],
    details: options.details ?? {},
  };

  return StandardErrorSchema.parse(error);
};

export const createErrorResponse = (
  code: ErrorCode,
  meta: Omit<z.infer<typeof ErrorMetaSchema>, "contractVersion">,
  options: {
    message?: string;
    fieldIssues?: z.infer<typeof ErrorFieldIssueSchema>[];
    details?: z.infer<typeof SafeErrorDetailsSchema>;
  } = {},
): z.infer<typeof ErrorResponseSchema> =>
  ErrorResponseSchema.parse({
    ok: false,
    error: createStandardError(code, options),
    meta: {
      ...meta,
      contractVersion: ERROR_CODE_CONTRACT_VERSION,
    },
  });

export const parseErrorCode = (input: unknown): ErrorCode =>
  ErrorCodeSchema.parse(input);

export const safeParseErrorCode = (
  input: unknown,
): z.SafeParseReturnType<unknown, ErrorCode> =>
  ErrorCodeSchema.safeParse(input);

/* -----------------------------------------------------------------------------
 * 12. Registry export
 * -------------------------------------------------------------------------- */

export const ErrorCodeRegistry = {
  contractVersion: ERROR_CODE_CONTRACT_VERSION,
  timezone: ERROR_CODE_TIMEZONE,
  locale: ERROR_CODE_LOCALE,
  groups: {
    system: SYSTEM_ERROR_CODES,
    validation: VALIDATION_ERROR_CODES,
    auth: AUTH_ERROR_CODES,
    rbac: RBAC_ERROR_CODES,
    security: SECURITY_ERROR_CODES,
    database: DATABASE_ERROR_CODES,
    payroll: PAYROLL_ERROR_CODES,
    budget: BUDGET_ERROR_CODES,
    expense: EXPENSE_ERROR_CODES,
    saving: SAVING_ERROR_CODES,
    notification: NOTIFICATION_ERROR_CODES,
    growth: GROWTH_ERROR_CODES,
    community: COMMUNITY_ERROR_CODES,
    admin: ADMIN_ERROR_CODES,
    adsPartner: ADS_PARTNER_ERROR_CODES,
    operations: OPERATIONS_ERROR_CODES,
  },
  allCodes: ERROR_CODES,
  categoryByCode: ERROR_CATEGORY_BY_CODE,
  defaultHttpStatusByCategory: DEFAULT_HTTP_STATUS_BY_CATEGORY,
  httpStatusOverrideByCode: HTTP_STATUS_OVERRIDE_BY_CODE,
  defaultSeverityByCategory: DEFAULT_SEVERITY_BY_CATEGORY,
  severityOverrideByCode: SEVERITY_OVERRIDE_BY_CODE,
  defaultRetryPolicyByCategory: DEFAULT_RETRY_POLICY_BY_CATEGORY,
  retryPolicyOverrideByCode: RETRY_POLICY_OVERRIDE_BY_CODE,
  defaultVisibilityByCategory: DEFAULT_VISIBILITY_BY_CATEGORY,
  visibilityOverrideByCode: VISIBILITY_OVERRIDE_BY_CODE,
  defaultPublicMessageByCategory: DEFAULT_PUBLIC_MESSAGE_BY_CATEGORY,
  publicMessageOverrideByCode: PUBLIC_MESSAGE_OVERRIDE_BY_CODE,
} as const;

/* -----------------------------------------------------------------------------
 * 13. Type exports
 * -------------------------------------------------------------------------- */

export type ErrorRequestId = z.infer<typeof ErrorRequestIdSchema>;
export type ErrorTraceId = z.infer<typeof ErrorTraceIdSchema>;
export type ErrorFieldPath = z.infer<typeof ErrorFieldPathSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type ErrorFieldIssue = z.infer<typeof ErrorFieldIssueSchema>;
export type SafeErrorDetails = z.infer<typeof SafeErrorDetailsSchema>;
export type ErrorMeta = z.infer<typeof ErrorMetaSchema>;
export type StandardError = z.infer<typeof StandardErrorSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ErrorLogEvent = z.infer<typeof ErrorLogEventSchema>;
