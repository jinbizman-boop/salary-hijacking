# DB Capability Matrix

Generated: 2026-08-13T15:46:34.210Z

| Capability | Target | Current Evidence | Status |
|---|---|---|---|
| Staging branch isolation | staging branch, not main | Project salary-hijacking, source branch staging (br-fragrant-sky-aj5kk2c3), database neondb | PASS |
| RLS | 41/41 | 41/41 live catalog from Phase 2 evidence | PASS |
| FORCE RLS | required user-owned/sensitive tables | 30 live catalog FORCE RLS rows from Phase 2 evidence | PASS |
| App role BYPASSRLS | false | salary_hijacking_staging_app rolbypassrls=false from Phase 2 evidence | PASS |
| A/B isolation | representative domains | PASS synthetic test, residue 0 from Phase 2 evidence | PASS |
| PITR availability | available for staging recovery planning | Neon Console: NEON_PLAN=Free, RESTORE_WINDOW=6h, PITR_AVAILABLE=YES; temporary PITR branch pitr-rehearsal-20260814 materialized | PASS |
| PITR granularity/RPO | RPO<=15m | Point-in-time target 2026-08-14 00:24 KST, 10 minutes before branch creation target, materialized into branch br-odd-base-ajl0hbn9 | PASS |
| Recovery/RTO | RTO<=2h | Branch materialization conservatively bounded at <2 minutes; application validation/reconnection allowance remains clearly below 2h | PASS |
| Recovered schema validation | 41 public physical tables | Codex read-only SQL on temporary branch verified public physical tables=41 | PASS |
| Recovered migration ledger | 14/14 VERIFIED_APPLIED | Codex read-only SQL on temporary branch verified db_meta.database_schema_migrations rows=14 and VERIFIED_APPLIED=14 | PASS |
| Performance | no pathological critical plan | 10 representative EXPLAIN paths reviewed; no P0 plan issue found in staging | PASS_STRUCTURAL |
| Migration checksums | recorded DB checksums | db_meta.database_schema_migrations records 14/14 file checksums | PASS |

## PITR Closure

DB_009_STATUS=PASS
DB_010_STATUS=PASS
PHASE_2_STATUS=PASS
D_017_STATUS=PASS
PHASE_3_ENTRY_READINESS=READY

The temporary PITR branch currently has Auto-delete=After 1 Day. Codex did not delete it before evidence was written. No production/main branch mutation and no Neon plan upgrade occurred.
