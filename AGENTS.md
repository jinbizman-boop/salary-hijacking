# AGENTS.md - Salary Hijacking Codex Rules

## Auto-Approval Scope

The user has pre-approved ordinary internal development work in this repository. Do not ask for approval before planning, testing, editing, refactoring, local builds, preview APK builds, safe junk cleanup, evidence updates, commits, feature-branch pushes, or PR updates.

Still require explicit user approval for production infrastructure deployment, production DB migration, production AAB build, Google Play upload/submit, new keystore, secret rotation, destructive migration, force push/history rewrite, direct push to `main`, PR merge, real payments, real push campaigns, and real account deletion.

## Repository

Work only in `C:/Users/PC/Desktop/salary-hijacking-platform` unless the user explicitly names another path. Ignore old sibling workspaces such as `salary-hijacking-main` and `salary-hijacking-work` for implementation.

Key areas:

- Mobile app: `apps/mobile`
- Admin app: `apps/admin`
- API Worker: `services/api`
- Notifications Worker: `services/notifications`
- Scheduler Worker: `services/scheduler`
- DB/domain packages: `packages`
- Release evidence: `release`
- UI finalization docs: `docs/ui`
- Long-running Codex completion evidence: `docs/codex/100-completion`

## Install And Commands

- Install: `corepack pnpm install --frozen-lockfile`
- Root format: `corepack pnpm run format:check`
- Quality: `corepack pnpm run quality`
- Build: `corepack pnpm run build`
- Release readiness: `corepack pnpm run check:release-readiness`
- Junk cleanup: `corepack pnpm run clean:junk`
- Mobile lint: `corepack pnpm --filter @salary-hijacking/mobile run lint`
- Mobile typecheck: `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
- Mobile tests: `corepack pnpm --filter @salary-hijacking/mobile test`
- Mobile web export: `corepack pnpm --filter @salary-hijacking/mobile run export:web`
- Mobile visual capture: `node scripts/release/capture-mobile-clean-fintech-screenshots.mjs`
- Phone APK: `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`

## UI Source Of Truth

Use this precedence:

1. Security, privacy, accessibility, legal, server-authority, and ads-data-separation rules
2. User's latest explicit instruction
3. `docs/ui/**` and current release evidence
4. Product planning docs and `docs/codex/**`
5. Stitch `screen.png` for visual structure
6. Stitch `code.html`/`DESIGN.md` for token and hierarchy extraction only
7. PDF 17-screen design as brand/legacy visual reference
8. Existing implementation

Never paste Stitch HTML into React Native, never use screenshots as UI backgrounds, and never add CDN runtime dependencies from prototype HTML.

## UI Implementation Rules

- Use `apps/mobile/src/shared/components/tokens.ts` for colors, radius, spacing, typography, and shadows.
- Prefer shared components before creating screen-local buttons, cards, tabs, headers, inputs, or state views.
- Keep `#006A37` as the current semantic primary green unless `docs/ui/UI_DECISION_LOG.md` is updated with evidence.
- Do not randomly mix `#006A37` and `#209252` across screens.
- Keep all money values formatted for `ko-KR` and KRW display.
- Keep iOS/Android safe area, keyboard avoidance, and bottom-tab scroll padding intact.
- Provide accessibility labels for meaningful icons and inputs.
- Keep ad/partner UI labeled and separated from raw financial data.

## Architecture Rules

- User-facing API prefix: `/api/v1`
- Admin API prefix: `/admin/api/v1`
- Financial calculations are server-authoritative.
- The client may collect input, display state, and handle optimistic UX, but must not become the source of truth for payroll, budget, expense, savings, or hijack amount calculations.
- KRW authoritative values are integers.
- Store time in UTC and present user-facing Korean time in Asia/Seoul.
- Admin mutations require RBAC, reason capture, and audit logging.

## Privacy And Security

Never expose raw salary, income, expense, savings, hijack amount, account, card, loan, resident number, phone, email, auth token, refresh token, push token, device identifier, private key, DB URL, JWT secret, service account, or FCM key to ads, analytics, logs, public exports, screenshots, fixtures, or push payloads.

Secrets and credentials must remain redacted in evidence. Do not print secret values.

## Completion Definition

Do not claim project, launch, or UI 100% completion unless the relevant `docs/ui` gates, lint, typecheck, tests, E2E, visual regression, accessibility, responsive matrix, production/release build, APK/device QA, release evidence, and blocker matrix all prove completion.

Allowed wording:

- `PASS within this test scope`
- `PARTIAL`
- `BLOCKED by missing device/credential/external approval`
- `Not verified`

Forbidden wording:

- `100% complete`
- `final`
- `launch-ready`
- `no issues`

unless the current evidence proves every required gate.

## Documentation Updates

When meaningful UI work changes source behavior or evidence, update the relevant files under `docs/ui/**`, release evidence, and `docs/codex/08_FILE_COMPLETION_LOG.md` where applicable.
