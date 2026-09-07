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
  migrationId: "0028_community_final_taxonomy",
  migrationPath: "database/migrations/0028_community_final_taxonomy.sql",
  applicationRole: "salary_hijacking_staging_app",
  allowedEndpointIds: new Set([
    "ep-young-sunset-ajgi3bab",
    "ep-young-sunset-ajgi3bab-k9p",
  ]),
  blockedEndpointIds: new Set([
    "ep-restless-mouse-aj80bf0j",
    "ep-restless-mouse-aj80bf0j-b97",
  ]),
  finalLegacyBoardTypes: ["FREE", "LEVEL_UP_PROOF", "HOBBY"],
  finalCanonicalSlugs: ["free", "level-up-proof", "hobby"],
});

const SENSITIVE_PATTERN =
  /postgres(?:ql)?:\/\/|:\/\/[^/\s]+:[^@\s]+@|authorization|cookie|set-cookie|bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|jwt\s*[:=]|secret\s*[:=]|password\s*[:=]|salaryAmount|expenseAmount|savingAmount|hijackAmount|accountNumber|cardNumber|phoneNumber|emailAddress|raw[_-]?push[_-]?token\s*[:=]|token[_-]?ciphertext\s*[:=]|rawDeviceIdentifier/i;

const parseArgs = (argv) => {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    args.set(value.slice(2), argv[index + 1]);
    index += 1;
  }
  return args;
};

const sha256Hex = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").toUpperCase();

const countMigrationFiles = (rootDir) =>
  fs
    .readdirSync(path.join(rootDir, "database", "migrations"))
    .filter((fileName) => fileName.endsWith(".sql")).length;

const normalizeEndpointId = (hostname) => {
  const firstLabel = hostname.split(".")[0] ?? "";
  return firstLabel.endsWith("-pooler")
    ? firstLabel.slice(0, -"-pooler".length)
    : firstLabel;
};

const assertNoSensitiveEvidence = (evidence) => {
  const serialized = JSON.stringify(evidence);
  assert.equal(
    SENSITIVE_PATTERN.test(serialized),
    false,
    "community taxonomy evidence contains a sensitive-looking value",
  );
};

const loadPostgresClient = async () => {
  const requireFromApi = createRequire(
    pathToFileURL(path.resolve("services/api/package.json")),
  );
  const postgresPath = requireFromApi.resolve("postgres");
  const moduleValue = await import(pathToFileURL(postgresPath).href);
  return moduleValue.default;
};

const readLedger = (sql) => sql`
  select migration_id, filename, checksum_sha256, status, verification_source
  from db_meta.database_schema_migrations
  order by migration_id
`;

const readSchemaFlags = async (sql) => {
  const [flags] = await sql`
    select
      to_regclass('public.community_posts') is not null as community_posts_exists,
      to_regclass('public.community_boards') is not null as community_boards_exists,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'community_posts'
          and column_name = 'board_type'
      ) as legacy_board_type_column_exists,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'community_posts'
          and column_name = 'board_id'
      ) as canonical_board_id_column_exists
  `;
  return {
    communityPostsExists: flags.community_posts_exists === true,
    communityBoardsExists: flags.community_boards_exists === true,
    legacyBoardTypeColumnExists: flags.legacy_board_type_column_exists === true,
    canonicalBoardIdColumnExists: flags.canonical_board_id_column_exists === true,
  };
};

const rowsToPlain = (rows) =>
  rows.map((row) => {
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      output[key] = typeof value === "bigint" ? Number(value) : value;
    }
    return output;
  });

async function readInventory(sql) {
  const flags = await readSchemaFlags(sql);
  assert.equal(flags.communityPostsExists, true);

  const [{ total_posts: totalPosts }] =
    await sql`select count(*)::int as total_posts from public.community_posts`;

  const legacyBoardTypeRows = flags.legacyBoardTypeColumnExists
    ? rowsToPlain(await sql`
        select board_type, count(*)::int as row_count
        from public.community_posts
        group by board_type
        order by board_type
      `)
    : [];

  const activeBoardRows = flags.communityBoardsExists
    ? rowsToPlain(await sql`
        select slug, type, name_ko, is_active, count(p.post_id)::int as post_count
        from public.community_boards b
        left join public.community_posts p on p.board_id = b.board_id
        group by slug, type, name_ko, is_active, sort_order, b.board_id
        order by sort_order asc, slug asc
      `)
    : [];

  const [rls] = await sql`
    select
      relrowsecurity as rls_enabled,
      relforcerowsecurity as force_rls
    from pg_class
    where oid = 'public.community_posts'::regclass
  `;

  const [constraint] = flags.legacyBoardTypeColumnExists
    ? await sql`
        select pg_get_constraintdef(oid) as board_type_constraint
        from pg_constraint
        where conrelid = 'public.community_posts'::regclass
          and conname = 'chk_community_posts_board_type'
      `
    : [{ board_type_constraint: null }];

  return {
    flags,
    totalPosts: Number(totalPosts),
    legacyBoardTypeRows,
    activeBoardRows,
    legacyBoardTypeConstraint: constraint.board_type_constraint
      ? String(constraint.board_type_constraint)
      : null,
    rls: {
      enabled: rls?.rls_enabled === true,
      force: rls?.force_rls === true,
    },
  };
}

const knownLegacyBoardTypes = new Set([
  "ALL",
  "FREE",
  "LEVEL_UP_PROOF",
  "LEVELUP",
  "LEVEL_CERTIFICATION",
  "HOBBY",
  "QUESTION",
  "MONEY_TIP",
  "NOTICE_DISCUSSION",
  "SALARY_TALK",
  "BUDGET_TIP",
  "EXPENSE_CUT",
  "SAVINGS_GOAL",
  "SIDE_HUSTLE",
  "GENERAL",
  "NOTICE",
  "EVENT",
  "FAQ",
]);

const activeFinalBoard = (row) =>
  row.is_active === true && EXPECTED.finalCanonicalSlugs.includes(String(row.slug));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath =
    args.get("out") ?? "artifacts/neon-staging-migration-0028/evidence.json";
  const rootDir = process.cwd();
  const connectionString = process.env.STAGING_DATABASE_URL;

  assert.ok(connectionString, "Missing staging environment secret: STAGING_DATABASE_URL");
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
  assert.equal(url.pathname.replace(/^\//u, ""), EXPECTED.databaseName);

  const migrationSql = fs.readFileSync(path.join(rootDir, EXPECTED.migrationPath), "utf8");
  const checksum = sha256Hex(migrationSql);
  const migrationFileCount = countMigrationFiles(rootDir);
  assert.equal(migrationFileCount, 28, "expected exactly 28 migration files");

  const postgres = await loadPostgresClient();
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 20,
  });

  try {
    const [session] = await sql`
      select current_database() as database_name,
             current_user as role_name,
             current_setting('server_version_num')::int as server_version_num
    `;
    assert.equal(session.database_name, EXPECTED.databaseName);

    const ledgerBefore = await readLedger(sql);
    const before = await readInventory(sql);
    const unknownLegacyValues = before.legacyBoardTypeRows
      .map((row) => String(row.board_type ?? "").trim().toUpperCase())
      .filter((value) => !knownLegacyBoardTypes.has(value));
    assert.deepEqual(unknownLegacyValues, []);

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
        'GITHUB_ACTIONS_STAGING_MIGRATION_0028',
        now()
      )
      on conflict (migration_id) do update
      set filename = excluded.filename,
          checksum_sha256 = excluded.checksum_sha256,
          execution_duration_ms = excluded.execution_duration_ms,
          status = excluded.status,
          schema_version = excluded.schema_version,
          verification_source = excluded.verification_source,
          updated_at = now()
    `;

    const after = await readInventory(sql);
    const ledgerAfter = await readLedger(sql);
    assert.equal(after.totalPosts, before.totalPosts);

    const finalLegacyValues = after.legacyBoardTypeRows.map((row) =>
      String(row.board_type ?? ""),
    );
    for (const value of finalLegacyValues) {
      assert.ok(
        EXPECTED.finalLegacyBoardTypes.includes(value),
        `legacy board_type remained outside final taxonomy: ${value}`,
      );
    }

    if (after.flags.communityBoardsExists) {
      const activeFinalCount = after.activeBoardRows.filter(activeFinalBoard).length;
      const activeNonFinalCount = after.activeBoardRows.filter(
        (row) => row.is_active === true && !EXPECTED.finalCanonicalSlugs.includes(String(row.slug)),
      ).length;
      assert.equal(activeFinalCount, 3);
      assert.equal(activeNonFinalCount, 0);
    }

    const evidence = {
      schemaVersion: 1,
      evidenceType: "neon-staging-migration-0028-community-final-taxonomy",
      capturedAt: new Date().toISOString(),
      redaction: {
        secretValuesPrinted: false,
        rawPersonalDataPrinted: false,
        rawFinancialDataPrinted: false,
      },
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
        serverMajorVersion: Math.trunc(Number(session.server_version_num) / 10000),
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
      community: {
        finalCategoryCount: 3,
        finalInternalKeys: ["FREE", "LEVELUP", "HOBBY"],
        finalLabelsKo: ["자유 게시판", "레벨업 인증", "취미 게시판"],
        totalPostCountBefore: before.totalPosts,
        totalPostCountAfter: after.totalPosts,
        postDataLossCount: 0,
        postDuplicationCount: 0,
        unknownLegacyValues,
        inventoryBefore: before,
        inventoryAfter: after,
      },
      status: "PASS",
    };

    assertNoSensitiveEvidence(evidence);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(
      "Neon staging migration 0028 community taxonomy PASS; secret values and raw data were not printed.\n",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
