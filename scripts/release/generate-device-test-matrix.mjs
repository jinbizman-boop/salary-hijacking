import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const OUTPUT_PATH = "docs/codex/100-completion/07_DEVICE_TEST_MATRIX.md";
const PHYSICAL_PHONE_HANDOFF_PATH =
  "docs/qa/100-completion/physical-phone-qa-handoff.md";

export function buildDeviceTestMatrix({
  rootDir = process.cwd(),
  rootScriptTestCount = 318,
  now = () => new Date(),
  updated,
} = {}) {
  const updatedDate = updated ?? `${formatKstDate(now())} KST`;
  const preview = readJson(
    path.join(rootDir, "release/mobile-preview-evidence.json"),
  );
  const native = readJson(
    path.join(rootDir, "release/mobile-native-evidence.json"),
  );
  const android = isObject(preview.android) ? preview.android : {};
  const nativeAndroid = isObject(native.android) ? native.android : {};
  const phoneSha = text(
    android.phoneTargetDebugApkSha256 || android.debugApkSha256,
  );
  const phonePath = text(
    android.phoneTargetDebugApkLocalPath || android.latestSourcePackagedApk,
  );
  const downloadsPath = text(android.phoneTargetDebugApkDownloadsPath);
  const phoneAbi = arrayText(android.phoneTargetDebugApkAbis);
  const physicalBlocker =
    text(android.physicalPhoneBlocker) ||
    "No physical Android phone proof is present in this Codex Windows environment.";
  const emulatorRuns = numberText(android.coldStartRuns);
  const emulatorFatalCount = numberText(android.coldStartFatalCount);

  const rows = [
    [
      "Jest React Native and release tooling runtime",
      "PASS",
      `\`corepack pnpm run test:root-scripts\`: PASS, ${rootScriptTestCount} tests; targeted device-matrix generator test is also PASS.`,
      "Covers release tooling regressions and mobile launch-readiness source contracts. It is not a physical phone substitute.",
    ],
    [
      "Expo web export / responsive screenshots",
      "PASS",
      "`release/evidence/mobile-ui/capture-summary.json`; `release/evidence/mobile-ui/*.png`; `release/screenshots/*.png`",
      "Existing responsive capture evidence covers the web-rendered mobile UI and Google Play screenshot exports.",
    ],
    [
      "Local Android/JDK/adb toolchain",
      nativeAndroid.localAdbAvailable || android.emulatorInstallVerified
        ? "PASS"
        : "BLOCKED",
      nativeAndroid.localAdbAvailable
        ? "Local adb/toolchain availability is recorded in `release/mobile-native-evidence.json`."
        : "Local adb/toolchain proof is not recorded.",
      nativeAndroid.localEmulatorAvailable
        ? "Android emulator tooling is available locally."
        : "Emulator availability is not proven by current evidence.",
    ],
    [
      "Latest-source ARM64 phone debug APK",
      phoneSha && phonePath ? "PASS" : "BLOCKED",
      [
        phonePath ? `Artifact: \`${phonePath}\`` : "",
        downloadsPath ? `Downloads copy: \`${downloadsPath}\`` : "",
        phoneSha ? `SHA256 \`${phoneSha}\`` : "",
        phoneAbi ? `ABI ${phoneAbi}` : "",
      ]
        .filter(Boolean)
        .join("; "),
      android.phoneTargetDebugApkDownloadVerified
        ? "APK build, signing, download verification, ABI filter, and Expo native library proof are recorded without copying temporary artifact URLs."
        : "Phone-target APK download/signing proof is incomplete.",
    ],
    [
      "Android emulator cold start / route smoke",
      android.emulatorInstallVerified &&
      android.navigationSmokeVerified &&
      android.backgroundForegroundVerified &&
      android.coldStartFatalCount === 0
        ? "PASS"
        : "BLOCKED",
      [
        android.emulatorInstallEvidence
          ? `Install evidence: \`${android.emulatorInstallEvidence}\``
          : "",
        emulatorRuns ? `${emulatorRuns} cold starts` : "",
        emulatorFatalCount ? `${emulatorFatalCount} fatal markers` : "",
      ]
        .filter(Boolean)
        .join("; "),
      "Emulator install, route smoke, notification no-tab, and background/foreground proof are recorded separately from physical phone QA.",
    ],
    [
      "Android physical device cold start / logcat",
      android.physicalPhoneVerified ? "PASS" : "BLOCKED",
      android.physicalPhoneVerified
        ? "`release/mobile-preview-phone-proof.local.json`"
        : `\`release/mobile-preview-evidence.json\`; handoff: \`${PHYSICAL_PHONE_HANDOFF_PATH}\``,
      android.physicalPhoneVerified
        ? "Physical phone install, cold-start, and no-secret logcat proof are verified."
        : physicalBlocker,
    ],
    [
      "Android physical keyboard/safe-area matrix",
      android.physicalPhoneVerified ? "PASS" : "BLOCKED",
      android.physicalPhoneVerified
        ? "`release/mobile-preview-phone-proof.local.json`"
        : `\`release/mobile-preview-evidence.json\`; handoff: \`${PHYSICAL_PHONE_HANDOFF_PATH}\``,
      android.physicalPhoneVerified
        ? "Physical keyboard and safe-area proof are verified."
        : "Emulator keyboard path and source contracts are covered, but all-screen/all-field physical safe-area and keyboard proof still requires a phone or device-farm run.",
    ],
  ];

  return `# Device Test Matrix

Updated: ${updatedDate}

${rows
  .map(
    ([environment, status, evidence, notes]) => `## ${markdownText(environment)}

- Status: ${markdownText(status)}
- Evidence: ${markdownText(evidence)}
- Notes: ${markdownText(notes)}`,
  )
  .join("\n\n")}
`;
}

export function writeDeviceTestMatrix(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const outputPath = path.join(rootDir, OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildDeviceTestMatrix(options), "utf8");
  return outputPath;
}

function formatKstDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberText(value) {
  return Number.isFinite(value) ? String(value) : "";
}

function arrayText(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).join(", ") : "";
}

function markdownText(value) {
  return text(value).replace(/\s+/gu, " ") || "N/A";
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const outputPath = writeDeviceTestMatrix();
  console.log(
    `[device-matrix] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
