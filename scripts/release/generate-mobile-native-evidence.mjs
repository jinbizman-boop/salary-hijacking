import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { androidToolExists } from "./android-sdk-tools.mjs";

const DEFAULT_PROOF_PATH = "release/mobile-native-proof.local.json";
const DEFAULT_OUTPUT_PATH = "release/mobile-native-evidence.json";

export const RAW_SECRET_VALUE_KEYS = new Set([
  "value",
  "rawValue",
  "secretValue",
  "tokenValue",
  "password",
  "reviewerPassword",
  "storePassword",
  "keystorePassword",
  "easTokenValue",
  "artifactUrl",
  "binaryUrl",
  "downloadUrl",
  "ipaUrl",
  "aabUrl",
  "apkUrl",
  "privateKey",
  "serviceAccountJson",
]);

export const RAW_SECRET_OR_ARTIFACT_PATTERN =
  /(eas_[a-z0-9_-]{16,}|expo\.dev\/artifacts|expo\.dev\/accounts\/[^/\s]+\/projects\/[^/\s]+\/builds\/|\.aab(?:\?|$)|\.apk(?:\?|$)|\.ipa(?:\?|$)|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+)/i;

export const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonIfPresent = (rootDir, filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
};

const defaultCommandExists = (command, androidToolOptions = {}) => {
  if (command === "adb" || command === "emulator") {
    return androidToolExists(command, androidToolOptions);
  }

  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return result.status === 0;
};

export const isRawSecretValueKey = (key) => {
  if (RAW_SECRET_VALUE_KEYS.has(key)) return true;
  return /(?:token|secret|password|credential|keystore|privatekey|serviceaccount|artifact|binary|download).*value$/i.test(
    key,
  );
};

export const containsRawSecretOrArtifactValue = (value) => {
  if (typeof value === "string") {
    return RAW_SECRET_OR_ARTIFACT_PATTERN.test(value);
  }
  if (Array.isArray(value)) return value.some(containsRawSecretOrArtifactValue);
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      isRawSecretValueKey(key) &&
      typeof nestedValue === "string" &&
      nestedValue.trim().length > 0
    ) {
      return true;
    }

    if (containsRawSecretOrArtifactValue(nestedValue)) return true;
  }

  return false;
};

const proofSection = (proof, key) =>
  isPlainObject(proof?.[key]) ? proof[key] : {};

const privacySectionIsSafe = (proof) => {
  const privacy = proofSection(proof, "privacy");
  return (
    privacy.containsEasToken !== true &&
    privacy.containsStoreCredential !== true &&
    privacy.containsBinaryDownloadUrl !== true &&
    privacy.containsReviewerPassword !== true
  );
};

const validateNoSecretProof = (proof, proofPath) => {
  if (!isPlainObject(proof)) return {};

  if (
    proof.schemaVersion !== 1 ||
    proof.secretsRedacted !== true ||
    !privacySectionIsSafe(proof) ||
    containsRawSecretOrArtifactValue(proof)
  ) {
    throw new Error(
      `${proofPath} must use schemaVersion 1, secretsRedacted=true, and contain no native build secret values or artifact URLs`,
    );
  }

  const android = proofSection(proof, "android");
  if (
    android.productionBuildVerified === true &&
    android.productionArtifactType &&
    android.productionArtifactType !== "aab"
  ) {
    throw new Error(
      `${proofPath} must verify Android production builds as AAB`,
    );
  }

  return proof;
};

const readProof = (rootDir, proofPath) => {
  const localProof = readJsonIfPresent(rootDir, proofPath);
  if (localProof) {
    return {
      proof: validateNoSecretProof(localProof, proofPath),
      source: "local",
    };
  }

  const fallback =
    proofPath === DEFAULT_PROOF_PATH
      ? readJsonIfPresent(rootDir, DEFAULT_OUTPUT_PATH)
      : null;
  if (fallback) {
    return {
      proof: validateNoSecretProof(fallback, DEFAULT_OUTPUT_PATH),
      source: "tracked",
    };
  }

  return { proof: {}, source: "none" };
};

const boolFrom = (source, key, fallback = false) =>
  source?.[key] === true ? true : fallback;

const stringFrom = (source, key, fallback = "") =>
  typeof source?.[key] === "string" && source[key].trim()
    ? source[key].trim()
    : fallback;

const noteFrom = (source, key, fallback) =>
  typeof source?.[key] === "string" && source[key].trim()
    ? source[key].trim()
    : fallback;

const buildNextEvidenceRequired = ({ android, ios }) => {
  const next = [];

  if (android.productionBuildVerified !== true) {
    next.push("EAS Android production AAB build result for profile production");
  }
  if (android.nativeE2eVerified !== true) {
    next.push(
      "Android native E2E result for android.emu.debug or equivalent device farm run",
    );
  }
  if (android.storeSubmitDryRunVerified !== true) {
    next.push("Google Play submit dry-run or console-ready submission proof");
  }
  if (ios.productionBuildVerified !== true) {
    next.push("EAS iOS production build result for profile production");
  }
  if (ios.storeSubmitDryRunVerified !== true) {
    next.push("App Store submit dry-run or console-ready submission proof");
  }

  return next;
};

export const buildMobileNativeEvidence = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  commandExists = null,
  androidToolEnv = process.env,
  androidToolExistsSync = fs.existsSync,
  androidToolHomeDir,
  androidToolPath = androidToolEnv.PATH ?? androidToolEnv.Path ?? "",
  androidToolPlatform = process.platform,
  now = () => new Date(),
} = {}) => {
  const { proof, source: proofSource } = readProof(rootDir, proofPath);
  const proofAndroid = proofSection(proof, "android");
  const proofIos = proofSection(proof, "ios");
  const commandAvailable =
    commandExists ??
    ((command) =>
      defaultCommandExists(command, {
        env: androidToolEnv,
        existsSync: androidToolExistsSync,
        homeDir: androidToolHomeDir,
        pathValue: androidToolPath,
        platform: androidToolPlatform,
      }));
  const localAdbAvailable = commandAvailable("adb");
  const localEmulatorAvailable = commandAvailable("emulator");
  const androidNoteFallback =
    localAdbAvailable && localEmulatorAvailable
      ? "Local Android SDK adb and emulator are detected. Native E2E remains unverified until Detox or equivalent device-farm proof is recorded without secrets."
      : "Local Android SDK adb/emulator are not fully detected. Android release remains blocked until either local native E2E passes or EAS/native test evidence is recorded without secrets.";

  const android = {
    localAdbAvailable,
    localEmulatorAvailable,
    productionBuildVerified: boolFrom(proofAndroid, "productionBuildVerified"),
    productionBuildProfile: stringFrom(
      proofAndroid,
      "productionBuildProfile",
      "production",
    ),
    productionArtifactType: stringFrom(
      proofAndroid,
      "productionArtifactType",
      "aab",
    ),
    storeSubmitDryRunVerified: boolFrom(
      proofAndroid,
      "storeSubmitDryRunVerified",
    ),
    nativeE2eVerified: boolFrom(proofAndroid, "nativeE2eVerified"),
    nativeE2eConfiguration: stringFrom(
      proofAndroid,
      "nativeE2eConfiguration",
      "android.emu.debug",
    ),
    note: noteFrom(
      proofSource === "local" ? proofAndroid : {},
      "note",
      androidNoteFallback,
    ),
  };

  const ios = {
    productionBuildVerified: boolFrom(proofIos, "productionBuildVerified"),
    productionBuildProfile: stringFrom(
      proofIos,
      "productionBuildProfile",
      "production",
    ),
    storeSubmitDryRunVerified: boolFrom(proofIos, "storeSubmitDryRunVerified"),
    note: noteFrom(
      proofIos,
      "note",
      "This evidence records only iOS EAS/store proof booleans. No Apple credential, binary URL, or reviewer password is stored.",
    ),
  };

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/generate-mobile-native-evidence.mjs from local no-secret proof booleans and local Android tool detection; raw EAS tokens, store credentials, artifact URLs, private keys, and reviewer passwords are rejected before writing",
    secretsRedacted: true,
    android,
    ios,
    privacy: {
      containsEasToken: false,
      containsStoreCredential: false,
      containsBinaryDownloadUrl: false,
      containsReviewerPassword: false,
    },
    nextEvidenceRequired: buildNextEvidenceRequired({ android, ios }),
  };
};

export const writeMobileNativeEvidenceFile = ({
  rootDir = process.cwd(),
  proofPath = DEFAULT_PROOF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  commandExists = null,
  now = () => new Date(),
} = {}) => {
  const evidence = buildMobileNativeEvidence({
    rootDir,
    proofPath,
    commandExists,
    now,
  });
  const absoluteOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(rootDir, outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(
    absoluteOutputPath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  return absoluteOutputPath;
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint()) {
  const outputPath = writeMobileNativeEvidenceFile();
  console.log(
    `[mobile-native-evidence] wrote ${path.relative(process.cwd(), outputPath)}`,
  );
}
