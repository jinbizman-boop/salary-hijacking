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

- `corepack pnpm run check:package-manager-scripts`: PASS, 15 package files checked in the latest `quality` run
- `corepack pnpm run check:scripts`: PASS
- `corepack pnpm run check:external-integrations`: PASS, 74 required files checked, including public app/legal custom-domain targets, no-secret public URL evidence/proof automation, no-secret database command proof automation, no-value runtime secret proof automation, no-secret Cloudflare observation proof automation, no-secret mobile native observation proof automation, and tracked no-secret local proof example templates; this local shell warns `gh`, `neon`, and `neonctl` are not on PATH for that script
- `corepack pnpm run test:root-scripts`: PASS, 148 tests
- `node --test apps\mobile\scripts\import-e2e-apk.test.mjs`: PASS, Android E2E APK import helper accepts only local APK/ZIP files and rejects artifact URLs, non-APK files, and placeholders
- `corepack pnpm run release:public-url-evidence`: PASS, generated `release/public-url-evidence.json` with public landing/privacy/support/terms evidence intentionally marked unverified until production reachability, CSP/privacy headers, Korean copy, store-review URL alignment, and sensitive-data non-exposure are proven
- `node --test scripts/release/collect-database-proof.test.mjs`: PASS, database command proof collector stores booleans only and rejects raw database URLs, secret values, raw smoke payloads, raw auth/cookie/header fields, unrelated Neon project hints, sensitive user/financial keys, and production seed proof
- `node --test scripts/release/generate-database-evidence.test.mjs`: PASS, database evidence generator rejects local proof whose Neon `expectedProjectHint` does not match `release/release-targets.json` before writing tracked evidence
- `node --test scripts/release/generate-secrets-evidence.test.mjs`: PASS, runtime secret evidence generator rejects raw secret values, unknown secret names, and verified proof entries with unapproved secret store labels
- `node --test scripts/release/collect-secrets-proof.test.mjs`: PASS, runtime secret proof collector writes only presence booleans and does not mark local developer env values as release-verified without an approved `SECRET_PROOF_STORE`
- `node --test scripts/release/collect-cloudflare-proof.test.mjs`: PASS, Cloudflare observation proof collector writes only expected Worker names, resource/domain booleans, and counts while rejecting raw credentials, secret values, unrelated Worker names, and unrelated observed custom-domain or TLS certificate hostnames
- `node --test scripts/release/generate-cloudflare-runtime-evidence.test.mjs`: PASS, Cloudflare runtime evidence generator rejects raw secret values, unrelated Worker names, and unrelated proof domains before writing tracked evidence
- `node --test scripts/release/collect-mobile-native-proof.test.mjs`: PASS, mobile native proof collector writes only EAS build/native E2E/store-submit booleans and rejects tokens, credentials, artifact URLs, signing keys, reviewer passwords, copied provider payloads, logs, non-AAB Android production build claims, and verified proof for unrelated mobile app identities
- `node --test scripts/release/generate-mobile-native-evidence.test.mjs`: PASS, mobile native evidence generator requires schemaVersion 1, secretsRedacted=true, containsSecretValues=false, no native build secret values/artifact URLs/artifact paths/unsafe production artifact types, and mobile app identity matching `release/release-targets.json`
- `node --test scripts/release/check-release-readiness.test.mjs`: PASS, 50 tests; release readiness now blocks tracked secret evidence when raw values, raw secret-like strings in notes, unknown secret names, or unapproved store labels are embedded while allowing approved runtime secret names such as `CF_ADMIN_WORKER_NAME` in no-value evidence next steps, blocks tracked external release evidence when raw secret values are embedded, blocks tracked Cloudflare runtime evidence when unrelated Worker names or domains are embedded or when its expected Worker names drift from `release/release-targets.json`, and blocks tracked mobile native evidence when `containsSecretValues` is not explicitly false, raw native release secret values are embedded, unsafe native release privacy flags are set, or `appIdentity` drifts from the target app slug/package/bundle identifier
- `node --test scripts/release/collect-public-url-proof.test.mjs`: PASS, public URL proof collector stores booleans only, records checked Salary Hijacking public URLs, rejects non-`salaryhijacking.com` proof base URLs before fetching, does not write copied HTML, raw headers, logs, identifiers, or financial payloads, treats sensitive response header names/values as non-exposure failures, and rejects mojibake/corrupted Korean copy as verified public copy
- `node --test scripts/release/generate-public-url-evidence.test.mjs`: PASS, public URL evidence generator rejects proof files containing raw secrets, unrelated checked public URL targets, copied response bodies, copied response/request headers, cookies, sessions, auth markers, or sensitive user/financial keys before writing tracked evidence
- `corepack pnpm --filter @salary-hijacking/api test`: PASS, 6 test files and 14 tests, including public `/`, `/privacy`, `/support`, and `/terms` pages
- `corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS, API Worker config parses with `salaryhijacking.com`, `www.salaryhijacking.com`, and `api.salaryhijacking.com` production custom-domain targets
- `corepack pnpm --filter @salary-hijacking/mobile test -- clean-fintech-theme.test.ts`: PASS, 9 tests
- `corepack pnpm --filter @salary-hijacking/mobile typecheck`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile format:check`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile run export:web`: PASS, Expo web export includes official BI and Freesentation assets
- `node scripts\release\capture-mobile-clean-fintech-screenshots.mjs`: PASS, regenerated five 430x932 screenshots and one 1024x500 Google Play feature graphic
- `node scripts\release\check-release-readiness.mjs --soft`: Reporting PASS, release status BLOCKED by missing runtime secret evidence, required Cloudflare Worker/Admin/R2/Queue/cron/secret-binding/domain/TLS proof, DB migration/seed/API smoke/rollback proof, public landing/privacy/support/terms production reachability and header/content safety proof, Android/iOS native build/E2E/store-submit evidence, and missing `eas` on PATH after generated dependency cleanup; `release/release-targets.json`, mobile app identity evidence, external GitHub evidence, local `origin`, authenticated push evidence, current local HEAD to `origin/main` sync, Neon project evidence, and public URL target evidence align with `jinbizman-boop/salary-hijacking`
- `corepack pnpm run format:check`: PASS
- `corepack pnpm run quality`: PASS, 82 Turbo tasks
- `corepack pnpm run build`: PASS, 12 Turbo tasks
- `node scripts\check-detox-env.mjs android.emu.debug` from `apps/mobile`: FAIL only because the local Detox Android E2E APK `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk` is missing; local `adb` and `emulator` are now detected through Android SDK tool lookup
- `corepack pnpm run test:e2e`: still BLOCKED at `@salary-hijacking/mobile#test:e2e` until an E2E APK is built or equivalent native device-farm proof is recorded without secrets
- Dependency vulnerability audit is separated into `security:audit` and still requires registry/network access before release
- `git remote -v`: PASS, `origin` points to `https://github.com/jinbizman-boop/salary-hijacking.git`
- `git push origin main` and `git ls-remote origin refs/heads/main`: PASS, authenticated push and remote branch read access are proven; release readiness now rechecks local HEAD against `origin/main` when authenticated push proof is claimed, falling back to the local `refs/remotes/origin/main` tracking ref with a warning when live remote reads are unavailable in the local Node sandbox; the latest recorded remote proof commit in `release/external-release-evidence.json` remains historical evidence
- Ignored generated dependency/cache artifacts were cleaned on 2026-07-02 KST. `node_modules/`, `.pnpm-store/`, `.turbo/`, `.codex-runtime/`, `.open-next/`, `.wrangler/`, generated logs, TypeScript incremental build info, and probe images are intentionally absent until regenerated. Run `corepack pnpm install` before pnpm/Turbo package scripts that require dependencies.

## Editing Rules

- Prefer existing project patterns over new abstractions.
- Do not silently remove existing files or user changes.
- Update `docs/codex/08_FILE_COMPLETION_LOG.md` when a meaningful file group is completed or re-verified.
- When touching mobile/API/admin integration, check endpoint path alignment.
- When touching docs, keep claims grounded in observed files and command output.
