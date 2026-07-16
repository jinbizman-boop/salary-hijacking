import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  resolveAdbPath,
  writeMobilePreviewPhoneProofFile,
} from "./collect-mobile-preview-phone-proof.mjs";

const DEFAULT_PREVIEW_EVIDENCE_PATH = "release/mobile-preview-evidence.json";
const DEFAULT_OUTPUT_PATH = "release/mobile-preview-phone-proof.local.json";
const DEFAULT_PACKAGE_NAME = "com.salaryhijacking.mobile";
const DEFAULT_RUNS = 20;
const DEFAULT_KNOWN_ADB_PATHS = [
  "D:/salary-hijacking-artifacts/android-sdk/platform-tools/adb.exe",
  "D:/salary-hijacking-artifacts/android-sdk/platform-tools/adb",
];

const readJson = (targetPath) =>
  JSON.parse(fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, ""));

const quoteValue = (value) =>
  /^[A-Za-z]:[\\/]/.test(String(value)) || /[\s"'`]/.test(String(value))
    ? `"${String(value).replaceAll('"', '\\"')}"`
    : String(value);

const defaultCommandRunner = (command, args) =>
  spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
  });

const readPreviewEvidence = (rootDir, previewEvidencePath) => {
  const targetPath = path.isAbsolute(previewEvidencePath)
    ? previewEvidencePath
    : path.join(rootDir, previewEvidencePath);
  return readJson(targetPath);
};

const resolveQaAdbPath = ({ rootDir, adbPath, knownAdbPaths }) => {
  if (adbPath) return adbPath;
  const resolved = resolveAdbPath({ rootDir });
  if (resolved) return resolved;
  return knownAdbPaths.find((candidate) => fs.existsSync(candidate)) ?? null;
};

export const buildPhysicalPhoneQaPlan = ({
  rootDir = process.cwd(),
  previewEvidencePath = DEFAULT_PREVIEW_EVIDENCE_PATH,
  apkPath = null,
  adbPath = null,
  knownAdbPaths = DEFAULT_KNOWN_ADB_PATHS,
  outputPath = DEFAULT_OUTPUT_PATH,
  packageName = null,
  runs = DEFAULT_RUNS,
} = {}) => {
  const evidence = readPreviewEvidence(rootDir, previewEvidencePath);
  const android = evidence.android ?? {};
  const appIdentity = evidence.appIdentity ?? {};
  const resolvedApkPath =
    apkPath ??
    android.phoneTargetDebugApkDownloadsPath ??
    android.phoneTargetDebugApkLocalPath;
  const resolvedPackageName =
    packageName ?? appIdentity.androidPackage ?? DEFAULT_PACKAGE_NAME;
  const resolvedAdbPath = resolveQaAdbPath({
    rootDir,
    adbPath,
    knownAdbPaths,
  });
  const args = [
    "scripts/release/collect-mobile-preview-phone-proof.mjs",
    "--apk",
    resolvedApkPath,
    "--runs",
    String(runs),
    "--output",
    outputPath,
    "--package",
    resolvedPackageName,
  ];
  if (resolvedAdbPath) {
    args.push("--adb", resolvedAdbPath);
  }

  return {
    apkPath: resolvedApkPath,
    adbPath: resolvedAdbPath,
    outputPath,
    packageName: resolvedPackageName,
    runs,
    collectorCommand: ["node", ...args.map(quoteValue)].join(" "),
    followUpCommand:
      "node scripts/release/check-release-readiness.mjs --strict",
  };
};

export const runPhysicalPhoneQa = ({
  rootDir = process.cwd(),
  previewEvidencePath = DEFAULT_PREVIEW_EVIDENCE_PATH,
  apkPath = null,
  adbPath = null,
  knownAdbPaths = DEFAULT_KNOWN_ADB_PATHS,
  outputPath = DEFAULT_OUTPUT_PATH,
  packageName = null,
  runs = DEFAULT_RUNS,
  writeProof = writeMobilePreviewPhoneProofFile,
  commandRunner = defaultCommandRunner,
} = {}) => {
  const plan = buildPhysicalPhoneQaPlan({
    rootDir,
    previewEvidencePath,
    apkPath,
    adbPath,
    knownAdbPaths,
    outputPath,
    packageName,
    runs,
  });
  const { proof, targetPath } = writeProof({
    rootDir,
    apkPath: plan.apkPath,
    adbPath: plan.adbPath,
    outputPath: plan.outputPath,
    packageName: plan.packageName,
    coldStartRuns: plan.runs,
  });
  const physicalPhoneVerified = Boolean(proof.android?.physicalPhoneVerified);
  const result = {
    plan,
    targetPath,
    physicalPhoneVerified,
    blocker: proof.android?.physicalPhoneBlocker ?? null,
    readinessExitCode: null,
    exitCode: physicalPhoneVerified ? 0 : 1,
  };

  if (!physicalPhoneVerified) {
    return result;
  }

  const readiness = commandRunner("node", [
    "scripts/release/check-release-readiness.mjs",
    "--strict",
  ]);
  result.readinessExitCode =
    typeof readiness.status === "number" ? readiness.status : 1;
  result.exitCode = result.readinessExitCode;
  return result;
};

export const parsePhysicalPhoneQaArgs = (argv = []) => {
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
    if (arg === "--package") {
      options.packageName = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
};

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const rootDir = process.cwd();
  const options = parsePhysicalPhoneQaArgs(process.argv.slice(2));
  const result = runPhysicalPhoneQa({ rootDir, ...options });
  console.log(
    `[physical-phone-qa] proof=${path.relative(rootDir, result.targetPath)}`,
  );
  console.log(`[physical-phone-qa] command=${result.plan.collectorCommand}`);
  console.log(
    `[physical-phone-qa] physicalPhoneVerified=${result.physicalPhoneVerified}`,
  );
  if (result.blocker) {
    console.log(`[physical-phone-qa] blocker=${result.blocker}`);
  }
  if (typeof result.readinessExitCode === "number") {
    console.log(
      `[physical-phone-qa] readinessExitCode=${result.readinessExitCode}`,
    );
  }
  process.exitCode = result.exitCode;
}
