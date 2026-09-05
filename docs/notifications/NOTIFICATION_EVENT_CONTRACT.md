# Notification Event Contract

Canonical envelope: `schemaVersion`, `eventId`, `eventType`, `occurredAt`, `correlationId`, plus minimum identifiers such as `userId`, `cycleId`, `expenseId`, `savingPlanId`, `budgetId`, `taskId`, or `postId`.

Payload exclusions: raw salary, raw expense amount, raw savings amount, email, phone, access/refresh/reset/OAuth token, push token, MFA secret, and free-text community body.

Consumers load authorized current data server-side using identifiers. Same eventId/idempotency key must not create duplicate logical notifications or duplicate provider deliveries.
