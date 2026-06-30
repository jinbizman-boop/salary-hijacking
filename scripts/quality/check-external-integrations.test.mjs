import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runExternalIntegrationPreflight } from "./check-external-integrations.mjs";

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
jobs:
  deploy:
    environment:
      name: admin-preview
    env:
      CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
    steps:
      - run: pnpm dlx wrangler@latest pages deploy apps/admin/dist
`,
    ".github/workflows/mobile-build.yml": `
name: Mobile Build
on: [workflow_dispatch]
jobs:
  eas:
    environment:
      name: mobile-preview
    env:
      EXPO_TOKEN: \${{ secrets.EXPO_TOKEN }}
    steps:
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

Required Pages project:
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
# Admin Pages

Cloudflare Pages project: salary-hijacking-admin
Production domain: admin.salary-hijacking.app
Preview branch: staging
Build command: corepack pnpm --filter @salary-hijacking/admin run build
Output directory: apps/admin/.next
Required secrets are configured in GitHub or Cloudflare, never committed.
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

The Salary Hijacking release must use a new repository named salary-hijacking-platform under jinbizman-boop.
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
                "https://api-staging.salary-hijacking.example",
            },
            android: {
              buildType: "apk",
            },
          },
          production: {
            env: {
              EXPO_PUBLIC_APP_NAME: "급여납치",
              EXPO_PUBLIC_API_BASE_URL: "https://api.salary-hijacking.example",
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
  };

  for (const [relativePath, content] of Object.entries({
    ...files,
    ...overrides,
  })) {
    const fullPath = path.join(rootDir, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    if (content !== null) {
      await writeFile(fullPath, content, "utf8");
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

The Salary Hijacking release must use a new repository named salary-hijacking-platform under jinbizman-boop.
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
    assert.match(result.failures.join("\n"), /must be ignored/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
