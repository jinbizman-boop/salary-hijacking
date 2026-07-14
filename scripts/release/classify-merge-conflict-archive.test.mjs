import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMergeConflictArchiveRegister,
  classifyMergeConflictPath,
  writeMergeConflictArchiveRegister,
} from "./classify-merge-conflict-archive.mjs";

test("classifies known merge conflict path categories", () => {
  assert.equal(
    classifyMergeConflictPath("apps/mobile/app/index.tsx"),
    "mobile-source",
  );
  assert.equal(
    classifyMergeConflictPath("apps/admin/src/app/growth-content/page.tsx"),
    "admin-source",
  );
  assert.equal(
    classifyMergeConflictPath(
      "services/api/src/repositories/growth.repository.ts",
    ),
    "backend-source",
  );
  assert.equal(
    classifyMergeConflictPath("scripts/release/check-release-readiness.mjs"),
    "release-script",
  );
  assert.equal(
    classifyMergeConflictPath("release/screenshots/01_home_salary.png"),
    "generated-or-binary-evidence",
  );
  assert.equal(
    classifyMergeConflictPath("docs/codex/08_FILE_COMPLETION_LOG.md"),
    "docs-evidence",
  );
  assert.equal(classifyMergeConflictPath("package.json"), "repo-config");
});

test("builds a file-by-file register for every manifest conflict", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-merge-register-"),
  );
  try {
    const archiveRoot = path.join(
      tempDir,
      ".merged-from-salary-hijacking-main",
    );
    const conflictsRoot = path.join(archiveRoot, "conflicts");
    fs.mkdirSync(path.join(conflictsRoot, "apps", "mobile", "app"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(conflictsRoot, "release", "screenshots"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(archiveRoot, "merge-manifest.json"),
      JSON.stringify({
        conflictedDifferentFiles: [
          "apps\\mobile\\app\\index.tsx",
          "release\\screenshots\\01_home_salary.png",
        ],
      }),
    );
    fs.writeFileSync(
      path.join(conflictsRoot, "apps", "mobile", "app", "index.tsx"),
      "archive route",
    );
    fs.writeFileSync(
      path.join(conflictsRoot, "release", "screenshots", "01_home_salary.png"),
      "archive png",
    );
    fs.mkdirSync(path.join(tempDir, "apps", "mobile", "app"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempDir, "apps", "mobile", "app", "index.tsx"),
      "current route",
    );

    const register = buildMergeConflictArchiveRegister(tempDir);

    assert.equal(register.summary.totalConflicts, 2);
    assert.equal(register.rows.length, 2);
    assert.equal(register.summary.currentPathExists, 1);
    assert.equal(register.summary.missingCurrentPath, 1);
    assert.deepEqual(
      register.rows.map((row) => row.decision),
      ["REVIEW_REQUIRED", "EXCLUDE_RUNTIME"],
    );
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
});

test("accepts UTF-8 BOM merge manifests from Windows consolidation scripts", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-merge-register-"),
  );
  try {
    const archiveRoot = path.join(
      tempDir,
      ".merged-from-salary-hijacking-main",
    );
    const conflictsRoot = path.join(archiveRoot, "conflicts");
    fs.mkdirSync(conflictsRoot, { recursive: true });
    fs.writeFileSync(
      path.join(archiveRoot, "merge-manifest.json"),
      `\uFEFF${JSON.stringify({ conflictedDifferentFiles: ["package.json"] })}`,
    );
    fs.writeFileSync(
      path.join(conflictsRoot, "package.json"),
      "archive package",
    );
    fs.writeFileSync(path.join(tempDir, "package.json"), "current package");

    const register = buildMergeConflictArchiveRegister(tempDir);

    assert.equal(register.summary.totalConflicts, 1);
    assert.equal(register.rows[0]?.relativePath, "package.json");
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
});

test("writes csv and markdown registers with no raw file contents", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-merge-register-"),
  );
  try {
    const archiveRoot = path.join(
      tempDir,
      ".merged-from-salary-hijacking-main",
    );
    const conflictsRoot = path.join(archiveRoot, "conflicts");
    fs.mkdirSync(path.join(conflictsRoot, "package"), { recursive: true });
    fs.writeFileSync(
      path.join(archiveRoot, "merge-manifest.json"),
      JSON.stringify({
        conflictedDifferentFiles: ["package.json"],
      }),
    );
    fs.writeFileSync(
      path.join(conflictsRoot, "package.json"),
      "archive package secret-ish content",
    );
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      "current package content",
    );

    const outputDir = path.join(tempDir, "docs", "codex", "100-completion");
    const result = writeMergeConflictArchiveRegister(tempDir, { outputDir });

    const csv = fs.readFileSync(result.csvPath, "utf8");
    const md = fs.readFileSync(result.markdownPath, "utf8");

    assert.match(csv, /package\.json/u);
    assert.match(md, /package\.json/u);
    assert.doesNotMatch(csv, /secret-ish/u);
    assert.doesNotMatch(md, /secret-ish/u);
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
});

test("applies reviewed semantic decisions from an override file", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-merge-register-"),
  );
  try {
    const archiveRoot = path.join(
      tempDir,
      ".merged-from-salary-hijacking-main",
    );
    const conflictsRoot = path.join(archiveRoot, "conflicts");
    fs.mkdirSync(conflictsRoot, { recursive: true });
    fs.writeFileSync(
      path.join(archiveRoot, "merge-manifest.json"),
      JSON.stringify({
        conflictedDifferentFiles: ["package.json"],
      }),
    );
    fs.writeFileSync(
      path.join(conflictsRoot, "package.json"),
      "archive package",
    );
    fs.writeFileSync(path.join(tempDir, "package.json"), "current package");
    const overridePath = path.join(tempDir, "decisions.json");
    fs.writeFileSync(
      overridePath,
      JSON.stringify({
        decisions: [
          {
            relativePath: "package.json",
            decision: "CURRENT_ACCEPTED",
            action: "Current root package scripts are verified by tests.",
            evidence: ["node --test package-script-guard.test.mjs"],
          },
        ],
      }),
    );

    const register = buildMergeConflictArchiveRegister(tempDir, {
      decisionOverridePath: overridePath,
    });

    assert.equal(register.rows[0]?.decision, "CURRENT_ACCEPTED");
    assert.equal(
      register.rows[0]?.action,
      "Current root package scripts are verified by tests.",
    );
    assert.equal(register.summary.countsByDecision.CURRENT_ACCEPTED, 1);
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
});
