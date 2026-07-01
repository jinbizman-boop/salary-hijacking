---
codex_context: true
priority: P0
scope: release-external-evidence
last_verified: 2026-07-01
---

# External Release Evidence

This document records read-only external connector evidence for release readiness.
It must not contain secret values, connection strings, tokens, private keys, service
account JSON, raw database URLs, or unrelated project details.

Machine-readable evidence lives in:

- `release/release-targets.json`
- `release/external-release-evidence.json`
- `release/mobile-native-evidence.json`
- `release/secrets-evidence.json`
- `release/cloudflare-runtime-evidence.json`
- `release/database-evidence.json`

## 2026-07-01 Connector Snapshot

Latest connector refresh: 2026-07-01 10:42:45 KST.
Latest production dry-run refresh: 2026-07-01 09:34:34 KST.

GitHub:

- GitHub app installation is visible for the user account.
- Salary Hijacking must use a newly created GitHub repository for this product.
- Canonical repository target: `jinbizman-boop/salary-hijacking`.
- HTTPS remote: `https://github.com/jinbizman-boop/salary-hijacking.git`.
- Existing repositories must not be modified or reused for this project.
- The existing `Retro Games` repository is unrelated and must not be touched.
- The observed `jinbizman-boop/RETRO-DB` repository is also unrelated and must
  not be touched.
- The user provided the new public GitHub repository URL and a GitHub Quick
  setup screenshot on 2026-06-30.
- The local folder now has Git metadata initialized and `origin` configured to
  `https://github.com/jinbizman-boop/salary-hijacking.git`.
- After GitHub Desktop was installed, authenticated `git push` succeeded.
- `git ls-remote origin refs/heads/main` proves remote branch read access at
  commit `49787368ccfd46973ca9a8566c1acfd1633447b5`.
- The current exposed GitHub connector tools can read/search repositories and
  create/update repository files, but no new-repository creation action is
  exposed in this Codex session.

Cloudflare:

- Cloudflare connector account access is visible.
- The read-only Workers list returned zero Workers again on
  2026-07-01 12:24:28 KST.
- The read-only Queues list returned zero Queues.
- The R2 bucket list endpoint returned Cloudflare error `10042`, indicating R2
  must be enabled through the Cloudflare Dashboard before bucket proof can be
  collected.
- The read-only Zones list did not observe `salaryhijacking.com`.
- The read-only Pages list returned `retro-db` only. That Pages project is
  unrelated and must not be reused for Salary Hijacking. The canonical admin
  console target is now an OpenNext Cloudflare Worker, not a Pages project.
- Required Salary Hijacking Workers are not observed:
  - `salary-hijacking-api`
  - `salary-hijacking-notifications`
  - `salary-hijacking-scheduler`
  - `salary-hijacking-admin`
- Required Salary Hijacking admin OpenNext Worker is not observed.
- Production Wrangler dry-run passed for:
  - `salary-hijacking-api-production`
  - `salary-hijacking-notifications-production`
  - `salary-hijacking-scheduler-production`
- Production custom-domain route patterns were corrected and dry-run verified
  as host-only custom domains:
  - `api.salaryhijacking.com`
  - `notifications.salaryhijacking.com`
  - `scheduler.salaryhijacking.com`
- Dry-run verification does not prove Worker resource creation, DNS readiness,
  runtime secrets, queues, R2 buckets, or successful production deployment.

Neon:

- Neon connector organization access is visible.
- A new Salary Hijacking Neon project is visible: `salary-hijacking`.
- Project ID: `still-feather-22153967`.
- Region: `aws-us-east-2`.
- Database name observed: `neondb`.
- Branches observed:
  - `main`: `br-icy-frog-aj3b1bl9`, primary, ready.
  - `staging`: `br-fragrant-sky-aj5kk2c3`, ready.
- The existing `Retro Games` Neon project is unrelated and must not be reused
  for Salary Hijacking.
- A Neon connection string was returned by the connector during project
  creation, but no connection string, password, token, or raw database URL is
  stored in this repository evidence.

## Release Interpretation

The connectors being linked is useful, but it does not by itself prove production
readiness. Release readiness requires both:

- connector or CLI access to the correct accounts, and
- matching project resources for the Salary Hijacking platform.

As of this snapshot, the GitHub repository target, local `origin`,
authenticated push access, and Neon project target are aligned. The release
status remains blocked by unverified entries in `release/secrets-evidence.json`,
Cloudflare Worker resource matching, unverified entries in
`release/cloudflare-runtime-evidence.json`, mobile native
build/E2E/store-submit evidence, unverified database migration/seed/API
smoke/rollback entries in `release/database-evidence.json`, deployment,
certificates, and operating QA.

## Update Rule

When external state changes, update `release/release-targets.json` only if the
canonical target changes, then update `release/external-release-evidence.json`
using read-only evidence first. Update `release/secrets-evidence.json` only with
verified secret names, stores, and booleans; do not paste secret values,
connection strings, tokens, private keys, service account JSON, raw database
URLs, DSNs, or webhook URLs. Update `release/cloudflare-runtime-evidence.json`
only with resource names, booleans, and non-secret proof notes for Workers, R2,
Queues, custom domains, TLS certificates, cron triggers, and Worker secret
binding presence. Update `release/database-evidence.json` only with booleans,
resource names, migration counts, and non-secret proof notes for safe migration
validation, staging migration, staging seed, production migration dry-run,
API/Admin smoke, privacy smoke, and rollback rehearsal. Never store raw Neon
database URLs, connection strings, passwords, tokens, or query payloads with
sensitive financial/user data. Then run:

```powershell
corepack pnpm run check:release-readiness -- --soft
corepack pnpm run test:root-scripts
```
