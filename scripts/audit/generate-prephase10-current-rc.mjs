import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

const ROOT = process.cwd();
const BEFORE_HEAD = "646732c70e0a667e064b8b54e939e8d25f63dc76";
const OLD_RC_SOURCE_SHA = "80cc5cdfb0758478791b19196e2812e7fa6d671f";
const WORKFLOW_RUN_ID = "33070999722";
const WORKFLOW_JOB_ID = "98512910644";
const WORKFLOW_NAME = "Build Android QA Release";
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
    sourceCommit: head,
    applicationRcSourceSha: head,
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
      conclusion: "failure",
      firstFailingStep: "Validate staging QA secrets are present",
      failureClassification: "MISSING_SECRET",
    },
    buildType: "qaRelease",
    abi: "x86_64",
    apiEnvironment: "staging",
    apiBaseUrlClassification: "CANONICAL_STAGING_URL_CONFIGURED_IN_WORKFLOW",
    apkGenerated: false,
    apkSha256: null,
    bundleSha256: null,
    signerFingerprint: null,
    applicationId: "com.salaryhijacking.mobile",
    versionName: "1.0.0",
    versionCode: 1,
    requiredSecretNames: REQUIRED_SECRET_NAMES,
    secretPresence: "MISSING_ALL_REQUIRED_STAGING_QA_SECRETS_AT_WORKFLOW_GATE",
    expoAuthRequired: false,
    expoAuthAvailable: "NOT_REQUIRED_BEFORE_SECRET_GATE",
    toolchain: {
      nodeVersion: "22",
      pnpmVersion: "10.24.0",
      jdkVersion: "Temurin 17.0.20-1 x64",
      androidSdk: "/usr/local/lib/android/sdk",
      androidBuildTools: "35.0.0",
      ndkVersion: "27.1.12297006",
      gradleVersion: "8.10.2",
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
    sourceCommit: head,
    applicationRcSourceShaBefore: OLD_RC_SOURCE_SHA,
    applicationRcSourceShaAfter: head,
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

TASK_STATUS=EXTERNAL_BLOCKER
TASK_INTERNAL_STATUS=PASS_SOURCE_LINEAGE_FIXED
TASK_EXTERNAL_STATUS=BLOCKED_MISSING_STAGING_QA_SECRETS

CURRENT_REPOSITORY_HEAD_BEFORE=${BEFORE_HEAD}
CURRENT_REPOSITORY_HEAD_AFTER=${head}

APPLICATION_RC_SOURCE_SHA_BEFORE=${OLD_RC_SOURCE_SHA}
APPLICATION_RC_SOURCE_SHA_AFTER=${head}
RC_SOURCE_FINGERPRINT_AFTER=${fingerprint.sha256}
RC_SOURCE_COMMIT=${head}

OLD_RC_SOURCE_SHA=${OLD_RC_SOURCE_SHA}
OLD_RC_CURRENT=false
PREVIOUS_APK_CURRENT=false

The Android QA workflow now checks out the exact GitHub Actions commit SHA and uses it as RC_SOURCE_SHA. The same workflow verified checkout/source lineage and computed the committed mobile source fingerprint before failing at the staging QA secret-presence gate.
`,
  );
  writeRel(
    "docs/release/current-rc/ANDROID_QA_BUILD_REPORT.md",
    `# Android QA Build Report

LINUX_BUILD_WORKFLOW=${WORKFLOW_NAME}
LINUX_BUILD_RUN_ID=${WORKFLOW_RUN_ID}
LINUX_BUILD_JOB_ID=${WORKFLOW_JOB_ID}
LINUX_BUILD_STATUS=FAIL_MISSING_SECRET

FIRST_FAILING_STEP=Validate staging QA secrets are present
FAILURE_CLASSIFICATION=MISSING_SECRET

ANDROID_QA_REQUIRED_SECRET_NAMES=${REQUIRED_SECRET_NAMES.join(";")}
ANDROID_QA_SECRET_PRESENCE=MISSING_ALL_REQUIRED_STAGING_QA_SECRETS

EXPO_AUTH_REQUIRED=false
EXPO_AUTH_AVAILABLE=NOT_REQUIRED_BEFORE_SECRET_GATE

NODE_VERSION=22
PNPM_VERSION=10.24.0
JDK_VERSION=Temurin 17.0.20-1 x64
ANDROID_SDK=/usr/local/lib/android/sdk
ANDROID_BUILD_TOOLS=35.0.0
NDK_VERSION=27.1.12297006
GRADLE_VERSION=8.10.2

X86_64_QARELEASE=BLOCKED_MISSING_SECRET
APK_GENERATED=false

No APK was produced. No production deploy, Play upload, Phase 10 Stitch acceptance, Phase 11 hardening, Phase 12 release closure, or Phase 13 physical runtime work was started.
`,
  );
  writeRel(
    "docs/release/current-rc/APK_STATIC_SECURITY_REPORT.md",
    `# APK Static Security Report

APK_STATIC_VERIFICATION=NOT_RUN_NO_APK
APK_GENERATED=false
APK_SHA256=
BUNDLE_SHA256=
BUNDLE_SOURCE_MATCH=NOT_RUN_NO_APK

APK_ABI=x86_64_TARGETED_NOT_BUILT
APK_APPLICATION_ID=com.salaryhijacking.mobile
APK_VERSION=1.0.0
APK_SIGNER=NOT_AVAILABLE_NO_APK
QA_SIGNER_VALID=NOT_RUN_NO_APK
OLD_EXPOSED_SIGNER_USED=0

APK_DEBUGGABLE=NOT_RUN_NO_APK
APK_CLEARTEXT=NOT_RUN_NO_APK
APK_ALLOW_BACKUP=NOT_RUN_NO_APK
APK_DANGEROUS_PERMISSIONS=NOT_RUN_NO_APK

APK_API_ENV=staging
APK_API_URL_VALIDATION=WORKFLOW_CONFIG_CANONICAL_STAGING_URL_VERIFIED_PRE_BUILD_ONLY
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
