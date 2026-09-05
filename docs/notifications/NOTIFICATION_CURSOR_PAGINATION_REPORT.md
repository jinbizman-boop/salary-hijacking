# Notification Cursor Pagination Report

NOTIFICATION_LIST=PASS
CURSOR_DUPLICATES=0
CURSOR_MISSING_ROWS=0
CURSOR_SEEDED_ROWS=105
CURSOR_TRAVERSED_ROWS=107
MALFORMED_CURSOR_REJECTED=PASS
LIMIT_MAX_CLAMP=PASS

Implementation uses keyset pagination over the stable tuple `created_at, notification_id`. The cursor is opaque base64url JSON containing only ordering fields; it excludes PII and financial data.

PERF_008=PASS
PERF_008_SAMPLE_COUNT=35
PERF_008_P50_MS=580.13
PERF_008_P95_MS=660.42
PERF_008_P99_MS=662.19
PERF_008_TARGET_MS=700

Evidence: `docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json`, `docs/notifications/NOTIFICATION_CURSOR_RUNTIME_MATRIX.csv`.
