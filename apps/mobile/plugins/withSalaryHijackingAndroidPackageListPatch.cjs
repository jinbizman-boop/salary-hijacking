const { withAppBuildGradle } = require("expo/config-plugins");

const patchStart = "// salaryHijackingPackageListPatch:start";
const patchEnd = "// salaryHijackingPackageListPatch:end";

const patchBlock = `${patchStart}
def salaryHijackingPackageListPath = new File(
    layout.buildDirectory.get().asFile,
    "generated/autolinking/src/main/java/com/facebook/react/PackageList.java"
)

tasks.register("salaryHijackingPatchGeneratedPackageList") {
    dependsOn(":app:generateAutolinkingPackageList")
    inputs.file(salaryHijackingPackageListPath).optional()
    outputs.file(salaryHijackingPackageListPath)
    outputs.upToDateWhen { false }
    doLast {
        if (!salaryHijackingPackageListPath.exists()) {
            return
        }
        def source = salaryHijackingPackageListPath.getText("UTF-8")
        def nextSource = source.replace(
            "import expo.core.ExpoModulesPackage;",
            "import expo.modules.ExpoModulesPackage;"
        )
        if (!nextSource.contains("import expo.modules.ExpoModulesPackage;")) {
            nextSource = nextSource.replace(
                "// expo\\n",
                "// expo\\nimport expo.modules.ExpoModulesPackage;\\n"
            )
        }
        if (nextSource != source) {
            salaryHijackingPackageListPath.write(nextSource, "UTF-8")
        }
    }
}

tasks.withType(JavaCompile).configureEach { javaTask ->
    if (javaTask.name.startsWith("compile") && javaTask.name.endsWith("JavaWithJavac")) {
        javaTask.dependsOn("salaryHijackingPatchGeneratedPackageList")
    }
}
${patchEnd}`;

const removeExistingPatchBlock = (contents) =>
  contents.replace(
    new RegExp(
      `\\n?${patchStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${patchEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
      "u",
    ),
    "\n",
  );

const withSalaryHijackingAndroidPackageListPatch = (config) =>
  withAppBuildGradle(config, (nextConfig) => {
    if (nextConfig.modResults.language !== "groovy") {
      throw new Error(
        "Salary Hijacking Android PackageList patch requires Groovy app build.gradle.",
      );
    }

    const contents = removeExistingPatchBlock(nextConfig.modResults.contents);
    const insertionPoint =
      /\n\/\*\*\n \* Set this to true to Run Proguard on Release builds/u;
    if (!insertionPoint.test(contents)) {
      throw new Error(
        "Salary Hijacking Android PackageList patch could not find the release-build insertion point.",
      );
    }

    nextConfig.modResults.contents = contents.replace(
      insertionPoint,
      `\n${patchBlock}\n\n/**\n * Set this to true to Run Proguard on Release builds`,
    );
    return nextConfig;
  });

module.exports = withSalaryHijackingAndroidPackageListPatch;
