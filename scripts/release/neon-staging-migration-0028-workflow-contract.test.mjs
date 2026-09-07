#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath = ".github/workflows/neon-staging-migration-0028.yml";
const runnerPath = "scripts/release/neon-staging-migration-0028.mjs";
const migrationPath = "database/migrations/0028_community_final_taxonomy.sql";

const workflow = fs.readFileSync(workflowPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(workflow, /name:\s*neon-staging-migration-0028/u);
assert.match(workflow, /workflow_dispatch:/u);
assert.match(workflow, /migration_source_ref:/u);
assert.match(workflow, /environment:\s*\n\s+name:\s*staging/u);
assert.match(workflow, /STAGING_DATABASE_URL:\s*\$\{\{\s*secrets\.STAGING_DATABASE_URL\s*\}\}/u);
assert.match(workflow, /Checkout requested migration source/u);
assert.match(workflow, /neon-staging-connection-preflight\.mjs/u);
assert.match(workflow, /neon-staging-migration-0028\.mjs/u);
assert.match(workflow, /Upload no-secret migration 0028 evidence/u);
assert.doesNotMatch(workflow, /productionDatabaseModified:\s*true/u);

assert.match(runner, /0028_community_final_taxonomy/u);
assert.match(runner, /expected exactly 28 migration files/u);
assert.match(runner, /totalPostCountBefore/u);
assert.match(runner, /totalPostCountAfter/u);
assert.match(runner, /postDataLossCount:\s*0/u);
assert.match(runner, /postDuplicationCount:\s*0/u);
assert.match(runner, /unknownLegacyValues/u);
assert.match(runner, /GITHUB_ACTIONS_STAGING_MIGRATION_0028/u);
assert.match(runner, /secret values and raw data were not printed/u);

assert.match(migration, /CHECK \(board_type IN \('FREE', 'LEVEL_UP_PROOF', 'HOBBY'\)\)/u);
assert.match(migration, /'자유 게시판'/u);
assert.match(migration, /'레벨업 인증'/u);
assert.match(migration, /'취미 게시판'/u);
assert.match(migration, /Unknown legacy community_posts\.board_type/u);
assert.match(migration, /UPDATE public\.community_posts/u);
assert.doesNotMatch(migration, /DELETE FROM public\.community_posts/iu);

console.log("Neon staging migration 0028 workflow contract passed.");
