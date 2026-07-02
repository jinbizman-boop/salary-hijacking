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
- `release/public-url-evidence.json`
- `release/security-audit-evidence.json`

No-secret local proof examples live in:

- `release/examples/secrets-proof.local.example.json`
- `release/examples/cloudflare-observation.local.example.json`
- `release/examples/mobile-native-observation.local.example.json`
- `release/examples/database-command-proof.local.example.json`
- `release/examples/public-url-proof.local.example.json`
- `release/examples/security-audit-proof.local.example.json`

These templates intentionally default to unverified/false values. Copying a
template into an ignored `release/*.local.json` path must not be treated as
proof until the values are backed by provider console, CI, or safe command
evidence.

## 2026-07-01 Connector Snapshot

Latest connector refresh: 2026-07-01 13:36:54 KST.
Latest Git remote verification refresh: 2026-07-01 14:35:42 KST.
Latest production dry-run refresh: 2026-07-01 09:34:34 KST.
Latest read-only spot check: 2026-07-01 17:12:13 KST.
Latest public URL live proof check: 2026-07-02 12:27:18 KST.
Latest Cloudflare runtime read-only proof check: 2026-07-02 12:33:42 KST.
Latest Neon read-only project proof check: 2026-07-02 12:40:45 KST.
Latest local-safe DB validation proof check: 2026-07-02 KST.

GitHub:

- GitHub app installation is visible for the `jinbizman-boop` user account.
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
- `git ls-remote origin refs/heads/main` proved remote branch read access at
  the last Git remote evidence refresh commit
  `a49d96720586f3c84eb056b868350578f467dad6`. Future commits must be checked
  with `git ls-remote`; this recorded evidence is historical and does not
  self-update.
- `corepack pnpm run check:release-readiness -- --soft` now compares
  `git rev-parse HEAD` with `git ls-remote origin refs/heads/main` whenever
  authenticated push proof is claimed, so a committed but unpushed local HEAD
  blocks release readiness instead of relying on the historical proof commit.
  If live remote reads are unavailable inside the local Node sandbox, the
  preflight falls back to `refs/remotes/origin/main` and records a warning
  rather than treating the historical proof commit as current evidence.
- The current exposed GitHub connector tools can read/search repositories and
  create/update repository files, but no new-repository creation action is
  exposed in this Codex session.

Cloudflare:

- Cloudflare connector account access is visible.
- The read-only Workers list returned zero Workers again on
  2026-07-01 13:36:54 KST.
- A later read-only spot check on 2026-07-01 17:12:13 KST also returned zero
  Workers and zero Queues.
- A read-only Cloudflare runtime proof check on 2026-07-02 12:33:42 KST again
  observed zero Workers, zero Queues, no `salaryhijacking.com` zone, no Salary
  Hijacking Pages project, and no active TLS certificate proof for the expected
  Salary Hijacking hostnames.
- The read-only Queues list returned zero Queues.
- The R2 bucket list endpoint returned Cloudflare error `10042`, indicating R2
  must be enabled through the Cloudflare Dashboard before bucket proof can be
  collected.
- The read-only Zones list observed `retrogames.kr` only and did not observe
  `salaryhijacking.com`.
- The read-only Pages list returned `retro-db` only. That Pages project is
  unrelated and must not be reused for Salary Hijacking. The canonical admin
  console target is now an OpenNext Cloudflare Worker, not a Pages project.
- The later Pages spot check on 2026-07-01 17:12:13 KST also observed only the
  unrelated `retro-db` Pages project.
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
- Admin OpenNext local Cloudflare build/dry-run is not proven on this Windows
  PC. On 2026-07-02 KST, `corepack pnpm --filter @salary-hijacking/admin run
build:cloudflare` failed fast at the repository preflight because OpenNext
  sets Next standalone output and this shell cannot create Windows directory
  symlinks. Run the Admin OpenNext build and Worker dry-run from Windows
  Developer Mode, an administrator shell, WSL, or CI before claiming Admin
  Worker dry-run readiness.
- Production custom-domain route patterns were corrected and dry-run verified
  as host-only custom domains:
  - `salaryhijacking.com`
  - `www.salaryhijacking.com`
  - `api.salaryhijacking.com`
  - `notifications.salaryhijacking.com`
  - `scheduler.salaryhijacking.com`
- The API Worker production dry-run passed after adding `salaryhijacking.com`
  and `www.salaryhijacking.com` as the public app/legal surface for `/`,
  `/privacy`, `/support`, and `/terms`. This is configuration validation, not
  proof that Cloudflare DNS, custom-domain ownership, TLS, or production URL
  reachability has been verified.
- Dry-run verification does not prove Worker resource creation, DNS readiness,
  runtime secrets, queues, R2 buckets, or successful production deployment.
- A live no-secret public URL proof check on 2026-07-02 12:27:18 KST recorded
  `false` booleans for landing, privacy, support, and terms reachability, CSP
  and privacy header proof, Korean copy, store-review URL alignment, and
  sensitive-data non-exposure. The ignored local proof file does not store raw
  HTML, response headers, logs, user identifiers, financial payloads, tokens, or
  database URLs. This keeps public URL readiness blocked until the production
  public pages are actually reachable through `salaryhijacking.com`.

Neon:

- Neon connector organization access is visible.
- A new Salary Hijacking Neon project is visible: `salary-hijacking`.
- A later read-only Neon project search/fetch/compute check on 2026-07-01
  17:12 KST still observed the `salary-hijacking` project, ready `main` and
  `staging` branches, and read-write compute presence for both branches. Compute
  hosts and connection strings are intentionally not stored in this repository
  evidence.
- A read-only Neon project search/fetch/compute check on 2026-07-02 12:40:45
  KST again observed the `salary-hijacking` project, ready `main` and `staging`
  branches, and read-write compute presence for both branches. Compute hosts,
  connection strings, passwords, tokens, SQL output, and database URLs are
  intentionally not stored in this repository evidence.
- `corepack pnpm run db:validate` passed on 2026-07-02 KST as local-safe
  migration validation evidence for the checked-in DB package/schema/DDL bundle.
  This stores no database URL, SQL output, secret, or smoke payload, and it does
  not prove staging migration execution, production migration dry-run, staging
  seed, deployed API/Admin smoke, privacy smoke, or rollback rehearsal.
- Project ID: `still-feather-22153967`.
- Region: `aws-us-east-2`.
- PostgreSQL version: `17`.
- Database name observed: `neondb`.
- Branches observed:
  - `main`: `br-icy-frog-aj3b1bl9`, primary, ready.
  - `staging`: `br-fragrant-sky-aj5kk2c3`, ready.
- Two read-write compute endpoints are visible for the main and staging
  branches, but endpoint hosts and connection strings are not stored in the
  repository evidence.
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
authenticated push access, current HEAD to `origin/main` sync, and Neon project
target are aligned. The release status remains blocked by unverified entries in
`release/secrets-evidence.json`,
Cloudflare Worker resource matching, unverified entries in
`release/cloudflare-runtime-evidence.json`, mobile native
build/E2E/store-submit evidence, unverified database migration/seed/API
smoke/rollback entries in `release/database-evidence.json`, except for the
local-safe DB migration validation gate now recorded from `corepack pnpm run
db:validate`, deployment,
certificates, unverified public landing/privacy/support/terms reachability and
header/content safety entries in `release/public-url-evidence.json`, Android/iOS
native build/E2E/store-submit evidence, and operating QA. The dependency
security audit evidence in `release/security-audit-evidence.json` now proves
pnpm registry audit coverage and zero low/moderate/high/critical vulnerability
counts for the current lockfile, but it must be regenerated after any dependency
or lockfile change before release.

## Update Rule

When external state changes, update `release/release-targets.json` only if the
canonical target changes, then update `release/external-release-evidence.json`
using read-only evidence first. The tracked external evidence file may contain
only provider/resource names, booleans, counts, timestamps, commit IDs, public
target URLs, and non-secret notes; release readiness blocks it when raw token,
password, private key, connection string, database URL, DSN, webhook,
service-account, similar secret value fields, or raw secret-like strings in
free-text notes are embedded. Update
`release/secrets-evidence.json` only with
verified secret names, stores, and booleans; do not paste secret values,
connection strings, tokens, private keys, service account JSON, raw database
URLs, DSNs, or webhook URLs. Prefer
`corepack pnpm run release:secrets-proof` from an approved secret store context
with a non-secret `SECRET_PROOF_STORE` label, then
`corepack pnpm run release:secrets-evidence` to update tracked evidence from
`release/secrets-proof.local.json`. The collector reads only environment key
presence, never writes values, and does not mark local developer env values as
release-verified unless an approved store label is supplied. The tracked
evidence generator also rejects verified secret proof entries whose `stores`
labels are not allowed for that specific secret, so ad hoc notes, copied chats,
spreadsheets, arbitrary labels, or a valid store label attached to the wrong
secret cannot satisfy secret proof. For example, `GITHUB_TOKEN` and
`GITHUB_REPOSITORY` must be proven from `GitHub Actions runtime`. Release
readiness also independently blocks tracked secret evidence when verified
entries use unapproved or secret-mismatched `stores` labels or when any
note/free-text field contains a raw secret-like string such as a database URL,
webhook URL, API token, or private key marker. It also blocks unknown secret
names, including unrelated legacy project names, so foreign repository or
database secrets cannot satisfy Salary Hijacking release proof.
The release workflow now creates a no-value GitHub Actions runtime proof
artifact named `github-runtime-secret-proof-*` from
`release/secrets-proof.local.json` for only `GITHUB_TOKEN` and
`GITHUB_REPOSITORY`, using `SECRET_PROOF_STORE="GitHub Actions runtime"` and
`SECRET_PROOF_NAMES="GITHUB_TOKEN,GITHUB_REPOSITORY"`. This artifact is
short-retention CI evidence only; it must be inspected or downloaded by an
operator and converted into tracked evidence with
`corepack pnpm run release:secrets-evidence` without pasting raw values. The
workflow artifact does not by itself make `release/secrets-evidence.json`
verified, and all other runtime secrets remain blocked until their own approved
store proof exists.
Update
`release/cloudflare-runtime-evidence.json` only with resource names, booleans,
and non-secret proof notes for Workers, R2, Queues, custom domains, TLS
certificates, cron triggers, and Worker secret binding presence. Prefer
`corepack pnpm run release:cloudflare-proof` after recording read-only
observations in `release/cloudflare-observation.local.json`, then
`corepack pnpm run release:cloudflare-evidence` to update tracked evidence from
`release/cloudflare-proof.local.json`. The collector and generator reject raw
Cloudflare credentials, Worker script bodies, binding values, certificate
material, private keys, copied runtime payloads, secret values, unrelated
Worker names, and unrelated custom-domain or TLS certificate hostnames before
writing local or tracked evidence. Release readiness also
independently blocks tracked Cloudflare runtime evidence when `observedWorkers`
contains names outside the Salary Hijacking release target set or when
`workers.expectedWorkers` drifts from `release/release-targets.json`. It also
blocks tracked Cloudflare runtime evidence when `networking.expectedDomains`
contains unrelated domains outside the Salary Hijacking custom-domain set
(`salaryhijacking.com`, `www.salaryhijacking.com`, `api.salaryhijacking.com`,
`notifications.salaryhijacking.com`, `scheduler.salaryhijacking.com`, and
`admin.salaryhijacking.com`).
Update `release/database-evidence.json` only with booleans, resource names,
migration counts, and non-secret proof notes for safe migration validation,
staging migration, staging seed, production migration dry-run, API/Admin smoke,
privacy smoke, and rollback rehearsal. Never store raw Neon database URLs,
connection strings, passwords, tokens, or query payloads with sensitive
financial/user data. Prefer `corepack pnpm run release:database-proof` after
recording command result booleans in
`release/database-command-proof.local.json`, then
`corepack pnpm run release:database-evidence` to update tracked evidence from
`release/database-proof.local.json`. The collector and generator reject raw
database URLs, secret values, production seed proof, raw smoke payloads, raw
auth/cookie/header fields, unrelated Neon project hints, and sensitive
user/financial data keys before writing local or tracked evidence. When database
proof claims `neon.projectMatched=true`, the local proof must carry
`neon.expectedProjectHint="salary-hijacking"`, and the tracked evidence
generator compares that hint with `release/release-targets.json`.
Update `release/mobile-native-evidence.json` only with no-secret booleans for
Android production AAB builds, Android native E2E or equivalent device-farm
runs, Google Play submit dry-runs, iOS production builds, and App Store submit
dry-runs. Prefer `corepack pnpm run release:mobile-native-proof` after
recording console observations in `release/mobile-native-observation.local.json`,
then `corepack pnpm run release:mobile-native-evidence` to update tracked
evidence from `release/mobile-native-proof.local.json`. The collector and
generator reject EAS tokens, Apple/Google credentials, binary download URLs,
local artifact paths, signing keys, service account JSON, reviewer passwords,
copied store-console payloads, and logs before writing local or tracked
evidence. The tracked evidence generator requires `containsSecretValues=false`
on local or fallback proof before writing refreshed mobile native evidence, and
verified local proof must carry `appIdentity` matching the mobile target in
`release/release-targets.json`:
`appSlug="salary-hijacking"`,
`androidPackage="com.salaryhijacking.mobile"`, and
`iosBundleIdentifier="com.salaryhijacking.mobile"`.
Release readiness also independently blocks tracked mobile native evidence when
`containsSecretValues` is not explicitly `false`, raw native release secret
values are embedded, `appIdentity` drifts from the release target mobile
slug/package/bundle identifier, or native release privacy flags declare EAS
tokens, store credentials, binary download URLs, or reviewer passwords.
On 2026-07-02, local read-only preflight confirmed `apps/mobile/node_modules/.bin/eas.CMD`
runs `eas-cli/20.4.0`, Android `adb`/`emulator` are detected, Android native
E2E remains blocked only by the missing local E2E APK, and iOS native E2E
remains blocked by the missing local Detox `.app` binary. The mobile build
workflow now collects and uploads a no-secret `mobile-native-proof-*` artifact
from `release/mobile-native-proof.local.json`, but that artifact is still only
CI proof material. These observations do not set any native release proof
boolean to true; Android/iOS production builds, native E2E execution, and
store-submit dry-runs still require no-secret provider or device proof before
release.
Update `release/public-url-evidence.json` only with no-secret booleans proving
production reachability for
`https://salaryhijacking.com/`, `/privacy`, `/support`, and `/terms`, CSP and
privacy/ads-safe headers, Korean public copy, store-review URL alignment, and
public-page sensitive data non-exposure. Prefer
`corepack pnpm run release:public-url-proof` to collect local no-secret booleans
into `release/public-url-proof.local.json`, then
`corepack pnpm run release:public-url-evidence` to update the tracked evidence;
the collector requires the base URL to normalize to exactly
`https://salaryhijacking.com` and records the checked public URL set. The
collector and generator reject or avoid copied HTML, raw response bodies, raw
headers, logs, emails, phone numbers, salary, expense, savings, hijack amounts,
tokens, cookies, session identifiers, database URLs, unrelated public URL proof
targets, and other sensitive payload keys before writing tracked evidence. The
collector also treats sensitive public response header names or values as
non-exposure failures without writing those headers. The tracked evidence
generator also rejects proof keys for copied request/response headers, raw
headers, authorization, cookie, session, CSRF, API key, access token, JWT, and
related sensitive header markers before writing tracked evidence.
Update `release/security-audit-evidence.json` only with no-secret dependency
audit summary booleans and vulnerability counts. Prefer running
`corepack pnpm audit --audit-level=high --prod=false` in a network-enabled
release environment, recording only the package manager, audit command,
lockfile/production/dev coverage booleans, and vulnerability counts in the
ignored `release/security-audit-proof.local.json`, then running
`corepack pnpm run release:security-audit-evidence` to update tracked evidence.
Do not paste npm tokens, registry auth values, copied full audit JSON,
advisories, registry responses, package payloads, dependency details, private
keys, or provider logs. Release readiness blocks tracked security audit evidence
until the pnpm registry audit coverage is proven and high/critical vulnerability
counts are both zero. Current tracked evidence satisfies this for the present
lockfile only; rerun the audit and regenerate evidence after any dependency or
lockfile change. Then run:

```powershell
corepack pnpm run check:release-readiness -- --soft
corepack pnpm run test:root-scripts
```
