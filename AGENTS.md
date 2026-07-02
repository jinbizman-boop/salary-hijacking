# AGENTS.md - Salary Hijacking Codex Rules

## Purpose

This repository is the Salary Hijacking platform: a server-authoritative payroll, budget, expense, savings, notification, LV UP, community, ads/partners, admin, and operations product.

Codex must treat this file as the project-level operating agreement. It is intentionally short. Detailed context lives in `docs/codex/`.

## Common Work Contract

For every meaningful task, Codex acts as the Salary Hijacking principal architect. The goal is not a temporary patch or cosmetic correction. The goal is to make the touched file, feature, or workflow as complete as possible against the product, architecture, privacy, ads, server-authority, and commercialization requirements that are available in this workspace.

Before editing, Codex must identify the target path, summarize the target's role in the platform, list the relevant requirements, and break the user request into concrete implementation items. For substantial tasks, use at least 15 specific items unless the task is objectively smaller.

After editing, Codex must run the closest relevant validation at least three times or run three distinct relevant checks. If a check cannot run, report the blocker instead of claiming success. Update `docs/codex/08_FILE_COMPLETION_LOG.md` when a meaningful file group is completed, re-verified, or newly found blocked.

Completion reports must separate:

- file-level document/theoretical completeness,
- file-level verified completeness,
- project-wide operational readiness.

These are not interchangeable.

## Source Of Truth

Use the local workspace as the verified source of truth.

The ChatGPT project share link provided on 2026-06-25 redirected to a login page in this Codex session, so its private contents were not readable here. Do not claim that the linked ChatGPT project was inspected unless the user provides its exported contents or grants an accessible source.

## Required Reading

Before non-trivial work, read:

1. `docs/codex/00_INDEX.md`
2. `docs/codex/01_PROJECT_BRIEF.md`
3. `docs/codex/09_VALIDATION_PROTOCOL.md`
4. The context document matching the touched area:
   - Mobile: `docs/codex/06_MOBILE_APP_CONTEXT.md`
   - API/services/DB: `docs/codex/07_API_CONTEXT.md`
   - Privacy, ads, auth, logs, security: `docs/codex/05_PRIVACY_ADS_SECURITY.md`
   - Existing completion claims: `docs/codex/08_FILE_COMPLETION_LOG.md`

## Completion Language

Do not report "project 100% complete" unless install, typecheck, lint, tests, E2E, build, DB migration/seed, deploy, secrets, API smoke, and QA have actually passed in this workspace or a named environment.

Allowed wording:

- "File-level documentation updated"
- "Typecheck passed for API/Admin"
- "Not verified"
- "Blocked by missing dependency/config"
- "Document/theoretical completeness claim exists in package metadata"

Forbidden wording:

- "production 100% complete" without full operational verification
- "0% error rate" outside the verified test scope
- "shared ChatGPT project inspected" when the link was inaccessible

## Architecture Rules

- API prefix for user-facing backend routes is `/api/v1`.
- Admin API prefix is `/admin/api/v1`.
- Financial calculations are server-authoritative.
- The client may display, collect input, handle interaction, and provide offline fallback, but must not become the source of truth for payroll, budget, expense, savings, or hijack amount calculations.
- KRW money values must be integers.
- Negative money and fractional money are invalid for authoritative records.
- Store time in UTC and present user-facing Korean time in Asia/Seoul where needed.
- Admin routes must require RBAC, MFA-sensitive boundaries, admin reason, and audit logging for mutations.

## Privacy, Ads, And Security

Never expose raw financial or sensitive user data to ads, partner targeting, analytics, logs, public exports, or push payloads.

Sensitive raw data includes:

- salary, income, expense, savings, hijack amount
- account, card, loan, resident, phone, email
- auth token, refresh token, session token, push token
- raw device identifier
- private key, DB URL, JWT secret, service account, FCM server key

Ads and partner surfaces must be contextual-only unless a future verified policy explicitly says otherwise. Ad/partner content must be labeled.

## Current Verification Snapshot

Last checked by Codex on 2026-07-02 KST:

- `corepack pnpm run check:package-manager-scripts`: PASS, 13 package files checked after dependency restore
- `corepack pnpm run check:scripts`: PASS
- `corepack pnpm run check:external-integrations`: PASS, 78 required files checked, including public app/legal custom-domain targets, release workflow mojibake guard, release readiness workflow gate guard, ChatGPT work summary Android blocker wording guard, GitHub Actions runtime proof artifact guard, no-secret public URL proof artifact guard, dev-inclusive release dependency audit guard, no-secret dependency security audit proof artifact guard, no-secret public URL evidence/proof automation, no-secret database command proof automation, no-value runtime secret proof automation, no-secret Cloudflare observation proof automation, no-secret mobile native observation proof automation, no-secret dependency security audit evidence automation, and tracked no-secret local proof example templates; this local shell warns `gh`, `neon`, and `neonctl` are not on PATH for that script
- `corepack pnpm run test:root-scripts`: PASS, 178 tests
- `node --test apps\mobile\scripts\import-e2e-apk.test.mjs`: PASS, Android E2E APK import helper accepts only local APK/ZIP files and rejects artifact URLs, non-APK files, and placeholders
- `corepack pnpm run release:public-url-proof`: FAIL by design because `https://salaryhijacking.com/`, `/privacy`, `/support`, and `/terms` are not yet reachable with verified CSP/privacy headers, Korean copy, store-review URL alignment, and sensitive-data non-exposure; the ignored local proof stores only false booleans and no raw headers/body data
- `corepack pnpm run release:public-url-evidence`: PASS, generated `release/public-url-evidence.json` with public landing/privacy/support/terms evidence intentionally marked unverified until production reachability, CSP/privacy headers, Korean copy, store-review URL alignment, and sensitive-data non-exposure are proven
- `corepack pnpm run release:database-proof`: FAIL by design because Neon project/main/staging branch proof is present but migration validation, staging migration/seed, production migration dry-run, staging API/Admin/server-authority/privacy smoke, and rollback rehearsal proof are still missing
- `corepack pnpm run db:validate`: PASS, local-safe DB package/schema/DDL validation completed without runtime DB connection strings, SQL output, secrets, or smoke payloads; this records only the migration validation release gate and does not prove staging migration, production migration dry-run, seed, smoke, or rollback
- `corepack pnpm run release:database-evidence`: PASS, refreshed `release/database-evidence.json` from no-secret Neon read-only project/branch proof booleans and local-safe DB validation proof while keeping staging migration/seed, production dry-run, API/Admin/server-authority/privacy smoke, and rollback gates blocked
- `node --test scripts/release/collect-database-proof.test.mjs scripts/release/generate-database-evidence.test.mjs`: PASS, 15 tests; database command proof collector stores booleans only and rejects raw database URLs, secret values, raw smoke payloads, raw auth/cookie/header fields, unrelated Neon project hints, sensitive user/financial keys, production seed proof, and accepts UTF-8 BOM local proof JSON
- `node --test scripts/release/generate-database-evidence.test.mjs`: PASS, database evidence generator rejects local proof whose Neon `expectedProjectHint` does not match `release/release-targets.json` before writing tracked evidence
- `node --test scripts/release/generate-secrets-evidence.test.mjs`: PASS, runtime secret evidence generator rejects raw secret values, unknown secret names, and verified proof entries with unapproved or secret-mismatched secret store labels
- `node --test scripts/release/collect-secrets-proof.test.mjs`: PASS, runtime secret proof collector writes only presence booleans and does not mark local developer env values as release-verified without an approved `SECRET_PROOF_STORE`
- `corepack pnpm run release:cloudflare-proof`: writes ignored `release/cloudflare-proof.local.json` and exits 1 with `verified=false` because the latest read-only Cloudflare connector observation still has zero Salary Hijacking Workers, zero Queues, no `salaryhijacking.com` zone, no active TLS certificate proof, and R2 bucket listing is blocked by Cloudflare account activation error `10042`
- `corepack pnpm run release:cloudflare-evidence`: PASS, refreshed `release/cloudflare-runtime-evidence.json` from no-secret Cloudflare observation/proof booleans while keeping the Cloudflare runtime gates blocked
- `node --test scripts/release/collect-cloudflare-proof.test.mjs`: PASS, 7 tests; Cloudflare observation proof collector writes only expected Worker names, resource/domain booleans, and counts while rejecting raw credentials, secret values, unrelated Worker names, and unrelated observed custom-domain or TLS certificate hostnames, and it tolerates missing/BOM local observation files by writing blocked no-secret proof rather than throwing before evidence generation
- `node --test scripts/release/generate-cloudflare-runtime-evidence.test.mjs`: PASS, Cloudflare runtime evidence generator rejects raw secret values, unrelated Worker names, and unrelated proof domains before writing tracked evidence
- `node --test apps\mobile\scripts\import-e2e-apk.test.mjs scripts\release\collect-mobile-native-proof.test.mjs scripts\release\generate-mobile-native-evidence.test.mjs`: PASS, 19 tests; mobile native proof/evidence tooling writes only EAS build/native E2E/store-submit booleans and rejects tokens, credentials, artifact URLs, artifact paths, signing keys, reviewer passwords, copied provider payloads, logs, non-AAB Android production build claims, verified proof for unrelated mobile app identities, and UTF-8 BOM local observation JSON issues
- `node --test scripts/release/generate-mobile-native-evidence.test.mjs`: PASS, mobile native evidence generator requires schemaVersion 1, secretsRedacted=true, containsSecretValues=false, no native build secret values/artifact URLs/artifact paths/unsafe production artifact types, and mobile app identity matching `release/release-targets.json`
- `node --test scripts/release/check-release-readiness.test.mjs`: PASS, 54 tests; release readiness now blocks tracked secret evidence when raw values, raw secret-like strings in notes, unknown secret names, unapproved store labels, or secret-mismatched store labels are embedded while allowing approved runtime secret names such as `CF_ADMIN_WORKER_NAME` in no-value evidence next steps, blocks tracked external release evidence when raw secret values are embedded, blocks tracked Cloudflare runtime evidence when unrelated Worker names or domains are embedded or when its expected Worker names drift from `release/release-targets.json`, blocks tracked mobile native evidence when `containsSecretValues` is not explicitly false, raw native release secret values are embedded, unsafe native release privacy flags are set, or `appIdentity` drifts from the target app slug/package/bundle identifier, and blocks tracked dependency security audit evidence until pnpm registry audit coverage and zero high/critical vulnerability counts are proven without raw registry tokens or copied audit payloads
- `node --test scripts/release/generate-security-audit-evidence.test.mjs`: PASS, dependency security audit evidence generator rejects raw registry tokens, copied full audit reports, advisories, registry responses, package payloads, and dependency details before writing tracked evidence
- `node --test scripts/release/collect-public-url-proof.test.mjs`: PASS, public URL proof collector stores booleans only, records checked Salary Hijacking public URLs, rejects non-`salaryhijacking.com` proof base URLs before fetching, does not write copied HTML, raw headers, logs, identifiers, or financial payloads, treats sensitive response header names/values as non-exposure failures, and rejects mojibake/corrupted Korean copy as verified public copy
- `node --test scripts/release/generate-public-url-evidence.test.mjs`: PASS, public URL evidence generator rejects proof files containing raw secrets, unrelated checked public URL targets, copied response bodies, copied response/request headers, cookies, sessions, auth markers, or sensitive user/financial keys before writing tracked evidence
- `corepack pnpm --filter @salary-hijacking/api test`: PASS, 6 test files and 14 tests, including public `/`, `/privacy`, `/support`, and `/terms` pages
- `corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS, API Worker config parses with `salaryhijacking.com`, `www.salaryhijacking.com`, and `api.salaryhijacking.com` production custom-domain targets
- `corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS, Notifications Worker production config parses with retry/operation Queue bindings and privacy-safe notification flags
- `corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS, Scheduler Worker production config parses with scheduler/notification/growth Queue bindings, cron-capable Worker entrypoint, and server-authority/privacy flags
- `corepack pnpm --filter @salary-hijacking/admin run build:cloudflare`: FAIL fast on this Windows PC because OpenNext/Next standalone output requires directory symlink permission; run from Developer Mode, an administrator shell, WSL, or CI before Admin Worker dry-run/deploy
- `corepack pnpm --filter @salary-hijacking/mobile test -- clean-fintech-theme.test.ts`: PASS, 9 tests
- `corepack pnpm --filter @salary-hijacking/mobile typecheck`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile format:check`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile run export:web`: PASS, Expo web export includes official BI and Freesentation assets
- `node scripts\release\capture-mobile-clean-fintech-screenshots.mjs`: PASS, regenerated five 430x932 screenshots and one 1024x500 Google Play feature graphic
- `corepack pnpm audit --audit-level=high --prod=false --json`: PASS after lockfile-only override refresh, with 0 low, 0 moderate, 0 high, and 0 critical vulnerabilities reported for the current lockfile
- `node scripts\release\check-release-readiness.mjs --soft`: Reporting PASS, release status BLOCKED by missing runtime secret evidence, required Cloudflare Worker/Admin/R2/Queue/cron/secret-binding/domain/TLS proof, DB staging migration/seed/API smoke/rollback proof, public landing/privacy/support/terms production reachability and header/content safety proof, and Android/iOS native build/E2E/store-submit evidence; workspace-local EAS CLI is restored at `apps/mobile/node_modules/.bin/eas.CMD`; `release/release-targets.json`, mobile app identity evidence, external GitHub evidence, local `origin`, authenticated push evidence, current local HEAD to `origin/main` sync, Neon project evidence, local-safe DB migration validation evidence, public URL target evidence, and no-secret dependency security audit evidence align with `jinbizman-boop/salary-hijacking`
- `corepack pnpm run format:check`: PASS after restoring dependencies and applying Prettier to the previously unformatted tracked files
- `corepack pnpm run quality`: PASS, 82 Turbo tasks
- `corepack pnpm run build`: PASS, 12 Turbo tasks
- `node scripts\check-detox-env.mjs android.emu.debug` from `apps/mobile`: FAIL only because the local Detox Android E2E APK `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk` is missing; local `adb` and `emulator` are detected through Android SDK tool lookup
- `node scripts\check-detox-env.mjs ios.sim.debug` from `apps/mobile`: FAIL because the local Detox iOS app `apps/mobile/build/e2e/ios/salaryhijacking.app` is missing
- `corepack pnpm run test:e2e`: still BLOCKED at `@salary-hijacking/mobile#test:e2e` until an E2E APK is built or equivalent native device-farm proof is recorded without secrets
- Dependency vulnerability audit is represented by `release/security-audit-evidence.json`; the current lockfile has no-secret registry audit evidence with zero low/moderate/high/critical vulnerabilities, and the audit must be rerun after dependency changes before release
- `git remote -v`: PASS, `origin` points to `https://github.com/jinbizman-boop/salary-hijacking.git`
- `git push origin main` and `git ls-remote origin refs/heads/main`: PASS, authenticated push and remote branch read access are proven; release readiness now rechecks local HEAD against `origin/main` when authenticated push proof is claimed, falling back to the local `refs/remotes/origin/main` tracking ref with a warning when live remote reads are unavailable in the local Node sandbox; the latest recorded remote proof commit in `release/external-release-evidence.json` remains historical evidence
- Ignored generated dependency/cache artifacts were cleaned on 2026-07-02 KST and then dependencies were restored with `corepack pnpm install --frozen-lockfile` so local package scripts, Prettier, Turbo, and workspace-local EAS CLI can run again. Generated `node_modules/`, `.turbo/`, `dist/`, `.next/`, TypeScript incremental files, and local secret files remain ignored and must not be committed.

## Editing Rules

- Prefer existing project patterns over new abstractions.
- Do not silently remove existing files or user changes.
- Update `docs/codex/08_FILE_COMPLETION_LOG.md` when a meaningful file group is completed or re-verified.
- When touching mobile/API/admin integration, check endpoint path alignment.
- When touching docs, keep claims grounded in observed files and command output.
