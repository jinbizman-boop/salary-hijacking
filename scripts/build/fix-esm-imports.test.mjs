import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { fixEsmImportSpecifiers } from "./fix-esm-imports.mjs";

test("adds .js to relative ESM import and export specifiers", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-esm-imports-"));

  try {
    const distDir = path.join(rootDir, "dist");
    await mkdir(distDir, { recursive: true });
    const filePath = path.join(distDir, "index.js");
    await writeFile(
      filePath,
      [
        'import value from "./module";',
        'import * as nested from "./nested/file";',
        'export * from "./public-api";',
        'export { thing } from "./thing";',
        'const untouched = await import("./dynamic");',
        'import external from "zod";',
        'import already from "./already.js";',
      ].join("\n"),
      "utf8",
    );

    const result = await fixEsmImportSpecifiers({ distDir });
    const source = await readFile(filePath, "utf8");

    assert.equal(result.changedFiles, 1);
    assert.match(source, /"\.\/module\.js"/);
    assert.match(source, /"\.\/nested\/file\.js"/);
    assert.match(source, /"\.\/public-api\.js"/);
    assert.match(source, /"\.\/thing\.js"/);
    assert.match(source, /import\("\.\/dynamic"\)/);
    assert.match(source, /"zod"/);
    assert.match(source, /"\.\/already\.js"/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("leaves declaration files and non-relative imports untouched", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-esm-imports-"));

  try {
    const distDir = path.join(rootDir, "dist");
    await mkdir(distDir, { recursive: true });
    await writeFile(
      path.join(distDir, "index.d.ts"),
      'export * from "./types";\n',
      "utf8",
    );
    await writeFile(
      path.join(distDir, "index.js"),
      'import { z } from "zod";\n',
      "utf8",
    );

    const result = await fixEsmImportSpecifiers({ distDir });
    const declarations = await readFile(path.join(distDir, "index.d.ts"), "utf8");
    const source = await readFile(path.join(distDir, "index.js"), "utf8");

    assert.equal(result.checkedFiles, 1);
    assert.equal(result.changedFiles, 0);
    assert.equal(declarations, 'export * from "./types";\n');
    assert.equal(source, 'import { z } from "zod";\n');
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
