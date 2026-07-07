import * as nodePath from "node:path";

type Resolution = Readonly<{
  type: "sourceFile";
  filePath: string;
}>;

type ResolverContext = Readonly<{
  originModulePath?: string;
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
    patchMetroDefaultsModuleSystem?: (options: {
      aliasWorkspaceRoot: string;
      canonicalWorkspaceRoot: string;
      moduleDefaults: { moduleSystem?: string };
      platform: string;
    }) => string | null;
    patchMetroSerializerPolyfills?: (options: {
      aliasWorkspaceRoot: string;
      canonicalWorkspaceRoot: string;
      platform: string;
      serializer: {
        getPolyfills?: (options: { platform: string | null }) => string[];
      };
    }) => ((options: { platform: string | null }) => string[]) | null;
    patchMetroSerializerPreModules?: (options: {
      aliasWorkspaceRoot: string;
      canonicalWorkspaceRoot: string;
      platform: string;
      serializer: {
        getModulesRunBeforeMainModule?: () => string[];
      };
    }) => (() => string[]) | null;
    tryResolveWindowsDriveRootEntry?: (
      moduleName: string,
      originModulePath: string | undefined,
    ) => string | null;
    shouldAppendCanonicalNodeModules?: (
      workspaceRoot: string,
      realWorkspaceRoot: string,
      platform: string,
    ) => boolean;
  }>;
}>;

const metroConfig = jest.requireActual<MetroConfig>(
  "../../../metro.config.cjs",
);
const testWorkspaceRoot = nodePath.resolve(__dirname, "../../../../..");
const testMobileAppEntry = nodePath.resolve(
  __dirname,
  "../../../index.android.js",
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
      const expectedEntry =
        moduleName === "punycode"
          ? require.resolve("punycode/")
          : require.resolve(moduleName);

      expect(result.filePath).toBe(expectedEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
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

    const result = metroConfig.resolver.resolveRequest(context, "zod", "web");

    expect(result.filePath).toBe("zod");
    expect(fallbackResolver).toHaveBeenCalledWith(context, "zod", "web");
  });

  it("keeps delegated fallback source files valid when no Windows subst root is active", () => {
    const fallbackResolver = jest.fn(
      (
        _context: ResolverContext,
        _resolvedModuleName: string,
        _platform: string | null,
      ): Resolution => ({
        type: "sourceFile",
        filePath:
          "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\expo@53.0.27_@babel+core@7._58972726df8949216eb9f197e4fc2390\\node_modules\\expo\\virtual\\streams.js",
      }),
    );
    const context: ResolverContext = {
      resolveRequest: fallbackResolver,
    };

    const result = metroConfig.resolver.resolveRequest(
      context,
      "./virtual/streams.js",
      "android",
    );

    expect(result.filePath).toBe(
      "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\expo@53.0.27_@babel+core@7._58972726df8949216eb9f197e4fc2390\\node_modules\\expo\\virtual\\streams.js",
    );
  });

  it("resolves transitive pnpm dependencies from the requesting package path", () => {
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
    const callBindIssuer = require.resolve("call-bind/callBound");
    const context: ResolverContext = {
      originModulePath: callBindIssuer,
      resolveRequest: fallbackResolver,
    };

    const result = metroConfig.resolver.resolveRequest(
      context,
      "get-intrinsic",
      "android",
    );
    const expectedEntry = require.resolve("get-intrinsic", {
      paths: [nodePath.dirname(callBindIssuer)],
    });

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("does not treat Node builtin resolution strings as workspace files", () => {
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
      originModulePath: require.resolve("call-bind/callBound"),
      resolveRequest: fallbackResolver,
    };

    const result = metroConfig.resolver.resolveRequest(
      context,
      "punycode",
      "android",
    );

    expect(result.filePath).toBe(require.resolve("punycode/"));
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("pins absolute workspace module requests instead of delegating them back into Metro", () => {
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
    const absoluteMetroConfigEntry = require.resolve("expo/metro-config");

    const result = metroConfig.resolver.resolveRequest(
      context,
      absoluteMetroConfigEntry,
      "android",
    );

    expect(result.filePath).toBe(absoluteMetroConfigEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("pins expo-router root imports to a concrete module path for Android bundle builds", () => {
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
      "android",
    );
    const expectedEntry = require.resolve("expo-router");

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
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
    expect(fallbackResolver).not.toHaveBeenCalled();
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
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("pins Babel runtime helper dependencies for Android bundle builds", () => {
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
      "@babel/runtime/helpers/interopRequireDefault",
      "android",
    );
    const expectedEntry =
      require.resolve("@babel/runtime/helpers/interopRequireDefault");

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("pins React Native deep imports for Android bundle builds", () => {
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
      "react-native/Libraries/Core/InitializeCore",
      "android",
    );
    const expectedEntry =
      require.resolve("react-native/Libraries/Core/InitializeCore");

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("pins platform-specific React Native deep imports to the requested platform", () => {
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

    const moduleName = "react-native/Libraries/Network/RCTNetworking";
    const result = metroConfig.resolver.resolveRequest(
      context,
      moduleName,
      "android",
    );

    expect(result.filePath.endsWith("RCTNetworking.android.js")).toBe(true);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it("pins fetch polyfill dependencies for Android bundle builds", () => {
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
      "whatwg-fetch",
      "android",
    );
    const expectedEntry = require.resolve("whatwg-fetch");

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it.each([
    "expo",
    "expo-application",
    "expo-asset",
    "expo-crypto",
    "expo-device",
    "expo-document-picker",
    "expo-font",
    "expo-haptics",
    "expo-linking",
    "expo-localization",
    "expo-notifications",
    "expo-secure-store",
    "expo-splash-screen",
    "expo-status-bar",
    "expo-system-ui",
    "expo-updates",
    "expo-web-browser",
    "expo-constants",
    "expo-file-system",
    "expo-json-utils",
    "expo-keep-awake",
    "expo-manifests",
    "expo-updates-interface",
    "@expo/image-utils",
    "@ide/backoff",
    "assert",
    "badgin",
    "call-bind",
    "ieee754",
    "is-nan",
    "object-is",
    "object.assign",
    "react-native-edge-to-edge",
    "util",
    "whatwg-url-without-unicode",
    "buffer/",
    "punycode",
    "webidl-conversions",
  ])("pins %s runtime dependencies for Android bundle builds", (moduleName) => {
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
      "android",
    );
    const expectedEntry =
      moduleName === "punycode"
        ? require.resolve("punycode/")
        : moduleName === "assert"
          ? require.resolve("assert/")
          : moduleName === "util"
            ? require.resolve("util/")
            : require.resolve(moduleName);

    expect(result.filePath).toBe(expectedEntry);
    expect(fallbackResolver).not.toHaveBeenCalled();
  });

  it.each([
    "@expo/schema-utils",
    "@expo/server",
    "@radix-ui/react-compose-refs",
    "@radix-ui/react-slot",
    "client-only",
    "escape-string-regexp",
    "react-fast-compare",
    "semver",
    "server-only",
    "shallowequal",
  ])(
    "pins %s Expo Router dependency for Android bundle builds",
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
        "android",
      );
      const expectedEntry = require.resolve(moduleName);

      expect(result.filePath).toBe(expectedEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
    },
  );

  it.each([
    "@react-navigation/bottom-tabs",
    "@react-navigation/core",
    "@react-navigation/elements",
    "@react-navigation/native",
    "@react-navigation/native-stack",
    "@react-navigation/routers",
    "react-native-gesture-handler",
    "react-native-reanimated",
    "react-native-safe-area-context",
    "react-native-screens",
  ])(
    "pins %s navigation dependency for Android bundle builds",
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
        "android",
      );
      const expectedEntry = require.resolve(moduleName);

      expect(result.filePath).toBe(expectedEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
    },
  );

  it.each([
    "color",
    "color-convert",
    "color-name",
    "color-string",
    "decode-uri-component",
    "fast-deep-equal",
    "filter-obj",
    "is-arrayish",
    "nanoid/non-secure",
    "query-string",
    "react-is",
    "sf-symbols-typescript",
    "simple-swizzle",
    "split-on-first",
    "standard-navigation",
    "strict-uri-encode",
    "use-sync-external-store",
    "warn-once",
  ])(
    "pins %s React Navigation dependency for Android bundle builds",
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
        "android",
      );
      const expectedEntry = require.resolve(moduleName);

      expect(result.filePath).toBe(expectedEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
    },
  );

  it.each([
    "@react-native/assets-registry/registry",
    "@react-native/js-polyfills",
    "@react-native/normalize-colors",
    "abort-controller",
    "ansi-regex",
    "anser",
    "@react-native/virtualized-lists",
    "base64-js",
    "event-target-shim",
    "flow-enums-runtime",
    "invariant",
    "memoize-one",
    "metro-runtime/modules/asyncRequire",
    "metro-source-map",
    "nullthrows",
    "promise",
    "regenerator-runtime/runtime",
    "react-freeze",
    "react-native-is-edge-to-edge",
    "scheduler",
    "stacktrace-parser",
    "use-latest-callback",
  ])(
    "pins %s React Native runtime bare dependency for Android bundle builds",
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
        "android",
      );
      const expectedEntry = require.resolve(moduleName);

      expect(result.filePath).toBe(expectedEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
    },
  );

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

  it("does not rewrite bare module names while mapping Windows subst paths", () => {
    const helper = metroConfig.__private?.mapToWorkspaceAliasRoot;

    expect(helper).toBeDefined();
    expect(
      helper?.(
        "metro-runtime/src/polyfills/require.js",
        "Y:\\",
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
        "win32",
      ),
    ).toBe("metro-runtime/src/polyfills/require.js");
  });

  it.each(["Y:\\.", "Y:\\/.", nodePath.join(testWorkspaceRoot, ".")])(
    "resolves Expo embed's Android entry request from %s to the mobile app entry",
    (originModulePath) => {
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
        originModulePath,
        resolveRequest: fallbackResolver,
      };

      const result = metroConfig.resolver.resolveRequest(
        context,
        "./index.android.js",
        "android",
      );

      expect(result.filePath).toBe(testMobileAppEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
    },
  );

  it("does not append canonical node_modules when a Windows subst workspace root is active", () => {
    const helper = metroConfig.__private?.shouldAppendCanonicalNodeModules;

    expect(helper).toBeDefined();
    expect(
      helper?.(
        "Y:\\",
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
        "win32",
      ),
    ).toBe(false);
    expect(
      helper?.(
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
        "win32",
      ),
    ).toBe(true);
  });

  it("maps Metro's prepended module system to the Windows subst workspace root", () => {
    const helper = metroConfig.__private?.patchMetroDefaultsModuleSystem;
    const moduleDefaults = {
      moduleSystem:
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\metro-runtime@0.82.5\\node_modules\\metro-runtime\\src\\polyfills\\require.js",
    };

    expect(helper).toBeDefined();
    expect(
      helper?.({
        aliasWorkspaceRoot: "Y:\\",
        canonicalWorkspaceRoot:
          "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
        moduleDefaults,
        platform: "win32",
      }),
    ).toBe(
      "Y:\\node_modules\\.pnpm\\metro-runtime@0.82.5\\node_modules\\metro-runtime\\src\\polyfills\\require.js",
    );
    expect(moduleDefaults.moduleSystem).toBe(
      "Y:\\node_modules\\.pnpm\\metro-runtime@0.82.5\\node_modules\\metro-runtime\\src\\polyfills\\require.js",
    );
  });

  it("maps serializer polyfill files to the Windows subst workspace root", () => {
    const helper = metroConfig.__private?.patchMetroSerializerPolyfills;
    const serializer: {
      getPolyfills: (options: { platform: string | null }) => string[];
    } = {
      getPolyfills: (_options) => [
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\@react-native+js-polyfills@0.79.6\\node_modules\\@react-native\\js-polyfills\\console.js",
        "whatwg-fetch",
      ],
    };

    expect(helper).toBeDefined();
    helper?.({
      aliasWorkspaceRoot: "Y:\\",
      canonicalWorkspaceRoot:
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
      platform: "win32",
      serializer,
    });

    expect(serializer.getPolyfills({ platform: "android" })).toEqual([
      "Y:\\node_modules\\.pnpm\\@react-native+js-polyfills@0.79.6\\node_modules\\@react-native\\js-polyfills\\console.js",
      "whatwg-fetch",
    ]);
  });

  it("maps serializer pre-modules to the Windows subst workspace root", () => {
    const helper = metroConfig.__private?.patchMetroSerializerPreModules;
    const serializer: {
      getModulesRunBeforeMainModule: () => string[];
    } = {
      getModulesRunBeforeMainModule: () => [
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\react-native@0.79.6_@babel+_25298183c8e6628aad67694d9b4d5b80\\node_modules\\react-native\\Libraries\\Core\\InitializeCore.js",
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\expo@53.0.27_@babel+core@7._58972726df8949216eb9f197e4fc2390\\node_modules\\expo\\src\\winter\\index.ts",
      ],
    };

    expect(helper).toBeDefined();
    helper?.({
      aliasWorkspaceRoot: "Y:\\",
      canonicalWorkspaceRoot:
        "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
      platform: "win32",
      serializer,
    });

    expect(serializer.getModulesRunBeforeMainModule()).toEqual([
      "Y:\\node_modules\\.pnpm\\react-native@0.79.6_@babel+_25298183c8e6628aad67694d9b4d5b80\\node_modules\\react-native\\Libraries\\Core\\InitializeCore.js",
      "Y:\\node_modules\\.pnpm\\expo@53.0.27_@babel+core@7._58972726df8949216eb9f197e4fc2390\\node_modules\\expo\\src\\winter\\index.ts",
    ]);
  });

  it("keeps Windows subst Android entry fallback working when loaded on a Linux CI runner", () => {
    const originalPlatform = process.platform;

    jest.resetModules();
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "linux",
    });

    try {
      const linuxLoadedMetroConfig = jest.requireActual<MetroConfig>(
        "../../../metro.config.cjs",
      );
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
        originModulePath: "Y:\\.",
        resolveRequest: fallbackResolver,
      };

      const result = linuxLoadedMetroConfig.resolver.resolveRequest(
        context,
        "./index.android.js",
        "android",
      );

      expect(result.filePath).toBe(testMobileAppEntry);
      expect(fallbackResolver).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, "platform", {
        configurable: true,
        value: originalPlatform,
      });
      jest.resetModules();
    }
  });
});
