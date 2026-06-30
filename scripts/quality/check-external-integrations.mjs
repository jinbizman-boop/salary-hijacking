import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const REQUIRED_FILES = [
  ".gitignore",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-api.yml",
  ".github/workflows/deploy-admin.yml",
  ".github/workflows/mobile-build.yml",
  ".github/workflows/release.yml",
  ".github/workflows/security-scan.yml",
  "services/api/wrangler.toml",
  "services/notifications/wrangler.toml",
  "services/scheduler/wrangler.toml",
  "infra/neon/README.md",
  "infra/neon/connection-pooling.md",
  "infra/neon/branching-strategy.md",
  "infra/neon/backup-restore.md",
  "infra/cloudflare/README.md",
  "infra/cloudflare/pages/admin-pages.md",
  "infra/github/secrets.md",
  "infra/github/repository.md",
  "apps/mobile/package.json",
  "apps/mobile/eas.json",
  "apps/mobile/app.config.ts",
  "apps/mobile/assets/icon.png",
  "apps/mobile/assets/splash.png",
  "apps/mobile/assets/adaptive-icon.png",
  "apps/mobile/assets/notification-icon.png",
  "apps/mobile/assets/favicon.png",
  "release/store/google-play-metadata.md",
  "release/store/app-store-metadata.md",
  "packages/db/src/client/neon.client.ts",
  "database/migrations/0001_init_users.sql",
  "database/migrations/0002_payroll_budget_expense.sql",
  "database/migrations/0003_growth_community_notifications.sql",
  "database/migrations/0004_admin_audit_ads.sql",
  "database/seeds/local.seed.sql",
  "database/seeds/staging.seed.sql",
  "database/seeds/uat.seed.sql",
  "scripts/build/fix-esm-imports.mjs",
  "scripts/build/fix-esm-imports.test.mjs",
];

const REQUIRED_TOKENS_BY_FILE = {
  ".github/workflows/ci.yml": [
    "pnpm install --frozen-lockfile",
    "pnpm lint",
    "pnpm typecheck",
    "pnpm test",
    "pnpm build",
    "pnpm test:e2e",
    "pnpm audit --prod --audit-level high",
  ],
  ".github/workflows/deploy-api.yml": [
    "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}",
    "${{ secrets.CLOUDFLARE_API_TOKEN }}",
    "wrangler deploy --dry-run",
    "wrangler deploy --env",
  ],
  ".github/workflows/deploy-admin.yml": [
    "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}",
    "${{ secrets.CLOUDFLARE_API_TOKEN }}",
    "pages deploy",
  ],
  ".github/workflows/mobile-build.yml": [
    "${{ secrets.EXPO_TOKEN }}",
    "eas-cli@latest build",
    "--platform",
    "--profile",
    'pnpm --dir "$MOBILE_APP_DIR" run export',
    "Native mobile E2E skipped because no local E2E APK was found",
  ],
  ".github/workflows/release.yml": [
    "GH_TOKEN: ${{ github.token }}",
    "gh release create",
  ],
  ".github/workflows/security-scan.yml": [
    "sensitiveWorkflowKeyPattern",
    "unsafeWorkflowAssignmentPattern",
  ],
  "services/api/wrangler.toml": [
    "compatibility_date",
    "[env.staging]",
    "[env.staging.vars]",
    "[env.production]",
    "[env.production.vars]",
    "[env.staging.triggers]",
    "[env.production.triggers]",
    "[[env.staging.r2_buckets]]",
    "[[env.production.r2_buckets]]",
    "[[env.staging.queues.producers]]",
    "[[env.production.queues.producers]]",
  ],
  "services/notifications/wrangler.toml": [
    "compatibility_date",
    "[env.staging]",
    "[env.staging.vars]",
    "[env.production]",
    "[env.production.vars]",
    "[env.staging.triggers]",
    "[env.production.triggers]",
    "[[env.staging.queues.producers]]",
    "[[env.production.queues.producers]]",
  ],
  "services/scheduler/wrangler.toml": [
    "compatibility_date",
    "[env.staging]",
    "[env.staging.vars]",
    "[env.production]",
    "[env.production.vars]",
    "[env.staging.triggers]",
    "[env.production.triggers]",
    "crons",
  ],
  "infra/neon/README.md": ["Neon", "DATABASE_URL"],
  "infra/neon/connection-pooling.md": ["connection", "pool"],
  "infra/neon/branching-strategy.md": ["branch"],
  "infra/neon/backup-restore.md": ["backup", "restore"],
  "infra/cloudflare/README.md": [
    "salary-hijacking-api",
    "salary-hijacking-notifications",
    "salary-hijacking-scheduler",
    "salary-hijacking-admin",
    "R2",
    "queue",
    "staging",
    "production",
    "wrangler deploy --dry-run",
    "wrangler deploy --env",
  ],
  "infra/cloudflare/pages/admin-pages.md": [
    "salary-hijacking-admin",
    "admin.salaryhijacking.com",
    "Cloudflare Pages",
    "Build command",
    "Output directory",
  ],
  "infra/github/secrets.md": [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "DATABASE_URL",
    "STAGING_DATABASE_URL",
    "NEON_API_KEY",
    "NEON_PROJECT_ID",
    "EXPO_TOKEN",
    "EAS_PROJECT_ID",
    "SENTRY_DSN",
    "SLACK_WEBHOOK_URL",
  ],
  "infra/github/repository.md": [
    "new repository",
    "salary-hijacking",
    "jinbizman-boop",
    "Existing repositories must not be modified",
    "Retro Games",
    "RETRO-DB",
    "branch protection",
    "GitHub Environments",
  ],
  "apps/mobile/package.json": [
    "@salary-hijacking/mobile",
    "급여납치",
    "test:e2e",
    "build:production:android",
    "eas-cli",
  ],
  "apps/mobile/eas.json": [
    "EXPO_PUBLIC_APP_NAME",
    "급여납치",
    "EXPO_PUBLIC_API_BASE_URL",
    "https://api-staging.salaryhijacking.com",
    "https://api.salaryhijacking.com",
    "salaryhijacking.com",
    "e2e",
    "production",
    "app-bundle",
  ],
  "apps/mobile/app.config.ts": [
    "급여납치",
    "https://api.salaryhijacking.com",
    "salaryhijacking.com",
    "assertNoServerSecretExposure",
    "financialAmountBasedTargeting",
  ],
  "release/store/google-play-metadata.md": [
    "급여납치",
    "Google Play",
    "short description",
    "full description",
    "privacy policy",
  ],
  "release/store/app-store-metadata.md": [
    "급여납치",
    "App Store",
    "subtitle",
    "description",
    "privacy policy",
  ],
  "packages/db/src/client/neon.client.ts": [
    "@neondatabase/serverless",
    "DATABASE_URL",
    "NEON_DATABASE_URL",
  ],
};

const SECRET_SCAN_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-api.yml",
  ".github/workflows/deploy-admin.yml",
  ".github/workflows/mobile-build.yml",
  ".github/workflows/release.yml",
  ".github/workflows/security-scan.yml",
  "services/api/wrangler.toml",
  "services/notifications/wrangler.toml",
  "services/scheduler/wrangler.toml",
  "infra/github/secrets.md",
];

const OPERATIONAL_DOC_FILES = [
  "infra/cloudflare/README.md",
  "infra/cloudflare/pages/admin-pages.md",
  "infra/github/secrets.md",
  "infra/github/repository.md",
];

const RELEASE_METADATA_FILES = [
  "apps/mobile/package.json",
  "apps/mobile/eas.json",
  "apps/mobile/app.config.ts",
  ".github/workflows/mobile-build.yml",
  "release/store/google-play-metadata.md",
  "release/store/app-store-metadata.md",
];

const MOBILE_RELEASE_CONFIG_FILES = [
  "apps/mobile/eas.json",
  "apps/mobile/app.config.ts",
  "apps/mobile/README.md",
];

const REQUIRED_MOBILE_ASSET_FILES = [
  "apps/mobile/assets/icon.png",
  "apps/mobile/assets/splash.png",
  "apps/mobile/assets/adaptive-icon.png",
  "apps/mobile/assets/notification-icon.png",
  "apps/mobile/assets/favicon.png",
];

const REQUIRED_GIT_TRACKABLE_SOURCE_FILES = [
  "scripts/build/fix-esm-imports.mjs",
  "scripts/build/fix-esm-imports.test.mjs",
];

const LOCAL_GENERATED_OR_HOSTING_METADATA_PATHS = [
  "apps/admin/.vercel/project.json",
  "apps/admin/.open-next/.build/open-next.config.mjs",
  "apps/admin/.open-next/.build/open-next.config.edge.mjs",
];

const SENSITIVE_KEY_PATTERN =
  "CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|EXPO_TOKEN|DATABASE_URL|DIRECT_DATABASE_URL|STAGING_DATABASE_URL|UAT_DATABASE_URL|SHADOW_DATABASE_URL|NEON_API_KEY|NEON_DATABASE_URL|JWT_SECRET|REFRESH_TOKEN_SECRET|SESSION_SECRET|PRIVATE_KEY|SENTRY_AUTH_TOKEN|R2_SECRET|AWS_SECRET|SECRET_ACCESS_KEY|GOOGLE_SERVICES_JSON|GOOGLE_SERVICE_INFO_PLIST|FCM_SERVER_KEY|FCM_SERVICE_ACCOUNT_JSON";

const UNSAFE_SENSITIVE_ASSIGNMENT = new RegExp(
  String.raw`\b(${SENSITIVE_KEY_PATTERN})\b\s*[:=]\s*["']?(?!\$\{\{\s*(?:secrets\.|github\.token)|\$\{|process\.env|import\.meta\.env|REDACTED|redacted|""|''|<|>|example|changeme|change-me|your_|null|undefined)([A-Za-z0-9_+/@:.,=-]{12,})`,
  "i",
);

const PLACEHOLDER_OR_MOJIBAKE_PATTERN =
  /final script location|placeholder|not implemented|stub|coming soon|최종 파일 위치|최종 기준 파일|理|湲|�|疫/i;

const FORBIDDEN_MOBILE_RELEASE_DOMAIN_PATTERN =
  /salary-hijacking\.example|salary-hijacking\.app/i;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const EXISTING_REPOSITORY_REUSE_PATTERN =
  /\b(?:reuse|use|modify|push(?:\s+changes)?\s+to)\s+(?:an?\s+)?existing repository\b/i;

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function resolvePath(rootDir, relativePath) {
  return path.join(rootDir, ...relativePath.split("/"));
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(resolvePath(rootDir, relativePath), "utf8");
}

function fileExists(rootDir, relativePath) {
  const fullPath = resolvePath(rootDir, relativePath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
}

function checkRequiredFiles(rootDir, failures) {
  for (const relativePath of REQUIRED_FILES) {
    if (!fileExists(rootDir, relativePath)) {
      failures.push(`${relativePath}: missing`);
      continue;
    }

    if (fs.statSync(resolvePath(rootDir, relativePath)).size === 0) {
      failures.push(`${relativePath}: empty`);
    }
  }
}

function checkRequiredTokens(rootDir, failures) {
  for (const [relativePath, requiredTokens] of Object.entries(
    REQUIRED_TOKENS_BY_FILE,
  )) {
    if (!fileExists(rootDir, relativePath)) continue;

    const source = readText(rootDir, relativePath);
    for (const token of requiredTokens) {
      if (!source.includes(token)) {
        failures.push(`${relativePath}: missing required token "${token}"`);
      }
    }
  }
}

function checkSensitiveAssignments(rootDir, failures) {
  for (const relativePath of SECRET_SCAN_FILES) {
    if (!fileExists(rootDir, relativePath)) continue;

    const lines = readText(rootDir, relativePath).split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const match = line.match(UNSAFE_SENSITIVE_ASSIGNMENT);
      if (!match) continue;

      const key = match[1] ?? "sensitive key";
      failures.push(
        `${relativePath}:${index + 1}: hard-coded sensitive value for ${key}`,
      );
    }
  }
}

function checkOperationalDocs(rootDir, failures) {
  for (const relativePath of OPERATIONAL_DOC_FILES) {
    if (!fileExists(rootDir, relativePath)) continue;

    const source = readText(rootDir, relativePath);
    if (PLACEHOLDER_OR_MOJIBAKE_PATTERN.test(source)) {
      failures.push(
        `${relativePath}: contains placeholder, mojibake, or non-operational marker`,
      );
    }
  }
}

function checkGitHubRepositoryPolicy(rootDir, failures) {
  const relativePath = "infra/github/repository.md";
  if (!fileExists(rootDir, relativePath)) return;

  const source = readText(rootDir, relativePath);
  if (EXISTING_REPOSITORY_REUSE_PATTERN.test(source)) {
    failures.push(
      `${relativePath}: must require a new repository and must not allow existing repository reuse`,
    );
  }
}

function checkReleaseMetadataText(rootDir, failures) {
  for (const relativePath of RELEASE_METADATA_FILES) {
    if (!fileExists(rootDir, relativePath)) continue;

    const source = readText(rootDir, relativePath);
    if (PLACEHOLDER_OR_MOJIBAKE_PATTERN.test(source)) {
      failures.push(
        `${relativePath}: contains placeholder, mojibake, or non-release metadata marker`,
      );
    }
  }
}

function checkMobileReleaseDomains(rootDir, failures) {
  for (const relativePath of MOBILE_RELEASE_CONFIG_FILES) {
    if (!fileExists(rootDir, relativePath)) continue;

    const lines = readText(rootDir, relativePath).split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (!FORBIDDEN_MOBILE_RELEASE_DOMAIN_PATTERN.test(line)) continue;
      failures.push(
        `${relativePath}:${index + 1}: contains non-release mobile domain ${line.trim()}`,
      );
    }
  }
}

function checkMobileLaunchAssets(rootDir, failures) {
  for (const relativePath of REQUIRED_MOBILE_ASSET_FILES) {
    if (!fileExists(rootDir, relativePath)) continue;

    const buffer = fs.readFileSync(resolvePath(rootDir, relativePath));
    if (buffer.length < 64) {
      failures.push(`${relativePath}: PNG asset is too small for launch use`);
      continue;
    }

    if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      failures.push(`${relativePath}: must be a PNG asset`);
    }
  }
}

function checkMigrationOrder(rootDir, failures) {
  const migrationDir = resolvePath(rootDir, "database/migrations");
  if (!fs.existsSync(migrationDir)) return;

  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort();

  const expected = [
    "0001_init_users.sql",
    "0002_payroll_budget_expense.sql",
    "0003_growth_community_notifications.sql",
    "0004_admin_audit_ads.sql",
  ];

  for (const [index, expectedName] of expected.entries()) {
    if (migrationFiles[index] !== expectedName) {
      failures.push(
        `database/migrations: expected migration ${expectedName} at position ${
          index + 1
        }`,
      );
    }
  }
}

function checkRequiredSourceFilesNotIgnored(rootDir, failures, warnings) {
  const existingFiles = REQUIRED_GIT_TRACKABLE_SOURCE_FILES.filter(
    (relativePath) => fileExists(rootDir, relativePath),
  );
  if (existingFiles.length === 0) return;

  const result = spawnSync(
    "git",
    ["check-ignore", "--no-index", "-v", "--", ...existingFiles],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    },
  );

  if (result.error) {
    warnings.push(
      `git check-ignore unavailable; source trackability could not be verified: ${result.error.message}`,
    );
    return;
  }

  if (result.status === 1) return;

  if (result.status !== 0) {
    warnings.push(
      `git check-ignore exited with status ${result.status}; source trackability could not be verified`,
    );
    return;
  }

  for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
    const [patternPart, filePart] = line.split(/\t/);
    const pattern = patternPart?.split(":").at(-1) ?? "";
    if (pattern.startsWith("!")) continue;

    const ignoredPath = toPosix(filePart ?? line);
    failures.push(`${ignoredPath}: ignored by .gitignore`);
  }
}

function checkLocalGeneratedOutputsIgnored(rootDir, failures, warnings) {
  const existingFiles = LOCAL_GENERATED_OR_HOSTING_METADATA_PATHS.filter(
    (relativePath) => fileExists(rootDir, relativePath),
  );
  if (existingFiles.length === 0) return;

  for (const relativePath of existingFiles) {
    const result = spawnSync(
      "git",
      ["check-ignore", "-q", "--", relativePath],
      {
        cwd: rootDir,
        encoding: "utf8",
        shell: false,
        windowsHide: true,
      },
    );

    if (result.error) {
      warnings.push(
        `git check-ignore unavailable; generated-output ignore status could not be verified: ${result.error.message}`,
      );
      continue;
    }

    if (result.status === 0) continue;

    if (result.status === 1) {
      failures.push(`${toPosix(relativePath)}: must be ignored by .gitignore`);
      continue;
    }

    warnings.push(
      `git check-ignore exited with status ${result.status}; generated-output ignore status could not be verified for ${toPosix(relativePath)}`,
    );
  }
}

function commandExists(command) {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });

  return result.status === 0;
}

function checkLocalCommands(warnings) {
  const commands = ["git", "wrangler", "gh", "neon", "neonctl"];

  for (const command of commands) {
    if (!commandExists(command)) {
      warnings.push(
        `${command}: not found on PATH; connector/plugin or CI secret validation may still be available outside this local shell`,
      );
    }
  }
}

export function runExternalIntegrationPreflight(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const checkCommands = options.checkCommands ?? true;
  const failures = [];
  const warnings = [];

  checkRequiredFiles(rootDir, failures);
  checkRequiredTokens(rootDir, failures);
  checkSensitiveAssignments(rootDir, failures);
  checkOperationalDocs(rootDir, failures);
  checkGitHubRepositoryPolicy(rootDir, failures);
  checkReleaseMetadataText(rootDir, failures);
  checkMobileReleaseDomains(rootDir, failures);
  checkMobileLaunchAssets(rootDir, failures);
  checkMigrationOrder(rootDir, failures);
  checkRequiredSourceFilesNotIgnored(rootDir, failures, warnings);
  checkLocalGeneratedOutputsIgnored(rootDir, failures, warnings);

  if (checkCommands) {
    checkLocalCommands(warnings);
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    checkedFiles: REQUIRED_FILES.map(toPosix),
  };
}

function printResult(result) {
  if (result.ok) {
    console.log("[external-integrations] validation passed.");
  } else {
    console.error("[external-integrations] validation failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn("[external-integrations] warnings:");
    for (const warning of result.warnings) {
      console.warn(`- ${warning}`);
    }
  }

  console.log(
    `[external-integrations] checked ${result.checkedFiles.length} required files.`,
  );
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMain) {
  const result = runExternalIntegrationPreflight();
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}
