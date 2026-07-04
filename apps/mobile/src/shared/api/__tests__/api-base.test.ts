import { resolveMobileApiBaseUrl } from "../api-base";

describe("resolveMobileApiBaseUrl", () => {
  it("prefers an explicit public API URL", () => {
    expect(
      resolveMobileApiBaseUrl({
        explicitUrl: "https://api.salaryhijacking.com/",
        configuredUrl: "http://localhost:8787",
        environment: "production",
        platform: "web",
      }),
    ).toBe("https://api.salaryhijacking.com");
  });

  it("uses the configured development API URL on web", () => {
    expect(
      resolveMobileApiBaseUrl({
        configuredUrl: "http://localhost:8787/",
        environment: "development",
        platform: "web",
      }),
    ).toBe("http://localhost:8787");
  });

  it("maps localhost to the Android emulator host bridge", () => {
    expect(
      resolveMobileApiBaseUrl({
        configuredUrl: "http://localhost:8787",
        environment: "development",
        platform: "android",
      }),
    ).toBe("http://10.0.2.2:8787");
  });

  it("falls back to local API outside production and official API in production", () => {
    expect(
      resolveMobileApiBaseUrl({
        environment: "development",
        platform: "ios",
      }),
    ).toBe("http://localhost:8787");
    expect(
      resolveMobileApiBaseUrl({
        environment: "production",
        platform: "ios",
      }),
    ).toBe("https://api.salaryhijacking.com");
  });

  it("rejects insecure remote HTTP URLs", () => {
    expect(
      resolveMobileApiBaseUrl({
        explicitUrl: "http://api.example.com",
        environment: "development",
        platform: "web",
      }),
    ).toBe("http://localhost:8787");
  });

  it("rejects configured API base URLs that embed credentials", () => {
    expect(
      resolveMobileApiBaseUrl({
        explicitUrl: "https://operator:secret@api.salaryhijacking.com",
        configuredUrl: "https://api.salaryhijacking.com",
        environment: "production",
        platform: "ios",
      }),
    ).toBe("https://api.salaryhijacking.com");

    expect(
      resolveMobileApiBaseUrl({
        configuredUrl: "http://operator:secret@localhost:8787",
        environment: "development",
        platform: "android",
      }),
    ).toBe("http://10.0.2.2:8787");
  });
});
