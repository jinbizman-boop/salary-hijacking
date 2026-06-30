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
});
