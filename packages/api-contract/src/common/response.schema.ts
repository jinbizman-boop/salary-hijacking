/**
 * packages/api-contract/src/common/response.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Common Response Contract
 *
 * 파일 목적:
 * - 모바일 앱, 관리자 콘솔, API 서버, notification worker, scheduler, QA/E2E가 공유하는 표준 응답 계약을 정의한다.
 * - 모든 성공 응답은 `{ ok: true, data, meta }` envelope를 따른다.
 * - 모든 실패 응답은 `error-code.schema.ts`의 `{ ok: false, error, meta }` envelope를 따른다.
 * - pagination, cursor, mutation, idempotency, audit, privacy, security, calculation meta를 표준화한다.
 * - 급여액, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액은 서버 권위 계산 결과로만 응답한다.
 * - token, secret, raw PII, raw push token, raw IP, raw User-Agent, 광고용 재무 원천 데이터가 response meta/details/log payload에 섞이지 않도록 계약 레벨에서 제한한다.
 */

import { z } from "zod";
import {
  ERROR_CODE_CONTRACT_VERSION,
  ErrorCodeSchema,
  ErrorMetaSchema,
  ErrorResponseSchema,
  StandardErrorSchema,
  createStandardError,
  type ErrorCode,
  type ErrorMeta,
  type ErrorResponse,
  type StandardError,
} from "./error-code.schema";

/* -----------------------------------------------------------------------------
 * 1. Contract metadata
 * -------------------------------------------------------------------------- */

export const RESPONSE_CONTRACT_VERSION = "1.0.0" as const;
export const RESPONSE_TIMEZONE = "Asia/Seoul" as const;
export const RESPONSE_DEFAULT_LOCALE = "ko-KR" as const;
export const RESPONSE_DEFAULT_CURRENCY = "KRW" as const;
export const RESPONSE_MONEY_SCALE = 0 as const;
export const RESPONSE_MAX_SAFE_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/* -----------------------------------------------------------------------------
 * 2. Primitive schemas
 * -------------------------------------------------------------------------- */

export const UuidSchema = z.string().uuid();

export const IsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO-8601 datetime with timezone offset.");

export const RequestIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Traceable request id. Must not contain PII.");

export const TraceIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Trace id for observability. Must not contain PII.");

export const CursorSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9._:=-]+$/)
  .describe(
    "Opaque pagination cursor. Must not expose raw PII or raw financial data.",
  );

export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(12)
  .max(160)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Idempotency key for write operations.");

export const RoutePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .regex(/^\/[a-zA-Z0-9/_:.-]*$/);

export const ApiVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^v?[0-9]+(\.[0-9]+){0,2}$/);

export const LocaleSchema = z
  .enum(["ko-KR", "en-US"])
  .default(RESPONSE_DEFAULT_LOCALE);

export const TimezoneSchema = z.enum(["Asia/Seoul"]).default(RESPONSE_TIMEZONE);

export const CurrencySchema = z
  .enum(["KRW"])
  .default(RESPONSE_DEFAULT_CURRENCY);

export const SafeMessageSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .describe(
    "Sanitized message. Must not include token, secret, raw PII or raw financial data.",
  );

export const OptionalSafeMessageSchema = z.string().trim().max(500);

export const SafeDetailValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(200)).max(50),
]);

export const SafeDetailsSchema = z
  .record(z.string().trim().min(1).max(80), SafeDetailValueSchema)
  .default({})
  .describe(
    "Sanitized detail map. Do not include token, secret, PII, DB URL, raw IP, raw User-Agent or raw financial source data.",
  );

export const KrwIntegerAmountSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER)
  .describe("KRW integer amount for API JSON response. DB source is BIGINT.");

export const KrwSignedIntegerAmountSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER)
  .describe("Signed KRW integer amount for calculated deltas only.");

export const UrlSchema = z.string().url().max(2048);

/* -----------------------------------------------------------------------------
 * 3. Enum schemas
 * -------------------------------------------------------------------------- */

export const ResponseSourceSchema = z.enum([
  "mobile",
  "admin",
  "api",
  "notifications",
  "scheduler",
  "database",
  "worker",
  "qa",
  "ci",
  "release",
  "unknown",
]);

export const RuntimeEnvironmentSchema = z.enum([
  "local",
  "test",
  "staging",
  "uat",
  "production",
]);

export const ResponseActorSchema = z.enum([
  "USER",
  "ADMIN",
  "SYSTEM",
  "SCHEDULER",
  "NOTIFICATION_WORKER",
  "PARTNER",
  "QA",
  "UNKNOWN",
]);

export const DataSensitivitySchema = z.enum([
  "PUBLIC",
  "INTERNAL",
  "PERSONAL",
  "FINANCIAL",
  "AUTH_SECRET",
  "ADMIN_AUDIT",
  "ADS_PARTNER",
]);

export const PrivacyRedactionStateSchema = z.enum([
  "NOT_REQUIRED",
  "MASKED",
  "HASHED",
  "PSEUDONYMIZED",
  "AGGREGATED",
  "REMOVED",
]);

export const IdempotencyStatusSchema = z.enum([
  "NOT_REQUIRED",
  "CREATED",
  "REPLAYED",
  "CONFLICT",
  "EXPIRED",
]);

export const MutationStatusSchema = z.enum([
  "CREATED",
  "UPDATED",
  "DELETED",
  "UNCHANGED",
  "ACCEPTED",
  "REJECTED",
]);

export const CalculationReasonSchema = z.enum([
  "PAYROLL_CREATED",
  "PAYROLL_UPDATED",
  "FIXED_EXPENSE_CHANGED",
  "FIXED_SAVING_CHANGED",
  "DAILY_BUDGET_CHANGED",
  "VARIABLE_EXPENSE_CREATED",
  "VARIABLE_EXPENSE_UPDATED",
  "VARIABLE_EXPENSE_DELETED",
  "MONTHLY_CLOSE",
  "MONTHLY_REOPEN",
  "ADMIN_RECALCULATION",
  "SYSTEM_RECONCILIATION",
]);

export const HealthStatusSchema = z.enum([
  "ok",
  "degraded",
  "maintenance",
  "down",
]);

export const ReleaseGateStatusSchema = z.enum([
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
]);

export const UploadStatusSchema = z.enum([
  "ACCEPTED",
  "REJECTED",
  "SCANNING",
  "CLEAN",
  "QUARANTINED",
  "DELETED",
]);

/* -----------------------------------------------------------------------------
 * 4. Query, context and meta schemas
 * -------------------------------------------------------------------------- */

export const RequestContextSchema = z
  .object({
    requestId: RequestIdSchema,
    traceId: TraceIdSchema.optional(),
    source: ResponseSourceSchema.default("unknown"),
    environment: RuntimeEnvironmentSchema.optional(),
    actor: ResponseActorSchema.default("UNKNOWN"),
    routePath: RoutePathSchema.optional(),
    apiVersion: ApiVersionSchema.default("1.0.0"),
    locale: LocaleSchema,
    timezone: TimezoneSchema,
  })
  .strict();

export const PaginationQuerySchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: CursorSchema.optional(),
  })
  .strict();

export const ListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const PageInfoSchema = z
  .object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean().default(false),
    startCursor: CursorSchema.nullable().default(null),
    endCursor: CursorSchema.nullable().default(null),
    totalCount: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100),
  })
  .strict();

export const IdempotencyMetaSchema = z
  .object({
    required: z.boolean(),
    key: IdempotencyKeySchema.optional(),
    status: IdempotencyStatusSchema,
    firstRequestId: RequestIdSchema.optional(),
    replayedFromRequestId: RequestIdSchema.optional(),
  })
  .strict();

export const MutationMetaSchema = z
  .object({
    status: MutationStatusSchema,
    entity: z.string().trim().min(1).max(80),
    entityId: UuidSchema.optional(),
    revision: z.number().int().min(0).optional(),
    changedFields: z
      .array(z.string().trim().min(1).max(80))
      .max(100)
      .default([]),
  })
  .strict();

export const AuditMetaSchema = z
  .object({
    auditRequired: z.boolean(),
    auditLogged: z.boolean(),
    auditLogId: UuidSchema.optional(),
    actor: ResponseActorSchema,
    reason: z.string().trim().min(1).max(500).optional(),
    permission: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const PrivacyMetaSchema = z
  .object({
    sensitivity: DataSensitivitySchema.default("INTERNAL"),
    redactionState: PrivacyRedactionStateSchema.default("NOT_REQUIRED"),
    rawPiiIncluded: z.literal(false).default(false),
    rawSecretIncluded: z.literal(false).default(false),
    rawTokenIncluded: z.literal(false).default(false),
    rawFinancialSourceDataIncluded: z.literal(false).default(false),
    rawFinancialSourceDataIncludedInAdsEvent: z.literal(false).default(false),
    rawFinancialSourceDataIncludedInLogs: z.literal(false).default(false),
    rawFinancialSourceDataIncludedInCommunity: z.literal(false).default(false),
    adsFinancialJoinAllowed: z.literal(false).default(false),
  })
  .strict();

export const SecurityMetaSchema = z
  .object({
    rlsChecked: z.boolean().default(false),
    ownerChecked: z.boolean().default(false),
    rbacChecked: z.boolean().default(false),
    csrfChecked: z.boolean().optional(),
    rateLimitRemaining: z.number().int().min(0).optional(),
    maskedLogSafe: z.boolean().default(true),
  })
  .strict();

export const CalculationMetaSchema = z
  .object({
    serverAuthority: z.literal(true),
    currency: CurrencySchema,
    moneyScale: z.literal(RESPONSE_MONEY_SCALE),
    calculatedAt: IsoDateTimeSchema,
    calculationVersion: z.string().trim().min(1).max(80),
    reason: CalculationReasonSchema,
    revision: z.number().int().min(0),
    snapshotId: UuidSchema.optional(),
    sourceHash: z.string().trim().min(8).max(256).optional(),
    negativeMoneyInputAllowed: z.literal(false).default(false),
    decimalMoneyInputAllowed: z.literal(false).default(false),
    hijackDisplayFloorZero: z.literal(true).default(true),
    dailyBudgetOverAmountEnabled: z.literal(true).default(true),
  })
  .strict();

export const ResponseMetaSchema = z
  .object({
    requestId: RequestIdSchema,
    traceId: TraceIdSchema.optional(),
    source: ResponseSourceSchema.default("unknown"),
    environment: RuntimeEnvironmentSchema.optional(),
    apiVersion: ApiVersionSchema.default("1.0.0"),
    locale: LocaleSchema,
    timezone: TimezoneSchema,
    generatedAt: IsoDateTimeSchema,
    routePath: RoutePathSchema.optional(),
    errorContractVersion: z.literal(ERROR_CODE_CONTRACT_VERSION).optional(),
    responseContractVersion: z
      .literal(RESPONSE_CONTRACT_VERSION)
      .default(RESPONSE_CONTRACT_VERSION),
    pageInfo: PageInfoSchema.optional(),
    idempotency: IdempotencyMetaSchema.optional(),
    mutation: MutationMetaSchema.optional(),
    audit: AuditMetaSchema.optional(),
    privacy: PrivacyMetaSchema.default({
      sensitivity: "INTERNAL",
      redactionState: "NOT_REQUIRED",
      rawPiiIncluded: false,
      rawSecretIncluded: false,
      rawTokenIncluded: false,
      rawFinancialSourceDataIncluded: false,
      rawFinancialSourceDataIncludedInAdsEvent: false,
      rawFinancialSourceDataIncludedInLogs: false,
      rawFinancialSourceDataIncludedInCommunity: false,
      adsFinancialJoinAllowed: false,
    }),
    security: SecurityMetaSchema.default({
      rlsChecked: false,
      ownerChecked: false,
      rbacChecked: false,
      maskedLogSafe: true,
    }),
    calculation: CalculationMetaSchema.optional(),
    warnings: z.array(SafeMessageSchema).max(20).default([]),
  })
  .strict();

export const createResponseMeta = (
  input: z.input<typeof ResponseMetaSchema>,
): ResponseMeta => ResponseMetaSchema.parse(input);

/* -----------------------------------------------------------------------------
 * 5. Response envelope schemas
 * -------------------------------------------------------------------------- */

export const EmptyDataSchema = z.object({}).strict();

export const createSuccessResponseSchema = <TDataSchema extends z.ZodTypeAny>(
  dataSchema: TDataSchema,
) =>
  z
    .object({
      ok: z.literal(true),
      data: dataSchema,
      meta: ResponseMetaSchema,
    })
    .strict();

export const createFailureResponseSchema = () => ErrorResponseSchema;

export const createApiResponseSchema = <TDataSchema extends z.ZodTypeAny>(
  dataSchema: TDataSchema,
) => z.union([createSuccessResponseSchema(dataSchema), ErrorResponseSchema]);

export const createListDataSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) =>
  z
    .object({
      items: z.array(itemSchema),
      pageInfo: PageInfoSchema,
    })
    .strict();

export const createListResponseSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) => createSuccessResponseSchema(createListDataSchema(itemSchema));

export const createMutationDataSchema = <TDataSchema extends z.ZodTypeAny>(
  dataSchema: TDataSchema,
) =>
  z
    .object({
      status: MutationStatusSchema,
      data: dataSchema,
      mutation: MutationMetaSchema,
    })
    .strict();

export const createMutationResponseSchema = <TDataSchema extends z.ZodTypeAny>(
  dataSchema: TDataSchema,
) => createSuccessResponseSchema(createMutationDataSchema(dataSchema));

export const EmptySuccessResponseSchema =
  createSuccessResponseSchema(EmptyDataSchema);

export const EmptyMutationResponseSchema =
  createMutationResponseSchema(EmptyDataSchema);

/* -----------------------------------------------------------------------------
 * 6. Runtime response helpers
 * -------------------------------------------------------------------------- */

export const createSuccessResponse = <TData>(
  data: TData,
  meta: ResponseMeta,
): SuccessResponse<TData> => ({
  ok: true,
  data,
  meta: ResponseMetaSchema.parse(meta),
});

export const createListResponse = <TItem>(
  items: TItem[],
  pageInfo: PageInfo,
  meta: ResponseMeta,
): ListResponse<TItem> =>
  createSuccessResponse(
    {
      items,
      pageInfo: PageInfoSchema.parse(pageInfo),
    },
    {
      ...meta,
      pageInfo: PageInfoSchema.parse(pageInfo),
    },
  );

export const createMutationResponse = <TData>(
  data: TData,
  mutation: MutationMeta,
  meta: ResponseMeta,
): MutationResponse<TData> => {
  const parsedMutation = MutationMetaSchema.parse(mutation);

  return createSuccessResponse(
    {
      status: parsedMutation.status,
      data,
      mutation: parsedMutation,
    },
    {
      ...meta,
      mutation: parsedMutation,
    },
  );
};

export const createFailureResponse = (
  code: ErrorCode,
  meta: ErrorMeta,
  options?: {
    message?: string;
    fieldIssues?: StandardError["fieldIssues"];
    details?: StandardError["details"];
  },
): ErrorResponse => {
  const standardErrorOptions: {
    message?: string;
    fieldIssues?: StandardError["fieldIssues"];
    details?: StandardError["details"];
  } = {};

  if (options?.message !== undefined) {
    standardErrorOptions.message = options.message;
  }

  if (options?.fieldIssues !== undefined) {
    standardErrorOptions.fieldIssues = options.fieldIssues;
  }

  if (options?.details !== undefined) {
    standardErrorOptions.details = options.details;
  }

  return {
    ok: false,
    error: createStandardError(code, standardErrorOptions),
    meta: ErrorMetaSchema.parse(meta),
  };
};

/* -----------------------------------------------------------------------------
 * 7. Batch, command, upload, health and release schemas
 * -------------------------------------------------------------------------- */

export const BatchItemStatusSchema = z.enum(["SUCCESS", "FAILED", "SKIPPED"]);

export const BatchItemResultSchema = z
  .object({
    key: z.string().trim().min(1).max(160),
    status: BatchItemStatusSchema,
    data: SafeDetailsSchema.optional(),
    error: StandardErrorSchema.optional(),
  })
  .strict();

export const BatchResultSchema = z
  .object({
    totalCount: z.number().int().min(0),
    successCount: z.number().int().min(0),
    failedCount: z.number().int().min(0),
    skippedCount: z.number().int().min(0),
    items: z.array(BatchItemResultSchema).max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    const counted = value.successCount + value.failedCount + value.skippedCount;

    if (counted !== value.totalCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch result counts must equal totalCount.",
        path: ["totalCount"],
      });
    }

    if (value.items.length !== value.totalCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch item length must equal totalCount.",
        path: ["items"],
      });
    }
  });

export const CommandResultSchema = z
  .object({
    accepted: z.boolean(),
    commandId: UuidSchema,
    status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
    message: SafeMessageSchema.optional(),
    idempotency: IdempotencyMetaSchema.optional(),
  })
  .strict();

export const UploadResultSchema = z
  .object({
    uploadId: UuidSchema,
    status: UploadStatusSchema,
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(120),
    sizeBytes: z.number().int().min(0).max(RESPONSE_MAX_SAFE_FILE_SIZE_BYTES),
    publicUrl: UrlSchema.optional(),
    scanResult: z
      .enum(["PENDING", "CLEAN", "INFECTED", "FAILED"])
      .default("PENDING"),
  })
  .strict();

export const HealthDependencySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    status: HealthStatusSchema,
    latencyMs: z.number().int().min(0).optional(),
    message: SafeMessageSchema.optional(),
  })
  .strict();

export const HealthCheckResultSchema = z
  .object({
    status: HealthStatusSchema,
    service: z.string().trim().min(1).max(80),
    version: z.string().trim().min(1).max(80),
    checkedAt: IsoDateTimeSchema,
    uptimeSeconds: z.number().int().min(0).optional(),
    dependencies: z.array(HealthDependencySchema).default([]),
  })
  .strict();

export const ReleaseGateResultSchema = z
  .object({
    gate: z.string().trim().min(1).max(120),
    status: ReleaseGateStatusSchema,
    checkedAt: IsoDateTimeSchema,
    required: z.boolean().default(true),
    message: SafeMessageSchema.optional(),
    details: SafeDetailsSchema.optional(),
  })
  .strict();

export const ApiContractCheckResultSchema = z
  .object({
    contractVersion: z.literal(RESPONSE_CONTRACT_VERSION),
    errorContractVersion: z.literal(ERROR_CODE_CONTRACT_VERSION),
    checkedAt: IsoDateTimeSchema,
    passed: z.boolean(),
    gates: z.array(ReleaseGateResultSchema).default([]),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 8. Public registries
 * -------------------------------------------------------------------------- */

export const ResponseSchemas = Object.freeze({
  primitives: {
    UuidSchema,
    IsoDateTimeSchema,
    RequestIdSchema,
    TraceIdSchema,
    CursorSchema,
    IdempotencyKeySchema,
    RoutePathSchema,
    ApiVersionSchema,
    LocaleSchema,
    TimezoneSchema,
    CurrencySchema,
    SafeMessageSchema,
    OptionalSafeMessageSchema,
    SafeDetailValueSchema,
    SafeDetailsSchema,
    KrwIntegerAmountSchema,
    KrwSignedIntegerAmountSchema,
    UrlSchema,
  },
  enums: {
    ResponseSourceSchema,
    RuntimeEnvironmentSchema,
    ResponseActorSchema,
    DataSensitivitySchema,
    PrivacyRedactionStateSchema,
    IdempotencyStatusSchema,
    MutationStatusSchema,
    CalculationReasonSchema,
    HealthStatusSchema,
    ReleaseGateStatusSchema,
    UploadStatusSchema,
    ErrorCodeSchema,
  },
  context: {
    RequestContextSchema,
  },
  query: {
    PaginationQuerySchema,
    ListQuerySchema,
  },
  meta: {
    PageInfoSchema,
    IdempotencyMetaSchema,
    MutationMetaSchema,
    AuditMetaSchema,
    PrivacyMetaSchema,
    SecurityMetaSchema,
    CalculationMetaSchema,
    ResponseMetaSchema,
    ErrorMetaSchema,
  },
  envelope: {
    EmptyDataSchema,
    EmptySuccessResponseSchema,
    EmptyMutationResponseSchema,
    ErrorResponseSchema,
    StandardErrorSchema,
  },
  result: {
    BatchItemStatusSchema,
    BatchItemResultSchema,
    BatchResultSchema,
    CommandResultSchema,
    UploadResultSchema,
    HealthDependencySchema,
    HealthCheckResultSchema,
    ReleaseGateResultSchema,
    ApiContractCheckResultSchema,
  },
} as const);

export const ResponseContractRegistry = Object.freeze({
  version: RESPONSE_CONTRACT_VERSION,
  errorContractVersion: ERROR_CODE_CONTRACT_VERSION,
  timezone: RESPONSE_TIMEZONE,
  locale: RESPONSE_DEFAULT_LOCALE,
  currency: RESPONSE_DEFAULT_CURRENCY,
  moneyScale: RESPONSE_MONEY_SCALE,
  maxSafeFileSizeBytes: RESPONSE_MAX_SAFE_FILE_SIZE_BYTES,
  schemas: ResponseSchemas,
  policies: {
    okEnvelopeRequired: true,
    errorEnvelopeRequired: true,
    requestIdRequired: true,
    generatedAtRequired: true,
    krwIntegerOnly: true,
    negativeMoneyInputAllowed: false,
    decimalMoneyInputAllowed: false,
    rawPiiInResponseAllowed: false,
    rawSecretInResponseAllowed: false,
    rawTokenInResponseAllowed: false,
    rawFinancialSourceDataInResponseAllowed: false,
    rawFinancialSourceDataInAdsEventAllowed: false,
    rawFinancialSourceDataInLogsAllowed: false,
    rawFinancialSourceDataInCommunityAllowed: false,
    adsFinancialJoinAllowed: false,
    serverAuthorityCalculationMetaRequiredForPayrollMutation: true,
    idempotencyRequiredForMutation: true,
    auditRequiredForAdminMutation: true,
  },
} as const);

/* -----------------------------------------------------------------------------
 * 9. Parse helpers
 * -------------------------------------------------------------------------- */

export const parseResponseMeta = (input: unknown): ResponseMeta =>
  ResponseMetaSchema.parse(input);

export const safeParseResponseMeta = (
  input: unknown,
): ReturnType<typeof ResponseMetaSchema.safeParse> =>
  ResponseMetaSchema.safeParse(input);

export const parsePageInfo = (input: unknown): PageInfo =>
  PageInfoSchema.parse(input);

export const safeParsePageInfo = (
  input: unknown,
): ReturnType<typeof PageInfoSchema.safeParse> =>
  PageInfoSchema.safeParse(input);

export const parseIdempotencyMeta = (input: unknown): IdempotencyMeta =>
  IdempotencyMetaSchema.parse(input);

export const safeParseIdempotencyMeta = (
  input: unknown,
): ReturnType<typeof IdempotencyMetaSchema.safeParse> =>
  IdempotencyMetaSchema.safeParse(input);

export const parseMutationMeta = (input: unknown): MutationMeta =>
  MutationMetaSchema.parse(input);

export const safeParseMutationMeta = (
  input: unknown,
): ReturnType<typeof MutationMetaSchema.safeParse> =>
  MutationMetaSchema.safeParse(input);

export const parseCalculationMeta = (input: unknown): CalculationMeta =>
  CalculationMetaSchema.parse(input);

export const safeParseCalculationMeta = (
  input: unknown,
): ReturnType<typeof CalculationMetaSchema.safeParse> =>
  CalculationMetaSchema.safeParse(input);

export const parseBatchResult = (input: unknown): BatchResult =>
  BatchResultSchema.parse(input);

export const safeParseBatchResult = (
  input: unknown,
): ReturnType<typeof BatchResultSchema.safeParse> =>
  BatchResultSchema.safeParse(input);

export type ResponseContractSafeParseResult<TSchema extends z.ZodTypeAny> =
  z.SafeParseReturnType<z.input<TSchema>, z.output<TSchema>>;

export const safeParseResponseContractInput = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): ResponseContractSafeParseResult<TSchema> =>
  schema.safeParse(input) as ResponseContractSafeParseResult<TSchema>;

/* -----------------------------------------------------------------------------
 * 10. Re-exports from error-code contract
 * -------------------------------------------------------------------------- */

export {
  ERROR_CODE_CONTRACT_VERSION,
  ErrorCodeSchema,
  ErrorMetaSchema,
  ErrorResponseSchema,
  StandardErrorSchema,
  createStandardError,
};

export type { ErrorCode, ErrorMeta, ErrorResponse, StandardError };

/* -----------------------------------------------------------------------------
 * 11. Type exports
 * -------------------------------------------------------------------------- */

export type ResponseSource = z.infer<typeof ResponseSourceSchema>;
export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;
export type ResponseActor = z.infer<typeof ResponseActorSchema>;
export type DataSensitivity = z.infer<typeof DataSensitivitySchema>;
export type PrivacyRedactionState = z.infer<typeof PrivacyRedactionStateSchema>;
export type IdempotencyStatus = z.infer<typeof IdempotencyStatusSchema>;
export type MutationStatus = z.infer<typeof MutationStatusSchema>;
export type CalculationReason = z.infer<typeof CalculationReasonSchema>;
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type ReleaseGateStatus = z.infer<typeof ReleaseGateStatusSchema>;
export type UploadStatus = z.infer<typeof UploadStatusSchema>;

export type RequestContext = z.infer<typeof RequestContextSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ListQuery = z.infer<typeof ListQuerySchema>;
export type PageInfo = z.infer<typeof PageInfoSchema>;
export type IdempotencyMeta = z.infer<typeof IdempotencyMetaSchema>;
export type MutationMeta = z.infer<typeof MutationMetaSchema>;
export type AuditMeta = z.infer<typeof AuditMetaSchema>;
export type PrivacyMeta = z.infer<typeof PrivacyMetaSchema>;
export type SecurityMeta = z.infer<typeof SecurityMetaSchema>;
export type CalculationMeta = z.infer<typeof CalculationMetaSchema>;
export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

export type SuccessResponse<TData> = {
  ok: true;
  data: TData;
  meta: ResponseMeta;
};

export type FailureResponse = ErrorResponse;

export type ApiResponse<TData> = SuccessResponse<TData> | FailureResponse;

export type ListData<TItem> = {
  items: TItem[];
  pageInfo: PageInfo;
};

export type ListResponse<TItem> = SuccessResponse<ListData<TItem>>;

export type MutationData<TData> = {
  status: MutationStatus;
  data: TData;
  mutation: MutationMeta;
};

export type MutationResponse<TData> = SuccessResponse<MutationData<TData>>;

export type BatchItemStatus = z.infer<typeof BatchItemStatusSchema>;
export type BatchItemResult = z.infer<typeof BatchItemResultSchema>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
export type CommandResult = z.infer<typeof CommandResultSchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type HealthDependency = z.infer<typeof HealthDependencySchema>;
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;
export type ReleaseGateResult = z.infer<typeof ReleaseGateResultSchema>;
export type ApiContractCheckResult = z.infer<
  typeof ApiContractCheckResultSchema
>;
