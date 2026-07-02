import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

function sanitizeRunId(runId) {
  return String(runId ?? `${process.pid}-${Date.now()}`).replace(
    /[^A-Za-z0-9._-]/g,
    "-",
  );
}

function defaultRootDir(env = process.env) {
  if (typeof env.SALARY_HIJACKING_TEST_TEMP_ROOT === "string") {
    const configured = env.SALARY_HIJACKING_TEST_TEMP_ROOT.trim();
    if (configured) return configured;
  }

  const dDriveRoot = "D:\\codex-temp\\salary-hijacking";
  if (process.platform === "win32" && fs.existsSync("D:\\")) {
    return dDriveRoot;
  }

  return path.join(os.tmpdir(), "salary-hijacking-tests");
}

export function createNodeTestTempRunDir(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? defaultRootDir(options.env));
  const runId = sanitizeRunId(options.runId);
  const runDir = path.join(rootDir, `node-test-run-${runId}`);

  fs.mkdirSync(runDir, { recursive: true });

  return runDir;
}

export function buildCleanNodeTestEnv(options = {}) {
  const runDir = path.resolve(options.runDir);
  const env = { ...process.env, ...(options.env ?? {}) };

  env.TEMP = runDir;
  env.TMP = runDir;
  env.TMPDIR = runDir;
  env.NODE_COMPILE_CACHE = path.join(runDir, "node-compile-cache");

  return env;
}

export async function removeNodeTestTempRunDir(options = {}) {
  const runDir = path.resolve(options.runDir);
  const rootDir = path.resolve(options.rootDir ?? path.dirname(runDir));
  const relative = path.relative(rootDir, runDir);

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !path.basename(runDir).startsWith("node-test-run-")
  ) {
    throw new Error(`Refusing to remove unsafe node test temp path: ${runDir}`);
  }

  await fs.promises.rm(runDir, { recursive: true, force: true });
}

function run() {
  const testFiles = process.argv.slice(2);
  if (testFiles.length === 0) {
    console.error(
      "Usage: node scripts/dev/run-node-tests-with-clean-temp.mjs <test-file> [...test-files]",
    );
    process.exit(1);
  }

  const rootDir = path.resolve(defaultRootDir(process.env));
  const runDir = createNodeTestTempRunDir({ rootDir });
  const env = buildCleanNodeTestEnv({ runDir });
  const child = spawn(process.execPath, ["--test", ...testFiles], {
    cwd: repoRoot,
    env,
    stdio: "inherit",
    windowsHide: true,
  });

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await removeNodeTestTempRunDir({ runDir, rootDir });
  };

  child.on("exit", async (code, signal) => {
    try {
      await cleanup();
    } catch (error) {
      console.error(error);
      process.exit(1);
      return;
    }

    if (signal) {
      console.error(`[node-test-clean-temp] command terminated by ${signal}`);
      process.exit(1);
      return;
    }

    process.exit(code ?? 1);
  });

  child.on("error", async (error) => {
    try {
      await cleanup();
    } finally {
      console.error(error);
      process.exit(1);
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run();
}
