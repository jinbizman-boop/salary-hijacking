#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const runtimeEvidenceColumns = [
  "E2E_test",
  "visual_test",
  "accessibility_test",
  "staging_evidence",
  "Android_evidence",
];

const completedStatuses = new Set([
  "PASS",
  "RESOLVED",
  "RESOLVED_CODE_VERIFIED",
  "RESOLVED_EMULATOR_VERIFIED",
  "RESOLVED_DIAGNOSTIC_ONLY",
]);

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""]));
  });
}

function splitEvidence(value) {
  return String(value ?? "")
    .split(/[;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isSourceStringTestPath(path) {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  return (
    normalized.includes("__tests__") &&
    /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/.test(normalized)
  );
}

function isRuntimeArtifactPath(path) {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  return (
    normalized.startsWith("artifacts/") ||
    normalized.startsWith("release/evidence/") ||
    normalized.includes("logcat") ||
    normalized.includes("adb") ||
    normalized.includes("detox") ||
    normalized.includes("maestro") ||
    normalized.includes("playwright") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".json") ||
    normalized.endsWith(".log")
  );
}

export function auditRuntimeEvidenceQuality({
  matrixPath = "docs/audit/IMPLEMENTATION_MATRIX.csv",
  root = repoRoot,
} = {}) {
  const absoluteMatrixPath = resolve(root, matrixPath);
  const rows = parseCsv(readFileSync(absoluteMatrixPath, "utf8"));
  const failures = [];
  const warnings = [];

  for (const row of rows) {
    const status = row.status ?? "";
    if (!completedStatuses.has(status)) continue;

    for (const column of runtimeEvidenceColumns) {
      for (const evidence of splitEvidence(row[column])) {
        if (isSourceStringTestPath(evidence)) {
          failures.push({
            requirementId: row.requirement_id,
            column,
            evidence,
            reason: "source-string-test-used-as-runtime-evidence",
          });
        } else if (evidence && !isRuntimeArtifactPath(evidence) && existsSync(resolve(root, evidence))) {
          warnings.push({
            requirementId: row.requirement_id,
            column,
            evidence,
            reason: "runtime-column-points-to-non-runtime-looking-file",
          });
        }
      }
    }
  }

  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    completedRows: rows.filter((row) => completedStatuses.has(row.status ?? ""))
      .length,
    runtimeEvidenceColumns,
    failedChecks: failures.length,
    warningCount: warnings.length,
    failures,
    warnings,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditRuntimeEvidenceQuality();
  const jsonPath = argValue("--json");
  if (jsonPath) {
    writeFileSync(resolve(repoRoot, jsonPath), `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        completedRows: result.completedRows,
        failedChecks: result.failedChecks,
        warningCount: result.warningCount,
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
