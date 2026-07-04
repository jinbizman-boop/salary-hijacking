export const dynamic = "force-dynamic";
export const runtime = "edge";

const ADMIN_SERVICE_NAME = "salary-hijacking-admin";
const ADMIN_API_PREFIX = "/admin/api/v1";
const ADMIN_VERSION = "3.1.3";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, no-cache, must-revalidate",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "x-server-authority": "true",
  "x-financial-raw-data-exposed": "false",
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting": "separated",
  "x-ad-financial-targeting-used": "false",
  "x-admin-reason-required": "true",
  "x-admin-rbac-required": "true",
} as const;

export function GET(_request: Request): Response {
  return Response.json(
    {
      success: true,
      data: {
        service: ADMIN_SERVICE_NAME,
        version: ADMIN_VERSION,
        status: "ready",
        adminApiPrefix: ADMIN_API_PREFIX,
        serverAuthorityEnabled: true,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
        adminReasonRequired: true,
        rbacRequired: true,
        mfaSensitiveBoundary: true,
        redactedExportOnly: true,
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    },
    {
      status: 200,
      headers: jsonHeaders,
    },
  );
}
