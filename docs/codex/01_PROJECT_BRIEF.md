---
codex_context: true
priority: P0
scope: repository
last_verified: 2026-07-03
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

Verified on 2026-07-03 KST:

- Root package manager: `pnpm@10.0.0`.
- Node engine: `>=20.11.0 <25`.
- Root workspace globs: `apps/*`, `services/*`, `packages/*`, `tools/*`.
- Project quality and build pass in the latest verified run:
  `corepack pnpm run quality` passed 82 Turbo tasks and
  `corepack pnpm run build` passed 12 Turbo tasks.
- Mobile package typecheck, lint, format check, and Jest tests pass.
- Mobile Clean Fintech UI contract testing now explicitly guards the official
  BI logo, Freesentation fonts, five-tab IA, daily-budget screenshot anchor, and
  core Korean launch copy, including the server-first notifications API
  hydration contract, LV UP Growth API hydration contract, MY Profile API
  hydration contract, Community feed service hydration contract, Community
  write publish service contract, and Community detail/comments service
  hydration plus comment submission service contract.
- Mobile Jest currently reports 29 passing suites and 111 passing tests.
- API package tests currently report 22 passing files and 41 passing tests,
  including mobile bootstrap, mobile profile endpoint, mobile withdrawal request,
  mobile payroll route injection contract, mobile variable expense creation
  contract, DB-backed payroll, daily budget, fixed expense, variable expense,
  savings, growth, notifications, and community repository contracts, mobile
  fixed-expense/savings/growth/notifications/community route injection
  contracts, mobile route manifest contracts, and public `/`, `/privacy`,
  `/support`, `/terms` pages for store review URLs.
- Mobile Detox E2E configuration exists, and local `adb`/`emulator` are now
  detected through Android SDK tool lookup. Android execution is still blocked
  until the local E2E APK is built or equivalent native device-farm proof is
  recorded without secrets.
- Notifications and Scheduler service-local typecheck/build verification pass.
- Package-level `pnpm` warnings for Admin/API/Notifications/Scheduler were resolved by moving shared pnpm settings to the root `package.json`.
- Local scripts under `scripts/*` now provide conservative helper automation and pass `pnpm run check:scripts`.
- Current folder now has a local Git repository initialized and committed.
  `origin` points to the newly created Salary Hijacking repository
  `https://github.com/jinbizman-boop/salary-hijacking.git`.
- Authenticated `git push -u origin main` now succeeds, and
  `git ls-remote origin refs/heads/main` proves remote branch read access.
- User reported GitHub, Cloudflare, and Neon plugins/connectors are linked. Read-only connector checks now prove GitHub app installation, Cloudflare account access, and Neon organization access.
- The user provided the new Salary Hijacking GitHub repository URL and Quick
  setup screenshot. Connector checks prove a new Neon project named
  `salary-hijacking`, but do not yet prove the required Cloudflare Workers,
  including the Admin OpenNext Worker. Existing unrelated repositories, including
  `Retro Games` and `jinbizman-boop/RETRO-DB`, must not be modified or reused.
  See
  `docs/codex/14_EXTERNAL_RELEASE_EVIDENCE.md` and
  `release/release-targets.json`.
- Release readiness currently reports `PASS=156`, `BLOCKED=49`, `WARN=2`,
  `TOTAL=207`, or 75.4% by checked gate count. This is not production
  readiness because the blocked gates still include runtime secrets,
  Cloudflare resources, database smoke/rollback proof, public URL proof, and
  native mobile build/E2E/store-submit proof.
- Release readiness finds `git`, Cloudflare Wrangler, Cloudflare account
  evidence, Neon project evidence, and workspace-local EAS CLI evidence. The
  local `check:external-integrations` script currently warns only that `gh`,
  `neon`, and `neonctl` are not on PATH. Release readiness treats missing
  `gh`/Neon CLI as WARN when connector evidence proves account access.
  Workspace-local
  `apps/mobile/node_modules/.bin/eas.CMD` runs `eas-cli/20.4.0`. Android `adb`
  and `emulator` are detected through Android SDK lookup; local release remains
  blocked until the Detox E2E APK or equivalent native device-farm proof is
  recorded without secrets.

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

- remaining API-to-DB repository integration beyond the newly wired payroll,
  daily budget, fixed expense, variable expense, savings, growth,
  notifications, and community repository paths,
- remaining endpoint path alignment outside the verified mobile bootstrap/payroll/profile contracts,
- service-level build/runtime verification beyond typecheck,
- real mobile native E2E execution with Android SDK/emulator or iOS simulator,
- production-like API/Admin/mobile smoke against deployed environments,
- Bash/CI execution verification for the local operational scripts,
- matching remote Cloudflare Worker resources for the Salary Hijacking release target.
