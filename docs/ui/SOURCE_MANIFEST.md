# Salary Hijacking UI Source Manifest

Generated: 2026-07-19 KST

This manifest is the UI/UX finalization intake record. It records what is present in `C:/Users/PC/Desktop/salary-hijacking-platform`, what has been analyzed, and which sources remain unavailable or externally blocked. Raw ZIP payloads and large extracted reference projects are not committed into product source.

## Repository

- Implementation root: `C:/Users/PC/Desktop/salary-hijacking-platform`
- Current branch at intake: `codex/payroll-reminder-launch-ready-100-20260714`
- Package manager: `pnpm` via Corepack
- Mobile framework: Expo Router, React Native, TypeScript
- Backend/admin/workers: Cloudflare Workers, Next/OpenNext admin, Neon/Postgres packages, Turborepo
- Primary mobile app path: `apps/mobile`
- Shared UI tokens: `apps/mobile/src/shared/components/tokens.ts`
- Canonical Stitch references: `docs/design/stitch/2026-07-16`
- Current mobile visual evidence: `release/evidence/mobile-ui/capture-summary.json`

## Input Materials

| Source                                                                                                                                          | Status                 | Evidence                                                                                  | Notes                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Current repository                                                                                                                              | FOUND                  | `git rev-parse --show-toplevel` returns `C:/Users/PC/Desktop/salary-hijacking-platform`   | Authoritative implementation target.                                          |
| `salary-hijacking-platform.zip` or equivalent project source                                                                                    | EQUIVALENT_PRESENT     | Current checked-out repository                                                            | No separate zip required for implementation.                                  |
| Stitch design system ZIP set                                                                                                                    | FOUND                  | `docs/design/stitch/2026-07-16/stitch-screen-inventory.json`                              | 10 source ZIPs recorded from `C:/Users/PC/Downloads`; raw ZIPs not committed. |
| Stitch canonical PNG/HTML                                                                                                                       | FOUND                  | 17 PNG and 17 HTML files under `docs/design/stitch/2026-07-16`                            | Used for visual structure only; HTML is not pasted into RN.                   |
| `급여납치 어플리케이션 디자인.pdf`                                                                                                              | PARTIAL                | Referenced in prior docs/evidence; exact local PDF path not yet re-confirmed in this pass | Must remain secondary to latest Stitch for visuals, except brand identity.    |
| `급여납치 화면 및 기능 설계 기획안.html`                                                                                                        | PARTIAL                | Referenced in goal and prior docs                                                         | Needs exact path re-confirmation in the next document sweep.                  |
| `Paycheck accounting(급여 납치) 개발 문서.zip`                                                                                                  | NOT_FOUND_IN_THIS_PASS | Download search found no matching file name                                               | Continue searching broader workspace before closing G01.                      |
| `oh-my-codex-main.zip`                                                                                                                          | NOT_FOUND_IN_THIS_PASS | Download search found no matching file name                                               | Optional orchestration reference only.                                        |
| `oh-my-openagent-dev.zip`                                                                                                                       | NOT_FOUND_IN_THIS_PASS | Download search found no matching file name                                               | Optional agent reference only.                                                |
| `[참고용] 네이버 오픈소스.zip`                                                                                                                  | NOT_FOUND_IN_THIS_PASS | Download search found no matching file name                                               | Do not import without license review.                                         |
| `docs/**`                                                                                                                                       | FOUND                  | `rg --files docs` counted 370 files                                                       | Existing completion/evidence corpus is extensive.                             |
| `docs/codex/100-completion/**`                                                                                                                  | FOUND                  | 174 files                                                                                 | Prior implementation and QA evidence.                                         |
| `MASTER_SPEC_v3.md`, `APPENDIX_A_adsense_v3_1.md`, `repo-structure.md`, `implementation-checklist.md`, `00_SCREEN_SPECIFICATION.md`, `guide.md` | PARTIAL                | Some names were not surfaced by the first targeted search                                 | Continue broader source-document indexing before G01/G02 PASS.                |
| `AGENTS.md`                                                                                                                                     | FOUND                  | Repository root                                                                           | Updated by this UI finalization pass.                                         |

## Stitch Inventory Summary

- Source ZIP count: 10
- Relevant entries recorded: see `docs/design/stitch/2026-07-16/stitch-screen-inventory.json`
- Canonical screens resolved: 17
- Canonical HTML resolved: 17
- Missing canonical screens: 0
- Missing canonical HTML: 0
- Raw source ZIP policy: source ZIP files remain in Downloads or external artifact storage; repository stores canonical extracted references and manifests only.

## Current Visual Evidence

- Mobile UI screenshot count: 30
- Store screenshot count: 6
- Responsive checks: 120
- Widths verified in current evidence: 320, 360, 375, 390, 393, 412, 430, 768
- Horizontal overflow in current evidence: 0
- Physical Android phone QA: BLOCKED until a real device is attached and `scripts/release/run-physical-phone-qa.mjs` passes.

## Commands

- Install: `corepack pnpm install --frozen-lockfile`
- Root format: `corepack pnpm run format:check`
- Mobile lint: `corepack pnpm --filter @salary-hijacking/mobile run lint`
- Mobile typecheck: `corepack pnpm --filter @salary-hijacking/mobile run typecheck`
- Mobile tests: `corepack pnpm --filter @salary-hijacking/mobile test`
- Mobile web export: `corepack pnpm --filter @salary-hijacking/mobile run export:web`
- Visual capture: `node scripts/release/capture-mobile-clean-fintech-screenshots.mjs`
- Stitch intake: `node scripts/release/prepare-stitch-design-system.mjs --downloads "C:/Users/PC/Downloads"`
- Preview APK build: `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`
- Release readiness: `corepack pnpm run check:release-readiness`
- Junk cleanup: `corepack pnpm run clean:junk`

## Intake Gaps

- G01 is not yet fully PASS because several named external ZIP/PDF/HTML materials still need a broader path search and/or re-attachment confirmation.
- G02 is not yet PASS because requirements are traced to current canonical screens and evidence, but not yet exhaustively to every source document.
- The repository has enough current evidence to continue implementation, but not enough to claim final 100% UI completion.
