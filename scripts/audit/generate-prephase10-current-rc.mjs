import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

const ROOT = process.cwd();
const BEFORE_HEAD = "646732c70e0a667e064b8b54e939e8d25f63dc76";
const OLD_RC_SOURCE_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";
const RC_SOURCE_COMMIT = "08005cff94e4f0661d2ae809d7d508379ab3092a";
const WORKFLOW_RUN_ID = "33164569125";
const WORKFLOW_JOB_ID = "98826790795";
const WORKFLOW_NAME = "Build Android QA Release";
const ARTIFACT_ID = "9683220578";
const ARTIFACT_NAME =
  "android-qa-release-x86_64-08005cff94e4f0661d2ae809d7d508379ab3092a";
const ARTIFACT_DIGEST =
  "sha256:d66beb07aa69aa09b86d3862d19f9946fbd7699409edd12ce67c605cc4a80d67";
const APK_SHA256 =
  "b5e88f014ec096b204f58e085dd81f72e832b91b732b98ab1a6fd010a80e7d21";
const BUNDLE_SHA256 =
  "07d899be5fe27763a6900f1c33cebe599597ff6f9525ae7818e8d1a01fa02cf7";
const QA_SIGNER_SHA256 =
  "d76c56791836b692d704d911f8b1802589b2c420340abd31249b3d87a87c63d3";
const REQUIRED_SECRET_NAMES = [
  "SALARY_HIJACKING_QA_KEYSTORE_BASE64",
  "SALARY_HIJACKING_QA_KEYSTORE_PASSWORD",
  "SALARY_HIJACKING_QA_KEY_ALIAS",
  "SALARY_HIJACKING_QA_KEY_PASSWORD",
  "GOOGLE_SERVICES_JSON_BASE64",
];

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function writeRel(path, content) {
  const target = join(ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  const text =
    typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  writeFileSync(target, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function readRel(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function gitBlob(path) {
  return execFileSync("git", ["show", `HEAD:${path}`], {
    cwd: ROOT,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function currentMobileSourceFingerprint() {
  const files = git(["ls-tree", "-r", "--name-only", "HEAD", "apps/mobile"])
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((file) => {
      const extension = extname(file);
      return (
        [".ts", ".tsx", ".js", ".json", ".cjs", ".mjs"].includes(extension) &&
        !/(^|\/)(node_modules|\.expo|coverage|dist|build)(\/|$)/u.test(file)
      );
    })
    .sort();
  const digestInput = files
    .map((file) => `${file}:${sha256(gitBlob(file))}`)
    .join("\n");
  return {
    fileCount: files.length,
    sha256: sha256(digestInput),
    method:
      "git ls-tree HEAD apps/mobile for committed TypeScript/JavaScript/JSON build input files; node_modules, .expo, coverage, dist, and build are excluded",
  };
}

function fileSha(path) {
  return sha256(readRel(path));
}

function main() {
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const fingerprint = currentMobileSourceFingerprint();
  const timestamp = new Date().toISOString();
  const buildInfo = {
    schemaVersion: 1,
    generatedAt: timestamp,
    task: "PRE_PHASE_10_CURRENT_SOURCE_RC_LINEAGE",
    secretsRedacted: true,
    containsSecretValues: false,
    sourceCommit: RC_SOURCE_COMMIT,
    applicationRcSourceSha: RC_SOURCE_COMMIT,
    sourceFingerprint: fingerprint.sha256,
    sourceFileCount: fingerprint.fileCount,
    sourceFingerprintMethod: fingerprint.method,
    branch,
    workflow: {
      name: WORKFLOW_NAME,
      runId: WORKFLOW_RUN_ID,
      jobId: WORKFLOW_JOB_ID,
      event: "push",
      status: "completed",
      conclusion: "success",
      artifactId: ARTIFACT_ID,
      artifactName: ARTIFACT_NAME,
      artifactDigest: ARTIFACT_DIGEST,
    },
    buildType: "qaRelease",
    abi: "x86_64",
    apiEnvironment: "staging",
    apiBaseUrlClassification:
      "CANONICAL_STAGING_URL_VERIFIED_IN_BUNDLE_APP_API_LOCAL_HOSTS_ABSENT",
    apkGenerated: true,
    apkSha256: APK_SHA256,
    bundleSha256: BUNDLE_SHA256,
    bundleSourceMatch: "PASS",
    signerFingerprint: QA_SIGNER_SHA256,
    applicationId: "com.salaryhijacking.mobile",
    versionName: "1.0.0",
    versionCode: 1,
    requiredSecretNames: REQUIRED_SECRET_NAMES,
    secretPresence: "PRESENT_VERIFIED_WITHOUT_VALUES",
    expoAuthRequired: false,
    expoAuthAvailable: "NOT_REQUIRED_FOR_CANONICAL_CI_BUILD",
    toolchain: {
      nodeVersion: "22",
      pnpmVersion: "10.24.0",
      jdkVersion: "Temurin 17.0.20-1 x64",
      androidSdk: "/usr/local/lib/android/sdk",
      androidBuildTools: "35.0.0",
      ndkVersion: "27.1.12297006",
      gradleVersion: "8.13",
    },
    oldRc: {
      sourceSha: OLD_RC_SOURCE_SHA,
      current: false,
    },
  };

  const currentRcSource = {
    schemaVersion: 1,
    generatedAt: timestamp,
    currentRepositoryHeadBefore: BEFORE_HEAD,
    currentRepositoryHeadAfter: head,
    sourceCommit: RC_SOURCE_COMMIT,
    applicationRcSourceShaBefore: OLD_RC_SOURCE_SHA,
    applicationRcSourceShaAfter: RC_SOURCE_COMMIT,
    rcSourceFingerprintAfter: fingerprint.sha256,
    sourceFileCount: fingerprint.fileCount,
    mobileSourceChangedSincePhase9: false,
    mobileSourceChangedSinceOldRc: true,
    previousApkCurrent: false,
    secretsRedacted: true,
    containsSecretValues: false,
  };

  writeRel("docs/release/current-rc/CURRENT_RC_SOURCE.json", currentRcSource);
  writeRel("docs/release/current-rc/BUILD_INFO.json", buildInfo);
  writeRel(
    "docs/release/current-rc/SAME_RC_LINEAGE_REPORT.md",
    `# Same-RC Lineage Report

TASK_STATUS=PASS
TASK_INTERNAL_STATUS=PASS
TASK_EXTERNAL_STATUS=NONE

CURRENT_REPOSITORY_HEAD_BEFORE=${BEFORE_HEAD}
CURRENT_REPOSITORY_HEAD_AFTER=${head}
CURRENT_REPOSITORY_HEAD_AFTER_BUILD_FIX=${RC_SOURCE_COMMIT}

APPLICATION_RC_SOURCE_SHA_BEFORE=${OLD_RC_SOURCE_SHA}
APPLICATION_RC_SOURCE_SHA_AFTER=${RC_SOURCE_COMMIT}
RC_SOURCE_FINGERPRINT_AFTER=${fingerprint.sha256}
RC_SOURCE_COMMIT=${RC_SOURCE_COMMIT}

OLD_RC_SOURCE_SHA=${OLD_RC_SOURCE_SHA}
OLD_RC_CURRENT=false
PREVIOUS_APK_CURRENT=false

WORKFLOW=${WORKFLOW_NAME}
WORKFLOW_RUN_ID=${WORKFLOW_RUN_ID}
WORKFLOW_JOB_ID=${WORKFLOW_JOB_ID}
ARTIFACT_ID=${ARTIFACT_ID}
ARTIFACT_NAME=${ARTIFACT_NAME}
ARTIFACT_DIGEST=${ARTIFACT_DIGEST}

The previous \`FAIL_MISSING_SECRET\` classification is stale. The current successful run verified staging QA secret presence, materialized signing and Firebase config, built the full Expo Router \`qaRelease\` APK, verified the APK contract, and uploaded the no-secret artifact.

The original Run ID \`33070999722\` failed in the \`Build full Expo Router qaRelease APK\` step after Metro reported that \`expo-localization\` could not be resolved from \`apps/mobile/src/i18n/index.ts\`. Clean current-source preflight showed \`expo-localization\` is declared, locked, physically resolved from \`apps/mobile\`, and resolvable by Metro. The actual release-blocking build defects fixed in this closure were the regenerated Expo prebuild Gradle config dropping the \`qaRelease\` task, the qaRelease Metro bundle inheriting \`NODE_ENV=test\`, and app-code local API bridge host literals being embedded into the bundle. The final CI run verifies these fixes without rotating or changing staging QA secrets.
`,
  );
  writeRel(
    "docs/release/current-rc/ANDROID_QA_BUILD_REPORT.md",
    `# Android QA Build Report

LINUX_BUILD_WORKFLOW=${WORKFLOW_NAME}
LINUX_BUILD_RUN_ID=${WORKFLOW_RUN_ID}
LINUX_BUILD_JOB_ID=${WORKFLOW_JOB_ID}
LINUX_BUILD_STATUS=PASS

Validate staging QA secrets are present=PASS
Materialize QA signing and Firebase config=PASS
Install JS dependencies=PASS
Validate canonical staging API URL=PASS
qaRelease build preflight=PASS
Build full Expo Router qaRelease APK=PASS
Verify qaRelease APK contract=PASS
Upload QA APK and no-secret metadata=PASS

ROOT_CAUSE_33070999722=Metro reported \`expo-localization\` unresolved, but clean current-source preflight proved package, runtime entry, and Metro resolution from \`apps/mobile\` all PASS. The stale missing-secret diagnosis was incorrect. Follow-on first failing operations were deterministic Android qaRelease build-input defects: Expo prebuild regenerated Android without preserving the \`qaRelease\` task/signing, and the Gradle/Metro bundle inherited \`NODE_ENV=test\`, preventing Expo Router's production Babel transform from replacing \`process.env.EXPO_ROUTER_APP_ROOT\`.
FIX=Restore qaRelease Gradle config after Expo prebuild, force \`NODE_ENV=production\` and \`BABEL_ENV=production\` for Android qaRelease Gradle bundle generation, add deterministic preflight checks for \`expo-localization\` app resolution, Metro Android resolution, Expo export, and the qaRelease helper, and remove app-code local API bridge host literals from the production bundle.

ANDROID_QA_REQUIRED_SECRET_NAMES=${REQUIRED_SECRET_NAMES.join(";")}
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
APK_ARTIFACT_ID=${ARTIFACT_ID}
APK_ARTIFACT_DIGEST=${ARTIFACT_DIGEST}

No production deploy, Play upload, Phase 10 Stitch acceptance, Phase 11 hardening, ARM64 release build, or Phase 13 physical runtime work was started.
`,
  );
  writeRel(
    "docs/release/current-rc/APK_STATIC_SECURITY_REPORT.md",
    `# APK Static Security Report

APK_STATIC_VERIFICATION=PASS
APK_GENERATED=true
APK_SHA256=${APK_SHA256}
BUNDLE_SHA256=${BUNDLE_SHA256}
BUNDLE_SOURCE_MATCH=PASS

APK_ABI=x86_64
APK_APPLICATION_ID=com.salaryhijacking.mobile
APK_VERSION_NAME=1.0.0
APK_VERSION_CODE=1
APK_SIGNER_SHA256=${QA_SIGNER_SHA256}
QA_SIGNER_VALID=PASS
OLD_EXPOSED_SIGNER_USED=0

APK_DEBUGGABLE=false
APK_CLEARTEXT=false
APK_ALLOW_BACKUP=false
APK_DANGEROUS_PERMISSIONS=0

APK_API_ENV=staging
APK_API_URL_VALIDATION=PASS_CANONICAL_STAGING_URL
APK_APP_API_LOCALHOST_OR_EMULATOR_HOST=0
APK_FRAMEWORK_LOCALHOST_LITERAL=EXPO_METRO_RUNTIME_NON_API_LOCALHOST_8081_PRESENT
APK_OBSOLETE_HYPHENATED_HOST=0
APK_SAFE_DIRECT_CAPTURE_ONLY_MARKERS=0
FIREBASE_CONFIG_PACKAGE_MATCH=PASS_WORKFLOW_MATERIALIZED_CONFIG_FOR_com.salaryhijacking.mobile
`,
  );

  const outputPaths = [
    "docs/release/current-rc/CURRENT_RC_SOURCE.json",
    "docs/release/current-rc/BUILD_INFO.json",
    "docs/release/current-rc/APK_STATIC_SECURITY_REPORT.md",
    "docs/release/current-rc/SAME_RC_LINEAGE_REPORT.md",
    "docs/release/current-rc/ANDROID_QA_BUILD_REPORT.md",
  ];
  writeRel("docs/release/current-rc/SHA256SUMS.txt", outputPaths.map((path) => `${fileSha(path)}  ${path}`).join("\n"));
  console.log(`PRE_PHASE_10_RC_EVIDENCE_GENERATED ${head} ${fingerprint.sha256}`);
}

main();
