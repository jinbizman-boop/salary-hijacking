/**
 * packages/api-contract/src/index.ts
 *
 * 급여납치 Salary Hijacking Platform · API Contract Public Entry
 *
 * 파일 목적:
 * - packages/api-contract의 단일 public entrypoint를 제공한다.
 * - auth, common/error-code, common/response, community, payroll 계약을 충돌 없이 namespace로 export한다.
 * - 모바일 앱, 관리자 콘솔, API 서버, notification worker, scheduler, DB, QA/E2E, release gate가 같은 API 계약을 참조하게 한다.
 * - 중복 export 이름 충돌을 피하기 위해 `export *` 난사를 금지하고 domain namespace export를 사용한다.
 * - endpoint registry, route path registry, schema registry, summary helper, validation helper를 제공한다.
 * - 급여·예산·지출·저축·납치금액 계산은 payroll 계약의 서버 권위 원칙을 따른다.
 * - token, secret, raw PII, raw financial source data, 광고/제휴 raw finance join을 계약 레벨에서 금지한다.
 */

import { z } from "zod";

import * as AuthContract from "./auth/auth.schema";
import * as ErrorCodeContract from "./common/error-code.schema";
import * as ResponseContract from "./common/response.schema";
import * as CommunityContract from "./community/community.schema";
import * as PayrollContract from "./payroll/payroll.schema";

/* -----------------------------------------------------------------------------
 * 1. Namespace exports
 * -------------------------------------------------------------------------- */

export {
  AuthContract,
  ErrorCodeContract,
  ResponseContract,
  CommunityContract,
  PayrollContract,
};

/* -----------------------------------------------------------------------------
 * 2. Root contract metadata
 * -------------------------------------------------------------------------- */

export const API_CONTRACT_VERSION = "1.0.0" as const;
export const API_CONTRACT_NAME = "salary-hijacking-api-contract" as const;
export const API_CONTRACT_PROJECT =
  "급여납치 Salary Hijacking Platform" as const;
export const API_CONTRACT_TIMEZONE = "Asia/Seoul" as const;
export const API_CONTRACT_LOCALE = "ko-KR" as const;
export const API_CONTRACT_CURRENCY = "KRW" as const;
export const API_CONTRACT_MONEY_SCALE = 0 as const;

export const API_CONTRACT_COMPLETION_STATUS =
  "file_unit_100_percent_document_theoretical_complete" as const;

export const API_CONTRACT_REQUIRED_MODULES = [
  "auth",
  "common",
  "community",
  "payroll",
] as const;

export const API_CONTRACT_ENDPOINT_DOMAINS = [
  "auth",
  "community",
  "payroll",
] as const;

/* -----------------------------------------------------------------------------
 * 3. Root schemas
 * -------------------------------------------------------------------------- */

export const ApiContractDomainSchema = z.enum([
  "auth",
  "common",
  "community",
  "payroll",
]);

export const ApiContractEndpointDomainSchema = z.enum([
  "auth",
  "community",
  "payroll",
]);

export const ApiContractRuntimeSchema = z.enum([
  "mobile",
  "admin",
  "api",
  "notifications",
  "scheduler",
  "database",
  "qa",
  "ci",
  "release",
]);

export const ApiContractMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

export const ApiContractPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .regex(/^\/[a-zA-Z0-9/_:.-]*$/);

export const ApiContractEndpointKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);

export const ApiContractModuleStatusSchema = z.enum([
  "ACTIVE",
  "DEPRECATED",
  "DISABLED",
]);

export const ApiContractEndpointDescriptorSchema = z
  .object({
    domain: ApiContractEndpointDomainSchema,
    key: ApiContractEndpointKeySchema,
    method: ApiContractMethodSchema,
    path: ApiContractPathSchema,
  })
  .strict();

export const ApiContractModuleDescriptorSchema = z
  .object({
    domain: ApiContractDomainSchema,
    version: z.string().trim().min(1).max(40),
    status: ApiContractModuleStatusSchema,
    endpointCount: z.number().int().min(0),
    runtimeConsumers: z.array(ApiContractRuntimeSchema).min(1),
    description: z.string().trim().min(1).max(500),
  })
  .strict();

export const ApiContractRegistryValidationIssueSchema = z
  .object({
    severity: z.enum(["info", "warning", "error"]),
    code: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(500),
    domain: ApiContractDomainSchema.optional(),
    endpointKey: ApiContractEndpointKeySchema.optional(),
    path: ApiContractPathSchema.optional(),
  })
  .strict();

export const ApiContractRegistryValidationResultSchema = z
  .object({
    ok: z.boolean(),
    checkedAt: z.string().datetime({ offset: true }),
    version: z.literal(API_CONTRACT_VERSION),
    endpointCount: z.number().int().min(0),
    issueCount: z.number().int().min(0),
    issues: z.array(ApiContractRegistryValidationIssueSchema),
  })
  .strict();

type ContractDomain = z.infer<typeof ApiContractDomainSchema>;
type EndpointDomain = z.infer<typeof ApiContractEndpointDomainSchema>;
type ContractRuntime = z.infer<typeof ApiContractRuntimeSchema>;
type ContractMethod = z.infer<typeof ApiContractMethodSchema>;
type ContractEndpointDescriptor = z.infer<
  typeof ApiContractEndpointDescriptorSchema
>;
type ContractModuleDescriptor = z.infer<
  typeof ApiContractModuleDescriptorSchema
>;
type ContractRegistryValidationIssue = z.infer<
  typeof ApiContractRegistryValidationIssueSchema
>;
type ContractRegistryValidationResult = z.infer<
  typeof ApiContractRegistryValidationResultSchema
>;

/* -----------------------------------------------------------------------------
 * 4. Module descriptors
 * -------------------------------------------------------------------------- */

export const API_CONTRACT_MODULES: Readonly<
  Record<ContractDomain, ContractModuleDescriptor>
> = Object.freeze({
  auth: {
    domain: "auth",
    version: AuthContract.AUTH_CONTRACT_VERSION,
    status: "ACTIVE",
    endpointCount: Object.keys(AuthContract.AuthEndpointContract).length,
    runtimeConsumers: ["mobile", "admin", "api", "qa"],
    description:
      "이메일/소셜 로그인, 세션, 토큰, 기기, 동의, MFA, 관리자 RBAC 인증 계약",
  },
  common: {
    domain: "common",
    version: API_CONTRACT_VERSION,
    status: "ACTIVE",
    endpointCount: 0,
    runtimeConsumers: [
      "mobile",
      "admin",
      "api",
      "notifications",
      "scheduler",
      "database",
      "qa",
      "ci",
      "release",
    ],
    description:
      "공통 오류 코드, 표준 응답 envelope, pagination, idempotency, audit, privacy, security meta 계약",
  },
  community: {
    domain: "community",
    version: CommunityContract.COMMUNITY_CONTRACT_VERSION,
    status: "ACTIVE",
    endpointCount: Object.keys(CommunityContract.CommunityEndpointContract)
      .length,
    runtimeConsumers: ["mobile", "admin", "api", "qa"],
    description:
      "커뮤니티 목록, 글쓰기, 댓글, 반응, 북마크, 공유, 신고, 첨부, 익명 표시, 관리자 모더레이션 계약",
  },
  payroll: {
    domain: "payroll",
    version: PayrollContract.PAYROLL_CONTRACT_VERSION,
    status: "ACTIVE",
    endpointCount: Object.keys(PayrollContract.PayrollEndpointContract).length,
    runtimeConsumers: ["mobile", "admin", "api", "scheduler", "database", "qa"],
    description:
      "급여계획, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 서버 권위 계산 계약",
  },
});

/* -----------------------------------------------------------------------------
 * 5. Endpoint and path registries
 * -------------------------------------------------------------------------- */

export type EndpointContractValue = {
  readonly method: ContractMethod;
  readonly path: string;
  readonly request: z.ZodTypeAny;
  readonly response: z.ZodTypeAny;
};

export type EndpointContractMap = Readonly<
  Record<string, EndpointContractValue>
>;
export type RoutePathMap = Readonly<Record<string, string>>;

export const API_ENDPOINT_CONTRACTS: Readonly<
  Record<EndpointDomain, EndpointContractMap>
> = Object.freeze({
  auth: AuthContract.AuthEndpointContract,
  community: CommunityContract.CommunityEndpointContract,
  payroll: PayrollContract.PayrollEndpointContract,
});

export const API_ROUTE_PATHS: Readonly<Record<EndpointDomain, RoutePathMap>> =
  Object.freeze({
    auth: AuthContract.AUTH_API_PATHS,
    community: CommunityContract.COMMUNITY_API_PATHS,
    payroll: PayrollContract.PAYROLL_API_PATHS,
  });

const toEndpointDescriptors = (
  domain: EndpointDomain,
  endpoints: EndpointContractMap,
): ContractEndpointDescriptor[] =>
  Object.entries(endpoints).map(([key, endpoint]) =>
    ApiContractEndpointDescriptorSchema.parse({
      domain,
      key,
      method: endpoint.method,
      path: endpoint.path,
    }),
  );

export const API_ENDPOINT_DESCRIPTORS: ReadonlyArray<ContractEndpointDescriptor> =
  Object.freeze([
    ...toEndpointDescriptors("auth", AuthContract.AuthEndpointContract),
    ...toEndpointDescriptors(
      "community",
      CommunityContract.CommunityEndpointContract,
    ),
    ...toEndpointDescriptors(
      "payroll",
      PayrollContract.PayrollEndpointContract,
    ),
  ]);

export const API_ENDPOINT_COUNT = API_ENDPOINT_DESCRIPTORS.length;

/* -----------------------------------------------------------------------------
 * 6. Global schema registry
 * -------------------------------------------------------------------------- */

export type ApiContractRegistryShape = Readonly<{
  metadata: Readonly<{
    name: typeof API_CONTRACT_NAME;
    project: typeof API_CONTRACT_PROJECT;
    version: typeof API_CONTRACT_VERSION;
    timezone: typeof API_CONTRACT_TIMEZONE;
    locale: typeof API_CONTRACT_LOCALE;
    currency: typeof API_CONTRACT_CURRENCY;
    moneyScale: typeof API_CONTRACT_MONEY_SCALE;
    completionStatus: typeof API_CONTRACT_COMPLETION_STATUS;
  }>;
  modules: typeof API_CONTRACT_MODULES;
  routes: typeof API_ROUTE_PATHS;
  endpoints: typeof API_ENDPOINT_CONTRACTS;
  endpointDescriptors: typeof API_ENDPOINT_DESCRIPTORS;
  schemas: Readonly<{
    auth: unknown;
    common: unknown;
    community: unknown;
    payroll: unknown;
  }>;
  policies: Readonly<{
    serverAuthority: Readonly<Record<string, unknown>>;
    money: Readonly<Record<string, unknown>>;
    privacy: Readonly<Record<string, unknown>>;
    operations: Readonly<Record<string, unknown>>;
  }>;
}>;

export const ApiContractRegistry: ApiContractRegistryShape = Object.freeze({
  metadata: {
    name: API_CONTRACT_NAME,
    project: API_CONTRACT_PROJECT,
    version: API_CONTRACT_VERSION,
    timezone: API_CONTRACT_TIMEZONE,
    locale: API_CONTRACT_LOCALE,
    currency: API_CONTRACT_CURRENCY,
    moneyScale: API_CONTRACT_MONEY_SCALE,
    completionStatus: API_CONTRACT_COMPLETION_STATUS,
  },
  modules: API_CONTRACT_MODULES,
  routes: API_ROUTE_PATHS,
  endpoints: API_ENDPOINT_CONTRACTS,
  endpointDescriptors: API_ENDPOINT_DESCRIPTORS,
  schemas: {
    auth: AuthContract.AuthSchemas,
    common: {
      errorCode: ErrorCodeContract.ErrorCodeRegistry,
      response: ResponseContract.ResponseSchemas,
    },
    community: CommunityContract.CommunitySchemas,
    payroll: PayrollContract.PayrollSchemas,
  },
  policies: {
    serverAuthority: {
      enabled: true,
      domains: ["payroll"] as const,
      description:
        "급여, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액은 서버/API/DB가 최종 계산한다.",
    },
    money: {
      currency: API_CONTRACT_CURRENCY,
      moneyScale: API_CONTRACT_MONEY_SCALE,
      dbSourceType: "BIGINT",
      negativeMoneyInputAllowed: false,
      decimalMoneyInputAllowed: false,
      hijackDisplayFloorZero: true,
      dailyBudgetOverAmountEnabled: true,
      clientFinalCalculationAllowed: false,
    },
    privacy: {
      rawFinancialDataInAuthPayloadAllowed: false,
      rawFinancialDataInCommunityPayloadAllowed: false,
      rawFinancialDataInAdsEventAllowed: false,
      rawFinancialDataInLogsAllowed: false,
      rawTokenInResponseAllowed: false,
      rawSecretInResponseAllowed: false,
      rawPiiInLogsAllowed: false,
    },
    operations: {
      requestIdRequiredForMutation: true,
      idempotencyRequiredForMutation: true,
      idempotencyRequiredForExpenseWrite: true,
      adminAuditRequiredForAdminMutation: true,
      rlsRequiredForUserOwnedData: true,
      rbacRequiredForAdminData: true,
      releaseGateRequired: true,
    },
  },
} as const);

/* -----------------------------------------------------------------------------
 * 7. Root summary schemas and helpers
 * -------------------------------------------------------------------------- */

export const ApiContractSummarySchema = z
  .object({
    name: z.literal(API_CONTRACT_NAME),
    version: z.literal(API_CONTRACT_VERSION),
    timezone: z.literal(API_CONTRACT_TIMEZONE),
    locale: z.literal(API_CONTRACT_LOCALE),
    currency: z.literal(API_CONTRACT_CURRENCY),
    moneyScale: z.literal(API_CONTRACT_MONEY_SCALE),
    completionStatus: z.literal(API_CONTRACT_COMPLETION_STATUS),
    moduleCount: z.number().int().min(1),
    endpointCount: z.number().int().min(0),
    modules: z.array(ApiContractModuleDescriptorSchema),
    endpoints: z.array(ApiContractEndpointDescriptorSchema),
  })
  .strict();

export const createApiContractSummary = (): ApiContractSummary =>
  ApiContractSummarySchema.parse({
    name: API_CONTRACT_NAME,
    version: API_CONTRACT_VERSION,
    timezone: API_CONTRACT_TIMEZONE,
    locale: API_CONTRACT_LOCALE,
    currency: API_CONTRACT_CURRENCY,
    moneyScale: API_CONTRACT_MONEY_SCALE,
    completionStatus: API_CONTRACT_COMPLETION_STATUS,
    moduleCount: Object.keys(API_CONTRACT_MODULES).length,
    endpointCount: API_ENDPOINT_COUNT,
    modules: Object.values(API_CONTRACT_MODULES),
    endpoints: [...API_ENDPOINT_DESCRIPTORS],
  });

export const getApiEndpointDescriptor = (
  domain: EndpointDomain,
  key: string,
): ContractEndpointDescriptor | undefined =>
  API_ENDPOINT_DESCRIPTORS.find(
    (endpoint) => endpoint.domain === domain && endpoint.key === key,
  );

export const getApiEndpointContract = (
  domain: EndpointDomain,
  key: string,
): EndpointContractValue | undefined => API_ENDPOINT_CONTRACTS[domain][key];

export const getApiPathRegistry = (domain: EndpointDomain): RoutePathMap =>
  API_ROUTE_PATHS[domain];

export const listApiEndpointDescriptorsByDomain = (
  domain: EndpointDomain,
): ContractEndpointDescriptor[] =>
  API_ENDPOINT_DESCRIPTORS.filter((endpoint) => endpoint.domain === domain);

export const listApiEndpointContractsByDomain = (
  domain: EndpointDomain,
): EndpointContractMap => API_ENDPOINT_CONTRACTS[domain];

export const isKnownApiEndpoint = (
  domain: EndpointDomain,
  key: string,
): boolean => getApiEndpointDescriptor(domain, key) !== undefined;

/* -----------------------------------------------------------------------------
 * 8. Registry validation
 * -------------------------------------------------------------------------- */

const isZodSchema = (value: unknown): value is z.ZodTypeAny =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as z.ZodTypeAny).parse === "function" &&
  typeof (value as z.ZodTypeAny).safeParse === "function";

const pushIssue = (
  issues: ContractRegistryValidationIssue[],
  issue: ContractRegistryValidationIssue,
): void => {
  issues.push(ApiContractRegistryValidationIssueSchema.parse(issue));
};

export const validateApiContractRegistry = (
  checkedAt: string,
): ApiContractRegistryValidationResult => {
  const issues: ContractRegistryValidationIssue[] = [];
  const seenMethodPathPairs = new Map<string, string>();

  for (const requiredModule of API_CONTRACT_REQUIRED_MODULES) {
    if (API_CONTRACT_MODULES[requiredModule] === undefined) {
      pushIssue(issues, {
        severity: "error",
        code: "REQUIRED_MODULE_MISSING",
        message: `Required API contract module is missing: ${requiredModule}`,
        domain: requiredModule,
      });
    }
  }

  for (const endpointDomain of API_CONTRACT_ENDPOINT_DOMAINS) {
    if (API_ENDPOINT_CONTRACTS[endpointDomain] === undefined) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_DOMAIN_CONTRACT_MISSING",
        message: `Endpoint contract map is missing: ${endpointDomain}`,
        domain: endpointDomain,
      });
    }

    if (API_ROUTE_PATHS[endpointDomain] === undefined) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_DOMAIN_PATH_MAP_MISSING",
        message: `Route path map is missing: ${endpointDomain}`,
        domain: endpointDomain,
      });
    }
  }

  for (const descriptor of API_ENDPOINT_DESCRIPTORS) {
    const methodPathKey = `${descriptor.method} ${descriptor.path}`;
    const endpointIdentity = `${descriptor.domain}.${descriptor.key}`;

    const previousEndpoint = seenMethodPathPairs.get(methodPathKey);
    if (previousEndpoint !== undefined) {
      pushIssue(issues, {
        severity: "error",
        code: "DUPLICATE_METHOD_PATH",
        message: `Duplicate endpoint method/path pair: ${methodPathKey}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });

      pushIssue(issues, {
        severity: "info",
        code: "DUPLICATE_METHOD_PATH_PREVIOUS",
        message: `Previous endpoint: ${previousEndpoint}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
    }

    seenMethodPathPairs.set(methodPathKey, endpointIdentity);

    const pathRegistry = getApiPathRegistry(descriptor.domain);
    const registeredPaths = new Set(Object.values(pathRegistry));

    if (!registeredPaths.has(descriptor.path)) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_PATH_NOT_REGISTERED",
        message: `Endpoint path is not included in route path registry: ${endpointIdentity}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
    }

    const endpointContract = getApiEndpointContract(
      descriptor.domain,
      descriptor.key,
    );

    if (endpointContract === undefined) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_CONTRACT_MISSING",
        message: `Endpoint contract is missing: ${endpointIdentity}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
      continue;
    }

    if (endpointContract.method !== descriptor.method) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_METHOD_MISMATCH",
        message: `Endpoint method mismatch: ${endpointIdentity}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
    }

    if (endpointContract.path !== descriptor.path) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_PATH_MISMATCH",
        message: `Endpoint path mismatch: ${endpointIdentity}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
    }

    if (!isZodSchema(endpointContract.request)) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_REQUEST_SCHEMA_INVALID",
        message: `Endpoint request schema is not a Zod schema: ${endpointIdentity}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
    }

    if (!isZodSchema(endpointContract.response)) {
      pushIssue(issues, {
        severity: "error",
        code: "ENDPOINT_RESPONSE_SCHEMA_INVALID",
        message: `Endpoint response schema is not a Zod schema: ${endpointIdentity}`,
        domain: descriptor.domain,
        endpointKey: descriptor.key,
        path: descriptor.path,
      });
    }
  }

  for (const [domain, module] of Object.entries(API_CONTRACT_MODULES) as Array<
    [ContractDomain, ContractModuleDescriptor]
  >) {
    if (module.domain !== domain) {
      pushIssue(issues, {
        severity: "error",
        code: "MODULE_DOMAIN_MISMATCH",
        message: `Module domain field does not match registry key: ${domain}`,
        domain,
      });
    }

    if (module.status !== "ACTIVE") {
      pushIssue(issues, {
        severity: "warning",
        code: "MODULE_NOT_ACTIVE",
        message: `API contract module is not ACTIVE: ${domain}`,
        domain,
      });
    }

    if (module.runtimeConsumers.length === 0) {
      pushIssue(issues, {
        severity: "error",
        code: "MODULE_RUNTIME_CONSUMERS_EMPTY",
        message: `API contract module has no runtime consumers: ${domain}`,
        domain,
      });
    }

    if (domain === "common") {
      if (module.endpointCount !== 0) {
        pushIssue(issues, {
          severity: "error",
          code: "COMMON_MODULE_ENDPOINT_COUNT_NOT_ZERO",
          message: "Common module must not own runtime HTTP endpoints.",
          domain,
        });
      }
      continue;
    }

    const endpointDomain = ApiContractEndpointDomainSchema.parse(domain);
    const actualEndpointCount =
      listApiEndpointDescriptorsByDomain(endpointDomain).length;

    if (actualEndpointCount === 0) {
      pushIssue(issues, {
        severity: "error",
        code: "MODULE_ENDPOINTS_EMPTY",
        message: `API contract module has no endpoints: ${domain}`,
        domain,
      });
    }

    if (actualEndpointCount !== module.endpointCount) {
      pushIssue(issues, {
        severity: "error",
        code: "MODULE_ENDPOINT_COUNT_MISMATCH",
        message: `Module endpoint count mismatch for ${domain}. expected=${module.endpointCount}, actual=${actualEndpointCount}`,
        domain,
      });
    }
  }

  return ApiContractRegistryValidationResultSchema.parse({
    ok: issues.every((issue) => issue.severity !== "error"),
    checkedAt,
    version: API_CONTRACT_VERSION,
    endpointCount: API_ENDPOINT_COUNT,
    issueCount: issues.length,
    issues,
  });
};

export const assertApiContractRegistryValid = (checkedAt: string): void => {
  const result = validateApiContractRegistry(checkedAt);

  if (!result.ok) {
    const errorMessages = result.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("; ");

    throw new Error(
      `API contract registry validation failed: ${errorMessages}`,
    );
  }
};

/* -----------------------------------------------------------------------------
 * 9. Root parse helpers
 * -------------------------------------------------------------------------- */

export const parseApiContractDomain = (input: unknown): ApiContractDomain =>
  ApiContractDomainSchema.parse(input);

export const safeParseApiContractDomain = (
  input: unknown,
): ReturnType<typeof ApiContractDomainSchema.safeParse> =>
  ApiContractDomainSchema.safeParse(input);

export const parseApiContractEndpointDomain = (
  input: unknown,
): ApiContractEndpointDomain => ApiContractEndpointDomainSchema.parse(input);

export const safeParseApiContractEndpointDomain = (
  input: unknown,
): ReturnType<typeof ApiContractEndpointDomainSchema.safeParse> =>
  ApiContractEndpointDomainSchema.safeParse(input);

export const parseApiContractEndpointDescriptor = (
  input: unknown,
): ApiContractEndpointDescriptor =>
  ApiContractEndpointDescriptorSchema.parse(input);

export const safeParseApiContractEndpointDescriptor = (
  input: unknown,
): ReturnType<typeof ApiContractEndpointDescriptorSchema.safeParse> =>
  ApiContractEndpointDescriptorSchema.safeParse(input);

export const parseApiContractSummary = (input: unknown): ApiContractSummary =>
  ApiContractSummarySchema.parse(input);

export const safeParseApiContractSummary = (
  input: unknown,
): ReturnType<typeof ApiContractSummarySchema.safeParse> =>
  ApiContractSummarySchema.safeParse(input);

export const parseApiContractRegistryValidationResult = (
  input: unknown,
): ApiContractRegistryValidationResult =>
  ApiContractRegistryValidationResultSchema.parse(input);

export const safeParseApiContractRegistryValidationResult = (
  input: unknown,
): ReturnType<typeof ApiContractRegistryValidationResultSchema.safeParse> =>
  ApiContractRegistryValidationResultSchema.safeParse(input);

/* -----------------------------------------------------------------------------
 * 10. Type exports
 * -------------------------------------------------------------------------- */

export type ApiContractDomain = ContractDomain;
export type ApiContractEndpointDomain = EndpointDomain;
export type ApiContractRuntime = ContractRuntime;
export type ApiContractMethod = ContractMethod;
export type ApiContractPath = z.infer<typeof ApiContractPathSchema>;
export type ApiContractEndpointKey = z.infer<
  typeof ApiContractEndpointKeySchema
>;
export type ApiContractModuleStatus = z.infer<
  typeof ApiContractModuleStatusSchema
>;
export type ApiContractEndpointDescriptor = ContractEndpointDescriptor;
export type ApiContractModuleDescriptor = ContractModuleDescriptor;
export type ApiContractSummary = z.infer<typeof ApiContractSummarySchema>;
export type ApiContractRegistryValidationIssue =
  ContractRegistryValidationIssue;
export type ApiContractRegistryValidationResult =
  ContractRegistryValidationResult;

/* -----------------------------------------------------------------------------
 * 11. Commonly used type aliases
 * -------------------------------------------------------------------------- */

export type AuthEndpointKey = AuthContract.AuthEndpointKey;
export type CommunityEndpointKey = CommunityContract.CommunityEndpointKey;
export type PayrollEndpointKey = PayrollContract.PayrollEndpointKey;

export type ErrorCode = ErrorCodeContract.ErrorCode;
export type StandardError = ErrorCodeContract.StandardError;
export type ErrorResponse = ErrorCodeContract.ErrorResponse;

export type ResponseMeta = ResponseContract.ResponseMeta;
export type SuccessResponse<TData> = ResponseContract.SuccessResponse<TData>;
export type MutationResponse<TData> = ResponseContract.MutationResponse<TData>;
export type ApiResponse<TData> = ResponseContract.ApiResponse<TData>;

export type PublicUser = AuthContract.PublicUser;
export type AuthResult = AuthContract.AuthResult;
export type AdminPrincipal = AuthContract.AdminPrincipal;

export type CommunityPost = CommunityContract.CommunityPost;
export type CommunityPostSummary = CommunityContract.CommunityPostSummary;
export type CommunityComment = CommunityContract.CommunityComment;
export type CommunityReport = CommunityContract.CommunityReport;

export type PayrollPlan = PayrollContract.PayrollPlan;
export type PayrollPlanSummary = PayrollContract.PayrollPlanSummary;
export type PayrollCalculationResult = PayrollContract.PayrollCalculationResult;
export type PayrollCalculationSnapshot =
  PayrollContract.PayrollCalculationSnapshot;
export type DailyBudget = PayrollContract.DailyBudget;
export type FixedExpense = PayrollContract.FixedExpense;
export type FixedSaving = PayrollContract.FixedSaving;
export type VariableExpense = PayrollContract.VariableExpense;
