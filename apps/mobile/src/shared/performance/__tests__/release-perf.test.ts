import { markReleaseInteractionPerf, markReleasePerf } from "../release-perf";

describe("release-safe performance markers", () => {
  const originalConsole = globalThis.console;

  afterEach(() => {
    globalThis.console = originalConsole;
  });

  it("emits timestamped markers without unsafe field values", () => {
    const info = jest.fn();
    globalThis.console = { ...originalConsole, info };

    markReleasePerf("route.home.shell_interactive", {
      route: "salary",
      email: "person@example.test",
      token: "secret-token-value",
    });

    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("[SH_RELEASE_PERF]");
    expect(line).toContain("marker=route.home.shell_interactive");
    expect(line).toContain("route=salary");
    expect(line).not.toContain("person@example.test");
    expect(line).not.toContain("secret-token-value");
  });

  it("emits startup markers with monotonic timestamps and safe route categories", () => {
    const info = jest.fn();
    globalThis.console = { ...originalConsole, info };
    const originalPerformance = globalThis.performance;
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: { now: () => 42.4 },
    });

    markReleasePerf("startup.p8.readiness_decision_complete", {
      route: "bootstrap",
      token: "raw-token",
      user: "raw-user",
    });

    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: originalPerformance,
    });
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]?.[0] ?? "");
    expect(line).toContain(
      "marker=startup.p8.readiness_decision_complete",
    );
    expect(line).toContain("mono_ms=42");
    expect(line).toContain("route=bootstrap");
    expect(line).not.toContain("raw-token");
    expect(line).not.toContain("raw-user");
  });

  it("emits interaction feedback latency from native event timing", () => {
    const info = jest.fn();
    globalThis.console = { ...originalConsole, info };
    const originalPerformance = globalThis.performance;
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: { now: () => 150 },
    });

    markReleaseInteractionPerf("interaction.login.submit.press", {
      nativeEvent: { timestamp: 87 },
    });

    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: originalPerformance,
    });
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("marker=interaction.login.submit.press");
    expect(line).toContain("feedback_ms=63");
  });
});
