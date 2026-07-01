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

The observed public app/legal URL reachability, header, and non-exposure
evidence is:

- `release/public-url-evidence.json`

No-secret local proof templates live in:

- `release/examples/secrets-proof.local.example.json`
- `release/examples/cloudflare-observation.local.example.json`
- `release/examples/mobile-native-observation.local.example.json`
- `release/examples/database-command-proof.local.example.json`
- `release/examples/public-url-proof.local.example.json`

Copy a template to the matching ignored `release/*.local.json` path only after
collecting proof from the correct provider console, CI run, or safe command.
Templates intentionally default to unverified/false values so copying them alone
cannot mark a release gate as ready.

Safe runtime secret evidence generation command:

- `corepack pnpm run release:secrets-evidence`

Before generating tracked evidence, runtime secret name presence can be
collected with:

- `corepack pnpm run release:secrets-proof`

The proof collector reads only runtime environment key presence and writes only
booleans to `release/secrets-proof.local.json`. To avoid treating a developer
machine as production evidence, it marks secrets verified only when
`SECRET_PROOF_STORE` is an approved store label such as `GitHub Environments`,
`GitHub Actions runtime`, `Cloudflare Worker secret`, `Neon`, `EAS secret store`,
or `provider secret store`. It never writes raw environment values.

The evidence command reads no committed secret values. If
`release/secrets-proof.local.json` exists, it may contain only secret-name
presence booleans, approved store names, and non-secret notes from provider
consoles or CI environment settings. That local proof file is ignored by Git and
must not contain raw database URLs, API tokens, DSNs, webhook URLs, private keys,
service accounts, or real user/financial payloads. Verified proof entries are
accepted only when their `stores` labels match the approved release evidence
store names; personal notes, copied chats, spreadsheets, or arbitrary labels are
not release proof.

Safe Cloudflare runtime evidence generation command:

- `corepack pnpm run release:cloudflare-evidence`

Before generating tracked evidence, read-only Cloudflare observations can be
normalized with:

- `corepack pnpm run release:cloudflare-proof`

The proof collector reads `release/cloudflare-observation.local.json` and writes
only booleans to `release/cloudflare-proof.local.json`. The local observation
file is ignored by Git and may contain only expected Worker names, resource
presence flags, observed Queue counts, expected hostnames, certificate status
flags, and non-secret notes. It must not contain Cloudflare credentials, Worker
script bodies, binding values, certificate material, private keys, API response
payloads, or copied provider logs.

The command creates or refreshes `release/cloudflare-runtime-evidence.json`
from release targets and optional `release/cloudflare-proof.local.json`
booleans. The local proof file is ignored by Git and may contain only Worker
names, resource presence flags, domain/certificate flags, and non-secret notes.
It must not contain Cloudflare tokens, Worker secret values, database URLs,
private keys, certificates, service accounts, or copied runtime payloads.

Safe mobile native evidence generation command:

- `corepack pnpm run release:mobile-native-evidence`

Before generating tracked evidence, mobile native build, E2E, and store-submit
observations can be normalized with:

- `corepack pnpm run release:mobile-native-proof`

The proof collector reads `release/mobile-native-observation.local.json` and
writes only booleans to `release/mobile-native-proof.local.json`. The local
observation file is ignored by Git and may contain only production build flags,
Android AAB artifact type, native E2E pass/fail flags, store-submit dry-run
flags, and non-secret notes. It must not contain EAS tokens, Apple/Google
credentials, binary download URLs, local artifact paths, signing keys, service
account JSON, reviewer passwords, copied store-console payloads, or logs.

For Android Detox runs, build or obtain an E2E APK, import it into the ignored
Detox binary path, then run native E2E:

- `corepack pnpm --filter @salary-hijacking/mobile run build:e2e:android`
- `corepack pnpm --filter @salary-hijacking/mobile run e2e:android:import-apk -- <local-apk-path>`
- `corepack pnpm --filter @salary-hijacking/mobile run test:e2e:android`

The import script accepts only local `.apk` files with an APK/ZIP header and
rejects artifact URLs or placeholder text files. It writes to
`apps/mobile/build/e2e/android/salary-hijacking-e2e.apk`, which remains ignored
by Git.

The command creates or refreshes `release/mobile-native-evidence.json` from
local Android tool detection and optional `release/mobile-native-proof.local.json`
booleans. Android tool detection checks PATH and common Android Studio SDK
locations, but detected `adb`/`emulator` tools are only execution prerequisites;
they are not native E2E proof. The local proof file is ignored by Git and may
contain only EAS build, native E2E, and store-submit dry-run booleans plus
non-secret notes. It must not contain EAS tokens, Apple/Google credentials,
binary download URLs, local artifact paths, signing keys, service accounts,
reviewer passwords, or copied store-console payloads.

Safe database evidence generation command:

- `corepack pnpm run release:database-evidence`

Before generating tracked evidence, database command proof can be normalized
with:

- `corepack pnpm run release:database-proof`

The proof collector reads `release/database-command-proof.local.json` and writes
only booleans to `release/database-proof.local.json`. The local command proof
file is ignored by Git and may contain only command success booleans, exit codes,
environment names, dry-run flags, synthetic-data flags, and non-secret notes.
It must not contain raw Neon URLs, passwords, tokens, copied SQL output, smoke
request or response bodies, raw request/response headers, authorization or
cookie values, emails, phone numbers, salary, expense, savings, hijack amounts,
account/card/loan data, push tokens, or device identifiers. Production seed
proof is always rejected.

The evidence command reads no committed database URL. If
`release/database-proof.local.json` exists, it may contain booleans and
non-secret notes from migration, seed, smoke, and rollback runs. That local proof
file is ignored by Git and must not contain raw Neon URLs, passwords, tokens, or
real user/financial payloads. The generator rejects raw database URLs, secret
values, raw smoke response/request payloads, raw auth/cookie/header fields, and
sensitive financial or user data keys before writing the tracked evidence file.

Safe public URL evidence generation command:

- `corepack pnpm run release:public-url-evidence`

Before generating tracked evidence, public URL proof can be collected with:

- `corepack pnpm run release:public-url-proof`

The proof collector requests `PUBLIC_APP_BASE_URL` or
`https://salaryhijacking.com` by default, checks `/`, `/privacy`, `/support`,
and `/terms`, and writes only booleans to
`release/public-url-proof.local.json`. It does not write copied HTML, raw
headers, logs, user identifiers, or financial payloads.

The evidence generator reads no runtime secret values. If
`release/public-url-proof.local.json` exists, it may contain only no-secret
booleans proving production reachability for `/`, `/privacy`, `/support`, and
`/terms`, CSP/privacy header checks, Korean public copy review, store review URL
alignment, and public-page sensitive data non-exposure. That local proof file is
ignored by Git and must not contain copied HTML, raw response bodies, raw
headers, logs, emails, phone numbers, salary, expense, savings, hijack amounts,
tokens, database URLs, or other sensitive payloads.

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
database rollback rehearsal proof, reachable public landing/privacy/support/
terms URLs with CSP/privacy header and sensitive-data non-exposure proof, EAS
project credentials, local Android device tooling or equivalent EAS/native test
evidence, deploy proof, mobile native build and store-submit proof, and
operating QA.
