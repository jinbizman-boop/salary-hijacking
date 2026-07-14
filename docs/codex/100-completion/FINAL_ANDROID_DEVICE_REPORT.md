# Final Android Device Report

This is an in-progress Android report.

## Current Status

- Local Java: PASS via `C:/Users/PC/Desktop/salary-hijacking-platform/.tools/jdk-17`.
- Local Android SDK: PASS via `C:/Users/PC/Desktop/salary-hijacking-platform/.tools/android-sdk`.
- adb: PASS when the local SDK platform-tools path is injected; `adb devices -l` sees `emulator-5554` / Android 15 x86_64.
- Emulator: PASS for Android 15 x86_64 availability and prior ABI-filter smoke evidence.
- EAS remote preview build: BLOCKED unless Expo authentication is available; no token or secret value is requested.
- Latest-source ARM64 phone APK: PASS, produced and preserved as `D:/salary-hijacking-artifacts/20260713/iteration-007-latest-source/salary-hijacking-phone-arm64-latest-source-debug.apk`.
- Latest-source ARM64 APK SHA256: `4B23C8C5560BA3BBF1748FFAC72740B171F2149B1464E88B4DC53F851811F97F`.
- Latest-source ARM64 APK download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260713-iteration007/salary-hijacking-phone-arm64-latest-source-debug.apk`.
- Latest-source x86_64 emulator rebuild: BLOCKED by local Windows Gradle build timeout after a transform-cache corruption failure; see `18_ITERATION_008_STATUS.md`.
- Physical device cold start/logcat: BLOCKED because no physical Android phone is attached to this Codex Windows environment.

## Exact Unblocked Commands After Environment Is Available

```powershell
$env:JAVA_HOME='C:\Users\PC\Desktop\salary-hijacking-platform\.tools\jdk-17'
$env:ANDROID_HOME='C:\Users\PC\Desktop\salary-hijacking-platform\.tools\android-sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
adb devices
adb install -r D:\salary-hijacking-artifacts\20260713\iteration-007-latest-source\salary-hijacking-phone-arm64-latest-source-debug.apk
adb logcat -c
adb shell monkey -p com.salaryhijacking.mobile 1
adb logcat -d -v time AndroidRuntime:E ReactNativeJS:V ReactNative:V Expo:V System.err:W '*:S' > docs/qa/100-completion/android-current-head-logcat.txt
```

Remote preview build path after Expo auth is restored:

```powershell
corepack pnpm dlx eas-cli@20.4.0 whoami
corepack pnpm --filter @salary-hijacking/mobile run build:preview:android
```
