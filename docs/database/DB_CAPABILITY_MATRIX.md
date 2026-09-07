# DB Capability Matrix

Generated: 2026-09-07T21:35:31.838Z

| Capability | Target | Current Evidence | Status |
|---|---|---|---|
| Staging branch isolation | staging branch, not main | Project salary-hijacking, branch staging, database neondb | PASS |
| RLS | 41/41 | 41/41 live catalog | PASS |
| FORCE RLS | required user-owned/sensitive tables | 30 live catalog FORCE RLS rows | PASS |
| App role BYPASSRLS | false | salary_hijacking_staging_app rolbypassrls=false | PASS |
| A/B isolation | representative domains | PASS synthetic test, residue 0 | PASS |
| PITR | RPO<=15min | PITR rehearsal selected a 10-minute recovery point and materialized a temporary branch with 41 public tables verified | PASS |
| Recovery | RTO<=2h | Forward recovery and PITR branch materialization plus validation allowance remain below the 2-hour target | PASS |
| Performance | no pathological critical plan | 10 representative EXPLAIN paths reviewed; no P0 plan issue found in staging | PASS_STRUCTURAL |
| Migration checksums | recorded DB checksums | db_meta.database_schema_migrations records 28/28 file checksums | PASS |
