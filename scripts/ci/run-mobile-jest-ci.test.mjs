import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { parseJestPassSummary, stripAnsi } from "./run-mobile-jest-ci.mjs";

test("stripAnsi removes color escape sequences", () => {
  assert.equal(stripAnsi("\u001b[32mPASS\u001b[0m"), "PASS");
});

test("parseJestPassSummary accepts complete all-pass Jest summary", () => {
  const summary = parseJestPassSummary(`
Test Suites: 122 passed, 122 total
Tests:       1024 passed, 1024 total
Snapshots:   0 total
`);

  assert.equal(summary.pass, true);
  assert.equal(summary.suites.passed, 122);
  assert.equal(summary.tests.passed, 1024);
});

test("parseJestPassSummary rejects failed suites", () => {
  const summary = parseJestPassSummary(`
Test Suites: 1 failed, 121 passed, 122 total
Tests:       2 failed, 1022 passed, 1024 total
`);

  assert.equal(summary.pass, false);
});

test("parseJestPassSummary rejects missing totals", () => {
  const summary = parseJestPassSummary("PASS apps/mobile/src/example.test.ts");

  assert.equal(summary.pass, false);
});

test("verified pass summary grace path exits explicitly", () => {
  const source = fs.readFileSync(new URL("./run-mobile-jest-ci.mjs", import.meta.url), "utf8");
  const marker =
    "Jest pass summary was verified; terminating lingering test process";
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, "grace timeout pass-summary marker must exist");

  const graceEnd = source.indexOf("}, graceMs);", markerIndex);
  assert.notEqual(graceEnd, -1, "grace timeout callback must be bounded");

  const gracePath = source.slice(markerIndex, graceEnd);

  assert.ok(
    gracePath.includes("process.exit(0);"),
    "pass-summary grace timeout must call process.exit(0) so CI cannot hang on lingering Jest handles",
  );
});
