import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_GRACE_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 45 * 60_000;
export const DEFAULT_BATCH_TIMEOUT_MS = 120_000;
export const DEFAULT_BATCH_SIZE = 1;
const MAX_BUFFER_CHARS = 500_000;

export function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, "");
}

function parseSummaryLine(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(`${escapedLabel}:\\s+([^\\n\\r]+)`, "u");
  const match = text.match(linePattern);

  if (!match) {
    return undefined;
  }

  const line = match[1];
  const failed = Number(line.match(/(\d+)\s+failed/u)?.[1] ?? 0);
  const passed = Number(line.match(/(\d+)\s+passed/u)?.[1] ?? 0);
  const total = Number(line.match(/(\d+)\s+total/u)?.[1] ?? 0);

  return { failed, passed, total, line };
}

export function parseJestPassSummary(output) {
  const text = stripAnsi(output);
  const suites = parseSummaryLine(text, "Test Suites");
  const tests = parseSummaryLine(text, "Tests");

  const pass =
    Boolean(suites) &&
    Boolean(tests) &&
    suites.failed === 0 &&
    tests.failed === 0 &&
    suites.total > 0 &&
    tests.total > 0 &&
    suites.passed === suites.total &&
    tests.passed === tests.total;

  return {
    pass,
    suites,
    tests,
  };
}

function parsePositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function appendBounded(buffer, chunk) {
  const next = buffer + chunk;
  if (next.length <= MAX_BUFFER_CHARS) {
    return next;
  }

  return next.slice(next.length - MAX_BUFFER_CHARS);
}

export function chunkTestPaths(testPaths, batchSize) {
  const size =
    Number.isFinite(batchSize) && batchSize > 0
      ? Math.floor(batchSize)
      : DEFAULT_BATCH_SIZE;
  const batches = [];

  for (let index = 0; index < testPaths.length; index += size) {
    batches.push(testPaths.slice(index, index + size));
  }

  return batches;
}

function baseJestArgs() {
  return [
    "pnpm",
    "--filter",
    "@salary-hijacking/mobile",
    "exec",
    "jest",
    "--runInBand",
  ];
}

function buildJestListArgs() {
  return [...baseJestArgs(), "--listTests"];
}

export function buildJestRunArgs(testPaths) {
  return [...baseJestArgs(), "--forceExit", "--runTestsByPath", ...testPaths];
}

function isMainModule() {
  const invoked = process.argv[1];
  return Boolean(invoked) && import.meta.url === pathToFileURL(invoked).href;
}

function runCorepack(args, options = {}) {
  const graceMs = parsePositiveIntegerEnv(
    "MOBILE_JEST_CI_GRACE_MS",
    DEFAULT_GRACE_MS,
  );
  const timeoutMs =
    options.timeoutMs ??
    parsePositiveIntegerEnv("MOBILE_JEST_CI_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const label = options.label ?? "jest";
  const requirePassSummary = options.requirePassSummary ?? false;

  return new Promise((resolve) => {
    const child = spawn("corepack", args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CI: "true",
        NODE_ENV: "test",
        FORCE_COLOR: process.env.FORCE_COLOR ?? "1",
      },
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let passSummarySeen = false;
    let exiting = false;
    let graceTimer;

    const finish = (result) => {
      if (exiting) {
        return;
      }

      exiting = true;
      clearTimeout(hardTimer);
      if (graceTimer) {
        clearTimeout(graceTimer);
      }
      resolve({
        output,
        summary: parseJestPassSummary(output),
        ...result,
      });
    };

    const hardTimer = setTimeout(() => {
      console.error(
        `[mobile-jest-ci] ${label} timed out before completion after ${timeoutMs}ms.`,
      );
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 3_000).unref();
      finish({ code: 1, signal: "TIMEOUT", timedOut: true });
    }, timeoutMs);

    function inspectOutput() {
      if (!requirePassSummary || passSummarySeen) {
        return;
      }

      const summary = parseJestPassSummary(output);
      if (!summary.pass) {
        return;
      }

      passSummarySeen = true;
      console.log(
        `[mobile-jest-ci] verified Jest pass summary for ${label}: ${summary.suites.passed}/${summary.suites.total} suites, ${summary.tests.passed}/${summary.tests.total} tests.`,
      );
      graceTimer = setTimeout(() => {
        console.log(
          `[mobile-jest-ci] Jest pass summary was verified; terminating lingering test process after ${graceMs}ms grace period.`,
        );
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 3_000).unref();
        finish({ code: 0, signal: null, timedOut: false });
      }, graceMs);
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      output = appendBounded(output, text);
      inspectOutput();
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      output = appendBounded(output, text);
      inspectOutput();
    });

    child.on("error", (error) => {
      console.error(error);
      finish({ code: 1, signal: null, timedOut: false });
    });

    child.on("exit", (code, signal) => {
      finish({ code: code ?? 1, signal, timedOut: false });
    });
  });
}

function parseListedTests(output) {
  return stripAnsi(output)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /\.(?:test|spec)\.tsx?$/u.test(line));
}

async function run() {
  const totalTimeoutMs = parsePositiveIntegerEnv(
    "MOBILE_JEST_CI_TIMEOUT_MS",
    DEFAULT_TIMEOUT_MS,
  );
  const batchTimeoutMs = parsePositiveIntegerEnv(
    "MOBILE_JEST_CI_BATCH_TIMEOUT_MS",
    DEFAULT_BATCH_TIMEOUT_MS,
  );
  const batchSize = parsePositiveIntegerEnv(
    "MOBILE_JEST_CI_BATCH_SIZE",
    DEFAULT_BATCH_SIZE,
  );
  const startedAt = Date.now();

  const listResult = await runCorepack(buildJestListArgs(), {
    label: "list-tests",
    timeoutMs: Math.min(60_000, totalTimeoutMs),
    requirePassSummary: false,
  });

  if (listResult.code !== 0) {
    console.error(`[mobile-jest-ci] failed to list mobile Jest tests.`);
    process.exit(listResult.code);
  }

  const testPaths = parseListedTests(listResult.output);

  if (testPaths.length === 0) {
    console.error(
      "[mobile-jest-ci] no mobile Jest test files were discovered.",
    );
    process.exit(1);
  }

  const batches = chunkTestPaths(testPaths, batchSize);
  let totalSuites = 0;
  let totalTests = 0;

  console.log(
    `[mobile-jest-ci] discovered ${testPaths.length} mobile Jest files; running ${batches.length} fresh batches of up to ${batchSize}.`,
  );

  for (const [index, batch] of batches.entries()) {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= totalTimeoutMs) {
      console.error(
        `[mobile-jest-ci] total timeout reached before batch ${index + 1}/${batches.length}.`,
      );
      process.exit(1);
    }

    const remainingMs = Math.max(1, totalTimeoutMs - elapsedMs);
    const timeoutMs = Math.min(batchTimeoutMs, remainingMs);
    const label = `batch ${index + 1}/${batches.length}`;
    console.log(
      `[mobile-jest-ci] running ${label} with ${batch.length} test files.`,
    );

    const result = await runCorepack(buildJestRunArgs(batch), {
      label,
      timeoutMs,
      requirePassSummary: true,
    });

    if (result.code !== 0 || !result.summary.pass) {
      console.error(`[mobile-jest-ci] ${label} failed.`);
      if (result.timedOut) {
        console.error(
          `[mobile-jest-ci] timed out batch test files: ${batch.join(", ")}`,
        );
      }
      if (!result.summary.pass) {
        console.error(
          "[mobile-jest-ci] A complete all-pass Jest summary was not observed.",
        );
      }
      process.exit(result.code || 1);
    }

    totalSuites += result.summary.suites.total;
    totalTests += result.summary.tests.total;
  }

  console.log(
    `[mobile-jest-ci] all batches passed: ${testPaths.length} files, ${totalSuites} suites, ${totalTests} tests.`,
  );
  process.exit(0);
}

if (isMainModule()) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
