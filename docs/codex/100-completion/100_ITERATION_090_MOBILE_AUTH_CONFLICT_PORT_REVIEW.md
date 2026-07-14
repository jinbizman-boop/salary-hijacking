# Iteration 090 Mobile Auth/Splash Conflict Port Review

Date: 2026-07-14 KST

## Scope

Reviewed the mobile Auth/Splash conflict archive rows:

- `apps/mobile/app/index.tsx`
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/app/(auth)/signup.tsx`
- `apps/mobile/src/features/auth/__tests__/login.components.test.tsx`
- `apps/mobile/src/features/auth/__tests__/login.screen-wiring.test.ts`
- `apps/mobile/src/features/auth/__tests__/password-recovery.components.test.tsx`
- `apps/mobile/src/features/auth/__tests__/signup.components.test.tsx`
- `apps/mobile/src/features/auth/__tests__/signup.screen-wiring.test.ts`
- `apps/mobile/src/features/auth/components/ForgotPasswordForm.tsx`
- `apps/mobile/src/features/auth/components/index.ts`
- `apps/mobile/src/features/auth/components/LoginCredentialForm.tsx`
- `apps/mobile/src/features/auth/components/LoginHero.tsx`
- `apps/mobile/src/features/auth/components/PasswordRecoveryHero.tsx`
- `apps/mobile/src/features/auth/components/ResetPasswordForm.tsx`
- `apps/mobile/src/features/auth/components/SignupAgreementCard.tsx`
- `apps/mobile/src/features/auth/components/SignupForm.tsx`
- `apps/mobile/src/features/auth/components/SignupHero.tsx`
- `apps/mobile/src/features/auth/components/SocialLoginButtons.tsx`
- `apps/mobile/src/features/auth/components/SplashLaunchScreen.tsx`

## Decision

All 19 rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archived copies because the current Auth/Splash implementation matches the user-provided first-run reference more closely and preserves launch stability:

- The root route hides the native splash, supports capture routes, preserves cold-start deep links, and falls back safely to login or salary home.
- Splash, login, and signup use `AuthVisualFrame`, the current Salary Hijacking brand lockup, responsive spacing, and the Eureka World mark.
- Login and signup keep the reference-style id/password/nickname fields and avoid the older card-based debug layout.
- Social login uses static icon assets for Naver, Kakao, Facebook visual-only, and Google while preserving provider routing safety.
- Password recovery and reset components are still covered and do not render raw credential or token text.
- Node UTF-8 integrity checks found no CJK mojibake or replacement characters in the reviewed auth files.

## Evidence

- `git diff --no-index --stat` was run for the 11 first-run auth route/component archive-current file pairs.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/auth/__tests__/login.components.test.tsx --runInBand`: PASS, 4 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/auth/__tests__/login.screen-wiring.test.ts --runInBand`: PASS, 2 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/auth/__tests__/signup.components.test.tsx --runInBand`: PASS, 3 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/auth/__tests__/signup.screen-wiring.test.ts --runInBand`: PASS, 1 test.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/auth/__tests__/password-recovery.components.test.tsx --runInBand`: PASS, 3 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand`: PASS, 29 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- Auth UTF-8 integrity script: PASS for reviewed route, component, and auth test files; CJK count 0 and replacement-character count 0.
- `node scripts\release\classify-merge-conflict-archive.mjs`: PASS; decisions now show 66 `CURRENT_ACCEPTED`, 26 `REVIEW_REQUIRED`, 26 `EXCLUDE_RUNTIME`, and 14 `SUPERSEDED_BY_CURRENT_EVIDENCE`.

## Remaining Work

The merge archive remains a historical review source. It is not yet safe to delete because 26 mobile-source rows still require semantic port review.

This iteration does not prove full mobile E2E, physical Android phone QA, production AAB, Play submission, or market publication.
