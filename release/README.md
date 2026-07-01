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

Safe runtime secret evidence generation command:

- `corepack pnpm run release:secrets-evidence`

The command reads no committed secret values. If
`release/secrets-proof.local.json` exists, it may contain only secret-name
presence booleans, approved store names, and non-secret notes from provider
consoles or CI environment settings. That local proof file is ignored by Git and
must not contain raw database URLs, API tokens, DSNs, webhook URLs, private keys,
service accounts, or real user/financial payloads.

Safe Cloudflare runtime evidence generation command:

- `corepack pnpm run release:cloudflare-evidence`

The command creates or refreshes `release/cloudflare-runtime-evidence.json`
from release targets and optional `release/cloudflare-proof.local.json`
booleans. The local proof file is ignored by Git and may contain only Worker
names, resource presence flags, domain/certificate flags, and non-secret notes.
It must not contain Cloudflare tokens, Worker secret values, database URLs,
private keys, certificates, service accounts, or copied runtime payloads.

Safe mobile native evidence generation command:

- `corepack pnpm run release:mobile-native-evidence`

The command creates or refreshes `release/mobile-native-evidence.json` from
local Android tool detection and optional `release/mobile-native-proof.local.json`
booleans. The local proof file is ignored by Git and may contain only EAS build,
native E2E, and store-submit dry-run booleans plus non-secret notes. It must not
contain EAS tokens, Apple/Google credentials, binary download URLs, signing keys,
service accounts, reviewer passwords, or copied store-console payloads.

Safe database evidence generation command:

- `corepack pnpm run release:database-evidence`

The command reads no committed database URL. If
`release/database-proof.local.json` exists, it may contain booleans and
non-secret notes from migration, seed, smoke, and rollback runs. That local proof
file is ignored by Git and must not contain raw Neon URLs, passwords, tokens, or
real user/financial payloads. The generator rejects raw database URLs, secret
values, raw smoke response/request payloads, and sensitive financial or user data
keys before writing the tracked evidence file.

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
