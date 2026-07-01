# GitHub Secrets

This file lists the required GitHub Environment secret names for the Salary
Hijacking platform. It must never contain actual secret values.

## Storage Rule

Secrets must be stored in GitHub Environments, Cloudflare Worker secrets, Neon,
Expo/EAS, Sentry, Slack, or another approved provider secret store. Do not commit
values to `.env.example`, workflow files, Markdown, JSON evidence files, source
code, tests, logs, screenshots, or release notes.

## Repository Boundary

The Salary Hijacking release must use a new repository. The default target is
`jinbizman-boop/salary-hijacking-platform` unless the owner explicitly selects a
different new Salary Hijacking repository.

Existing repositories must not be modified or reused for this project. The
`Retro Games` repository is unrelated and must not receive Salary Hijacking
commits, secrets, workflow changes, branch protection changes, Cloudflare Workers
links, or release artifacts.

The observed `jinbizman-boop/RETRO-DB` repository is also unrelated and must not
receive Salary Hijacking commits, secrets, workflow changes, branch protection
changes, Cloudflare Worker links, or release artifacts.

Repository creation and branch protection are tracked in
`infra/github/repository.md`.

## Required Core Secrets

| Secret name             | Used by                             | Purpose                        |
| ----------------------- | ----------------------------------- | ------------------------------ |
| `CLOUDFLARE_ACCOUNT_ID` | API/Admin deploy workflows          | Cloudflare account scope       |
| `CLOUDFLARE_API_TOKEN`  | API/Admin deploy workflows          | Cloudflare deployment access   |
| `DATABASE_URL`          | API, DB migration gates             | Runtime Postgres connection    |
| `STAGING_DATABASE_URL`  | staging DB checks                   | Staging Postgres connection    |
| `NEON_API_KEY`          | release preflight and DB automation | Neon management access         |
| `NEON_PROJECT_ID`       | release preflight and DB automation | Expected Neon project target   |
| `EXPO_TOKEN`            | mobile build workflow               | Expo/EAS authentication        |
| `EAS_PROJECT_ID`        | mobile build workflow               | Expo project target            |
| `SENTRY_DSN`            | API/Admin/Mobile observability      | Error reporting endpoint       |
| `SLACK_WEBHOOK_URL`     | release notifications               | Deployment and QA notification |

## Additional Service Secrets

| Secret name                          | Used by           | Purpose                     |
| ------------------------------------ | ----------------- | --------------------------- |
| `JWT_SECRET`                         | API auth          | Token signing               |
| `AUTH_JWT_SECRET`                    | API auth          | Auth token signing override |
| `REFRESH_TOKEN_SECRET`               | API auth          | Refresh token signing       |
| `HASH_SECRET`                        | API/security      | Sensitive hash derivation   |
| `RATE_LIMIT_HASH_SECRET`             | API rate limiting | Rate-limit key hashing      |
| `AUDIT_HASH_SECRET`                  | audit logs        | Audit redaction hashing     |
| `OPERATION_WEBHOOK_TOKEN`            | API operations    | Internal operations webhook |
| `GOOGLE_SERVICE_ACCOUNT_JSON`        | notifications     | FCM service account         |
| `FCM_PROJECT_ID`                     | notifications     | Firebase project target     |
| `NOTIFICATIONS_SERVICE_TOKEN_SHA256` | notifications     | Service auth hash           |
| `SCHEDULER_SERVICE_TOKEN_SHA256`     | scheduler         | Scheduler auth hash         |
| `API_INTERNAL_SERVICE_TOKEN`         | scheduler         | Internal API access         |

## Public Variable Guard

Never create public variables with names that include private material:

- `NEXT_PUBLIC_*SECRET*`
- `NEXT_PUBLIC_*TOKEN*`
- `NEXT_PUBLIC_*DATABASE*`
- `NEXT_PUBLIC_*JWT*`
- `EXPO_PUBLIC_*SECRET*`
- `EXPO_PUBLIC_*TOKEN*`
- `EXPO_PUBLIC_*DATABASE*`
- `EXPO_PUBLIC_*JWT*`

Public client variables may contain non-sensitive API base URLs or feature flags
only.

## Verification

Run:

```powershell
corepack pnpm run check:external-integrations
corepack pnpm run check:release-readiness -- --soft
```

`check:external-integrations` validates that workflow files and infrastructure
docs reference required secret names without hard-coded secret values.
`check:release-readiness` verifies whether runtime secret evidence is present in
the current shell or release environment.
