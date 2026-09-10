import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  evaluateStartupPerformanceRows,
  markerNames,
} from "./startup-performance-evaluator.mjs";

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

test("supports release physical runs without clearing app data", () => {
  assert.match(scriptSource, /--data-reset/u);
  assert.match(scriptSource, /dataResetMode === "clear"/u);
});

test("evaluates marker coverage and negative segments from fixture rows", () => {
  const validRow = {
    markersSeen: markerNames,
    segProcessActivityMs: 1,
    segNativeActivityInitMs: 1,
    segRnRootCreateMs: 1,
    segNativeToJsMs: 1,
    segJsStartMs: 1,
    segAuthBootstrapMs: 1,
    segRouteDecisionMs: 1,
    segSplashHideMs: 1,
    segInteractiveMs: 1,
    totalSplashRawP13Ms: 10,
    totalStableRouteVisibleMs: 10,
    totalInteractiveMs: 12,
    activityTotalMs: 500,
  };
  assert.equal(
    evaluateStartupPerformanceRows([validRow]).markerCoverageGate,
    "PASS",
  );
  assert.equal(
    evaluateStartupPerformanceRows([validRow]).negativeSegmentGate,
    "PASS",
  );
  assert.equal(evaluateStartupPerformanceRows([validRow]).validRunCount, 1);

  const missingMarker = {
    ...validRow,
    markersSeen: markerNames.filter(
      (marker) => marker !== "startup.p14.route_interactive",
    ),
  };
  const missingMarkerResult = evaluateStartupPerformanceRows([missingMarker]);
  assert.equal(missingMarkerResult.markerCoverageGate, "FAIL");
  assert.equal(missingMarkerResult.validRunCount, 0);

  const negativeSegment = {
    ...validRow,
    segRouteDecisionMs: -12,
  };
  const negativeSegmentResult = evaluateStartupPerformanceRows([
    negativeSegment,
  ]);
  assert.equal(negativeSegmentResult.negativeSegmentGate, "FAIL");
  assert.deepEqual(negativeSegmentResult.negativeSegmentKeys, [
    "segRouteDecisionMs",
  ]);
  assert.equal(negativeSegmentResult.validRunCount, 0);
});
