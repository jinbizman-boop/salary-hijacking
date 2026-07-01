---
codex_context: true
priority: P0
scope: apps/mobile
applies_to:
  - apps/mobile/app/**
  - apps/mobile/src/shared/styles/**
  - apps/mobile/assets/brand/**
  - apps/mobile/assets/fonts/**
  - release/screenshots/**
last_verified: 2026-07-01
---

# Mobile UI/UX Reference

This document connects the user-provided Salary Hijacking design references to
the current mobile app implementation. Use it before changing launch screens,
bottom tabs, Clean Fintech components, store screenshots, brand assets, or
mobile UI copy.

## Source References

| Source                   | Observed path                                                                                                                 | Verification                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Official BI logo         | `C:\Users\Telos_PC_17\Downloads\salary-hijacking-platform-logo.png`                                                           | SHA256 `EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466`                                     |
| Bundled BI logo          | `apps/mobile/assets/brand/salary-hijacking-platform-logo.png`                                                                 | SHA256 `EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466`                                     |
| Freesentation source zip | `C:\Users\Telos_PC_17\Downloads\Freesentation-2.001.zip`                                                                      | SHA256 `73C859C944C97DAC6392DA5520A303414126B77EA522358E3CE513EF31AACD84`                                     |
| Clean Fintech prototype  | `C:\Users\Telos_PC_17\Desktop\salary-hijacking-ui-prototype.html`                                                             | SHA256 `7CCCBCA75950997BDE7F357ECB81BFCEE83C779F13AC369445A6215AFF7FF267`                                     |
| Design PDF               | `C:\Users\Telos_PC_17\Desktop\오피스 문서\김진원 개인자료\02. 플랫폼 모음\02_급여납치\급여납치 어플리케이션 디자인.pdf`       | SHA256 `9B07E3AB3B10C7C3CE276C35C51317B4B9D0CAC334B82645EB1CD9F8A797E26F`; 17 pages; page size 248.88 x 540.0 |
| Planning HTML            | `C:\Users\Telos_PC_17\Desktop\오피스 문서\김진원 개인자료\02. 플랫폼 모음\02_급여납치\급여납치 화면 및 기능 설계 기획안.html` | SHA256 `B64A5EB75F5B734D56A1CA49DDC2F1159EABDC6FBDF735E10BDCDB9AC07EFB08`                                     |

The private ChatGPT project share link remains inaccessible from this Codex
workspace unless the user provides exported contents. Treat the local files
above and repository files as the verified UI source of truth.

## Verified Design Intent

The Salary Hijacking app is a mobile-first finance and self-development product
that helps users separate payroll, fixed expenses, savings, living money, and
daily spending right after payday. The central value message is not "expense
tracking" but "how much money the user protected."

The launch UI direction is `Salary Hijacking Clean Fintech v1`:

- Use a clear green fintech identity built around `#209252`.
- Show the user value first: `이번 달 내가 지켜낸 돈`.
- Keep the home screen understandable within a few seconds: protected money,
  daily remaining budget, this-month hijack amount, and next payday.
- Convert dense tables into readable cards and compact rows on mobile.
- Keep community and LV UP friendly, routine-oriented, and lightweight.
- Keep ads and partners below core financial information and label them as
  `제휴/광고`.
- Never place raw salary, expense, savings, hijack amount, account, card, loan,
  email, phone, token, push token, or raw device identifier into ads, analytics,
  logs, push payloads, or partner targeting.

## App Implementation Map

| Requirement                             | Current implementation anchor                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official BI in app surfaces             | `apps/mobile/assets/brand/salary-hijacking-platform-logo.png`, `apps/mobile/app/_layout.tsx`, `apps/mobile/src/shared/styles/clean-fintech-screens.tsx` |
| Official BI in release screenshots      | `scripts/release/capture-mobile-clean-fintech-screenshots.mjs`                                                                                          |
| Freesentation font loading              | `apps/mobile/app/_layout.tsx` loads `Freesentation-4Regular.ttf` through `Freesentation-9Black.ttf`                                                     |
| Freesentation release guard             | `scripts/release/check-release-readiness.mjs` blocks missing, invalid, or undersized Freesentation font assets                                          |
| Launch asset release guard              | `scripts/release/check-release-readiness.mjs` blocks placeholder-sized icon, splash, adaptive icon, notification icon, and favicon PNG assets           |
| Launch asset config guard               | `scripts/release/check-release-readiness.mjs` blocks `apps/mobile/app.config.ts` if Expo launch asset fallbacks drift from the checked PNG assets       |
| Clean Fintech design tokens             | `apps/mobile/src/shared/styles/clean-fintech-theme.ts`                                                                                                  |
| Shared Clean Fintech screen system      | `apps/mobile/src/shared/styles/clean-fintech-screens.tsx`                                                                                               |
| Five-tab IA                             | `apps/mobile/app/(tabs)/_layout.tsx` with `급여`, `계획`, `LV`, `커뮤니티`, `MY`                                                                        |
| Salary home route                       | `apps/mobile/app/(tabs)/salary/index.tsx`                                                                                                               |
| Plan route                              | `apps/mobile/app/(tabs)/plan/index.tsx`                                                                                                                 |
| LV UP route and detail routes           | `apps/mobile/app/(tabs)/level/index.tsx`, `apps/mobile/app/level/reading.tsx`, `news.tsx`, `english.tsx`, `health.tsx`                                  |
| Notifications route                     | `apps/mobile/app/notifications/index.tsx`                                                                                                               |
| Community route and write/detail routes | `apps/mobile/app/(tabs)/community/index.tsx`, `apps/mobile/app/community/write.tsx`, `apps/mobile/app/community/[postId].tsx`                           |
| Profile route                           | `apps/mobile/app/(tabs)/profile/index.tsx`                                                                                                              |
| UI contract test                        | `apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts`                                                                                   |
| Store screenshot candidates             | `release/screenshots/*.png`                                                                                                                             |

## Screen Coverage Checklist

| Source screen group | Required UI behavior                                                                                                                                                                     | Implementation expectation                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Splash and login    | Center official BI, show `SALARY HIJACKING`, use Freesentation, explain that salary is protected before it disappears                                                                    | Splash/login components keep BI and brand copy visible                                                                          |
| Salary home         | Show protected money first, then received amount, spent amount, monthly hijack amount, D-day, daily budget, fixed expenses, variable expenses, and ad/partner slot below finance summary | `CleanFintechScreen` salary mode keeps `이번 달 내가 지켜낸 돈`, `오늘 쓸 수 있는 돈`, `지출 추가하기`, and `제휴/광고` markers |
| Plan                | Replace table-heavy layout with goal progress and cards for payroll plan, fixed expense, fixed savings, and living money                                                                 | Plan mode keeps `목표 달성률`, `급여 계획`, `고정지출`, `고정저축`, `생활비` markers                                            |
| Notifications       | Separate important alerts from routine alerts, use unread state, link to relevant screens                                                                                                | Notification mode keeps `중요 알림` and `루틴 알림` sections                                                                    |
| LV UP               | Show current level, XP progress, and four mission cards for reading, news, English, and health                                                                                           | Level mode keeps `현재 레벨`, `독서하기`, `뉴스보기`, `영어연습`, `홈트하기`                                                    |
| LV detail           | Use pill tabs, progress summary, and content lists for reading, news, English, and health                                                                                                | Detail routes keep `AI 추천`, `Listening`, `Speaking`, `Reading`, `Writing`, and weekday markers                                |
| Community           | Keep friendly board tabs, popular/list cards, safe anonymous participation, and a write entry                                                                                            | Community mode keeps `전체 게시판`, `자유 게시판`, `레벨업 인증`, `취미 게시판`, and `글쓰기`                                   |
| Write post          | Validate title, body, board, anonymous/question options, and show a completion toast                                                                                                     | Write screen keeps `제목`, `본문`, `익명`, and post success copy                                                                |
| My page             | Show profile, cumulative hijack amount, level-up status, self-management performance, and management menu                                                                                | Profile mode keeps `누적 납치금액`, `레벨업 현황`, `자기관리 성과`, `내 게시글 관리`                                            |

## Design Tokens To Preserve

| Token                | Value                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Theme name           | `Salary Hijacking Clean Fintech v1`                                                                                                |
| Brand primary        | `#209252`                                                                                                                          |
| Brand secondary      | `#2FA86A`                                                                                                                          |
| Soft green           | `#EAF6EF`                                                                                                                          |
| App surface          | `#F7F8FA`                                                                                                                          |
| Card surface         | `#FFFFFF`                                                                                                                          |
| Danger               | `#D74B4B`                                                                                                                          |
| Bottom tab height    | `76`                                                                                                                               |
| Minimum touch target | `44`                                                                                                                               |
| Font family          | `var(--font-presentation), "Presentation", "Pretendard", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, sans-serif` |
| Native font map      | `Freesentation-4Regular` through `Freesentation-9Black`                                                                            |

## Validation Contract

When changing the mobile UI reference or Clean Fintech UI, run the closest
available checks:

```powershell
corepack pnpm --filter @salary-hijacking/mobile test -- clean-fintech-theme.test.ts
corepack pnpm --filter @salary-hijacking/mobile typecheck
corepack pnpm --filter @salary-hijacking/mobile format:check
corepack pnpm run format:check
corepack pnpm run check:release-readiness -- --soft
git diff --check
```

Use `Get-Content -Encoding UTF8` or `rg` when inspecting Korean source files in
Windows PowerShell. Plain `Get-Content` can display valid UTF-8 Korean as
mojibake on some shells.

## Current Limits

This document verifies local UI reference mapping and static mobile contract
coverage. It is not proof of production readiness. Project-wide operational
completion still requires native EAS builds, native E2E, store submission
dry-runs, production API/DB smoke tests, Cloudflare resource proof, runtime
secret proof, and release QA.
