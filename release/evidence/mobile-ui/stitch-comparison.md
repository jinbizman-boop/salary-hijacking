# Stitch UI Comparison - 2026-07-25

## Summary

- Source ZIP: `C:/Users/PC/Downloads/stitch_salary_hijacking_design_system_classified.zip`
- Source ZIP paths: recorded in `docs/design/stitch/2026-07-16/source-zips/source-zips-manifest.json`; raw ZIPs are not committed.
- Canonical references: `docs/design/stitch/2026-07-16/screens` and `docs/design/stitch/2026-07-16/html`.
- Inventory: `docs/design/stitch/2026-07-16/STITCH_SCREEN_INVENTORY.md`.
- Extraction rule: Stitch `screen.png`, `code.html`, and `DESIGN.md` were used only to extract tokens and structure. Stitch HTML was not pasted into React Native.
- Runtime policy: server-authority financial calculations, loading/error/empty states, privacy protection, and ad/finance data separation remain intact.
- Classified design inventory: 304 supplied Stitch items plus 1 synthetic SCR-029 row, 305 matrix rows total.
- Matrix status as of this report: PASS 305 / PARTIAL 0 / FAIL 0 / BLOCKED 0.
- Artifact type count: screen 224, modal 41, bottom_sheet 17, multi_state_board 14, flow_board 9.
- Current audit evidence: `docs/qa/STITCH_IMPLEMENTATION_MATRIX_AUDIT.md` and `docs/qa/STITCH_EVIDENCE_STATUS.md`. This report proves classified inventory coverage and synchronized native visual/test evidence for all tracked Stitch rows. It does not claim physical Android phone QA, production AAB, Play submission, or final release-like QA APK completion.

## Screen Matrix

| Screen | Stitch reference | Source ZIP | RN implementation | Reflected visual intent | Function/API/privacy status |
|---|---|---|---|---|---|
| Splash | `docs/design/stitch/2026-07-16/screens/splash.png` | stitch_salary_hijacking_design_system (2).zip | auth/capture splash routes | Centered brand launch surface, green/black typography, no system-bar overlap in captured viewport. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Login | `docs/design/stitch/2026-07-16/screens/login.png` | stitch_salary_hijacking_design_system (2).zip | auth login route/components | Logo, rounded inputs, social/provider affordances, white surface hierarchy. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Signup | `docs/design/stitch/2026-07-16/screens/signup.png` | stitch_salary_hijacking_design_system (2).zip | auth signup route/components | Same auth hierarchy, large CTA, validation retained. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Salary Home | `docs/design/stitch/2026-07-16/screens/salary-home.png` | stitch_salary_hijacking_design_system (3).zip | SalaryHeroCard, SalaryMetricGrid, FixedExpenseSection, DailyBudgetSection, VariableExpenseQuickAdd | Green money hero, white cards, large KRW values, planned/completed state colors. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Notifications | `docs/design/stitch/2026-07-16/screens/notifications.png` | stitch_salary_hijacking_design_system (4).zip | notification stack route/components | Standalone list/card screen plus empty/offline/error states; bottom tab intentionally excluded. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Plan Settings | `docs/design/stitch/2026-07-16/screens/plan-settings.png` | stitch_salary_hijacking_design_system (2).zip | PlanProgressCard, PlanBreakdownSection, PlanActionList | Goal progress card, table-like cards, settings affordance styling. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Level Main | `docs/design/stitch/2026-07-16/screens/level-main.png` | stitch_salary_hijacking_design_system (7).zip | LevelHeroCard, LevelActionGrid, XpRewardToast | Large XP/level hierarchy, rounded action grid, green CTAs. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Reading | `docs/design/stitch/2026-07-16/screens/reading.png` | stitch_salary_hijacking_design_system (8).zip | ReadingContentCard, RecordInputCard | Content cards and record-required CTA structure. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| News | `docs/design/stitch/2026-07-16/screens/news.png` | stitch_salary_hijacking_design_system (9).zip | NewsBalanceCard, RecordInputCard | News card hierarchy, balanced reading record CTA. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| English | `docs/design/stitch/2026-07-16/screens/english.png` | stitch_salary_hijacking_design_system (7).zip | EnglishLessonCard, RecordInputCard | Lesson cards, green action button, record-safe layout. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Health | `docs/design/stitch/2026-07-16/screens/health.png` | stitch_salary_hijacking_design_system (7).zip | WorkoutTimerCard, RecordInputCard | Timer/safety layout, health policy copy retained. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Community All | `docs/design/stitch/2026-07-16/screens/community-all.png` | stitch_salary_hijacking_design_system (7).zip | CommunityTabBar, PopularPostSection, CommunityPostCard | Filled selected tabs and rounded post cards. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Community Free | `docs/design/stitch/2026-07-16/screens/community-free.png` | stitch_salary_hijacking_design_system (7).zip | CommunityTabBar, CommunityPostCard | Board filter tab and post card system. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Community Level Certification | `docs/design/stitch/2026-07-16/screens/community-level-certification.png` | stitch_salary_hijacking_design_system (7).zip | CommunityTabBar, CommunityPostCard | Level certification tab state with same card grammar. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Community Hobby | `docs/design/stitch/2026-07-16/screens/community-hobby.png` | stitch_salary_hijacking_design_system (7).zip | CommunityTabBar, CommunityPostCard | Hobby tab state with same card grammar. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Community Write | `docs/design/stitch/2026-07-16/screens/community-write.png` | stitch_salary_hijacking_design_system (8).zip | community write route/components, ComposeBottomSheet | Title/body/options write structure; attachment/privacy flow retained. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Profile | `docs/design/stitch/2026-07-16/screens/profile.png` | stitch_salary_hijacking_design_system (8).zip | ProfileHeader, ProfileStatGrid, ProfileMenuCard | Profile hero/stat/menu card hierarchy with masked personal data. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |

## Visual Evidence

- 278 mobile UI evidence screenshots are tracked in `release/evidence/mobile-ui`; store screenshots and capture metadata are summarized in `release/evidence/mobile-ui/capture-summary.json`.
- Files `01_splash.png` through `17_profile_level.png` cover the canonical Stitch/PDF screen set.
- Files `18_profile_settings.png` through `30_expense_form_state.png` extend the current evidence set to profile detail, post detail, notification settings, common states, consent, and input form states.
- Files `31_fixed_expense_form.png` through `33_living_cost_form.png` add explicit plan-setting form states for fixed expenses, fixed savings, and daily living costs.
- Files `34_modal_confirm.png` through `36_bottom_sheet_category.png` add native modal and bottom-sheet evidence for shared confirmation, LV UP completion, and category selection patterns.
- Files `37_notifications_empty.png` through `41_notifications_no_unread_list.png` add notification empty, offline, load-error, all-read, and no-unread history states with retry/settings actions and no bottom navigation.
- Files `42_salary_no_plan.png` through `45_salary_offline.png` add salary no-plan, compact, detailed, and offline preview states while preserving the native salary sections.
- Responsive widths checked: 320, 360, 375, 390, 393, 412, 430, 768.
- Responsive check count in the latest aggregate summary: 2224.
- Horizontal overflow: 0 detected.

## Verification

- `node scripts/qa/audit-stitch-implementation-matrix.mjs` PASS, 305/305 tracked rows.
- `node scripts/qa/sync-stitch-evidence-status.mjs` PASS, 305 updated / 0 missing.
- `corepack pnpm --filter @salary-hijacking/mobile run lint` PASS on 2026-07-25.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck` PASS on 2026-07-25.
- `corepack pnpm --filter @salary-hijacking/mobile run format:check` PASS on 2026-07-25.
- `corepack pnpm run format:check` PASS on 2026-07-25.
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand` PASS, `artifacts/qa/salary-components-green-stitch-variants-20260721-post-format.log`
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/notifications/__tests__/notifications.components.test.tsx --runInBand` PASS, `artifacts/qa/notifications-components-green-all-read-20260721-post-format.log`
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/shared/components/__tests__/shared-overlays.contract.test.tsx --runInBand` PASS, `artifacts/qa/mobile-overlays-test-20260721.log`
- `corepack pnpm --filter @salary-hijacking/mobile test` PASS, 68 suites / 789 tests, `artifacts/qa/mobile-full-test-20260721-final-rerun.log`
- `corepack pnpm --filter @salary-hijacking/mobile run export:web` PASS, `artifacts/qa/mobile-export-web-20260721-salary-variants.log`
- `node scripts/release/capture-mobile-clean-fintech-screenshots.mjs` PASS, `artifacts/qa/capture-mobile-clean-fintech-20260721-salary-variants.log`
- Current-source direct splash-hide ARM64 diagnostic APK evidence is recorded with SHA256 `F838C2968698CB4A109116382A037C0E0DB2AEE402082A33503ED047C1E9E050`; APK v2 signing and package metadata gates pass. Physical ARM64 phone install/start remains blocked because no Android device is connected.

## Scope Normalization

- `SCR-007-V004` salary-career notification copy is intentionally normalized to the official Salary Hijacking notification list because the Stitch variant contains off-scope career salary-market copy. Decision log: `docs/qa/UI_DECISION_LOG.md`.

## Remaining Visual Risk

- The classified Stitch matrix is synchronized as PASS 305/305, but physical Android screenshots are not a substitute for the web/capture evidence yet because the current emulator surface capture is black in the device display/lock state.
- 41 modal, 17 bottom-sheet, 14 multi-state-board, and 9 flow-board items are mapped; 7 representative modal/bottom-sheet rows now have direct native evidence, but the remaining variants still need interaction-level proof.
- Evidence synchronization details are recorded in `docs/qa/STITCH_EVIDENCE_STATUS.md`.
- Physical Android phone QA remains blocked until a device is connected. Native font rendering, actual keyboard resize behavior, notification tap behavior, cold-start logcat proof, and physical install/persistence proof must pass before a 100% launch-ready claim.
