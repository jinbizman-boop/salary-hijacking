/** apps/admin/next.config.js
 * 급여납치 관리자 콘솔 Next.js configuration final.
 * ESM config because the project uses module-style JavaScript placeholders.
 */

const CONFIG_VERSION = "3.1.3";
const DEFAULT_ADMIN_BASE_PATH = "/admin";
const DEFAULT_ADMIN_API_BASE_PATH = "/admin/api/v1";
const DEFAULT_AUTH_BASE_PATH = "/admin/auth";
const ONE_YEAR_SECONDS = 31_536_000;
const adminPagePaths = Object.freeze([
  "/",
  "/login",
  "/dashboard",
  "/users",
  "/posts",
  "/reports",
  "/notices",
  "/banners",
  "/metrics",
  "/events",
]);

const safePublicEnvKeys = Object.freeze([
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_VERSION",
  "NEXT_PUBLIC_ADMIN_BASE_PATH",
  "NEXT_PUBLIC_ADMIN_API_BASE_PATH",
  "NEXT_PUBLIC_ADMIN_AUTH_BASE_PATH",
  "NEXT_PUBLIC_ASSET_BASE_URL",
]);

const sensitiveEnvPattern =
  /(SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE|JWT|KEY|COOKIE|SESSION|FCM|SERVICE_ACCOUNT|NEON|SENTRY_AUTH|SLACK_WEBHOOK)/i;

const securityHeaders = Object.freeze([
  ["X-DNS-Prefetch-Control", "off"],
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "no-referrer"],
  ["X-Permitted-Cross-Domain-Policies", "none"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-origin"],
  [
    "Permissions-Policy",
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(self), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()",
  ],
  [
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  ],
]);

const adminNoStoreHeaders = Object.freeze([
  ["Cache-Control", "no-store, no-cache, max-age=0, must-revalidate, private"],
  ["Pragma", "no-cache"],
  ["Expires", "0"],
  ["X-Salary-Hijacking-Admin-Boundary", "rbac-mfa-audit"],
  ["X-Salary-Hijacking-Server-Authority", "true"],
  ["X-Salary-Hijacking-Raw-Financial-Data", "forbidden"],
  ["X-Salary-Hijacking-Raw-Push-Token", "forbidden"],
  ["X-Salary-Hijacking-Ads-Financial-Targeting", "forbidden"],
]);

const immutableAssetHeaders = Object.freeze([
  ["Cache-Control", `public, max-age=${ONE_YEAR_SECONDS}, immutable`],
]);

function toHeaderPairs(entries) {
  return entries.map(([key, value]) => ({ key, value }));
}

function cleanBasePath(value, fallback) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  return trimmed.replace(/\/$/, "") || fallback;
}

function cleanOrigin(value) {
  if (typeof value !== "string" || value.trim().length === 0) return "";
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    )
      return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function publicEnv() {
  return Object.fromEntries(
    safePublicEnvKeys.map((key) => {
      if (sensitiveEnvPattern.test(key))
        throw new Error(`Unsafe public env key blocked: ${key}`);
      if (key === "NEXT_PUBLIC_APP_VERSION")
        return [key, process.env[key] || CONFIG_VERSION];
      if (key === "NEXT_PUBLIC_ADMIN_BASE_PATH") {
        return [key, cleanBasePath(process.env[key], DEFAULT_ADMIN_BASE_PATH)];
      }
      if (key === "NEXT_PUBLIC_ADMIN_API_BASE_PATH")
        return [
          key,
          cleanBasePath(process.env[key], DEFAULT_ADMIN_API_BASE_PATH),
        ];
      if (key === "NEXT_PUBLIC_ADMIN_AUTH_BASE_PATH")
        return [key, cleanBasePath(process.env[key], DEFAULT_AUTH_BASE_PATH)];
      return [key, process.env[key] || ""];
    }),
  );
}

function rewriteRules() {
  const adminApiOrigin = cleanOrigin(process.env.ADMIN_API_ORIGIN);
  const authOrigin = cleanOrigin(
    process.env.ADMIN_AUTH_ORIGIN || process.env.ADMIN_API_ORIGIN,
  );
  const rules = [];

  if (adminApiOrigin) {
    rules.push({
      source: "/api/:path*",
      destination: `${adminApiOrigin}/admin/api/:path*`,
    });
  }

  if (authOrigin) {
    rules.push({
      source: "/auth/:path*",
      destination: `${authOrigin}/admin/auth/:path*`,
    });
  }

  return rules;
}

function redirectRules() {
  return [
    {
      source: "/",
      destination: "/admin",
      permanent: false,
      basePath: false,
    },
    {
      source: "/dashboard",
      destination: "/admin/dashboard",
      permanent: false,
      basePath: false,
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: cleanBasePath(
    process.env.NEXT_PUBLIC_ADMIN_BASE_PATH,
    DEFAULT_ADMIN_BASE_PATH,
  ),
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,
  productionBrowserSourceMaps: false,
  cleanDistDir: true,

  env: publicEnv(),

  transpilePackages: [],

  images: {
    unoptimized: true,
    dangerouslyAllowSVG: false,
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "./tsconfig.json",
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  experimental: {
    optimizePackageImports: [],
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
      bodySizeLimit: "1mb",
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: toHeaderPairs(securityHeaders),
      },
      ...adminPagePaths.map((source) => ({
        source,
        headers: toHeaderPairs(adminNoStoreHeaders),
      })),
      {
        source: "/api/:path*",
        headers: toHeaderPairs(adminNoStoreHeaders),
      },
      {
        source: "/auth/:path*",
        headers: toHeaderPairs(adminNoStoreHeaders),
      },
      {
        source: "/_next/static/:path*",
        headers: toHeaderPairs(immutableAssetHeaders),
      },
    ];
  },

  async redirects() {
    return redirectRules();
  },

  async rewrites() {
    return rewriteRules();
  },
};

export function assertAdminNextConfigCompleteness() {
  const checks = [
    "esm_next_config",
    "react_strict_mode",
    "powered_by_header_disabled",
    "strict_typescript_build_errors",
    "strict_eslint_build_errors",
    "admin_no_store_headers",
    "security_headers",
    "csp_frame_ancestors_none",
    "admin_rbac_mfa_audit_boundary_header",
    "server_authority_marker",
    "raw_financial_data_forbidden",
    "raw_push_token_forbidden",
    "ads_financial_targeting_forbidden",
    "safe_public_env_allowlist",
    "secret_env_public_exposure_guard",
    "admin_base_path",
    "admin_api_rewrite_ready",
    "admin_auth_rewrite_ready",
    "static_asset_cache_immutable",
    "root_to_admin_redirect",
    "dashboard_redirect",
    "image_svg_blocked",
    "production_console_reduction",
    "no_source_maps_in_production_browser",
    "version_marker",
  ];

  return {
    ok: checks.length >= 20,
    version: CONFIG_VERSION,
    checks,
  };
}

export default nextConfig;
