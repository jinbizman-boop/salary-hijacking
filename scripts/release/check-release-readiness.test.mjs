import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  analyzeReleaseReadiness,
  formatReleaseReadinessReport,
} from "./check-release-readiness.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const officialBrandLogoPath =
  "apps/mobile/assets/brand/salary-hijacking-platform-logo.png";
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
    },
    neon: {
      expectedProjectHint: "salary-hijacking",
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
        stores: ["github-environment", "provider-secret-store"],
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
      workerSecretBindingsVerified: true,
    },
    networking: {
      customDomainsVerified: true,
      certificatesVerified: true,
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

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-release-ready-"),
  );

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
  writeSecretsEvidence(rootDir);
  writeCloudflareRuntimeEvidence(rootDir);
  writeDatabaseEvidence(rootDir);
  writePublicUrlEvidence(rootDir);
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
  assert.ok(result.warnings.some((warning) => warning.includes("GitHub CLI")));
  assert.ok(
    result.warnings.some((warning) => warning.includes("Cloudflare Wrangler")),
  );
  assert.ok(result.warnings.some((warning) => warning.includes("Neon CLI")));
  assert.match(report, /WARN cli:GitHub CLI/);
  assert.match(report, /WARN cli:Cloudflare Wrangler/);
  assert.match(report, /WARN cli:Neon CLI/);
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

test("uses workspace-local EAS CLI when eas is not on PATH", () => {
  const rootDir = makeWorkspace();
  write(rootDir, "apps/mobile/node_modules/.bin/eas.CMD", "@echo off\n");

  const result = analyzeReleaseReadiness({
    rootDir,
    env: completeEnv,
    commandExists: (command) => command !== "eas",
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, true);
  assert.match(report, /cli:Expo EAS CLI/);
  assert.doesNotMatch(report, /Expo EAS CLI is not available/);
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
