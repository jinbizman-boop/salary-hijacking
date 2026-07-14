import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildRequirementsTraceabilityMatrix,
  writeRequirementsTraceabilityMatrix,
} from "./generate-requirements-traceability.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

test("indexes every source document without treating generated matrix files as source rows", () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-traceability-"),
  );
  try {
    write(rootDir, "docs/codex/00_INDEX.md", "# Index\n");
    write(rootDir, "docs/codex/100-completion/05_GAP_REGISTER.md", "# Gaps\n");
    write(
      rootDir,
      "docs/final-documents/4. 기능 기획 문서/09_일일_예산_관리_명세서_최종본.md",
      "# Daily budget\n",
    );
    write(
      rootDir,
      "docs/codex/100-completion/02_REQUIREMENTS_TRACEABILITY_MATRIX.csv",
    );
    write(
      rootDir,
      "docs/codex/100-completion/03_REQUIREMENTS_TRACEABILITY_MATRIX.md",
    );

    const matrix = buildRequirementsTraceabilityMatrix({ rootDir });

    assert.equal(matrix.summary.documentCount, 3);
    assert.deepEqual(
      matrix.rows.map((row) => row["Source file"]),
      [
        "docs/codex/00_INDEX.md",
        "docs/codex/100-completion/05_GAP_REGISTER.md",
        "docs/final-documents/4. 기능 기획 문서/09_일일_예산_관리_명세서_최종본.md",
      ],
    );
    assert.ok(
      matrix.rows.every(
        (row) => row.Status === "PASS" && row.Mandatory === "TRUE",
      ),
    );
    assert.ok(
      matrix.rows.every((row) =>
        /^REQ-DOC-(CODEX|FINAL)-\d{3}$/u.test(row["Requirement ID"]),
      ),
    );
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

test("writes CSV and Markdown traceability outputs without copying document bodies", () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-traceability-"),
  );
  try {
    write(
      rootDir,
      "docs/final-documents/1. 최상위 기획 문서/03_제품_요구사항_정의서_PRD_최종본.md",
      "raw product body that must not be copied",
    );

    const result = writeRequirementsTraceabilityMatrix({ rootDir });
    const csv = fs.readFileSync(result.csvPath, "utf8");
    const md = fs.readFileSync(result.markdownPath, "utf8");

    assert.match(csv, /REQ-DOC-FINAL-001/u);
    assert.match(md, /REQ-DOC-FINAL-001/u);
    assert.match(md, /## Requirements\n\n### REQ-DOC-FINAL-001/u);
    assert.doesNotMatch(md, /\| Requirement ID \|/u);
    assert.doesNotMatch(csv, /raw product body/u);
    assert.doesNotMatch(md, /raw product body/u);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

test("rejects source document paths that look like raw secret artifacts", () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-traceability-"),
  );
  try {
    write(rootDir, "docs/secret-token-value.md", "# unsafe path\n");

    assert.throws(
      () => buildRequirementsTraceabilityMatrix({ rootDir }),
      /unsafe source document path/i,
    );
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});
