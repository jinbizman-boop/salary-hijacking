# Same-RC Lineage Report

TASK_STATUS=PASS
TASK_INTERNAL_STATUS=PASS
TASK_EXTERNAL_STATUS=NONE

CURRENT_REPOSITORY_HEAD_BEFORE=646732c70e0a667e064b8b54e939e8d25f63dc76
CURRENT_REPOSITORY_HEAD_AFTER=08005cff94e4f0661d2ae809d7d508379ab3092a
CURRENT_REPOSITORY_HEAD_AFTER_BUILD_FIX=08005cff94e4f0661d2ae809d7d508379ab3092a

APPLICATION_RC_SOURCE_SHA_BEFORE=80cc5cdfb0758478791b19196e2812e7fa6d671f
APPLICATION_RC_SOURCE_SHA_AFTER=08005cff94e4f0661d2ae809d7d508379ab3092a
RC_SOURCE_FINGERPRINT_AFTER=90045513FD9C672C30116747A7E5A8D7E582BE47BF5DB17026B4FD69EA490D49
RC_SOURCE_COMMIT=08005cff94e4f0661d2ae809d7d508379ab3092a

OLD_RC_SOURCE_SHA=80cc5cdfb0758478791b19196e2812e7fa6d671f
OLD_RC_CURRENT=false
PREVIOUS_APK_CURRENT=false

WORKFLOW=Build Android QA Release
WORKFLOW_RUN_ID=33164569125
WORKFLOW_JOB_ID=98826790795
ARTIFACT_ID=9683220578
ARTIFACT_NAME=android-qa-release-x86_64-08005cff94e4f0661d2ae809d7d508379ab3092a
ARTIFACT_DIGEST=sha256:d66beb07aa69aa09b86d3862d19f9946fbd7699409edd12ce67c605cc4a80d67

The previous `FAIL_MISSING_SECRET` classification is stale. The current successful run verified staging QA secret presence, materialized signing and Firebase config, built the full Expo Router `qaRelease` APK, verified the APK contract, and uploaded the no-secret artifact.

The original Run ID `33070999722` failed in the `Build full Expo Router qaRelease APK` step after Metro reported that `expo-localization` could not be resolved from `apps/mobile/src/i18n/index.ts`. Clean current-source preflight showed `expo-localization` is declared, locked, physically resolved from `apps/mobile`, and resolvable by Metro. The actual release-blocking build defects fixed in this closure were the regenerated Expo prebuild Gradle config dropping the `qaRelease` task, the qaRelease Metro bundle inheriting `NODE_ENV=test`, and app-code local API bridge host literals being embedded into the bundle. The final CI run verifies these fixes without rotating or changing staging QA secrets.
