import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runExternalIntegrationPreflight } from "./check-external-integrations.mjs";

const VALID_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l7mF4QAAAABJRU5ErkJggg==",
  "base64",
);

async function writeFixture(rootDir, overrides = {}) {
  const files = {
    ".gitignore": `
node_modules/
dist/
build/
**/build/
!scripts/build/
!scripts/build/**
`,
    ".github/workflows/ci.yml": `
name: CI
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm test:e2e
      - run: pnpm audit --prod --audit-level high
`,
    ".github/workflows/deploy-api.yml": `
name: Deploy API
on: [workflow_dispatch]
jobs:
  deploy:
    environment:
      name: api-staging
    env:
      CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
    steps:
      - run: pnpm exec wrangler deploy --dry-run
      - run: pnpm exec wrangler deploy --env staging
`,
    ".github/workflows/deploy-admin.yml": `
name: Deploy Admin
on: [workflow_dispatch]
env:
  ADMIN_OPEN_NEXT_DIR: apps/admin/.open-next
  CLOUDFLARE_ADMIN_WORKER_NAME: salary-hijacking-admin
jobs:
  deploy:
    environment:
      name: admin-preview
    env:
      CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
    steps:
      - run: pnpm --dir apps/admin build:cloudflare
      - run: pnpm --dir apps/admin exec wrangler deploy --env staging --config wrangler.jsonc
`,
    ".github/workflows/mobile-build.yml": `
name: Mobile Build
on: [workflow_dispatch]
jobs:
  eas:
    environment:
      name: mobile-preview
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.run_eas_build != 'false'
    env:
      EXPO_TOKEN: \${{ secrets.EXPO_TOKEN }}
    steps:
      - run: pnpm --dir "$MOBILE_APP_DIR" run export
      - run: echo "Native mobile E2E skipped because no local E2E APK was found"
      - run: pnpm dlx eas-cli@latest build --profile preview --platform all
`,
    ".github/workflows/release.yml": `
name: Release
on: [workflow_dispatch]
jobs:
  release:
    environment:
      name: release-prerelease
    env:
      GH_TOKEN: \${{ github.token }}
    steps:
      - run: gh release create v1.0.0 release-artifacts/*
`,
    ".github/workflows/security-scan.yml": `
name: Security Scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - run: echo sensitiveWorkflowKeyPattern unsafeWorkflowAssignmentPattern
`,
    "services/api/wrangler.toml": `
name = "salary-hijacking-api"
main = "src/index.ts"
compatibility_date = "2026-06-01"

[env.staging]
name = "salary-hijacking-api-staging"
[env.staging.vars]
APP_ENV = "staging"
[[env.staging.r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "salary-hijacking-staging-uploads"
[[env.staging.queues.producers]]
binding = "OPERATIONS_QUEUE"
queue = "salary-hijacking-staging-operations"
[env.staging.triggers]
crons = ["0 * * * *"]

[env.production]
name = "salary-hijacking-api-production"
[env.production.vars]
APP_ENV = "production"
[[env.production.r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "salary-hijacking-production-uploads"
[[env.production.queues.producers]]
binding = "OPERATIONS_QUEUE"
queue = "salary-hijacking-production-operations"
[env.production.triggers]
crons = ["0 * * * *"]
`,
    "services/notifications/wrangler.toml": `
name = "salary-hijacking-notifications"
main = "src/index.ts"
compatibility_date = "2026-06-01"

[env.staging]
name = "salary-hijacking-notifications-staging"
[env.staging.vars]
APP_ENV = "staging"
[[env.staging.queues.producers]]
binding = "RETRY_QUEUE"
queue = "salary-hijacking-staging-notifications-retry"
[env.staging.triggers]
crons = ["0 * * * *"]

[env.production]
name = "salary-hijacking-notifications-production"
[env.production.vars]
APP_ENV = "production"
[[env.production.queues.producers]]
binding = "RETRY_QUEUE"
queue = "salary-hijacking-production-notifications-retry"
[env.production.triggers]
crons = ["0 * * * *"]
`,
    "services/scheduler/wrangler.toml": `
name = "salary-hijacking-scheduler"
main = "src/index.ts"
compatibility_date = "2026-06-01"

[env.staging]
name = "salary-hijacking-scheduler-staging"
[env.staging.vars]
APP_ENV = "staging"
[env.staging.triggers]
crons = ["0 * * * *"]

[env.production]
name = "salary-hijacking-scheduler-production"
[env.production.vars]
APP_ENV = "production"
[env.production.triggers]
crons = ["0 * * * *"]
`,
    "infra/neon/README.md":
      "Neon Serverless Postgres uses DATABASE_URL and pooled serverless connections.",
    "infra/neon/connection-pooling.md":
      "Use pooled Neon connection strings for serverless Workers.",
    "infra/neon/branching-strategy.md":
      "Use isolated staging and preview branches before production.",
    "infra/neon/backup-restore.md":
      "Use point-in-time restore and tested backup restore procedures.",
    "infra/cloudflare/README.md": `
# Cloudflare Infrastructure

Required Workers:
- salary-hijacking-api
- salary-hijacking-notifications
- salary-hijacking-scheduler

Required Admin OpenNext Worker:
- salary-hijacking-admin

Required runtime resources:
- R2 uploads bucket
- operations queue
- retry queue
- dead letter queue
- staging environment
- production environment
- wrangler deploy --dry-run
- wrangler deploy --env
`,
    "infra/cloudflare/pages/admin-pages.md": `
# Admin OpenNext Worker

Cloudflare Worker: salary-hijacking-admin
Production domain: admin.salaryhijacking.com
Staging Worker: salary-hijacking-admin-staging
Build command: corepack pnpm --filter @salary-hijacking/admin run build:cloudflare
Output directory: apps/admin/.open-next
Deploy command: wrangler deploy --env production
Required secrets are configured in GitHub or Cloudflare, never committed.
`,
    "apps/admin/open-next.config.ts": `
export default {
  buildCommand: "corepack pnpm run build",
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};
`,
    "apps/admin/wrangler.jsonc": `
{
  "name": "salary-hijacking-admin",
  "main": ".open-next/worker.js",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets" },
  "observability": { "enabled": true }
}
`,
    "infra/github/secrets.md": `
# GitHub Secrets

Required secrets:
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN
- DATABASE_URL
- STAGING_DATABASE_URL
- NEON_API_KEY
- NEON_PROJECT_ID
- EXPO_TOKEN
- EAS_PROJECT_ID
- SENTRY_DSN
- SLACK_WEBHOOK_URL

Secret values must stay in GitHub Environments or provider secret stores.
`,
    "infra/github/repository.md": `
# GitHub Repository

The Salary Hijacking release must use a new repository named salary-hijacking under jinbizman-boop.
Existing repositories must not be modified.
The Retro Games repository is unrelated and must not be touched.
The RETRO-DB repository is unrelated and must not be touched.
Configure branch protection and GitHub Environments after the new repository exists.
`,
    "apps/mobile/package.json": JSON.stringify(
      {
        name: "@salary-hijacking/mobile",
        description:
          "급여납치 모바일 앱: 급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티를 서버 권위로 연결하는 Expo 앱",
        scripts: {
          "test:e2e":
            "node scripts/check-detox-env.mjs android.emu.debug && detox test --configuration android.emu.debug",
          "build:production:android":
            "eas build --platform android --profile production --non-interactive",
        },
        devDependencies: {
          "eas-cli": "^20.4.0",
        },
      },
      null,
      2,
    ),
    "apps/mobile/eas.json": JSON.stringify(
      {
        cli: {
          version: ">= 12.0.0",
        },
        build: {
          e2e: {
            env: {
              EXPO_PUBLIC_APP_NAME: "급여납치",
              EXPO_PUBLIC_API_BASE_URL:
                "https://api-staging.salaryhijacking.com",
              EXPO_PUBLIC_DEEPLINK_HOST: "staging.salaryhijacking.com",
            },
            android: {
              buildType: "apk",
            },
          },
          production: {
            env: {
              EXPO_PUBLIC_APP_NAME: "급여납치",
              EXPO_PUBLIC_API_BASE_URL: "https://api.salaryhijacking.com",
              EXPO_PUBLIC_DEEPLINK_HOST: "salaryhijacking.com",
            },
            android: {
              buildType: "app-bundle",
            },
          },
        },
      },
      null,
      2,
    ),
    "apps/mobile/app.config.ts": `
const SERVICE_NAME = "급여납치";
const DEFAULT_API_BASE_URL = "https://api.salaryhijacking.com";
const DEFAULT_DEEPLINK_HOST = "salaryhijacking.com";
function assertNoServerSecretExposure() {}
const privacy = { financialAmountBasedTargeting: false };
`,
    "apps/mobile/assets/icon.png": VALID_PNG,
    "apps/mobile/assets/splash.png": VALID_PNG,
    "apps/mobile/assets/adaptive-icon.png": VALID_PNG,
    "apps/mobile/assets/notification-icon.png": VALID_PNG,
    "apps/mobile/assets/favicon.png": VALID_PNG,
    "release/store/google-play-metadata.md": `
# Google Play Metadata

- app name: 급여납치
- short description: 월급을 지키는 서버 권위 예산 관리 앱
- full description: 급여납치는 급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티를 한곳에서 관리하는 모바일 앱입니다.
- privacy policy: https://salaryhijacking.com/privacy
`,
    "release/store/app-store-metadata.md": `
# App Store Metadata

- app name: 급여납치
- subtitle: 월급을 지키는 예산 루틴
- description: 급여납치는 급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티를 서버 권위 구조로 연결하는 모바일 앱입니다.
- privacy policy: https://salaryhijacking.com/privacy
`,
    "release/store/data-safety.md": `
# Google Play Data Safety Declaration

- Google Play Data safety
- Data collected: account email, user ID, payroll plan data, expense records, savings records, community content, notification preferences, crash logs, diagnostics, and app interactions.
- Data shared: no raw salary, expense, savings, hijack amount, account, card, loan, email, phone, auth token, push token, or raw device identifier is shared with ads, partners, analytics, logs, or push payloads.
- Encryption in transit: required for all API traffic.
- Data deletion requests: available through profile withdrawal request and support flow.
- Third-party SDK review: Expo, FCM, Sentry, analytics, and advertising/partner SDK usage must be reviewed before submission.
`,
    "release/store/app-privacy.md": `
# App Store Privacy Nutrition Label

- App Store Privacy
- Data Used to Track You: None.
- Data Linked to You: email address, user ID, payroll plan data, expense data, savings data, community content, and notification preferences.
- Data Not Linked to You: crash logs, diagnostics, and aggregate app interactions where identifiers are removed.
- Financial Data: collected for app functionality only.
- Privacy policy: https://salaryhijacking.com/privacy
`,
    "release/store/review-notes.md": `
# Store Review Notes

- Reviewer account email: reviewer@salaryhijacking.com
- Reviewer password: provide out-of-band through the store console only.
- Test data: seeded demo payroll, budget, expense, savings, LV UP, notification, and community records only.
- Review Path: log in and confirm salary home, daily budget, plan, notifications, LV UP, community, and profile tabs.
- Account deletion support is available through profile withdrawal request and support contact.
`,
    "release/store/content-rating.md": `
# Store Content Rating Notes

- Category: Finance.
- Target audience: adult and general Korean mobile users; not directed to children.
- User-generated content: community posts and comments are supported and require reporting/moderation.
- Ads: contextual ads or partner placements may appear and must be labeled.
- Final age and content rating must be confirmed in Google Play Console and App Store Connect.
`,
    "release/mobile-native-evidence.json": JSON.stringify(
      {
        schemaVersion: 1,
        observedAt: "2026-07-01T00:00:00Z",
        source: "test-fixture",
        secretsRedacted: true,
        android: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          productionArtifactType: "aab",
          storeSubmitDryRunVerified: true,
          nativeE2eVerified: true,
          nativeE2eConfiguration: "android.emu.debug",
        },
        ios: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          storeSubmitDryRunVerified: true,
        },
      },
      null,
      2,
    ),
    "release/secrets-evidence.json": JSON.stringify(
      {
        schemaVersion: 1,
        observedAt: "2026-07-01T00:00:00Z",
        source: "test-fixture",
        secretsRedacted: true,
        containsSecretValues: false,
        secrets: {
          DATABASE_URL: { verified: true, stores: ["github-environment"] },
          STAGING_DATABASE_URL: {
            verified: true,
            stores: ["github-environment"],
          },
          NEON_API_KEY: { verified: true, stores: ["github-environment"] },
          NEON_PROJECT_ID: { verified: true, stores: ["github-environment"] },
          CLOUDFLARE_API_TOKEN: {
            verified: true,
            stores: ["github-environment"],
          },
          CLOUDFLARE_ACCOUNT_ID: {
            verified: true,
            stores: ["github-environment"],
          },
          CF_ADMIN_WORKER_NAME: {
            verified: true,
            stores: ["github-environment"],
          },
          EXPO_TOKEN: { verified: true, stores: ["github-environment"] },
          EAS_PROJECT_ID: { verified: true, stores: ["github-environment"] },
          GITHUB_TOKEN: { verified: true, stores: ["github-actions"] },
          GITHUB_REPOSITORY: { verified: true, stores: ["github-actions"] },
          SENTRY_DSN: { verified: true, stores: ["github-environment"] },
          SLACK_WEBHOOK_URL: {
            verified: true,
            stores: ["github-environment"],
          },
        },
      },
      null,
      2,
    ),
    "release/cloudflare-runtime-evidence.json": JSON.stringify(
      {
        schemaVersion: 1,
        observedAt: "2026-07-01T00:00:00Z",
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
      },
      null,
      2,
    ),
    "release/database-evidence.json": JSON.stringify(
      {
        schemaVersion: 1,
        observedAt: "2026-07-01T00:00:00Z",
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
          migrationFileCount: 4,
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
      },
      null,
      2,
    ),
    "packages/db/src/client/neon.client.ts":
      'const NEON_SERVERLESS_PACKAGE = "@neondatabase/serverless"; export const DATABASE_URL_ENV_KEYS = ["DATABASE_URL", "NEON_DATABASE_URL"];',
    "database/migrations/0001_init_users.sql": "-- users",
    "database/migrations/0002_payroll_budget_expense.sql": "-- payroll",
    "database/migrations/0003_growth_community_notifications.sql": "-- growth",
    "database/migrations/0004_admin_audit_ads.sql": "-- admin",
    "database/seeds/local.seed.sql": "-- local synthetic seed",
    "database/seeds/staging.seed.sql": "-- staging synthetic seed",
    "database/seeds/uat.seed.sql": "-- uat synthetic seed",
    "scripts/build/fix-esm-imports.mjs":
      "export async function fixEsmImportSpecifiers() { return { checkedFiles: 0, changedFiles: 0 }; }\n",
    "scripts/build/fix-esm-imports.test.mjs":
      "import test from 'node:test';\n\ntest('adds .js to relative ESM import specifiers', () => {});\n",
    "scripts/release/generate-database-evidence.mjs":
      "export function buildDatabaseEvidence() { return { schemaVersion: 1 }; }\n",
    "scripts/release/generate-database-evidence.test.mjs":
      "import test from 'node:test';\n\ntest('generates no-secret database evidence', () => {});\n",
    "scripts/release/generate-secrets-evidence.mjs":
      "export function buildSecretsEvidence() { return { schemaVersion: 1 }; }\n",
    "scripts/release/generate-secrets-evidence.test.mjs":
      "import test from 'node:test';\n\ntest('generates no-secret runtime secret evidence', () => {});\n",
    "scripts/release/generate-cloudflare-runtime-evidence.mjs":
      "export function buildCloudflareRuntimeEvidence() { return { schemaVersion: 1 }; }\n",
    "scripts/release/generate-cloudflare-runtime-evidence.test.mjs":
      "import test from 'node:test';\n\ntest('generates no-secret Cloudflare runtime evidence', () => {});\n",
  };

  for (const [relativePath, content] of Object.entries({
    ...files,
    ...overrides,
  })) {
    const fullPath = path.join(rootDir, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    if (content !== null) {
      await writeFile(
        fullPath,
        content,
        typeof content === "string" ? "utf8" : undefined,
      );
    }
  }
}

test("passes a complete safe GitHub, Cloudflare, and Neon fixture", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir);

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, true, result.failures.join("\n"));
    assert.deepEqual(result.failures, []);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when a workflow hard-codes a sensitive Cloudflare secret", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      ".github/workflows/deploy-api.yml": `
name: Deploy API
on: [workflow_dispatch]
jobs:
  deploy:
    env:
      CLOUDFLARE_API_TOKEN: cf_live_1234567890abcdef
    steps:
      - run: pnpm exec wrangler deploy --env staging
`,
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /hard-coded sensitive value/i);
    assert.match(result.failures.join("\n"), /CLOUDFLARE_API_TOKEN/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when the Neon migration chain is incomplete", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "database/migrations/0004_admin_audit_ads.sql": null,
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(
      result.failures.join("\n"),
      /database\/migrations\/0004_admin_audit_ads\.sql: missing/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when operational infrastructure docs are placeholders", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "infra/cloudflare/README.md":
        "# README\n\nfinal script location placeholder\n",
      "infra/cloudflare/pages/admin-pages.md":
        "# admin-pages\n\n최종 기준 파일\n",
      "infra/github/secrets.md": "# secrets\n\nnot implemented\n",
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /infra\/cloudflare\/README\.md/);
    assert.match(result.failures.join("\n"), /infra\/github\/secrets\.md/);
    assert.match(result.failures.join("\n"), /placeholder/i);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when GitHub repository policy allows reusing an existing repository", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "infra/github/repository.md": `
# GitHub Repository

Reuse an existing repository and push Salary Hijacking changes there.
`,
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /infra\/github\/repository\.md/);
    assert.match(result.failures.join("\n"), /new repository/i);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when GitHub repository policy omits the observed RETRO-DB protection", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "infra/github/repository.md": `
# GitHub Repository

The Salary Hijacking release must use a new repository named salary-hijacking under jinbizman-boop.
Existing repositories must not be modified.
The Retro Games repository is unrelated and must not be touched.
Configure branch protection and GitHub Environments after the new repository exists.
`,
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /infra\/github\/repository\.md/);
    assert.match(result.failures.join("\n"), /RETRO-DB/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when mobile release metadata contains mojibake", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "apps/mobile/package.json": JSON.stringify(
        {
          name: "@salary-hijacking/mobile",
          description: "湲됱뿬?⑹튂 모바일 앱",
          scripts: {
            "test:e2e":
              "node scripts/check-detox-env.mjs android.emu.debug && detox test --configuration android.emu.debug",
            "build:production:android":
              "eas build --platform android --profile production --non-interactive",
          },
          devDependencies: {
            "eas-cli": "^20.4.0",
          },
        },
        null,
        2,
      ),
      "apps/mobile/eas.json": JSON.stringify(
        {
          cli: {
            version: ">= 12.0.0",
          },
          build: {
            production: {
              env: {
                EXPO_PUBLIC_APP_NAME: "湲됱뿬?⑹튂",
                EXPO_PUBLIC_API_BASE_URL:
                  "https://api.salary-hijacking.example",
              },
              android: {
                buildType: "app-bundle",
              },
            },
          },
        },
        null,
        2,
      ),
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /apps\/mobile\/package\.json/);
    assert.match(result.failures.join("\n"), /apps\/mobile\/eas\.json/);
    assert.match(result.failures.join("\n"), /mojibake/i);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when mobile launch assets are missing", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "apps/mobile/assets/icon.png": null,
      "apps/mobile/assets/splash.png": null,
      "apps/mobile/assets/adaptive-icon.png": null,
      "apps/mobile/assets/notification-icon.png": null,
      "apps/mobile/assets/favicon.png": null,
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /apps\/mobile\/assets\/icon\.png/);
    assert.match(
      result.failures.join("\n"),
      /apps\/mobile\/assets\/splash\.png/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when mobile release config keeps example domains", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      "apps/mobile/eas.json": JSON.stringify(
        {
          cli: {
            version: ">= 12.0.0",
          },
          build: {
            production: {
              env: {
                EXPO_PUBLIC_APP_NAME: "급여납치",
                EXPO_PUBLIC_API_BASE_URL:
                  "https://api.salary-hijacking.example",
                EXPO_PUBLIC_DEEPLINK_HOST: "app.salary-hijacking.example",
              },
              android: {
                buildType: "app-bundle",
              },
            },
          },
        },
        null,
        2,
      ),
    });

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /salary-hijacking\.example/);
    assert.match(result.failures.join("\n"), /apps\/mobile\/eas\.json/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when .gitignore hides required source automation scripts", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      ".gitignore": `
node_modules/
**/build/
`,
      "scripts/build/fix-esm-imports.mjs":
        "export function fixRelativeEsmImports() { return 0; }\n",
      "scripts/build/fix-esm-imports.test.mjs":
        "import test from 'node:test';\n\ntest('placeholder', () => {});\n",
    });
    const init = spawnSync("git", ["init", "-b", "main"], {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    });
    assert.equal(init.status, 0, init.stderr);

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(
      result.failures.join("\n"),
      /scripts\/build\/fix-esm-imports\.mjs/,
    );
    assert.match(result.failures.join("\n"), /ignored by \.gitignore/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when local hosting or generated build metadata is git-trackable", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-preflight-"));

  try {
    await writeFixture(rootDir, {
      ".gitignore": `
node_modules/
`,
      "apps/admin/.vercel/project.json":
        '{"projectId":"example-local-project","orgId":"example-local-org"}\n',
      "apps/admin/.open-next/.build/open-next.config.mjs":
        "export default {};\n",
      "release/database-proof.local.json":
        '{"schemaVersion":1,"secretsRedacted":true,"containsSecretValues":false}\n',
      "release/secrets-proof.local.json":
        '{"schemaVersion":1,"secretsRedacted":true,"containsSecretValues":false}\n',
    });
    const init = spawnSync("git", ["init", "-b", "main"], {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    });
    assert.equal(init.status, 0, init.stderr);

    const result = runExternalIntegrationPreflight({
      rootDir,
      checkCommands: false,
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /apps\/admin\/\.vercel/);
    assert.match(result.failures.join("\n"), /apps\/admin\/\.open-next/);
    assert.match(result.failures.join("\n"), /release\/database-proof/);
    assert.match(result.failures.join("\n"), /release\/secrets-proof/);
    assert.match(result.failures.join("\n"), /must be ignored/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
