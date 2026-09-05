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

const workflowRoot = path.join(repoRoot, ".github", "workflows");
const workflowFiles = fs
  .readdirSync(workflowRoot)
  .filter((entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"))
  .map((entry) => path.join(workflowRoot, entry));

test("pins pnpm/action-setup GitHub Actions by immutable commit SHA", () => {
  const unpinnedRefs = [];

  for (const workflowPath of workflowFiles) {
    const source = fs.readFileSync(workflowPath, "utf8");
    for (const match of source.matchAll(
      /uses:\s*pnpm\/action-setup@([^\s#]+)/gu,
    )) {
      const ref = match[1];
      if (!/^[a-f0-9]{40}$/u.test(ref)) {
        unpinnedRefs.push(`${path.relative(repoRoot, workflowPath)}:${ref}`);
      }
    }
  }

  assert.deepEqual(unpinnedRefs, []);
});
