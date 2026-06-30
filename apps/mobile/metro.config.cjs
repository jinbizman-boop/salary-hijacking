const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

function isReactSingleton(moduleName) {
  return (
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react-dom/")
  );
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isReactSingleton(moduleName)) {
    const mobileEntry = require.resolve(moduleName, {
      paths: [projectRoot],
    });
    return context.resolveRequest(context, mobileEntry, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
