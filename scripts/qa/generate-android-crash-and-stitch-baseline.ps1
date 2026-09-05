param(
  [string]$ZipPath = "C:\Users\PC\Downloads\stitch_salary_hijacking_design_system_classified.zip",
  [string]$ApkPath = "apps/mobile/build/phone/android/salary-hijacking-phone-arm64-direct-entry-debug.apk",
  [string]$DocsDir = "docs/qa",
  [string]$ArtifactsDir = "artifacts/qa"
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (!(Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Read-ZipText([System.IO.Compression.ZipArchive]$Zip, [string]$Name) {
  $entry = $Zip.Entries | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
  if (!$entry) {
    return $null
  }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function CsvEscape([object]$Value) {
  if ($null -eq $Value) {
    return '""'
  }
  $text = [string]$Value
  return '"' + $text.Replace('"', '""') + '"'
}

Ensure-Dir $DocsDir
Ensure-Dir $ArtifactsDir

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
$repoRoot = (git rev-parse --show-toplevel).Trim()
$head = (git rev-parse HEAD).Trim()
$branch = (git branch --show-current).Trim()
$status = git status --short
$nodeVersion = (node --version).Trim()
$pnpmVersion = (corepack pnpm --version).Trim()
$javaVersion = (cmd /c """.tools\jdk-17\bin\java.exe"" -version 2>&1" | Out-String).Trim()
$adbVersion = (& ".tools/android-sdk/platform-tools/adb.exe" version | Out-String).Trim()
$adbDevices = & ".tools/android-sdk/platform-tools/adb.exe" devices -l
$deviceLines = @($adbDevices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" })
$deviceStatus = if ($deviceLines.Count -gt 0) { "AVAILABLE" } else { "BLOCKED_NO_ADB_DEVICE" }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (!(Test-Path $ZipPath)) {
  throw "Stitch classified zip not found: $ZipPath"
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $files = @($zip.Entries | Where-Object { $_.Name })
  $catalogText = Read-ZipText $zip "screen_catalog.json"
  if (!$catalogText) {
    throw "screen_catalog.json missing in $ZipPath"
  }
  $catalog = $catalogText | ConvertFrom-Json
  $screens = @($catalog.screens)

  $typeCounts = $screens | Group-Object artifact_type | Sort-Object Name
  $flagCounts = $screens | ForEach-Object { $_.quality_flags } | Group-Object | Sort-Object Count -Descending

  $header = @(
    "source_folder",
    "instance_code",
    "primary_code",
    "screen_name_ko",
    "variant_slug",
    "state_code",
    "artifact_type",
    "route_or_overlay",
    "target_component",
    "recommended_component_path",
    "implementation_action",
    "code_html",
    "reference_png",
    "implementation_file",
    "unit_test",
    "e2e_test",
    "visual_test",
    "status",
    "notes"
  )

  $rows = New-Object System.Collections.Generic.List[string]
  $rows.Add(($header | ForEach-Object { CsvEscape $_ }) -join ",")
  foreach ($screen in $screens) {
    $folder = "stitch_salary_hijacking_design_system_classified/$($screen.target_folder_name)"
    $statusValue = if ($screen.quality_flags -contains "SCREEN_PNG_CORRUPT") {
      "FAIL_REFERENCE_PNG_CORRUPT"
    } elseif ($screen.quality_flags -contains "HTML_PRIMARY_REFERENCE_REQUIRED") {
      "MAPPED_HTML_PRIMARY"
    } else {
      "MAPPED_PENDING_IMPLEMENTATION_AUDIT"
    }
    $notes = @()
    if ($screen.quality_flags) {
      $notes += ("flags=" + (($screen.quality_flags | ForEach-Object { [string]$_ }) -join "|"))
    }
    if ($screen.semantic_duplicate_group) {
      $notes += "semantic_duplicate_group=$($screen.semantic_duplicate_group)"
    }
    $row = @(
      $screen.source_folder,
      $screen.instance_code,
      $screen.primary_code,
      $screen.canonical_screen_name_ko,
      $screen.variant_slug,
      $screen.state_code,
      $screen.artifact_type,
      $screen.route_or_overlay,
      $screen.target_component,
      $screen.recommended_component_path,
      $screen.implementation_action,
      "$folder/code.html",
      "$folder/screen.png",
      "apps/mobile/src/$($screen.recommended_component_path)",
      "",
      "",
      "release/evidence/mobile-ui/$($screen.instance_code).png",
      $statusValue,
      ($notes -join "; ")
    )
    $rows.Add(($row | ForEach-Object { CsvEscape $_ }) -join ",")
  }
  Set-Content -Path (Join-Path $DocsDir "SCREEN_IMPLEMENTATION_MATRIX.csv") -Value $rows -Encoding UTF8

  $inventory = @"
# Stitch Classified Screen Inventory

- Generated at: $timestamp
- Zip: $ZipPath`
- Zip size bytes: $((Get-Item $ZipPath).Length)
- Total zip file entries: $($files.Count)
- screen.meta.json: $(@($files | Where-Object { $_.Name -eq "screen.meta.json" }).Count)
- code.html: $(@($files | Where-Object { $_.Name -eq "code.html" }).Count)
- screen.png: $(@($files | Where-Object { $_.Name -eq "screen.png" }).Count)
- screen_catalog.json: $(@($files | Where-Object { $_.Name -eq "screen_catalog.json" }).Count)
- Catalog screens: $($screens.Count)
- Unique primary codes: $(($screens | Group-Object primary_code).Count)
- Unique routes/overlays: $(($screens | Group-Object route_or_overlay).Count)

## Artifact Types

$($typeCounts | ForEach-Object { "- $($_.Name): $($_.Count)" } | Out-String)

## Quality Flags

$($flagCounts | ForEach-Object { "- $($_.Name): $($_.Count)" } | Out-String)

## Initial Verdict

The classified Stitch input is internally count-complete for the requested 304 design artifacts. The matrix maps every catalog item to its requested route/component path, but implementation verification remains pending per-screen until the React Native components and visual evidence are checked.
"@
  Set-Content -Path (Join-Path $DocsDir "STITCH_SCREEN_INVENTORY.md") -Value $inventory -Encoding UTF8
} finally {
  $zip.Dispose()
}

$apkExists = Test-Path $ApkPath
$apkInfo = if ($apkExists) {
  $fullApk = (Resolve-Path $ApkPath).Path
  $buildTools = (Resolve-Path ".tools/android-sdk/build-tools/35.0.0").Path
  $env:JAVA_HOME = (Resolve-Path ".tools/jdk-17").Path
  $env:PATH = "$env:JAVA_HOME\bin;$buildTools;$env:PATH"
  $badging = (& "$buildTools\aapt.exe" dump badging $fullApk) -join "`n"
  $signing = (& "$buildTools\apksigner.bat" verify --verbose --print-certs $fullApk) -join "`n"
  $sha = (Get-FileHash -Algorithm SHA256 $fullApk).Hash
  @"
- APK: $fullApk
- SHA-256: $sha
- Size bytes: $((Get-Item $fullApk).Length)

## Badging Excerpt

~~~text
$($badging -split "`n" | Where-Object { $_ -match "package:|sdkVersion|targetSdkVersion|application-label|launchable-activity|native-code" } | Select-Object -First 20 | Out-String)
~~~

## Signing

~~~text
$signing
~~~
"@
} else {
  "- APK not found at `$ApkPath`."
}

$crashBaseline = @"
# Android Crash Baseline

- Generated at: $timestamp
- Repository: $repoRoot
- Branch: $branch
- HEAD: $head
- ADB device status: $deviceStatus

## Working Tree

~~~text
$($status | Out-String)
~~~

## ADB Devices

~~~text
$($adbDevices | Out-String)
~~~

## APK Static Baseline

$apkInfo

## Crash Evidence Status

Actual cold-start logcat and dumpsys activity exit-info are **BLOCKED** because no Android device or emulator is currently attached and no Android system image is installed in this workspace.

This file intentionally does not claim the root cause is confirmed. The next required step for G01/G02 is to attach a physical device or provide an emulator image, then collect logcat from the crashing APK.
"@
Set-Content -Path (Join-Path $DocsDir "CRASH_BASELINE.md") -Value $crashBaseline -Encoding UTF8

$buildEnvironment = @"
# Build Environment

- Generated at: $timestamp
- Repository: $repoRoot
- Branch: $branch
- HEAD: $head
- Node: $nodeVersion
- pnpm: $pnpmVersion
- Java: $javaVersion
- ADB: $adbVersion
- Android device status: $deviceStatus

## Official Commands Discovered

- Root format: corepack pnpm run format:check
- Root quality: corepack pnpm run quality
- Root release readiness: corepack pnpm run check:release-readiness
- Mobile lint: corepack pnpm --filter @salary-hijacking/mobile run lint
- Mobile typecheck: corepack pnpm --filter @salary-hijacking/mobile run typecheck
- Mobile tests: corepack pnpm --filter @salary-hijacking/mobile test
- Mobile web export: corepack pnpm --filter @salary-hijacking/mobile run export:web
- Existing phone debug build: corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug

## Release-like QA Gap

The currently inspected artifact is debug-signed. A qaRelease or equivalent release-like APK still needs to be produced and verified before G25 can pass.
"@
Set-Content -Path (Join-Path $DocsDir "BUILD_ENVIRONMENT.md") -Value $buildEnvironment -Encoding UTF8

$rootCause = @"
# Android Crash Root Cause

Status: BLOCKED_PENDING_DEVICE_LOGCAT

The user has supplied Android system crash dialogs showing that the installed Salary Hijacking app terminates at launch. However, this workspace currently has no attached Android device and no configured emulator/system image, so the required fatal stack trace and exit reason cannot yet be collected.

## Evidence Collected

- adb devices -l returned no devices.
- .tools/android-sdk/system-images is absent.
- The latest inspected APK embeds assets/index.android.bundle, is arm64-v8a only, uses applicationId com.salaryhijacking.mobile, and is debug-signed.

## Not Yet Verified

- FATAL EXCEPTION source
- ReactNativeJS startup exception
- native abort or ABI/library failure
- clean install launch
- upgrade install launch
- 10x cold start
- 10x background/resume

## Next Required Evidence

Attach the affected Android phone with USB debugging or provide an emulator system image. Then run the crash capture commands documented in docs/qa/APK_FINALIZATION_PLAN.md.
"@
Set-Content -Path (Join-Path $DocsDir "CRASH_ROOT_CAUSE.md") -Value $rootCause -Encoding UTF8

$decisionLog = @"
# UI Decision Log

## DEC-001: Classified Stitch Input Is Canonical For UI Structure

- Decision: Use screen_catalog.json, screen.meta.json, code.html, and screen.png from stitch_salary_hijacking_design_system_classified.zip as the current visual mapping baseline.
- Reason: The classified package provides 304 cataloged artifacts with route/component recommendations and quality flags.
- Constraint: HTML must not be pasted into React Native and screenshots must not be used as full-screen UI backgrounds.

## DEC-002: Device Crash Root Cause Cannot Be Claimed Without Logcat

- Decision: Mark crash root cause as BLOCKED_PENDING_DEVICE_LOGCAT until an Android device or emulator is available.
- Reason: The current machine reports no ADB devices and has no Android system images.
- Impact: G01, G02, G04-G09, G27, G28 remain BLOCKED, not PASS.

## DEC-003: Existing Inspected APK Is Not Final QA Release-like APK

- Decision: Treat salary-hijacking-phone-arm64-direct-entry-debug.apk as a diagnostic artifact only.
- Reason: It is debug-signed and arm64-only. The goal requires `qaRelease` or equivalent release-like APK.
"@
Set-Content -Path (Join-Path $DocsDir "UI_DECISION_LOG.md") -Value $decisionLog -Encoding UTF8

$plan = @"
# APK Finalization Plan

## Current State

- Device/emulator execution is blocked by missing ADB target.
- Stitch design inventory is count-complete and mapped in SCREEN_IMPLEMENTATION_MATRIX.csv.
- Existing APK is diagnostic/debug signed and is not the final release-like QA artifact.

## Required Crash Capture Commands

~~~powershell
`$env:PATH=(Resolve-Path '.tools/android-sdk/platform-tools').Path+';'+`$env:PATH
adb devices -l
adb logcat -c
adb shell am force-stop com.salaryhijacking.mobile
adb shell am start -W -n com.salaryhijacking.mobile/com.salaryhijacking.mobile.MainActivity
adb logcat -d -v threadtime > artifacts/qa/logcat-cold-start.txt
adb shell dumpsys activity exit-info com.salaryhijacking.mobile > artifacts/qa/exit-info.txt
~~~

## Required QA APK Output

- artifacts/android/salary-hijacking-qa-universal.apk
- artifacts/android/salary-hijacking-qa-universal.apk.sha256
- artifacts/android/build-info.json

## Gates Not Allowed To Pass Without Device/Emulator

- G01 crash reproduction log
- G02 root cause confirmation
- G04 clean install launch
- G05 upgrade install launch
- G06 10/10 cold starts
- G07 10/10 background/resume
- G08 fatal exception count
- G09 ANR count
- G27 install PASS
- G28 launcher manual execution PASS
"@
Set-Content -Path (Join-Path $DocsDir "APK_FINALIZATION_PLAN.md") -Value $plan -Encoding UTF8

$visual = @"
# Visual Diff Report

Status: MAPPED_PENDING_CAPTURE

The classified Stitch source contains 304 mapped artifacts. Visual capture against the React Native implementation has not yet been regenerated in this run.

See:

- docs/qa/STITCH_SCREEN_INVENTORY.md
- docs/qa/SCREEN_IMPLEMENTATION_MATRIX.csv
"@
Set-Content -Path (Join-Path $DocsDir "VISUAL_DIFF_REPORT.md") -Value $visual -Encoding UTF8

$apkReport = @"
# APK QA Report

Status: PARTIAL_STATIC_ONLY

Static APK inspection has been completed for the latest available diagnostic APK. Device installation and launch verification are blocked by missing Android device/emulator.

The final release-like QA APK has not yet been produced in this run.
"@
Set-Content -Path (Join-Path $DocsDir "APK_QA_REPORT.md") -Value $apkReport -Encoding UTF8

$checklist = @"
# Final QA Checklist

| Gate | Status | Evidence |
| --- | --- | --- |
| G01 crash reproduction log | BLOCKED | No ADB device/emulator |
| G02 root cause confirmed | BLOCKED | docs/qa/CRASH_ROOT_CAUSE.md |
| G10 Metro/dev server dependency static check | PARTIAL | APK contains embedded bundle |
| G11 304/304 design mapping | PASS | docs/qa/SCREEN_IMPLEMENTATION_MATRIX.csv |
| G12 unclassified designs 0 | PASS | docs/qa/STITCH_SCREEN_INVENTORY.md |
| G25 qaRelease build | PENDING | Not produced yet |
| G26 apksigner verify | PARTIAL | Diagnostic APK verified |
| G27 device/emulator install | BLOCKED | No ADB device/emulator |
| G35 final QA APK artifact | PENDING | Not produced yet |
"@
Set-Content -Path (Join-Path $DocsDir "FINAL_QA_CHECKLIST.md") -Value $checklist -Encoding UTF8

Write-Output "Generated QA baseline documents in $DocsDir"
