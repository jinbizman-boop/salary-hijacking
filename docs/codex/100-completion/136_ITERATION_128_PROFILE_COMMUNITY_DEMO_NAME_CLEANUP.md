# Iteration 128 - Profile/Community Demo Name Cleanup

Date: 2026-07-15 KST

## Scope

This iteration continues GATE-052 hardcoded data removal by cleaning remaining real-looking demo user copy from the Profile and Community runtime routes.

## Completed

- Added route wiring tests that fail if Profile or Community tab routes reintroduce the `홍길동` fixture name.
- Replaced Profile tab fallback display name with neutral `사용자 기획자님`.
- Replaced Community tab popular-post title with an anonymous team-style title.
- Updated Profile component test fixtures to use the neutral display name.

## Verification

- RED targeted screen-wiring tests failed before implementation because Profile and Community routes still contained the `홍길동` fixture.
- GREEN targeted regression suite:
  - `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/profile/__tests__/profile.screen-wiring.test.ts src/features/profile/__tests__/profile.components.test.tsx src/features/community/__tests__/community.screen-wiring.test.ts src/features/community/__tests__/community.feature-components.test.tsx --runInBand`
  - PASS, 4 suites and 9 tests.
- Runtime/source fixture search:
  - `rg -n "홍길동|김철수|이영희|박영희|김테스트|실명" apps/mobile/app apps/mobile/src -g "*.ts" -g "*.tsx"`
  - No matches.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm run format:check`: PASS.
- `git diff --check`: PASS.

## Remaining

- This source change makes Iteration 127 APK evidence stale until the phone-target APK is rebuilt for the new source commit.
- Physical Android phone install, cold start, persistence, keyboard, safe-area, and logcat proof remain pending because no physical phone is attached.
