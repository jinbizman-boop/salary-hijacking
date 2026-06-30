/**
 * packages/types/src/domain/user.types.ts
 *
 * 급여납치 Salary Hijacking Platform · User / Auth / Profile Domain Types
 *
 * 파일 목적
 * - 모바일 앱, 관리자 콘솔, API 서버, DB 계층이 공유하는 사용자 도메인 타입 SSOT를 제공한다.
 * - 이메일/소셜 로그인, 자동 로그인 세션, 사용자 프로필, 마이페이지, 설정, 약관/동의,
 *   기기/푸시 권한, MFA, 관리자 RBAC, 계정 탈퇴, 감사로그, 멱등성, 보안 정책을 한 파일에 고정한다.
 * - 급여·지출·저축 원천 데이터, raw password, raw token, raw push token, raw secret, 광고용 금융 결합 데이터가
 *   사용자 공개/공유 payload에 섞이지 않도록 타입 레벨의 정책 경계를 명확히 한다.
 */

export const USER_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const USER_TYPES_PACKAGE = "@salary-hijacking/types" as const;
export const USER_TYPES_DOMAIN = "user" as const;
export const USER_TIMEZONE = "Asia/Seoul" as const;
export const USER_LOCALE = "ko-KR" as const;
export const USER_CURRENCY = "KRW" as const;
export const USER_DEFAULT_NICKNAME = "급여납치러" as const;
export const USER_DEFAULT_COMMUNITY_NICKNAME = "익명 납치러" as const;

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type UrlString = string;
export type EmailString = string;
export type HashString = string;
export type SecretRef = string;
export type IdempotencyKey = string;
export type RequestId = string;
export type TraceId = string;
export type Locale = typeof USER_LOCALE | "en-US";
export type Timezone = typeof USER_TIMEZONE;
export type Currency = typeof USER_CURRENCY;
export type NonNegativeInteger = number;
export type PositiveInteger = number;
export type Percentage = number;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};

export interface UserDomainEntity {
  readonly id: UUID;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface UserSoftDeletable {
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly deletionReason?: Nullable<string>;
}

export interface UserTraceableMutation {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly idempotencyKey?: IdempotencyKey;
}

export const AUTH_PROVIDERS = [
  "EMAIL",
  "PASSWORD",
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const SOCIAL_AUTH_PROVIDERS = [
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
] as const;
export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];

export const USER_STATUSES = [
  "PENDING_EMAIL_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "WITHDRAWN",
  "DELETED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const AUTH_IDENTITY_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "MERGED",
  "DISABLED",
] as const;
export type AuthIdentityStatus = (typeof AUTH_IDENTITY_STATUSES)[number];

export const CREDENTIAL_KINDS = [
  "PASSWORD_HASH",
  "PASSKEY",
  "RECOVERY_CODE_HASH",
  "OAUTH_SUBJECT_REF",
] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export const CREDENTIAL_STATUSES = [
  "ACTIVE",
  "ROTATED",
  "REVOKED",
  "EXPIRED",
  "DISABLED",
] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const SESSION_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "ROTATED",
  "SUSPICIOUS",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const DEVICE_PLATFORMS = [
  "IOS",
  "ANDROID",
  "WEB",
  "ADMIN_WEB",
  "UNKNOWN",
] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const DEVICE_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "BLOCKED",
] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const PUSH_PERMISSION_STATUSES = [
  "AUTHORIZED",
  "DENIED",
  "PROVISIONAL",
  "EPHEMERAL",
  "NOT_DETERMINED",
] as const;
export type PushPermissionStatus = (typeof PUSH_PERMISSION_STATUSES)[number];

export const CONSENT_TYPES = [
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
  "AGE_CONFIRMATION",
  "COMMUNITY_POLICY",
  "PUSH_NOTIFICATION",
  "MARKETING_PUSH",
  "AD_PERSONALIZATION",
  "PARTNER_BENEFIT",
  "ANALYTICS",
  "ADMIN_OPERATION_NOTICE",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const REQUIRED_SIGNUP_CONSENT_TYPES = [
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
  "AGE_CONFIRMATION",
  "COMMUNITY_POLICY",
] as const satisfies readonly ConsentType[];
export type RequiredSignupConsentType =
  (typeof REQUIRED_SIGNUP_CONSENT_TYPES)[number];

export const MARKETING_CONSENT_TYPES = [
  "MARKETING_PUSH",
  "AD_PERSONALIZATION",
  "PARTNER_BENEFIT",
] as const satisfies readonly ConsentType[];
export type MarketingConsentType = (typeof MARKETING_CONSENT_TYPES)[number];

export const CONSENT_STATUSES = ["GRANTED", "WITHDRAWN"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const CONSENT_SOURCES = [
  "APP",
  "WEB",
  "ADMIN",
  "API",
  "MIGRATION",
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export const MFA_METHODS = ["TOTP", "RECOVERY_CODE", "PASSKEY"] as const;
export type MfaMethod = (typeof MFA_METHODS)[number];

export const MFA_STATUSES = [
  "PENDING",
  "ACTIVE",
  "DISABLED",
  "REVOKED",
] as const;
export type MfaStatus = (typeof MFA_STATUSES)[number];

export const ADMIN_ROLE_KEYS = [
  "owner",
  "platform_admin",
  "security_admin",
  "backend_admin",
  "product_admin",
  "support_admin",
  "ads_admin",
  "moderator",
  "viewer",
] as const;
export type AdminRoleKey = (typeof ADMIN_ROLE_KEYS)[number];

export const ADMIN_ROLE_STATUSES = ["ACTIVE", "DISABLED", "DELETED"] as const;
export type AdminRoleStatus = (typeof ADMIN_ROLE_STATUSES)[number];

export const ADMIN_ROLE_MEMBER_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "SUSPENDED",
] as const;
export type AdminRoleMemberStatus = (typeof ADMIN_ROLE_MEMBER_STATUSES)[number];

export const USER_PROFILE_VISIBILITIES = [
  "private",
  "members_only",
  "public",
] as const;
export type UserProfileVisibility = (typeof USER_PROFILE_VISIBILITIES)[number];

export const USER_GENDER_VALUES = [
  "UNSPECIFIED",
  "FEMALE",
  "MALE",
  "NON_BINARY",
  "OTHER",
] as const;
export type UserGender = (typeof USER_GENDER_VALUES)[number];

export const ACCOUNT_WITHDRAWAL_STATUSES = [
  "NONE",
  "REQUESTED",
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type AccountWithdrawalStatus =
  (typeof ACCOUNT_WITHDRAWAL_STATUSES)[number];

export const USER_SORT_OPTIONS = [
  "latest",
  "last_login",
  "last_active",
  "nickname",
  "status",
] as const;
export type UserSortBy = (typeof USER_SORT_OPTIONS)[number];

export const USER_ADMIN_SORT_OPTIONS = [
  "latest",
  "last_login",
  "last_active",
  "status",
  "risk_desc",
  "consent_updated",
] as const;
export type UserAdminSortBy = (typeof USER_ADMIN_SORT_OPTIONS)[number];

export const USER_AUDIT_EVENT_TYPES = [
  "user.created",
  "user.updated",
  "user.login.succeeded",
  "user.login.failed",
  "user.logout",
  "user.withdrawn",
  "auth.identity.linked",
  "auth.identity.revoked",
  "auth.credential.rotated",
  "auth.session.created",
  "auth.session.revoked",
  "mfa.enabled",
  "mfa.disabled",
  "profile.updated",
  "settings.updated",
  "consent.granted",
  "consent.withdrawn",
  "device.registered",
  "device.revoked",
  "admin.role.created",
  "admin.role.member.assigned",
  "admin.role.member.revoked",
  "idempotency.replayed",
] as const;
export type UserAuditEventType = (typeof USER_AUDIT_EVENT_TYPES)[number];

export const USER_IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;
export type UserIdempotencyStatus = (typeof USER_IDEMPOTENCY_STATUSES)[number];

export const USER_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type UserRiskLevel = (typeof USER_RISK_LEVELS)[number];

export const USER_PERMISSION_KEYS = [
  "*",
  "platform:read",
  "platform:write",
  "deploy:approve",
  "security:read",
  "security:write",
  "audit:read",
  "api:read",
  "api:write",
  "db:operate",
  "product:read",
  "product:write",
  "notice:write",
  "support:read",
  "support:write",
  "user:support",
  "ads:read",
  "ads:write",
  "consent:read",
  "community:moderate",
  "report:read",
  "admin:read",
] as const;
export type UserPermissionKey = (typeof USER_PERMISSION_KEYS)[number];

export interface UserPolicyGuard {
  readonly rawPasswordIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawPushTokenIncluded: false;
  readonly rawIpIncluded: false;
  readonly rawUserAgentIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly payrollExpenseSavingsRawAmountIncluded: false;
  readonly adsFinancialJoinAllowed: false;
  readonly communityFinancialJoinAllowed: false;
  readonly credentialStoredAsHashOrSecretRefOnly: true;
  readonly refreshTokenStoredAsHashOnly: true;
  readonly pushTokenStoredAsHashOrSecretRefOnly: true;
  readonly serverAuthorityAuthRequired: true;
  readonly clientFinalAuthDecisionAllowed: false;
  readonly marketingRequiresExplicitConsent: true;
  readonly adPersonalizationRequiresExplicitConsent: true;
  readonly rlsRequired: true;
  readonly auditRequired: true;
}

export const USER_SAFE_POLICY_GUARD: UserPolicyGuard = Object.freeze({
  rawPasswordIncluded: false,
  rawTokenIncluded: false,
  rawSecretIncluded: false,
  rawPushTokenIncluded: false,
  rawIpIncluded: false,
  rawUserAgentIncluded: false,
  rawFinancialSourceDataIncluded: false,
  payrollExpenseSavingsRawAmountIncluded: false,
  adsFinancialJoinAllowed: false,
  communityFinancialJoinAllowed: false,
  credentialStoredAsHashOrSecretRefOnly: true,
  refreshTokenStoredAsHashOnly: true,
  pushTokenStoredAsHashOrSecretRefOnly: true,
  serverAuthorityAuthRequired: true,
  clientFinalAuthDecisionAllowed: false,
  marketingRequiresExplicitConsent: true,
  adPersonalizationRequiresExplicitConsent: true,
  rlsRequired: true,
  auditRequired: true,
});

export interface UserRequestContext {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly viewerUserId?: UUID;
  readonly adminUserId?: UUID;
  readonly locale?: Locale;
  readonly timezone?: Timezone;
  readonly appVersion?: string;
  readonly platform?:
    | "IOS"
    | "ANDROID"
    | "WEB"
    | "ADMIN"
    | "SERVER"
    | "WORKER"
    | "UNKNOWN";
}

export interface UserOwnerTrace {
  readonly ownerUserId: UUID;
  readonly ownerHash: HashString;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly deviceHash?: HashString;
  readonly retainedUntil: ISODateTimeString;
  readonly serverOnly: true;
}

export interface UserAdminActor {
  readonly adminUserId: UUID;
  readonly displayName: string;
  readonly role: AdminRoleKey;
}

export type SafeUserMetadataValue =
  | string
  | number
  | boolean
  | null
  | readonly string[];
export type SafeUserMetadata = Readonly<Record<string, SafeUserMetadataValue>>;

export interface UserAccount extends UserDomainEntity, UserSoftDeletable {
  readonly userId: UUID;
  readonly emailMasked?: Nullable<string>;
  readonly emailHash?: Nullable<HashString>;
  readonly emailVerifiedAt?: Nullable<ISODateTimeString>;
  readonly phoneNumberMasked?: Nullable<string>;
  readonly phoneNumberHash?: Nullable<HashString>;
  readonly phoneVerifiedAt?: Nullable<ISODateTimeString>;
  readonly nickname: string;
  readonly status: UserStatus;
  readonly lastLoginAt?: Nullable<ISODateTimeString>;
  readonly lastActiveAt?: Nullable<ISODateTimeString>;
  readonly suspendedAt?: Nullable<ISODateTimeString>;
  readonly suspendedReason?: Nullable<string>;
  readonly withdrawnAt?: Nullable<ISODateTimeString>;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface UserProfile extends UserDomainEntity {
  readonly profileId: UUID;
  readonly userId: UUID;
  readonly displayName: string;
  readonly nickname: string;
  readonly communityNickname: string;
  readonly jobTitle?: Nullable<string>;
  readonly profileImageUrl?: Nullable<UrlString>;
  readonly avatarUrl?: Nullable<UrlString>;
  readonly bio?: Nullable<string>;
  readonly profileVisibility: UserProfileVisibility;
  readonly defaultAnonymousPosting: boolean;
  readonly levelBadgeVisible: boolean;
  readonly salaryMetricsVisible: boolean;
  readonly locale: Locale;
  readonly timezone: Timezone;
  readonly currencyCode: Currency;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface UserSettings extends UserDomainEntity {
  readonly settingId: UUID;
  readonly userId: UUID;
  readonly pushEnabled: boolean;
  readonly budgetAlertEnabled: boolean;
  readonly fixedPaymentAlertEnabled: boolean;
  readonly savingsAlertEnabled: boolean;
  readonly growthAlertEnabled: boolean;
  readonly communityAlertEnabled: boolean;
  readonly eventAlertEnabled: boolean;
  readonly securityAlertEnabled: boolean;
  readonly marketingOptIn: boolean;
  readonly adPersonalizationOptIn: boolean;
  readonly analyticsOptIn: boolean;
  readonly partnerBenefitOptIn: boolean;
  readonly autoLoginEnabled: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietStartLocalTime: string;
  readonly quietEndLocalTime: string;
  readonly timezone: Timezone;
  readonly locale: Locale;
  readonly currencyCode: Currency;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface UserConsent extends UserDomainEntity {
  readonly consentId: UUID;
  readonly userId: UUID;
  readonly consentType: ConsentType;
  readonly status: ConsentStatus;
  readonly granted: boolean;
  readonly consentVersion: string;
  readonly source: ConsentSource;
  readonly ipHash?: Nullable<HashString>;
  readonly userAgentHash?: Nullable<HashString>;
  readonly grantedAt?: Nullable<ISODateTimeString>;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface UserConsentSnapshot {
  readonly userId: UUID;
  readonly termsOfService: boolean;
  readonly privacyPolicy: boolean;
  readonly ageConfirmation: boolean;
  readonly communityPolicy: boolean;
  readonly pushNotification: boolean;
  readonly marketingPush: boolean;
  readonly adPersonalization: boolean;
  readonly partnerBenefit: boolean;
  readonly analytics: boolean;
  readonly adminOperationNotice: boolean;
  readonly requiredForSignupSatisfied: boolean;
  readonly marketingAllowed: boolean;
  readonly adPersonalizationAllowed: boolean;
  readonly partnerBenefitAllowed: boolean;
  readonly latestUpdatedAt?: Nullable<ISODateTimeString>;
}

export interface PublicUser {
  readonly userId: UUID;
  readonly status: UserStatus;
  readonly displayName: string;
  readonly nickname: string;
  readonly communityNickname: string;
  readonly jobTitle?: Nullable<string>;
  readonly profileImageUrl?: Nullable<UrlString>;
  readonly level?: NonNegativeInteger;
  readonly score?: NonNegativeInteger;
  readonly profileVisibility: UserProfileVisibility;
  readonly levelBadgeVisible: boolean;
  readonly salaryMetricsVisible: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface MeUser extends PublicUser {
  readonly emailMasked?: Nullable<string>;
  readonly phoneNumberMasked?: Nullable<string>;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
  readonly settings: UserSettings;
  readonly consentSnapshot: UserConsentSnapshot;
  readonly linkedProviders: readonly AuthProvider[];
  readonly activeSessionCount: NonNegativeInteger;
  readonly activeDeviceCount: NonNegativeInteger;
  readonly mfaEnabled: boolean;
  readonly lastLoginAt?: Nullable<ISODateTimeString>;
  readonly lastActiveAt?: Nullable<ISODateTimeString>;
}

export interface UserMyPageSummary {
  readonly userId: UUID;
  readonly displayName: string;
  readonly nickname: string;
  readonly jobTitle?: Nullable<string>;
  readonly profileImageUrl?: Nullable<UrlString>;
  readonly cumulativeHijackAmountLabel: string;
  readonly levelLabel: string;
  readonly level: NonNegativeInteger;
  readonly selfManagementScore: number;
  readonly postCount: NonNegativeInteger;
  readonly growthCompletionCount: NonNegativeInteger;
  readonly inquiryCount: NonNegativeInteger;
  readonly noticeUnreadCount: NonNegativeInteger;
  readonly salaryMetricsVisible: boolean;
  readonly levelBadgeVisible: boolean;
}

export interface AuthIdentity extends UserDomainEntity {
  readonly identityId: UUID;
  readonly userId: UUID;
  readonly provider: AuthProvider;
  readonly providerUserKeyHash: HashString;
  readonly providerUserKeyHint?: Nullable<string>;
  readonly providerEmailMasked?: Nullable<string>;
  readonly providerEmailHash?: Nullable<HashString>;
  readonly status: AuthIdentityStatus;
  readonly linkedAt: ISODateTimeString;
  readonly lastUsedAt?: Nullable<ISODateTimeString>;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly revokedReason?: Nullable<string>;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface AuthCredential extends UserDomainEntity {
  readonly credentialId: UUID;
  readonly userId: UUID;
  readonly identityId?: Nullable<UUID>;
  readonly kind: CredentialKind;
  readonly status: CredentialStatus;
  readonly credentialHash?: HashString;
  readonly credentialSecretRef?: SecretRef;
  readonly algorithm: "argon2id" | "bcrypt" | "passkey" | "oauth-ref" | string;
  readonly version: PositiveInteger;
  readonly lastUsedAt?: Nullable<ISODateTimeString>;
  readonly rotatedAt?: Nullable<ISODateTimeString>;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly expiresAt?: Nullable<ISODateTimeString>;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface AuthSession extends UserDomainEntity {
  readonly sessionId: UUID;
  readonly userId: UUID;
  readonly deviceId?: Nullable<UUID>;
  readonly refreshTokenHash: HashString;
  readonly sessionFamilyId: UUID;
  readonly status: SessionStatus;
  readonly ipHash?: Nullable<HashString>;
  readonly userAgentHash?: Nullable<HashString>;
  readonly issuedAt: ISODateTimeString;
  readonly lastUsedAt?: Nullable<ISODateTimeString>;
  readonly expiresAt: ISODateTimeString;
  readonly rotatedAt?: Nullable<ISODateTimeString>;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly revokedReason?: Nullable<string>;
  readonly idempotencyKey: IdempotencyKey;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface UserDevice extends UserDomainEntity {
  readonly deviceId: UUID;
  readonly userId: UUID;
  readonly platform: DevicePlatform;
  readonly status: DeviceStatus;
  readonly pushPermissionStatus: PushPermissionStatus;
  readonly pushTokenHash?: Nullable<HashString>;
  readonly pushTokenSecretRef?: Nullable<SecretRef>;
  readonly deviceFingerprintHash?: Nullable<HashString>;
  readonly appVersion?: Nullable<string>;
  readonly buildNumber?: Nullable<string>;
  readonly osVersion?: Nullable<string>;
  readonly lastSeenAt?: Nullable<ISODateTimeString>;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly revokedReason?: Nullable<string>;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface UserMfaFactor extends UserDomainEntity {
  readonly mfaFactorId: UUID;
  readonly userId: UUID;
  readonly method: MfaMethod;
  readonly status: MfaStatus;
  readonly secretHash?: Nullable<HashString>;
  readonly secretRef?: Nullable<SecretRef>;
  readonly label?: Nullable<string>;
  readonly enabledAt?: Nullable<ISODateTimeString>;
  readonly lastUsedAt?: Nullable<ISODateTimeString>;
  readonly disabledAt?: Nullable<ISODateTimeString>;
  readonly metadata: SafeUserMetadata;
  readonly policy: UserPolicyGuard;
}

export interface AuthTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: "Bearer";
  readonly expiresInSeconds: PositiveInteger;
  readonly refreshExpiresAt: ISODateTimeString;
}

export interface AuthResult {
  readonly user: MeUser;
  readonly session: Omit<AuthSession, "refreshTokenHash" | "policy">;
  readonly tokens: AuthTokenPair;
  readonly requiredNextStep?:
    | "EMAIL_VERIFICATION"
    | "MFA_CHALLENGE"
    | "CONSENT_RENEWAL"
    | "PROFILE_SETUP"
    | "NONE";
}

export interface AdminRole extends UserDomainEntity {
  readonly roleId: UUID;
  readonly roleKey: AdminRoleKey;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly permissions: readonly UserPermissionKey[];
  readonly status: AdminRoleStatus;
  readonly policy: UserPolicyGuard;
}

export interface AdminRoleMember extends UserDomainEntity {
  readonly roleMemberId: UUID;
  readonly userId: UUID;
  readonly roleId: UUID;
  readonly roleKey: AdminRoleKey;
  readonly status: AdminRoleMemberStatus;
  readonly assignedByAdminId: UUID;
  readonly assignedAt: ISODateTimeString;
  readonly revokedAt?: Nullable<ISODateTimeString>;
  readonly revokedByAdminId?: Nullable<UUID>;
  readonly revokedReason?: Nullable<string>;
  readonly policy: UserPolicyGuard;
}

export interface AdminPrincipal {
  readonly userId: UUID;
  readonly displayName: string;
  readonly emailMasked?: Nullable<string>;
  readonly roles: readonly AdminRoleKey[];
  readonly permissions: readonly UserPermissionKey[];
  readonly activeRole: AdminRoleKey;
  readonly mfaRequired: boolean;
  readonly mfaVerified: boolean;
}

export const ADMIN_ROLE_DESCRIPTORS: Readonly<
  Record<
    AdminRoleKey,
    Omit<AdminRole, keyof UserDomainEntity | "roleId" | "policy">
  >
> = Object.freeze({
  owner: {
    roleKey: "owner",
    nameKo: "최고 운영자",
    descriptionKo: "조직, 보안, 릴리즈, 권한 부여 최상위 승인",
    permissions: ["*"],
    status: "ACTIVE",
  },
  platform_admin: {
    roleKey: "platform_admin",
    nameKo: "플랫폼 관리자",
    descriptionKo: "CI/CD, 인프라, 환경변수, 배포 운영",
    permissions: ["platform:read", "platform:write", "deploy:approve"],
    status: "ACTIVE",
  },
  security_admin: {
    roleKey: "security_admin",
    nameKo: "보안 관리자",
    descriptionKo: "개인정보, 인증/인가, 감사, 취약점 대응",
    permissions: ["security:read", "security:write", "audit:read"],
    status: "ACTIVE",
  },
  backend_admin: {
    roleKey: "backend_admin",
    nameKo: "백엔드 관리자",
    descriptionKo: "API, DB, 서버 권위 계산, scheduler 운영",
    permissions: ["api:read", "api:write", "db:operate"],
    status: "ACTIVE",
  },
  product_admin: {
    roleKey: "product_admin",
    nameKo: "제품 관리자",
    descriptionKo: "기획, 화면, QA, 공지, 운영 정책",
    permissions: ["product:read", "product:write", "notice:write"],
    status: "ACTIVE",
  },
  support_admin: {
    roleKey: "support_admin",
    nameKo: "CS 운영자",
    descriptionKo: "문의, 신고, 공지, 사용자 지원",
    permissions: ["support:read", "support:write", "user:support"],
    status: "ACTIVE",
  },
  ads_admin: {
    roleKey: "ads_admin",
    nameKo: "광고·제휴 운영자",
    descriptionKo: "광고/제휴 캠페인과 동의 정책 확인",
    permissions: ["ads:read", "ads:write", "consent:read"],
    status: "ACTIVE",
  },
  moderator: {
    roleKey: "moderator",
    nameKo: "커뮤니티 모더레이터",
    descriptionKo: "커뮤니티 신고, 숨김, 운영 조치",
    permissions: ["community:moderate", "report:read"],
    status: "ACTIVE",
  },
  viewer: {
    roleKey: "viewer",
    nameKo: "운영 조회자",
    descriptionKo: "관리자 콘솔 읽기 전용",
    permissions: ["admin:read"],
    status: "ACTIVE",
  },
});

export interface UserListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortBy?: UserSortBy;
}

export interface UserAdminListQuery extends Omit<UserListQuery, "sortBy"> {
  readonly sortBy?: UserAdminSortBy;
}

export interface UserPageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly hasNextPage: boolean;
}

export interface UserSuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface UserListResponse<TItem> {
  readonly ok: true;
  readonly data: readonly TItem[];
  readonly pageInfo: UserPageInfo;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface UserMutationResponse<
  TData,
> extends UserSuccessResponse<TData> {
  readonly mutation: {
    readonly idempotencyKey?: IdempotencyKey;
    readonly replayed: boolean;
    readonly committedAt: ISODateTimeString;
  };
}

export interface UserErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export type UserApiResponse<TData> =
  | UserSuccessResponse<TData>
  | UserErrorResponse;
export type UserMutationApiResponse<TData> =
  | UserMutationResponse<TData>
  | UserErrorResponse;

export interface EmailSignUpRequest extends UserTraceableMutation {
  readonly email: EmailString;
  readonly password: string;
  readonly displayName: string;
  readonly nickname?: string;
  readonly device?: RegisterUserDeviceRequest["device"];
  readonly consents: readonly GrantConsentInput[];
  readonly context?: UserRequestContext;
}

export interface EmailLoginRequest extends UserTraceableMutation {
  readonly email: EmailString;
  readonly password: string;
  readonly device?: RegisterUserDeviceRequest["device"];
  readonly mfaCode?: string;
  readonly autoLogin?: boolean;
  readonly context?: UserRequestContext;
}

export interface SocialLoginStartRequest extends UserTraceableMutation {
  readonly provider: SocialAuthProvider;
  readonly redirectUri: UrlString;
  readonly codeChallenge?: string;
  readonly context?: UserRequestContext;
}

export interface SocialLoginStartResult {
  readonly provider: SocialAuthProvider;
  readonly authorizationUrl: UrlString;
  readonly stateHash: HashString;
  readonly expiresAt: ISODateTimeString;
}

export interface SocialLoginCallbackRequest extends UserTraceableMutation {
  readonly provider: SocialAuthProvider;
  readonly authorizationCode: string;
  readonly state: string;
  readonly redirectUri: UrlString;
  readonly device?: RegisterUserDeviceRequest["device"];
  readonly context?: UserRequestContext;
}

export interface RefreshTokenRequest extends UserTraceableMutation {
  readonly refreshToken: string;
  readonly deviceFingerprintHash?: HashString;
  readonly context?: UserRequestContext;
}

export interface LogoutRequest extends UserTraceableMutation {
  readonly sessionId?: UUID;
  readonly refreshToken?: string;
  readonly context?: UserRequestContext;
}

export interface LogoutAllRequest extends UserTraceableMutation {
  readonly exceptSessionId?: UUID;
  readonly context?: UserRequestContext;
}

export interface ChangePasswordRequest extends UserTraceableMutation {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly logoutOtherSessions?: boolean;
  readonly context?: UserRequestContext;
}

export interface PasswordResetStartRequest extends UserTraceableMutation {
  readonly email: EmailString;
  readonly context?: UserRequestContext;
}

export interface PasswordResetConfirmRequest extends UserTraceableMutation {
  readonly resetToken: string;
  readonly newPassword: string;
  readonly context?: UserRequestContext;
}

export interface EmailVerificationStartRequest extends UserTraceableMutation {
  readonly email?: EmailString;
  readonly context?: UserRequestContext;
}

export interface EmailVerificationConfirmRequest extends UserTraceableMutation {
  readonly verificationToken: string;
  readonly context?: UserRequestContext;
}

export interface MfaStartSetupRequest extends UserTraceableMutation {
  readonly method: MfaMethod;
  readonly label?: string;
  readonly context?: UserRequestContext;
}

export interface MfaStartSetupResult {
  readonly mfaFactorId: UUID;
  readonly method: MfaMethod;
  readonly secretProvisioningUri?: string;
  readonly recoveryCodes?: readonly string[];
  readonly expiresAt: ISODateTimeString;
}

export interface MfaVerifySetupRequest extends UserTraceableMutation {
  readonly mfaFactorId: UUID;
  readonly code: string;
  readonly context?: UserRequestContext;
}

export interface MfaDisableRequest extends UserTraceableMutation {
  readonly mfaFactorId: UUID;
  readonly code?: string;
  readonly reason?: string;
  readonly context?: UserRequestContext;
}

export interface UpdateUserProfileRequest extends UserTraceableMutation {
  readonly displayName?: string;
  readonly nickname?: string;
  readonly communityNickname?: string;
  readonly jobTitle?: Nullable<string>;
  readonly profileImageUrl?: Nullable<UrlString>;
  readonly bio?: Nullable<string>;
  readonly profileVisibility?: UserProfileVisibility;
  readonly defaultAnonymousPosting?: boolean;
  readonly levelBadgeVisible?: boolean;
  readonly salaryMetricsVisible?: boolean;
  readonly context?: UserRequestContext;
}

export interface UpdateUserSettingsRequest extends UserTraceableMutation {
  readonly pushEnabled?: boolean;
  readonly budgetAlertEnabled?: boolean;
  readonly fixedPaymentAlertEnabled?: boolean;
  readonly savingsAlertEnabled?: boolean;
  readonly growthAlertEnabled?: boolean;
  readonly communityAlertEnabled?: boolean;
  readonly eventAlertEnabled?: boolean;
  readonly securityAlertEnabled?: boolean;
  readonly marketingOptIn?: boolean;
  readonly adPersonalizationOptIn?: boolean;
  readonly analyticsOptIn?: boolean;
  readonly partnerBenefitOptIn?: boolean;
  readonly autoLoginEnabled?: boolean;
  readonly quietHoursEnabled?: boolean;
  readonly quietStartLocalTime?: string;
  readonly quietEndLocalTime?: string;
  readonly locale?: Locale;
  readonly timezone?: Timezone;
  readonly currencyCode?: Currency;
  readonly context?: UserRequestContext;
}

export interface GrantConsentInput {
  readonly consentType: ConsentType;
  readonly consentVersion: string;
  readonly granted: true;
}

export interface GrantConsentRequest
  extends UserTraceableMutation, GrantConsentInput {
  readonly source?: ConsentSource;
  readonly context?: UserRequestContext;
}

export interface WithdrawConsentRequest extends UserTraceableMutation {
  readonly consentType: ConsentType;
  readonly reason?: string;
  readonly source?: ConsentSource;
  readonly context?: UserRequestContext;
}

export interface RegisterUserDeviceRequest extends UserTraceableMutation {
  readonly device: {
    readonly platform: DevicePlatform;
    readonly pushPermissionStatus?: PushPermissionStatus;
    readonly pushTokenHash?: HashString;
    readonly pushTokenSecretRef?: SecretRef;
    readonly deviceFingerprintHash?: HashString;
    readonly appVersion?: string;
    readonly buildNumber?: string;
    readonly osVersion?: string;
  };
  readonly context?: UserRequestContext;
}

export interface UpdateUserDeviceRequest extends UserTraceableMutation {
  readonly deviceId: UUID;
  readonly pushPermissionStatus?: PushPermissionStatus;
  readonly pushTokenHash?: Nullable<HashString>;
  readonly pushTokenSecretRef?: Nullable<SecretRef>;
  readonly appVersion?: string;
  readonly buildNumber?: string;
  readonly osVersion?: string;
  readonly status?: DeviceStatus;
  readonly context?: UserRequestContext;
}

export interface RevokeUserDeviceRequest extends UserTraceableMutation {
  readonly deviceId: UUID;
  readonly reason?: string;
  readonly context?: UserRequestContext;
}

export interface LinkSocialIdentityRequest extends UserTraceableMutation {
  readonly provider: SocialAuthProvider;
  readonly authorizationCode: string;
  readonly redirectUri: UrlString;
  readonly context?: UserRequestContext;
}

export interface UnlinkSocialIdentityRequest extends UserTraceableMutation {
  readonly identityId: UUID;
  readonly reason?: string;
  readonly context?: UserRequestContext;
}

export interface RequestAccountWithdrawalRequest extends UserTraceableMutation {
  readonly reason?: string;
  readonly feedback?: string;
  readonly confirmText: string;
  readonly context?: UserRequestContext;
}

export interface AccountWithdrawalResult {
  readonly userId: UUID;
  readonly status: AccountWithdrawalStatus;
  readonly requestedAt?: Nullable<ISODateTimeString>;
  readonly scheduledDeletionAt?: Nullable<ISODateTimeString>;
  readonly completedAt?: Nullable<ISODateTimeString>;
}

export interface CancelAccountWithdrawalRequest extends UserTraceableMutation {
  readonly reason?: string;
  readonly context?: UserRequestContext;
}

export interface ListUserSessionsRequest extends UserListQuery {
  readonly status?: SessionStatus;
  readonly context?: UserRequestContext;
}

export interface RevokeUserSessionRequest extends UserTraceableMutation {
  readonly sessionId: UUID;
  readonly reason?: string;
  readonly context?: UserRequestContext;
}

export interface ListUsersAdminRequest extends UserAdminListQuery {
  readonly status?: UserStatus;
  readonly provider?: AuthProvider;
  readonly search?: string;
  readonly context?: UserRequestContext;
}

export interface GetUserAdminRequest {
  readonly userId: UUID;
  readonly includeOwnerTrace: true;
  readonly includeSessions?: boolean;
  readonly includeConsents?: boolean;
  readonly includeDevices?: boolean;
  readonly context?: UserRequestContext;
}

export interface SuspendUserAdminRequest extends UserTraceableMutation {
  readonly userId: UUID;
  readonly reason: string;
  readonly until?: ISODateTimeString;
  readonly context?: UserRequestContext;
}

export interface RestoreUserAdminRequest extends UserTraceableMutation {
  readonly userId: UUID;
  readonly reason: string;
  readonly context?: UserRequestContext;
}

export interface AdminGrantRoleRequest extends UserTraceableMutation {
  readonly userId: UUID;
  readonly roleKey: AdminRoleKey;
  readonly reason: string;
  readonly context?: UserRequestContext;
}

export interface AdminRevokeRoleRequest extends UserTraceableMutation {
  readonly userId: UUID;
  readonly roleKey: AdminRoleKey;
  readonly reason: string;
  readonly context?: UserRequestContext;
}

export interface GetUserMetricsAdminRequest {
  readonly from?: ISODateString;
  readonly to?: ISODateString;
  readonly context?: UserRequestContext;
}

export interface UserDeleteResult {
  readonly id: UUID;
  readonly deleted: true;
  readonly deletedAt: ISODateTimeString;
}

export type EmailSignUpResponse = UserMutationResponse<AuthResult>;
export type EmailLoginResponse = UserMutationResponse<AuthResult>;
export type SocialLoginStartResponse =
  UserMutationResponse<SocialLoginStartResult>;
export type SocialLoginCallbackResponse = UserMutationResponse<AuthResult>;
export type RefreshTokenResponse = UserMutationResponse<AuthResult>;
export type LogoutResponse = UserMutationResponse<{
  readonly loggedOut: true;
  readonly sessionId?: UUID;
}>;
export type LogoutAllResponse = UserMutationResponse<{
  readonly revokedSessionCount: NonNegativeInteger;
}>;
export type ChangePasswordResponse = UserMutationResponse<{
  readonly changed: true;
  readonly revokedOtherSessionCount: NonNegativeInteger;
}>;
export type PasswordResetStartResponse = UserMutationResponse<{
  readonly accepted: true;
}>;
export type PasswordResetConfirmResponse = UserMutationResponse<{
  readonly changed: true;
}>;
export type EmailVerificationStartResponse = UserMutationResponse<{
  readonly accepted: true;
}>;
export type EmailVerificationConfirmResponse = UserMutationResponse<{
  readonly verified: true;
  readonly user: MeUser;
}>;
export type MfaStartSetupResponse = UserMutationResponse<MfaStartSetupResult>;
export type MfaVerifySetupResponse = UserMutationResponse<UserMfaFactor>;
export type MfaDisableResponse = UserMutationResponse<UserMfaFactor>;
export type GetMeResponse = UserSuccessResponse<MeUser>;
export type GetMyPageSummaryResponse = UserSuccessResponse<UserMyPageSummary>;
export type UpdateUserProfileResponse = UserMutationResponse<UserProfile>;
export type UpdateUserSettingsResponse = UserMutationResponse<UserSettings>;
export type GrantConsentResponse = UserMutationResponse<UserConsent>;
export type WithdrawConsentResponse = UserMutationResponse<UserConsent>;
export type ListConsentsResponse = UserListResponse<UserConsent>;
export type RegisterUserDeviceResponse = UserMutationResponse<UserDevice>;
export type UpdateUserDeviceResponse = UserMutationResponse<UserDevice>;
export type RevokeUserDeviceResponse = UserMutationResponse<UserDevice>;
export type ListUserSessionsResponse = UserListResponse<AuthSession>;
export type RevokeUserSessionResponse = UserMutationResponse<AuthSession>;
export type LinkSocialIdentityResponse = UserMutationResponse<AuthIdentity>;
export type UnlinkSocialIdentityResponse = UserMutationResponse<AuthIdentity>;
export type RequestAccountWithdrawalResponse =
  UserMutationResponse<AccountWithdrawalResult>;
export type CancelAccountWithdrawalResponse =
  UserMutationResponse<AccountWithdrawalResult>;
export type ListUsersAdminResponse = UserListResponse<PublicUser>;
export type GetUserAdminResponse = UserSuccessResponse<UserAdminRecord>;
export type SuspendUserAdminResponse = UserMutationResponse<UserAdminRecord>;
export type RestoreUserAdminResponse = UserMutationResponse<UserAdminRecord>;
export type AdminGrantRoleResponse = UserMutationResponse<AdminRoleMember>;
export type AdminRevokeRoleResponse = UserMutationResponse<AdminRoleMember>;

export type UserMutationOperation =
  | "EMAIL_SIGN_UP"
  | "EMAIL_LOGIN"
  | "SOCIAL_LOGIN_START"
  | "SOCIAL_LOGIN_CALLBACK"
  | "REFRESH_TOKEN"
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "CHANGE_PASSWORD"
  | "PASSWORD_RESET_START"
  | "PASSWORD_RESET_CONFIRM"
  | "EMAIL_VERIFICATION_START"
  | "EMAIL_VERIFICATION_CONFIRM"
  | "MFA_START_SETUP"
  | "MFA_VERIFY_SETUP"
  | "MFA_DISABLE"
  | "UPDATE_PROFILE"
  | "UPDATE_SETTINGS"
  | "GRANT_CONSENT"
  | "WITHDRAW_CONSENT"
  | "REGISTER_DEVICE"
  | "UPDATE_DEVICE"
  | "REVOKE_DEVICE"
  | "LINK_SOCIAL_IDENTITY"
  | "UNLINK_SOCIAL_IDENTITY"
  | "REQUEST_ACCOUNT_WITHDRAWAL"
  | "CANCEL_ACCOUNT_WITHDRAWAL"
  | "REVOKE_SESSION"
  | "ADMIN_SUSPEND_USER"
  | "ADMIN_RESTORE_USER"
  | "ADMIN_GRANT_ROLE"
  | "ADMIN_REVOKE_ROLE";

export interface UserAuditLog extends UserDomainEntity {
  readonly auditLogId: UUID;
  readonly eventType: UserAuditEventType;
  readonly actorUserId?: UUID;
  readonly adminActor?: UserAdminActor;
  readonly targetType:
    | "USER"
    | "PROFILE"
    | "SETTINGS"
    | "CONSENT"
    | "IDENTITY"
    | "CREDENTIAL"
    | "SESSION"
    | "DEVICE"
    | "MFA_FACTOR"
    | "ADMIN_ROLE"
    | "ADMIN_ROLE_MEMBER";
  readonly targetId: UUID;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly reason?: string;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly policy: UserPolicyGuard;
}

export interface UserIdempotencyRecord extends UserDomainEntity {
  readonly userId: UUID;
  readonly idempotencyKey: IdempotencyKey;
  readonly operation: UserMutationOperation;
  readonly status: UserIdempotencyStatus;
  readonly requestHash: HashString;
  readonly responseReferenceId?: UUID;
  readonly errorCode?: string;
  readonly expiresAt: ISODateTimeString;
}

export interface UserAdminRecord {
  readonly user: MeUser;
  readonly ownerTrace: UserOwnerTrace;
  readonly identities: readonly AuthIdentity[];
  readonly sessions?: readonly AuthSession[];
  readonly devices?: readonly UserDevice[];
  readonly consents?: readonly UserConsent[];
  readonly roles: readonly AdminRoleMember[];
  readonly riskLevel: UserRiskLevel;
  readonly riskLabels: readonly string[];
  readonly internalNotes: readonly string[];
}

export interface UserMetricsAdmin {
  readonly totalUserCount: NonNegativeInteger;
  readonly activeUserCount: NonNegativeInteger;
  readonly pendingVerificationCount: NonNegativeInteger;
  readonly suspendedUserCount: NonNegativeInteger;
  readonly withdrawnUserCount: NonNegativeInteger;
  readonly deletedUserCount: NonNegativeInteger;
  readonly emailLoginUserCount: NonNegativeInteger;
  readonly socialLoginUserCount: NonNegativeInteger;
  readonly autoLoginEnabledCount: NonNegativeInteger;
  readonly pushEnabledCount: NonNegativeInteger;
  readonly marketingOptInCount: NonNegativeInteger;
  readonly adPersonalizationOptInCount: NonNegativeInteger;
  readonly mfaEnabledUserCount: NonNegativeInteger;
  readonly activeDeviceCount: NonNegativeInteger;
  readonly activeSessionCount: NonNegativeInteger;
  readonly adminUserCount: NonNegativeInteger;
  readonly byProvider: readonly {
    readonly provider: AuthProvider;
    readonly count: NonNegativeInteger;
  }[];
  readonly byRole: readonly {
    readonly roleKey: AdminRoleKey;
    readonly count: NonNegativeInteger;
  }[];
  readonly measuredAt: ISODateTimeString;
}

export type GetUserMetricsAdminResponse = UserSuccessResponse<UserMetricsAdmin>;
export type ListUserAuditLogsAdminResponse = UserListResponse<UserAuditLog>;

export const USER_API_PATHS = Object.freeze({
  emailSignUp: "/auth/email/sign-up",
  emailLogin: "/auth/email/login",
  socialLoginStart: "/auth/social/:provider/start",
  socialLoginCallback: "/auth/social/:provider/callback",
  refreshToken: "/auth/refresh",
  logout: "/auth/logout",
  logoutAll: "/auth/logout-all",
  changePassword: "/auth/password/change",
  passwordResetStart: "/auth/password/reset/start",
  passwordResetConfirm: "/auth/password/reset/confirm",
  emailVerificationStart: "/auth/email/verification/start",
  emailVerificationConfirm: "/auth/email/verification/confirm",
  mfaStartSetup: "/auth/mfa/start-setup",
  mfaVerifySetup: "/auth/mfa/verify-setup",
  mfaDisable: "/auth/mfa/disable",
  getMe: "/users/me",
  getMyPageSummary: "/users/me/my-page-summary",
  updateProfile: "/users/me/profile",
  updateSettings: "/users/me/settings",
  listConsents: "/users/me/consents",
  grantConsent: "/users/me/consents/grant",
  withdrawConsent: "/users/me/consents/withdraw",
  registerDevice: "/users/me/devices",
  updateDevice: "/users/me/devices/:deviceId",
  revokeDevice: "/users/me/devices/:deviceId/revoke",
  listSessions: "/users/me/sessions",
  revokeSession: "/users/me/sessions/:sessionId/revoke",
  linkSocialIdentity: "/users/me/identities/link",
  unlinkSocialIdentity: "/users/me/identities/:identityId/unlink",
  requestWithdrawal: "/users/me/withdrawal/request",
  cancelWithdrawal: "/users/me/withdrawal/cancel",
  adminListUsers: "/admin/users",
  adminGetUser: "/admin/users/:userId",
  adminSuspendUser: "/admin/users/:userId/suspend",
  adminRestoreUser: "/admin/users/:userId/restore",
  adminGrantRole: "/admin/users/:userId/roles/grant",
  adminRevokeRole: "/admin/users/:userId/roles/revoke",
  adminAuditLogs: "/admin/users/audit-logs",
  adminMetrics: "/admin/users/metrics",
} as const);

export type UserApiPathName = keyof typeof USER_API_PATHS;
export type UserApiPath = (typeof USER_API_PATHS)[UserApiPathName];
export type UserHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface UserEndpointDescriptor<TRequest, TResponse> {
  readonly method: UserHttpMethod;
  readonly path: UserApiPath;
  readonly request: TRequest;
  readonly response: TResponse;
  readonly authRequired: boolean;
  readonly adminRequired: boolean;
  readonly idempotencyRequired: boolean;
  readonly rawCredentialAllowedInResponse: false;
  readonly serverAuthorityAuthRequired: true;
}

export interface UserEndpointTypes {
  readonly emailSignUp: UserEndpointDescriptor<
    EmailSignUpRequest,
    EmailSignUpResponse
  >;
  readonly emailLogin: UserEndpointDescriptor<
    EmailLoginRequest,
    EmailLoginResponse
  >;
  readonly socialLoginStart: UserEndpointDescriptor<
    SocialLoginStartRequest,
    SocialLoginStartResponse
  >;
  readonly socialLoginCallback: UserEndpointDescriptor<
    SocialLoginCallbackRequest,
    SocialLoginCallbackResponse
  >;
  readonly refreshToken: UserEndpointDescriptor<
    RefreshTokenRequest,
    RefreshTokenResponse
  >;
  readonly logout: UserEndpointDescriptor<LogoutRequest, LogoutResponse>;
  readonly logoutAll: UserEndpointDescriptor<
    LogoutAllRequest,
    LogoutAllResponse
  >;
  readonly changePassword: UserEndpointDescriptor<
    ChangePasswordRequest,
    ChangePasswordResponse
  >;
  readonly passwordResetStart: UserEndpointDescriptor<
    PasswordResetStartRequest,
    PasswordResetStartResponse
  >;
  readonly passwordResetConfirm: UserEndpointDescriptor<
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse
  >;
  readonly emailVerificationStart: UserEndpointDescriptor<
    EmailVerificationStartRequest,
    EmailVerificationStartResponse
  >;
  readonly emailVerificationConfirm: UserEndpointDescriptor<
    EmailVerificationConfirmRequest,
    EmailVerificationConfirmResponse
  >;
  readonly mfaStartSetup: UserEndpointDescriptor<
    MfaStartSetupRequest,
    MfaStartSetupResponse
  >;
  readonly mfaVerifySetup: UserEndpointDescriptor<
    MfaVerifySetupRequest,
    MfaVerifySetupResponse
  >;
  readonly mfaDisable: UserEndpointDescriptor<
    MfaDisableRequest,
    MfaDisableResponse
  >;
  readonly getMe: UserEndpointDescriptor<
    { readonly context?: UserRequestContext },
    GetMeResponse
  >;
  readonly getMyPageSummary: UserEndpointDescriptor<
    { readonly context?: UserRequestContext },
    GetMyPageSummaryResponse
  >;
  readonly updateProfile: UserEndpointDescriptor<
    UpdateUserProfileRequest,
    UpdateUserProfileResponse
  >;
  readonly updateSettings: UserEndpointDescriptor<
    UpdateUserSettingsRequest,
    UpdateUserSettingsResponse
  >;
  readonly listConsents: UserEndpointDescriptor<
    { readonly context?: UserRequestContext },
    ListConsentsResponse
  >;
  readonly grantConsent: UserEndpointDescriptor<
    GrantConsentRequest,
    GrantConsentResponse
  >;
  readonly withdrawConsent: UserEndpointDescriptor<
    WithdrawConsentRequest,
    WithdrawConsentResponse
  >;
  readonly registerDevice: UserEndpointDescriptor<
    RegisterUserDeviceRequest,
    RegisterUserDeviceResponse
  >;
  readonly updateDevice: UserEndpointDescriptor<
    UpdateUserDeviceRequest,
    UpdateUserDeviceResponse
  >;
  readonly revokeDevice: UserEndpointDescriptor<
    RevokeUserDeviceRequest,
    RevokeUserDeviceResponse
  >;
  readonly listSessions: UserEndpointDescriptor<
    ListUserSessionsRequest,
    ListUserSessionsResponse
  >;
  readonly revokeSession: UserEndpointDescriptor<
    RevokeUserSessionRequest,
    RevokeUserSessionResponse
  >;
  readonly linkSocialIdentity: UserEndpointDescriptor<
    LinkSocialIdentityRequest,
    LinkSocialIdentityResponse
  >;
  readonly unlinkSocialIdentity: UserEndpointDescriptor<
    UnlinkSocialIdentityRequest,
    UnlinkSocialIdentityResponse
  >;
  readonly requestWithdrawal: UserEndpointDescriptor<
    RequestAccountWithdrawalRequest,
    RequestAccountWithdrawalResponse
  >;
  readonly cancelWithdrawal: UserEndpointDescriptor<
    CancelAccountWithdrawalRequest,
    CancelAccountWithdrawalResponse
  >;
  readonly adminListUsers: UserEndpointDescriptor<
    ListUsersAdminRequest,
    ListUsersAdminResponse
  >;
  readonly adminGetUser: UserEndpointDescriptor<
    GetUserAdminRequest,
    GetUserAdminResponse
  >;
  readonly adminSuspendUser: UserEndpointDescriptor<
    SuspendUserAdminRequest,
    SuspendUserAdminResponse
  >;
  readonly adminRestoreUser: UserEndpointDescriptor<
    RestoreUserAdminRequest,
    RestoreUserAdminResponse
  >;
  readonly adminGrantRole: UserEndpointDescriptor<
    AdminGrantRoleRequest,
    AdminGrantRoleResponse
  >;
  readonly adminRevokeRole: UserEndpointDescriptor<
    AdminRevokeRoleRequest,
    AdminRevokeRoleResponse
  >;
  readonly adminMetrics: UserEndpointDescriptor<
    GetUserMetricsAdminRequest,
    GetUserMetricsAdminResponse
  >;
}

const includesString = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => (values as readonly string[]).includes(value);

export const isAuthProvider = (value: string): value is AuthProvider =>
  includesString(AUTH_PROVIDERS, value);
export const isSocialAuthProvider = (
  value: string,
): value is SocialAuthProvider => includesString(SOCIAL_AUTH_PROVIDERS, value);
export const isUserStatus = (value: string): value is UserStatus =>
  includesString(USER_STATUSES, value);
export const isAuthIdentityStatus = (
  value: string,
): value is AuthIdentityStatus => includesString(AUTH_IDENTITY_STATUSES, value);
export const isSessionStatus = (value: string): value is SessionStatus =>
  includesString(SESSION_STATUSES, value);
export const isDevicePlatform = (value: string): value is DevicePlatform =>
  includesString(DEVICE_PLATFORMS, value);
export const isDeviceStatus = (value: string): value is DeviceStatus =>
  includesString(DEVICE_STATUSES, value);
export const isConsentType = (value: string): value is ConsentType =>
  includesString(CONSENT_TYPES, value);
export const isAdminRoleKey = (value: string): value is AdminRoleKey =>
  includesString(ADMIN_ROLE_KEYS, value);
export const isUserPermissionKey = (
  value: string,
): value is UserPermissionKey => includesString(USER_PERMISSION_KEYS, value);

export const isActiveUserStatus = (status: UserStatus): boolean =>
  status === "ACTIVE";
export const isTerminalUserStatus = (status: UserStatus): boolean =>
  status === "WITHDRAWN" || status === "DELETED";
export const isActiveSessionStatus = (status: SessionStatus): boolean =>
  status === "ACTIVE";
export const isRequiredSignupConsentType = (
  type: ConsentType,
): type is RequiredSignupConsentType =>
  includesString(REQUIRED_SIGNUP_CONSENT_TYPES, type);
export const isMarketingConsentType = (
  type: ConsentType,
): type is MarketingConsentType =>
  includesString(MARKETING_CONSENT_TYPES, type);

export const createUserPolicyGuard = (): UserPolicyGuard => ({
  ...USER_SAFE_POLICY_GUARD,
});

export const assertUserPolicyGuard = (guard: UserPolicyGuard): void => {
  if (
    guard.rawPasswordIncluded !== false ||
    guard.rawTokenIncluded !== false ||
    guard.rawSecretIncluded !== false ||
    guard.rawPushTokenIncluded !== false ||
    guard.rawIpIncluded !== false ||
    guard.rawUserAgentIncluded !== false ||
    guard.rawFinancialSourceDataIncluded !== false ||
    guard.payrollExpenseSavingsRawAmountIncluded !== false ||
    guard.adsFinancialJoinAllowed !== false ||
    guard.communityFinancialJoinAllowed !== false ||
    guard.credentialStoredAsHashOrSecretRefOnly !== true ||
    guard.refreshTokenStoredAsHashOnly !== true ||
    guard.pushTokenStoredAsHashOrSecretRefOnly !== true ||
    guard.serverAuthorityAuthRequired !== true ||
    guard.clientFinalAuthDecisionAllowed !== false ||
    guard.marketingRequiresExplicitConsent !== true ||
    guard.adPersonalizationRequiresExplicitConsent !== true ||
    guard.rlsRequired !== true ||
    guard.auditRequired !== true
  ) {
    throw new Error(
      "Unsafe user policy guard: raw credentials, raw tokens, raw push tokens, raw IP/User-Agent, financial source joins, client-final auth decisions, and unaudited user data are forbidden.",
    );
  }
};

export const hasAdminPermission = (
  principal: Pick<AdminPrincipal, "permissions">,
  permission: UserPermissionKey,
): boolean =>
  principal.permissions.includes("*") ||
  principal.permissions.includes(permission);

export const canUseAdPersonalization = (
  settings: Pick<UserSettings, "marketingOptIn" | "adPersonalizationOptIn">,
  consent: Pick<
    UserConsentSnapshot,
    "marketingAllowed" | "adPersonalizationAllowed"
  >,
): boolean =>
  settings.marketingOptIn &&
  settings.adPersonalizationOptIn &&
  consent.marketingAllowed &&
  consent.adPersonalizationAllowed;

export const canReceivePush = (
  settings: Pick<UserSettings, "pushEnabled">,
  device: Pick<UserDevice, "status" | "pushPermissionStatus">,
): boolean =>
  settings.pushEnabled &&
  device.status === "ACTIVE" &&
  ["AUTHORIZED", "PROVISIONAL", "EPHEMERAL"].includes(
    device.pushPermissionStatus,
  );

export const normalizeUserPageSize = (
  pageSize: number | undefined,
  fallback = 20,
  max = 100,
): number => {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize))
    return fallback;
  return Math.max(1, Math.min(Math.floor(pageSize), max));
};

export interface UserTypesCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof USER_TYPES_CONTRACT_VERSION;
  readonly authProviderCount: number;
  readonly socialProviderCount: number;
  readonly userStatusCount: number;
  readonly consentTypeCount: number;
  readonly adminRoleCount: number;
  readonly permissionCount: number;
  readonly apiPathCount: number;
  readonly hasEmailLoginContract: boolean;
  readonly hasSocialLoginContract: boolean;
  readonly hasAutoLoginSessionContract: boolean;
  readonly hasProfileContract: boolean;
  readonly hasSettingsContract: boolean;
  readonly hasConsentContract: boolean;
  readonly hasDevicePushContract: boolean;
  readonly hasAdminRbacContract: boolean;
  readonly hasPrivacyGuard: boolean;
  readonly hasIdempotencyContract: boolean;
  readonly missing: readonly string[];
}

const requireEvery = <TValue extends string>(
  source: readonly TValue[],
  required: readonly TValue[],
  label: string,
  missing: string[],
): void => {
  for (const value of required)
    if (!source.includes(value)) missing.push(`missing ${label}: ${value}`);
};

export const getUserTypesCompletenessReport =
  (): UserTypesCompletenessReport => {
    const missing: string[] = [];

    requireEvery(
      AUTH_PROVIDERS,
      ["EMAIL", "PASSWORD", "NAVER", "KAKAO", "GOOGLE", "APPLE"] as const,
      "auth provider",
      missing,
    );
    requireEvery(
      SOCIAL_AUTH_PROVIDERS,
      ["NAVER", "KAKAO", "GOOGLE", "APPLE"] as const,
      "social provider",
      missing,
    );
    requireEvery(
      USER_STATUSES,
      [
        "PENDING_EMAIL_VERIFICATION",
        "ACTIVE",
        "SUSPENDED",
        "WITHDRAWN",
        "DELETED",
      ] as const,
      "user status",
      missing,
    );
    requireEvery(
      CONSENT_TYPES,
      [
        "TERMS_OF_SERVICE",
        "PRIVACY_POLICY",
        "AGE_CONFIRMATION",
        "COMMUNITY_POLICY",
        "PUSH_NOTIFICATION",
        "MARKETING_PUSH",
        "AD_PERSONALIZATION",
        "PARTNER_BENEFIT",
        "ANALYTICS",
      ] as const,
      "consent type",
      missing,
    );
    requireEvery(
      ADMIN_ROLE_KEYS,
      [
        "owner",
        "platform_admin",
        "security_admin",
        "backend_admin",
        "product_admin",
        "support_admin",
        "ads_admin",
        "moderator",
        "viewer",
      ] as const,
      "admin role",
      missing,
    );
    requireEvery(
      DEVICE_PLATFORMS,
      ["IOS", "ANDROID", "WEB", "ADMIN_WEB"] as const,
      "device platform",
      missing,
    );
    requireEvery(
      PUSH_PERMISSION_STATUSES,
      [
        "AUTHORIZED",
        "DENIED",
        "PROVISIONAL",
        "EPHEMERAL",
        "NOT_DETERMINED",
      ] as const,
      "push permission",
      missing,
    );

    for (const role of ADMIN_ROLE_KEYS)
      if (!ADMIN_ROLE_DESCRIPTORS[role])
        missing.push(`missing admin role descriptor: ${role}`);

    for (const pathName of [
      "emailSignUp",
      "emailLogin",
      "socialLoginStart",
      "socialLoginCallback",
      "refreshToken",
      "logout",
      "getMe",
      "getMyPageSummary",
      "updateProfile",
      "updateSettings",
      "grantConsent",
      "withdrawConsent",
      "registerDevice",
      "listSessions",
      "requestWithdrawal",
      "adminListUsers",
      "adminGetUser",
      "adminGrantRole",
      "adminRevokeRole",
      "adminMetrics",
    ] as const satisfies readonly UserApiPathName[]) {
      if (!USER_API_PATHS[pathName])
        missing.push(`missing API path: ${pathName}`);
    }

    if (USER_SAFE_POLICY_GUARD.rawPasswordIncluded)
      missing.push("raw password must not be included");
    if (USER_SAFE_POLICY_GUARD.rawTokenIncluded)
      missing.push("raw token must not be included");
    if (USER_SAFE_POLICY_GUARD.rawPushTokenIncluded)
      missing.push("raw push token must not be included");
    if (!USER_SAFE_POLICY_GUARD.credentialStoredAsHashOrSecretRefOnly)
      missing.push("credential hash/ref policy missing");
    if (!USER_SAFE_POLICY_GUARD.refreshTokenStoredAsHashOnly)
      missing.push("refresh token hash-only policy missing");
    if (!USER_SAFE_POLICY_GUARD.serverAuthorityAuthRequired)
      missing.push("server authority auth policy missing");
    if (USER_SAFE_POLICY_GUARD.clientFinalAuthDecisionAllowed)
      missing.push("client final auth decision must not be allowed");
    if (!USER_SAFE_POLICY_GUARD.marketingRequiresExplicitConsent)
      missing.push("marketing consent policy missing");
    if (!USER_SAFE_POLICY_GUARD.adPersonalizationRequiresExplicitConsent)
      missing.push("ad personalization consent policy missing");

    return {
      ok: missing.length === 0,
      contractVersion: USER_TYPES_CONTRACT_VERSION,
      authProviderCount: AUTH_PROVIDERS.length,
      socialProviderCount: SOCIAL_AUTH_PROVIDERS.length,
      userStatusCount: USER_STATUSES.length,
      consentTypeCount: CONSENT_TYPES.length,
      adminRoleCount: ADMIN_ROLE_KEYS.length,
      permissionCount: USER_PERMISSION_KEYS.length,
      apiPathCount: Object.keys(USER_API_PATHS).length,
      hasEmailLoginContract: true,
      hasSocialLoginContract: true,
      hasAutoLoginSessionContract: true,
      hasProfileContract: true,
      hasSettingsContract: true,
      hasConsentContract: true,
      hasDevicePushContract: true,
      hasAdminRbacContract: true,
      hasPrivacyGuard: true,
      hasIdempotencyContract: true,
      missing,
    };
  };

export const assertUserTypesCompleteness = (): void => {
  const report = getUserTypesCompletenessReport();
  if (!report.ok)
    throw new Error(`User types are incomplete: ${report.missing.join(", ")}`);
};

export const USER_TYPES_COMPLETENESS_REPORT = Object.freeze(
  getUserTypesCompletenessReport(),
);

export const userTypes = Object.freeze({
  contractVersion: USER_TYPES_CONTRACT_VERSION,
  packageName: USER_TYPES_PACKAGE,
  domain: USER_TYPES_DOMAIN,
  timezone: USER_TIMEZONE,
  locale: USER_LOCALE,
  currency: USER_CURRENCY,
  defaultNickname: USER_DEFAULT_NICKNAME,
  defaultCommunityNickname: USER_DEFAULT_COMMUNITY_NICKNAME,
  authProviders: AUTH_PROVIDERS,
  socialAuthProviders: SOCIAL_AUTH_PROVIDERS,
  userStatuses: USER_STATUSES,
  authIdentityStatuses: AUTH_IDENTITY_STATUSES,
  credentialKinds: CREDENTIAL_KINDS,
  credentialStatuses: CREDENTIAL_STATUSES,
  sessionStatuses: SESSION_STATUSES,
  devicePlatforms: DEVICE_PLATFORMS,
  deviceStatuses: DEVICE_STATUSES,
  pushPermissionStatuses: PUSH_PERMISSION_STATUSES,
  consentTypes: CONSENT_TYPES,
  requiredSignupConsentTypes: REQUIRED_SIGNUP_CONSENT_TYPES,
  marketingConsentTypes: MARKETING_CONSENT_TYPES,
  consentStatuses: CONSENT_STATUSES,
  consentSources: CONSENT_SOURCES,
  mfaMethods: MFA_METHODS,
  mfaStatuses: MFA_STATUSES,
  adminRoleKeys: ADMIN_ROLE_KEYS,
  adminRoleStatuses: ADMIN_ROLE_STATUSES,
  adminRoleMemberStatuses: ADMIN_ROLE_MEMBER_STATUSES,
  adminRoleDescriptors: ADMIN_ROLE_DESCRIPTORS,
  profileVisibilities: USER_PROFILE_VISIBILITIES,
  genderValues: USER_GENDER_VALUES,
  accountWithdrawalStatuses: ACCOUNT_WITHDRAWAL_STATUSES,
  sortOptions: USER_SORT_OPTIONS,
  adminSortOptions: USER_ADMIN_SORT_OPTIONS,
  auditEventTypes: USER_AUDIT_EVENT_TYPES,
  idempotencyStatuses: USER_IDEMPOTENCY_STATUSES,
  riskLevels: USER_RISK_LEVELS,
  permissionKeys: USER_PERMISSION_KEYS,
  apiPaths: USER_API_PATHS,
  safePolicyGuard: USER_SAFE_POLICY_GUARD,
  completenessReport: USER_TYPES_COMPLETENESS_REPORT,
  getCompletenessReport: getUserTypesCompletenessReport,
  assertCompleteness: assertUserTypesCompleteness,
});

export default userTypes;
