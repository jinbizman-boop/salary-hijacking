# Cloudflare Infrastructure

This directory documents the Cloudflare release targets for the Salary Hijacking
platform. It is an operational checklist, not proof that the resources already
exist in the connected account.

## Required Workers

The release target requires these Workers:

| Service       | Worker name                      | Config                                 |
| ------------- | -------------------------------- | -------------------------------------- |
| API           | `salary-hijacking-api`           | `services/api/wrangler.toml`           |
| Notifications | `salary-hijacking-notifications` | `services/notifications/wrangler.toml` |
| Scheduler     | `salary-hijacking-scheduler`     | `services/scheduler/wrangler.toml`     |

Staging and production names are defined in each `wrangler.toml` under
`[env.staging]` and `[env.production]`.

## Required Pages Project

The admin console must deploy to the Cloudflare Pages project
`salary-hijacking-admin`.

The production admin domain is:

- `admin.salaryhijacking.com`

See `infra/cloudflare/pages/admin-pages.md` for the Pages build contract.

## Runtime Resources

The Cloudflare account must provide release resources for both staging and
production:

- R2 uploads bucket
- operations queue
- notification retry queue
- scheduler queue
- dead letter queue
- Worker cron triggers
- custom domains and certificates
- environment-scoped secrets

The queue and bucket names must match the environment-specific bindings in the
Worker configuration files.

## Deployment Gates

Before a real deployment, run local verification:

```powershell
corepack pnpm run quality
corepack pnpm run build
corepack pnpm run check:external-integrations
corepack pnpm run check:release-readiness -- --soft
```

Before production deployment, run a dry run for each Worker:

```powershell
corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --dry-run --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --dry-run --env production --config wrangler.toml
```

The actual deployment command must use the intended environment:

```powershell
corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --env production --config wrangler.toml
```

## Secret Policy

Do not commit secret values. Store Cloudflare tokens, database URLs, JWT secrets,
FCM credentials, webhook URLs, and service tokens in GitHub Environments,
Cloudflare Worker secrets, or the relevant provider secret store.

Public environment variables must not contain private keys, tokens, database
URLs, push tokens, service accounts, JWT secrets, or webhook URLs.

## Current Release Evidence

Read-only connector evidence is tracked in:

- `release/external-release-evidence.json`
- `docs/codex/14_EXTERNAL_RELEASE_EVIDENCE.md`

As of the latest snapshot, Cloudflare connector access is visible, but the
Salary Hijacking Workers and Pages project are not yet proven in the connected
account.

Latest read-only check on 2026-06-30:

- Workers list: empty.
- Pages projects: `retro-db` only.
- `retro-db` is unrelated and must not be used as a Salary Hijacking deployment
  target.
