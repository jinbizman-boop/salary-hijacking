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

## 2026-07-01 Connector Snapshot

Latest connector refresh: 2026-07-01 09:24:02 KST.

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
  commit `5da0dada942ddfe4ca27adf5423e30b0e526b144`.
- The current exposed GitHub connector tools can read/search repositories and
  create/update repository files, but no new-repository creation action is
  exposed in this Codex session.

Cloudflare:

- Cloudflare connector account access is visible.
- The read-only Workers list returned zero Workers.
- The read-only Pages list returned `retro-db` only. That Pages project is
  unrelated and must not be reused for Salary Hijacking.
- Required Salary Hijacking Workers are not observed:
  - `salary-hijacking-api`
  - `salary-hijacking-notifications`
  - `salary-hijacking-scheduler`
- Required Salary Hijacking admin Pages project is not observed.

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
status remains blocked by runtime secrets, Cloudflare Workers/Pages project
matching, mobile native E2E setup, real DB migration/seed execution, deployment,
certificates, store builds, and operating QA.

## Update Rule

When external state changes, update `release/release-targets.json` only if the
canonical target changes, then update `release/external-release-evidence.json`
using read-only evidence first. Do not paste secrets. Then run:

```powershell
corepack pnpm run check:release-readiness -- --soft
corepack pnpm run test:root-scripts
```
