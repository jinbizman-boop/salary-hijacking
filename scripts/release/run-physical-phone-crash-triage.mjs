import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveAdbPath,
  writeMobilePreviewPhoneProofFile,
} from "./collect-mobile-preview-phone-proof.mjs";

const DEFAULT_ORIGINAL_PACKAGE = "com.salaryhijacking.mobile";
const DEFAULT_DIAGNOSTIC_PACKAGE = "com.salaryhijacking.mobile.qa.direct";
const DEFAULT_ORIGINAL_APK =
  "C:/Users/PC/Downloads/salary-hijacking-original-safe-patched-current-universal.apk";
const DEFAULT_DIAGNOSTIC_APK =
  "C:/Users/PC/Downloads/salary-hijacking-qa-direct-current-universal.apk";
const DEFAULT_OUTPUT_PATH = "artifacts/qa/physical-phone-crash-triage";
const DEFAULT_RUNS = 10;
const DEFAULT_KNOWN_ADB_PATHS = [
  ".tools/android-sdk/platform-tools/adb.exe",
  ".tools/android-sdk/platform-tools/adb",
  "D:/salary-hijacking-artifacts/android-sdk/platform-tools/adb.exe",
  "D:/salary-hijacking-artifacts/android-sdk/platform-tools/adb",
];

const relativeToRoot = (rootDir, targetPath) =>
  path.isAbsolute(targetPath) ? path.relative(rootDir, targetPath) : targetPath;

const resolveQaAdbPath = ({ rootDir, adbPath, knownAdbPaths }) => {
  if (adbPath) return adbPath;
  const resolved = resolveAdbPath({ rootDir });
  if (resolved) return resolved;
  return (
    knownAdbPaths
      .map((candidate) =>
        path.isAbsolute(candidate) ? candidate : path.join(rootDir, candidate),
      )
      .find((candidate) => fs.existsSync(candidate)) ?? null
  );
};

export const buildPhysicalPhoneCrashTriagePlan = ({
  rootDir = process.cwd(),
  adbPath = null,
  knownAdbPaths = DEFAULT_KNOWN_ADB_PATHS,
  originalApkPath = DEFAULT_ORIGINAL_APK,
  diagnosticApkPath = DEFAULT_DIAGNOSTIC_APK,
  outputPath = DEFAULT_OUTPUT_PATH,
  runs = DEFAULT_RUNS,
} = {}) => {
  const resolvedAdbPath = resolveQaAdbPath({
    rootDir,
    adbPath,
    knownAdbPaths,
  });
  return {
    adbPath: resolvedAdbPath,
    outputPath,
    runs,
    cases: [
      {
        id: "original-package",
        apkPath: originalApkPath,
        packageName: DEFAULT_ORIGINAL_PACKAGE,
        proofOutputPath: `${outputPath}/original-package-proof.json`,
      },
      {
        id: "isolated-diagnostic",
        apkPath: diagnosticApkPath,
        packageName: DEFAULT_DIAGNOSTIC_PACKAGE,
        proofOutputPath: `${outputPath}/isolated-diagnostic-proof.json`,
      },
    ],
  };
};

const isBlockedBeforeStartup = (caseResult) => {
  const blocker = String(
    caseResult.proof?.android?.physicalPhoneBlocker ?? "",
  ).toLowerCase();
  return (
    blocker.includes("adb is unavailable") ||
    blocker.includes("no physical android phone") ||
    blocker.includes("apk is unavailable") ||
    blocker.includes("adb devices failed") ||
    blocker.includes("adb install failed")
  );
};

export const classifyPhysicalPhoneCrashTriage = (caseResults = []) => {
  const byId = new Map(caseResults.map((entry) => [entry.id, entry]));
  const original = byId.get("original-package");
  const diagnostic = byId.get("isolated-diagnostic");
  if (!original || !diagnostic) return "INCONCLUSIVE";

  const originalVerified = Boolean(
    original.proof?.android?.physicalPhoneVerified,
  );
  const diagnosticVerified = Boolean(
    diagnostic.proof?.android?.physicalPhoneVerified,
  );

  if (caseResults.some(isBlockedBeforeStartup)) {
    return "PHYSICAL_PHONE_QA_BLOCKED";
  }
  if (originalVerified && diagnosticVerified) return "NO_CRASH_REPRODUCED";
  if (!originalVerified && diagnosticVerified) {
    return "ORIGINAL_PACKAGE_ONLY_CRASH";
  }
  if (originalVerified && !diagnosticVerified) {
    return "DIAGNOSTIC_PACKAGE_ONLY_CRASH";
  }
  if (!originalVerified && !diagnosticVerified) return "SHARED_STARTUP_CRASH";
  return "INCONCLUSIVE";
};

const summarizeCase = ({ id, packageName, targetPath, proof }) => ({
  id,
  packageName,
  proofPath: targetPath,
  physicalPhoneVerified: Boolean(proof?.android?.physicalPhoneVerified),
  blocker: proof?.android?.physicalPhoneBlocker ?? null,
  apkPath: proof?.android?.apkPath ?? null,
  apkSha256: proof?.android?.apkSha256 ?? null,
  coldStartRuns: proof?.android?.coldStartRuns ?? 0,
  backgroundForegroundRuns: proof?.android?.backgroundForegroundRuns ?? 0,
  fatalExceptionCount:
    proof?.android?.logcatSummary?.fatalExceptionCount ??
    proof?.android?.coldStartFatalCount ??
    null,
  reactNativeFatalCount:
    proof?.android?.logcatSummary?.reactNativeFatalCount ?? null,
  rawLogcatStored: Boolean(proof?.android?.logcatSummary?.rawLogcatStored),
  containsRawLogcat: Boolean(proof?.privacy?.containsRawLogcat),
  containsRawDeviceIdentifier: Boolean(
    proof?.privacy?.containsRawDeviceIdentifier,
  ),
});

export const runPhysicalPhoneCrashTriage = ({
  rootDir = process.cwd(),
  adbPath = null,
  knownAdbPaths = DEFAULT_KNOWN_ADB_PATHS,
  originalApkPath = DEFAULT_ORIGINAL_APK,
  diagnosticApkPath = DEFAULT_DIAGNOSTIC_APK,
  outputPath = DEFAULT_OUTPUT_PATH,
  runs = DEFAULT_RUNS,
  writeProof = writeMobilePreviewPhoneProofFile,
  now = () => new Date(),
} = {}) => {
  const plan = buildPhysicalPhoneCrashTriagePlan({
    rootDir,
    adbPath,
    knownAdbPaths,
    originalApkPath,
    diagnosticApkPath,
    outputPath,
    runs,
  });
  const outputDir = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(rootDir, outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const caseResults = plan.cases.map((entry) => {
    const { proof, targetPath } = writeProof({
      rootDir,
      adbPath: plan.adbPath,
      apkPath: entry.apkPath,
      packageName: entry.packageName,
      coldStartRuns: plan.runs,
      outputPath: entry.proofOutputPath,
    });
    return {
      id: entry.id,
      packageName: entry.packageName,
      targetPath: relativeToRoot(rootDir, targetPath),
      proof,
    };
  });
  const classification = classifyPhysicalPhoneCrashTriage(caseResults);
  const summary = {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Paired physical Android crash triage for original package and isolated QA package. Raw logcat, raw device serials, secrets, signing keys, and tokens are not stored.",
    secretsRedacted: true,
    containsSecretValues: false,
    adbPath: plan.adbPath,
    runs: plan.runs,
    classification,
    interpretation: {
      NO_CRASH_REPRODUCED:
        "Both APKs passed the attached physical-phone startup probe; the reported crash was not reproduced in this run.",
      ORIGINAL_PACKAGE_ONLY_CRASH:
        "The original applicationId crashes while the isolated QA package opens, pointing to original package install state, signing mismatch, persisted local data, or package-specific native state.",
      DIAGNOSTIC_PACKAGE_ONLY_CRASH:
        "The isolated QA package crashes while the original package opens; inspect the diagnostic build configuration.",
      SHARED_STARTUP_CRASH:
        "Both packages crash on the same phone, pointing to a shared device/OS/native/runtime startup issue.",
      PHYSICAL_PHONE_QA_BLOCKED:
        "A physical-phone startup proof could not run, usually because no physical Android phone is attached or install/startup prerequisites failed.",
      INCONCLUSIVE:
        "The paired proof did not contain enough information to classify the crash.",
    }[classification],
    cases: caseResults.map(summarizeCase),
    privacy: {
      containsRawLogcat: false,
      containsRawDeviceIdentifier: false,
      containsSecretValues: false,
    },
  };

  const summaryPath = path.join(outputDir, "summary.json");
  fs.writeFileSync(
    summaryPath,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  return {
    summary,
    summaryPath,
    exitCode: classification === "NO_CRASH_REPRODUCED" ? 0 : 1,
  };
};

export const parsePhysicalPhoneCrashTriageArgs = (argv = []) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--original-apk") {
      options.originalApkPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--diagnostic-apk") {
      options.diagnosticApkPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--adb") {
      options.adbPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--runs") {
      const runs = Number(argv[index + 1]);
      if (!Number.isInteger(runs) || runs < 1) {
        throw new Error("--runs must be a positive integer");
      }
      options.runs = runs;
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.outputPath = argv[index + 1];
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
  const options = parsePhysicalPhoneCrashTriageArgs(process.argv.slice(2));
  const result = runPhysicalPhoneCrashTriage({
    rootDir: process.cwd(),
    ...options,
  });
  console.log(
    `[physical-phone-crash-triage] summary=${path.relative(
      process.cwd(),
      result.summaryPath,
    )}`,
  );
  console.log(
    `[physical-phone-crash-triage] classification=${result.summary.classification}`,
  );
  console.log(
    `[physical-phone-crash-triage] interpretation=${result.summary.interpretation}`,
  );
  process.exitCode = result.exitCode;
}
