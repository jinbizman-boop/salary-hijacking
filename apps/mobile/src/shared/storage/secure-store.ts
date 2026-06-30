export type SecureStoreOptions = Readonly<{
  keychainAccessible?: string;
}>;

export type NativeSecureStore = Readonly<{
  WHEN_UNLOCKED_THIS_DEVICE_ONLY?: string;
  getItemAsync?: (
    key: string,
    options?: SecureStoreOptions,
  ) => Promise<string | null>;
  setItemAsync?: (
    key: string,
    value: string,
    options?: SecureStoreOptions,
  ) => Promise<void>;
  deleteItemAsync?: (
    key: string,
    options?: SecureStoreOptions,
  ) => Promise<void>;
}>;

export type SecureStoreRuntime = Readonly<{
  WHEN_UNLOCKED_THIS_DEVICE_ONLY?: string;
  getItemAsync: (
    key: string,
    options?: SecureStoreOptions,
  ) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: SecureStoreOptions,
  ) => Promise<void>;
  deleteItemAsync: (key: string, options?: SecureStoreOptions) => Promise<void>;
}>;

const MEMORY_STORE_GLOBAL_KEY = "__salaryHijackingSecureStoreMemory";

type SecureStoreGlobal = typeof globalThis & {
  [MEMORY_STORE_GLOBAL_KEY]?: Map<string, string>;
};

function webMemoryStore(): Map<string, string> {
  const target = globalThis as SecureStoreGlobal;
  const existing = target[MEMORY_STORE_GLOBAL_KEY];
  if (existing) return existing;
  const next = new Map<string, string>();
  target[MEMORY_STORE_GLOBAL_KEY] = next;
  return next;
}

export function createSecureStoreRuntime(
  platform: string,
  nativeStore: NativeSecureStore,
): SecureStoreRuntime {
  const useNativeStore =
    (platform === "ios" || platform === "android") &&
    typeof nativeStore.getItemAsync === "function" &&
    typeof nativeStore.setItemAsync === "function" &&
    typeof nativeStore.deleteItemAsync === "function";

  if (!useNativeStore) {
    return {
      getItemAsync: async (key: string): Promise<string | null> =>
        webMemoryStore().get(key) ?? null,
      setItemAsync: async (key: string, value: string): Promise<void> => {
        webMemoryStore().set(key, value);
      },
      deleteItemAsync: async (key: string): Promise<void> => {
        webMemoryStore().delete(key);
      },
    };
  }

  const runtime: SecureStoreRuntime = {
    getItemAsync: async (
      key: string,
      options?: SecureStoreOptions,
    ): Promise<string | null> =>
      nativeStore.getItemAsync?.(key, options) ?? null,
    setItemAsync: async (
      key: string,
      value: string,
      options?: SecureStoreOptions,
    ): Promise<void> => {
      await nativeStore.setItemAsync?.(key, value, options);
    },
    deleteItemAsync: async (
      key: string,
      options?: SecureStoreOptions,
    ): Promise<void> => {
      await nativeStore.deleteItemAsync?.(key, options);
    },
  };

  return typeof nativeStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY === "string"
    ? {
        ...runtime,
        WHEN_UNLOCKED_THIS_DEVICE_ONLY:
          nativeStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    : runtime;
}
