/**
 * packages/api-contract/src/auth/auth.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Auth API Contract
 *
 * 파일 목적:
 * - 모바일 앱, 관리자 콘솔, API 서버가 공유하는 인증/인가 API 계약을 정의한다.
 * - 이메일 로그인, 소셜 로그인, 토큰 갱신, 로그아웃, 세션, 기기, 동의, 프로필, 관리자 인증 계약을 포함한다.
 * - 급여·지출·저축·예산·납치금액 같은 재무 원천 데이터가 인증 payload에 섞이지 않도록 계약 레벨에서 분리한다.
 * - 실제 secret, token, DB URL, raw push token, raw IP, raw User-Agent, 원문 금융정보를 schema 예시나 payload 계약에 포함하지 않는다.
 *
 * 전제:
 * - 이 패키지는 zod 기반 API contract package다.
 * - 실제 HTTP route 구현은 services/api에서 수행한다.
 * - 최종 권한 판정, token 발급, refresh token rotation, session revoke, RBAC, audit log는 서버 권위로 처리한다.
 */

import { z } from "zod";

/* -----------------------------------------------------------------------------
 * 1. Contract metadata
 * -------------------------------------------------------------------------- */

export const AUTH_CONTRACT_VERSION = "1.0.0" as const;
export const AUTH_TOKEN_TYPE = "Bearer" as const;
export const AUTH_TIMEZONE = "Asia/Seoul" as const;
export const AUTH_DEFAULT_LOCALE = "ko-KR" as const;

/* -----------------------------------------------------------------------------
 * 2. Primitive schemas
 * -------------------------------------------------------------------------- */

export const UuidSchema = z.string().uuid();

export const IsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO-8601 datetime with timezone offset");

export const RequestIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Traceable request id. Do not include PII.");

export const TraceIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Trace id used for logs and observability. Do not include PII.");

export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(12)
  .max(160)
  .regex(/^[a-zA-Z0-9._:-]+$/)
  .describe("Idempotency key for write operations.");

export const EmailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value: string): string => value.toLowerCase())
  .describe("Normalized email address.");

export const OptionalEmailSchema = EmailSchema.nullable();

export const PasswordInputSchema = z
  .string()
  .min(1)
  .max(128)
  .describe(
    "Existing password input for login, current-password confirmation, MFA disable and withdrawal confirmation. Never log.",
  );

export const NewPasswordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one symbol.")
  .describe(
    "New password accepted only for signup, password reset and password change. Never log.",
  );

export const PasswordSchema = NewPasswordSchema;

export const DisplayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[가-힣a-zA-Z0-9._ -]+$/)
  .describe("Display name visible to the user.");

export const NicknameSchema = z
  .string()
  .trim()
  .min(2)
  .max(24)
  .regex(/^[가-힣a-zA-Z0-9._-]+$/)
  .describe("Community-safe nickname.");

export const LocaleSchema = z
  .enum(["ko-KR", "en-US"])
  .default(AUTH_DEFAULT_LOCALE);

export const TimezoneSchema = z.enum(["Asia/Seoul"]).default(AUTH_TIMEZONE);

export const CurrencySchema = z.enum(["KRW"]).default("KRW");

export const UrlSchema = z.string().url().max(2048);

export const SafeRedirectUriSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value: string): boolean =>
      value.startsWith("http://localhost") ||
      value.startsWith("https://") ||
      value.startsWith("salaryhijacking://"),
    "Redirect URI must be localhost, https, or the approved app scheme.",
  );

export const HashedValueSchema = z
  .string()
  .trim()
  .min(16)
  .max(256)
  .regex(/^[a-zA-Z0-9._:$/-]+$/)
  .describe("Hash, digest, or pseudonymous value. Raw PII is not allowed.");

export const MaskedValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .describe("Masked value for UI or audit payload.");

export const AppVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[0-9A-Za-z.+_-]+$/);

export const BuildNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[0-9A-Za-z.+_-]+$/);

/* -----------------------------------------------------------------------------
 * 3. Enum schemas
 * -------------------------------------------------------------------------- */

export const AuthProviderSchema = z.enum([
  "EMAIL",
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
]);

export const SocialAuthProviderSchema = z.enum([
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
]);

export const UserStatusSchema = z.enum([
  "PENDING_EMAIL_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "WITHDRAWN",
  "DELETED",
]);

export const AuthIdentityStatusSchema = z.enum([
  "ACTIVE",
  "REVOKED",
  "MERGED",
  "DISABLED",
]);

export const SessionStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "ROTATED",
]);

export const DevicePlatformSchema = z.enum([
  "IOS",
  "ANDROID",
  "WEB",
  "UNKNOWN",
]);

export const ConsentTypeSchema = z.enum([
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
  "AGE_CONFIRMATION",
  "COMMUNITY_POLICY",
  "PUSH_NOTIFICATION",
  "MARKETING_PUSH",
  "AD_PERSONALIZATION",
  "PARTNER_BENEFIT",
]);

export const ConsentStatusSchema = z.enum(["GRANTED", "WITHDRAWN"]);

export const MfaMethodSchema = z.enum(["TOTP", "RECOVERY_CODE"]);

export const AdminRoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "OPERATOR",
  "MODERATOR",
  "VIEWER",
]);

export const AdminPermissionSchema = z.enum([
  "ADMIN_DASHBOARD_READ",
  "ADMIN_USERS_READ",
  "ADMIN_USERS_WRITE",
  "ADMIN_POSTS_READ",
  "ADMIN_POSTS_MODERATE",
  "ADMIN_REPORTS_READ",
  "ADMIN_REPORTS_MODERATE",
  "ADMIN_NOTICES_WRITE",
  "ADMIN_EVENTS_WRITE",
  "ADMIN_BANNERS_WRITE",
  "ADMIN_ADS_APPROVE",
  "ADMIN_METRICS_READ",
  "ADMIN_AUDIT_READ",
  "ADMIN_INCIDENTS_WRITE",
  "ADMIN_SECURITY_READ",
]);

export const AuthErrorCodeSchema = z.enum([
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
  "AUTH_RBAC_FORBIDDEN",
  "AUTH_AUDIT_REQUIRED",
  "AUTH_PRIVACY_POLICY_VIOLATION",
  "AUTH_VALIDATION_FAILED",
  "AUTH_INTERNAL_ERROR",
]);

export const WithdrawalReasonSchema = z.enum([
  "NOT_USEFUL",
  "TOO_MANY_NOTIFICATIONS",
  "PRIVACY_CONCERN",
  "MOVING_TO_OTHER_SERVICE",
  "TEMPORARY_BREAK",
  "OTHER",
]);

/* -----------------------------------------------------------------------------
 * 4. Request metadata and standard response schemas
 * -------------------------------------------------------------------------- */

export const AuthRequestContextSchema = z
  .object({
    requestId: RequestIdSchema.optional(),
    traceId: TraceIdSchema.optional(),
    appEnv: z
      .enum(["local", "test", "staging", "uat", "production"])
      .optional(),
    locale: LocaleSchema.optional(),
    timezone: TimezoneSchema.optional(),
    ipHash: HashedValueSchema.optional(),
    userAgentHash: HashedValueSchema.optional(),
  })
  .strict();

export const AuthHeadersSchema = z
  .object({
    authorization: z
      .string()
      .regex(/^Bearer\s+[-._~+/=A-Za-z0-9]+$/)
      .optional(),
    "x-request-id": RequestIdSchema.optional(),
    "x-trace-id": TraceIdSchema.optional(),
    "x-idempotency-key": IdempotencyKeySchema.optional(),
  })
  .strict();

export const AuthFieldErrorSchema = z
  .object({
    field: z.string().min(1).max(120),
    message: z.string().min(1).max(300),
  })
  .strict();

export const AuthErrorSchema = z
  .object({
    code: AuthErrorCodeSchema,
    message: z.string().min(1).max(500),
    fieldErrors: z.array(AuthFieldErrorSchema).default([]),
    requestId: RequestIdSchema.optional(),
    traceId: TraceIdSchema.optional(),
  })
  .strict();

export const ResponseMetaSchema = z
  .object({
    requestId: RequestIdSchema.optional(),
    traceId: TraceIdSchema.optional(),
    serverTime: IsoDateTimeSchema,
    contractVersion: z.literal(AUTH_CONTRACT_VERSION),
  })
  .strict();

export const createAuthSuccessResponseSchema = <TData extends z.ZodTypeAny>(
  dataSchema: TData,
) =>
  z
    .object({
      ok: z.literal(true),
      data: dataSchema,
      meta: ResponseMetaSchema,
    })
    .strict();

export const AuthFailureResponseSchema = z
  .object({
    ok: z.literal(false),
    error: AuthErrorSchema,
    meta: ResponseMetaSchema,
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 5. User, profile, device, consent and session schemas
 * -------------------------------------------------------------------------- */

export const UserProfileSchema = z
  .object({
    userId: UuidSchema,
    displayName: DisplayNameSchema,
    nickname: NicknameSchema.nullable(),
    avatarUrl: UrlSchema.nullable(),
    locale: LocaleSchema,
    timezone: TimezoneSchema,
    currency: CurrencySchema,
    marketingOptIn: z.boolean(),
    pushOptIn: z.boolean(),
    communityTermsAccepted: z.boolean(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const PublicUserSchema = z
  .object({
    id: UuidSchema,
    email: OptionalEmailSchema,
    status: UserStatusSchema,
    profile: UserProfileSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    lastLoginAt: IsoDateTimeSchema.nullable(),
  })
  .strict();

export const AuthIdentitySchema = z
  .object({
    id: UuidSchema,
    userId: UuidSchema,
    provider: AuthProviderSchema,
    providerAccountIdHash: HashedValueSchema,
    providerEmail: OptionalEmailSchema,
    status: AuthIdentityStatusSchema,
    linkedAt: IsoDateTimeSchema,
    lastUsedAt: IsoDateTimeSchema.nullable(),
  })
  .strict();

export const DeviceRegistrationSchema = z
  .object({
    platform: DevicePlatformSchema,
    deviceIdHash: HashedValueSchema,
    installationIdHash: HashedValueSchema.optional(),
    pushTokenHash: HashedValueSchema.optional(),
    pushTokenCiphertext: z
      .string()
      .trim()
      .min(24)
      .max(4096)
      .optional()
      .describe("Encrypted push token payload. Raw push token is not allowed."),
    appVersion: AppVersionSchema.optional(),
    buildNumber: BuildNumberSchema.optional(),
    locale: LocaleSchema.optional(),
    timezone: TimezoneSchema.optional(),
  })
  .strict();

export const RegisteredDeviceSchema = z
  .object({
    id: UuidSchema,
    userId: UuidSchema,
    platform: DevicePlatformSchema,
    deviceIdHash: HashedValueSchema,
    pushTokenHash: HashedValueSchema.nullable(),
    pushTokenLast4: z.string().min(0).max(8).nullable(),
    appVersion: AppVersionSchema.nullable(),
    buildNumber: BuildNumberSchema.nullable(),
    isTrusted: z.boolean(),
    notificationEnabled: z.boolean(),
    lastSeenAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const ConsentSnapshotSchema = z
  .object({
    type: ConsentTypeSchema,
    status: ConsentStatusSchema,
    version: z.string().trim().min(1).max(60),
    grantedAt: IsoDateTimeSchema.nullable(),
    withdrawnAt: IsoDateTimeSchema.nullable(),
    source: z.enum(["SIGNUP", "SETTINGS", "ADMIN_IMPORT", "MIGRATION"]),
    evidenceHash: HashedValueSchema.optional(),
  })
  .strict();

export const RequiredConsentSchema = z
  .object({
    type: ConsentTypeSchema,
    version: z.string().trim().min(1).max(60),
    required: z.boolean(),
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(500),
  })
  .strict();

export const AuthSessionSchema = z
  .object({
    id: UuidSchema,
    userId: UuidSchema,
    status: SessionStatusSchema,
    deviceId: UuidSchema.nullable(),
    provider: AuthProviderSchema,
    issuedAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    refreshedAt: IsoDateTimeSchema.nullable(),
    revokedAt: IsoDateTimeSchema.nullable(),
    ipHash: HashedValueSchema.nullable(),
    userAgentHash: HashedValueSchema.nullable(),
  })
  .strict();

export const TokenPairSchema = z
  .object({
    tokenType: z.literal(AUTH_TOKEN_TYPE),
    accessToken: z
      .string()
      .min(32)
      .max(8192)
      .describe("Access token returned to client. Never log."),
    refreshToken: z
      .string()
      .min(32)
      .max(8192)
      .describe("Refresh token returned to client. Never log."),
    expiresIn: z.number().int().positive().max(86_400),
    refreshExpiresIn: z
      .number()
      .int()
      .positive()
      .max(60 * 60 * 24 * 60),
    issuedAt: IsoDateTimeSchema,
  })
  .strict();

export const AuthResultSchema = z
  .object({
    user: PublicUserSchema,
    session: AuthSessionSchema,
    tokens: TokenPairSchema,
    requiredConsents: z.array(RequiredConsentSchema).default([]),
    devices: z.array(RegisteredDeviceSchema).default([]),
    identities: z.array(AuthIdentitySchema).default([]),
  })
  .strict();

export const AdminPrincipalSchema = z
  .object({
    adminId: UuidSchema,
    userId: UuidSchema,
    email: EmailSchema,
    roles: z.array(AdminRoleSchema).min(1),
    permissions: z.array(AdminPermissionSchema).default([]),
    activeRole: AdminRoleSchema,
    mfaRequired: z.boolean(),
    mfaVerified: z.boolean(),
  })
  .strict();

export const AdminAuthResultSchema = z
  .object({
    principal: AdminPrincipalSchema,
    user: PublicUserSchema,
    session: AuthSessionSchema,
    tokens: TokenPairSchema,
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 6. Email auth request schemas
 * -------------------------------------------------------------------------- */

export const EmailSignUpRequestSchema = z
  .object({
    email: EmailSchema,
    password: NewPasswordSchema,
    displayName: DisplayNameSchema,
    nickname: NicknameSchema.optional(),
    device: DeviceRegistrationSchema.optional(),
    consents: z
      .array(
        z
          .object({
            type: ConsentTypeSchema,
            version: z.string().trim().min(1).max(60),
            granted: z.literal(true),
          })
          .strict(),
      )
      .min(3),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const EmailLoginRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordInputSchema,
    device: DeviceRegistrationSchema.optional(),
    mfaCode: z.string().trim().min(6).max(12).optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const AdminLoginRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordInputSchema,
    device: DeviceRegistrationSchema.optional(),
    mfaCode: z.string().trim().min(6).max(12).optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: PasswordInputSchema,
    newPassword: NewPasswordSchema,
    revokeOtherSessions: z.boolean().default(true),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const PasswordResetStartRequestSchema = z
  .object({
    email: EmailSchema,
    redirectUri: SafeRedirectUriSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const PasswordResetConfirmRequestSchema = z
  .object({
    resetToken: z.string().trim().min(32).max(1024),
    newPassword: NewPasswordSchema,
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const EmailVerificationStartRequestSchema = z
  .object({
    email: EmailSchema.optional(),
    redirectUri: SafeRedirectUriSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const EmailVerificationConfirmRequestSchema = z
  .object({
    verificationToken: z.string().trim().min(32).max(1024),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 7. Social login request schemas
 * -------------------------------------------------------------------------- */

export const OAuthStateSchema = z
  .string()
  .trim()
  .min(16)
  .max(512)
  .regex(/^[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]+$/);

export const OAuthCodeVerifierSchema = z
  .string()
  .trim()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/);

export const OAuthCodeChallengeSchema = z
  .string()
  .trim()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/);

export const SocialLoginStartRequestSchema = z
  .object({
    provider: SocialAuthProviderSchema,
    redirectUri: SafeRedirectUriSchema,
    state: OAuthStateSchema,
    codeChallenge: OAuthCodeChallengeSchema.optional(),
    platform: DevicePlatformSchema.default("WEB"),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const SocialLoginStartResultSchema = z
  .object({
    provider: SocialAuthProviderSchema,
    authorizationUrl: UrlSchema,
    state: OAuthStateSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export const SocialLoginCallbackRequestSchema = z
  .object({
    provider: SocialAuthProviderSchema,
    code: z.string().trim().min(1).max(4096),
    state: OAuthStateSchema,
    redirectUri: SafeRedirectUriSchema,
    codeVerifier: OAuthCodeVerifierSchema.optional(),
    device: DeviceRegistrationSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const LinkSocialIdentityRequestSchema = z
  .object({
    provider: SocialAuthProviderSchema,
    code: z.string().trim().min(1).max(4096),
    state: OAuthStateSchema,
    redirectUri: SafeRedirectUriSchema,
    codeVerifier: OAuthCodeVerifierSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const UnlinkSocialIdentityRequestSchema = z
  .object({
    provider: SocialAuthProviderSchema,
    confirm: z.literal(true),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 8. Token, session and logout schemas
 * -------------------------------------------------------------------------- */

export const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z
      .string()
      .min(32)
      .max(8192)
      .describe("Refresh token supplied by client. Never log."),
    deviceIdHash: HashedValueSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const RefreshTokenResultSchema = z
  .object({
    user: PublicUserSchema,
    session: AuthSessionSchema,
    tokens: TokenPairSchema,
  })
  .strict();

export const LogoutRequestSchema = z
  .object({
    refreshToken: z.string().min(32).max(8192).optional(),
    revokeCurrentSession: z.boolean().default(true),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const LogoutAllRequestSchema = z
  .object({
    keepCurrentSession: z.boolean().default(false),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const RevokeSessionRequestSchema = z
  .object({
    sessionId: UuidSchema,
    reason: z
      .enum([
        "USER_REQUEST",
        "PASSWORD_CHANGED",
        "SECURITY_EVENT",
        "ADMIN_ACTION",
      ])
      .default("USER_REQUEST"),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const SessionListQuerySchema = z
  .object({
    status: SessionStatusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

export const SessionListResultSchema = z
  .object({
    items: z.array(AuthSessionSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 9. MFA schemas
 * -------------------------------------------------------------------------- */

export const MfaStartSetupRequestSchema = z
  .object({
    method: MfaMethodSchema.default("TOTP"),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const MfaStartSetupResultSchema = z
  .object({
    method: MfaMethodSchema,
    secretPreview: MaskedValueSchema,
    provisioningUri: UrlSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export const MfaVerifySetupRequestSchema = z
  .object({
    method: MfaMethodSchema.default("TOTP"),
    code: z.string().trim().min(6).max(12),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const MfaVerifyLoginRequestSchema = z
  .object({
    sessionChallengeId: z.string().trim().min(16).max(256),
    code: z.string().trim().min(6).max(12),
    device: DeviceRegistrationSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const MfaDisableRequestSchema = z
  .object({
    password: PasswordInputSchema,
    code: z.string().trim().min(6).max(12),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 10. Profile, settings, device and consent schemas
 * -------------------------------------------------------------------------- */

export const MeResultSchema = z
  .object({
    user: PublicUserSchema,
    sessions: z.array(AuthSessionSchema).default([]),
    devices: z.array(RegisteredDeviceSchema).default([]),
    identities: z.array(AuthIdentitySchema).default([]),
    consents: z.array(ConsentSnapshotSchema).default([]),
    admin: AdminPrincipalSchema.nullable(),
  })
  .strict();

export const UpdateProfileRequestSchema = z
  .object({
    displayName: DisplayNameSchema.optional(),
    nickname: NicknameSchema.nullable().optional(),
    avatarUrl: UrlSchema.nullable().optional(),
    locale: LocaleSchema.optional(),
    timezone: TimezoneSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const UpdateUserSettingsRequestSchema = z
  .object({
    pushOptIn: z.boolean().optional(),
    marketingOptIn: z.boolean().optional(),
    communityTermsAccepted: z.boolean().optional(),
    locale: LocaleSchema.optional(),
    timezone: TimezoneSchema.optional(),
    currency: CurrencySchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const RegisterDeviceRequestSchema = z
  .object({
    device: DeviceRegistrationSchema,
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const UpdateDeviceRequestSchema = z
  .object({
    deviceId: UuidSchema,
    pushTokenHash: HashedValueSchema.nullable().optional(),
    pushTokenCiphertext: z
      .string()
      .trim()
      .min(24)
      .max(4096)
      .nullable()
      .optional(),
    notificationEnabled: z.boolean().optional(),
    appVersion: AppVersionSchema.optional(),
    buildNumber: BuildNumberSchema.optional(),
    lastSeenAt: IsoDateTimeSchema.optional(),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const RevokeDeviceRequestSchema = z
  .object({
    deviceId: UuidSchema,
    revokeSessions: z.boolean().default(true),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const GrantConsentRequestSchema = z
  .object({
    type: ConsentTypeSchema,
    version: z.string().trim().min(1).max(60),
    granted: z.literal(true),
    source: z.enum(["SIGNUP", "SETTINGS"]).default("SETTINGS"),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const WithdrawConsentRequestSchema = z
  .object({
    type: ConsentTypeSchema,
    version: z.string().trim().min(1).max(60).optional(),
    withdrawn: z.literal(true),
    source: z.enum(["SETTINGS"]).default("SETTINGS"),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const ConsentListResultSchema = z
  .object({
    items: z.array(ConsentSnapshotSchema),
    required: z.array(RequiredConsentSchema).default([]),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 11. Account status and withdrawal schemas
 * -------------------------------------------------------------------------- */

export const AccountStatusResultSchema = z
  .object({
    userId: UuidSchema,
    status: UserStatusSchema,
    emailVerified: z.boolean(),
    requiredConsents: z.array(RequiredConsentSchema).default([]),
    mfaEnabled: z.boolean(),
    activeSessions: z.number().int().min(0),
    trustedDevices: z.number().int().min(0),
    canUseFinancialFeatures: z.boolean(),
    canUseCommunity: z.boolean(),
    canReceiveAdsOrPartnerBenefits: z.boolean(),
  })
  .strict();

export const RequestAccountWithdrawalSchema = z
  .object({
    reason: WithdrawalReasonSchema,
    detail: z.string().trim().max(1000).optional(),
    password: PasswordInputSchema.optional(),
    confirmText: z.literal("DELETE_MY_ACCOUNT"),
    revokeAllSessions: z.boolean().default(true),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const AccountWithdrawalResultSchema = z
  .object({
    userId: UuidSchema,
    status: z.literal("WITHDRAWN"),
    requestedAt: IsoDateTimeSchema,
    deletionScheduledAt: IsoDateTimeSchema,
    gracePeriodDays: z.number().int().min(1).max(90),
  })
  .strict();

export const CancelAccountWithdrawalRequestSchema = z
  .object({
    confirm: z.literal(true),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 12. Admin auth and RBAC schemas
 * -------------------------------------------------------------------------- */

export const AdminSessionListQuerySchema = z
  .object({
    userId: UuidSchema.optional(),
    role: AdminRoleSchema.optional(),
    status: SessionStatusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().trim().min(1).max(256).optional(),
  })
  .strict();

export const AdminSessionListResultSchema = z
  .object({
    items: z.array(
      z
        .object({
          session: AuthSessionSchema,
          user: PublicUserSchema,
          admin: AdminPrincipalSchema.nullable(),
        })
        .strict(),
    ),
    nextCursor: z.string().nullable(),
  })
  .strict();

export const AdminRevokeUserSessionsRequestSchema = z
  .object({
    userId: UuidSchema,
    reason: z.enum([
      "SECURITY_EVENT",
      "ACCOUNT_SUSPENDED",
      "ADMIN_ACTION",
      "USER_REQUEST",
    ]),
    keepLatestSession: z.boolean().default(false),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const AdminGrantRoleRequestSchema = z
  .object({
    userId: UuidSchema,
    role: AdminRoleSchema,
    permissions: z.array(AdminPermissionSchema).default([]),
    reason: z.string().trim().min(5).max(500),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

export const AdminRevokeRoleRequestSchema = z
  .object({
    userId: UuidSchema,
    role: AdminRoleSchema,
    reason: z.string().trim().min(5).max(500),
    context: AuthRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 13. Route path and endpoint contract
 * -------------------------------------------------------------------------- */

export const AUTH_API_PATHS = {
  emailSignUp: "/auth/email/signup",
  emailLogin: "/auth/email/login",
  adminLogin: "/auth/admin/login",
  socialStart: "/auth/social/start",
  socialCallback: "/auth/social/callback",
  linkSocialIdentity: "/auth/social/link",
  unlinkSocialIdentity: "/auth/social/unlink",
  refreshToken: "/auth/token/refresh",
  logout: "/auth/logout",
  logoutAll: "/auth/logout-all",
  sessions: "/auth/sessions",
  revokeSession: "/auth/sessions/revoke",
  me: "/auth/me",
  updateProfile: "/auth/profile",
  updateSettings: "/auth/settings",
  registerDevice: "/auth/devices/register",
  updateDevice: "/auth/devices/update",
  revokeDevice: "/auth/devices/revoke",
  consents: "/auth/consents",
  grantConsent: "/auth/consents/grant",
  withdrawConsent: "/auth/consents/withdraw",
  passwordResetStart: "/auth/password/reset/start",
  passwordResetConfirm: "/auth/password/reset/confirm",
  emailVerificationStart: "/auth/email/verification/start",
  emailVerificationConfirm: "/auth/email/verification/confirm",
  changePassword: "/auth/password/change",
  mfaStartSetup: "/auth/mfa/setup/start",
  mfaVerifySetup: "/auth/mfa/setup/verify",
  mfaVerifyLogin: "/auth/mfa/login/verify",
  mfaDisable: "/auth/mfa/disable",
  accountStatus: "/auth/account/status",
  requestWithdrawal: "/auth/account/withdraw",
  cancelWithdrawal: "/auth/account/withdraw/cancel",
  adminSessions: "/auth/admin/sessions",
  adminRevokeUserSessions: "/auth/admin/sessions/revoke-user",
  adminGrantRole: "/auth/admin/roles/grant",
  adminRevokeRole: "/auth/admin/roles/revoke",
} as const;

export const AuthEndpointContract = {
  emailSignUp: {
    method: "POST",
    path: AUTH_API_PATHS.emailSignUp,
    request: EmailSignUpRequestSchema,
    response: createAuthSuccessResponseSchema(AuthResultSchema),
  },
  emailLogin: {
    method: "POST",
    path: AUTH_API_PATHS.emailLogin,
    request: EmailLoginRequestSchema,
    response: createAuthSuccessResponseSchema(AuthResultSchema),
  },
  adminLogin: {
    method: "POST",
    path: AUTH_API_PATHS.adminLogin,
    request: AdminLoginRequestSchema,
    response: createAuthSuccessResponseSchema(AdminAuthResultSchema),
  },
  socialStart: {
    method: "POST",
    path: AUTH_API_PATHS.socialStart,
    request: SocialLoginStartRequestSchema,
    response: createAuthSuccessResponseSchema(SocialLoginStartResultSchema),
  },
  socialCallback: {
    method: "POST",
    path: AUTH_API_PATHS.socialCallback,
    request: SocialLoginCallbackRequestSchema,
    response: createAuthSuccessResponseSchema(AuthResultSchema),
  },
  linkSocialIdentity: {
    method: "POST",
    path: AUTH_API_PATHS.linkSocialIdentity,
    request: LinkSocialIdentityRequestSchema,
    response: createAuthSuccessResponseSchema(AuthIdentitySchema),
  },
  unlinkSocialIdentity: {
    method: "POST",
    path: AUTH_API_PATHS.unlinkSocialIdentity,
    request: UnlinkSocialIdentityRequestSchema,
    response: createAuthSuccessResponseSchema(
      z
        .object({ provider: AuthProviderSchema, unlinked: z.literal(true) })
        .strict(),
    ),
  },
  refreshToken: {
    method: "POST",
    path: AUTH_API_PATHS.refreshToken,
    request: RefreshTokenRequestSchema,
    response: createAuthSuccessResponseSchema(RefreshTokenResultSchema),
  },
  logout: {
    method: "POST",
    path: AUTH_API_PATHS.logout,
    request: LogoutRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ revoked: z.literal(true) }).strict(),
    ),
  },
  logoutAll: {
    method: "POST",
    path: AUTH_API_PATHS.logoutAll,
    request: LogoutAllRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ revokedSessionCount: z.number().int().min(0) }).strict(),
    ),
  },
  sessions: {
    method: "GET",
    path: AUTH_API_PATHS.sessions,
    request: SessionListQuerySchema,
    response: createAuthSuccessResponseSchema(SessionListResultSchema),
  },
  revokeSession: {
    method: "POST",
    path: AUTH_API_PATHS.revokeSession,
    request: RevokeSessionRequestSchema,
    response: createAuthSuccessResponseSchema(AuthSessionSchema),
  },
  me: {
    method: "GET",
    path: AUTH_API_PATHS.me,
    request: z.object({}).strict(),
    response: createAuthSuccessResponseSchema(MeResultSchema),
  },
  updateProfile: {
    method: "PATCH",
    path: AUTH_API_PATHS.updateProfile,
    request: UpdateProfileRequestSchema,
    response: createAuthSuccessResponseSchema(PublicUserSchema),
  },
  updateSettings: {
    method: "PATCH",
    path: AUTH_API_PATHS.updateSettings,
    request: UpdateUserSettingsRequestSchema,
    response: createAuthSuccessResponseSchema(UserProfileSchema),
  },
  registerDevice: {
    method: "POST",
    path: AUTH_API_PATHS.registerDevice,
    request: RegisterDeviceRequestSchema,
    response: createAuthSuccessResponseSchema(RegisteredDeviceSchema),
  },
  updateDevice: {
    method: "PATCH",
    path: AUTH_API_PATHS.updateDevice,
    request: UpdateDeviceRequestSchema,
    response: createAuthSuccessResponseSchema(RegisteredDeviceSchema),
  },
  revokeDevice: {
    method: "POST",
    path: AUTH_API_PATHS.revokeDevice,
    request: RevokeDeviceRequestSchema,
    response: createAuthSuccessResponseSchema(
      z
        .object({
          revoked: z.literal(true),
          revokedSessions: z.number().int().min(0),
        })
        .strict(),
    ),
  },
  consents: {
    method: "GET",
    path: AUTH_API_PATHS.consents,
    request: z.object({}).strict(),
    response: createAuthSuccessResponseSchema(ConsentListResultSchema),
  },
  grantConsent: {
    method: "POST",
    path: AUTH_API_PATHS.grantConsent,
    request: GrantConsentRequestSchema,
    response: createAuthSuccessResponseSchema(ConsentSnapshotSchema),
  },
  withdrawConsent: {
    method: "POST",
    path: AUTH_API_PATHS.withdrawConsent,
    request: WithdrawConsentRequestSchema,
    response: createAuthSuccessResponseSchema(ConsentSnapshotSchema),
  },
  passwordResetStart: {
    method: "POST",
    path: AUTH_API_PATHS.passwordResetStart,
    request: PasswordResetStartRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ accepted: z.literal(true) }).strict(),
    ),
  },
  passwordResetConfirm: {
    method: "POST",
    path: AUTH_API_PATHS.passwordResetConfirm,
    request: PasswordResetConfirmRequestSchema,
    response: createAuthSuccessResponseSchema(
      z
        .object({
          changed: z.literal(true),
          revokedSessionCount: z.number().int().min(0),
        })
        .strict(),
    ),
  },
  emailVerificationStart: {
    method: "POST",
    path: AUTH_API_PATHS.emailVerificationStart,
    request: EmailVerificationStartRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ accepted: z.literal(true) }).strict(),
    ),
  },
  emailVerificationConfirm: {
    method: "POST",
    path: AUTH_API_PATHS.emailVerificationConfirm,
    request: EmailVerificationConfirmRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ verified: z.literal(true) }).strict(),
    ),
  },
  changePassword: {
    method: "POST",
    path: AUTH_API_PATHS.changePassword,
    request: ChangePasswordRequestSchema,
    response: createAuthSuccessResponseSchema(
      z
        .object({
          changed: z.literal(true),
          revokedSessionCount: z.number().int().min(0),
        })
        .strict(),
    ),
  },
  mfaStartSetup: {
    method: "POST",
    path: AUTH_API_PATHS.mfaStartSetup,
    request: MfaStartSetupRequestSchema,
    response: createAuthSuccessResponseSchema(MfaStartSetupResultSchema),
  },
  mfaVerifySetup: {
    method: "POST",
    path: AUTH_API_PATHS.mfaVerifySetup,
    request: MfaVerifySetupRequestSchema,
    response: createAuthSuccessResponseSchema(
      z
        .object({
          enabled: z.literal(true),
          recoveryCodes: z.array(MaskedValueSchema),
        })
        .strict(),
    ),
  },
  mfaVerifyLogin: {
    method: "POST",
    path: AUTH_API_PATHS.mfaVerifyLogin,
    request: MfaVerifyLoginRequestSchema,
    response: createAuthSuccessResponseSchema(AuthResultSchema),
  },
  mfaDisable: {
    method: "POST",
    path: AUTH_API_PATHS.mfaDisable,
    request: MfaDisableRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ disabled: z.literal(true) }).strict(),
    ),
  },
  accountStatus: {
    method: "GET",
    path: AUTH_API_PATHS.accountStatus,
    request: z.object({}).strict(),
    response: createAuthSuccessResponseSchema(AccountStatusResultSchema),
  },
  requestWithdrawal: {
    method: "POST",
    path: AUTH_API_PATHS.requestWithdrawal,
    request: RequestAccountWithdrawalSchema,
    response: createAuthSuccessResponseSchema(AccountWithdrawalResultSchema),
  },
  cancelWithdrawal: {
    method: "POST",
    path: AUTH_API_PATHS.cancelWithdrawal,
    request: CancelAccountWithdrawalRequestSchema,
    response: createAuthSuccessResponseSchema(
      z
        .object({ status: z.literal("ACTIVE"), cancelled: z.literal(true) })
        .strict(),
    ),
  },
  adminSessions: {
    method: "GET",
    path: AUTH_API_PATHS.adminSessions,
    request: AdminSessionListQuerySchema,
    response: createAuthSuccessResponseSchema(AdminSessionListResultSchema),
  },
  adminRevokeUserSessions: {
    method: "POST",
    path: AUTH_API_PATHS.adminRevokeUserSessions,
    request: AdminRevokeUserSessionsRequestSchema,
    response: createAuthSuccessResponseSchema(
      z.object({ revokedSessionCount: z.number().int().min(0) }).strict(),
    ),
  },
  adminGrantRole: {
    method: "POST",
    path: AUTH_API_PATHS.adminGrantRole,
    request: AdminGrantRoleRequestSchema,
    response: createAuthSuccessResponseSchema(AdminPrincipalSchema),
  },
  adminRevokeRole: {
    method: "POST",
    path: AUTH_API_PATHS.adminRevokeRole,
    request: AdminRevokeRoleRequestSchema,
    response: createAuthSuccessResponseSchema(AdminPrincipalSchema),
  },
} as const;

/* -----------------------------------------------------------------------------
 * 14. Schema registry
 * -------------------------------------------------------------------------- */

export const AuthSchemas = {
  primitives: {
    UuidSchema,
    IsoDateTimeSchema,
    RequestIdSchema,
    TraceIdSchema,
    IdempotencyKeySchema,
    EmailSchema,
    PasswordInputSchema,
    NewPasswordSchema,
    PasswordSchema,
    DisplayNameSchema,
    NicknameSchema,
    LocaleSchema,
    TimezoneSchema,
    CurrencySchema,
    UrlSchema,
    SafeRedirectUriSchema,
    HashedValueSchema,
    MaskedValueSchema,
    AppVersionSchema,
    BuildNumberSchema,
  },
  enums: {
    AuthProviderSchema,
    SocialAuthProviderSchema,
    UserStatusSchema,
    AuthIdentityStatusSchema,
    SessionStatusSchema,
    DevicePlatformSchema,
    ConsentTypeSchema,
    ConsentStatusSchema,
    MfaMethodSchema,
    AdminRoleSchema,
    AdminPermissionSchema,
    AuthErrorCodeSchema,
    WithdrawalReasonSchema,
  },
  common: {
    AuthRequestContextSchema,
    AuthHeadersSchema,
    AuthFieldErrorSchema,
    AuthErrorSchema,
    ResponseMetaSchema,
    AuthFailureResponseSchema,
  },
  entities: {
    UserProfileSchema,
    PublicUserSchema,
    AuthIdentitySchema,
    DeviceRegistrationSchema,
    RegisteredDeviceSchema,
    ConsentSnapshotSchema,
    RequiredConsentSchema,
    AuthSessionSchema,
    TokenPairSchema,
    AuthResultSchema,
    AdminPrincipalSchema,
    AdminAuthResultSchema,
  },
  requests: {
    EmailSignUpRequestSchema,
    EmailLoginRequestSchema,
    AdminLoginRequestSchema,
    ChangePasswordRequestSchema,
    PasswordResetStartRequestSchema,
    PasswordResetConfirmRequestSchema,
    EmailVerificationStartRequestSchema,
    EmailVerificationConfirmRequestSchema,
    SocialLoginStartRequestSchema,
    SocialLoginCallbackRequestSchema,
    LinkSocialIdentityRequestSchema,
    UnlinkSocialIdentityRequestSchema,
    RefreshTokenRequestSchema,
    LogoutRequestSchema,
    LogoutAllRequestSchema,
    RevokeSessionRequestSchema,
    SessionListQuerySchema,
    MfaStartSetupRequestSchema,
    MfaVerifySetupRequestSchema,
    MfaVerifyLoginRequestSchema,
    MfaDisableRequestSchema,
    UpdateProfileRequestSchema,
    UpdateUserSettingsRequestSchema,
    RegisterDeviceRequestSchema,
    UpdateDeviceRequestSchema,
    RevokeDeviceRequestSchema,
    GrantConsentRequestSchema,
    WithdrawConsentRequestSchema,
    RequestAccountWithdrawalSchema,
    CancelAccountWithdrawalRequestSchema,
    AdminSessionListQuerySchema,
    AdminRevokeUserSessionsRequestSchema,
    AdminGrantRoleRequestSchema,
    AdminRevokeRoleRequestSchema,
  },
  results: {
    SocialLoginStartResultSchema,
    RefreshTokenResultSchema,
    SessionListResultSchema,
    MeResultSchema,
    ConsentListResultSchema,
    AccountStatusResultSchema,
    AccountWithdrawalResultSchema,
    AdminSessionListResultSchema,
  },
  paths: AUTH_API_PATHS,
  endpoints: AuthEndpointContract,
} as const;

/* -----------------------------------------------------------------------------
 * 15. Type exports
 * -------------------------------------------------------------------------- */

export type Uuid = z.infer<typeof UuidSchema>;
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;
export type PasswordInput = z.infer<typeof PasswordInputSchema>;
export type NewPassword = z.infer<typeof NewPasswordSchema>;
export type Password = z.infer<typeof PasswordSchema>;

export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type SocialAuthProvider = z.infer<typeof SocialAuthProviderSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type AuthIdentityStatus = z.infer<typeof AuthIdentityStatusSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;
export type MfaMethod = z.infer<typeof MfaMethodSchema>;
export type AdminRole = z.infer<typeof AdminRoleSchema>;
export type AdminPermission = z.infer<typeof AdminPermissionSchema>;
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;

export type AuthRequestContext = z.infer<typeof AuthRequestContextSchema>;
export type AuthHeaders = z.infer<typeof AuthHeadersSchema>;
export type AuthError = z.infer<typeof AuthErrorSchema>;
export type AuthFailureResponse = z.infer<typeof AuthFailureResponseSchema>;

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type PublicUser = z.infer<typeof PublicUserSchema>;
export type AuthIdentity = z.infer<typeof AuthIdentitySchema>;
export type DeviceRegistration = z.infer<typeof DeviceRegistrationSchema>;
export type RegisteredDevice = z.infer<typeof RegisteredDeviceSchema>;
export type ConsentSnapshot = z.infer<typeof ConsentSnapshotSchema>;
export type RequiredConsent = z.infer<typeof RequiredConsentSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type TokenPair = z.infer<typeof TokenPairSchema>;
export type AuthResult = z.infer<typeof AuthResultSchema>;
export type AdminPrincipal = z.infer<typeof AdminPrincipalSchema>;
export type AdminAuthResult = z.infer<typeof AdminAuthResultSchema>;

export type EmailSignUpRequest = z.infer<typeof EmailSignUpRequestSchema>;
export type EmailLoginRequest = z.infer<typeof EmailLoginRequestSchema>;
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;
export type SocialLoginStartRequest = z.infer<
  typeof SocialLoginStartRequestSchema
>;
export type SocialLoginStartResult = z.infer<
  typeof SocialLoginStartResultSchema
>;
export type SocialLoginCallbackRequest = z.infer<
  typeof SocialLoginCallbackRequestSchema
>;
export type LinkSocialIdentityRequest = z.infer<
  typeof LinkSocialIdentityRequestSchema
>;
export type UnlinkSocialIdentityRequest = z.infer<
  typeof UnlinkSocialIdentityRequestSchema
>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResult = z.infer<typeof RefreshTokenResultSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type LogoutAllRequest = z.infer<typeof LogoutAllRequestSchema>;
export type RevokeSessionRequest = z.infer<typeof RevokeSessionRequestSchema>;
export type SessionListQuery = z.infer<typeof SessionListQuerySchema>;
export type SessionListResult = z.infer<typeof SessionListResultSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type PasswordResetStartRequest = z.infer<
  typeof PasswordResetStartRequestSchema
>;
export type PasswordResetConfirmRequest = z.infer<
  typeof PasswordResetConfirmRequestSchema
>;
export type EmailVerificationStartRequest = z.infer<
  typeof EmailVerificationStartRequestSchema
>;
export type EmailVerificationConfirmRequest = z.infer<
  typeof EmailVerificationConfirmRequestSchema
>;
export type MfaStartSetupRequest = z.infer<typeof MfaStartSetupRequestSchema>;
export type MfaStartSetupResult = z.infer<typeof MfaStartSetupResultSchema>;
export type MfaVerifySetupRequest = z.infer<typeof MfaVerifySetupRequestSchema>;
export type MfaVerifyLoginRequest = z.infer<typeof MfaVerifyLoginRequestSchema>;
export type MfaDisableRequest = z.infer<typeof MfaDisableRequestSchema>;
export type MeResult = z.infer<typeof MeResultSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type UpdateUserSettingsRequest = z.infer<
  typeof UpdateUserSettingsRequestSchema
>;
export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequestSchema>;
export type UpdateDeviceRequest = z.infer<typeof UpdateDeviceRequestSchema>;
export type RevokeDeviceRequest = z.infer<typeof RevokeDeviceRequestSchema>;
export type GrantConsentRequest = z.infer<typeof GrantConsentRequestSchema>;
export type WithdrawConsentRequest = z.infer<
  typeof WithdrawConsentRequestSchema
>;
export type ConsentListResult = z.infer<typeof ConsentListResultSchema>;
export type AccountStatusResult = z.infer<typeof AccountStatusResultSchema>;
export type RequestAccountWithdrawal = z.infer<
  typeof RequestAccountWithdrawalSchema
>;
export type AccountWithdrawalResult = z.infer<
  typeof AccountWithdrawalResultSchema
>;
export type CancelAccountWithdrawalRequest = z.infer<
  typeof CancelAccountWithdrawalRequestSchema
>;
export type AdminSessionListQuery = z.infer<typeof AdminSessionListQuerySchema>;
export type AdminSessionListResult = z.infer<
  typeof AdminSessionListResultSchema
>;
export type AdminRevokeUserSessionsRequest = z.infer<
  typeof AdminRevokeUserSessionsRequestSchema
>;
export type AdminGrantRoleRequest = z.infer<typeof AdminGrantRoleRequestSchema>;
export type AdminRevokeRoleRequest = z.infer<
  typeof AdminRevokeRoleRequestSchema
>;

export type AuthEndpointKey = keyof typeof AuthEndpointContract;
export type AuthApiPathKey = keyof typeof AUTH_API_PATHS;

/* -----------------------------------------------------------------------------
 * 16. Runtime helpers
 * -------------------------------------------------------------------------- */

export const parseAuthContractInput = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> => schema.parse(input);

export const safeParseAuthContractInput = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): ReturnType<TSchema["safeParse"]> =>
  schema.safeParse(input) as ReturnType<TSchema["safeParse"]>;
