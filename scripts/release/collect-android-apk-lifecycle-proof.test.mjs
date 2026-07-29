import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyRouteProbeSummary,
  hasNotificationScreenWithoutBottomTabs,
  classifyLifecycleProof,
  countFatalMarkers,
  parseStartStatus,
  redactSensitiveLogcat,
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

test("redacts sensitive logcat values before writing lifecycle evidence", () => {
  const redacted = redactSensitiveLogcat(
    [
      "ReactNativeJS: accessToken='secret-token-value-12345'",
      "ReactNativeJS: password=super-secret-value",
      "ReactNativeJS: user hong@example.com called 010-1234-5678",
      "ReactNativeJS: account 1234567890123456",
    ].join("\n"),
  );

  assert.doesNotMatch(redacted, /secret-token-value/u);
  assert.doesNotMatch(redacted, /super-secret-value/u);
  assert.doesNotMatch(redacted, /hong@example\.com/u);
  assert.doesNotMatch(redacted, /010-1234-5678/u);
  assert.doesNotMatch(redacted, /1234567890123456/u);
  assert.match(redacted, /\[REDACTED_EMAIL\]/u);
  assert.match(redacted, /\[REDACTED_PHONE\]/u);
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

test("classifies route probe evidence only when every route starts without fatal markers", () => {
  assert.deepEqual(
    classifyRouteProbeSummary([
      { fatalMarkerCount: 0, href: "/salary", startOk: true },
      { fatalMarkerCount: 0, href: "/plan", startOk: true },
      { fatalMarkerCount: 0, href: "/notifications", startOk: true },
    ]),
    {
      failedRoutes: [],
      navigationSmokeVerified: true,
      routeProbeCount: 3,
      status: "PASS_ROUTE_PROBES",
    },
  );

  assert.deepEqual(
    classifyRouteProbeSummary([
      { fatalMarkerCount: 0, href: "/salary", startOk: true },
      { fatalMarkerCount: 1, href: "/notifications", startOk: true },
    ]),
    {
      failedRoutes: ["/notifications"],
      navigationSmokeVerified: false,
      routeProbeCount: 2,
      status: "FAIL_ROUTE_PROBES",
    },
  );
});

test("verifies notification screen evidence only when bottom tab labels are absent", () => {
  const notificationDump = [
    '<node text="알림" resource-id="title" />',
    '<node text="새로운 알림이 있어요" resource-id="notice" />',
    '<node text="설정" resource-id="settings" />',
  ].join("\n");
  const tabbedDump = `${notificationDump}\n<node content-desc="급여 탭" /><node content-desc="계획 탭" /><node content-desc="커뮤니티 탭" /><node content-desc="MY 탭" />`;

  assert.equal(hasNotificationScreenWithoutBottomTabs(notificationDump), true);
  assert.equal(hasNotificationScreenWithoutBottomTabs(tabbedDump), false);
  assert.equal(
    hasNotificationScreenWithoutBottomTabs('<node text="로그인" />'),
    false,
  );
});
