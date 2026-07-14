import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GENERATED_STORAGE_PATHS = [
  ".turbo",
  ".wrangler",
  ".next",
  ".open-next",
  ".expo",
  "apps/mobile/.expo",
  "apps/mobile/.eas/build",
  "apps/mobile/.eas/cache",
  "apps/mobile/android/.gradle",
  "apps/mobile/android/.cxx",
  "apps/mobile/android/build",
  "apps/mobile/android/app/build",
  "apps/mobile/ios/build",
  "apps/mobile/ios/Pods",
];

const PROTECTED_STORAGE_PATHS = [
  "node_modules",
  "apps/mobile/node_modules",
  ".git",
  ".dev.vars",
];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function pathExists(targetPath) {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function measurePathBytes(targetPath) {
  let total = 0;

  async function visit(currentPath) {
    let stat;
    try {
      stat = await fs.promises.lstat(currentPath);
    } catch {
      return;
    }

    if (stat.isSymbolicLink()) return;
    if (stat.isFile()) {
      total += stat.size;
      return;
    }
    if (!stat.isDirectory()) return;

    const entries = await fs.promises.readdir(currentPath, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      await visit(path.join(currentPath, entry.name));
    }
  }

  await visit(targetPath);
  return total;
}

async function describeRelativePath(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const exists = await pathExists(absolutePath);
  return {
    bytes: exists ? await measurePathBytes(absolutePath) : 0,
    exists,
    path: toPosix(relativePath),
  };
}

async function collectTopLevel(rootDir, limit) {
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
  const rows = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    rows.push({
      bytes: await measurePathBytes(fullPath),
      path: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
    });
  }

  return rows
    .sort(
      (left, right) =>
        right.bytes - left.bytes || left.path.localeCompare(right.path),
    )
    .slice(0, limit);
}

async function collectSiblingSalaryWorkspaces(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const parentDir = path.dirname(resolvedRoot);
  const currentName = path.basename(resolvedRoot).toLowerCase();

  let entries;
  try {
    entries = await fs.promises.readdir(parentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const siblings = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const lowerName = entry.name.toLowerCase();
    if (lowerName === currentName) continue;
    if (!lowerName.startsWith("salary-hijacking-")) continue;

    const siblingPath = path.join(parentDir, entry.name);
    siblings.push({
      bytes: await measurePathBytes(siblingPath),
      name: entry.name,
      path: siblingPath,
      rootDir: parentDir,
    });
  }

  return siblings.sort(
    (left, right) =>
      right.bytes - left.bytes || left.name.localeCompare(right.name),
  );
}

export async function collectWorkspaceDiskUsage(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const topLevelLimit = Math.max(1, Number(options.topLevelLimit ?? 20));

  const topLevel = await collectTopLevel(rootDir, topLevelLimit);
  const generatedPaths = await Promise.all(
    GENERATED_STORAGE_PATHS.map((relativePath) =>
      describeRelativePath(rootDir, relativePath),
    ),
  );
  const protectedPaths = await Promise.all(
    PROTECTED_STORAGE_PATHS.map((relativePath) =>
      describeRelativePath(rootDir, relativePath),
    ),
  );

  return {
    generatedPaths,
    protectedPaths: protectedPaths.filter((entry) => entry.exists),
    rootDir,
    siblingSalaryWorkspaces: await collectSiblingSalaryWorkspaces(rootDir),
    topLevel,
    totalBytes: topLevel.reduce((sum, entry) => sum + entry.bytes, 0),
  };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function parseArgs(argv) {
  const options = {
    json: false,
    rootDir: process.cwd(),
    topLevelLimit: 20,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--root") {
      options.rootDir = argv[index + 1] ?? options.rootDir;
      index += 1;
    } else if (arg === "--top") {
      options.topLevelLimit = Number(argv[index + 1] ?? options.topLevelLimit);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHumanReport(report) {
  console.log(`[disk:report] root: ${report.rootDir}`);
  console.log(
    `[disk:report] top-level total: ${formatBytes(report.totalBytes)}`,
  );

  console.log("[disk:report] largest top-level paths:");
  for (const entry of report.topLevel) {
    console.log(`- ${entry.path}: ${formatBytes(entry.bytes)} (${entry.type})`);
  }

  const generated = report.generatedPaths.filter((entry) => entry.exists);
  console.log("[disk:report] removable generated paths:");
  if (generated.length === 0) {
    console.log("- none");
  } else {
    for (const entry of generated.sort(
      (left, right) => right.bytes - left.bytes,
    )) {
      console.log(`- ${entry.path}: ${formatBytes(entry.bytes)}`);
    }
  }

  console.log("[disk:report] protected paths:");
  for (const entry of report.protectedPaths.sort(
    (left, right) => right.bytes - left.bytes,
  )) {
    console.log(`- ${entry.path}: ${formatBytes(entry.bytes)}`);
  }

  console.log("[disk:report] sibling salary workspaces:");
  if (report.siblingSalaryWorkspaces.length === 0) {
    console.log("- none");
  } else {
    for (const entry of report.siblingSalaryWorkspaces) {
      console.log(
        `- ${entry.name}: ${formatBytes(entry.bytes)} (${entry.path})`,
      );
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await collectWorkspaceDiskUsage(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
