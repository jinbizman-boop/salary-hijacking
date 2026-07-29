#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const COMPLETED_STATUSES = new Set([
  "PASS",
  "RESOLVED",
  "RESOLVED_DIAGNOSTIC_ONLY",
]);

const OPEN_STATUSES = new Set([
  "UNVERIFIED",
  "FAIL",
  "FAILED",
  "BLOCKED",
  "EXTERNAL_BLOCKER",
  "NOT_APPLICABLE",
]);

const REQUIRED_COLUMNS = [
  "requirement_id",
  "acceptance_criteria",
  "status",
  "blocker",
  "evidence_path",
  "commit_sha",
];

const COMPLETION_DEPENDENCIES = new Map([["D-026", ["D-013", "D-028"]]]);

const STITCH_FINAL_MARKER = "FINAL_ANDROID_PRODUCTION_VISUAL_A11Y_VERIFIED";

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length > 0 || field.length > 0) {
      pushField();
      rows.push(row);
      row = [];
    }
  };

  const input = String(text).replace(/^\uFEFF/u, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      pushField();
      continue;
    }
    if (char === "\n") {
      pushRow();
      continue;
    }
    if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const header = rows[0] ?? [];
  return {
    header,
    rawRows: rows.slice(1),
    rows: rows
      .slice(1)
      .map((values) =>
        Object.fromEntries(
          header.map((column, index) => [column, values[index] ?? ""]),
        ),
      ),
  };
}

function normalizeStatus(status) {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function isFortyHex(value) {
  return /^[0-9a-f]{40}$/iu.test(String(value ?? "").trim());
}

function isEvidencePathToken(value) {
  const token = String(value ?? "").trim();
  if (!token) return true;
  if (/^https?:\/\//iu.test(token)) return true;
  if (path.isAbsolute(token)) return true;
  return /[\\/]/u.test(token) && /\.[A-Za-z0-9]{1,12}$/u.test(token);
}

function hasOnlyEvidencePathTokens(value) {
  return String(value ?? "")
    .split(";")
    .every(isEvidencePathToken);
}

function resolveEvidencePath(rootDir, evidencePath) {
  const rawPath = String(evidencePath ?? "").trim();
  if (!rawPath) return null;
  if (/^https?:\/\//iu.test(rawPath)) return null;
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(rootDir, rawPath.replaceAll("/", path.sep));
}

function countStatuses(rows) {
  const counts = {};
  for (const row of rows) {
    const status = normalizeStatus(row.status) || "MISSING";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function rowByRequirementId(rows) {
  return new Map(
    rows.map((row) => [String(row.requirement_id ?? "").trim(), row]),
  );
}

function assertCompletionDependencies({ failures, lineById, rowsById }) {
  for (const [requirementId, dependencyIds] of COMPLETION_DEPENDENCIES) {
    const row = rowsById.get(requirementId);
    if (!row || !COMPLETED_STATUSES.has(normalizeStatus(row.status))) continue;

    for (const dependencyId of dependencyIds) {
      const dependency = rowsById.get(dependencyId);
      if (
        !dependency ||
        !COMPLETED_STATUSES.has(normalizeStatus(dependency.status))
      ) {
        failures.push(
          `${requirementId} line ${lineById.get(requirementId) ?? "?"}: completed status requires ${dependencyId} to be completed first`,
        );
      }
    }
  }
}

function assertStitchCompletionGate({ failures, rootDir, rowsById }) {
  const d013 = rowsById.get("D-013");
  if (!d013 || !COMPLETED_STATUSES.has(normalizeStatus(d013.status))) return;

  const screenMatrixPath = path.resolve(
    rootDir,
    "docs/qa/SCREEN_IMPLEMENTATION_MATRIX.csv",
  );
  if (!fs.existsSync(screenMatrixPath)) {
    failures.push(
      "D-013: completed Stitch UI status requires docs/qa/SCREEN_IMPLEMENTATION_MATRIX.csv",
    );
    return;
  }

  const parsed = parseCsv(fs.readFileSync(screenMatrixPath, "utf8"));
  parsed.rows.forEach((row, index) => {
    const line = index + 2;
    const status = normalizeStatus(row.status);
    const notes = String(row.notes ?? "");
    if (status !== "PASS") {
      failures.push(
        `D-013: Stitch screen matrix line ${line} remains ${status || "MISSING"}; production UI cannot be completed`,
      );
    } else if (!notes.includes(STITCH_FINAL_MARKER)) {
      failures.push(
        `D-013: Stitch screen matrix line ${line} PASS lacks ${STITCH_FINAL_MARKER}`,
      );
    }
  });
}

export function runTruthfulCompletionCheck(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const matrixPath =
    options.matrixPath ??
    path.resolve(rootDir, "docs/audit/IMPLEMENTATION_MATRIX.csv");
  const failures = [];

  if (!fs.existsSync(matrixPath)) {
    return {
      ok: false,
      matrixPath,
      failures: [`${path.relative(rootDir, matrixPath)}: missing truth matrix`],
      totalRows: 0,
      completedCount: 0,
      unverifiedCount: 0,
      statusCounts: {},
    };
  }

  const parsed = parseCsv(fs.readFileSync(matrixPath, "utf8"));
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !parsed.header.includes(column),
  );
  for (const column of missingColumns) {
    failures.push(
      `IMPLEMENTATION_MATRIX.csv: missing required column ${column}`,
    );
  }

  parsed.rawRows.forEach((values, index) => {
    if (values.length !== parsed.header.length) {
      failures.push(
        `IMPLEMENTATION_MATRIX.csv line ${index + 2}: malformed CSV row expected ${parsed.header.length} columns, got ${values.length}`,
      );
    }
  });

  let completedCount = 0;
  let unverifiedCount = 0;
  const lineById = new Map();

  parsed.rows.forEach((row, index) => {
    const line = index + 2;
    const requirementId = row.requirement_id || `row-${line}`;
    lineById.set(requirementId, line);
    const status = normalizeStatus(row.status);

    if (
      String(row.evidence_path ?? "").trim() &&
      !hasOnlyEvidencePathTokens(row.evidence_path)
    ) {
      failures.push(
        `${requirementId} line ${line}: evidence_path must contain local path or URL tokens, got "${row.evidence_path}"`,
      );
    }

    if (String(row.commit_sha ?? "").trim() && !isFortyHex(row.commit_sha)) {
      failures.push(
        `${requirementId} line ${line}: commit_sha must be 40-hex when present, got "${row.commit_sha}"`,
      );
    }

    if (status === "UNVERIFIED") unverifiedCount += 1;
    if (!COMPLETED_STATUSES.has(status)) {
      if (!OPEN_STATUSES.has(status)) {
        failures.push(
          `${requirementId} line ${line}: unknown status "${row.status}"`,
        );
      }
      return;
    }

    completedCount += 1;

    if (String(row.blocker ?? "").trim()) {
      failures.push(
        `${requirementId} line ${line}: completed status cannot keep blocker "${row.blocker}"`,
      );
    }

    if (!String(row.evidence_path ?? "").trim()) {
      failures.push(
        `${requirementId} line ${line}: completed status requires evidence_path`,
      );
    } else {
      const evidenceFile = resolveEvidencePath(rootDir, row.evidence_path);
      if (!evidenceFile) {
        failures.push(
          `${requirementId} line ${line}: evidence_path must be a local file path, got "${row.evidence_path}"`,
        );
      } else if (!fs.existsSync(evidenceFile)) {
        failures.push(
          `${requirementId} line ${line}: missing evidence file "${row.evidence_path}"`,
        );
      }
    }

    if (!isFortyHex(row.commit_sha)) {
      failures.push(
        `${requirementId} line ${line}: completed status requires 40-hex commit_sha`,
      );
    }
  });

  const rowsById = rowByRequirementId(parsed.rows);
  assertCompletionDependencies({ failures, lineById, rowsById });
  assertStitchCompletionGate({ failures, rootDir, rowsById });

  return {
    ok: failures.length === 0,
    matrixPath,
    failures,
    totalRows: parsed.rows.length,
    completedCount,
    unverifiedCount,
    statusCounts: countStatuses(parsed.rows),
  };
}

function printResult(result) {
  if (result.ok) {
    console.log("[truthful-completion] validation passed.");
  } else {
    console.error("[truthful-completion] validation failed:");
    for (const failure of result.failures) console.error(`- ${failure}`);
  }

  console.log(
    `[truthful-completion] rows=${result.totalRows} completed=${result.completedCount} unverified=${result.unverifiedCount}`,
  );
  console.log(
    `[truthful-completion] statusCounts=${JSON.stringify(result.statusCounts)}`,
  );
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMain) {
  const result = runTruthfulCompletionCheck();
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}
