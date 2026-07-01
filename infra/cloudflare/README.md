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
| Admin Console | `salary-hijacking-admin`         | `apps/admin/wrangler.jsonc`            |

Staging and production names are defined in each `wrangler.toml` under
`[env.staging]` and `[env.production]`.

## Required Admin OpenNext Worker

The admin console is a Next.js application deployed as a Cloudflare Worker with
OpenNext output, not a Cloudflare Pages project. The canonical admin Worker is
`salary-hijacking-admin`; staging uses `salary-hijacking-admin-staging`.

The production admin domain is:

- `admin.salaryhijacking.com`

See `infra/cloudflare/pages/admin-pages.md` for the Admin OpenNext Worker build
contract.

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
corepack pnpm --filter @salary-hijacking/admin exec wrangler deploy --dry-run --env production --config wrangler.jsonc
```

The actual deployment command must use the intended environment:

```powershell
corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --env production --config wrangler.toml
corepack pnpm --filter @salary-hijacking/admin exec wrangler deploy --env production --config wrangler.jsonc
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
Salary Hijacking Workers, including the Admin OpenNext Worker, are not yet
proven in the connected account.

Latest read-only check on 2026-06-30:

- Workers list: empty.
- Pages projects: `retro-db` only. The current admin target is a Worker, but
  `retro-db` remains unrelated and must not be used as a Salary Hijacking
  deployment target.
