# Iteration 012 - Korean Copy Regression Guard For Salary And Plan Screens

Date: 2026-07-13 KST
Repository: `C:/Users/PC/Desktop/salary-hijacking-platform`
HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`

## Scope

This iteration added regression coverage for readable Korean copy in the interactive Salary/Plan preview state and rendered reference screens. The goal is to prevent mojibake or corrupted Korean labels from re-entering the first QA-facing mobile screens.

## Implementation

- Added `apps/mobile/src/features/preview/__tests__/interactive-state.test.ts`.
- Added `apps/mobile/src/features/preview/__tests__/reference-screen-copy.test.tsx`.
- Covered:
  - KRW formatting with `원`.
  - Asia/Seoul date text such as `2026년 7월 13일`.
  - seeded salary daily budget rows such as `빽다방 아이스 아메리카노` and `KT광화문지사 구내식당 점심 식사`.
  - seeded plan rows such as `유튜브 프리미엄`, `MS오피스`, and `학자금 대출`.
  - rendered Salary Home labels including `내 급여 납치`, `전체 누적 납치 금액`, `사용 예정`, and `사용 완료`.
  - rendered Plan labels including `급여 납치 목표 달성률`, `월별 고정 지출 계획/설정`, `월별 고정 적금 계획/설정`, and `일일 생활비 계획/설정`.
  - no rendered copy or serialized preview state contains common mojibake markers.

## Validation

- RED check: the first state-copy test failed on an intentionally wrong `백다방` expectation, proving the test executes against actual seeded copy.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/preview/__tests__/interactive-state.test.ts src/features/preview/__tests__/reference-screen-copy.test.tsx --runInBand`: PASS, 2 suites / 5 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/preview/__tests__/interactive-state.test.ts src/features/preview/__tests__/reference-screen-copy.test.tsx src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx --runInBand`: PASS, 4 suites / 14 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run test`: PASS, 66 suites / 713 tests.
- `corepack pnpm exec prettier --check apps/mobile/src/features/preview/__tests__/interactive-state.test.ts apps/mobile/src/features/preview/__tests__/reference-screen-copy.test.tsx`: PASS.

## Notes

This iteration improves UI/UX release safety by preventing corrupted Korean copy in two core launch-review surfaces. It does not by itself prove physical-phone QA, production AAB, Play submission, or server-authoritative production persistence.

## Forbidden Operations Not Performed

No production AAB build, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, Cloudflare secret mutation, destructive DB migration, force push, or rebase was performed.
