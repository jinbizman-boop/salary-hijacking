# PHASE 13 FCM Native Token Remediation Report

Generated: 2026-08-29

## Baseline Freeze

| Field | Value |
| --- | --- |
| Old application RC source SHA | `08005cff94e4f0661d2ae809d7d508379ab3092a` |
| Old RC status | historical known-good baseline |
| REL-004 | PASS |
| REL-005 | PASS |
| REL-006 | PARTIAL_ARCHITECTURAL_TOKEN_MISMATCH |
| REL-008 | PASS |
| REL-009 | PASS |
| D-026 | FAIL |

The old RC x86, ARM64, Galaxy, lifecycle, and authenticated E2E evidence remains immutable and must not be overwritten.

## Root Cause

`apps/mobile/src/shared/styles/clean-fintech-screens.tsx` acquired an Expo Push Service token with `Notifications.getExpoPushTokenAsync()`. The deployed `salary-hijacking-notifications-staging` Worker sends with FCM HTTP v1 and requires a native FCM registration token as its `message.token` target. The API registration path stored only `push_token_hash` in `public.user_devices`, so later server-authoritative delivery had no recoverable provider target.

## Remediation

| Layer | Before | After |
| --- | --- | --- |
| Mobile token API | Expo Push Service token | Native device token via `Notifications.getDevicePushTokenAsync()` |
| Android provider | implicit/ambiguous | `provider=FCM`, `tokenSource=NATIVE_DEVICE` |
| API validation | accepted Android Expo push token shape | rejects Expo push tokens for Android FCM registration |
| DB device record | `push_token_hash` only | provider/source/hash/secret-ref metadata |
| Delivery token registry | not materialized by migrations | `notification_push_tokens` table with encrypted token envelope |
| Worker send boundary | accepts token in service-authorized request | API can resolve encrypted token and call Worker without exposing raw token |

Raw push tokens remain forbidden in user-facing responses, logs, evidence, analytics, and audit summaries. The encrypted token envelope is operational secret material and is only used inside the API-to-Worker delivery boundary.

## Service Auth

The Worker service-to-service boundary now enforces the `NOTIFICATIONS_SERVICE_TOKEN_SHA256` contract for staging and production. Plaintext token comparison is limited to non-staging/non-production development contexts only.

- caller holds raw `NOTIFICATIONS_SERVICE_TOKEN`
- Worker holds `NOTIFICATIONS_SERVICE_TOKEN_SHA256`
- requests use `x-service-token`
- evidence records only auth mode and result, never the token value

Focused test evidence:

- `services/notifications/tests/unit/service-auth-contract.test.ts`
- staging/plaintext-only Worker env returns `NOTIFICATIONS_SERVICE_TOKEN_SHA256_REQUIRED`
- staging/hash Worker env accepts an incoming raw token only after SHA-256 comparison and reports `authMode=HASH`

## Evidence

| Check | Result |
| --- | --- |
| Mobile notification tests | PASS targeted |
| API notification repository/contract tests | PASS targeted |
| API typecheck | PASS targeted |
| Notifications Worker typecheck | PASS targeted |
| Notifications Worker tests | PASS, 8 files / 38 tests |
| Mobile typecheck | PASS targeted after exact-optional fix |

## Migration Gate

`database/migrations/0026_notification_native_push_token_contract.sql` is present and additive, but it is not yet recorded in the staging migration ledger from this local run. Current local validation remains:

- migration files: 26
- checked-in ledger rows: 25
- `node scripts/audit/validate-migration-checksums.mjs`: FAIL, expected until 0026 is applied and ledgered from staging evidence
- staging execution path: `neon-staging-migration-0026` GitHub Actions workflow, using the existing `staging` Environment and `STAGING_DATABASE_URL` secret name only
- workflow evidence: no-secret artifact under `artifacts/neon-staging-migration-0026/**`

No new application RC may be created while this gate remains open.

## Remaining Work

This source remediation creates a new RC candidate path. It does not reuse old RC runtime evidence for D-026. After Stitch remediation is merged into the same source line, calculate a new application RC source SHA and rebuild x86/ARM64 QA artifacts before rerunning Galaxy and FCM runtime evidence.
