import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyLifecycleProof,
  countFatalMarkers,
  parseStartStatus,
  sanitizeSerial,
} from "./collect-android-apk-lifecycle-proof.mjs";

test("parses Android am start output status", () => {
  assert.equal(parseStartStatus("Status: ok\nLaunchState: COLD"), true);
  assert.equal(
    parseStartStatus("Error type 3\nActivity class does not exist"),
    false,
  );
});

test("counts fatal startup markers without storing raw device identifiers", () => {
  const logcat = [
    "ReactNativeJS: rendering",
    "AndroidRuntime: FATAL EXCEPTION: main",
    "signal 6 (SIGABRT)",
    "ReactNativeJS: Error: startup failed",
  ].join("\n");

  assert.equal(countFatalMarkers(logcat), 4);
  assert.notEqual(sanitizeSerial("emulator-5554"), "emulator-5554");
  assert.match(sanitizeSerial("emulator-5554"), /^[A-F0-9]{16}$/u);
});

test("classifies lifecycle proof with strict run counts", () => {
  assert.deepEqual(
    classifyLifecycleProof({
      backgroundResumeRuns: 10,
      backgroundResumeSuccess: 10,
      coldStartRuns: 10,
      coldStartSuccess: 10,
      fatalMarkerCount: 0,
      installExitCode: 0,
      startExitCode: 0,
    }),
    { ok: true, status: "PASS" },
  );

  assert.deepEqual(
    classifyLifecycleProof({
      backgroundResumeRuns: 10,
      backgroundResumeSuccess: 9,
      coldStartRuns: 10,
      coldStartSuccess: 10,
      fatalMarkerCount: 0,
      installExitCode: 0,
      startExitCode: 0,
    }),
    { ok: false, status: "FAIL_BACKGROUND_RESUME" },
  );

  assert.deepEqual(
    classifyLifecycleProof({
      backgroundResumeRuns: 10,
      backgroundResumeSuccess: 10,
      coldStartRuns: 10,
      coldStartSuccess: 10,
      fatalMarkerCount: 1,
      installExitCode: 0,
      startExitCode: 0,
    }),
    { ok: false, status: "FAIL_FATAL_MARKERS" },
  );
});
