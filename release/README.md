# Release

This directory records release targets, external evidence, store metadata, and
rollback plans for the Salary Hijacking platform.

The canonical release target manifest is:

- `release/release-targets.json`

The observed external-state evidence is:

- `release/external-release-evidence.json`

The observed mobile native build, native E2E, and store-submit evidence is:

- `release/mobile-native-evidence.json`

Current protected rule:

- Use the new Salary Hijacking repository
  `jinbizman-boop/salary-hijacking`.
- Do not modify or reuse existing unrelated resources such as `Retro Games`,
  `RETRO-DB`, `retro-db`, or the existing Retro Games Neon project.

Before public release, `check:release-readiness` must report `READY` with real
runtime secrets, matching Cloudflare Workers resources, matching Neon project
evidence, EAS project credentials, local Android device tooling or equivalent
EAS/native test evidence, deploy proof, DB migration/seed proof, mobile native
build and store-submit proof, and operating QA.
