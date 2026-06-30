# GitHub Repository

This file defines the GitHub repository boundary for the Salary Hijacking
release target. It is intentionally separate from `infra/github/secrets.md`
because repository selection is a release safety rule, not a secret value.

## Release Repository Policy

The Salary Hijacking platform must use a new repository for production release
work. The default target is:

- Owner: `jinbizman-boop`
- Repository slug: `salary-hijacking-platform`
- Full name: `jinbizman-boop/salary-hijacking-platform`

Existing repositories must not be modified, renamed, pushed to, configured with
secrets, connected to Cloudflare Pages, or used as deploy sources for Salary
Hijacking.

The `Retro Games` repository is unrelated to Salary Hijacking and must not be
touched for this project.

The observed `RETRO-DB` repository under `jinbizman-boop` is also unrelated to
Salary Hijacking and must not be touched for this project.

## Required Repository Setup

Before public release, create the new repository and configure:

- branch protection for `main`
- required status checks for CI, quality, tests, build, security scan, and E2E
- GitHub Environments for preview, staging, production, and release
- environment-scoped secrets using the names in `infra/github/secrets.md`
- protected deploy workflows for Cloudflare Workers, Cloudflare Pages, Neon DB
  gates, and Expo/EAS mobile builds
- release tags and release notes generated only after all readiness gates pass

## Verification

Release readiness remains blocked until read-only GitHub connector evidence or
GitHub CLI evidence proves that the new Salary Hijacking repository exists and
is the repository used by CI, deployment workflows, GitHub Environments, branch
protection, and release artifacts.

Latest read-only check on 2026-06-30:

- `jinbizman-boop/salary-hijacking-platform` returned 404 through the GitHub
  repository metadata lookup.
- GitHub repository search for `salary-hijacking-platform` under
  `jinbizman-boop` returned no repositories.
- The currently exposed GitHub connector actions do not include new repository
  creation.

Do not use unrelated existing repositories as temporary launch targets.
