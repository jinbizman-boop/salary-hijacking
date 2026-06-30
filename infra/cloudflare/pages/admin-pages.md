# Admin Pages

This file defines the Cloudflare Pages release contract for the Salary Hijacking
admin console.

## Project

- Cloudflare Pages project: `salary-hijacking-admin`
- Production domain: `admin.salary-hijacking.app`
- Staging domain: `staging-admin.salary-hijacking.app`
- Preview branch: `staging`
- Production branch: `main`

## Build Contract

Build command:

```powershell
corepack pnpm --filter @salary-hijacking/admin run build
```

Output directory:

```text
apps/admin/.next
```

The project currently builds as a Next.js admin console. Cloudflare Pages
deployment must use the repository's verified build output and must not bypass
the root quality gates.

## Required Pages Settings

The Pages project must be connected to the expected Salary Hijacking GitHub
repository before production release. The release operator must verify:

- the GitHub repository points to `salary-hijacking-platform`;
- preview deployments run from non-production branches;
- production deployments run from `main`;
- environment variables are scoped by preview, staging, and production;
- no secret value is committed to this repository;
- the production custom domain has a valid certificate.

## Required Secrets

Pages builds may reference secret names, but their values must live in GitHub
Environments, Cloudflare Pages environment variables, or provider secret stores.

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
corepack pnpm run check:release-readiness -- --soft
```

Then run the Pages deployment workflow or an equivalent Cloudflare Pages deploy
command from the correct environment. Do not treat a successful local build as a
production deployment.
