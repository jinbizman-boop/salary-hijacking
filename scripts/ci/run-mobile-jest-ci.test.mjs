import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_TIMEOUT_MS,
  buildJestRunArgs,
  chunkTestPaths,
  parseJestPassSummary,
  stripAnsi,
} from "./run-mobile-jest-ci.mjs";

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

test("chunkTestPaths splits mobile suites into bounded CI batches", () => {
  assert.deepEqual(chunkTestPaths(["a.test.ts", "b.test.ts", "c.test.ts"], 2), [
    ["a.test.ts", "b.test.ts"],
    ["c.test.ts"],
  ]);
});

test("buildJestRunArgs runs a specific batch in a fresh Jest process", () => {
  assert.deepEqual(buildJestRunArgs(["a.test.ts", "b.test.ts"]), [
    "pnpm",
    "--filter",
    "@salary-hijacking/mobile",
    "exec",
    "jest",
    "--runInBand",
    "--forceExit",
    "--runTestsByPath",
    "a.test.ts",
    "b.test.ts",
  ]);
});

test("default CI batches isolate lingering Jest handles to one test file", () => {
  assert.equal(DEFAULT_BATCH_SIZE, 1);
  assert.equal(DEFAULT_BATCH_TIMEOUT_MS, 120_000);
});

test("verified pass summary grace path exits explicitly", () => {
  const source = fs.readFileSync(
    new URL("./run-mobile-jest-ci.mjs", import.meta.url),
    "utf8",
  );
  const marker =
    "Jest pass summary was verified; terminating lingering test process";
  const markerIndex = source.indexOf(marker);
  assert.notEqual(
    markerIndex,
    -1,
    "grace timeout pass-summary marker must exist",
  );

  const graceEnd = source.indexOf("}, graceMs);", markerIndex);
  assert.notEqual(graceEnd, -1, "grace timeout callback must be bounded");

  const gracePath = source.slice(markerIndex, graceEnd);

  assert.ok(
    gracePath.includes("finish({ code: 0"),
    "pass-summary grace timeout must resolve success so CI cannot hang on lingering Jest handles",
  );
});
