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
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(body).toContain("급여납치");
    expect(body).toContain("이번 달 내가 지켜낸 돈");
    expect(body).toContain("/partners");
    expect(body).toContain("/privacy");
    expect(body).toContain("/support");
    expect(body).not.toMatch(
      /salaryAmount|expenseAmount|pushToken|DATABASE_URL/i,
    );
  });

  it.each([
    ["/privacy", "개인정보"],
    ["/support", "지원"],
    ["/terms", "이용약관"],
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
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body).toContain(expectedText);
    expect(body).toContain("support@salaryhijacking.com");
    expect(body).not.toMatch(
      /salaryAmount|expenseAmount|pushToken|DATABASE_URL/i,
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
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body).toContain("제휴 혜택");
    expect(body).toContain("문맥형");
    expect(body).toContain("금융 금액 기반 타겟팅을 사용하지 않습니다");
    expect(body).toContain("/privacy");
    expect(body).toContain("/support");
    expect(body).not.toMatch(
      /salaryAmount|expenseAmount|savingsAmount|hijackAmount|pushToken|DATABASE_URL/i,
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
    });
    expect(body.data?.privacy).toMatchObject({
      rawPayrollDataForAds: false,
      rawExpenseDataForAds: false,
      rawSavingsDataForAds: false,
      advertiserUserIdentifierExposure: false,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /salaryAmount|expenseAmount|savingsAmount|hijackAmount|pushToken|DATABASE_URL/i,
    );
  });
});
