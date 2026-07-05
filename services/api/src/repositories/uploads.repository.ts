import {
  UPLOADS_API_PREFIX,
  type JsonRecord,
  type PaginationInput,
  type UploadFinalizeInput,
  type UploadListResult,
  type UploadPrepareInput,
  type UploadScanInput,
  type UploadUpdateInput,
  type UploadsRepository,
  type UploadsRouteRuntime,
} from "../routes/uploads.routes";

type DbScalar = string | number | boolean | null;
type DbValue = DbScalar | readonly DbScalar[];
type DbRow = Record<string, unknown>;

export interface UploadsDbQueryOptions<TEnv = unknown> {
  readonly operationName: string;
  readonly env: TEnv;
}

export interface UploadsDbQueryResult<TRow extends DbRow = DbRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number | null;
}

export type UploadsDbQuery<TEnv = unknown> = (
  sqlText: string,
  params: readonly DbValue[],
  options: UploadsDbQueryOptions<TEnv>,
) => Promise<UploadsDbQueryResult>;

export interface NeonUploadsRepositoryOptions<TEnv = unknown> {
  readonly query?: UploadsDbQuery<TEnv>;
}

interface UploadsBucketLike {
  readonly put: (
    key: string,
    value: ArrayBuffer,
    options?: {
      readonly httpMetadata?: { readonly contentType?: string };
    },
  ) => Promise<unknown>;
  readonly get?: (key: string) => Promise<{
    readonly arrayBuffer?: () => Promise<ArrayBuffer>;
    readonly body?: BodyInit | null;
    readonly httpMetadata?: { readonly contentType?: string };
  } | null>;
  readonly delete?: (key: string) => Promise<unknown>;
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function envText<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function shouldUseNeonUploadsRepository<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envText(env, key)));
}

function databaseUrl<TEnv>(env: TEnv): string {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = envText(env, key);
    if (value) return value;
  }
  throw new Error("Missing database URL for uploads repository.");
}

async function defaultQuery<TEnv>(
  sqlText: string,
  params: readonly DbValue[],
  options: UploadsDbQueryOptions<TEnv>,
): Promise<UploadsDbQueryResult> {
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
    throw new Error(`${field} must be a UUID for DB-backed uploads.`);
  }
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function jsonRecord(value: unknown): JsonRecord {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return jsonRecord(parsed);
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function bucketFromEnv<TEnv>(env: TEnv): UploadsBucketLike | null {
  if (!env || typeof env !== "object") return null;
  const bucket = (env as { readonly UPLOADS_BUCKET?: unknown }).UPLOADS_BUCKET;
  if (!bucket || typeof bucket !== "object") return null;
  if (typeof (bucket as { readonly put?: unknown }).put !== "function")
    return null;
  return bucket as UploadsBucketLike;
}

function ownerIdFor<TEnv>(
  input: Pick<UploadPrepareInput, "ownerId">,
  runtime: UploadsRouteRuntime<TEnv>,
): string {
  return assertUuid(input.ownerId ?? runtime.principal.userId, "ownerId");
}

function storageKeyFor(userId: string, attachmentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_").slice(0, 160);
  return `uploads/${userId}/att_${attachmentId}/${safeName}`;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function rowToPublic(row: DbRow): JsonRecord {
  const attachmentId = String(row.attachment_id ?? "");
  const status = String(row.status ?? "PREPARED").toUpperCase();
  const metadata = jsonRecord(row.metadata);
  return {
    attachmentId,
    fileName:
      toText(row.file_name) ?? toText(metadata.fileName) ?? "upload.bin",
    contentType: toText(row.mime_type) ?? "application/octet-stream",
    sizeBytes: toNumber(row.file_size),
    purpose: toText(row.upload_purpose) ?? "COMMUNITY_ATTACHMENT",
    ownerType: toText(row.owner_type) ?? "USER",
    ownerId: toText(row.owner_id),
    visibility: toText(row.upload_visibility) ?? "PRIVATE",
    metadata,
    status,
    scanStatus: toText(row.scan_status) ?? "PENDING",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at ?? row.created_at),
    downloadUrl: null,
    uploadUrl: null,
    rawStorageValueExposed: false,
    financialRawFileAllowed: false,
    adTargetingSeparated: true,
  };
}

function selectColumns(): string {
  return `
    attachment_id,
    owner_type,
    owner_id,
    file_name,
    file_url,
    storage_key,
    mime_type,
    file_size,
    checksum_sha256,
    computed_checksum_sha256,
    upload_purpose,
    upload_visibility,
    scan_status,
    status,
    metadata,
    created_at,
    updated_at,
    deleted_at
  `;
}

function listResult<TItem extends JsonRecord>(
  items: readonly TItem[],
  page: PaginationInput,
  total: number,
): UploadListResult<TItem> {
  return { items, page: page.page, pageSize: page.pageSize, total };
}

export function createNeonUploadsRepository<TEnv = unknown>(
  options: NeonUploadsRepositoryOptions<TEnv> = {},
): UploadsRepository<TEnv> {
  const query = options.query ?? defaultQuery<TEnv>;

  async function getInternal(
    attachmentId: string,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<DbRow | null> {
    const result = await query(
      `
        select ${selectColumns()}
        from public.attachments
        where attachment_id = $1
          and (created_by = $2 or owner_id = $2)
          and status <> 'DELETED'
        limit 1
      `,
      [assertUuid(attachmentId, "attachmentId"), runtime.principal.userId],
      { env: runtime.env, operationName: "uploads.get" },
    );
    return result.rows[0] ?? null;
  }

  return {
    name: "neon-uploads-repository",

    async list(input, page, runtime) {
      const purpose = toText(input.purpose);
      const status = toText(input.status);
      const params: DbValue[] = [runtime.principal.userId];
      const clauses = [
        "(created_by = $1 or owner_id = $1)",
        "status <> 'DELETED'",
      ];
      if (purpose) {
        params.push(purpose);
        clauses.push(`upload_purpose = $${params.length}`);
      }
      if (status) {
        params.push(status);
        clauses.push(`status = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const result = await query(
        `
          select ${selectColumns()}, count(*) over() as total_count
          from public.attachments
          where ${clauses.join(" and ")}
          order by created_at desc
          limit $${params.length - 1}
          offset $${params.length}
        `,
        params,
        { env: runtime.env, operationName: "uploads.list" },
      );
      const items = result.rows.map(rowToPublic);
      const total = result.rows[0] ? toNumber(result.rows[0].total_count) : 0;
      return listResult(items, page, total);
    },

    async get(attachmentId, runtime) {
      const row = await getInternal(attachmentId, runtime);
      return row ? rowToPublic(row) : null;
    },

    async prepare(input, runtime) {
      const userId = assertUuid(runtime.principal.userId, "principal.userId");
      const ownerId = ownerIdFor(input, runtime);
      const attachmentId = globalThis.crypto.randomUUID();
      const storageKey = storageKeyFor(userId, attachmentId, input.fileName);
      const result = await query(
        `
          insert into public.attachments (
            attachment_id,
            owner_type,
            owner_id,
            file_name,
            file_url,
            storage_key,
            mime_type,
            file_size,
            checksum_sha256,
            upload_purpose,
            upload_visibility,
            scan_status,
            status,
            metadata,
            created_by,
            created_at,
            updated_at
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING','PREPARED',$12::jsonb,$13,$14::timestamptz,$14::timestamptz)
          returning ${selectColumns()}
        `,
        [
          attachmentId,
          input.ownerType,
          ownerId,
          input.fileName,
          `${UPLOADS_API_PREFIX}/${attachmentId}/content`,
          storageKey,
          input.contentType,
          input.sizeBytes,
          input.checksumSha256,
          input.purpose,
          input.visibility,
          JSON.stringify(input.metadata),
          userId,
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.prepare" },
      );
      return rowToPublic(result.rows[0] ?? {});
    },

    async directUpload(input, runtime) {
      const userId = assertUuid(runtime.principal.userId, "principal.userId");
      const ownerId = ownerIdFor(input, runtime);
      const checksum = await sha256Hex(input.data);
      if (input.idempotencyKey) {
        const replay = await query(
          `
            select ${selectColumns()}
            from public.attachments
            where created_by = $1
              and idempotency_key = $2
              and status <> 'DELETED'
            limit 1
          `,
          [userId, input.idempotencyKey],
          { env: runtime.env, operationName: "uploads.findByIdempotency" },
        );
        const replayed = replay.rows[0];
        if (replayed)
          return { ...rowToPublic(replayed), idempotencyReplayed: true };
      }
      const attachmentId = globalThis.crypto.randomUUID();
      const storageKey = storageKeyFor(userId, attachmentId, input.fileName);
      const uploadBytes = input.data.slice(0);
      const bucket = bucketFromEnv(runtime.env);
      if (bucket) {
        await bucket.put(storageKey, uploadBytes, {
          httpMetadata: { contentType: input.contentType },
        });
      }
      const scanStatus = input.contentType.startsWith("image/")
        ? "PASSED"
        : "PENDING";
      const status = scanStatus === "PASSED" ? "AVAILABLE" : "SCANNING";
      const metadata = {
        ...input.metadata,
        source: input.metadata.source ?? "direct",
        fileName: input.fileName,
      } satisfies JsonRecord;
      const result = await query(
        `
          insert into public.attachments (
            attachment_id,
            owner_type,
            owner_id,
            file_name,
            file_url,
            storage_key,
            mime_type,
            file_size,
            checksum_sha256,
            computed_checksum_sha256,
            upload_purpose,
            upload_visibility,
            scan_status,
            status,
            metadata,
            idempotency_key,
            created_by,
            created_at,
            updated_at
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18::timestamptz,$18::timestamptz)
          returning ${selectColumns()}
        `,
        [
          attachmentId,
          input.ownerType,
          ownerId,
          input.fileName,
          `${UPLOADS_API_PREFIX}/${attachmentId}/content`,
          storageKey,
          input.contentType,
          input.sizeBytes,
          input.checksumSha256 ?? checksum,
          checksum,
          input.purpose,
          input.visibility,
          scanStatus,
          status,
          JSON.stringify(metadata),
          input.idempotencyKey,
          userId,
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.directUpload.create" },
      );
      return rowToPublic(result.rows[0] ?? {});
    },

    async finalize(attachmentId, input: UploadFinalizeInput, runtime) {
      const result = await query(
        `
          update public.attachments
          set
            storage_key = coalesce($3, storage_key),
            checksum_sha256 = coalesce($4, checksum_sha256),
            file_size = coalesce($5, file_size),
            scan_status = $6,
            status = case when $6 = 'FAILED' then 'QUARANTINED' else 'AVAILABLE' end,
            updated_at = $7::timestamptz
          where attachment_id = $1
            and (created_by = $2 or owner_id = $2)
          returning ${selectColumns()}
        `,
        [
          assertUuid(attachmentId, "attachmentId"),
          runtime.principal.userId,
          input.storageKey,
          input.checksumSha256,
          input.sizeBytes,
          input.scanStatus,
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.finalize" },
      );
      return rowToPublic(result.rows[0] ?? {});
    },

    async update(attachmentId, input: UploadUpdateInput, runtime) {
      const result = await query(
        `
          update public.attachments
          set
            upload_visibility = coalesce($3, upload_visibility),
            owner_id = coalesce($4, owner_id),
            metadata = coalesce($5::jsonb, metadata),
            updated_at = $6::timestamptz
          where attachment_id = $1
            and (created_by = $2 or owner_id = $2)
          returning ${selectColumns()}
        `,
        [
          assertUuid(attachmentId, "attachmentId"),
          runtime.principal.userId,
          input.visibility ?? null,
          input.ownerId ?? null,
          input.metadata === undefined ? null : JSON.stringify(input.metadata),
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.update" },
      );
      return rowToPublic(result.rows[0] ?? {});
    },

    async scan(attachmentId, input: UploadScanInput, runtime) {
      const status =
        input.scanStatus === "FAILED"
          ? "QUARANTINED"
          : input.scanStatus === "PASSED" || input.scanStatus === "SKIPPED"
            ? "AVAILABLE"
            : "SCANNING";
      const result = await query(
        `
          update public.attachments
          set
            scan_status = $3,
            scan_reason = $4,
            scan_engine = $5,
            status = $6,
            updated_at = $7::timestamptz
          where attachment_id = $1
            and (created_by = $2 or owner_id = $2)
          returning ${selectColumns()}
        `,
        [
          assertUuid(attachmentId, "attachmentId"),
          runtime.principal.userId,
          input.scanStatus,
          input.scanReason,
          input.engine,
          status,
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.scan" },
      );
      return rowToPublic(result.rows[0] ?? {});
    },

    async download(attachmentId, runtime) {
      const row = await getInternal(attachmentId, runtime);
      return {
        ...rowToPublic(row ?? {}),
        downloadUrl: `${UPLOADS_API_PREFIX}/${attachmentId}/content`,
        downloadExpiresInSeconds: 300,
        financialRawFileAllowed: false,
      };
    },

    async content(attachmentId, runtime) {
      const row = await getInternal(attachmentId, runtime);
      const storageKey = toText(row?.storage_key);
      const bucket = bucketFromEnv(runtime.env);
      if (!storageKey || !bucket?.get)
        return new Response(null, { status: 404 });
      const object = await bucket.get(storageKey);
      const body = object?.arrayBuffer
        ? await object.arrayBuffer()
        : (object?.body ?? null);
      if (body === null) return new Response(null, { status: 404 });
      return new Response(body, {
        headers: {
          "content-type":
            object?.httpMetadata?.contentType ??
            toText(row?.mime_type) ??
            "application/octet-stream",
          "cache-control": "private, max-age=300",
          "x-request-id": runtime.requestId,
          "x-content-type-options": "nosniff",
          "x-raw-financial-data-exposed": "false",
          "x-raw-personal-data-exposed": "false",
          "x-raw-push-token-exposed": "false",
          "x-ad-financial-targeting-used": "false",
        },
      });
    },

    async attach(attachmentId, ownerType, ownerId, runtime) {
      const result = await query(
        `
          update public.attachments
          set owner_type = $3, owner_id = $4, updated_at = $5::timestamptz
          where attachment_id = $1
            and (created_by = $2 or owner_id = $2)
          returning ${selectColumns()}
        `,
        [
          assertUuid(attachmentId, "attachmentId"),
          runtime.principal.userId,
          ownerType,
          assertUuid(ownerId, "ownerId"),
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.attach" },
      );
      return rowToPublic(result.rows[0] ?? {});
    },

    async delete(attachmentId, _reason, runtime) {
      const result = await query(
        `
          update public.attachments
          set status = 'DELETED', deleted_at = $3::timestamptz, updated_at = $3::timestamptz
          where attachment_id = $1
            and (created_by = $2 or owner_id = $2)
          returning ${selectColumns()}
        `,
        [
          assertUuid(attachmentId, "attachmentId"),
          runtime.principal.userId,
          runtime.now.toISOString(),
        ],
        { env: runtime.env, operationName: "uploads.delete" },
      );
      const storageKey = toText(result.rows[0]?.storage_key);
      const bucket = bucketFromEnv(runtime.env);
      if (storageKey && bucket?.delete) await bucket.delete(storageKey);
      return { attachmentId, status: "DELETED" };
    },

    async quota(runtime) {
      const result = await query(
        `
          select
            coalesce(sum(file_size), 0) as used_bytes,
            count(*) as file_count
          from public.attachments
          where created_by = $1 and status <> 'DELETED'
        `,
        [runtime.principal.userId],
        { env: runtime.env, operationName: "uploads.quota" },
      );
      const quotaBytes = 500 * 1024 * 1024;
      const usedBytes = toNumber(result.rows[0]?.used_bytes);
      return {
        quotaBytes,
        usedBytes,
        remainingBytes: Math.max(0, quotaBytes - usedBytes),
        fileCount: toNumber(result.rows[0]?.file_count),
        maxDirectUploadBytes: 10 * 1024 * 1024,
      };
    },
  };
}
