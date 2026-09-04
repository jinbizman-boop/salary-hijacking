#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath = ".github/workflows/neon-staging-api-database.yml";
const preflightPath = "scripts/release/neon-staging-connection-preflight.mjs";

const workflow = fs.readFileSync(workflowPath, "utf8");
const preflight = fs.readFileSync(preflightPath, "utf8");

assert.match(workflow, /name:\s*neon-staging-api-database/u);
assert.match(workflow, /workflow_dispatch:/u);
assert.match(workflow, /application_source_sha:/u);
assert.match(workflow, /environment:\s*\n\s+name:\s*staging/u);
assert.match(
  workflow,
  /STAGING_DATABASE_URL:\s*\$\{\{\s*secrets\.STAGING_DATABASE_URL\s*\}\}/u,
);
assert.doesNotMatch(
  workflow,
  /DATABASE_URL:\s*\$\{\{\s*secrets\.DATABASE_URL\s*\}\}/u,
);
assert.match(
  workflow,
  /printf '%s' "\$STAGING_DATABASE_URL" \| pnpm exec wrangler secret put DATABASE_URL --env staging --config wrangler\.toml/u,
);
assert.doesNotMatch(
  workflow,
  /wrangler secret put DATABASE_URL --env production/u,
);
assert.doesNotMatch(workflow, /wrangler deploy --env production/u);
assert.doesNotMatch(workflow, /api\.salaryhijacking\.com/u);
assert.match(workflow, /salary-hijacking-api-staging|--env staging/u);
assert.match(workflow, /collect-staging-authenticated-persistence-proof\.mjs/u);
assert.match(
  workflow,
  /APPLICATION_SOURCE_SHA:\s*\$\{\{\s*inputs\.application_source_sha \|\| github\.sha\s*\}\}/u,
);

const preflightIndex = workflow.indexOf(
  "Read-only Neon staging connection preflight",
);
const secretPutIndex = workflow.indexOf(
  "Sync staging database secret to Cloudflare API staging",
);
const deployIndex = workflow.indexOf("Deploy API staging Worker");
const persistenceIndex = workflow.indexOf(
  "Verify authenticated staging API persistence",
);

assert.ok(preflightIndex > -1, "preflight step missing");
assert.ok(
  secretPutIndex > preflightIndex,
  "secret put must run after preflight",
);
assert.ok(
  deployIndex > secretPutIndex,
  "staging deploy must run after secret put",
);
assert.ok(
  persistenceIndex > deployIndex,
  "authenticated persistence proof must run after staging deploy",
);

assert.match(preflight, /projectName:\s*"salary-hijacking"/u);
assert.match(preflight, /branchName:\s*"staging"/u);
assert.match(preflight, /databaseName:\s*"neondb"/u);
assert.match(preflight, /allowedEndpointIds/u);
assert.match(preflight, /blockedEndpointIds/u);
assert.doesNotMatch(preflight, /console\.log\([^)]*connectionString/u);
assert.doesNotMatch(preflight, /fs\.writeFileSync\([^)]*connectionString/u);

console.log("Neon staging API database workflow contract passed.");
