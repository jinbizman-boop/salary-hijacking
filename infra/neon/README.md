# Neon Infrastructure

This directory defines the operational guardrails for Neon Serverless Postgres in the
Salary Hijacking workspace. The canonical GitHub repository target is
`jinbizman-boop/salary-hijacking`.

## Scope

- Runtime database: Neon Postgres.
- Serverless runtime: Cloudflare Workers.
- Database client: `packages/db/src/client/neon.client.ts`.
- Schema source: `database/migrations/*.sql`.
- Non-production seed data: `database/seeds/local.seed.sql`,
  `database/seeds/staging.seed.sql`, and `database/seeds/uat.seed.sql`.

## Environment Variables

The application may read the following secret names, but their values must never be
committed, logged, echoed in CI, or included in API responses.

| Name                            | Purpose                                    | Storage                          |
| ------------------------------- | ------------------------------------------ | -------------------------------- |
| `DATABASE_URL`                  | Default runtime Postgres connection string | GitHub/Cloudflare/hosting secret |
| `SALARY_HIJACKING_DATABASE_URL` | Project-specific runtime override          | GitHub/Cloudflare/hosting secret |
| `NEON_DATABASE_URL`             | Neon runtime connection string fallback    | GitHub/Cloudflare/hosting secret |
| `DIRECT_DATABASE_URL`           | Direct migration connection string         | CI or operator secret only       |
| `STAGING_DATABASE_URL`          | Staging database connection string         | CI or staging secret             |
| `UAT_DATABASE_URL`              | UAT database connection string             | CI or UAT secret                 |
| `SHADOW_DATABASE_URL`           | Migration validation database              | CI secret only                   |

## Connection Policy

- Cloudflare Workers and other serverless runtimes must prefer pooled Neon
  connections.
- The runtime client must mask connection strings and database errors before logging
  or returning errors to callers.
- API handlers remain server-authoritative for payroll, budget, expenses, savings,
  and hijack amount calculations.
- Mobile and admin clients must never receive raw database credentials.

## Migration Policy

Apply migrations in this order:

1. `database/migrations/0001_init_users.sql`
2. `database/migrations/0002_payroll_budget_expense.sql`
3. `database/migrations/0003_growth_community_notifications.sql`
4. `database/migrations/0004_admin_audit_ads.sql`

Production migration execution requires an explicit operator-controlled workflow.
Local automation must not run production migrations by default.

## Seed Policy

- `local.seed.sql` is for local development only.
- `staging.seed.sql` is for staging or preview validation only.
- `uat.seed.sql` is for UAT validation only.
- No seed file may contain real personal, salary, account, card, loan, push token, or
  device identifier data.

## Related Documents

- `infra/neon/connection-pooling.md`
- `infra/neon/branching-strategy.md`
- `infra/neon/backup-restore.md`
- `database/README.md`
- `docs/codex/05_PRIVACY_ADS_SECURITY.md`
- `docs/codex/07_API_CONTEXT.md`

## Current Release Evidence

Latest read-only connector check on 2026-06-30:

- Visible Neon organization: `매니지먼트`.
- Visible project: `Retro Games`.
- Searches for `salary` and `hijacking` returned no matching Neon projects.
- The existing `Retro Games` project is unrelated and must not be used for
  Salary Hijacking.
