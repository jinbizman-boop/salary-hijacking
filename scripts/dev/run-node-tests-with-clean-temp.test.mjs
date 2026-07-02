import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCleanNodeTestEnv,
  createNodeTestTempRunDir,
  removeNodeTestTempRunDir,
} from "./run-node-tests-with-clean-temp.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

test("routes node test temp files into an isolated cleanup directory", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-clean-temp-root-"));

  try {
    const runDir = createNodeTestTempRunDir({ rootDir, runId: "unit" });
    const env = buildCleanNodeTestEnv({ env: { PATH: "original" }, runDir });

    assert.equal(env.TEMP, runDir);
    assert.equal(env.TMP, runDir);
    assert.equal(env.TMPDIR, runDir);
    assert.equal(
      env.NODE_COMPILE_CACHE,
      path.join(runDir, "node-compile-cache"),
    );
    assert.equal(existsSync(runDir), true);

    await removeNodeTestTempRunDir({ runDir, rootDir });

    assert.equal(existsSync(runDir), false);
    assert.equal(existsSync(rootDir), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes isolated temp directories with Windows-safe retry options", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-clean-temp-root-"));
  const runDir = path.join(rootDir, "node-test-run-retry");
  const calls = [];

  try {
    await removeNodeTestTempRunDir({
      rootDir,
      runDir,
      rm: async (target, options) => {
        calls.push({ options, target });
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].target, runDir);
    assert.deepEqual(calls[0].options, {
      force: true,
      maxRetries: 10,
      recursive: true,
      retryDelay: 250,
    });
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("CLI cleans the isolated temp directory after a passing node test run", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-clean-temp-cli-"));
  const testFile = path.join(rootDir, "sample.test.mjs");

  try {
    await writeFile(
      testFile,
      `
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("uses redirected temp", () => {
  mkdirSync(process.env.TEMP, { recursive: true });
  writeFileSync(path.join(process.env.TEMP, "fixture.tmp"), "ok");
});
`,
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      ["scripts/dev/run-node-tests-with-clean-temp.mjs", testFile],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          SALARY_HIJACKING_TEST_TEMP_ROOT: rootDir,
        },
        encoding: "utf8",
        windowsHide: true,
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const leftovers = (await readdir(rootDir)).filter((name) =>
      name.startsWith("node-test-run-"),
    );

    assert.deepEqual(leftovers, []);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
