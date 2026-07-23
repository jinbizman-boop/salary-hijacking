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

const runAdb = ({ adbPath, args, outputPath = null, serial = "" }) => {
  const adbArgs = serial ? ["-s", serial, ...args] : args;
  const result = spawnSync(adbPath, adbArgs, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
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
    outputPath: resolve(resolvedOutDir, "logcat.txt"),
    serial: targetSerial,
  });
  runAdb({
    adbPath,
    args: ["shell", "dumpsys", "activity", "exit-info", packageName],
    outputPath: resolve(resolvedOutDir, "exit-info.txt"),
    serial: targetSerial,
  });

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
    ok: classification.ok,
    packageName,
    rawLogcatStored: true,
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
