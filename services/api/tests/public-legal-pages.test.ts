import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const testContext = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

describe("public legal pages", () => {
  it("serves the public app landing page for the store marketing URL", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request("https://salaryhijacking.com/"),
      {
        APP_ENV: "production",
        APP_PUBLIC_BASE_URL: "https://salaryhijacking.com",
      },
      testContext,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-language")).toBe("ko-KR");
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(body).toContain(
      '<meta name="description" content="급여납치는 월급이 사라지기 전에 예산, 지출, 저축, LV UP을 한 곳에서 관리하는 금융 생활 앱입니다."',
    );
    expect(body).toContain('property="og:title"');
    expect(body).toContain('property="og:description"');
    expect(body).toContain("급여납치");
    expect(body).toContain("이번 달 내가 지켜낸 돈");
    expect(body).toContain("/partners");
    expect(body).toContain("/privacy");
    expect(body).toContain("/support");
    expect(body).not.toMatch(
      /"(salaryAmount|expenseAmount|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it.each([
    ["/privacy", "개인정보 처리방침"],
    ["/support", "고객 지원"],
    ["/terms", "이용약관"],
    ["/contact", "문의"],
  ])("serves %s without a bearer token", async (path, expectedText) => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request(`https://salaryhijacking.com${path}`),
      { APP_ENV: "production" },
      testContext,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-language")).toBe("ko-KR");
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(body).toContain('name="description"');
    expect(body).toContain('property="og:title"');
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body).toContain(expectedText);
    expect(body).toContain("support@salaryhijacking.com");
    expect(body).not.toMatch(
      /"(salaryAmount|expenseAmount|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it("serves the public contextual partner benefits page used by mobile ad slots", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request("https://salaryhijacking.com/partners"),
      {
        APP_ENV: "production",
        APP_PUBLIC_BASE_URL: "https://salaryhijacking.com",
      },
      testContext,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-language")).toBe("ko-KR");
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(body).toContain('name="description"');
    expect(body).toContain('property="og:title"');
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body).toContain("제휴 혜택");
    expect(body).toContain("문맥형 안내");
    expect(body).toContain("금융 금액 기반 타겟팅을 사용하지 않습니다");
    expect(body).toContain("/privacy");
    expect(body).toContain("/support");
    expect(body).not.toMatch(
      /"(salaryAmount|expenseAmount|savingsAmount|hijackAmount|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it("exposes the partner benefits URL through public app config without sensitive targeting data", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request("https://salaryhijacking.com/api/v1/public/app-config"),
      {
        APP_ENV: "production",
        APP_PUBLIC_BASE_URL: "https://salaryhijacking.com",
      },
      testContext,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly links?: Record<string, unknown>;
        readonly privacy?: Record<string, unknown>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data?.links).toMatchObject({
      landingUrl: "https://salaryhijacking.com",
      partnerBenefitsUrl: "https://salaryhijacking.com/partners",
      privacyUrl: "https://salaryhijacking.com/privacy",
      supportUrl: "https://salaryhijacking.com/support",
      termsUrl: "https://salaryhijacking.com/terms",
      contactUrl: "https://salaryhijacking.com/contact",
    });
    expect(body.data?.privacy).toMatchObject({
      rawPayrollDataForAds: false,
      rawExpenseDataForAds: false,
      rawSavingsDataForAds: false,
      advertiserUserIdentifierExposure: false,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /"(salaryAmount|expenseAmount|savingsAmount|hijackAmount|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it("exposes server authority and contextual-only ads policy through public app config", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request("https://salaryhijacking.com/api/v1/public/app-config"),
      {
        APP_ENV: "production",
        APP_PUBLIC_BASE_URL: "https://salaryhijacking.com",
      },
      testContext,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly ads?: Record<string, unknown>;
        readonly serverAuthority?: Record<string, unknown>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data?.ads).toMatchObject({
      contextualOnly: true,
      adLabelRequired: true,
      financialTargetingUsed: false,
      sensitiveFinancialTargetingAllowed: false,
      partnerDisclosureRequired: true,
    });
    expect(body.data?.serverAuthority).toMatchObject({
      apiPrefix: "/api/v1",
      payrollBudgetExpenseSavingsSource: "server",
      clientMayCalculateAuthoritativeMoney: false,
      krwIntegerOnly: true,
      negativeMoneyAllowed: false,
      fractionalMoneyAllowed: false,
    });
  });

  it("serves robots and sitemap from the actual production Worker surface", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const robots = await app.fetch(
      new Request("https://salaryhijacking.com/robots.txt"),
      {
        APP_ENV: "production",
        APP_PUBLIC_BASE_URL: "https://salaryhijacking.com",
      },
      testContext,
    );
    const robotsBody = await robots.text();
    expect(robots.status).toBe(200);
    expect(robots.headers.get("content-type")).toContain("text/plain");
    expect(robotsBody).toContain(
      "Sitemap: https://salaryhijacking.com/sitemap.xml",
    );

    const sitemap = await app.fetch(
      new Request("https://salaryhijacking.com/sitemap.xml"),
      {
        APP_ENV: "production",
        APP_PUBLIC_BASE_URL: "https://salaryhijacking.com",
      },
      testContext,
    );
    const sitemapBody = await sitemap.text();
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get("content-type")).toContain("application/xml");
    expect(sitemapBody).toContain("<loc>https://salaryhijacking.com/</loc>");
    expect(sitemapBody).toContain(
      "<loc>https://salaryhijacking.com/partners</loc>",
    );
    expect(sitemapBody).not.toContain("DATABASE_URL");
  });

  it("serves Android App Links assetlinks only from explicit public cert fingerprints", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const missing = await app.fetch(
      new Request("https://salaryhijacking.com/.well-known/assetlinks.json"),
      { APP_ENV: "production" },
      testContext,
    );
    expect(missing.status).toBe(503);

    const response = await app.fetch(
      new Request("https://salaryhijacking.com/.well-known/assetlinks.json"),
      {
        ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS:
          "D7:6C:56:79:18:36:B6:92:D7:04:D9:11:F8:B1:80:25:89:B2:C4:20:34:0A:BD:31:24:9B:3D:87:A8:7C:63:D3",
        APP_ENV: "production",
      },
      testContext,
    );
    const body = (await response.json()) as readonly [
      {
        readonly target?: {
          readonly package_name?: string;
          readonly sha256_cert_fingerprints?: readonly string[];
        };
      },
    ];

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body[0]?.target?.package_name).toBe("com.salaryhijacking.mobile");
    expect(body[0]?.target?.sha256_cert_fingerprints).toContain(
      "D7:6C:56:79:18:36:B6:92:D7:04:D9:11:F8:B1:80:25:89:B2:C4:20:34:0A:BD:31:24:9B:3D:87:A8:7C:63:D3",
    );
  });
});
