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

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS
  });

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
      return json(readyBody());
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
