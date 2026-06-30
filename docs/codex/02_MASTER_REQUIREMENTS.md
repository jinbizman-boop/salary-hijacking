---
codex_context: true
priority: P0
scope: repository
last_verified: 2026-06-25
---

# Master Requirements

## Product Requirements

- Users manage a monthly paycheck plan.
- The system separates fixed expenses, savings, daily living budget, and variable expenses.
- The app shows remaining budget and protected paycheck/hijack amount.
- LV UP features support self-development categories such as reading, news, English, and health.
- Community supports anonymous posts, comments, reports, moderation, and safe sharing.
- Notifications support transactional and behavioral reminders without raw sensitive data.
- Admin supports users, community moderation, reports, notices, banners/ads, metrics, and events.

## Server Authority Requirements

- Authoritative calculations must happen on API/DB side.
- Mobile may compute display fallback only.
- Payroll, budget, expense, savings, and hijack amounts must be confirmed by server response.
- KRW values are integers.
- Negative and fractional authoritative money values are invalid.

## Privacy And Ads Requirements

- No raw salary, expense, savings, account, card, loan, token, phone, or email in ads/analytics/logs.
- Ad and partner targeting must not use financial amount/source data.
- Push payloads must not include raw financial values or raw push tokens.
- Exports and admin screens must be masked/redacted where appropriate.

## Engineering Requirements

- Preserve monorepo package boundaries.
- Prefer existing route manifests and package contracts.
- Keep documentation claims aligned with actual command results.
- Do not accept `documentTheoreticalCompleteness` metadata as proof of operational readiness.
- Add tests proportional to changed behavior.
- Update `08_FILE_COMPLETION_LOG.md` after meaningful verification.

## Known Requirements Gaps

- Private ChatGPT project contents were not accessible from the provided share link.
- Several existing files contain document-theoretical completion claims that require real build/test verification.
- Mobile and Admin have client endpoints that need reconciliation with API manifests.
- Notifications/Scheduler now have `tsconfig.json` and pass package typecheck, but build/runtime/deploy verification remains.
- Shared `pnpm` settings now live at the workspace root; package-local dependency/tool resolution still needs full install verification.
