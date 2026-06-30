import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const packagePath = path.join(cwd, "package.json");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const walk = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (
        [
          "node_modules",
          "dist",
          ".next",
          ".open-next",
          ".turbo",
          "coverage",
          "test-results",
          "playwright-report",
        ].includes(entry.name)
      ) {
        continue;
      }
      files.push(...walk(nextPath));
      continue;
    }

    if (/\.(?:ts|tsx|js|jsx|json|toml|md)$/.test(entry.name)) {
      files.push(nextPath);
    }
  }

  return files;
};

const assert = (condition, message, failures) => {
  if (!condition) failures.push(message);
};

const checkMetadata = (pkg, failures) => {
  const metadata = pkg.metadata ?? {};

  assert(pkg.private === true, "package must remain private", failures);
  assert(pkg.type === "module", "package must remain ESM", failures);

  if (pkg.name === "@salary-hijacking/api") {
    assert(
      metadata.serverAuthority === true,
      "api serverAuthority must be true",
      failures,
    );
    assert(
      metadata.rawFinancialDataForAds === false,
      "api rawFinancialDataForAds must be false",
      failures,
    );
    assert(
      metadata.adminReasonRequired === true,
      "api adminReasonRequired must be true",
      failures,
    );
  }

  if (pkg.name === "@salary-hijacking/admin") {
    assert(
      metadata.serverAuthority === true,
      "admin serverAuthority must be true",
      failures,
    );
    assert(
      metadata.adminReasonRequired === true,
      "admin adminReasonRequired must be true",
      failures,
    );
    assert(
      metadata.mfaRequiredForAdmin === true,
      "admin mfaRequiredForAdmin must be true",
      failures,
    );
    assert(
      metadata.rawFinancialDataForAds === false,
      "admin rawFinancialDataForAds must be false",
      failures,
    );
    assert(
      metadata.rawPushTokenLogging === false,
      "admin rawPushTokenLogging must be false",
      failures,
    );
    assert(
      metadata.adsFinancialTargetingAllowed === false,
      "admin adsFinancialTargetingAllowed must be false",
      failures,
    );
    assert(
      metadata.redactedExportOnly === true,
      "admin redactedExportOnly must be true",
      failures,
    );
    assert(
      metadata.tokenHashOnly === true,
      "admin tokenHashOnly must be true",
      failures,
    );
  }

  if (pkg.name === "@salary-hijacking/notifications") {
    assert(
      metadata.tokenHashOnly === true,
      "notifications tokenHashOnly must be true",
      failures,
    );
    assert(
      metadata.rawPushTokenLogged === false,
      "notifications rawPushTokenLogged must be false",
      failures,
    );
    assert(
      metadata.rawFinancialDataLogged === false,
      "notifications rawFinancialDataLogged must be false",
      failures,
    );
    assert(
      metadata.rawFinancialDataForAds === false,
      "notifications rawFinancialDataForAds must be false",
      failures,
    );
    assert(
      metadata.adsFinancialTargetingForbidden === true,
      "notifications adsFinancialTargetingForbidden must be true",
      failures,
    );
    assert(
      metadata.serviceTokenRequiredInProduction === true,
      "notifications serviceTokenRequiredInProduction must be true",
      failures,
    );
    assert(
      metadata.marketingConsentGuard === true,
      "notifications marketingConsentGuard must be true",
      failures,
    );
  }

  if (pkg.name === "@salary-hijacking/scheduler") {
    assert(
      metadata.serverAuthorityScheduler === true,
      "scheduler serverAuthorityScheduler must be true",
      failures,
    );
    assert(
      metadata.rawFinancialDataLogged === false,
      "scheduler rawFinancialDataLogged must be false",
      failures,
    );
    assert(
      metadata.rawPushTokenLogged === false,
      "scheduler rawPushTokenLogged must be false",
      failures,
    );
    assert(
      metadata.rawAmountInNotificationPayload === false,
      "scheduler rawAmountInNotificationPayload must be false",
      failures,
    );
    assert(
      metadata.adsFinancialTargetingForbidden === true,
      "scheduler adsFinancialTargetingForbidden must be true",
      failures,
    );
    assert(
      metadata.serviceTokenRequiredInProduction === true,
      "scheduler serviceTokenRequiredInProduction must be true",
      failures,
    );
  }
};

const sourcePatterns = [
  {
    name: "dangerouslySetInnerHTML is forbidden on product surfaces",
    pattern: /dangerouslySetInnerHTML/i,
  },
  {
    name: "raw financial data must not be enabled for ads",
    pattern: /\brawFinancialDataForAds\b\s*[:=]\s*true/i,
  },
  {
    name: "raw financial data must not be logged",
    pattern: /\brawFinancialDataLogged\b\s*[:=]\s*true/i,
  },
  {
    name: "raw push tokens must not be logged",
    pattern: /\brawPushToken(?:Logged|Logging)\b\s*[:=]\s*true/i,
  },
  {
    name: "raw notification amount payloads must not be enabled",
    pattern: /\brawAmountInNotificationPayload\b\s*[:=]\s*true/i,
  },
  {
    name: "financial ad targeting must not be enabled",
    pattern: /\badsFinancialTargetingAllowed\b\s*[:=]\s*true/i,
  },
  {
    name: "browser secret exposure must not be enabled",
    pattern:
      /\bbrowserDirect(?:Database|Secret|Token|PrivateKey)AccessAllowed\b\s*[:=]\s*true/i,
  },
  {
    name: "public env names must not expose sensitive values",
    pattern:
      /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE|JWT|KEY|COOKIE|SESSION|FCM|SERVICE_ACCOUNT|NEON|WEBHOOK)[A-Z0-9_]*\b/,
  },
  {
    name: "hard-coded sensitive assignment is forbidden",
    pattern:
      /\b(?:DATABASE_URL|DIRECT_DATABASE_URL|JWT_SECRET|SESSION_SECRET|PRIVATE_KEY|FCM_SERVER_KEY|SERVICE_ACCOUNT|NEON_API_KEY|CLOUDFLARE_API_TOKEN)\b\s*[:=]\s*["'][^"']+["']/i,
    skipTests: true,
  },
];

if (!fs.existsSync(packagePath)) {
  console.error(
    "[offline-security-scan] package.json not found in current working directory.",
  );
  process.exit(1);
}

const pkg = readJson(packagePath);
const failures = [];
checkMetadata(pkg, failures);

const scanRoots = ["src", "app", "tests"].map((entry) => path.join(cwd, entry));
const files = scanRoots.flatMap(walk);
for (const filePath of files) {
  const relativePath = path.relative(cwd, filePath).replace(/\\/g, "/");
  const source = fs.readFileSync(filePath, "utf8");
  const isTestFile =
    /(^|\/)(tests?|__tests__)\//.test(relativePath) ||
    /\.test\.[tj]sx?$/.test(relativePath);
  for (const { name, pattern, skipTests } of sourcePatterns) {
    if (skipTests === true && isTestFile) continue;
    if (pattern.test(source)) {
      failures.push(`${relativePath}: ${name}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`[offline-security-scan] ${pkg.name} failed.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `[offline-security-scan] ${pkg.name} passed (${files.length} files scanned).`,
);
