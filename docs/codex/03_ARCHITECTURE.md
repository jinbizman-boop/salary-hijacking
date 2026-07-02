---
codex_context: true
priority: P0
scope: architecture
last_verified: 2026-06-29
---

# Architecture

## Monorepo

Root tooling:

- pnpm workspace
- Turbo task graph
- TypeScript
- Vitest/Jest/Playwright/Detox hooks by package
- Cloudflare Workers targets, including the Admin OpenNext Worker
- Expo/EAS mobile targets

## Applications

### Mobile

Path: `apps/mobile`

- Expo Router app.
- Main screens live in `apps/mobile/app`.
- Several route screens use runtime module loading and `React.createElement` style helpers.
- Feature module folders under `src/features/budget` and `src/features/community` now contain non-empty implementation/test files verified by mobile Jest suites.
- Detox E2E has a checked-in configuration and smoke spec; local Android SDK
  `adb`/`emulator` tools are detected, but native execution remains blocked
  until the Android E2E APK or equivalent no-secret device-farm proof is
  available.

### Admin

Path: `apps/admin`

- Next.js app.
- Admin pages currently use client-side manual DOM/HTML string rendering patterns.
- Main pages: gateway, login, dashboard, users, posts, reports, notices, banners, metrics, events.
- Typecheck currently passes.

## Services

### API

Path: `services/api`

- Cloudflare Worker style `fetch` entrypoint.
- `src/app.ts` owns route gateway/middleware composition.
- `src/index.ts` exports Worker handlers.
- Route modules cover auth, admin, users, payroll, daily budgets, fixed expenses, variable expenses, savings, notifications, growth, community, uploads.
- Many route modules expose in-memory repository defaults; DB-backed persistence must be verified or implemented before operational claims.

### Notifications

Path: `services/notifications`

- Cloudflare Worker entrypoint.
- FCM HTTP v1 client, retry queue, push token cleanup.
- Typecheck and build verification currently pass with the service-local Worker TypeScript config.

### Scheduler

Path: `services/scheduler`

- Cloudflare Worker cron/http/queue entrypoint.
- Jobs: payday reminder, fixed expense reminder, monthly hijack close, data retention cleanup.
- Uses API internal adapters when configured, otherwise dry-run/in-memory defaults.
- Typecheck and build verification currently pass with the service-local Worker TypeScript config.

## Database

Path: `database`

Migrations:

- `0001_init_users.sql`
- `0002_payroll_budget_expense.sql`
- `0003_growth_community_notifications.sql`
- `0004_admin_audit_ads.sql`

Seeds:

- `local.seed.sql`
- `staging.seed.sql`
- `uat.seed.sql`

DB package:

- `packages/db/src/client/neon.client.ts`
- schema modules for users, payroll, expenses, growth, community, notifications.

## CI And Operations

GitHub workflows:

- `ci.yml`
- `deploy-admin.yml`
- `deploy-api.yml`
- `mobile-build.yml`
- `release.yml`
- `security-scan.yml`

Local shell scripts under `scripts/` now provide conservative helper automation for environment checks, formatting/lint/test orchestration, repository tree generation, guarded DB migrate/seed entrypoints, and local release build summaries. They are validated by `pnpm run check:scripts`.
