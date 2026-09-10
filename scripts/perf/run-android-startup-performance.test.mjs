import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scriptSource = readFileSync(
  new URL("./run-android-startup-performance.mjs", import.meta.url),
  "utf8",
);

test("rejects physical runs with incomplete canonical marker coverage", () => {
  assert.match(scriptSource, /missingCanonicalMarkers/u);
  assert.match(scriptSource, /markerCoverageGate/u);
});

test("rejects physical runs with negative startup segments", () => {
  assert.match(scriptSource, /negativeSegmentGate/u);
  assert.match(scriptSource, /negativeSegmentKeys/u);
});
