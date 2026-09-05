import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditFinalEvidenceNoCaptureMock } from "./audit-final-evidence-no-capture-mock.mjs";

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
  const root = mkdtempSync(join(tmpdir(), "salary-final-evidence-audit-"));
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
    domain: "Evidence",
    screen_code: "",
    stitch_instance_code: "",
    route_or_overlay: "/salary",
    user_role: "user",
    state: "",
    acceptance_criteria: "capture routes are not final evidence",
    implementation_file: "apps/mobile/app/(tabs)/salary/index.tsx",
    API_endpoint: "",
    DB_table_or_migration: "",
    unit_test: "",
    integration_test: "",
    E2E_test: "",
    visual_reference: "",
    visual_test: "",
    accessibility_test: "",
    staging_evidence: "",
    Android_evidence: "artifacts/qa/logcat-cold-start.txt",
    status: "RESOLVED",
    blocker: "",
    evidence_path: "artifacts/qa/test.log",
    commit_sha: "d".repeat(40),
    ...overrides,
  };
  return header.map((key) => base[key] ?? "");
}

test("allows production routes and runtime artifacts as final evidence", () => {
  const root = tempRepo([row()]);

  const result = auditFinalEvidenceNoCaptureMock({ root });

  assert.equal(result.ok, true);
  assert.equal(result.failedChecks, 0);
});

test("fails when a completed row uses a capture route as final evidence", () => {
  const root = tempRepo([row({ route_or_overlay: "/capture/salary" })]);

  const result = auditFinalEvidenceNoCaptureMock({ root });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "capture-route");
});

test("fails when a completed row uses web capture screenshots as final evidence", () => {
  const root = tempRepo([
    row({ visual_test: "release/evidence/mobile-ui/05_salary_home.png" }),
  ]);

  const result = auditFinalEvidenceNoCaptureMock({ root });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "web-capture-visual-evidence");
});
