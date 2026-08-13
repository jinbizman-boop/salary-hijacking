# DB Capability Matrix

Generated: 2026-08-13T15:15:03.812Z

| Capability | Target | Current Evidence | Status |
|---|---|---|---|
| Staging branch isolation | staging branch, not main | Project salary-hijacking, branch staging (br-fragrant-sky-aj5kk2c3), database neondb; MCP compute ep-young-sunset-ajgi3bab read_write in aws-us-east-2 | PASS |
| RLS | 41/41 | 41/41 live catalog from prior Phase 2 evidence | PASS |
| FORCE RLS | required user-owned/sensitive tables | 30 live catalog FORCE RLS rows from prior Phase 2 evidence | PASS |
| App role BYPASSRLS | false | salary_hijacking_staging_app rolbypassrls=false from prior Phase 2 evidence | PASS |
| A/B isolation | representative domains | PASS synthetic test, residue 0 from prior Phase 2 evidence | PASS |
| PITR availability | available for staging recovery planning | User Console: PITR_AVAILABLE=YES, RESTORE_WINDOW=6h, NEON_PLAN=Free; official Neon docs confirm Free history window 6h and instant restore/PITR uses retained history | VERIFIED_BY_USER_CONSOLE_AND_DOCS |
| PITR granularity | prove RPO<=15m | Official Neon docs state root branch instant restore supports timestamp/LSN and down-to-millisecond restore, but local API/CLI metadata could not verify staging branch root/PITR granularity; no branch rehearsal was executed | UNVERIFIED_GRANULARITY |
| RPO | <=15 minutes | 6h history window is sufficient range, but range is not the same as demonstrated RPO; granularity was not verified through local API/CLI/rehearsal | EXTERNAL_BLOCKER |
| Recovery/RTO | <=2 hours | Internal forward recovery PASS; actual branch-based PITR rehearsal not executed because local Neon tooling lacked parent/timestamp restore path without OAuth | EXTERNAL_BLOCKER |
| Performance | no pathological critical plan | 10 representative EXPLAIN paths reviewed; no P0 plan issue found in staging | PASS_STRUCTURAL |
| Migration checksums | recorded DB checksums | db_meta.database_schema_migrations records 14/14 file checksums | PASS |

## Official Sources

- https://neon.com/docs/introduction/history-window
- https://neon.com/docs/introduction/branch-restore
- https://neon.com/docs/manage/backups

## Decision

PHASE_2_STATUS=EXTERNAL_BLOCKER because DB-009/DB-010 cannot be promoted without an API/CLI/Console recovery rehearsal or equivalent no-secret metadata proving staging PITR root-branch granularity and RTO. No production, main, or staging reset/replace operation was performed.
