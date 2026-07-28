import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runTruthfulCompletionCheck } from "./check-truthful-completion.mjs";

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

const csv = (rows) =>
  [header, ...rows]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

const row = ({
  id,
  status,
  evidencePath = "",
  commitSha = "",
  blocker = "",
}) => [
  id,
  "docs/spec.md",
  "section",
  "P1",
  "Mobile",
  "",
  "",
  "",
  "user",
  "default",
  "Requirement must be truthful",
  "apps/mobile/src/example.ts",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  status,
  blocker,
  evidencePath,
  commitSha,
];

async function writeMatrix(rootDir, rows) {
  const matrixPath = path.join(rootDir, "docs/audit/IMPLEMENTATION_MATRIX.csv");
  await mkdir(path.dirname(matrixPath), { recursive: true });
  await writeFile(matrixPath, `${csv(rows)}\n`, "utf8");
}

test("fails when a completed row points to missing evidence", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-truth-check-"));

  try {
    await writeMatrix(rootDir, [
      row({
        id: "D-001",
        status: "RESOLVED",
        evidencePath: "artifacts/qa/missing.log",
        commitSha: "a".repeat(40),
      }),
    ]);

    const result = runTruthfulCompletionCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /D-001/);
    assert.match(result.failures.join("\n"), /missing evidence file/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("passes completed rows with evidence and leaves UNVERIFIED rows open", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-truth-check-"));

  try {
    await mkdir(path.join(rootDir, "artifacts/qa"), { recursive: true });
    await writeFile(path.join(rootDir, "artifacts/qa/proof.log"), "ok\n");
    await writeMatrix(rootDir, [
      row({
        id: "D-001",
        status: "RESOLVED",
        evidencePath: "artifacts/qa/proof.log",
        commitSha: "b".repeat(40),
      }),
      row({
        id: "D-004",
        status: "UNVERIFIED",
      }),
    ]);

    const result = runTruthfulCompletionCheck({ rootDir });

    assert.equal(result.ok, true, result.failures.join("\n"));
    assert.equal(result.unverifiedCount, 1);
    assert.equal(result.completedCount, 1);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when a completed row lacks a commit SHA", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-truth-check-"));

  try {
    await mkdir(path.join(rootDir, "artifacts/qa"), { recursive: true });
    await writeFile(path.join(rootDir, "artifacts/qa/proof.log"), "ok\n");
    await writeMatrix(rootDir, [
      row({
        id: "D-001",
        status: "PASS",
        evidencePath: "artifacts/qa/proof.log",
      }),
    ]);

    const result = runTruthfulCompletionCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /commit_sha/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
