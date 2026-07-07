import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { androidToolExists } from "./android-sdk-tools.mjs";
import { DEFAULT_SECRET_STORES } from "./generate-secrets-evidence.mjs";

const RELEASE_CHECK_VERSION = "1.0.0";
const RELEASE_TARGETS_PATH = "release/release-targets.json";
const EXTERNAL_RELEASE_EVIDENCE_PATH = "release/external-release-evidence.json";
const MOBILE_NATIVE_EVIDENCE_PATH = "release/mobile-native-evidence.json";
const SECRETS_EVIDENCE_PATH = "release/secrets-evidence.json";
const CLOUDFLARE_RUNTIME_EVIDENCE_PATH =
  "release/cloudflare-runtime-evidence.json";
const DATABASE_EVIDENCE_PATH = "release/database-evidence.json";
const PUBLIC_URL_EVIDENCE_PATH = "release/public-url-evidence.json";
const SECURITY_AUDIT_EVIDENCE_PATH = "release/security-audit-evidence.json";

const REQUIRED_FILES = [
  "AGENTS.md",
  "docs/codex/08_FILE_COMPLETION_LOG.md",
  "docs/codex/09_VALIDATION_PROTOCOL.md",
  "release/README.md",
  RELEASE_TARGETS_PATH,
  EXTERNAL_RELEASE_EVIDENCE_PATH,
  MOBILE_NATIVE_EVIDENCE_PATH,
  SECRETS_EVIDENCE_PATH,
  CLOUDFLARE_RUNTIME_EVIDENCE_PATH,
  DATABASE_EVIDENCE_PATH,
  PUBLIC_URL_EVIDENCE_PATH,
  SECURITY_AUDIT_EVIDENCE_PATH,
  "release/rollback/rollback-plan.md",
  "release/screenshots/screenshot-plan.md",
  "release/store/data-safety.md",
  "release/store/app-privacy.md",
  "release/store/review-notes.md",
  "release/store/content-rating.md",
  "release/store/google-play-metadata.md",
  "release/store/app-store-metadata.md",
  "assets/store/screenshots-guideline.md",
  "infra/domain/dns-records.md",
  "infra/domain/certificates.md",
  "infra/github/secrets.md",
  "infra/github/repository.md",
  "infra/neon/README.md",
  "infra/cloudflare/README.md",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  ".github/workflows/security-scan.yml",
  ".github/workflows/deploy-api.yml",
  ".github/workflows/deploy-admin.yml",
  ".github/workflows/mobile-build.yml",
  "apps/admin/open-next.config.ts",
  "apps/admin/wrangler.jsonc",
  "services/api/wrangler.toml",
  "services/notifications/wrangler.toml",
  "services/scheduler/wrangler.toml",
  "apps/mobile/app.config.ts",
  "apps/mobile/eas.json",
];

const REQUIRED_ROOT_SCRIPTS = [
  "format:check",
  "quality",
  "build",
  "check:external-integrations",
  "security:scan",
  "db:validate",
  "test:e2e",
];

const REQUIRED_ENV_NAMES = [
  "DATABASE_URL",
  "STAGING_DATABASE_URL",
  "NEON_API_KEY",
  "NEON_PROJECT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CF_ADMIN_WORKER_NAME",
  "EXPO_TOKEN",
  "EAS_PROJECT_ID",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "SENTRY_DSN",
  "SLACK_WEBHOOK_URL",
];

const APPROVED_SECRET_STORE_LABELS = new Set([
  "GitHub Environments",
  "Cloudflare Worker secret",
  "Neon",
  "Neon connector credential",
  "release external evidence",
  "Cloudflare account secret",
  "Cloudflare Worker config",
  "EAS secret store",
  "EAS project settings",
  "GitHub Actions runtime",
  "provider secret store",
]);

const RAW_SECRET_VALUE_EVIDENCE_KEYS = new Set([
  "value",
  "rawValue",
  "secretValue",
  "tokenValue",
  "password",
  "connectionString",
  "databaseUrl",
  "webhookUrl",
  "dsnValue",
  "privateKey",
  "serviceAccountJson",
]);

const RAW_SECRET_VALUE_PATTERN =
  /(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|:\/\/[^/\s]+:[^@\s]+@|https?:\/\/hooks\.slack\.com\/services\/|https?:\/\/[^@\s]+@[^/\s]+\/\d+|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+|napi_[a-z0-9_-]{16,}|cf_[a-z0-9_-]{16,})/i;

const isRawSecretEvidenceKey = (key) => {
  if (RAW_SECRET_VALUE_EVIDENCE_KEYS.has(key)) return true;
  return /(?:token|secret|password|connection|string|database|webhook|dsn|privatekey|serviceaccount).*value$/i.test(
    key,
  );
};

const REQUIRED_CLI_GROUPS = [
  { label: "git", commands: ["git"] },
  { label: "GitHub CLI", commands: ["gh"] },
  { label: "Cloudflare Wrangler", commands: ["wrangler"] },
  { label: "Neon CLI", commands: ["neon", "neonctl"], any: true },
  {
    label: "Expo EAS CLI launcher",
    commands: ["pnpm"],
  },
];

const PUBLIC_SECRET_ENV_PATTERN =
  /\b(?:NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE|JWT|KEY|COOKIE|SESSION|FCM|SERVICE_ACCOUNT|NEON|WEBHOOK)[A-Z0-9_]*\b/;

const PLACEHOLDER_PATTERN =
  /^(?:replace-with-|your-|owner\/|postgresql:\/\/USER:PASSWORD@|https?:\/\/hooks\.invalid|https?:\/\/sentry\.invalid)/i;

const REQUIRED_PROTECTED_EXISTING_REPOSITORIES = ["Retro Games", "RETRO-DB"];

const REQUIRED_MOBILE_ASSETS = [
  "icon.png",
  "splash.png",
  "adaptive-icon.png",
  "notification-icon.png",
  "favicon.png",
];
const REQUIRED_MOBILE_ASSET_REQUIREMENTS = Object.freeze({
  "icon.png": {
    minWidth: 1024,
    minHeight: 1024,
    minBytes: 40_000,
    label: "app icon",
  },
  "splash.png": {
    minWidth: 1000,
    minHeight: 1800,
    minBytes: 80_000,
    label: "splash image",
  },
  "adaptive-icon.png": {
    minWidth: 1024,
    minHeight: 1024,
    minBytes: 40_000,
    label: "Android adaptive icon",
  },
  "notification-icon.png": {
    minWidth: 256,
    minHeight: 256,
    minBytes: 2_000,
    label: "notification icon",
  },
  "favicon.png": {
    minWidth: 96,
    minHeight: 96,
    minBytes: 1_000,
    label: "web favicon",
  },
});
const EXPECTED_MOBILE_APP_ASSET_REFERENCES = Object.freeze([
  {
    constName: "DEFAULT_ICON",
    defaultPath: "./assets/icon.png",
    envName: "EXPO_PUBLIC_APP_ICON",
    label: "app icon",
  },
  {
    constName: "DEFAULT_SPLASH",
    defaultPath: "./assets/splash.png",
    envName: "EXPO_PUBLIC_SPLASH_IMAGE",
    label: "splash image",
  },
  {
    constName: "DEFAULT_ADAPTIVE_ICON",
    defaultPath: "./assets/adaptive-icon.png",
    envName: "EXPO_PUBLIC_ANDROID_ADAPTIVE_ICON",
    label: "Android adaptive icon",
  },
  {
    constName: "DEFAULT_NOTIFICATION_ICON",
    defaultPath: "./assets/notification-icon.png",
    envName: "EXPO_PUBLIC_NOTIFICATION_ICON",
    label: "notification icon",
  },
  {
    constName: "DEFAULT_FAVICON",
    defaultPath: "./assets/favicon.png",
    envName: "EXPO_PUBLIC_FAVICON",
    label: "web favicon",
  },
]);
const OFFICIAL_BI_LOGO_ASSET =
  "assets/brand/salary-hijacking-platform-logo.png";
const OFFICIAL_BI_LOGO_SHA256 =
  "EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466";
const REQUIRED_FREESENTATION_FONT_ASSETS = [
  "Freesentation-4Regular.ttf",
  "Freesentation-5Medium.ttf",
  "Freesentation-6SemiBold.ttf",
  "Freesentation-7Bold.ttf",
  "Freesentation-8ExtraBold.ttf",
  "Freesentation-9Black.ttf",
];
const MIN_FREESENTATION_FONT_BYTES = 2_000_000;

const REQUIRED_STORE_SCREENSHOT_ASSETS = [
  "01_home_salary.png",
  "02_daily_budget.png",
  "03_plan_setting.png",
  "04_notifications.png",
  "05_level_up.png",
];

const REQUIRED_STORE_FEATURE_GRAPHIC = "feature_graphic_google_play.png";
const MIN_STORE_SCREENSHOT_WIDTH = 360;
const MIN_STORE_SCREENSHOT_HEIGHT = 640;
const MIN_STORE_SCREENSHOT_BYTES = 20_000;
const REQUIRED_FEATURE_GRAPHIC_WIDTH = 1024;
const REQUIRED_FEATURE_GRAPHIC_HEIGHT = 500;
const MIN_STORE_FEATURE_GRAPHIC_BYTES = 40_000;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const TTF_SIGNATURES = [
  Buffer.from([0x00, 0x01, 0x00, 0x00]),
  Buffer.from("true", "ascii"),
  Buffer.from("OTTO", "ascii"),
];

const EXPECTED_MOBILE_EAS = Object.freeze({
  stagingApiBaseUrl: "https://api-staging.salaryhijacking.com",
  stagingDeeplinkHost: "staging.salaryhijacking.com",
  productionApiBaseUrl: "https://api.salaryhijacking.com",
  productionDeeplinkHost: "salaryhijacking.com",
});

const EXPECTED_MOBILE_APP = Object.freeze({
  name: "급여납치",
  slug: "salary-hijacking",
  scheme: "salaryhijacking",
  packageId: "com.salaryhijacking.mobile",
  version: "1.0.0",
  privacyUrl: "https://salaryhijacking.com/privacy",
  supportUrl: "https://salaryhijacking.com/support",
  supportEmail: "support@salaryhijacking.com",
  locale: "ko-KR",
  timezone: "Asia/Seoul",
});

const EXPECTED_PUBLIC_URLS = Object.freeze({
  landingUrl: "https://salaryhijacking.com/",
  privacyUrl: "https://salaryhijacking.com/privacy",
  supportUrl: "https://salaryhijacking.com/support",
  termsUrl: "https://salaryhijacking.com/terms",
});

const EXPECTED_CLOUDFLARE_DOMAINS = Object.freeze([
  "salaryhijacking.com",
  "www.salaryhijacking.com",
  "api.salaryhijacking.com",
  "notifications.salaryhijacking.com",
  "scheduler.salaryhijacking.com",
  "admin.salaryhijacking.com",
]);

const RAW_PUBLIC_PAGE_OR_SENSITIVE_KEY_TERMS = [
  "payload",
  "requestbody",
  "responsebody",
  "responsehtml",
  "htmlbody",
  "rawhtml",
  "pagebody",
  "sampledata",
  "rawdata",
  "salary",
  "income",
  "expense",
  "savings",
  "hijack",
  "accountnumber",
  "cardnumber",
  "loan",
  "resident",
  "phone",
  "email",
  "authtoken",
  "refreshtoken",
  "sessiontoken",
  "pushtoken",
  "rawdeviceidentifier",
  "deviceidentifier",
  "deviceid",
];

const MOJIBAKE_PATTERN = /[�]|[湲吏理疫]/;

const SUBMISSION_PLACEHOLDER_PATTERN =
  /\b(?:TODO|TBD|placeholder|coming soon|stub|not implemented|example\.com|salary-hijacking\.example)\b/i;

const REVIEW_NOTE_SECRET_PATTERN =
  /\b(?:password|secret|token|private key)\s*:\s*(?!(?:provide out-of-band|do not commit|not stored|redacted|<))\S/i;

const pathExists = (rootDir, relativePath) =>
  fs.existsSync(path.join(rootDir, relativePath));

const existingLocalPaths = (rootDir, relativePaths = []) =>
  relativePaths.filter((relativePath) => pathExists(rootDir, relativePath));

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const findCommandOnPath = (command, env = process.env) => {
  if (command === "adb" || command === "emulator") {
    return androidToolExists(command, { env });
  }

  const pathValue = env.PATH ?? env.Path ?? "";
  const extensions =
    process.platform === "win32"
      ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")
      : [""];

  for (const directory of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      if (fs.existsSync(candidate)) return true;
    }
  }

  return false;
};

const defaultGitStatus = (rootDir) => {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const defaultGitRemote = (rootDir) => {
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const defaultGitHead = (rootDir) => {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const defaultGitRemoteHead = (rootDir) => {
  const result = spawnSync("git", ["ls-remote", "origin", "refs/heads/main"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const defaultGitRemoteTrackingHead = (rootDir) => {
  const result = spawnSync("git", ["rev-parse", "refs/remotes/origin/main"], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const addCheck = (checks, status, name, detail) => {
  checks.push({ status, name, detail });
};

const isUsableEnvValue = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  !PLACEHOLDER_PATTERN.test(value.trim());

const collectEnvExampleNames = (rootDir) => {
  const envPath = path.join(rootDir, ".env.example");
  if (!fs.existsSync(envPath)) return { names: new Set(), text: "" };
  const text = fs.readFileSync(envPath, "utf8");
  const names = new Set();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (match?.[1]) names.add(match[1]);
  }

  return { names, text };
};

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringArray = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const normalizeSlug = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const lastRepositorySegment = (repositoryFullName) => {
  const value = String(repositoryFullName ?? "").trim();
  const segments = value.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
};

const normalizeGitRemote = (remoteUrl) =>
  String(remoteUrl ?? "")
    .trim()
    .split(/\r?\n/)[0]
    .toLowerCase()
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/\.git$/, "");

const gitRemoteMatchesRepository = (remoteUrl, repositoryFullName) => {
  const remote = normalizeGitRemote(remoteUrl);
  const repository = String(repositoryFullName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.git$/, "");

  return (
    remote.endsWith(`/${repository}`) ||
    remote.endsWith(`:${repository}`) ||
    remote === repository
  );
};

const parseGitSha = (output) => {
  const candidate =
    String(output ?? "")
      .trim()
      .split(/\s+/)[0] ?? "";
  return /^[0-9a-f]{40}$/i.test(candidate) ? candidate.toLowerCase() : "";
};

const shortGitSha = (value) => String(value ?? "").slice(0, 12);

const getExpectedGithubRepository = (evidence) => {
  const github = isPlainObject(evidence?.github) ? evidence.github : {};
  return typeof github.expectedRepository === "string"
    ? github.expectedRepository.trim()
    : "";
};

const addExternalEvidenceBlocker = (
  checks,
  blockers,
  name,
  detail,
  blocker,
) => {
  addCheck(checks, "BLOCKED", name, detail);
  blockers.push(blocker);
};

const readExternalReleaseEvidence = (rootDir) => {
  const evidencePath = path.join(rootDir, EXTERNAL_RELEASE_EVIDENCE_PATH);
  if (!fs.existsSync(evidencePath)) return null;

  try {
    const evidence = readJson(evidencePath);
    return isPlainObject(evidence) ? evidence : null;
  } catch {
    return null;
  }
};

const sortedStrings = (value) =>
  stringArray(value)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

const sameStringArray = (left, right) => {
  const leftValues = sortedStrings(left);
  const rightValues = sortedStrings(right);
  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  );
};

const checkReleaseTargets = (rootDir, checks, blockers) => {
  const targetsPath = path.join(rootDir, RELEASE_TARGETS_PATH);
  if (!fs.existsSync(targetsPath)) {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:file",
      `${RELEASE_TARGETS_PATH} is missing`,
    );
    blockers.push(`${RELEASE_TARGETS_PATH} is missing`);
    return null;
  }

  let targets;
  try {
    targets = readJson(targetsPath);
  } catch {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:json",
      `${RELEASE_TARGETS_PATH} is invalid JSON`,
    );
    blockers.push(`${RELEASE_TARGETS_PATH} must be valid JSON`);
    return null;
  }

  if (!isPlainObject(targets)) {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:schema",
      `${RELEASE_TARGETS_PATH} root must be an object`,
    );
    blockers.push(`${RELEASE_TARGETS_PATH} root must be an object`);
    return null;
  }

  if (targets.schemaVersion === 1) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:schemaVersion",
      "schema version 1",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:schemaVersion",
      "schemaVersion must be 1",
    );
    blockers.push(`${RELEASE_TARGETS_PATH} schemaVersion must be 1`);
  }

  const github = isPlainObject(targets.github) ? targets.github : {};
  const expectedRepository =
    typeof github.expectedRepository === "string"
      ? github.expectedRepository.trim()
      : "";
  const protectedSlugs = sortedStrings(
    github.protectedExistingRepositories,
  ).map(normalizeSlug);
  const missingProtectedRepositories =
    REQUIRED_PROTECTED_EXISTING_REPOSITORIES.filter(
      (repository) => !protectedSlugs.includes(normalizeSlug(repository)),
    );
  const githubProblems = [];
  if (!expectedRepository) githubProblems.push("expectedRepository missing");
  if (github.repositoryCreationRequired !== true) {
    githubProblems.push("repositoryCreationRequired must be true");
  }
  if (missingProtectedRepositories.length > 0) {
    githubProblems.push(
      `protectedExistingRepositories missing ${missingProtectedRepositories.join(", ")}`,
    );
  }

  if (githubProblems.length === 0) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:github",
      `expected repository ${expectedRepository}`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:github",
      githubProblems.join("; "),
    );
    blockers.push(`${RELEASE_TARGETS_PATH} GitHub target is incomplete`);
  }

  const cloudflare = isPlainObject(targets.cloudflare)
    ? targets.cloudflare
    : {};
  const expectedWorkers = sortedStrings(cloudflare.expectedWorkers);
  const expectedAdminWorker =
    typeof cloudflare.expectedAdminWorker === "string"
      ? cloudflare.expectedAdminWorker.trim()
      : "";
  const adminDeploymentType =
    typeof cloudflare.adminDeploymentType === "string"
      ? cloudflare.adminDeploymentType.trim()
      : "";
  const cloudflareProblems = [];
  if (expectedWorkers.length === 0) {
    cloudflareProblems.push("expectedWorkers missing");
  }
  if (!expectedAdminWorker) {
    cloudflareProblems.push("expectedAdminWorker missing");
  }
  if (expectedAdminWorker && !expectedWorkers.includes(expectedAdminWorker)) {
    cloudflareProblems.push("expectedWorkers must include expectedAdminWorker");
  }
  if (adminDeploymentType !== "workers-opennext") {
    cloudflareProblems.push("adminDeploymentType must be workers-opennext");
  }

  if (cloudflareProblems.length === 0) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:cloudflare",
      `workers ${expectedWorkers.join(", ")}; admin ${expectedAdminWorker} (${adminDeploymentType})`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:cloudflare",
      cloudflareProblems.join("; "),
    );
    blockers.push(`${RELEASE_TARGETS_PATH} Cloudflare target is incomplete`);
  }

  const neon = isPlainObject(targets.neon) ? targets.neon : {};
  const expectedProjectHint =
    typeof neon.expectedProjectHint === "string"
      ? neon.expectedProjectHint.trim()
      : "";

  if (expectedProjectHint) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:neon",
      `expected project hint ${expectedProjectHint}`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:neon",
      "expectedProjectHint missing",
    );
    blockers.push(`${RELEASE_TARGETS_PATH} Neon target is incomplete`);
  }

  const mobile = isPlainObject(targets.mobile) ? targets.mobile : {};
  const mobileTargetProblems = [
    ["expectedAppSlug", EXPECTED_MOBILE_APP.slug],
    ["expectedAndroidPackage", EXPECTED_MOBILE_APP.packageId],
    ["expectedIosBundleIdentifier", EXPECTED_MOBILE_APP.packageId],
  ]
    .filter(([key, expectedValue]) => mobile[key] !== expectedValue)
    .map(([key, expectedValue]) => `${key} must be ${expectedValue}`);

  if (mobileTargetProblems.length === 0) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:mobile",
      `mobile app target ${EXPECTED_MOBILE_APP.slug} / ${EXPECTED_MOBILE_APP.packageId}`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:mobile",
      mobileTargetProblems.join("; "),
    );
    blockers.push(`${RELEASE_TARGETS_PATH} mobile target is incomplete`);
  }

  const publicUrls = isPlainObject(targets.publicUrls)
    ? targets.publicUrls
    : {};
  const publicUrlProblems = Object.entries(EXPECTED_PUBLIC_URLS)
    .filter(([key, expectedValue]) => publicUrls[key] !== expectedValue)
    .map(([key, expectedValue]) => `${key} must be ${expectedValue}`);

  if (publicUrlProblems.length === 0) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:public-urls",
      "public landing, privacy, support, and terms URLs are targeted",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:public-urls",
      publicUrlProblems.join("; "),
    );
    blockers.push(`${RELEASE_TARGETS_PATH} public URL targets are incomplete`);
  }

  return targets;
};

const checkEvidenceMatchesReleaseTargets = (
  releaseTargets,
  externalEvidence,
  checks,
  blockers,
) => {
  if (!isPlainObject(releaseTargets) || !isPlainObject(externalEvidence)) {
    return;
  }

  const targetGithub = isPlainObject(releaseTargets.github)
    ? releaseTargets.github
    : {};
  const evidenceGithub = isPlainObject(externalEvidence.github)
    ? externalEvidence.github
    : {};
  const targetRepository =
    typeof targetGithub.expectedRepository === "string"
      ? targetGithub.expectedRepository.trim()
      : "";
  const evidenceRepository =
    typeof evidenceGithub.expectedRepository === "string"
      ? evidenceGithub.expectedRepository.trim()
      : "";
  const githubMatches =
    targetRepository === evidenceRepository &&
    targetGithub.repositoryCreationRequired ===
      evidenceGithub.repositoryCreationRequired &&
    sameStringArray(
      targetGithub.protectedExistingRepositories,
      evidenceGithub.protectedExistingRepositories,
    );

  if (githubMatches) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:github-evidence",
      "external evidence matches GitHub target",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:github",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} does not match ${RELEASE_TARGETS_PATH}`,
    );
    blockers.push(
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} GitHub target must match ${RELEASE_TARGETS_PATH}`,
    );
  }

  const targetCloudflare = isPlainObject(releaseTargets.cloudflare)
    ? releaseTargets.cloudflare
    : {};
  const evidenceCloudflare = isPlainObject(externalEvidence.cloudflare)
    ? externalEvidence.cloudflare
    : {};
  if (
    sameStringArray(
      targetCloudflare.expectedWorkers,
      evidenceCloudflare.expectedWorkers,
    )
  ) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:cloudflare-workers",
      "external evidence matches Worker targets",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:cloudflare-workers",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} Worker targets drifted`,
    );
    blockers.push(
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} Cloudflare Worker targets must match ${RELEASE_TARGETS_PATH}`,
    );
  }

  const targetAdminWorker =
    typeof targetCloudflare.expectedAdminWorker === "string"
      ? targetCloudflare.expectedAdminWorker.trim()
      : "";
  const evidenceAdminWorker =
    typeof evidenceCloudflare.expectedAdminWorker === "string"
      ? evidenceCloudflare.expectedAdminWorker.trim()
      : "";
  const targetAdminDeploymentType =
    typeof targetCloudflare.adminDeploymentType === "string"
      ? targetCloudflare.adminDeploymentType.trim()
      : "";
  const evidenceAdminDeploymentType =
    typeof evidenceCloudflare.adminDeploymentType === "string"
      ? evidenceCloudflare.adminDeploymentType.trim()
      : "";
  if (
    targetAdminWorker === evidenceAdminWorker &&
    targetAdminDeploymentType === evidenceAdminDeploymentType
  ) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:cloudflare-admin-worker",
      "external evidence matches Admin Worker target",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:cloudflare-admin-worker",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} Admin Worker target drifted`,
    );
    blockers.push(
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} Cloudflare Admin Worker target must match ${RELEASE_TARGETS_PATH}`,
    );
  }

  const targetNeon = isPlainObject(releaseTargets.neon)
    ? releaseTargets.neon
    : {};
  const evidenceNeon = isPlainObject(externalEvidence.neon)
    ? externalEvidence.neon
    : {};
  const targetProjectHint =
    typeof targetNeon.expectedProjectHint === "string"
      ? targetNeon.expectedProjectHint.trim()
      : "";
  const evidenceProjectHint =
    typeof evidenceNeon.expectedProjectHint === "string"
      ? evidenceNeon.expectedProjectHint.trim()
      : "";
  if (targetProjectHint === evidenceProjectHint) {
    addCheck(
      checks,
      "PASS",
      "release-target-manifest:neon-evidence",
      "external evidence matches Neon target",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "release-target-manifest:neon",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} Neon target drifted`,
    );
    blockers.push(
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} Neon target must match ${RELEASE_TARGETS_PATH}`,
    );
  }
};

const hasConnectorFallbackForCli = (label, evidence) => {
  if (!isPlainObject(evidence)) return false;

  if (label === "GitHub CLI") {
    const github = isPlainObject(evidence.github) ? evidence.github : {};
    return github.connectorReachable === true && github.appInstalled === true;
  }

  if (label === "Cloudflare Wrangler") {
    const cloudflare = isPlainObject(evidence.cloudflare)
      ? evidence.cloudflare
      : {};
    return (
      cloudflare.connectorReachable === true &&
      cloudflare.accountObserved === true
    );
  }

  if (label === "Neon CLI") {
    const neon = isPlainObject(evidence.neon) ? evidence.neon : {};
    return (
      neon.connectorReachable === true && neon.organizationObserved === true
    );
  }

  return false;
};

const checkExternalReleaseEvidence = (rootDir, checks, blockers, warnings) => {
  const evidencePath = path.join(rootDir, EXTERNAL_RELEASE_EVIDENCE_PATH);
  if (!fs.existsSync(evidencePath)) return;

  let evidence;
  try {
    evidence = readJson(evidencePath);
  } catch {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:json",
      "invalid JSON",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} is not valid JSON`,
    );
    return;
  }

  if (!isPlainObject(evidence)) {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:schema",
      "root must be an object",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} root must be an object`,
    );
    return;
  }

  if (evidence.schemaVersion === 1) {
    addCheck(checks, "PASS", "external-evidence:schema", "schemaVersion 1");
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:schema",
      "schemaVersion must be 1",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} schemaVersion must be 1`,
    );
  }

  if (evidence.secretsRedacted === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:secrets-redacted",
      "secret values are redacted",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:secrets-redacted",
      "secretsRedacted must be true",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} must confirm secret values are redacted`,
    );
  }

  if (containsRawSecretEvidenceValue(evidence)) {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:secret-values",
      "raw secret values may be present",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} must not contain raw secret values`,
    );
  } else {
    addCheck(
      checks,
      "PASS",
      "external-evidence:secret-values",
      "no raw secret values are declared or embedded",
    );
  }

  if (typeof evidence.observedAt === "string" && evidence.observedAt.trim()) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:observed-at",
      evidence.observedAt,
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:observed-at",
      "observedAt is missing",
      `${EXTERNAL_RELEASE_EVIDENCE_PATH} must include observedAt`,
    );
  }

  const github = isPlainObject(evidence.github) ? evidence.github : {};
  if (github.connectorReachable === true && github.appInstalled === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:github-app",
      "GitHub connector and app installation observed",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:github-app",
      "GitHub connector or app installation not proven",
      "GitHub connector evidence does not prove app installation",
    );
  }

  const protectedExistingRepositories = stringArray(
    github.protectedExistingRepositories,
  );
  const missingProtectedRepositories =
    REQUIRED_PROTECTED_EXISTING_REPOSITORIES.filter(
      (repositoryName) =>
        !protectedExistingRepositories.includes(repositoryName),
    );
  if (
    github.repositoryCreationRequired === true &&
    github.existingRepositoriesMustNotBeModified === true &&
    missingProtectedRepositories.length === 0
  ) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:github-repository-policy",
      `new GitHub repository required; protected existing repositories: ${protectedExistingRepositories.join(", ")}`,
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:github-repository-policy",
      missingProtectedRepositories.length > 0
        ? `protected repository evidence missing: ${missingProtectedRepositories.join(", ")}`
        : "new GitHub repository policy is not fully proven",
      `New GitHub repository policy is not proven; existing repositories such as ${REQUIRED_PROTECTED_EXISTING_REPOSITORIES.join(", ")} must not be modified`,
    );
  }

  if (github.repositoryMatched === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:github-repository",
      github.repositoryCreationRequired === true
        ? "new repository access is proven"
        : "expected repository access is proven",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:github-repository",
      github.repositoryCreationRequired === true
        ? "new GitHub repository access is not proven"
        : "expected repository access is not proven",
      github.repositoryCreationRequired === true
        ? `New GitHub repository creation/access is not proven; existing repositories such as ${REQUIRED_PROTECTED_EXISTING_REPOSITORIES.join(", ")} must not be modified`
        : "GitHub connector evidence does not prove expected repository access",
    );
  }

  if (github.writeAccessProven === true || github.pushProven === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:github-write-access",
      github.pushProven === true
        ? "authenticated git push is proven"
        : "GitHub connector write access is proven",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:github-write-access",
      "GitHub write or push access is not proven",
      "GitHub write or push access must be proven before release automation can use the new repository",
    );
  }

  const cloudflare = isPlainObject(evidence.cloudflare)
    ? evidence.cloudflare
    : {};
  if (
    cloudflare.connectorReachable === true &&
    cloudflare.accountObserved === true
  ) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:cloudflare-account",
      "Cloudflare connector and account observed",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:cloudflare-account",
      "Cloudflare connector or account not proven",
      "Cloudflare connector evidence does not prove account access",
    );
  }

  const missingWorkers = Array.isArray(cloudflare.missingWorkers)
    ? cloudflare.missingWorkers.filter((name) => typeof name === "string")
    : null;
  if (missingWorkers && missingWorkers.length === 0) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:cloudflare-workers",
      "required Workers observed",
    );
  } else {
    const detail = missingWorkers
      ? `missing: ${missingWorkers.join(", ")}`
      : "missingWorkers must be an array";
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:cloudflare-workers",
      detail,
      "Cloudflare Worker evidence is missing required Salary Hijacking Workers",
    );
  }

  if (cloudflare.adminWorkerMatched === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:cloudflare-admin-worker",
      "expected Admin OpenNext Worker observed",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:cloudflare-admin-worker",
      "expected Admin OpenNext Worker is not proven",
      "Cloudflare Admin Worker evidence does not prove the Salary Hijacking admin console exists",
    );
  }

  const neon = isPlainObject(evidence.neon) ? evidence.neon : {};
  if (neon.connectorReachable === true && neon.organizationObserved === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:neon-organization",
      "Neon connector and organization observed",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:neon-organization",
      "Neon connector or organization not proven",
      "Neon connector evidence does not prove organization access",
    );
  }

  if (neon.projectMatched === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:neon-project",
      "expected project observed",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:neon-project",
      "expected project is not proven",
      "Neon connector evidence does not prove a Salary Hijacking database project exists",
    );
  }

  if (typeof evidence.source !== "string" || evidence.source.trim() === "") {
    warnings.push(`${EXTERNAL_RELEASE_EVIDENCE_PATH} source is not documented`);
    addCheck(
      checks,
      "WARN",
      "external-evidence:source",
      "source is not documented",
    );
  }
};

const checkRuntimeTargetConsistency = (evidence, env, checks, blockers) => {
  if (!isPlainObject(evidence)) return;

  const github = isPlainObject(evidence.github) ? evidence.github : {};
  const expectedRepository =
    typeof github.expectedRepository === "string"
      ? github.expectedRepository.trim()
      : "";
  const runtimeRepository =
    typeof env.GITHUB_REPOSITORY === "string"
      ? env.GITHUB_REPOSITORY.trim()
      : "";

  if (expectedRepository && isUsableEnvValue(runtimeRepository)) {
    if (runtimeRepository === expectedRepository) {
      addCheck(
        checks,
        "PASS",
        "release-target:GITHUB_REPOSITORY",
        `matches expected GitHub repository ${expectedRepository}`,
      );
    } else {
      addCheck(
        checks,
        "BLOCKED",
        "release-target:GITHUB_REPOSITORY",
        `expected ${expectedRepository}; got ${runtimeRepository}`,
      );
      blockers.push(
        `GITHUB_REPOSITORY must match expected GitHub repository ${expectedRepository}`,
      );
    }

    const protectedSlugs = stringArray(
      github.protectedExistingRepositories,
    ).map(normalizeSlug);
    const runtimeRepositorySlug = normalizeSlug(
      lastRepositorySegment(runtimeRepository),
    );
    if (protectedSlugs.includes(runtimeRepositorySlug)) {
      addCheck(
        checks,
        "BLOCKED",
        "release-target:protected-github-repository",
        `${runtimeRepository} is a protected existing repository`,
      );
      blockers.push(
        `${runtimeRepository} is a protected existing repository and must not be used as the Salary Hijacking release target`,
      );
    }
  }

  const cloudflare = isPlainObject(evidence.cloudflare)
    ? evidence.cloudflare
    : {};
  const expectedAdminWorker =
    typeof cloudflare.expectedAdminWorker === "string"
      ? cloudflare.expectedAdminWorker.trim()
      : "";
  const runtimeAdminWorker =
    typeof env.CF_ADMIN_WORKER_NAME === "string"
      ? env.CF_ADMIN_WORKER_NAME.trim()
      : "";

  if (expectedAdminWorker && isUsableEnvValue(runtimeAdminWorker)) {
    if (runtimeAdminWorker === expectedAdminWorker) {
      addCheck(
        checks,
        "PASS",
        "release-target:CF_ADMIN_WORKER_NAME",
        `matches expected Cloudflare Admin Worker ${expectedAdminWorker}`,
      );
    } else {
      addCheck(
        checks,
        "BLOCKED",
        "release-target:CF_ADMIN_WORKER_NAME",
        `expected ${expectedAdminWorker}; got ${runtimeAdminWorker}`,
      );
      blockers.push(
        `CF_ADMIN_WORKER_NAME must match expected Cloudflare Admin Worker ${expectedAdminWorker}`,
      );
    }
  }
};

const readJsonIfPresent = (rootDir, relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return null;

  try {
    const value = readJson(filePath);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
};

const containsRawSecretEvidenceValue = (value) => {
  if (typeof value === "string") {
    const withoutAllowedEnvNames = REQUIRED_ENV_NAMES.reduce(
      (text, envName) => text.replaceAll(envName, ""),
      value,
    );
    return RAW_SECRET_VALUE_PATTERN.test(withoutAllowedEnvNames);
  }
  if (Array.isArray(value)) return value.some(containsRawSecretEvidenceValue);
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      isRawSecretEvidenceKey(key) &&
      typeof nestedValue === "string" &&
      nestedValue.trim().length > 0
    ) {
      return true;
    }

    if (containsRawSecretEvidenceValue(nestedValue)) return true;
  }

  return false;
};

const secretEvidenceEntryIsVerified = (entry) => {
  if (!isPlainObject(entry) || entry.verified !== true) return false;
  const stores = stringArray(entry.stores);
  return stores.length > 0;
};

const secretNameIsVerified = (evidence, envName) => {
  if (!isPlainObject(evidence)) return false;
  const secrets = isPlainObject(evidence.secrets) ? evidence.secrets : {};
  return secretEvidenceEntryIsVerified(secrets[envName]);
};

const unknownSecretEvidenceNames = (evidence) => {
  if (!isPlainObject(evidence)) return [];
  const secrets = isPlainObject(evidence.secrets) ? evidence.secrets : {};
  const requiredNames = new Set(REQUIRED_ENV_NAMES);
  return Object.keys(secrets).filter(
    (secretName) => !requiredNames.has(secretName),
  );
};

const unapprovedSecretStoreLabels = (evidence) => {
  if (!isPlainObject(evidence)) return [];
  const secrets = isPlainObject(evidence.secrets) ? evidence.secrets : {};
  const invalidLabels = [];

  for (const [secretName, entry] of Object.entries(secrets)) {
    if (!isPlainObject(entry) || entry.verified !== true) continue;
    const stores = stringArray(entry.stores);
    const allowedStores = new Set(DEFAULT_SECRET_STORES[secretName] ?? []);
    const invalidStores = stores.filter(
      (store) =>
        !APPROVED_SECRET_STORE_LABELS.has(store) || !allowedStores.has(store),
    );
    if (invalidStores.length > 0) {
      invalidLabels.push(`${secretName}: ${invalidStores.join(", ")}`);
    }
  }

  return invalidLabels;
};

const publicEvidenceKeyLooksUnsafe = (key) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return RAW_PUBLIC_PAGE_OR_SENSITIVE_KEY_TERMS.some((term) =>
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

const containsRawPublicPagePayloadOrSensitiveData = (value) => {
  if (Array.isArray(value)) {
    return value.some(containsRawPublicPagePayloadOrSensitiveData);
  }
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      publicEvidenceKeyLooksUnsafe(key) &&
      isNonBooleanEvidenceValue(nestedValue)
    ) {
      return true;
    }
    if (containsRawPublicPagePayloadOrSensitiveData(nestedValue)) return true;
  }

  return false;
};

const checkSecretsEvidence = (rootDir, checks, blockers) => {
  const evidence = readJsonIfPresent(rootDir, SECRETS_EVIDENCE_PATH);
  if (!evidence) {
    addCheck(
      checks,
      "BLOCKED",
      "secrets-evidence:schema",
      `${SECRETS_EVIDENCE_PATH} is missing or invalid`,
    );
    blockers.push(
      `${SECRETS_EVIDENCE_PATH} must record required runtime secret presence without values`,
    );
    return null;
  }

  if (evidence.schemaVersion === 1 && evidence.secretsRedacted === true) {
    addCheck(
      checks,
      "PASS",
      "secrets-evidence:schema",
      `${SECRETS_EVIDENCE_PATH} schema and redaction flag are valid`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "secrets-evidence:schema",
      `${SECRETS_EVIDENCE_PATH} schemaVersion or secretsRedacted is invalid`,
    );
    blockers.push(
      `${SECRETS_EVIDENCE_PATH} must use schemaVersion 1 and secretsRedacted=true`,
    );
    return null;
  }

  const rawSecretValuesFound =
    evidence.containsSecretValues !== false ||
    containsRawSecretEvidenceValue(evidence);
  if (rawSecretValuesFound) {
    addCheck(
      checks,
      "BLOCKED",
      "secrets-evidence:secret-values",
      "raw secret values may be present",
    );
    blockers.push(
      `${SECRETS_EVIDENCE_PATH} must not contain raw secret values`,
    );
    return null;
  }

  addCheck(
    checks,
    "PASS",
    "secrets-evidence:secret-values",
    "no raw secret values are declared or embedded",
  );

  const unknownSecretNames = unknownSecretEvidenceNames(evidence);
  if (unknownSecretNames.length > 0) {
    addCheck(
      checks,
      "BLOCKED",
      "secrets-evidence:secret-names",
      `unknown secret names: ${unknownSecretNames.join(", ")}`,
    );
    blockers.push(
      `${SECRETS_EVIDENCE_PATH} must not contain unknown or unrelated secret names`,
    );
    return null;
  }

  addCheck(
    checks,
    "PASS",
    "secrets-evidence:secret-names",
    "secret names match the approved runtime secret set",
  );

  const invalidStoreLabels = unapprovedSecretStoreLabels(evidence);
  if (invalidStoreLabels.length > 0) {
    addCheck(
      checks,
      "BLOCKED",
      "secrets-evidence:store-labels",
      `unapproved or secret-mismatched store labels: ${invalidStoreLabels.join("; ")}`,
    );
    blockers.push(
      `${SECRETS_EVIDENCE_PATH} must use approved secret store labels allowed for each verified entry`,
    );
    return null;
  }

  addCheck(
    checks,
    "PASS",
    "secrets-evidence:store-labels",
    "verified secret entries use approved secret store labels for their secret names",
  );

  const missingSecrets = REQUIRED_ENV_NAMES.filter(
    (envName) => !secretNameIsVerified(evidence, envName),
  );
  if (missingSecrets.length === 0) {
    addCheck(
      checks,
      "PASS",
      "secrets-evidence:required-secrets",
      "all required runtime secrets are verified without values",
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "secrets-evidence:required-secrets",
      `unverified: ${missingSecrets.join(", ")}`,
    );
    blockers.push(
      `${SECRETS_EVIDENCE_PATH} is missing verified entries for: ${missingSecrets.join(", ")}`,
    );
  }

  return evidence;
};

const addPublicUrlCheck = (checks, blockers, status, name, detail, blocker) => {
  addCheck(checks, status, name, detail);
  if (status === "BLOCKED") blockers.push(blocker);
};

const getExpectedPublicUrls = (releaseTargets) => {
  const targetPublicUrls = isPlainObject(releaseTargets?.publicUrls)
    ? releaseTargets.publicUrls
    : {};
  return Object.fromEntries(
    Object.entries(EXPECTED_PUBLIC_URLS).map(([key, fallback]) => [
      key,
      typeof targetPublicUrls[key] === "string" && targetPublicUrls[key].trim()
        ? targetPublicUrls[key].trim()
        : fallback,
    ]),
  );
};

const getExpectedMobileAppIdentity = (releaseTargets) => {
  const mobile = isPlainObject(releaseTargets?.mobile)
    ? releaseTargets.mobile
    : {};
  return {
    appSlug:
      typeof mobile.expectedAppSlug === "string" &&
      mobile.expectedAppSlug.trim()
        ? mobile.expectedAppSlug.trim()
        : EXPECTED_MOBILE_APP.slug,
    androidPackage:
      typeof mobile.expectedAndroidPackage === "string" &&
      mobile.expectedAndroidPackage.trim()
        ? mobile.expectedAndroidPackage.trim()
        : EXPECTED_MOBILE_APP.packageId,
    iosBundleIdentifier:
      typeof mobile.expectedIosBundleIdentifier === "string" &&
      mobile.expectedIosBundleIdentifier.trim()
        ? mobile.expectedIosBundleIdentifier.trim()
        : EXPECTED_MOBILE_APP.packageId,
  };
};

const mobileTreatsIosAsPostLaunch = (releaseTargets) => {
  const mobile = isPlainObject(releaseTargets?.mobile)
    ? releaseTargets.mobile
    : {};
  return (
    mobile.primaryReleasePlatform === "android" &&
    stringArray(mobile.postLaunchPlatforms).includes("ios")
  );
};

const checkPublicUrlEvidence = (rootDir, releaseTargets, checks, blockers) => {
  const evidence = readJsonIfPresent(rootDir, PUBLIC_URL_EVIDENCE_PATH);
  if (!evidence) {
    addPublicUrlCheck(
      checks,
      blockers,
      "BLOCKED",
      "public-url:evidence",
      `${PUBLIC_URL_EVIDENCE_PATH} is missing or invalid`,
      `${PUBLIC_URL_EVIDENCE_PATH} must record production public landing, legal, support, header, and non-exposure proof without raw page payloads`,
    );
    return;
  }

  if (evidence.schemaVersion === 1 && evidence.secretsRedacted === true) {
    addPublicUrlCheck(
      checks,
      blockers,
      "PASS",
      "public-url:evidence",
      `${PUBLIC_URL_EVIDENCE_PATH} schema and redaction flag are valid`,
      "",
    );
  } else {
    addPublicUrlCheck(
      checks,
      blockers,
      "BLOCKED",
      "public-url:evidence",
      `${PUBLIC_URL_EVIDENCE_PATH} schemaVersion or secretsRedacted is invalid`,
      `${PUBLIC_URL_EVIDENCE_PATH} must use schemaVersion 1 and secretsRedacted=true`,
    );
    return;
  }

  const rawEvidenceFound =
    evidence.containsSecretValues !== false ||
    containsRawSecretEvidenceValue(evidence) ||
    containsRawPublicPagePayloadOrSensitiveData(evidence);
  if (rawEvidenceFound) {
    addPublicUrlCheck(
      checks,
      blockers,
      "BLOCKED",
      "public-url:secret-values",
      "raw secrets, copied page payloads, or sensitive data may be present",
      `${PUBLIC_URL_EVIDENCE_PATH} must not contain raw secrets, copied page payloads, or sensitive user/financial data`,
    );
    return;
  }

  addPublicUrlCheck(
    checks,
    blockers,
    "PASS",
    "public-url:secret-values",
    "no raw secrets, copied page payloads, or sensitive data are declared or embedded",
    "",
  );

  const expectedUrls = getExpectedPublicUrls(releaseTargets);
  const evidenceUrls = isPlainObject(evidence.expectedUrls)
    ? evidence.expectedUrls
    : {};
  const urlMismatches = Object.entries(expectedUrls)
    .filter(([key, expectedValue]) => evidenceUrls[key] !== expectedValue)
    .map(([key, expectedValue]) => `${key} must be ${expectedValue}`);
  addPublicUrlCheck(
    checks,
    blockers,
    urlMismatches.length === 0 ? "PASS" : "BLOCKED",
    "public-url:targets",
    urlMismatches.length === 0
      ? "public URL evidence matches release target URLs"
      : urlMismatches.join("; "),
    "Public URL evidence must match release target landing, privacy, support, and terms URLs",
  );

  const reachability = isPlainObject(evidence.reachability)
    ? evidence.reachability
    : {};
  const reachabilityChecks = [
    {
      key: "landingReachable",
      name: "public-url:landing",
      pass: "public landing URL reachability proof is recorded",
      fail: "public landing URL reachability proof is missing",
      blocker: "Public landing URL must be reachable before store release",
    },
    {
      key: "privacyReachable",
      name: "public-url:privacy",
      pass: "privacy URL reachability proof is recorded",
      fail: "privacy URL reachability proof is missing",
      blocker: "Privacy URL must be reachable before store release",
    },
    {
      key: "supportReachable",
      name: "public-url:support",
      pass: "support URL reachability proof is recorded",
      fail: "support URL reachability proof is missing",
      blocker: "Support URL must be reachable before store release",
    },
    {
      key: "termsReachable",
      name: "public-url:terms",
      pass: "terms URL reachability proof is recorded",
      fail: "terms URL reachability proof is missing",
      blocker: "Terms URL must be reachable before store release",
    },
  ];
  for (const item of reachabilityChecks) {
    const ok = reachability[item.key] === true;
    addPublicUrlCheck(
      checks,
      blockers,
      ok ? "PASS" : "BLOCKED",
      item.name,
      ok ? item.pass : item.fail,
      item.blocker,
    );
  }

  const headers = isPlainObject(evidence.headers) ? evidence.headers : {};
  const headerChecks = [
    {
      key: "cspVerified",
      name: "public-url:csp",
      pass: "CSP header proof is recorded",
      fail: "CSP header proof is missing",
      blocker: "Public pages must have CSP proof before release",
    },
    {
      key: "privacyHeadersVerified",
      name: "public-url:privacy-headers",
      pass: "privacy and ads-safe header proof is recorded",
      fail: "privacy and ads-safe header proof is missing",
      blocker: "Public pages must prove privacy and ads-safe headers",
    },
    {
      key: "noIndexAbsentOnPublicPages",
      name: "public-url:noindex",
      pass: "public pages are not accidentally noindexed",
      fail: "public noindex absence proof is missing",
      blocker: "Store review public URLs must not be accidentally noindexed",
    },
  ];
  for (const item of headerChecks) {
    const ok = headers[item.key] === true;
    addPublicUrlCheck(
      checks,
      blockers,
      ok ? "PASS" : "BLOCKED",
      item.name,
      ok ? item.pass : item.fail,
      item.blocker,
    );
  }

  const content = isPlainObject(evidence.content) ? evidence.content : {};
  const contentChecks = [
    {
      key: "koreanCopyVerified",
      name: "public-url:korean-copy",
      pass: "Korean public page copy proof is recorded",
      fail: "Korean public page copy proof is missing",
      blocker: "Public pages must prove Korean app/store review copy",
    },
    {
      key: "storeReviewUrlsVerified",
      name: "public-url:store-review",
      pass: "store review URL proof is recorded",
      fail: "store review URL proof is missing",
      blocker: "Store metadata URLs must be verified before submission",
    },
    {
      key: "noSensitiveRawDataExposed",
      name: "public-url:sensitive-data",
      pass: "public sensitive data non-exposure proof is recorded",
      fail: "public sensitive data non-exposure proof is missing",
      blocker:
        "Public pages must prove no raw financial, personal, token, or device data is exposed",
    },
  ];
  for (const item of contentChecks) {
    const ok = content[item.key] === true;
    addPublicUrlCheck(
      checks,
      blockers,
      ok ? "PASS" : "BLOCKED",
      item.name,
      ok ? item.pass : item.fail,
      item.blocker,
    );
  }
};

const addSecurityAuditCheck = (
  checks,
  blockers,
  status,
  name,
  detail,
  blocker,
) => {
  addCheck(checks, status, name, detail);
  if (status === "BLOCKED") blockers.push(blocker);
};

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

const checkSecurityAuditEvidence = (rootDir, checks, blockers) => {
  const evidence = readJsonIfPresent(rootDir, SECURITY_AUDIT_EVIDENCE_PATH);
  if (!evidence) {
    addSecurityAuditCheck(
      checks,
      blockers,
      "BLOCKED",
      "security-audit:evidence",
      `${SECURITY_AUDIT_EVIDENCE_PATH} is missing or invalid`,
      `${SECURITY_AUDIT_EVIDENCE_PATH} must record dependency audit proof without raw registry tokens or advisory payloads`,
    );
    return;
  }

  if (evidence.schemaVersion === 1 && evidence.secretsRedacted === true) {
    addSecurityAuditCheck(
      checks,
      blockers,
      "PASS",
      "security-audit:evidence",
      `${SECURITY_AUDIT_EVIDENCE_PATH} schema and redaction flag are valid`,
      "",
    );
  } else {
    addSecurityAuditCheck(
      checks,
      blockers,
      "BLOCKED",
      "security-audit:evidence",
      `${SECURITY_AUDIT_EVIDENCE_PATH} schemaVersion or secretsRedacted is invalid`,
      `${SECURITY_AUDIT_EVIDENCE_PATH} must use schemaVersion 1 and secretsRedacted=true`,
    );
    return;
  }

  const rawSecretValuesFound =
    evidence.containsSecretValues !== false ||
    containsRawSecretEvidenceValue(evidence);
  if (rawSecretValuesFound) {
    addSecurityAuditCheck(
      checks,
      blockers,
      "BLOCKED",
      "security-audit:secret-values",
      "raw registry token or secret values may be present",
      `${SECURITY_AUDIT_EVIDENCE_PATH} must not contain raw registry tokens or secret values`,
    );
    return;
  }

  addSecurityAuditCheck(
    checks,
    blockers,
    "PASS",
    "security-audit:secret-values",
    "no raw registry tokens or secret values are declared or embedded",
    "",
  );

  const audit = isPlainObject(evidence.audit) ? evidence.audit : {};
  const packageManagerOk = audit.packageManager === "pnpm";
  const auditCommand =
    typeof audit.auditCommand === "string" ? audit.auditCommand : "";
  const commandOk =
    auditCommand.includes("pnpm audit") &&
    auditCommand.includes("--audit-level=high");
  const coverageOk =
    audit.registryAuditVerified === true &&
    audit.lockfileAudited === true &&
    audit.productionDependenciesAudited === true &&
    audit.devDependenciesAudited === true &&
    packageManagerOk &&
    commandOk;

  addSecurityAuditCheck(
    checks,
    blockers,
    coverageOk ? "PASS" : "BLOCKED",
    "security-audit:registry",
    coverageOk
      ? "pnpm dependency audit coverage proof is recorded"
      : "pnpm dependency audit coverage proof is missing or incomplete",
    "Dependency audit must prove pnpm registry audit coverage for lockfile, production dependencies, and dev dependencies before release",
  );

  const criticalCount = audit.criticalVulnerabilities;
  const highCount = audit.highVulnerabilities;
  const vulnerabilitiesOk =
    audit.noHighOrCriticalVulnerabilities === true &&
    criticalCount === 0 &&
    highCount === 0 &&
    isNonNegativeInteger(criticalCount) &&
    isNonNegativeInteger(highCount);

  addSecurityAuditCheck(
    checks,
    blockers,
    vulnerabilitiesOk ? "PASS" : "BLOCKED",
    "security-audit:vulnerabilities",
    vulnerabilitiesOk
      ? "dependency audit proves zero high and critical vulnerabilities"
      : "dependency audit does not prove zero high and critical vulnerabilities",
    "Dependency audit must prove zero high and critical vulnerabilities before release",
  );
};

const addCloudflareRuntimeCheck = (
  checks,
  blockers,
  status,
  name,
  detail,
  blocker,
) => {
  addCheck(checks, status, name, detail);
  if (status === "BLOCKED") blockers.push(blocker);
};

const checkCloudflareRuntimeEvidence = (
  rootDir,
  releaseTargets,
  checks,
  blockers,
) => {
  const evidence = readJsonIfPresent(rootDir, CLOUDFLARE_RUNTIME_EVIDENCE_PATH);
  if (!evidence) {
    addCloudflareRuntimeCheck(
      checks,
      blockers,
      "BLOCKED",
      "cloudflare-runtime:evidence",
      `${CLOUDFLARE_RUNTIME_EVIDENCE_PATH} is missing or invalid`,
      `${CLOUDFLARE_RUNTIME_EVIDENCE_PATH} must record Worker, R2, Queue, DNS, and certificate proof without secrets`,
    );
    return;
  }

  if (evidence.schemaVersion === 1 && evidence.secretsRedacted === true) {
    addCloudflareRuntimeCheck(
      checks,
      blockers,
      "PASS",
      "cloudflare-runtime:evidence",
      `${CLOUDFLARE_RUNTIME_EVIDENCE_PATH} schema and redaction flag are valid`,
      "",
    );
  } else {
    addCloudflareRuntimeCheck(
      checks,
      blockers,
      "BLOCKED",
      "cloudflare-runtime:evidence",
      `${CLOUDFLARE_RUNTIME_EVIDENCE_PATH} schemaVersion or secretsRedacted is invalid`,
      `${CLOUDFLARE_RUNTIME_EVIDENCE_PATH} must use schemaVersion 1 and secretsRedacted=true`,
    );
    return;
  }

  const rawSecretValuesFound =
    evidence.containsSecretValues !== false ||
    containsRawSecretEvidenceValue(evidence);
  if (rawSecretValuesFound) {
    addCloudflareRuntimeCheck(
      checks,
      blockers,
      "BLOCKED",
      "cloudflare-runtime:secret-values",
      "raw secret values may be present",
      `${CLOUDFLARE_RUNTIME_EVIDENCE_PATH} must not contain raw secret values`,
    );
    return;
  }

  addCloudflareRuntimeCheck(
    checks,
    blockers,
    "PASS",
    "cloudflare-runtime:secret-values",
    "no raw secret values are declared or embedded",
    "",
  );

  const targetCloudflare = isPlainObject(releaseTargets?.cloudflare)
    ? releaseTargets.cloudflare
    : {};
  const expectedWorkers = sortedStrings(targetCloudflare.expectedWorkers);
  const expectedAdminWorker =
    typeof targetCloudflare.expectedAdminWorker === "string"
      ? targetCloudflare.expectedAdminWorker.trim()
      : "";
  const workers = isPlainObject(evidence.workers) ? evidence.workers : {};
  const evidenceExpectedWorkers = sortedStrings(workers.expectedWorkers);
  const targetWorkersOk =
    expectedWorkers.length > 0 &&
    sameStringArray(evidenceExpectedWorkers, expectedWorkers);
  addCloudflareRuntimeCheck(
    checks,
    blockers,
    targetWorkersOk ? "PASS" : "BLOCKED",
    "cloudflare-runtime:target-workers",
    targetWorkersOk
      ? "Cloudflare runtime expected Workers match release targets"
      : `expected Workers drifted from release targets: evidence=${evidenceExpectedWorkers.join(", ") || "none"}; releaseTargets=${expectedWorkers.join(", ") || "none"}`,
    "Cloudflare runtime evidence must use the Salary Hijacking release target Worker names",
  );

  const observedWorkers = sortedStrings(workers.observedWorkers);
  const unexpectedWorkers = observedWorkers.filter(
    (worker) => !expectedWorkers.includes(worker),
  );
  addCloudflareRuntimeCheck(
    checks,
    blockers,
    unexpectedWorkers.length === 0 ? "PASS" : "BLOCKED",
    "cloudflare-runtime:worker-scope",
    unexpectedWorkers.length === 0
      ? "observed Workers are limited to the Salary Hijacking release target"
      : `unexpected Worker names observed: ${unexpectedWorkers.join(", ")}`,
    "Cloudflare runtime evidence must not include unrelated Worker resources",
  );

  const missingWorkers = expectedWorkers.filter(
    (worker) => !observedWorkers.includes(worker),
  );
  const workersVerified =
    expectedWorkers.length > 0 &&
    missingWorkers.length === 0 &&
    workers.productionDeployVerified === true;
  addCloudflareRuntimeCheck(
    checks,
    blockers,
    workersVerified ? "PASS" : "BLOCKED",
    "cloudflare-runtime:workers",
    workersVerified
      ? "required Workers are observed and production deploy proof is recorded"
      : `missing or unverified Workers: ${missingWorkers.join(", ") || expectedWorkers.join(", ") || "release target Workers"}`,
    "Cloudflare runtime evidence must prove required Salary Hijacking Workers and production deploys",
  );

  const adminWorkerVerified =
    expectedAdminWorker.length > 0 &&
    observedWorkers.includes(expectedAdminWorker) &&
    workers.adminWorkerVerified === true;
  addCloudflareRuntimeCheck(
    checks,
    blockers,
    adminWorkerVerified ? "PASS" : "BLOCKED",
    "cloudflare-runtime:admin-worker",
    adminWorkerVerified
      ? "Admin OpenNext Worker is observed"
      : "Admin OpenNext Worker proof is missing",
    "Cloudflare runtime evidence must prove the Salary Hijacking Admin OpenNext Worker",
  );

  const resources = isPlainObject(evidence.resources) ? evidence.resources : {};
  const expectedWorkerSecrets = isPlainObject(
    targetCloudflare.expectedWorkerSecrets,
  )
    ? targetCloudflare.expectedWorkerSecrets
    : {};
  const observedWorkerSecretBindings = isPlainObject(
    resources.workerSecretBindings,
  )
    ? resources.workerSecretBindings
    : {};
  const declaredMissingWorkerSecretBindings = isPlainObject(
    resources.missingWorkerSecretBindings,
  )
    ? resources.missingWorkerSecretBindings
    : {};
  const missingWorkerSecretBindings = [];
  const unexpectedWorkerSecretBindings = [];

  for (const worker of Object.keys(observedWorkerSecretBindings)) {
    if (!expectedWorkers.includes(worker)) {
      unexpectedWorkerSecretBindings.push(`${worker}:*`);
    }
  }

  for (const worker of expectedWorkers) {
    const expectedSecretNames = sortedStrings(expectedWorkerSecrets[worker]);
    const observedSecretNames = sortedStrings(
      observedWorkerSecretBindings[worker],
    );
    const declaredMissingSecretNames = sortedStrings(
      declaredMissingWorkerSecretBindings[worker],
    );
    for (const secretName of expectedSecretNames) {
      if (!observedSecretNames.includes(secretName)) {
        missingWorkerSecretBindings.push(`${worker}:${secretName}`);
      }
    }
    for (const secretName of declaredMissingSecretNames) {
      if (!missingWorkerSecretBindings.includes(`${worker}:${secretName}`)) {
        missingWorkerSecretBindings.push(`${worker}:${secretName}`);
      }
    }
    for (const secretName of observedSecretNames) {
      if (!expectedSecretNames.includes(secretName)) {
        unexpectedWorkerSecretBindings.push(`${worker}:${secretName}`);
      }
    }
  }

  const workerSecretBindingNamesComplete =
    Object.keys(expectedWorkerSecrets).length > 0 &&
    missingWorkerSecretBindings.length === 0 &&
    unexpectedWorkerSecretBindings.length === 0;
  const resourceChecks = [
    {
      key: "r2BucketsVerified",
      name: "cloudflare-runtime:r2-buckets",
      pass: "R2 bucket proof is recorded",
      fail: "R2 bucket proof is missing",
      blocker: "Cloudflare runtime evidence must prove required R2 buckets",
    },
    {
      key: "queuesVerified",
      name: "cloudflare-runtime:queues",
      pass: "Queue proof is recorded",
      fail: "Queue proof is missing",
      blocker: "Cloudflare runtime evidence must prove required Queues",
    },
    {
      key: "deadLetterQueuesVerified",
      name: "cloudflare-runtime:dead-letter-queues",
      pass: "dead-letter Queue proof is recorded",
      fail: "dead-letter Queue proof is missing",
      blocker:
        "Cloudflare runtime evidence must prove required dead-letter Queues",
    },
    {
      key: "cronTriggersVerified",
      name: "cloudflare-runtime:cron-triggers",
      pass: "cron trigger proof is recorded",
      fail: "cron trigger proof is missing",
      blocker:
        "Cloudflare runtime evidence must prove required Worker cron triggers",
    },
    {
      key: "workerSecretBindingsVerified",
      name: "cloudflare-runtime:worker-secret-bindings",
      pass: "Worker secret binding proof is recorded",
      fail: "Worker secret binding proof is missing",
      blocker:
        "Cloudflare runtime evidence must prove Worker secret bindings without values",
    },
  ];
  for (const resourceCheck of resourceChecks) {
    const ok =
      resourceCheck.key === "workerSecretBindingsVerified"
        ? resources[resourceCheck.key] === true &&
          workerSecretBindingNamesComplete
        : resources[resourceCheck.key] === true;
    const workerSecretBindingFailureDetail =
      missingWorkerSecretBindings.length > 0
        ? `missing Worker secret bindings: ${missingWorkerSecretBindings.join(", ")}`
        : unexpectedWorkerSecretBindings.length > 0
          ? `unexpected Worker secret bindings: ${unexpectedWorkerSecretBindings.join(", ")}`
          : resourceCheck.fail;
    addCloudflareRuntimeCheck(
      checks,
      blockers,
      ok ? "PASS" : "BLOCKED",
      resourceCheck.name,
      ok
        ? resourceCheck.pass
        : resourceCheck.key === "workerSecretBindingsVerified"
          ? workerSecretBindingFailureDetail
          : resourceCheck.fail,
      resourceCheck.blocker,
    );
  }

  const networking = isPlainObject(evidence.networking)
    ? evidence.networking
    : {};
  const expectedDomains = sortedStrings(EXPECTED_CLOUDFLARE_DOMAINS);
  const evidenceExpectedDomains = sortedStrings(networking.expectedDomains);
  const unexpectedDomains = evidenceExpectedDomains.filter(
    (domain) => !expectedDomains.includes(domain),
  );
  const missingDomains = expectedDomains.filter(
    (domain) => !evidenceExpectedDomains.includes(domain),
  );
  const domainsScoped =
    unexpectedDomains.length === 0 && missingDomains.length === 0;
  addCloudflareRuntimeCheck(
    checks,
    blockers,
    domainsScoped ? "PASS" : "BLOCKED",
    "cloudflare-runtime:domain-scope",
    domainsScoped
      ? "Cloudflare runtime expected domains match Salary Hijacking targets"
      : [
          unexpectedDomains.length > 0
            ? `unexpected Cloudflare domains: ${unexpectedDomains.join(", ")}`
            : "",
          missingDomains.length > 0
            ? `missing Cloudflare domains: ${missingDomains.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; "),
    "Cloudflare runtime evidence must use only Salary Hijacking custom domains",
  );

  const networkingChecks = [
    {
      key: "customDomainsVerified",
      name: "cloudflare-runtime:custom-domains",
      pass: "custom domain proof is recorded",
      fail: "custom domain proof is missing",
      blocker: "Cloudflare runtime evidence must prove required custom domains",
    },
    {
      key: "certificatesVerified",
      name: "cloudflare-runtime:certificates",
      pass: "certificate proof is recorded",
      fail: "certificate proof is missing",
      blocker:
        "Cloudflare runtime evidence must prove required TLS certificates",
    },
  ];
  for (const networkingCheck of networkingChecks) {
    const ok = networking[networkingCheck.key] === true;
    addCloudflareRuntimeCheck(
      checks,
      blockers,
      ok ? "PASS" : "BLOCKED",
      networkingCheck.name,
      ok ? networkingCheck.pass : networkingCheck.fail,
      networkingCheck.blocker,
    );
  }
};

const addDatabaseCheck = (checks, blockers, status, name, detail, blocker) => {
  addCheck(checks, status, name, detail);
  if (status === "BLOCKED") blockers.push(blocker);
};

const checkDatabaseEvidence = (
  rootDir,
  releaseTargets,
  migrationCount,
  checks,
  blockers,
) => {
  const evidence = readJsonIfPresent(rootDir, DATABASE_EVIDENCE_PATH);
  if (!evidence) {
    addDatabaseCheck(
      checks,
      blockers,
      "BLOCKED",
      "database:evidence",
      `${DATABASE_EVIDENCE_PATH} is missing or invalid`,
      `${DATABASE_EVIDENCE_PATH} must record Neon migration, seed, API smoke, and rollback evidence without raw database URLs`,
    );
    return;
  }

  if (evidence.schemaVersion === 1 && evidence.secretsRedacted === true) {
    addDatabaseCheck(
      checks,
      blockers,
      "PASS",
      "database:evidence",
      `${DATABASE_EVIDENCE_PATH} schema and redaction flag are valid`,
      "",
    );
  } else {
    addDatabaseCheck(
      checks,
      blockers,
      "BLOCKED",
      "database:evidence",
      `${DATABASE_EVIDENCE_PATH} schemaVersion or secretsRedacted is invalid`,
      `${DATABASE_EVIDENCE_PATH} must use schemaVersion 1 and secretsRedacted=true`,
    );
    return;
  }

  const rawSecretValuesFound =
    evidence.containsSecretValues !== false ||
    containsRawSecretEvidenceValue(evidence);
  if (rawSecretValuesFound) {
    addDatabaseCheck(
      checks,
      blockers,
      "BLOCKED",
      "database:secret-values",
      "raw database or secret values may be present",
      `${DATABASE_EVIDENCE_PATH} must not contain raw database URLs or secret values`,
    );
    return;
  }

  addDatabaseCheck(
    checks,
    blockers,
    "PASS",
    "database:secret-values",
    "no raw database URLs or secret values are declared or embedded",
    "",
  );

  const targetNeon = isPlainObject(releaseTargets?.neon)
    ? releaseTargets.neon
    : {};
  const expectedProjectHint =
    typeof targetNeon.expectedProjectHint === "string"
      ? targetNeon.expectedProjectHint.trim()
      : "";
  const neon = isPlainObject(evidence.neon) ? evidence.neon : {};
  const observedProjectHint =
    typeof neon.expectedProjectHint === "string"
      ? neon.expectedProjectHint.trim()
      : "";
  const neonProjectOk =
    expectedProjectHint.length > 0 &&
    observedProjectHint === expectedProjectHint &&
    neon.projectMatched === true;
  addDatabaseCheck(
    checks,
    blockers,
    neonProjectOk ? "PASS" : "BLOCKED",
    "database:neon-project",
    neonProjectOk
      ? `Neon project evidence matches ${expectedProjectHint}`
      : "Neon project proof is missing or mismatched",
    "Database evidence must prove the Salary Hijacking Neon project target",
  );

  const branchesOk =
    neon.mainBranchReady === true && neon.stagingBranchReady === true;
  addDatabaseCheck(
    checks,
    blockers,
    branchesOk ? "PASS" : "BLOCKED",
    "database:neon-branches",
    branchesOk
      ? "main and staging Neon branches are ready"
      : "main or staging Neon branch readiness proof is missing",
    "Database evidence must prove ready main and staging Neon branches",
  );

  const migrations = isPlainObject(evidence.migrations)
    ? evidence.migrations
    : {};
  const migrationFilesOk =
    migrations.migrationFilesVerified === true &&
    migrations.migrationFileCount === migrationCount &&
    migrationCount > 0;
  addDatabaseCheck(
    checks,
    blockers,
    migrationFilesOk ? "PASS" : "BLOCKED",
    "database:migration-files",
    migrationFilesOk
      ? `${migrationCount} migration files are verified`
      : "migration file evidence is missing or count drifted",
    "Database evidence must verify the checked-in migration file set",
  );

  const migrationValidationOk = migrations.migrationValidationVerified === true;
  addDatabaseCheck(
    checks,
    blockers,
    migrationValidationOk ? "PASS" : "BLOCKED",
    "database:migration-validation",
    migrationValidationOk
      ? "migration validation proof is recorded"
      : "migration validation proof is missing",
    "Database evidence must prove migration validation against a safe target",
  );

  const stagingMigrationOk = migrations.stagingMigrationExecuted === true;
  addDatabaseCheck(
    checks,
    blockers,
    stagingMigrationOk ? "PASS" : "BLOCKED",
    "database:staging-migration",
    stagingMigrationOk
      ? "staging migration execution proof is recorded"
      : "staging migration execution proof is missing",
    "Database evidence must prove staging migration execution before release",
  );

  const productionDryRunOk =
    migrations.productionMigrationDryRunVerified === true;
  addDatabaseCheck(
    checks,
    blockers,
    productionDryRunOk ? "PASS" : "BLOCKED",
    "database:production-migration-dry-run",
    productionDryRunOk
      ? "production migration dry-run proof is recorded"
      : "production migration dry-run proof is missing",
    "Database evidence must prove production migration dry-run before release",
  );

  const seeds = isPlainObject(evidence.seeds) ? evidence.seeds : {};
  const stagingSeedOk = seeds.stagingSeedExecuted === true;
  addDatabaseCheck(
    checks,
    blockers,
    stagingSeedOk ? "PASS" : "BLOCKED",
    "database:staging-seed",
    stagingSeedOk
      ? "staging seed execution proof is recorded"
      : "staging seed execution proof is missing",
    "Database evidence must prove staging seed execution before release",
  );

  const productionSeedSafe =
    seeds.productionSeedExecuted === false &&
    seeds.destructiveProductionSeedBlocked === true;
  addDatabaseCheck(
    checks,
    blockers,
    productionSeedSafe ? "PASS" : "BLOCKED",
    "database:production-seed-safety",
    productionSeedSafe
      ? "destructive production seed execution is blocked"
      : "production seed safety proof is missing",
    "Database evidence must prove destructive production seed execution is blocked",
  );

  const smoke = isPlainObject(evidence.smoke) ? evidence.smoke : {};
  const smokeChecks = [
    {
      key: "stagingApiSmokeVerified",
      name: "database:staging-api-smoke",
      pass: "staging API smoke proof is recorded",
      fail: "staging API smoke proof is missing",
      blocker:
        "Database evidence must prove staging API smoke against migrated data",
    },
    {
      key: "adminSmokeVerified",
      name: "database:admin-smoke",
      pass: "admin smoke proof is recorded",
      fail: "admin smoke proof is missing",
      blocker: "Database evidence must prove admin smoke against migrated data",
    },
    {
      key: "serverAuthoritySmokeVerified",
      name: "database:server-authority-smoke",
      pass: "server-authority smoke proof is recorded",
      fail: "server-authority smoke proof is missing",
      blocker:
        "Database evidence must prove server-authoritative payroll/budget smoke",
    },
    {
      key: "privacySmokeVerified",
      name: "database:privacy-smoke",
      pass: "privacy smoke proof is recorded",
      fail: "privacy smoke proof is missing",
      blocker: "Database evidence must prove privacy-safe API smoke responses",
    },
    {
      key: "noRawFinancialDataInSmokePayloads",
      name: "database:smoke-payload-redaction",
      pass: "smoke payload redaction proof is recorded",
      fail: "smoke payload redaction proof is missing",
      blocker:
        "Database evidence must prove smoke payloads do not expose raw sensitive financial data",
    },
  ];
  for (const smokeCheck of smokeChecks) {
    const ok = smoke[smokeCheck.key] === true;
    addDatabaseCheck(
      checks,
      blockers,
      ok ? "PASS" : "BLOCKED",
      smokeCheck.name,
      ok ? smokeCheck.pass : smokeCheck.fail,
      smokeCheck.blocker,
    );
  }

  const rollback = isPlainObject(evidence.rollback) ? evidence.rollback : {};
  const rollbackOk = rollback.rollbackRehearsalVerified === true;
  addDatabaseCheck(
    checks,
    blockers,
    rollbackOk ? "PASS" : "BLOCKED",
    "database:rollback-rehearsal",
    rollbackOk
      ? "database rollback rehearsal proof is recorded"
      : "database rollback rehearsal proof is missing",
    "Database evidence must prove rollback rehearsal before release",
  );
};

const readTextIfPresent = (rootDir, relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
};

const hasPngSignature = (filePath) => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const buffer = fs.readFileSync(filePath);
  return (
    buffer.length >= PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
};

const hasFontSignature = (filePath) => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const buffer = fs.readFileSync(filePath);
  return TTF_SIGNATURES.some(
    (signature) =>
      buffer.length >= signature.length &&
      buffer.subarray(0, signature.length).equals(signature),
  );
};

const readPngDimensions = (filePath) => {
  if (!hasPngSignature(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const fileSha256 = (filePath) => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return "";
  return createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
};

const getEasProfile = (easConfig, profileName) => {
  const build = isPlainObject(easConfig?.build) ? easConfig.build : {};
  return isPlainObject(build[profileName]) ? build[profileName] : {};
};

const getEasEnv = (profile) => (isPlainObject(profile.env) ? profile.env : {});

const addMobileCheck = (checks, blockers, status, name, detail, blocker) => {
  addCheck(checks, status, name, detail);
  if (status === "BLOCKED") blockers.push(blocker);
};

const regexEscape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasConstAssignment = (text, name, expectedValue) =>
  new RegExp(
    `const\\s+${regexEscape(name)}\\s*=\\s*["']${regexEscape(expectedValue)}["']`,
  ).test(text);

const hasAllText = (text, requiredValues) =>
  requiredValues.every((value) => text.includes(value));

const hasAssetPathFallback = (text, envName, fallbackConstName) =>
  new RegExp(
    `assetPathEnv\\(\\s*["']${regexEscape(envName)}["']\\s*,\\s*${regexEscape(fallbackConstName)}\\s*,?\\s*\\)`,
  ).test(text);

const isSubmissionTextClean = (text) =>
  !MOJIBAKE_PATTERN.test(text) && !SUBMISSION_PLACEHOLDER_PATTERN.test(text);

const checkMobileAppConfig = (rootDir, checks, blockers) => {
  const appConfigText = readTextIfPresent(rootDir, "apps/mobile/app.config.ts");
  if (!appConfigText) {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:app-config:file",
      "apps/mobile/app.config.ts is missing",
      "mobile app.config.ts must exist before app store submission",
    );
    return;
  }

  const identityOk =
    hasConstAssignment(
      appConfigText,
      "SERVICE_NAME",
      EXPECTED_MOBILE_APP.name,
    ) &&
    hasConstAssignment(
      appConfigText,
      "SERVICE_SLUG",
      EXPECTED_MOBILE_APP.slug,
    ) &&
    hasConstAssignment(
      appConfigText,
      "DEFAULT_SCHEME",
      EXPECTED_MOBILE_APP.scheme,
    ) &&
    appConfigText.includes('orientation: "portrait"');
  addMobileCheck(
    checks,
    blockers,
    identityOk ? "PASS" : "BLOCKED",
    "mobile:app-config:identity",
    identityOk
      ? "name, slug, scheme, and orientation are aligned"
      : "name, slug, scheme, or orientation is not aligned",
    "mobile app identity must be 급여납치 / salary-hijacking / salaryhijacking / portrait",
  );

  const bundleIdsOk =
    hasConstAssignment(
      appConfigText,
      "DEFAULT_IOS_BUNDLE_ID",
      EXPECTED_MOBILE_APP.packageId,
    ) &&
    hasConstAssignment(
      appConfigText,
      "DEFAULT_ANDROID_PACKAGE",
      EXPECTED_MOBILE_APP.packageId,
    );
  addMobileCheck(
    checks,
    blockers,
    bundleIdsOk ? "PASS" : "BLOCKED",
    "mobile:app-config:bundle-ids",
    bundleIdsOk
      ? EXPECTED_MOBILE_APP.packageId
      : "iOS bundle identifier or Android package is not aligned",
    `mobile iOS bundle identifier and Android package must be ${EXPECTED_MOBILE_APP.packageId}`,
  );

  const versioningOk =
    hasConstAssignment(
      appConfigText,
      "DEFAULT_VERSION",
      EXPECTED_MOBILE_APP.version,
    ) &&
    appConfigText.includes('runtimeVersion: { policy: "appVersion"') &&
    appConfigText.includes("versionCode") &&
    appConfigText.includes("buildNumber");
  addMobileCheck(
    checks,
    blockers,
    versioningOk ? "PASS" : "BLOCKED",
    "mobile:app-config:versioning",
    versioningOk
      ? "default version, runtime policy, build number, and version code are declared"
      : "version, runtime policy, build number, or version code is not aligned",
    "mobile app versioning must declare 1.0.0, appVersion runtime policy, iOS buildNumber, and Android versionCode",
  );

  const policyOk = hasAllText(appConfigText, [
    'const DEFAULT_API_VERSION = "v1"',
    `const DEFAULT_TIMEZONE = "${EXPECTED_MOBILE_APP.timezone}"`,
    `const DEFAULT_LOCALE = "${EXPECTED_MOBILE_APP.locale}"`,
    "serverAuthority: true",
    "financialAmountBasedTargeting: false",
    "contextualOnly: true",
  ]);
  addMobileCheck(
    checks,
    blockers,
    policyOk ? "PASS" : "BLOCKED",
    "mobile:app-config:policy",
    policyOk
      ? "API v1, Asia/Seoul, server authority, and contextual ads policy are declared"
      : "API, timezone, server authority, or ads/privacy policy is not aligned",
    "mobile app config must preserve API v1, Asia/Seoul, server authority, and contextual-only ads/privacy rules",
  );

  const launchAssetsOk = EXPECTED_MOBILE_APP_ASSET_REFERENCES.every(
    (asset) =>
      hasConstAssignment(appConfigText, asset.constName, asset.defaultPath) &&
      hasAssetPathFallback(appConfigText, asset.envName, asset.constName),
  );
  addMobileCheck(
    checks,
    blockers,
    launchAssetsOk ? "PASS" : "BLOCKED",
    "mobile:app-config:launch-assets",
    launchAssetsOk
      ? "app config launch asset fallbacks point to checked mobile PNG assets"
      : "app config launch asset fallback paths drift from checked mobile PNG assets",
    `mobile app.config.ts launch asset fallbacks must point to checked assets: ${EXPECTED_MOBILE_APP_ASSET_REFERENCES.map(
      (asset) => `${asset.constName}=${asset.defaultPath}`,
    ).join(", ")}`,
  );

  const textClean = isSubmissionTextClean(appConfigText);
  addMobileCheck(
    checks,
    blockers,
    textClean ? "PASS" : "BLOCKED",
    "mobile:app-config:text",
    textClean
      ? "no submission placeholder or mojibake markers found"
      : "submission placeholder or mojibake marker found",
    "mobile app.config.ts must not contain placeholder or mojibake text before app store submission",
  );
};

const checkStoreMetadata = (rootDir, checks, blockers) => {
  const googlePlayText = readTextIfPresent(
    rootDir,
    "release/store/google-play-metadata.md",
  );
  const googlePlayOk =
    typeof googlePlayText === "string" &&
    isSubmissionTextClean(googlePlayText) &&
    hasAllText(googlePlayText, [
      `app name: ${EXPECTED_MOBILE_APP.name}`,
      EXPECTED_MOBILE_APP.packageId,
      EXPECTED_MOBILE_APP.locale,
      "Finance",
      EXPECTED_MOBILE_APP.privacyUrl,
      EXPECTED_MOBILE_APP.supportEmail,
    ]);
  addMobileCheck(
    checks,
    blockers,
    googlePlayOk ? "PASS" : "BLOCKED",
    "mobile:store:google-play",
    googlePlayOk
      ? "Google Play metadata has identity, category, privacy, and support data"
      : "Google Play metadata is missing submission identity, privacy, or support data",
    "Google Play metadata must include 급여납치, package id, ko-KR, Finance, privacy URL, and support email without placeholders",
  );

  const appStoreText = readTextIfPresent(
    rootDir,
    "release/store/app-store-metadata.md",
  );
  const appStoreOk =
    typeof appStoreText === "string" &&
    isSubmissionTextClean(appStoreText) &&
    hasAllText(appStoreText, [
      `app name: ${EXPECTED_MOBILE_APP.name}`,
      EXPECTED_MOBILE_APP.packageId,
      EXPECTED_MOBILE_APP.locale,
      "Finance",
      EXPECTED_MOBILE_APP.privacyUrl,
      EXPECTED_MOBILE_APP.supportUrl,
      "https://salaryhijacking.com",
    ]);
  addMobileCheck(
    checks,
    blockers,
    appStoreOk ? "PASS" : "BLOCKED",
    "mobile:store:app-store",
    appStoreOk
      ? "App Store metadata has identity, category, privacy, support, and marketing data"
      : "App Store metadata is missing submission identity, privacy, support, or marketing data",
    "App Store metadata must include 급여납치, bundle id, ko-KR, Finance, privacy/support/marketing URLs without placeholders",
  );
};

const checkStoreSubmissionCompliance = (rootDir, checks, blockers) => {
  const dataSafetyText = readTextIfPresent(
    rootDir,
    "release/store/data-safety.md",
  );
  const dataSafetyOk =
    typeof dataSafetyText === "string" &&
    isSubmissionTextClean(dataSafetyText) &&
    hasAllText(dataSafetyText, [
      "Google Play Data safety",
      "Data collected:",
      "Data shared:",
      "no raw salary",
      "Encryption in transit:",
      "Data deletion requests:",
      "Third-party SDK review:",
      EXPECTED_MOBILE_APP.privacyUrl,
    ]);
  addMobileCheck(
    checks,
    blockers,
    dataSafetyOk ? "PASS" : "BLOCKED",
    "mobile:store:data-safety",
    dataSafetyOk
      ? "Google Play data safety declaration is ready for console entry"
      : "Google Play data safety declaration is missing required privacy facts",
    "release/store/data-safety.md must define collected data, sharing limits, encryption, deletion, SDK review, and privacy URL without placeholders",
  );

  const appPrivacyText = readTextIfPresent(
    rootDir,
    "release/store/app-privacy.md",
  );
  const appPrivacyOk =
    typeof appPrivacyText === "string" &&
    isSubmissionTextClean(appPrivacyText) &&
    hasAllText(appPrivacyText, [
      "App Store Privacy",
      "Data Used to Track You: None",
      "Data Linked to You:",
      "Data Not Linked to You:",
      "Financial Data:",
      "not used for advertising",
      "Tracking:",
      EXPECTED_MOBILE_APP.privacyUrl,
    ]);
  addMobileCheck(
    checks,
    blockers,
    appPrivacyOk ? "PASS" : "BLOCKED",
    "mobile:store:app-privacy",
    appPrivacyOk
      ? "App Store privacy nutrition label draft is ready for console entry"
      : "App Store privacy nutrition label draft is missing required data disclosures",
    "release/store/app-privacy.md must define tracking, linked data, unlinked data, financial data use, and privacy URL without placeholders",
  );

  const reviewNotesText = readTextIfPresent(
    rootDir,
    "release/store/review-notes.md",
  );
  const reviewNotesOk =
    typeof reviewNotesText === "string" &&
    isSubmissionTextClean(reviewNotesText) &&
    !REVIEW_NOTE_SECRET_PATTERN.test(reviewNotesText) &&
    hasAllText(reviewNotesText, [
      "Reviewer account email: reviewer@salaryhijacking.com",
      "Reviewer password: provide out-of-band",
      "Test data:",
      "salary home",
      "daily budget",
      "LV UP",
      "All displayed financial values are sample data",
      "Account deletion support",
    ]);
  addMobileCheck(
    checks,
    blockers,
    reviewNotesOk ? "PASS" : "BLOCKED",
    "mobile:store:review-notes",
    reviewNotesOk
      ? "store review notes describe safe reviewer access without committed secrets"
      : "store review notes are missing reviewer path data or contain committed secret-like text",
    "release/store/review-notes.md must include reviewer account, out-of-band password instruction, test path, sample-data note, and deletion support without secrets",
  );

  const contentRatingText = readTextIfPresent(
    rootDir,
    "release/store/content-rating.md",
  );
  const contentRatingOk =
    typeof contentRatingText === "string" &&
    isSubmissionTextClean(contentRatingText) &&
    hasAllText(contentRatingText, [
      "Category: Finance",
      "not directed to children",
      "User-generated content:",
      "reporting/moderation",
      "Ads:",
      "not provided",
      "Final age and content rating",
    ]);
  addMobileCheck(
    checks,
    blockers,
    contentRatingOk ? "PASS" : "BLOCKED",
    "mobile:store:content-rating",
    contentRatingOk
      ? "content rating notes disclose finance category, UGC, ads, and excluded content"
      : "content rating notes are missing finance, UGC, ads, or excluded-content disclosures",
    "release/store/content-rating.md must define category, audience, UGC moderation, ads, excluded risky content, and final console confirmation",
  );
};

const checkStoreScreenshotMaterials = (rootDir, checks, blockers) => {
  for (const screenshotName of REQUIRED_STORE_SCREENSHOT_ASSETS) {
    const screenshotPath = path.join(
      rootDir,
      "release",
      "screenshots",
      screenshotName,
    );
    const dimensions = readPngDimensions(screenshotPath);
    const screenshotBytes =
      dimensions && fs.existsSync(screenshotPath)
        ? fs.statSync(screenshotPath).size
        : 0;
    const screenshotOk =
      dimensions &&
      dimensions.width >= MIN_STORE_SCREENSHOT_WIDTH &&
      dimensions.height >= MIN_STORE_SCREENSHOT_HEIGHT &&
      screenshotBytes >= MIN_STORE_SCREENSHOT_BYTES;
    if (screenshotOk) {
      addMobileCheck(
        checks,
        blockers,
        "PASS",
        `mobile:store-screenshot:${screenshotName}`,
        `PNG store screenshot present (${dimensions.width}x${dimensions.height}, ${screenshotBytes} bytes)`,
      );
    } else {
      addMobileCheck(
        checks,
        blockers,
        "BLOCKED",
        `mobile:store-screenshot:${screenshotName}`,
        "missing, invalid, placeholder-sized, or too-small PNG store screenshot",
        `store screenshot must be a PNG at least ${MIN_STORE_SCREENSHOT_WIDTH}x${MIN_STORE_SCREENSHOT_HEIGHT} and ${MIN_STORE_SCREENSHOT_BYTES} bytes: release/screenshots/${screenshotName}`,
      );
    }
  }

  const featureGraphicPath = path.join(
    rootDir,
    "release",
    "screenshots",
    REQUIRED_STORE_FEATURE_GRAPHIC,
  );
  const featureGraphicDimensions = readPngDimensions(featureGraphicPath);
  const featureGraphicBytes =
    featureGraphicDimensions && fs.existsSync(featureGraphicPath)
      ? fs.statSync(featureGraphicPath).size
      : 0;
  const featureGraphicOk =
    featureGraphicDimensions?.width === REQUIRED_FEATURE_GRAPHIC_WIDTH &&
    featureGraphicDimensions.height === REQUIRED_FEATURE_GRAPHIC_HEIGHT &&
    featureGraphicBytes >= MIN_STORE_FEATURE_GRAPHIC_BYTES;
  if (featureGraphicOk) {
    addMobileCheck(
      checks,
      blockers,
      "PASS",
      "mobile:store-feature-graphic",
      `Google Play feature graphic PNG present (${REQUIRED_FEATURE_GRAPHIC_WIDTH}x${REQUIRED_FEATURE_GRAPHIC_HEIGHT}, ${featureGraphicBytes} bytes)`,
    );
  } else {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:store-feature-graphic",
      "missing, invalid, wrong-size, or too-small Google Play feature graphic PNG",
      `Google Play feature graphic must be a ${REQUIRED_FEATURE_GRAPHIC_WIDTH}x${REQUIRED_FEATURE_GRAPHIC_HEIGHT} PNG with at least ${MIN_STORE_FEATURE_GRAPHIC_BYTES} bytes: release/screenshots/${REQUIRED_STORE_FEATURE_GRAPHIC}`,
    );
  }

  const screenshotPlanText = readTextIfPresent(
    rootDir,
    "release/screenshots/screenshot-plan.md",
  );
  const screenshotPlanOk =
    typeof screenshotPlanText === "string" &&
    isSubmissionTextClean(screenshotPlanText) &&
    hasAllText(screenshotPlanText, [
      "real app UI",
      "masked sample data",
      "Raw salary",
      "profit guarantees",
      ...REQUIRED_STORE_SCREENSHOT_ASSETS,
      REQUIRED_STORE_FEATURE_GRAPHIC,
    ]);
  addMobileCheck(
    checks,
    blockers,
    screenshotPlanOk ? "PASS" : "BLOCKED",
    "mobile:screenshot-plan",
    screenshotPlanOk
      ? "screenshot plan names required files and review safety rules"
      : "screenshot plan is missing required files or safety rules",
    "release/screenshots/screenshot-plan.md must name required screenshot files and safety rules without placeholders or mojibake",
  );

  const screenshotGuidelineText = readTextIfPresent(
    rootDir,
    "assets/store/screenshots-guideline.md",
  );
  const screenshotGuidelineOk =
    typeof screenshotGuidelineText === "string" &&
    isSubmissionTextClean(screenshotGuidelineText) &&
    hasAllText(screenshotGuidelineText, [
      EXPECTED_MOBILE_APP.name,
      "Finance app",
      "Minimum phone screenshots: 5",
      "Recommended phone screenshots: 8",
      REQUIRED_STORE_FEATURE_GRAPHIC,
      "sample data only",
      "actual mobile screens",
      "Export PNG images",
    ]);
  addMobileCheck(
    checks,
    blockers,
    screenshotGuidelineOk ? "PASS" : "BLOCKED",
    "mobile:screenshot-guideline",
    screenshotGuidelineOk
      ? "screenshot guideline has store count, feature graphic, privacy, and export rules"
      : "screenshot guideline is missing store count, feature graphic, privacy, or export rules",
    "assets/store/screenshots-guideline.md must define screenshot counts, feature graphic, sample-data-only, actual-screen, and PNG export rules",
  );
};

const checkMobileNativeEvidence = (
  rootDir,
  releaseTargets,
  checks,
  blockers,
  commandExists,
) => {
  const evidence = readJsonIfPresent(rootDir, MOBILE_NATIVE_EVIDENCE_PATH);
  if (!evidence) {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:native:evidence",
      `${MOBILE_NATIVE_EVIDENCE_PATH} is missing or invalid`,
      `${MOBILE_NATIVE_EVIDENCE_PATH} must record local Android tooling or EAS/native release evidence without secrets`,
    );
    return;
  }

  if (evidence.schemaVersion === 1 && evidence.secretsRedacted === true) {
    addMobileCheck(
      checks,
      blockers,
      "PASS",
      "mobile:native:evidence",
      `${MOBILE_NATIVE_EVIDENCE_PATH} schema and secret redaction flag are valid`,
    );
  } else {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:native:evidence",
      `${MOBILE_NATIVE_EVIDENCE_PATH} schemaVersion or secretsRedacted is invalid`,
      `${MOBILE_NATIVE_EVIDENCE_PATH} must use schemaVersion 1 and secretsRedacted=true`,
    );
  }

  const hasSecretValues =
    evidence.containsSecretValues !== false ||
    containsRawSecretEvidenceValue(evidence);
  if (hasSecretValues) {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:native:secret-values",
      "raw native release secrets may be present",
      `${MOBILE_NATIVE_EVIDENCE_PATH} must not contain raw native release secrets`,
    );
  } else {
    addMobileCheck(
      checks,
      blockers,
      "PASS",
      "mobile:native:secret-values",
      "no raw native release secrets are declared or embedded",
    );
  }

  const privacy = isPlainObject(evidence.privacy) ? evidence.privacy : {};
  const unsafePrivacyFlagNames = [
    "containsEasToken",
    "containsStoreCredential",
    "containsBinaryDownloadUrl",
    "containsReviewerPassword",
  ].filter((flagName) => privacy[flagName] === true);
  addMobileCheck(
    checks,
    blockers,
    unsafePrivacyFlagNames.length === 0 ? "PASS" : "BLOCKED",
    "mobile:native:privacy-flags",
    unsafePrivacyFlagNames.length === 0
      ? "native release privacy flags declare no embedded credentials or artifact URLs"
      : `unsafe native release privacy flags are true: ${unsafePrivacyFlagNames.join(", ")}`,
    `${MOBILE_NATIVE_EVIDENCE_PATH} must not declare native release secret or artifact privacy flags`,
  );

  const expectedAppIdentity = getExpectedMobileAppIdentity(releaseTargets);
  const appIdentity = isPlainObject(evidence.appIdentity)
    ? evidence.appIdentity
    : {};
  const appIdentityMismatches = Object.entries(expectedAppIdentity)
    .filter(([key, expectedValue]) => appIdentity[key] !== expectedValue)
    .map(([key, expectedValue]) => `${key} must be ${expectedValue}`);
  addMobileCheck(
    checks,
    blockers,
    appIdentityMismatches.length === 0 ? "PASS" : "BLOCKED",
    "mobile:native:app-identity",
    appIdentityMismatches.length === 0
      ? "mobile native evidence app identity matches release targets"
      : `mobile native evidence app identity drifted: ${appIdentityMismatches.join(", ")}`,
    "mobile native evidence must match release target app identity before native build, E2E, or store proof can satisfy release readiness",
  );

  const android = isPlainObject(evidence.android) ? evidence.android : {};
  const ios = isPlainObject(evidence.ios) ? evidence.ios : {};
  const localAdbAvailable = commandExists("adb");
  const localEmulatorAvailable = commandExists("emulator");

  const androidBuildOk =
    android.productionBuildVerified === true &&
    android.productionBuildProfile === "production" &&
    android.productionArtifactType === "aab";
  addMobileCheck(
    checks,
    blockers,
    androidBuildOk ? "PASS" : "BLOCKED",
    "mobile:native:android-build",
    androidBuildOk
      ? "Android production EAS build evidence is verified as an AAB"
      : "Android production EAS AAB build evidence is missing",
    "Android production EAS build must be verified as an app-bundle/AAB before Play Store release",
  );

  const androidE2eEvidenceOk =
    android.nativeE2eVerified === true &&
    typeof android.nativeE2eConfiguration === "string" &&
    android.nativeE2eConfiguration.trim().length > 0;
  addMobileCheck(
    checks,
    blockers,
    androidE2eEvidenceOk ? "PASS" : "BLOCKED",
    "mobile:native:android-e2e",
    androidE2eEvidenceOk
      ? "Android native E2E evidence is verified"
      : localAdbAvailable && localEmulatorAvailable
        ? "Android native E2E proof is missing; local adb/emulator are available for execution"
        : "Android native E2E evidence is missing and local adb/emulator are unavailable",
    "Android native E2E must pass locally with adb/emulator or be proven by EAS/native test evidence before release",
  );

  const androidSubmitOk = android.storeSubmitDryRunVerified === true;
  addMobileCheck(
    checks,
    blockers,
    androidSubmitOk ? "PASS" : "BLOCKED",
    "mobile:native:android-submit",
    androidSubmitOk
      ? "Android store submit dry-run evidence is verified"
      : "Android store submit dry-run evidence is missing",
    "Android Play Store submit dry-run or console-ready submission evidence must be verified before release",
  );

  const iosPostLaunch = mobileTreatsIosAsPostLaunch(releaseTargets);
  const iosBuildOk =
    ios.productionBuildVerified === true &&
    ios.productionBuildProfile === "production";
  addMobileCheck(
    checks,
    blockers,
    iosBuildOk || iosPostLaunch ? "PASS" : "BLOCKED",
    "mobile:native:ios-build",
    iosBuildOk
      ? "iOS production EAS build evidence is verified"
      : iosPostLaunch
        ? "iOS production EAS build is tracked as post-launch for the Android-first Google Play release"
        : "iOS production EAS build evidence is missing",
    "iOS production EAS build evidence must be verified before App Store release",
  );

  const iosSubmitOk = ios.storeSubmitDryRunVerified === true;
  addMobileCheck(
    checks,
    blockers,
    iosSubmitOk || iosPostLaunch ? "PASS" : "BLOCKED",
    "mobile:native:ios-submit",
    iosSubmitOk
      ? "iOS store submit dry-run evidence is verified"
      : iosPostLaunch
        ? "iOS store submit proof is tracked as post-launch for the Android-first Google Play release"
        : "iOS store submit dry-run evidence is missing",
    "iOS App Store submit dry-run or console-ready submission evidence must be verified before release",
  );
};

const checkMobileReleaseReadiness = (
  rootDir,
  releaseTargets,
  checks,
  blockers,
  commandExists,
) => {
  const mobileRoot = path.join(rootDir, "apps", "mobile");
  for (const assetName of REQUIRED_MOBILE_ASSETS) {
    const assetPath = path.join(mobileRoot, "assets", assetName);
    const dimensions = readPngDimensions(assetPath);
    const bytes =
      dimensions && fs.existsSync(assetPath) ? fs.statSync(assetPath).size : 0;
    const requirements = REQUIRED_MOBILE_ASSET_REQUIREMENTS[assetName];
    const assetOk =
      dimensions &&
      requirements &&
      dimensions.width >= requirements.minWidth &&
      dimensions.height >= requirements.minHeight &&
      bytes >= requirements.minBytes;
    if (assetOk) {
      addMobileCheck(
        checks,
        blockers,
        "PASS",
        `mobile:asset:${assetName}`,
        `${requirements.label} PNG asset present (${dimensions.width}x${dimensions.height}, ${bytes} bytes)`,
      );
    } else {
      addMobileCheck(
        checks,
        blockers,
        "BLOCKED",
        `mobile:asset:${assetName}`,
        "missing, invalid, placeholder-sized, or too-small mobile launch PNG asset",
        `mobile launch asset must be a PNG at least ${requirements.minWidth}x${requirements.minHeight} and ${requirements.minBytes} bytes: apps/mobile/assets/${assetName}`,
      );
    }
  }

  const officialBiPath = path.join(mobileRoot, OFFICIAL_BI_LOGO_ASSET);
  const officialBiOk =
    hasPngSignature(officialBiPath) &&
    fileSha256(officialBiPath) === OFFICIAL_BI_LOGO_SHA256;
  addMobileCheck(
    checks,
    blockers,
    officialBiOk ? "PASS" : "BLOCKED",
    "mobile:asset:official-bi-logo",
    officialBiOk
      ? "official BI PNG hash matches user-provided source"
      : "official BI logo is missing, invalid, or hash-mismatched",
    `mobile official BI logo must match user-provided SHA256 ${OFFICIAL_BI_LOGO_SHA256}`,
  );

  for (const fontName of REQUIRED_FREESENTATION_FONT_ASSETS) {
    const fontPath = path.join(mobileRoot, "assets", "fonts", fontName);
    const fontOk =
      hasFontSignature(fontPath) &&
      fs.statSync(fontPath).size >= MIN_FREESENTATION_FONT_BYTES;
    addMobileCheck(
      checks,
      blockers,
      fontOk ? "PASS" : "BLOCKED",
      `mobile:font:${fontName}`,
      fontOk
        ? "Freesentation font asset is present and valid"
        : "Freesentation font asset is missing, invalid, or too small",
      `Freesentation font asset must be bundled as a valid TTF: apps/mobile/assets/fonts/${fontName}`,
    );
  }

  checkMobileAppConfig(rootDir, checks, blockers);
  checkStoreMetadata(rootDir, checks, blockers);
  checkStoreSubmissionCompliance(rootDir, checks, blockers);
  checkStoreScreenshotMaterials(rootDir, checks, blockers);

  const easConfig = readJsonIfPresent(rootDir, "apps/mobile/eas.json");
  if (!easConfig) {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:eas:json",
      "apps/mobile/eas.json is missing or invalid",
      "apps/mobile/eas.json must be valid JSON for mobile release",
    );
    return;
  }

  const production = getEasProfile(easConfig, "production");
  const productionEnv = getEasEnv(production);
  const productionAndroid = isPlainObject(production.android)
    ? production.android
    : {};

  if (
    productionEnv.EXPO_PUBLIC_API_BASE_URL ===
    EXPECTED_MOBILE_EAS.productionApiBaseUrl
  ) {
    addMobileCheck(
      checks,
      blockers,
      "PASS",
      "mobile:eas:production-api",
      EXPECTED_MOBILE_EAS.productionApiBaseUrl,
    );
  } else {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:eas:production-api",
      `expected ${EXPECTED_MOBILE_EAS.productionApiBaseUrl}`,
      `mobile production API base URL must be ${EXPECTED_MOBILE_EAS.productionApiBaseUrl}`,
    );
  }

  if (
    productionEnv.EXPO_PUBLIC_DEEPLINK_HOST ===
    EXPECTED_MOBILE_EAS.productionDeeplinkHost
  ) {
    addMobileCheck(
      checks,
      blockers,
      "PASS",
      "mobile:eas:production-deeplink",
      EXPECTED_MOBILE_EAS.productionDeeplinkHost,
    );
  } else {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:eas:production-deeplink",
      `expected ${EXPECTED_MOBILE_EAS.productionDeeplinkHost}`,
      `mobile production deeplink host must be ${EXPECTED_MOBILE_EAS.productionDeeplinkHost}`,
    );
  }

  if (productionAndroid.buildType === "app-bundle") {
    addMobileCheck(
      checks,
      blockers,
      "PASS",
      "mobile:eas:production-android",
      "Android production buildType is app-bundle",
    );
  } else {
    addMobileCheck(
      checks,
      blockers,
      "BLOCKED",
      "mobile:eas:production-android",
      "Android production buildType must be app-bundle",
      "mobile production Android build must use app-bundle for Play Store release",
    );
  }

  for (const profileName of ["preview", "staging", "e2e"]) {
    const profile = getEasProfile(easConfig, profileName);
    const env = getEasEnv(profile);
    const apiOk =
      env.EXPO_PUBLIC_API_BASE_URL === EXPECTED_MOBILE_EAS.stagingApiBaseUrl;
    const deeplinkOk =
      env.EXPO_PUBLIC_DEEPLINK_HOST === EXPECTED_MOBILE_EAS.stagingDeeplinkHost;

    if (apiOk && deeplinkOk) {
      addMobileCheck(
        checks,
        blockers,
        "PASS",
        `mobile:eas:${profileName}`,
        "staging API and deeplink targets are aligned",
      );
    } else {
      addMobileCheck(
        checks,
        blockers,
        "BLOCKED",
        `mobile:eas:${profileName}`,
        "staging API or deeplink target is not aligned",
        `mobile ${profileName} EAS profile must target ${EXPECTED_MOBILE_EAS.stagingApiBaseUrl} and ${EXPECTED_MOBILE_EAS.stagingDeeplinkHost}`,
      );
    }
  }

  checkMobileNativeEvidence(
    rootDir,
    releaseTargets,
    checks,
    blockers,
    commandExists,
  );
};

export const analyzeReleaseReadiness = ({
  rootDir = process.cwd(),
  env = process.env,
  commandExists = (command) => findCommandOnPath(command, env),
  gitStatus = () => defaultGitStatus(rootDir),
  gitRemote = () => defaultGitRemote(rootDir),
  gitHead = () => defaultGitHead(rootDir),
  gitRemoteHead = () => defaultGitRemoteHead(rootDir),
  gitRemoteTrackingHead = () => defaultGitRemoteTrackingHead(rootDir),
} = {}) => {
  const checks = [];
  const blockers = [];
  const warnings = [];

  const packagePath = path.join(rootDir, "package.json");
  if (!fs.existsSync(packagePath)) {
    addCheck(checks, "BLOCKED", "root package.json", "package.json is missing");
    blockers.push("root package.json is missing");
  } else {
    const pkg = readJson(packagePath);
    addCheck(checks, "PASS", "root package.json", "package.json parsed");

    for (const scriptName of REQUIRED_ROOT_SCRIPTS) {
      if (typeof pkg.scripts?.[scriptName] === "string") {
        addCheck(checks, "PASS", `script:${scriptName}`, "script is defined");
      } else {
        addCheck(
          checks,
          "BLOCKED",
          `script:${scriptName}`,
          "script is missing",
        );
        blockers.push(`root script '${scriptName}' is missing`);
      }
    }
  }

  for (const relativePath of REQUIRED_FILES) {
    if (pathExists(rootDir, relativePath)) {
      addCheck(checks, "PASS", `file:${relativePath}`, "required file exists");
    } else {
      addCheck(
        checks,
        "BLOCKED",
        `file:${relativePath}`,
        "required file is missing",
      );
      blockers.push(`required release artifact is missing: ${relativePath}`);
    }
  }

  const migrationsDir = path.join(rootDir, "database", "migrations");
  const migrationCount = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"))
        .length
    : 0;
  if (migrationCount > 0) {
    addCheck(
      checks,
      "PASS",
      "database:migrations",
      `${migrationCount} SQL migrations found`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      "database:migrations",
      "no SQL migrations found",
    );
    blockers.push("database migrations are missing");
  }

  const { names: envExampleNames, text: envExampleText } =
    collectEnvExampleNames(rootDir);
  if (envExampleNames.size > 0) {
    addCheck(
      checks,
      "PASS",
      ".env.example",
      `${envExampleNames.size} env names documented`,
    );
  } else {
    addCheck(
      checks,
      "BLOCKED",
      ".env.example",
      ".env.example is missing or empty",
    );
    blockers.push(".env.example is missing or empty");
  }

  const secretsEvidence = checkSecretsEvidence(rootDir, checks, blockers);

  for (const envName of REQUIRED_ENV_NAMES) {
    if (envExampleNames.has(envName)) {
      addCheck(
        checks,
        "PASS",
        `env-doc:${envName}`,
        "documented in .env.example",
      );
    } else {
      addCheck(
        checks,
        "BLOCKED",
        `env-doc:${envName}`,
        "missing from .env.example",
      );
      blockers.push(`${envName} is not documented in .env.example`);
    }

    if (isUsableEnvValue(env[envName])) {
      addCheck(
        checks,
        "PASS",
        `env-runtime:${envName}`,
        "runtime value present",
      );
    } else if (secretNameIsVerified(secretsEvidence, envName)) {
      addCheck(
        checks,
        "PASS",
        `env-runtime:${envName}`,
        "verified in secret evidence",
      );
    } else {
      addCheck(
        checks,
        "BLOCKED",
        `env-runtime:${envName}`,
        "runtime value missing or secret evidence unverified",
      );
      blockers.push(
        `${envName} runtime value is missing or secret evidence is unverified`,
      );
    }
  }

  const unsafePublicEnv = envExampleText.match(PUBLIC_SECRET_ENV_PATTERN)?.[0];
  if (unsafePublicEnv) {
    addCheck(checks, "BLOCKED", "env-public-secret-guard", unsafePublicEnv);
    blockers.push(
      `unsafe public secret env name is documented: ${unsafePublicEnv}`,
    );
  } else {
    addCheck(
      checks,
      "PASS",
      "env-public-secret-guard",
      "no public secret env names found",
    );
  }

  const releaseTargets = checkReleaseTargets(rootDir, checks, blockers);
  checkExternalReleaseEvidence(rootDir, checks, blockers, warnings);
  const externalEvidence = readExternalReleaseEvidence(rootDir);
  checkEvidenceMatchesReleaseTargets(
    releaseTargets,
    externalEvidence,
    checks,
    blockers,
  );
  checkCloudflareRuntimeEvidence(rootDir, releaseTargets, checks, blockers);
  checkDatabaseEvidence(
    rootDir,
    releaseTargets,
    migrationCount,
    checks,
    blockers,
  );
  checkPublicUrlEvidence(rootDir, releaseTargets, checks, blockers);
  checkSecurityAuditEvidence(rootDir, checks, blockers);
  checkRuntimeTargetConsistency(
    releaseTargets ?? externalEvidence,
    env,
    checks,
    blockers,
  );
  checkMobileReleaseReadiness(
    rootDir,
    releaseTargets,
    checks,
    blockers,
    commandExists,
  );

  for (const group of REQUIRED_CLI_GROUPS) {
    const found = group.commands.filter((command) => commandExists(command));
    const localPaths = existingLocalPaths(rootDir, group.localPaths);
    const ok =
      group.any === true
        ? found.length > 0 || localPaths.length > 0
        : found.length === group.commands.length || localPaths.length > 0;
    if (ok) {
      const detail =
        found.length > 0
          ? `available: ${found.join(", ")}`
          : `available locally: ${localPaths.join(", ")}`;
      addCheck(checks, "PASS", `cli:${group.label}`, detail);
    } else {
      const missing = group.commands.filter(
        (command) => !found.includes(command),
      );

      if (hasConnectorFallbackForCli(group.label, externalEvidence)) {
        addCheck(
          checks,
          "WARN",
          `cli:${group.label}`,
          `missing: ${missing.join(" or ")}; connector evidence observed`,
        );
        warnings.push(
          `${group.label} is not available on PATH, but connector evidence proves account access`,
        );
        continue;
      }

      addCheck(
        checks,
        "BLOCKED",
        `cli:${group.label}`,
        `missing: ${missing.join(" or ")}`,
      );
      blockers.push(
        `${group.label} is not available on PATH (${group.commands.join(" or ")})`,
      );
    }
  }

  const git = gitStatus();
  if (git.ok) {
    const detail =
      git.output.length > 0
        ? "git repository has local changes"
        : "git repository visible";
    addCheck(
      checks,
      git.output.length > 0 ? "WARN" : "PASS",
      "git:status",
      detail,
    );
    if (git.output.length > 0)
      warnings.push("git repository has local changes");

    const expectedRepository = getExpectedGithubRepository(
      releaseTargets ?? externalEvidence,
    );
    if (expectedRepository) {
      const remote = gitRemote();
      if (!remote.ok || remote.output.length === 0) {
        addCheck(
          checks,
          "BLOCKED",
          "git:remote-origin",
          `git remote origin is not configured for ${expectedRepository}`,
        );
        blockers.push(
          `git remote origin must point to expected GitHub repository ${expectedRepository}`,
        );
      } else if (
        gitRemoteMatchesRepository(remote.output, expectedRepository)
      ) {
        addCheck(
          checks,
          "PASS",
          "git:remote-origin",
          `origin matches expected GitHub repository ${expectedRepository}`,
        );

        const githubEvidence = isPlainObject(externalEvidence?.github)
          ? externalEvidence.github
          : {};
        const pushProofClaimed =
          githubEvidence.pushProven === true ||
          typeof githubEvidence.pushProofCommit === "string";

        if (pushProofClaimed) {
          const localHead = gitHead();
          const remoteHead = gitRemoteHead();
          const localSha = localHead.ok ? parseGitSha(localHead.output) : "";
          let remoteSha = remoteHead.ok ? parseGitSha(remoteHead.output) : "";
          let remoteSource = "origin/main";
          let remoteStatus = "PASS";

          if (!remoteSha) {
            const trackingHead = gitRemoteTrackingHead();
            const trackingSha = trackingHead.ok
              ? parseGitSha(trackingHead.output)
              : "";

            if (trackingSha) {
              remoteSha = trackingSha;
              remoteSource = "local origin/main tracking ref";
              remoteStatus = "WARN";
              warnings.push(
                "live origin/main read is unavailable; using local origin/main tracking ref",
              );
            }
          }

          if (!localSha) {
            addCheck(
              checks,
              "BLOCKED",
              "git:local-head",
              "local HEAD commit could not be verified",
            );
            blockers.push(
              "local HEAD commit must be readable before release readiness is READY",
            );
          } else if (!remoteSha) {
            addCheck(
              checks,
              "BLOCKED",
              "git:remote-main-head",
              "origin/main commit could not be verified",
            );
            blockers.push(
              "origin/main must be readable before release readiness is READY",
            );
          } else if (localSha === remoteSha) {
            addCheck(
              checks,
              remoteStatus,
              "git:remote-main-head",
              `local HEAD ${shortGitSha(localSha)} matches ${remoteSource}`,
            );
          } else {
            addCheck(
              checks,
              "BLOCKED",
              "git:remote-main-head",
              `local HEAD ${shortGitSha(localSha)} differs from ${remoteSource} ${shortGitSha(remoteSha)}`,
            );
            blockers.push(
              "local HEAD must be pushed to origin/main before release readiness is READY",
            );
          }
        }
      } else {
        addCheck(
          checks,
          "BLOCKED",
          "git:remote-origin",
          `expected ${expectedRepository}; got ${remote.output}`,
        );
        blockers.push(
          `git remote origin must point to expected GitHub repository ${expectedRepository}`,
        );
      }
    }
  } else {
    addCheck(checks, "BLOCKED", "git:status", "git status failed");
    blockers.push(
      "git status is unavailable; repository/change tracking is not verified",
    );
  }

  return {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "READY" : "BLOCKED",
    version: RELEASE_CHECK_VERSION,
    checkedAt: new Date().toISOString(),
    checks,
    blockers,
    warnings,
  };
};

const statusIcon = (status) => {
  if (status === "PASS") return "PASS";
  if (status === "WARN") return "WARN";
  return "BLOCKED";
};

export const formatReleaseReadinessReport = (result) => {
  const lines = [
    `Salary Hijacking release readiness: ${result.status}`,
    `Version: ${result.version}`,
    "",
    "Checks:",
  ];

  for (const check of result.checks) {
    lines.push(`- ${statusIcon(check.status)} ${check.name}: ${check.detail}`);
  }

  if (result.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  }

  if (result.warnings.length > 0) {
    lines.push("", "Warnings:");
    for (const warning of result.warnings) lines.push(`- ${warning}`);
  }

  return `${lines.join("\n")}\n`;
};

const isMain = () => {
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return invoked === fileURLToPath(import.meta.url);
};

if (isMain()) {
  const json = process.argv.includes("--json");
  const soft = process.argv.includes("--soft");
  const result = analyzeReleaseReadiness();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    process.stdout.write(formatReleaseReadinessReport(result));
  }

  process.exitCode = result.ok || soft ? 0 : 1;
}
