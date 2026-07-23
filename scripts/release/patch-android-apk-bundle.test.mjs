import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildExecutableInvocation,
  buildZipRepackPythonCommand,
  buildUnsignedApkArchiveCommand,
  buildPatchApkBundlePlan,
  normalizeApkEntryName,
} from "./patch-android-apk-bundle.mjs";

test("normalizes APK entry names to forward slashes without traversal", () => {
  assert.equal(
    normalizeApkEntryName("assets\\index.android.bundle"),
    "assets/index.android.bundle",
  );
  assert.throws(
    () => normalizeApkEntryName("../assets/index.android.bundle"),
    /Unsafe APK entry/u,
  );
  assert.throws(
    () => normalizeApkEntryName("/assets/index.android.bundle"),
    /Unsafe APK entry/u,
  );
});

test("builds a deterministic safe-entry APK bundle patch plan", () => {
  const root = mkdtempSync(join(tmpdir(), "salary-apk-patch-test-"));
  try {
    const sourceApk = join(root, "source.apk");
    const replacementBundle = join(root, "index.android.bundle");
    const outputApk = join(root, "patched.apk");
    const keystore = join(root, "debug.keystore");
    writeFileSync(sourceApk, "apk", "utf8");
    writeFileSync(replacementBundle, "bundle", "utf8");
    writeFileSync(keystore, "keystore", "utf8");

    const plan = buildPatchApkBundlePlan({
      apksignerPath: join(root, "apksigner.bat"),
      entryName: "assets\\index.android.bundle",
      javaPath: join(root, "java.exe"),
      keystorePath: keystore,
      outputApk,
      replacementBundle,
      sourceApk,
      workDir: join(root, "work"),
      zipalignPath: join(root, "zipalign.exe"),
    });

    assert.equal(plan.entryName, "assets/index.android.bundle");
    assert.equal(plan.sourceApk, sourceApk);
    assert.equal(plan.replacementBundle, replacementBundle);
    assert.equal(plan.outputApk, outputApk);
    assert.match(plan.unsignedApk, /patched-unsigned\.apk$/u);
    assert.match(plan.alignedApk, /patched-aligned\.apk$/u);
    assert.equal(readFileSync(replacementBundle, "utf8"), "bundle");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("uses the JDK jar tool to create a zip-compatible unsigned APK", () => {
  const command = buildUnsignedApkArchiveCommand({
    jarPath: "C:/jdk/bin/jar.exe",
    outputApk: "C:/out/patched-unsigned.apk",
    unpackDir: "C:/work/unpacked",
  });

  assert.equal(command.command, "C:/jdk/bin/jar.exe");
  assert.deepEqual(command.args, [
    "cf",
    "C:/out/patched-unsigned.apk",
    "-C",
    "C:/work/unpacked",
    ".",
  ]);
});

test("builds a Python ZIP repack command that preserves source APK compression", () => {
  const command = buildZipRepackPythonCommand({
    entryName: "assets/index.android.bundle",
    outputApk: "C:/out/patched-unsigned.apk",
    pythonPath: "C:/python/python.exe",
    replacementBundle: "C:/bundle/index.android.bundle",
    sourceApk: "C:/apk/source.apk",
  });

  assert.equal(command.command, "C:/python/python.exe");
  assert.deepEqual(command.args.slice(0, 2), ["-c", command.args[1]]);
  assert.deepEqual(command.args.slice(2), [
    "C:/apk/source.apk",
    "C:/bundle/index.android.bundle",
    "C:/out/patched-unsigned.apk",
    "assets/index.android.bundle",
  ]);
});

test("wraps Windows batch tools with cmd.exe for reliable spawning", () => {
  const invocation = buildExecutableInvocation("C:/sdk/apksigner.bat", [
    "verify",
    "app.apk",
  ]);

  assert.equal(invocation.command, "cmd.exe");
  assert.deepEqual(invocation.args, [
    "/d",
    "/s",
    "/c",
    '"C:/sdk/apksigner.bat" verify app.apk',
  ]);
});

test("plans apksigner through java -jar to avoid Windows batch quoting", () => {
  const plan = buildPatchApkBundlePlan({
    apksignerJarPath: "C:/sdk/lib/apksigner.jar",
    entryName: "assets/index.android.bundle",
    javaPath: "C:/jdk/bin/java.exe",
    keystorePath: "C:/keys/debug.keystore",
    outputApk: "C:/out/patched.apk",
    replacementBundle: "C:/bundle/index.android.bundle",
    sourceApk: "C:/apk/source.apk",
    workDir: "C:/work",
    zipalignPath: "C:/sdk/zipalign.exe",
  });

  assert.equal(plan.apksignerJarPath, "C:/sdk/lib/apksigner.jar");
  assert.equal(plan.javaPath, "C:/jdk/bin/java.exe");
});
