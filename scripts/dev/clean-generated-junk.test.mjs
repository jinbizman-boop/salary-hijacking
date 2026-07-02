import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertInsideRoot,
  cleanGeneratedJunk,
} from "./clean-generated-junk.mjs";

async function touch(filePath, contents = "generated") {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

test("removes repository generated junk while preserving dependencies, local secrets, and tracked evidence", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-root-"));

  try {
    await touch(path.join(rootDir, ".turbo", "cache.bin"));
    await touch(path.join(rootDir, "apps", "mobile", ".expo", "web", "cache"));
    await touch(path.join(rootDir, "services", "api", ".wrangler", "state"));
    await touch(path.join(rootDir, "release", "cloudflare-proof.local.json"));
    await touch(
      path.join(rootDir, "release", "public-url-observation.local.json"),
    );
    await touch(path.join(rootDir, "apps", "mobile", ".eas", "build", "log"));
    await touch(path.join(rootDir, "apps", "mobile", ".eas", "cache", "blob"));
    await touch(
      path.join(rootDir, "apps", "mobile", "android", ".gradle", "cache.bin"),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "android", ".cxx", "cache.bin"),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "android", "build", "out.bin"),
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "android",
        "app",
        "build",
        "out.bin",
      ),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "ios", "build", "out.bin"),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "ios", "Pods", "Manifest.lock"),
    );
    await touch(
      path.join(rootDir, "packages", "utils", "tsconfig.tsbuildinfo"),
    );
    await touch(path.join(rootDir, "node_modules", "package", "index.js"));
    await touch(path.join(rootDir, "services", "api", ".dev.vars"), "secret");
    await touch(
      path.join(rootDir, "release", "cloudflare-runtime-evidence.json"),
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "build",
        "e2e",
        "android",
        "salary-hijacking-e2e.apk",
      ),
      "PK\u0003\u0004",
    );
    await touch(path.join(rootDir, "docs", "source.md"));

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [] });

    assert.equal(result.errors.length, 0);
    assert.equal(existsSync(path.join(rootDir, ".turbo")), false);
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".expo")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "services", "api", ".wrangler")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "release", "cloudflare-proof.local.json")),
      false,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "release", "public-url-observation.local.json"),
      ),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".eas", "build")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".eas", "cache")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "android", ".gradle")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "android", ".cxx")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "android", "build")),
      false,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "apps", "mobile", "android", "app", "build"),
      ),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "ios", "build")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "ios", "Pods")),
      false,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "packages", "utils", "tsconfig.tsbuildinfo"),
      ),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "node_modules", "package", "index.js")),
      true,
    );
    assert.equal(
      existsSync(path.join(rootDir, "services", "api", ".dev.vars")),
      true,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "release", "cloudflare-runtime-evidence.json"),
      ),
      true,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "apps",
          "mobile",
          "build",
          "e2e",
          "android",
          "salary-hijacking-e2e.apk",
        ),
      ),
      true,
    );
    assert.equal(existsSync(path.join(rootDir, "docs", "source.md")), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("dry run reports generated junk without deleting it", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-dry-run-"));

  try {
    const target = path.join(rootDir, ".turbo", "cache.bin");
    await touch(target);

    const result = await cleanGeneratedJunk({
      dryRun: true,
      rootDir,
      tempRoots: [],
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.removed.length, 0);
    assert.equal(result.planned.length, 1);
    assert.equal(existsSync(target), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes only Salary Hijacking temp fixtures from configured temp roots", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-repo-"));
  const tempRoot = await mkdtemp(path.join(tmpdir(), "salary-junk-temp-"));

  try {
    await touch(path.join(tempRoot, "salary-hijacking-proof-1", "proof.tmp"));
    await touch(
      path.join(tempRoot, "chrome-clean-fintech-home-123", "screenshot.tmp"),
    );
    await touch(path.join(tempRoot, "unrelated-tool-cache", "keep.tmp"));

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [tempRoot] });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(tempRoot, "salary-hijacking-proof-1")),
      false,
    );
    assert.equal(
      existsSync(path.join(tempRoot, "chrome-clean-fintech-home-123")),
      false,
    );
    assert.equal(existsSync(path.join(tempRoot, "unrelated-tool-cache")), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("rejects cleanup paths outside the repository root", () => {
  const rootDir = path.join(tmpdir(), "salary-junk-safe-root");
  const outsidePath = path.dirname(rootDir);

  assert.throws(
    () => assertInsideRoot(rootDir, outsidePath),
    /outside the repository root/,
  );
});
