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
    rows: rows.slice(1).map((values) =>
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
    failures.push(`IMPLEMENTATION_MATRIX.csv: missing required column ${column}`);
  }

  let completedCount = 0;
  let unverifiedCount = 0;

  parsed.rows.forEach((row, index) => {
    const line = index + 2;
    const requirementId = row.requirement_id || `row-${line}`;
    const status = normalizeStatus(row.status);

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
