type FileSystemLike = Readonly<{
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf8") => string;
}>;

type PathLike = Readonly<{
  join: (...parts: readonly string[]) => string;
  resolve: (...parts: readonly string[]) => string;
}>;

type DetoxAppConfig = Readonly<{
  type?: string;
  binaryPath?: string;
  build?: string;
}>;

type DetoxDeviceConfig = Readonly<{
  type?: string;
  device?: Readonly<Record<string, string>>;
}>;

type DetoxConfiguration = Readonly<{
  device?: string;
  app?: string;
}>;

type DetoxConfig = Readonly<{
  testRunner?: Readonly<{
    args?: Readonly<Record<string, string>>;
    jest?: Readonly<Record<string, number>>;
  }>;
  apps?: Readonly<Record<string, DetoxAppConfig>>;
  devices?: Readonly<Record<string, DetoxDeviceConfig>>;
  configurations?: Readonly<Record<string, DetoxConfiguration>>;
}>;

type PackageJson = Readonly<{
  scripts?: Readonly<Record<string, string>>;
}>;

const fs = jest.requireActual<FileSystemLike>("node:fs");
const path = jest.requireActual<PathLike>("node:path");
const mobileRoot = path.resolve(__dirname, "../../..");

function readRequiredText(relativePath: string): string {
  const absolutePath = path.join(mobileRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required mobile E2E file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

describe("mobile Detox E2E contract", () => {
  it("defines Detox configurations used by the mobile package scripts", () => {
    const detoxConfig = JSON.parse(
      readRequiredText(".detoxrc.json"),
    ) as DetoxConfig;

    expect(detoxConfig.testRunner?.args?.config).toBe("e2e/jest.config.cjs");
    expect(detoxConfig.configurations?.["android.emu.debug"]).toEqual({
      app: "android.debug",
      device: "android.emulator",
    });
    expect(detoxConfig.configurations?.["ios.sim.debug"]).toEqual({
      app: "ios.debug",
      device: "ios.simulator",
    });
    expect(detoxConfig.apps?.["android.debug"]?.type).toBe("android.apk");
    expect(detoxConfig.apps?.["ios.debug"]?.type).toBe("ios.app");
    expect(detoxConfig.devices?.["android.emulator"]?.type).toBe(
      "android.emulator",
    );
    expect(detoxConfig.devices?.["ios.simulator"]?.type).toBe("ios.simulator");
  });

  it("connects Detox to a dedicated Jest E2E runner and smoke spec", () => {
    const jestConfig = readRequiredText("e2e/jest.config.cjs");
    const smokeSpec = readRequiredText("e2e/smoke.e2e.js");

    expect(jestConfig).toContain("e2e/**/*.e2e.js");
    expect(jestConfig).toContain("detox/runners/jest/globalSetup");
    expect(jestConfig).toContain("detox/runners/jest/globalTeardown");
    expect(jestConfig).toContain("detox/runners/jest/reporter");
    expect(jestConfig).toContain("detox/runners/jest/testEnvironment");
    expect(jestConfig).toContain("jest-circus/runner");
    expect(smokeSpec).toContain("salary-hijacking-mobile-root");
    expect(smokeSpec).toContain("device.launchApp");
  });

  it("runs an Android SDK preflight before native Detox E2E", () => {
    const packageJson = JSON.parse(
      readRequiredText("package.json"),
    ) as PackageJson;
    const preflight = readRequiredText("scripts/check-detox-env.mjs");
    const detoxRunner = readRequiredText("scripts/run-detox-android.mjs");

    expect(packageJson.scripts?.["test:e2e"]).toContain(
      "node scripts/check-detox-env.mjs android.emu.debug",
    );
    expect(packageJson.scripts?.["test:e2e"]).toContain(
      "node scripts/run-detox-android.mjs android.emu.debug",
    );
    expect(packageJson.scripts?.["test:e2e:android"]).toContain(
      "node scripts/run-detox-android.mjs android.emu.debug",
    );
    expect(preflight).toContain("ANDROID_SDK_ROOT");
    expect(preflight).toContain("ANDROID_HOME");
    expect(preflight).toContain("salary-hijacking-e2e.apk");
    expect(preflight).toContain("build:e2e:android:local-debug");
    expect(preflight).toContain("build:e2e:android");
    expect(preflight).toContain("e2e:android:import-apk");
    expect(preflight).toContain("test:e2e:android");
    expect(preflight).toContain("process.exit(2)");
    expect(detoxRunner).toContain("ANDROID_SDK_ROOT");
    expect(detoxRunner).toContain("ANDROID_HOME");
    expect(detoxRunner).toContain("detox");
    expect(detoxRunner).toContain("--configuration");
  });

  it("exposes a stable root testID in the Expo Router layout", () => {
    const rootLayout = readRequiredText("app/_layout.tsx");

    expect(rootLayout).toContain("salary-hijacking-mobile-root");
    expect(rootLayout).toContain("IS_E2E_BUILD");
    expect(rootLayout).toContain("readMobileE2eBuildEnabled");
    expect(rootLayout).toContain("E2E shell ready");
  });

  it("blocks Android storage and overlay permissions that are not required for a finance app", () => {
    const appConfig = readRequiredText("app.config.ts");
    const blockedPermissions = [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ];

    for (const permission of blockedPermissions) {
      expect(appConfig).toContain(`"${permission}"`);
    }
  });
});
