import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_SERVICE_NAME = "salary-hijacking-admin";
const ADMIN_API_PREFIX = "/admin/api/v1";
const ADMIN_VERSION = "3.1.3";
const STAGING_API_INTERNAL_HEALTH_URL = "https://api-staging.internal/health";

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

interface StagingApiWorkerBinding {
  readonly fetch: (request: Request) => Promise<Response>;
}

interface AdminCloudflareEnv {
  readonly APP_ENV?: string;
  readonly STAGING_API_WORKER?: StagingApiWorkerBinding;
}

interface StagingApiInternalHealth {
  readonly required: boolean;
  readonly ok: boolean | null;
  readonly source: string;
  readonly status?: number | null;
  readonly service?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

async function resolveStagingApiInternalHealth(): Promise<StagingApiInternalHealth> {
  let env: AdminCloudflareEnv | null = null;

  try {
    env = (await getCloudflareContext({ async: true }))
      .env as AdminCloudflareEnv;
  } catch {
    return {
      required: false,
      ok: null,
      source: "not_required",
    };
  }

  if (env.APP_ENV !== "staging") {
    return {
      required: false,
      ok: null,
      source: "not_required",
    };
  }

  if (!env.STAGING_API_WORKER) {
    return {
      required: true,
      ok: false,
      source: "cloudflare_service_binding_missing",
      status: null,
      service: null,
    };
  }

  try {
    const response = await env.STAGING_API_WORKER.fetch(
      new Request(STAGING_API_INTERNAL_HEALTH_URL, {
        headers: {
          accept: "application/json",
          "user-agent": "salary-hijacking-admin-internal-readiness/1.0",
        },
      }),
    );
    const body = asRecord(await response.json().catch(() => null));
    const data = asRecord(body?.data);
    const service = typeof data?.service === "string" ? data.service : null;
    const apiStatus = typeof data?.status === "string" ? data.status : null;
    const ok =
      response.ok &&
      body?.success === true &&
      apiStatus === "ok" &&
      service === "salary-hijacking-api";

    return {
      required: true,
      ok,
      source: "cloudflare_service_binding",
      status: response.status,
      service,
    };
  } catch {
    return {
      required: true,
      ok: false,
      source: "cloudflare_service_binding",
      status: null,
      service: null,
    };
  }
}

export async function GET(_request: Request): Promise<Response> {
  const stagingApiInternalHealth = await resolveStagingApiInternalHealth();
  const ready =
    !stagingApiInternalHealth.required || stagingApiInternalHealth.ok === true;

  return Response.json(
    {
      success: ready,
      data: {
        service: ADMIN_SERVICE_NAME,
        version: ADMIN_VERSION,
        status: ready ? "ready" : "degraded",
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
        stagingApiInternalHealth,
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    },
    {
      status: ready ? 200 : 503,
      headers: jsonHeaders,
    },
  );
}
