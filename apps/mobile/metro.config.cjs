const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const substAliasRoot = process.env.SALARY_HIJACKING_ANDROID_BUILD_SUBST_ALIAS;
const useCanonicalMetroRoot =
  process.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT === "1";
const substProjectRootCandidate = substAliasRoot
  ? path.join(substAliasRoot, "apps", "mobile")
  : null;
const substProjectRoot =
  substProjectRootCandidate && fs.existsSync(substProjectRootCandidate)
    ? substProjectRootCandidate
    : null;
const projectRoot = useCanonicalMetroRoot
  ? fs.realpathSync.native(__dirname)
  : (substProjectRoot ?? __dirname);
const workspaceRoot = path.resolve(projectRoot, "../..");
const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
const config = getDefaultConfig(projectRoot);

function appendUniquePath(paths, nextPath) {
  const normalizedNextPath = path.resolve(nextPath).toLowerCase();
  if (
    paths.some(
      (existingPath) =>
        path.resolve(existingPath).toLowerCase() === normalizedNextPath,
    )
  ) {
    return paths;
  }
  return [...paths, nextPath];
}

function shouldAppendCanonicalNodeModules(
  aliasWorkspaceRoot,
  canonicalWorkspaceRoot,
  platform = process.platform,
) {
  if (platform !== "win32") return true;
  return (
    normalizeForPrefix(aliasWorkspaceRoot, platform) ===
    normalizeForPrefix(canonicalWorkspaceRoot, platform)
  );
}

const workspaceNodeModules = path.join(workspaceRoot, "node_modules");
const realWorkspaceNodeModules = path.join(realWorkspaceRoot, "node_modules");
config.watchFolders = appendUniquePath(
  config.watchFolders ?? [],
  workspaceNodeModules,
);
config.resolver.nodeModulesPaths = appendUniquePath(
  config.resolver.nodeModulesPaths ?? [],
  workspaceNodeModules,
);
if (
  shouldAppendCanonicalNodeModules(
    workspaceRoot,
    realWorkspaceRoot,
    process.platform,
  )
) {
  config.watchFolders = appendUniquePath(
    config.watchFolders ?? [],
    realWorkspaceNodeModules,
  );
  config.resolver.nodeModulesPaths = appendUniquePath(
    config.resolver.nodeModulesPaths ?? [],
    realWorkspaceNodeModules,
  );
}

function isReactSingleton(moduleName) {
  return (
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react-dom/") ||
    moduleName === "react-native" ||
    moduleName.startsWith("react-native/")
  );
}

function isExpoRouterRuntime(moduleName) {
  return (
    moduleName === "expo-router" ||
    moduleName === "expo-router/entry" ||
    moduleName.startsWith("expo-router/build/") ||
    moduleName === "@expo/metro-runtime" ||
    moduleName.startsWith("@expo/metro-runtime/")
  );
}

const expoRouterDependencyPackages = new Set([
  "@expo/schema-utils",
  "@expo/server",
  "@radix-ui/react-compose-refs",
  "@radix-ui/react-slot",
  "client-only",
  "escape-string-regexp",
  "react-fast-compare",
  "semver",
  "server-only",
  "shallowequal",
]);

function isExpoRouterDependencyRuntime(moduleName) {
  const packageName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];
  return expoRouterDependencyPackages.has(packageName);
}

function isBabelRuntime(moduleName) {
  return (
    moduleName === "@babel/runtime" || moduleName.startsWith("@babel/runtime/")
  );
}

function isRuntimePolyfill(moduleName) {
  return (
    moduleName === "whatwg-fetch" || moduleName.startsWith("whatwg-fetch/")
  );
}

const expoCoreRuntimePackages = new Set([
  "expo",
  "expo-application",
  "expo-asset",
  "expo-crypto",
  "expo-device",
  "expo-document-picker",
  "expo-font",
  "expo-haptics",
  "expo-linking",
  "expo-localization",
  "expo-notifications",
  "expo-secure-store",
  "expo-splash-screen",
  "expo-status-bar",
  "expo-system-ui",
  "expo-updates",
  "expo-web-browser",
  "expo-constants",
  "expo-file-system",
  "expo-json-utils",
  "expo-keep-awake",
  "expo-manifests",
  "expo-updates-interface",
  "@expo/image-utils",
  "@ide/backoff",
  "assert",
  "badgin",
  "buffer",
  "call-bind",
  "ieee754",
  "is-nan",
  "object-is",
  "object.assign",
  "punycode",
  "react-native-edge-to-edge",
  "util",
  "webidl-conversions",
  "whatwg-url-without-unicode",
]);

function isExpoCoreRuntime(moduleName) {
  const packageName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];
  return expoCoreRuntimePackages.has(packageName);
}

function isNavigationRuntime(moduleName) {
  return moduleName.startsWith("@react-navigation/");
}

const navigationDependencyPackages = new Set([
  "color",
  "color-convert",
  "color-name",
  "color-string",
  "decode-uri-component",
  "fast-deep-equal",
  "filter-obj",
  "is-arrayish",
  "nanoid",
  "query-string",
  "react-is",
  "sf-symbols-typescript",
  "simple-swizzle",
  "split-on-first",
  "standard-navigation",
  "strict-uri-encode",
  "use-sync-external-store",
  "warn-once",
]);

function isNavigationDependencyRuntime(moduleName) {
  const packageName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];
  return navigationDependencyPackages.has(packageName);
}

const reactNativeRuntimePackages = new Set([
  "@react-native/virtualized-lists",
  "abort-controller",
  "ansi-regex",
  "anser",
  "base64-js",
  "event-target-shim",
  "flow-enums-runtime",
  "invariant",
  "memoize-one",
  "metro-runtime",
  "metro-source-map",
  "nullthrows",
  "promise",
  "regenerator-runtime",
  "react-freeze",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-is-edge-to-edge",
  "react-native-safe-area-context",
  "react-native-screens",
  "scheduler",
  "stacktrace-parser",
  "use-latest-callback",
]);

function isReactNativeScopedRuntime(moduleName) {
  return moduleName.startsWith("@react-native/");
}

function isReactNativeRuntimeDependency(moduleName) {
  const packageName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];
  return (
    isReactNativeScopedRuntime(moduleName) ||
    reactNativeRuntimePackages.has(packageName)
  );
}

function pathForPlatform(platform = process.platform) {
  return platform === "win32" ? path.win32 : path;
}

function normalizeForPrefix(value, platform = process.platform) {
  return pathForPlatform(platform)
    .resolve(value)
    .replace(/[\\/]+$/u, "")
    .toLowerCase();
}

function mapToWorkspaceAliasRoot(
  filePath,
  aliasWorkspaceRoot,
  canonicalWorkspaceRoot,
  platform = process.platform,
) {
  const pathApi = pathForPlatform(platform);
  if (!pathApi.isAbsolute(filePath)) return filePath;
  if (platform !== "win32") return filePath;
  const normalizedFilePath = normalizeForPrefix(filePath, platform);
  const normalizedAliasRoot = normalizeForPrefix(aliasWorkspaceRoot, platform);
  const normalizedCanonicalRoot = normalizeForPrefix(
    canonicalWorkspaceRoot,
    platform,
  );
  if (normalizedAliasRoot === normalizedCanonicalRoot) return filePath;
  if (
    normalizedFilePath !== normalizedCanonicalRoot &&
    !normalizedFilePath.startsWith(`${normalizedCanonicalRoot}${pathApi.sep}`)
  ) {
    return filePath;
  }
  return pathApi.join(
    aliasWorkspaceRoot,
    pathApi.relative(canonicalWorkspaceRoot, filePath),
  );
}

function mapToCanonicalWorkspaceRoot(
  filePath,
  aliasWorkspaceRoot,
  canonicalWorkspaceRoot,
  platform = process.platform,
) {
  const pathApi = pathForPlatform(platform);
  if (!pathApi.isAbsolute(filePath)) return filePath;
  if (platform !== "win32") return filePath;
  const normalizedFilePath = normalizeForPrefix(filePath, platform);
  const normalizedAliasRoot = normalizeForPrefix(aliasWorkspaceRoot, platform);
  const normalizedCanonicalRoot = normalizeForPrefix(
    canonicalWorkspaceRoot,
    platform,
  );
  if (normalizedAliasRoot === normalizedCanonicalRoot) return filePath;
  if (
    normalizedFilePath !== normalizedAliasRoot &&
    !normalizedFilePath.startsWith(`${normalizedAliasRoot}${pathApi.sep}`)
  ) {
    return filePath;
  }
  return pathApi.join(
    canonicalWorkspaceRoot,
    pathApi.relative(aliasWorkspaceRoot, filePath),
  );
}

function patchMetroDefaultsModuleSystem({
  aliasWorkspaceRoot,
  canonicalWorkspaceRoot,
  moduleDefaults,
  platform = process.platform,
}) {
  if (!moduleDefaults || typeof moduleDefaults.moduleSystem !== "string") {
    return null;
  }

  const moduleSystem = mapToWorkspaceAliasRoot(
    moduleDefaults.moduleSystem,
    aliasWorkspaceRoot,
    canonicalWorkspaceRoot,
    platform,
  );
  moduleDefaults.moduleSystem = moduleSystem;
  return moduleSystem;
}

function patchMetroSerializerPolyfills({
  aliasWorkspaceRoot,
  canonicalWorkspaceRoot,
  platform = process.platform,
  serializer,
}) {
  if (!serializer || typeof serializer.getPolyfills !== "function") {
    return null;
  }

  const getPolyfills = serializer.getPolyfills;
  serializer.getPolyfills = (options) =>
    getPolyfills(options).map((polyfillPath) =>
      mapToWorkspaceAliasRoot(
        polyfillPath,
        aliasWorkspaceRoot,
        canonicalWorkspaceRoot,
        platform,
      ),
    );
  return serializer.getPolyfills;
}

function patchMetroSerializerPreModules({
  aliasWorkspaceRoot,
  canonicalWorkspaceRoot,
  platform = process.platform,
  serializer,
}) {
  if (
    !serializer ||
    typeof serializer.getModulesRunBeforeMainModule !== "function"
  ) {
    return null;
  }

  const getModulesRunBeforeMainModule =
    serializer.getModulesRunBeforeMainModule;
  serializer.getModulesRunBeforeMainModule = () =>
    getModulesRunBeforeMainModule().map((modulePath) =>
      mapToWorkspaceAliasRoot(
        modulePath,
        aliasWorkspaceRoot,
        canonicalWorkspaceRoot,
        platform,
      ),
    );
  return serializer.getModulesRunBeforeMainModule;
}

try {
  const expoMetroConfigPath = require.resolve("expo/metro-config", {
    paths: [projectRoot],
  });
  const metroDefaultsPath = require.resolve(
    "metro-config/src/defaults/defaults",
    {
      paths: [expoMetroConfigPath],
    },
  );
  patchMetroDefaultsModuleSystem({
    aliasWorkspaceRoot: workspaceRoot,
    canonicalWorkspaceRoot: realWorkspaceRoot,
    moduleDefaults: require(metroDefaultsPath),
    platform: process.platform,
  });
} catch (error) {
  if (error && error.code !== "MODULE_NOT_FOUND") throw error;
}
patchMetroSerializerPolyfills({
  aliasWorkspaceRoot: workspaceRoot,
  canonicalWorkspaceRoot: realWorkspaceRoot,
  platform: process.platform,
  serializer: config.serializer,
});
patchMetroSerializerPreModules({
  aliasWorkspaceRoot: workspaceRoot,
  canonicalWorkspaceRoot: realWorkspaceRoot,
  platform: process.platform,
  serializer: config.serializer,
});

function isBareModuleRequest(moduleName) {
  return !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
}

function resolveWorkspaceModule(moduleName) {
  if (moduleName === "assert") {
    return require.resolve("assert/", {
      paths: [projectRoot],
    });
  }

  if (moduleName === "punycode") {
    return require.resolve("punycode/", {
      paths: [projectRoot],
    });
  }

  if (moduleName === "util") {
    return require.resolve("util/", {
      paths: [projectRoot],
    });
  }

  let resolved;
  try {
    resolved = require.resolve(moduleName, {
      paths: [projectRoot],
    });
  } catch (error) {
    if (
      moduleName === "@expo/metro-runtime" ||
      moduleName.startsWith("@expo/metro-runtime/")
    ) {
      const expoRouterPackage = require.resolve("expo-router/package.json", {
        paths: [projectRoot],
      });
      resolved = require.resolve(moduleName, {
        paths: [path.dirname(expoRouterPackage)],
      });
    } else {
      throw error;
    }
  }
  return resolved;
}

function tryResolveFromOriginModule(moduleName, originModulePath) {
  if (!originModulePath || !isBareModuleRequest(moduleName)) return null;

  const canonicalOriginModulePath = mapToCanonicalWorkspaceRoot(
    originModulePath,
    workspaceRoot,
    realWorkspaceRoot,
    process.platform,
  );

  try {
    const resolved = require.resolve(moduleName, {
      paths: [path.dirname(canonicalOriginModulePath)],
    });
    if (!path.isAbsolute(resolved)) return null;
    return resolved;
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") return null;
    throw error;
  }
}

function toWorkspaceSourceFile(filePath) {
  return {
    type: "sourceFile",
    filePath: mapToWorkspaceAliasRoot(
      filePath,
      workspaceRoot,
      realWorkspaceRoot,
      process.platform,
    ),
  };
}

function toWorkspaceResolution(resolution) {
  if (
    resolution &&
    resolution.type === "sourceFile" &&
    typeof resolution.filePath === "string"
  ) {
    return {
      ...resolution,
      filePath: mapToWorkspaceAliasRoot(
        resolution.filePath,
        workspaceRoot,
        realWorkspaceRoot,
        process.platform,
      ),
    };
  }
  return resolution;
}

function isWindowsDriveRootOrigin(
  originModulePath,
  platform = process.platform,
) {
  if (!originModulePath) return false;
  const normalizedOrigin = originModulePath
    .replace(/[\\/]+/gu, "\\")
    .replace(/\\\.$/u, "\\");
  if (platform !== "win32" && !/^[A-Za-z]:/u.test(normalizedOrigin)) {
    return false;
  }
  return /^[A-Za-z]:\\?$/u.test(normalizedOrigin);
}

function isWorkspaceRootOrigin(originModulePath) {
  if (!originModulePath) return false;
  const normalizedOrigin = normalizeForPrefix(originModulePath);
  return [workspaceRoot, realWorkspaceRoot].some(
    (root) => normalizedOrigin === normalizeForPrefix(root),
  );
}

function tryResolveWindowsDriveRootEntry(moduleName, originModulePath) {
  if (
    moduleName !== "./index.android.js" ||
    (!isWindowsDriveRootOrigin(originModulePath) &&
      !isWorkspaceRootOrigin(originModulePath))
  ) {
    return null;
  }
  const entryFilePath = path.join(projectRoot, "index.android.js");
  return fs.existsSync(entryFilePath) ? entryFilePath : null;
}

function isReactNativeModuleRequest(moduleName) {
  return (
    moduleName === "react-native" || moduleName.startsWith("react-native/")
  );
}

function shouldDelegateReactNativeWebResolution(moduleName, platform) {
  return platform === "web" && isReactNativeModuleRequest(moduleName);
}

function resolveReactNativePlatformModule(moduleName, platform) {
  if (
    !platform ||
    moduleName === "react-native" ||
    !moduleName.startsWith("react-native/")
  ) {
    return null;
  }

  const reactNativePackage = require.resolve("react-native/package.json", {
    paths: [projectRoot],
  });
  const reactNativeRoot = path.dirname(reactNativePackage);
  const modulePath = moduleName.replace(/^react-native\//u, "");
  const candidate = path.join(reactNativeRoot, `${modulePath}.${platform}.js`);
  if (!fs.existsSync(candidate)) return null;
  return candidate;
}

function tryResolveWorkspaceModule(moduleName, platform = null) {
  const platformModule = resolveReactNativePlatformModule(moduleName, platform);
  if (platformModule !== null) return platformModule;

  try {
    return resolveWorkspaceModule(moduleName);
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") return null;
    throw error;
  }
}

function isWorkspaceAbsoluteModuleRequest(moduleName) {
  if (!path.isAbsolute(moduleName)) return false;
  const normalizedModuleName = normalizeForPrefix(moduleName);
  return [workspaceRoot, realWorkspaceRoot].some((root) => {
    const normalizedRoot = normalizeForPrefix(root);
    return (
      normalizedModuleName === normalizedRoot ||
      normalizedModuleName.startsWith(`${normalizedRoot}${path.sep}`)
    );
  });
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isWorkspaceAbsoluteModuleRequest(moduleName)) {
    return toWorkspaceSourceFile(moduleName);
  }

  const windowsDriveRootEntry = tryResolveWindowsDriveRootEntry(
    moduleName,
    context.originModulePath,
  );
  if (windowsDriveRootEntry !== null) {
    return toWorkspaceSourceFile(windowsDriveRootEntry);
  }

  if (shouldDelegateReactNativeWebResolution(moduleName, platform)) {
    return toWorkspaceResolution(
      context.resolveRequest(context, moduleName, platform),
    );
  }

  const originResolvedModule = tryResolveFromOriginModule(
    moduleName,
    context.originModulePath,
  );
  if (originResolvedModule !== null) {
    return toWorkspaceSourceFile(originResolvedModule);
  }

  if (moduleName === "expo-router/entry") {
    return toWorkspaceSourceFile(resolveWorkspaceModule(moduleName));
  }

  if (isReactSingleton(moduleName)) {
    const mobileEntry = tryResolveWorkspaceModule(moduleName, platform);
    if (mobileEntry === null) {
      return toWorkspaceResolution(
        context.resolveRequest(context, moduleName, platform),
      );
    }
    return toWorkspaceSourceFile(mobileEntry);
  }

  if (isExpoRouterRuntime(moduleName)) {
    const routerEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(routerEntry);
  }

  if (isExpoRouterDependencyRuntime(moduleName)) {
    const routerDependencyEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(routerDependencyEntry);
  }

  if (isBabelRuntime(moduleName)) {
    const runtimeEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(runtimeEntry);
  }

  if (isRuntimePolyfill(moduleName)) {
    const polyfillEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(polyfillEntry);
  }

  if (isExpoCoreRuntime(moduleName)) {
    const expoEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(expoEntry);
  }

  if (isNavigationRuntime(moduleName)) {
    const navigationEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(navigationEntry);
  }

  if (isNavigationDependencyRuntime(moduleName)) {
    const navigationDependencyEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(navigationDependencyEntry);
  }

  if (isReactNativeRuntimeDependency(moduleName)) {
    const runtimeEntry = resolveWorkspaceModule(moduleName);
    return toWorkspaceSourceFile(runtimeEntry);
  }

  return toWorkspaceResolution(
    context.resolveRequest(context, moduleName, platform),
  );
};

Object.defineProperty(config, "__private", {
  value: {
    mapToCanonicalWorkspaceRoot,
    mapToWorkspaceAliasRoot,
    patchMetroDefaultsModuleSystem,
    patchMetroSerializerPreModules,
    patchMetroSerializerPolyfills,
    tryResolveWindowsDriveRootEntry,
    shouldAppendCanonicalNodeModules,
    shouldDelegateReactNativeWebResolution,
  },
});

module.exports = config;
