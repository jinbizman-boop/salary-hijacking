import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE_APK =
  "artifacts/android/salary-hijacking-qa-release-like-universal.apk";
const DEFAULT_TARGETS = [
  "artifacts/android/salary-hijacking-qa-universal.apk",
  "C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk",
  "D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk",
];
const DEFAULT_MANIFEST_PATH = "artifacts/android/final-qa-apk-manifest.json";

const toAbsolute = (rootDir, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);

const fileSha256 = (targetPath) =>
  createHash("sha256")
    .update(fs.readFileSync(targetPath))
    .digest("hex")
    .toUpperCase();

const ensureParentDir = (targetPath) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
};

const relativeOrAbsolute = (rootDir, targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.relative(rootDir, targetPath);

export const buildFinalQaApkSyncPlan = ({
  rootDir = process.cwd(),
  sourceApk = DEFAULT_SOURCE_APK,
  targets = DEFAULT_TARGETS,
  sha256Targets = null,
  manifestPath = DEFAULT_MANIFEST_PATH,
} = {}) => {
  const resolvedSourceApk = toAbsolute(rootDir, sourceApk);
  if (!fs.existsSync(resolvedSourceApk)) {
    throw new Error(`source APK does not exist: ${sourceApk}`);
  }
  const resolvedTargets = targets.map((target) => toAbsolute(rootDir, target));
  const resolvedSha256Targets = (
    sha256Targets ?? targets.map((target) => `${target}.sha256`)
  ).map((target) => toAbsolute(rootDir, target));

  return {
    rootDir,
    sourceApk: resolvedSourceApk,
    targets: resolvedTargets,
    sha256Targets: resolvedSha256Targets,
    manifestPath: toAbsolute(rootDir, manifestPath),
    sha256: fileSha256(resolvedSourceApk),
    sizeBytes: fs.statSync(resolvedSourceApk).size,
  };
};

export const syncFinalQaApkArtifact = ({
  rootDir = process.cwd(),
  sourceApk = DEFAULT_SOURCE_APK,
  targets = DEFAULT_TARGETS,
  sha256Targets = null,
  manifestPath = DEFAULT_MANIFEST_PATH,
  now = () => new Date(),
} = {}) => {
  const plan = buildFinalQaApkSyncPlan({
    rootDir,
    sourceApk,
    targets,
    sha256Targets,
    manifestPath,
  });

  for (const targetPath of plan.targets) {
    ensureParentDir(targetPath);
    fs.copyFileSync(plan.sourceApk, targetPath);
  }

  for (const checksumPath of plan.sha256Targets) {
    const apkPath = checksumPath.replace(/\.sha256$/u, "");
    ensureParentDir(checksumPath);
    fs.writeFileSync(
      checksumPath,
      `${plan.sha256}  ${path.basename(apkPath)}\n`,
      "utf8",
    );
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: now().toISOString(),
    sourceApk: relativeOrAbsolute(rootDir, plan.sourceApk),
    fileName: "salary-hijacking-qa-universal.apk",
    sha256: plan.sha256,
    sizeBytes: plan.sizeBytes,
    targets: plan.targets.map((targetPath) =>
      relativeOrAbsolute(rootDir, targetPath),
    ),
    sha256Targets: plan.sha256Targets.map((targetPath) =>
      relativeOrAbsolute(rootDir, targetPath),
    ),
    secretsRedacted: true,
    containsSecretValues: false,
  };
  ensureParentDir(plan.manifestPath);
  fs.writeFileSync(
    plan.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return {
    ...plan,
    manifest,
  };
};

export const parseArgs = (argv = []) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--source-apk") {
      options.sourceApk = argv[++index];
      continue;
    }
    if (arg === "--target") {
      options.targets = [...(options.targets ?? []), argv[++index]];
      continue;
    }
    if (arg === "--sha256-target") {
      options.sha256Targets = [...(options.sha256Targets ?? []), argv[++index]];
      continue;
    }
    if (arg === "--manifest") {
      options.manifestPath = argv[++index];
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
  const result = syncFinalQaApkArtifact({
    rootDir: process.cwd(),
    ...parseArgs(process.argv.slice(2)),
  });
  console.log(`[sync-final-qa-apk] sha256=${result.sha256}`);
  console.log(
    `[sync-final-qa-apk] manifest=${path.relative(process.cwd(), result.manifestPath)}`,
  );
}
