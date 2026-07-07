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

## Required Public App Domains

The app launch metadata uses `https://salaryhijacking.com` for marketing and
`https://salaryhijacking.com/privacy` and
`https://salaryhijacking.com/support` for store review. Production therefore
routes these host-only custom domains to the API Worker:

- `salaryhijacking.com`
- `www.salaryhijacking.com`
- `api.salaryhijacking.com`

The API Worker serves the public Korean `/` landing page plus `/privacy`,
`/support`, and `/terms` pages without bearer authentication and without
exposing raw financial data, personal data, tokens, or secret values. This
document defines the target only; Cloudflare zone, DNS, Worker deployment,
custom-domain ownership, and TLS certificate proof remain release gates.

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
- public app, API, notification, scheduler, and admin custom domains and
  certificates
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

For Cloudflare connected-repository deployments that execute from the monorepo
root, do not use `npx wrangler deploy` or a single root `wrangler deploy`.
There is no root Worker config, and each runtime Worker has its own
`wrangler.toml`. Configure each connected Worker build with the matching
Worker-specific deploy command:

```sh
pnpm run deploy:cloudflare-api
pnpm run deploy:cloudflare-notifications
pnpm run deploy:cloudflare-scheduler
```

The matching no-write validation commands are:

```sh
pnpm run deploy:cloudflare-api:dry-run
pnpm run deploy:cloudflare-notifications:dry-run
pnpm run deploy:cloudflare-scheduler:dry-run
```

For a neutral CI runner or local operator that intentionally deploys all three
runtime Workers, the aggregate command is:

```sh
pnpm run deploy:cloudflare-workers
```

The aggregate script delegates to:

```powershell
corepack pnpm --filter @salary-hijacking/api run deploy:production
corepack pnpm --filter @salary-hijacking/notifications run deploy:production
corepack pnpm --filter @salary-hijacking/scheduler run deploy:production
```

Admin OpenNext dry-run requires a successful local OpenNext build first:

```powershell
corepack pnpm --filter @salary-hijacking/admin run build:cloudflare
```

On Windows, this build requires directory symlink permission because OpenNext
enables Next.js standalone output. Use Windows Developer Mode, an administrator
shell, WSL, or CI if
`scripts/release/check-opennext-windows-symlink.mjs` blocks the build.

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
- `release/cloudflare-runtime-evidence.json`
- `docs/codex/14_EXTERNAL_RELEASE_EVIDENCE.md`

When an operator has verified Cloudflare resource presence in the dashboard,
connector, or Wrangler output, record only names and booleans in
`release/cloudflare-observation.local.json`, run
`corepack pnpm run release:cloudflare-proof`, then run
`corepack pnpm run release:cloudflare-evidence`. The local observation and proof
files are ignored by Git and must not contain Cloudflare tokens, Worker secret
values, database URLs, private keys, certificate materials, service account
JSON, or copied request/response payloads. If the observation file is absent,
the proof collector writes blocked no-secret proof with all runtime booleans
false; that is useful for automation continuity but does not prove runtime
readiness.

As of the latest snapshot, Cloudflare connector access is visible, but the
Salary Hijacking Workers, including the Admin OpenNext Worker, R2 buckets,
Queues, custom domains, TLS certificates, cron triggers, and Worker secret
bindings are not yet proven in the connected account.

Latest read-only check on 2026-07-02 14:30:22 KST:

- Workers list: empty.
- Queues list: empty.
- R2 bucket list: blocked by Cloudflare error `10042`, indicating R2 must be
  enabled through the Cloudflare Dashboard before bucket proof can be collected.
- Zones list: `salaryhijacking.com` was not observed.
- Pages projects: `retro-db` only. The current admin target is a Worker, but
  `retro-db` remains unrelated and must not be used as a Salary Hijacking
  deployment target.
