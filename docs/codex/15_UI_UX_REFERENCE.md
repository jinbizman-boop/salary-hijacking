---
codex_context: true
priority: P0
scope: apps/mobile
applies_to:
  - apps/mobile/app/**
  - apps/mobile/src/shared/**
  - apps/mobile/assets/**
  - release/evidence/mobile-ui/**
  - release/screenshots/**
last_verified: 2026-07-12
---

# Mobile UI/UX Reference

This document maps the user-provided Salary Hijacking mobile UI/UX references
to the current React Native/Expo implementation and release evidence. Use it
before changing mobile screens, bottom tabs, launch assets, icon registries,
store screenshots, or user-facing Korean copy.

## Source References

| Source                         | Current observed path                                                                     | Purpose                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Salary home HTML prototype     | `C:\Users\PC\Downloads\salary_hijacking_salary_home_ui_function_prototype.html`           | Salary home layout, protected amount hero, fixed/variable expense sections, ad separation   |
| Notifications HTML prototype   | `C:\Users\PC\Downloads\salary_hijacking_notifications_ui_function_prototype.html`         | Notification list, unread/important/routine alert structure                                 |
| Plan/settings HTML prototype   | `C:\Users\PC\Downloads\salary_hijacking_plan_settings_ui_function_prototype.html`         | Payroll plan, fixed expense, fixed savings, living budget planning                          |
| LV UP main HTML prototype      | `C:\Users\PC\Downloads\salary_hijacking_level_main_ui_function_prototype.html`            | LV hub, XP/level progress, reading/news/English/health entry points                         |
| Reading LV HTML prototype      | `C:\Users\PC\Downloads\salary_hijacking_reading_level_ui_function_prototype.html`         | Reading category pills, book cards, private record flow                                     |
| News LV HTML prototype         | `C:\Users\PC\Downloads\salary_hijacking_news_level_ui_function_prototype.html`            | News list and balanced information routine                                                  |
| English LV HTML prototype      | `C:\Users\PC\Downloads\salary_hijacking_english_level_ui_function_prototype.html`         | Listening/speaking/reading/writing routine                                                  |
| Health LV HTML prototype       | `C:\Users\PC\Downloads\salary_hijacking_health_level_ui_function_prototype.html`          | Beginner-safe workout routine and weekly pills                                              |
| Community write HTML prototype | `C:\Users\PC\Downloads\salary_hijacking_community_write_ui_function_prototype.html`       | Title/body/attachment/question/anonymous/board controls                                     |
| Profile/MY HTML prototype      | `C:\Users\PC\Downloads\salary_hijacking_profile_mypage_ui_function_prototype.html`        | MY page profile, saved amount, level, self-management cards                                 |
| Design JPG slides              | `C:\Users\PC\Desktop\급여납치 어플리케이션 디자인\슬라이드1.JPG` through `슬라이드17.JPG` | Visual source for splash, login, salary, notifications, plan, LV, community, write, profile |
| Runtime app evidence           | `release\evidence\mobile-ui\01_splash.png` through `17_profile_level.png`                 | Local web-rendered mobile UI proof                                                          |
| Native startup evidence        | `release\evidence\mobile-ui\18_native_startup_fixed.png`                                  | Emulator proof that the real native APK reaches Salary Home                                 |

The private ChatGPT project share link remains inaccessible from this Codex
workspace unless the user provides exported contents. Treat the local files
above, repository files, screenshots, and command output as the verified UI
source of truth.

## Verified Design Intent

Salary Hijacking is a mobile-first finance and self-development app. The core
message is not simple expense tracking; it is showing how much money the user
protected after salary day.

The launch UI direction is:

- White background, green brand color, black text, card-based mobile layout.
- Expose the most important money state first: cumulative protected amount,
  received salary, spent amount, hijacked/protected amount, daily budget, and
  next payday.
- Keep bottom tabs as `급여 / 계획 / LV / 커뮤니티 / MY`.
- Keep LV UP as four practical routines: reading, news, English, and health.
- Keep community as `전체 / 자유 / 레벨업 인증 / 취미`.
- Keep write flow complete: title, body, attachment, question, anonymous,
  board type, and completion action.
- Keep ads/partners labeled and separated from raw financial data.
- Never expose raw salary, expense, savings, hijack amount, account, card,
  loan, phone, email, token, push token, or raw device identifier to ads,
  analytics, logs, push payloads, community payloads, or partner targeting.

## App Implementation Map

| Requirement                        | Current implementation anchor                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo launch assets                 | `apps/mobile/assets/icon.png`, `splash.png`, `adaptive-icon.png`, `notification-icon.png`, `favicon.png`                                                                   |
| Runtime icon registry              | `apps/mobile/src/shared/assets/icons/index.ts`                                                                                                                             |
| Runtime image registry             | `apps/mobile/src/shared/assets/images/index.ts`                                                                                                                            |
| Splash/root startup                | `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`                                                                                                                 |
| Five-tab IA                        | `apps/mobile/app/(tabs)/_layout.tsx`                                                                                                                                       |
| Salary home route                  | `apps/mobile/app/(tabs)/salary/index.tsx`                                                                                                                                  |
| Plan route                         | `apps/mobile/app/(tabs)/plan/index.tsx`                                                                                                                                    |
| LV UP route and detail routes      | `apps/mobile/app/(tabs)/level/index.tsx`, `apps/mobile/app/level/reading.tsx`, `news.tsx`, `english.tsx`, `health.tsx`                                                     |
| Notifications route                | `apps/mobile/app/notifications/index.tsx`                                                                                                                                  |
| Community list/write/detail routes | `apps/mobile/app/(tabs)/community/index.tsx`, `apps/mobile/app/community/write.tsx`, `apps/mobile/app/community/[postId].tsx`                                              |
| Profile/MY route and detail routes | `apps/mobile/app/(tabs)/profile/index.tsx`, `apps/mobile/app/profile/*.tsx`                                                                                                |
| UI contract tests                  | `apps/mobile/src/shared/api/__tests__/app-screen-contract.test.ts`, `prototype-ui-contract.test.ts`, `apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts` |
| Store/mobile screenshot evidence   | `release/screenshots/*.png`, `release/evidence/mobile-ui/*.png`                                                                                                            |
| Native APK startup evidence        | `release/evidence/mobile-ui/latest-universal-debug-apk.json`, `18_native_startup_fixed.png`, `mobile-preview-startup-logcat-fixed.txt`                                     |

## Screen Coverage Checklist

| Source screen   | Expected behavior                                                                                           | Current evidence status                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Splash          | Brand logo/name, clean white screen, automatic transition                                                   | PASS in `01_splash.png`; native animation timing still not full E2E                                                      |
| Login           | ID/password, social login, signup, auto-login/privacy copy                                                  | PASS in `02_login.png`; real OAuth provider flow not exercised                                                           |
| Salary Home     | Protected amount hero, salary/spent/protected metrics, daily budget, fixed/variable expenses, ad separation | PASS in `05_salary_home.png` and native `18_native_startup_fixed.png`; production API smoke is separate release evidence |
| Notifications   | Important/routine alerts, unread/read structure, deep-link-ready rows                                       | PASS in `08_notifications.png`; live push delivery not exercised                                                         |
| Plan            | Goal progress, salary plan, fixed expenses, fixed savings, living budget                                    | PASS in `07_plan_setting.png`; live DB persistence not proven by screenshot                                              |
| LV UP main      | Reading/news/English/health cards, XP/level progress, ad separation                                         | PASS in `09_level_hub.png`; full native tab tapping E2E not run                                                          |
| Reading level   | Category pills, book cards, private completion record                                                       | PASS in `10_level_reading.png`                                                                                           |
| News level      | Balanced news routine, list/cards, completion action                                                        | PASS in `11_level_news.png`; external news ingestion not proven                                                          |
| English level   | Listening/speaking/reading/writing routine                                                                  | PASS in `12_level_english.png`; audio/speech native APIs not proven                                                      |
| Health level    | Weekday pills, safe beginner workout routines                                                               | PASS in `13_level_health.png`; timer/workout native flow not proven                                                      |
| Community list  | Board tabs, popular posts, safe anonymous participation                                                     | PASS in `14_community.png`; live moderation queue not proven by screenshot                                               |
| Community write | Title, body, attachment, question, anonymous, board type, completion                                        | PASS in `15_community_write.png`; server submit/moderation E2E not proven                                                |
| Profile/MY      | Profile summary, cumulative protected amount, level, self-management, menu                                  | PASS in `16_profile.png` and `17_profile_level.png`                                                                      |

## Asset Path Policy

| Asset category                          | Required location                               |
| --------------------------------------- | ----------------------------------------------- |
| Expo app config assets                  | `apps/mobile/assets/` only                      |
| Runtime icons                           | `apps/mobile/src/shared/assets/icons/`          |
| Runtime images/brand/banners/thumbnails | `apps/mobile/src/shared/assets/images/`         |
| Static icon registry                    | `apps/mobile/src/shared/assets/icons/index.ts`  |
| Static image registry                   | `apps/mobile/src/shared/assets/images/index.ts` |

Do not add runtime app icons to `android/`, `ios/`, `release/screenshots/`,
`release/evidence/`, or `docs/`. Generated native resources may exist under
Expo/Android build output, but source runtime assets belong in the folders
above.

## Validation Contract

Run the closest relevant checks after mobile UI changes:

```powershell
corepack pnpm --filter @salary-hijacking/mobile run format:check
corepack pnpm --filter @salary-hijacking/mobile run typecheck
corepack pnpm --filter @salary-hijacking/mobile run test
corepack pnpm --filter @salary-hijacking/mobile run export:web
node scripts\release\capture-mobile-clean-fintech-screenshots.mjs
git diff --check
```

For native APK startup changes, also run or update:

```powershell
corepack pnpm --filter @salary-hijacking/mobile exec node --test scripts\expo-local-android-debug-build.test.mjs
corepack pnpm exec node scripts\expo-local-android-debug-build.mjs --architecture "arm64-v8a,x86_64" --output build\e2e\android\salary-hijacking-universal-debug.apk
adb install -r apps\mobile\build\e2e\android\salary-hijacking-universal-debug.apk
adb shell monkey -p com.salaryhijacking.mobile 1
```

## Current Limits

Current evidence proves source/test/build/web screenshot coverage and local
emulator startup for the latest debug APK. It does not prove physical phone QA,
full Detox/native interaction E2E, production AAB, EAS submit, Google Play
submission, new EAS project creation, new keystore creation, Firebase reset, DB
destructive migration, or secret changes.
