import type {
  AccountStatus,
  AuthProvider,
  AuthRepository,
  AuthRole,
  AuthRuntime,
  AuthSession,
  AuthUser,
  OAuthStateRecord,
  RegisterInput,
  SocialLoginInput,
} from "../routes/auth.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface AuthDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface AuthDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type AuthDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: AuthDbQueryOptions<TEnv>,
) => Promise<AuthDbQueryResult>;

export interface NeonAuthRepositoryOptions<TEnv = unknown> {
  readonly query?: AuthDbQuery<TEnv>;
}

const DATABASE_URL_ENV_KEYS = [
  "SALARY_HIJACKING_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "DIRECT_DATABASE_URL",
] as const;

const authProviders = new Set<AuthProvider>([
  "EMAIL",
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
  "FACEBOOK",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonAuthRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for auth repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: AuthDbQueryOptions<TEnv>,
): Promise<AuthDbQueryResult> {
  const moduleValue = (await import("@neondatabase/serverless")) as unknown as {
    readonly Pool: new (config: Record<string, unknown>) => {
      query: (
        text: string,
        values?: readonly DbValue[],
      ) => Promise<{
        readonly rows: readonly DbRow[];
        readonly rowCount: number | null;
      }>;
      end: () => Promise<void>;
    };
    readonly neonConfig?: { fetchConnectionCache?: boolean };
  };

  if (moduleValue.neonConfig)
    moduleValue.neonConfig.fetchConnectionCache = true;
  const pool = new moduleValue.Pool({
    connectionString: databaseUrl(options.env),
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  try {
    return await pool.query(sqlText, [...params]);
  } finally {
    await pool.end();
  }
}

function assertUuid(value: string, field: string): string {
  if (!uuidPattern.test(value)) {
    throw new Error(`${field} must be a UUID for DB-backed auth.`);
  }
  return value;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function utf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(utf8(input)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [localRaw, domainRaw] = email.split("@");
  const local = localRaw ?? "";
  const domain = domainRaw ?? "";
  if (!local || !domain) return "***";
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim())
    return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function toNullableIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function providerFrom(value: unknown): AuthProvider {
  const provider =
    typeof value === "string" ? value.trim().toUpperCase() : "EMAIL";
  return authProviders.has(provider as AuthProvider)
    ? (provider as AuthProvider)
    : "EMAIL";
}

function accountStatusFrom(value: unknown): AccountStatus {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "WITHDRAWN") return "WITHDRAWN";
  if (status === "DELETED") return "DELETED";
  if (status === "LOCKED") return "LOCKED";
  if (status === "PENDING" || status === "PENDING_EMAIL_VERIFICATION")
    return "PENDING";
  return "ACTIVE";
}

function rolesFrom(value: unknown): readonly AuthRole[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const roles = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .map((role) => {
      if (role === "owner") return "SUPER_ADMIN";
      if (
        [
          "platform_admin",
          "security_admin",
          "backend_admin",
          "product_admin",
          "support_admin",
          "ads_admin",
        ].includes(role)
      )
        return "ADMIN";
      if (role === "moderator") return "OPERATOR";
      return role.toUpperCase();
    })
    .filter((role): role is AuthRole =>
      ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role),
    );
  return roles.length ? [...new Set(roles)] : ["USER"];
}

function mapUser(row: DbRow | undefined): AuthUser | null {
  if (!row) return null;
  const email = typeof row.email === "string" ? row.email : null;
  return {
    userId: String(row.user_id),
    emailMasked: maskEmail(email),
    nickname:
      typeof row.nickname === "string" && row.nickname.trim()
        ? row.nickname.trim()
        : "Salary Hijacking User",
    provider: providerFrom(row.provider),
    roles: rolesFrom(row.roles),
    permissions: [],
    accountStatus: accountStatusFrom(row.status),
    level: 1,
    mfaEnabled: toBool(row.mfa_enabled),
    passwordHash:
      typeof row.credential_hash === "string" && row.credential_hash.trim()
        ? row.credential_hash.trim()
        : null,
    createdAt: toIso(row.created_at),
    lastLoginAt: toNullableIso(row.last_login_at),
  };
}

function mapSession(row: DbRow | undefined): AuthSession | null {
  if (!row) return null;
  return {
    sessionId: String(row.session_id),
    userId: String(row.user_id),
    refreshTokenHash: String(row.refresh_token_hash),
    deviceId: null,
    expiresAt: toIso(row.expires_at),
    revokedAt: toNullableIso(row.revoked_at),
    createdAt: toIso(row.created_at),
  };
}

function mapOAuthState(row: DbRow | undefined): OAuthStateRecord | null {
  if (!row) return null;
  return {
    state: String(row.state),
    provider: providerFrom(row.provider),
    codeVerifierHash: String(row.code_verifier_hash),
    redirectUri: String(row.redirect_uri),
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
  };
}

const userSelectSql = `
  select
    u.user_id,
    u.email,
    u.nickname,
    coalesce(ai.provider, 'EMAIL') as provider,
    u.status,
    u.created_at,
    u.last_login_at,
    ac.credential_hash,
    exists (
      select 1
      from public.user_mfa_factors mf
      where mf.user_id = u.user_id
        and mf.status = 'ACTIVE'
    ) as mfa_enabled,
    coalesce(
      array_agg(distinct ar.role_key)
        filter (where arm.status = 'ACTIVE' and ar.status = 'ACTIVE'),
      array[]::text[]
    ) as roles
  from public.users u
  left join public.auth_identities ai
    on ai.user_id = u.user_id
   and ai.revoked_at is null
  left join public.auth_credentials ac
    on ac.user_id = u.user_id
   and ac.kind = 'PASSWORD_HASH'
   and ac.status = 'ACTIVE'
   and ac.revoked_at is null
  left join public.admin_role_members arm
    on arm.user_id = u.user_id
   and arm.status = 'ACTIVE'
  left join public.admin_roles ar
    on ar.admin_role_id = arm.admin_role_id
   and ar.status = 'ACTIVE'
`;

export function createNeonAuthRepository<TEnv = unknown>(
  options: NeonAuthRepositoryOptions<TEnv> = {},
): AuthRepository<TEnv> {
  const query = options.query ?? defaultQuery<TEnv>;

  const run = (
    runtime: AuthRuntime<TEnv>,
    operationName: string,
    sqlText: string,
    params: readonly DbValue[],
  ) => query(sqlText, params, { operationName, env: runtime.env });

  return {
    name: "neon-auth-repository",

    async findUserByEmail(email, runtime): Promise<AuthUser | null> {
      const normalized = normalizeEmail(email);
      const result = await run(
        runtime,
        "auth.findUserByEmail",
        `${userSelectSql}
        where lower(u.email) = $1
          and u.deleted_at is null
        group by
          u.user_id,
          u.email,
          u.nickname,
          ai.provider,
          u.status,
          u.created_at,
          u.last_login_at,
          ac.credential_hash
        limit 1`,
        [normalized],
      );
      return mapUser(result.rows[0]);
    },

    async findUserByProvider(
      provider,
      providerSubject,
      runtime,
    ): Promise<AuthUser | null> {
      const providerKeyHash = await sha256Hex(
        `${provider}:${providerSubject.trim()}`,
      );
      const result = await run(
        runtime,
        "auth.findUserByProvider",
        `${userSelectSql}
        where ai.provider = $1
          and ai.provider_user_key = $2
          and ai.revoked_at is null
          and u.deleted_at is null
        group by
          u.user_id,
          u.email,
          u.nickname,
          ai.provider,
          u.status,
          u.created_at,
          u.last_login_at,
          ac.credential_hash
        limit 1`,
        [provider, providerKeyHash],
      );
      return mapUser(result.rows[0]);
    },

    async findUserById(userId, runtime): Promise<AuthUser | null> {
      const result = await run(
        runtime,
        "auth.findUserById",
        `${userSelectSql}
        where u.user_id = $1::uuid
          and u.deleted_at is null
        group by
          u.user_id,
          u.email,
          u.nickname,
          ai.provider,
          u.status,
          u.created_at,
          u.last_login_at,
          ac.credential_hash
        limit 1`,
        [assertUuid(userId, "userId")],
      );
      return mapUser(result.rows[0]);
    },

    async createEmailUser(
      input: RegisterInput,
      passwordHash: string,
      runtime,
    ): Promise<AuthUser> {
      const email = normalizeEmail(input.email);
      const providerKeyHash = await sha256Hex(`EMAIL:${email}`);
      const result = await run(
        runtime,
        "auth.createEmailUser",
        `
        with new_user as (
          insert into public.users (
            email,
            nickname,
            status,
            created_at,
            updated_at
          )
          values ($1, $2, 'ACTIVE', $6::timestamptz, $6::timestamptz)
          returning user_id, email, nickname, status, created_at, last_login_at
        ),
        new_identity as (
          insert into public.auth_identities (
            user_id,
            provider,
            provider_user_key,
            email,
            linked_at,
            created_at,
            updated_at
          )
          select
            user_id,
            'EMAIL',
            $3,
            email,
            $6::timestamptz,
            $6::timestamptz,
            $6::timestamptz
          from new_user
          returning identity_id, user_id, provider
        ),
        new_credential as (
          insert into public.auth_credentials (
            user_id,
            identity_id,
            kind,
            status,
            credential_hash,
            algorithm,
            created_at,
            updated_at
          )
          select
            user_id,
            identity_id,
            'PASSWORD_HASH',
            'ACTIVE',
            $4,
            'sha256',
            $6::timestamptz,
            $6::timestamptz
          from new_identity
          returning user_id, credential_hash
        ),
        new_consents as (
          insert into public.user_consents (
            user_id,
            consent_type,
            granted,
            consent_version,
            source,
            granted_at,
            revoked_at,
            created_at
          )
          select
            new_user.user_id,
            consent.consent_type,
            consent.granted,
            'v1',
            'APP',
            case when consent.granted then $6::timestamptz else null end,
            case when consent.granted then null else $6::timestamptz end,
            $6::timestamptz
          from new_user
          cross join (
            values
              ('TERMS_OF_SERVICE'::text, true),
              ('PRIVACY_POLICY'::text, true),
              ('MARKETING'::text, $5::boolean)
          ) as consent(consent_type, granted)
          returning user_id
        )
        select
          new_user.user_id,
          new_user.email,
          new_user.nickname,
          new_identity.provider,
          new_user.status,
          new_user.created_at,
          new_user.last_login_at,
          new_credential.credential_hash,
          false as mfa_enabled,
          array['USER']::text[] as roles
        from new_user
        join new_identity on new_identity.user_id = new_user.user_id
        join new_credential on new_credential.user_id = new_user.user_id`,
        [
          email,
          input.nickname.trim(),
          providerKeyHash,
          passwordHash,
          input.marketingAccepted === true,
          runtime.now.toISOString(),
        ],
      );
      const user = mapUser(result.rows[0]);
      if (!user)
        throw new Error("DB-backed auth user creation returned no row.");
      return user;
    },

    async upsertSocialUser(
      input: SocialLoginInput,
      providerSubject: string,
      runtime,
    ): Promise<AuthUser> {
      const providerKeyHash = await sha256Hex(
        `${input.provider}:${providerSubject.trim()}`,
      );
      const result = await run(
        runtime,
        "auth.upsertSocialUser",
        `
        with existing as (
          ${userSelectSql}
          where ai.provider = $1
            and ai.provider_user_key = $2
            and ai.revoked_at is null
            and u.deleted_at is null
          group by
            u.user_id,
            u.email,
            u.nickname,
            ai.provider,
            u.status,
            u.created_at,
            u.last_login_at,
            ac.credential_hash
          limit 1
        ),
        new_user as (
          insert into public.users (
            email,
            nickname,
            status,
            created_at,
            updated_at
          )
          select
            $3,
            $4,
            'ACTIVE',
            $5::timestamptz,
            $5::timestamptz
          where not exists (select 1 from existing)
          returning user_id, email, nickname, status, created_at, last_login_at
        ),
        new_identity as (
          insert into public.auth_identities (
            user_id,
            provider,
            provider_user_key,
            email,
            linked_at,
            created_at,
            updated_at
          )
          select
            user_id,
            $1,
            $2,
            email,
            $5::timestamptz,
            $5::timestamptz,
            $5::timestamptz
          from new_user
          returning user_id, provider
        )
        select * from existing
        union all
        select
          new_user.user_id,
          new_user.email,
          new_user.nickname,
          new_identity.provider,
          new_user.status,
          new_user.created_at,
          new_user.last_login_at,
          null::text as credential_hash,
          false as mfa_enabled,
          array['USER']::text[] as roles
        from new_user
        join new_identity on new_identity.user_id = new_user.user_id
        limit 1`,
        [
          input.provider,
          providerKeyHash,
          input.email ? normalizeEmail(input.email) : null,
          input.nickname?.trim() || `${input.provider} User`,
          runtime.now.toISOString(),
        ],
      );
      const user = mapUser(result.rows[0]);
      if (!user) throw new Error("DB-backed social auth returned no row.");
      return user;
    },

    async updateLastLogin(userId, runtime): Promise<void> {
      await run(
        runtime,
        "auth.updateLastLogin",
        `
        update public.users
        set last_login_at = $2::timestamptz,
            updated_at = $2::timestamptz
        where user_id = $1::uuid
          and deleted_at is null`,
        [assertUuid(userId, "userId"), runtime.now.toISOString()],
      );
    },

    async createSession(input, runtime): Promise<AuthSession> {
      const deviceHash = input.deviceId
        ? await sha256Hex(`auth-device:${input.deviceId}`)
        : null;
      const result = await run(
        runtime,
        "auth.createSession",
        `
        insert into public.auth_sessions (
          session_id,
          user_id,
          refresh_token_hash,
          device_identifier_hash,
          status,
          issued_at,
          last_used_at,
          expires_at,
          idempotency_key,
          created_at,
          updated_at
        )
        values (
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          'ACTIVE',
          $6::timestamptz,
          $6::timestamptz,
          $5::timestamptz,
          $1,
          $6::timestamptz,
          $6::timestamptz
        )
        returning
          session_id,
          user_id,
          refresh_token_hash,
          expires_at,
          revoked_at,
          created_at`,
        [
          assertUuid(input.sessionId, "sessionId"),
          assertUuid(input.userId, "userId"),
          input.refreshTokenHash,
          deviceHash,
          input.expiresAt,
          runtime.now.toISOString(),
        ],
      );
      const session = mapSession(result.rows[0]);
      if (!session)
        throw new Error("DB-backed session creation returned no row.");
      return session;
    },

    async findSessionByRefreshHash(
      refreshTokenHash,
      runtime,
    ): Promise<AuthSession | null> {
      const result = await run(
        runtime,
        "auth.findSessionByRefreshHash",
        `
        update public.auth_sessions
        set last_used_at = $2::timestamptz,
            updated_at = $2::timestamptz
        where refresh_token_hash = $1
          and status = 'ACTIVE'
          and revoked_at is null
        returning
          session_id,
          user_id,
          refresh_token_hash,
          expires_at,
          revoked_at,
          created_at`,
        [refreshTokenHash, runtime.now.toISOString()],
      );
      return mapSession(result.rows[0]);
    },

    async revokeSession(sessionId, reason, runtime): Promise<void> {
      await run(
        runtime,
        "auth.revokeSession",
        `
        update public.auth_sessions
        set status = case when $2 = 'ROTATED' then 'ROTATED' else 'REVOKED' end,
            revoked_at = $3::timestamptz,
            revoked_reason = $2,
            updated_at = $3::timestamptz
        where session_id = $1::uuid
          and revoked_at is null`,
        [assertUuid(sessionId, "sessionId"), reason, runtime.now.toISOString()],
      );
    },

    async revokeAllUserSessions(userId, reason, runtime): Promise<number> {
      const result = await run(
        runtime,
        "auth.revokeAllUserSessions",
        `
        update public.auth_sessions
        set status = 'REVOKED',
            revoked_at = $3::timestamptz,
            revoked_reason = $2,
            updated_at = $3::timestamptz
        where user_id = $1::uuid
          and revoked_at is null
        returning session_id`,
        [assertUuid(userId, "userId"), reason, runtime.now.toISOString()],
      );
      return result.rowCount ?? result.rows.length;
    },

    async storeEmailVerification(
      userId,
      tokenHash,
      expiresAt,
      runtime,
    ): Promise<void> {
      await run(
        runtime,
        "auth.storeEmailVerification",
        `
        insert into public.auth_email_verifications (
          user_id,
          token_hash,
          expires_at,
          created_at
        )
        values ($1::uuid, $2, $3::timestamptz, $4::timestamptz)
        on conflict (token_hash) do nothing`,
        [
          assertUuid(userId, "userId"),
          tokenHash,
          expiresAt,
          runtime.now.toISOString(),
        ],
      );
    },

    async verifyEmail(tokenHash, runtime): Promise<AuthUser | null> {
      const result = await run(
        runtime,
        "auth.verifyEmail",
        `
        with consumed as (
          update public.auth_email_verifications
          set consumed_at = $2::timestamptz
          where token_hash = $1
            and consumed_at is null
            and expires_at > $2::timestamptz
          returning user_id
        ),
        verified_user as (
          update public.users
          set email_verified_at = $2::timestamptz,
              updated_at = $2::timestamptz
          where user_id in (select user_id from consumed)
          returning user_id
        )
        ${userSelectSql}
        where u.user_id in (select user_id from verified_user)
        group by
          u.user_id,
          u.email,
          u.nickname,
          ai.provider,
          u.status,
          u.created_at,
          u.last_login_at,
          ac.credential_hash
        limit 1`,
        [tokenHash, runtime.now.toISOString()],
      );
      return mapUser(result.rows[0]);
    },

    async storePasswordReset(
      userId,
      tokenHash,
      expiresAt,
      runtime,
    ): Promise<void> {
      await run(
        runtime,
        "auth.storePasswordReset",
        `
        insert into public.auth_password_resets (
          user_id,
          token_hash,
          expires_at,
          created_at
        )
        values ($1::uuid, $2, $3::timestamptz, $4::timestamptz)
        on conflict (token_hash) do nothing`,
        [
          assertUuid(userId, "userId"),
          tokenHash,
          expiresAt,
          runtime.now.toISOString(),
        ],
      );
    },

    async resetPassword(
      tokenHash,
      passwordHash,
      runtime,
    ): Promise<AuthUser | null> {
      const result = await run(
        runtime,
        "auth.resetPassword",
        `
        with consumed as (
          update public.auth_password_resets
          set consumed_at = $3::timestamptz
          where token_hash = $1
            and consumed_at is null
            and expires_at > $3::timestamptz
          returning user_id
        ),
        old_credentials as (
          update public.auth_credentials
          set status = 'ROTATED',
              rotated_at = $3::timestamptz,
              updated_at = $3::timestamptz
          where user_id in (select user_id from consumed)
            and kind = 'PASSWORD_HASH'
            and status = 'ACTIVE'
          returning user_id, identity_id
        ),
        new_credentials as (
          insert into public.auth_credentials (
            user_id,
            identity_id,
            kind,
            status,
            credential_hash,
            algorithm,
            created_at,
            updated_at
          )
          select
            user_id,
            identity_id,
            'PASSWORD_HASH',
            'ACTIVE',
            $2,
            'sha256',
            $3::timestamptz,
            $3::timestamptz
          from old_credentials
          returning user_id
        )
        ${userSelectSql}
        where u.user_id in (select user_id from new_credentials)
        group by
          u.user_id,
          u.email,
          u.nickname,
          ai.provider,
          u.status,
          u.created_at,
          u.last_login_at,
          ac.credential_hash
        limit 1`,
        [tokenHash, passwordHash, runtime.now.toISOString()],
      );
      return mapUser(result.rows[0]);
    },

    async storeOAuthState(record, runtime): Promise<void> {
      await run(
        runtime,
        "auth.storeOAuthState",
        `
        insert into public.auth_oauth_states (
          state,
          provider,
          code_verifier_hash,
          redirect_uri,
          expires_at,
          created_at
        )
        values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
        on conflict (state) do nothing`,
        [
          record.state,
          record.provider,
          record.codeVerifierHash,
          record.redirectUri,
          record.expiresAt,
          runtime.now.toISOString(),
        ],
      );
    },

    async consumeOAuthState(state, runtime): Promise<OAuthStateRecord | null> {
      const result = await run(
        runtime,
        "auth.consumeOAuthState",
        `
        update public.auth_oauth_states
        set consumed_at = $2::timestamptz
        where state = $1
          and consumed_at is null
          and expires_at > $2::timestamptz
        returning
          state,
          provider,
          code_verifier_hash,
          redirect_uri,
          created_at,
          expires_at`,
        [state, runtime.now.toISOString()],
      );
      return mapOAuthState(result.rows[0]);
    },

    async verifyMfa(userId, code, runtime): Promise<boolean> {
      const result = await run(
        runtime,
        "auth.verifyMfa",
        `
        select mfa_factor_id
        from public.user_mfa_factors
        where user_id = $1::uuid
          and status = 'ACTIVE'
          and code_hash = $2
        limit 1`,
        [assertUuid(userId, "userId"), await sha256Hex(`mfa:${code}`)],
      );
      return result.rows.length > 0;
    },
  };
}
