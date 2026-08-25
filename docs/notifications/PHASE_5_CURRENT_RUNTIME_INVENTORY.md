# Phase 5 Current Runtime Inventory

CURRENT_REPOSITORY_HEAD=6c935a523c1a30d62bcf159bfad641cd67fae7d2
APPLICATION_RC_SOURCE_SHA=80cc5cdfb0758478791b19196e2812e7fa6d671f

Staging deployments completed for API, notifications worker, and scheduler worker. The runtime E2E evidence file is `docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json` and records `PASS_CORE_RUNTIME`.

## Services

- `services/api/src/routes/notifications.routes.ts`
- `services/api/src/repositories/notifications.repository.ts`
- `services/scheduler/src/index.ts`
- `services/scheduler/src/jobs/payday-reminder.job.ts`
- `services/scheduler/src/jobs/fixed-expense-reminder.job.ts`
- `services/scheduler/src/jobs/monthly-hijack-close.job.ts`
- `services/notifications/src/index.ts`
- `services/notifications/src/retry-queue.ts`
- `services/notifications/src/fcm.client.ts`
- `services/notifications/src/push-token-cleanup.ts`
- `services/api/wrangler.toml`
- `services/notifications/wrangler.toml`
- `services/scheduler/wrangler.toml`
- `database/migrations/0022_notification_runtime_contract.sql`
- `database/migrations/0023_notification_timezone_archive_constraints.sql`

## Exact Notification API Surface

- `GET /api/v1/notifications`
- `POST /api/v1/notifications`
- `GET /api/v1/notifications/summary`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/read-all`
- `GET /api/v1/notifications/preferences`
- `PUT|PATCH /api/v1/notifications/preferences`
- `GET /api/v1/notifications/devices`
- `POST /api/v1/notifications/devices`
- `DELETE /api/v1/notifications/devices/{deviceId}`
- `POST /api/v1/notifications/test`
- `POST /api/v1/notifications/rules/preview`
- `GET /api/v1/notifications/{notificationId}`
- `POST /api/v1/notifications/{notificationId}/read`
- `POST /api/v1/notifications/{notificationId}/archive`
- `DELETE /api/v1/notifications/{notificationId}`

Known drift: list pagination remains `page/pageSize`, not frozen cursor pagination.
