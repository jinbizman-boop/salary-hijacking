# Mobile UI Design Implementation Checklist

Generated for the Salary Hijacking mobile web visual evidence harness.

## Scope

- Evidence directory: `release/evidence/mobile-ui`
- Store screenshot directory: `release/screenshots`
- Capture summary: `release/evidence/mobile-ui/capture-summary.json`
- Verification command: `node scripts\release\capture-mobile-clean-fintech-screenshots.mjs`
- Status: web visual evidence harness verified; native E2E and store builds are not proven by this file.

## Shared Design Rules

| Requirement                                                              | Status | Evidence                                                                                                                                  |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Green fintech visual system is applied                                   | Met    | All captured screens use the shared clean-fintech theme, white cards, green accents, and light app background.                            |
| Official BI/logo appears on primary screens                              | Met    | Splash, auth, salary, plan, LV UP, community, and profile captures include the official BI signal.                                        |
| Mobile-safe card layout and spacing                                      | Met    | 430x932 captures avoid desktop tables and use stacked cards or compact pills.                                                             |
| Server-authoritative copy is visible where financial or XP state appears | Met    | Salary, plan, LV UP, profile, and privacy panels show server-source or server-authority copy.                                             |
| Ads/partners are contextual-only                                         | Met    | Salary and LV UP captures label ad/partner areas and state that financial targeting is not used.                                          |
| Sensitive data is not exposed in public evidence                         | Met    | Screens use sample values and privacy-safe mock API responses; raw account, token, phone, email, and device identifiers are not captured. |
| Touch targets and controls are visible                                   | Met    | Primary buttons, pills, tab chips, text inputs, and checkbox controls are visible in the relevant captures.                               |

## Screen Evidence

| File                     | Screen             | Requirements Reflected                                                             | Open Item                                 |
| ------------------------ | ------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| `01_splash.png`          | Splash             | BI, brand name, tagline, first value card                                          | Native launch animation not proven        |
| `02_login.png`           | Login              | Email/password, social login buttons, privacy notice                               | Real provider OAuth not exercised         |
| `03_signup.png`          | Signup             | Account creation, consent checkboxes, `/api/v1/auth/register` copy                 | Real registration flow not exercised      |
| `04_onboarding.png`      | Onboarding         | Payroll setup checklist and server-authoritative planning copy                     | Native onboarding E2E not proven          |
| `05_salary_home.png`     | Salary home        | Saved amount hero, daily budget, fixed/variable expenses, contextual ad separation | Live production API not proven            |
| `06_daily_budget.png`    | Daily budget focus | Daily budget anchor and quick expense area                                         | Native scroll/focus behavior not proven   |
| `07_plan_setting.png`    | Plan/settings      | Payroll, fixed expense, fixed savings, daily living budget planning                | Real DB persistence not proven            |
| `08_notifications.png`   | Notifications      | Budget, routine, community notification cards                                      | Push delivery not proven                  |
| `09_level_hub.png`       | LV UP hub          | Reading/news/English/health CTAs, XP progress, contextual ad slot                  | Native tab E2E not proven                 |
| `10_level_reading.png`   | Reading detail     | Category pills, content cards, private record fields, XP/progress copy             | Real content completion E2E not proven    |
| `11_level_news.png`      | News detail        | Balanced reading structure and record entry surface                                | External news ingestion not proven        |
| `12_level_english.png`   | English detail     | Listening/speaking/reading/writing routine surface                                 | Audio/speech features not proven          |
| `13_level_health.png`    | Health detail      | Beginner-safe routine, timer/record style UI, safety copy                          | Native timer and pain-stop E2E not proven |
| `14_community.png`       | Community list     | Board tabs, popular posts, privacy warning                                         | Real feed moderation flow not proven      |
| `15_community_write.png` | Community write    | Title/body inputs, board selection, anonymous/question controls                    | Server submit/moderation E2E not proven   |
| `16_profile.png`         | Profile/MY         | Profile summary, saved total, level, self-care, privacy controls                   | Real account actions not proven           |
| `17_profile_level.png`   | Profile level      | MY growth routine, active/completed missions, XP progress                          | Real dashboard mutation not proven        |

## Verification Notes

- The previous route blocker, where `/capture/...` routes normalized to `/salary`, was reproduced and fixed by preserving the initial browser capture URL before Expo Router rewrites.
- The root layout now renders capture-only screens directly for screenshot evidence, including splash, signup, LV UP detail, community write, and profile level screens.
- The generated PNG sizes differ across the 17 mobile UI captures, and manual visual inspection confirmed all 17 mobile UI evidence screens render the intended distinct UI states rather than the salary fallback.
