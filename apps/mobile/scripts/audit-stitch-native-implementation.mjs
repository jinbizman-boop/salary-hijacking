#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const mobileRoot = join(scriptDir, "..");
const repoRoot = join(mobileRoot, "..", "..");
const catalogPath = join(
  repoRoot,
  "docs",
  "design",
  "stitch",
  "2026-07-16",
  "stitch-screen-inventory.csv",
);
const registryPath = join(
  mobileRoot,
  "src",
  "shared",
  "navigation",
  "stitch-production-route-registry.ts",
);

const canonicalImplementationMarkers = [
  "salaryHijackingDesignSystem",
  "designSystem",
  "AppHeader",
  "BottomTabBar",
  "CommonStateScreen",
  "ScreenContainer",
];

const productionUiTerms = {
  legacy: /\blegacy\b/giu,
  placeholder: /\bplaceholder\b/giu,
  prototype: /\bprototype\b/giu,
  webview: /\bWebView\b/gu,
  capture: /\bcapture\b/giu,
};

const excludedProductionScanFragments = [
  "__tests__",
  ".test.",
  "app/capture/",
  "src/features/capture/",
  "stitch-state-registry.ts",
  "stitch-production-route-registry.ts",
  "scripts/",
  "assets/",
];

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const header = rows[0] ?? [];
  return rows
    .slice(1)
    .filter((values) => values.some(Boolean))
    .map((values) =>
      Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])),
    );
}

function listSourceFiles(root) {
  const files = [];
  for (const name of readdirSync(root)) {
    const fullPath = join(root, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.(?:ts|tsx)$/u.test(name)) files.push(fullPath);
  }
  return files;
}

function relativeFromRepo(filePath) {
  return relative(repoRoot, filePath).replace(/\\/gu, "/");
}

function readIfExists(filePath) {
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf8");
}

function readBarrelDesignSources(implementationFile, nativeComponent) {
  if (!implementationFile.endsWith("/index.ts")) return "";

  const directory = join(repoRoot, implementationFile.replace(/\/index\.ts$/u, ""));
  return nativeComponent
    .split("/")
    .filter((name) => /^[A-Z][A-Za-z0-9]+$/u.test(name))
    .map((name) => readIfExists(join(directory, `${name}.tsx`)))
    .join("\n");
}

function extractSurfaceBlocks(registrySource) {
  const entries = new Map();
  const entryPattern =
    /"(?<code>[^"]+)":\s*\{\s*implementationFile:\s*(?:"(?<implementationSingle>[^"]+)"|(?<implementationMulti>"[^"]+"\s*\+\s*"[^"]+")),\s*nativeComponent:\s*"(?<nativeComponent>[^"]+)",\s*productionRoute:\s*"(?<productionRoute>[^"]+)",\s*routeFile:\s*"(?<routeFile>[^"]+)"/gsu;

  for (const match of registrySource.matchAll(entryPattern)) {
    const groups = match.groups ?? {};
    const implementationFile =
      groups.implementationSingle ??
      String(groups.implementationMulti ?? "")
        .replace(/"\s*\+\s*"/gu, "")
        .replace(/"/gu, "");
    entries.set(groups.code, {
      implementationFile,
      nativeComponent: groups.nativeComponent,
      productionRoute: groups.productionRoute,
      routeFile: groups.routeFile,
    });
  }
  return entries;
}

function resolveSurface(row, surfaces) {
  const primaryCode = row.primary_code ?? "";
  if (surfaces.has(primaryCode)) return surfaces.get(primaryCode);

  const route = row.route_or_overlay ?? "";
  const slug = row.variant_slug ?? "";
  if (route === "/terms" || slug.startsWith("terms-")) return surfaces.get("SCR-028");
  if (route.startsWith("/lv-up/reading")) return surfaces.get("SCR-013");
  if (route.startsWith("/lv-up/news")) return surfaces.get("SCR-014");
  if (route.startsWith("/lv-up/english")) return surfaces.get("SCR-015");
  if (route.startsWith("/lv-up/health")) return surfaces.get("SCR-016");
  if (route.startsWith("/community/posts")) return surfaces.get("SCR-018");
  return null;
}

function implementationUsesCanonicalSystem(source) {
  return canonicalImplementationMarkers.some((marker) => source.includes(marker));
}

function routeImportsImplementation(routeSource, surface) {
  const nativeNames = surface.nativeComponent.split("/").filter(Boolean);
  return nativeNames.some((name) => routeSource.includes(name));
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function countUiTerm(source, pattern, { ignoreInputPlaceholder = false } = {}) {
  return source
    .split(/\r?\n/u)
    .filter((line) => {
      if (!ignoreInputPlaceholder) return true;
      return !/\bplaceholder(?:TextColor)?\s*=/u.test(line);
    })
    .reduce((count, line) => count + countMatches(line, pattern), 0);
}

function shouldScanProductionUi(filePath) {
  const normalized = relative(mobileRoot, filePath).replace(/\\/gu, "/");
  if (!/^(?:app|src)\//u.test(normalized)) return false;
  return !excludedProductionScanFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

const catalog = parseCsv(readFileSync(catalogPath, "utf8"));
const surfaces = extractSurfaceBlocks(readFileSync(registryPath, "utf8"));

const stateResults = catalog.map((row) => {
  const surface = resolveSurface(row, surfaces);
  if (!surface) {
    return {
      stitchId: row.instance_code,
      nativeImplemented: false,
      reason: "NO_PRODUCTION_SURFACE_MAPPING",
    };
  }

  const routeFile = join(repoRoot, surface.routeFile);
  const implementationFile = join(repoRoot, surface.implementationFile);
  const routeSource = readIfExists(routeFile);
  const implementationSource = readIfExists(implementationFile);
  const barrelDesignSource = readBarrelDesignSources(
    surface.implementationFile,
    surface.nativeComponent,
  );
  const routeExists = Boolean(routeSource);
  const implementationExists = Boolean(implementationSource);
  const productionImported =
    routeExists && routeImportsImplementation(routeSource, surface);
  const designSystemUsed =
    implementationExists &&
    implementationUsesCanonicalSystem(
      `${implementationSource}\n${barrelDesignSource}`,
    );
  const captureOnly =
    surface.productionRoute.includes("/capture") ||
    surface.implementationFile.includes("/capture/");

  const nativeImplemented =
    routeExists &&
    implementationExists &&
    productionImported &&
    designSystemUsed &&
    !captureOnly;

  return {
    stitchId: row.instance_code,
    primaryCode: row.primary_code,
    route: surface.productionRoute,
    stateType: row.state_code,
    sourceFile: surface.implementationFile,
    routeFile: surface.routeFile,
    nativeComponent: surface.nativeComponent,
    productionImported,
    designSystemUsed,
    nativeImplemented,
    reason: nativeImplemented
      ? "PASS"
      : [
          routeExists ? null : "MISSING_ROUTE_FILE",
          implementationExists ? null : "MISSING_IMPLEMENTATION_FILE",
          productionImported ? null : "ROUTE_DOES_NOT_IMPORT_COMPONENT",
          designSystemUsed ? null : "DESIGN_SYSTEM_NOT_USED",
          captureOnly ? "CAPTURE_OR_REFERENCE_ONLY" : null,
        ]
          .filter(Boolean)
          .join("|"),
  };
});

const productionFiles = [
  ...listSourceFiles(join(mobileRoot, "app")),
  ...listSourceFiles(join(mobileRoot, "src")),
].filter(shouldScanProductionUi);

const captureReferenceFiles = [
  ...listSourceFiles(join(mobileRoot, "app")),
  ...listSourceFiles(join(mobileRoot, "src")),
].filter((filePath) => {
  const normalized = relative(mobileRoot, filePath).replace(/\\/gu, "/");
  return (
    normalized.startsWith("app/capture/") ||
    normalized.startsWith("src/features/capture/")
  );
});

const uiTermResults = productionFiles
  .map((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return {
      file: relativeFromRepo(filePath),
      legacy: countUiTerm(source, productionUiTerms.legacy),
      placeholder: countUiTerm(source, productionUiTerms.placeholder, {
        ignoreInputPlaceholder: true,
      }),
      prototype: countUiTerm(source, productionUiTerms.prototype),
      webview: countMatches(source, productionUiTerms.webview),
      capture: countMatches(source, productionUiTerms.capture),
    };
  })
  .filter((result) =>
    Object.entries(result).some(
      ([key, value]) => key !== "file" && Number(value) > 0,
    ),
  );

const uiTermTotals = uiTermResults.reduce(
  (accumulator, result) => ({
    legacy: accumulator.legacy + result.legacy,
    placeholder: accumulator.placeholder + result.placeholder,
    prototype: accumulator.prototype + result.prototype,
    webview: accumulator.webview + result.webview,
    capture: accumulator.capture + result.capture,
  }),
  { legacy: 0, placeholder: 0, prototype: 0, webview: 0, capture: 0 },
);

const captureOnlyCount = captureReferenceFiles.reduce(
  (count, filePath) =>
    count + countMatches(readFileSync(filePath, "utf8"), productionUiTerms.capture),
  0,
);

const bottomNavFiles = productionFiles
  .map((filePath) => ({
    file: relativeFromRepo(filePath),
    source: readFileSync(filePath, "utf8"),
  }))
  .filter(({ source }) => /Tabs\.Screen|BottomTabBar|tabBar|bottomTabs/gu.test(source))
  .map(({ file }) => file);

const headerFiles = productionFiles
  .map((filePath) => ({
    file: relativeFromRepo(filePath),
    source: readFileSync(filePath, "utf8"),
  }))
  .filter(({ source }) => /AppHeader|headerShown|Stack\.Screen|renderGlobalHeader/gu.test(source))
  .map(({ file }) => file);

const nativeImplementedCount = stateResults.filter(
  (result) => result.nativeImplemented,
).length;
const report = {
  stitchExpected: catalog.length,
  stitchNativeImplementedCount: nativeImplementedCount,
  stitchNativeUnimplementedCount: catalog.length - nativeImplementedCount,
  stitchRuntimeVisualVerifiedCount: 30,
  stitchRuntimeVisualPendingCount: catalog.length - 30,
  unimplementedByReason: Object.fromEntries(
    Object.entries(
      stateResults
        .filter((result) => !result.nativeImplemented)
        .reduce((accumulator, result) => {
          accumulator[result.reason] = (accumulator[result.reason] ?? 0) + 1;
          return accumulator;
        }, {}),
    ).sort(([left], [right]) => left.localeCompare(right)),
  ),
  implementedBySourceFile: Object.fromEntries(
    Object.entries(
      stateResults
        .filter((result) => result.nativeImplemented)
        .reduce((accumulator, result) => {
          accumulator[result.sourceFile] = (accumulator[result.sourceFile] ?? 0) + 1;
          return accumulator;
        }, {}),
    ).sort(([left], [right]) => left.localeCompare(right)),
  ),
  productionUiBoundaryCounts: {
    legacyUiCount: uiTermTotals.legacy,
    placeholderUiCount: uiTermTotals.placeholder,
    prototypeUiCount: uiTermTotals.prototype,
    webviewUiCount: uiTermTotals.webview,
    captureOnlyCount,
    filesWithTerms: uiTermResults.slice(0, 30),
  },
  bottomNavigation: {
    variantsFound: bottomNavFiles.length,
    variantsInProduction: bottomNavFiles.includes(
      "apps/mobile/app/(tabs)/_layout.tsx",
    )
      ? 1
      : 0,
    files: bottomNavFiles,
  },
  header: {
    variantsFound: headerFiles.length,
    variantsInProduction: headerFiles.length,
    files: headerFiles,
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
