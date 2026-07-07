import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

function readPnpmVersion(rootDir) {
  const packageJsonPath = path.join(rootDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const packageManager = String(packageJson.packageManager ?? "");
  const match = packageManager.match(/^pnpm@(.+)$/);

  return match?.[1] ?? "10.0.0";
}

function resolveCachedPnpmCjs(pnpmVersion) {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    localAppData
      ? path.join(
          localAppData,
          "node",
          "corepack",
          "v1",
          "pnpm",
          pnpmVersion,
          "bin",
          "pnpm.cjs",
        )
      : undefined,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return undefined;
}

export function ensureCorepackPnpmShim(options = {}) {
  const rootDir = options.rootDir ?? repoRoot;
  const pnpmVersion = options.pnpmVersion ?? readPnpmVersion(rootDir);
  const cachedPnpmCjs =
    options.pnpmCjsPath ?? resolveCachedPnpmCjs(pnpmVersion);
  const windowsPnpmCjs =
    cachedPnpmCjs ??
    `%LOCALAPPDATA%\\node\\corepack\\v1\\pnpm\\${pnpmVersion}\\bin\\pnpm.cjs`;
  const unixPnpmCjs =
    cachedPnpmCjs?.replace(/\\/g, "/") ??
    `\${COREPACK_HOME:-$HOME/.cache/node/corepack}/v1/pnpm/${pnpmVersion}/bin/pnpm.cjs`;
  const binDir =
    options.binDir ?? path.join(rootDir, ".turbo", "corepack-pnpm-bin");

  fs.mkdirSync(binDir, { recursive: true });

  const windowsShim = path.join(binDir, "pnpm.cmd");
  const windowsCorepackShim = path.join(binDir, "corepack.cmd");
  const unixShim = path.join(binDir, "pnpm");
  const unixCorepackShim = path.join(binDir, "corepack");

  const windowsPnpmScript = [
    "@echo off",
    `set "COREPACK_PNPM_CJS=${windowsPnpmCjs}"`,
    'if exist "%COREPACK_PNPM_CJS%" (',
    '  node "%COREPACK_PNPM_CJS%" %*',
    ") else (",
    "  corepack pnpm %*",
    ")",
    "",
  ].join("\r\n");
  const unixPnpmScript = [
    "#!/usr/bin/env sh",
    `COREPACK_PNPM_CJS="${unixPnpmCjs}"`,
    'if [ -f "$COREPACK_PNPM_CJS" ]; then',
    '  exec node "$COREPACK_PNPM_CJS" "$@"',
    "fi",
    'SHIM_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
    'PATH_WITHOUT_SHIM=""',
    "OLD_IFS=$IFS",
    "IFS=:",
    "for entry in $PATH; do",
    '  [ -n "$entry" ] || entry="."',
    '  entry_dir="$(CDPATH= cd -- "$entry" 2>/dev/null && pwd || printf "%s" "$entry")"',
    '  [ "$entry_dir" != "$SHIM_DIR" ] || continue',
    '  if [ -z "$PATH_WITHOUT_SHIM" ]; then',
    '    PATH_WITHOUT_SHIM="$entry"',
    "  else",
    '    PATH_WITHOUT_SHIM="$PATH_WITHOUT_SHIM:$entry"',
    "  fi",
    "done",
    "IFS=$OLD_IFS",
    'PATH="$PATH_WITHOUT_SHIM"',
    "export PATH",
    "if command -v pnpm >/dev/null 2>&1; then",
    '  exec pnpm "$@"',
    "fi",
    'exec corepack pnpm "$@"',
    "",
  ].join("\n");
  const windowsCorepackScript = [
    "@echo off",
    'if /I not "%~1"=="pnpm" goto unsupported',
    "shift",
    `set "COREPACK_PNPM_CJS=${windowsPnpmCjs}"`,
    'if not exist "%COREPACK_PNPM_CJS%" goto unsupported',
    'node "%COREPACK_PNPM_CJS%" %*',
    "exit /b %ERRORLEVEL%",
    ":unsupported",
    'echo corepack shim supports only "corepack pnpm" in this repository. 1>&2',
    "exit /b 1",
    "",
  ].join("\r\n");
  const unixCorepackScript = [
    "#!/usr/bin/env sh",
    'if [ "$1" = "pnpm" ]; then',
    "  shift",
    `  COREPACK_PNPM_CJS="${unixPnpmCjs}"`,
    '  if [ -f "$COREPACK_PNPM_CJS" ]; then',
    '    exec node "$COREPACK_PNPM_CJS" "$@"',
    "  fi",
    '  SHIM_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
    '  PATH_WITHOUT_SHIM=""',
    "  OLD_IFS=$IFS",
    "  IFS=:",
    "  for entry in $PATH; do",
    '    [ -n "$entry" ] || entry="."',
    '    entry_dir="$(CDPATH= cd -- "$entry" 2>/dev/null && pwd || printf "%s" "$entry")"',
    '    [ "$entry_dir" != "$SHIM_DIR" ] || continue',
    '    if [ -z "$PATH_WITHOUT_SHIM" ]; then',
    '      PATH_WITHOUT_SHIM="$entry"',
    "    else",
    '      PATH_WITHOUT_SHIM="$PATH_WITHOUT_SHIM:$entry"',
    "    fi",
    "  done",
    "  IFS=$OLD_IFS",
    '  PATH="$PATH_WITHOUT_SHIM"',
    "  export PATH",
    "  if command -v pnpm >/dev/null 2>&1; then",
    '    exec pnpm "$@"',
    "  fi",
    '  exec corepack pnpm "$@"',
    "fi",
    'echo "corepack shim supports only corepack pnpm in this repository." >&2',
    "exit 1",
    "",
  ].join("\n");

  fs.writeFileSync(windowsShim, windowsPnpmScript, "utf8");
  fs.writeFileSync(windowsCorepackShim, windowsCorepackScript, "utf8");
  fs.writeFileSync(unixShim, unixPnpmScript, "utf8");
  fs.writeFileSync(unixCorepackShim, unixCorepackScript, "utf8");

  try {
    fs.chmodSync(unixShim, 0o755);
    fs.chmodSync(unixCorepackShim, 0o755);
  } catch {
    // Windows filesystems may not support chmod; the .cmd shim is used there.
  }

  return binDir;
}

export function buildCorepackPnpmEnv(options = {}) {
  const env = { ...process.env, ...(options.env ?? {}) };
  const binDir =
    options.binDir ?? ensureCorepackPnpmShim({ rootDir: options.rootDir });
  const currentPath = env.PATH ?? env.Path ?? "";
  const nextPath = [binDir, currentPath].filter(Boolean).join(path.delimiter);

  env.PATH = nextPath;
  env.Path = nextPath;
  env.COREPACK_ENABLE_DOWNLOAD_PROMPT = "0";

  return env;
}

function quoteWindowsShellArg(arg) {
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function run() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.error(
      "Usage: node scripts/dev/run-with-corepack-pnpm.mjs <command> [...args]",
    );
    process.exit(1);
  }

  const spawnOptions = {
    cwd: process.cwd(),
    env: buildCorepackPnpmEnv(),
    stdio: "inherit",
  };
  const child =
    process.platform === "win32"
      ? spawn([command, ...args].map(quoteWindowsShellArg).join(" "), [], {
          ...spawnOptions,
          shell: true,
        })
      : spawn(command, args, spawnOptions);

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[corepack-pnpm-env] command terminated by ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run();
}
