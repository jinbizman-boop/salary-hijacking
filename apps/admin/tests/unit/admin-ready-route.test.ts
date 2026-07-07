import { describe, expect, it } from "vitest";

import { GET, runtime } from "../../src/app/api/v1/ready/route";

describe("GET /admin/api/v1/ready", () => {
  it("uses the OpenNext-compatible Node.js runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("returns a bearer-free admin smoke payload with privacy and server-authority signals", async () => {
    const response = await GET(
      new Request("https://admin.salaryhijacking.com/admin/api/v1/ready", {
        headers: { accept: "application/json" },
      }),
    );
    const body = (await response.json()) as {
      readonly success?: boolean;
      readonly data?: {
        readonly service?: string;
        readonly status?: string;
        readonly adminApiPrefix?: string;
        readonly serverAuthorityEnabled?: boolean;
        readonly rawFinancialDataExposed?: boolean;
        readonly rawPersonalDataExposed?: boolean;
        readonly rawPushTokenExposed?: boolean;
        readonly adsFinancialTargetingUsed?: boolean;
        readonly adminReasonRequired?: boolean;
        readonly rbacRequired?: boolean;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-server-authority")).toBe("true");
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(response.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      service: "salary-hijacking-admin",
      status: "ready",
      adminApiPrefix: "/admin/api/v1",
      serverAuthorityEnabled: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
      adminReasonRequired: true,
      rbacRequired: true,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /"(salaryAmount|expenseAmount|savingsAmount|hijackAmount|email|pushToken|DATABASE_URL)"\s*:/i,
    );
  });
});
