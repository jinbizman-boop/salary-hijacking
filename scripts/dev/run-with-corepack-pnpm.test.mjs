import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCorepackPnpmEnv,
  ensureCorepackPnpmShim,
} from "./run-with-corepack-pnpm.mjs";

test("creates pnpm shims and prepends them to PATH", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-corepack-pnpm-"));

  try {
    const binDir = ensureCorepackPnpmShim({ rootDir, pnpmVersion: "10.0.0" });
    const windowsShim = await stat(path.join(binDir, "pnpm.cmd"));
    const windowsCorepackShim = await stat(path.join(binDir, "corepack.cmd"));
    const unixShim = await stat(path.join(binDir, "pnpm"));
    const unixCorepackShim = await stat(path.join(binDir, "corepack"));
    const windowsShimSource = await readFile(
      path.join(binDir, "pnpm.cmd"),
      "utf8",
    );
    const windowsCorepackShimSource = await readFile(
      path.join(binDir, "corepack.cmd"),
      "utf8",
    );
    const unixShimSource = await readFile(path.join(binDir, "pnpm"), "utf8");
    const env = buildCorepackPnpmEnv({
      rootDir,
      binDir,
      env: { PATH: "original-path" },
    });

    assert.equal(windowsShim.isFile(), true);
    assert.equal(windowsCorepackShim.isFile(), true);
    assert.equal(unixShim.isFile(), true);
    assert.equal(unixCorepackShim.isFile(), true);
    assert.match(windowsShimSource, /pnpm\\10\.0\.0\\bin\\pnpm\.cjs/);
    assert.match(windowsCorepackShimSource, /pnpm\\10\.0\.0\\bin\\pnpm\.cjs/);
    assert.match(unixShimSource, /pnpm\/10\.0\.0\/bin\/pnpm\.cjs/);
    assert.equal(env.PATH?.split(path.delimiter)[0], binDir);
    assert.equal(env.Path?.split(path.delimiter)[0], binDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
