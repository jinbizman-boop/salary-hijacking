import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeReleaseReadiness,
  formatReleaseReadinessReport,
} from "./check-release-readiness.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

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
      ],
      expectedPagesProject: "salary-hijacking-admin",
    },
    neon: {
      expectedProjectHint: "salary-hijacking",
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
      ],
      missingWorkers: [],
      expectedPagesProject: "salary-hijacking-admin",
      pagesProjectMatched: true,
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
  write(rootDir, "release/rollback/rollback-plan.md", "# Rollback\n");
  write(rootDir, "release/store/google-play-metadata.md", "# Google Play\n");
  write(rootDir, "release/store/app-store-metadata.md", "# App Store\n");
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
  write(rootDir, "apps/mobile/eas.json", "{}\n");

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
      "CF_PAGES_PROJECT_NAME=salary-hijacking-admin",
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
  CF_PAGES_PROJECT_NAME: "salary-hijacking-admin",
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
  assert.match(report, /emulator/);
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
      expectedPagesProject: "other-admin",
      pagesProjectMatched: true,
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
  assert.match(report, /release-target-manifest:cloudflare-pages/);
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
      ],
      missingWorkers: [
        "salary-hijacking-api",
        "salary-hijacking-notifications",
      ],
      expectedPagesProject: "salary-hijacking-admin",
      pagesProjectMatched: false,
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
  assert.match(report, /Cloudflare Pages evidence/);
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

test("blocks when runtime Cloudflare Pages project does not match external evidence", () => {
  const rootDir = makeWorkspace();
  const result = analyzeReleaseReadiness({
    rootDir,
    env: {
      ...completeEnv,
      CF_PAGES_PROJECT_NAME: "retro-db",
    },
    commandExists: () => true,
    gitStatus: () => ({ ok: true, output: "" }),
    gitRemote: matchingGitRemote,
  });
  const report = formatReleaseReadinessReport(result);

  assert.equal(result.ok, false);
  assert.match(report, /CF_PAGES_PROJECT_NAME/);
  assert.match(report, /expected Cloudflare Pages project/i);
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
