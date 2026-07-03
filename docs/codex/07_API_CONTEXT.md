---
codex_context: true
priority: P0
scope: services packages/db database
applies_to:
  - services/**
  - packages/db/**
  - database/**
last_verified: 2026-07-03
---

# API And Service Context

## API Service

Path: `services/api`

Package: `@salary-hijacking/api`

Entrypoints:

- `src/app.ts`: route gateway and middleware chain.
- `src/index.ts`: Cloudflare Worker default export and worker events.

Current verification:

- `corepack pnpm --filter @salary-hijacking/api run typecheck:strict`: PASS on 2026-07-03.
- `corepack pnpm --filter @salary-hijacking/api run test`: PASS on 2026-07-03, 23 files and 45 tests.
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

Verified through 2026-07-03:

- Auth routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
  `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and related auth
  routes are implemented in `services/api/src/routes/auth.routes.ts`. As of
  2026-07-03, `services/api/src/repositories/auth.repository.ts` provides a
  Neon-backed runtime repository that `services/api/src/app.ts` selects when a
  supported database URL is present. It stores password hashes, refresh token
  hashes, OAuth state, email verification/password reset token hashes, and MFA
  code hashes without raw password/token/device/financial payloads. The
  in-memory fallback remains for local no-DB tests.
- `GET /api/v1/mobile/bootstrap`: implemented in `services/api/src/app.ts` and covered by `services/api/tests/mobile-bootstrap.test.ts`.
- `GET /api/v1/payroll/home`, `GET /api/v1/payroll/current`, `POST /api/v1/payroll/recalculate`: implemented in `services/api/src/routes/payroll.routes.ts` and aligned with the current mobile salary/plan screens.
- DB-backed payroll repository: `services/api/src/repositories/payroll.repository.ts` can create and query payroll plans through the `payroll_plans` migration table when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available.
- `GET /api/v1/daily-budgets/today`, `POST /api/v1/daily-budgets`, `POST /api/v1/daily-budgets/{budgetId}/spend`, `GET /api/v1/daily-budgets/summary`, and `GET /api/v1/daily-budgets/calendar`: implemented in `services/api/src/routes/daily-budgets.routes.ts` as the server-authoritative Salary Home daily budget surface.
- DB-backed daily budgets repository: `services/api/src/repositories/daily-budgets.repository.ts` can create, read, update, recalculate, summarize, and calendar daily budgets through the `daily_budgets` migration table. Its spend path writes to `variable_expenses` so the existing DB trigger recalculates daily budget balances. It keeps the existing in-memory fallback when no DB URL is available.
- DB-backed fixed expenses repository: `services/api/src/repositories/fixed-expenses.repository.ts` can list, create, update, pause, resume, end, delete, record payment, summarize, calendar, upcoming, and impact fixed expenses through the `fixed_expenses` migration table when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available and does not return internal `user_id` or `payroll_plan_id` values.
- `GET /api/v1/users/me/profile`: implemented in `services/api/src/routes/users.routes.ts` as the Expo profile screen payload alias. The response uses hash-only user identity and explicit false privacy flags.
- `POST /api/v1/users/me/privacy-export`: implemented in `services/api/src/routes/users.routes.ts` as the Expo profile privacy action alias. The response returns mobile profile payload privacy state without exposing raw financial, personal, or token data.
- `POST /api/v1/users/me/withdrawal-request`: implemented in `services/api/src/routes/users.routes.ts` as a request-only mobile profile action. It records/request-flags withdrawal intent without performing destructive final account withdrawal.
- `POST /api/v1/variable-expenses`: implemented in `services/api/src/routes/variable-expenses.routes.ts` as the server-authoritative mobile Salary Home quick-add target. The response keeps server-authority and privacy flags while omitting the internal owner `userId`.
- DB-backed variable expenses repository: `services/api/src/repositories/variable-expenses.repository.ts` can create records through the `daily_budgets` and `variable_expenses` migration tables when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available.
- `GET /api/v1/savings` and savings goal/transaction endpoints are implemented in `services/api/src/routes/savings.routes.ts` as the server-authoritative fixed savings and savings goal surface.
- DB-backed savings repository: `services/api/src/repositories/savings.repository.ts` can list, create, update, pause, resume, archive/delete, record transactions, summarize, calendar, upcoming, and impact savings through the `savings_plans` migration table when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available and does not return internal `user_id` or `payroll_plan_id` values.
- `GET /api/v1/growth/dashboard`, `GET /api/v1/growth/tasks`, and `POST /api/v1/growth/tasks/{taskId}/progress`: implemented in `services/api/src/routes/growth.routes.ts` as the server-authoritative LV UP mobile surface.
- DB-backed growth repository: `services/api/src/repositories/growth.repository.ts` can load LV UP dashboard/profile/task lists and record task progress through the `growth_tasks`, `growth_task_completions`, and `user_growth_stats` migration tables when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available and does not return internal raw `user_id` values.
- `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/{notificationId}/read`, and `POST /api/v1/notifications/read-all`: implemented in `services/api/src/routes/notifications.routes.ts` as the server-authoritative mobile notification surface.
- DB-backed notifications repository: `services/api/src/repositories/notifications.repository.ts` can list notifications, count unread notifications, mark one/all read, create server notifications, archive/delete notification records, register/revoke/list devices, and return privacy-safe preferences/rule previews through the `notifications` and `user_devices` migration tables when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available and does not return internal `user_id`, raw push token, or raw financial payload values.
- `GET /api/v1/community/posts`, `POST /api/v1/community/posts`, `GET /api/v1/community/posts/{postId}/comments`, and `POST /api/v1/community/posts/{postId}/comments`: implemented in `services/api/src/routes/community.routes.ts` and aligned with the current Expo community feed/write/detail/comments surfaces.
- DB-backed community repository: `services/api/src/repositories/community.repository.ts` can list boards/posts/comments and create/update/delete posts/comments/reports/reactions through the `community_*` migration tables when the Worker env has a supported database URL. It keeps the existing in-memory fallback when no DB URL is available.
- Public store review pages: `GET /`, `GET /privacy`, `GET /support`, and
  `GET /terms` are served by `services/api/src/app.ts` without bearer
  authentication and with CSP plus privacy/ads-safe response headers. Production
  API Worker config targets `salaryhijacking.com`, `www.salaryhijacking.com`,
  and `api.salaryhijacking.com`, but real DNS/TLS/deployment proof is still a
  release gate.
- Contract test: `services/api/tests/mobile-profile-contract.test.ts`.
- Variable expense contract test: `services/api/tests/mobile-variable-expense-contract.test.ts`.
- Variable expense DB repository test: `services/api/tests/variable-expenses-db-repository.test.ts`.
- Payroll DB repository test: `services/api/tests/payroll-db-repository.test.ts`.
- Mobile payroll repository injection contract test: `services/api/tests/mobile-payroll-contract.test.ts`.
- Daily budget DB repository test: `services/api/tests/daily-budgets-db-repository.test.ts`.
- Mobile daily budget repository injection contract test: `services/api/tests/mobile-daily-budget-contract.test.ts`.
- Fixed expense DB repository test: `services/api/tests/fixed-expenses-db-repository.test.ts`.
- Mobile fixed expense repository injection contract test: `services/api/tests/mobile-fixed-expense-contract.test.ts`.
- Savings DB repository test: `services/api/tests/savings-db-repository.test.ts`.
- Mobile savings repository injection contract test: `services/api/tests/mobile-savings-contract.test.ts`.
- Growth DB repository test: `services/api/tests/growth-db-repository.test.ts`.
- Mobile growth repository injection contract test: `services/api/tests/mobile-growth-contract.test.ts`.
- Notifications DB repository test: `services/api/tests/notifications-db-repository.test.ts`.
- Mobile notifications repository injection contract test: `services/api/tests/mobile-notifications-contract.test.ts`.
- Community DB repository test: `services/api/tests/community-db-repository.test.ts`.
- Mobile community repository injection contract test: `services/api/tests/mobile-community-contract.test.ts`.
- Manifest regression test: `services/api/tests/mobile-route-manifest-contract.test.ts`.
- Public legal page regression test: `services/api/tests/public-legal-pages.test.ts`.
- Auth DB repository test: `services/api/tests/auth-db-repository.test.ts`.

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
- `0005_auth_runtime.sql`

Seeds:

- `local.seed.sql`
- `staging.seed.sql`
- `uat.seed.sql`

DB client:

- `packages/db/src/client/neon.client.ts`

Before claiming DB readiness, run actual migration/seed validation against a safe local/staging DB.
