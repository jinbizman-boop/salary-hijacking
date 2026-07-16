#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDownloads = "C:/Users/PC/Downloads";
const stitchRoot = join(repoRoot, "docs/design/stitch/2026-07-16");
const screensDir = join(stitchRoot, "screens");
const htmlDir = join(stitchRoot, "html");
const sourceZipsDir = join(stitchRoot, "source-zips");

const canonicalReferences = [
  [
    "splash",
    "stitch_salary_hijacking_design_system (2).zip",
    "stitch_salary_hijacking_design_system/_10/screen.png",
  ],
  [
    "login",
    "stitch_salary_hijacking_design_system (2).zip",
    "stitch_salary_hijacking_design_system/_8/screen.png",
  ],
  [
    "signup",
    "stitch_salary_hijacking_design_system (2).zip",
    "stitch_salary_hijacking_design_system/_14/screen.png",
  ],
  [
    "salary-home",
    "stitch_salary_hijacking_design_system (3).zip",
    "stitch_salary_hijacking_design_system/_10/screen.png",
  ],
  [
    "notifications",
    "stitch_salary_hijacking_design_system (4).zip",
    "stitch_salary_hijacking_design_system/_5/screen.png",
  ],
  [
    "plan-settings",
    "stitch_salary_hijacking_design_system (2).zip",
    "stitch_salary_hijacking_design_system/_9/screen.png",
  ],
  [
    "level-main",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/lv_up_3/screen.png",
  ],
  [
    "reading",
    "stitch_salary_hijacking_design_system (8).zip",
    "stitch_salary_hijacking_design_system/_6/screen.png",
  ],
  [
    "news",
    "stitch_salary_hijacking_design_system (9).zip",
    "stitch_salary_hijacking_design_system/_6/screen.png",
  ],
  [
    "english",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/lv_up_4/screen.png",
  ],
  [
    "health",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/lv_up_5/screen.png",
  ],
  [
    "community-all",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/_1/screen.png",
  ],
  [
    "community-free",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/_2/screen.png",
  ],
  [
    "community-level-certification",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/_3/screen.png",
  ],
  [
    "community-hobby",
    "stitch_salary_hijacking_design_system (7).zip",
    "stitch_salary_hijacking_design_system/_4/screen.png",
  ],
  [
    "community-write",
    "stitch_salary_hijacking_design_system (8).zip",
    "stitch_salary_hijacking_design_system/_12/screen.png",
  ],
  [
    "profile",
    "stitch_salary_hijacking_design_system (8).zip",
    "stitch_salary_hijacking_design_system/_3/screen.png",
  ],
].map(([name, zip, screenEntry]) => ({
  name,
  zip,
  screenEntry,
  htmlEntry: posix.join(posix.dirname(screenEntry), "code.html"),
}));

function parseArgs(argv) {
  const args = { dryRun: false, downloads: defaultDownloads };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--downloads") {
      args.downloads = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function listZipEntries(zipPath) {
  return execFileSync("tar", ["-tf", zipPath], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

function extractZipEntry(zipPath, entry) {
  return execFileSync("tar", ["-xOf", zipPath, entry]);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function findZips(downloads) {
  const ps = `Get-ChildItem -LiteralPath '${downloads.replaceAll("'", "''")}' -Filter 'stitch_salary_hijacking_design_system*.zip' | Sort-Object Name | ForEach-Object { $_.FullName }`;
  return execFileSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function writeText(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

function writeBuffer(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function buildInventory(downloads) {
  const zipPaths = findZips(downloads);
  const byZipName = new Map(
    zipPaths.map((zipPath) => [basename(zipPath), zipPath]),
  );
  const zips = zipPaths.map((zipPath) => {
    const entries = listZipEntries(zipPath);
    const relevantEntries = entries.filter((entry) =>
      /(?:screen\.png|code\.html|DESIGN\.md)$/.test(entry),
    );
    return {
      zip: basename(zipPath),
      sourcePath: zipPath.replaceAll("\\", "/"),
      relevantEntryCount: relevantEntries.length,
      screenCount: relevantEntries.filter((entry) =>
        entry.endsWith("screen.png"),
      ).length,
      htmlCount: relevantEntries.filter((entry) => entry.endsWith("code.html"))
        .length,
      designDocCount: relevantEntries.filter((entry) =>
        entry.endsWith("DESIGN.md"),
      ).length,
      relevantEntries,
    };
  });

  const canonicalScreens = canonicalReferences.map((ref) => {
    const zipPath = byZipName.get(ref.zip);
    if (!zipPath) {
      return { ...ref, status: "missing-zip" };
    }
    const screen = extractZipEntry(zipPath, ref.screenEntry);
    let htmlSha256 = null;
    let htmlBytes = 0;
    try {
      const html = extractZipEntry(zipPath, ref.htmlEntry);
      htmlSha256 = sha256(html);
      htmlBytes = html.byteLength;
    } catch {
      htmlSha256 = null;
    }
    return {
      ...ref,
      status: "resolved",
      screenBytes: screen.byteLength,
      screenSha256: sha256(screen),
      htmlBytes,
      htmlSha256,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    downloads: downloads.replaceAll("\\", "/"),
    zipCount: zipPaths.length,
    repoStoresSourceZipCopies: false,
    sourceZipPolicy:
      "Source ZIP files remain in Downloads or external artifact storage; repository records paths and extracted reference PNG/HTML only.",
    sourceZipsDir: sourceZipsDir.replaceAll("\\", "/"),
    zips,
    canonicalScreens,
    missingCanonicalScreens: canonicalScreens
      .filter((screen) => screen.status !== "resolved" || !screen.screenSha256)
      .map((screen) => screen.name),
    missingCanonicalHtml: canonicalScreens
      .filter((screen) => !screen.htmlSha256)
      .map((screen) => screen.name),
  };
}

function persistCanonical(summary) {
  mkdirSync(screensDir, { recursive: true });
  mkdirSync(htmlDir, { recursive: true });
  mkdirSync(sourceZipsDir, { recursive: true });

  const byZip = new Map(summary.zips.map((zip) => [zip.zip, zip.sourcePath]));
  for (const ref of canonicalReferences) {
    const zipPath = byZip.get(ref.zip);
    const screen = extractZipEntry(zipPath, ref.screenEntry);
    const html = extractZipEntry(zipPath, ref.htmlEntry);
    writeBuffer(join(screensDir, `${ref.name}.png`), screen);
    writeBuffer(join(htmlDir, `${ref.name}.html`), html);
  }

  const zipManifest = summary.zips.map((zip) => ({
    zip: zip.zip,
    sourcePath: zip.sourcePath,
    sha256: sha256(readFileSync(zip.sourcePath)),
    bytes: readFileSync(zip.sourcePath).byteLength,
  }));
  writeText(
    join(sourceZipsDir, "source-zips-manifest.json"),
    `${JSON.stringify(zipManifest, null, 2)}\n`,
  );
}

function writeInventory(summary) {
  writeText(
    join(stitchRoot, "stitch-screen-inventory.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  const canonicalRows = summary.canonicalScreens
    .map(
      (screen) =>
        `| ${screen.name} | ${screen.zip} | ${screen.screenEntry} | ${screen.screenBytes ?? 0} | ${screen.screenSha256 ?? "MISSING"} | ${screen.htmlEntry} | ${screen.htmlBytes ?? 0} |`,
    )
    .join("\n");
  const zipRows = summary.zips
    .map(
      (zip) =>
        `| ${zip.zip} | ${zip.screenCount} | ${zip.htmlCount} | ${zip.designDocCount} | ${zip.sourcePath} |`,
    )
    .join("\n");

  writeText(
    join(stitchRoot, "STITCH_SCREEN_INVENTORY.md"),
    `# Stitch Screen Inventory\n\nGenerated: ${summary.generatedAt}\n\nSource ZIP policy: source ZIP files are not copied into Git; this repository keeps canonical reference PNG/HTML and records the original local source paths.\n\n## Source ZIPs\n\n| ZIP | screen.png | code.html | DESIGN.md | Source path |\n|---|---:|---:|---:|---|\n${zipRows}\n\n## Canonical Screens\n\n| Screen | ZIP | screen.png entry | Bytes | SHA256 | code.html entry | HTML bytes |\n|---|---|---|---:|---|---|---:|\n${canonicalRows}\n`,
  );
}

const args = parseArgs(process.argv.slice(2));
const summary = buildInventory(args.downloads);
if (!args.dryRun) {
  persistCanonical(summary);
  const refreshedSummary = buildInventory(args.downloads);
  writeInventory(refreshedSummary);
  process.stdout.write(`${JSON.stringify(refreshedSummary, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}
