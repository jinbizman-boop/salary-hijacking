# DNS Records

This file defines the Salary Hijacking public domain target. It is a release
checklist and does not prove that DNS has already been delegated or propagated.

## Canonical Domain

- Root domain: `salaryhijacking.com`
- Marketing/app domain: `salaryhijacking.com`
- WWW alias: `www.salaryhijacking.com`
- API domain: `api.salaryhijacking.com`
- Admin domain: `admin.salaryhijacking.com`
- Notification service domain: `notifications.salaryhijacking.com`
- Scheduler service domain: `scheduler.salaryhijacking.com`

The previous planning domain `salary-hijacking.app` is not the release target
after the user provided `salaryhijacking.com` on 2026-06-30.

## Required Records

| Host                                | Type                 | Target                                  | Purpose                          |
| ----------------------------------- | -------------------- | --------------------------------------- | -------------------------------- |
| `salaryhijacking.com`               | Worker custom domain | `salary-hijacking-api` Worker           | public app/legal/support surface |
| `www.salaryhijacking.com`           | Worker custom domain | `salary-hijacking-api` Worker           | canonical public alias           |
| `api.salaryhijacking.com`           | Worker custom domain | `salary-hijacking-api` Worker           | `/api/v1` and `/admin/api/v1`    |
| `admin.salaryhijacking.com`         | Worker custom domain | `salary-hijacking-admin` Worker         | admin console                    |
| `notifications.salaryhijacking.com` | Custom domain        | `salary-hijacking-notifications` Worker | notification service             |
| `scheduler.salaryhijacking.com`     | Custom domain        | `salary-hijacking-scheduler` Worker     | scheduler service                |

## Verification Gate

Before public release, verify all of the following without committing secrets:

- Cloudflare zone for `salaryhijacking.com` exists in the intended account.
- Nameservers are delegated and DNSSEC status is known.
- `salaryhijacking.com`, `www.salaryhijacking.com`, and
  `api.salaryhijacking.com` route to the `salary-hijacking-api` Worker.
- `/`, `/privacy`, `/support`, and `/terms` return public Korean pages without
  exposing raw financial data, personal data, tokens, or secrets.
- Cloudflare Worker custom domain routes to `salary-hijacking-admin`.
- `retro-db`, `Retro Games`, and `RETRO-DB` resources are not reused.
- `corepack pnpm run check:release-readiness -- --soft` reports matching
  external evidence.
