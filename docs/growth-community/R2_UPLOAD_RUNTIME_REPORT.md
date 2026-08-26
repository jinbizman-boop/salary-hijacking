# R2 Upload Runtime Report

Timestamp: 2026-08-26T15:24:35.527Z

Status: AVAILABLE_PASS_STAGING_RUNTIME

Preflight: docs/growth-community/PHASE_6_STAGING_PREFLIGHT.json
Evidence: docs/growth-community/PHASE_6_STAGING_RUNTIME_EVIDENCE.json

Binding:
- Worker staging binding present: true
- R2 runtime accessible: true
- bucket: salary-hijacking-staging-uploads

Migration repair:
- 0025_uploads_runtime_metadata_repair applied to Neon staging after live attachments table was missing 0010 upload metadata columns.
- Ledger status: VERIFIED_APPLIED.
