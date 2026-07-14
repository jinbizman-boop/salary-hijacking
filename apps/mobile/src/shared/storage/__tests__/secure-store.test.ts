import { createSecureStoreRuntime } from "../secure-store";

describe("createSecureStoreRuntime", () => {
  it("uses memory on web without invoking the unsupported native module", async () => {
    const nativeStore = {
      getItemAsync: jest.fn(async (): Promise<string | null> => {
        throw new Error("web native store must not be called");
      }),
      setItemAsync: jest.fn(async (): Promise<void> => {
        throw new Error("web native store must not be called");
      }),
      deleteItemAsync: jest.fn(async (): Promise<void> => {
        throw new Error("web native store must not be called");
      }),
    };
    const store = createSecureStoreRuntime("web", nativeStore);
    const key = "test.web.session";

    await store.setItemAsync(key, "safe-session-status");
    await expect(store.getItemAsync(key)).resolves.toBe("safe-session-status");
    await store.deleteItemAsync(key);
    await expect(store.getItemAsync(key)).resolves.toBeNull();

    expect(nativeStore.getItemAsync).not.toHaveBeenCalled();
    expect(nativeStore.setItemAsync).not.toHaveBeenCalled();
    expect(nativeStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("delegates storage to SecureStore on native platforms", async () => {
    const nativeStore = {
      getItemAsync: jest.fn(async (): Promise<string | null> => "native-value"),
      setItemAsync: jest.fn(async (): Promise<void> => undefined),
      deleteItemAsync: jest.fn(async (): Promise<void> => undefined),
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    };
    const store = createSecureStoreRuntime("ios", nativeStore);

    await store.setItemAsync("test.native.session", "native-value", {
      keychainAccessible: 1,
    });
    await expect(store.getItemAsync("test.native.session")).resolves.toBe(
      "native-value",
    );
    await store.deleteItemAsync("test.native.session");

    expect(nativeStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(nativeStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(nativeStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(store.WHEN_UNLOCKED_THIS_DEVICE_ONLY).toBe(1);
  });

  it("falls back to memory when the native module is unavailable", async () => {
    const store = createSecureStoreRuntime("android", {});
    const key = "test.missing-native.session";

    await store.setItemAsync(key, "temporary-value");

    await expect(store.getItemAsync(key)).resolves.toBe("temporary-value");
  });

  it("shares the web fallback store across separately created runtimes", async () => {
    const writer = createSecureStoreRuntime("web", {});
    const reader = createSecureStoreRuntime("web", {});
    const key = "test.shared-web.session";

    await writer.setItemAsync(key, "shared-value");

    await expect(reader.getItemAsync(key)).resolves.toBe("shared-value");
    await reader.deleteItemAsync(key);
  });
});
