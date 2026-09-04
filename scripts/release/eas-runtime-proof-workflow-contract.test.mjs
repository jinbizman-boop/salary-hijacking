import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/eas-runtime-proof.yml";
const workflow = fs.readFileSync(workflowPath, "utf8");

test("EAS runtime proof workflow is manual and no-write", () => {
  assert.match(workflow, /^on:\n\s+workflow_dispatch:/mu);
  assert.match(workflow, /environment:\n\s+name:\s+mobile-preview/u);
  assert.match(workflow, /EXPO_TOKEN:\s+\$\{\{\s*secrets\.EXPO_TOKEN\s*\}\}/u);
  assert.match(
    workflow,
    /EAS_PROJECT_ID:\s+\$\{\{\s*secrets\.EAS_PROJECT_ID\s*\}\}/u,
  );
  assert.match(workflow, /pnpm\s+dlx\s+eas-cli@latest\s+whoami/u);
  assert.match(workflow, /pnpm\s+dlx\s+eas-cli@latest\s+project:info/u);
  assert.match(
    workflow,
    /eas-runtime-proof-\$\{\{\s*github\.run_attempt\s*\}\}/u,
  );
  assert.doesNotMatch(workflow, /\beas\s+build\b/u);
  assert.doesNotMatch(workflow, /\beas\s+submit\b/u);
  assert.doesNotMatch(
    workflow,
    /google-service-account|PLAY|track:\s*internal/iu,
  );
});

test("EAS runtime proof workflow writes redacted evidence only", () => {
  assert.match(workflow, /containsSecretValues:\s+false/u);
  assert.match(workflow, /secretsRedacted:\s+true/u);
  assert.match(workflow, /expoTokenPresent/u);
  assert.match(workflow, /easProjectIdRemoteMatch/u);
  assert.match(workflow, /projectIdConfiguredHash/u);
  assert.match(workflow, /projectIdRemoteHash/u);
  assert.doesNotMatch(workflow, /console\.log\([^)]*EXPO_TOKEN/u);
  assert.doesNotMatch(workflow, /echo\s+["']?\$EXPO_TOKEN/u);
});
