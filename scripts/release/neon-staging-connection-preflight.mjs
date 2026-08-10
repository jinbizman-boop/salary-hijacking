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
  /postgres(?:ql)?:\/\/|:\/\/[^/\s]+:[^@\s]+@|authorization|cookie|set-cookie|bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|jwt\s*[:=]|secret\s*[:=]|password\s*[:=]|salaryAmount|expenseAmount|savingAmount|hijackAmount|accountNumber|cardNumber|phoneNumber|emailAddress|pushToken|rawDeviceIdentifier/i;

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

function connectionFingerprint(url) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
        endpoint: normalizeEndpointId(url.hostname),
      }),
    )
    .digest("hex");
}

function assertNoSensitiveEvidence(evidence) {
  const serialized = JSON.stringify(evidence);
  assert.equal(
    SENSITIVE_PATTERN.test(serialized),
    false,
    "preflight evidence contains a sensitive-looking value",
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath =
    args.get("out") ??
    "artifacts/neon-staging/neon-staging-connection-preflight.json";
  const connectionString = process.env.STAGING_DATABASE_URL;

  assert.ok(
    connectionString,
    "Missing staging environment secret: STAGING_DATABASE_URL",
  );

  const url = new URL(connectionString);
  assert.match(
    url.protocol,
    /^postgres(?:ql)?:$/u,
    "STAGING_DATABASE_URL must be a Postgres URL",
  );

  const endpointId = normalizeEndpointId(url.hostname);
  const databaseFromUrl = url.pathname.replace(/^\//u, "");

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
    databaseFromUrl,
    EXPECTED.databaseName,
    "STAGING_DATABASE_URL database path is not the staging database",
  );

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
        current_setting('server_version_num')::int as server_version_num,
        to_regclass('public.growth_content_items')::text as growth_content_items_regclass,
        to_regclass('public.user_level_content_progress')::text as user_level_content_progress_regclass,
        (
          select count(*)::int
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind in ('r', 'p')
        ) as public_table_count,
        (
          select count(*)::int
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind in ('r', 'p')
            and c.relrowsecurity
        ) as rls_enabled_table_count,
        (
          select count(*)::int
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind in ('r', 'p')
            and c.relforcerowsecurity
        ) as force_rls_table_count
    `;

    assert.equal(
      session.database_name,
      EXPECTED.databaseName,
      "Connected database is not neondb",
    );
    assert.notEqual(
      Number(session.public_table_count),
      0,
      "Connected branch has no public application tables; refusing to treat it as staging",
    );

    const evidence = {
      schemaVersion: 1,
      evidenceType: "neon-staging-connection-preflight",
      capturedAt: new Date().toISOString(),
      secretsRedacted: true,
      containsSecretValues: false,
      containsRawPersonalData: false,
      containsRawFinancialData: false,
      expectedTarget: {
        projectName: EXPECTED.projectName,
        projectId: EXPECTED.projectId,
        branchName: EXPECTED.branchName,
        branchId: EXPECTED.branchId,
        databaseName: EXPECTED.databaseName,
      },
      verifiedTarget: {
        branchIdentityProof:
          "connection endpoint matched verified Neon staging branch compute metadata",
        endpointId,
        endpointIsKnownMainProduction: false,
        databaseName: session.database_name,
        roleName: session.role_name,
        serverMajorVersion: Math.trunc(
          Number(session.server_version_num) / 10000,
        ),
        publicTableCount: Number(session.public_table_count),
        rlsEnabledTableCount: Number(session.rls_enabled_table_count),
        forceRlsTableCount: Number(session.force_rls_table_count),
        growthContentItemsExists: String(
          session.growth_content_items_regclass ?? "",
        ).endsWith("growth_content_items"),
        userLevelContentProgressExists: String(
          session.user_level_content_progress_regclass ?? "",
        ).endsWith("user_level_content_progress"),
      },
      connectionFingerprintSha256: connectionFingerprint(url),
      status: "PASS",
    };

    assertNoSensitiveEvidence(evidence);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(
      "Neon staging connection preflight PASS; secret value was not printed.",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
