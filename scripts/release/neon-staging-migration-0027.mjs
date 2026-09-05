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
  migrationId: "0027_android_launch_social_provider_contract",
  migrationPath:
    "database/migrations/0027_android_launch_social_provider_contract.sql",
  applicationRole: "salary_hijacking_staging_app",
  allowedEndpointIds: new Set([
    "ep-young-sunset-ajgi3bab",
    "ep-young-sunset-ajgi3bab-k9p",
  ]),
  blockedEndpointIds: new Set([
    "ep-restless-mouse-aj80bf0j",
    "ep-restless-mouse-aj80bf0j-b97",
  ]),
  allowedIdentityProviders: ["EMAIL", "PASSWORD", "GOOGLE", "KAKAO", "NAVER"],
  allowedOauthProviders: ["GOOGLE", "KAKAO", "NAVER"],
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

async function verifyProviderContract(sql, checksum) {
  const [contract] = await sql`
    select
      (
        select count(*)::int
        from public.auth_identities
        where provider not in ('EMAIL', 'PASSWORD', 'GOOGLE', 'KAKAO', 'NAVER')
      ) as unsupported_identity_rows,
      (
        select count(*)::int
        from public.auth_oauth_states
        where provider not in ('GOOGLE', 'KAKAO', 'NAVER')
      ) as unsupported_oauth_state_rows,
      (
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conname = 'chk_auth_provider'
          and conrelid = 'public.auth_identities'::regclass
      ) as identity_constraint,
      (
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conname = 'chk_auth_oauth_states_provider'
          and conrelid = 'public.auth_oauth_states'::regclass
      ) as oauth_constraint,
      (
        select count(*)::int
        from db_meta.database_schema_migrations
        where migration_id = ${EXPECTED.migrationId}
          and filename = ${EXPECTED.migrationPath}
          and checksum_sha256 = ${checksum}
          and status = 'VERIFIED_APPLIED'
      ) as ledger_match_count
  `;

  assert.equal(Number(contract.unsupported_identity_rows), 0);
  assert.equal(Number(contract.unsupported_oauth_state_rows), 0);
  const identityConstraint = String(contract.identity_constraint ?? "");
  const oauthConstraint = String(contract.oauth_constraint ?? "");

  for (const provider of EXPECTED.allowedIdentityProviders) {
    assert.match(identityConstraint, new RegExp(`'${provider}'::text`, "u"));
  }
  assert.doesNotMatch(identityConstraint, /APPLE|FACEBOOK|TWITTER|LINE/u);

  for (const provider of EXPECTED.allowedOauthProviders) {
    assert.match(oauthConstraint, new RegExp(`'${provider}'::text`, "u"));
  }
  assert.doesNotMatch(oauthConstraint, /EMAIL|PASSWORD|APPLE|FACEBOOK/u);
  assert.equal(Number(contract.ledger_match_count), 1);

  return {
    unsupportedIdentityRows: 0,
    unsupportedOauthStateRows: 0,
    identityConstraint: "EMAIL_PASSWORD_GOOGLE_KAKAO_NAVER_ONLY",
    oauthStateConstraint: "GOOGLE_KAKAO_NAVER_ONLY",
    ledgerMatch: true,
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

async function cleanupUnsupportedTransientOauthStates(sql) {
  const [preflight] = await sql`
    select
      (
        select count(*)::int
        from public.auth_identities
        where provider not in ('EMAIL', 'PASSWORD', 'GOOGLE', 'KAKAO', 'NAVER')
      ) as unsupported_identity_rows,
      (
        select count(*)::int
        from public.auth_oauth_states
        where provider not in ('GOOGLE', 'KAKAO', 'NAVER')
      ) as unsupported_oauth_state_rows,
      (
        select count(*)::int
        from public.auth_oauth_states
        where provider not in ('GOOGLE', 'KAKAO', 'NAVER')
          and consumed_at is null
          and expires_at > now()
      ) as unsupported_active_oauth_state_rows,
      (
        select count(*)::int
        from public.auth_oauth_states
        where provider not in ('GOOGLE', 'KAKAO', 'NAVER')
          and (
            consumed_at is not null
            or expires_at <= now()
          )
      ) as unsupported_cleanup_eligible_oauth_state_rows
  `;

  assert.equal(
    Number(preflight.unsupported_identity_rows),
    0,
    "unsupported auth identity provider rows require reviewed operator cleanup",
  );
  assert.equal(
    Number(preflight.unsupported_active_oauth_state_rows),
    0,
    "active unsupported OAuth state rows require reviewed operator cleanup",
  );

  const [deleted] = await sql`
    with deleted_rows as (
      delete from public.auth_oauth_states
      where provider not in ('GOOGLE', 'KAKAO', 'NAVER')
        and (
          consumed_at is not null
          or expires_at <= now()
        )
      returning state
    )
    select count(*)::int as deleted_count
    from deleted_rows
  `;

  return {
    unsupportedIdentityRows: 0,
    unsupportedOauthStateRowsBefore: Number(
      preflight.unsupported_oauth_state_rows,
    ),
    unsupportedActiveOauthStateRows: 0,
    cleanupEligibleTransientOauthStateRows: Number(
      preflight.unsupported_cleanup_eligible_oauth_state_rows,
    ),
    cleanedTransientOauthStateRows: Number(deleted.deleted_count),
    cleanupPolicy:
      "STAGING_ONLY_EXPIRED_OR_CONSUMED_OAUTH_STATES_NO_IDENTITY_OR_USER_DATA_DELETE",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath =
    args.get("out") ??
    "artifacts/neon-staging-migration-0027/evidence.json";
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
  assert.equal(migrationFileCount, 27, "expected exactly 27 migration files");

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
    const transientOauthStateCleanup =
      await cleanupUnsupportedTransientOauthStates(sql);
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
        'GITHUB_ACTIONS_STAGING_MIGRATION_0027',
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

    const providerContract = await verifyProviderContract(sql, checksum);
    const role = await verifyRole(sql);
    const ledgerAfter = await readLedger(sql);
    assert.equal(ledgerAfter.length, 27, "expected 27 migration ledger rows");

    const evidence = {
      schemaVersion: 1,
      evidenceType: "neon-staging-migration-0027",
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
      transientOauthStateCleanup,
      providerContract,
      role,
      status: "PASS",
    };

    assertNoSensitiveEvidence(evidence);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(
      "Neon staging migration 0027 PASS; secret values and raw data were not printed.\n",
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
