import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_TIMEOUT_MS,
  buildJestRunArgs,
  chunkTestPaths,
  parseJestPassSummary,
  sortTestPathsForCi,
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
    "--runInBand",
    "--forceExit",
    "--runTestsByPath",
    "a.test.ts",
    "b.test.ts",
  ]);
});

test("CI runner filters non-mobile copied tests from listed output", () => {
  const source = fs.readFileSync(
    new URL("./run-mobile-jest-ci.mjs", import.meta.url),
    "utf8",
  );

  assert.match(source, /normalized\.includes\("\/\.tmp\/"\)/u);
  assert.match(source, /normalized\.includes\("\/apps\/mobile\/"\)/u);
  assert.match(source, /normalized\.startsWith\("src\/"\)/u);
});

test("sortTestPathsForCi makes GitHub runner batches deterministic", () => {
  const sorted = sortTestPathsForCi([
    "/workspace/apps/mobile/src/features/uploads/__tests__/uploads.api.test.ts",
    "/workspace/apps/mobile/src/features/plan/__tests__/plan.components.test.tsx",
    "/workspace/apps/mobile/src/features/salary/__tests__/salary.components.test.tsx",
  ]);

  assert.deepEqual(sorted, [
    "/workspace/apps/mobile/src/features/plan/__tests__/plan.components.test.tsx",
    "/workspace/apps/mobile/src/features/salary/__tests__/salary.components.test.tsx",
    "/workspace/apps/mobile/src/features/uploads/__tests__/uploads.api.test.ts",
  ]);
});

test("default CI batches isolate lingering Jest handles to one test file", () => {
  assert.equal(DEFAULT_BATCH_SIZE, 1);
  assert.equal(DEFAULT_BATCH_TIMEOUT_MS, 5 * 60_000);
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

test("CI runner uses the installed mobile Jest binary for Plan batches before package-manager fallback", () => {
  const source = fs.readFileSync(
    new URL("./run-mobile-jest-ci.mjs", import.meta.url),
    "utf8",
  );

  assert.match(source, /MOBILE_JEST_BIN/u);
  assert.match(source, /shouldUseDirectMobileJest/u);
  assert.match(source, /\/src\/features\/plan\/__tests__\//u);
  assert.match(source, /fs\.existsSync\(mobileJestBin\)/u);
  assert.match(source, /command: process\.execPath/u);
  assert.match(source, /MOBILE_JEST_CI_PACKAGE_RUNNER/u);
  assert.match(source, /direct-pnpm/u);
  assert.match(source, /command: "corepack"/u);
});

test("GitHub mobile test workflows bound pnpm batches while direct-routing Plan batches", () => {
  for (const workflow of [
    "../../.github/workflows/ci.yml",
    "../../.github/workflows/release.yml",
    "../../.github/workflows/security-scan.yml",
  ]) {
    const source = fs.readFileSync(new URL(workflow, import.meta.url), "utf8");

    assert.match(source, /MOBILE_JEST_CI_PACKAGE_RUNNER:\s+direct-pnpm/u);
    assert.match(source, /MOBILE_JEST_CI_BATCH_TIMEOUT_MS:\s+"900000"/u);
    assert.match(source, /MOBILE_JEST_CI_BATCH_SIZE:\s+"4"/u);
  }
});
