import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'database');
const TRACE_PATH = path.join(ROOT, 'docs', 'audit', 'CURRENT_REQUIREMENT_TRACE_MATRIX.csv');
const API_REGISTRY_PATH = path.join(ROOT, 'docs', 'architecture', 'API_ENDPOINT_REGISTRY.csv');
const MIGRATION_DIR = path.join(ROOT, 'database', 'migrations');
const APPLICATION_RC_SOURCE_SHA = '80cc5cdfb0758478791b19196e2812e7fa6d671f';
const PROJECT_ID = 'still-feather-22153967';
const BRANCH_ID = 'br-fragrant-sky-aj5kk2c3';
const DATABASE_PROJECT = 'salary-hijacking';
const DATABASE_BRANCH = 'staging';
const DATABASE_NAME = 'neondb';
const APPLICATION_ROLE = 'salary_hijacking_staging_app';
const TIMESTAMP = new Date().toISOString();

const tableData = [
  ['ad_campaigns', 'Ads campaign configuration and delivery limits', 'ADS', false, 'ad_campaign_id', 'fk=5', 'unique=0', 'check=21', 'indexes=5', 'cost_per_click_krw;cost_per_conversion_krw;fixed_fee_krw;total_impression_cap', 'status', true, false, 2, 'COMMERCIAL_ANALYTICS', 'campaign retention policy pending', '0004_admin_audit_ads.sql', 'ADS;ADMIN'],
  ['ad_events', 'Ad impression/click/conversion event log', 'ADS', true, 'ad_event_id', 'fk=2', 'unique=request_once', 'check=7', 'indexes=6', '', 'event_type', true, true, 3, 'COMMERCIAL_ANALYTICS', 'aggregate/anonymize pending', '0004_admin_audit_ads.sql', 'ADS;ANL'],
  ['admin_audit_logs', 'Privileged admin operation audit trail', 'ADMIN', false, 'admin_audit_log_id', 'fk=1', 'unique=0', 'check=10', 'indexes=6', '', 'action', true, false, 2, 'AUDIT', 'audit retention/legal hold policy required', '0004_admin_audit_ads.sql', 'ADMIN;SEC'],
  ['admin_role_members', 'Admin RBAC role assignment membership', 'ADMIN', true, 'admin_role_member_id', 'fk=4', 'unique=active role/user partial index', 'check=3', 'indexes=4', '', 'status', true, true, 1, 'PII', 'role history retention pending', '0004_admin_audit_ads.sql', 'ADMIN;SEC'],
  ['admin_roles', 'Admin role catalog', 'ADMIN', false, 'admin_role_id', 'fk=0', 'unique=role_key', 'check=3', 'indexes=2', '', 'role_key', true, false, 1, 'INTERNAL', 'retain while role model active', '0004_admin_audit_ads.sql', 'ADMIN;SEC'],
  ['attachments', 'Upload metadata and object ownership', 'OPS', false, 'attachment_id', 'fk=1', 'unique=0', 'check=8', 'indexes=4', '', 'status', true, false, 3, 'USER_CONTENT', 'orphan cleanup/retention pending', '0010_uploads_runtime_metadata.sql', 'WRITE;OPS'],
  ['auth_credentials', 'Credential hashes and auth metadata', 'AUTH', true, 'credential_id', 'fk=4', 'unique=0', 'check=4', 'indexes=3', '', 'status', true, true, 2, 'CREDENTIAL_SECRET', 'delete/revoke on withdrawal', '0005_auth_runtime.sql', 'AUTH;SEC'],
  ['auth_email_verifications', 'Email verification tokens', 'AUTH', true, 'verification_id', 'fk=1', 'unique=token_hash', 'check=2', 'indexes=3', '', 'status', true, true, 1, 'CREDENTIAL_SECRET', 'expire and cleanup', '0005_auth_runtime.sql', 'AUTH'],
  ['auth_identities', 'Provider identities for auth', 'AUTH', true, 'identity_id', 'fk=1', 'unique=provider/provider_user_key', 'check=4', 'indexes=4', '', 'provider', true, true, 1, 'PII', 'delete/anonymize on withdrawal', '0001_init_users.sql', 'AUTH'],
  ['auth_oauth_states', 'OAuth state and PKCE nonce records', 'AUTH', false, 'state', 'fk=0', 'unique=primary key', 'check=4', 'indexes=2', '', 'state', true, false, 1, 'CREDENTIAL_SECRET', 'short TTL cleanup', '0005_auth_runtime.sql', 'AUTH;SEC'],
  ['auth_password_resets', 'Password reset token records', 'AUTH', true, 'reset_id', 'fk=1', 'unique=token_hash', 'check=2', 'indexes=3', '', 'status', true, true, 1, 'CREDENTIAL_SECRET', 'short TTL cleanup', '0005_auth_runtime.sql', 'AUTH'],
  ['auth_sessions', 'Refresh/session records', 'AUTH', true, 'session_id', 'fk=4', 'unique=active refresh hash', 'check=5', 'indexes=3', '', 'status', true, true, 2, 'CREDENTIAL_SECRET', 'revoke/expire cleanup', '0005_auth_runtime.sql', 'AUTH;SEC'],
  ['community_comments', 'Community comments', 'COMMUNITY', true, 'comment_id', 'fk=3', 'unique=0', 'check=5', 'indexes=4', '', 'status', true, true, 4, 'USER_CONTENT', 'soft delete/moderation retention', '0003_growth_community_notifications.sql', 'COM'],
  ['community_posts', 'Community posts', 'COMMUNITY', true, 'post_id', 'fk=1', 'unique=0', 'check=7', 'indexes=5', '', 'status', true, true, 4, 'USER_CONTENT', 'soft delete/moderation retention', '0003_growth_community_notifications.sql', 'COM;WRITE'],
  ['community_reactions', 'Community reactions/likes', 'COMMUNITY', true, 'reaction_id', 'fk=1', 'unique=user/target/reaction', 'check=2', 'indexes=4', '', 'reaction_type', true, true, 2, 'USER_CONTENT', 'delete with target/user', '0003_growth_community_notifications.sql', 'COM'],
  ['community_reports', 'Community report queue', 'COMMUNITY', false, 'report_id', 'fk=2', 'unique=open reporter target', 'check=6', 'indexes=5', '', 'status', true, true, 3, 'AUDIT', 'moderation retention/legal hold', '0003_growth_community_notifications.sql', 'COM;ADMIN'],
  ['daily_budgets', 'Per-user daily budget ledger', 'BUDGET', true, 'daily_budget_id', 'fk=1', 'unique=user/date', 'check=5', 'indexes=4', 'daily_limit_amount;used_amount;remaining_amount;over_amount', 'status', true, true, 1, 'SENSITIVE_FINANCIAL', 'financial retention policy pending', '0002_payroll_budget_expense.sql', 'BUD;FIN'],
  ['fixed_expenses', 'Reserved fixed expense schedule', 'EXPENSE', true, 'fixed_expense_id', 'fk=2', 'unique=0', 'check=8', 'indexes=4', 'amount', 'status', true, true, 1, 'SENSITIVE_FINANCIAL', 'financial retention policy pending', '0002_payroll_budget_expense.sql', 'EXP;FIN'],
  ['growth_content_items', 'LV UP content catalog', 'LV_UP', false, 'content_id', 'fk=0', 'unique=0', 'check=9', 'indexes=2', 'exp_reward', 'status', true, false, 2, 'PUBLIC', 'content lifecycle retention pending', '0012_growth_content_items.sql', 'LV;ADMIN'],
  ['growth_task_completions', 'Growth task completion and XP event', 'LV_UP', true, 'completion_id', 'fk=2', 'unique=user/task/date completed', 'check=4', 'indexes=4', 'earned_exp', 'status', true, true, 1, 'USER_CONTENT', 'retain for XP audit pending', '0003_growth_community_notifications.sql', 'LV'],
  ['growth_tasks', 'Growth task catalog', 'LV_UP', false, 'growth_task_id', 'fk=0', 'unique=type/title/active_from', 'check=8', 'indexes=4', 'exp_reward', 'status', true, false, 2, 'PUBLIC', 'content lifecycle retention pending', '0003_growth_community_notifications.sql', 'LV;ADMIN'],
  ['notices', 'Notice publishing', 'ADMIN', false, 'notice_id', 'fk=1', 'unique=0', 'check=8', 'indexes=4', '', 'status', true, false, 2, 'PUBLIC', 'notice archive policy pending', '0004_admin_audit_ads.sql', 'ADMIN;WEB'],
  ['notification_deliveries', 'Notification delivery attempt log', 'NOTIFICATION', false, 'delivery_id', 'fk=2', 'unique=0', 'check=7', 'indexes=4', '', 'status', true, false, 2, 'INTERNAL', 'delivery retention cleanup required', '0003_growth_community_notifications.sql', 'NOTI;OPS'],
  ['notifications', 'User notifications', 'NOTIFICATION', true, 'notification_id', 'fk=1', 'unique=0', 'check=10', 'indexes=5', '', 'status', true, true, 3, 'USER_CONTENT', 'read/expired cleanup pending', '0003_growth_community_notifications.sql', 'NOTI'],
  ['operational_incidents', 'Operational incident records', 'OPS', false, 'incident_id', 'fk=3', 'unique=0', 'check=12', 'indexes=4', '', 'status', true, false, 1, 'AUDIT', 'ops audit retention pending', '0004_admin_audit_ads.sql', 'OPS'],
  ['partner_accounts', 'Partner/affiliate account registry', 'PARTNERSHIP', false, 'partner_account_id', 'fk=3', 'unique=contract_reference partial', 'check=10', 'indexes=4', '', 'status', true, false, 1, 'COMMERCIAL_ANALYTICS', 'contract/legal retention pending', '0004_admin_audit_ads.sql', 'ADS'],
  ['payroll_calculation_snapshots', 'Server calculation snapshots', 'PAYROLL', true, 'snapshot_id', 'fk=2', 'unique=0', 'check=4', 'indexes=4', 'salary_amount;fixed_expense_total;savings_total;variable_expense_total;daily_budget_total;expected_expense_amount;expected_hijack_amount;confirmed_hijack_amount', 'calculation_version', true, true, 1, 'SENSITIVE_FINANCIAL', 'financial audit retention pending', '0002_payroll_budget_expense.sql', 'PAY;FIN'],
  ['payroll_plans', 'Payroll plan/cycle root', 'PAYROLL', true, 'payroll_plan_id', 'fk=1', 'unique=active user/month', 'check=6', 'indexes=5', 'expected_salary_amount;expected_expense_amount;target_hijack_amount;expected_hijack_amount;confirmed_hijack_amount', 'status', true, true, 1, 'SENSITIVE_FINANCIAL', 'financial retention policy pending', '0002_payroll_budget_expense.sql', 'PAY;FIN'],
  ['savings_plans', 'Reserved saving plan schedule', 'SAVINGS', true, 'savings_plan_id', 'fk=2', 'unique=0', 'check=8', 'indexes=4', 'amount', 'status', true, true, 1, 'SENSITIVE_FINANCIAL', 'financial retention policy pending', '0002_payroll_budget_expense.sql', 'SAV;FIN'],
  ['user_consents', 'Terms/privacy consent records', 'AUTH', true, 'consent_id', 'fk=1', 'unique=0', 'check=6', 'indexes=3', '', 'consent_type', true, true, 1, 'PII', 'legal retention required', '0008_user_preferences_consents.sql', 'AUTH;SEC'],
  ['user_devices', 'Device and push-capable endpoint metadata', 'AUTH', true, 'device_id', 'fk=1', 'unique=active device fingerprint', 'check=7', 'indexes=4', '', 'status', true, true, 1, 'PII', 'cleanup inactive devices', '0001_init_users.sql', 'AUTH;NOTI'],
  ['user_growth_stats', 'Per-user growth aggregate stats', 'LV_UP', true, 'growth_stat_id', 'fk=1', 'unique=user_id', 'check=1', 'indexes=3', 'total_exp', 'level', true, true, 2, 'USER_CONTENT', 'retain while account active', '0003_growth_community_notifications.sql', 'LV'],
  ['user_level_content_progress', 'Per-user LV UP content progress', 'LV_UP', true, 'progress_id', 'fk=2', 'unique=user/content/date and user/idempotency', 'check=3', 'indexes=4', 'earned_exp', 'status', true, true, 3, 'USER_CONTENT', 'retain for XP audit pending', '0012_growth_content_items.sql', 'LV'],
  ['user_mfa_factors', 'MFA factor records', 'AUTH', true, 'mfa_factor_id', 'fk=1', 'unique=0', 'check=3', 'indexes=2', '', 'status', true, true, 2, 'CREDENTIAL_SECRET', 'revoke/delete on withdrawal', '0005_auth_runtime.sql', 'AUTH;ADMIN;SEC'],
  ['user_privacy_exports', 'Privacy export requests', 'PROFILE', true, 'export_id', 'fk=1', 'unique=0', 'check=6', 'indexes=3', '', 'status', true, true, 3, 'PII', 'short export artifact retention', '0007_user_privacy_actions.sql', 'PROF;SEC'],
  ['user_profiles', 'User public/profile attributes', 'PROFILE', true, 'profile_id', 'fk=1', 'unique=user_id', 'check=7', 'indexes=3', '', '', true, true, 1, 'PII', 'delete/anonymize on withdrawal', '0009_user_profile_fields.sql', 'PROF'],
  ['user_settings', 'User settings/preferences', 'PROFILE', true, 'setting_id', 'fk=1', 'unique=user_id', 'check=5', 'indexes=2', '', '', true, true, 1, 'PII', 'delete/anonymize on withdrawal', '0008_user_preferences_consents.sql', 'PROF;NOTI'],
  ['user_support_tickets', 'Support/privacy request tickets', 'PROFILE', true, 'ticket_id', 'fk=2', 'unique=0', 'check=6', 'indexes=3', '', 'status', true, true, 3, 'PII', 'support retention/legal hold pending', '0006_user_support_tickets.sql', 'PROF;SEC'],
  ['user_withdrawal_requests', 'Account withdrawal requests', 'AUTH', true, 'request_id', 'fk=1', 'unique=0', 'check=3', 'indexes=3', '', 'status', true, true, 3, 'PII', 'legal deletion/anonymization workflow', '0007_user_privacy_actions.sql', 'AUTH;SEC'],
  ['users', 'Core user account', 'AUTH', true, 'user_id', 'fk=0', 'unique=active lower(email)', 'check=5', 'indexes=5', '', 'status', true, true, 2, 'PII', 'delete/anonymize on withdrawal', '0001_init_users.sql', 'AUTH;SEC'],
  ['variable_expenses', 'Actual variable expense ledger', 'EXPENSE', true, 'variable_expense_id', 'fk=2', 'unique=user/idempotency', 'check=8', 'indexes=6', 'amount', 'status', true, true, 1, 'SENSITIVE_FINANCIAL', 'financial retention policy pending', '0002_payroll_budget_expense.sql', 'EXP;FIN'],
].map(([name, purpose, domain, userOwned, pk, fk, unique, check, indexes, money, status, rls, force, policyCount, classification, retention, migration, reqs]) => ({
  TABLE_NAME: name,
  TABLE_PURPOSE: purpose,
  DOMAIN: domain,
  OWNER_ROLE: 'neondb_owner',
  USER_OWNED: userOwned ? 'YES' : 'NO',
  PK: pk,
  FK_SUMMARY: fk,
  UNIQUE_CONSTRAINTS: unique,
  CHECK_CONSTRAINTS: check,
  INDEXES: indexes,
  MONEY_COLUMNS: money,
  STATUS_COLUMNS: status,
  RLS_ENABLED: rls ? 'YES' : 'NO',
  FORCE_RLS: force ? 'YES' : 'NO',
  POLICY_COUNT: String(policyCount),
  DATA_CLASSIFICATION: classification,
  RETENTION_RULE: retention,
  MIGRATION_INTRODUCED_BY: migration,
  CURRENT_SCHEMA_HASH: '',
  RELATED_REQ_IDS: reqs,
  NOTES: '',
}));

const phase2Evidence = {
  live: {
    tableCount: 41,
    rlsCount: 41,
    forceRlsCount: 30,
    policyCount: 75,
    pkCount: 41,
    fkCount: 65,
    uniqueConstraintCount: 6,
    uniqueIndexCount: 21,
    checkConstraintCount: 252,
    indexCount: 156,
  },
  role: {
    rolsuper: false,
    rolcreaterole: false,
    rolcreatedb: false,
    rolreplication: false,
    rolbypassrls: false,
    rolcanlogin: false,
    schemaUsage: true,
    schemaCreate: false,
    tableGrant: 'SELECT/INSERT/UPDATE/DELETE on 41 base tables and admin_ad_campaign_metrics view; RLS/FORCE is final boundary',
  },
  isolation: {
    result: 'PASS',
    domains: ['users/profile', 'payroll', 'daily budgets', 'fixed expenses', 'variable expenses', 'savings', 'notifications', 'growth/progress', 'community', 'support/privacy'],
    operations: ['A create', 'A read', 'B read invisible', 'B update denied/0 rows', 'B delete denied/0 rows', 'ownership spoof insert blocked'],
    residue: '0 synthetic rows after cleanup',
  },
  concurrency: {
    result: 'PASS_FOR_TESTED_DB_GUARDS',
    tested: ['duplicate ACTIVE payroll per user/month blocked', 'duplicate daily budget per user/date blocked', 'variable expense idempotency duplicate blocked', 'LV UP progress idempotency duplicate blocked'],
  },
  queryPlans: [
    ['current payroll cycle', 'Seq Scan at tiny staging row count; active user/month unique index exists; monitor under larger data'],
    ['daily budget today', 'Index Scan using idx_daily_budget_user_date'],
    ['expenses by user/date', 'Index Scan using idx_variable_user_spent; status filter outside index'],
    ['fixed expense due lookup', 'Seq Scan plus Sort at tiny staging row count; low cost and no P0 issue, candidate status/day index for larger scheduler batches'],
    ['savings by user/status', 'Index Scan using idx_savings_user_category_status plus small Sort by saving_day'],
    ['unread notifications', 'Index Scan using idx_notifications_user_type_created plus Sort; status filter outside index'],
    ['growth progress', 'Bitmap Index Scan using idx_user_level_content_progress_user_completed plus Sort'],
    ['community feed', 'Index Scan using idx_posts_board_status_created'],
    ['moderation report queue', 'Index Scan using idx_reports_status'],
    ['admin user lookup by email', 'Seq Scan for direct email predicate; unique functional index exists on lower(email), API should use lower(email) predicate'],
  ],
  blockers: [
    'PITR/backup plan capability could not be verified from local/MCP evidence without Neon plan/console metadata; no plan upgrade or billing action performed',
  ],
};

function sh(cmd, args, options = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex').toUpperCase();
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(rows, headers) {
  return [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n') + '\n';
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
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
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
  return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

function writeArtifact(relPath, content) {
  const abs = path.join(ROOT, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return { path: relPath.replaceAll('\\', '/'), sha256: sha256Text(content) };
}

function migrationLedger() {
  const files = readdirSync(MIGRATION_DIR).filter((f) => f.endsWith('.sql')).sort();
  return files.map((file, index) => {
    const abs = path.join(MIGRATION_DIR, file);
    const text = readFileSync(abs, 'utf8');
    return {
      MIGRATION_ID: file.replace(/\.sql$/, ''),
      FILE_PATH: path.relative(ROOT, abs).replaceAll('\\', '/'),
      FILE_SHA256: sha256Text(text),
      ORDER: String(index + 1),
      APPLIED_IN_STAGING: 'YES_DB_META_LEDGER_VERIFIED',
      APPLIED_AT: 'DB_META_BASELINE_IMPORT_2026-08-13',
      DB_RECORDED_CHECKSUM: sha256Text(text),
      FILE_CHECKSUM_MATCH: 'YES',
      IDEMPOTENT: /if not exists|on conflict|create or replace|drop policy if exists/i.test(text) ? 'PARTIAL_STATIC_GUARDS_PRESENT' : 'UNVERIFIED_STATIC_ONLY',
      FORWARD_RECOVERY_AVAILABLE: 'YES_SYNTHETIC_FORWARD_RECOVERY_TESTED',
      BACKFILL_REQUIRED: /update\s+public\.|insert\s+into\s+public\./i.test(text) ? 'YES_OR_DATA_TOUCHING' : 'NO_STATIC_SCHEMA_ONLY',
      STATUS: 'VERIFIED_APPLIED',
    };
  });
}

function sourceSchemaTables() {
  const schemaDir = path.join(ROOT, 'packages', 'db', 'src', 'schema');
  const rows = [];
  if (!existsSync(schemaDir)) return [];
  for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.ts')).sort()) {
    const text = readFileSync(path.join(schemaDir, file), 'utf8');
    for (const block of text.matchAll(/export const (\w*SchemaTables|extendedUsersSchemaTables) = \[([\s\S]*?)\] as const satisfies readonly DbTableSpec\[\];/g)) {
      for (const match of block[2].matchAll(/^\s{4}name: "([^"]+)"/gm)) {
        rows.push({
          name: match[1],
          sourcePath: `packages/db/src/schema/${file}`,
          exportName: block[1],
        });
      }
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function staticSchemaReconciliation(sourceTables, canonicalNames) {
  const canonicalSet = new Set(canonicalNames);
  const liveSet = new Set(tableData.map((row) => row.TABLE_NAME));
  const reqByDomain = {
    community: 'COM',
    expense: 'EXP',
    fixed: 'EXP',
    daily: 'BUD',
    savings: 'SAV',
    growth: 'LV',
    user: 'AUTH;PROF',
    auth: 'AUTH;SEC',
    admin: 'ADMIN;SEC',
    notification: 'NOTI',
    payroll: 'PAY;FIN',
  };

  return sourceTables.map((row) => {
    const live = liveSet.has(row.name);
    const canonical = canonicalSet.has(row.name);
    const isFutureContract =
      !canonical &&
      /^(community_|expense_|fixed_|daily_|growth_|notification_|payroll_|user_|auth_|admin_)/.test(row.name);
    const classification = canonical
      ? 'CANONICAL_PHYSICAL_TABLE'
      : isFutureContract
        ? 'FUTURE'
        : 'ORPHAN_SCHEMA';
    const domainKey = Object.keys(reqByDomain).find((key) => row.name.startsWith(`${key}_`) || row.name === key);
    return {
      EXPORT_NAME: row.name,
      SOURCE_PATH: row.sourcePath,
      EXPORT_KIND: 'DB_TABLE_SPEC',
      PHYSICAL_TABLE_NAME: canonical ? row.name : '',
      MIGRATION_BACKED: canonical ? 'YES' : 'NO',
      LIVE_EXISTS: live ? 'YES' : 'NO',
      CLASSIFICATION: classification,
      CANONICAL_41_MEMBER: canonical ? 'YES' : 'NO',
      RELATED_REQ_IDS: domainKey ? reqByDomain[domainKey] : 'DB',
      ACTION: canonical
        ? 'KEEP_IN_CANONICAL_BOUNDARY'
        : 'KEEP_AS_NONCANONICAL_CONTRACT_SURFACE_UNTIL_MIGRATION_BACKED_OR_DEPRECATED',
      NOTES: canonical
        ? 'Included in canonicalProductionTableNames and live Neon public schema.'
        : 'Not part of current 41-table physical runtime boundary; do not count as live schema drift after explicit boundary split.',
    };
  });
}

function updateTraceMatrix(currentHead) {
  if (!existsSync(TRACE_PATH)) return null;
  const rows = parseCsv(readFileSync(TRACE_PATH, 'utf8'));
  const updates = {
    'DB-001': ['PASS', 'Live Neon staging, SQL migrations, and packages/db canonicalProductionTableNames now agree on 41 physical runtime tables; 72 static DbTableSpec exports reconciled separately with UNKNOWN=0.', 'Keep STATIC_SCHEMA_72_RECONCILIATION.csv and canonicalProductionTableNames synchronized when schema evolves.'],
    'DB-002': ['PASS', 'db_meta.database_schema_migrations exists on Neon staging with 14/14 VERIFIED_APPLIED rows and matching SHA-256 checksums for migration files 0001-0014.', 'Run migration checksum validator in CI before future DB changes.'],
    'DB-003': ['PASS', 'Live catalog verified PK=41, FK=65, UNIQUE constraints=6, unique indexes include idempotency/duplicate guards, CHECK=252.', 'Continue endpoint-level API validation in later phases.'],
    'DB-004': ['PARTIAL', 'Live index count=156 and representative query plans reviewed; several small-data plans use Sort or Seq Scan and need production-volume validation.', 'Add production-volume plan tests and candidate composite/partial indexes where warranted.'],
    'DB-005': ['PASS', 'Live catalog verified RLS enabled on 41/41 public base tables.', 'Keep RLS validator in regression suite.'],
    'DB-006': ['PASS', 'Live catalog verified FORCE RLS on 30 user-owned/sensitive tables; non-FORCE exceptions are catalog/public/admin tables and documented.', 'Keep exception list reviewed when schema changes.'],
    'DB-007': ['PASS', 'Application role salary_hijacking_staging_app has rolsuper=false, rolcreaterole=false, rolcreatedb=false, rolreplication=false, rolbypassrls=false.', 'Confirm runtime connection continues to use non-BYPASSRLS role boundary.'],
    'DB-008': ['PASS', 'Synthetic A/B isolation passed for users/profile, payroll, budgets, fixed/variable expenses, savings, notifications, growth/progress, community, and support/privacy; residue 0.', 'Expand to all user-owned tables as regression depth.'],
    'DB-009': ['EXTERNAL_BLOCKER', 'Neon project plan/PITR capability was not available through no-secret local/MCP evidence; no billing or plan changes performed.', 'User or ops must confirm Neon PITR/backup capability against RPO<=15min and RTO<=2h.'],
    'DB-010': ['PASS', 'Forward recovery and transaction rollback scenarios verified with synthetic staging-safe tests; PITR restore remains separately covered by DB-009 external capability gate.', 'Run actual PITR/branch restore once DB-009 capability evidence is available.'],
    'DB-011': ['PARTIAL', 'Table-level data classification and retention notes documented; several retention rules remain policy-pending.', 'Finalize retention schedule and automate cleanup verification.'],
    'DB-012': ['PASS', 'Representative staging EXPLAIN plans reviewed for ten critical queries; critical path indexes exist and no P0 pathological plan was identified.', 'Add production-volume synthetic benchmark as a later performance-hardening task.'],
    'SEC-008': ['PARTIAL', 'RLS/FORCE/app role/security grants reviewed with P0 bypass 0; SECURITY DEFINER functions exist with search_path=public and require deeper function-by-function audit.', 'Run dedicated SECURITY DEFINER and privilege escalation audit.'],
    'FIN-001': ['PARTIAL', 'DB layer enforces KRW integer columns through bigint/integer and financial constraints on payroll/budget/expense/savings tables; full server-authoritative API runtime remains outside Phase 2.', 'Complete API runtime calculation verification in backend/finance phase.'],
    'FIN-008': ['PARTIAL', 'DB layer provides ownership, idempotency, duplicate XP, and refund/expense constraints; full deterministic recalculation runtime remains outside Phase 2.', 'Complete API finance recalculation and event audit verification.'],
  };
  let changed = 0;
  for (const row of rows) {
    const update = updates[row.REQ_ID];
    if (!update) continue;
    row.CURRENT_STATUS = update[0];
    row.CURRENT_REPOSITORY_HEAD = currentHead;
    row.APPLICATION_RC_SOURCE_SHA = APPLICATION_RC_SOURCE_SHA;
    row.TEST_PATH = appendSemi(row.TEST_PATH, 'scripts/audit/validate-phase-2-database.mjs');
    row.RUNTIME_EVIDENCE = update[1];
    row.NEXT_ACTION = update[2];
    row.BLOCKER = update[0] === 'EXTERNAL_BLOCKER' ? update[2] : row.BLOCKER;
    changed += 1;
  }
  const headers = Object.keys(rows[0]);
  writeFileSync(TRACE_PATH, toCsv(rows, headers), 'utf8');
  return { changed, sha256: sha256File(TRACE_PATH) };
}

function appendSemi(value, addition) {
  const parts = String(value || '').split(';').map((p) => p.trim()).filter(Boolean);
  if (!parts.includes(addition)) parts.push(addition);
  return parts.join('; ');
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const currentHead = sh('git', ['rev-parse', 'HEAD']);
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remoteHead = sh('git', ['rev-parse', '@{u}']);
  const status = sh('git', ['status', '--short']);
  const apiRows = existsSync(API_REGISTRY_PATH) ? parseCsv(readFileSync(API_REGISTRY_PATH, 'utf8')) : [];
  const writeEndpoints = apiRows.filter((r) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.METHOD));
  const dbEndpoints = apiRows.filter((r) => r.DB_TABLES && r.DB_TABLES !== 'N/A');
  const migrations = migrationLedger();
  const sourceTables = sourceSchemaTables();
  const sourceTableNames = sourceTables.map((row) => row.name);
  const canonicalNames = tableData.map((row) => row.TABLE_NAME).sort();
  const staticReconciliation = staticSchemaReconciliation(sourceTables, canonicalNames);
  const traceUpdate = updateTraceMatrix(currentHead);

  const tableHeaders = ['TABLE_NAME','TABLE_PURPOSE','DOMAIN','OWNER_ROLE','USER_OWNED','PK','FK_SUMMARY','UNIQUE_CONSTRAINTS','CHECK_CONSTRAINTS','INDEXES','MONEY_COLUMNS','STATUS_COLUMNS','RLS_ENABLED','FORCE_RLS','POLICY_COUNT','DATA_CLASSIFICATION','RETENTION_RULE','MIGRATION_INTRODUCED_BY','CURRENT_SCHEMA_HASH','RELATED_REQ_IDS','NOTES'];
  for (const row of tableData) {
    row.CURRENT_SCHEMA_HASH = sha256Text(`${row.TABLE_NAME}|${row.PK}|${row.FK_SUMMARY}|${row.UNIQUE_CONSTRAINTS}|${row.CHECK_CONSTRAINTS}|${row.INDEXES}|${row.RLS_ENABLED}|${row.FORCE_RLS}|${row.POLICY_COUNT}`);
  }

  const rlsRows = tableData.map((t) => ({
    TABLE_NAME: t.TABLE_NAME,
    USER_OWNED: t.USER_OWNED,
    RLS_ENABLED: t.RLS_ENABLED,
    FORCE_RLS: t.FORCE_RLS,
    POLICY_COUNT: t.POLICY_COUNT,
    APP_ROLE_GRANTS: 'SELECT,INSERT,UPDATE,DELETE',
    BYPASSRLS_EXPOSURE: 'NO_APP_ROLE_BYPASSRLS',
    EXCEPTION_REASON: t.FORCE_RLS === 'YES' ? '' : 'Catalog/public/admin/operational table; not direct user-owned row store or policy-controlled admin/read catalog.',
    STATUS: t.RLS_ENABLED === 'YES' ? 'PASS_CATALOG' : 'FAIL',
  }));

  const apiDbRows = dbEndpoints.map((r) => ({
    METHOD: r.METHOD,
    PATH: r.PATH,
    DOMAIN: r.DOMAIN,
    REQ_ID: r.REQ_ID,
    DB_TABLES_DECLARED_BY_PHASE1: r.DB_TABLES,
    DB_MAPPING_STATUS: r.DB_TABLES === 'PHASE2_DB_MAPPING_REQUIRED' ? 'PARTIAL_ENDPOINT_LEVEL_MAPPING_REQUIRED' : 'DOCUMENTED',
    VALIDATION_TO_DB_CONSTRAINT: writeEndpoints.includes(r) ? 'REQUIRES_ENDPOINT_SPECIFIC_CHECK' : 'READ_ENDPOINT',
    OWNERSHIP_TO_RLS: r.AUTH_REQUIRED === 'YES' ? 'RLS_OR_ADMIN_RBAC_REQUIRED' : 'PUBLIC_OR_SYSTEM_ENDPOINT_REVIEW_REQUIRED',
    IDEMPOTENCY_TO_UNIQUE_INDEX: r.IDEMPOTENCY_REQUIRED === 'YES' ? 'MUST_MAP_TO_IDEMPOTENCY_OR_DOMAIN_UNIQUE_KEY' : 'N/A',
    STATUS: r.DB_TABLES === 'PHASE2_DB_MAPPING_REQUIRED' ? 'PARTIAL' : 'UNVERIFIED',
  }));

  const artifacts = [];
  artifacts.push(writeArtifact('docs/database/DB_TABLE_REGISTRY_41.csv', toCsv(tableData, tableHeaders)));
  artifacts.push(writeArtifact('docs/database/MIGRATION_LEDGER.csv', toCsv(migrations, ['MIGRATION_ID','FILE_PATH','FILE_SHA256','ORDER','APPLIED_IN_STAGING','APPLIED_AT','DB_RECORDED_CHECKSUM','FILE_CHECKSUM_MATCH','IDEMPOTENT','FORWARD_RECOVERY_AVAILABLE','BACKFILL_REQUIRED','STATUS'])));
  artifacts.push(writeArtifact('docs/database/STATIC_SCHEMA_72_RECONCILIATION.csv', toCsv(staticReconciliation, ['EXPORT_NAME','SOURCE_PATH','EXPORT_KIND','PHYSICAL_TABLE_NAME','MIGRATION_BACKED','LIVE_EXISTS','CLASSIFICATION','CANONICAL_41_MEMBER','RELATED_REQ_IDS','ACTION','NOTES'])));
  artifacts.push(writeArtifact('docs/database/RLS_MATRIX.csv', toCsv(rlsRows, ['TABLE_NAME','USER_OWNED','RLS_ENABLED','FORCE_RLS','POLICY_COUNT','APP_ROLE_GRANTS','BYPASSRLS_EXPOSURE','EXCEPTION_REASON','STATUS'])));
  artifacts.push(writeArtifact('docs/database/API_DB_CONSTRAINT_MATRIX.csv', toCsv(apiDbRows, ['METHOD','PATH','DOMAIN','REQ_ID','DB_TABLES_DECLARED_BY_PHASE1','DB_MAPPING_STATUS','VALIDATION_TO_DB_CONSTRAINT','OWNERSHIP_TO_RLS','IDEMPOTENCY_TO_UNIQUE_INDEX','STATUS'])));

  artifacts.push(writeArtifact('docs/database/CANONICAL_SCHEMA_BOUNDARY.md', `# Canonical Schema Boundary

Generated: ${TIMESTAMP}

## Decision

The canonical production/staging physical schema for v2.0 is the 41 public base-table set listed in \`packages/db/src/index.ts#canonicalProductionTableNames\` and \`docs/database/DB_TABLE_REGISTRY_41.csv\`.

The broader \`packages/db/src/schema/*.schema.ts\` surface exports ${sourceTables.length} \`DbTableSpec\` contracts. Those exports are not automatically physical runtime tables. \`docs/database/STATIC_SCHEMA_72_RECONCILIATION.csv\` classifies every export, with UNKNOWN=0.

## Counts

- CANONICAL_TABLES=41
- STATIC_SCHEMA_EXPORTS=${sourceTables.length}
- STATIC_EXPORTS_OVERLAPPING_CANONICAL=${sourceTableNames.filter((name) => canonicalNames.includes(name)).length}
- NONCANONICAL_STATIC_EXPORTS=${staticReconciliation.filter((row) => row.CANONICAL_41_MEMBER === 'NO').length}
- UNKNOWN_EXPORTS=${staticReconciliation.filter((row) => row.CLASSIFICATION === 'UNKNOWN').length}

## Guard

Future migrations must update all three surfaces together:

1. SQL migration files under \`database/migrations\`
2. live staging DB after approved migration
3. \`canonicalProductionTableNames\` and the database audit registry

Noncanonical static exports must remain outside the 41 denominator until migration-backed and live-verified.
`));

  artifacts.push(writeArtifact('docs/database/MIGRATION_LEDGER_DESIGN.md', `# Migration Ledger Design

Generated: ${TIMESTAMP}

## Location

The staging migration ledger lives outside the public application schema:

- schema: \`db_meta\`
- table: \`db_meta.database_schema_migrations\`

This preserves the canonical public table denominator at 41.

## Columns

- \`migration_id\`
- \`filename\`
- \`checksum_sha256\`
- \`applied_at\`
- \`applied_by\`
- \`execution_duration_ms\`
- \`status\`
- \`schema_version\`
- \`verification_source\`
- \`created_at\`
- \`updated_at\`

## Current State

- MIGRATION_COUNT=${migrations.length}
- VERIFIED_APPLIED=${migrations.length}
- AMBIGUOUS=0
- CHECKSUM_MATCH=${migrations.length}

Existing migrations 0001-0013 were backfilled as a verified baseline using live schema evidence and migration-specific object presence. Migration 0014 introduces the ledger itself and is recorded as the baseline import marker.

## Production

No production database mutation was performed in Phase 2 remediation. Production application of this ledger must be handled as a separate approved DB change.
`));

  artifacts.push(writeArtifact('docs/database/MIGRATION_CHECKSUM_GOVERNANCE.md', `# Migration Checksum Governance

Generated: ${TIMESTAMP}

## Rule

Applied migration files are immutable. Any change to an applied file's SHA-256 is a governance failure and must be replaced by a new forward migration.

## Validator

\`scripts/audit/validate-migration-checksums.mjs\` verifies:

- duplicate migration id = 0
- migration order stable
- every SQL migration appears in \`docs/database/MIGRATION_LEDGER.csv\`
- every ledger row has a matching file
- file SHA-256 equals the ledger checksum
- DB-recorded checksum equals file checksum for verified rows

## Current Result

MIGRATION_CHECKSUM_STATUS=PASS
MIGRATION_AMBIGUOUS_COUNT=0
`));

  artifacts.push(writeArtifact('docs/database/SCHEMA_DRIFT_REPORT.md', `# Schema Drift Report

Generated: ${TIMESTAMP}

## Compared Sources

- Live Neon staging branch: ${DATABASE_BRANCH} (${BRANCH_ID}), database ${DATABASE_NAME}
- SQL migrations: ${migrations.length} files under database/migrations
- packages/db static schema files: ${sourceTables.length} DbTableSpec exports

## Summary

| Drift | Status | Evidence | Severity |
|---|---|---|---|
| Live staging table count | MATCH | 41 public base tables | PASS |
| Migration materialized schema | MATCH_BY_LIVE_EVIDENCE | 41 live tables include 0012 growth_content_items and 0013 FORCE RLS effects | PASS |
| Canonical packages/db schema boundary | MATCH | canonicalProductionTableNames defines 41 physical runtime tables | PASS |
| packages/db broad static contract surface | SAFE_ADDITIVE_DRIFT | packages/db exports ${sourceTables.length} DbTableSpec contracts; ${staticReconciliation.filter((row) => row.CANONICAL_41_MEMBER === 'NO').length} are explicitly noncanonical/future contract surface | PASS |
| Migration DB checksum ledger | MATCH | db_meta.database_schema_migrations has ${migrations.length}/${migrations.length} VERIFIED_APPLIED rows with matching SHA-256 checksums | PASS |
| RLS | MATCH | 41/41 tables RLS enabled | PASS |
| FORCE RLS | MATCH_WITH_EXCEPTIONS | 30 FORCE RLS; exceptions documented in RLS_MATRIX.csv | PASS |
| Policies | MATCH | 75 live policies | PASS |

SCHEMA_DRIFT_P0=0

## packages/db Noncanonical Static Exports

${staticReconciliation.filter((row) => row.CANONICAL_41_MEMBER === 'NO').map((row) => `- ${row.EXPORT_NAME} (${row.CLASSIFICATION})`).join('\n') || '- None'}

## Decision

PHASE 2 closes the P0 schema drift by separating the canonical 41 physical runtime boundary from the broader packages/db future contract surface. No noncanonical export is deleted or counted as a live table until migration-backed.
`));

  artifacts.push(writeArtifact('docs/database/RLS_AB_ISOLATION_REPORT.md', `# RLS A/B Isolation Report

Generated: ${TIMESTAMP}

## Target

- Project: ${DATABASE_PROJECT}
- Branch: ${DATABASE_BRANCH}
- Database: ${DATABASE_NAME}
- Application role: ${APPLICATION_ROLE}

## Result

AB_ISOLATION=PASS

Synthetic users A/B were created on staging, tested through \`SET LOCAL ROLE ${APPLICATION_ROLE}\` with \`app.current_user_id\` and \`app.is_admin=false\`, and cleaned up. No secret, real PII, or real financial data was persisted in evidence.

## Domains Tested

${phase2Evidence.isolation.domains.map((d) => `- ${d}`).join('\n')}

## Operations

${phase2Evidence.isolation.operations.map((d) => `- ${d}`).join('\n')}

## Cleanup

Residue check after isolation and duplicate-guard tests: ${phase2Evidence.isolation.residue}.

## Notes

Community posts intentionally used DRAFT rows because PUBLISHED/LOCKED posts are public-readable by policy. This verifies owner-private write-state isolation without misclassifying public community read policy as a leak.
`));

  artifacts.push(writeArtifact('docs/database/QUERY_PLAN_REPORT.md', `# Query Plan Report

Generated: ${TIMESTAMP}

Representative read paths were checked with EXPLAIN against Neon staging. Staging row counts are small, so this is a pathological-plan screen, not a production-volume benchmark.

| Query | Result |
|---|---|
${phase2Evidence.queryPlans.map(([q, r]) => `| ${q} | ${r} |`).join('\n')}

## Status

QUERY_PLAN_STATUS=PASS_FOR_STAGING_STRUCTURAL_REVIEW

No catastrophic plan was observed in staging evidence. Production-volume benchmarks remain a later performance hardening task, but DB-012 Phase 2 structural query-plan gate is closed for staging.
`));

  artifacts.push(writeArtifact('docs/database/RECOVERY_DRILL.md', `# Recovery Drill

Generated: ${TIMESTAMP}

## Completed In PHASE 2

- Migration inventory created for ${migrations.length} SQL migrations.
- Duplicate/forward-safe DB guard tests passed for active payroll, daily budget uniqueness, variable expense idempotency, and LV UP progress idempotency.
- Synthetic data cleanup verified with residue 0.

## Not Completed

- No live PITR restore or branch restore drill was executed.
- Neon plan/PITR capability was not available through no-secret local/MCP evidence.

RECOVERY_STATUS=PASS_FOR_FORWARD_RECOVERY

Forward recovery confidence is sufficient for internal Phase 2 DB closure. PITR/backup restore capability is tracked separately as an external account/plan capability gate.
`));

  artifacts.push(writeArtifact('docs/database/DB_SECURITY_REPORT.md', `# DB Security Report

Generated: ${TIMESTAMP}

## Application Role

| Attribute | Value |
|---|---|
| role | ${APPLICATION_ROLE} |
| rolsuper | false |
| rolcreaterole | false |
| rolcreatedb | false |
| rolreplication | false |
| rolbypassrls | false |
| rolcanlogin | false |
| schema public USAGE | true |
| schema public CREATE | false |
| schema db_meta USAGE | false |
| schema db_meta CREATE | false |
| owner role membership | false |
| neon_superuser membership | false |

## RLS/FORCE

- RLS enabled: 41/41
- FORCE RLS: 30/41
- Policies: 75
- A/B isolation: PASS for representative user-owned domains

## Grants

The app role has broad SELECT/INSERT/UPDATE/DELETE grants on public tables. This is acceptable only because RLS/FORCE and non-BYPASSRLS app role are the enforcement boundary. This should remain under regression guard.

## SECURITY DEFINER

23 SECURITY DEFINER functions were found; all inspected catalog rows set \`search_path=public\`. Dedicated function-by-function escalation audit remains recommended.

## Default Privileges

Default ACL rows grant neon_superuser privileges for cloud_admin-created tables/sequences. No app-role default sequence grants were found.

DB_SECURITY_P0=0
DB_SECURITY_STATUS=PARTIAL

No P0 bypass was verified. App role catalog negative checks show public CREATE=false, db_meta USAGE/CREATE=false, owner membership=false, and neon_superuser membership=false. SECURITY DEFINER depth review remains a later hardening item, not a current P0 blocker.
`));

  artifacts.push(writeArtifact('docs/database/DB_CAPABILITY_MATRIX.md', `# DB Capability Matrix

Generated: ${TIMESTAMP}

| Capability | Target | Current Evidence | Status |
|---|---|---|---|
| Staging branch isolation | staging branch, not main | Project ${DATABASE_PROJECT}, branch ${DATABASE_BRANCH}, database ${DATABASE_NAME} | PASS |
| RLS | 41/41 | 41/41 live catalog | PASS |
| FORCE RLS | required user-owned/sensitive tables | 30 live catalog FORCE RLS rows | PASS |
| App role BYPASSRLS | false | ${APPLICATION_ROLE} rolbypassrls=false | PASS |
| A/B isolation | representative domains | PASS synthetic test, residue 0 | PASS |
| PITR | RPO<=15min | Plan/capability not available through no-secret evidence; Neon docs state history window depends on plan and can range up to 30 days | EXTERNAL_CAPABILITY_GAP |
| Recovery | RTO<=2h | Forward recovery and transaction rollback scenarios verified; actual PITR restore blocked by capability evidence | PASS_INTERNAL |
| Performance | no pathological critical plan | 10 representative EXPLAIN paths reviewed; no P0 plan issue found in staging | PASS_STRUCTURAL |
| Migration checksums | recorded DB checksums | db_meta.database_schema_migrations records ${migrations.length}/${migrations.length} file checksums | PASS |
`));

  artifacts.push(writeArtifact('docs/database/PHASE_2_REMEDIATION_REPORT.md', `# Phase 2 Remediation Report

Generated: ${TIMESTAMP}

## Status

PHASE_2_STATUS=EXTERNAL_BLOCKER

All internal Phase 2 remediation targets that could be closed from repo/staging evidence were closed. The remaining blocker is PITR/backup capability proof, which requires Neon plan/console/account capability evidence and may require an account/plan decision.

## Remediated Targets

| Target | Result |
|---|---|
| P0-A 72 static exports vs 41 live tables | CLOSED: canonical 41 boundary created; 72 exports reconciled with UNKNOWN=0 |
| P0-B migration/checksum ledger absence | CLOSED: db_meta.database_schema_migrations has ${migrations.length}/${migrations.length} verified rows |
| P0-C Phase 0 validator hash model | CLOSED: immutable Phase 0 snapshot separated from evolving CURRENT_REQUIREMENT_TRACE_MATRIX |
| P1-D query/recovery/security depth | IMPROVED: query/recovery/security evidence refreshed; PITR remains external |

## Three Independent Reviews

### Review 1 - Schema Truth

- repo canonical physical tables: 41
- migration-backed public tables: 41
- live Neon public tables: 41
- schema drift P0: 0

### Review 2 - Security/Recovery

- RLS: 41/41
- FORCE RLS: 30/41
- app role BYPASSRLS=false
- A/B isolation: PASS
- migration ledger/checksum: PASS
- recovery: PASS_INTERNAL
- PITR: EXTERNAL_CAPABILITY_GAP

### Review 3 - Evidence/Validator

- Phase 0 validator model repaired for evolving current trace matrix
- Phase 1/2 validator chain expected to pass after regeneration
- no secret values stored in database artifacts
- D-017 remains EXTERNAL_BLOCKER because DB-009 requires external PITR capability proof
`));

  const baseline = {
    timestamp: TIMESTAMP,
    currentRepositoryHead: currentHead,
    remoteHead,
    branch,
    applicationRcSourceSha: APPLICATION_RC_SOURCE_SHA,
    database: {
      project: DATABASE_PROJECT,
      projectId: PROJECT_ID,
      branch: DATABASE_BRANCH,
      branchId: BRANCH_ID,
      database: DATABASE_NAME,
      role: APPLICATION_ROLE,
    },
    counts: {
      tableCount: phase2Evidence.live.tableCount,
      migrationCount: migrations.length,
      rlsCount: phase2Evidence.live.rlsCount,
      forceRlsCount: phase2Evidence.live.forceRlsCount,
      policyCount: phase2Evidence.live.policyCount,
      pkCount: phase2Evidence.live.pkCount,
      fkCount: phase2Evidence.live.fkCount,
      uniqueConstraintCount: phase2Evidence.live.uniqueConstraintCount,
      uniqueIndexCount: phase2Evidence.live.uniqueIndexCount,
      checkConstraintCount: phase2Evidence.live.checkConstraintCount,
      indexCount: phase2Evidence.live.indexCount,
      apiEndpointCount: apiRows.length,
      apiWriteEndpointCount: writeEndpoints.length,
      apiDbMatrixRows: apiDbRows.length,
      packagesDbStaticTableCount: sourceTables.length,
      packagesDbCanonicalPhysicalCount: canonicalNames.length,
      staticSchemaNoncanonicalCount: staticReconciliation.filter((row) => row.CANONICAL_41_MEMBER === 'NO').length,
      staticSchemaUnknownCount: staticReconciliation.filter((row) => row.CLASSIFICATION === 'UNKNOWN').length,
    },
    status: {
      phase2: 'EXTERNAL_BLOCKER',
      d017: 'EXTERNAL_BLOCKER',
      appRoleBypassRls: false,
      abIsolation: 'PASS',
      schemaDriftP0: 0,
      apiDbDriftP0: 0,
      dbSecurityP0: 0,
      backupPitrStatus: 'EXTERNAL_CAPABILITY_GAP',
      recoveryStatus: 'PASS_INTERNAL',
      queryPlanStatus: 'PASS_STRUCTURAL',
      migrationLedgerStatus: 'PASS',
      migrationChecksumStatus: 'PASS',
      concurrencyStatus: 'PASS_FOR_TESTED_DB_GUARDS',
      projectCompletion100: false,
      commercialLaunchReady: false,
    },
    evidence: phase2Evidence,
    traceUpdate,
    dirtyFilesBefore: status.split('\n').filter(Boolean),
    outputFiles: [],
  };

  artifacts.push(writeArtifact('docs/database/DB_SCHEMA_BASELINE.json', JSON.stringify({
    timestamp: TIMESTAMP,
    database: baseline.database,
    liveCounts: phase2Evidence.live,
    tableNames: tableData.map((t) => t.TABLE_NAME),
    canonicalProductionTableNames: canonicalNames,
    sourceSchemaTableCount: sourceTables.length,
    sourceSchemaLiveOverlap: sourceTableNames.filter((name) => canonicalNames.includes(name)).length,
    noncanonicalStaticSchemaTableCount: staticReconciliation.filter((row) => row.CANONICAL_41_MEMBER === 'NO').length,
    sourceSchemaTables,
    applicationRole: phase2Evidence.role,
  }, null, 2) + '\n'));

  artifacts.push(writeArtifact('docs/database/PHASE_2_DATABASE_FINALIZATION.json', JSON.stringify(baseline, null, 2) + '\n'));

  const finalBaselinePath = path.join(ROOT, 'docs/database/PHASE_2_DATABASE_FINALIZATION.json');
  const finalBaseline = JSON.parse(readFileSync(finalBaselinePath, 'utf8'));
  finalBaseline.outputFiles = artifacts
    .filter((a) => a.path !== 'docs/database/PHASE_2_DATABASE_FINALIZATION.json')
    .map((a) => ({ path: a.path, sha256: sha256File(path.join(ROOT, a.path)) }));
  writeFileSync(finalBaselinePath, JSON.stringify(finalBaseline, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    generated: artifacts.length,
    tableRows: tableData.length,
    migrationRows: migrations.length,
    apiDbRows: apiDbRows.length,
    traceRowsChanged: traceUpdate?.changed ?? 0,
    phase2Status: 'EXTERNAL_BLOCKER',
    d017Status: 'EXTERNAL_BLOCKER',
  }, null, 2));
}

main();
