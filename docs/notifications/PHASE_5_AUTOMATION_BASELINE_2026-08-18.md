# PHASE 5 Scheduler & Notifications — Automation Baseline (2026-08-18)

## Status

- PHASE_5_STATUS: `PARTIAL`
- ENTRY_GATE: `PASS` — Phase 3 internal auth and Phase 4 financial core are available for event production.
- EXIT_GATE: `NOT_MET`
- D-016: `PARTIAL`
- D-017: `PASS` (preserved; no DB regression evidence introduced here)
- D-013: `FAIL` (UI/Stitch track not executed here)
- D-026: `FAIL` (Android release/runtime track not executed here)
- PROJECT_COMPLETION_100: `false`
- COMMERCIAL_LAUNCH_READY: `false`

## Baseline source

Repository branch: `codex/payroll-reminder-launch-ready-100-20260714`

Phase 4 closure source before this automation: `6c935a523c1a30d62bcf159bfad641cd67fae7d2`.

SSOT scope for this phase: NOTI-001..010, scheduler/queue runtime evidence, push/deeplink behavior, and PERF-016/017/018 evidence.

## Verified code surfaces

1. `services/scheduler/src/index.ts` exposes Cloudflare `fetch`, `scheduled`, and `queue` entrypoints and dispatches payday reminder, fixed-expense reminder, monthly close, and retention jobs.
2. `services/scheduler/wrangler.toml` has a staging natural cron (`0 23 * * *`) and staging producers for scheduler operations, notification retry, and growth events.
3. `services/notifications/src/index.ts` exposes Cloudflare `fetch`, `scheduled`, and `queue` entrypoints and supports FCM single/multicast/topic/condition/validate operations.
4. `services/notifications/src/retry-queue.ts` already contains a durable retry policy model: max attempts, exponential delay/jitter, duplicate protection, dead-letter decisions, and invalid-token cleanup hooks.
5. `services/notifications/src/push-token-cleanup.ts` already contains hash-only stale/invalid/revoked token cleanup policy and repository boundaries.
6. `services/notifications/wrangler.toml` declares staging retry/operation queue consumers with a staging DLQ, but the staging notifications-worker cron list is empty.
7. `services/api/src/routes/notifications.routes.ts` contains list/read/archive/delete, preferences, device registration/revoke/list, and notification test/rule-preview contracts.
8. Current Expo Router production route surfaces include `/salary`, `/plan`, `/notifications`, `/level`, and `/community`.

## New implementation added in this automation

### Canonical queue envelope

`services/notifications/src/queue-envelope.ts`

Introduces the SSOT-required backwards-compatible queue metadata contract:

- `schemaVersion = 1.0`
- `eventId`
- `occurredAt`
- `correlationId`
- `idempotencyKey`

The helper can enrich the current `{ type, requestId, payload, retryDelaySeconds }` message shape without changing the existing queue routing key. It rejects malformed/missing identifiers and provides a legacy-message adapter for incremental rollout.

Unit contract added:

`services/notifications/tests/unit/queue-envelope.test.ts`

### Canonical production deep links

`services/notifications/src/deeplink-contract.ts`

Maps notification event types to production Expo Router routes that actually exist on the current branch:

- payroll/budget/hijack -> `/salary`
- fixed expense/savings due -> `/plan`
- growth -> `/level`
- community -> `/community`
- notice/security/system -> `/notifications`

Unit contract added:

`services/notifications/tests/unit/deeplink-contract.test.ts`

This intentionally marks the existing legacy producer form such as `salary-hijacking://payroll/payday/...` non-canonical until the producers are wired to the resolver.

### Requirement/event matrix

`docs/notifications/NOTIFICATION_EVENT_MATRIX.csv`

NOTI-001..010 have been individually classified. No requirement was falsely promoted to PASS because fresh staging/natural-run evidence was not available in this automation environment.

## Internal gaps found

### G1 — Queue envelope is not yet wired into active producers/consumer

The current scheduler notification message interfaces and notifications worker queue message interface do not yet carry the SSOT envelope fields. The new module is ready for integration, but runtime producer/consumer wiring remains required.

### G2 — Deep-link route drift exists

At least the payday producer currently builds a legacy deep link below the canonical Expo Router route hierarchy. The new resolver establishes the target contract, but active producer code still needs migration and mobile runtime proof.

### G3 — Durable retry module and live queue handler are not yet one path

`retry-queue.ts` contains the full retry/dead-letter/idempotency policy, while `notifications/src/index.ts` currently calls Cloudflare `message.retry()` directly after a failed send. This is not enough to claim NOTI-010 runtime closure until the durable policy path is wired and exercised.

### G4 — Push-token cleanup is implemented as a service module but not naturally executed by the staging notifications cron

The notifications staging cron list is empty, and the current notifications scheduled handler emits readiness metadata rather than running token cleanup. Scheduler staging has a natural cron, so cleanup may be integrated there or the notifications staging cron can be enabled after a staging-safe route/repository path is wired.

### G5 — Natural-run and load evidence is still missing

No fresh evidence was generated here for:

- Cloudflare natural cron outcome
- queue retry/backoff/terminal/DLQ runtime
- foreground/background FCM delivery
- device invalid-token cleanup
- 100k notification generation / 1M batch generation
- push success >=98%

These remain runtime gates, not code-existence gates.

## Next internal work order

1. Wire `queue-envelope.ts` into scheduler notification/growth producers and validate it in the notifications queue consumer.
2. Wire `deeplink-contract.ts` into payday/fixed-expense/monthly-close plus budget/savings/growth/community producers; add contract tests against actual Expo routes.
3. Integrate `retry-queue.ts` with the notifications queue consumer so retry decisions, terminal status, duplicate protection, and invalid-token cleanup use one durable policy path.
4. Integrate `push-token-cleanup.ts` with a staging-safe scheduled/queue path and ensure the staging cron actually exercises it.
5. Run unit/typecheck/build/security regressions.
6. Deploy only to staging and capture health/ready/natural-cron/queue runtime evidence when credentials are available in the execution environment.
7. Run synthetic duplicate/retry/deeplink/token-cleanup scenarios, then performance generation harnesses.

## Truthful exit decision

`PHASE_5_STATUS=PARTIAL`

Reason: meaningful Phase 5 contract code and exact gap classification were added, but active producer/consumer integration and required staging/natural-run evidence are still incomplete. Therefore `D-016` remains `PARTIAL`, Phase 6 entry is not declared from this run, and project/release completion flags remain false.
