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

Last checked by Codex on 2026-07-01 KST:

- `corepack pnpm run check:package-manager-scripts`: PASS, 15 package files checked in the latest `quality` run
- `corepack pnpm run check:scripts`: PASS
- `corepack pnpm run check:external-integrations`: PASS, 74 required files checked, including public app/legal custom-domain targets, no-secret public URL evidence/proof automation, no-secret database command proof automation, no-value runtime secret proof automation, no-secret Cloudflare observation proof automation, no-secret mobile native observation proof automation, and tracked no-secret local proof example templates; this local shell warns `wrangler`, `gh`, `neon`, and `neonctl` are not on PATH for that script
- `corepack pnpm run test:root-scripts`: PASS, 113 tests
- `node --test apps\mobile\scripts\import-e2e-apk.test.mjs`: PASS, Android E2E APK import helper accepts only local APK/ZIP files and rejects artifact URLs, non-APK files, and placeholders
- `corepack pnpm run release:public-url-evidence`: PASS, generated `release/public-url-evidence.json` with public landing/privacy/support/terms evidence intentionally marked unverified until production reachability, CSP/privacy headers, Korean copy, store-review URL alignment, and sensitive-data non-exposure are proven
- `node --test scripts/release/collect-database-proof.test.mjs`: PASS, database command proof collector stores booleans only and rejects raw database URLs, secret values, raw smoke payloads, sensitive user/financial keys, and production seed proof
- `node --test scripts/release/collect-secrets-proof.test.mjs`: PASS, runtime secret proof collector writes only presence booleans and does not mark local developer env values as release-verified without an approved `SECRET_PROOF_STORE`
- `node --test scripts/release/collect-cloudflare-proof.test.mjs`: PASS, Cloudflare observation proof collector writes only expected Worker names, resource/domain booleans, and counts while rejecting raw credentials, secret values, and unrelated Worker names
- `node --test scripts/release/collect-mobile-native-proof.test.mjs`: PASS, mobile native proof collector writes only EAS build/native E2E/store-submit booleans and rejects tokens, credentials, artifact URLs, signing keys, reviewer passwords, copied provider payloads, logs, and non-AAB Android production build claims
- `node --test scripts/release/collect-public-url-proof.test.mjs`: PASS, public URL proof collector stores booleans only and does not write copied HTML, raw headers, logs, identifiers, or financial payloads
- `corepack pnpm --filter @salary-hijacking/api test`: PASS, 6 test files and 14 tests, including public `/`, `/privacy`, `/support`, and `/terms` pages
- `corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml`: PASS, API Worker config parses with `salaryhijacking.com`, `www.salaryhijacking.com`, and `api.salaryhijacking.com` production custom-domain targets
- `corepack pnpm --filter @salary-hijacking/mobile test -- clean-fintech-theme.test.ts`: PASS, 9 tests
- `corepack pnpm --filter @salary-hijacking/mobile typecheck`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile format:check`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile run export:web`: PASS, Expo web export includes official BI and Freesentation assets
- `node scripts\release\capture-mobile-clean-fintech-screenshots.mjs`: PASS, regenerated five 430x932 screenshots and one 1024x500 Google Play feature graphic
- `corepack pnpm run check:release-readiness -- --soft`: Reporting PASS, release status BLOCKED by missing runtime secret evidence, required Cloudflare Worker/Admin/R2/Queue/cron/secret-binding/domain/TLS proof, DB migration/seed/API smoke/rollback proof, public landing/privacy/support/terms production reachability and header/content safety proof, and Android/iOS native build/E2E/store-submit evidence; `release/release-targets.json`, external GitHub evidence, local `origin`, authenticated push evidence, Neon project evidence, public URL target evidence, and workspace-local EAS CLI evidence target `jinbizman-boop/salary-hijacking`
- `corepack pnpm run format:check`: PASS
- `corepack pnpm run quality`: PASS, 82 Turbo tasks
- `corepack pnpm run build`: PASS, 12 Turbo tasks
- `node scripts\check-detox-env.mjs android.emu.debug` from `apps/mobile`: FAIL only because the local Detox Android E2E APK `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk` is missing; local `adb` and `emulator` are now detected through Android SDK tool lookup
- `corepack pnpm run test:e2e`: still BLOCKED at `@salary-hijacking/mobile#test:e2e` until an E2E APK is built or equivalent native device-farm proof is recorded without secrets
- Dependency vulnerability audit is separated into `security:audit` and still requires registry/network access before release
- `git remote -v`: PASS, `origin` points to `https://github.com/jinbizman-boop/salary-hijacking.git`
- `git push origin main` and `git ls-remote origin refs/heads/main`: PASS, authenticated push and remote branch read access are proven; the latest recorded remote proof commit is stored in `release/external-release-evidence.json` and should be rechecked after new commits

## Editing Rules

- Prefer existing project patterns over new abstractions.
- Do not silently remove existing files or user changes.
- Update `docs/codex/08_FILE_COMPLETION_LOG.md` when a meaningful file group is completed or re-verified.
- When touching mobile/API/admin integration, check endpoint path alignment.
- When touching docs, keep claims grounded in observed files and command output.
