import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPOSITORY_JUNK_DIRECTORY_NAMES = new Set([
  ".cache",
  ".cxx",
  ".expo",
  ".expo-shared",
  ".gradle",
  ".gradle-local-debug",
  ".local-native-bin",
  ".metro-cache",
  ".next",
  ".open-next",
  ".tmp",
  ".turbo",
  ".vercel",
  ".worker-build",
  ".wrangler",
  "coverage",
  "dist",
  "out",
  "playwright-report",
  "security-reports",
  "test-results",
  "web-build",
]);

const REPOSITORY_JUNK_RELATIVE_PATHS = new Set([
  "apps/mobile/apps",
  "apps/mobile/.eas/build",
  "apps/mobile/.eas/cache",
  "apps/mobile/android/build",
  "apps/mobile/android/app/build",
  "apps/mobile/ios/build",
  "apps/mobile/ios/Pods",
]);

const PROTECTED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);
const PROTECTED_RELATIVE_PATHS = new Set(["scripts/build"]);
const DEPENDENCY_NATIVE_JUNK_RELATIVE_PATHS = [".cxx", ".gradle", "build"];

const TEMP_JUNK_DIRECTORY_PATTERNS = [
  /^salary-hijacking/i,
  /^salaryhijacking/i,
  /^salary-clean-temp/i,
  /^salary-junk-/i,
  /^salary-expo-android-/i,
  /^salary-release-ready-/i,
  /^salary-android-sdk-tools-/i,
  /^salary-cloudflare-(?:evidence|proof)-/i,
  /^salary-database-proof-/i,
  /^salary-db-evidence-/i,
  /^salary-mobile-(?:native-evidence|native-proof|phone-proof)-/i,
  /^salary-public-url-(?:evidence|proof)-/i,
  /^salary-secrets-(?:evidence|proof)-/i,
  /^salary-security-audit-evidence-/i,
  /^salary-staging-smoke-/i,
  /^chrome-clean-fintech/i,
  /^metro-cache$/i,
  /^metro-file-map-/i,
  /^haste-map-/i,
  /^jest_/i,
  /^native-platform\d+dir$/i,
  /^node-compile-cache$/i,
  /^v8-compile-cache$/i,
  /^hsperfdata_/i,
  /^paycheck-accounting/i,
  /^node-test-run-/i,
];
const REMOVE_RETRY_OPTIONS = {
  force: true,
  maxRetries: 10,
  recursive: true,
  retryDelay: 250,
};

function spawnSubst(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function removeTrailingSeparator(filePath) {
  return filePath.replace(/[\\\/]+$/, "");
}

export function assertInsideRoot(rootDir, targetPath) {
  const root = removeTrailingSeparator(path.resolve(rootDir));
  const target = removeTrailingSeparator(path.resolve(targetPath));
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${target} is outside the repository root ${root}`);
  }

  return target;
}

function isProtectedRelativePath(relativePath) {
  const posixPath = toPosix(relativePath);
  if (!posixPath || posixPath === ".") return true;
  if (posixPath === ".git" || posixPath.startsWith(".git/")) return true;
  if (posixPath === "node_modules" || posixPath.startsWith("node_modules/")) {
    return true;
  }

  for (const protectedPath of PROTECTED_RELATIVE_PATHS) {
    if (
      posixPath === protectedPath ||
      posixPath.startsWith(`${protectedPath}/`)
    ) {
      return true;
    }
  }

  return false;
}

function isRepositoryJunkFile(relativePath) {
  const posixPath = toPosix(relativePath);
  const fileName = path.basename(relativePath);

  return (
    /^release\/[^/]+-(?:proof|observation)\.local\.jsonc?$/.test(posixPath) ||
    /^apps\/mobile\/build\/phone\/android\/salary-hijacking-phone-arm64-iteration\d+-debug\.apk$/.test(
      posixPath,
      posixPath,
    ) ||
    /\.tsbuildinfo$/.test(fileName) ||
    /\.(?:log|tmp|temp)$/.test(fileName) ||
    fileName === ".DS_Store" ||
    fileName === "Thumbs.db"
  );
}

function isRepositoryJunkDirectory(entryName, relativePath) {
  const posixPath = toPosix(relativePath);
  return (
    REPOSITORY_JUNK_DIRECTORY_NAMES.has(entryName) ||
    REPOSITORY_JUNK_RELATIVE_PATHS.has(posixPath)
  );
}

function isTempJunkDirectory(entryName) {
  return TEMP_JUNK_DIRECTORY_PATTERNS.some((pattern) =>
    pattern.test(entryName),
  );
}

function normalizeWindowsPath(filePath) {
  return removeTrailingSeparator(path.resolve(filePath)).toLowerCase();
}

export function parseSubstMappings(output) {
  return String(output ?? "")
    .split(/\r?\n/u)
    .map((line) => {
      const match = /^\s*([a-z]):\\:\s*=>\s*(.+?)\s*$/iu.exec(line);
      if (!match) return null;
      return {
        aliasRoot: `${match[1].toUpperCase()}:\\`,
        drive: match[1].toUpperCase(),
        targetRootDir: match[2],
      };
    })
    .filter(Boolean);
}

export function collectStaleSubstTargets({
  platform = process.platform,
  rootDir = process.cwd(),
  spawn = spawnSubst,
} = {}) {
  if (platform !== "win32") return [];

  const result = spawn("subst", []);
  if ((result.status ?? 0) !== 0) return [];

  const normalizedRoot = normalizeWindowsPath(rootDir);
  return parseSubstMappings(result.stdout)
    .filter(
      (mapping) =>
        normalizeWindowsPath(mapping.targetRootDir) === normalizedRoot,
    )
    .map((mapping) => ({
      kind: "subst",
      path: mapping.aliasRoot,
      ...mapping,
    }));
}

function removeSubstTarget(target, spawn = spawnSubst) {
  const result = spawn("subst", [`${target.drive}:`, "/D"]);
  if ((result.status ?? 0) !== 0) {
    const errorText = String(result.stderr || result.stdout || "").trim();
    throw new Error(
      errorText || `Failed to remove subst mapping ${target.aliasRoot}`,
    );
  }
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

async function collectRepositoryJunkTargets(rootDir) {
  const targets = [];
  const root = path.resolve(rootDir);

  async function walk(currentDir) {
    const entries = await fs.promises.readdir(currentDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(root, fullPath);
      if (isProtectedRelativePath(relativePath)) continue;

      if (entry.isDirectory()) {
        if (PROTECTED_DIRECTORY_NAMES.has(entry.name)) continue;

        if (isRepositoryJunkDirectory(entry.name, relativePath)) {
          targets.push({ kind: "repo", path: fullPath });
          continue;
        }

        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && isRepositoryJunkFile(relativePath)) {
        targets.push({ kind: "repo", path: fullPath });
      }
    }
  }

  if (await pathExists(root)) {
    await walk(root);
  }

  return targets;
}

async function collectDependencyNativeJunkTargets(rootDir) {
  const targets = [];
  const pnpmRoot = path.join(path.resolve(rootDir), "node_modules", ".pnpm");
  if (!(await pathExists(pnpmRoot))) return targets;

  const packageEntries = await fs.promises.readdir(pnpmRoot, {
    withFileTypes: true,
  });
  for (const packageEntry of packageEntries) {
    if (!packageEntry.isDirectory()) continue;
    const moduleRoot = path.join(pnpmRoot, packageEntry.name, "node_modules");
    if (!(await pathExists(moduleRoot))) continue;

    const moduleEntries = await fs.promises.readdir(moduleRoot, {
      withFileTypes: true,
    });
    for (const moduleEntry of moduleEntries) {
      if (!moduleEntry.isDirectory()) continue;
      const androidDir = path.join(moduleRoot, moduleEntry.name, "android");
      if (!(await pathExists(androidDir))) continue;

      for (const relativeJunkPath of DEPENDENCY_NATIVE_JUNK_RELATIVE_PATHS) {
        const junkPath = path.join(androidDir, relativeJunkPath);
        if (await pathExists(junkPath)) {
          targets.push({ kind: "dependency", path: junkPath });
        }
      }
    }
  }

  return targets;
}

export function defaultTempRoots() {
  const windowsCodexTempRoots =
    process.platform === "win32" ? ["D:\\codex-temp", "D:\\codex-tmp"] : [];
  const candidates = [
    process.env.TEMP,
    process.env.TMP,
    process.env.TMPDIR,
    ...windowsCodexTempRoots,
    "D:\\codex-temp\\salary-hijacking",
  ];

  const configured = process.env.SALARY_HIJACKING_JUNK_TEMP_ROOTS
    ? process.env.SALARY_HIJACKING_JUNK_TEMP_ROOTS.split(path.delimiter)
    : [];

  return [...candidates, ...configured]
    .filter(Boolean)
    .map((candidate) => path.resolve(candidate))
    .filter((candidate, index, all) => all.indexOf(candidate) === index);
}

async function collectTempJunkTargets(tempRoots) {
  const targets = [];

  for (const tempRoot of tempRoots) {
    if (!(await pathExists(tempRoot))) continue;

    const entries = await fs.promises.readdir(tempRoot, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isFile()) continue;
      if (!isTempJunkDirectory(entry.name)) continue;

      const fullPath = assertInsideRoot(
        tempRoot,
        path.join(tempRoot, entry.name),
      );
      targets.push({ kind: "temp", path: fullPath });
    }
  }

  return targets;
}

export async function cleanGeneratedJunk(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const dryRun = Boolean(options.dryRun);
  const platform = options.platform ?? process.platform;
  const spawn = options.spawnSubst ?? spawnSubst;
  const tempRoots =
    options.tempRoots === undefined ? defaultTempRoots() : options.tempRoots;

  const planned = [
    ...collectStaleSubstTargets({ platform, rootDir, spawn }),
    ...(await collectRepositoryJunkTargets(rootDir)),
    ...(await collectDependencyNativeJunkTargets(rootDir)),
    ...(await collectTempJunkTargets(
      tempRoots.map((root) => path.resolve(root)),
    )),
  ];

  const deduped = [];
  const seen = new Set();
  for (const target of planned) {
    const resolvedPath =
      target.kind === "repo" || target.kind === "dependency"
        ? assertInsideRoot(rootDir, target.path)
        : target.path;
    if (seen.has(resolvedPath)) continue;
    seen.add(resolvedPath);
    deduped.push({ ...target, path: resolvedPath });
  }

  const removed = [];
  const errors = [];
  let bytesFreed = 0;

  for (const target of deduped) {
    try {
      const bytes =
        target.kind === "subst" ? 0 : await measurePathBytes(target.path);
      if (!dryRun) {
        if (target.kind === "subst") {
          removeSubstTarget(target, spawn);
        } else {
          await fs.promises.rm(target.path, REMOVE_RETRY_OPTIONS);
        }
        removed.push({ ...target, bytes });
        bytesFreed += bytes;
      }
    } catch (error) {
      errors.push({
        path: target.path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    bytesFreed,
    dryRun,
    errors,
    planned: deduped,
    removed,
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
    dryRun: false,
    json: false,
    rootDir: process.cwd(),
    tempRoots: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--skip-temp") {
      options.tempRoots = [];
    } else if (arg === "--root") {
      options.rootDir = argv[index + 1] ?? options.rootDir;
      index += 1;
    } else if (arg === "--temp-root") {
      const root = argv[index + 1];
      options.tempRoots = [...(options.tempRoots ?? []), root];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await cleanGeneratedJunk(options);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ...result,
          planned: result.planned.map((target) => ({
            ...target,
            path:
              target.kind === "subst"
                ? target.path
                : toPosix(
                    path.relative(path.resolve(options.rootDir), target.path),
                  ),
          })),
          removed: result.removed.map((target) => ({
            ...target,
            path:
              target.kind === "subst"
                ? target.path
                : toPosix(
                    path.relative(path.resolve(options.rootDir), target.path),
                  ),
          })),
        },
        null,
        2,
      ),
    );
  } else {
    const action = result.dryRun ? "would remove" : "removed";
    console.log(
      `[clean:junk] ${action} ${result.dryRun ? result.planned.length : result.removed.length} generated paths; freed ${formatBytes(result.bytesFreed)}.`,
    );

    for (const target of result.dryRun ? result.planned : result.removed) {
      console.log(`- ${target.kind}: ${target.path}`);
    }

    if (result.errors.length > 0) {
      console.error("[clean:junk] errors:");
      for (const error of result.errors) {
        console.error(`- ${error.path}: ${error.message}`);
      }
    }
  }

  process.exit(result.errors.length > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
