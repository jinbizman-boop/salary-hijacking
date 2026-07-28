#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const completedStatuses = new Set([
  "PASS",
  "RESOLVED",
  "RESOLVED_CODE_VERIFIED",
  "RESOLVED_EMULATOR_VERIFIED",
]);

const inspectedColumns = [
  "route_or_overlay",
  "implementation_file",
  "E2E_test",
  "visual_test",
  "accessibility_test",
  "staging_evidence",
  "Android_evidence",
  "evidence_path",
];

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

function splitValues(value) {
  return String(value ?? "")
    .split(/[;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function captureOrMockReason(value) {
  const normalized = value.replaceAll("\\", "/").toLowerCase();
  if (normalized.startsWith("/capture") || normalized.includes("/capture/")) {
    return "capture-route";
  }
  if (normalized.includes("features/capture")) {
    return "capture-component";
  }
  if (normalized.includes("capture-mobile-clean-fintech-screenshots")) {
    return "capture-script";
  }
  if (normalized.includes("release/evidence/mobile-ui/")) {
    return "web-capture-visual-evidence";
  }
  if (normalized.includes("release/screenshots/")) {
    return "store-screenshot-evidence";
  }
  if (normalized.includes("/__mocks__/") || normalized.includes("/mocks/")) {
    return "mock-source";
  }
  return null;
}

export function auditFinalEvidenceNoCaptureMock({
  matrixPath = "docs/audit/IMPLEMENTATION_MATRIX.csv",
  root = repoRoot,
} = {}) {
  const rows = parseCsv(readFileSync(resolve(root, matrixPath), "utf8"));
  const failures = [];

  for (const row of rows) {
    if (!completedStatuses.has(row.status ?? "")) continue;
    for (const column of inspectedColumns) {
      for (const value of splitValues(row[column])) {
        const reason = captureOrMockReason(value);
        if (reason) {
          failures.push({
            requirementId: row.requirement_id,
            column,
            value,
            reason,
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
    inspectedColumns,
    failedChecks: failures.length,
    failures,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditFinalEvidenceNoCaptureMock();
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
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
