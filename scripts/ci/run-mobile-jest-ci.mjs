import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_GRACE_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 20 * 60_000;
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

function isMainModule() {
  const invoked = process.argv[1];
  return Boolean(invoked) && import.meta.url === pathToFileURL(invoked).href;
}

function run() {
  const graceMs = parsePositiveIntegerEnv("MOBILE_JEST_CI_GRACE_MS", DEFAULT_GRACE_MS);
  const timeoutMs = parsePositiveIntegerEnv("MOBILE_JEST_CI_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const args = [
    "pnpm",
    "--filter",
    "@salary-hijacking/mobile",
    "exec",
    "jest",
    "--runInBand",
    "--forceExit",
  ];
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

  const hardTimer = setTimeout(() => {
    if (exiting) {
      return;
    }

    exiting = true;
    console.error(
      `[mobile-jest-ci] timed out before a complete Jest pass summary after ${timeoutMs}ms.`,
    );
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 3_000).unref();
    process.exitCode = 1;
  }, timeoutMs);

  function inspectOutput() {
    const summary = parseJestPassSummary(output);
    if (!summary.pass || passSummarySeen) {
      return;
    }

    passSummarySeen = true;
    console.log(
      `[mobile-jest-ci] verified Jest pass summary: ${summary.suites.passed}/${summary.suites.total} suites, ${summary.tests.passed}/${summary.tests.total} tests.`,
    );
    graceTimer = setTimeout(() => {
      if (exiting) {
        return;
      }

      exiting = true;
      console.log(
        `[mobile-jest-ci] Jest pass summary was verified; terminating lingering test process after ${graceMs}ms grace period.`,
      );
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 3_000).unref();
      clearTimeout(hardTimer);
      process.exit(0);
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
    if (exiting) {
      return;
    }

    exiting = true;
    clearTimeout(hardTimer);
    if (graceTimer) {
      clearTimeout(graceTimer);
    }
    console.error(error);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (exiting) {
      return;
    }

    exiting = true;
    clearTimeout(hardTimer);
    if (graceTimer) {
      clearTimeout(graceTimer);
    }

    const summary = parseJestPassSummary(output);
    if (code === 0 && summary.pass) {
      console.log("[mobile-jest-ci] Jest exited cleanly with a verified pass summary.");
      process.exit(0);
    }

    if (signal) {
      console.error(`[mobile-jest-ci] Jest terminated by ${signal}.`);
    } else {
      console.error(`[mobile-jest-ci] Jest exited with code ${code ?? 1}.`);
    }

    if (!summary.pass) {
      console.error("[mobile-jest-ci] A complete all-pass Jest summary was not observed.");
    }

    process.exit(code ?? 1);
  });
}

if (isMainModule()) {
  run();
}
