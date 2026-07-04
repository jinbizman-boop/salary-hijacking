type Resolution = Readonly<{
  type: "sourceFile";
  filePath: string;
}>;

type ResolverContext = Readonly<{
  resolveRequest: (
    context: ResolverContext,
    moduleName: string,
    platform: string | null,
  ) => Resolution;
}>;

type MetroConfig = Readonly<{
  resolver: Readonly<{
    resolveRequest: (
      context: ResolverContext,
      moduleName: string,
      platform: string | null,
    ) => Resolution;
  }>;
  __private?: Readonly<{
    mapToWorkspaceAliasRoot: (
      filePath: string,
      workspaceRoot: string,
      realWorkspaceRoot: string,
      platform: string,
    ) => string;
  }>;
}>;

const metroConfig = jest.requireActual<MetroConfig>(
  "../../../metro.config.cjs",
);

describe("mobile Metro dependency resolution", () => {
  it.each(["react", "react/jsx-runtime", "react-dom/client"])(
    "pins %s to the mobile workspace dependency",
    (moduleName) => {
      const fallbackResolver = jest.fn(
        (
          _context: ResolverContext,
          resolvedModuleName: string,
          _platform: string | null,
        ): Resolution => ({
          type: "sourceFile",
          filePath: resolvedModuleName,
        }),
      );
      const context: ResolverContext = {
        resolveRequest: fallbackResolver,
      };

      const result = metroConfig.resolver.resolveRequest(
        context,
        moduleName,
        "web",
      );
      const expectedEntry = require.resolve(moduleName);

      expect(result.filePath).toBe(expectedEntry);
      expect(fallbackResolver).toHaveBeenCalledWith(
        context,
        expectedEntry,
        "web",
      );
    },
  );

  it("delegates unrelated packages without rewriting the request", () => {
    const fallbackResolver = jest.fn(
      (
        _context: ResolverContext,
        resolvedModuleName: string,
        _platform: string | null,
      ): Resolution => ({
        type: "sourceFile",
        filePath: resolvedModuleName,
      }),
    );
    const context: ResolverContext = {
      resolveRequest: fallbackResolver,
    };

    const result = metroConfig.resolver.resolveRequest(
      context,
      "expo-router",
      "web",
    );

    expect(result.filePath).toBe("expo-router");
    expect(fallbackResolver).toHaveBeenCalledWith(
      context,
      "expo-router",
      "web",
    );
  });

  it("pins expo-router entry to a concrete module path for Android bundle builds", () => {
    const fallbackResolver = jest.fn(
      (
        _context: ResolverContext,
        resolvedModuleName: string,
        _platform: string | null,
      ): Resolution => ({
        type: "sourceFile",
        filePath: resolvedModuleName,
      }),
    );
    const context: ResolverContext = {
      resolveRequest: fallbackResolver,
    };

    const result = metroConfig.resolver.resolveRequest(
      context,
      "expo-router/entry",
      "android",
    );
    const expectedEntry = require.resolve("expo-router/entry");

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).toHaveBeenCalledWith(
      context,
      expectedEntry,
      "android",
    );
  });

  it("pins Expo Router runtime dependencies to concrete module paths", () => {
    const fallbackResolver = jest.fn(
      (
        _context: ResolverContext,
        resolvedModuleName: string,
        _platform: string | null,
      ): Resolution => ({
        type: "sourceFile",
        filePath: resolvedModuleName,
      }),
    );
    const context: ResolverContext = {
      resolveRequest: fallbackResolver,
    };

    const result = metroConfig.resolver.resolveRequest(
      context,
      "@expo/metro-runtime",
      "android",
    );
    const expectedEntry = require.resolve("@expo/metro-runtime");

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).toHaveBeenCalledWith(
      context,
      expectedEntry,
      "android",
    );
  });

  it("can map resolved pnpm junction targets back to a Windows subst workspace root", () => {
    const helper = metroConfig.__private?.mapToWorkspaceAliasRoot;

    expect(helper).toBeDefined();
    expect(
      helper?.(
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\expo-router\\entry.js",
        "S:\\",
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
        "win32",
      ),
    ).toBe("S:\\node_modules\\.pnpm\\expo-router\\entry.js");
  });
});
