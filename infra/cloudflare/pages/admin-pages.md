# Admin OpenNext Worker

This file defines the Cloudflare Worker release contract for the Salary
Hijacking admin console. The path is retained for compatibility with existing
release checks, but the deployment target is no longer Cloudflare Pages.

## Worker

- Cloudflare Worker: `salary-hijacking-admin`
- Staging Worker: `salary-hijacking-admin-staging`
- Production domain: `admin.salaryhijacking.com`
- Staging domain: `staging-admin.salaryhijacking.com`
- Deployment adapter: OpenNext for Cloudflare Workers

## Build Contract

Build command:

```powershell
corepack pnpm --filter @salary-hijacking/admin run build:cloudflare
```

Output directory:

```text
apps/admin/.open-next
```

Required output:

```text
apps/admin/.open-next/worker.js
apps/admin/.open-next/assets
```

Deployment command:

```powershell
corepack pnpm --filter @salary-hijacking/admin exec wrangler deploy --env production --config wrangler.jsonc
```

The admin app uses `apps/admin/wrangler.jsonc` with `main` set to
`.open-next/worker.js`, assets set to `.open-next/assets`, `nodejs_compat`
enabled, and observability enabled.

`apps/admin/open-next.config.ts` must keep `buildCommand:
"corepack pnpm run build"` so OpenNext uses the repository-pinned pnpm version
instead of a globally installed pnpm.

## Required Worker Settings

The Cloudflare Worker must be connected to the expected Salary Hijacking GitHub
repository and deployment workflow before production release. The release
operator must verify:

- the GitHub repository points to `jinbizman-boop/salary-hijacking`;
- staging deployments use the `staging` Worker environment;
- production deployments use the `production` Worker environment;
- environment variables are scoped by staging and production;
- no secret value is committed to this repository;
- the production custom domain has a valid certificate;
- `admin.salaryhijacking.com` routes to `salary-hijacking-admin`.

## Required Secrets

The Worker build and runtime may reference secret names, but their values must
live in GitHub Environments, Cloudflare Worker secrets, or provider secret
stores.

Required names include:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `NEXT_PUBLIC_API_BASE_URL`
- `SENTRY_DSN`

Sensitive values such as database URLs, JWT secrets, private keys, service
accounts, and webhook URLs must not be exposed through `NEXT_PUBLIC_*` names.

## Deployment Checks

Before publishing the admin console:

```powershell
corepack pnpm run quality
corepack pnpm run build
corepack pnpm --filter @salary-hijacking/admin run build:cloudflare
corepack pnpm --filter @salary-hijacking/admin exec wrangler deploy --dry-run --env production --config wrangler.jsonc
corepack pnpm run check:release-readiness -- --soft
```

Then run the Admin Worker deployment workflow or an equivalent Wrangler deploy
command from the correct environment. Do not treat a successful local build or
dry run as a production deployment.

On this Windows company PC, `opennextjs-cloudflare build` reaches the Next.js
standalone tracing phase only when run outside the Codex filesystem sandbox, then
fails because Windows blocks symlink creation for `.next/standalone`. The same
contract still needs a Linux CI, WSL, or Windows Developer Mode environment for
full OpenNext output verification.
