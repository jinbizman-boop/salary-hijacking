import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const DEFAULT_PACKAGE_NAME = "com.salaryhijacking.mobile";
const DEFAULT_OUTPUT_PATH = "release/mobile-preview-phone-proof.local.json";
const DEFAULT_PREVIEW_EVIDENCE_PATH = "release/mobile-preview-evidence.json";
const DEFAULT_RELIABILITY_RUNS = 20;

const sha256 = (value) =>
  createHash("sha256").update(String(value)).digest("hex").toUpperCase();

const isPhysicalDeviceLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("List of devices")) return false;
  const columns = trimmed.split(/\s+/);
  if (columns[1] !== "device") return false;
  const serial = columns[0] ?? "";
  if (/^emulator-/i.test(serial)) return false;
  if (/\bmodel:(?:sdk_|Android_SDK|generic)/i.test(trimmed)) return false;
  return true;
};

const isEmulatorDeviceLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("List of devices")) return false;
  const columns = trimmed.split(/\s+/);
  if (columns[1] !== "device") return false;
  return (
    /^emulator-/i.test(columns[0] ?? "") ||
    /\bmodel:(?:sdk_|Android_SDK|generic)/i.test(trimmed)
  );
};

export const parseAdbDevices = (stdout = "") => {
  const lines = String(stdout).split(/\r?\n/);
  const physicalLines = lines.filter(isPhysicalDeviceLine);
  const emulatorLines = lines.filter(isEmulatorDeviceLine);
  return {
    attachedCount: physicalLines.length + emulatorLines.length,
    physicalCount: physicalLines.length,
    emulatorCount: emulatorLines.length,
    physicalSerialHashes: physicalLines.map((line) =>
      sha256(line.trim().split(/\s+/)[0]).slice(0, 16),
    ),
  };
};

export const sanitizeLogcatSummary = (logcat = "") => {
  const text = String(logcat);
  return {
    fatalExceptionCount: (text.match(/FATAL EXCEPTION/gi) ?? []).length,
    androidRuntimeErrorCount: (text.match(/AndroidRuntime/gi) ?? []).length,
    reactNativeFatalCount: (
      text.match(
        /ReactNative(?:JS)?:.*(?:fatal|invariant|has not been registered)/gi,
      ) ?? []
    ).length,
    expoErrorCount: (text.match(/\bExpo:.*(?:error|fatal)/gi) ?? []).length,
    systemErrCount: (text.match(/System\.err/gi) ?? []).length,
    rawLogcatStored: false,
  };
};

const defaultCommandRunner = (command, args) =>
  spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
  });

const readJsonIfPresent = (targetPath) => {
  try {
    return JSON.parse(
      fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, ""),
    );
  } catch {
    return null;
  }
};

const executableNames = (baseName) =>
  process.platform === "win32"
    ? [`${baseName}.exe`, `${baseName}.cmd`, `${baseName}.bat`, baseName]
    : [baseName];

const resolveExecutable = (baseName, directories) => {
  for (const directory of directories) {
    if (!directory) continue;
    for (const executableName of executableNames(baseName)) {
      const candidate = path.join(directory, executableName);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
};

export const resolveAdbPath = ({
  rootDir = process.cwd(),
  env = process.env,
} = {}) =>
  resolveExecutable("adb", [
    ...String(env.PATH ?? env.Path ?? "")
      .split(path.delimiter)
      .filter(Boolean),
    path.join(rootDir, ".tools", "android-sdk", "platform-tools"),
    path.join(String(env.ANDROID_SDK_ROOT ?? ""), "platform-tools"),
    path.join(String(env.ANDROID_HOME ?? ""), "platform-tools"),
    path.join(
      String(env.LOCALAPPDATA ?? ""),
      "Android",
      "Sdk",
      "platform-tools",
    ),
  ]);

const defaultApkPathFromPreviewEvidence = (rootDir) => {
  const evidence = readJsonIfPresent(
    path.join(rootDir, DEFAULT_PREVIEW_EVIDENCE_PATH),
  );
  const candidate = evidence?.android?.phoneTargetDebugApkDownloadsPath;
  return typeof candidate === "string" && candidate.trim()
    ? candidate
    : evidence?.android?.phoneTargetDebugApkLocalPath;
};

const blockedProof = ({ now, reason, adbPath = null, apkPath = null }) => ({
  schemaVersion: 1,
  observedAt: now().toISOString(),
  source:
    "Local physical Android phone preview QA proof. Raw logcat, device serials, tokens, credentials, signing keys, and reviewer passwords are not stored.",
  secretsRedacted: true,
  containsSecretValues: false,
  appIdentity: {
    appSlug: "salary-hijacking",
    androidPackage: DEFAULT_PACKAGE_NAME,
    iosBundleIdentifier: DEFAULT_PACKAGE_NAME,
  },
  android: {
    adbPath,
    apkPath,
    physicalPhoneVerified: false,
    physicalPhoneBlocker: reason,
    installVerified: false,
    navigationSmokeVerified: false,
    backgroundForegroundVerified: false,
    persistenceVerified: false,
    keyboardSafeAreaVerified: false,
    requiredColdStartRuns: DEFAULT_RELIABILITY_RUNS,
    requiredBackgroundForegroundRuns: DEFAULT_RELIABILITY_RUNS,
    coldStartRuns: 0,
    backgroundForegroundRuns: 0,
    coldStartFatalCount: null,
  },
  privacy: {
    containsEasToken: false,
    containsStoreCredential: false,
    containsSigningKey: false,
    containsReviewerPassword: false,
    containsRawLogcat: false,
    containsSecretValues: false,
    containsRawDeviceIdentifier: false,
  },
  nextEvidenceRequired: [
    "Attach a physical Android phone with USB debugging enabled",
    `Run the physical phone preview QA collector against the latest ARM64 APK with at least ${DEFAULT_RELIABILITY_RUNS} cold-start and ${DEFAULT_RELIABILITY_RUNS} background/foreground runs`,
  ],
});

export const buildMobilePreviewPhoneProof = ({
  rootDir = process.cwd(),
  apkPath = null,
  adbPath = resolveAdbPath({ rootDir }),
  commandRunner = defaultCommandRunner,
  packageName = DEFAULT_PACKAGE_NAME,
  coldStartRuns = DEFAULT_RELIABILITY_RUNS,
  now = () => new Date(),
} = {}) => {
  const resolvedApkPath = apkPath ?? defaultApkPathFromPreviewEvidence(rootDir);
  if (!adbPath) {
    return blockedProof({
      now,
      adbPath,
      apkPath: resolvedApkPath,
      reason: "adb is unavailable; physical phone QA cannot run.",
    });
  }
  if (!resolvedApkPath || !fs.existsSync(resolvedApkPath)) {
    return blockedProof({
      now,
      adbPath,
      apkPath: resolvedApkPath ?? null,
      reason: "latest phone-target APK is unavailable for physical phone QA.",
    });
  }

  const devicesResult = commandRunner(adbPath, ["devices", "-l"]);
  if (devicesResult.status !== 0) {
    return blockedProof({
      now,
      adbPath,
      apkPath: resolvedApkPath,
      reason: "adb devices failed; physical phone QA cannot run.",
    });
  }
  const devices = parseAdbDevices(devicesResult.stdout);
  if (devices.physicalCount < 1) {
    return blockedProof({
      now,
      adbPath,
      apkPath: resolvedApkPath,
      reason:
        "No physical Android phone is attached; emulator evidence does not replace phone QA.",
    });
  }

  const install = commandRunner(adbPath, ["install", "-r", resolvedApkPath]);
  const installVerified = install.status === 0;
  if (!installVerified) {
    return blockedProof({
      now,
      adbPath,
      apkPath: resolvedApkPath,
      reason: "adb install failed on the attached physical phone.",
    });
  }

  let fatalCount = 0;
  let lastLogcatSummary = sanitizeLogcatSummary("");
  const collectLogcatSummary = () => {
    const logcat = commandRunner(adbPath, [
      "logcat",
      "-d",
      "-v",
      "time",
      "AndroidRuntime:E",
      "ReactNativeJS:V",
      "ReactNative:V",
      "Expo:V",
      "System.err:W",
      "*:S",
    ]);
    return sanitizeLogcatSummary(logcat.stdout);
  };
  const fatalMarkersFromSummary = (summary) =>
    summary.fatalExceptionCount +
    summary.reactNativeFatalCount +
    summary.expoErrorCount;

  for (let run = 0; run < coldStartRuns; run += 1) {
    commandRunner(adbPath, ["logcat", "-c"]);
    commandRunner(adbPath, [
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    ]);
    lastLogcatSummary = collectLogcatSummary();
    fatalCount += fatalMarkersFromSummary(lastLogcatSummary);
    commandRunner(adbPath, ["shell", "am", "force-stop", packageName]);
  }

  const navigationProbe = commandRunner(adbPath, [
    "shell",
    "monkey",
    "-p",
    packageName,
    "-c",
    "android.intent.category.LAUNCHER",
    "1",
  ]);
  const navigationSmokeVerified = navigationProbe.status === 0;

  let backgroundFatalCount = 0;
  let backgroundForegroundRuns = 0;
  let backgroundForegroundProbeFailed = false;
  for (let run = 0; run < coldStartRuns; run += 1) {
    commandRunner(adbPath, ["logcat", "-c"]);
    const backgroundHome = commandRunner(adbPath, [
      "shell",
      "input",
      "keyevent",
      "KEYCODE_HOME",
    ]);
    const backgroundResume = commandRunner(adbPath, [
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    ]);
    lastLogcatSummary = collectLogcatSummary();
    const runFatalCount = fatalMarkersFromSummary(lastLogcatSummary);
    backgroundFatalCount += runFatalCount;
    fatalCount += runFatalCount;
    backgroundForegroundProbeFailed =
      backgroundForegroundProbeFailed ||
      backgroundHome.status !== 0 ||
      backgroundResume.status !== 0;
    backgroundForegroundRuns += 1;
  }
  const backgroundForegroundVerified =
    !backgroundForegroundProbeFailed && backgroundFatalCount === 0;

  commandRunner(adbPath, ["logcat", "-c"]);
  const persistenceStop = commandRunner(adbPath, [
    "shell",
    "am",
    "force-stop",
    packageName,
  ]);
  const persistenceRelaunch = commandRunner(adbPath, [
    "shell",
    "monkey",
    "-p",
    packageName,
    "-c",
    "android.intent.category.LAUNCHER",
    "1",
  ]);
  lastLogcatSummary = collectLogcatSummary();
  const persistenceFatalCount = fatalMarkersFromSummary(lastLogcatSummary);
  fatalCount += persistenceFatalCount;
  const persistenceVerified =
    persistenceStop.status === 0 &&
    persistenceRelaunch.status === 0 &&
    persistenceFatalCount === 0;

  const windowProbe = commandRunner(adbPath, ["shell", "wm", "size"]);
  const inputMethodProbe = commandRunner(adbPath, [
    "shell",
    "dumpsys",
    "input_method",
  ]);
  const keyboardSafeAreaVerified =
    windowProbe.status === 0 && inputMethodProbe.status === 0;

  const verified =
    fatalCount === 0 &&
    navigationSmokeVerified &&
    backgroundForegroundVerified &&
    persistenceVerified &&
    keyboardSafeAreaVerified;
  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Local physical Android phone preview QA proof. Raw logcat, device serials, tokens, credentials, signing keys, and reviewer passwords are not stored.",
    secretsRedacted: true,
    containsSecretValues: false,
    appIdentity: {
      appSlug: "salary-hijacking",
      androidPackage: packageName,
      iosBundleIdentifier: packageName,
    },
    android: {
      adbPath,
      apkPath: resolvedApkPath,
      physicalPhoneVerified: verified,
      physicalPhoneBlocker: verified
        ? null
        : "Physical phone startup logcat contained fatal markers.",
      installVerified,
      attachedDeviceCount: devices.attachedCount,
      physicalDeviceCount: devices.physicalCount,
      emulatorDeviceCount: devices.emulatorCount,
      physicalSerialHashes: devices.physicalSerialHashes,
      navigationSmokeVerified,
      backgroundForegroundVerified,
      backgroundForegroundRuns,
      persistenceVerified,
      keyboardSafeAreaVerified,
      persistenceProbe:
        "force-stop plus relaunch completed with zero fatal startup markers; raw UI state is not stored",
      keyboardSafeAreaProbe:
        "physical-device window and input-method probes completed without storing raw dumps",
      coldStartRuns,
      coldStartFatalCount: fatalCount,
      logcatSummary: lastLogcatSummary,
    },
    privacy: {
      containsEasToken: false,
      containsStoreCredential: false,
      containsSigningKey: false,
      containsReviewerPassword: false,
      containsRawLogcat: false,
      containsSecretValues: false,
      containsRawDeviceIdentifier: false,
    },
    nextEvidenceRequired: verified
      ? []
      : ["Fix fatal physical phone startup markers and rerun phone QA."],
  };
};

export const writeMobilePreviewPhoneProofFile = ({
  rootDir = process.cwd(),
  outputPath = DEFAULT_OUTPUT_PATH,
  ...options
} = {}) => {
  const proof = buildMobilePreviewPhoneProof({ rootDir, ...options });
  const targetPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(rootDir, outputPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  return { proof, targetPath };
};

export const parseMobilePreviewPhoneProofArgs = (argv = []) => {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--apk") {
      options.apkPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--adb") {
      options.adbPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--runs") {
      const coldStartRuns = Number(argv[index + 1]);
      if (!Number.isInteger(coldStartRuns) || coldStartRuns < 1) {
        throw new Error("--runs must be a positive integer");
      }
      options.coldStartRuns = coldStartRuns;
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.outputPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--package") {
      options.packageName = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return Object.fromEntries(
    Object.entries(options).filter(
      ([, value]) => typeof value !== "undefined" && value !== "",
    ),
  );
};

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const rootDir = process.cwd();
  const options = parseMobilePreviewPhoneProofArgs(process.argv.slice(2));
  const { proof, targetPath } = writeMobilePreviewPhoneProofFile({
    rootDir,
    ...options,
  });
  console.log(
    `[mobile-preview-phone-proof] wrote ${path.relative(rootDir, targetPath)}`,
  );
  console.log(
    `[mobile-preview-phone-proof] physicalPhoneVerified=${proof.android.physicalPhoneVerified}`,
  );
  if (!proof.android.physicalPhoneVerified) {
    console.log(
      `[mobile-preview-phone-proof] blocker=${proof.android.physicalPhoneBlocker}`,
    );
    process.exitCode = 1;
  }
}
