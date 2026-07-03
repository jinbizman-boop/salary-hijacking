import { describe, expect, it } from "vitest";
import { appManifest } from "../src/app";

type RouteManifest = Readonly<{
  id: string;
  manifest: Readonly<{
    prefix: string;
    endpoints: readonly string[];
  }>;
}>;

const routeManifests = appManifest.routes as readonly RouteManifest[];

function endpointsFor(routeId: string): readonly string[] {
  const route = routeManifests.find((item) => item.id === routeId);
  if (!route) throw new Error(`Route manifest not found: ${routeId}`);
  return route.manifest.endpoints.map(
    (endpoint) => `${route.manifest.prefix} ${endpoint}`,
  );
}

describe("mobile route manifest contract", () => {
  it("keeps mobile payroll screen endpoints exposed by the API manifest", () => {
    expect(endpointsFor("payroll")).toEqual(
      expect.arrayContaining([
        "/api/v1/payroll GET /home",
        "/api/v1/payroll GET /current",
        "/api/v1/payroll POST /recalculate",
      ]),
    );
  });

  it("keeps mobile profile screen endpoints exposed by the API manifest", () => {
    expect(endpointsFor("users")).toEqual(
      expect.arrayContaining([
        "/api/v1/users GET /me/profile",
        "/api/v1/users PATCH /me/profile",
        "/api/v1/users GET /me/my-page-summary",
        "/api/v1/users POST /me/privacy-export",
        "/api/v1/users POST /me/support-tickets",
        "/api/v1/users POST /me/withdrawal-request",
        "/api/v1/users POST /me/withdraw",
      ]),
    );
  });

  it("keeps mobile tab and notification endpoints exposed by the API manifest", () => {
    expect(endpointsFor("growth")).toEqual(
      expect.arrayContaining([
        "/api/v1/growth GET /dashboard",
        "/api/v1/growth POST /tasks/{taskId}/progress",
        "/api/v1/growth POST /challenges/{challengeId}/join",
      ]),
    );
    expect(endpointsFor("notifications")).toEqual(
      expect.arrayContaining([
        "/api/v1/notifications GET /",
        "/api/v1/notifications POST /read-all",
        "/api/v1/notifications POST /{notificationId}/read",
      ]),
    );
    expect(endpointsFor("fixed-expenses")).toContain(
      "/api/v1/fixed-expenses POST /{expenseId}/pay",
    );
  });
});
