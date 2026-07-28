import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { auditStitchTruthfulStatusDocs } from "./audit-stitch-truthful-status-docs.mjs";

function tempDocRoot(relativePath, source) {
  const root = mkdtempSync(join(tmpdir(), "salary-stitch-docs-"));
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source);
  return root;
}

test("passes truthful withdrawal wording", () => {
  const root = tempDocRoot(
    "docs/qa/report.md",
    "old 305/305 PASS wording has been withdrawn; D-013 remains UNVERIFIED",
  );

  const result = auditStitchTruthfulStatusDocs({ root });

  assert.equal(result.ok, true);
  assert.equal(result.failedChecks, 0);
});

test("fails bare 305 pass overclaim", () => {
  const root = tempDocRoot(
    "docs/qa/report.md",
    "Matrix status: PASS 305 / PARTIAL 0 / FAIL 0",
  );

  const result = auditStitchTruthfulStatusDocs({ root });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].line, 1);
});

test("fails pass count overclaim", () => {
  const root = tempDocRoot("release/evidence/mobile-ui/status.md", "- PASS: 305");

  const result = auditStitchTruthfulStatusDocs({ root });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].file, "release/evidence/mobile-ui/status.md");
});
