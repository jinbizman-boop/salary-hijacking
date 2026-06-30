import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RELATIVE_STATIC_SPECIFIER =
  /\b(from\s*["']|import\s*["'])(\.{1,2}\/[^"']+?)(["'])/g;

function shouldAppendJs(specifier) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return false;
  }

  if (/[?#]/.test(specifier)) return false;
  if (/\.[cm]?js$/.test(specifier)) return false;
  if (/\.json$/.test(specifier)) return false;
  if (/\.css$/.test(specifier)) return false;

  return true;
}

function rewriteSource(source) {
  return source.replace(
    RELATIVE_STATIC_SPECIFIER,
    (match, prefix, specifier, suffix) => {
      if (!shouldAppendJs(specifier)) return match;
      return `${prefix}${specifier}.js${suffix}`;
    },
  );
}

async function walkJsFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

export async function fixEsmImportSpecifiers(options = {}) {
  const distDir = options.distDir ?? path.join(process.cwd(), "dist");
  const files = await walkJsFiles(distDir);
  let changedFiles = 0;

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const rewritten = rewriteSource(source);
    if (rewritten === source) continue;

    await fs.writeFile(file, rewritten, "utf8");
    changedFiles += 1;
  }

  return {
    checkedFiles: files.length,
    changedFiles,
  };
}

function formatResult(result) {
  return `[fix-esm-imports] checked ${result.checkedFiles} JS files; changed ${result.changedFiles}.`;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMain) {
  const result = await fixEsmImportSpecifiers();
  console.log(formatResult(result));
}
