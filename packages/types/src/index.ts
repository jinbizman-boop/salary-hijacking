/**
 * packages/types/src/index.ts
 *
 * 급여납치 Salary Hijacking Platform · Shared Types Public Entry
 *
 * 파일 목적
 * - @salary-hijacking/types 패키지의 단일 공개 진입점이다.
 * - user, payroll, expense, growth, notification, community 도메인 타입을 충돌 없이 namespace barrel로 노출한다.
 * - 각 도메인 파일은 UUID, ISODateString 같은 공통 별칭을 자체적으로 보유하므로 `export *`를 사용하지 않는다.
 *   무분별한 star export는 동일 이름 재수출 충돌을 만들 수 있기 때문에 이 파일은 의도적으로 namespace export만 사용한다.
 * - 앱, API, 관리자 콘솔, 테스트, 문서화 도구가 동일한 도메인 계약과 완성도 리포트를 참조할 수 있게 한다.
 */

import * as userDomainModule from "./domain/user.types";
import * as payrollDomainModule from "./domain/payroll.types";
import * as expenseDomainModule from "./domain/expense.types";
import * as growthDomainModule from "./domain/growth.types";
import * as notificationDomainModule from "./domain/notification.types";
import * as communityDomainModule from "./domain/community.types";

export * as userDomain from "./domain/user.types";
export * as payrollDomain from "./domain/payroll.types";
export * as expenseDomain from "./domain/expense.types";
export * as growthDomain from "./domain/growth.types";
export * as notificationDomain from "./domain/notification.types";
export * as communityDomain from "./domain/community.types";

export const SALARY_HIJACKING_TYPES_PACKAGE =
  "@salary-hijacking/types" as const;
export const SALARY_HIJACKING_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const SALARY_HIJACKING_TYPES_PLATFORM =
  "salary-hijacking-platform" as const;
export const SALARY_HIJACKING_TYPES_SERVICE_NAME_KO = "급여납치" as const;
export const SALARY_HIJACKING_TYPES_SERVICE_NAME_EN =
  "SALARY HIJACKING" as const;
export const SALARY_HIJACKING_TYPES_TIMEZONE = "Asia/Seoul" as const;
export const SALARY_HIJACKING_TYPES_LOCALE = "ko-KR" as const;
export const SALARY_HIJACKING_TYPES_CURRENCY = "KRW" as const;

export const SALARY_HIJACKING_TYPE_DOMAIN_NAMES = [
  "user",
  "payroll",
  "expense",
  "growth",
  "notification",
  "community",
] as const;

export type SalaryHijackingTypeDomainName =
  (typeof SALARY_HIJACKING_TYPE_DOMAIN_NAMES)[number];

export const SALARY_HIJACKING_TYPE_DOMAIN_LABELS: Readonly<
  Record<SalaryHijackingTypeDomainName, string>
> = Object.freeze({
  user: "사용자·인증·마이페이지",
  payroll: "급여·납치금액·월마감",
  expense: "고정지출·일일예산·변동지출",
  growth: "LV UP·독서·뉴스·영어·건강",
  notification: "알림·푸시·수신설정",
  community: "커뮤니티·글쓰기·모더레이션",
});

export type SalaryHijackingRuntimeModule = Readonly<Record<string, unknown>>;

export const salaryHijackingDomainModules: Readonly<
  Record<SalaryHijackingTypeDomainName, SalaryHijackingRuntimeModule>
> = Object.freeze({
  user: userDomainModule,
  payroll: payrollDomainModule,
  expense: expenseDomainModule,
  growth: growthDomainModule,
  notification: notificationDomainModule,
  community: communityDomainModule,
});

export const SALARY_HIJACKING_DOMAIN_CONTRACT_EXPORTS: Readonly<
  Record<SalaryHijackingTypeDomainName, readonly string[]>
> = Object.freeze({
  user: Object.freeze([
    "USER_TYPES_CONTRACT_VERSION",
    "USER_TYPES_DOMAIN",
    "USER_SAFE_POLICY_GUARD",
    "USER_API_PATHS",
    "USER_TYPES_COMPLETENESS_REPORT",
    "getUserTypesCompletenessReport",
    "assertUserTypesCompleteness",
    "userTypes",
    "default",
  ]),
  payroll: Object.freeze([
    "PAYROLL_TYPES_CONTRACT_VERSION",
    "PAYROLL_TYPES_DOMAIN",
    "PAYROLL_SAFE_POLICY_GUARD",
    "PAYROLL_API_PATHS",
    "PAYROLL_TYPES_COMPLETENESS_REPORT",
    "getPayrollTypesCompletenessReport",
    "assertPayrollTypesCompleteness",
    "calculatePayroll",
    "payrollTypes",
    "default",
  ]),
  expense: Object.freeze([
    "EXPENSE_TYPES_CONTRACT_VERSION",
    "EXPENSE_TYPES_DOMAIN",
    "EXPENSE_SAFE_POLICY_GUARD",
    "EXPENSE_API_PATHS",
    "EXPENSE_TYPES_COMPLETENESS_REPORT",
    "getExpenseTypesCompletenessReport",
    "assertExpenseTypesCompleteness",
    "calculateDailyBudget",
    "expenseTypes",
    "default",
  ]),
  growth: Object.freeze([
    "GROWTH_TYPES_CONTRACT_VERSION",
    "GROWTH_TYPES_DOMAIN",
    "GROWTH_SAFE_POLICY_GUARD",
    "GROWTH_API_PATHS",
    "GROWTH_TYPES_COMPLETENESS_REPORT",
    "getGrowthTypesCompletenessReport",
    "assertGrowthTypesCompleteness",
    "calculateGrowthLevelState",
    "growthTypes",
    "default",
  ]),
  notification: Object.freeze([
    "NOTIFICATION_TYPES_CONTRACT_VERSION",
    "NOTIFICATION_TYPES_DOMAIN",
    "NOTIFICATION_SAFE_POLICY_GUARD",
    "NOTIFICATION_API_PATHS",
    "NOTIFICATION_TYPES_COMPLETENESS_REPORT",
    "getNotificationTypesCompletenessReport",
    "assertNotificationTypesCompleteness",
    "canDeliverNotificationChannel",
    "notificationTypes",
    "default",
  ]),
  community: Object.freeze([
    "COMMUNITY_TYPES_CONTRACT_VERSION",
    "COMMUNITY_TYPES_DOMAIN",
    "COMMUNITY_SAFE_POLICY_GUARD",
    "COMMUNITY_API_PATHS",
    "COMMUNITY_TYPES_COMPLETENESS_REPORT",
    "getCommunityTypesCompletenessReport",
    "assertCommunityTypesCompleteness",
    "communityTypes",
    "default",
  ]),
});

export const SALARY_HIJACKING_DOMAIN_COMPLETENESS_FUNCTIONS: Readonly<
  Record<SalaryHijackingTypeDomainName, string>
> = Object.freeze({
  user: "getUserTypesCompletenessReport",
  payroll: "getPayrollTypesCompletenessReport",
  expense: "getExpenseTypesCompletenessReport",
  growth: "getGrowthTypesCompletenessReport",
  notification: "getNotificationTypesCompletenessReport",
  community: "getCommunityTypesCompletenessReport",
});

export interface SalaryHijackingDomainExportReport {
  readonly domain: SalaryHijackingTypeDomainName;
  readonly label: string;
  readonly expectedExportCount: number;
  readonly actualExportCount: number;
  readonly exportedNames: readonly string[];
  readonly missingRequiredExports: readonly string[];
  readonly extraExports: readonly string[];
  readonly hasDefaultExport: boolean;
  readonly hasCompletenessReportFunction: boolean;
  readonly internalCompletenessOk?: boolean;
  readonly internalCompletenessMissing?: readonly string[];
  readonly internalCompletenessError?: string;
}

export interface SalaryHijackingTypesPackageReport {
  readonly ok: boolean;
  readonly packageName: typeof SALARY_HIJACKING_TYPES_PACKAGE;
  readonly contractVersion: typeof SALARY_HIJACKING_TYPES_CONTRACT_VERSION;
  readonly serviceNameKo: typeof SALARY_HIJACKING_TYPES_SERVICE_NAME_KO;
  readonly serviceNameEn: typeof SALARY_HIJACKING_TYPES_SERVICE_NAME_EN;
  readonly timezone: typeof SALARY_HIJACKING_TYPES_TIMEZONE;
  readonly locale: typeof SALARY_HIJACKING_TYPES_LOCALE;
  readonly currency: typeof SALARY_HIJACKING_TYPES_CURRENCY;
  readonly domainCount: number;
  readonly domains: readonly SalaryHijackingDomainExportReport[];
  readonly missing: readonly string[];
}

export type SalaryHijackingTypesImportExample = {
  readonly namespaceImport: "import { payrollDomain, userDomain } from '@salary-hijacking/types';";
  readonly typeUsage: "type Plan = payrollDomain.PayrollPlan; type Me = userDomain.MeUser;";
  readonly runtimeUsage: "const report = payrollDomain.getPayrollTypesCompletenessReport();";
};

const sortStrings = (values: readonly string[]): readonly string[] =>
  [...values].sort((a, b) => a.localeCompare(b));

const getSafeMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
};

const readInternalCompleteness = (
  domain: SalaryHijackingTypeDomainName,
  moduleObject: SalaryHijackingRuntimeModule,
): Pick<
  SalaryHijackingDomainExportReport,
  | "internalCompletenessOk"
  | "internalCompletenessMissing"
  | "internalCompletenessError"
> => {
  const functionName = SALARY_HIJACKING_DOMAIN_COMPLETENESS_FUNCTIONS[domain];
  const candidate = moduleObject[functionName];

  if (typeof candidate !== "function") return {};

  try {
    const report = candidate() as {
      readonly ok?: unknown;
      readonly missing?: unknown;
    };
    const missing = Array.isArray(report.missing)
      ? report.missing.map(String)
      : undefined;

    const base = {
      internalCompletenessOk: report.ok === true,
    } satisfies Pick<
      SalaryHijackingDomainExportReport,
      "internalCompletenessOk"
    >;

    return missing === undefined
      ? base
      : {
          ...base,
          internalCompletenessMissing: missing,
        };
  } catch (error) {
    return {
      internalCompletenessOk: false,
      internalCompletenessError: getSafeMessage(error),
    };
  }
};

export const getSalaryHijackingDomainExportReport = (
  domain: SalaryHijackingTypeDomainName,
): SalaryHijackingDomainExportReport => {
  const moduleObject = salaryHijackingDomainModules[domain];
  const expected = SALARY_HIJACKING_DOMAIN_CONTRACT_EXPORTS[domain];
  const exportedNames = sortStrings(Object.keys(moduleObject));
  const missingRequiredExports = expected.filter(
    (name) => !Object.prototype.hasOwnProperty.call(moduleObject, name),
  );
  const extraExports = exportedNames.filter((name) => !expected.includes(name));
  const completenessFunction =
    SALARY_HIJACKING_DOMAIN_COMPLETENESS_FUNCTIONS[domain];

  return {
    domain,
    label: SALARY_HIJACKING_TYPE_DOMAIN_LABELS[domain],
    expectedExportCount: expected.length,
    actualExportCount: exportedNames.length,
    exportedNames,
    missingRequiredExports,
    extraExports,
    hasDefaultExport: Object.prototype.hasOwnProperty.call(
      moduleObject,
      "default",
    ),
    hasCompletenessReportFunction:
      typeof moduleObject[completenessFunction] === "function",
    ...readInternalCompleteness(domain, moduleObject),
  };
};

export const getSalaryHijackingTypesPackageReport =
  (): SalaryHijackingTypesPackageReport => {
    const domainReports = SALARY_HIJACKING_TYPE_DOMAIN_NAMES.map(
      getSalaryHijackingDomainExportReport,
    );
    const missing = domainReports.flatMap((report) => [
      ...report.missingRequiredExports.map(
        (name) => `${report.domain}: missing export ${name}`,
      ),
      ...(report.internalCompletenessOk === false &&
      report.internalCompletenessMissing
        ? report.internalCompletenessMissing.map(
            (name) => `${report.domain}: ${name}`,
          )
        : []),
      ...(report.internalCompletenessError
        ? [
            `${report.domain}: completeness function error: ${report.internalCompletenessError}`,
          ]
        : []),
    ]);

    return {
      ok: missing.length === 0,
      packageName: SALARY_HIJACKING_TYPES_PACKAGE,
      contractVersion: SALARY_HIJACKING_TYPES_CONTRACT_VERSION,
      serviceNameKo: SALARY_HIJACKING_TYPES_SERVICE_NAME_KO,
      serviceNameEn: SALARY_HIJACKING_TYPES_SERVICE_NAME_EN,
      timezone: SALARY_HIJACKING_TYPES_TIMEZONE,
      locale: SALARY_HIJACKING_TYPES_LOCALE,
      currency: SALARY_HIJACKING_TYPES_CURRENCY,
      domainCount: SALARY_HIJACKING_TYPE_DOMAIN_NAMES.length,
      domains: domainReports,
      missing,
    };
  };

export const assertSalaryHijackingTypesPackageCompleteness = (): void => {
  const report = getSalaryHijackingTypesPackageReport();

  if (!report.ok) {
    throw new Error(
      `Salary Hijacking types package is incomplete: ${report.missing.join(", ")}`,
    );
  }
};

export const SALARY_HIJACKING_TYPES_IMPORT_EXAMPLE: SalaryHijackingTypesImportExample =
  Object.freeze({
    namespaceImport:
      "import { payrollDomain, userDomain } from '@salary-hijacking/types';",
    typeUsage:
      "type Plan = payrollDomain.PayrollPlan; type Me = userDomain.MeUser;",
    runtimeUsage:
      "const report = payrollDomain.getPayrollTypesCompletenessReport();",
  });

export const SALARY_HIJACKING_TYPES_PACKAGE_REPORT = Object.freeze(
  getSalaryHijackingTypesPackageReport(),
);

export const salaryHijackingTypes = Object.freeze({
  packageName: SALARY_HIJACKING_TYPES_PACKAGE,
  contractVersion: SALARY_HIJACKING_TYPES_CONTRACT_VERSION,
  platform: SALARY_HIJACKING_TYPES_PLATFORM,
  serviceNameKo: SALARY_HIJACKING_TYPES_SERVICE_NAME_KO,
  serviceNameEn: SALARY_HIJACKING_TYPES_SERVICE_NAME_EN,
  timezone: SALARY_HIJACKING_TYPES_TIMEZONE,
  locale: SALARY_HIJACKING_TYPES_LOCALE,
  currency: SALARY_HIJACKING_TYPES_CURRENCY,
  domainNames: SALARY_HIJACKING_TYPE_DOMAIN_NAMES,
  domainLabels: SALARY_HIJACKING_TYPE_DOMAIN_LABELS,
  domainModules: salaryHijackingDomainModules,
  expectedDomainExports: SALARY_HIJACKING_DOMAIN_CONTRACT_EXPORTS,
  completenessFunctionNames: SALARY_HIJACKING_DOMAIN_COMPLETENESS_FUNCTIONS,
  importExample: SALARY_HIJACKING_TYPES_IMPORT_EXAMPLE,
  packageReport: SALARY_HIJACKING_TYPES_PACKAGE_REPORT,
  getDomainExportReport: getSalaryHijackingDomainExportReport,
  getPackageReport: getSalaryHijackingTypesPackageReport,
  assertPackageCompleteness: assertSalaryHijackingTypesPackageCompleteness,
});

export default salaryHijackingTypes;
