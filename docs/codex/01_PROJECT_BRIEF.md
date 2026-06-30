---
codex_context: true
priority: P0
scope: repository
last_verified: 2026-06-30
---

# Project Brief

## Product

Salary Hijacking is a Korean mobile-first personal finance and self-development platform. The core question is: "How much of this paycheck did the user protect?"

The platform combines:

- payroll planning,
- fixed expenses,
- variable expenses,
- daily budgets,
- savings goals,
- notifications,
- LV UP/self-development,
- anonymous community,
- uploads,
- ads/partner operations,
- admin console,
- audit/security/operations.

## Repository Shape

This is a pnpm/Turbo monorepo.

Top-level areas:

- `apps/mobile`: Expo/React Native mobile app.
- `apps/admin`: Next.js admin console.
- `services/api`: Cloudflare Worker API gateway.
- `services/notifications`: Cloudflare Worker notification/FCM service.
- `services/scheduler`: Cloudflare Worker scheduler/cron/queue service.
- `packages/api-contract`: API contract package.
- `packages/db`: DB schema/client/migration helpers.
- `packages/security`, `packages/types`, `packages/ui`, `packages/utils`, `packages/config`: shared packages.
- `database`: SQL migrations and seed data.
- `docs`, `qa`, `ops`, `release`, `security`, `infra`: product, QA, operation, security, release, infrastructure documents.

## Current Verified State

Verified on 2026-06-30 KST:

- Root package manager: `pnpm@10.0.0`.
- Node engine: `>=20.11.0 <25`.
- Root workspace globs: `apps/*`, `services/*`, `packages/*`, `tools/*`.
- Project quality and build pass in the latest verified run.
- Mobile package typecheck, lint, format check, and Jest tests pass.
- Mobile Jest currently reports 24 passing suites and 78 passing tests.
- API package tests currently report 5 passing files and 10 passing tests, including mobile bootstrap, mobile profile endpoint, mobile withdrawal request, and mobile route manifest contracts.
- Mobile Detox E2E configuration exists, but Android execution is blocked on this PC because `ANDROID_SDK_ROOT`, `ANDROID_HOME`, `adb`, and `emulator` are unavailable.
- Notifications and Scheduler service-local typecheck/build verification pass.
- Package-level `pnpm` warnings for Admin/API/Notifications/Scheduler were resolved by moving shared pnpm settings to the root `package.json`.
- Local scripts under `scripts/*` now provide conservative helper automation and pass `pnpm run check:scripts`.
- Current folder now has a local Git repository initialized. `git status --short`
  runs, but all files are currently untracked and no remote is configured.
- User reported GitHub, Cloudflare, and Neon plugins/connectors are linked. Read-only connector checks now prove GitHub app installation, Cloudflare account access, and Neon organization access.
- Connector checks do not yet prove the newly required Salary Hijacking GitHub
  repository, Cloudflare Workers/Pages resources, or Neon project. Existing
  unrelated repositories, including `Retro Games` and `jinbizman-boop/RETRO-DB`,
  must not be modified or reused. See
  `docs/codex/14_EXTERNAL_RELEASE_EVIDENCE.md` and
  `release/external-release-evidence.json`.
- Local CLI preflight finds `git` and `wrangler`. `gh` and Neon CLI are not
  available in this PowerShell PATH, but release readiness now treats them as
  WARN when connector evidence proves account access. EAS CLI, `adb`, and
  `emulator` remain blocking local release tools.

## Product Maturity Read

The project is strongest in:

- product/domain documentation,
- DB schema and migration design,
- privacy/security intent,
- broad API route coverage,
- admin/mobile screen coverage,
- mobile API/auth route hardening,
- mobile budget/community feature tests,
- workspace build/typecheck/lint/test/quality verification.

The project still needs hardening in:

- API-to-DB repository integration,
- remaining endpoint path alignment outside the verified mobile bootstrap/payroll/profile contracts,
- service-level build/runtime verification beyond typecheck,
- real mobile native E2E execution with Android SDK/emulator or iOS simulator,
- production-like API/Admin/mobile smoke against deployed environments,
- Bash/CI execution verification for the local operational scripts,
- Git/change tracking.
- matching remote GitHub/Cloudflare/Neon resources for the Salary Hijacking release target.
