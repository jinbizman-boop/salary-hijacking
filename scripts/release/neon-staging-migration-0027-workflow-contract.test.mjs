#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath = ".github/workflows/neon-staging-migration-0027.yml";
const runnerPath = "scripts/release/neon-staging-migration-0027.mjs";
const workflow = fs.readFileSync(workflowPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");

assert.match(workflow, /name:\s*neon-staging-migration-0027/u);
assert.match(workflow, /workflow_dispatch:/u);
assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- codex\/payroll-reminder-launch-ready-100-20260714/u);
assert.match(workflow, /migration_source_ref:/u);
assert.match(
  workflow,
  /description:\s*"Branch, tag, or commit containing migration 0027 source"/u,
);
assert.match(workflow, /environment:\s*\n\s+name:\s*staging/u);
assert.match(
  workflow,
  /STAGING_DATABASE_URL:\s*\$\{\{\s*secrets\.STAGING_DATABASE_URL\s*\}\}/u,
);
assert.doesNotMatch(
  workflow,
  /DATABASE_URL:\s*\$\{\{\s*secrets\.DATABASE_URL\s*\}\}/u,
);
assert.doesNotMatch(workflow, /wrangler secret put/u);
assert.doesNotMatch(workflow, /wrangler deploy/u);
assert.doesNotMatch(workflow, /--env production/u);
assert.doesNotMatch(workflow, /api\.salaryhijacking\.com/u);
assert.match(
  workflow,
  /DEFAULT_MIGRATION_SOURCE_REF:\s*codex\/payroll-reminder-launch-ready-100-20260714/u,
);
assert.match(workflow, /Checkout requested migration source/u);
assert.match(workflow, /MIGRATION_SOURCE_REF:\s*\$\{\{\s*inputs\.migration_source_ref\s*\|\|\s*github\.sha\s*\}\}/u);
assert.match(workflow, /ref:\s*\$\{\{\s*env\.MIGRATION_SOURCE_REF\s*\}\}/u);
assert.match(workflow, /persist-credentials:\s*false/u);
assert.match(workflow, /neon-staging-connection-preflight\.mjs/u);
assert.match(workflow, /neon-staging-migration-0027\.mjs/u);
assert.match(workflow, /Upload no-secret migration 0027 evidence/u);

const contextIndex = workflow.indexOf("Validate staging-only migration context");
const preflightIndex = workflow.indexOf(
  "Read-only Neon staging connection preflight",
);
const applyIndex = workflow.indexOf("Apply and verify staging migration 0027");
assert.ok(contextIndex > -1, "staging-only context step missing");
assert.ok(preflightIndex > contextIndex, "preflight must follow context check");
assert.ok(applyIndex > preflightIndex, "migration apply must follow preflight");

assert.match(runner, /0027_android_launch_social_provider_contract/u);
assert.match(runner, /blockedEndpointIds/u);
assert.match(runner, /allowedEndpointIds/u);
assert.match(runner, /db_meta\.database_schema_migrations/u);
assert.match(runner, /auth_identities/u);
assert.match(runner, /auth_oauth_states/u);
assert.match(runner, /cleanupUnsupportedTransientOauthStates/u);
assert.match(runner, /expires_at <= now\(\)/u);
assert.match(runner, /consumed_at is not null/u);
assert.match(runner, /active unsupported OAuth state rows require reviewed operator cleanup/u);
assert.match(runner, /EMAIL_PASSWORD_GOOGLE_KAKAO_NAVER_ONLY/u);
assert.match(runner, /GOOGLE_KAKAO_NAVER_ONLY/u);
assert.match(runner, /salary_hijacking_staging_app/u);
assert.match(runner, /containsRawProviderTokenMaterial:\s*false/u);
assert.doesNotMatch(runner, /console\.log\([^)]*STAGING_DATABASE_URL/u);
assert.doesNotMatch(runner, /fs\.writeFileSync\([^)]*connectionString/u);
assert.doesNotMatch(runner, /productionMigration/u);

process.stdout.write(
  "Neon staging migration 0027 workflow contract passed.\n",
);
