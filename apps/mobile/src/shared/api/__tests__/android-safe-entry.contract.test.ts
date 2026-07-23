import { readFileSync } from "node:fs";
import { join } from "node:path";

const mobileRoot = join(__dirname, "..", "..", "..", "..");
const indexAndroid = readFileSync(join(mobileRoot, "index.android.js"), "utf8");
const safeEntry = readFileSync(
  join(mobileRoot, "src/android-safe-entry.tsx"),
  "utf8",
);

describe("Android standalone safe entry", () => {
  it("uses the crash-safe native entry for Android APK boot", () => {
    expect(indexAndroid).toContain("./src/android-safe-entry");
    expect(safeEntry).toContain('AppRegistry.registerComponent("main"');
    expect(safeEntry).toContain("RootBoundary");
  });

  it("keeps startup free from router and high-risk native feature imports", () => {
    expect(safeEntry).not.toContain("expo-router");
    expect(safeEntry).not.toContain("expo-secure-store");
    expect(safeEntry).not.toContain("./features/salary");
    expect(safeEntry).not.toContain("./features/plan");
    expect(safeEntry).not.toContain("./features/community");
  });
});
