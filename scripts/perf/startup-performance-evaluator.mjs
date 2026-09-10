export const markerNames = [
  "startup.n0.launch_requested",
  "startup.n1.application_on_create_entry",
  "startup.n2.activity_on_create_entry",
  "startup.n3.activity_super_on_create_complete",
  "startup.n4.react_root_view_create_start",
  "startup.n5.native_first_frame_ready",
  "startup.p3.js_bundle_start",
  "startup.p4.root_module_evaluated",
  "startup.p5.auth_bootstrap_start",
  "startup.p6.secure_storage_read_complete",
  "startup.p7.session_validation_complete",
  "startup.p8.readiness_decision_complete",
  "startup.p9.destination_resolved",
  "startup.p10.route_component_mount_start",
  "startup.p11.route_first_commit",
  "startup.p12.splash_hide_requested",
  "startup.p13.splash_hide_completed",
  "startup.p14.route_interactive",
];

export const segmentKeys = [
  "segProcessActivityMs",
  "segNativeActivityInitMs",
  "segRnRootCreateMs",
  "segNativeToJsMs",
  "segJsStartMs",
  "segAuthBootstrapMs",
  "segRouteDecisionMs",
  "segSplashHideMs",
  "segInteractiveMs",
  "totalSplashRawP13Ms",
  "totalStableRouteVisibleMs",
  "totalInteractiveMs",
  "activityTotalMs",
];

export function percentile(values, percentileValue) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .slice()
    .sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  );
  return sorted[index];
}

export function summarize(rows, key) {
  const values = rows
    .map((row) => row[key])
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return {
      runs: rows.length,
      samples: 0,
      minMs: null,
      p50Ms: null,
      p90Ms: null,
      p95Ms: null,
      maxMs: null,
      stdevMs: null,
    };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    runs: rows.length,
    samples: values.length,
    minMs: Math.round(Math.min(...values)),
    p50Ms: Math.round(percentile(values, 50)),
    p90Ms: Math.round(percentile(values, 90)),
    p95Ms: Math.round(percentile(values, 95)),
    maxMs: Math.round(Math.max(...values)),
    stdevMs: Math.round(Math.sqrt(variance)),
  };
}

export function evaluateStartupPerformanceRows(rows) {
  const segmentSummary = Object.fromEntries(
    segmentKeys.map((key) => [key, summarize(rows, key)]),
  );
  const markerCoverage = Object.fromEntries(
    markerNames.map((marker) => [
      marker,
      rows.filter((row) => row.markersSeen.includes(marker)).length,
    ]),
  );
  const missingCanonicalMarkers = markerNames.filter(
    (marker) => markerCoverage[marker] !== rows.length,
  );
  const markerCoverageGate =
    rows.length > 0 && missingCanonicalMarkers.length === 0 ? "PASS" : "FAIL";
  const negativeSegmentKeys = segmentKeys
    .filter((key) => !key.startsWith("total") && key !== "activityTotalMs")
    .filter((key) =>
      rows.some((row) => Number.isFinite(row[key]) && row[key] < 0),
    );
  const negativeSegmentGate =
    negativeSegmentKeys.length === 0 ? "PASS" : "FAIL";
  const invalidRows = rows.filter(
    (row) =>
      markerNames.some((marker) => !row.markersSeen.includes(marker)) ||
      segmentKeys
        .filter((key) => !key.startsWith("total") && key !== "activityTotalMs")
        .some((key) => Number.isFinite(row[key]) && row[key] < 0),
  );
  const validRunCount = rows.length - invalidRows.length;
  const validRunCountGate = validRunCount > 0 ? "PASS" : "FAIL";

  return {
    segmentSummary,
    markerCoverage,
    missingCanonicalMarkers,
    markerCoverageGate,
    negativeSegmentKeys,
    negativeSegmentGate,
    invalidRunCount: invalidRows.length,
    validRunCount,
    validRunCountGate,
  };
}
