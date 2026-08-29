# PHASE 13 New RC Remediation Status

Generated: 2026-08-29

## Old RC Baseline

| Field | Value |
| --- | --- |
| Old application RC source SHA | `08005cff94e4f0661d2ae809d7d508379ab3092a` |
| Baseline handling | historical known-good; preserve existing evidence |
| REL-004 | PASS |
| REL-005 | PASS |
| REL-006 | PARTIAL_ARCHITECTURAL_TOKEN_MISMATCH |
| REL-008 | PASS |
| REL-009 | PASS |
| D-013 | FAIL |
| D-016 | PARTIAL |
| D-017 | PASS |
| D-026 | FAIL |

## FCM Status

| Field | Value |
| --- | --- |
| FCM primary root cause | Android APK registered Expo Push Service token while FCM HTTP v1 Worker required native FCM token |
| Token before | Expo Push Service token from `getExpoPushTokenAsync()` |
| Token after | Native device token from `getDevicePushTokenAsync()` with `provider=FCM` and `tokenSource=NATIVE_DEVICE` |
| DB contract | `user_devices` provider/source/hash/secret-ref plus encrypted `notification_push_tokens` delivery target |
| Service auth status | staging/production Worker requires `NOTIFICATIONS_SERVICE_TOKEN_SHA256`; plaintext fallback is dev-only |
| New RC DB gate | `PASS_STAGING_MIGRATION_0026_VERIFIED` |
| Migration files | 26 |
| Migration ledger rows | 26 |
| Staging DB execution path | `GitHub Actions staging Environment -> neon-staging-migration-0026` |
| Staging DB credential handling | `STAGING_DATABASE_URL` by secret name only; no local raw credential required or recorded |
| Migration 0026 workflow status | SUCCESS_USER_DISPATCHED |
| Migration 0026 workflow evidence output | `artifacts/neon-staging-migration-0026/**` no-secret artifact |
| Migration 0026 checksum | `A8729D9D655D8B44DDEB5AE1D7B57EF4406DC05E39B9436F4F02B917F1222D3C` |
| Migration 0026 post-verification evidence | `artifacts/neon-staging-migration-0026/post-verification-2026-08-29/evidence.json` |
| FCM DB runtime contract evidence | `artifacts/neon-staging-migration-0026/post-verification-2026-08-29/fcm-db-contract-evidence.json` |
| Mobile lint | PASS after replacing release preflight `console.log` with repository-safe stdout output |

## Stitch Status

| Field | Value |
| --- | --- |
| Stitch primary root cause | `ROOT_CAUSE_STITCH_304_REFERENCE_NOT_FULLY_PRODUCTIONIZED_TO_NATIVE_RN` |
| Stitch expected | 304 |
| Stitch before mapped | 30 |
| Stitch after mapped | 304 source renderer mappings; 30 production APK visual mappings |
| Stitch unmapped | 0 source renderer mappings; 274 production APK visual/a11y mappings pending |
| Stitch source registry | `apps/mobile/src/features/capture/stitch-state-registry.ts` resolves all 304 canonical `variant_slug` rows to native RN capture/state renderers |
| Stitch production route registry | `apps/mobile/src/shared/navigation/stitch-production-route-registry.ts` maps all 304 canonical states to non-capture production Expo routes and native source files |
| Stitch route aliasing | `/capture/[screen]` and root capture URLs accept catalog slugs through `resolveCaptureKindForStitchSlug`; native production still redirects capture routes away from device runtime |
| Stitch reporting model | source registry, native RN implementation, and APK-backed runtime visual evidence are separate gates |
| Stitch source registry mapped | 304 |
| Stitch native implemented count | 91 |
| Stitch native unimplemented count | 213 |
| Stitch runtime visual verified count | 30 |
| Stitch runtime visual pending count | 274 |
| Stitch native implementation audit | `apps/mobile/scripts/audit-stitch-native-implementation.mjs` |
| Native unimplemented root reasons | `DESIGN_SYSTEM_NOT_USED=112`; `ROUTE_DOES_NOT_IMPORT_COMPONENT_AND_DESIGN_SYSTEM_NOT_USED=101` |
| Design token status | PARTIAL_FOUNDATION_READY; `salaryHijackingDesignSystem` now freezes the canonical palette, typography, spacing, radius, bottom navigation, header, and component contract, and shared component/theme tokens derive from that SSOT |
| Canonical primary color | `#209252` |
| Canonical font | `Freesentation` native family with Pretendard/Noto/system fallback |
| Canonical navigation | one five-tab bottom navigation: `급여`, `계획`, `LV`, `커뮤니티`, `MY` |
| Canonical spacing scale | `0,4,8,12,16,20,24,32,40` |
| Canonical radius scale | `8,12,16,22,999` |
| Golden AUTH source status | login/signup/auth frame input stack now derives color, radius, typography, placeholder, and surface values from the canonical design system |
| Golden FINANCE source status | salary home no longer owns local brand/text/warning/danger color constants; salary screen colors now derive from `salaryHijackingDesignSystem` while preserving server-authoritative financial behavior |
| Golden FORM source status | plan screen no longer owns local brand/text/muted/line/error color constants; plan screen colors now derive from `salaryHijackingDesignSystem` while preserving server-authoritative plan and budget behavior |
| Golden GROWTH source status | LV UP hero and action grid now derive color, typography, spacing, and radius directly from `salaryHijackingDesignSystem` while preserving server-authoritative growth dashboard behavior |
| Golden SOCIAL source status | community popular-post cards now derive color, typography, spacing, and radius directly from `salaryHijackingDesignSystem` while preserving server-backed feed/detail navigation behavior |
| Global navigation source status | Expo Router tab shell and shared BottomTabBar now derive active/inactive/background/border/touch-target labels from the canonical design system |
| Shared state source status | Common state screen error treatment now derives from semantic design tokens |
| Raw style guard | `apps/mobile/scripts/audit-design-system-usage.mjs` added; current baseline remains `BASELINE_VIOLATIONS_PRESENT` |
| Raw color violations | 316 |
| Raw typography violations | 363 |
| Raw spacing violations | 330 |
| Bottom nav variants found | 6 source references |
| Bottom nav variants in production | 1 canonical five-tab production navigation |
| Header variants found | 14 source references |
| Header variants in production | 14 files still reference headers; canonical AppHeader consolidation remains partial |
| Legacy UI count | 5 production-source term hits |
| Placeholder UI count | 3 production-source term hits excluding TextInput placeholder props |
| Prototype UI count | 0 production-source term hits |
| WebView UI count | 0 production-source term hits |
| Capture-only count | 134 capture/reference-tooling term hits, separated from production UI counts |
| UI remediation requires new application RC | true |

## Completion Truth

The FCM native-token architecture remediation has targeted source tests and typechecks, and migration 0026 is now applied and verified on Neon staging with 26 migration files and 26 ledger rows. The Stitch 304 source registry resolves every canonical classified state to a native React Native capture/state renderer, and the production route registry maps all 304 states to non-capture Expo Router routes with existing native source files. That registry count is not the native implementation count. The current strict native implementation audit counts 91 implemented states and 213 native-unimplemented states. The implementation batch moved the shared component/theme layer, auth input stack, salary home color authority, plan screen color authority, LV UP hero/action components, community popular-post cards, tab shell, BottomTabBar, AppHeader, and common state shell onto a single canonical Salary Hijacking design system. Runtime visual evidence remains 30 verified states and 274 pending states. D-013 remains FAIL until the 304 states are validated from a new same-RC APK with visual, accessibility, keyboard, safe-area, and interaction evidence. A new application RC must not be declared complete until FCM source remediation is redeployed to staging and all Stitch 304 production evidence is revalidated from one source commit.

## Next Required Track

Continue the Phase 10 remediation plan at `docs/mobile/PHASE_10_STITCH_REMEDIATION_PLAN.md`:

1. Freeze canonical Stitch source and 304 state registry.
2. Consolidate RN design tokens.
3. Migrate production Expo Router routes and state variants to native RN components.
4. Capture APK-backed visual, accessibility, keyboard, and safe-area evidence for all 304 states.
5. Recompute the new application RC source SHA only after source remediation is complete.
