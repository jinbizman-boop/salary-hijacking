import fs from "node:fs";

const shellScripts = [
  "scripts/dev/bootstrap.sh",
  "scripts/dev/check-env.sh",
  "scripts/docs/generate-tree.sh",
  "scripts/quality/lint-all.sh",
  "scripts/quality/test-all.sh",
  "scripts/db/migrate.sh",
  "scripts/db/seed.sh",
  "scripts/release/build-release.sh",
];

const requiredTokensByFile = {
  "scripts/dev/bootstrap.sh": ["pnpm_bin", "install", "format:check"],
  "scripts/dev/check-env.sh": ["ANDROID_SDK_ROOT", "require_command node"],
  "scripts/docs/generate-tree.sh": ["docs/generated/repo-tree.txt", "find ."],
  "scripts/quality/lint-all.sh": ["check:scripts", "format:check", "lint"],
  "scripts/quality/test-all.sh": ["typecheck", "test", "RUN_NATIVE_E2E"],
  "scripts/db/migrate.sh": [
    "CONFIRM_DB_MIGRATE",
    "ALLOW_PRODUCTION_DB_MIGRATE",
    "db:migrate",
  ],
  "scripts/db/seed.sh": [
    "CONFIRM_DB_SEED",
    "ALLOW_PRODUCTION_DB_SEED",
    "db:seed",
  ],
  "scripts/release/build-release.sh": [
    "release/artifacts/local-release-summary.txt",
    "publish_step=NOT_RUN",
  ],
};

const failures = [];

for (const file of shellScripts) {
  if (!fs.existsSync(file)) {
    failures.push(`${file}: missing`);
    continue;
  }

  const source = fs.readFileSync(file, "utf8");
  if (!source.startsWith("#!/usr/bin/env bash")) {
    failures.push(`${file}: missing bash shebang`);
  }
  if (!source.includes("set -euo pipefail")) {
    failures.push(`${file}: missing strict bash mode`);
  }
  if (
    /final script location|placeholder|not implemented|stub|coming soon/i.test(
      source,
    )
  ) {
    failures.push(`${file}: contains placeholder marker`);
  }
  if (source.split(/\r?\n/).filter(Boolean).length < 8) {
    failures.push(`${file}: too small to be an operational script`);
  }

  for (const token of requiredTokensByFile[file] ?? []) {
    if (!source.includes(token)) {
      failures.push(`${file}: missing required token "${token}"`);
    }
  }
}

const release = fs.existsSync("scripts/release/build-release.sh")
  ? fs.readFileSync("scripts/release/build-release.sh", "utf8")
  : "";
if (/\bdeploy\b/.test(release)) {
  failures.push("scripts/release/build-release.sh: must not run deploy");
}

if (failures.length > 0) {
  console.error("[scripts] validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[scripts] validation passed.");
