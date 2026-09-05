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
    expect(body).toContain('id="hero"');
    expect(body).toContain('id="need"');
    expect(body).toContain('id="features"');
    expect(body).toContain('id="level-up"');
    expect(body).toContain('id="community"');
    expect(body).toContain('id="partnership"');
    expect(body).toContain('id="contact"');
    expect(body).toContain("월급이 사라지기 전에, 내가 먼저 관리합니다.");
    expect(body).toContain("급여납치가 필요한 이유");
    expect(body).toContain("급여납치 핵심 기능");
    expect(body).toContain("LV UP");
    expect(body).toContain("독서");
    expect(body).toContain("뉴스");
    expect(body).toContain("외국어");
    expect(body).toContain("운동");
    expect(body).toContain("Community");
    expect(body).toContain("Partnership");
    expect(body).toContain("제휴 문의 남기기");
    expect(body).toContain("진비즈 매니지먼트");
    expect(body).toContain("330-25-01693");
    expect(body).toContain("/api/v1/public/partnership-inquiries");
    expect(body).toContain("/partners");
    expect(body).toContain("/affiliate");
    expect(body).toContain("/privacy");
    expect(body).toContain("/support");
    expect(body).not.toContain("서버 권위 기준");
    expect(body).not.toContain("금융 금액 기반 광고 타게팅");
    expect(body).not.toMatch(
      /"(salaryAmount|expenseAmount|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it.each([
    ["/privacy", "개인정보 처리방침"],
    ["/support", "고객 지원"],
    ["/terms", "이용약관"],
    ["/contact", "문의"],
    ["/affiliate", "제휴 혜택"],
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
    if (path === "/contact") {
      expect(body).toContain("제휴 문의 남기기");
      expect(body).toContain("/api/v1/public/partnership-inquiries");
      expect(body).not.toContain("mailto:");
      expect(body).not.toContain("이메일 프로그램");
    }
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
    expect(body).toContain("민감 금융정보를 광고 세그먼트에 사용하지 않습니다");
    expect(body).toContain("/privacy");
    expect(body).toContain("/support");
    expect(body).toContain("/contact");
    expect(body).not.toMatch(
      /"(salaryAmount|expenseAmount|savingsAmount|hijackAmount|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it("accepts partnership inquiries only through the production backend queue", async () => {
    const messages: unknown[] = [];
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request(
        "https://salaryhijacking.com/api/v1/public/partnership-inquiries",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            company: "Jinbiz Partner",
            name: "QA Contact",
            email: "partner@example.com",
            phone: "010-0000-0000",
            type: "brand",
            message: "생활 혜택 제휴 문의입니다.",
            privacyConsent: true,
            website: "",
          }),
        },
      ),
      {
        APP_ENV: "production",
        OPERATIONS_QUEUE: {
          send: async (message: unknown) => {
            messages.push(message);
          },
        },
      },
      testContext,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly accepted?: boolean;
        readonly queued?: boolean;
        readonly requestId?: string;
      };
    };
    const responseText = JSON.stringify(body);

    expect(response.status).toBe(202);
    expect(body.data).toMatchObject({ accepted: true, queued: true });
    expect(body.data?.requestId).toMatch(/^inq_/);
    expect(responseText).not.toContain("partner@example.com");
    expect(responseText).not.toContain("010-0000-0000");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      type: "partnership_inquiry",
      source: "public_web",
      environment: "production",
      consent: { privacy: true },
      piiEvidence: {
        rawPersonalDataEchoedToResponse: false,
        rawFinancialDataCollected: false,
      },
    });
  });

  it("does not fake contact form success when the queue binding is unavailable", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request(
        "https://salaryhijacking.com/api/v1/public/partnership-inquiries",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            company: "Jinbiz Partner",
            name: "QA Contact",
            email: "partner@example.com",
            type: "brand",
            message: "생활 혜택 제휴 문의입니다.",
            privacyConsent: true,
            website: "",
          }),
        },
      ),
      { APP_ENV: "production" },
      testContext,
    );
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("PUBLIC_CONTACT_QUEUE_UNAVAILABLE");
    expect(body).not.toContain("partner@example.com");
  });

  it("rejects invalid partnership inquiries without queueing raw input", async () => {
    const messages: unknown[] = [];
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request(
        "https://salaryhijacking.com/api/v1/public/partnership-inquiries",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            company: "",
            name: "",
            email: "not-an-email",
            type: "brand",
            message: "short",
            privacyConsent: false,
            website: "",
          }),
        },
      ),
      {
        APP_ENV: "production",
        OPERATIONS_QUEUE: {
          send: async (message: unknown) => {
            messages.push(message);
          },
        },
      },
      testContext,
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("PUBLIC_CONTACT_INVALID_INPUT");
    expect(messages).toHaveLength(0);
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
      affiliateUrl: "https://salaryhijacking.com/affiliate",
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
    expect(sitemapBody).toContain(
      "<loc>https://salaryhijacking.com/affiliate</loc>",
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
