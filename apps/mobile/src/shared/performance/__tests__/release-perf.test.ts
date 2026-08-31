import { markReleasePerf } from "../release-perf";

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
});
