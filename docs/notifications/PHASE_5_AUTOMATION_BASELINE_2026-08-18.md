# PHASE 5 Scheduler & Notifications — Automation Baseline (2026-08-18)

## Status

- PHASE_5_STATUS: `PARTIAL`
- ENTRY_GATE: `PASS` — Phase 3 internal auth and Phase 4 financial core are available for event production.
- EXIT_GATE: `NOT_MET`
- PHASE_6_ENTRY_READINESS: `NOT_READY`
- D-016: `PARTIAL`
- D-017: `PASS`
- D-013: `FAIL`
- D-026: `FAIL`
- PROJECT_COMPLETION_100: `false`
- COMMERCIAL_LAUNCH_READY: `false`

## Source and scope

Repository branch: `codex/payroll-reminder-launch-ready-100-20260714`

Phase 4 closure source before Phase 5 work: `6c935a523c1a30d62bcf159bfad641cd67fae7d2`.

SSOT scope for this phase: `NOTI-001..010`, scheduler/Queue runtime evidence, push/deeplink behavior, invalid-token cleanup, and `PERF-016/017/018` evidence.

## Verified active code surfaces

1. `services/scheduler/src/phase5-entrypoint.ts` is the active Scheduler Wrangler entrypoint and wraps outbound Queue bindings with the v2.0 event envelope.
2. `services/scheduler/src/phase5-notification-contract.ts` attaches `schemaVersion`, `eventId`, `occurredAt`, `correlationId`, and `idempotencyKey` without duplicating financial calculation policy.
3. `services/notifications/src/phase5-entrypoint.ts` is the active Notifications Worker entrypoint. It upgrades legacy messages, reconciles production deep links, applies bounded retry delay, handles single-device `FCM_SEND`, classifies provider-invalid token errors, hashes a raw token only in memory, and emits a hash-only `PUSH_TOKEN_INVALIDATED` event to `NOTIFICATIONS_OPERATION_QUEUE`.
4. `services/api/src/phase5-entrypoint.ts` is the active API Worker entrypoint. It consumes the strict `PUSH_TOKEN_INVALIDATED` envelope and invokes the staging/production-safe database cleanup function.
5. `services/notifications/src/queue-envelope.ts` validates the Phase 5 Queue envelope.
6. `services/notifications/src/deeplink-contract.ts` maps known notification types to current Expo Router routes `/salary`, `/plan`, `/notifications`, `/level`, and `/community`.
7. `services/notifications/src/retry-queue.ts` retains the richer persisted retry/failure-classification model for later runtime consolidation.
8. `database/migrations/0021_notification_invalid_token_cleanup.sql` adds the hash-only least-privilege `SECURITY DEFINER` invalid-token revocation boundary.
9. `scripts/audit/validate-phase-5-notifications.mjs` prevents Phase 5 `PASS` unless all mandatory runtime-evidence booleans are true, Phase 6 is `READY`, and D-016 is `PASS`.

## Completed implementation/runtime sub-gates

### G1 — Queue envelope wiring: CODE COMPLETE

Scheduler outbound Queue messages are enriched with the v2.0 operational envelope. The Notifications consumer independently validates/upgrades legacy messages, preserving compatibility during staged rollout.

### G2 — Deep-link contract drift: CODE COMPLETE

Recognized notification types are normalized at producer and consumer boundaries to current production routes. Device foreground/background/tap runtime remains a later runtime gate.

### G3 — Native Queue retry backoff: CODE COMPLETE / NATURAL RUNTIME PENDING

Cloudflare-native retry delay is bounded exponential backoff starting at 30 seconds and capped at 3,600 seconds. Wrangler owns max-retry and dead-letter routing. Natural staging retry/DLQ evidence is still required.

### G4 — Invalid-token cleanup pipeline: CODE COMPLETE + DB/STAGING RUNTIME SUB-GATE PASS

The current path is now wired end to end in code:

`single-device FCM_SEND invalid result -> in-memory SHA-256 token hash -> PUSH_TOKEN_INVALIDATED -> canonical operations Queue -> API Phase 5 consumer -> public.revoke_invalid_push_token_hash(...)`

The cleanup event contains no raw push token and no raw financial value.

Migration `0021_notification_invalid_token_cleanup.sql` is applied on Neon staging with:

- checksum SHA-256: `20B0C610301BE4071A6604C83A04B25C9147B50E4983CBCF46E3C94AC08795E4`
- ledger status: `VERIFIED_APPLIED`
- applied at: `2026-08-18T13:12:49.456Z`
- verification source: `chatgpt-neon-staging-hash-only-cleanup`

Live staging least-privilege requery:

- `salary_hijacking_staging_app.rolbypassrls = false`
- execute privilege on `public.revoke_invalid_push_token_hash(text,text,text) = true`

Synthetic staging mutation probe:

1. temporary synthetic device inserted as `ACTIVE`
2. cleanup function invoked with deterministic hash-only test data
3. result `revoked_count = 1`
4. readback state `REVOKED`
5. `revoked_at` populated
6. temporary synthetic device deleted; residue `0`

Evidence: `docs/notifications/STAGING_INVALID_TOKEN_CLEANUP_RUNTIME_2026-08-18.md`.

This closes the DB/runtime cleanup boundary, but **does not** yet prove a natural Cloudflare FCM-invalid delivery traversing Queue -> API -> DB. `NOTI-003` and `NOTI-010` therefore remain `PARTIAL`.

### G5 — API clean-CI workspace dependency build order: RESOLVED IN SOURCE

`services/api/package.json` now defines `prepare:workspace-deps` and its `typecheck`/`api:contract` scripts build `@salary-hijacking/utils` before TypeScript validation. The previous `TS2307 @salary-hijacking/utils` root cause is therefore no longer an unresolved source defect. A fresh Actions run on the current documentation descendant is still required before claiming a current-CI PASS.

## Remaining internal/runtime gaps

### G6 — Natural Cron / Queue / DLQ evidence

Fresh Cloudflare staging evidence is still required for:

- natural scheduler Cron execution;
- Queue delivery;
- retry/backoff;
- duplicate delivery = 0 for the tested idempotency key;
- terminal/dead-letter behavior;
- natural invalid-token FCM -> Queue -> API -> DB traversal.

Configuration or unit tests alone do not satisfy this gate.

### G7 — Authenticated notification/user preference runtime

Fresh staging runtime is still required for:

- notification list/read/archive/delete and pagination;
- preferences and quiet-hours/timezone behavior;
- device registration/revoke/list lifecycle.

### G8 — Producer coverage for NOTI-006/007/008

Budget threshold, savings/goal, and growth/community producers require complete staging producer -> Queue -> notification evidence and duplicate-suppression/idempotency verification.

### G9 — End-user push/deeplink runtime

Current-RC/device evidence is still missing for:

- foreground FCM;
- background FCM;
- notification tap to current production route/state;
- provider-invalid current-device cleanup.

This remains linked to D-026/later mobile-release phases and cannot be inferred from server-side evidence.

### G10 — Performance gates

Fresh runtime evidence is still missing for:

- `PERF-016`: valid-token push success >= 98%;
- `PERF-017`: 100,000 budget notifications generated with >=95% inside one minute;
- `PERF-018`: 1,000,000 scheduled/batch jobs completed inside the defined window with duplicate 0.

## CI/security note

The current Phase 5 source has a dedicated validator and deterministic workspace-dependency preparation for the API. No fresh commit status is attached to the latest documentation descendant yet, so CI is not represented as PASS for that SHA.

Separately, dependency/security advisories previously observed remain a Phase 11/release-hardening concern unless a fresh security audit proves them resolved. They are not reclassified as a Phase 5 functional failure.

## Requirement status rule

`docs/notifications/NOTIFICATION_EVENT_MATRIX.csv` is the requirement-level current registry for `NOTI-001..010`. No row is promoted solely because a file, migration, config, or unit test exists. Runtime-required rows remain `PARTIAL` until their corresponding staging/device evidence is attached.

## Next internal work order

1. Capture natural Scheduler Cron and Queue retry/DLQ evidence from staging when the Cloudflare runtime/log control plane is available.
2. Prove natural invalid-token `FCM -> operations Queue -> API -> DB revoke` runtime and add multicast invalid-token cleanup coverage.
3. Execute authenticated notification CRUD/preferences/device lifecycle runtime.
4. Execute `NOTI-006/007/008` domain producer E2E and duplicate suppression.
5. Execute current-RC foreground/background/deep-link validation when Android runtime is available.
6. Execute `PERF-016/017/018` synthetic load gates in the defined performance environment.

## Truthful exit decision

`PHASE_5_STATUS=PARTIAL`

Reason: queue/deeplink integration, bounded retry policy, hash-only invalid-token event emission/consumption, migration 0021, and the staging ACTIVE -> REVOKED cleanup boundary are now implemented and materially verified. Mandatory natural Cloudflare Cron/Queue/DLQ, domain producer, device push/deeplink, and performance runtime evidence are still incomplete. Therefore `D-016=PARTIAL`, `PHASE_6_ENTRY_READINESS=NOT_READY`, `PROJECT_COMPLETION_100=false`, and `COMMERCIAL_LAUNCH_READY=false` remain correct.
