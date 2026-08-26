# Community Staging E2E Report

Timestamp: 2026-08-26T15:24:35.527Z

Status: PASS_STAGING_RUNTIME

Evidence: docs/growth-community/PHASE_6_STAGING_RUNTIME_EVIDENCE.json

Validated runtime path:
- board list
- post create/detail
- cross-user public read
- cross-user owner update denial
- comment create and cross-user comment update denial
- report create
- TNS held-content status

Direct-ID matrix: docs/growth-community/PHASE_6_DIRECT_ID_STAGING_RUNTIME_MATRIX.csv

RLS catalog evidence: live staging app role has BYPASSRLS=false; representative Phase 6 tables have RLS enabled and policies present. Public community post read remains allowed by contract; private owner resources are denied through API direct-ID tests.
