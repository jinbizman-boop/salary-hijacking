# Phase 7 Rollback Runbook

ROLLBACK_RUNBOOK_STATUS=PASS_INTERNAL

## Guardrails

- No automatic production rollback is executed by Phase 7.
- Never force push or rewrite shared history.
- Rollback requires a focused, reviewed revert or provider rollback with explicit approval.

## API/Admin Rollback

1. Identify the exact commit, deployment version, and affected Worker/admin surface.
2. Confirm whether the issue is route, repository, RBAC, or provider configuration.
3. Prefer a forward fix for schema-compatible repository defects.
4. If rollback is approved, use provider version rollback or a focused revert commit.
5. Re-run Phase 0-7 validators, API contract, typecheck, build, and secret scan.

## Ads Rollback

- Pause the affected campaign rather than deleting data.
- Keep admin_audit_logs evidence with reason and actor.
- Verify no raw financial targeting payload is present.

## DB Rollback

- Do not edit historical migrations.
- Use additive repair migrations only.
- Preserve migration ledger/checksum governance from Phase 2.
