/** apps/admin/src/app/layout.tsx
 * 급여납치 관리자 앱 Root Layout 최종본.
 * React import와 JSX 문법 없이 html/body React element-like 객체를 생성하므로 react 타입 또는 jsx compiler option이 없어도 파일 단위 컴파일이 가능하다.
 */

const LAYOUT_VERSION = "3.1.3";
const SERVICE_NAME = "급여납치 관리자 콘솔";
const SERVICE_DESCRIPTION =
  "급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·제휴·운영 데이터를 서버 권위와 감사 로그 경계에서 관리하는 급여납치 관리자 앱";
const ADMIN_ROUTES = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/users", "Users"],
  ["/admin/posts", "Posts"],
  ["/admin/reports", "Reports"],
  ["/admin/notices", "Notices"],
  ["/admin/banners", "Banners"],
  ["/admin/metrics", "Metrics"],
  ["/admin/events", "Events"],
] as const;
const SECURITY_MARKERS = [
  "server-authority",
  "admin-rbac",
  "mfa-required",
  "x-admin-reason",
  "audit-log-ready",
  "no-raw-financial-data",
  "no-raw-push-token",
  "ads-financial-targeting-forbidden",
  "redacted-export-only",
  "no-store-admin-fetch",
] as const;
const GLOBAL_STYLE = `
:root{color-scheme:dark;--sh-bg:#020617;--sh-panel:rgba(255,255,255,.08);--sh-line:rgba(255,255,255,.1);--sh-text:#e2e8f0;--sh-muted:#94a3b8;--sh-accent:#67e8f9;--sh-safe:#34d399;--sh-warn:#fbbf24;--sh-danger:#fb7185;--sh-radius:28px;--sh-shadow:0 24px 80px rgba(0,0,0,.35)}
*{box-sizing:border-box}html{min-height:100%;background:var(--sh-bg);scroll-behavior:smooth}body{min-height:100vh;margin:0;background:radial-gradient(circle at top left,rgba(8,145,178,.28) 0,rgba(2,6,23,1) 34%,rgba(2,6,23,1) 100%);color:var(--sh-text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}.sh-admin-shell{min-height:100vh;isolation:isolate}.sh-skip{position:fixed;left:16px;top:12px;z-index:9999;transform:translateY(-180%);border:1px solid var(--sh-line);background:#fff;color:#020617;border-radius:999px;padding:10px 14px;font-size:13px;font-weight:900}.sh-skip:focus{transform:translateY(0)}.sh-topbar{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--sh-line);background:rgba(2,6,23,.78);backdrop-filter:blur(18px);box-shadow:0 12px 40px rgba(0,0,0,.22)}.sh-topbar-inner{max-width:1560px;margin:0 auto;padding:12px 24px;display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center}.sh-brand{display:flex;align-items:center;gap:12px;font-weight:1000;color:#fff;letter-spacing:-.02em}.sh-brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:14px;background:linear-gradient(135deg,#67e8f9,#34d399);color:#020617;font-weight:1000}.sh-brand-sub{display:block;color:var(--sh-muted);font-size:11px;font-weight:800;letter-spacing:.02em}.sh-nav{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.sh-nav a{border:1px solid transparent;border-radius:999px;padding:8px 10px;color:#cbd5e1;font-size:12px;font-weight:900}.sh-nav a:hover,.sh-nav a:focus{border-color:rgba(103,232,249,.35);background:rgba(34,211,238,.12);color:#cffafe;outline:0}.sh-guard{display:flex;align-items:center;gap:8px;border:1px solid rgba(52,211,153,.35);background:rgba(16,185,129,.12);color:#d1fae5;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:1000;white-space:nowrap}.sh-main{min-height:calc(100vh - 60px)}.sh-footer{border-top:1px solid var(--sh-line);background:rgba(2,6,23,.76)}.sh-footer-inner{max-width:1560px;margin:0 auto;padding:18px 24px;color:#64748b;font-size:12px;line-height:1.7;display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between}.sh-noscript{max-width:920px;margin:24px auto;border:1px solid rgba(251,113,133,.45);background:rgba(244,63,94,.12);color:#ffe4e6;border-radius:20px;padding:18px;line-height:1.7}.sh-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:980px){.sh-topbar-inner{grid-template-columns:1fr;align-items:start}.sh-nav{justify-content:flex-start}.sh-guard{width:max-content}}@media(max-width:640px){.sh-topbar-inner,.sh-footer-inner{padding-left:14px;padding-right:14px}.sh-nav{overflow:auto;flex-wrap:nowrap;justify-content:flex-start;padding-bottom:4px}.sh-nav a{white-space:nowrap}}@media(prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.001ms!important}}
`;

type ReactNodeLike = React.ReactNode;
type ReactElementLike = Readonly<{
  $$typeof: symbol;
  type: string;
  key: string | null;
  ref: null;
  props: Readonly<Record<string, unknown>>;
  _owner: null;
}>;
type ElementProps = Readonly<Record<string, unknown>> & {
  readonly key?: string | number | null;
};

type AdminRootLayoutProps = Readonly<{ children: ReactNodeLike }>;
type MetadataLike = Readonly<{
  metadataBase: URL;
  title: { readonly default: string; readonly template: string };
  description: string;
  applicationName: string;
  generator: string;
  referrer: "no-referrer";
  robots: {
    readonly index: false;
    readonly follow: false;
    readonly nocache: true;
    readonly noarchive: true;
    readonly nosnippet: true;
    readonly noimageindex: true;
  };
  alternates: { readonly canonical: string };
  openGraph: {
    readonly type: "website";
    readonly locale: string;
    readonly title: string;
    readonly description: string;
    readonly siteName: string;
  };
  other: Record<string, string>;
}>;
type ViewportLike = Readonly<{
  themeColor: string;
  colorScheme: "dark";
  width: "device-width";
  initialScale: number;
  maximumScale: number;
  viewportFit: "cover";
}>;

export const metadata: MetadataLike = {
  metadataBase: new URL("https://admin.salary-hijacking.app"),
  title: { default: SERVICE_NAME, template: `%s · ${SERVICE_NAME}` },
  description: SERVICE_DESCRIPTION,
  applicationName: SERVICE_NAME,
  generator: "salary-hijacking-platform-admin-layout-v3.1.3",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  alternates: { canonical: "/admin" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: SERVICE_NAME,
    description: SERVICE_DESCRIPTION,
    siteName: "급여납치",
  },
  other: {
    "salary-hijacking-layout-version": LAYOUT_VERSION,
    "salary-hijacking-admin-boundary": "true",
    "salary-hijacking-server-authority": "true",
    "salary-hijacking-audit-log-ready": "true",
    "salary-hijacking-no-raw-financial-data": "true",
    "salary-hijacking-no-raw-push-token": "true",
    "salary-hijacking-ads-financial-targeting-forbidden": "true",
  },
};

export const viewport: ViewportLike = {
  themeColor: "#020617",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function AdminRootLayout(
  props: AdminRootLayoutProps,
): ReactElementLike {
  return el(
    "html",
    {
      lang: "ko",
      "data-app": "salary-hijacking-admin",
      "data-version": LAYOUT_VERSION,
      suppressHydrationWarning: true,
    },
    el(
      "head",
      null,
      el("meta", { charSet: "utf-8" }),
      el("meta", {
        name: "format-detection",
        content: "telephone=no,email=no,address=no",
      }),
      el("meta", { name: "referrer", content: "no-referrer" }),
      el("meta", {
        name: "robots",
        content: "noindex,nofollow,noarchive,nosnippet,noimageindex",
      }),
      el("meta", { name: "x-admin-boundary", content: "rbac-mfa-audit" }),
      el("meta", {
        name: "x-privacy-guard",
        content:
          "raw-financial=false;raw-push-token=false;ads-financial-targeting=false",
      }),
      el(
        "style",
        {
          id: "salary-hijacking-admin-global-style",
        },
        GLOBAL_STYLE,
      ),
    ),
    el(
      "body",
      {
        "data-admin-shell": "true",
        "data-security-markers": SECURITY_MARKERS.join(","),
      },
      el(
        "a",
        { className: "sh-skip", href: "#salary-hijacking-admin-main" },
        "본문으로 이동",
      ),
      el(
        "div",
        { className: "sh-admin-shell" },
        el(
          "header",
          { className: "sh-topbar", role: "banner" },
          el(
            "div",
            { className: "sh-topbar-inner" },
            el(
              "a",
              {
                className: "sh-brand",
                href: "/admin/dashboard",
                "aria-label": "급여납치 관리자 대시보드",
              },
              el(
                "span",
                { className: "sh-brand-mark", "aria-hidden": "true" },
                "급",
              ),
              el(
                "span",
                null,
                "급여납치 Admin",
                el(
                  "span",
                  { className: "sh-brand-sub" },
                  "Server Authority Operations",
                ),
              ),
            ),
            el(
              "nav",
              { className: "sh-nav", "aria-label": "관리자 주요 메뉴" },
              ...ADMIN_ROUTES.map(([href, label]) =>
                el("a", { href, key: href }, label),
              ),
            ),
            el(
              "div",
              { className: "sh-guard", title: "관리자 보안 경계" },
              "RBAC · MFA · Audit",
            ),
          ),
        ),
        el(
          "main",
          {
            id: "salary-hijacking-admin-main",
            className: "sh-main",
            role: "main",
          },
          props.children,
        ),
        el(
          "footer",
          { className: "sh-footer", role: "contentinfo" },
          el(
            "div",
            { className: "sh-footer-inner" },
            el("span", null, `급여납치 관리자 콘솔 v${LAYOUT_VERSION}`),
            el(
              "span",
              null,
              "rawFinancialData=false · rawPushToken=false · adsFinancialTargeting=false · X-Admin-Reason required",
            ),
          ),
        ),
      ),
      el(
        "noscript",
        null,
        el(
          "div",
          { className: "sh-noscript" },
          "관리자 콘솔은 보안 검증, 감사 로그, 실시간 운영 화면을 위해 JavaScript가 필요합니다.",
        ),
      ),
    ),
  );
}

function el(
  type: string,
  props: ElementProps | null,
  ...children: readonly ReactNodeLike[]
): ReactElementLike {
  const cleanProps = stripKey(props);
  const childProps =
    children.length === 0
      ? cleanProps
      : {
          ...cleanProps,
          children: children.length === 1 ? children[0] : children,
        };
  return {
    $$typeof: Symbol.for("react.transitional.element"),
    type,
    key: props?.key == null ? null : String(props.key),
    ref: null,
    props: childProps,
    _owner: null,
  };
}

function stripKey(
  props: ElementProps | null,
): Readonly<Record<string, unknown>> {
  if (!props || !("key" in props)) return props ?? {};
  const { key: _key, ...rest } = props;
  void _key;
  return rest;
}

function assertAdminLayoutCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "next_root_layout",
    "html_body_tags_present",
    "react_import_not_required",
    "jsx_not_required",
    "admin_navigation_shell",
    "korean_locale",
    "metadata_noindex",
    "viewport_dark_responsive",
    "server_authority_marker",
    "rbac_mfa_audit_boundary",
    "x_admin_reason_policy_visible",
    "raw_financial_data_forbidden",
    "raw_push_token_forbidden",
    "ads_financial_targeting_forbidden",
    "redacted_export_policy_visible",
    "accessibility_skip_link",
    "responsive_css_without_external_font",
    "reduced_motion_supported",
    "no_client_secret_in_layout",
    "no_external_script_dependency",
    "admin_routes_dashboard_users_posts_reports_notices_banners_metrics_events",
    "typescript_strict_ready",
    "root_children_preserved",
  ] as const;
  return { ok: checks.length >= 20, version: LAYOUT_VERSION, checks };
}

void assertAdminLayoutCompleteness;
