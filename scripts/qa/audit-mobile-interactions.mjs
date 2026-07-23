import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = join(dirname(scriptPath), "..", "..");
const mobileRoot = join(root, "apps", "mobile");
const appRoot = join(mobileRoot, "app");
const sourceRoots = [appRoot, join(mobileRoot, "src", "features")];
const reportPath = join(root, "docs", "qa", "INTERACTION_ROUTE_AUDIT.md");

const deadCallbackPatterns = [
  /onPress=\{\(\)\s*=>\s*(?:undefined|null|void 0)\s*\}/gu,
  /onPress=\{\(\)\s*=>\s*\{\s*\}\s*\}/gu,
  /onPress=\{undefined\}/gu,
];

const routeCallPattern =
  /\brouter\.(?:push|replace)\(\s*(["'`])(?<route>\/[^"'`]+)\1|href=(["'`])(?<href>\/[^"'`]+)\3/gu;

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    if (!/\.(?:ts|tsx)$/u.test(entry.name)) return [];
    return [path];
  });
}

function isRuntimeFile(path) {
  const normalized = path.split(sep).join("/");
  return (
    !normalized.includes("/__tests__/") &&
    !normalized.includes("/src/features/capture/") &&
    !normalized.includes("/app/capture/")
  );
}

function routeForAppFile(path, keepGroups) {
  const relativePath = relative(appRoot, path).split(sep).join("/");
  if (!relativePath.endsWith(".tsx")) return null;
  const withoutExtension = relativePath.replace(/\.tsx$/u, "");
  if (withoutExtension.endsWith("/_layout") || withoutExtension === "_layout") {
    return null;
  }
  const segments = withoutExtension
    .split("/")
    .filter((segment) => segment !== "index")
    .filter((segment) => keepGroups || !/^\(.+\)$/u.test(segment));
  return `/${segments.join("/")}`.replace(/\/$/u, "") || "/";
}

function routeToRegex(route) {
  const escaped = route
    .split("/")
    .map((segment) => {
      if (/^\[.+\]$/u.test(segment)) return "[^/]+";
      return segment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    })
    .join("/");
  return new RegExp(`^${escaped}$`, "u");
}

function collectRoutes() {
  const routes = new Set();
  for (const file of walk(appRoot)) {
    const publicRoute = routeForAppFile(file, false);
    const internalRoute = routeForAppFile(file, true);
    if (publicRoute) routes.add(publicRoute);
    if (internalRoute) routes.add(internalRoute);
  }
  return [...routes].sort();
}

function collectViolations() {
  const files = sourceRoots.flatMap(walk).filter(isRuntimeFile);
  const routes = collectRoutes();
  const routeRegexes = routes.map(routeToRegex);
  const violations = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const rel = relative(root, file).split(sep).join("/");

    for (const pattern of deadCallbackPatterns) {
      for (const match of source.matchAll(pattern)) {
        violations.push({
          file: rel,
          kind: "dead-onpress",
          value: match[0],
        });
      }
    }

    for (const match of source.matchAll(routeCallPattern)) {
      const route = match.groups?.route ?? match.groups?.href;
      if (!route) continue;
      const routeWithoutQuery = route.split("?")[0].split("#")[0];
      if (routeRegexes.some((regex) => regex.test(routeWithoutQuery))) {
        continue;
      }
      violations.push({
        file: rel,
        kind: "missing-route",
        value: route,
      });
    }
  }

  return { files, routes, violations };
}

function writeReport(result) {
  const lines = [
    "# Mobile Interaction Route Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Runtime source files scanned: ${result.files.length}`,
    `Expo route targets discovered: ${result.routes.length}`,
    `Violations: ${result.violations.length}`,
    "",
    "## Checks",
    "",
    "- Dead literal `onPress={() => undefined}` / empty callback patterns in runtime screens",
    "- Literal `router.push`, `router.replace`, and `href` route targets resolve to an Expo route file",
    "- Capture-only visual evidence screens are excluded from runtime dead-action gating",
    "",
    "## Violations",
    "",
  ];

  if (result.violations.length === 0) {
    lines.push("None.");
  } else {
    for (const violation of result.violations) {
      lines.push(
        `- ${violation.kind}: \`${violation.value}\` in \`${violation.file}\``,
      );
    }
  }

  lines.push("", "## Routes", "");
  for (const route of result.routes) lines.push(`- \`${route}\``);

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${lines.join("\n")}\n`);
}

export function auditMobileInteractions() {
  const result = collectViolations();
  writeReport(result);
  return result;
}

if (process.argv[1] === scriptPath) {
  const result = auditMobileInteractions();
  if (result.violations.length > 0) {
    console.error(
      `Mobile interaction audit failed with ${result.violations.length} violation(s).`,
    );
    for (const violation of result.violations) {
      console.error(
        `${violation.kind}: ${violation.value} in ${violation.file}`,
      );
    }
    process.exit(1);
  }
  console.log(
    `Mobile interaction audit passed: ${result.files.length} files, ${result.routes.length} routes.`,
  );
}
