/**
 * packages/security/src/encryption.ts
 * 급여납치 Salary Hijacking Platform · server-authoritative encryption contract.
 *
 * Scope
 * - Edge/server compatible Web Crypto implementation; no Node-only crypto import.
 * - AES-256-GCM authenticated encryption for PII, auth metadata, financial metadata,
 *   notification payload metadata, community moderation metadata and ads/partner metadata.
 * - HMAC-SHA-256 one-way digests for refresh tokens, provider subjects, lookup keys and
 *   webhook/API signatures.
 * - PBKDF2-HMAC-SHA-256 password hashing fallback contract for the portable package layer.
 * - Explicit purpose/AAD binding, key rotation metadata, safe envelope parsing, log-safe
 *   errors and self-completeness checks.
 */

export const SECURITY_ENCRYPTION_CONTRACT_VERSION = "2.0.0" as const;
export const SECURITY_ENCRYPTION_PACKAGE_SCOPE =
  "packages/security/src/encryption.ts" as const;

export type EncryptionAlgorithm = "AES-256-GCM";
export type DigestAlgorithm = "SHA-256" | "HMAC-SHA-256";
export type PasswordHashAlgorithm = "PBKDF2-HMAC-SHA-256";
export type SecurityRuntime = "edge" | "server" | "test";

export type SensitiveDataClass =
  | "auth-token"
  | "auth-identity"
  | "pii"
  | "financial"
  | "payroll"
  | "expense"
  | "saving"
  | "notification"
  | "community"
  | "ads-partner"
  | "admin-audit"
  | "consent"
  | "device";

export type EncryptionPurpose =
  | "auth.session"
  | "auth.refresh-token"
  | "auth.social-provider"
  | "user.email"
  | "user.phone"
  | "user.profile"
  | "payroll.account-metadata"
  | "payroll.income-metadata"
  | "expense.receipt-metadata"
  | "expense.import-metadata"
  | "saving.goal-metadata"
  | "notification.push-token"
  | "notification.payload-metadata"
  | "community.moderation-metadata"
  | "ads.partner-metadata"
  | "admin.audit-metadata"
  | "webhook.signature"
  | "idempotency.key";

export type SecurityKeyStatus = "active" | "decrypt-only" | "retired";

export interface SecurityKeySpec {
  readonly kid: string;
  readonly material: string | Uint8Array | ArrayBuffer;
  readonly status: SecurityKeyStatus;
  readonly createdAtIso?: string;
  readonly expiresAtIso?: string;
}

export interface SecurityKeyMaterial {
  readonly kid: string;
  readonly bytes: Uint8Array;
  readonly status: SecurityKeyStatus;
  readonly createdAtIso?: string;
  readonly expiresAtIso?: string;
}

export interface SecurityKeyRing {
  readonly primaryKid: string;
  readonly keys: readonly SecurityKeyMaterial[];
}

export interface EncryptionContext {
  readonly purpose: EncryptionPurpose;
  readonly dataClass: SensitiveDataClass;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly subjectId?: string;
  readonly recordId?: string;
  readonly fieldName?: string;
  readonly requestId?: string;
  readonly runtime?: SecurityRuntime;
}

export interface EncryptOptions {
  readonly context: EncryptionContext;
  readonly keyRing: SecurityKeyRing;
  readonly nowIso?: string;
  readonly maxPlaintextBytes?: number;
  readonly allowBrowserRuntime?: boolean;
}

export interface DecryptOptions {
  readonly context: EncryptionContext;
  readonly keyRing: SecurityKeyRing;
  readonly maxCiphertextBytes?: number;
  readonly allowBrowserRuntime?: boolean;
}

export interface HashOptions {
  readonly purpose: EncryptionPurpose;
  readonly keyRing: SecurityKeyRing;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly fieldName?: string;
  readonly allowBrowserRuntime?: boolean;
}

export interface PasswordHashOptions {
  readonly iterations?: number;
  readonly saltBytes?: number;
  readonly hashBytes?: number;
  readonly pepperKeyRing?: SecurityKeyRing;
  readonly allowBrowserRuntime?: boolean;
}

export interface ParsedPasswordHash {
  readonly version: "shjpwd1";
  readonly algorithm: PasswordHashAlgorithm;
  readonly iterations: number;
  readonly salt: Uint8Array;
  readonly hash: Uint8Array;
}

export interface EncryptionEnvelopeV2 {
  readonly v: 2;
  readonly alg: EncryptionAlgorithm;
  readonly kid: string;
  readonly purpose: EncryptionPurpose;
  readonly dataClass: SensitiveDataClass;
  readonly iv: string;
  readonly ciphertext: string;
  readonly aadHash: string;
  readonly createdAt: string;
}

export interface EncryptionCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof SECURITY_ENCRYPTION_CONTRACT_VERSION;
  readonly packageScope: typeof SECURITY_ENCRYPTION_PACKAGE_SCOPE;
  readonly encryptionAlgorithm: EncryptionAlgorithm;
  readonly digestAlgorithms: readonly DigestAlgorithm[];
  readonly passwordHashAlgorithm: PasswordHashAlgorithm;
  readonly purposeCount: number;
  readonly dataClassCount: number;
  readonly invariantCount: number;
  readonly missing: readonly string[];
}

export class SecurityEncryptionError extends Error {
  public readonly code: string;
  public readonly safeMessage: string;

  public constructor(code: string, safeMessage: string) {
    super(safeMessage);
    this.name = "SecurityEncryptionError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

const ENVELOPE_PREFIX = "shjenc:v2:";
const PASSWORD_PREFIX = "shjpwd:v1:pbkdf2-sha256:";
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BITS = 128;
const AES_256_KEY_BYTES = 32;
const DEFAULT_MAX_PLAINTEXT_BYTES = 1024 * 1024;
const DEFAULT_MAX_CIPHERTEXT_BYTES = 2 * 1024 * 1024;
const DEFAULT_PASSWORD_ITERATIONS = 210_000;
const DEFAULT_PASSWORD_SALT_BYTES = 16;
const DEFAULT_PASSWORD_HASH_BYTES = 32;
const MAX_CONTEXT_VALUE_LENGTH = 256;
const HEX_PATTERN = /^[0-9a-f]+$/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const SUPPORTED_DATA_CLASSES: readonly SensitiveDataClass[] = [
  "auth-token",
  "auth-identity",
  "pii",
  "financial",
  "payroll",
  "expense",
  "saving",
  "notification",
  "community",
  "ads-partner",
  "admin-audit",
  "consent",
  "device",
] as const;

const SUPPORTED_PURPOSES: readonly EncryptionPurpose[] = [
  "auth.session",
  "auth.refresh-token",
  "auth.social-provider",
  "user.email",
  "user.phone",
  "user.profile",
  "payroll.account-metadata",
  "payroll.income-metadata",
  "expense.receipt-metadata",
  "expense.import-metadata",
  "saving.goal-metadata",
  "notification.push-token",
  "notification.payload-metadata",
  "community.moderation-metadata",
  "ads.partner-metadata",
  "admin.audit-metadata",
  "webhook.signature",
  "idempotency.key",
] as const;

const PURPOSE_DATA_CLASS_POLICY: Readonly<
  Record<EncryptionPurpose, readonly SensitiveDataClass[]>
> = Object.freeze({
  "auth.session": ["auth-token", "device"],
  "auth.refresh-token": ["auth-token"],
  "auth.social-provider": ["auth-identity"],
  "user.email": ["pii"],
  "user.phone": ["pii"],
  "user.profile": ["pii", "consent"],
  "payroll.account-metadata": ["financial", "payroll"],
  "payroll.income-metadata": ["financial", "payroll"],
  "expense.receipt-metadata": ["financial", "expense"],
  "expense.import-metadata": ["financial", "expense"],
  "saving.goal-metadata": ["financial", "saving"],
  "notification.push-token": ["notification", "device"],
  "notification.payload-metadata": ["notification"],
  "community.moderation-metadata": ["community", "admin-audit"],
  "ads.partner-metadata": ["ads-partner"],
  "admin.audit-metadata": ["admin-audit"],
  "webhook.signature": ["admin-audit"],
  "idempotency.key": ["admin-audit", "auth-token"],
});

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

const fail = (code: string, safeMessage: string): never => {
  throw new SecurityEncryptionError(code, safeMessage);
};

const ensureSecureRuntime = (allowBrowserRuntime = false): Crypto => {
  const isBrowserDocumentRuntime =
    typeof window !== "undefined" && typeof document !== "undefined";
  if (isBrowserDocumentRuntime && !allowBrowserRuntime) {
    fail(
      "BROWSER_RUNTIME_BLOCKED",
      "Encryption helpers are server/edge-only by default.",
    );
  }

  const cryptoProvider = globalThis.crypto;
  if (
    !cryptoProvider?.subtle ||
    typeof cryptoProvider.getRandomValues !== "function"
  ) {
    fail(
      "WEB_CRYPTO_UNAVAILABLE",
      "Web Crypto API is required for encryption.",
    );
  }

  return cryptoProvider;
};

const utf8 = (value: string): Uint8Array => textEncoder.encode(value);

const fromUtf8 = (value: Uint8Array): string => {
  try {
    return textDecoder.decode(value);
  } catch {
    return fail("UTF8_DECODE_FAILED", "Unable to decode encrypted payload.");
  }
};

const concatBytes = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const normalizeBase64 = (value: string): string =>
  value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

export const toBase64Url = (input: Uint8Array): string => {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const fromBase64Url = (value: string): Uint8Array => {
  if (!value || !BASE64URL_PATTERN.test(value))
    fail("INVALID_BASE64URL", "Invalid base64url value.");
  const binary = atob(normalizeBase64(value));
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    output[index] = binary.charCodeAt(index);
  return output;
};

export const toHex = (input: Uint8Array): string =>
  [...input].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export const fromHex = (value: string): Uint8Array => {
  if (value.length % 2 !== 0 || !HEX_PATTERN.test(value))
    fail("INVALID_HEX", "Invalid hexadecimal value.");
  const output = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2)
    output[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  return output;
};

const decodeKeyMaterial = (
  material: string | Uint8Array | ArrayBuffer,
): Uint8Array => {
  if (material instanceof Uint8Array) return new Uint8Array(material);
  if (material instanceof ArrayBuffer) return new Uint8Array(material);

  const trimmed = material.trim();
  if (!trimmed)
    fail("EMPTY_KEY_MATERIAL", "Security key material must not be empty.");

  if (trimmed.startsWith("base64url:"))
    return fromBase64Url(trimmed.slice("base64url:".length));
  if (trimmed.startsWith("base64:")) {
    const binary = atob(trimmed.slice("base64:".length));
    const output = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
      output[index] = binary.charCodeAt(index);
    return output;
  }
  if (trimmed.startsWith("hex:")) return fromHex(trimmed.slice("hex:".length));
  if (HEX_PATTERN.test(trimmed) && trimmed.length >= AES_256_KEY_BYTES * 2)
    return fromHex(trimmed);
  if (BASE64URL_PATTERN.test(trimmed) && trimmed.length >= 43)
    return fromBase64Url(trimmed);

  return utf8(trimmed);
};

const assertKid = (kid: string): void => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,80}$/.test(kid))
    fail("INVALID_KID", "Invalid key id.");
};

export const createSecurityKeyRing = (
  primaryKid: string,
  specs: readonly SecurityKeySpec[],
): SecurityKeyRing => {
  assertKid(primaryKid);
  if (specs.length <= 0)
    fail("EMPTY_KEY_RING", "At least one security key is required.");

  const seen = new Set<string>();
  const keys = specs.map((spec): SecurityKeyMaterial => {
    assertKid(spec.kid);
    if (seen.has(spec.kid)) fail("DUPLICATE_KID", "Duplicate security key id.");
    seen.add(spec.kid);

    const bytes = decodeKeyMaterial(spec.material);
    if (bytes.length < AES_256_KEY_BYTES)
      fail(
        "WEAK_KEY_MATERIAL",
        "Security key material must be at least 32 bytes.",
      );
    if (spec.status === "retired" && spec.kid === primaryKid)
      fail("RETIRED_PRIMARY_KEY", "Primary key cannot be retired.");

    const key: SecurityKeyMaterial = {
      kid: spec.kid,
      bytes,
      status: spec.status,
      ...(spec.createdAtIso ? { createdAtIso: spec.createdAtIso } : {}),
      ...(spec.expiresAtIso ? { expiresAtIso: spec.expiresAtIso } : {}),
    };
    return Object.freeze(key);
  });

  const primary = keys.find((key) => key.kid === primaryKid);
  if (primary === undefined)
    return fail("PRIMARY_KEY_NOT_FOUND", "Primary security key is missing.");
  if (primary.status !== "active")
    return fail(
      "PRIMARY_KEY_NOT_ACTIVE",
      "Primary security key must be active.",
    );

  return Object.freeze({ primaryKid, keys: Object.freeze(keys) });
};

export const createSecurityKeyRingFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
): SecurityKeyRing => {
  const primaryKid =
    env["SALARY_HIJACKING_SECURITY_PRIMARY_KID"] ?? env["SECURITY_PRIMARY_KID"];
  const encodedKeys =
    env["SALARY_HIJACKING_SECURITY_KEYS"] ?? env["SECURITY_KEYS"];
  if (!primaryKid || !encodedKeys)
    return fail(
      "MISSING_SECURITY_ENV",
      "Security key environment variables are missing.",
    );

  const specs = encodedKeys.split(",").map((entry): SecurityKeySpec => {
    const parts = entry.split(":");
    const kid = parts[0];
    const material = parts[1];
    const statusRaw = parts[2] ?? "active";
    if (!kid || !material)
      return fail(
        "INVALID_SECURITY_ENV",
        "Invalid security key environment format.",
      );
    if (
      statusRaw !== "active" &&
      statusRaw !== "decrypt-only" &&
      statusRaw !== "retired"
    )
      return fail("INVALID_KEY_STATUS", "Invalid security key status.");
    const status: SecurityKeyStatus = statusRaw;
    return { kid, material: `base64url:${material}`, status };
  });

  return createSecurityKeyRing(primaryKid, specs);
};

const findKey = (
  keyRing: SecurityKeyRing,
  kid: string,
): SecurityKeyMaterial => {
  const key = keyRing.keys.find((candidate) => candidate.kid === kid);
  if (key === undefined)
    return fail("KEY_NOT_FOUND", "Security key not found.");
  if (key.status === "retired")
    return fail("KEY_RETIRED", "Security key is retired.");
  return key;
};

const findPrimaryKey = (keyRing: SecurityKeyRing): SecurityKeyMaterial => {
  const key = findKey(keyRing, keyRing.primaryKid);
  if (key.status !== "active")
    fail("PRIMARY_KEY_NOT_ACTIVE", "Primary security key must be active.");
  return key;
};

const assertPurposePolicy = (context: EncryptionContext): void => {
  if (!SUPPORTED_PURPOSES.includes(context.purpose))
    fail("UNSUPPORTED_PURPOSE", "Unsupported encryption purpose.");
  if (!SUPPORTED_DATA_CLASSES.includes(context.dataClass))
    fail("UNSUPPORTED_DATA_CLASS", "Unsupported sensitive data class.");

  const allowedClasses = PURPOSE_DATA_CLASS_POLICY[context.purpose];
  if (!allowedClasses.includes(context.dataClass))
    fail(
      "PURPOSE_DATA_CLASS_MISMATCH",
      "Purpose and data class are not compatible.",
    );
};

const sanitizeContextValue = (
  value: string | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_CONTEXT_VALUE_LENGTH)
    fail("CONTEXT_TOO_LONG", "Encryption context value is too long.");
  return trimmed;
};

const stableJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
};

const createAadObject = (
  context: EncryptionContext,
): Readonly<Record<string, string>> => {
  assertPurposePolicy(context);
  return Object.freeze({
    app: "salary-hijacking",
    contractVersion: SECURITY_ENCRYPTION_CONTRACT_VERSION,
    purpose: context.purpose,
    dataClass: context.dataClass,
    ...(sanitizeContextValue(context.tenantId)
      ? { tenantId: sanitizeContextValue(context.tenantId) as string }
      : {}),
    ...(sanitizeContextValue(context.userId)
      ? { userId: sanitizeContextValue(context.userId) as string }
      : {}),
    ...(sanitizeContextValue(context.subjectId)
      ? { subjectId: sanitizeContextValue(context.subjectId) as string }
      : {}),
    ...(sanitizeContextValue(context.recordId)
      ? { recordId: sanitizeContextValue(context.recordId) as string }
      : {}),
    ...(sanitizeContextValue(context.fieldName)
      ? { fieldName: sanitizeContextValue(context.fieldName) as string }
      : {}),
    ...(sanitizeContextValue(context.requestId)
      ? { requestId: sanitizeContextValue(context.requestId) as string }
      : {}),
    ...(context.runtime ? { runtime: context.runtime } : {}),
  });
};

const aadBytes = (context: EncryptionContext): Uint8Array =>
  utf8(stableJson(createAadObject(context)));

const importAesKey = async (
  cryptoProvider: Crypto,
  key: SecurityKeyMaterial,
): Promise<CryptoKey> =>
  cryptoProvider.subtle.importKey(
    "raw",
    toArrayBuffer(key.bytes),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

const importHmacKey = async (
  cryptoProvider: Crypto,
  key: SecurityKeyMaterial,
): Promise<CryptoKey> =>
  cryptoProvider.subtle.importKey(
    "raw",
    toArrayBuffer(key.bytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

export const randomBytes = (
  length: number,
  allowBrowserRuntime = false,
): Uint8Array => {
  if (!Number.isSafeInteger(length) || length <= 0 || length > 65_536)
    fail("INVALID_RANDOM_LENGTH", "Invalid random byte length.");
  const cryptoProvider = ensureSecureRuntime(allowBrowserRuntime);
  const output = new Uint8Array(length);
  cryptoProvider.getRandomValues(output);
  return output;
};

export const sha256 = async (
  value: string | Uint8Array,
  allowBrowserRuntime = false,
): Promise<Uint8Array> => {
  const cryptoProvider = ensureSecureRuntime(allowBrowserRuntime);
  const input = typeof value === "string" ? utf8(value) : value;
  return new Uint8Array(
    await cryptoProvider.subtle.digest("SHA-256", toArrayBuffer(input)),
  );
};

export const sha256Hex = async (
  value: string | Uint8Array,
  allowBrowserRuntime = false,
): Promise<string> => toHex(await sha256(value, allowBrowserRuntime));

const assertHashPurpose = (purpose: EncryptionPurpose): void => {
  if (!SUPPORTED_PURPOSES.includes(purpose))
    fail("UNSUPPORTED_HASH_PURPOSE", "Unsupported hash purpose.");
};

export const hmacSha256 = async (
  value: string | Uint8Array,
  options: HashOptions,
): Promise<Uint8Array> => {
  assertHashPurpose(options.purpose);
  const cryptoProvider = ensureSecureRuntime(
    options.allowBrowserRuntime === true,
  );
  const key = findPrimaryKey(options.keyRing);
  const cryptoKey = await importHmacKey(cryptoProvider, key);
  const input = typeof value === "string" ? utf8(value) : value;
  const scopedPrefix = utf8(
    stableJson({
      app: "salary-hijacking",
      purpose: options.purpose,
      tenantId: options.tenantId ?? "",
      userId: options.userId ?? "",
      fieldName: options.fieldName ?? "",
    }),
  );
  return new Uint8Array(
    await cryptoProvider.subtle.sign(
      "HMAC",
      cryptoKey,
      toArrayBuffer(concatBytes(scopedPrefix, input)),
    ),
  );
};

export const hmacSha256Hex = async (
  value: string | Uint8Array,
  options: HashOptions,
): Promise<string> => toHex(await hmacSha256(value, options));

export const constantTimeEqual = (
  left: string | Uint8Array,
  right: string | Uint8Array,
): boolean => {
  const leftBytes = typeof left === "string" ? utf8(left) : left;
  const rightBytes = typeof right === "string" ? utf8(right) : right;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
};

export const encryptBytes = async (
  plaintext: Uint8Array,
  options: EncryptOptions,
): Promise<string> => {
  const maxPlaintextBytes =
    options.maxPlaintextBytes ?? DEFAULT_MAX_PLAINTEXT_BYTES;
  if (plaintext.length > maxPlaintextBytes)
    fail("PLAINTEXT_TOO_LARGE", "Plaintext is too large.");

  const cryptoProvider = ensureSecureRuntime(
    options.allowBrowserRuntime === true,
  );
  const key = findPrimaryKey(options.keyRing);
  const cryptoKey = await importAesKey(cryptoProvider, key);
  const iv = randomBytes(
    AES_GCM_IV_BYTES,
    options.allowBrowserRuntime === true,
  );
  const additionalData = aadBytes(options.context);
  const ciphertext = new Uint8Array(
    await cryptoProvider.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: toArrayBuffer(additionalData),
        tagLength: AES_GCM_TAG_BITS,
      },
      cryptoKey,
      toArrayBuffer(plaintext),
    ),
  );

  const envelope: EncryptionEnvelopeV2 = Object.freeze({
    v: 2,
    alg: "AES-256-GCM",
    kid: key.kid,
    purpose: options.context.purpose,
    dataClass: options.context.dataClass,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext),
    aadHash: await sha256Hex(
      additionalData,
      options.allowBrowserRuntime === true,
    ),
    createdAt: options.nowIso ?? new Date().toISOString(),
  });

  return `${ENVELOPE_PREFIX}${toBase64Url(utf8(stableJson(envelope)))}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseEnvelope = (
  sealed: string,
  maxCiphertextBytes: number,
): EncryptionEnvelopeV2 => {
  if (!sealed.startsWith(ENVELOPE_PREFIX))
    fail("INVALID_ENVELOPE_PREFIX", "Invalid encrypted payload.");
  const encoded = sealed.slice(ENVELOPE_PREFIX.length);
  const decoded = fromUtf8(fromBase64Url(encoded));
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded) as unknown;
  } catch {
    fail("INVALID_ENVELOPE_JSON", "Invalid encrypted payload.");
  }

  const envelopeRecord = isRecord(parsed)
    ? parsed
    : fail("INVALID_ENVELOPE", "Invalid encrypted payload.");
  if (envelopeRecord["v"] !== 2 || envelopeRecord["alg"] !== "AES-256-GCM")
    fail("UNSUPPORTED_ENVELOPE", "Unsupported encrypted payload version.");

  const kid =
    typeof envelopeRecord["kid"] === "string"
      ? envelopeRecord["kid"]
      : fail("INVALID_ENVELOPE_KID", "Invalid encrypted payload.");
  const purposeValue = envelopeRecord["purpose"];
  const purpose =
    typeof purposeValue === "string" &&
    SUPPORTED_PURPOSES.includes(purposeValue as EncryptionPurpose)
      ? (purposeValue as EncryptionPurpose)
      : fail("INVALID_ENVELOPE_PURPOSE", "Invalid encrypted payload.");
  const dataClassValue = envelopeRecord["dataClass"];
  const dataClass =
    typeof dataClassValue === "string" &&
    SUPPORTED_DATA_CLASSES.includes(dataClassValue as SensitiveDataClass)
      ? (dataClassValue as SensitiveDataClass)
      : fail("INVALID_ENVELOPE_DATA_CLASS", "Invalid encrypted payload.");
  const iv =
    typeof envelopeRecord["iv"] === "string"
      ? envelopeRecord["iv"]
      : fail("INVALID_ENVELOPE_IV", "Invalid encrypted payload.");
  const ciphertext =
    typeof envelopeRecord["ciphertext"] === "string"
      ? envelopeRecord["ciphertext"]
      : fail("INVALID_ENVELOPE_CIPHERTEXT", "Invalid encrypted payload.");
  const aadHash =
    typeof envelopeRecord["aadHash"] === "string"
      ? envelopeRecord["aadHash"]
      : fail("INVALID_ENVELOPE_AAD", "Invalid encrypted payload.");
  const createdAt =
    typeof envelopeRecord["createdAt"] === "string"
      ? envelopeRecord["createdAt"]
      : fail("INVALID_ENVELOPE_CREATED_AT", "Invalid encrypted payload.");

  if (fromBase64Url(ciphertext).length > maxCiphertextBytes)
    fail("CIPHERTEXT_TOO_LARGE", "Encrypted payload is too large.");

  return Object.freeze({
    v: 2,
    alg: "AES-256-GCM",
    kid,
    purpose,
    dataClass,
    iv,
    ciphertext,
    aadHash,
    createdAt,
  });
};

export const decryptBytes = async (
  sealed: string,
  options: DecryptOptions,
): Promise<Uint8Array> => {
  const envelope = parseEnvelope(
    sealed,
    options.maxCiphertextBytes ?? DEFAULT_MAX_CIPHERTEXT_BYTES,
  );
  if (
    envelope.purpose !== options.context.purpose ||
    envelope.dataClass !== options.context.dataClass
  ) {
    fail(
      "ENVELOPE_CONTEXT_MISMATCH",
      "Encrypted payload context does not match.",
    );
  }

  const cryptoProvider = ensureSecureRuntime(
    options.allowBrowserRuntime === true,
  );
  const key = findKey(options.keyRing, envelope.kid);
  const cryptoKey = await importAesKey(cryptoProvider, key);
  const additionalData = aadBytes(options.context);
  const aadHash = await sha256Hex(
    additionalData,
    options.allowBrowserRuntime === true,
  );
  if (!constantTimeEqual(aadHash, envelope.aadHash))
    fail("AAD_HASH_MISMATCH", "Encrypted payload context does not match.");

  try {
    return new Uint8Array(
      await cryptoProvider.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toArrayBuffer(fromBase64Url(envelope.iv)),
          additionalData: toArrayBuffer(additionalData),
          tagLength: AES_GCM_TAG_BITS,
        },
        cryptoKey,
        toArrayBuffer(fromBase64Url(envelope.ciphertext)),
      ),
    );
  } catch {
    return fail("DECRYPT_FAILED", "Encrypted payload cannot be decrypted.");
  }
};

export const encryptString = async (
  plaintext: string,
  options: EncryptOptions,
): Promise<string> => encryptBytes(utf8(plaintext), options);

export const decryptString = async (
  sealed: string,
  options: DecryptOptions,
): Promise<string> => fromUtf8(await decryptBytes(sealed, options));

export const encryptJson = async (
  value: unknown,
  options: EncryptOptions,
): Promise<string> => encryptString(stableJson(value), options);

export const decryptJson = async <T = unknown>(
  sealed: string,
  options: DecryptOptions,
): Promise<T> => {
  const plaintext = await decryptString(sealed, options);
  try {
    return JSON.parse(plaintext) as T;
  } catch {
    return fail(
      "JSON_DECRYPT_PARSE_FAILED",
      "Decrypted JSON payload is invalid.",
    );
  }
};

export const encryptPiiField = async (
  plaintext: string,
  options: Omit<EncryptOptions, "context"> & {
    readonly context: Omit<EncryptionContext, "dataClass">;
  },
): Promise<string> =>
  encryptString(plaintext, {
    ...options,
    context: { ...options.context, dataClass: "pii" },
  });

export const decryptPiiField = async (
  sealed: string,
  options: Omit<DecryptOptions, "context"> & {
    readonly context: Omit<EncryptionContext, "dataClass">;
  },
): Promise<string> =>
  decryptString(sealed, {
    ...options,
    context: { ...options.context, dataClass: "pii" },
  });

export const encryptFinancialField = async (
  plaintext: string,
  options: Omit<EncryptOptions, "context"> & {
    readonly context: Omit<EncryptionContext, "dataClass">;
  },
): Promise<string> =>
  encryptString(plaintext, {
    ...options,
    context: { ...options.context, dataClass: "financial" },
  });

export const decryptFinancialField = async (
  sealed: string,
  options: Omit<DecryptOptions, "context"> & {
    readonly context: Omit<EncryptionContext, "dataClass">;
  },
): Promise<string> =>
  decryptString(sealed, {
    ...options,
    context: { ...options.context, dataClass: "financial" },
  });

export const hashRefreshToken = async (
  token: string,
  options: Omit<HashOptions, "purpose">,
): Promise<string> =>
  hmacSha256Hex(token, { ...options, purpose: "auth.refresh-token" });

export const hashIdempotencyKey = async (
  idempotencyKey: string,
  options: Omit<HashOptions, "purpose">,
): Promise<string> =>
  hmacSha256Hex(idempotencyKey, { ...options, purpose: "idempotency.key" });

export const hashLookupValue = async (
  value: string,
  options: Omit<HashOptions, "purpose"> & {
    readonly purpose?: EncryptionPurpose;
  },
): Promise<string> =>
  hmacSha256Hex(value.trim().toLowerCase(), {
    ...options,
    purpose: options.purpose ?? "user.email",
  });

export const signPayload = async (
  payload: string | Uint8Array,
  options: Omit<HashOptions, "purpose">,
): Promise<string> =>
  toBase64Url(
    await hmacSha256(payload, { ...options, purpose: "webhook.signature" }),
  );

export const verifyPayloadSignature = async (
  payload: string | Uint8Array,
  signature: string,
  options: Omit<HashOptions, "purpose">,
): Promise<boolean> => {
  const expected = await signPayload(payload, options);
  return constantTimeEqual(expected, signature);
};

export const hashPassword = async (
  password: string,
  options: PasswordHashOptions = {},
): Promise<string> => {
  if (password.length < 8 || password.length > 4096)
    fail("INVALID_PASSWORD_LENGTH", "Password length is invalid.");
  const cryptoProvider = ensureSecureRuntime(
    options.allowBrowserRuntime === true,
  );
  const iterations = options.iterations ?? DEFAULT_PASSWORD_ITERATIONS;
  const saltBytes = options.saltBytes ?? DEFAULT_PASSWORD_SALT_BYTES;
  const hashBytes = options.hashBytes ?? DEFAULT_PASSWORD_HASH_BYTES;

  if (!Number.isSafeInteger(iterations) || iterations < 100_000)
    fail("WEAK_PASSWORD_ITERATIONS", "Password hash iterations are too low.");
  if (!Number.isSafeInteger(saltBytes) || saltBytes < 16)
    fail("WEAK_PASSWORD_SALT", "Password hash salt is too short.");
  if (!Number.isSafeInteger(hashBytes) || hashBytes < 32)
    fail("WEAK_PASSWORD_HASH", "Password hash output is too short.");

  const salt = randomBytes(saltBytes, options.allowBrowserRuntime === true);
  const passwordBytes = options.pepperKeyRing
    ? await hmacSha256(password, {
        keyRing: options.pepperKeyRing,
        purpose: "auth.session",
        ...(options.allowBrowserRuntime === undefined
          ? {}
          : { allowBrowserRuntime: options.allowBrowserRuntime }),
      })
    : utf8(password);
  const key = await cryptoProvider.subtle.importKey(
    "raw",
    toArrayBuffer(passwordBytes),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await cryptoProvider.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations },
    key,
    hashBytes * 8,
  );
  return `${PASSWORD_PREFIX}${iterations}:${toBase64Url(salt)}:${toBase64Url(new Uint8Array(bits))}`;
};

export const parsePasswordHash = (encoded: string): ParsedPasswordHash => {
  if (!encoded.startsWith(PASSWORD_PREFIX))
    fail("INVALID_PASSWORD_HASH_PREFIX", "Password hash format is invalid.");
  const parts = encoded.slice(PASSWORD_PREFIX.length).split(":");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2])
    fail("INVALID_PASSWORD_HASH", "Password hash format is invalid.");
  const iterationsRaw = parts[0]!;
  const saltRaw = parts[1]!;
  const hashRaw = parts[2]!;

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000)
    fail(
      "INVALID_PASSWORD_HASH_ITERATIONS",
      "Password hash format is invalid.",
    );

  return Object.freeze({
    version: "shjpwd1",
    algorithm: "PBKDF2-HMAC-SHA-256",
    iterations,
    salt: fromBase64Url(saltRaw),
    hash: fromBase64Url(hashRaw),
  });
};

export const verifyPassword = async (
  password: string,
  encodedHash: string,
  options: Pick<
    PasswordHashOptions,
    "pepperKeyRing" | "allowBrowserRuntime"
  > = {},
): Promise<boolean> => {
  const parsed = parsePasswordHash(encodedHash);
  const cryptoProvider = ensureSecureRuntime(
    options.allowBrowserRuntime === true,
  );
  const passwordBytes = options.pepperKeyRing
    ? await hmacSha256(password, {
        keyRing: options.pepperKeyRing,
        purpose: "auth.session",
        ...(options.allowBrowserRuntime === undefined
          ? {}
          : { allowBrowserRuntime: options.allowBrowserRuntime }),
      })
    : utf8(password);
  const key = await cryptoProvider.subtle.importKey(
    "raw",
    toArrayBuffer(passwordBytes),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await cryptoProvider.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(parsed.salt),
      iterations: parsed.iterations,
    },
    key,
    parsed.hash.length * 8,
  );
  return constantTimeEqual(new Uint8Array(bits), parsed.hash);
};

export const createRedactedSecretFingerprint = async (
  value: string,
  options: HashOptions,
): Promise<string> => {
  const digest = await hmacSha256Hex(value, options);
  return `sha256:${digest.slice(0, 12)}…${digest.slice(-8)}`;
};

export const isEncryptedEnvelope = (value: string): boolean =>
  value.startsWith(ENVELOPE_PREFIX);

export const assertNoRawSecretLeak = (value: string, label = "value"): void => {
  const suspiciousPatterns: readonly RegExp[] = [
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /postgres(?:ql)?:\/\//i,
    /sk_live_[a-z0-9]/i,
    /xox[baprs]-[a-z0-9-]+/i,
    /AKIA[0-9A-Z]{16}/,
    /refresh[_-]?token/i,
  ];
  if (suspiciousPatterns.some((pattern) => pattern.test(value)))
    fail(
      "RAW_SECRET_LEAK",
      `Raw secret-like content is not allowed in ${label}.`,
    );
};

export const getEncryptionCompletenessReport =
  (): EncryptionCompletenessReport => {
    const missing: string[] = [];
    const invariants: readonly [string, boolean][] = [
      ["AES-256-GCM algorithm", true],
      ["12-byte IV", AES_GCM_IV_BYTES === 12],
      ["128-bit auth tag", AES_GCM_TAG_BITS === 128],
      ["32-byte minimum key", AES_256_KEY_BYTES === 32],
      ["server edge runtime guard", typeof ensureSecureRuntime === "function"],
      [
        "purpose AAD policy",
        Object.keys(PURPOSE_DATA_CLASS_POLICY).length ===
          SUPPORTED_PURPOSES.length,
      ],
      ["base64url envelope", ENVELOPE_PREFIX === "shjenc:v2:"],
      ["password hash prefix", PASSWORD_PREFIX.startsWith("shjpwd:v1")],
      ["default password iterations", DEFAULT_PASSWORD_ITERATIONS >= 100_000],
      ["PII helper", typeof encryptPiiField === "function"],
      ["financial helper", typeof encryptFinancialField === "function"],
      ["token hash helper", typeof hashRefreshToken === "function"],
      ["signature helper", typeof signPayload === "function"],
      ["secret leak guard", typeof assertNoRawSecretLeak === "function"],
    ];

    for (const [name, ok] of invariants) if (!ok) missing.push(name);
    for (const purpose of SUPPORTED_PURPOSES)
      if (!PURPOSE_DATA_CLASS_POLICY[purpose]?.length)
        missing.push(`missing purpose policy: ${purpose}`);

    return Object.freeze({
      ok: missing.length === 0,
      contractVersion: SECURITY_ENCRYPTION_CONTRACT_VERSION,
      packageScope: SECURITY_ENCRYPTION_PACKAGE_SCOPE,
      encryptionAlgorithm: "AES-256-GCM",
      digestAlgorithms: [
        "SHA-256",
        "HMAC-SHA-256",
      ] as readonly DigestAlgorithm[],
      passwordHashAlgorithm: "PBKDF2-HMAC-SHA-256",
      purposeCount: SUPPORTED_PURPOSES.length,
      dataClassCount: SUPPORTED_DATA_CLASSES.length,
      invariantCount: invariants.length,
      missing,
    });
  };

export const assertEncryptionModuleCompleteness = (): void => {
  const report = getEncryptionCompletenessReport();
  if (!report.ok)
    fail(
      "ENCRYPTION_MODULE_INCOMPLETE",
      `Encryption module is incomplete: ${report.missing.join(", ")}`,
    );
};

export const runEncryptionSelfTest = async (
  allowBrowserRuntime = false,
): Promise<EncryptionCompletenessReport> => {
  const keyRing = createSecurityKeyRing("test-primary", [
    {
      kid: "test-primary",
      material: randomBytes(32, allowBrowserRuntime),
      status: "active",
    },
    {
      kid: "test-old",
      material: randomBytes(32, allowBrowserRuntime),
      status: "decrypt-only",
    },
  ]);
  const context: EncryptionContext = {
    purpose: "user.email",
    dataClass: "pii",
    tenantId: "test",
    userId: "user_1",
    fieldName: "email",
    runtime: "test",
  };
  const sealed = await encryptString("user@example.com", {
    keyRing,
    context,
    allowBrowserRuntime,
  });
  const opened = await decryptString(sealed, {
    keyRing,
    context,
    allowBrowserRuntime,
  });
  if (opened !== "user@example.com")
    fail("SELF_TEST_ENCRYPTION_FAILED", "Encryption self-test failed.");

  const digest = await hashRefreshToken("refresh-token", {
    keyRing,
    tenantId: "test",
    userId: "user_1",
    allowBrowserRuntime,
  });
  if (!/^[0-9a-f]{64}$/.test(digest))
    fail("SELF_TEST_HMAC_FAILED", "HMAC self-test failed.");

  const passwordHash = await hashPassword("correct horse battery staple", {
    pepperKeyRing: keyRing,
    allowBrowserRuntime,
  });
  if (
    !(await verifyPassword("correct horse battery staple", passwordHash, {
      pepperKeyRing: keyRing,
      allowBrowserRuntime,
    }))
  ) {
    fail("SELF_TEST_PASSWORD_FAILED", "Password self-test failed.");
  }

  const report = getEncryptionCompletenessReport();
  if (!report.ok)
    fail(
      "SELF_TEST_COMPLETENESS_FAILED",
      "Encryption completeness self-test failed.",
    );
  return report;
};

assertEncryptionModuleCompleteness();

export const encryptionSecurityContract = Object.freeze({
  contractVersion: SECURITY_ENCRYPTION_CONTRACT_VERSION,
  packageScope: SECURITY_ENCRYPTION_PACKAGE_SCOPE,
  envelopePrefix: ENVELOPE_PREFIX,
  algorithms: Object.freeze({
    encryption: "AES-256-GCM" as const,
    digest: ["SHA-256", "HMAC-SHA-256"] as const,
    passwordHash: "PBKDF2-HMAC-SHA-256" as const,
  }),
  supportedPurposes: SUPPORTED_PURPOSES,
  supportedDataClasses: SUPPORTED_DATA_CLASSES,
  purposeDataClassPolicy: PURPOSE_DATA_CLASS_POLICY,
  maxPlaintextBytes: DEFAULT_MAX_PLAINTEXT_BYTES,
  serverAuthorityRequired: true,
  rawSecretLoggingAllowed: false,
  rawFinancialDataInAdsOrCommunityAllowed: false,
  clientFinalCalculationAllowed: false,
  keyRotationRequired: true,
  aadBindingRequired: true,
});

export default encryptionSecurityContract;
