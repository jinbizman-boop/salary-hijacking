import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...data] = rows.filter((r) => r.some((v) => v !== ""));
  return data.map((r) =>
    Object.fromEntries(headers.map((h, index) => [h, r[index] ?? ""])),
  );
}

function csv(path) {
  return parseCsv(readFileSync(resolve(root, path), "utf8"));
}

function sha256(path) {
  return createHash("sha256")
    .update(readFileSync(resolve(root, path)))
    .digest("hex")
    .toUpperCase();
}

const normative = csv("docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv");
const legacy = csv("docs/audit/PHASE_0_LEGACY_305_RECONCILIATION.csv");
const sources = csv("docs/audit/PHASE_0_SOURCE_REGISTRY.csv");
const stitch = csv("docs/audit/PHASE_0_STITCH_STATE_REGISTRY.csv");
const gates = csv("docs/audit/PHASE_0_GATE_REGISTRY.csv");
const baseline = JSON.parse(
  readFileSync(resolve(root, "docs/audit/PHASE_0_BASELINE.json"), "utf8"),
);

const allowedStatuses = new Set([
  "PASS",
  "PARTIAL",
  "FAIL",
  "UNVERIFIED",
  "EXTERNAL_BLOCKER",
  "N/A",
]);
const expectedNamespaces = new Set([
  "FIN",
  "AUTH",
  "PAY",
  "HOME",
  "BUD",
  "EXP",
  "SAV",
  "NOTI",
  "LV",
  "COM",
  "WRITE",
  "PROF",
  "ADMIN",
  "ADS",
  "OPS",
  "DB",
  "WEB",
  "ANL",
  "REL",
  "SEC",
  "PERF",
]);

assert.equal(normative.length, 237, "normative requirement count must be 237");
const ids = normative.map((r) => r.REQ_ID);
assert.equal(new Set(ids).size, 237, "duplicate normative REQ_ID must be 0");
assert.equal(ids.filter((id) => !id).length, 0, "blank REQ_ID must be 0");
assert.equal(
  ids.filter((id) => !/^(FIN|AUTH|PAY|HOME|BUD|EXP|SAV|NOTI|LV|COM|WRITE|PROF|ADMIN|ADS|OPS|DB|WEB|ANL|REL|SEC|PERF)-\d{3}$/.test(id)).length,
  0,
  "malformed REQ_ID must be 0",
);

for (const ns of expectedNamespaces) {
  assert.ok(ids.some((id) => id.startsWith(`${ns}-`)), `missing namespace ${ns}`);
}

for (const row of normative) {
  assert.ok(row.PRIORITY, `${row.REQ_ID} missing priority`);
  assert.ok(row.GATE, `${row.REQ_ID} missing gate`);
  assert.ok(row.ORIGIN, `${row.REQ_ID} missing origin`);
  assert.ok(row.SOURCE_FAMILY, `${row.REQ_ID} missing source family`);
  assert.ok(row.CURRENT_STATUS, `${row.REQ_ID} missing current status`);
  assert.ok(allowedStatuses.has(row.CURRENT_STATUS), `${row.REQ_ID} invalid status`);
  assert.ok(row.CURRENT_REPOSITORY_HEAD, `${row.REQ_ID} missing current HEAD`);
  assert.ok(row.APPLICATION_RC_SOURCE_SHA, `${row.REQ_ID} missing RC SHA`);
}

assert.equal(legacy.length, 305, "legacy 305 row count must remain 305");
assert.equal(
  legacy.filter((row) => !row.CLASSIFICATION || row.CLASSIFICATION === "UNKNOWN").length,
  0,
  "legacy rows must all be classified",
);

assert.equal(stitch.length, 304, "Stitch registry must have 304 rows");
assert.equal(
  stitch.length - new Set(stitch.map((row) => row.REFERENCE_ID)).size,
  0,
  "Stitch duplicate reference IDs must be 0",
);

const gateIds = new Set(gates.map((row) => row.GATE_ID));
for (const id of ["D-013", "D-016", "D-017", "D-026"]) {
  assert.ok(gateIds.has(id), `gate registry missing ${id}`);
}

assert.equal(baseline.normative_requirement_count, 237);
assert.equal(baseline.legacy_trace_row_count, 305);
assert.equal(baseline.stitch_state_count, 304);
assert.equal(baseline.defect_gate_count, 4);
assert.equal(baseline.duplicate_req_count, 0);
assert.equal(baseline.missing_req_count, 0);
assert.equal(baseline.PHASE_0_STATUS, "PASS");
assert.equal(baseline.secret_exposure, "0");
assert.ok(sources.length > 0, "source registry must not be empty");
assert.ok(
  sources.some((row) => row.STATUS === "UNRESOLVED_SOURCE_PATH"),
  "unresolved source paths must be explicit",
);

for (const output of baseline.output_files) {
  if (output.sha256 === "SELF_REFERENTIAL_REPORTED_AFTER_WRITE") continue;
  assert.equal(sha256(output.path), output.sha256, `hash mismatch for ${output.path}`);
}

console.log(
  JSON.stringify(
    {
      PHASE_0_VALIDATION: "PASS",
      normative: normative.length,
      legacy: legacy.length,
      stitch: stitch.length,
      gates: gates.length,
      sources: sources.length,
      baselineSha256: sha256("docs/audit/PHASE_0_BASELINE.json"),
    },
    null,
    2,
  ),
);
