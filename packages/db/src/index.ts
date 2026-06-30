/**
 * packages/db/src/index.ts
 * 급여납치 Salary Hijacking Platform · DB package public entrypoint.
 *
 * This file is the stable package boundary consumed by API, migrations, workers,
 * mobile/admin build-time contracts, and QA tooling. It aggregates the six
 * domain schema contracts without using wildcard re-exports that could collide
 * on shared type names such as DbColumnSpec or IdempotencyRecordStatus.
 */

import payrollSchema, {
  assertPayrollSchemaCompleteness,
  getPayrollSchemaCompletenessReport,
  payrollSchemaDdl,
  payrollSchemaTables,
  payrollSchemaIndexes,
  payrollSchemaPolicies,
} from "./schema/payroll.schema";
import usersSchema, {
  allUsersSchemaTables,
  assertUsersSchemaCompleteness,
  getUsersSchemaCompletenessReport,
  usersSchemaDdl,
  usersSchemaIndexes,
  usersSchemaPolicies,
  usersSchemaTablesInDdlOrder,
} from "./schema/users.schema";
import communitySchema, {
  assertCommunitySchemaCompleteness,
  communitySchemaDdl,
  communitySchemaIndexes,
  communitySchemaPolicies,
  communitySchemaTables,
  getCommunitySchemaCompletenessReport,
} from "./schema/community.schema";
import expensesSchema, {
  assertExpensesSchemaCompleteness,
  expensesSchemaDdl,
  expensesSchemaIndexes,
  expensesSchemaPolicies,
  expensesSchemaTables,
  expensesSchemaTablesInDdlOrder,
  getExpensesSchemaCompletenessReport,
} from "./schema/expenses.schema";
import growthSchema, {
  assertGrowthSchemaCompleteness,
  getGrowthSchemaCompletenessReport,
  growthSchemaDdl,
  growthSchemaIndexes,
  growthSchemaPolicies,
  growthSchemaTables,
  growthSchemaTablesInDdlOrder,
} from "./schema/growth.schema";
import notificationsSchema, {
  assertNotificationsSchemaCompleteness,
  getNotificationsSchemaCompletenessReport,
  notificationsSchemaDdl,
  notificationsSchemaIndexes,
  notificationsSchemaPolicies,
  notificationsSchemaTables,
} from "./schema/notifications.schema";

export * as payroll from "./schema/payroll.schema";
export * as users from "./schema/users.schema";
export * as community from "./schema/community.schema";
export * as expenses from "./schema/expenses.schema";
export * as growth from "./schema/growth.schema";
export * as notifications from "./schema/notifications.schema";

export { default as payrollSchema } from "./schema/payroll.schema";
export { default as usersSchema } from "./schema/users.schema";
export { default as communitySchema } from "./schema/community.schema";
export { default as expensesSchema } from "./schema/expenses.schema";
export { default as growthSchema } from "./schema/growth.schema";
export { default as notificationsSchema } from "./schema/notifications.schema";

export type DbSchemaDomainName =
  | "users"
  | "payroll"
  | "expenses"
  | "growth"
  | "community"
  | "notifications";

export interface DbSchemaCompletenessLike {
  readonly ok: boolean;
  readonly missing: readonly string[];
}

export interface DbDomainSchemaModule {
  readonly name: DbSchemaDomainName;
  readonly schema: unknown;
  readonly tables: readonly unknown[];
  readonly indexes: readonly unknown[];
  readonly policies: readonly unknown[];
  readonly ddl: {
    readonly extensions: readonly string[];
    readonly tables: readonly string[];
    readonly indexes: readonly string[];
    readonly rls: readonly string[];
    readonly policies: readonly string[];
  };
  readonly assertCompleteness: () => void;
  readonly getCompletenessReport: () => DbSchemaCompletenessLike;
}

export interface DbSchemaDomainCompletenessSummary {
  readonly name: DbSchemaDomainName;
  readonly ok: boolean;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly ddlStatementCount: number;
  readonly missing: readonly string[];
  readonly report: Record<string, unknown>;
}

export interface DbPackageCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: "2.0.0";
  readonly packageName: "@salary-hijacking/db";
  readonly schemaDomainCount: number;
  readonly tableCount: number;
  readonly indexCount: number;
  readonly policyCount: number;
  readonly ddlStatementCount: number;
  readonly domains: readonly DbSchemaDomainCompletenessSummary[];
  readonly missing: readonly string[];
}

export interface DbPackageDdlBundle {
  readonly extensions: readonly string[];
  readonly tables: readonly string[];
  readonly indexes: readonly string[];
  readonly rls: readonly string[];
  readonly policies: readonly string[];
  readonly all: readonly string[];
}

const uniq = (items: readonly string[]): readonly string[] => [
  ...new Set(items),
];

export const dbSchemaModules = [
  {
    name: "users",
    schema: usersSchema,
    tables: usersSchemaTablesInDdlOrder,
    indexes: usersSchemaIndexes,
    policies: usersSchemaPolicies,
    ddl: usersSchemaDdl,
    assertCompleteness: assertUsersSchemaCompleteness,
    getCompletenessReport: getUsersSchemaCompletenessReport,
  },
  {
    name: "payroll",
    schema: payrollSchema,
    tables: payrollSchemaTables,
    indexes: payrollSchemaIndexes,
    policies: payrollSchemaPolicies,
    ddl: payrollSchemaDdl,
    assertCompleteness: assertPayrollSchemaCompleteness,
    getCompletenessReport: getPayrollSchemaCompletenessReport,
  },
  {
    name: "expenses",
    schema: expensesSchema,
    tables: expensesSchemaTablesInDdlOrder,
    indexes: expensesSchemaIndexes,
    policies: expensesSchemaPolicies,
    ddl: expensesSchemaDdl,
    assertCompleteness: assertExpensesSchemaCompleteness,
    getCompletenessReport: getExpensesSchemaCompletenessReport,
  },
  {
    name: "growth",
    schema: growthSchema,
    tables: growthSchemaTablesInDdlOrder,
    indexes: growthSchemaIndexes,
    policies: growthSchemaPolicies,
    ddl: growthSchemaDdl,
    assertCompleteness: assertGrowthSchemaCompleteness,
    getCompletenessReport: getGrowthSchemaCompletenessReport,
  },
  {
    name: "community",
    schema: communitySchema,
    tables: communitySchemaTables,
    indexes: communitySchemaIndexes,
    policies: communitySchemaPolicies,
    ddl: communitySchemaDdl,
    assertCompleteness: assertCommunitySchemaCompleteness,
    getCompletenessReport: getCommunitySchemaCompletenessReport,
  },
  {
    name: "notifications",
    schema: notificationsSchema,
    tables: notificationsSchemaTables,
    indexes: notificationsSchemaIndexes,
    policies: notificationsSchemaPolicies,
    ddl: notificationsSchemaDdl,
    assertCompleteness: assertNotificationsSchemaCompleteness,
    getCompletenessReport: getNotificationsSchemaCompletenessReport,
  },
] as const satisfies readonly DbDomainSchemaModule[];

export const dbSchemaDomainNames = dbSchemaModules.map(
  (module) => module.name,
) as readonly DbSchemaDomainName[];

export const dbSchemas = Object.freeze({
  users: usersSchema,
  payroll: payrollSchema,
  expenses: expensesSchema,
  growth: growthSchema,
  community: communitySchema,
  notifications: notificationsSchema,
});

export const dbSchemaTables = Object.freeze({
  users: allUsersSchemaTables,
  payroll: payrollSchemaTables,
  expenses: expensesSchemaTables,
  growth: growthSchemaTables,
  community: communitySchemaTables,
  notifications: notificationsSchemaTables,
});

export const dbSchemaTablesInDdlOrder = Object.freeze({
  users: usersSchemaTablesInDdlOrder,
  payroll: payrollSchemaTables,
  expenses: expensesSchemaTablesInDdlOrder,
  growth: growthSchemaTablesInDdlOrder,
  community: communitySchemaTables,
  notifications: notificationsSchemaTables,
});

export const dbSchemaDdl = Object.freeze({
  extensions: uniq(dbSchemaModules.flatMap((module) => module.ddl.extensions)),
  tables: dbSchemaModules.flatMap((module) => module.ddl.tables),
  indexes: dbSchemaModules.flatMap((module) => module.ddl.indexes),
  rls: dbSchemaModules.flatMap((module) => module.ddl.rls),
  policies: dbSchemaModules.flatMap((module) => module.ddl.policies),
  get all(): readonly string[] {
    return [
      ...this.extensions,
      ...this.tables,
      ...this.indexes,
      ...this.rls,
      ...this.policies,
    ];
  },
}) satisfies DbPackageDdlBundle;

export const getDbPackageCompletenessReport =
  (): DbPackageCompletenessReport => {
    const domains = dbSchemaModules.map(
      (module): DbSchemaDomainCompletenessSummary => {
        const report = module.getCompletenessReport();
        return {
          name: module.name,
          ok: report.ok === true,
          tableCount: module.tables.length,
          indexCount: module.indexes.length,
          policyCount: module.policies.length,
          ddlStatementCount:
            module.ddl.extensions.length +
            module.ddl.tables.length +
            module.ddl.indexes.length +
            module.ddl.rls.length +
            module.ddl.policies.length,
          missing: report.missing,
          report: report as unknown as Record<string, unknown>,
        };
      },
    );

    const missing: string[] = [];
    const requiredDomains: readonly DbSchemaDomainName[] = [
      "users",
      "payroll",
      "expenses",
      "growth",
      "community",
      "notifications",
    ];
    const domainNames = new Set(dbSchemaModules.map((module) => module.name));

    for (const requiredDomain of requiredDomains) {
      if (!domainNames.has(requiredDomain))
        missing.push(`missing schema domain: ${requiredDomain}`);
    }

    for (const domain of domains) {
      if (!domain.ok)
        missing.push(
          ...domain.missing.map((item) => `${domain.name}: ${item}`),
        );
      if (domain.tableCount <= 0)
        missing.push(`${domain.name}: empty table export`);
      if (domain.indexCount <= 0)
        missing.push(`${domain.name}: empty index export`);
      if (domain.policyCount <= 0)
        missing.push(`${domain.name}: empty policy export`);
    }

    if (dbSchemaModules[0]?.name !== "users")
      missing.push("users schema must be first for shared FK dependencies");
    if (
      !dbSchemaDdl.extensions.includes(
        "create extension if not exists pgcrypto;",
      )
    )
      missing.push("missing pgcrypto extension DDL");

    return {
      ok: missing.length === 0,
      contractVersion: "2.0.0",
      packageName: "@salary-hijacking/db",
      schemaDomainCount: dbSchemaModules.length,
      tableCount: domains.reduce((sum, domain) => sum + domain.tableCount, 0),
      indexCount: domains.reduce((sum, domain) => sum + domain.indexCount, 0),
      policyCount: domains.reduce((sum, domain) => sum + domain.policyCount, 0),
      ddlStatementCount: dbSchemaDdl.all.length,
      domains,
      missing,
    };
  };

export const assertDbPackageCompleteness = (): void => {
  for (const module of dbSchemaModules) module.assertCompleteness();

  const report = getDbPackageCompletenessReport();
  if (!report.ok)
    throw new Error(
      `DB package schema entrypoint is incomplete: ${report.missing.join(", ")}`,
    );
};

assertDbPackageCompleteness();

export const dbPackage = Object.freeze({
  contractVersion: "2.0.0",
  packageName: "@salary-hijacking/db",
  schemas: dbSchemas,
  schemaModules: dbSchemaModules,
  domainNames: dbSchemaDomainNames,
  tables: dbSchemaTables,
  ddlTables: dbSchemaTablesInDdlOrder,
  ddl: dbSchemaDdl,
  getCompletenessReport: getDbPackageCompletenessReport,
  assertCompleteness: assertDbPackageCompleteness,
});

export default dbPackage;
