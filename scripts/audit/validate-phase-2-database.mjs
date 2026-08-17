import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const requiredFiles = [
  'docs/database/DB_SCHEMA_BASELINE.json',
  'docs/database/DB_TABLE_REGISTRY_41.csv',
  'docs/database/MIGRATION_LEDGER.csv',
  'docs/database/STATIC_SCHEMA_72_RECONCILIATION.csv',
  'docs/database/CANONICAL_SCHEMA_BOUNDARY.md',
  'docs/database/MIGRATION_LEDGER_DESIGN.md',
  'docs/database/MIGRATION_CHECKSUM_GOVERNANCE.md',
  'docs/database/SCHEMA_DRIFT_REPORT.md',
  'docs/database/RLS_MATRIX.csv',
  'docs/database/RLS_AB_ISOLATION_REPORT.md',
  'docs/database/API_DB_CONSTRAINT_MATRIX.csv',
  'docs/database/QUERY_PLAN_REPORT.md',
  'docs/database/RECOVERY_DRILL.md',
  'docs/database/DB_SECURITY_REPORT.md',
  'docs/database/DB_CAPABILITY_MATRIX.md',
  'docs/database/PHASE_2_REMEDIATION_REPORT.md',
  'docs/database/PHASE_2_DATABASE_FINALIZATION.json',
];

function fail(message) {
  console.error(`PHASE_2_DATABASE_VALIDATION_FAIL: ${message}`);
  process.exit(1);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex').toUpperCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  if (!headers?.length) return { headers: [], rows: [] };
  return {
    headers,
    rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))),
  };
}

function readRel(rel) {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) fail(`missing required file ${rel}`);
  return readFileSync(abs, 'utf8');
}

function assertNoSecretLike(rel, text) {
  const patterns = [
    /postgres(?:ql)?:\/\/[^,\s]+/i,
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    /sk-[A-Za-z0-9_-]{20,}/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
    /CLOUDFLARE_API_TOKEN\s*[:=]\s*[^,\s]+/i,
    /DATABASE_URL\s*[:=]\s*postgres/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(text)) fail(`secret-like content detected in ${rel}`);
  }
}

for (const rel of requiredFiles) {
  assertNoSecretLike(rel, readRel(rel));
}

const tableCsv = parseCsv(readRel('docs/database/DB_TABLE_REGISTRY_41.csv'));
if (tableCsv.rows.length !== 41) fail(`table registry rows expected 41, got ${tableCsv.rows.length}`);
const tableNames = tableCsv.rows.map((r) => r.TABLE_NAME);
if (new Set(tableNames).size !== tableNames.length) fail('duplicate table names in table registry');
if (tableNames.some((v) => !v)) fail('blank table name in table registry');
for (const field of ['TABLE_PURPOSE','DOMAIN','PK','RLS_ENABLED','FORCE_RLS','POLICY_COUNT','DATA_CLASSIFICATION','MIGRATION_INTRODUCED_BY','CURRENT_SCHEMA_HASH']) {
  if (tableCsv.rows.some((r) => !r[field])) fail(`table registry missing ${field}`);
}

const migrations = parseCsv(readRel('docs/database/MIGRATION_LEDGER.csv'));
if (migrations.rows.length !== 16) fail(`migration ledger rows expected 16, got ${migrations.rows.length}`);
const migrationIds = migrations.rows.map((r) => r.MIGRATION_ID);
if (new Set(migrationIds).size !== migrationIds.length) fail('duplicate migration ids');
if (migrations.rows.some((r) => !r.FILE_SHA256 || !/^[A-F0-9]{64}$/.test(r.FILE_SHA256))) fail('migration file SHA invalid');
if (migrations.rows.some((r) => r.FILE_CHECKSUM_MATCH !== 'YES')) fail('migration file checksum mismatch');
if (migrations.rows.some((r) => r.STATUS !== 'VERIFIED_APPLIED')) fail('migration status must be VERIFIED_APPLIED');

const reconciliation = parseCsv(readRel('docs/database/STATIC_SCHEMA_72_RECONCILIATION.csv'));
if (reconciliation.rows.length !== 72) fail(`static schema reconciliation rows expected 72, got ${reconciliation.rows.length}`);
if (reconciliation.rows.some((r) => !r.EXPORT_NAME || !r.SOURCE_PATH || !r.CLASSIFICATION)) fail('static schema reconciliation has blank required fields');
if (reconciliation.rows.some((r) => r.CLASSIFICATION === 'UNKNOWN')) fail('static schema reconciliation UNKNOWN must be 0');
if (reconciliation.rows.filter((r) => r.CANONICAL_41_MEMBER === 'YES').length !== 22) fail('expected 22 packages/db exports to overlap current canonical 41 table names');

const rls = parseCsv(readRel('docs/database/RLS_MATRIX.csv'));
if (rls.rows.length !== 41) fail(`RLS matrix rows expected 41, got ${rls.rows.length}`);
if (rls.rows.some((r) => r.RLS_ENABLED !== 'YES')) fail('one or more tables missing RLS');
const forceCount = rls.rows.filter((r) => r.FORCE_RLS === 'YES').length;
if (forceCount !== 30) fail(`FORCE RLS count expected 30, got ${forceCount}`);

const apiDb = parseCsv(readRel('docs/database/API_DB_CONSTRAINT_MATRIX.csv'));
if (apiDb.rows.length < 200) fail(`API DB matrix should cover Phase 1 exact endpoints, got ${apiDb.rows.length}`);

const schemaBaseline = JSON.parse(readRel('docs/database/DB_SCHEMA_BASELINE.json'));
if (schemaBaseline.liveCounts.tableCount !== 41) fail('schema baseline live table count is not 41');
if (schemaBaseline.liveCounts.rlsCount !== 41) fail('schema baseline RLS count is not 41');
if (schemaBaseline.liveCounts.forceRlsCount !== 30) fail('schema baseline FORCE RLS count is not 30');
if (schemaBaseline.applicationRole.rolbypassrls !== false) fail('app role BYPASSRLS must be false');
if (!Array.isArray(schemaBaseline.canonicalProductionTableNames) || schemaBaseline.canonicalProductionTableNames.length !== 41) fail('canonical production table boundary must have 41 names');
if (schemaBaseline.sourceSchemaTableCount !== 72) fail('packages/db static schema export count must be 72');
if (schemaBaseline.noncanonicalStaticSchemaTableCount !== 50) fail('noncanonical static schema export count must be 50');

const phase2 = JSON.parse(readRel('docs/database/PHASE_2_DATABASE_FINALIZATION.json'));
if (phase2.status.phase2 !== 'PASS') fail('phase2 status must be PASS after PITR RPO/RTO rehearsal evidence');
if (phase2.status.d017 !== 'PASS') fail('D-017 must be PASS after PITR RPO/RTO rehearsal evidence');
if (phase2.status.projectCompletion100 !== false) fail('PROJECT_COMPLETION_100 must remain false');
if (phase2.status.commercialLaunchReady !== false) fail('COMMERCIAL_LAUNCH_READY must remain false');
if (phase2.counts.tableCount !== 41) fail('phase2 baseline table count is not 41');
if (phase2.counts.migrationCount !== 16) fail('phase2 migration count is not 16');
if (phase2.counts.policyCount !== 77) fail('phase2 policy count is not 77');
if (phase2.counts.packagesDbStaticTableCount !== 72) fail('phase2 static schema export count is not 72');
if (phase2.counts.packagesDbCanonicalPhysicalCount !== 41) fail('phase2 canonical physical count is not 41');
if (phase2.counts.staticSchemaUnknownCount !== 0) fail('phase2 static schema UNKNOWN count is not 0');
if (phase2.status.schemaDriftP0 !== 0) fail('SCHEMA_DRIFT_P0 must be 0');
if (phase2.status.migrationLedgerStatus !== 'PASS') fail('migration ledger status must be PASS');
if (phase2.status.migrationChecksumStatus !== 'PASS') fail('migration checksum status must be PASS');
if (phase2.status.recoveryStatus !== 'PASS') fail('recovery status must be PASS after PITR rehearsal evidence');
if (phase2.status.queryPlanStatus !== 'PASS_STRUCTURAL') fail('query plan status must be PASS_STRUCTURAL');
if (phase2.status.backupPitrStatus !== 'PASS') fail('PITR status must be PASS after RPO/RTO closure');
if (phase2.status.db009Status !== 'PASS') fail('DB-009 status must be PASS');
if (phase2.status.db010Status !== 'PASS') fail('DB-010 status must be PASS');
if (phase2.status.rpoStatus !== 'PASS') fail('RPO status must be PASS');
if (phase2.status.rtoStatus !== 'PASS') fail('RTO status must be PASS');
if (phase2.status.phase3EntryReadiness !== 'READY') fail('Phase 3 entry readiness must be READY after Phase 2 PASS');
if (!Array.isArray(phase2.outputFiles) || phase2.outputFiles.length < requiredFiles.length - 1) fail('phase2 output file hashes missing');

const trace = parseCsv(readRel('docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv'));
for (const id of ['DB-001','DB-002','DB-003','DB-004','DB-005','DB-006','DB-007','DB-008','DB-009','DB-010','DB-011','DB-012']) {
  const row = trace.rows.find((r) => r.REQ_ID === id);
  if (!row) fail(`trace matrix missing ${id}`);
  if (!row.RUNTIME_EVIDENCE.includes('Live') && !row.RUNTIME_EVIDENCE.includes('Migration') && !row.RUNTIME_EVIDENCE.includes('Synthetic') && !row.RUNTIME_EVIDENCE.includes('Neon') && !row.RUNTIME_EVIDENCE.includes('Representative') && !row.RUNTIME_EVIDENCE.includes('Application role') && !row.RUNTIME_EVIDENCE.includes('Forward recovery') && !row.RUNTIME_EVIDENCE.includes('Table-level')) {
    fail(`trace matrix row ${id} lacks Phase 2 runtime/evidence text`);
  }
}

const digest = sha256(requiredFiles.map((rel) => `${rel}:${sha256(readRel(rel))}`).join('\n'));
console.log(`PHASE_2_DATABASE_VALIDATION_PASS ${digest}`);
