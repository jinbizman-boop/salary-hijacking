import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = path.resolve(mobileRoot, "../..");
const requireFromRoot = createRequire(path.join(repoRoot, "package.json"));
const requireFromMobile = createRequire(path.join(mobileRoot, "package.json"));

const checks = [];

const checkResolve = (
  label,
  requireFn,
  moduleName,
  { required = true } = {},
) => {
  try {
    const resolved = requireFn.resolve(moduleName);
    checks.push({ label, moduleName, resolved, status: "PASS" });
    return resolved;
  } catch (error) {
    if (!required && error?.code === "MODULE_NOT_FOUND") {
      checks.push({ label, moduleName, status: "OBSERVED_NOT_FOUND" });
      return null;
    }
    checks.push({
      errorCode: error?.code ?? "UNKNOWN",
      label,
      message:
        error instanceof Error ? error.message.split("\n")[0] : String(error),
      moduleName,
      status: "FAIL",
    });
    throw error;
  }
};

checkResolve(
  "root workspace package resolution",
  requireFromRoot,
  "expo-localization/package.json",
  { required: false },
);
checkResolve(
  "apps/mobile package resolution",
  requireFromMobile,
  "expo-localization/package.json",
);
checkResolve(
  "apps/mobile runtime entry resolution",
  requireFromMobile,
  "expo-localization",
);

const metroConfig = requireFromMobile("./metro.config.cjs");
const fallbackResolver = () => {
  throw new Error("Metro fallback resolver was used for expo-localization");
};
const metroResult = metroConfig.resolver.resolveRequest(
  {
    originModulePath: path.join(mobileRoot, "src", "i18n", "index.ts"),
    resolveRequest: fallbackResolver,
  },
  "expo-localization",
  "android",
);
checks.push({
  filePath: metroResult?.filePath ?? null,
  label: "Metro Android resolver",
  moduleName: "expo-localization",
  status:
    metroResult?.type === "sourceFile" && metroResult.filePath
      ? "PASS"
      : "FAIL",
});

const failed = checks.filter((check) => check.status === "FAIL");
console.log(
  JSON.stringify(
    { checks, status: failed.length === 0 ? "PASS" : "FAIL" },
    null,
    2,
  ),
);
if (failed.length > 0) process.exit(1);
