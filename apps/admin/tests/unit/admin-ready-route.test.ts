import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, runtime } from "../../src/app/api/v1/ready/route";

const cloudflareMock = vi.hoisted(() => ({
  context: null as null | {
    readonly env: {
      readonly APP_ENV?: string;
      readonly STAGING_API_WORKER?: {
        readonly fetch: ReturnType<typeof vi.fn>;
      };
    };
  },
  getCloudflareContext: vi.fn(async () => {
    if (!cloudflareMock.context) {
      throw new Error("cloudflare context unavailable in unit test");
    }

    return cloudflareMock.context;
  }),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: cloudflareMock.getCloudflareContext,
}));

describe("GET /admin/api/v1/ready", () => {
  afterEach(() => {
    cloudflareMock.context = null;
    cloudflareMock.getCloudflareContext.mockClear();
  });

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
        readonly stagingApiInternalHealth?: {
          readonly required?: boolean;
          readonly ok?: boolean;
          readonly source?: string;
          readonly status?: number;
          readonly service?: string;
        };
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
      stagingApiInternalHealth: {
        required: false,
        ok: null,
        source: "not_required",
      },
    });
    expect(JSON.stringify(body)).not.toMatch(
      /"(salaryAmount|expenseAmount|savingsAmount|hijackAmount|email|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it("requires staging API health through the staging-only service binding", async () => {
    const fetch = vi.fn(async (request: Request) => {
      expect(request.url).toBe("https://api-staging.internal/health");
      expect(request.headers.get("accept")).toBe("application/json");
      expect(request.headers.get("user-agent")).toBe(
        "salary-hijacking-admin-internal-readiness/1.0",
      );

      return Response.json({
        success: true,
        data: {
          status: "ok",
          service: "salary-hijacking-api",
        },
      });
    });

    cloudflareMock.context = {
      env: {
        APP_ENV: "staging",
        STAGING_API_WORKER: { fetch },
      },
    };

    const response = await GET(
      new Request(
        "https://admin-staging.salaryhijacking.com/admin/api/v1/ready",
        {
          headers: { accept: "application/json" },
        },
      ),
    );
    const body = (await response.json()) as {
      readonly success?: boolean;
      readonly data?: {
        readonly status?: string;
        readonly stagingApiInternalHealth?: {
          readonly required?: boolean;
          readonly ok?: boolean;
          readonly source?: string;
          readonly status?: number;
          readonly service?: string;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      status: "ready",
      stagingApiInternalHealth: {
        required: true,
        ok: true,
        source: "cloudflare_service_binding",
        status: 200,
        service: "salary-hijacking-api",
      },
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("fails staging readiness when the required internal API service binding is unhealthy", async () => {
    cloudflareMock.context = {
      env: {
        APP_ENV: "staging",
        STAGING_API_WORKER: {
          fetch: vi.fn(async () =>
            Response.json(
              {
                success: false,
                data: {
                  status: "degraded",
                  service: "salary-hijacking-api",
                },
              },
              { status: 503 },
            ),
          ),
        },
      },
    };

    const response = await GET(
      new Request(
        "https://admin-staging.salaryhijacking.com/admin/api/v1/ready",
        {
          headers: { accept: "application/json" },
        },
      ),
    );
    const body = (await response.json()) as {
      readonly success?: boolean;
      readonly data?: {
        readonly status?: string;
        readonly stagingApiInternalHealth?: {
          readonly required?: boolean;
          readonly ok?: boolean;
          readonly status?: number;
        };
      };
    };

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.data).toMatchObject({
      status: "degraded",
      stagingApiInternalHealth: {
        required: true,
        ok: false,
        status: 503,
      },
    });
  });
});
