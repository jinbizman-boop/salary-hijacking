# Phase 6 Performance Report

Timestamp: 2026-08-26T15:24:35.527Z

PERF-007 status: PASS

Endpoint: GET /api/v1/community/posts?pagination=cursor&pageSize=20

Samples: 40
Concurrency: 1
p50 ms: 706.64
p95 ms: 762.97
p99 ms: 827.12
Target p95 ms: 800
5xx/timeouts: 0 observed in harness summary

Evidence: docs/growth-community/PHASE_6_STAGING_RUNTIME_EVIDENCE.json

Note: Cursor path is used for measurement. Offset/count list mode is not used as PERF-007 PASS evidence.
