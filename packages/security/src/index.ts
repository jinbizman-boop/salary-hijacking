/**
 * packages/security/src/index.ts
 * 급여납치 Salary Hijacking Platform · security package public entrypoint.
 *
 * Stable security boundary consumed by API, mobile/admin build-time contracts,
 * workers, QA tooling and commercial operations. This entrypoint verifies and
 * exports all completed security modules: encryption, masking, permission and
 * rate-limit.
 */

import encryptionSecurityContract, {
  SECURITY_ENCRYPTION_CONTRACT_VERSION,
  SECURITY_ENCRYPTION_PACKAGE_SCOPE,
  assertEncryptionModuleCompleteness,
  getEncryptionCompletenessReport,
} from "./encryption";
import maskingSecurityContract, {
  SECURITY_MASKING_CONTRACT_VERSION,
  SECURITY_MASKING_PACKAGE_SCOPE,
  assertMaskingModuleCompleteness,
  getMaskingCompletenessReport,
} from "./masking";
import permissionSecurityContract, {
  SECURITY_PERMISSION_CONTRACT_VERSION,
  SECURITY_PERMISSION_PACKAGE_SCOPE,
  assertPermissionModuleCompleteness,
  getPermissionCompletenessReport,
} from "./permission";
import rateLimitSecurityContract, {
  SECURITY_RATE_LIMIT_CONTRACT_VERSION,
  SECURITY_RATE_LIMIT_PACKAGE_SCOPE,
  assertRateLimitModuleCompleteness,
  getRateLimitCompletenessReport,
} from "./rate-limit";

export * as encryption from "./encryption";
export * as masking from "./masking";
export * as permission from "./permission";
export * as rateLimit from "./rate-limit";

export * from "./encryption";
export * from "./masking";
export * from "./permission";
export * from "./rate-limit";

export { default as encryptionSecurityContract } from "./encryption";
export { default as maskingSecurityContract } from "./masking";
export { default as permissionSecurityContract } from "./permission";
export { default as rateLimitSecurityContract } from "./rate-limit";

export const SECURITY_PACKAGE_CONTRACT_VERSION = "2.0.0" as const;
export const SECURITY_PACKAGE_SCOPE = "packages/security/src/index.ts" as const;
export const SECURITY_PACKAGE_NAME = "@salary-hijacking/security" as const;

export type SecurityModuleName =
  | "encryption"
  | "masking"
  | "permission"
  | "rateLimit";
export type SecurityModuleMaturity = "complete" | "entrypoint-reserved";

export interface SecurityModuleStatus {
  readonly name: SecurityModuleName;
  readonly maturity: SecurityModuleMaturity;
  readonly contractVersion: string;
  readonly packageScope: string;
  readonly requiredForCommercialRelease: boolean;
  readonly exportedByEntrypoint: boolean;
  readonly assertCompleteness: () => void;
  readonly getCompletenessReport: () => {
    readonly ok: boolean;
    readonly missing: readonly string[];
  };
}

export interface SecurityPackagePolicy {
  readonly serverAuthorityRequired: true;
  readonly serverOrEdgeOnlyByDefault: true;
  readonly browserDirectSecretAccessAllowed: false;
  readonly browserDirectDatabaseAccessAllowed: false;
  readonly browserDirectRateLimitAuthorityAllowed: false;
  readonly rawSecretLoggingAllowed: false;
  readonly rawTokenLoggingAllowed: false;
  readonly rawPiiLoggingAllowed: false;
  readonly rawFinancialDataInAdsOrCommunityAllowed: false;
  readonly clientFinalCalculationAllowed: false;
  readonly piiEncryptionRequired: true;
  readonly financialMetadataEncryptionRequired: true;
  readonly refreshTokenHashingRequired: true;
  readonly idempotencyKeyHashingRequired: true;
  readonly webhookSignatureRequired: true;
  readonly adminRbacRequired: true;
  readonly adminMfaRequired: true;
  readonly logMaskingRequired: true;
  readonly authRateLimitRequired: true;
  readonly writeRateLimitRequired: true;
  readonly financialWriteIdempotencyRequired: true;
  readonly notificationServiceAccountRequired: true;
  readonly migrationServiceAccountRequired: true;
  readonly keyRotationRequired: true;
  readonly aadBindingRequired: true;
  readonly auditLogRequiredForSensitiveOperations: true;
}

export interface SecurityModuleCompletenessSummary {
  readonly name: SecurityModuleName;
  readonly ok: boolean;
  readonly maturity: SecurityModuleMaturity;
  readonly packageScope: string;
  readonly missing: readonly string[];
  readonly report: Record<string, unknown>;
}

export interface SecurityPackageCompletenessReport {
  readonly ok: boolean;
  readonly packageName: typeof SECURITY_PACKAGE_NAME;
  readonly contractVersion: typeof SECURITY_PACKAGE_CONTRACT_VERSION;
  readonly packageScope: typeof SECURITY_PACKAGE_SCOPE;
  readonly moduleCount: number;
  readonly completeModuleCount: number;
  readonly reservedModuleCount: number;
  readonly invariantCount: number;
  readonly modules: readonly SecurityModuleCompletenessSummary[];
  readonly encryptionReport: Record<string, unknown>;
  readonly maskingReport: Record<string, unknown>;
  readonly permissionReport: Record<string, unknown>;
  readonly rateLimitReport: Record<string, unknown>;
  readonly missing: readonly string[];
}

export const securityPackagePolicy = Object.freeze({
  serverAuthorityRequired: true,
  serverOrEdgeOnlyByDefault: true,
  browserDirectSecretAccessAllowed: false,
  browserDirectDatabaseAccessAllowed: false,
  browserDirectRateLimitAuthorityAllowed: false,
  rawSecretLoggingAllowed: false,
  rawTokenLoggingAllowed: false,
  rawPiiLoggingAllowed: false,
  rawFinancialDataInAdsOrCommunityAllowed: false,
  clientFinalCalculationAllowed: false,
  piiEncryptionRequired: true,
  financialMetadataEncryptionRequired: true,
  refreshTokenHashingRequired: true,
  idempotencyKeyHashingRequired: true,
  webhookSignatureRequired: true,
  adminRbacRequired: true,
  adminMfaRequired: true,
  logMaskingRequired: true,
  authRateLimitRequired: true,
  writeRateLimitRequired: true,
  financialWriteIdempotencyRequired: true,
  notificationServiceAccountRequired: true,
  migrationServiceAccountRequired: true,
  keyRotationRequired: true,
  aadBindingRequired: true,
  auditLogRequiredForSensitiveOperations: true,
}) satisfies SecurityPackagePolicy;

export const securityModuleStatuses: readonly SecurityModuleStatus[] =
  Object.freeze([
    {
      name: "encryption",
      maturity: "complete",
      contractVersion: SECURITY_ENCRYPTION_CONTRACT_VERSION,
      packageScope: SECURITY_ENCRYPTION_PACKAGE_SCOPE,
      requiredForCommercialRelease: true,
      exportedByEntrypoint: true,
      assertCompleteness: assertEncryptionModuleCompleteness,
      getCompletenessReport: getEncryptionCompletenessReport,
    },
    {
      name: "masking",
      maturity: "complete",
      contractVersion: SECURITY_MASKING_CONTRACT_VERSION,
      packageScope: SECURITY_MASKING_PACKAGE_SCOPE,
      requiredForCommercialRelease: true,
      exportedByEntrypoint: true,
      assertCompleteness: assertMaskingModuleCompleteness,
      getCompletenessReport: getMaskingCompletenessReport,
    },
    {
      name: "permission",
      maturity: "complete",
      contractVersion: SECURITY_PERMISSION_CONTRACT_VERSION,
      packageScope: SECURITY_PERMISSION_PACKAGE_SCOPE,
      requiredForCommercialRelease: true,
      exportedByEntrypoint: true,
      assertCompleteness: assertPermissionModuleCompleteness,
      getCompletenessReport: getPermissionCompletenessReport,
    },
    {
      name: "rateLimit",
      maturity: "complete",
      contractVersion: SECURITY_RATE_LIMIT_CONTRACT_VERSION,
      packageScope: SECURITY_RATE_LIMIT_PACKAGE_SCOPE,
      requiredForCommercialRelease: true,
      exportedByEntrypoint: true,
      assertCompleteness: assertRateLimitModuleCompleteness,
      getCompletenessReport: getRateLimitCompletenessReport,
    },
  ]);

export const securityModuleNames = securityModuleStatuses.map(
  (module) => module.name,
) as readonly SecurityModuleName[];
export const completeSecurityModuleNames = securityModuleStatuses
  .filter((module) => module.maturity === "complete")
  .map((module) => module.name) as readonly SecurityModuleName[];
export const reservedSecurityModuleNames = securityModuleStatuses
  .filter((module) => module.maturity === "entrypoint-reserved")
  .map((module) => module.name) as readonly SecurityModuleName[];

const requiredSecurityModuleNames: readonly SecurityModuleName[] = [
  "encryption",
  "masking",
  "permission",
  "rateLimit",
] as const;

const hasRequiredModuleCoverage = (): boolean => {
  const moduleNameSet = new Set<SecurityModuleName>(securityModuleNames);
  return requiredSecurityModuleNames.every((name) => moduleNameSet.has(name));
};

export const getSecurityPackageCompletenessReport =
  (): SecurityPackageCompletenessReport => {
    const moduleSummaries = securityModuleStatuses.map(
      (module): SecurityModuleCompletenessSummary => {
        const report = module.getCompletenessReport();
        return Object.freeze({
          name: module.name,
          ok: report.ok === true,
          maturity: module.maturity,
          packageScope: module.packageScope,
          missing: report.missing,
          report: report as unknown as Record<string, unknown>,
        });
      },
    );

    const moduleNameSet = new Set<SecurityModuleName>(securityModuleNames);
    const missing: string[] = [];
    const encryptionReport = getEncryptionCompletenessReport();
    const maskingReport = getMaskingCompletenessReport();
    const permissionReport = getPermissionCompletenessReport();
    const rateLimitReport = getRateLimitCompletenessReport();

    const invariants: readonly [string, boolean][] = [
      [
        "package contract version",
        SECURITY_PACKAGE_CONTRACT_VERSION === "2.0.0",
      ],
      [
        "encryption contract version alignment",
        SECURITY_ENCRYPTION_CONTRACT_VERSION ===
          SECURITY_PACKAGE_CONTRACT_VERSION,
      ],
      [
        "masking contract version alignment",
        SECURITY_MASKING_CONTRACT_VERSION === SECURITY_PACKAGE_CONTRACT_VERSION,
      ],
      [
        "permission contract version alignment",
        SECURITY_PERMISSION_CONTRACT_VERSION ===
          SECURITY_PACKAGE_CONTRACT_VERSION,
      ],
      [
        "rate-limit contract version alignment",
        SECURITY_RATE_LIMIT_CONTRACT_VERSION ===
          SECURITY_PACKAGE_CONTRACT_VERSION,
      ],
      ["security module route coverage", hasRequiredModuleCoverage()],
      [
        "security namespace export coverage",
        securityModuleStatuses.every((module) => module.exportedByEntrypoint),
      ],
      [
        "all modules marked complete",
        securityModuleStatuses.every(
          (module) => module.maturity === "complete",
        ),
      ],
      ["no reserved modules", reservedSecurityModuleNames.length === 0],
      ["encryption module complete", encryptionReport.ok === true],
      ["masking module complete", maskingReport.ok === true],
      ["permission module complete", permissionReport.ok === true],
      ["rate-limit module complete", rateLimitReport.ok === true],
      [
        "server authority policy",
        securityPackagePolicy.serverAuthorityRequired === true,
      ],
      [
        "server or edge only policy",
        securityPackagePolicy.serverOrEdgeOnlyByDefault === true,
      ],
      [
        "no browser direct secret access",
        securityPackagePolicy.browserDirectSecretAccessAllowed === false,
      ],
      [
        "no browser direct database access",
        securityPackagePolicy.browserDirectDatabaseAccessAllowed === false,
      ],
      [
        "no browser direct rate-limit authority",
        securityPackagePolicy.browserDirectRateLimitAuthorityAllowed === false,
      ],
      [
        "no raw secret logging",
        securityPackagePolicy.rawSecretLoggingAllowed === false,
      ],
      [
        "no raw token logging",
        securityPackagePolicy.rawTokenLoggingAllowed === false,
      ],
      [
        "no raw pii logging",
        securityPackagePolicy.rawPiiLoggingAllowed === false,
      ],
      [
        "no raw financial data in ads/community",
        securityPackagePolicy.rawFinancialDataInAdsOrCommunityAllowed === false,
      ],
      [
        "no client final calculation",
        securityPackagePolicy.clientFinalCalculationAllowed === false,
      ],
      [
        "PII encryption required",
        securityPackagePolicy.piiEncryptionRequired === true,
      ],
      [
        "financial metadata encryption required",
        securityPackagePolicy.financialMetadataEncryptionRequired === true,
      ],
      [
        "refresh token hashing required",
        securityPackagePolicy.refreshTokenHashingRequired === true,
      ],
      [
        "idempotency hashing required",
        securityPackagePolicy.idempotencyKeyHashingRequired === true,
      ],
      [
        "webhook signature required",
        securityPackagePolicy.webhookSignatureRequired === true,
      ],
      ["admin RBAC required", securityPackagePolicy.adminRbacRequired === true],
      ["admin MFA required", securityPackagePolicy.adminMfaRequired === true],
      [
        "log masking required",
        securityPackagePolicy.logMaskingRequired === true,
      ],
      [
        "auth rate limit required",
        securityPackagePolicy.authRateLimitRequired === true,
      ],
      [
        "write rate limit required",
        securityPackagePolicy.writeRateLimitRequired === true,
      ],
      [
        "financial write idempotency required",
        securityPackagePolicy.financialWriteIdempotencyRequired === true,
      ],
      [
        "notification service account required",
        securityPackagePolicy.notificationServiceAccountRequired === true,
      ],
      [
        "migration service account required",
        securityPackagePolicy.migrationServiceAccountRequired === true,
      ],
      [
        "key rotation required",
        securityPackagePolicy.keyRotationRequired === true,
      ],
      [
        "AAD binding required",
        securityPackagePolicy.aadBindingRequired === true,
      ],
      [
        "sensitive audit logging required",
        securityPackagePolicy.auditLogRequiredForSensitiveOperations === true,
      ],
    ];

    for (const requiredModuleName of requiredSecurityModuleNames) {
      if (!moduleNameSet.has(requiredModuleName))
        missing.push(`missing security module export: ${requiredModuleName}`);
    }

    for (const moduleSummary of moduleSummaries) {
      if (!moduleSummary.ok)
        missing.push(
          ...moduleSummary.missing.map(
            (item) => `${moduleSummary.name}: ${item}`,
          ),
        );
      if (moduleSummary.maturity !== "complete")
        missing.push(`${moduleSummary.name}: module is not marked complete`);
    }

    for (const [name, ok] of invariants) {
      if (!ok) missing.push(name);
    }

    return Object.freeze({
      ok: missing.length === 0,
      packageName: SECURITY_PACKAGE_NAME,
      contractVersion: SECURITY_PACKAGE_CONTRACT_VERSION,
      packageScope: SECURITY_PACKAGE_SCOPE,
      moduleCount: securityModuleStatuses.length,
      completeModuleCount: completeSecurityModuleNames.length,
      reservedModuleCount: reservedSecurityModuleNames.length,
      invariantCount: invariants.length,
      modules: moduleSummaries,
      encryptionReport: encryptionReport as unknown as Record<string, unknown>,
      maskingReport: maskingReport as unknown as Record<string, unknown>,
      permissionReport: permissionReport as unknown as Record<string, unknown>,
      rateLimitReport: rateLimitReport as unknown as Record<string, unknown>,
      missing,
    });
  };

export const assertSecurityPackageCompleteness = (): void => {
  for (const module of securityModuleStatuses) module.assertCompleteness();

  const report = getSecurityPackageCompletenessReport();
  if (!report.ok) {
    throw new Error(
      `Security package entrypoint is incomplete: ${report.missing.join(", ")}`,
    );
  }
};

assertSecurityPackageCompleteness();

export const securityPackage = Object.freeze({
  packageName: SECURITY_PACKAGE_NAME,
  contractVersion: SECURITY_PACKAGE_CONTRACT_VERSION,
  packageScope: SECURITY_PACKAGE_SCOPE,
  policy: securityPackagePolicy,
  modules: securityModuleStatuses,
  moduleNames: securityModuleNames,
  completeModuleNames: completeSecurityModuleNames,
  reservedModuleNames: reservedSecurityModuleNames,
  encryption: encryptionSecurityContract,
  masking: maskingSecurityContract,
  permission: permissionSecurityContract,
  rateLimit: rateLimitSecurityContract,
  getCompletenessReport: getSecurityPackageCompletenessReport,
  assertCompleteness: assertSecurityPackageCompleteness,
});

export default securityPackage;
