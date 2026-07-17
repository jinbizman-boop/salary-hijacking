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

function hasPackageDependency(packageJson, dependencyName) {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
  ].some(
    (dependencies) =>
      dependencies &&
      typeof dependencies === "object" &&
      typeof dependencies[dependencyName] === "string",
  );
}

function requiresNode22ForWrangler(packageJson) {
  if (!hasPackageDependency(packageJson, "wrangler")) return false;

  const nodeRange = packageJson.engines?.node;
  if (typeof nodeRange !== "string") return true;

  return !/(?:^|[<>=~^* xX|&(), -])>=?\s*22(?:\.|\s|$)/.test(nodeRange);
}

function readRootNodeVersion(rootDir) {
  for (const fileName of [".node-version", ".nvmrc"]) {
    const filePath = path.join(rootDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const value = fs.readFileSync(filePath, "utf8").trim();
    if (value) return { fileName, value };
  }
  return null;
}

function isNode22OrNewerVersion(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^v/u, "");
  const major = Number.parseInt(normalized.split(".")[0] ?? "", 10);
  return Number.isInteger(major) && major >= 22;
}

const CLOUDFLARE_DEPLOY_SCRIPT_REQUIREMENTS = {
  "deploy:cloudflare-api": [
    "--filter @salary-hijacking/api",
    "run deploy:production",
  ],
  "deploy:cloudflare-notifications": [
    "--filter @salary-hijacking/notifications",
    "run deploy:production",
  ],
  "deploy:cloudflare-scheduler": [
    "--filter @salary-hijacking/scheduler",
    "run deploy:production",
  ],
};

const CLOUDFLARE_DRY_RUN_SCRIPT_REQUIREMENTS = {
  "deploy:cloudflare-api:dry-run": [
    "--filter @salary-hijacking/api",
    "exec wrangler deploy --dry-run --env production --config wrangler.toml",
  ],
  "deploy:cloudflare-notifications:dry-run": [
    "--filter @salary-hijacking/notifications",
    "exec wrangler deploy --dry-run --env production --config wrangler.toml",
  ],
  "deploy:cloudflare-scheduler:dry-run": [
    "--filter @salary-hijacking/scheduler",
    "exec wrangler deploy --dry-run --env production --config wrangler.toml",
  ],
};

function checkRootCloudflareDeployEntrypoints(
  relativePath,
  packageJson,
  failures,
) {
  if (relativePath !== "package.json") return;

  const keywords = Array.isArray(packageJson.keywords)
    ? packageJson.keywords.filter((keyword) => typeof keyword === "string")
    : [];
  const isSalaryHijackingRoot =
    packageJson.name === "salary-hijacking-platform" ||
    (keywords.includes("salary-hijacking") &&
      keywords.includes("cloudflare-workers"));
  if (!isSalaryHijackingRoot) return;

  const scripts = packageJson.scripts ?? {};
  const devDependencies = packageJson.devDependencies ?? {};

  if (typeof devDependencies.wrangler !== "string") {
    failures.push(
      `${relativePath}: root devDependencies.wrangler is required so Cloudflare build images can resolve Wrangler without npx fallback`,
    );
  }

  for (const [scriptName, requiredParts] of Object.entries({
    ...CLOUDFLARE_DEPLOY_SCRIPT_REQUIREMENTS,
    ...CLOUDFLARE_DRY_RUN_SCRIPT_REQUIREMENTS,
  })) {
    const scriptValue = scripts[scriptName];
    if (typeof scriptValue !== "string") {
      failures.push(
        `${relativePath} scripts.${scriptName}: missing Cloudflare Worker deploy script`,
      );
      continue;
    }

    for (const requiredPart of requiredParts) {
      if (scriptValue.includes(requiredPart)) continue;
      failures.push(
        `${relativePath} scripts.${scriptName}: must include "${requiredPart}"`,
      );
    }
  }

  const aggregateDeploy = scripts["deploy:cloudflare-workers"];
  if (typeof aggregateDeploy !== "string") {
    failures.push(
      `${relativePath} scripts.deploy:cloudflare-workers: missing aggregate Worker deploy script`,
    );
  } else {
    for (const scriptName of Object.keys(
      CLOUDFLARE_DEPLOY_SCRIPT_REQUIREMENTS,
    )) {
      if (aggregateDeploy.includes(`run ${scriptName}`)) continue;
      failures.push(
        `${relativePath} scripts.deploy:cloudflare-workers: must delegate to ${scriptName}`,
      );
    }

    if (
      /npx\s+wrangler\s+deploy|(?:^|&&|\|\||;|\()\s*wrangler\s+deploy/.test(
        aggregateDeploy,
      )
    ) {
      failures.push(
        `${relativePath} scripts.deploy:cloudflare-workers: must not run a single root wrangler deploy; delegate to Worker-specific scripts`,
      );
    }
  }

  const aggregateDryRun = scripts["deploy:cloudflare-workers:dry-run"];
  if (typeof aggregateDryRun !== "string") {
    failures.push(
      `${relativePath} scripts.deploy:cloudflare-workers:dry-run: missing aggregate Worker dry-run deploy script`,
    );
  } else {
    for (const scriptName of Object.keys(
      CLOUDFLARE_DRY_RUN_SCRIPT_REQUIREMENTS,
    )) {
      if (aggregateDryRun.includes(`run ${scriptName}`)) continue;
      failures.push(
        `${relativePath} scripts.deploy:cloudflare-workers:dry-run: must delegate to ${scriptName}`,
      );
    }
  }

  for (const [scriptName, scriptValue] of Object.entries(scripts)) {
    if (typeof scriptValue !== "string") continue;
    if (!/npx\s+wrangler\s+deploy/.test(scriptValue)) continue;
    failures.push(
      `${relativePath} scripts.${scriptName}: npx wrangler deploy is not allowed; use pnpm exec wrangler through Worker-specific scripts`,
    );
  }
}

export function runPackageManagerScriptCheck(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const failures = [];
  const checkedFiles = [];
  let hasWranglerPackage = false;

  for (const packagePath of walkPackageJsonFiles(rootDir)) {
    const relativePath = toPosix(path.relative(rootDir, packagePath));
    checkedFiles.push(relativePath);

    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = packageJson.scripts;
    if (hasPackageDependency(packageJson, "wrangler"))
      hasWranglerPackage = true;

    if (requiresNode22ForWrangler(packageJson)) {
      failures.push(
        `${relativePath} engines.node: Wrangler requires Node 22 or newer; set a Node 22+ range so Cloudflare build images and local dry-runs do not execute Wrangler on Node 20`,
      );
    }

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

    checkRootCloudflareDeployEntrypoints(relativePath, packageJson, failures);
  }

  if (hasWranglerPackage) {
    const rootNodeVersion = readRootNodeVersion(rootDir);
    if (!rootNodeVersion) {
      failures.push(
        ".node-version: missing Node 22+ version pin for Cloudflare Workers Builds",
      );
    } else if (!isNode22OrNewerVersion(rootNodeVersion.value)) {
      failures.push(
        `${rootNodeVersion.fileName}: Cloudflare Workers Builds must pin Node 22 or newer, got ${rootNodeVersion.value}`,
      );
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
