---
codex_context: true
priority: P0
scope: services packages/db database
applies_to:
  - services/**
  - packages/db/**
  - database/**
last_verified: 2026-07-02
---

# API And Service Context

## API Service

Path: `services/api`

Package: `@salary-hijacking/api`

Entrypoints:

- `src/app.ts`: route gateway and middleware chain.
- `src/index.ts`: Cloudflare Worker default export and worker events.

Current verification:

- `corepack pnpm --filter @salary-hijacking/api run typecheck:strict`: PASS on 2026-07-02.
- `corepack pnpm --filter @salary-hijacking/api run test`: PASS on 2026-07-02, 7 files and 15 tests.
- `corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS on 2026-07-02.

## API Prefixes

- Auth: `/api/v1/auth`
- Admin auth: `/admin/auth`
- Admin API: `/admin/api/v1`
- Users: `/api/v1/users`
- Payroll: `/api/v1/payroll`
- Daily budgets: `/api/v1/daily-budgets`
- Fixed expenses: `/api/v1/fixed-expenses`
- Variable expenses: `/api/v1/variable-expenses`
- Savings: `/api/v1/savings`
- Notifications: `/api/v1/notifications`
- Growth: `/api/v1/growth`
- Community: `/api/v1/community`
- Uploads: `/api/v1/uploads`

## Route Modules

- `auth.routes.ts`
- `admin.routes.ts`
- `users.routes.ts`
- `payroll.routes.ts`
- `daily-budgets.routes.ts`
- `fixed-expenses.routes.ts`
- `variable-expenses.routes.ts`
- `savings.routes.ts`
- `notifications.routes.ts`
- `growth.routes.ts`
- `community.routes.ts`
- `uploads.routes.ts`

## Mobile API Compatibility Contracts

Verified on 2026-06-29:

- `GET /api/v1/mobile/bootstrap`: implemented in `services/api/src/app.ts` and covered by `services/api/tests/mobile-bootstrap.test.ts`.
- `GET /api/v1/payroll/home`, `GET /api/v1/payroll/current`, `POST /api/v1/payroll/recalculate`: implemented in `services/api/src/routes/payroll.routes.ts` and aligned with the current mobile salary/plan screens.
- `GET /api/v1/users/me/profile`: implemented in `services/api/src/routes/users.routes.ts` as the Expo profile screen payload alias. The response uses hash-only user identity and explicit false privacy flags.
- `POST /api/v1/users/me/privacy-export`: implemented in `services/api/src/routes/users.routes.ts` as the Expo profile privacy action alias. The response returns mobile profile payload privacy state without exposing raw financial, personal, or token data.
- `POST /api/v1/users/me/withdrawal-request`: implemented in `services/api/src/routes/users.routes.ts` as a request-only mobile profile action. It records/request-flags withdrawal intent without performing destructive final account withdrawal.
- `POST /api/v1/variable-expenses`: implemented in `services/api/src/routes/variable-expenses.routes.ts` as the server-authoritative mobile Salary Home quick-add target. The response keeps server-authority and privacy flags while omitting the internal owner `userId`.
- Public store review pages: `GET /`, `GET /privacy`, `GET /support`, and
  `GET /terms` are served by `services/api/src/app.ts` without bearer
  authentication and with CSP plus privacy/ads-safe response headers. Production
  API Worker config targets `salaryhijacking.com`, `www.salaryhijacking.com`,
  and `api.salaryhijacking.com`, but real DNS/TLS/deployment proof is still a
  release gate.
- Contract test: `services/api/tests/mobile-profile-contract.test.ts`.
- Variable expense contract test: `services/api/tests/mobile-variable-expense-contract.test.ts`.
- Manifest regression test: `services/api/tests/mobile-route-manifest-contract.test.ts`.
- Public legal page regression test: `services/api/tests/public-legal-pages.test.ts`.

## Persistence Warning

Many route modules and scheduler/notification helpers include `createInMemory...` repositories or defaults. Treat this as prototype/test/dry-run behavior unless a DB-backed repository is explicitly wired and verified.

## Notifications Service

Path: `services/notifications`

Package: `@salary-hijacking/notifications`

Files:

- `tsconfig.json`
- `src/index.ts`
- `src/fcm.client.ts`
- `src/retry-queue.ts`
- `src/push-token-cleanup.ts`

Manifest endpoints include health, ready, manifest, send, multicast, topic, condition, validate.

Current verification:

- `pnpm.cmd --filter @salary-hijacking/notifications typecheck`: PASS after adding `services/notifications/tsconfig.json`.
- `corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS on 2026-07-02.

## Scheduler Service

Path: `services/scheduler`

Package: `@salary-hijacking/scheduler`

Files:

- `tsconfig.json`
- `src/index.ts`
- `src/jobs/payday-reminder.job.ts`
- `src/jobs/fixed-expense-reminder.job.ts`
- `src/jobs/monthly-hijack-close.job.ts`
- `src/jobs/data-retention-cleanup.job.ts`

Manifest endpoints include health, ready, manifest, and scheduler job execution routes.

Current verification:

- `pnpm.cmd --filter @salary-hijacking/scheduler typecheck`: PASS after adding `services/scheduler/tsconfig.json`.
- `corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS on 2026-07-02.

## Admin OpenNext Worker Dry-Run Note

The Admin OpenNext Worker target is documented in `apps/admin/wrangler.jsonc`
and `infra/cloudflare/pages/admin-pages.md`, but Admin Worker dry-run requires
`apps/admin/.open-next/worker.js` from `corepack pnpm --filter
@salary-hijacking/admin run build:cloudflare`. On 2026-07-02 KST, this build
was blocked on the local Windows PC because Next standalone output requires
directory symlink permission. The repository now fails fast through
`scripts/release/check-opennext-windows-symlink.mjs`; use Windows Developer
Mode, an administrator shell, WSL, or CI before claiming Admin OpenNext dry-run
readiness.

## DB Context

Path: `database`, `packages/db`

Migrations:

- `0001_init_users.sql`
- `0002_payroll_budget_expense.sql`
- `0003_growth_community_notifications.sql`
- `0004_admin_audit_ads.sql`

Seeds:

- `local.seed.sql`
- `staging.seed.sql`
- `uat.seed.sql`

DB client:

- `packages/db/src/client/neon.client.ts`

Before claiming DB readiness, run actual migration/seed validation against a safe local/staging DB.
