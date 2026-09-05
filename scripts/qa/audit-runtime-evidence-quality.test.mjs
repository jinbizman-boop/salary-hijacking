import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditRuntimeEvidenceQuality } from "./audit-runtime-evidence-quality.mjs";

const header = [
  "requirement_id",
  "source_document",
  "source_location",
  "priority",
  "domain",
  "screen_code",
  "stitch_instance_code",
  "route_or_overlay",
  "user_role",
  "state",
  "acceptance_criteria",
  "implementation_file",
  "API_endpoint",
  "DB_table_or_migration",
  "unit_test",
  "integration_test",
  "E2E_test",
  "visual_reference",
  "visual_test",
  "accessibility_test",
  "staging_evidence",
  "Android_evidence",
  "status",
  "blocker",
  "evidence_path",
  "commit_sha",
];

function tempRepo(matrixRows) {
  const root = mkdtempSync(join(tmpdir(), "salary-runtime-evidence-audit-"));
  mkdirSync(join(root, "docs", "audit"), { recursive: true });
  const csv = [header, ...matrixRows]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  writeFileSync(join(root, "docs", "audit", "IMPLEMENTATION_MATRIX.csv"), csv);
  return root;
}

function row(overrides = {}) {
  const base = {
    requirement_id: "D-TEST",
    source_document: "test",
    source_location: "test",
    priority: "P1",
    domain: "QA",
    screen_code: "",
    stitch_instance_code: "",
    route_or_overlay: "",
    user_role: "user",
    state: "",
    acceptance_criteria: "runtime evidence must be real",
    implementation_file: "",
    API_endpoint: "",
    DB_table_or_migration: "",
    unit_test: "apps/mobile/src/foo/__tests__/foo.test.ts",
    integration_test: "",
    E2E_test: "",
    visual_reference: "",
    visual_test: "",
    accessibility_test: "",
    staging_evidence: "",
    Android_evidence: "",
    status: "RESOLVED",
    blocker: "",
    evidence_path: "artifacts/qa/test.log",
    commit_sha: "c".repeat(40),
    ...overrides,
  };
  return header.map((key) => base[key] ?? "");
}

test("allows source-string tests as unit evidence when runtime evidence stays artifact-backed", () => {
  const root = tempRepo([
    row({
      Android_evidence: "artifacts/qa/logcat-cold-start.txt",
      E2E_test: "artifacts/qa/detox-e2e.log",
    }),
  ]);

  const result = auditRuntimeEvidenceQuality({ root });

  assert.equal(result.ok, true);
  assert.equal(result.failedChecks, 0);
});

test("fails when a source-string test is used as Android runtime evidence", () => {
  const root = tempRepo([
    row({
      Android_evidence:
        "apps/mobile/src/config/__tests__/mobile-e2e-contract.test.ts",
    }),
  ]);

  const result = auditRuntimeEvidenceQuality({ root });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [
    {
      requirementId: "D-TEST",
      column: "Android_evidence",
      evidence: "apps/mobile/src/config/__tests__/mobile-e2e-contract.test.ts",
      reason: "source-string-test-used-as-runtime-evidence",
    },
  ]);
});
