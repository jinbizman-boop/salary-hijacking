import { afterEach, describe, expect, it } from "vitest";

import nextConfig from "../../next.config.js";

const originalApiOrigin = process.env.ADMIN_API_ORIGIN;
const originalAuthOrigin = process.env.ADMIN_AUTH_ORIGIN;

afterEach(() => {
  restoreEnvironmentVariable("ADMIN_API_ORIGIN", originalApiOrigin);
  restoreEnvironmentVariable("ADMIN_AUTH_ORIGIN", originalAuthOrigin);
});

describe("admin Next.js deployment boundary", () => {
  it("serves the console below the documented /admin base path", () => {
    expect(nextConfig.basePath).toBe("/admin");
  });

  it("redirects public root routes into the admin base path without double prefixing", async () => {
    const redirects = await nextConfig.redirects();

    expect(redirects).toContainEqual({
      basePath: false,
      destination: "/admin",
      permanent: false,
      source: "/",
    });
    expect(redirects).toContainEqual({
      basePath: false,
      destination: "/admin/dashboard",
      permanent: false,
      source: "/dashboard",
    });
  });

  it("proxies API and auth traffic beneath the base path to trusted HTTPS origins", async () => {
    process.env.ADMIN_API_ORIGIN = "https://api.salary-hijacking.example";
    process.env.ADMIN_AUTH_ORIGIN = "https://auth.salary-hijacking.example";

    const rewrites = await nextConfig.rewrites();

    expect(rewrites).toContainEqual({
      destination: "https://api.salary-hijacking.example/admin/api/:path*",
      source: "/api/:path*",
    });
    expect(rewrites).toContainEqual({
      destination: "https://auth.salary-hijacking.example/admin/auth/:path*",
      source: "/auth/:path*",
    });
  });

  it("applies no-store headers to the complete admin application boundary", async () => {
    const headers = await nextConfig.headers();
    const adminRule = headers.find(
      (rule) =>
        rule.source === "/dashboard" &&
        rule.headers.some(
          (header) => header.key === "X-Salary-Hijacking-Admin-Boundary",
        ),
    );

    expect(adminRule).toBeDefined();
  });
});

function restoreEnvironmentVariable(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
