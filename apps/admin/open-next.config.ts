const dummyCache = "dummy";

export default {
  buildCommand: "corepack pnpm run build",
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: dummyCache,
      tagCache: dummyCache,
      queue: dummyCache,
    },
    routePreloadingBehavior: "none",
  },
  edgeExternals: ["node:crypto"],
  cloudflare: {
    useWorkerdCondition: true,
  },
  dangerous: {
    enableCacheInterception: false,
  },
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: dummyCache,
      tagCache: dummyCache,
      queue: dummyCache,
    },
  },
};
