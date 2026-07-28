import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const mobileRoot = join(__dirname, "..", "..", "..", "..");
const indexAndroid = readFileSync(join(mobileRoot, "index.android.js"), "utf8");
const safeEntryPath = join(mobileRoot, "src/android-safe-entry.tsx");

describe("Android standalone production entry", () => {
  it("uses Expo Router for Android APK boot instead of the safe-entry shell", () => {
    expect(indexAndroid).toContain("expo-router/entry");
    expect(indexAndroid).toContain("react-native-gesture-handler");
    expect(indexAndroid).not.toContain("./src/android-safe-entry");
    expect(indexAndroid).not.toContain("./src/android-direct-entry");
  });

  it("does not keep the deprecated diagnostic safe-entry source in the mobile runtime tree", () => {
    expect(existsSync(safeEntryPath)).toBe(false);
  });
});
