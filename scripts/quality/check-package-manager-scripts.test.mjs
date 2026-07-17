import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runPackageManagerScriptCheck } from "./check-package-manager-scripts.mjs";

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("passes when package scripts delegate pnpm through corepack", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      scripts: {
        quality:
          "corepack pnpm run check:scripts && corepack pnpm turbo run quality",
        doctor: "corepack pnpm --version",
      },
    });

    await writeJson(path.join(rootDir, "packages/db/package.json"), {
      scripts: {
        "db:validate": "corepack pnpm run typecheck && corepack pnpm run build",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, true, result.failures.join("\n"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when package scripts call bare pnpm", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      scripts: {
        quality: "pnpm run check:scripts && turbo run quality",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /package\.json scripts\.quality/);
    assert.match(result.failures.join("\n"), /bare pnpm/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("does not scan non-script package metadata", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      description: "Uses pnpm as the package manager.",
      scripts: {
        echo: "node -e \"console.log('pnpm text is not a command')\"",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, true, result.failures.join("\n"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when tsup entrypoints omit an explicit relative prefix", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "packages/db/package.json"), {
      scripts: {
        build:
          "corepack pnpm run clean && tsup src/index.ts src/schema/users.schema.ts --format esm",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /packages\/db\/package\.json/);
    assert.match(result.failures.join("\n"), /tsup entrypoint/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("passes when tsup entrypoints use explicit relative paths", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "packages/db/package.json"), {
      scripts: {
        build:
          "corepack pnpm run clean && tsup ./src/index.ts ./src/schema/users.schema.ts --format esm",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, true, result.failures.join("\n"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when root turbo scripts are not run through the corepack pnpm shim", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      scripts: {
        build: "turbo run build",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /package\.json scripts\.build/);
    assert.match(result.failures.join("\n"), /corepack pnpm shim/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("passes when root turbo scripts use the corepack pnpm shim runner", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      engines: {
        node: ">=22.0.0 <25",
      },
      devDependencies: {
        wrangler: "^4.0.0",
      },
      scripts: {
        build: "node scripts/dev/run-with-corepack-pnpm.mjs turbo run build",
        "deploy:cloudflare-api":
          "corepack pnpm --filter @salary-hijacking/api run deploy:production",
        "deploy:cloudflare-notifications":
          "corepack pnpm --filter @salary-hijacking/notifications run deploy:production",
        "deploy:cloudflare-scheduler":
          "corepack pnpm --filter @salary-hijacking/scheduler run deploy:production",
        "deploy:cloudflare-workers":
          "corepack pnpm run deploy:cloudflare-api && corepack pnpm run deploy:cloudflare-notifications && corepack pnpm run deploy:cloudflare-scheduler",
        "deploy:cloudflare-api:dry-run":
          "corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml",
        "deploy:cloudflare-notifications:dry-run":
          "corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --dry-run --env production --config wrangler.toml",
        "deploy:cloudflare-scheduler:dry-run":
          "corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --dry-run --env production --config wrangler.toml",
        "deploy:cloudflare-workers:dry-run":
          "corepack pnpm run deploy:cloudflare-api:dry-run && corepack pnpm run deploy:cloudflare-notifications:dry-run && corepack pnpm run deploy:cloudflare-scheduler:dry-run",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, true, result.failures.join("\n"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when root Cloudflare Worker deploy entrypoints are missing", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      name: "salary-hijacking-platform",
      scripts: {
        deploy: "npx wrangler deploy",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /root devDependencies\.wrangler/);
    assert.match(result.failures.join("\n"), /deploy:cloudflare-workers/);
    assert.match(
      result.failures.join("\n"),
      /npx wrangler deploy is not allowed/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("passes when root Cloudflare Worker deploy entrypoints are split by Worker", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "package.json"), {
      packageManager: "pnpm@10.0.0",
      name: "salary-hijacking-platform",
      engines: {
        node: ">=22.0.0 <25",
      },
      devDependencies: {
        wrangler: "^4.0.0",
      },
      scripts: {
        "deploy:cloudflare-api":
          "corepack pnpm --filter @salary-hijacking/api run deploy:production",
        "deploy:cloudflare-notifications":
          "corepack pnpm --filter @salary-hijacking/notifications run deploy:production",
        "deploy:cloudflare-scheduler":
          "corepack pnpm --filter @salary-hijacking/scheduler run deploy:production",
        "deploy:cloudflare-workers":
          "corepack pnpm run deploy:cloudflare-api && corepack pnpm run deploy:cloudflare-notifications && corepack pnpm run deploy:cloudflare-scheduler",
        "deploy:cloudflare-api:dry-run":
          "corepack pnpm --filter @salary-hijacking/api exec wrangler deploy --dry-run --env production --config wrangler.toml",
        "deploy:cloudflare-notifications:dry-run":
          "corepack pnpm --filter @salary-hijacking/notifications exec wrangler deploy --dry-run --env production --config wrangler.toml",
        "deploy:cloudflare-scheduler:dry-run":
          "corepack pnpm --filter @salary-hijacking/scheduler exec wrangler deploy --dry-run --env production --config wrangler.toml",
        "deploy:cloudflare-workers:dry-run":
          "corepack pnpm run deploy:cloudflare-api:dry-run && corepack pnpm run deploy:cloudflare-notifications:dry-run && corepack pnpm run deploy:cloudflare-scheduler:dry-run",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, true, result.failures.join("\n"));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when a Wrangler package still allows Node 20 runtimes", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-pnpm-check-"));

  try {
    await writeJson(path.join(rootDir, "services/api/package.json"), {
      name: "@salary-hijacking/api",
      engines: {
        node: ">=20.11.0 <25",
      },
      devDependencies: {
        wrangler: "^4.107.0",
      },
      scripts: {
        deploy: "corepack pnpm exec wrangler deploy --config wrangler.toml",
      },
    });

    const result = runPackageManagerScriptCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(
      result.failures.join("\n"),
      /services\/api\/package\.json engines\.node/,
    );
    assert.match(result.failures.join("\n"), /Wrangler requires Node 22/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
