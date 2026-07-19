# UI Requirements Traceability

Generated: 2026-07-19 KST

This traceability file connects the UI finalization objective to current implementation evidence. It does not claim 100% completion. Rows marked `PARTIAL` or `BLOCKED` are explicit remaining work.

## Source Authority

1. Security, privacy, accessibility, ad-data separation, and server authority override visual assets.
2. Product terminology and flows come from the Paycheck accounting documents, screen/function planning documents, MASTER_SPEC, and current repository docs.
3. Stitch `screen.png` is the latest visual reference for mapped screens.
4. Stitch `code.html` and `DESIGN.md` are extraction references only; no Stitch HTML may be pasted into runtime React Native.
5. PDF 17 pages remain secondary visual reference for brand identity and screens not fully covered by Stitch.

## Screen Requirements

| Requirement                                           | Screen/state | Component or route                                       | Implementation evidence                                                  | Test/evidence                                     | Status  |
| ----------------------------------------------------- | ------------ | -------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- | ------- |
| Splash auto-entry with branded launch UI              | SCR-001      | `SplashLaunchScreen`                                     | `apps/mobile/src/features/auth/components/SplashLaunchScreen.tsx`        | `release/evidence/mobile-ui/01_splash.png`        | PASS    |
| Login with credential and social entry UI             | SCR-002      | `LoginHero`, `LoginCredentialForm`, `SocialLoginButtons` | `apps/mobile/src/features/auth/components`                               | auth screen/component tests                       | PASS    |
| Signup with agreements and validation                 | SCR-003      | `SignupForm`, `SignupAgreementCard`                      | `apps/mobile/src/features/auth/components`                               | signup tests and visual evidence                  | PASS    |
| Initial payroll setup/onboarding                      | SCR-004      | `/onboarding`                                            | `apps/mobile/app/onboarding.tsx`                                         | visual evidence exists                            | PARTIAL |
| Salary home core money hierarchy                      | SCR-005      | `SalaryHomeScreen`                                       | `apps/mobile/src/features/salary/components`                             | salary visual + unit tests                        | PASS    |
| Variable expense add/edit keeps input and server sync | SCR-006      | `VariableExpenseQuickAdd`                                | `apps/mobile/src/features/salary/components/VariableExpenseQuickAdd.tsx` | salary launch readiness tests                     | PARTIAL |
| Notification list has no bottom tab and deep links    | SCR-007      | `NotificationScreen`                                     | `apps/mobile/src/features/notifications/components`                      | notification tests + visual evidence              | PASS    |
| Plan settings and goal progress                       | SCR-008      | `PlanScreen`                                             | `apps/mobile/src/features/plan/components`                               | plan tests + visual evidence                      | PASS    |
| Fixed expense CRUD state                              | SCR-009      | `PlanBreakdownSection`                                   | `apps/mobile/src/features/plan/components/PlanBreakdownSection.tsx`      | API/component tests + `31_fixed_expense_form.png` | PASS    |
| Fixed saving CRUD state                               | SCR-010      | `PlanBreakdownSection`                                   | same as above                                                            | API/component tests + `32_fixed_saving_form.png`  | PASS    |
| Daily living cost setup                               | SCR-011      | `PlanBreakdownSection`, `DailyBudgetSection`             | plan/salary components                                                   | API/component tests + `33_living_cost_form.png`   | PASS    |
| LV UP home                                            | SCR-012      | `LevelHeroCard`, `LevelActionGrid`                       | level components                                                         | level tests + visual evidence                     | PASS    |
| Reading level-up                                      | SCR-013      | `ReadingContentCard`, `RecordInputCard`                  | level components                                                         | detail route tests + visual evidence              | PASS    |
| News level-up                                         | SCR-014      | `NewsBalanceCard`, `RecordInputCard`                     | level components                                                         | detail route tests + visual evidence              | PASS    |
| English level-up                                      | SCR-015      | `EnglishLessonCard`, `RecordInputCard`                   | level components                                                         | detail route tests + visual evidence              | PASS    |
| Health level-up                                       | SCR-016      | `WorkoutTimerCard`, `RecordInputCard`                    | level components                                                         | detail route tests + visual evidence              | PASS    |
| Community boards                                      | SCR-017      | `CommunityTabBar`, `CommunityPostCard`                   | community components                                                     | community tests + visual evidence                 | PASS    |
| Post detail                                           | SCR-018      | `/community/[postId]`                                    | `apps/mobile/app/community/[postId].tsx`                                 | route tests + `23_community_post_detail.png`      | PARTIAL |
| Community write                                       | SCR-019      | `CommunityWriteForm`, `ComposeBottomSheet`               | community components                                                     | write hook/tests + visual evidence                | PASS    |
| Comments/reactions/reports                            | SCR-020      | `CommunityCommentItem`, `useCommunityActions`            | community components/hooks                                               | integration tests                                 | PARTIAL |
| Profile/My Page                                       | SCR-021      | `ProfileScreen`                                          | profile components                                                       | profile tests + visual evidence                   | PASS    |
| Profile settings                                      | SCR-022      | `ProfileDetailScreen`                                    | profile components                                                       | route tests + `18_profile_settings.png`           | PASS    |
| Account settings                                      | SCR-023      | `/profile/account`                                       | profile route                                                            | route tests + `19_profile_account.png`            | PARTIAL |
| My posts management                                   | SCR-024      | `/profile/community`                                     | profile route                                                            | route tests + `20_profile_community.png`          | PARTIAL |
| My level-up management                                | SCR-025      | `/profile/level`                                         | profile route                                                            | visual evidence profile-level                     | PARTIAL |
| 1:1 support                                           | SCR-026      | `/profile/support`                                       | profile route                                                            | route tests + `21_profile_support.png`            | PARTIAL |
| Notices                                               | SCR-027      | `/profile/notices`                                       | profile route                                                            | route tests + `22_profile_notices.png`            | PARTIAL |
| Terms and consent                                     | SCR-028      | `SignupAgreementCard` plus legal routes                  | auth/profile components                                                  | signup tests + `29_terms_consent.png`             | PARTIAL |
| Notification settings                                 | SCR-029      | `NotificationPreferenceStrip`                            | notifications components                                                 | component tests + `24_notification_settings.png`  | PASS    |
| Common empty/error/loading/offline states             | SCR-030      | shared state components                                  | `apps/mobile/src/shared/components`                                      | shared tests + `25`-`28` common state PNGs        | PARTIAL |

## Cross-Cutting Requirements

| Requirement                                                                 | Implementation evidence                                    | Verification                            | Status  |
| --------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------- | ------- |
| Single visual token source                                                  | `apps/mobile/src/shared/components/tokens.ts`              | component contract tests                | PARTIAL |
| Primary green policy separates Stitch `#006A37` from legacy `#209252`       | `tokens.ts`, `UI_DECISION_LOG.md`                          | design log                              | PASS    |
| Server-authoritative financial calculation not replaced by client fake math | salary/plan API boundaries and release readiness checks    | `check:release-readiness` mobile gates  | PARTIAL |
| Ads separated from raw financial data                                       | `AdBannerSlot`, community disclosure, AGENTS privacy rules | privacy/security evidence               | PARTIAL |
| Stitch HTML not pasted into RN                                              | `release/evidence/mobile-ui/stitch-comparison.md`          | text/evidence review                    | PASS    |
| Visual capture 17 canonical screens                                         | `release/evidence/mobile-ui/capture-summary.json`          | screenshot script                       | PASS    |
| Visual capture 33 mobile UI evidence files                                  | `release/evidence/mobile-ui/capture-summary.json`          | screenshot script                       | PASS    |
| Responsive capture 320-430 widths                                           | `capture-summary.json`                                     | included in 120 checks, overflow 0      | PASS    |
| 768px visual matrix                                                         | `capture-summary.json`                                     | included in 120 checks, overflow 0      | PASS    |
| Physical Android safe-area/keyboard/logcat                                  | `release/mobile-preview-evidence.json`                     | no attached physical phone              | BLOCKED |
| Production build/store public release                                       | release readiness                                          | external approval and main merge needed | BLOCKED |

## Current Gate Summary

- PASS: canonical Stitch inventory, 33 mobile UI evidence screenshots, current mobile unit/component tests, typecheck, root format.
- PARTIAL: exhaustive accessibility audit, all E2E scenarios.
- BLOCKED: physical Android phone proof, final production submit, `origin/main` release gate, source materials not present locally.
