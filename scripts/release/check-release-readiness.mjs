import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RELEASE_CHECK_VERSION = "1.0.0";
const EXTERNAL_RELEASE_EVIDENCE_PATH = "release/external-release-evidence.json";

const REQUIRED_FILES = [
  "AGENTS.md",
  "docs/codex/08_FILE_COMPLETION_LOG.md",
  "docs/codex/09_VALIDATION_PROTOCOL.md",
  "release/README.md",
  EXTERNAL_RELEASE_EVIDENCE_PATH,
  "release/rollback/rollback-plan.md",
  "release/store/google-play-metadata.md",
  "release/store/app-store-metadata.md",
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
  "services/api/wrangler.toml",
  "services/notifications/wrangler.toml",
  "services/scheduler/wrangler.toml",
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
  "CF_PAGES_PROJECT_NAME",
  "EXPO_TOKEN",
  "EAS_PROJECT_ID",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "SENTRY_DSN",
  "SLACK_WEBHOOK_URL",
];

const REQUIRED_CLI_GROUPS = [
  { label: "git", commands: ["git"] },
  { label: "GitHub CLI", commands: ["gh"] },
  { label: "Cloudflare Wrangler", commands: ["wrangler"] },
  { label: "Neon CLI", commands: ["neon", "neonctl"], any: true },
  { label: "Expo EAS CLI", commands: ["eas"] },
  { label: "Android adb", commands: ["adb"] },
  { label: "Android emulator", commands: ["emulator"] },
];

const PUBLIC_SECRET_ENV_PATTERN =
  /\b(?:NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE|JWT|KEY|COOKIE|SESSION|FCM|SERVICE_ACCOUNT|NEON|WEBHOOK)[A-Z0-9_]*\b/;

const PLACEHOLDER_PATTERN =
  /^(?:replace-with-|your-|owner\/|postgresql:\/\/USER:PASSWORD@|https?:\/\/hooks\.invalid|https?:\/\/sentry\.invalid)/i;

const REQUIRED_PROTECTED_EXISTING_REPOSITORIES = ["Retro Games", "RETRO-DB"];

const pathExists = (rootDir, relativePath) =>
  fs.existsSync(path.join(rootDir, relativePath));

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const findCommandOnPath = (command, env = process.env) => {
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

  if (cloudflare.pagesProjectMatched === true) {
    addCheck(
      checks,
      "PASS",
      "external-evidence:cloudflare-pages",
      "expected Pages project observed",
    );
  } else {
    addExternalEvidenceBlocker(
      checks,
      blockers,
      "external-evidence:cloudflare-pages",
      "expected Pages project is not proven",
      "Cloudflare Pages evidence does not prove the Salary Hijacking admin project exists",
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
  const expectedPagesProject =
    typeof cloudflare.expectedPagesProject === "string"
      ? cloudflare.expectedPagesProject.trim()
      : "";
  const runtimePagesProject =
    typeof env.CF_PAGES_PROJECT_NAME === "string"
      ? env.CF_PAGES_PROJECT_NAME.trim()
      : "";

  if (expectedPagesProject && isUsableEnvValue(runtimePagesProject)) {
    if (runtimePagesProject === expectedPagesProject) {
      addCheck(
        checks,
        "PASS",
        "release-target:CF_PAGES_PROJECT_NAME",
        `matches expected Cloudflare Pages project ${expectedPagesProject}`,
      );
    } else {
      addCheck(
        checks,
        "BLOCKED",
        "release-target:CF_PAGES_PROJECT_NAME",
        `expected ${expectedPagesProject}; got ${runtimePagesProject}`,
      );
      blockers.push(
        `CF_PAGES_PROJECT_NAME must match expected Cloudflare Pages project ${expectedPagesProject}`,
      );
    }
  }
};

export const analyzeReleaseReadiness = ({
  rootDir = process.cwd(),
  env = process.env,
  commandExists = (command) => findCommandOnPath(command, env),
  gitStatus = () => defaultGitStatus(rootDir),
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
    } else {
      addCheck(
        checks,
        "BLOCKED",
        `env-runtime:${envName}`,
        "runtime value missing or placeholder",
      );
      blockers.push(`${envName} runtime value is missing or placeholder`);
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

  checkExternalReleaseEvidence(rootDir, checks, blockers, warnings);
  const externalEvidence = readExternalReleaseEvidence(rootDir);
  checkRuntimeTargetConsistency(externalEvidence, env, checks, blockers);

  for (const group of REQUIRED_CLI_GROUPS) {
    const found = group.commands.filter((command) => commandExists(command));
    const ok =
      group.any === true
        ? found.length > 0
        : found.length === group.commands.length;
    if (ok) {
      addCheck(
        checks,
        "PASS",
        `cli:${group.label}`,
        `available: ${found.join(", ")}`,
      );
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
