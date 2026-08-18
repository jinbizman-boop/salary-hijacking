# PHASE 5 Scheduler & Notifications — Automation Baseline (2026-08-18)

## Status

- PHASE_5_STATUS: `PARTIAL`
- ENTRY_GATE: `PASS` — Phase 3 internal auth and Phase 4 financial core are available for event production.
- EXIT_GATE: `NOT_MET`
- PHASE_6_ENTRY_READINESS: `NOT_READY`
- D-016: `PARTIAL`
- D-017: `PASS` (preserved; no DB regression evidence introduced here)
- D-013: `FAIL` (UI/Stitch track not executed here)
- D-026: `FAIL` (Android release/runtime track not executed here)
- PROJECT_COMPLETION_100: `false`
- COMMERCIAL_LAUNCH_READY: `false`

## Baseline source

Repository branch: `codex/payroll-reminder-launch-ready-100-20260714`

Phase 4 closure source before Phase 5 work: `6c935a523c1a30d62bcf159bfad641cd67fae7d2`.

Current Phase 5 source for this report: `778edf912e6e16eab17fdde0ee4e901db6fe6cfc` or later evidence-only/documentation descendant on the same branch.

SSOT scope for this phase: NOTI-001..010, scheduler/queue runtime evidence, push/deeplink behavior, and PERF-016/017/018 evidence.

## Verified code surfaces

1. `services/scheduler/src/index.ts` retains the proven scheduler implementation and dispatches payday reminder, fixed-expense reminder, monthly close, and retention jobs.
2. `services/scheduler/src/phase5-entrypoint.ts` is the active Wrangler entrypoint and wraps outbound Queue bindings with the v2.0 event envelope.
3. `services/scheduler/src/phase5-notification-contract.ts` adds `schemaVersion`, `eventId`, `occurredAt`, `correlationId`, and `idempotencyKey` without duplicating financial calculation policy.
4. `services/scheduler/wrangler.toml` has the staging natural cron `0 23 * * *` and staging Queue/DLQ configuration.
5. `services/notifications/src/phase5-entrypoint.ts` is the active notifications Worker entrypoint and upgrades legacy messages, reconciles production deep links, and applies bounded Cloudflare-native exponential retry delay.
6. `services/notifications/src/queue-envelope.ts` validates the Phase 5 Queue envelope.
7. `services/notifications/src/deeplink-contract.ts` maps known notification types to production Expo Router routes `/salary`, `/plan`, `/notifications`, `/level`, and `/community`.
8. `services/notifications/src/retry-queue.ts` contains the persisted retry policy model for failure classification, max attempts, exponential backoff/jitter, duplicate protection, dead-letter decisions, and invalid-token cleanup hooks.
9. `services/notifications/src/push-token-cleanup.ts` contains hash-only stale/invalid/revoked token cleanup policy and repository boundaries.
10. `services/api/src/routes/notifications.routes.ts` contains list/read/archive/delete, preference, device registration/revoke/list, test, and rule-preview contracts.

## Implementation completed in the current Phase 5 work

### G1 — Queue envelope wiring: RESOLVED IN CODE

The scheduler outbound Queue bindings are wrapped at the active Worker entrypoint and every outbound message is enriched with the v2.0 operational envelope. The notifications consumer independently validates/upgrades legacy messages so producer rollout is backward compatible.

### G2 — Deep-link contract drift: RESOLVED IN CODE

Known notification types are normalized to current production Expo Router routes at the scheduler producer boundary and again at the notifications consumer boundary. Device foreground/background/deep-link runtime evidence is still required before NOTI-009 can be PASS.

### G3 — Native Queue retry backoff: PARTIALLY RESOLVED

The active notifications consumer now wraps Cloudflare `message.retry()` with bounded exponential backoff:

- base delay: 30 seconds
- attempt 2: 60 seconds
- attempt 3: 120 seconds
- attempt 4: 240 seconds
- attempt 5: 480 seconds
- maximum delay: 3600 seconds

Wrangler still supplies `max_retries` and dead-letter Queue routing. The richer persisted retry classifier is not yet the active Worker repository path, so terminal classification and invalid-token cleanup are not declared complete.

### Build/metadata truth alignment: RESOLVED IN CODE

`services/notifications/package.json` and `services/scheduler/package.json` now identify their Phase 5 compatibility entrypoints as the active worker entrypoints and require the newly introduced Phase 5 modules in `build:verify`. This prevents a build from passing while omitting the code Wrangler actually deploys.

## Regression found and corrected

An initial retry-wrapper change failed strict TypeScript because `exactOptionalPropertyTypes` forbids explicitly setting `retry: undefined`. The wrapper was corrected to omit the property when the original Queue message has no retry callback. The failed CI evidence is retained rather than hidden; fresh CI is required for the corrected source.

## Remaining internal gaps

### G4 — Invalid-token cleanup active runtime

The retry policy can classify invalid tokens and the cleanup service exists, but the active notifications Worker does not yet have the repository/API adapter required to deactivate the corresponding `user_devices` record from a provider failure using hash-only identifiers. `NOTI-003` and the cleanup portion of `NOTI-010` remain `PARTIAL`.

### G5 — Natural-run / Queue / DLQ runtime evidence

Code/config presence is insufficient. Fresh staging evidence is still required for:

- natural Cloudflare scheduler cron execution
- Queue delivery/retry/backoff
- duplicate delivery = 0 for the tested idempotency key
- terminal/DLQ behavior
- invalid-token cleanup

### G6 — End-user push runtime

Fresh current-RC/device evidence is missing for:

- FCM foreground delivery
- FCM background delivery
- notification tap -> production deep link
- revoked/invalid device token cleanup

This remains linked to the later Android runtime track and cannot be promoted to PASS here.

### G7 — Producer coverage for NOTI-006/007/008

Budget threshold, savings/goal, and growth/community producers still require complete staging producer-to-Queue-to-notification evidence with their domain idempotency rules.

### G8 — Performance gates

No fresh runtime evidence yet proves:

- PERF-016 valid-token push success >= 98%
- PERF-017 100,000 budget notification generation with 95% within one minute
- PERF-018 1,000,000 scheduled/batch jobs inside the defined window with duplicate 0

These must not be inferred from unit tests.

## CI / security note

The Phase 5 code itself is under fresh CI. A prior strict-typecheck defect in the retry wrapper was fixed. Separately, repository dependency review/security audit currently reports pre-existing high-severity production dependency advisories. This is a real Security/PHASE 11 blocker and is not reclassified as a Phase 5 functional failure, but it remains release-blocking until the dependency graph/lockfile is safely remediated and re-audited.

## Requirement status rule

`docs/notifications/NOTIFICATION_EVENT_MATRIX.csv` is the current requirement-level status registry for NOTI-001..010. No row is promoted solely because a file or test exists. Runtime-required rows remain `PARTIAL` until staging/device evidence is attached.

## Next internal work order

1. Finish fresh CI on the corrected Phase 5 entrypoint/build contract.
2. Add a staging-safe adapter for invalid-token cleanup without logging raw push tokens.
3. Capture natural scheduler cron and Queue retry/DLQ evidence from staging when the execution context can invoke/read the required Cloudflare resources.
4. Execute authenticated notification CRUD/preferences/device lifecycle runtime.
5. Execute NOTI-006/007/008 domain producer E2E and duplicate suppression.
6. Execute current-RC/device foreground/background/deep-link validation when Android runtime is available.
7. Run PERF-016/017/018 synthetic load gates in the defined performance environment.

## Truthful exit decision

`PHASE_5_STATUS=PARTIAL`

Reason: queue-envelope/deep-link integration and bounded native Queue retry have materially advanced, but invalid-token cleanup wiring and mandatory staging/device/performance runtime evidence are still incomplete. `D-016` therefore remains `PARTIAL`; Phase 6 is not started by this status report; project and commercial-launch completion flags remain false.
