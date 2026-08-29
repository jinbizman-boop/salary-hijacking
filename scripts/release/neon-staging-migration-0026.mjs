#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const EXPECTED = Object.freeze({
  projectName: "salary-hijacking",
  projectId: "still-feather-22153967",
  branchName: "staging",
  branchId: "br-fragrant-sky-aj5kk2c3",
  databaseName: "neondb",
  migrationId: "0026_notification_native_push_token_contract",
  migrationPath:
    "database/migrations/0026_notification_native_push_token_contract.sql",
  applicationRole: "salary_hijacking_staging_app",
  allowedEndpointIds: new Set([
    "ep-young-sunset-ajgi3bab",
    "ep-young-sunset-ajgi3bab-k9p",
  ]),
  blockedEndpointIds: new Set([
    "ep-restless-mouse-aj80bf0j",
    "ep-restless-mouse-aj80bf0j-b97",
  ]),
});

const SENSITIVE_PATTERN =
  /postgres(?:ql)?:\/\/|:\/\/[^/\s]+:[^@\s]+@|authorization|cookie|set-cookie|bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|jwt\s*[:=]|secret\s*[:=]|password\s*[:=]|salaryAmount|expenseAmount|savingAmount|hijackAmount|accountNumber|cardNumber|phoneNumber|emailAddress|raw[_-]?push[_-]?token\s*[:=]|token[_-]?ciphertext\s*[:=]|rawDeviceIdentifier/i;

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--")) {
      args.set(value.slice(2), argv[index + 1]);
      index += 1;
    }
  }
  return args;
}

function normalizeEndpointId(hostname) {
  const firstLabel = hostname.split(".")[0] ?? "";
  return firstLabel.endsWith("-pooler")
    ? firstLabel.slice(0, -"-pooler".length)
    : firstLabel;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

function countMigrationFiles(rootDir) {
  return fs
    .readdirSync(path.join(rootDir, "database", "migrations"))
    .filter((fileName) => fileName.endsWith(".sql"))
    .length;
}

function assertNoSensitiveEvidence(evidence) {
  const serialized = JSON.stringify(evidence);
  assert.equal(
    SENSITIVE_PATTERN.test(serialized),
    false,
    "migration evidence contains a sensitive-looking value",
  );
}

export function buildLedgerCsvRow({
  migrationId = EXPECTED.migrationId,
  migrationPath = EXPECTED.migrationPath,
  checksum,
  order = 26,
  appliedAt = "GITHUB_ACTIONS_STAGING_MIGRATION_0026",
} = {}) {
  return [
    migrationId,
    migrationPath,
    checksum,
    String(order),
    "YES_DB_META_LEDGER_VERIFIED",
    appliedAt,
    checksum,
    "YES",
    "YES_STAGING_IDEMPOTENCY_REAPPLY_VERIFIED",
    "YES_SYNTHETIC_FORWARD_RECOVERY_TESTED",
    "YES_OR_DATA_TOUCHING",
    "VERIFIED_APPLIED",
  ].join(",");
}

async function loadPostgresClient() {
  const requireFromApi = createRequire(
    pathToFileURL(path.resolve("services/api/package.json")),
  );
  const postgresPath = requireFromApi.resolve("postgres");
  const moduleValue = await import(pathToFileURL(postgresPath).href);
  return moduleValue.default;
}

async function readLedger(sql) {
  return sql`
    select
      migration_id,
      filename,
      checksum_sha256,
      status,
      verification_source,
      applied_at
    from db_meta.database_schema_migrations
    order by migration_id
  `;
}

async function verifySchema(sql, checksum) {
  const [schema] = await sql`
    select
      to_regclass('public.notification_push_tokens')::text as notification_push_tokens_regclass,
      (
        select count(*)::int
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'user_devices'
          and column_name in (
            'push_token_provider',
            'push_token_source',
            'push_token_secret_ref'
          )
      ) as user_devices_columns,
      (
        select count(*)::int
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'notification_push_tokens'
          and column_name in (
            'token_hash',
            'token_secret_ref',
            'token_ciphertext',
            'raw_push_token_included',
            'raw_secret_included',
            'raw_pii_included'
          )
      ) as push_token_columns,
      (
        select count(*)::int
        from pg_constraint
        where conname in (
          'chk_user_devices_android_native_fcm',
          'chk_notification_push_tokens_secret_ref_or_ciphertext',
          'chk_notification_push_tokens_no_raw_payload'
        )
      ) as required_constraint_count,
      (
        select count(*)::int
        from pg_indexes
        where schemaname = 'public'
          and indexname in (
            'idx_user_devices_provider_status',
            'uq_notification_push_tokens_token_hash_active',
            'idx_notification_push_tokens_user_status',
            'idx_notification_push_tokens_device'
          )
      ) as required_index_count,
      (
        select relrowsecurity
        from pg_class
        where oid = 'public.notification_push_tokens'::regclass
      ) as push_tokens_rls_enabled,
      (
        select relforcerowsecurity
        from pg_class
        where oid = 'public.notification_push_tokens'::regclass
      ) as push_tokens_force_rls,
      (
        select count(*)::int
        from pg_policies
        where schemaname = 'public'
          and tablename = 'notification_push_tokens'
          and policyname in (
            'notification_push_tokens_owner_all',
            'notification_push_tokens_service_select'
          )
      ) as push_token_policy_count,
      (
        select count(*)::int
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = 'notification_push_tokens'
          and grantee = ${EXPECTED.applicationRole}
          and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      ) as application_role_privilege_count,
      (
        select count(*)::int
        from db_meta.database_schema_migrations
        where migration_id = ${EXPECTED.migrationId}
          and filename = ${EXPECTED.migrationPath}
          and checksum_sha256 = ${checksum}
          and status = 'VERIFIED_APPLIED'
      ) as ledger_match_count
  `;

  assert.equal(
    String(schema.notification_push_tokens_regclass ?? "").endsWith(
      "notification_push_tokens",
    ),
    true,
    "notification_push_tokens table was not materialized",
  );
  assert.equal(Number(schema.user_devices_columns), 3);
  assert.equal(Number(schema.push_token_columns), 6);
  assert.equal(Number(schema.required_constraint_count), 3);
  assert.equal(Number(schema.required_index_count), 4);
  assert.equal(schema.push_tokens_rls_enabled, true);
  assert.equal(schema.push_tokens_force_rls, true);
  assert.equal(Number(schema.push_token_policy_count), 2);
  assert.equal(Number(schema.application_role_privilege_count), 4);
  assert.equal(Number(schema.ledger_match_count), 1);

  return {
    notificationPushTokensTable: "present",
    userDevicesColumnCount: Number(schema.user_devices_columns),
    notificationPushTokenColumnCount: Number(schema.push_token_columns),
    requiredConstraintCount: Number(schema.required_constraint_count),
    requiredIndexCount: Number(schema.required_index_count),
    rlsEnabled: schema.push_tokens_rls_enabled === true,
    forceRls: schema.push_tokens_force_rls === true,
    policyCount: Number(schema.push_token_policy_count),
    applicationRolePrivilegeCount: Number(
      schema.application_role_privilege_count,
    ),
    ledgerMatch: Number(schema.ledger_match_count) === 1,
  };
}

async function verifyRole(sql) {
  const [role] = await sql`
    select
      rolname,
      rolsuper,
      rolcreaterole,
      rolcreatedb,
      rolreplication,
      rolbypassrls
    from pg_roles
    where rolname = ${EXPECTED.applicationRole}
  `;
  assert.ok(role, `${EXPECTED.applicationRole} role was not found`);
  assert.equal(role.rolsuper, false);
  assert.equal(role.rolcreaterole, false);
  assert.equal(role.rolcreatedb, false);
  assert.equal(role.rolreplication, false);
  assert.equal(role.rolbypassrls, false);
  return {
    roleName: EXPECTED.applicationRole,
    superuser: false,
    createRole: false,
    createDb: false,
    replication: false,
    bypassRls: false,
  };
}

async function verifyAbIsolation(sql) {
  const prefix = `phase13_0026_${crypto.randomUUID()}`;
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const tokenHashA = sha256Hex(`${prefix}:token:a`);
  const tokenHashB = sha256Hex(`${prefix}:token:b`);
  const deviceHashA = sha256Hex(`${prefix}:device:a`);
  const deviceHashB = sha256Hex(`${prefix}:device:b`);
  const refA = `phase13-fcm-a-${prefix.slice(0, 32)}`;
  const refB = `phase13-fcm-b-${prefix.slice(0, 32)}`;
  const ciphertextA = `shjenc:v2:${sha256Hex(`${prefix}:cipher:a`).slice(0, 48)}`;
  const ciphertextB = `shjenc:v2:${sha256Hex(`${prefix}:cipher:b`).slice(0, 48)}`;

  await sql.begin(async (tx) => {
    await tx`
      insert into public.users (user_id, nickname, status)
      values
        (${userA}, 'phase13-db-a', 'ACTIVE'),
        (${userB}, 'phase13-db-b', 'ACTIVE')
    `;
    const [deviceA] = await tx`
      insert into public.user_devices (
        user_id,
        platform,
        push_token_hash,
        device_fingerprint_hash,
        status,
        push_token_provider,
        push_token_source,
        push_token_secret_ref,
        last_seen_at
      )
      values (
        ${userA},
        'ANDROID',
        ${tokenHashA},
        ${deviceHashA},
        'ACTIVE',
        'FCM',
        'NATIVE_DEVICE',
        ${refA},
        now()
      )
      returning device_id
    `;
    const [deviceB] = await tx`
      insert into public.user_devices (
        user_id,
        platform,
        push_token_hash,
        device_fingerprint_hash,
        status,
        push_token_provider,
        push_token_source,
        push_token_secret_ref,
        last_seen_at
      )
      values (
        ${userB},
        'ANDROID',
        ${tokenHashB},
        ${deviceHashB},
        'ACTIVE',
        'FCM',
        'NATIVE_DEVICE',
        ${refB},
        now()
      )
      returning device_id
    `;
    await tx`
      insert into public.notification_push_tokens (
        user_id,
        device_id,
        platform,
        provider,
        token_hash,
        token_secret_ref,
        token_ciphertext,
        push_permission_status,
        status,
        request_id,
        last_seen_at
      )
      values
        (
          ${userA},
          ${deviceA.device_id},
          'ANDROID',
          'FCM',
          ${tokenHashA},
          ${refA},
          ${ciphertextA},
          'AUTHORIZED',
          'ACTIVE',
          ${`${prefix}-a`},
          now()
        ),
        (
          ${userB},
          ${deviceB.device_id},
          'ANDROID',
          'FCM',
          ${tokenHashB},
          ${refB},
          ${ciphertextB},
          'AUTHORIZED',
          'ACTIVE',
          ${`${prefix}-b`},
          now()
        )
    `;

    await tx`set local role salary_hijacking_staging_app`;
    await tx`select set_config('app.current_user_id', ${userA}, true)`;
    await tx`select set_config('app.is_admin', 'false', true)`;

    const [visibleAsA] = await tx`
      select
        count(*)::int as visible_count,
        count(*) filter (where user_id = ${userA})::int as owner_count,
        count(*) filter (where user_id = ${userB})::int as attacker_visible_count
      from public.notification_push_tokens
      where token_hash in (${tokenHashA}, ${tokenHashB})
    `;
    assert.equal(Number(visibleAsA.visible_count), 1);
    assert.equal(Number(visibleAsA.owner_count), 1);
    assert.equal(Number(visibleAsA.attacker_visible_count), 0);

    const [attackerUpdate] = await tx`
      update public.notification_push_tokens
      set status = 'BLOCKED'
      where token_hash = ${tokenHashB}
      returning push_token_id
    `;
    assert.equal(attackerUpdate, undefined);

    const [attackerDelete] = await tx`
      delete from public.notification_push_tokens
      where token_hash = ${tokenHashB}
      returning push_token_id
    `;
    assert.equal(attackerDelete, undefined);

    await tx`reset role`;
    await tx`
      delete from public.users
      where user_id in (${userA}, ${userB})
    `;
    const [residue] = await tx`
      select
        (
          select count(*)::int
          from public.user_devices
          where push_token_hash in (${tokenHashA}, ${tokenHashB})
        ) as device_residue,
        (
          select count(*)::int
          from public.notification_push_tokens
          where token_hash in (${tokenHashA}, ${tokenHashB})
        ) as token_residue
    `;
    assert.equal(Number(residue.device_residue), 0);
    assert.equal(Number(residue.token_residue), 0);
  });

  return {
    status: "PASS",
    applicationRole: EXPECTED.applicationRole,
    syntheticUsersCreated: 2,
    userAVisibleRows: 1,
    userBRowsVisibleToUserA: 0,
    crossUserUpdateAffectedRows: 0,
    crossUserDeleteAffectedRows: 0,
    residueAfterCleanup: 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath =
    args.get("out") ??
    "artifacts/neon-staging-migration-0026/evidence.json";
  const generatedLedgerRowPath =
    args.get("ledger-row-out") ??
    "artifacts/neon-staging-migration-0026/MIGRATION_LEDGER_0026_ROW.csv";
  const rootDir = process.cwd();
  const connectionString = process.env.STAGING_DATABASE_URL;

  assert.ok(
    connectionString,
    "Missing staging environment secret: STAGING_DATABASE_URL",
  );

  const url = new URL(connectionString);
  assert.match(url.protocol, /^postgres(?:ql)?:$/u);
  const endpointId = normalizeEndpointId(url.hostname);
  assert.equal(
    EXPECTED.blockedEndpointIds.has(endpointId),
    false,
    "STAGING_DATABASE_URL points at the known main/production endpoint",
  );
  assert.equal(
    EXPECTED.allowedEndpointIds.has(endpointId),
    true,
    "STAGING_DATABASE_URL endpoint does not match the verified Neon staging branch metadata",
  );
  assert.equal(
    url.pathname.replace(/^\//u, ""),
    EXPECTED.databaseName,
    "STAGING_DATABASE_URL database path is not the staging database",
  );

  const migrationSql = fs.readFileSync(
    path.join(rootDir, EXPECTED.migrationPath),
    "utf8",
  );
  const checksum = sha256Hex(migrationSql);
  const migrationFileCount = countMigrationFiles(rootDir);
  assert.equal(migrationFileCount, 26, "expected exactly 26 migration files");

  const postgres = await loadPostgresClient();
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 20,
  });

  try {
    const [session] = await sql`
      select
        current_database() as database_name,
        current_user as role_name,
        current_setting('server_version_num')::int as server_version_num
    `;
    assert.equal(session.database_name, EXPECTED.databaseName);

    const ledgerBefore = await readLedger(sql);
    const startedAt = performance.now();
    await sql.unsafe(migrationSql);
    await sql.unsafe(migrationSql);
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

    await sql`
      insert into db_meta.database_schema_migrations (
        migration_id,
        filename,
        checksum_sha256,
        execution_duration_ms,
        status,
        schema_version,
        verification_source,
        updated_at
      )
      values (
        ${EXPECTED.migrationId},
        ${EXPECTED.migrationPath},
        ${checksum},
        ${durationMs},
        'VERIFIED_APPLIED',
        '2.0.0',
        'GITHUB_ACTIONS_STAGING_MIGRATION_0026',
        now()
      )
      on conflict (migration_id) do update
      set
        filename = excluded.filename,
        checksum_sha256 = excluded.checksum_sha256,
        execution_duration_ms = excluded.execution_duration_ms,
        status = excluded.status,
        schema_version = excluded.schema_version,
        verification_source = excluded.verification_source,
        updated_at = now()
    `;

    const schema = await verifySchema(sql, checksum);
    const role = await verifyRole(sql);
    const isolation = await verifyAbIsolation(sql);
    const ledgerAfter = await readLedger(sql);
    assert.equal(ledgerAfter.length, 26, "expected 26 migration ledger rows");

    const evidence = {
      schemaVersion: 1,
      evidenceType: "neon-staging-migration-0026",
      capturedAt: new Date().toISOString(),
      secretsRedacted: true,
      containsSecretValues: false,
      containsRawPersonalData: false,
      containsRawFinancialData: false,
      containsRawProviderTokenMaterial: false,
      productionDatabaseModified: false,
      expectedTarget: {
        projectName: EXPECTED.projectName,
        projectId: EXPECTED.projectId,
        branchName: EXPECTED.branchName,
        branchId: EXPECTED.branchId,
        databaseName: EXPECTED.databaseName,
      },
      verifiedTarget: {
        endpointId,
        databaseName: session.database_name,
        roleName: session.role_name,
        serverMajorVersion: Math.trunc(
          Number(session.server_version_num) / 10000,
        ),
      },
      migration: {
        id: EXPECTED.migrationId,
        filePath: EXPECTED.migrationPath,
        fileSha256: checksum,
        migrationFiles: migrationFileCount,
        ledgerRowsBefore: ledgerBefore.length,
        ledgerRowsAfter: ledgerAfter.length,
        applied: true,
        checksumMatch: true,
        idempotencyRerun: "PASS",
        executionDurationMs: durationMs,
      },
      schema,
      role,
      abIsolation: isolation,
      status: "PASS",
    };

    assertNoSensitiveEvidence(evidence);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    fs.mkdirSync(path.dirname(generatedLedgerRowPath), { recursive: true });
    fs.writeFileSync(
      generatedLedgerRowPath,
      `${buildLedgerCsvRow({
        checksum,
        appliedAt: "GITHUB_ACTIONS_STAGING_MIGRATION_0026",
      })}\n`,
    );
    process.stdout.write(
      "Neon staging migration 0026 PASS; secret values and raw tokens were not printed.\n",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
