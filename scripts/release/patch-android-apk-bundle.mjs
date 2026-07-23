#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultBuildToolsDir = resolve(
  repoRoot,
  ".tools/android-sdk/build-tools/35.0.0",
);
const defaultApksignerJarPath = join(defaultBuildToolsDir, "lib/apksigner.jar");
const defaultJavaPath = resolve(repoRoot, ".tools/jdk-17/bin/java.exe");
const defaultJarPath = resolve(repoRoot, ".tools/jdk-17/bin/jar.exe");
const defaultPythonPath =
  process.env.SALARY_HIJACKING_PYTHON ??
  "C:/Users/PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const defaultKeystorePath = resolve(
  process.env.USERPROFILE ?? "",
  ".android/debug.keystore",
);

export function normalizeApkEntryName(entryName) {
  const normalized = String(entryName ?? "").replace(/\\/gu, "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized.includes("/..") ||
    normalized === ".."
  ) {
    throw new Error(`Unsafe APK entry: ${entryName}`);
  }
  return normalized;
}

const requireExistingFile = (label, filePath) => {
  if (!filePath || !existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath || "(empty)"}`);
  }
  return filePath;
};

export function buildPatchApkBundlePlan({
  apksignerJarPath = defaultApksignerJarPath,
  apksignerPath = join(defaultBuildToolsDir, "apksigner.bat"),
  entryName = "assets/index.android.bundle",
  jarPath = defaultJarPath,
  javaPath = defaultJavaPath,
  keystorePath = defaultKeystorePath,
  outputApk,
  pythonPath = defaultPythonPath,
  replacementBundle,
  sourceApk,
  workDir,
  zipalignPath = join(defaultBuildToolsDir, "zipalign.exe"),
}) {
  if (!sourceApk) throw new Error("sourceApk is required");
  if (!replacementBundle) throw new Error("replacementBundle is required");
  if (!outputApk) throw new Error("outputApk is required");
  const resolvedOutput = resolve(outputApk);
  const resolvedWorkDir =
    workDir ?? resolve(repoRoot, "artifacts/tmp/apk-bundle-patch");
  return {
    alignedApk: join(resolvedWorkDir, "patched-aligned.apk"),
    apksignerJarPath,
    apksignerPath,
    entryName: normalizeApkEntryName(entryName),
    jarPath,
    javaPath,
    keystorePath,
    outputApk: resolvedOutput,
    pythonPath,
    replacementBundle: resolve(replacementBundle),
    sourceApk: resolve(sourceApk),
    unsignedApk: join(resolvedWorkDir, "patched-unsigned.apk"),
    unpackDir: join(resolvedWorkDir, "unpacked"),
    workDir: resolvedWorkDir,
    zipalignPath,
  };
}

export function buildUnsignedApkArchiveCommand({
  jarPath,
  outputApk,
  unpackDir,
}) {
  return {
    args: ["cf", outputApk, "-C", unpackDir, "."],
    command: jarPath,
  };
}

const zipRepackPythonSource = String.raw`
import sys
import zipfile

source_apk, replacement_bundle, output_apk, entry_name = sys.argv[1:5]
signature_names = {"META-INF/MANIFEST.MF"}
signature_suffixes = (".RSA", ".DSA", ".EC", ".SF")
replaced = False

with zipfile.ZipFile(source_apk, "r") as source, zipfile.ZipFile(output_apk, "w") as target:
    for info in source.infolist():
        if info.filename in signature_names or (
            info.filename.startswith("META-INF/") and info.filename.upper().endswith(signature_suffixes)
        ):
            continue
        next_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        next_info.comment = info.comment
        next_info.compress_type = info.compress_type
        next_info.create_system = info.create_system
        next_info.external_attr = info.external_attr
        next_info.extra = info.extra
        next_info.internal_attr = info.internal_attr
        data = open(replacement_bundle, "rb").read() if info.filename == entry_name else source.read(info.filename)
        if info.filename == entry_name:
            replaced = True
        target.writestr(next_info, data)

if not replaced:
    raise SystemExit(f"APK entry not found: {entry_name}")
`;

export function buildZipRepackPythonCommand({
  entryName,
  outputApk,
  pythonPath,
  replacementBundle,
  sourceApk,
}) {
  return {
    args: [
      "-c",
      zipRepackPythonSource,
      sourceApk,
      replacementBundle,
      outputApk,
      normalizeApkEntryName(entryName),
    ],
    command: pythonPath,
  };
}

const quoteCmdArgument = (value) => {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/u.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

export function buildExecutableInvocation(command, args) {
  if (/\.(?:bat|cmd)$/iu.test(command)) {
    return {
      args: [
        "/d",
        "/s",
        "/c",
        [
          `"${String(command).replaceAll('"', '""')}"`,
          ...args.map(quoteCmdArgument),
        ].join(" "),
      ],
      command: "cmd.exe",
    };
  }
  return { args, command };
}

const run = (command, args, options = {}) => {
  const invocation = buildExecutableInvocation(command, args);
  execFileSync(invocation.command, invocation.args, {
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true,
    ...options,
  });
};

const runApksigner = (plan, args, options = {}) =>
  execFileSync(plan.javaPath, ["-jar", plan.apksignerJarPath, ...args], {
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true,
    ...options,
  });

export function patchAndroidApkBundle(options) {
  const plan = buildPatchApkBundlePlan(options);
  requireExistingFile("source APK", plan.sourceApk);
  requireExistingFile("replacement bundle", plan.replacementBundle);
  requireExistingFile("zipalign", plan.zipalignPath);
  requireExistingFile("java", plan.javaPath);
  requireExistingFile("apksigner jar", plan.apksignerJarPath);
  requireExistingFile("python", plan.pythonPath);
  requireExistingFile("debug keystore", plan.keystorePath);

  rmSync(plan.workDir, { force: true, recursive: true });
  mkdirSync(plan.workDir, { recursive: true });
  mkdirSync(dirname(plan.outputApk), { recursive: true });

  const repack = buildZipRepackPythonCommand({
    entryName: plan.entryName,
    outputApk: plan.unsignedApk,
    pythonPath: plan.pythonPath,
    replacementBundle: plan.replacementBundle,
    sourceApk: plan.sourceApk,
  });
  run(repack.command, repack.args);
  run(plan.zipalignPath, ["-f", "4", plan.unsignedApk, plan.alignedApk]);
  runApksigner(plan, [
    "sign",
    "--ks",
    plan.keystorePath,
    "--ks-pass",
    "pass:android",
    "--key-pass",
    "pass:android",
    "--out",
    plan.outputApk,
    plan.alignedApk,
  ]);
  const verifyOutput = runApksigner(plan, [
    "verify",
    "--verbose",
    "--print-certs",
    plan.outputApk,
  ]);
  writeFileSync(`${plan.outputApk}.verify.txt`, verifyOutput, "utf8");
  return { ...plan, verifyOutput };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-apk") {
      options.sourceApk = argv[++index];
    } else if (arg === "--replacement-bundle") {
      options.replacementBundle = argv[++index];
    } else if (arg === "--output-apk") {
      options.outputApk = argv[++index];
    } else if (arg === "--entry-name") {
      options.entryName = argv[++index];
    } else if (arg === "--keystore") {
      options.keystorePath = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const result = patchAndroidApkBundle(parseArgs(process.argv.slice(2)));
  console.log(
    JSON.stringify(
      {
        entryName: result.entryName,
        outputApk: result.outputApk,
        sourceApk: result.sourceApk,
      },
      null,
      2,
    ),
  );
}
