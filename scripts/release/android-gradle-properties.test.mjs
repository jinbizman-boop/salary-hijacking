import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const repoRoot = process.cwd();

test("Android Gradle release builds use in-process Kotlin compilation", async () => {
  const properties = await readFile(
    join(repoRoot, "apps/mobile/android/gradle.properties"),
    "utf8",
  );

  assert.match(
    properties,
    /^kotlin\.compiler\.execution\.strategy=in-process$/m,
  );
  assert.doesNotMatch(
    properties,
    /^kotlin\.compiler\.execution\.strategy=out-of-process$/m,
  );
});

test("Android Gradle prepares Windows Reanimated Ninja object directories without mutating node_modules", async () => {
  const buildGradle = await readFile(
    join(repoRoot, "apps/mobile/android/build.gradle"),
    "utf8",
  );

  assert.match(buildGradle, /salaryHijackingCMakeObjectPathPatch:start/);
  assert.match(buildGradle, /-DCMAKE_OBJECT_PATH_MAX=128/);
  assert.match(buildGradle, /salaryHijackingNativeObjectParentDirsPatch:start/);
  assert.match(buildGradle, /salaryHijackingPrepareNativeObjectParentDirs/);
  assert.match(buildGradle, /task\.name\.startsWith\('configureCMake'\)/);
  assert.match(buildGradle, /task\.name\.startsWith\('buildCMake'\)/);
  assert.match(buildGradle, /react-native-reanimated/);
  assert.doesNotMatch(buildGradle, /CMakeLists\.txt"\)/);
  assert.doesNotMatch(buildGradle, /\.append\('''/);
});

test("Android Gradle can relocate node_modules subproject build output outside node_modules", async () => {
  const buildGradle = await readFile(
    join(repoRoot, "apps/mobile/android/build.gradle"),
    "utf8",
  );

  assert.match(buildGradle, /SALARY_HIJACKING_ANDROID_SUBPROJECT_BUILD_DIR/);
  assert.match(
    buildGradle,
    /normalizedProjectDir\.contains\('\/node_modules\/'\)/,
  );
  assert.match(buildGradle, /subproject\.layout\.buildDirectory\.set/);
  assert.match(buildGradle, /salaryHijackingSafeClasspathRootValue/);
  assert.match(buildGradle, /SALARY_HIJACKING_ANDROID_SAFE_CLASSPATH_DIR/);
});
