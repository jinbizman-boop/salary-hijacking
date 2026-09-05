# PHASE 0 Decision Log

Generated: 2026-08-13 Asia/Seoul

## DEC-001

237 normative requirements from the v2.0 full-stack function/performance definition are the PROJECT_COMPLETION denominator.

Status: ACCEPTED

## DEC-002

The legacy 305-row trace matrix is not the canonical denominator. It is preserved unchanged and reconciled in `PHASE_0_LEGACY_305_RECONCILIATION.csv`.

Status: ACCEPTED

## DEC-003

Stitch 304 states are UI acceptance states and are managed in `PHASE_0_STITCH_STATE_REGISTRY.csv`, separate from the 237 normative denominator.

Status: ACCEPTED

## DEC-004

Defects/gates D-013, D-016, D-017, and D-026 are managed in `PHASE_0_GATE_REGISTRY.csv`, separate from the 237 denominator.

Status: ACCEPTED

## DEC-005

P0/P1 are launch mandatory by default. P2 is platform completion. P3/FUTURE_OPTION can be excluded from a launch denominator only by explicit decision.

Status: ACCEPTED

## DEC-006

Current implementation status never reduces the target v2.0 specification. Missing or partial implementation remains a gap, not a spec downgrade.

Status: ACCEPTED

## DEC-007

Exact legacy source filenames requested but not present in the repository are recorded as `UNRESOLVED_SOURCE_PATH` instead of guessed paths.

Status: ACCEPTED
