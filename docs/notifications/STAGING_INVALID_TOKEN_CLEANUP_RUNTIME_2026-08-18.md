# PHASE 5 Staging Invalid Push-Token Cleanup Runtime Evidence — 2026-08-18

## Scope

This evidence closes the staging database/runtime portion of the provider-invalid push-token cleanup path required by `NOTI-003`, `NOTI-010`, `OPS-003`, and `SEC-009`. It does **not** claim full Phase 5 completion: natural Cloudflare Queue delivery/DLQ evidence, multicast invalid-token handling, current-device FCM/deeplink runtime, and PERF-016/017/018 are still separate gates.

## Environment

- Neon project: `salary-hijacking` (`still-feather-22153967`)
- Neon branch: `staging` (`br-fragrant-sky-aj5kk2c3`)
- Database: `neondb`
- PostgreSQL: 17
- Git branch: `codex/payroll-reminder-launch-ready-100-20260714`
- Active API entrypoint: `services/api/src/phase5-entrypoint.ts`
- Active notifications entrypoint: `services/notifications/src/phase5-entrypoint.ts`

No production database, production traffic, raw push token, password, OAuth token, or raw financial value was used or recorded.

## Migration ledger verification

`db_meta.database_schema_migrations` reports:

- migration: `0021_notification_invalid_token_cleanup`
- filename: `database/migrations/0021_notification_invalid_token_cleanup.sql`
- checksum SHA-256: `20B0C610301BE4071A6604C83A04B25C9147B50E4983CBCF46E3C94AC08795E4`
- status: `VERIFIED_APPLIED`
- applied at: `2026-08-18T13:12:49.456Z`
- verification source: `chatgpt-neon-staging-hash-only-cleanup`

The live staging catalog exposes `public.revoke_invalid_push_token_hash(text,text,text)`.

## Least-privilege verification

The dedicated app role was re-queried from the live staging catalog:

- role: `salary_hijacking_staging_app`
- `rolbypassrls = false`
- execute privilege on `public.revoke_invalid_push_token_hash(text,text,text) = true`

This verifies that invalid-token cleanup does not require granting `BYPASSRLS` to the application role.

## Synthetic runtime mutation probe

A transaction-scoped synthetic Android device row was inserted for an existing synthetic QA account using only deterministic SHA-256-shaped test hashes. The probe then called the live cleanup function and read the row back before deleting the synthetic row.

Observed result:

1. synthetic device row initial state: `ACTIVE`
2. cleanup function result: `revoked_count = 1`
3. row readback state: `REVOKED`
4. `revoked_at` populated: `true`
5. synthetic row cleanup: completed

Therefore the live staging database boundary performs the intended state transition and leaves no test residue.

## Code-path verification

The current Phase 5 notifications entrypoint converts provider-invalid single-device FCM outcomes into a hash-only `PUSH_TOKEN_INVALIDATED` event sent to the canonical operations Queue. The current Phase 5 API entrypoint consumes that strict envelope and calls `public.revoke_invalid_push_token_hash(...)`. The worker boundary does not accept or log raw push tokens in the cleanup event.

Wrangler topology is aligned:

- Notifications producer binding `NOTIFICATIONS_OPERATION_QUEUE` -> staging `salary-hijacking-staging-operations`
- API consumer -> staging `salary-hijacking-staging-operations`
- API consumer dead-letter queue -> `salary-hijacking-staging-operations-dlq`

## Status impact

The following sub-gate can now be promoted from “DB boundary only” to “DB/runtime cleanup boundary PASS”:

- invalid-token hash revocation function: `PASS_STAGING_RUNTIME`
- app-role least privilege: `PASS`
- synthetic ACTIVE -> REVOKED readback: `PASS`
- synthetic residue: `0`

The following remain **not yet PASS** because this probe did not originate from a natural Cloudflare FCM failure and Queue delivery:

- natural FCM invalid-token -> Queue -> API -> DB runtime
- multicast invalid-token cleanup
- Queue retry/backoff/terminal/DLQ natural-run evidence
- device foreground/background/deep-link runtime
- PERF-016/017/018

Accordingly `NOTI-003`, `NOTI-010`, `D-016`, and `PHASE_5_STATUS` remain `PARTIAL` until the remaining runtime gates are evidenced.
