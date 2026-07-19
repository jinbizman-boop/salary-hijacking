# Stitch UI Comparison - 2026-07-19

## Summary

- Source ZIP count: 10
- Source ZIP paths: recorded in `docs/design/stitch/2026-07-16/source-zips/source-zips-manifest.json`; raw ZIPs are not committed.
- Canonical references: `docs/design/stitch/2026-07-16/screens` and `docs/design/stitch/2026-07-16/html`.
- Inventory: `docs/design/stitch/2026-07-16/STITCH_SCREEN_INVENTORY.md`.
- Extraction rule: Stitch `screen.png`, `code.html`, and `DESIGN.md` were used only to extract tokens and structure. Stitch HTML was not pasted into React Native.
- Runtime policy: server-authority financial calculations, loading/error/empty states, privacy protection, and ad/finance data separation remain intact.

## Screen Matrix

| Screen | Stitch reference | Source ZIP | RN implementation | Reflected visual intent | Function/API/privacy status |
|---|---|---|---|---|---|
| Splash | `docs/design/stitch/2026-07-16/screens/splash.png` | stitch_salary_hijacking_design_system (2).zip | auth/capture splash routes | Centered brand launch surface, green/black typography, no system-bar overlap in captured viewport. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Login | `docs/design/stitch/2026-07-16/screens/login.png` | stitch_salary_hijacking_design_system (2).zip | auth login route/components | Logo, rounded inputs, social/provider affordances, white surface hierarchy. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Signup | `docs/design/stitch/2026-07-16/screens/signup.png` | stitch_salary_hijacking_design_system (2).zip | auth signup route/components | Same auth hierarchy, large CTA, validation retained. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Salary Home | `docs/design/stitch/2026-07-16/screens/salary-home.png` | stitch_salary_hijacking_design_system (3).zip | SalaryHeroCard, SalaryMetricGrid, FixedExpenseSection, DailyBudgetSection, VariableExpenseQuickAdd | Green money hero, white cards, large KRW values, planned/completed state colors. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
| Notifications | `docs/design/stitch/2026-07-16/screens/notifications.png` | stitch_salary_hijacking_design_system (4).zip | notification stack route/components | Standalone list/card screen; bottom tab intentionally excluded. | API/server/privacy behavior retained; no Stitch HTML copied into RN. |
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

- 17 mobile UI screenshots regenerated in `release/evidence/mobile-ui` on 2026-07-19 KST.
- Responsive widths checked: 320, 360, 375, 390, 393, 412, 430, 768.
- Responsive check count: 120.
- Horizontal overflow: 0 detected.

## Verification

- `node --test scripts/dev/clean-generated-junk.test.mjs` PASS, 10 tests after adding `.localappdata` cleanup coverage
- `corepack pnpm --filter @salary-hijacking/mobile run lint` PASS
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck` PASS
- `corepack pnpm --filter @salary-hijacking/mobile test` PASS, 66 suites / 769 tests
- `corepack pnpm run format:check` PASS
- `corepack pnpm --filter @salary-hijacking/mobile run export:web` PASS
- `node scripts/release/capture-mobile-clean-fintech-screenshots.mjs` PASS
- Current-head Android debug QA APK evidence is recorded with SHA256 `235B109A78C623B90DCA0A763F155517DE3FAC17C2077AC1BB892ED6FE1C3D3A`; APK signing/package gates pass in release readiness.

## Remaining Visual Risk

- Physical Android phone QA remains blocked until a device is connected. Native font rendering, actual keyboard resize behavior, notification tap behavior, cold-start logcat proof, and physical install/persistence proof must pass before a 100% launch-ready claim.
