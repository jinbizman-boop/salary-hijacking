const expoPackage = {
  platforms: {
    android: {
      packageImportPath: "import expo.modules.ExpoModulesPackage;",
      packageInstance: "new ExpoModulesPackage()",
    },
  },
};

module.exports = {
  dependencies: {
    expo: expoPackage,
  },
};
