#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const defaultRoots = [
  "apps/mobile/app",
  "apps/mobile/src/features",
  "apps/mobile/src/shared",
];

const touchablePattern =
  /<(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback)\b/g;

function walkFiles(root, relativeDir, files) {
  const absoluteDir = resolve(root, relativeDir);
  if (!existsSync(absoluteDir)) return;
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolutePath = join(absoluteDir, entry.name);
    const relativePath = join(relativeDir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (["__tests__", "__mocks__", "capture"].includes(entry.name)) continue;
      walkFiles(root, relativePath, files);
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx)$/u.test(entry.name)) {
      files.push(relativePath);
    }
  }
}

function lineOf(source, offset) {
  return source.slice(0, offset).split(/\r?\n/u).length;
}

function touchableChunk(source, offset) {
  return source.slice(offset, Math.min(source.length, offset + 700));
}

function hasAccessibilityRole(chunk) {
  return /\baccessibilityRole\s*=/u.test(chunk);
}

function hasAccessibilityLabel(chunk) {
  return /\baccessibilityLabel\s*=/u.test(chunk);
}

export function auditMobileAccessibilityCritical({
  root = repoRoot,
  roots = defaultRoots,
} = {}) {
  const files = [];
  for (const relativeRoot of roots) walkFiles(root, relativeRoot, files);

  const failures = [];
  for (const file of files) {
    const absolutePath = resolve(root, file);
    if (!statSync(absolutePath).isFile()) continue;
    const source = readFileSync(absolutePath, "utf8");
    let match;
    while ((match = touchablePattern.exec(source))) {
      const chunk = touchableChunk(source, match.index);
      const role = hasAccessibilityRole(chunk);
      const label = hasAccessibilityLabel(chunk);
      if (role && label) continue;
      failures.push({
        file,
        line: lineOf(source, match.index),
        component: match[1],
        missing: [
          ...(role ? [] : ["accessibilityRole"]),
          ...(label ? [] : ["accessibilityLabel"]),
        ],
        snippet: chunk.slice(0, 180).replace(/\s+/gu, " ").trim(),
      });
    }
  }

  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    scannedFiles: files.length,
    failedChecks: failures.length,
    failures,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditMobileAccessibilityCritical();
  const jsonPath = argValue("--json");
  if (jsonPath) {
    writeFileSync(
      resolve(repoRoot, jsonPath),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  }
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        scannedFiles: result.scannedFiles,
        failedChecks: result.failedChecks,
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
