import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { freemem, loadavg, platform, totalmem } from "node:os";
import { join, resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const adbPath = args.get("--adb") ?? "adb";
const apkPath = args.get("--apk");
const sourceSha = args.get("--source-sha") ?? "UNKNOWN";
const apkSha = args.get("--apk-sha") ?? "UNKNOWN";
const packageName = args.get("--package") ?? "com.salaryhijacking.mobile";
const activityName =
  args.get("--activity") ?? "com.salaryhijacking.mobile/.MainActivity";
const outDir = resolve(
  args.get("--out-dir") ?? "artifacts/android-startup-performance/latest",
);
const runs = Number(args.get("--runs") ?? "20");
const installMode = args.get("--install") ?? "reinstall";
const launchTimeoutMs = Number(args.get("--launch-timeout-ms") ?? "15000");
const sampleLabel = args.get("--sample-label") ?? "startup";

if (!apkPath || !existsSync(apkPath)) {
  throw new Error(`APK not found: ${apkPath ?? "<missing>"}`);
}
mkdirSync(outDir, { recursive: true });

function adb(adbArgs, options = {}) {
  return execFileSync(adbPath, adbArgs, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function percentile(values, percentileValue) {
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

function summarize(rows, key) {
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

function parseEpochMs(line) {
  const match = line.match(/^\s*(\d{10}(?:\.\d+)?)\s+/u);
  if (!match) return null;
  return Math.round(Number(match[1]) * 1000);
}

function parseMarkers(logcat) {
  const markers = new Map();
  for (const line of logcat.split(/\r?\n/u)) {
    if (!line.includes("[SH_RELEASE_PERF]")) continue;
    const marker = line.match(/\bmarker=([^\s]+)/u)?.[1];
    const logEpochMs = parseEpochMs(line);
    const markerEpochMs = Number(line.match(/\bt=(\d+)/u)?.[1] ?? Number.NaN);
    const deviceElapsedMs = Number(
      line.match(/\belapsed_ms=(\d+)/u)?.[1] ?? Number.NaN,
    );
    const jsMonoMs = Number(line.match(/\bmono_ms=(\d+)/u)?.[1] ?? Number.NaN);
    if (!marker || !Number.isFinite(logEpochMs)) continue;
    if (!markers.has(marker)) {
      markers.set(marker, {
        marker,
        logEpochMs,
        markerEpochMs: Number.isFinite(markerEpochMs) ? markerEpochMs : null,
        deviceElapsedMs: Number.isFinite(deviceElapsedMs)
          ? deviceElapsedMs
          : null,
        jsMonoMs: Number.isFinite(jsMonoMs) ? jsMonoMs : null,
        raw: line,
      });
    }
  }
  return markers;
}

function collectMarkersUntil(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let markers = new Map();
  while (Date.now() < deadline) {
    markers = parseMarkers(adb(["logcat", "-d", "-v", "epoch"]));
    if (
      markers.has("startup.p11.route_first_commit") &&
      markers.has("startup.p13.splash_hide_completed") &&
      markers.has("startup.p14.route_interactive")
    ) {
      return markers;
    }
    sleep(120);
  }
  return markers;
}

function hostPrecheck() {
  return {
    platform: platform(),
    loadavg1: Number(loadavg()[0]?.toFixed(2) ?? 0),
    freeRamGb: Number((freemem() / 1024 ** 3).toFixed(2)),
    totalRamGb: Number((totalmem() / 1024 ** 3).toFixed(2)),
  };
}

function point(markers, marker) {
  const entry = markers.get(marker);
  return entry?.markerEpochMs ?? entry?.logEpochMs ?? null;
}

function delta(start, end) {
  return Number.isFinite(start) && Number.isFinite(end) ? end - start : null;
}

function maxPoint(...values) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length === values.length ? Math.max(...finite) : null;
}

adb(["wait-for-device"]);
if (installMode !== "skip") {
  adb(["install", "-r", apkPath], { stdio: "ignore" });
}

const rows = [];
for (let run = 1; run <= runs; run += 1) {
  const runId = `${sampleLabel}-${String(run).padStart(2, "0")}`;
  const hostBefore = hostPrecheck();
  adb(["shell", "pm", "clear", packageName], { stdio: "ignore" });
  adb(["shell", "am", "force-stop", packageName], { stdio: "ignore" });
  adb(["logcat", "-c"], { stdio: "ignore" });
  sleep(350);
  const startOutput = adb([
    "shell",
    `log -t SH_RELEASE_PERF '[SH_RELEASE_PERF] marker=startup.n0.launch_requested route=bootstrap run_id=${runId}'; am start -W -n ${activityName}`,
  ]);
  const markers = collectMarkersUntil(launchTimeoutMs);
  const hostAfter = hostPrecheck();
  const points = {
    n0: point(markers, "startup.n0.launch_requested"),
    n1: point(markers, "startup.n1.application_on_create_entry"),
    n2: point(markers, "startup.n2.activity_on_create_entry"),
    n3: point(markers, "startup.n3.activity_super_on_create_complete"),
    n4: point(markers, "startup.n4.react_root_view_create_start"),
    n5: point(markers, "startup.n5.native_first_frame_ready"),
    p3: point(markers, "startup.p3.js_bundle_start"),
    p4: point(markers, "startup.p4.root_module_evaluated"),
    p5: point(markers, "startup.p5.auth_bootstrap_start"),
    p6: point(markers, "startup.p6.secure_storage_read_complete"),
    p7: point(markers, "startup.p7.session_validation_complete"),
    p8: point(markers, "startup.p8.readiness_decision_complete"),
    p9: point(markers, "startup.p9.destination_resolved"),
    p10: point(markers, "startup.p10.route_component_mount_start"),
    p11: point(markers, "startup.p11.route_first_commit"),
    p12: point(markers, "startup.p12.splash_hide_requested"),
    p13: point(markers, "startup.p13.splash_hide_completed"),
    p14: point(markers, "startup.p14.route_interactive"),
  };
  const row = {
    run,
    runId,
    hostBefore,
    hostAfter,
    activityTotalMs: Number(
      startOutput.match(/TotalTime:\s*(\d+)/u)?.[1] ?? Number.NaN,
    ),
    markersSeen: [...markers.keys()],
    points,
    segProcessActivityMs: delta(points.n0, points.n2),
    segNativeActivityInitMs: delta(points.n2, points.n3),
    segRnRootCreateMs: delta(points.n3, points.n5),
    segNativeToJsMs: delta(points.n5, points.p3),
    segJsStartMs: delta(points.p3, points.p4),
    segAuthBootstrapMs: delta(points.p5, points.p8),
    segRouteDecisionMs: delta(points.p8, points.p11),
    segSplashHideMs:
      Number.isFinite(points.p11) && Number.isFinite(points.p13)
        ? Math.max(0, points.p13 - points.p11)
        : null,
    segInteractiveMs: delta(points.p13, points.p14),
    totalSplashRawP13Ms: delta(points.n0, points.p13),
    totalStableRouteVisibleMs: delta(
      points.n0,
      maxPoint(points.p11, points.p13),
    ),
    totalInteractiveMs: delta(points.n0, points.p14),
  };
  rows.push(row);
  writeFileSync(
    join(outDir, `${runId}.json`),
    JSON.stringify(row, null, 2),
    "utf8",
  );
}

const segmentKeys = [
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
const segmentSummary = Object.fromEntries(
  segmentKeys.map((key) => [key, summarize(rows, key)]),
);
const candidates = segmentKeys
  .filter((key) => !key.startsWith("total") && key !== "activityTotalMs")
  .map((key) => [key, segmentSummary[key].p95Ms])
  .filter((entry) => Number.isFinite(entry[1]))
  .sort((left, right) => right[1] - left[1]);
const markerNames = [
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
const markerCoverage = Object.fromEntries(
  markerNames.map((marker) => [
    marker,
    rows.filter((row) => row.markersSeen.includes(marker)).length,
  ]),
);

const hostFreeRamValues = rows.flatMap((row) => [
  row.hostBefore.freeRamGb,
  row.hostAfter.freeRamGb,
]);
const hostLoadValues = rows.flatMap((row) => [
  row.hostBefore.loadavg1,
  row.hostAfter.loadavg1,
]);
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceSha,
  apkSha,
  packageName,
  activityName,
  markerClockSynchronizationMethod:
    "MARKER_DEVICE_WALL_CLOCK_T_FIELD_FOR_CROSS_NATIVE_JS_SEGMENTS; LOGCAT_EPOCH_RETAINED_AS_COLLECTION_CLOCK",
  measurementBoundaries: {
    activityTotalStartBoundary:
      "Android ActivityTaskManager am start -W launch timing after intent dispatch; does not include the preceding shell log N0 write.",
    activityTotalEndBoundary:
      "ActivityTaskManager launch TotalTime completion, before JS splash-hide promise completion in this harness.",
    n0SemanticBoundary:
      "External harness marker emitted in the same device shell immediately before am start -W.",
    p13SemanticBoundary:
      "JS SplashScreen.hideAsync promise resolved.",
    stableRouteVisibleBoundary:
      "Run-level max(P11 route_first_commit, P13 splash_hide_completed); this is the first point where both the route has committed and the native splash is no longer covering it.",
  },
  rows,
  markerCoverage,
  hostSummary: {
    freeRamP50Gb: percentile(hostFreeRamValues, 50),
    freeRamMinGb: Math.min(...hostFreeRamValues),
    loadavg1P50: percentile(hostLoadValues, 50),
    loadavg1Max: Math.max(...hostLoadValues),
  },
  segmentSummary,
  startupOverallP95DominantSegment: candidates[0]?.[0] ?? null,
  startupOverallP95DominantP95Ms: candidates[0]?.[1] ?? null,
  secondarySegment: candidates[1]?.[0] ?? null,
  secondarySegmentP95Ms: candidates[1]?.[1] ?? null,
};
const outputPath = join(outDir, "startup-performance-summary.json");
writeFileSync(outputPath, JSON.stringify(summary, null, 2), "utf8");
console.log(
  JSON.stringify(
    {
      outputPath,
      markerCoverage,
      startupOverallP95DominantSegment:
        summary.startupOverallP95DominantSegment,
      startupOverallP95DominantP95Ms:
        summary.startupOverallP95DominantP95Ms,
      activityTotalP95Ms: segmentSummary.activityTotalMs.p95Ms,
      stableRouteVisibleP95Ms:
        segmentSummary.totalStableRouteVisibleMs.p95Ms,
    },
    null,
    2,
  ),
);
