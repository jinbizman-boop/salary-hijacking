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
  "release-blocker-evidence.yml",
);
const workflow = fs.readFileSync(workflowPath, "utf8");

test("Production AAB local fallback uses the marker-aware production builder", () => {
  const fallbackStart = workflow.indexOf(
    'grep -Eiq "used its Android builds from the Free plan',
  );
  assert.notEqual(fallbackStart, -1);
  const fallbackEnd = workflow.indexOf(
    "else\n            printf '%s\\n' \"-1\"",
    fallbackStart,
  );
  assert.notEqual(fallbackEnd, -1);
  const fallbackBlock = workflow.slice(fallbackStart, fallbackEnd);

  assert.match(
    fallbackBlock,
    /node scripts\/expo-local-android-production-build\.mjs\s+\\\s+--output \.\.\/\.\.\/release-artifacts\/mobile\/salary-hijacking-production-final\.aab/u,
  );
  assert.doesNotMatch(fallbackBlock, /eas-cli@23\.2\.0 build[\s\S]*--local/u);
});
