# Android QA Build Report

LINUX_BUILD_WORKFLOW=Build Android QA Release
LINUX_BUILD_RUN_ID=33164569125
LINUX_BUILD_JOB_ID=98826790795
LINUX_BUILD_STATUS=PASS

Validate staging QA secrets are present=PASS
Materialize QA signing and Firebase config=PASS
Install JS dependencies=PASS
Validate canonical staging API URL=PASS
qaRelease build preflight=PASS
Build full Expo Router qaRelease APK=PASS
Verify qaRelease APK contract=PASS
Upload QA APK and no-secret metadata=PASS

ROOT_CAUSE_33070999722=Metro reported `expo-localization` unresolved, but clean current-source preflight proved package, runtime entry, and Metro resolution from `apps/mobile` all PASS. The stale missing-secret diagnosis was incorrect. Follow-on first failing operations were deterministic Android qaRelease build-input defects: Expo prebuild regenerated Android without preserving the `qaRelease` task/signing, and the Gradle/Metro bundle inherited `NODE_ENV=test`, preventing Expo Router's production Babel transform from replacing `process.env.EXPO_ROUTER_APP_ROOT`.
FIX=Restore qaRelease Gradle config after Expo prebuild, force `NODE_ENV=production` and `BABEL_ENV=production` for Android qaRelease Gradle bundle generation, add deterministic preflight checks for `expo-localization` app resolution, Metro Android resolution, Expo export, and the qaRelease helper, and remove app-code local API bridge host literals from the production bundle.

ANDROID_QA_REQUIRED_SECRET_NAMES=SALARY_HIJACKING_QA_KEYSTORE_BASE64;SALARY_HIJACKING_QA_KEYSTORE_PASSWORD;SALARY_HIJACKING_QA_KEY_ALIAS;SALARY_HIJACKING_QA_KEY_PASSWORD;GOOGLE_SERVICES_JSON_BASE64
ANDROID_QA_SECRET_PRESENCE=PRESENT_VERIFIED_WITHOUT_VALUES

EXPO_AUTH_REQUIRED=false
EXPO_AUTH_AVAILABLE=NOT_REQUIRED_FOR_CANONICAL_CI_BUILD

NODE_VERSION=22
PNPM_VERSION=10.24.0
JDK_VERSION=Temurin 17.0.20-1 x64
ANDROID_SDK=/usr/local/lib/android/sdk
ANDROID_BUILD_TOOLS=35.0.0
NDK_VERSION=27.1.12297006
GRADLE_VERSION=8.13

X86_64_QARELEASE=PASS
APK_GENERATED=true
APK_ARTIFACT_ID=9683220578
APK_ARTIFACT_DIGEST=sha256:d66beb07aa69aa09b86d3862d19f9946fbd7699409edd12ce67c605cc4a80d67

No production deploy, Play upload, Phase 10 Stitch acceptance, Phase 11 hardening, ARM64 release build, or Phase 13 physical runtime work was started.
