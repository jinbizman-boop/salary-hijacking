const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
const config = getDefaultConfig(projectRoot);

function isReactSingleton(moduleName) {
  return (
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react-dom/")
  );
}

function isExpoRouterRuntime(moduleName) {
  return (
    moduleName === "expo-router/entry" ||
    moduleName.startsWith("expo-router/build/") ||
    moduleName === "@expo/metro-runtime" ||
    moduleName.startsWith("@expo/metro-runtime/")
  );
}

function normalizeForPrefix(value) {
  return path
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
  if (platform !== "win32") return filePath;
  const normalizedFilePath = normalizeForPrefix(filePath);
  const normalizedAliasRoot = normalizeForPrefix(aliasWorkspaceRoot);
  const normalizedCanonicalRoot = normalizeForPrefix(canonicalWorkspaceRoot);
  if (normalizedAliasRoot === normalizedCanonicalRoot) return filePath;
  if (
    normalizedFilePath !== normalizedCanonicalRoot &&
    !normalizedFilePath.startsWith(`${normalizedCanonicalRoot}${path.sep}`)
  ) {
    return filePath;
  }
  return path.join(
    aliasWorkspaceRoot,
    path.relative(canonicalWorkspaceRoot, filePath),
  );
}

function resolveWorkspaceModule(moduleName) {
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
  return mapToWorkspaceAliasRoot(
    resolved,
    workspaceRoot,
    realWorkspaceRoot,
    process.platform,
  );
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isReactSingleton(moduleName)) {
    const mobileEntry = resolveWorkspaceModule(moduleName);
    return context.resolveRequest(context, mobileEntry, platform);
  }

  if (isExpoRouterRuntime(moduleName)) {
    const routerEntry = resolveWorkspaceModule(moduleName);
    return context.resolveRequest(context, routerEntry, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

Object.defineProperty(config, "__private", {
  value: {
    mapToWorkspaceAliasRoot,
  },
});

module.exports = config;
