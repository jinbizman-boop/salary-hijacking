# GitHub Repository

This file defines the GitHub repository boundary for the Salary Hijacking
release target. It is intentionally separate from `infra/github/secrets.md`
because repository selection is a release safety rule, not a secret value.

## Release Repository Policy

The Salary Hijacking platform must use a new repository for production release
work. The default target is:

- Owner: `jinbizman-boop`
- Repository slug: `salary-hijacking`
- Full name: `jinbizman-boop/salary-hijacking`
- HTTPS remote: `https://github.com/jinbizman-boop/salary-hijacking.git`

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

Release readiness requires read-only GitHub connector evidence, GitHub CLI
evidence, or user-provided repository evidence proving that the new Salary
Hijacking repository exists and is the repository used by CI, deployment
workflows, GitHub Environments, branch protection, and release artifacts.

Latest repository target update on 2026-06-30:

- The user provided the newly created public repository URL:
  `https://github.com/jinbizman-boop/salary-hijacking.git`.
- The user also provided a GitHub Quick setup screenshot for
  `salary-hijacking`.
- Local Git `origin` is configured to the new Salary Hijacking repository.
- Authenticated `git push -u origin main` succeeds.
- `git ls-remote origin refs/heads/main` proves remote branch read access.
- `release/release-targets.json` is the canonical machine-readable release
  target manifest.

Do not use unrelated existing repositories as temporary launch targets.
