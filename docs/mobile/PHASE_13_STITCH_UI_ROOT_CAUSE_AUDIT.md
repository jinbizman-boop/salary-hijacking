# PHASE 13 Stitch UI Root-Cause Audit

Generated: 2026-08-29

## Scope

This is a read-only audit. It does not modify mobile source, design tokens, routes, assets, package files, native config, build input, or the current RC lineage.

- Application RC source SHA: `08005cff94e4f0661d2ae809d7d508379ab3092a`
- RC source fingerprint: `90045513FD9C672C30116747A7E5A8D7E582BE47BF5DB17026B4FD69EA490D49`
- Galaxy model used for current runtime context: `SM-S921N`
- ARM64 APK SHA-256: `ac263de1ebc7660a336a45609d13accfcc0a468feb562f8a78cb94222a893ff3`

## Executive Finding

The primary root cause is:

`ROOT_CAUSE_STITCH_304_REFERENCE_NOT_FULLY_PRODUCTIONIZED_TO_NATIVE_RN`

The repository contains Stitch reference material and a mobile capture/evidence surface, but the 304 classified state set is not enforced as a complete production Expo Router to native React Native component acceptance chain. Production routes use real React Native feature components, while Stitch HTML/PNG assets remain reference evidence. Some visual decisions and tokens were translated, but the production app does not have a complete route-by-route, state-by-state, token-by-token native implementation mapped to all classified Stitch states.

## Canonical Source Inventory

| Source | Classification | Evidence |
| --- | --- | --- |
| `docs/design/stitch/2026-07-16/stitch-screen-inventory.json` | CANONICAL_REFERENCE | Found |
| `docs/design/stitch/2026-07-16/screens/*.png` | CANONICAL_REFERENCE | 17 files |
| `docs/design/stitch/2026-07-16/html/*.html` | CANONICAL_REFERENCE | 17 files |
| `docs/design/stitch/2026-07-16/source-zips/source-zips-manifest.json` | CANONICAL_REFERENCE | Records external ZIP source and hash; raw ZIP copies are not stored in repo |
| `docs/ui/SOURCE_MANIFEST.md` | CANONICAL_REFERENCE | Found |
| `docs/ui/SCREEN_CATALOG.csv` | CANONICAL_REFERENCE | 30 rows, 19 PASS, 11 PARTIAL |
| `docs/ui/UI_DECISION_LOG.md` | CANONICAL_REFERENCE | Found |
| `release/evidence/mobile-ui/*.png` | VISUAL_EVIDENCE | Existing evidence referenced by UI docs |
| `apps/mobile/app/**` | PRODUCTION_IMPLEMENTATION | 29 production route files excluding layouts |
| `apps/mobile/src/features/**` | PRODUCTION_IMPLEMENTATION | Route components and feature components |
| `apps/mobile/src/features/capture/CapturePreviewScreen.tsx` | PROTOTYPE_ONLY / EVIDENCE_SURFACE | Capture/reference route, not normal production flow |
| Stitch HTML source | PROTOTYPE_ONLY / REFERENCE | UI decision log forbids direct paste into RN runtime |
| Initial design PDF / HTML planning docs | CANONICAL_REFERENCE_SECONDARY | Present as supporting references, not current strict 304 acceptance by itself |

No repository evidence showed a missing Stitch reference source. The raw classified source ZIP is intentionally recorded by manifest rather than committed as a repo source copy.

## 304 State Inventory

`304` is not a production route count. It refers to classified UI states across screens, variants, modals, bottom sheets, flows, and loading/empty/error/offline/permission conditions.

| Metric | Result |
| --- | --- |
| `STITCH_EXPECTED_STATE_COUNT` | 304 by prior classified-state terminology |
| `STITCH_INVENTORY_FOUND` | YES |
| `STITCH_CANONICAL_IDS_FOUND` | PARTIAL; 17 canonical PNG/HTML pairs and 30 screen catalog rows are directly materialized in repo |
| `STITCH_PRODUCTION_MAPPED_COUNT` | 30 by `docs/ui/SCREEN_CATALOG.csv` rows |
| `STITCH_UNMAPPED_COUNT` | 274 state-level entries are not materialized as a complete production-route acceptance matrix in repo |
| `STITCH_PARTIAL_COUNT` | 11 rows in `docs/ui/SCREEN_CATALOG.csv` |
| `STITCH_VISUAL_EVIDENCE_COUNT` | Existing mobile UI evidence exists, but not a full strict 304 production-native acceptance set |

Prior `304/304` or `305/305` declarations must not be used as D-013 PASS without current production APK route/component/interaction/accessibility/keyboard/safe-area evidence.

## Frozen RC History Check

`git diff --name-status 08005cff94e4f0661d2ae809d7d508379ab3092a..HEAD -- apps/mobile docs/design docs/ui packages/ui` returned no changed paths.

Recent relevant history starts at the frozen RC:

- `08005cf Remove local API hosts from Android QA bundle`
- `17e9fe5 Force production Metro env for Android QA bundles`
- `bbec6a2 Fix Android QA qaRelease build preflight`
- `646732c Complete Phase 9 mobile functional integration`

Therefore, the audited mismatch is not explained by "Stitch UI exists after frozen RC but is missing from the RC." The evidence indicates the incomplete productionization existed at the frozen RC.

## Production Route Inventory

The strict same-RC production Expo Router filesystem contains 29 non-layout route files, including auth, onboarding, salary, plan, notifications, level, community, write, profile, settings/account, and capture route surfaces.

Representative production mapping:

| Production route | Actual implementation pattern | Stitch/reference relationship |
| --- | --- | --- |
| `/(auth)/login` | Native auth components such as `LoginHero` and `LoginCredentialForm` | Stitch reference mapped in screen catalog |
| `/(tabs)/salary` | `SalaryHomeScreen` and native feature components | Stitch reference mapped, current Galaxy visual differs by production data/runtime state |
| `/(tabs)/plan` | Native plan feature components | Stitch reference mapped |
| `/notifications` | Native notification screen/list components | Stitch reference mapped |
| `/(tabs)/level`, `/level/*` | Native LV UP feature components | Stitch reference mapped for core states |
| `/(tabs)/community`, `/community/[postId]`, `/community/write` | Native community components | Stitch reference mapped for representative states |
| `/(tabs)/profile`, `/profile/*` | Native profile/settings/account/support components | Stitch reference mapped for representative states |
| `/capture/[screen]` | Capture/reference preview route | Evidence/prototype surface, not normal production navigation |

## Design Token Pipeline Audit

| Candidate issue | Status | Evidence |
| --- | --- | --- |
| Stitch token not fully converted to RN token | FAIL_PRESENT | `docs/ui/UI_DECISION_LOG.md` defines Stitch primary `#006A37`, but production routes still contain direct color/style usage and legacy values |
| RN components bypass common tokens with inline styles | FAIL_PRESENT | Feature components and route files include local `StyleSheet` values alongside shared tokens |
| Old design token remains in production | FAIL_PRESENT | `#209252` remains as legacy/brand reference in multiple mobile surfaces |
| Prototype CSS not directly imported to RN | PASS_EXPECTED | UI decision log forbids direct HTML/CSS paste |
| Theme/provider absent from all production routes | PARTIAL | Shared `componentColors` exists, but package-level UI token SSOT is not uniformly imported |
| Some screens use newer system while others remain older | FAIL_PRESENT | Screen catalog has PASS and PARTIAL rows; production feature components vary in token usage |
| Android-specific override is primary drift | UNVERIFIED | No code evidence made Android-specific override the primary root cause |
| Font/icon asset loading failure is primary drift | UNVERIFIED | No evidence found that missing fonts/icons are the first root cause |
| Image/logo asset mapping failure is primary drift | UNVERIFIED | Not the first root cause in current evidence |

## HTML to Native Integration

The Stitch material is HTML/PNG/reference-first. Repository documentation says HTML is an extraction reference and must not be pasted directly into React Native. Current production routes import native feature components rather than Stitch HTML. This supports the primary root cause:

`ROOT_CAUSE_STITCH_REFERENCE_NEVER_FULLY_PRODUCTIONIZED_TO_NATIVE_RN_304_STATE_MATRIX`

## Prototype / Fallback / Placeholder Audit

| Item | Result |
| --- | --- |
| `PRODUCTION_LEGACY_COMPONENT_COUNT` | NONZERO_BY_STYLE_USAGE; exact exhaustive count deferred to Phase 10 implementation audit |
| `PRODUCTION_PLACEHOLDER_COUNT` | 0 known production-success placeholders from Phase 9 mock audit; capture route contains demo placeholders |
| `PRODUCTION_STITCH_COMPONENT_COUNT` | PARTIAL; representative native components are Stitch-informed but not complete 304 implementations |
| `PRODUCTION_NON_STITCH_COMPONENT_COUNT` | NONZERO; production native features include independent implementation details |
| Capture/prototype route active in filesystem | YES, but excluded from normal production route acceptance |

## Actual Galaxy Visual Evidence

Current Galaxy screenshots from PHASE 13 runtime remain evidence of installed strict same-RC behavior:

- `artifacts/phase13-runtime/galaxy-sm-s921n/authenticated-e2e/authenticated-home.png`
- `artifacts/phase13-runtime/galaxy-sm-s921n/authenticated-e2e/session-restore-home.png`
- `artifacts/phase13-runtime/galaxy-sm-s921n/fcm-registration-screen-before.png`

Observed mismatch classes requiring PHASE 10 remediation:

- layout
- color
- typography
- spacing
- component composition
- route/state coverage
- modal/bottom-sheet coverage
- keyboard/safe-area/accessibility acceptance evidence

This audit does not modify the current RC to correct the mismatch.

## Root Cause Classification

| Candidate | Status |
| --- | --- |
| Stitch artifacts never fully converted to production RN | FAIL_PRESENT |
| Production routes still use legacy or independently styled UI | FAIL_PRESENT |
| Frozen RC predates Stitch integration | PASS_NOT_ROOT_CAUSE |
| Stitch source missing from repository | PASS_NOT_ROOT_CAUSE |
| 304 state mapping was never completed as production acceptance | FAIL_PRESENT |
| Design tokens not fully wired to production | FAIL_PRESENT |
| Stitch implementation exists but is not imported | PARTIAL; capture/reference surfaces exist, production routes use feature components |
| Generated HTML mistaken for native implementation | RISK_PRESENT_IN_PROCESS_HISTORY; current docs correctly classify HTML as reference |
| Later UI commits never entered RC | PASS_NOT_ROOT_CAUSE for audited paths |
| Android-specific rendering drift | UNVERIFIED_NOT_PRIMARY |
| Placeholder/fallback components still active | PARTIAL; capture route contains placeholders, production-success path audit remains separate |
| Design assets/font/icons missing | UNVERIFIED_NOT_PRIMARY |
| Acceptance evidence existed but actual production implementation differed | FAIL_PRESENT |

## D-013 Truth

| Metric | Value |
| --- | --- |
| `D013_TOTAL` | 304 classified states |
| `D013_PASS` | 30 route/screen-catalog mappings have evidence status rows, with 19 PASS |
| `D013_PARTIAL` | 11 screen-catalog rows plus unmapped classified states |
| `D013_FAIL` | 0 individual rows marked FAIL in `SCREEN_CATALOG.csv`, but D-013 overall remains FAIL |
| `D013_UNVERIFIED` | 274 state-level entries not fully materialized as production-native acceptance evidence |

D-013 remains `FAIL` until the full Stitch/native production acceptance chain is completed.

## Required Remediation Boundary

`UI_REMEDIATION_REQUIRED=true`

`UI_REMEDIATION_REQUIRES_NEW_APPLICATION_RC=true`

Any production UI/token/route/asset fix would change the same-RC application source lineage. It must occur after PHASE 13 closure in a separate PHASE 9/10 Mobile + Stitch remediation track and produce a new RC.

`DO_NOT_CHANGE_CURRENT_RC=true`
