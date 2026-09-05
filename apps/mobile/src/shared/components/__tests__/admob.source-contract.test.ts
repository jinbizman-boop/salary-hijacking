import { readFileSync } from "node:fs";
import { join } from "node:path";

const mobileRoot = join(__dirname, "..", "..", "..", "..");

function mobileSource(path: string): string {
  return readFileSync(join(mobileRoot, path), "utf8");
}

describe("AdMob production source contract", () => {
  it("uses the Google Mobile Ads native SDK instead of placeholder-only ad slots", () => {
    const packageJson = JSON.parse(mobileSource("package.json")) as {
      dependencies?: Record<string, string>;
    };
    const adSource = mobileSource("src/shared/components/AdBannerSlot.tsx");

    expect(packageJson.dependencies).toHaveProperty(
      "react-native-google-mobile-ads",
    );
    expect(adSource).toContain("react-native-google-mobile-ads");
    expect(adSource).toContain("BannerAd");
    expect(adSource).toContain("BannerAdSize");
    expect(adSource).toContain("TestIds.BANNER");
  });

  it("pins the four launch ad placements and keeps focus activity screens ad-free", () => {
    const adSource = mobileSource("src/shared/components/AdBannerSlot.tsx");
    const levelSource = mobileSource("app/(tabs)/level/index.tsx");
    const salarySource = mobileSource(
      "src/features/salary/components/SalaryHomeScreen.tsx",
    );

    expect(adSource).toContain("AD-APP-SALARY-01");
    expect(levelSource).toContain("AD-APP-LVUP-01");
    expect(levelSource).toContain("AD-APP-LVUP-02");
    expect(adSource).toContain("AD-APP-MY-01");
    expect(salarySource).toContain("AD-APP-SALARY-01");

    for (const focusRoute of [
      "app/level/reading.tsx",
      "app/level/news.tsx",
      "app/level/english.tsx",
      "app/level/health.tsx",
    ]) {
      expect(mobileSource(focusRoute)).not.toContain("AdBannerSlot");
    }
  });

  it("configures QA/staging test ads and blocks financial targeting data", () => {
    const appConfig = mobileSource("app.config.ts");
    const adSource = mobileSource("src/shared/components/AdBannerSlot.tsx");

    expect(appConfig).toContain("react-native-google-mobile-ads");
    expect(appConfig).toContain("ca-app-pub-3940256099942544~3347511713");
    expect(adSource).toContain("financialTargetingAllowed: false");
    expect(adSource).toContain("rawFinancialContextShared: false");
    expect(adSource).toContain("NO_FILL");
    expect(adSource).toContain("ERROR");
  });
});
