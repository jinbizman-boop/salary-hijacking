import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PREVIEW_EVIDENCE_PATH = "release/mobile-preview-evidence.json";
const DEFAULT_OUTPUT_PATH =
  "docs/qa/100-completion/physical-phone-qa-handoff.md";

const readJson = (targetPath) =>
  JSON.parse(fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, ""));

const formatKstDate = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);

const valueOrBlocked = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : "BLOCKED";

const markdownCode = (value) => `\`${String(value).replaceAll("`", "")}\``;

export const buildPhysicalPhoneQaHandoff = ({
  rootDir = process.cwd(),
  previewEvidencePath = DEFAULT_PREVIEW_EVIDENCE_PATH,
  now = () => new Date(),
} = {}) => {
  const evidencePath = path.isAbsolute(previewEvidencePath)
    ? previewEvidencePath
    : path.join(rootDir, previewEvidencePath);
  const evidence = readJson(evidencePath);
  const android = evidence.android ?? {};
  const appIdentity = evidence.appIdentity ?? {};
  const apkDownloadsPath = valueOrBlocked(
    android.phoneTargetDebugApkDownloadsPath,
  );
  const apkLocalPath = valueOrBlocked(android.phoneTargetDebugApkLocalPath);
  const apkSha256 = valueOrBlocked(android.phoneTargetDebugApkSha256);
  const androidPackage = valueOrBlocked(appIdentity.androidPackage);
  const abis = Array.isArray(android.phoneTargetDebugApkAbis)
    ? android.phoneTargetDebugApkAbis.join(", ")
    : "BLOCKED";
  const blocker = valueOrBlocked(
    android.physicalPhoneBlocker ??
      "Physical Android phone QA proof has not been collected.",
  );

  return `# Physical Android Phone QA Handoff

Updated: ${formatKstDate(now())} KST

## Current APK

- Downloads APK: ${markdownCode(apkDownloadsPath)}
- Artifact APK: ${markdownCode(apkLocalPath)}
- SHA256: ${markdownCode(apkSha256)}
- Android package: ${markdownCode(androidPackage)}
- ABI: ${markdownCode(abis)}

## Why This Is Still Blocked

- Current status: BLOCKED
- Blocker: ${blocker}
- This handoff does not replace physical phone QA. strict readiness remains BLOCKED until the local no-secret proof file is produced by an attached physical Android phone.

## Required Phone Setup

- Use a real ARM64 Android phone, not an emulator.
- Enable Developer options and USB debugging.
- Connect the phone to this Windows PC.
- Confirm Android shows the USB debugging authorization prompt and approve it.
- Keep the phone unlocked during the first run.

## Required Command

\`\`\`powershell
Set-Location '${rootDir.replaceAll("'", "''")}'
node scripts\\release\\collect-mobile-preview-phone-proof.mjs --apk "${apkDownloadsPath}" --runs 20 --output release/mobile-preview-phone-proof.local.json --package ${androidPackage}
\`\`\`

## What The Collector Must Prove

- Install succeeds on the attached physical phone.
- 20 cold-start runs complete with zero fatal markers.
- 20 background/foreground runs complete with zero fatal markers.
- Navigation smoke reaches the package launcher without fatal markers.
- Process kill plus relaunch persistence probe completes.
- keyboard/safe-area probes complete.
- raw logcat is summarized only; raw logcat lines, device serials, tokens, signing keys, and credentials are not stored.

## Expected Proof File

- Local proof: ${markdownCode("release/mobile-preview-phone-proof.local.json")}
- This file is intentionally local/ignored because it may contain machine paths and hashed device identifiers.
- The proof is acceptable only when it reports:
  - ${markdownCode("physicalPhoneVerified=true")}
  - ${markdownCode("installVerified=true")}
  - ${markdownCode("coldStartRuns>=20")}
  - ${markdownCode("backgroundForegroundRuns>=20")}
  - ${markdownCode("coldStartFatalCount=0")}
  - ${markdownCode("navigationSmokeVerified=true")}
  - ${markdownCode("backgroundForegroundVerified=true")}
  - ${markdownCode("persistenceVerified=true")}
  - ${markdownCode("keyboardSafeAreaVerified=true")}
  - ${markdownCode("logcatSummary.rawLogcatStored=false")}

## Follow-Up Validation

\`\`\`powershell
node scripts\\release\\check-release-readiness.mjs --strict
corepack pnpm run clean:junk
corepack pnpm run disk:report -- --top 20
\`\`\`

## Notes

- Do not paste raw logcat, serial numbers, tokens, credentials, keystore data, or store credentials into tracked files.
- If the phone run fails, keep the generated local proof untracked and fix the reported fatal marker or install blocker before rerunning.
`;
};

export const writePhysicalPhoneQaHandoff = ({
  rootDir = process.cwd(),
  outputPath = DEFAULT_OUTPUT_PATH,
  ...options
} = {}) => {
  const markdown = buildPhysicalPhoneQaHandoff({ rootDir, ...options });
  const targetPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(rootDir, outputPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, markdown, "utf8");
  return { markdown, targetPath };
};

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const rootDir = process.cwd();
  const { targetPath } = writePhysicalPhoneQaHandoff({ rootDir });
  console.log(
    `[physical-phone-qa-handoff] wrote ${path.relative(rootDir, targetPath)}`,
  );
}
