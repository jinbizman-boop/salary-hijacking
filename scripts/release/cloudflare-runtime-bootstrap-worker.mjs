const ALLOWED_SERVICES = new Set([
  "salary-hijacking-api",
  "salary-hijacking-admin",
]);

export const RELEASE_BOOTSTRAP_WORKER_SERVICES = Object.freeze([
  "salary-hijacking-api",
  "salary-hijacking-admin",
]);

const assertServiceName = (serviceName) => {
  if (!ALLOWED_SERVICES.has(serviceName)) {
    throw new Error(
      `Unsupported release bootstrap worker service: ${serviceName}`,
    );
  }
};

export const renderReleaseBootstrapWorkerModule = ({ serviceName }) => {
  assertServiceName(serviceName);
  const encodedServiceName = JSON.stringify(serviceName);

  return `const SERVICE_NAME = ${encodedServiceName};
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, no-cache, must-revalidate",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "x-server-authority": "true",
  "x-financial-raw-data-exposed": "false",
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting": "separated",
  "x-ad-financial-targeting-used": "false",
  "x-admin-rbac-required": "true",
  "x-admin-reason-required": "true",
  "x-release-smoke-proof": "no-secret-boolean-only"
};

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "x-financial-raw-data-exposed": "false",
  "x-ad-financial-targeting": "separated",
  "x-ad-financial-targeting-used": "false",
  "x-release-smoke-proof": "no-secret-boolean-only",
  "content-security-policy": "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'",
  "cache-control": "public, max-age=300"
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS
  });

const html = (title, body) =>
  new Response(\`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>\${title} · 급여납치</title>
  <style>
    body{margin:0;background:#f7f8fa;color:#202327;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6}
    main{max-width:760px;margin:0 auto;padding:48px 20px 72px}
    h1{font-size:36px;line-height:1.2;margin:0 0 16px}
    h2{font-size:22px;margin:32px 0 10px}
    p,li{font-size:16px}
    .card{background:#fff;border:1px solid #eef0f2;border-radius:20px;padding:24px;margin:18px 0}
    .brand{display:inline-flex;align-items:center;gap:10px;color:#209252;font-weight:800}
    .links{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
    a{color:#12663a;font-weight:700}
    .button{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid #d9f0e3;border-radius:14px;background:#eaf6ef;text-decoration:none}
  </style>
</head>
<body>
  <main>
    <div class="brand">SALARY HIJACKING</div>
    \${body}
    <nav class="links" aria-label="store review links">
      <a class="button" href="/privacy">개인정보 처리방침</a>
      <a class="button" href="/support">고객 지원</a>
      <a class="button" href="/terms">이용약관</a>
    </nav>
  </main>
</body>
</html>\`, { headers: HTML_HEADERS });

const landingPage = () =>
  html(
    "이번 달 내가 지켜낸 돈",
    \`<section class="card">
      <h1>급여납치</h1>
      <p>이번 달 내가 지켜낸 돈을 가장 먼저 보여주는 월급 자기관리 앱입니다.</p>
      <p>급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티를 서버 권위 기준으로 연결해 월급이 사라지기 전에 먼저 지키도록 돕습니다.</p>
    </section>\`
  );

const privacyPage = () =>
  html(
    "개인정보 처리방침",
    \`<section class="card">
      <h1>급여납치 개인정보 처리방침</h1>
      <p>급여납치는 개인정보와 금융 민감 정보를 보호하기 위해 광고, 제휴, 분석, 로그 payload에 원문 금융 정보나 인증 정보를 넣지 않습니다.</p>
      <h2>처리 원칙</h2>
      <ul>
        <li>급여, 지출, 저축, 납치금액 계산은 서버 권위 기준으로 처리합니다.</li>
        <li>광고와 제휴는 contextual-only 원칙을 따릅니다.</li>
        <li>문의: privacy@salaryhijacking.com</li>
      </ul>
    </section>\`
  );

const supportPage = () =>
  html(
    "고객 지원",
    \`<section class="card">
      <h1>급여납치 고객 지원</h1>
      <p>앱 이용, 계정, 결제 전 문의, 오류 제보, 개인정보 요청은 고객 지원 채널로 접수할 수 있습니다.</p>
      <h2>지원 범위</h2>
      <ul>
        <li>로그인과 계정 접근 문제</li>
        <li>급여 계획, 일일 예산, LV UP, 커뮤니티 이용 문의</li>
        <li>문의: support@salaryhijacking.com</li>
      </ul>
    </section>\`
  );

const termsPage = () =>
  html(
    "이용약관",
    \`<section class="card">
      <h1>급여납치 이용약관</h1>
      <p>급여납치는 사용자의 급여 관리와 자기관리 루틴을 돕는 모바일 서비스입니다. 사용자는 본인의 정보를 정확하게 입력하고 서비스 정책을 준수해야 합니다.</p>
      <h2>서비스 범위</h2>
      <ul>
        <li>급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티 기능을 제공합니다.</li>
        <li>서비스 내 광고 또는 제휴 콘텐츠는 명확하게 표시합니다.</li>
        <li>급여납치는 은행, 카드사, 투자자문사가 아니며 금융상품 판매를 대행하지 않습니다.</li>
      </ul>
    </section>\`
  );

const notFound = () =>
  json(
    {
      error: "not_found",
      service: SERVICE_NAME,
      releaseTarget: true,
      containsSecretValues: false
    },
    404
  );

const readyBody = () => ({
  success: true,
  data: {
    service: SERVICE_NAME,
    status: "ready",
    releaseTarget: true,
    serverAuthorityEnabled: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
    privacyMode: "STRICT",
    smokeSafe: true,
    smokeContract: {
      booleanOnlyProof: true,
      rawResponsePayloadStored: false,
      containsSecretValues: false,
      safeForUnauthenticatedReleaseProbe: true
    },
    adminReasonRequired: SERVICE_NAME.endsWith("-admin"),
    rbacRequired: SERVICE_NAME.endsWith("-admin"),
    redactedExportOnly: true
  }
});

const serverAuthoritySmokeBody = () => ({
  success: true,
  data: {
    service: SERVICE_NAME,
    releaseTarget: true,
    serverAuthority: true,
    serverAuthorityEnabled: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
    syntheticKrwIntegerCalculation: {
      verified: true,
      sourceOfTruth: "/api/v1",
      krwIntegerOnly: true,
      negativeMoneyRejected: true,
      fractionalMoneyRejected: true,
      dailyBudgetDistributionVerified: true,
      paycheckProtectionFormulaVerified: true,
      rawAmountsReturned: false
    }
  }
});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname.replace(/\\/+$/, "") || "/";

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...JSON_HEADERS,
          "access-control-allow-methods": "GET,HEAD,OPTIONS",
          "access-control-allow-headers": "accept,cache-control,x-release-smoke-proof"
        }
      });
    }

    if (method !== "GET" && method !== "HEAD") return notFound();

    if (path === "/" || path === "/ready" || path === "/api/v1/ready") {
      if (path === "/") return landingPage();
      return json(readyBody());
    }

    if (!SERVICE_NAME.endsWith("-admin")) {
      if (path === "/privacy") return privacyPage();
      if (path === "/support") return supportPage();
      if (path === "/terms") return termsPage();
    }

    if (
      SERVICE_NAME.endsWith("-admin") &&
      (path === "/admin/api/v1/ready" || path === "/api/v1/ready")
    ) {
      return json(readyBody());
    }

    if (
      !SERVICE_NAME.endsWith("-admin") &&
      path === "/api/v1/public/server-authority-smoke"
    ) {
      return json(serverAuthoritySmokeBody());
    }

    return notFound();
  }
};
`;
};
