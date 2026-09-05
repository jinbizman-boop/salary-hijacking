# Quiet Hours and Timezone Report

QUIET_HOURS=PASS_FOR_SUPPORTED_TIMEZONE_SET
NOTIFICATION_TIMEZONE=PARTIAL_LIMITED_TIMEZONE_SET

Migration 0023 supports `Asia/Seoul`, `UTC`, `America/New_York`, and `Asia/Tokyo` in `user_settings.timezone`. Staging E2E persisted `UTC` quiet-hours preference and read it back through `GET /api/v1/notifications/preferences`.

Arbitrary IANA timezone support is not claimed. Broader timezone support requires a future explicit policy/migration.
