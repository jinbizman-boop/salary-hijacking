import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";

import {
  analyzeReleaseReadiness,
  formatReleaseReadinessReport,
  resolveReleaseReadinessExitCode,
} from "./check-release-readiness.mjs";
import { DEFAULT_SECRET_STORES } from "./generate-secrets-evidence.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const officialBrandLogoPath =
  "apps/mobile/src/shared/assets/images/brand/salary-hijacking-platform-logo.png";
const officialBrandLogoSource = path.join(repoRoot, officialBrandLogoPath);
const requiredFreesentationFontNames = [
  "Freesentation-4Regular.ttf",
  "Freesentation-5Medium.ttf",
  "Freesentation-6SemiBold.ttf",
  "Freesentation-7Bold.ttf",
  "Freesentation-8ExtraBold.ttf",
  "Freesentation-9Black.ttf",
];
const freesentationFontSourceRoot = path.join(
  repoRoot,
  "apps",
  "mobile",
  "assets",
  "fonts",
);
const mobileAssetSourceRoot = path.join(repoRoot, "apps", "mobile", "assets");
const storeScreenshotSourceRoot = path.join(repoRoot, "release", "screenshots");
const requiredMobileAssetNames = [
  "icon.png",
  "splash.png",
  "adaptive-icon.png",
  "notification-icon.png",
  "favicon.png",
];
const fixtureWorkspaces = new Set();

const cleanupWorkspaces = () => {
  for (const rootDir of fixtureWorkspaces) {
    fs.rmSync(rootDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    fixtureWorkspaces.delete(rootDir);
  }
};

afterEach(() => {
  cleanupWorkspaces();
});

const singleQuotedValues = (source) =>
  [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);

const recalculateReasons = (source) =>
  [
    ...source.matchAll(/recalculate_payroll_plan\([^;]*?,\s*'([^']+)'\s*\)/g),
  ].map((match) => match[1]);

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    content,
    typeof content === "string" ? "utf8" : undefined,
  );
};

const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l7mF4QAAAABJRU5ErkJggg==",
  "base64",
);
const pngWithDimensions = (width, height) => {
  const buffer = Buffer.from(validPng);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
};
const validPhoneScreenshotPng = pngWithDimensions(430, 932);
const validFeatureGraphicPng = pngWithDimensions(1024, 500);

const validMobileAppConfig = `
const SERVICE_NAME = "급여납치";
const SERVICE_SLUG = "salary-hijacking";
const DEFAULT_SCHEME = "salaryhijacking";
const DEFAULT_VERSION = "1.0.0";
const DEFAULT_IOS_BUNDLE_ID = "com.salaryhijacking.mobile";
const DEFAULT_ANDROID_PACKAGE = "com.salaryhijacking.mobile";
const DEFAULT_ICON = "./assets/icon.png";
const DEFAULT_SPLASH = "./assets/splash.png";
const DEFAULT_ADAPTIVE_ICON = "./assets/adaptive-icon.png";
const DEFAULT_FAVICON = "./assets/favicon.png";
const DEFAULT_NOTIFICATION_ICON = "./assets/notification-icon.png";
const DEFAULT_TIMEZONE = "Asia/Seoul";
const DEFAULT_LOCALE = "ko-KR";
const DEFAULT_API_VERSION = "v1";
const appConfig = {
  name: SERVICE_NAME,
  slug: SERVICE_SLUG,
  scheme: DEFAULT_SCHEME,
  version: DEFAULT_VERSION,
  orientation: "portrait",
  icon: assetPathEnv("EXPO_PUBLIC_APP_ICON", DEFAULT_ICON),
  splash: {
    image: assetPathEnv("EXPO_PUBLIC_SPLASH_IMAGE", DEFAULT_SPLASH),
  },
  runtimeVersion: { policy: "appVersion" },
  ios: { bundleIdentifier: DEFAULT_IOS_BUNDLE_ID, buildNumber: "1" },
  android: {
    package: DEFAULT_ANDROID_PACKAGE,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: assetPathEnv(
        "EXPO_PUBLIC_ANDROID_ADAPTIVE_ICON",
        DEFAULT_ADAPTIVE_ICON,
      ),
    },
    notification: {
      icon: assetPathEnv(
        "EXPO_PUBLIC_NOTIFICATION_ICON",
        DEFAULT_NOTIFICATION_ICON,
      ),
    },
  },
  web: { favicon: assetPathEnv("EXPO_PUBLIC_FAVICON", DEFAULT_FAVICON) },
  plugins: [
    [
      "expo-notifications",
      {
        icon: assetPathEnv(
          "EXPO_PUBLIC_NOTIFICATION_ICON",
          DEFAULT_NOTIFICATION_ICON,
        ),
      },
    ],
  ],
  extra: {
    api: { prefix: "/api/v1" },
    privacy: {
      serverAuthority: true,
      financialAmountBasedTargeting: false,
      contextualAdsOnly: true,
      timezone: DEFAULT_TIMEZONE,
    },
    ads: { contextualOnly: true, financialTargetingAllowed: false },
  },
};
export default appConfig;
`;

const validGooglePlayMetadata = `# Google Play Metadata

## App Identity

- app name: 급여납치
- package name: \`com.salaryhijacking.mobile\`
- default language: Korean (\`ko-KR\`)
- category: Finance

## Privacy And Safety

- privacy policy: \`https://salaryhijacking.com/privacy\`
- support contact: \`support@salaryhijacking.com\`
- ads disclosure: ad and partner surfaces must be clearly labeled.
`;

const validAppStoreMetadata = `# App Store Metadata

## App Identity

- app name: 급여납치
- bundle identifier: \`com.salaryhijacking.mobile\`
- default language: Korean (\`ko-KR\`)
- category: Finance

## Privacy And Safety

- privacy policy: \`https://salaryhijacking.com/privacy\`
- support URL: \`https://salaryhijacking.com/support\`
- marketing URL: \`https://salaryhijacking.com\`
- tracking policy: no App Tracking Transparency prompt is required unless a future verified ads policy introduces tracking.
`;

const validDataSafety = `# Google Play Data Safety Declaration

## Google Play Data safety

- Data collected: account email, user ID, profile nickname, payroll plan inputs, expense records, savings records, community content, notification preferences, crash logs, diagnostics, and app interactions.
- Data shared: no raw salary, expense, savings, hijack amount, account, card, loan, email, phone, auth token, push token, or raw device identifier is shared with ads, partners, analytics, logs, or push payloads.
- Encryption in transit: required for all API traffic.
- Data deletion requests: available through profile withdrawal request and privacy export/delete support flow.
- Third-party SDK review: Expo, FCM, Sentry, and advertising/partner SDK usage must be reviewed before each submission.
- Privacy policy: https://salaryhijacking.com/privacy
`;

const validAppPrivacy = `# App Store Privacy Nutrition Label

## App Store Privacy

- Data Used to Track You: None.
- Data Linked to You: email address, user ID, payroll plan data, expense data, savings data, community content, and notification preferences when the user signs in.
- Data Not Linked to You: crash logs, diagnostics, and aggregate app interactions where identifiers are removed.
- Financial Data: collected for app functionality only and not used for advertising or third-party tracking.
- Contact Info: email is used for account authentication and support.
- User Content: community posts and comments are user-generated content.
- Tracking: no App Tracking Transparency prompt is required unless a future verified ads policy introduces tracking.
- Privacy policy: https://salaryhijacking.com/privacy
`;

const validReviewNotes = `# Store Review Notes

## Reviewer Access

- Reviewer account email: reviewer@salaryhijacking.com
- Reviewer password: provide out-of-band through the store console only; do not commit it.
- Test data: seeded demo payroll, budget, expense, savings, LV UP, notification, and community records only.

## Review Path

- Log in with the reviewer account.
- Confirm salary home, daily budget, plan, notifications, LV UP, community, and profile tabs.
- All displayed financial values are sample data.
- Ads and partner content are contextual-only and clearly labeled when visible.
- Account deletion support is available through profile withdrawal request and support contact.
`;

const validContentRating = `# Store Content Rating Notes

## Rating Inputs

- Category: Finance.
- Target audience: adult and general Korean mobile users; not directed to children.
- User-generated content: community posts and comments are supported and require reporting/moderation.
- Ads: contextual ads or partner placements may appear and must be labeled.
- Gambling, contests, real-money prizes, loan approval, investment returns, and health outcome guarantees: not provided.
- Final age and content rating must be confirmed in Google Play Console and App Store Connect before public rollout.
`;

const requiredStoreImageNames = [
  "01_home_salary.png",
  "02_daily_budget.png",
  "03_plan_setting.png",
  "04_notifications.png",
  "05_level_up.png",
  "feature_graphic_google_play.png",
];

const validScreenshotPlan = `# Store Screenshot Plan

The Salary Hijacking store screenshot set must use real app UI captures with masked sample data.

Required files:
- 01_home_salary.png
- 02_daily_budget.png
- 03_plan_setting.png
- 04_notifications.png
- 05_level_up.png
- feature_graphic_google_play.png

Review rules:
- Screenshots must be based on real app UI.
- Raw salary, expense, savings, account, phone, email, token, and device identifiers must not appear.
- Copy must avoid profit guarantees, loan promises, health guarantees, exaggerated savings claims, and unsupported event claims.
`;

const validScreenshotGuideline = `# Store Screenshot Guideline

Store images must present 급여납치 as a Finance app for Korean mobile users.

Required set:
- Minimum phone screenshots: 5
- Recommended phone screenshots: 8
- Google Play feature graphic: feature_graphic_google_play.png

Quality gates:
- Use Korean copy, ko-KR locale, and sample data only.
- Match actual mobile screens and available features.
- Keep ads or partner content labeled when visible.
- Export PNG images suitable for store upload.
`;

const writeReleaseTargets = (rootDir, overrides = {}) => {
  const expectedWorkerSecrets = {
    "salary-hijacking-api": [
      "AUDIT_HASH_SECRET",
      "AUTH_JWT_SECRET",
      "DATABASE_URL",
      "HASH_SECRET",
      "JWT_SECRET",
      "OPERATION_WEBHOOK_TOKEN",
      "RATE_LIMIT_HASH_SECRET",
      "SENTRY_DSN",
      "SLACK_WEBHOOK_URL",
    ],
    "salary-hijacking-notifications": [
      "GOOGLE_SERVICE_ACCOUNT_JSON",
      "NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN",
      "NOTIFICATIONS_SERVICE_TOKEN_SHA256",
      "SENTRY_DSN",
    ],
    "salary-hijacking-scheduler": [
      "API_INTERNAL_SERVICE_TOKEN",
      "SCHEDULER_OPERATION_WEBHOOK_TOKEN",
      "SCHEDULER_SERVICE_TOKEN_SHA256",
      "SENTRY_DSN",
    ],
    "salary-hijacking-admin": ["SENTRY_DSN"],
  };
  const targets = {
    schemaVersion: 1,
    github: {
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      protectedExistingRepositories: ["Retro Games", "RETRO-DB"],
    },
    cloudflare: {
      expectedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      expectedAdminWorker: "salary-hijacking-admin",
      adminDeploymentType: "workers-opennext",
      expectedWorkerSecrets,
    },
    neon: {
      expectedProjectHint: "salary-hijacking",
    },
    mobile: {
      expectedAppSlug: "salary-hijacking",
      expectedAndroidPackage: "com.salaryhijacking.mobile",
      expectedIosBundleIdentifier: "com.salaryhijacking.mobile",
    },
    publicUrls: {
      landingUrl: "https://salaryhijacking.com/",
      privacyUrl: "https://salaryhijacking.com/privacy",
      supportUrl: "https://salaryhijacking.com/support",
      termsUrl: "https://salaryhijacking.com/terms",
    },
    ...overrides,
  };

  write(
    rootDir,
    "release/release-targets.json",
    JSON.stringify(targets, null, 2),
  );
};

const writeExternalEvidence = (rootDir, overrides = {}) => {
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games", "RETRO-DB"],
      repositoryMatched: true,
      writeAccessProven: true,
    },
    cloudflare: {
      connectorReachable: true,
      accountObserved: true,
      expectedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      missingWorkers: [],
      expectedAdminWorker: "salary-hijacking-admin",
      adminDeploymentType: "workers-opennext",
      adminWorkerMatched: true,
    },
    neon: {
      connectorReachable: true,
      organizationObserved: true,
      expectedProjectHint: "salary-hijacking",
      projectMatched: true,
    },
    ...overrides,
  };

  write(
    rootDir,
    "release/external-release-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const writeMobileNativeEvidence = (rootDir, overrides = {}) => {
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    appIdentity: {
      appSlug: "salary-hijacking",
      androidPackage: "com.salaryhijacking.mobile",
      iosBundleIdentifier: "com.salaryhijacking.mobile",
    },
    android: {
      productionBuildVerified: true,
      productionBuildProfile: "production",
      productionArtifactType: "aab",
      storeSubmitDryRunVerified: true,
      nativeE2eVerified: true,
      nativeE2eConfiguration: "android.emu.debug",
      localAdbAvailable: true,
      localEmulatorAvailable: true,
    },
    ios: {
      productionBuildVerified: true,
      productionBuildProfile: "production",
      storeSubmitDryRunVerified: true,
    },
    note: "Fixture contains no EAS token, store credential, or binary URL.",
    ...overrides,
  };

  write(
    rootDir,
    "release/mobile-native-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const writeMobilePreviewEvidence = (rootDir, overrides = {}) => {
  const baseEvidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    appIdentity: {
      appSlug: "salary-hijacking",
      androidPackage: "com.salaryhijacking.mobile",
      iosBundleIdentifier: "com.salaryhijacking.mobile",
    },
    android: {
      debugApkBuilt: true,
      debugApkSigned: true,
      debugApkSha256:
        "BD55D440BE081499FF743A3F25B45C91850FA42AC919CD4B80F8C9E0D40938E9",
      downloadVerified: true,
      emulatorInstallVerified: true,
      coldStartRuns: 5,
      coldStartFatalCount: 0,
      navigationSmokeVerified: true,
      backgroundForegroundVerified: true,
      notificationNoBottomTabVerified: true,
      physicalPhoneVerified: false,
    },
    privacy: {
      containsEasToken: false,
      containsStoreCredential: false,
      containsSigningKey: false,
      containsReviewerPassword: false,
      containsRawLogcat: false,
      containsSecretValues: false,
    },
  };
  const evidence = {
    ...baseEvidence,
    ...overrides,
    android: {
      ...baseEvidence.android,
      ...(overrides.android ?? {}),
    },
    privacy: {
      ...baseEvidence.privacy,
      ...(overrides.privacy ?? {}),
    },
  };

  write(
    rootDir,
    "release/mobile-preview-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const requiredRuntimeSecretNames = [
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

const writeSecretsEvidence = (rootDir, overrides = {}) => {
  const secrets = Object.fromEntries(
    requiredRuntimeSecretNames.map((name) => [
      name,
      {
        verified: true,
        stores: [DEFAULT_SECRET_STORES[name][0]],
      },
    ]),
  );
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    secrets,
    ...overrides,
  };

  write(
    rootDir,
    "release/secrets-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const writeCloudflareRuntimeEvidence = (rootDir, overrides = {}) => {
  const workerSecretBindings = {
    "salary-hijacking-api": [
      "AUDIT_HASH_SECRET",
      "AUTH_JWT_SECRET",
      "DATABASE_URL",
      "HASH_SECRET",
      "JWT_SECRET",
      "OPERATION_WEBHOOK_TOKEN",
      "RATE_LIMIT_HASH_SECRET",
      "SENTRY_DSN",
      "SLACK_WEBHOOK_URL",
    ],
    "salary-hijacking-notifications": [
      "GOOGLE_SERVICE_ACCOUNT_JSON",
      "NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN",
      "NOTIFICATIONS_SERVICE_TOKEN_SHA256",
      "SENTRY_DSN",
    ],
    "salary-hijacking-scheduler": [
      "API_INTERNAL_SERVICE_TOKEN",
      "SCHEDULER_OPERATION_WEBHOOK_TOKEN",
      "SCHEDULER_SERVICE_TOKEN_SHA256",
      "SENTRY_DSN",
    ],
    "salary-hijacking-admin": ["SENTRY_DSN"],
  };
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    workers: {
      expectedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      observedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      productionDeployVerified: true,
      adminWorkerVerified: true,
    },
    resources: {
      r2BucketsVerified: true,
      queuesVerified: true,
      deadLetterQueuesVerified: true,
      cronTriggersVerified: true,
      workerSecretBindings,
      missingWorkerSecretBindings: {},
      workerSecretBindingsVerified: true,
    },
    networking: {
      customDomainsVerified: true,
      certificatesVerified: true,
      expectedDomains: [
        "salaryhijacking.com",
        "www.salaryhijacking.com",
        "api.salaryhijacking.com",
        "notifications.salaryhijacking.com",
        "scheduler.salaryhijacking.com",
        "admin.salaryhijacking.com",
      ],
    },
    ...overrides,
  };

  write(
    rootDir,
    "release/cloudflare-runtime-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const writeDatabaseEvidence = (rootDir, overrides = {}) => {
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    neon: {
      expectedProjectHint: "salary-hijacking",
      projectMatched: true,
      mainBranchReady: true,
      stagingBranchReady: true,
    },
    migrations: {
      migrationFilesVerified: true,
      migrationFileCount: 1,
      migrationValidationVerified: true,
      stagingMigrationExecuted: true,
      productionMigrationDryRunVerified: true,
    },
    seeds: {
      stagingSeedExecuted: true,
      productionSeedExecuted: false,
      destructiveProductionSeedBlocked: true,
    },
    smoke: {
      stagingApiSmokeVerified: true,
      adminSmokeVerified: true,
      serverAuthoritySmokeVerified: true,
      privacySmokeVerified: true,
      noRawFinancialDataInSmokePayloads: true,
    },
    rollback: {
      rollbackRehearsalVerified: true,
    },
    ...overrides,
  };

  write(
    rootDir,
    "release/database-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const writePublicUrlEvidence = (rootDir, overrides = {}) => {
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    expectedUrls: {
      landingUrl: "https://salaryhijacking.com/",
      privacyUrl: "https://salaryhijacking.com/privacy",
      supportUrl: "https://salaryhijacking.com/support",
      termsUrl: "https://salaryhijacking.com/terms",
    },
    reachability: {
      landingReachable: true,
      privacyReachable: true,
      supportReachable: true,
      termsReachable: true,
    },
    headers: {
      cspVerified: true,
      privacyHeadersVerified: true,
      noIndexAbsentOnPublicPages: true,
    },
    content: {
      koreanCopyVerified: true,
      storeReviewUrlsVerified: true,
      noSensitiveRawDataExposed: true,
    },
    ...overrides,
  };

  write(
    rootDir,
    "release/public-url-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const writeSecurityAuditEvidence = (rootDir, overrides = {}) => {
  const evidence = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: "test-fixture",
    secretsRedacted: true,
    containsSecretValues: false,
    audit: {
      packageManager: "pnpm",
      auditCommand: "corepack pnpm audit --audit-level=high --prod=false",
      registryAuditVerified: true,
      lockfileAudited: true,
      productionDependenciesAudited: true,
      devDependenciesAudited: true,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      moderateVulnerabilities: 0,
      lowVulnerabilities: 0,
      noHighOrCriticalVulnerabilities: true,
    },
    ...overrides,
  };

  write(
    rootDir,
    "release/security-audit-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
};

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-release-ready-"),
  );
  fixtureWorkspaces.add(rootDir);

  write(
    rootDir,
    "package.json",
    JSON.stringify(
      {
        scripts: {
          "format:check": "prettier --check .",
          quality: "corepack pnpm run check:external-integrations",
          build: "turbo run build",
          "check:external-integrations":
            "node scripts/quality/check-external-integrations.mjs",
          "security:scan": "turbo run security:scan",
          "db:validate": "turbo run db:validate",
          "test:e2e": "turbo run test:e2e",
        },
      },
      null,
      2,
    ),
  );

  write(rootDir, "AGENTS.md", "# AGENTS\n");
  write(
    rootDir,
    "docs/codex/08_FILE_COMPLETION_LOG.md",
    "# File Completion Log\n",
  );
  write(
    rootDir,
    "docs/codex/09_VALIDATION_PROTOCOL.md",
    "# Validation Protocol\n",
  );
  write(rootDir, "release/README.md", "# Release\n");
  writeReleaseTargets(rootDir);
  writeExternalEvidence(rootDir);
  writeMobileNativeEvidence(rootDir);
  writeMobilePreviewEvidence(rootDir);
  writeSecretsEvidence(rootDir);
  writeCloudflareRuntimeEvidence(rootDir);
  writeDatabaseEvidence(rootDir);
  writePublicUrlEvidence(rootDir);
  writeSecurityAuditEvidence(rootDir);
  write(rootDir, "release/rollback/rollback-plan.md", "# Rollback\n");
  write(rootDir, "release/screenshots/screenshot-plan.md", validScreenshotPlan);
  write(
    rootDir,
    "release/store/google-play-metadata.md",
    validGooglePlayMetadata,
  );
  write(rootDir, "release/store/app-store-metadata.md", validAppStoreMetadata);
  write(rootDir, "release/store/data-safety.md", validDataSafety);
  write(rootDir, "release/store/app-privacy.md", validAppPrivacy);
  write(rootDir, "release/store/review-notes.md", validReviewNotes);
  write(rootDir, "release/store/content-rating.md", validContentRating);
  write(
    rootDir,
    "assets/store/screenshots-guideline.md",
    validScreenshotGuideline,
  );
  write(rootDir, "infra/domain/dns-records.md", "# DNS\n");
  write(rootDir, "infra/domain/certificates.md", "# Certificates\n");
  write(rootDir, "infra/github/secrets.md", "# GitHub Secrets\n");
  write(rootDir, "infra/github/repository.md", "# GitHub Repository\n");
  write(rootDir, "infra/neon/README.md", "# Neon\n");
  write(rootDir, "infra/cloudflare/README.md", "# Cloudflare\n");
  write(rootDir, ".github/workflows/ci.yml", "name: CI\n");
  write(rootDir, ".github/workflows/release.yml", "name: Release\n");
  write(rootDir, ".github/workflows/security-scan.yml", "name: Security\n");
  write(rootDir, ".github/workflows/deploy-api.yml", "name: API\n");
  write(rootDir, ".github/workflows/deploy-admin.yml", "name: Admin\n");
  write(rootDir, ".github/workflows/mobile-build.yml", "name: Mobile\n");
  write(
    rootDir,
    "apps/admin/open-next.config.ts",
    'export default { buildCommand: "corepack pnpm run build" };\n',
  );
  write(
    rootDir,
    "apps/admin/wrangler.jsonc",
    '{ "name": "salary-hijacking-admin", "main": ".open-next/worker.js" }\n',
  );
  write(rootDir, "database/migrations/0001_init.sql", "-- migration\n");
  write(rootDir, "database/seeds/staging.seed.sql", "-- seed\n");
  write(rootDir, "database/seeds/uat.seed.sql", "-- seed\n");
  write(rootDir, "services/api/wrangler.toml", 'name = "api"\n');
  write(
    rootDir,
    "services/notifications/wrangler.toml",
    'name = "notifications"\n',
  );
  write(rootDir, "services/scheduler/wrangler.toml", 'name = "scheduler"\n');
  write(
    rootDir,
    "apps/mobile/package.json",
    JSON.stringify(
      {
        name: "@salary-hijacking/mobile",
        version: "1.0.0",
        private: true,
        scripts: {
          typecheck: "tsc --noEmit",
          test: "jest",
          "export:web": "expo export --platform web",
        },
      },
      null,
      2,
    ),
  );
  write(rootDir, "apps/mobile/app.config.ts", validMobileAppConfig);
  write(
    rootDir,
    "apps/mobile/eas.json",
    JSON.stringify(
      {
        build: {
          preview: {
            env: {
              EXPO_PUBLIC_API_BASE_URL:
                "https://api-staging.salaryhijacking.com",
              EXPO_PUBLIC_DEEPLINK_HOST: "staging.salaryhijacking.com",
            },
            android: { buildType: "apk" },
          },
          staging: {
            env: {
              EXPO_PUBLIC_API_BASE_URL:
                "https://api-staging.salaryhijacking.com",
              EXPO_PUBLIC_DEEPLINK_HOST: "staging.salaryhijacking.com",
            },
            android: { buildType: "apk" },
          },
          e2e: {
            env: {
              EXPO_PUBLIC_API_BASE_URL:
                "https://api-staging.salaryhijacking.com",
              EXPO_PUBLIC_DEEPLINK_HOST: "staging.salaryhijacking.com",
            },
            android: { buildType: "apk" },
          },
          production: {
            env: {
              EXPO_PUBLIC_API_BASE_URL: "https://api.salaryhijacking.com",
              EXPO_PUBLIC_DEEPLINK_HOST: "salaryhijacking.com",
            },
            android: { buildType: "app-bundle" },
          },
        },
      },
      null,
      2,
    ),
  );
  for (const assetName of requiredMobileAssetNames) {
    write(
      rootDir,
      `apps/mobile/assets/${assetName}`,
      fs.readFileSync(path.join(mobileAssetSourceRoot, assetName)),
    );
  }
  write(
    rootDir,
    officialBrandLogoPath,
    fs.readFileSync(officialBrandLogoSource),
  );
  for (const fontName of requiredFreesentationFontNames) {
    write(
      rootDir,
      `apps/mobile/assets/fonts/${fontName}`,
      fs.readFileSync(path.join(freesentationFontSourceRoot, fontName)),
    );
  }
  for (const imageName of requiredStoreImageNames) {
    write(
      rootDir,
      `release/screenshots/${imageName}`,
      fs.readFileSync(path.join(storeScreenshotSourceRoot, imageName)),
    );
  }

  write(
    rootDir,
    ".env.example",
    [
      "DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require",
      "STAGING_DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/STAGING_DATABASE?sslmode=require",
      "NEON_API_KEY=replace-with-neon-api-key",
      "NEON_PROJECT_ID=replace-with-neon-project-id",
      "CLOUDFLARE_API_TOKEN=replace-with-cloudflare-api-token",
      "CLOUDFLARE_ACCOUNT_ID=replace-with-cloudflare-account-id",
      "CF_ADMIN_WORKER_NAME=salary-hijacking-admin",
      "EXPO_TOKEN=replace-with-expo-token",
      "EAS_PROJECT_ID=replace-with-eas-project-id",
      "GITHUB_TOKEN=replace-with-github-token",
      "GITHUB_REPOSITORY=owner/salary-hijacking",
      "SENTRY_DSN=replace-with-sentry-dsn",
      "SLACK_WEBHOOK_URL=replace-with-slack-webhook-url",
      "",
    ].join("\n"),
  );

  return rootDir;
};

const completeEnv = Object.freeze({
  DATABASE_URL: "postgresql://redacted",
  STAGING_DATABASE_URL: "postgresql://redacted-staging",
  NEON_API_KEY: "napi_real_value",
  NEON_PROJECT_ID: "project-real",
  CLOUDFLARE_API_TOKEN: "cf_real_value",
  CLOUDFLARE_ACCOUNT_ID: "account-real",
  CF_ADMIN_WORKER_NAME: "salary-hijacking-admin",
  EXPO_TOKEN: "expo_real_value",
  EAS_PROJECT_ID: "eas-real",
  GITHUB_TOKEN: "ghp_real_value",
  GITHUB_REPOSITORY: "jinbizman-boop/salary-hijacking",
  SENTRY_DSN: "https://public@sentry.example/1",
  SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/XXXX",
});

const matchingGitRemote = () => ({
  ok: true,
  output: "https://github.com/jinbizman-boop/salary-hijacking.git",
});

const matchingGitHead = () => ({
  ok: true,
  output: "735eb533fb46c396eda857aafa33215587de032f",
});

const matchingGitRemoteHead = () => ({
  ok: true,
  output: "735eb533fb46c396eda857aafa33215587de032f\trefs/heads/main",
});

test("passes when release files, scripts, env names, and tools are present", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });

  assert.deepEqual(result.blockers, []);
  assert.equal(result.ok, true);
  assert.ok(result.checks.length >= 20);
  assert.ok(
    result.checks.every(
      (check) => check.status === "PASS" || check.status === "WARN",
    ),
  );
});

test("cleans generated release readiness fixture workspaces", () => {
  const rootDir = makeWorkspace();
  assert.equal(fs.existsSync(rootDir), true);

  cleanupWorkspaces();

  assert.equal(fs.existsSync(rootDir), false);
});

test("blocks invalid mobile package json before release readiness", () => {
  const rootDir = makeWorkspace();
  write(rootDir, "apps/mobile/package.json", "{ invalid json\n");

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile package\.json/);
  assert.match(report, /package\.json failed to parse/);
});

test("blocks when the local release commit is not pushed to origin main", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games", "RETRO-DB"],
      repositoryMatched: true,
      writeAccessProven: true,
      pushProven: true,
      pushProofCommit: "735eb533fb46c396eda857aafa33215587de032f",
    },
  });
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
    gitHead: matchingGitHead,
    gitRemoteHead: () => ({
      ok: true,
      output: "a49d96720586f3c84eb056b868350578f467dad6\trefs/heads/main",
    }),
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /git:remote-main-head/);
  assert.match(
    report,
    /local HEAD must be pushed to origin\/main before release readiness is READY/,
  );
});

test("uses the local origin main tracking ref when live remote read is unavailable", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games", "RETRO-DB"],
      repositoryMatched: true,
      writeAccessProven: true,
      pushProven: true,
      pushProofCommit: "735eb533fb46c396eda857aafa33215587de032f",
    },
  });
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
    gitHead: matchingGitHead,
    gitRemoteHead: () => ({
      ok: false,
      output: "fatal: unable to access github.com",
    }),
    gitRemoteTrackingHead: matchingGitRemoteHead,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /git:remote-main-head/);
  assert.doesNotMatch(report, /origin\/main must be readable/);
});

test("blocks missing runtime evidence without leaking secret values", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: {
      ...completeEnv,
      CLOUDFLARE_API_TOKEN: "cf_secret_value_that_must_not_print",
      NEON_API_KEY: "",
      EXPO_TOKEN: "replace-with-expo-token",
    },
    commandExists: (command) => !["gh", "neon", "emulator"].includes(command),
    gitStatus: () => ({ ok: false, output: "fatal: not a git repository" }),
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /NEON_API_KEY/);
  assert.match(report, /EXPO_TOKEN/);
  assert.match(report, /gh/);
  assert.doesNotMatch(report, /cf_secret_value_that_must_not_print/);
});

test("uses connector evidence as an account-access fallback for GitHub, Cloudflare, and Neon CLIs", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) =>
      !["gh", "wrangler", "neon", "neonctl"].includes(command),
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.warnings, []);
  assert.match(report, /PASS cli:GitHub CLI/);
  assert.match(report, /connector evidence observed/);
  assert.match(report, /PASS cli:Cloudflare Wrangler/);
  assert.match(report, /PASS cli:Neon CLI/);
  assert.doesNotMatch(report, /WARN cli:GitHub CLI/);
  assert.doesNotMatch(report, /WARN cli:Cloudflare Wrangler/);
  assert.doesNotMatch(report, /WARN cli:Neon CLI/);
});

test("strict readiness does not block connector-backed CLI fallbacks", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  const rootDir = makeWorkspace();
  const softResult = readinessModule.analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) =>
      !["gh", "wrangler", "neon", "neonctl"].includes(command),
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });

  const strictResult =
    readinessModule.applyStrictReleaseReadinessGates(softResult);
  const report = readinessModule.formatReleaseReadinessReport(strictResult);

  assert.doesNotMatch(report, /strict:warning/);
  assert.doesNotMatch(report, /GitHub CLI is not available on PATH/);
  assert.doesNotMatch(report, /Neon CLI is not available on PATH/);
});

test("blocks external evidence that contains raw secret values", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    apiTokenValue: "ghp_external_secret_value_that_must_not_print",
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /external-evidence:secret-values/);
  assert.match(
    report,
    /release\/external-release-evidence\.json must not contain raw secret values/,
  );
  assert.doesNotMatch(report, /ghp_external_secret_value/);
});

test("uses redacted secret evidence when local runtime env values are absent", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /secrets-evidence:schema/);
  assert.match(report, /env-runtime:DATABASE_URL: verified in secret evidence/);
  assert.match(report, /env-runtime:EXPO_TOKEN: verified in secret evidence/);
  assert.doesNotMatch(report, /runtime value is missing or placeholder/);
});

test("allows required secret names in evidence next steps without treating them as values", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    nextEvidenceRequired: [
      "CF_ADMIN_WORKER_NAME presence proof in GitHub Environments or Cloudflare Worker config",
      "SLACK_WEBHOOK_URL presence proof in GitHub Environments or provider secret store",
    ],
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /PASS secrets-evidence:secret-values/);
  assert.doesNotMatch(report, /raw secret values may be present/);
});

test("allows no-secret Neon connector credential label for Neon management proof", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    secrets: {
      NEON_API_KEY: {
        verified: true,
        stores: ["Neon connector credential"],
        note: "Neon management access verified by connector project and branch proof without token values.",
      },
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.match(report, /PASS secrets-evidence:store-labels/);
  assert.match(report, /env-runtime:NEON_API_KEY: verified in secret evidence/);
  assert.doesNotMatch(report, /NEON_API_KEY: Neon connector credential/);
});

test("blocks secret evidence that contains raw values", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    containsSecretValues: true,
    secrets: {
      DATABASE_URL: {
        verified: true,
        stores: ["github-environment"],
        value: "postgresql://user:password@host.neon.tech/db",
      },
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /secrets-evidence:secret-values/);
  assert.match(
    report,
    /release\/secrets-evidence\.json must not contain raw secret values/,
  );
  assert.doesNotMatch(report, /postgresql:\/\/user:password/);
});

test("blocks secret evidence that embeds raw secret strings in notes", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    secrets: {
      ...Object.fromEntries(
        requiredRuntimeSecretNames.map((name) => [
          name,
          {
            verified: true,
            stores: ["GitHub Environments", "provider secret store"],
          },
        ]),
      ),
      DATABASE_URL: {
        verified: true,
        stores: ["GitHub Environments"],
        note: "Copied from postgresql://user:password@db.neon.tech/neondb",
      },
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /secrets-evidence:secret-values/);
  assert.match(report, /must not contain raw secret values/);
  assert.doesNotMatch(report, /postgresql:\/\/user:password/);
});

test("blocks secret evidence with unknown secret names", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    secrets: {
      ...Object.fromEntries(
        requiredRuntimeSecretNames.map((name) => [
          name,
          {
            verified: true,
            stores: ["GitHub Environments", "provider secret store"],
          },
        ]),
      ),
      RETRO_GAMES_DATABASE_URL: {
        verified: true,
        stores: ["GitHub Environments"],
        note: "Unrelated repository secret must never satisfy Salary Hijacking release proof.",
      },
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /secrets-evidence:secret-names/);
  assert.match(report, /unknown secret names/);
  assert.match(report, /RETRO_GAMES_DATABASE_URL/);
});

test("blocks secret evidence verified only by unapproved store labels", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    secrets: Object.fromEntries(
      requiredRuntimeSecretNames.map((name) => [
        name,
        {
          verified: true,
          stores: ["personal notes"],
        },
      ]),
    ),
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /secrets-evidence:store-labels/);
  assert.match(report, /unapproved or secret-mismatched store labels/);
  assert.match(report, /personal notes/);
});

test("blocks secret evidence verified by a store label approved for a different secret", () => {
  const rootDir = makeWorkspace();
  writeSecretsEvidence(rootDir, {
    secrets: {
      ...Object.fromEntries(
        requiredRuntimeSecretNames.map((name) => [
          name,
          {
            verified: true,
            stores: [DEFAULT_SECRET_STORES[name][0]],
          },
        ]),
      ),
      GITHUB_TOKEN: {
        verified: true,
        stores: ["GitHub Environments"],
      },
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {},
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /secrets-evidence:store-labels/);
  assert.match(report, /GITHUB_TOKEN: GitHub Environments/);
});

test("blocks when Cloudflare runtime evidence is missing or unverified", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "cloudflare-runtime-evidence.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime-evidence\.json/);
  assert.match(report, /cloudflare-runtime:evidence/);
});

test("blocks Cloudflare runtime evidence that contains raw secret values", () => {
  const rootDir = makeWorkspace();
  writeCloudflareRuntimeEvidence(rootDir, {
    containsSecretValues: true,
    workers: {
      expectedWorkers: ["salary-hijacking-api"],
      observedWorkers: ["salary-hijacking-api"],
      productionDeployVerified: true,
      adminWorkerVerified: true,
      apiTokenValue: "cf_live_secret_value",
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime:secret-values/);
  assert.match(
    report,
    /release\/cloudflare-runtime-evidence\.json must not contain raw secret values/,
  );
  assert.doesNotMatch(report, /cf_live_secret_value/);
});

test("blocks Cloudflare runtime evidence that includes unrelated Workers", () => {
  const rootDir = makeWorkspace();
  writeCloudflareRuntimeEvidence(rootDir, {
    workers: {
      expectedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      observedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
        "retro-db",
      ],
      productionDeployVerified: true,
      adminWorkerVerified: true,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime:worker-scope/);
  assert.match(report, /unexpected Worker names observed: retro-db/);
});

test("blocks Cloudflare runtime evidence that claims Worker secret bindings without names", () => {
  const rootDir = makeWorkspace();
  writeCloudflareRuntimeEvidence(rootDir, {
    resources: {
      r2BucketsVerified: true,
      queuesVerified: true,
      deadLetterQueuesVerified: true,
      cronTriggersVerified: true,
      workerSecretBindingsVerified: true,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime:worker-secret-bindings/);
  assert.match(report, /missing Worker secret bindings/);
  assert.match(report, /DATABASE_URL/);
});

test("blocks Cloudflare runtime evidence that includes unrelated Worker secret binding names", () => {
  const rootDir = makeWorkspace();
  writeCloudflareRuntimeEvidence(rootDir, {
    resources: {
      r2BucketsVerified: true,
      queuesVerified: true,
      deadLetterQueuesVerified: true,
      cronTriggersVerified: true,
      workerSecretBindings: {
        "salary-hijacking-api": [
          "AUDIT_HASH_SECRET",
          "AUTH_JWT_SECRET",
          "DATABASE_URL",
          "HASH_SECRET",
          "JWT_SECRET",
          "OPERATION_WEBHOOK_TOKEN",
          "RATE_LIMIT_HASH_SECRET",
          "SENTRY_DSN",
          "SLACK_WEBHOOK_URL",
        ],
        "salary-hijacking-notifications": [
          "GOOGLE_SERVICE_ACCOUNT_JSON",
          "NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN",
          "NOTIFICATIONS_SERVICE_TOKEN_SHA256",
          "SENTRY_DSN",
        ],
        "salary-hijacking-scheduler": [
          "API_INTERNAL_SERVICE_TOKEN",
          "SCHEDULER_OPERATION_WEBHOOK_TOKEN",
          "SCHEDULER_SERVICE_TOKEN_SHA256",
          "SENTRY_DSN",
        ],
        "salary-hijacking-admin": ["SENTRY_DSN"],
        "retro-db": ["DATABASE_URL"],
      },
      missingWorkerSecretBindings: {},
      workerSecretBindingsVerified: true,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime:worker-secret-bindings/);
  assert.match(report, /unexpected Worker secret bindings: retro-db:\*/);
});

test("blocks Cloudflare runtime evidence whose expected Workers drift from release targets", () => {
  const rootDir = makeWorkspace();
  writeCloudflareRuntimeEvidence(rootDir, {
    workers: {
      expectedWorkers: ["other-api"],
      observedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      productionDeployVerified: true,
      adminWorkerVerified: true,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime:target-workers/);
  assert.match(report, /expected Workers drifted from release targets/);
  assert.match(report, /other-api/);
});

test("blocks Cloudflare runtime evidence that includes unrelated domains", () => {
  const rootDir = makeWorkspace();
  writeCloudflareRuntimeEvidence(rootDir, {
    networking: {
      customDomainsVerified: true,
      certificatesVerified: true,
      expectedDomains: [
        "salaryhijacking.com",
        "www.salaryhijacking.com",
        "api.salaryhijacking.com",
        "notifications.salaryhijacking.com",
        "scheduler.salaryhijacking.com",
        "admin.salaryhijacking.com",
        "retrogames.kr",
      ],
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /cloudflare-runtime:domain-scope/);
  assert.match(report, /unexpected Cloudflare domains: retrogames\.kr/);
});

test("blocks when database migration, seed, and smoke evidence is missing", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "database-evidence.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /database-evidence\.json/);
  assert.match(report, /database:evidence/);
});

test("staging seed payroll recalculation reasons match migration constraint", () => {
  const migration = fs.readFileSync(
    path.join(
      repoRoot,
      "database",
      "migrations",
      "0002_payroll_budget_expense.sql",
    ),
    "utf8",
  );
  const seed = fs.readFileSync(
    path.join(repoRoot, "database", "seeds", "staging.seed.sql"),
    "utf8",
  );
  const constraintBody = migration.match(
    /CONSTRAINT\s+chk_calc_snapshots_reason[\s\S]*?calculation_reason\s+IN\s*\(([\s\S]*?)\)\s*\)/i,
  )?.[1];
  assert.ok(constraintBody, "chk_calc_snapshots_reason must be readable");

  const allowedReasons = new Set(singleQuotedValues(constraintBody));
  const seedReasons = recalculateReasons(seed);

  assert.ok(seedReasons.length > 0, "staging seed must recalculate payroll");
  assert.deepEqual(
    seedReasons.filter((reason) => !allowedReasons.has(reason)),
    [],
  );
});

test("blocks when public app URL evidence is missing or unverified", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "public-url-evidence.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /public-url-evidence\.json/);
  assert.match(report, /public-url:evidence/);
});

test("blocks public URL evidence that contains raw page payloads", () => {
  const rootDir = makeWorkspace();
  writePublicUrlEvidence(rootDir, {
    containsSecretValues: false,
    content: {
      koreanCopyVerified: true,
      storeReviewUrlsVerified: true,
      noSensitiveRawDataExposed: true,
      responseBody: {
        email: "actual-user@example.com",
        salaryAmount: 2700000,
      },
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /public-url:secret-values/);
  assert.match(
    report,
    /release\/public-url-evidence\.json must not contain raw secrets, copied page payloads, or sensitive user\/financial data/,
  );
  assert.doesNotMatch(report, /actual-user@example\.com/);
});

test("blocks when dependency security audit evidence is missing or unverified", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "security-audit-evidence.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /security-audit-evidence\.json/);
  assert.match(report, /security-audit:evidence/);
});

test("blocks dependency security audit evidence with high or critical vulnerabilities", () => {
  const rootDir = makeWorkspace();
  writeSecurityAuditEvidence(rootDir, {
    audit: {
      packageManager: "pnpm",
      auditCommand: "corepack pnpm audit --audit-level=high --prod=false",
      registryAuditVerified: true,
      lockfileAudited: true,
      productionDependenciesAudited: true,
      devDependenciesAudited: true,
      criticalVulnerabilities: 0,
      highVulnerabilities: 1,
      moderateVulnerabilities: 0,
      lowVulnerabilities: 0,
      noHighOrCriticalVulnerabilities: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /security-audit:vulnerabilities/);
  assert.match(
    report,
    /Dependency audit must prove zero high and critical vulnerabilities before release/,
  );
});

test("blocks dependency security audit evidence that contains raw registry tokens", () => {
  const rootDir = makeWorkspace();
  writeSecurityAuditEvidence(rootDir, {
    containsSecretValues: false,
    audit: {
      packageManager: "pnpm",
      auditCommand: "corepack pnpm audit --audit-level=high --prod=false",
      registryAuditVerified: true,
      lockfileAudited: true,
      productionDependenciesAudited: true,
      devDependenciesAudited: true,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      moderateVulnerabilities: 0,
      lowVulnerabilities: 0,
      noHighOrCriticalVulnerabilities: true,
      npmTokenValue: "npm_secret_value_that_must_not_print",
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /security-audit:secret-values/);
  assert.match(
    report,
    /release\/security-audit-evidence\.json must not contain raw registry tokens or secret values/,
  );
  assert.doesNotMatch(report, /npm_secret_value/);
});

test("blocks database evidence that contains raw database URLs", () => {
  const rootDir = makeWorkspace();
  writeDatabaseEvidence(rootDir, {
    containsSecretValues: true,
    neon: {
      expectedProjectHint: "salary-hijacking",
      projectMatched: true,
      mainBranchReady: true,
      stagingBranchReady: true,
      databaseUrl: "postgresql://user:password@host.neon.tech/db",
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /database:secret-values/);
  assert.match(
    report,
    /release\/database-evidence\.json must not contain raw database URLs or secret values/,
  );
  assert.doesNotMatch(report, /postgresql:\/\/user:password/);
});

test("blocks missing release artifacts and unsafe public secret env names", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "rollback"), {
    recursive: true,
    force: true,
  });
  write(
    rootDir,
    ".env.example",
    "NEXT_PUBLIC_JWT_SECRET=replace-with-secret\n",
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.blockers.some((blocker) => blocker.includes("rollback-plan")),
  );
  assert.ok(
    result.blockers.some((blocker) =>
      blocker.includes("NEXT_PUBLIC_JWT_SECRET"),
    ),
  );
});

test("blocks missing mobile launch assets and non-release EAS domains", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "apps", "mobile", "assets", "icon.png"), {
    force: true,
  });
  write(
    rootDir,
    "apps/mobile/eas.json",
    JSON.stringify(
      {
        build: {
          production: {
            env: {
              EXPO_PUBLIC_API_BASE_URL: "https://api.salary-hijacking.example",
              EXPO_PUBLIC_DEEPLINK_HOST: "app.salary-hijacking.example",
            },
            android: { buildType: "apk" },
          },
        },
      },
      null,
      2,
    ),
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:asset:icon\.png/);
  assert.match(report, /mobile:eas:production-api/);
  assert.match(report, /mobile:eas:production-deeplink/);
  assert.match(report, /mobile:eas:production-android/);
});

test("blocks placeholder-sized mobile launch assets", () => {
  const rootDir = makeWorkspace();
  write(rootDir, "apps/mobile/assets/adaptive-icon.png", validPng);

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:asset:adaptive-icon\.png/);
  assert.match(report, /mobile launch asset/i);
});

test("blocks when bundled official BI logo hash drifts", () => {
  const rootDir = makeWorkspace();
  write(rootDir, officialBrandLogoPath, validPng);

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:asset:official-bi-logo/);
  assert.match(report, /official BI logo must match/i);
});

test("blocks when Freesentation mobile font assets are missing or invalid", () => {
  const rootDir = makeWorkspace();
  write(rootDir, "apps/mobile/assets/fonts/Freesentation-7Bold.ttf", validPng);

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:font:Freesentation-7Bold\.ttf/);
  assert.match(report, /Freesentation font asset/i);
});

test("blocks mobile app config and store metadata that cannot be submitted", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "apps/mobile/app.config.ts",
    `
const SERVICE_NAME = "Paycheck Helper";
const SERVICE_SLUG = "paycheck-helper";
const DEFAULT_SCHEME = "paycheck";
const DEFAULT_VERSION = "0.0.0";
const DEFAULT_IOS_BUNDLE_ID = "com.example.paycheck";
const DEFAULT_ANDROID_PACKAGE = "com.example.paycheck";
`,
  );
  write(
    rootDir,
    "release/store/google-play-metadata.md",
    "# Google Play\n\n- app name: TODO\n- package name: `com.example.paycheck`\n- privacy policy: `https://example.com/privacy`\n",
  );
  write(
    rootDir,
    "release/store/app-store-metadata.md",
    "# App Store\n\n- app name: TODO\n- bundle identifier: `com.example.paycheck`\n- support URL: `https://example.com/support`\n",
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:app-config:identity/);
  assert.match(report, /mobile:app-config:bundle-ids/);
  assert.match(report, /mobile:store:google-play/);
  assert.match(report, /mobile:store:app-store/);
});

test("blocks mobile app config launch asset reference drift", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "apps/mobile/app.config.ts",
    validMobileAppConfig.replace(
      'const DEFAULT_ICON = "./assets/icon.png";',
      'const DEFAULT_ICON = "./assets/legacy-icon.png";',
    ),
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:app-config:launch-assets/);
});

test("blocks missing store screenshots and incomplete screenshot guidance", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(
    path.join(rootDir, "release", "screenshots", "01_home_salary.png"),
    { force: true },
  );
  fs.rmSync(
    path.join(
      rootDir,
      "release",
      "screenshots",
      "feature_graphic_google_play.png",
    ),
    { force: true },
  );
  write(
    rootDir,
    "release/screenshots/screenshot-plan.md",
    "# screenshot-plan\n\nTODO: add store screenshots later.\n",
  );
  write(
    rootDir,
    "assets/store/screenshots-guideline.md",
    "# screenshots-guideline\n\nplaceholder\n",
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:store-screenshot:01_home_salary\.png/);
  assert.match(report, /mobile:store-feature-graphic/);
  assert.match(report, /mobile:screenshot-plan/);
  assert.match(report, /mobile:screenshot-guideline/);
});

test("blocks placeholder-sized store screenshots and feature graphic", () => {
  const rootDir = makeWorkspace();
  write(rootDir, "release/screenshots/01_home_salary.png", validPng);
  write(
    rootDir,
    "release/screenshots/feature_graphic_google_play.png",
    validPng,
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:store-screenshot:01_home_salary\.png/);
  assert.match(report, /mobile:store-feature-graphic/);
  assert.match(report, /store screenshot/i);
  assert.match(report, /feature graphic/i);
});

test("blocks tiny store screenshot PNGs with spoofed dimensions", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/screenshots/02_daily_budget.png",
    validPhoneScreenshotPng,
  );
  write(
    rootDir,
    "release/screenshots/feature_graphic_google_play.png",
    validFeatureGraphicPng,
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:store-screenshot:02_daily_budget\.png/);
  assert.match(report, /mobile:store-feature-graphic/);
  assert.match(report, /store screenshot/i);
});

test("blocks missing store privacy, data safety, review, and content rating materials", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "store", "data-safety.md"), {
    force: true,
  });
  write(
    rootDir,
    "release/store/app-privacy.md",
    "# App Privacy\n\nTODO: fill App Store privacy nutrition label later.\n",
  );
  write(
    rootDir,
    "release/store/review-notes.md",
    "# Review Notes\n\nReviewer password: hunter2\n",
  );
  write(
    rootDir,
    "release/store/content-rating.md",
    "# Content Rating\n\nplaceholder\n",
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:store:data-safety/);
  assert.match(report, /mobile:store:app-privacy/);
  assert.match(report, /mobile:store:review-notes/);
  assert.match(report, /mobile:store:content-rating/);
});

test("blocks when the GitHub repository policy file is missing", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "infra", "github", "repository.md"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.blockers.some((blocker) =>
      blocker.includes("infra/github/repository.md"),
    ),
  );
});

test("blocks when the release target manifest is missing", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "release-targets.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /release-targets\.json/);
});

test("blocks external evidence that drifts from release target manifest", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "telos/other-platform",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games", "RETRO-DB"],
      repositoryMatched: true,
    },
    cloudflare: {
      connectorReachable: true,
      accountObserved: true,
      expectedWorkers: ["other-api"],
      missingWorkers: [],
      expectedAdminWorker: "other-admin",
      adminDeploymentType: "workers-opennext",
      adminWorkerMatched: true,
    },
    neon: {
      connectorReachable: true,
      organizationObserved: true,
      expectedProjectHint: "other-project",
      projectMatched: true,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /release-target-manifest:github/);
  assert.match(report, /release-target-manifest:cloudflare-workers/);
  assert.match(report, /release-target-manifest:cloudflare-admin-worker/);
  assert.match(report, /release-target-manifest:neon/);
});

test("blocks external connector evidence that does not match release targets", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games"],
      repositoryMatched: false,
    },
    cloudflare: {
      connectorReachable: true,
      accountObserved: true,
      expectedWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-scheduler",
        "salary-hijacking-admin",
      ],
      missingWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
        "salary-hijacking-admin",
      ],
      expectedAdminWorker: "salary-hijacking-admin",
      adminDeploymentType: "workers-opennext",
      adminWorkerMatched: false,
    },
    neon: {
      connectorReachable: true,
      organizationObserved: true,
      expectedProjectHint: "salary-hijacking",
      projectMatched: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /New GitHub repository creation\/access/);
  assert.match(report, /Cloudflare Worker evidence/);
  assert.match(report, /Cloudflare Admin Worker evidence/);
  assert.match(report, /Neon connector evidence/);
});

test("blocks GitHub repository evidence without write or push proof", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games", "RETRO-DB"],
      repositoryMatched: true,
      writeAccessProven: false,
      pushProven: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /external-evidence:github-write-access/);
  assert.match(report, /GitHub write or push access/);
});

test("uses pnpm dlx as the EAS CLI launcher when eas is not installed locally", () => {
  const rootDir = makeWorkspace();

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) => command !== "eas" && command !== "neon",
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /cli:Expo EAS CLI launcher/);
  assert.doesNotMatch(report, /Expo EAS CLI launcher is not available/);
});

test("uses workspace-local Wrangler when the global wrangler command is not on PATH", () => {
  const rootDir = makeWorkspace();
  write(rootDir, "node_modules/.bin/wrangler.cmd");

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) => command !== "wrangler",
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /cli:Cloudflare Wrangler/);
  assert.match(report, /available locally: node_modules\/\.bin\/wrangler\.cmd/);
  assert.doesNotMatch(report, /Cloudflare Wrangler is not available on PATH/);
});

test("uses workspace-local GitHub and Neon CLIs when global commands are not on PATH", () => {
  const rootDir = makeWorkspace();
  write(rootDir, ".tools/gh/bin/gh.exe");
  write(rootDir, "node_modules/.bin/neonctl.cmd");

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) => !["gh", "neon", "neonctl"].includes(command),
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /cli:GitHub CLI/);
  assert.match(report, /available locally: \.tools\/gh\/bin\/gh\.exe/);
  assert.match(report, /cli:Neon CLI/);
  assert.match(report, /available locally: node_modules\/\.bin\/neonctl\.cmd/);
  assert.doesNotMatch(report, /GitHub CLI is not available on PATH/);
  assert.doesNotMatch(report, /Neon CLI is not available on PATH/);
});

test("blocks when mobile native release evidence is missing or unverified", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "mobile-native-evidence.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile-native-evidence\.json/);
  assert.match(report, /mobile:native:evidence/);
});

test("blocks when current-head mobile preview evidence is missing", () => {
  const rootDir = makeWorkspace();
  fs.rmSync(path.join(rootDir, "release", "mobile-preview-evidence.json"), {
    force: true,
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile-preview-evidence\.json/);
  assert.match(report, /mobile:preview:evidence/);
});

test("passes current-head mobile preview evidence without treating physical phone QA as complete", () => {
  const rootDir = makeWorkspace();

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /mobile:preview:apk/);
  assert.match(report, /mobile:preview:emulator-qa/);
  assert.match(report, /mobile:preview:physical-phone/);
  assert.match(report, /Physical phone preview QA remains tracked as pending/);
});

test("uses local no-secret physical phone proof when present", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/mobile-preview-phone-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        appIdentity: {
          appSlug: "salary-hijacking",
          androidPackage: "com.salaryhijacking.mobile",
          iosBundleIdentifier: "com.salaryhijacking.mobile",
        },
        android: {
          physicalPhoneVerified: true,
          installVerified: true,
          coldStartRuns: 20,
          coldStartFatalCount: 0,
          navigationSmokeVerified: true,
          backgroundForegroundVerified: true,
          backgroundForegroundRuns: 20,
          persistenceVerified: true,
          keyboardSafeAreaVerified: true,
          logcatSummary: {
            fatalExceptionCount: 0,
            reactNativeFatalCount: 0,
            expoErrorCount: 0,
            rawLogcatStored: false,
          },
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsSigningKey: false,
          containsReviewerPassword: false,
          containsRawLogcat: false,
          containsSecretValues: false,
          containsRawDeviceIdentifier: false,
        },
      },
      null,
      2,
    ),
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /mobile:preview:physical-phone/);
  assert.match(
    report,
    /Physical phone preview QA is verified by local no-secret proof/,
  );
});

test("blocks physical phone proof that lacks persistence and keyboard safe-area QA", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/mobile-preview-phone-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        appIdentity: {
          appSlug: "salary-hijacking",
          androidPackage: "com.salaryhijacking.mobile",
          iosBundleIdentifier: "com.salaryhijacking.mobile",
        },
        android: {
          physicalPhoneVerified: true,
          installVerified: true,
          coldStartRuns: 20,
          backgroundForegroundRuns: 20,
          coldStartFatalCount: 0,
          logcatSummary: {
            fatalExceptionCount: 0,
            reactNativeFatalCount: 0,
            expoErrorCount: 0,
            rawLogcatStored: false,
          },
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsSigningKey: false,
          containsReviewerPassword: false,
          containsRawLogcat: false,
          containsSecretValues: false,
          containsRawDeviceIdentifier: false,
        },
      },
      null,
      2,
    ),
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:physical-phone/);
  assert.match(report, /persistence, keyboard\/safe-area/);
});

test("blocks physical phone proof below the required 20-run cold-start and background QA", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/mobile-preview-phone-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        appIdentity: {
          appSlug: "salary-hijacking",
          androidPackage: "com.salaryhijacking.mobile",
          iosBundleIdentifier: "com.salaryhijacking.mobile",
        },
        android: {
          physicalPhoneVerified: true,
          installVerified: true,
          coldStartRuns: 5,
          coldStartFatalCount: 0,
          navigationSmokeVerified: true,
          backgroundForegroundVerified: true,
          backgroundForegroundRuns: 5,
          persistenceVerified: true,
          keyboardSafeAreaVerified: true,
          logcatSummary: {
            fatalExceptionCount: 0,
            reactNativeFatalCount: 0,
            expoErrorCount: 0,
            rawLogcatStored: false,
          },
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsSigningKey: false,
          containsReviewerPassword: false,
          containsRawLogcat: false,
          containsSecretValues: false,
          containsRawDeviceIdentifier: false,
        },
      },
      null,
      2,
    ),
  );

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:physical-phone/);
  assert.match(report, /20 cold-start and background\/foreground runs/);
});

test("passes current-head mobile preview evidence with phone-target APK proof", () => {
  const rootDir = makeWorkspace();
  writeMobilePreviewEvidence(rootDir, {
    android: {
      phoneTargetDebugApkBuilt: true,
      phoneTargetDebugApkSigned: true,
      phoneTargetDebugApkSha256:
        "10C3FC2ED13C90F19DEFDE57062B88ED220D74623B3EC251C6CE03BBCC8101D8",
      phoneTargetDebugApkDownloadVerified: true,
      phoneTargetDebugApkAbis: ["arm64-v8a"],
      phoneTargetDebugApkAbiFilterVerified: true,
      phoneTargetDebugApkExpoCoreLibs: [
        "lib/arm64-v8a/libexpo-modules-core.so",
      ],
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /mobile:preview:phone-target-apk/);
  assert.match(
    report,
    /10C3FC2ED13C90F19DEFDE57062B88ED220D74623B3EC251C6CE03BBCC8101D8/,
  );
});

test("blocks when mobile preview APK does not package the latest source changes", () => {
  const rootDir = makeWorkspace();
  writeMobilePreviewEvidence(rootDir, {
    android: {
      latestSourceChangesPackaged: false,
      latestSourceChangesPackageBlocker:
        "Local Android toolchain and EAS authentication are unavailable.",
      latestSourceChangesEvidence: [
        "apps/mobile/src/features/salary/__tests__/salary.components.test.tsx",
      ],
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:latest-source-apk/);
  assert.match(
    report,
    /latest source changes must be packaged into a fresh Android preview APK/,
  );
});

test("blocks latest-source preview APK evidence when mobile source has uncommitted changes", () => {
  const rootDir = makeWorkspace();

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({
      ok: true,
      output:
        " M apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx\n",
    }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:latest-source-apk/);
  assert.match(
    report,
    /uncommitted mobile source changes exist after the latest preview APK evidence/,
  );
});

test("passes latest-source preview APK evidence when dirty mobile source snapshot matches evidence", () => {
  const rootDir = makeWorkspace();
  const dirtyStatus =
    " M apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx\n";
  write(
    rootDir,
    "apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx",
    "export const planReferenceVersion = 'packaged';\n",
  );
  writeMobilePreviewEvidence(rootDir, {
    android: {
      latestSourceGitStatusSha256:
        "44FD6517D9594DDFDABC7E944C257570E1EBB7CB27951789AE0EBF3E9E1B892A",
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({
      ok: true,
      output: dirtyStatus,
    }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /mobile:preview:latest-source-apk/);
  assert.match(
    report,
    /dirty mobile source snapshot matches preview APK evidence/,
  );
});

test("blocks latest-source preview APK evidence when a dirty mobile file changes after packaging", () => {
  const rootDir = makeWorkspace();
  const dirtyStatus =
    " M apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx\n";
  write(
    rootDir,
    "apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx",
    "export const planReferenceVersion = 'changed-after-apk';\n",
  );
  writeMobilePreviewEvidence(rootDir, {
    android: {
      latestSourceGitStatusSha256:
        "44FD6517D9594DDFDABC7E944C257570E1EBB7CB27951789AE0EBF3E9E1B892A",
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({
      ok: true,
      output: dirtyStatus,
    }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:latest-source-apk/);
  assert.match(
    report,
    /uncommitted mobile source changes exist after the latest preview APK evidence/,
  );
});

test("blocks when phone-target mobile preview APK evidence is incomplete", () => {
  const rootDir = makeWorkspace();
  writeMobilePreviewEvidence(rootDir, {
    android: {
      phoneTargetDebugApkBuilt: true,
      phoneTargetDebugApkSigned: true,
      phoneTargetDebugApkSha256: "not-a-sha",
      phoneTargetDebugApkDownloadVerified: true,
      phoneTargetDebugApkAbis: ["x86_64"],
      phoneTargetDebugApkAbiFilterVerified: true,
      phoneTargetDebugApkExpoCoreLibs: ["lib/x86_64/libexpo-modules-core.so"],
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:phone-target-apk/);
  assert.match(
    report,
    /phone-target preview\/debug APK evidence must prove build, signing, download, single arm64-v8a compatibility, Expo native module library presence, and SHA256/,
  );
  assert.doesNotMatch(report, /not-a-sha/);
});

test("blocks when mobile preview evidence embeds unsafe local QA data", () => {
  const rootDir = makeWorkspace();
  writeMobilePreviewEvidence(rootDir, {
    privacy: {
      containsEasToken: false,
      containsStoreCredential: false,
      containsSigningKey: true,
      containsReviewerPassword: false,
      containsRawLogcat: false,
      containsSecretValues: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:preview:privacy-flags/);
  assert.match(
    report,
    /mobile-preview-evidence\.json must not declare unsafe preview QA privacy flags/,
  );
});

test("treats iOS native evidence as post-launch when Android is the primary release platform", () => {
  const rootDir = makeWorkspace();
  writeReleaseTargets(rootDir, {
    mobile: {
      expectedAppSlug: "salary-hijacking",
      expectedAndroidPackage: "com.salaryhijacking.mobile",
      expectedIosBundleIdentifier: "com.salaryhijacking.mobile",
      primaryReleasePlatform: "android",
      postLaunchPlatforms: ["ios"],
    },
  });
  writeMobileNativeEvidence(rootDir, {
    ios: {
      productionBuildVerified: false,
      productionBuildProfile: "production",
      storeSubmitDryRunVerified: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /mobile:native:ios-build/);
  assert.match(report, /iOS production EAS build is tracked as post-launch/);
  assert.match(report, /mobile:native:ios-submit/);
  assert.match(report, /iOS store submit proof is tracked as post-launch/);
});

test("blocks when mobile native release evidence declares secret values", () => {
  const rootDir = makeWorkspace();
  writeMobileNativeEvidence(rootDir, { containsSecretValues: true });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:native:secret-values/);
  assert.match(
    report,
    /mobile-native-evidence\.json must not contain raw native release secrets/,
  );
});

test("blocks when mobile native release evidence declares unsafe privacy flags", () => {
  const rootDir = makeWorkspace();
  writeMobileNativeEvidence(rootDir, {
    privacy: {
      containsEasToken: true,
      containsStoreCredential: false,
      containsBinaryDownloadUrl: false,
      containsReviewerPassword: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /mobile:native:privacy-flags/);
  assert.match(
    report,
    /mobile-native-evidence\.json must not declare native release secret or artifact privacy flags/,
  );
});

test("blocks when mobile native release evidence app identity drifts from release targets", () => {
  const rootDir = makeWorkspace();
  writeMobileNativeEvidence(rootDir, {
    appIdentity: {
      appSlug: "retro-games",
      androidPackage: "com.retrogames.mobile",
      iosBundleIdentifier: "com.retrogames.mobile",
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitRemote: () => ({
      ok: true,
      output: ["origin https://github.com/jinbizman-boop/salary-hijacking.git"],
    }),
    gitHead: () => ({ ok: true, output: ["abc123"] }),
    gitRemoteHead: () => ({ ok: true, output: ["abc123\trefs/heads/main"] }),
  });

  const report = formatReleaseReadinessReport(result);
  assert.equal(result.ok, false);
  assert.match(report, /mobile:native:app-identity/);
  assert.match(
    report,
    /mobile native evidence must match release target app identity/i,
  );
});

test("uses EAS mobile native evidence when local Android tools are unavailable", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) => !["adb", "emulator"].includes(command),
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /mobile:native:android-build/);
  assert.match(report, /mobile:native:android-e2e/);
  assert.doesNotMatch(report, /Android adb is not available/);
  assert.doesNotMatch(report, /Android emulator is not available/);
});

test("uses Android SDK default tool paths without treating tools as native E2E proof", () => {
  const rootDir = makeWorkspace();
  const sdkRoot = path.join(rootDir, "Android", "Sdk");
  const binDir = path.join(rootDir, "bin");
  write(rootDir, "bin/git.EXE");
  write(rootDir, "Android/Sdk/platform-tools/adb.EXE");
  write(rootDir, "Android/Sdk/emulator/emulator.EXE");
  writeMobileNativeEvidence(rootDir, {
    android: {
      productionBuildVerified: true,
      productionBuildProfile: "production",
      productionArtifactType: "aab",
      storeSubmitDryRunVerified: true,
      nativeE2eVerified: false,
      nativeE2eConfiguration: "android.emu.debug",
      localAdbAvailable: false,
      localEmulatorAvailable: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: {
      ...completeEnv,
      ANDROID_SDK_ROOT: sdkRoot,
      PATH: binDir,
      Path: binDir,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
    },
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);
  const androidE2eCheck = result.checks.find(
    (check) => check.name === "mobile:native:android-e2e",
  );

  assert.equal(androidE2eCheck?.status, "BLOCKED");
  assert.equal(
    androidE2eCheck?.detail,
    "Android native E2E proof is missing; local adb/emulator are available for execution",
  );
  assert.match(
    report,
    /Android native E2E proof is missing; local adb\/emulator are available for execution/,
  );
  assert.doesNotMatch(report, /local adb\/emulator are unavailable/);
});

test("blocks release evidence that does not prove the new GitHub repository policy", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: false,
      protectedExistingRepositories: ["Retro Games"],
      repositoryMatched: false,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /new GitHub repository/i);
  assert.match(report, /existing repositories/i);
  assert.match(report, /Retro Games/);
});

test("blocks release evidence when RETRO-DB is not explicitly protected", () => {
  const rootDir = makeWorkspace();
  writeExternalEvidence(rootDir, {
    github: {
      connectorReachable: true,
      appInstalled: true,
      expectedRepository: "jinbizman-boop/salary-hijacking",
      repositoryCreationRequired: true,
      existingRepositoriesMustNotBeModified: true,
      protectedExistingRepositories: ["Retro Games"],
      repositoryMatched: true,
    },
  });

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /RETRO-DB/);
  assert.match(report, /existing repositories/i);
});

test("blocks when runtime GitHub repository does not match external evidence", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: {
      ...completeEnv,
      GITHUB_REPOSITORY: "jinbizman-boop/RETRO-DB",
    },
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /GITHUB_REPOSITORY/);
  assert.match(report, /expected GitHub repository/i);
  assert.match(report, /jinbizman-boop\/salary-hijacking/);
});

test("blocks when runtime Cloudflare Admin Worker does not match external evidence", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: {
      ...completeEnv,
      CF_ADMIN_WORKER_NAME: "retro-db",
    },
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /CF_ADMIN_WORKER_NAME/);
  assert.match(report, /expected Cloudflare Admin Worker/i);
  assert.match(report, /salary-hijacking-admin/);
});

test("blocks when git remote origin is not configured", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({ ok: false, output: "fatal: No such remote 'origin'" }),
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /git remote origin/i);
  assert.match(report, /jinbizman-boop\/salary-hijacking/);
});

test("blocks when git remote origin points to a different repository", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({
      ok: true,
      output: "https://github.com/jinbizman-boop/RETRO-DB.git",
    }),
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /git remote origin/i);
  assert.match(report, /expected GitHub repository/i);
  assert.match(report, /jinbizman-boop\/salary-hijacking/);
});

test("strict exit code fails READY results that still contain warnings", () => {
  const readyWithWarnings = {
    ok: true,
    status: "READY",
    version: "test",
    checkedAt: "2026-07-12T00:00:00.000Z",
    checks: [],
    blockers: [],
    warnings: ["git repository has local changes"],
  };

  assert.equal(
    resolveReleaseReadinessExitCode(readyWithWarnings, {
      soft: false,
      strict: false,
    }),
    0,
  );
  assert.equal(
    resolveReleaseReadinessExitCode(readyWithWarnings, {
      soft: true,
      strict: true,
    }),
    0,
  );
  assert.equal(
    resolveReleaseReadinessExitCode(readyWithWarnings, {
      soft: false,
      strict: true,
    }),
    1,
  );
});

test("strict exit code fails READY results when physical phone preview QA is still pending", () => {
  const readyWithPendingPhysicalPhone = {
    ok: true,
    status: "READY",
    version: "test",
    checkedAt: "2026-07-12T00:00:00.000Z",
    checks: [
      {
        status: "PASS",
        name: "mobile:preview:physical-phone",
        detail: "Physical phone preview QA remains tracked as pending",
      },
    ],
    blockers: [],
    warnings: [],
  };

  assert.equal(
    resolveReleaseReadinessExitCode(readyWithPendingPhysicalPhone, {
      soft: false,
      strict: false,
    }),
    0,
  );
  assert.equal(
    resolveReleaseReadinessExitCode(readyWithPendingPhysicalPhone, {
      soft: true,
      strict: true,
    }),
    0,
  );
  assert.equal(
    resolveReleaseReadinessExitCode(readyWithPendingPhysicalPhone, {
      soft: false,
      strict: true,
    }),
    1,
  );
});

test("strict gate projection marks pending physical phone READY results as BLOCKED", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  assert.equal(
    typeof readinessModule.applyStrictReleaseReadinessGates,
    "function",
  );
  const readyWithPendingPhysicalPhone = {
    ok: true,
    status: "READY",
    version: "test",
    checkedAt: "2026-07-12T00:00:00.000Z",
    checks: [
      {
        status: "PASS",
        name: "mobile:preview:physical-phone",
        detail: "Physical phone preview QA remains tracked as pending",
      },
    ],
    blockers: [],
    warnings: [],
  };

  const strictResult = readinessModule.applyStrictReleaseReadinessGates(
    readyWithPendingPhysicalPhone,
  );
  const report = formatReleaseReadinessReport(strictResult);

  assert.equal(strictResult.ok, false);
  assert.equal(strictResult.status, "BLOCKED");
  assert.match(report, /strict:physical-phone/);
  assert.match(report, /physical phone preview QA remains pending/i);
});

test("strict readiness blocks production diagnostic, RC, and mock-only mobile paths", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "apps/mobile/app/(tabs)/stable-home.tsx",
    "export default function StableHomeDiagnostic() { return null; }\n",
  );
  write(
    rootDir,
    "apps/mobile/src/features/salary/rc-shell.tsx",
    "export const rcShell = 'release candidate shell';\n",
  );
  write(
    rootDir,
    "apps/mobile/src/shared/api/mock-only-production.ts",
    "export const mockOnlyProductionPath = true;\n",
  );

  const softResult = readinessModule.analyzeReleaseReadiness({
    rootDir,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({
      ok: true,
      output:
        "origin https://github.com/jinbizman-boop/salary-hijacking.git (fetch)\norigin https://github.com/jinbizman-boop/salary-hijacking.git (push)\n",
    }),
    gitHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteTrackingHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
  });
  const strictResult =
    readinessModule.applyStrictReleaseReadinessGates(softResult);
  const report = formatReleaseReadinessReport(strictResult);

  assert.equal(strictResult.ok, false);
  assert.equal(strictResult.status, "BLOCKED");
  assert.match(report, /strict:mobile-temporary-runtime-path/);
  assert.match(report, /stable-home\.tsx/);
  assert.match(report, /rc-shell\.tsx/);
  assert.match(report, /mock-only-production\.ts/);
});

test("strict readiness blocks mobile route dependencies on CleanFintech fallback screens", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "apps/mobile/app/(tabs)/level/index.tsx",
    "import { normalizeGrowthDashboardForCleanFintech } from '../../../src/shared/styles/clean-fintech-screens';\nexport default function LevelScreen() { return null; }\n",
  );
  write(
    rootDir,
    "apps/mobile/app/(tabs)/salary/index.tsx",
    "export default function SalaryScreen() { return <CleanFintechSalaryScreen />; }\n",
  );
  write(
    rootDir,
    "apps/mobile/app/community/[postId].tsx",
    "function response(value) { return { ok: true, data: value }; }\nexport default function CommunityDetail() { return null; }\n",
  );
  write(
    rootDir,
    "apps/mobile/app/community/sample-fallback.tsx",
    "const sampleDetail = { id: 'fake-post' };\nconst sampleComments = [];\nexport default function SampleFallback() { return sampleDetail.id; }\n",
  );

  const softResult = readinessModule.analyzeReleaseReadiness({
    rootDir,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({
      ok: true,
      output: "https://github.com/jinbizman-boop/salary-hijacking.git",
    }),
    gitHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteTrackingHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
  });
  const strictResult =
    readinessModule.applyStrictReleaseReadinessGates(softResult);
  const report = formatReleaseReadinessReport(strictResult);

  assert.equal(strictResult.ok, false);
  assert.equal(strictResult.status, "BLOCKED");
  assert.match(report, /strict:mobile-route-fallback-boundary/);
  assert.match(report, /level\/index\.tsx/);
  assert.match(report, /salary\/index\.tsx/);
  assert.match(report, /community\/\[postId\]\.tsx/);
  assert.match(report, /community\/sample-fallback\.tsx/);
  assert.match(report, /clean-fintech-screens/);
  assert.match(report, /CleanFintechSalaryScreen/);
  assert.match(report, /function response/);
  assert.match(report, /sampleDetail/);
  assert.match(report, /sampleComments/);
});

test("strict readiness blocks mobile feature dependencies on CleanFintech fallback screens", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "apps/mobile/src/features/profile/components/ProfileHub.tsx",
    "import { CleanFintechScreen } from '../../../shared/styles/clean-fintech-screens';\nexport function ProfileHub() { return <CleanFintechScreen />; }\n",
  );
  write(
    rootDir,
    "apps/mobile/src/features/community/components/Detail.tsx",
    "const sampleDetail = { id: 'fake' };\nexport function Detail() { return sampleDetail.id; }\n",
  );

  const softResult = readinessModule.analyzeReleaseReadiness({
    rootDir,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({
      ok: true,
      output: "https://github.com/jinbizman-boop/salary-hijacking.git",
    }),
    gitHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteTrackingHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
  });
  const strictResult =
    readinessModule.applyStrictReleaseReadinessGates(softResult);
  const report = formatReleaseReadinessReport(strictResult);

  assert.equal(strictResult.ok, false);
  assert.equal(strictResult.status, "BLOCKED");
  assert.match(report, /strict:mobile-feature-fallback-boundary/);
  assert.match(report, /ProfileHub\.tsx/);
  assert.match(report, /Detail\.tsx/);
  assert.match(report, /CleanFintechScreen/);
  assert.match(report, /sampleDetail/);
});

test("strict readiness blocks TODO and FIXME markers in mobile runtime source", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "apps/mobile/app/(tabs)/salary/index.tsx",
    "export default function SalaryScreen() { // TODO replace RC shell\n  return null;\n}\n",
  );
  write(
    rootDir,
    "apps/mobile/src/features/plan/components/PlanScreen.tsx",
    "export const PlanScreen = () => {\n  // FIXME server sync gap\n  return null;\n};\n",
  );

  const softResult = readinessModule.analyzeReleaseReadiness({
    rootDir,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({
      ok: true,
      output: "https://github.com/jinbizman-boop/salary-hijacking.git",
    }),
    gitHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteTrackingHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
  });
  const strictResult =
    readinessModule.applyStrictReleaseReadinessGates(softResult);
  const report = formatReleaseReadinessReport(strictResult);

  assert.equal(strictResult.ok, false);
  assert.equal(strictResult.status, "BLOCKED");
  assert.match(report, /strict:mobile-runtime-incomplete-marker/);
  assert.match(report, /salary\/index\.tsx/);
  assert.match(report, /PlanScreen\.tsx/);
});

test("strict readiness blocks unresolved P0/P1/P2 gap register entries", async () => {
  const readinessModule = await import("./check-release-readiness.mjs");
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "docs/codex/100-completion/05_GAP_REGISTER.md",
    `# Gap Register

| Gap ID | Severity | Area | Description | Required Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| GAP-001 | P0 | Release source | Dirty tree | clean tree | FAIL |
| GAP-002 | P1 | Dependencies | Frozen install | install log | PASS |
| GAP-003 | P1 | Mobile startup | Phone QA | physical phone report | BLOCKED |
| GAP-004 | P2 | UI | Responsive matrix | screenshots | PARTIAL |
`,
  );

  const softResult = readinessModule.analyzeReleaseReadiness({
    rootDir,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: () => ({
      ok: true,
      output: "https://github.com/jinbizman-boop/salary-hijacking.git",
    }),
    gitHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
    gitRemoteTrackingHead: () => ({
      ok: true,
      output: "cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb",
    }),
  });
  const strictResult =
    readinessModule.applyStrictReleaseReadinessGates(softResult);
  const report = formatReleaseReadinessReport(strictResult);

  assert.equal(strictResult.ok, false);
  assert.equal(strictResult.status, "BLOCKED");
  assert.match(report, /BLOCKED docs:gap-register/);
  assert.doesNotMatch(
    report,
    /strict:warning.*unresolved launch-blocking gaps/s,
  );
  assert.match(report, /GAP-001/);
  assert.match(report, /GAP-003/);
  assert.match(report, /GAP-004/);
  assert.doesNotMatch(report, /GAP-002.*strict:gap-register/s);
});
