# Release

This directory records release targets, external evidence, store metadata, and
rollback plans for the Salary Hijacking platform.

The canonical release target manifest is:

- `release/release-targets.json`

The observed external-state evidence is:

- `release/external-release-evidence.json`

The observed mobile native build, native E2E, and store-submit evidence is:

- `release/mobile-native-evidence.json`

The observed runtime secret presence evidence is:

- `release/secrets-evidence.json`

The observed Cloudflare runtime resource evidence is:

- `release/cloudflare-runtime-evidence.json`

The observed database migration, seed, API smoke, and rollback evidence is:

- `release/database-evidence.json`

Current protected rule:

- Use the new Salary Hijacking repository
  `jinbizman-boop/salary-hijacking`.
- Do not modify or reuse existing unrelated resources such as `Retro Games`,
  `RETRO-DB`, `retro-db`, or the existing Retro Games Neon project.

Before public release, `check:release-readiness` must report `READY` with real
runtime secrets or verified no-value secret evidence, matching Cloudflare
Workers resources, Cloudflare R2/Queue/DNS/certificate/runtime binding proof,
matching Neon project evidence, migration validation, staging migration and seed
execution, production migration dry-run proof, deployed API/Admin smoke proof,
database rollback rehearsal proof, EAS project credentials, local Android device
tooling or equivalent EAS/native test evidence, deploy proof, mobile native
build and store-submit proof, and operating QA.
