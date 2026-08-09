import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const workflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "deploy-admin-staging.yml",
);
const wranglerPath = path.join(repoRoot, "apps", "admin", "wrangler.jsonc");

const workflow = fs.readFileSync(workflowPath, "utf8");
const wranglerConfig = fs.readFileSync(wranglerPath, "utf8");

test("admin staging workflow deploys only the staging Worker on the staging branch", () => {
  assert.match(workflow, /^name: deploy-admin-staging$/m);
  assert.match(workflow, /^\s+workflow_dispatch:$/m);
  assert.match(workflow, /codex\/payroll-reminder-launch-ready-100-20260714/u);
  assert.match(workflow, /^\s+runs-on: ubuntu-latest$/m);
  assert.match(workflow, /^\s+name: staging$/m);
  assert.match(workflow, /^\s+group: admin-staging$/m);
  assert.match(workflow, /^\s+contents: read$/m);
  assert.doesNotMatch(workflow, /--env production/u);
  assert.doesNotMatch(workflow, /admin-production|admin-preview/u);
  assert.match(
    workflow,
    /wrangler deploy --env staging --config wrangler\.jsonc/u,
  );
});

test("admin staging workflow validates required non-secret URLs and environment secrets", () => {
  assert.match(
    workflow,
    /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/u,
  );
  assert.match(
    workflow,
    /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/u,
  );
  assert.match(
    workflow,
    /STAGING_API_BASE_URL: https:\/\/api-staging\.salaryhijacking\.com/u,
  );
  assert.match(
    workflow,
    /STAGING_ADMIN_BASE_URL: https:\/\/admin-staging\.salaryhijacking\.com/u,
  );
  assert.match(
    workflow,
    /ADMIN_API_ORIGIN: https:\/\/api-staging\.salaryhijacking\.com/u,
  );
  assert.match(workflow, /https:\/\/api-staging\.salaryhijacking\.com/u);
  assert.match(workflow, /https:\/\/admin-staging\.salaryhijacking\.com/u);
  assert.match(
    workflow,
    /Missing staging environment secret: CLOUDFLARE_ACCOUNT_ID/u,
  );
  assert.match(
    workflow,
    /Missing staging environment secret: CLOUDFLARE_API_TOKEN/u,
  );
});

test("admin staging workflow uses repository-defined Admin build and readiness contracts", () => {
  assert.match(workflow, /pnpm install --frozen-lockfile/u);
  assert.match(workflow, /pnpm --dir "\$ADMIN_APP_DIR" typecheck:strict/u);
  assert.match(
    workflow,
    /pnpm --dir "\$ADMIN_APP_DIR" exec vitest run tests\/unit\/admin-ready-route\.test\.ts --passWithNoTests/u,
  );
  assert.match(workflow, /pnpm --dir "\$ADMIN_APP_DIR" build:cloudflare/u);
  assert.match(workflow, /Diagnose staging API health from GitHub runner/u);
  assert.match(workflow, /staging-api-health-ci\.json/u);
  assert.match(workflow, /ADMIN_READY_PATH: \/admin\/api\/v1\/ready/u);
  assert.match(workflow, /admin staging readiness payload contract failed/u);
  assert.match(
    workflow,
    /admin-staging-evidence-\$\{\{ github\.run_attempt \}\}/u,
  );
});

test("admin staging Wrangler config points staging only at admin-staging domain", () => {
  assert.match(wranglerConfig, /"staging": \{/u);
  assert.match(wranglerConfig, /"name": "salary-hijacking-admin-staging"/u);
  assert.match(
    wranglerConfig,
    /"pattern": "admin-staging\.salaryhijacking\.com"/u,
  );
  assert.match(
    wranglerConfig,
    /"APP_PUBLIC_BASE_URL": "https:\/\/admin-staging\.salaryhijacking\.com"/u,
  );
  assert.match(wranglerConfig, /"production": \{/u);
  assert.match(wranglerConfig, /"name": "salary-hijacking-admin"/u);
});
