type MobileUserRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
type MobileMfaMethod = "TOTP" | "RECOVERY_CODE";

type UnknownRecord = Record<string, unknown>;

export type MobileAuthSuccessPayload = Readonly<{
  status: "AUTHENTICATED";
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: string;
  user: Readonly<{
    id: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    role: MobileUserRole;
  }>;
}>;

export type MobileMfaRequiredPayload = Readonly<{
  status: "MFA_REQUIRED";
  challengeId: string;
  methods: readonly MobileMfaMethod[];
  maskedDestination?: string | null;
}>;

export type MobileLockedPayload = Readonly<{
  status: "LOCKED";
  message: string;
  retryAfterSeconds?: number | null;
}>;

export type MobileAuthPayload =
  | MobileAuthSuccessPayload
  | MobileMfaRequiredPayload
  | MobileLockedPayload;
export type MobileAuthResponse = Readonly<{
  data?: MobileAuthPayload;
  error?: unknown;
}>;

export type MobileSignupSuccessPayload = Readonly<{
  status: "REGISTERED" | "AUTHENTICATED";
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  emailVerificationRequired: boolean;
  onboardingRequired: boolean;
  user: Readonly<{
    id: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    role: MobileUserRole;
  }>;
}>;

export type MobileSignupPendingPayload = Readonly<{
  status: "EMAIL_VERIFICATION_REQUIRED";
  verificationId: string;
  maskedEmail: string;
}>;

export type MobileSignupBlockedPayload = Readonly<{
  status: "LOCKED" | "REJECTED";
  message: string;
  retryAfterSeconds?: number | null;
}>;

export type MobileSignupPayload =
  | MobileSignupSuccessPayload
  | MobileSignupPendingPayload
  | MobileSignupBlockedPayload;
export type MobileSignupResponse = Readonly<{
  data?: MobileSignupPayload;
  error?: unknown;
}>;

const MOBILE_ROLES = ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const;
const LOCKED_ACCOUNT_STATUSES = [
  "LOCKED",
  "SUSPENDED",
  "WITHDRAWN",
  "DELETED",
] as const;
const INVALID_AUTH_TOKEN_MESSAGE = "인증 토큰이 올바르지 않습니다.";

export function normalizeMobileAuthResponse(
  response: Readonly<{ data?: unknown; error?: unknown }>,
  now = new Date(),
): MobileAuthResponse {
  const data = asRecord(response.data);
  if (!data) return { error: response.error };
  if (isLegacyAuthPayload(data)) return { data };

  const user = asRecord(data.user);
  const tokens = asRecord(data.tokens);
  const accountStatus = text(user, "accountStatus");

  if (
    accountStatus &&
    (LOCKED_ACCOUNT_STATUSES as readonly string[]).includes(accountStatus)
  ) {
    return {
      data: {
        status: "LOCKED",
        message: "계정 상태 확인이 필요합니다.",
        retryAfterSeconds: null,
      },
    };
  }

  if (data.mfaRequired === true) {
    return {
      data: {
        status: "MFA_REQUIRED",
        challengeId:
          text(data, "challengeId") ??
          text(data, "mfaChallengeId") ??
          "server-mfa-required",
        methods: ["TOTP", "RECOVERY_CODE"],
        maskedDestination: text(user, "emailMasked"),
      },
    };
  }

  return {
    data: {
      status: "AUTHENTICATED",
      accessToken: requiredAccessToken(data, tokens),
      refreshToken: text(data, "refreshToken") ?? text(tokens, "refreshToken"),
      expiresAt: tokenExpiresAt(data, tokens, now),
      user: mobileUser(user, data, false),
    },
  };
}

export function normalizeMobileSignupResponse(
  response: Readonly<{ data?: unknown; error?: unknown }>,
  now = new Date(),
): MobileSignupResponse {
  const data = asRecord(response.data);
  if (!data) return { error: response.error };
  if (isLegacySignupPayload(data)) return { data };

  const user = asRecord(data.user);
  const tokens = asRecord(data.tokens);
  const emailVerificationRequired =
    data.emailVerificationRequired === true ||
    text(data, "emailVerificationTokenForDelivery") !== null;
  const onboardingRequired = data.onboardingRequired === true;
  const hasAccessToken =
    text(data, "accessToken") !== null || text(tokens, "accessToken") !== null;

  if (!hasAccessToken && emailVerificationRequired) {
    return {
      data: {
        status: "EMAIL_VERIFICATION_REQUIRED",
        verificationId: text(data, "verificationId") ?? "email-verification",
        maskedEmail: text(user, "emailMasked") ?? "이메일",
      },
    };
  }

  return {
    data: {
      status: hasAccessToken ? "AUTHENTICATED" : "REGISTERED",
      accessToken: hasAccessToken ? optionalAccessToken(data, tokens) : null,
      refreshToken: text(data, "refreshToken") ?? text(tokens, "refreshToken"),
      expiresAt: hasAccessToken ? tokenExpiresAt(data, tokens, now) : null,
      emailVerificationRequired,
      onboardingRequired,
      user: mobileUser(
        user,
        data,
        emailVerificationRequired,
        onboardingRequired,
      ),
    },
  };
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(record: UnknownRecord | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rawText(record: UnknownRecord | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numeric(record: UnknownRecord | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(record: UnknownRecord | null, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function requiredText(
  primary: UnknownRecord,
  fallback: UnknownRecord | null,
  key: string,
): string {
  const value = text(primary, key) ?? text(fallback, key);
  if (!value) throw new Error("인증 응답이 올바르지 않습니다.");
  return value;
}

function optionalAccessToken(
  primary: UnknownRecord,
  fallback: UnknownRecord | null,
): string | null {
  const value =
    rawText(primary, "accessToken") ?? rawText(fallback, "accessToken");
  if (!value) return null;
  return validAccessToken(value);
}

function requiredAccessToken(
  primary: UnknownRecord,
  fallback: UnknownRecord | null,
): string {
  requiredText(primary, fallback, "accessToken");
  const value =
    rawText(primary, "accessToken") ?? rawText(fallback, "accessToken");
  if (!value) throw new Error(INVALID_AUTH_TOKEN_MESSAGE);
  return validAccessToken(value);
}

function validAccessToken(value: string): string {
  if (value.length > 8_192 || /\s/u.test(value)) {
    throw new Error(INVALID_AUTH_TOKEN_MESSAGE);
  }
  return value;
}

function roleFromUser(user: UnknownRecord | null): MobileUserRole {
  const direct = text(user, "role");
  if (direct && (MOBILE_ROLES as readonly string[]).includes(direct))
    return direct as MobileUserRole;

  const roles = user?.roles;
  const first = Array.isArray(roles)
    ? roles.find((role): role is string => typeof role === "string")
    : typeof roles === "string"
      ? roles
          .split(",")
          .map((role) => role.trim())
          .find(Boolean)
      : null;

  return first && (MOBILE_ROLES as readonly string[]).includes(first)
    ? (first as MobileUserRole)
    : "USER";
}

function mobileUser(
  user: UnknownRecord | null,
  data: UnknownRecord,
  emailVerificationRequired: boolean,
  onboardingRequired = false,
): MobileAuthSuccessPayload["user"] {
  const id = text(user, "id") ?? text(user, "userId") ?? text(data, "userId");
  if (!id) throw new Error("인증 사용자 응답이 올바르지 않습니다.");

  return {
    id,
    emailVerified: bool(user, "emailVerified") ?? !emailVerificationRequired,
    onboardingCompleted:
      bool(user, "onboardingCompleted") ?? !onboardingRequired,
    role: roleFromUser(user),
  };
}

function tokenExpiresAt(
  primary: UnknownRecord,
  fallback: UnknownRecord | null,
  now: Date,
): string {
  const explicit = text(primary, "expiresAt") ?? text(fallback, "expiresAt");
  if (explicit) {
    const parsed = new Date(explicit);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }

  const ttlSeconds =
    numeric(primary, "accessTokenExpiresIn") ??
    numeric(fallback, "accessTokenExpiresIn") ??
    numeric(primary, "expiresIn") ??
    numeric(fallback, "expiresIn");
  if (ttlSeconds !== null && Math.trunc(ttlSeconds) < 1) {
    throw new Error(INVALID_AUTH_TOKEN_MESSAGE);
  }
  return new Date(
    now.getTime() +
      (ttlSeconds === null ? 900 : Math.trunc(ttlSeconds)) * 1_000,
  ).toISOString();
}

function isLegacyAuthPayload(data: UnknownRecord): data is MobileAuthPayload {
  return (
    data.status === "AUTHENTICATED" ||
    data.status === "MFA_REQUIRED" ||
    data.status === "LOCKED"
  );
}

function isLegacySignupPayload(
  data: UnknownRecord,
): data is MobileSignupPayload {
  return (
    data.status === "REGISTERED" ||
    data.status === "AUTHENTICATED" ||
    data.status === "EMAIL_VERIFICATION_REQUIRED" ||
    data.status === "LOCKED" ||
    data.status === "REJECTED"
  );
}
