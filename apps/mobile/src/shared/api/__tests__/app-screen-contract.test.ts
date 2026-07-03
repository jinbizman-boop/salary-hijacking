import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const APP_ROOT = join(process.cwd(), "app");
const FORBIDDEN_API_HELPERS = [
  "DEFAULT_API_BASE",
  "cleanApiBase(",
  "readPublicEnv(",
] as const;
const INTERNAL_TABS_ROUTE = /(["'`])\/\(tabs\)(?:\/[^"'`]*)?\1/g;
const PROFILE_SCREEN = join(APP_ROOT, "(tabs)", "profile", "index.tsx");
const ROOT_LAYOUT_SCREEN = join(APP_ROOT, "_layout.tsx");

function collectAppSourceFiles(directory: string): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...collectAppSourceFiles(path));
      continue;
    }
    if (/\.(?:ts|tsx)$/.test(entry)) files.push(path);
  }

  return files;
}

describe("mobile app screen API and route contracts", () => {
  it("keeps app screens on the shared API base helper", () => {
    const violations = collectAppSourceFiles(APP_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return FORBIDDEN_API_HELPERS.filter((marker) =>
        source.includes(marker),
      ).map((marker) => `${relative(process.cwd(), path)} uses ${marker}`);
    });

    expect(violations).toEqual([]);
  });

  it("does not navigate to expo-router group-only /(tabs) URLs", () => {
    const violations = collectAppSourceFiles(APP_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return Array.from(source.matchAll(INTERNAL_TABS_ROUTE)).map(
        (match) => `${relative(process.cwd(), path)} contains ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it("keeps the profile withdrawal menu on the request-only API endpoint", () => {
    const source = readFileSync(PROFILE_SCREEN, "utf8");

    expect(source).toContain("/api/v1/users/me/withdrawal-request");
    expect(source).not.toContain('route: "/api/v1/users/me/withdraw"');
  });

  it("refreshes the root bootstrap access token before falling back from a 401", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("/api/v1/mobile/bootstrap");
    expect(source).toContain("/api/v1/auth/refresh");
    expect(source).toContain("requestJsonWithAuthRefresh");
    expect(source).toContain("MOBILE_ACCESS_TOKEN_KEY");
    expect(source).toContain("x-raw-financial-data-exposed");
    expect(source).toContain("x-ad-financial-targeting-used");
  });

  it("routes an authenticated root launch into the salary home", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain('routeKey === "root"');
    expect(source).toContain("shouldRouteReadyStateToHome");
    expect(source).toContain("router.replace(SALARY_HOME_ROUTE as never)");
  });

  it("keeps reset-password available as a public auth recovery route", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain('"reset-password"');
    expect(source).toContain('routeKey === "(auth)/reset-password"');
  });
});
