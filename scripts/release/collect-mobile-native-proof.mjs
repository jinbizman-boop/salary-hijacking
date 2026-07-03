import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  containsRawSecretOrArtifactValue,
  isPlainObject,
} from "./generate-mobile-native-evidence.mjs";

const DEFAULT_INPUT_PATH = "release/mobile-native-observation.local.json";
const DEFAULT_OUTPUT_PATH = "release/mobile-native-proof.local.json";
const DEFAULT_ROOT_DIR = process.cwd();
const EXPECTED_APP_IDENTITY = Object.freeze({
  appSlug: "salary-hijacking",
  androidPackage: "com.salaryhijacking.mobile",
  iosBundleIdentifier: "com.salaryhijacking.mobile",
});
const GOOGLE_PLAY_CONSOLE_READY_REQUIRED_FILES = Object.freeze([
  "apps/mobile/build/release/android/salary-hijacking-production.aab",
  "release/store/google-play-metadata.md",
  "release/store/data-safety.md",
  "release/store/review-notes.md",
  "release/store/content-rating.md",
  "release/screenshots/01_home_salary.png",
  "release/screenshots/02_daily_budget.png",
  "release/screenshots/03_plan_setting.png",
  "release/screenshots/04_notifications.png",
  "release/screenshots/05_level_up.png",
  "release/screenshots/feature_graphic_google_play.png",
]);

const COPIED_PROVIDER_PAYLOAD_KEY_TERMS = [
  "payload",
  "rawresponse",
  "responsebody",
  "requestbody",
  "buildlog",
  "consolelog",
  "providerlog",
  "storeconsole",
  "googleplayconsole",
  "appstoreconnect",
  "easbuildlog",
  "submissionpayload",
];

const resolveFromCwd = (filePath) =>
  path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const readJsonFile = (filePath) => {
  const absolutePath = resolveFromCwd(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${filePath} is missing`);
  }
  return JSON.parse(
    fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, ""),
  );
};

const resolveFromRoot = (rootDir, filePath) =>
  path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);

const fileExistsWithContent = (rootDir, filePath) => {
  const absolutePath = resolveFromRoot(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return false;
  const stats = fs.statSync(absolutePath);
  return stats.isFile() && stats.size > 0;
};

const zipHeaderVerified = (rootDir, filePath) => {
  const absolutePath = resolveFromRoot(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return false;
  const header = Buffer.alloc(4);
  const fd = fs.openSync(absolutePath, "r");
  try {
    fs.readSync(fd, header, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }
  return header[0] === 0x50 && header[1] === 0x4b;
};

const missingGooglePlayConsoleReadyFiles = (rootDir) =>
  GOOGLE_PLAY_CONSOLE_READY_REQUIRED_FILES.filter((filePath) => {
    if (!fileExistsWithContent(rootDir, filePath)) return true;
    if (filePath.endsWith(".aab")) return !zipHeaderVerified(rootDir, filePath);
    return false;
  });

const section = (value, key) => (isPlainObject(value?.[key]) ? value[key] : {});

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

const proofKeyLooksLikeCopiedProviderPayload = (key) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return COPIED_PROVIDER_PAYLOAD_KEY_TERMS.some((term) =>
    normalized.includes(term),
  );
};

const isNonBooleanEvidenceValue = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") {
    return false;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
};

const containsCopiedProviderPayloadsOrLogs = (value) => {
  if (Array.isArray(value))
    return value.some(containsCopiedProviderPayloadsOrLogs);
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      proofKeyLooksLikeCopiedProviderPayload(key) &&
      isNonBooleanEvidenceValue(nestedValue)
    ) {
      return true;
    }

    if (containsCopiedProviderPayloadsOrLogs(nestedValue)) return true;
  }

  return false;
};

const privacySectionIsSafe = (observation) => {
  const privacy = section(observation, "privacy");
  return (
    privacy.containsEasToken !== true &&
    privacy.containsStoreCredential !== true &&
    privacy.containsBinaryDownloadUrl !== true &&
    privacy.containsReviewerPassword !== true
  );
};

const appIdentityMismatchMessages = ({ appIdentity, requireIdentity }) => {
  const checks = [
    ["appSlug", EXPECTED_APP_IDENTITY.appSlug],
    ["androidPackage", EXPECTED_APP_IDENTITY.androidPackage],
    ["iosBundleIdentifier", EXPECTED_APP_IDENTITY.iosBundleIdentifier],
  ];

  return checks
    .map(([key, expected]) => {
      const actual = stringFrom(appIdentity, key);
      if (actual.length === 0 && requireIdentity) {
        return `${key} is missing`;
      }
      if (actual.length > 0 && actual !== expected) {
        return `${key} must be ${expected}`;
      }
      return "";
    })
    .filter(Boolean);
};

const observationHasVerifiedReleaseClaim = (observation) => {
  const android = section(observation, "android");
  const ios = section(observation, "ios");
  return (
    androidProductionBuildVerified(android) ||
    boolFrom(android, "storeSubmitDryRunVerified") ||
    nativeE2eVerified(android) ||
    productionProfileVerified(ios) ||
    boolFrom(ios, "storeSubmitDryRunVerified")
  );
};

const validateObservationAppIdentity = (observation, inputPath) => {
  const appIdentity = section(observation, "appIdentity");
  const mismatches = appIdentityMismatchMessages({
    appIdentity,
    requireIdentity: observationHasVerifiedReleaseClaim(observation),
  });

  if (mismatches.length > 0) {
    throw new Error(
      `${inputPath} mobile app identity must match the Salary Hijacking release target: ${mismatches.join(", ")}`,
    );
  }
};

const validateObservation = (observation, inputPath) => {
  if (
    observation.schemaVersion !== 1 ||
    observation.secretsRedacted !== true ||
    observation.containsSecretValues !== false ||
    !privacySectionIsSafe(observation) ||
    containsRawSecretOrArtifactValue(observation)
  ) {
    throw new Error(
      `${inputPath} must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no native build secret values, artifact URLs, or artifact paths`,
    );
  }

  if (containsCopiedProviderPayloadsOrLogs(observation)) {
    throw new Error(
      `${inputPath} must not contain copied provider payloads or logs`,
    );
  }

  validateObservationAppIdentity(observation, inputPath);

  const android = section(observation, "android");
  if (
    android.productionBuildVerified === true &&
    stringFrom(android, "productionArtifactType", "aab") !== "aab"
  ) {
    throw new Error(
      `${inputPath} must verify Android production builds as AAB`,
    );
  }
};

const productionProfileVerified = (input) =>
  boolFrom(input, "productionBuildVerified") &&
  stringFrom(input, "productionBuildProfile", "production") === "production";

const androidProductionBuildVerified = (android) =>
  productionProfileVerified(android) &&
  stringFrom(android, "productionArtifactType", "aab") === "aab";

const nativeE2eVerified = (android) =>
  boolFrom(android, "nativeE2eVerified") &&
  stringFrom(android, "nativeE2eConfiguration", "android.emu.debug").length > 0;

const androidStoreSubmitVerified = ({ android, inputPath, rootDir }) => {
  if (!boolFrom(android, "storeSubmitDryRunVerified")) return false;

  const evidenceType = stringFrom(android, "storeSubmitEvidenceType");
  if (evidenceType === "google-play-submit-dry-run") return true;

  if (evidenceType === "google-play-console-ready") {
    const missing = missingGooglePlayConsoleReadyFiles(rootDir);
    if (missing.length > 0) {
      throw new Error(
        `${inputPath} Google Play console-ready proof is missing required release files`,
      );
    }
    return true;
  }

  throw new Error(
    `${inputPath} Android store submit proof requires storeSubmitEvidenceType=google-play-submit-dry-run or google-play-console-ready`,
  );
};

export const buildMobileNativeProof = ({
  observation,
  inputPath = DEFAULT_INPUT_PATH,
  rootDir = DEFAULT_ROOT_DIR,
  now = () => new Date(),
} = {}) => {
  validateObservation(observation, inputPath);

  const android = section(observation, "android");
  const ios = section(observation, "ios");

  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    source:
      "Generated by scripts/release/collect-mobile-native-proof.mjs from local no-secret mobile build, native E2E, and store-submit observations; raw EAS tokens, store credentials, artifact URLs or paths, private keys, reviewer passwords, copied provider payloads, and logs are rejected before writing",
    secretsRedacted: true,
    containsSecretValues: false,
    appIdentity: { ...EXPECTED_APP_IDENTITY },
    android: {
      productionBuildVerified: androidProductionBuildVerified(android),
      productionBuildProfile: "production",
      productionArtifactType: "aab",
      storeSubmitDryRunVerified: androidStoreSubmitVerified({
        android,
        inputPath,
        rootDir,
      }),
      storeSubmitEvidenceType: stringFrom(android, "storeSubmitEvidenceType"),
      nativeE2eVerified: nativeE2eVerified(android),
      nativeE2eConfiguration: stringFrom(
        android,
        "nativeE2eConfiguration",
        "android.emu.debug",
      ),
      note: noteFrom(
        android,
        "note",
        "Android proof records only production AAB, native E2E, and Google Play dry-run booleans. No EAS token, binary URL, signing key, service account, reviewer password, copied store-console payload, or log is stored.",
      ),
    },
    ios: {
      productionBuildVerified: productionProfileVerified(ios),
      productionBuildProfile: "production",
      storeSubmitDryRunVerified: boolFrom(ios, "storeSubmitDryRunVerified"),
      note: noteFrom(
        ios,
        "note",
        "iOS proof records only production build and App Store dry-run booleans. No Apple credential, binary URL, signing key, reviewer password, copied store-console payload, or log is stored.",
      ),
    },
    privacy: {
      containsEasToken: false,
      containsStoreCredential: false,
      containsBinaryDownloadUrl: false,
      containsReviewerPassword: false,
    },
  };
};

export const collectMobileNativeProof = ({
  inputPath = DEFAULT_INPUT_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  rootDir = DEFAULT_ROOT_DIR,
  now = () => new Date(),
  writeFile = true,
} = {}) => {
  const observation = readJsonFile(inputPath);
  const proof = buildMobileNativeProof({
    observation,
    inputPath,
    rootDir,
    now,
  });

  if (writeFile) {
    const absoluteOutputPath = resolveFromCwd(outputPath);
    fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
    fs.writeFileSync(
      absoluteOutputPath,
      `${JSON.stringify(proof, null, 2)}\n`,
      "utf8",
    );
  }

  return proof;
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint()) {
  const proof = collectMobileNativeProof();
  const verified =
    proof.android.productionBuildVerified === true &&
    proof.android.storeSubmitDryRunVerified === true &&
    proof.android.nativeE2eVerified === true &&
    proof.ios.productionBuildVerified === true &&
    proof.ios.storeSubmitDryRunVerified === true;
  console.log(
    `[mobile-native-proof] wrote ${DEFAULT_OUTPUT_PATH}; verified=${verified}`,
  );
  if (!verified) process.exitCode = 1;
}
