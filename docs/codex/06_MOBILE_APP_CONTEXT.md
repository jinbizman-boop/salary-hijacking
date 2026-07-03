---
codex_context: true
priority: P0
scope: apps/mobile
applies_to:
  - apps/mobile/**
last_verified: 2026-07-03
---

# Mobile App Context

## Package

Path: `apps/mobile`

Package name: `@salary-hijacking/mobile`

Current package/config files:

- `package.json`
- `tsconfig.json`
- `eas.json`
- `app.config.ts`
- `.detoxrc.json`
- `e2e/jest.config.cjs`
- `e2e/smoke.e2e.js`

`package.json`, `tsconfig.json`, `eas.json`, and `.detoxrc.json` parse as JSON when read with BOM handling where needed.

## Screens

Main route files:

- `app/_layout.tsx`
- `app/index.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(tabs)/salary/index.tsx`
- `app/(tabs)/plan/index.tsx`
- `app/(tabs)/level/index.tsx`
- `app/(tabs)/community/index.tsx`
- `app/(tabs)/profile/index.tsx`
- `app/notifications/index.tsx`
- `app/community/[postId].tsx`
- `app/community/write.tsx`
- `app/level/reading.tsx`
- `app/level/news.tsx`
- `app/level/english.tsx`
- `app/level/health.tsx`

## Implementation Pattern

Many screens use:

- runtime module loading,
- `React.createElement`-style helpers,
- local fallback seed data,
- explicit privacy flags,
- no raw financial data exposure claims.

Do not convert large screen files to a new architecture without a scoped plan.

## Current Verification

Commands run on 2026-07-03:

- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS
- `corepack pnpm --filter @salary-hijacking/mobile run test`: PASS, 32 suites and 127 tests
- `corepack pnpm --filter @salary-hijacking/mobile run lint`: PASS
- `corepack pnpm run format:check`: PASS
- `corepack pnpm run build`: PASS, 12 Turbo tasks
- `corepack pnpm --filter @salary-hijacking/mobile run test:e2e`: FAIL fast on missing Detox APK

Detox now has a repository-level execution contract:

- `.detoxrc.json` defines `android.emu.debug` and `ios.sim.debug`.
- `e2e/jest.config.cjs` uses Detox's Jest setup, teardown, reporter, test environment, and `jest-circus/runner`.
- `e2e/smoke.e2e.js` launches the app and checks `salary-hijacking-mobile-root`.
- `app/_layout.tsx` exposes `testID: "salary-hijacking-mobile-root"` on the root shell.
- `scripts/check-detox-env.mjs` runs before Detox and fails fast with actionable Android/iOS native E2E prerequisites.
- `scripts/import-e2e-apk.mjs` imports a locally downloaded EAS/local Android
  E2E APK into `build/e2e/android/salary-hijacking-e2e.apk` without storing
  artifact URLs or release proof artifact paths in the repository. Run it through
  `corepack pnpm --filter @salary-hijacking/mobile run e2e:android:import-apk -- <local-apk-path>`.
- `build:e2e:android:preflight` runs
  `scripts/eas-local-android-build.mjs --check` and verifies local EAS CLI,
  Expo authentication via trusted `EXPO_TOKEN` or `eas whoami`, Android SDK
  tools, the EAS `e2e` APK profile, and a usable Java runtime without exposing
  token values.
- `build:e2e:android:local` runs through
  `scripts/eas-local-android-build.mjs`, which sets `JAVA_HOME`/`PATH` to the
  Android Studio bundled JBR when Java is not on the shell PATH, then invokes
  EAS local build with `--local --output
build/e2e/android/salary-hijacking-e2e.apk`. This script is preparation only;
  native E2E proof is still false until the APK is actually built and Detox or
  equivalent no-secret device proof passes.
- When the Android Detox preflight fails, it now prints the concrete next
  command sequence: local EAS build to the expected APK path, then
  `test:e2e:android`, or remote EAS build plus `e2e:android:import-apk`, then
  `test:e2e:android`.

The current E2E blocker is local native binary/proof, not missing Detox config:

- `apps/mobile/scripts/check-detox-env.mjs` now checks `ANDROID_SDK_ROOT`,
  `ANDROID_HOME`, and common Android Studio SDK locations such as the Windows
  default SDK directory.
- On 2026-07-01, `release/mobile-native-evidence.json` detected local `adb`
  and `emulator` through Android SDK tool lookup.
- On 2026-07-01, `node scripts\check-detox-env.mjs android.emu.debug` failed
  only because the local E2E APK was missing:
  `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk`.

- On 2026-07-02, `node scripts\check-detox-env.mjs android.emu.debug` from
  `apps/mobile` still failed only because that Android E2E APK was missing;
  local `adb` and `emulator` remained detected through Android SDK lookup.
- On 2026-07-02, `node scripts\check-detox-env.mjs ios.sim.debug` from
  `apps/mobile` failed because the local Detox iOS app was missing at
  `apps/mobile/build/e2e/ios/salaryhijacking.app`.
- On 2026-07-02, `corepack pnpm --filter @salary-hijacking/mobile run
build:e2e:android:preflight` now fails fast because Expo account
  authentication is unavailable. It still detects
  `C:\Program Files\Android\Android Studio\jbr` as Java and
  `C:\Users\Telos_PC_17\AppData\Local\Android\Sdk` as the Android SDK root, but
  `eas login` or `EXPO_TOKEN` from a trusted secret store is required before
  attempting the local EAS Android E2E APK build.
- On 2026-07-02, `corepack pnpm --filter @salary-hijacking/mobile run
build:e2e:android:local` remains blocked by the same Expo account
  authentication requirement. No E2E APK was produced.
- No local Android E2E APK at `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk` has been verified.
- No local iOS Detox app at `apps/mobile/build/e2e/ios/salaryhijacking.app`
  has been verified.
- The expected APK path is ignored by Git through root `.gitignore` build and
  APK protections.
- Tool availability alone is not native E2E proof; `nativeE2eVerified` must
  remain false until Detox or equivalent device-farm evidence is recorded
  without secrets.

## Auth Login/Signup API Submission

As of 2026-07-03, the Clean Fintech Login and Signup screens submit through a
dedicated mobile Auth API client before showing success:

- `POST /api/v1/auth/login` through `AuthApiClient.login()`
- `POST /api/v1/auth/register` through `AuthApiClient.register()`

The client sends privacy-safe headers, requires HTTPS or localhost base URLs,
normalizes the current API login/register response shape through the shared
mobile auth response adapter, stores only the access token in SecureStore, and
does not persist refresh tokens in the mobile token store. MFA-required and
locked-account responses stay pending/error states instead of being reported as
local login success. The screen tests verify server-first submission wiring,
but deployed API auth, DB-backed user persistence, native E2E, and store review
proof remain separate release gates.

## Auth Refresh/Logout Session Continuity

As of 2026-07-03, the mobile Auth API client also supports the server refresh
and logout routes:

- `POST /api/v1/auth/refresh` through `AuthApiClient.refresh()`
- `POST /api/v1/auth/logout` through `AuthApiClient.logout()`

The refresh call relies on the server HttpOnly refresh cookie through
`credentials: include`, stores only the rotated access token, and clears the
local access token when refresh is rejected by the server. The logout call
delegates session revocation and cookie clearing to the server, then deletes the
local access token. The mobile client still does not persist raw refresh tokens.

As of 2026-07-03, `createMobileAuthApi()` also honors an injected auth token
store in tests and runtime factories instead of hard-wiring SecureStore for all
cases. This keeps feature API bearer attachment and auth login/refresh/logout
storage paths testable through the same mobile factory boundary.

## Bearer Token Attachment For Feature APIs

As of 2026-07-03, shared mobile API factories wrap feature API fetchers with
`createMobileAuthenticatedFetcher()`:

- stored access tokens are read through `MOBILE_ACCESS_TOKEN_KEY`
- valid tokens are attached as `Authorization: Bearer ...`
- malformed stored tokens are dropped before network requests leave the app
- refresh tokens are not read from or written to the feature API bearer path

The wrapper is used by the mobile budget, payroll, plan commitments,
notifications, growth, profile, and community factories. Auth login/register
requests remain unauthenticated entrypoints.

As of 2026-07-03, that shared authenticated fetcher also performs a single
server refresh attempt when a protected feature API returns 401. It calls
`POST /api/v1/auth/refresh` through the raw auth client, relies on the server
HttpOnly refresh cookie, stores only the rotated access token, then retries the
original feature request once with the new bearer token. If refresh fails, the
original 401 response is returned to the feature API parser so the app does not
loop or pretend the request succeeded.

The refresh attempt is single-flight within each shared authenticated fetcher:
if multiple protected feature requests receive 401 at the same time, they await
the same refresh promise and then retry individually. This prevents duplicated
refresh calls during app startup or tab hydration bursts.

## LV UP Growth API Hydration

As of 2026-07-03, the Clean Fintech LV UP screen calls the server Growth API
before using local fallback missions:

- `GET /api/v1/growth/dashboard` through `GrowthApiClient.getDashboard()`
- `GET /api/v1/growth/tasks` through `GrowthApiClient.listTasks()`
- `POST /api/v1/growth/tasks/{taskId}/progress` through
  `GrowthApiClient.recordTaskProgress()`

The mobile client sends privacy-safe headers, refuses responses that report raw
financial data exposure, strips owner `userId` from the normalized dashboard,
and treats local missions only as a non-authoritative fallback when no server
tasks are available.

## MY Profile API Hydration

As of 2026-07-03, the Clean Fintech MY screen calls the server Users/Profile API
before using local fallback profile data:

- `GET /api/v1/users/me/profile` through `ProfileApiClient.getProfile()`
- `POST /api/v1/users/me/privacy-export` through
  `ProfileApiClient.requestPrivacyExport()`
- `POST /api/v1/users/me/withdrawal-request` through
  `ProfileApiClient.requestWithdrawalRequest()`

The mobile client sends privacy-safe headers, rejects raw email, raw phone, raw
financial, raw push token, and ads financial targeting exposure flags, strips
server-only identifiers from the normalized profile snapshot, and treats
privacy export and withdrawal actions as non-destructive server requests rather
than final local account deletion.

As of 2026-07-03, the Clean Fintech MY screen also exposes a server-first logout
action. The action calls `AuthApiClient.logout()` through
`createMobileAuthApi()`, delegates session revocation and cookie clearing to
`POST /api/v1/auth/logout`, clears the local profile snapshot on success, and
routes the user back to `/(auth)/login`. It does not persist or expose raw
refresh tokens.

## Community Feed API Hydration

As of 2026-07-03, the Clean Fintech Community tab calls the existing mobile
Community service before using local fallback posts:

- `GET /api/v1/community/posts` through `CommunityService.listPosts()`
- board-filtered requests map app tabs to server board types where the current
  UI has a concrete server equivalent
- server responses are parsed through `parseCommunityFeedPage()` and
  `communityResponseData()` before rendering

The screen rejects raw financial, raw personal, or ads financial targeting
exposure flags through the community parser and row normalization path. Local
posts remain a non-authoritative visual fallback when the API cannot be reached.
Write, detail, and comment list flows now have screen-level server-first
coverage; deployed API auth, DB persistence, native E2E, and store review proof
remain separate release gates.

## Community Write API Publication

As of 2026-07-03, the Clean Fintech write screen submits posts through the
existing mobile Community service instead of showing a local-only success state:

- `POST /api/v1/community/posts` through `CommunityService.publishPost()`
- app board labels are mapped to server board types with the same board map
  used by the Community feed surface
- invalid title/body inputs keep the submit button disabled
- the service-side community validator still blocks unsafe personal, financial,
  abusive, or risky content before a request reaches the API

On successful submission, the screen clears the title/body fields and shows a
server registration toast. On failure, it shows a failure toast and does not
pretend that the post was published. This is still screen-level publication
alignment; full write-flow release proof requires deployed API auth, DB-backed
persistence, and native E2E/store review evidence.

## Community Detail And Comments API Hydration

As of 2026-07-03, the Clean Fintech community post detail route passes the
Expo Router `postId` parameter into the detail screen and hydrates the screen
through the existing mobile Community service before using a safe local
fallback:

- `GET /api/v1/community/posts/{postId}` through `CommunityService.getPost()`
- `GET /api/v1/community/posts/{postId}/comments` through
  `CommunityService.listComments()`
- `POST` or `DELETE /api/v1/community/posts/{postId}/like` through
  `CommunityService.setPostLiked()`
- `POST /api/v1/community/posts/{postId}/comments` through
  `CommunityService.createComment()`

The detail screen parses post and comment responses through
`parseCommunityPostDetail()`, `parseCommunityCommentPage()`,
`parseCommunityComment()`, and `communityResponseData()`. It preserves local
fallback detail/comment display when the API is unreachable, but the fallback is
not authoritative. Like state is optimistically toggled only while the server
request is in flight and is reverted on failure. Comment creation uses the
service validator before the API call, clears the draft only after server
success, and shows a failure toast without pretending local publication
succeeded. The normalized detail/comment path keeps raw financial, raw personal,
and ads financial targeting flags false.

Mobile native release evidence is tracked in `release/mobile-native-evidence.json`.
When EAS build, native E2E, or store-submit dry-run proof changes, record only
no-secret observations in `release/mobile-native-observation.local.json`, run
`corepack pnpm run release:mobile-native-proof` to normalize
`release/mobile-native-proof.local.json`, then run
`corepack pnpm run release:mobile-native-evidence`. Do not store EAS tokens,
Apple/Google credentials, binary download URLs, local artifact paths, signing
keys, service accounts, reviewer passwords, or copied store-console payloads in
repository files. Verified proof must also carry `appIdentity` for
`appSlug=salary-hijacking`, `androidPackage=com.salaryhijacking.mobile`, and
`iosBundleIdentifier=com.salaryhijacking.mobile`; the tracked evidence
generator and release readiness reject unrelated mobile app identities before
build, E2E, or store-submit booleans can count. Release readiness independently
blocks tracked mobile native evidence when `containsSecretValues` is not
explicitly false, raw native release secret values are embedded,
`appIdentity` drifts from the release target mobile slug/package/bundle
identifier, or `privacy.containsEasToken`, `privacy.containsStoreCredential`,
`privacy.containsBinaryDownloadUrl`, or `privacy.containsReviewerPassword` is
true.

The GitHub mobile build workflow now writes and uploads a no-secret
`mobile-native-proof-*` artifact from `release/mobile-native-proof.local.json`.
This artifact can help a release operator refresh tracked evidence, but it does
not by itself prove native release readiness or satisfy the blocked
`release/mobile-native-evidence.json` gates.

Official mobile UI assets are already bundled:

- Official BI logo:
  `apps/mobile/assets/brand/salary-hijacking-platform-logo.png`
- User-provided BI source hash on 2026-07-01:
  `EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466`
- Bundled BI hash:
  `EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466`
- Freesentation font files:
  `apps/mobile/assets/fonts/Freesentation-4Regular.ttf` through
  `Freesentation-9Black.ttf`

`apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts` guards the
official BI asset SHA256, Freesentation font loading, Clean Fintech v1 token
values, bottom tab IA, screenshot anchor, and Korean mojibake absence for the
launch screen set.
As of 2026-07-02, Salary Home also hydrates its daily-budget base values from
`BudgetApiClient.getToday()` before using the existing offline preview fallback.
The fallback remains a non-authoritative UI preview; the `/api/v1/daily-budgets`
server response remains the source of truth for daily limit, spent amount, and
remaining amount.
As of 2026-07-03, Salary Home also hydrates the fixed expense list from
`PlanCommitmentsApiClient.getCommitments()` before using the static fixed
expense fallback rows. The home fixed expense section now renders
server-authoritative `/api/v1/fixed-expenses` items when available while keeping
the existing non-authoritative fallback for offline display.
As of 2026-07-02, Plan also uses `PayrollApiClient.getCurrent()` and
`PayrollApiClient.recalculate()` through `/api/v1/payroll/current` and
`/api/v1/payroll/recalculate` before falling back to the existing local preview.
The client-side preview remains non-authoritative; the server payroll
calculation response remains the source of truth for the payroll plan summary.
As of 2026-07-03, Plan also uses `PlanCommitmentsApiClient.getCommitments()`
to hydrate fixed expense and fixed savings commitments from
`/api/v1/fixed-expenses` and `/api/v1/savings`. The mobile client sends the
same privacy-safe headers used by other finance clients, accepts only
server-authoritative KRW integer money fields, rejects raw financial/account
exposure flags, strips server-only internal IDs, and feeds the resulting fixed
expense and savings totals into the payroll recalculation preview. Static rows
remain only as non-authoritative offline display fallback.
As of 2026-07-02, Notifications also use `NotificationsApiClient.list()` and
`NotificationsApiClient.unreadCount()` through `/api/v1/notifications` before
falling back to the existing static example notifications. The mobile client
normalizes server notification payloads, refuses sensitive financial exposure
flags, sends privacy-safe headers, and marks local unread state immediately
while delegating persisted read state to the server.
`scripts/release/check-release-readiness.mjs` also blocks release readiness when
the bundled official BI logo is missing, invalid PNG, or SHA256-mismatched, or
when any required Freesentation font asset is missing, not TTF/OTF-shaped, or
too small to be the bundled launch font.
It also validates launch PNG dimensions and byte sizes for `icon.png`,
`splash.png`, `adaptive-icon.png`, `notification-icon.png`, and `favicon.png`,
so placeholder-sized assets cannot pass the mobile release gate.
The same release gate checks that `apps/mobile/app.config.ts` still points its
default Expo launch asset fallbacks at those checked files, preventing a valid
asset bundle from drifting away from the actual app configuration.

On 2026-07-01, `corepack pnpm --filter @salary-hijacking/mobile run export:web`
passed and exported the official BI plus Freesentation assets. `node
scripts\release\capture-mobile-clean-fintech-screenshots.mjs` then regenerated
five 430x932 store screenshot candidates and one 1024x500 Google Play feature
graphic from the local app export and mock API. Visual inspection confirmed the
home, daily budget, and feature graphic surfaces render the official BI and
Clean Fintech value-first layout.
Release readiness blocks placeholder-sized screenshot PNGs by requiring phone
screenshots to be at least 360x640 and 20,000 bytes, and the Google Play
feature graphic to be exactly 1024x500 and at least 40,000 bytes.

## Feature File Status

As of 2026-06-29, `apps/mobile/src/features/budget` and `apps/mobile/src/features/community` contain 51 non-empty files and no zero-byte source/test/component files were found in those two feature trees.

## Endpoint Alignment Notes

Previously observed high-priority mobile/API alignment gaps have been reduced:

- `/api/v1/mobile/bootstrap` is implemented in the API worker app.
- mobile auth stores bearer tokens and shared mobile API helpers attach them.
- public Expo Router paths such as `/salary`, `/plan`, and `/level` are used for local smoke navigation.
- local API plus Expo web smoke verified signup/login and `/salary`, `/level`, `/plan` navigation.

Remaining endpoint work should still compare touched mobile calls against `services/api/src/routes` before claiming API/mobile coverage complete. Community report, edit, and delete flows still require route-level screen verification when those screens are next touched.

## Mobile Work Checklist

Before reporting mobile work complete:

1. Confirm package dependencies are installed/resolved.
2. Run mobile JSON checks.
3. Run mobile typecheck.
4. Run relevant tests or explain why tests are unavailable.
5. Compare touched API calls against `services/api/src/routes`.
6. Update `08_FILE_COMPLETION_LOG.md`.
