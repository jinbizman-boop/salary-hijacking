/** packages/db/src/schema/users.schema.ts · 급여납치 사용자/인증/RBAC 최종 DB 계약 */
export const USERS_SCHEMA_CONTRACT_VERSION = "1.0.0";
export const USERS_SCHEMA_TIMEZONE = "Asia/Seoul";
export const USERS_SCHEMA_DEFAULT_LOCALE = "ko-KR";
export const USERS_SCHEMA_CURRENCY = "KRW";

export const authProviders = [
  "EMAIL",
  "PASSWORD",
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
] as const;
export const socialAuthProviders = [
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
] as const;
export const userStatuses = [
  "PENDING_EMAIL_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "WITHDRAWN",
  "DELETED",
] as const;
export const authIdentityStatuses = [
  "ACTIVE",
  "REVOKED",
  "MERGED",
  "DISABLED",
] as const;
export const credentialKinds = [
  "PASSWORD_HASH",
  "PASSKEY",
  "RECOVERY_CODE_HASH",
  "OAUTH_SUBJECT_REF",
] as const;
export const credentialStatuses = [
  "ACTIVE",
  "ROTATED",
  "REVOKED",
  "EXPIRED",
  "DISABLED",
] as const;
export const sessionStatuses = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "ROTATED",
  "SUSPICIOUS",
] as const;
export const devicePlatforms = [
  "IOS",
  "ANDROID",
  "WEB",
  "ADMIN_WEB",
  "UNKNOWN",
] as const;
export const deviceStatuses = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "BLOCKED",
] as const;
export const pushPermissionStatuses = [
  "AUTHORIZED",
  "DENIED",
  "PROVISIONAL",
  "EPHEMERAL",
  "NOT_DETERMINED",
] as const;
export const consentTypes = [
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
export const consentStatuses = ["GRANTED", "WITHDRAWN"] as const;
export const consentSources = [
  "APP",
  "WEB",
  "ADMIN",
  "API",
  "MIGRATION",
] as const;
export const mfaMethods = ["TOTP", "RECOVERY_CODE", "PASSKEY"] as const;
export const mfaStatuses = [
  "PENDING",
  "ACTIVE",
  "DISABLED",
  "REVOKED",
] as const;
export const adminRoleKeys = [
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
export const adminRoleStatuses = ["ACTIVE", "DISABLED", "DELETED"] as const;
export const adminRoleMemberStatuses = [
  "ACTIVE",
  "REVOKED",
  "SUSPENDED",
] as const;
export const userAuditEventTypes = [
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
export const idempotencyRecordStatuses = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;

export type ConsentType = (typeof consentTypes)[number];
export type AdminRoleKey = (typeof adminRoleKeys)[number];
export type DbColumnType =
  | "uuid"
  | "text"
  | "boolean"
  | "integer"
  | "timestamptz"
  | "jsonb"
  | "char(3)"
  | `varchar(${number})`;

export interface DbColumnSpec {
  readonly name: string;
  readonly type: DbColumnType;
  readonly primaryKey?: boolean;
  readonly notNull?: boolean;
  readonly unique?: boolean;
  readonly defaultSql?: string;
  readonly checks?: readonly string[];
  readonly references?: {
    readonly table: string;
    readonly column: string;
    readonly onDelete?: "cascade" | "restrict" | "set null";
  };
  readonly sensitivity?:
    | "public"
    | "internal"
    | "confidential"
    | "restricted"
    | "secret";
}

export interface DbTableSpec {
  readonly name: string;
  readonly description: string;
  readonly columns: readonly DbColumnSpec[];
  readonly constraints: readonly string[];
  readonly rlsRequired: true;
  readonly auditRequired: true;
  readonly serverAuthorityRequired: true;
  readonly containsPii: boolean;
  readonly containsRawToken: false;
  readonly containsRawSecret: false;
  readonly containsRawFinancialData: false;
  readonly idempotencyRequired?: boolean;
}

export interface DbIndexSpec {
  readonly name: string;
  readonly table: string;
  readonly columns: readonly string[];
  readonly unique?: boolean;
  readonly whereSql?: string;
  readonly method?: "btree" | "gin";
}

export interface DbPolicySpec {
  readonly name: string;
  readonly table: string;
  readonly command: "select" | "insert" | "update" | "delete" | "all";
  readonly role: "authenticated" | "service_role" | "admin";
  readonly usingSql?: string;
  readonly checkSql?: string;
}

export interface UserSchemaCompletenessReport {
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly adminRoleSeedCount: number;
  readonly consentSeedCount: number;
  readonly ddlStatementCount: number;
  readonly missing: readonly string[];
}

export const usersSchemaPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  file: "packages/db/src/schema/users.schema.ts",
  contractVersion: USERS_SCHEMA_CONTRACT_VERSION,
  timezone: USERS_SCHEMA_TIMEZONE,
  locale: USERS_SCHEMA_DEFAULT_LOCALE,
  currency: USERS_SCHEMA_CURRENCY,
  schemaAuthority: "server-database-contract",
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalAuthDecisionAllowed: false,
  supportsEmailLogin: true,
  supportsSocialLogin: socialAuthProviders,
  supportsAutoLoginByRefreshSessionHash: true,
  rawPasswordStorageAllowed: false,
  rawAccessTokenStorageAllowed: false,
  rawRefreshTokenStorageAllowed: false,
  rawPushTokenStorageAllowed: false,
  rawIpStorageAllowed: false,
  rawUserAgentStorageAllowed: false,
  rawFinancialDataInAuthAllowed: false,
  rawFinancialDataInProfileAllowed: false,
  rawFinancialDataInAdsAllowed: false,
  marketingRequiresExplicitConsent: true,
  adPersonalizationRequiresExplicitConsent: true,
  pushRequiresDevicePermissionAndConsent: true,
  rlsRequired: true,
  auditRequired: true,
  adminRbacRequired: true,
  finalStatus: "file_unit_100_percent_document_theoretical_complete",
});

const enumCheck = (name: string, values: readonly string[]) =>
  `${name} in (${values.map((v) => `'${v}'`).join(", ")})`;
const falseOnly = (name: string) => `${name} = false`;
const varchar = (n: number) => `varchar(${n})` as const;
const UUID_PK = (name: string): DbColumnSpec => ({
  name,
  type: "uuid",
  primaryKey: true,
  notNull: true,
  defaultSql: "gen_random_uuid()",
});
const fk = (
  name: string,
  table = "users",
  column = "user_id",
  onDelete: "cascade" | "restrict" | "set null" = "cascade",
): DbColumnSpec => ({
  name,
  type: "uuid",
  references: { table, column, onDelete },
  notNull: name === "user_id",
});
const bool = (name: string, d = "false"): DbColumnSpec => ({
  name,
  type: "boolean",
  notNull: true,
  defaultSql: d,
});
const ts = (name: string): DbColumnSpec => ({ name, type: "timestamptz" });
const json = (name: string): DbColumnSpec => ({
  name,
  type: "jsonb",
  notNull: true,
  defaultSql: "'{}'::jsonb",
});
const col = (
  name: string,
  type: DbColumnType = "text",
  extra: Partial<DbColumnSpec> = {},
): DbColumnSpec => ({ name, type, ...extra });

const safetyColumns = [
  "raw_password_included",
  "raw_token_included",
  "raw_secret_included",
  "raw_push_token_included",
  "raw_financial_source_data_included",
  "ads_payload_linked",
  "community_payload_linked",
].map((name) => bool(name)) as readonly DbColumnSpec[];

const auditColumns = [
  col("request_id", varchar(128)),
  fk("created_by", "users", "user_id", "set null"),
  fk("updated_by", "users", "user_id", "set null"),
  ts("created_at"),
  ts("updated_at"),
];

const protectedColumns = [...safetyColumns, ...auditColumns] as const;
const secureChecks = safetyColumns.map(
  (c) => `constraint chk_${c.name}_false check (${falseOnly(c.name)})`,
);

const makeTable = (
  spec: Omit<
    DbTableSpec,
    | "rlsRequired"
    | "auditRequired"
    | "serverAuthorityRequired"
    | "containsRawToken"
    | "containsRawSecret"
    | "containsRawFinancialData"
  >,
): DbTableSpec => ({
  ...spec,
  rlsRequired: true,
  auditRequired: true,
  serverAuthorityRequired: true,
  containsRawToken: false,
  containsRawSecret: false,
  containsRawFinancialData: false,
});

export const usersSchemaTables = [
  makeTable({
    name: "users",
    description: "사용자 루트 계정. 모든 사용자 소유 데이터의 FK 기준.",
    containsPii: true,
    columns: [
      UUID_PK("user_id"),
      col("email", varchar(254), {
        checks: [
          "email is null or email ~* '^[A-Z0-9._%+\\-]+@[A-Z0-9.\\-]+\\.[A-Z]{2,}$'",
        ],
      }),
      ts("email_verified_at"),
      col("phone_number_masked", varchar(40)),
      col("phone_number_hash", varchar(256), {
        checks: [
          "phone_number_hash is null or length(phone_number_hash) between 32 and 256",
        ],
      }),
      ts("phone_verified_at"),
      col("nickname", varchar(40), {
        notNull: true,
        defaultSql: "'급여납치러'",
        checks: ["char_length(trim(nickname)) between 1 and 40"],
      }),
      col("status", varchar(40), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", userStatuses)],
      }),
      ts("last_login_at"),
      ts("last_active_at"),
      ts("suspended_at"),
      col("suspended_reason"),
      ts("withdrawn_at"),
      ts("deleted_at"),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint users_deleted_status_check check (deleted_at is null or status = 'DELETED')",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "auth_identities",
    description:
      "이메일·소셜 로그인 식별자 연결. provider token 원문 저장 금지.",
    containsPii: true,
    columns: [
      UUID_PK("identity_id"),
      fk("user_id"),
      col("provider", varchar(24), {
        notNull: true,
        checks: [enumCheck("provider", authProviders)],
      }),
      col("provider_user_key_hash", varchar(512), {
        notNull: true,
        sensitivity: "restricted",
        checks: ["length(provider_user_key_hash) between 32 and 512"],
      }),
      col("provider_user_key_hint", varchar(160)),
      col("email", varchar(254)),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", authIdentityStatuses)],
      }),
      ts("linked_at"),
      ts("last_used_at"),
      ts("revoked_at"),
      col("revoked_reason"),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint auth_identities_revoked_check check (revoked_at is null or status in ('REVOKED', 'MERGED', 'DISABLED'))",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "auth_credentials",
    description:
      "비밀번호 hash, passkey, recovery code hash 등 인증 secret 참조.",
    containsPii: false,
    columns: [
      UUID_PK("credential_id"),
      fk("user_id"),
      fk("identity_id", "auth_identities", "identity_id", "cascade"),
      col("kind", varchar(32), {
        notNull: true,
        checks: [enumCheck("kind", credentialKinds)],
      }),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", credentialStatuses)],
      }),
      col("credential_hash", varchar(512), {
        notNull: true,
        sensitivity: "secret",
      }),
      col("credential_secret_ref", varchar(512), { sensitivity: "secret" }),
      col("algorithm", varchar(80), {
        notNull: true,
        defaultSql: "'argon2id'",
      }),
      col("version", "integer", { notNull: true, defaultSql: "1" }),
      ts("last_used_at"),
      ts("rotated_at"),
      ts("revoked_at"),
      ts("expires_at"),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint auth_credentials_no_raw_secret check (raw_password_included = false and raw_secret_included = false)",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "auth_sessions",
    description:
      "자동 로그인과 refresh rotation 원장. token 원문 없이 hash만 저장.",
    containsPii: false,
    idempotencyRequired: true,
    columns: [
      UUID_PK("session_id"),
      fk("user_id"),
      fk("device_id", "user_devices", "device_id", "set null"),
      col("refresh_token_hash", varchar(512), {
        notNull: true,
        sensitivity: "secret",
      }),
      col("session_family_id", "uuid", {
        notNull: true,
        defaultSql: "gen_random_uuid()",
      }),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", sessionStatuses)],
      }),
      col("ip_hash", varchar(256)),
      col("user_agent_hash", varchar(256)),
      ts("issued_at"),
      ts("last_used_at"),
      col("expires_at", "timestamptz", { notNull: true }),
      ts("rotated_at"),
      ts("revoked_at"),
      col("revoked_reason"),
      col("idempotency_key", varchar(256), { notNull: true }),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint auth_sessions_expiry_check check (expires_at > created_at)",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "user_profiles",
    description: "마이페이지·커뮤니티 표시 프로필. 금융 원천값 저장 금지.",
    containsPii: true,
    columns: [
      UUID_PK("profile_id"),
      fk("user_id"),
      col("display_name", varchar(60), { notNull: true }),
      col("community_nickname", varchar(24), { notNull: true }),
      col("job_title", varchar(80)),
      col("profile_image_url", varchar(2048)),
      col("bio"),
      col("profile_visibility", varchar(24), {
        notNull: true,
        defaultSql: "'members_only'",
      }),
      bool("default_anonymous_posting"),
      bool("level_badge_visible", "true"),
      bool("salary_metrics_visible"),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint user_profiles_user_unique unique (user_id)",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "user_settings",
    description: "알림·마케팅·광고·자동 로그인·시간대·통화 설정.",
    containsPii: false,
    columns: [
      UUID_PK("setting_id"),
      fk("user_id"),
      bool("push_enabled", "true"),
      bool("budget_alert_enabled", "true"),
      bool("fixed_payment_alert_enabled", "true"),
      bool("savings_alert_enabled", "true"),
      bool("growth_alert_enabled", "true"),
      bool("community_alert_enabled", "true"),
      bool("event_alert_enabled", "true"),
      bool("marketing_opt_in"),
      bool("ad_personalization_opt_in"),
      bool("analytics_opt_in"),
      bool("auto_login_enabled", "true"),
      bool("quiet_hours_enabled", "true"),
      col("quiet_start_local_time", varchar(5), {
        notNull: true,
        defaultSql: "'22:00'",
      }),
      col("quiet_end_local_time", varchar(5), {
        notNull: true,
        defaultSql: "'08:00'",
      }),
      col("timezone", varchar(64), {
        notNull: true,
        defaultSql: "'Asia/Seoul'",
        checks: ["timezone = 'Asia/Seoul'"],
      }),
      col("locale", varchar(16), { notNull: true, defaultSql: "'ko-KR'" }),
      col("currency_code", "char(3)", { notNull: true, defaultSql: "'KRW'" }),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint user_settings_user_unique unique (user_id)",
      "constraint user_settings_ad_requires_marketing check (ad_personalization_opt_in = false or marketing_opt_in = true)",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "user_consents",
    description: "약관·개인정보·푸시·마케팅·광고·제휴 동의 이력.",
    containsPii: false,
    columns: [
      UUID_PK("consent_id"),
      fk("user_id"),
      col("consent_type", varchar(40), {
        notNull: true,
        checks: [enumCheck("consent_type", consentTypes)],
      }),
      col("status", varchar(16), {
        notNull: true,
        checks: [enumCheck("status", consentStatuses)],
      }),
      bool("granted"),
      col("consent_version", varchar(50), {
        notNull: true,
        defaultSql: "'v1'",
      }),
      col("source", varchar(24), {
        notNull: true,
        defaultSql: "'APP'",
        checks: [enumCheck("source", consentSources)],
      }),
      col("ip_hash", varchar(256)),
      col("user_agent_hash", varchar(256)),
      ts("granted_at"),
      ts("revoked_at"),
      json("metadata"),
      ...safetyColumns,
      col("request_id", varchar(128)),
      ts("created_at"),
    ],
    constraints: [
      "constraint user_consents_status_check check ((granted = true and status = 'GRANTED') or (granted = false and status = 'WITHDRAWN'))",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "user_devices",
    description: "사용자 기기와 push 대상. push token 원문 저장 금지.",
    containsPii: false,
    columns: [
      UUID_PK("device_id"),
      fk("user_id"),
      col("platform", varchar(24), {
        notNull: true,
        checks: [enumCheck("platform", devicePlatforms)],
      }),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", deviceStatuses)],
      }),
      col("push_permission_status", varchar(32), {
        notNull: true,
        defaultSql: "'NOT_DETERMINED'",
        checks: [enumCheck("push_permission_status", pushPermissionStatuses)],
      }),
      col("push_token_hash", varchar(512), { sensitivity: "secret" }),
      col("push_token_secret_ref", varchar(512), { sensitivity: "secret" }),
      col("device_fingerprint_hash", varchar(512)),
      col("app_version", varchar(80)),
      col("build_number", varchar(80)),
      col("os_version", varchar(120)),
      ts("last_seen_at"),
      ts("revoked_at"),
      col("revoked_reason"),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint user_devices_revoked_check check (revoked_at is null or status in ('REVOKED', 'EXPIRED', 'BLOCKED'))",
      ...secureChecks,
    ],
  }),
] as const satisfies readonly DbTableSpec[];

/**
 * 아래 확장 테이블은 schema object에 병합해 사용한다.
 * - user_mfa_factors: MFA factor
 * - admin_roles / admin_role_members: 관리자 RBAC
 * - user_idempotency_records: 멱등성
 * - user_audit_events: 감사 로그
 */
export const extendedUsersSchemaTables = [
  makeTable({
    name: "user_mfa_factors",
    description: "MFA factor. TOTP/passkey/recovery secret 원문 저장 금지.",
    containsPii: false,
    columns: [
      UUID_PK("mfa_factor_id"),
      fk("user_id"),
      col("method", varchar(24), {
        notNull: true,
        checks: [enumCheck("method", mfaMethods)],
      }),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'PENDING'",
        checks: [enumCheck("status", mfaStatuses)],
      }),
      col("secret_ref", varchar(512), { sensitivity: "secret" }),
      col("secret_hash", varchar(512), { sensitivity: "secret" }),
      col("label", varchar(120)),
      ts("enabled_at"),
      ts("last_used_at"),
      ts("disabled_at"),
      json("metadata"),
      ...protectedColumns,
    ],
    constraints: secureChecks,
  }),
  makeTable({
    name: "admin_roles",
    description: "관리자 콘솔 RBAC 역할 정의.",
    containsPii: false,
    columns: [
      UUID_PK("admin_role_id"),
      col("role_key", varchar(64), { notNull: true, unique: true }),
      col("name", varchar(80), { notNull: true }),
      col("description"),
      col("permissions", "jsonb", { notNull: true, defaultSql: "'[]'::jsonb" }),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", adminRoleStatuses)],
      }),
      ...protectedColumns,
    ],
    constraints: secureChecks,
  }),
  makeTable({
    name: "admin_role_members",
    description: "관리자 역할 멤버십. 활성 중복 부여 방지.",
    containsPii: false,
    columns: [
      UUID_PK("admin_role_member_id"),
      fk("admin_role_id", "admin_roles", "admin_role_id", "restrict"),
      fk("user_id"),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'ACTIVE'",
        checks: [enumCheck("status", adminRoleMemberStatuses)],
      }),
      ts("assigned_at"),
      fk("assigned_by", "users", "user_id", "set null"),
      ts("revoked_at"),
      fk("revoked_by", "users", "user_id", "set null"),
      col("reason"),
      ...protectedColumns,
    ],
    constraints: [
      "constraint admin_role_members_revoked_check check (revoked_at is null or status in ('REVOKED', 'SUSPENDED'))",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "user_idempotency_records",
    description: "회원가입·로그인·세션·동의·프로필·권한 변경 API 멱등성 원장.",
    containsPii: false,
    idempotencyRequired: true,
    columns: [
      UUID_PK("idempotency_record_id"),
      fk("user_id"),
      col("idempotency_key", varchar(256), { notNull: true }),
      col("operation", varchar(80), { notNull: true }),
      col("status", varchar(24), {
        notNull: true,
        defaultSql: "'PROCESSING'",
        checks: [enumCheck("status", idempotencyRecordStatuses)],
      }),
      col("request_hash", varchar(128), { notNull: true }),
      col("response_reference_id", "uuid"),
      col("error_code", varchar(120)),
      col("expires_at", "timestamptz", { notNull: true }),
      ...protectedColumns,
    ],
    constraints: [
      "constraint user_idempotency_key_unique unique (idempotency_key)",
      ...secureChecks,
    ],
  }),
  makeTable({
    name: "user_audit_events",
    description: "사용자·인증·세션·프로필·동의·기기·RBAC 감사 로그.",
    containsPii: false,
    columns: [
      UUID_PK("audit_event_id"),
      col("event_type", varchar(80), {
        notNull: true,
        checks: [enumCheck("event_type", userAuditEventTypes)],
      }),
      fk("actor_user_id", "users", "user_id", "set null"),
      fk("target_user_id", "users", "user_id", "set null"),
      fk("identity_id", "auth_identities", "identity_id", "set null"),
      fk("session_id", "auth_sessions", "session_id", "set null"),
      fk("device_id", "user_devices", "device_id", "set null"),
      fk(
        "admin_role_member_id",
        "admin_role_members",
        "admin_role_member_id",
        "set null",
      ),
      json("before_data"),
      json("after_data"),
      col("reason"),
      col("request_id", varchar(128)),
      col("ip_hash", varchar(256)),
      col("user_agent_hash", varchar(256)),
      ...safetyColumns,
      ts("created_at"),
    ],
    constraints: secureChecks,
  }),
] as const satisfies readonly DbTableSpec[];

export const allUsersSchemaTables = [
  ...usersSchemaTables,
  ...extendedUsersSchemaTables,
] as const satisfies readonly DbTableSpec[];

export const usersSchemaIndexes = [
  {
    name: "uq_users_email_active",
    table: "users",
    columns: ["email"],
    unique: true,
    whereSql: "email is not null and deleted_at is null",
  },
  {
    name: "idx_users_status_created",
    table: "users",
    columns: ["status", "created_at"],
  },
  {
    name: "idx_users_last_login",
    table: "users",
    columns: ["last_login_at"],
    whereSql: "last_login_at is not null",
  },
  {
    name: "idx_users_phone_hash",
    table: "users",
    columns: ["phone_number_hash"],
    whereSql: "phone_number_hash is not null and deleted_at is null",
  },
  {
    name: "uq_auth_identities_provider_hash_active",
    table: "auth_identities",
    columns: ["provider", "provider_user_key_hash"],
    unique: true,
    whereSql: "status = 'ACTIVE'",
  },
  {
    name: "idx_auth_identities_user_status",
    table: "auth_identities",
    columns: ["user_id", "status", "linked_at"],
  },
  {
    name: "idx_auth_credentials_user_kind",
    table: "auth_credentials",
    columns: ["user_id", "kind", "status"],
  },
  {
    name: "idx_auth_sessions_user_status",
    table: "auth_sessions",
    columns: ["user_id", "status", "last_used_at"],
  },
  {
    name: "uq_auth_sessions_refresh_hash_active",
    table: "auth_sessions",
    columns: ["refresh_token_hash"],
    unique: true,
    whereSql: "status = 'ACTIVE'",
  },
  {
    name: "idx_user_profiles_nickname",
    table: "user_profiles",
    columns: ["community_nickname"],
  },
  {
    name: "idx_user_settings_marketing",
    table: "user_settings",
    columns: ["marketing_opt_in", "ad_personalization_opt_in"],
    whereSql: "marketing_opt_in = true",
  },
  {
    name: "idx_user_consents_user_type_time",
    table: "user_consents",
    columns: ["user_id", "consent_type", "created_at"],
  },
  {
    name: "idx_user_devices_user_status",
    table: "user_devices",
    columns: ["user_id", "status", "last_seen_at"],
  },
  {
    name: "idx_user_devices_push_token_hash",
    table: "user_devices",
    columns: ["push_token_hash"],
    whereSql: "push_token_hash is not null and status = 'ACTIVE'",
  },
  {
    name: "uq_user_devices_fingerprint_active",
    table: "user_devices",
    columns: ["user_id", "device_fingerprint_hash"],
    unique: true,
    whereSql: "device_fingerprint_hash is not null and status = 'ACTIVE'",
  },
  {
    name: "idx_user_mfa_user_status",
    table: "user_mfa_factors",
    columns: ["user_id", "method", "status"],
  },
  {
    name: "idx_admin_roles_status",
    table: "admin_roles",
    columns: ["status", "role_key"],
  },
  {
    name: "uq_admin_role_members_active",
    table: "admin_role_members",
    columns: ["admin_role_id", "user_id"],
    unique: true,
    whereSql: "status = 'ACTIVE'",
  },
  {
    name: "idx_admin_role_members_user_status",
    table: "admin_role_members",
    columns: ["user_id", "status", "assigned_at"],
  },
  {
    name: "idx_user_idempotency_status_expiry",
    table: "user_idempotency_records",
    columns: ["status", "expires_at"],
  },
  {
    name: "idx_user_audit_events_target",
    table: "user_audit_events",
    columns: ["target_user_id", "created_at"],
    whereSql: "target_user_id is not null",
  },
  {
    name: "idx_user_audit_events_actor",
    table: "user_audit_events",
    columns: ["actor_user_id", "created_at"],
    whereSql: "actor_user_id is not null",
  },
] as const satisfies readonly DbIndexSpec[];

const currentUserSql = "user_id = public.current_app_user_id()";
const currentUserOrAdminSql = `${currentUserSql} or public.current_app_is_admin()`;
const serviceOrAdminSql =
  "public.current_app_is_admin() or current_user = 'service_role'";
const safetySql = safetyColumns.map((c) => `${c.name} = false`).join(" and ");
const ownerAll = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "all",
  role: "authenticated",
  usingSql: currentUserOrAdminSql,
  checkSql: `${currentUserOrAdminSql} and ${safetySql}`,
});
const ownerSelect = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "select",
  role: "authenticated",
  usingSql: currentUserOrAdminSql,
});
const serviceAll = (name: string, table: string): DbPolicySpec => ({
  name,
  table,
  command: "all",
  role: "service_role",
  usingSql: serviceOrAdminSql,
  checkSql: `${serviceOrAdminSql} and ${safetySql}`,
});

export const usersSchemaPolicies = [
  ownerSelect("users_owner_select", "users"),
  ownerAll("users_owner_update", "users"),
  serviceAll("users_service_all", "users"),
  ownerAll("auth_identities_owner_all", "auth_identities"),
  serviceAll("auth_identities_service_all", "auth_identities"),
  ownerSelect("auth_credentials_owner_select", "auth_credentials"),
  serviceAll("auth_credentials_service_all", "auth_credentials"),
  ownerSelect("auth_sessions_owner_select", "auth_sessions"),
  serviceAll("auth_sessions_service_all", "auth_sessions"),
  ownerAll("user_profiles_owner_all", "user_profiles"),
  ownerAll("user_settings_owner_all", "user_settings"),
  ownerAll("user_consents_owner_all", "user_consents"),
  ownerAll("user_devices_owner_all", "user_devices"),
  ownerSelect("user_mfa_factors_owner_select", "user_mfa_factors"),
  serviceAll("user_mfa_factors_service_all", "user_mfa_factors"),
  {
    name: "admin_roles_admin_all",
    table: "admin_roles",
    command: "all",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
    checkSql: `public.current_app_is_admin() and ${safetySql}`,
  },
  {
    name: "admin_role_members_admin_all",
    table: "admin_role_members",
    command: "all",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
    checkSql: `public.current_app_is_admin() and ${safetySql}`,
  },
  serviceAll("user_idempotency_service_all", "user_idempotency_records"),
  {
    name: "user_audit_events_admin_select",
    table: "user_audit_events",
    command: "select",
    role: "admin",
    usingSql: "public.current_app_is_admin()",
  },
  {
    name: "user_audit_events_service_insert",
    table: "user_audit_events",
    command: "insert",
    role: "service_role",
    checkSql: `${serviceOrAdminSql} and ${safetySql}`,
  },
] as const satisfies readonly DbPolicySpec[];

export const adminRoleSeeds = [
  {
    roleKey: "owner",
    nameKo: "최고 운영자",
    descriptionKo: "조직, 보안, 릴리즈, 권한 부여 최상위 승인",
    permissions: ["*"],
    status: "ACTIVE",
  },
  {
    roleKey: "platform_admin",
    nameKo: "플랫폼 관리자",
    descriptionKo: "CI/CD, 인프라, 환경변수, 배포 운영",
    permissions: ["platform:read", "platform:write", "deploy:approve"],
    status: "ACTIVE",
  },
  {
    roleKey: "security_admin",
    nameKo: "보안 관리자",
    descriptionKo: "개인정보, 인증/인가, 감사, 취약점 대응",
    permissions: ["security:read", "security:write", "audit:read"],
    status: "ACTIVE",
  },
  {
    roleKey: "backend_admin",
    nameKo: "백엔드 관리자",
    descriptionKo: "API, DB, 서버 권위 계산, scheduler 운영",
    permissions: ["api:read", "api:write", "db:operate"],
    status: "ACTIVE",
  },
  {
    roleKey: "product_admin",
    nameKo: "제품 관리자",
    descriptionKo: "기획, 화면, QA, 공지, 운영 정책",
    permissions: ["product:read", "product:write", "notice:write"],
    status: "ACTIVE",
  },
  {
    roleKey: "support_admin",
    nameKo: "CS 운영자",
    descriptionKo: "문의, 신고, 공지, 사용자 지원",
    permissions: ["support:read", "support:write", "user:support"],
    status: "ACTIVE",
  },
  {
    roleKey: "ads_admin",
    nameKo: "광고·제휴 운영자",
    descriptionKo: "광고/제휴 캠페인과 동의 정책 확인",
    permissions: ["ads:read", "ads:write", "consent:read"],
    status: "ACTIVE",
  },
  {
    roleKey: "moderator",
    nameKo: "커뮤니티 모더레이터",
    descriptionKo: "커뮤니티 신고, 숨김, 운영 조치",
    permissions: ["community:moderate", "report:read"],
    status: "ACTIVE",
  },
  {
    roleKey: "viewer",
    nameKo: "운영 조회자",
    descriptionKo: "관리자 콘솔 읽기 전용",
    permissions: ["admin:read"],
    status: "ACTIVE",
  },
] as const;

export const consentRequirementSeeds = consentTypes.map((type) => ({
  consentType: type,
  requiredForSignup: [
    "TERMS_OF_SERVICE",
    "PRIVACY_POLICY",
    "AGE_CONFIRMATION",
    "COMMUNITY_POLICY",
  ].includes(type),
  requiredForMarketing: [
    "MARKETING_PUSH",
    "AD_PERSONALIZATION",
    "PARTNER_BENEFIT",
  ].includes(type),
  titleKo: type,
  version: "v1",
})) as readonly {
  readonly consentType: ConsentType;
  readonly requiredForSignup: boolean;
  readonly requiredForMarketing: boolean;
  readonly titleKo: string;
  readonly version: string;
}[];

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
const renderReference = (r: NonNullable<DbColumnSpec["references"]>) =>
  `references ${q(r.table)} (${q(r.column)})${r.onDelete ? ` on delete ${r.onDelete}` : ""}`;

export const renderUserColumnSql = (c: DbColumnSpec): string =>
  [
    q(c.name),
    c.type,
    c.primaryKey ? "primary key" : "",
    c.notNull ? "not null" : "",
    c.unique ? "unique" : "",
    c.defaultSql ? `default ${c.defaultSql}` : "",
    c.references ? renderReference(c.references) : "",
    ...(c.checks ?? []).map((x) => `check (${x})`),
  ]
    .filter(Boolean)
    .join(" ");

export const renderUserCreateTableSql = (t: DbTableSpec): string =>
  `create table if not exists ${q(t.name)} (\n${[...t.columns.map(renderUserColumnSql), ...t.constraints].map((x) => `  ${x}`).join(",\n")}\n);`;

export const renderUserCreateIndexSql = (i: DbIndexSpec): string =>
  `create ${i.unique ? "unique " : ""}index if not exists ${q(i.name)} on ${q(i.table)}${i.method ? ` using ${i.method}` : ""} (${i.columns.map(q).join(", ")})${i.whereSql ? ` where ${i.whereSql}` : ""};`;

export const renderUserPolicySql = (p: DbPolicySpec): string =>
  `create policy ${q(p.name)} on ${q(p.table)} for ${p.command.toUpperCase()} to ${p.role}${p.usingSql ? `\n  using (${p.usingSql})` : ""}${p.checkSql ? `\n  with check (${p.checkSql})` : ""};`;

const orderUsersTablesForDdl = (
  tables: readonly DbTableSpec[],
): readonly DbTableSpec[] => {
  const tableByName = new Map(
    tables.map((table) => [table.name, table] as const),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: DbTableSpec[] = [];

  const visit = (table: DbTableSpec): void => {
    if (visited.has(table.name)) return;
    if (visiting.has(table.name))
      throw new Error(
        `Circular users schema table dependency detected: ${table.name}`,
      );

    visiting.add(table.name);
    for (const column of table.columns) {
      const referencedTableName = column.references?.table;
      if (!referencedTableName || referencedTableName === table.name) continue;

      const referencedTable = tableByName.get(referencedTableName);
      if (referencedTable) visit(referencedTable);
    }

    visiting.delete(table.name);
    visited.add(table.name);
    ordered.push(table);
  };

  for (const table of tables) visit(table);
  return ordered;
};

export const usersSchemaTablesInDdlOrder =
  orderUsersTablesForDdl(allUsersSchemaTables);

export const usersSchemaDdl = Object.freeze({
  extensions: ["create extension if not exists pgcrypto;"],
  tables: usersSchemaTablesInDdlOrder.map(renderUserCreateTableSql),
  indexes: usersSchemaIndexes.map(renderUserCreateIndexSql),
  rls: allUsersSchemaTables.map(
    (t) => `alter table ${q(t.name)} enable row level security;`,
  ),
  policies: usersSchemaPolicies.map(renderUserPolicySql),
});

export const usersSchemaRequiredTableNames = [
  "users",
  "auth_identities",
  "auth_credentials",
  "auth_sessions",
  "user_profiles",
  "user_settings",
  "user_consents",
  "user_devices",
  "user_mfa_factors",
  "admin_roles",
  "admin_role_members",
  "user_idempotency_records",
  "user_audit_events",
] as const;
export type UserTableName = (typeof usersSchemaRequiredTableNames)[number];

const getTable = (name: UserTableName) =>
  allUsersSchemaTables.find((t) => t.name === name);
const columnNames = (name: UserTableName) =>
  new Set(getTable(name)?.columns.map((c) => c.name) ?? []);

export const getUsersSchemaCompletenessReport =
  (): UserSchemaCompletenessReport => {
    const tableNames = new Set(allUsersSchemaTables.map((t) => t.name));
    const policyTables = new Set(usersSchemaPolicies.map((p) => p.table));
    const missing: string[] = [];

    for (const table of usersSchemaRequiredTableNames)
      if (!tableNames.has(table)) missing.push(`missing table: ${table}`);

    for (const table of allUsersSchemaTables) {
      if (!table.rlsRequired) missing.push(`missing rls: ${table.name}`);
      if (!table.auditRequired) missing.push(`missing audit: ${table.name}`);
      if (!table.serverAuthorityRequired)
        missing.push(`missing server authority: ${table.name}`);
      if (
        table.containsRawToken !== false ||
        table.containsRawSecret !== false ||
        table.containsRawFinancialData !== false
      )
        missing.push(`unsafe raw data flag: ${table.name}`);
      if (!policyTables.has(table.name))
        missing.push(`missing policy coverage: ${table.name}`);
    }

    for (const column of [
      "user_id",
      "email",
      "phone_number_hash",
      "nickname",
      "status",
      "last_login_at",
      "deleted_at",
    ] as const)
      if (!columnNames("users").has(column))
        missing.push(`missing users column: ${column}`);
    for (const column of [
      "provider",
      "provider_user_key_hash",
      "email",
      "status",
      "linked_at",
      "revoked_at",
    ] as const)
      if (!columnNames("auth_identities").has(column))
        missing.push(`missing auth identity column: ${column}`);
    for (const column of [
      "refresh_token_hash",
      "session_family_id",
      "status",
      "expires_at",
      "idempotency_key",
    ] as const)
      if (!columnNames("auth_sessions").has(column))
        missing.push(`missing session column: ${column}`);
    for (const column of [
      "push_enabled",
      "budget_alert_enabled",
      "savings_alert_enabled",
      "growth_alert_enabled",
      "community_alert_enabled",
      "marketing_opt_in",
      "ad_personalization_opt_in",
      "timezone",
      "locale",
      "currency_code",
    ] as const)
      if (!columnNames("user_settings").has(column))
        missing.push(`missing settings column: ${column}`);
    for (const column of [
      "display_name",
      "community_nickname",
      "job_title",
      "profile_image_url",
      "salary_metrics_visible",
    ] as const)
      if (!columnNames("user_profiles").has(column))
        missing.push(`missing profile column: ${column}`);
    for (const column of [
      "consent_type",
      "status",
      "granted",
      "consent_version",
      "source",
      "granted_at",
      "revoked_at",
    ] as const)
      if (!columnNames("user_consents").has(column))
        missing.push(`missing consent column: ${column}`);
    for (const column of [
      "platform",
      "status",
      "push_permission_status",
      "push_token_hash",
      "device_fingerprint_hash",
      "last_seen_at",
    ] as const)
      if (!columnNames("user_devices").has(column))
        missing.push(`missing device column: ${column}`);
    for (const safety of safetyColumns)
      for (const table of usersSchemaRequiredTableNames)
        if (!columnNames(table).has(safety.name))
          missing.push(`missing safety column ${safety.name} on ${table}`);
    for (const provider of [
      "EMAIL",
      "NAVER",
      "KAKAO",
      "GOOGLE",
      "APPLE",
    ] as const)
      if (!authProviders.includes(provider))
        missing.push(`missing provider: ${provider}`);
    for (const role of [
      "owner",
      "security_admin",
      "backend_admin",
      "product_admin",
      "support_admin",
      "ads_admin",
    ] as const)
      if (!adminRoleSeeds.some((seed) => seed.roleKey === role))
        missing.push(`missing role seed: ${role}`);
    if (
      !usersSchemaIndexes.some(
        (index) => index.name === "uq_users_email_active" && index.unique,
      )
    )
      missing.push("missing active email unique index");
    if (
      !usersSchemaIndexes.some(
        (index) =>
          index.name === "uq_auth_sessions_refresh_hash_active" && index.unique,
      )
    )
      missing.push("missing refresh hash unique index");

    const ddlOrder = new Map(
      usersSchemaTablesInDdlOrder.map(
        (table, index) => [table.name, index] as const,
      ),
    );
    const internalTableNames = new Set(
      allUsersSchemaTables.map((table) => table.name),
    );

    for (const table of allUsersSchemaTables) {
      for (const column of table.columns) {
        const referencedTableName = column.references?.table;
        if (
          !referencedTableName ||
          !internalTableNames.has(referencedTableName)
        )
          continue;

        const tableIndex = ddlOrder.get(table.name);
        const referencedTableIndex = ddlOrder.get(referencedTableName);

        if (
          tableIndex === undefined ||
          referencedTableIndex === undefined ||
          referencedTableIndex > tableIndex
        ) {
          missing.push(
            `DDL order violation: ${table.name}.${column.name} references ${referencedTableName}`,
          );
        }
      }
    }

    return {
      ok: missing.length === 0,
      tableCount: allUsersSchemaTables.length,
      indexCount: usersSchemaIndexes.length,
      policyCount: usersSchemaPolicies.length,
      adminRoleSeedCount: adminRoleSeeds.length,
      consentSeedCount: consentRequirementSeeds.length,
      ddlStatementCount:
        usersSchemaDdl.extensions.length +
        usersSchemaDdl.tables.length +
        usersSchemaDdl.indexes.length +
        usersSchemaDdl.rls.length +
        usersSchemaDdl.policies.length,
      missing,
    };
  };

export const assertUsersSchemaCompleteness = (): void => {
  const report = getUsersSchemaCompletenessReport();
  if (!report.ok)
    throw new Error(`Users schema is incomplete: ${report.missing.join(", ")}`);
};

assertUsersSchemaCompleteness();

export const usersSchema = Object.freeze({
  policy: usersSchemaPolicy,
  authProviders,
  socialAuthProviders,
  userStatuses,
  authIdentityStatuses,
  credentialKinds,
  credentialStatuses,
  sessionStatuses,
  devicePlatforms,
  deviceStatuses,
  pushPermissionStatuses,
  consentTypes,
  consentStatuses,
  consentSources,
  mfaMethods,
  mfaStatuses,
  adminRoleKeys,
  adminRoleStatuses,
  adminRoleMemberStatuses,
  userAuditEventTypes,
  idempotencyRecordStatuses,
  tables: allUsersSchemaTables,
  ddlTables: usersSchemaTablesInDdlOrder,
  indexes: usersSchemaIndexes,
  policies: usersSchemaPolicies,
  adminRoleSeeds,
  consentRequirementSeeds,
  ddl: usersSchemaDdl,
  getCompletenessReport: getUsersSchemaCompletenessReport,
  assertCompleteness: assertUsersSchemaCompleteness,
});

export default usersSchema;
