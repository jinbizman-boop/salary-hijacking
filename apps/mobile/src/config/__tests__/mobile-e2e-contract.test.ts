import appConfig from "../../../app.config";

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
const productionApiBaseUrl = "https://api.salaryhijacking.com";
const placeholderEasProjectId = "00000000-0000-4000-8000-000000000000";
const validEasProjectId = "11111111-1111-4111-8111-111111111111";
const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
  jest.resetModules();
});

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

  it("runs CI-safe E2E by default and keeps strict Android native E2E available", () => {
    const packageJson = JSON.parse(
      readRequiredText("package.json"),
    ) as PackageJson;
    const preflight = readRequiredText("scripts/check-detox-env.mjs");
    const ciRunner = readRequiredText("scripts/run-e2e-ci.mjs");
    const detoxRunner = readRequiredText("scripts/run-detox-android.mjs");

    expect(packageJson.scripts?.["test:e2e"]).toContain(
      "node scripts/run-e2e-ci.mjs android.emu.debug",
    );
    expect(packageJson.scripts?.["test:e2e:android"]).toContain(
      "node scripts/check-detox-env.mjs android.emu.debug",
    );
    expect(packageJson.scripts?.["test:e2e:android"]).toContain(
      "node scripts/run-detox-android.mjs android.emu.debug",
    );
    expect(ciRunner).toContain("MOBILE_NATIVE_E2E_REQUIRED");
    expect(ciRunner).toContain("mobile-native-observation.local.json");
    expect(ciRunner).toContain("containsSecretValues: false");
    expect(ciRunner).toContain("runDetoxAndroidTest");
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

  it("keeps Android Firebase google-services configuration on a local ignored file path", () => {
    process.env = {
      ...originalEnv,
      APP_ENV: "development",
      GOOGLE_SERVICES_FILE: "https://example.com/google-services.json",
    };
    const defaultConfig = appConfig({ config: {} });

    expect(defaultConfig.android.googleServicesFile).toBe(
      "./secrets/firebase/google-services.json",
    );
    expect(readRequiredText(".gitignore")).toContain("**/google-services.json");

    process.env = {
      ...originalEnv,
      APP_ENV: "development",
      GOOGLE_SERVICES_FILE: "./secrets/firebase/google-services.staging.json",
    };
    const overriddenConfig = appConfig({ config: {} });

    expect(overriddenConfig.android.googleServicesFile).toBe(
      "./secrets/firebase/google-services.staging.json",
    );
  });

  it("fails production app config when the EAS project id is missing or still the placeholder", () => {
    process.env = {
      ...originalEnv,
      APP_ENV: "production",
      EAS_PROJECT_ID: "",
      EXPO_PUBLIC_API_BASE_URL: productionApiBaseUrl,
    };
    expect(() => appConfig({ config: {} })).toThrow(/EAS_PROJECT_ID/u);

    process.env = {
      ...originalEnv,
      APP_ENV: "production",
      EAS_PROJECT_ID: placeholderEasProjectId,
      EXPO_PUBLIC_API_BASE_URL: productionApiBaseUrl,
    };
    expect(() => appConfig({ config: {} })).toThrow(/EAS_PROJECT_ID/u);

    process.env = {
      ...originalEnv,
      APP_ENV: "production",
      EAS_PROJECT_ID: validEasProjectId,
      EXPO_PUBLIC_API_BASE_URL: productionApiBaseUrl,
    };
    expect(appConfig({ config: {} }).extra.eas).toEqual({
      projectId: validEasProjectId,
    });
  });
});
