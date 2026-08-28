#!/usr/bin/env node
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
  "build-android-qa-release.yml",
);
const workflow = fs.readFileSync(workflowPath, "utf8");

test("Android QA workflow exposes ARM64 dispatch with explicit frozen source inputs", () => {
  assert.match(workflow, /^\s+workflow_dispatch:$/m);
  assert.match(workflow, /^\s+architecture:$/m);
  assert.match(workflow, /^\s+- x86_64$/m);
  assert.match(workflow, /^\s+- arm64-v8a$/m);
  assert.match(workflow, /^\s+upload_apk:$/m);
  assert.match(workflow, /^\s+source_ref:$/m);
  assert.match(workflow, /^\s+application_rc_source_sha:$/m);
});

test("Android QA workflow separates control-plane ref from application build source", () => {
  assert.match(
    workflow,
    /APPLICATION_BUILD_REF:\s*\$\{\{\s*github\.event\.inputs\.source_ref\s*\|\|\s*github\.sha\s*\}\}/u,
  );
  assert.match(
    workflow,
    /RC_SOURCE_SHA:\s*\$\{\{\s*github\.event\.inputs\.application_rc_source_sha\s*\|\|\s*github\.sha\s*\}\}/u,
  );
  assert.match(workflow, /ref:\s*\$\{\{\s*env\.APPLICATION_BUILD_REF\s*\}\}/u);
  assert.match(workflow, /test "\$checked_out_head" = "\$RC_SOURCE_SHA"/u);
  assert.match(workflow, /APPLICATION_RC_SOURCE_SHA=%s\\n' "\$RC_SOURCE_SHA"/u);
  assert.doesNotMatch(
    workflow,
    /test "\$GITHUB_REF_NAME" = "codex\/payroll-reminder-launch-ready-100-20260714"/u,
  );
});

test("Android QA artifact names use the frozen RC SHA, not the workflow commit", () => {
  assert.match(
    workflow,
    /name:\s*android-qa-release-\$\{\{\s*github\.event\.inputs\.architecture\s*\|\|\s*'x86_64'\s*\}\}-\$\{\{\s*env\.RC_SOURCE_SHA\s*\}\}/u,
  );
  assert.doesNotMatch(
    workflow,
    /name:\s*android-qa-release-\$\{\{\s*github\.event\.inputs\.architecture\s*\|\|\s*'x86_64'\s*\}\}-\$\{\{\s*github\.sha\s*\}\}/u,
  );
});
