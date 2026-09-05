import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GIB = 1024 ** 3;

const numberFromEnv = (env, key, fallback) => {
  const value = Number(env[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const bytesFromGb = (gb) => gb * GIB;

const gate = ({ actualBytes, label, requiredBytes }) => ({
  actualBytes,
  actualGb: Number((actualBytes / GIB).toFixed(2)),
  label,
  ok: actualBytes >= requiredBytes,
  requiredBytes,
  requiredGb: Number((requiredBytes / GIB).toFixed(2)),
});

const driveStats = (targetPath) => {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root || resolved;
  const stats = fs.statfsSync(root);
  return {
    freeBytes: Number(stats.bavail) * Number(stats.bsize),
    name: root,
    totalBytes: Number(stats.blocks) * Number(stats.bsize),
  };
};

const pathExists = (targetPath) => {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
};

const measurePathBytes = (targetPath, { maxEntries = 5000 } = {}) => {
  let total = 0;
  let entriesVisited = 0;
  let truncated = false;

  const visit = (currentPath) => {
    if (entriesVisited >= maxEntries) {
      truncated = true;
      return;
    }
    entriesVisited += 1;

    let stat;
    try {
      stat = fs.lstatSync(currentPath);
    } catch {
      return;
    }

    if (stat.isSymbolicLink()) return;
    if (stat.isFile()) {
      total += stat.size;
      return;
    }
    if (!stat.isDirectory()) return;

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      visit(path.join(currentPath, entry.name));
    }
  };

  if (pathExists(targetPath)) visit(targetPath);
  return { bytes: total, entriesVisited, truncated };
};

export function evaluateStorageBudget({
  artifactBytes = 0,
  artifactMeasurement = {
    bytes: artifactBytes,
    entriesVisited: 0,
    truncated: false,
  },
  env = process.env,
  requireAndroidBuildStart = false,
  systemDrive,
  workDrive,
} = {}) {
  const systemMinGb = numberFromEnv(
    env,
    "SH_SYSTEM_DRIVE_HARD_MIN_FREE_GB",
    15,
  );
  const workMinGb = numberFromEnv(env, "SH_WORK_DRIVE_HARD_MIN_FREE_GB", 25);
  const buildStartMinGb = numberFromEnv(
    env,
    "SH_ANDROID_BUILD_START_MIN_FREE_GB",
    35,
  );
  const hardMinPercent =
    numberFromEnv(env, "SH_HARD_MIN_FREE_PERCENT", 10) / 100;
  const warnFreePercent = numberFromEnv(env, "SH_WARN_FREE_PERCENT", 15) / 100;
  const maxArtifactStorageGb = numberFromEnv(
    env,
    "SH_MAX_ARTIFACT_STORAGE_GB",
    12,
  );

  const systemHardRequired = Math.max(
    bytesFromGb(systemMinGb),
    systemDrive.totalBytes * hardMinPercent,
  );
  const workHardRequired = Math.max(
    bytesFromGb(workMinGb),
    workDrive.totalBytes * hardMinPercent,
  );
  const workBuildStartRequired = Math.max(
    bytesFromGb(buildStartMinGb),
    workDrive.totalBytes * warnFreePercent,
  );

  const gates = {
    artifactBudget: gate({
      actualBytes: bytesFromGb(maxArtifactStorageGb) - artifactBytes,
      label: "Artifact storage budget",
      requiredBytes: 0,
    }),
    systemHard: gate({
      actualBytes: systemDrive.freeBytes,
      label: "System drive hard free space",
      requiredBytes: systemHardRequired,
    }),
    workHard: gate({
      actualBytes: workDrive.freeBytes,
      label: "Work drive hard free space",
      requiredBytes: workHardRequired,
    }),
    workBuildStart: gate({
      actualBytes: workDrive.freeBytes,
      label: "Android build-start free space",
      requiredBytes: workBuildStartRequired,
    }),
  };

  const activeGates = [
    gates.systemHard,
    gates.workHard,
    gates.artifactBudget,
    ...(requireAndroidBuildStart ? [gates.workBuildStart] : []),
  ];
  const failures = activeGates
    .filter((entry) => !entry.ok)
    .map(
      (entry) =>
        `${entry.label}: ${entry.actualGb}GB available, ${entry.requiredGb}GB required`,
    );

  return {
    artifactBytes,
    artifactGb: Number((artifactBytes / GIB).toFixed(2)),
    gates,
    ok: failures.length === 0,
    requireAndroidBuildStart,
    failures,
    systemDrive,
    workDrive,
    artifactMeasurement,
  };
}

function parseArgs(argv) {
  const options = {
    androidBuildStart: false,
    json: false,
    output: "artifacts/storage/storage-report.json",
    rootDir: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--android-build-start") {
      options.androidBuildStart = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--output") {
      options.output = argv[index + 1] ?? options.output;
      index += 1;
    } else if (arg === "--root") {
      options.rootDir = argv[index + 1] ?? options.rootDir;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function defaultArtifactRoot(env) {
  if (env.SH_ARTIFACT_ROOT) return env.SH_ARTIFACT_ROOT;
  if (process.platform === "win32" && pathExists("D:\\")) {
    return "D:\\salary-hijacking-artifacts";
  }
  return path.join(process.cwd(), "artifacts");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(options.rootDir);
  const artifactRoot = path.resolve(defaultArtifactRoot(process.env));
  const systemRoot = process.env.SystemDrive
    ? `${process.env.SystemDrive}\\`
    : path.parse(os.homedir()).root;
  const artifactMeasurement = measurePathBytes(artifactRoot, {
    maxEntries: Number(
      process.env.SH_STORAGE_ARTIFACT_SCAN_MAX_ENTRIES ?? 5000,
    ),
  });
  const result = evaluateStorageBudget({
    artifactBytes: artifactMeasurement.bytes,
    artifactMeasurement,
    requireAndroidBuildStart: options.androidBuildStart,
    systemDrive: driveStats(systemRoot),
    workDrive: driveStats(rootDir),
  });
  const report = {
    ...result,
    artifactRoot,
    generatedAt: new Date().toISOString(),
    rootDir,
  };

  fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const entry of Object.values(result.gates)) {
      const status = entry.ok ? "PASS" : "FAIL";
      console.log(
        `[storage-budget] ${status} ${entry.label}: ${entry.actualGb}GB available / ${entry.requiredGb}GB required`,
      );
    }
    console.log(`[storage-budget] report=${options.output}`);
  }

  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
