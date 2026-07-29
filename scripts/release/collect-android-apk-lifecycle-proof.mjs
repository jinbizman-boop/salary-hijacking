#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultAdbPath = resolve(
  repoRoot,
  ".tools/android-sdk/platform-tools/adb.exe",
);
const ADB_COMMAND_TIMEOUT_MS = Number(
  process.env.SALARY_HIJACKING_ADB_COMMAND_TIMEOUT_MS ?? 120_000,
);

export function parseStartStatus(output) {
  return /(?:^|\n)\s*Status:\s*ok(?:\r?\n|$)/u.test(String(output));
}

export function countFatalMarkers(logcat) {
  const matches = String(logcat).match(
    /FATAL EXCEPTION|AndroidRuntime|SIGABRT|SIGSEGV|ReactNativeJS:.*(?:Error|Exception)/giu,
  );
  return matches?.length ?? 0;
}

export function sanitizeSerial(serial) {
  return createHash("sha256")
    .update(String(serial))
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

export function redactSensitiveLogcat(logcat) {
  return String(logcat)
    .replace(
      /(?:access|refresh|id)?token["'=:\s]+[A-Za-z0-9._~+/=-]{12,}/giu,
      "token=[REDACTED]",
    )
    .replace(
      /(?:api[_-]?key|secret|password)["'=:\s]+[^\s"'\\]{8,}/giu,
      "$1=[REDACTED]",
    )
    .replace(/\b\d{2,3}-\d{3,4}-\d{4}\b/gu, "[REDACTED_PHONE]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[REDACTED_EMAIL]")
    .replace(/\b\d{9,16}\b/gu, "[REDACTED_NUMBER]");
}

export function classifyLifecycleProof({
  backgroundResumeRuns,
  backgroundResumeSuccess,
  coldStartRuns,
  coldStartSuccess,
  fatalMarkerCount,
  installExitCode,
  startExitCode,
}) {
  if (installExitCode !== 0) return { ok: false, status: "FAIL_INSTALL" };
  if (startExitCode !== 0) return { ok: false, status: "FAIL_INITIAL_START" };
  if (coldStartSuccess !== coldStartRuns) {
    return { ok: false, status: "FAIL_COLD_START" };
  }
  if (backgroundResumeSuccess !== backgroundResumeRuns) {
    return { ok: false, status: "FAIL_BACKGROUND_RESUME" };
  }
  if (fatalMarkerCount > 0) return { ok: false, status: "FAIL_FATAL_MARKERS" };
  return { ok: true, status: "PASS" };
}

export function classifyRouteProbeSummary(routeProbeResults = []) {
  const failedRoutes = routeProbeResults
    .filter(
      (result) =>
        result.startOk !== true || Number(result.fatalMarkerCount ?? 0) > 0,
    )
    .map((result) => result.href);
  const navigationSmokeVerified =
    routeProbeResults.length > 0 && failedRoutes.length === 0;

  return {
    failedRoutes,
    navigationSmokeVerified,
    routeProbeCount: routeProbeResults.length,
    status: navigationSmokeVerified ? "PASS_ROUTE_PROBES" : "FAIL_ROUTE_PROBES",
  };
}

export function hasNotificationScreenWithoutBottomTabs(uiDump = "") {
  const text = String(uiDump);
  const hasNotificationMarker =
    /(?:알림|새로운\s*알림|notifications?|notifications-standalone-screen|급여납치\s*알림\s*독립\s*화면)/iu.test(
      text,
    );
  const hasBottomTabMarker =
    /(?:급여납치\s*하단\s*탭\s*내비게이션|급여\s*탭|계획\s*탭|커뮤니티\s*탭|MY\s*탭|profile_privacy|payroll_home|payroll_plan|anonymous_community)/u.test(
      text,
    );
  return hasNotificationMarker && !hasBottomTabMarker;
}

const runAdb = ({ adbPath, args, outputPath = null, serial = "" }) => {
  const adbArgs = serial ? ["-s", serial, ...args] : args;
  const result = spawnSync(adbPath, adbArgs, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: ADB_COMMAND_TIMEOUT_MS,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${
    result.error?.message ? `\n${result.error.message}` : ""
  }`;
  if (outputPath) writeFileSync(outputPath, output, "utf8");
  return {
    exitCode: result.status ?? 1,
    output,
  };
};

const findFirstDeviceSerial = (adbPath) => {
  const output = execFileSync(adbPath, ["devices"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const line = output
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find((value) => /^[^\s]+\s+device$/u.test(value));
  return line?.split(/\s+/u)[0] ?? "";
};

export function collectAndroidApkLifecycleProof({
  adbPath = defaultAdbPath,
  apkPath,
  backgroundResumeRuns = 10,
  coldStartRuns = 10,
  outDir,
  packageName,
  routeProbeHrefs = [
    "/salary",
    "/plan",
    "/level",
    "/community",
    "/profile",
    "/notifications",
  ],
  serial = "",
}) {
  if (!existsSync(adbPath)) throw new Error(`adb not found: ${adbPath}`);
  if (!apkPath || !existsSync(apkPath))
    throw new Error(`APK not found: ${apkPath}`);
  if (!packageName) throw new Error("packageName is required");
  const resolvedOutDir = resolve(outDir);
  mkdirSync(resolvedOutDir, { recursive: true });
  const targetSerial = serial || findFirstDeviceSerial(adbPath);
  if (!targetSerial) throw new Error("No Android device is connected");
  const activity = `${packageName}/.MainActivity`;

  runAdb({
    adbPath,
    args: ["uninstall", packageName],
    outputPath: resolve(resolvedOutDir, "uninstall.txt"),
    serial: targetSerial,
  });
  const install = runAdb({
    adbPath,
    args: ["install", "-r", apkPath],
    outputPath: resolve(resolvedOutDir, "install.txt"),
    serial: targetSerial,
  });
  runAdb({ adbPath, args: ["logcat", "-c"], serial: targetSerial });

  let coldStartSuccess = 0;
  let startExitCode = 0;
  for (let index = 1; index <= coldStartRuns; index += 1) {
    runAdb({
      adbPath,
      args: ["shell", "am", "force-stop", packageName],
      serial: targetSerial,
    });
    const start = runAdb({
      adbPath,
      args: ["shell", "am", "start", "-W", "-n", activity],
      outputPath: resolve(resolvedOutDir, `cold-start-${index}.txt`),
      serial: targetSerial,
    });
    if (index === 1) startExitCode = start.exitCode;
    if (start.exitCode === 0 && parseStartStatus(start.output))
      coldStartSuccess += 1;
  }

  let backgroundResumeSuccess = 0;
  for (let index = 1; index <= backgroundResumeRuns; index += 1) {
    runAdb({
      adbPath,
      args: ["shell", "input", "keyevent", "KEYCODE_HOME"],
      serial: targetSerial,
    });
    const resume = runAdb({
      adbPath,
      args: ["shell", "am", "start", "-W", "-n", activity],
      outputPath: resolve(resolvedOutDir, `background-resume-${index}.txt`),
      serial: targetSerial,
    });
    if (resume.exitCode === 0 && parseStartStatus(resume.output)) {
      backgroundResumeSuccess += 1;
    }
  }

  const logcat = runAdb({
    adbPath,
    args: [
      "logcat",
      "-d",
      "-v",
      "threadtime",
      "AndroidRuntime:E",
      "ReactNativeJS:V",
      "ReactNative:V",
      "Expo:V",
      "System.err:W",
      "*:S",
    ],
    serial: targetSerial,
  });
  writeFileSync(
    resolve(resolvedOutDir, "logcat-redacted.txt"),
    redactSensitiveLogcat(logcat.output),
    "utf8",
  );
  runAdb({
    adbPath,
    args: ["shell", "dumpsys", "activity", "exit-info", packageName],
    outputPath: resolve(resolvedOutDir, "exit-info.txt"),
    serial: targetSerial,
  });

  const routeProbeResults = [];
  for (const href of routeProbeHrefs) {
    const deepLink = `salaryhijacking:///${href.replace(/^\//u, "")}`;
    runAdb({ adbPath, args: ["logcat", "-c"], serial: targetSerial });
    runAdb({
      adbPath,
      args: ["shell", "am", "force-stop", packageName],
      serial: targetSerial,
    });
    const routeStart = runAdb({
      adbPath,
      args: [
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        deepLink,
        packageName,
      ],
      outputPath: resolve(
        resolvedOutDir,
        `route-${href.replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/^-|-$/gu, "") || "root"}.txt`,
      ),
      serial: targetSerial,
    });
    const routeLogcat = runAdb({
      adbPath,
      args: [
        "logcat",
        "-d",
        "-v",
        "threadtime",
        "AndroidRuntime:E",
        "ReactNativeJS:V",
        "ReactNative:V",
        "Expo:V",
        "System.err:W",
        "*:S",
      ],
      serial: targetSerial,
    });
    const routeFatalMarkerCount = countFatalMarkers(routeLogcat.output);
    routeProbeResults.push({
      fatalMarkerCount: routeFatalMarkerCount,
      href,
      startOk: routeStart.exitCode === 0 && parseStartStatus(routeStart.output),
    });
  }

  const routeProbeSummary = classifyRouteProbeSummary(routeProbeResults);
  const notificationDumpResult = runAdb({
    adbPath,
    args: ["shell", "uiautomator", "dump", "/sdcard/salary-window.xml"],
    serial: targetSerial,
  });
  const notificationDump =
    notificationDumpResult.exitCode === 0
      ? runAdb({
          adbPath,
          args: ["shell", "cat", "/sdcard/salary-window.xml"],
          serial: targetSerial,
        })
      : { exitCode: 1, output: "" };
  const notificationNoBottomTabVerified =
    notificationDump.exitCode === 0 &&
    hasNotificationScreenWithoutBottomTabs(notificationDump.output);

  const fatalMarkerCount = countFatalMarkers(logcat.output);
  const classification = classifyLifecycleProof({
    backgroundResumeRuns,
    backgroundResumeSuccess,
    coldStartRuns,
    coldStartSuccess,
    fatalMarkerCount,
    installExitCode: install.exitCode,
    startExitCode,
  });
  const summary = {
    schemaVersion: 1,
    apkPath,
    backgroundResumeRuns,
    backgroundResumeSuccess,
    coldStartRuns,
    coldStartSuccess,
    containsRawDeviceIdentifier: false,
    fatalMarkerCount,
    generatedAt: new Date().toISOString(),
    installExitCode: install.exitCode,
    navigationSmokeVerified: routeProbeSummary.navigationSmokeVerified,
    notificationNoBottomTabVerified,
    notificationNoBottomTabProbe:
      notificationDump.exitCode === 0
        ? "uiautomator dump inspected in-memory for notification markers and bottom-tab labels; raw XML is not stored"
        : "uiautomator dump unavailable",
    ok: classification.ok,
    packageName,
    logcatPath: "logcat-redacted.txt",
    rawLogcatStored: false,
    routeProbeResults,
    routeProbeSummary,
    serialHash: sanitizeSerial(targetSerial),
    startExitCode,
    status: classification.status,
  };
  writeFileSync(
    resolve(resolvedOutDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  return summary;
}

const parseArgs = (argv) => {
  const options = {
    adbPath: defaultAdbPath,
    backgroundResumeRuns: 10,
    coldStartRuns: 10,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--adb") options.adbPath = argv[++index];
    else if (arg === "--apk") options.apkPath = argv[++index];
    else if (arg === "--package") options.packageName = argv[++index];
    else if (arg === "--out-dir") options.outDir = argv[++index];
    else if (arg === "--serial") options.serial = argv[++index];
    else if (arg === "--cold-start-runs") {
      options.coldStartRuns = Number(argv[++index]);
    } else if (arg === "--background-resume-runs") {
      options.backgroundResumeRuns = Number(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
};

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const summary = collectAndroidApkLifecycleProof(
    parseArgs(process.argv.slice(2)),
  );
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
}
