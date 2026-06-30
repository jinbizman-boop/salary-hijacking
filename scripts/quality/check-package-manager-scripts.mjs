import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walkPackageJsonFiles(rootDir) {
  const packageFiles = [];
  const ignoredDirectories = new Set([
    ".git",
    ".turbo",
    "dist",
    "node_modules",
    "coverage",
    "test-results",
  ]);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }

      if (entry.isFile() && entry.name === "package.json") {
        packageFiles.push(path.join(dir, entry.name));
      }
    }
  }

  walk(rootDir);
  return packageFiles.sort();
}

function hasBarePnpmCommand(script) {
  const commandStartPattern = /(?:^|&&|\|\||;|\()\s*pnpm(?=\s|$)/;
  return commandStartPattern.test(script);
}

function findBareTsupEntrypoints(script) {
  const failures = [];
  const tsupCommandPattern = /(?:^|&&|\|\||;|\()\s*tsup\s+([^&;|]+)/g;
  let match;

  while ((match = tsupCommandPattern.exec(script)) !== null) {
    const commandArgs = match[1] ?? "";
    const tokens = commandArgs
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0);

    for (const token of tokens) {
      if (token.startsWith("-")) break;
      if (/^src\/.+\.[cm]?[jt]sx?$/.test(token)) {
        failures.push(token);
      }
    }
  }

  return failures;
}

function usesTurboRun(script) {
  return /(?:^|&&|\|\||;|\()\s*turbo\s+run(?=\s|$)/.test(script);
}

function usesCorepackPnpmShimRunner(script) {
  return script.includes("scripts/dev/run-with-corepack-pnpm.mjs turbo run");
}

export function runPackageManagerScriptCheck(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const failures = [];
  const checkedFiles = [];

  for (const packagePath of walkPackageJsonFiles(rootDir)) {
    const relativePath = toPosix(path.relative(rootDir, packagePath));
    checkedFiles.push(relativePath);

    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = packageJson.scripts;
    if (!scripts || typeof scripts !== "object") continue;

    for (const [scriptName, scriptValue] of Object.entries(scripts)) {
      if (typeof scriptValue !== "string") continue;
      if (!hasBarePnpmCommand(scriptValue)) continue;

      failures.push(
        `${relativePath} scripts.${scriptName}: bare pnpm command found; use "corepack pnpm" so the repository packageManager version is honored`,
      );
    }

    for (const [scriptName, scriptValue] of Object.entries(scripts)) {
      if (typeof scriptValue !== "string") continue;
      const bareEntrypoints = findBareTsupEntrypoints(scriptValue);
      for (const entrypoint of bareEntrypoints) {
        failures.push(
          `${relativePath} scripts.${scriptName}: tsup entrypoint "${entrypoint}" must use an explicit relative prefix like "./${entrypoint}"`,
        );
      }
    }

    if (relativePath === "package.json") {
      for (const [scriptName, scriptValue] of Object.entries(scripts)) {
        if (typeof scriptValue !== "string") continue;
        if (!usesTurboRun(scriptValue)) continue;
        if (usesCorepackPnpmShimRunner(scriptValue)) continue;

        failures.push(
          `${relativePath} scripts.${scriptName}: root turbo run scripts must use the corepack pnpm shim runner so Turbo package tasks do not pick a mismatched global pnpm`,
        );
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    checkedFiles,
  };
}

function printResult(result) {
  if (result.ok) {
    console.log("[package-manager-scripts] validation passed.");
  } else {
    console.error("[package-manager-scripts] validation failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
  }

  console.log(
    `[package-manager-scripts] checked ${result.checkedFiles.length} package.json files.`,
  );
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMain) {
  const result = runPackageManagerScriptCheck();
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}
