import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = path.resolve(
  "scripts/security/offline-package-security-scan.mjs",
);

const createWorkspace = (pkg, source = "export const ok = true;\n") => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "salary-security-scan-"));
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify(pkg, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(dir, "src", "index.ts"), source);
  return dir;
};

const createMonorepo = () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-security-scan-monorepo-"),
  );
  fs.mkdirSync(path.join(dir, "apps", "admin", "src"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: "salary-hijacking-platform",
        private: true,
        type: "module",
        workspaces: ["apps/*"],
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(dir, "apps", "admin", "package.json"),
    `${JSON.stringify(
      {
        name: "@salary-hijacking/admin",
        private: true,
        type: "module",
        metadata: {
          serverAuthority: true,
          adminReasonRequired: true,
          mfaRequiredForAdmin: true,
          rawFinancialDataForAds: false,
          rawPushTokenLogging: false,
          adsFinancialTargetingAllowed: false,
          redactedExportOnly: true,
          tokenHashOnly: true,
        },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(dir, "apps", "admin", "src", "unsafe.ts"),
    "export const bad = process.env.NEXT_PUBLIC_SESSION_TOKEN;\n",
  );
  return dir;
};

const runScan = (dir) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd: dir,
    encoding: "utf8",
  });

test("passes a compliant notifications package", () => {
  const dir = createWorkspace({
    name: "@salary-hijacking/notifications",
    private: true,
    type: "module",
    metadata: {
      tokenHashOnly: true,
      rawPushTokenLogged: false,
      rawFinancialDataLogged: false,
      rawFinancialDataForAds: false,
      adsFinancialTargetingForbidden: true,
      serviceTokenRequiredInProduction: true,
      marketingConsentGuard: true,
    },
  });

  const result = runScan(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed/);
});

test("fails unsafe admin metadata", () => {
  const dir = createWorkspace({
    name: "@salary-hijacking/admin",
    private: true,
    type: "module",
    metadata: {
      serverAuthority: true,
      adminReasonRequired: true,
      mfaRequiredForAdmin: true,
      rawFinancialDataForAds: false,
      rawPushTokenLogging: false,
      adsFinancialTargetingAllowed: true,
      redactedExportOnly: true,
      tokenHashOnly: true,
    },
  });

  const result = runScan(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /adsFinancialTargetingAllowed/);
});

test("fails source-level sensitive public env names", () => {
  const dir = createWorkspace(
    {
      name: "@salary-hijacking/api",
      private: true,
      type: "module",
      metadata: {
        serverAuthority: true,
        rawFinancialDataForAds: false,
        adminReasonRequired: true,
      },
    },
    "export const bad = process.env.NEXT_PUBLIC_JWT_SECRET;\n",
  );

  const result = runScan(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /public env names/);
});

test("allows explicit false policy guards for dangerous HTML APIs", () => {
  const dir = createWorkspace(
    {
      name: "@salary-hijacking/api",
      private: true,
      type: "module",
      metadata: {
        serverAuthority: true,
        rawFinancialDataForAds: false,
        adminReasonRequired: true,
      },
    },
    "export const policy = { dangerouslySetInnerHTMLAllowed: false };\n",
  );

  const result = runScan(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed/);
});

test("fails actual dangerous HTML injection usage", () => {
  const dir = createWorkspace(
    {
      name: "@salary-hijacking/api",
      private: true,
      type: "module",
      metadata: {
        serverAuthority: true,
        rawFinancialDataForAds: false,
        adminReasonRequired: true,
      },
    },
    "export const node = { dangerouslySetInnerHTML: { __html: rawHtml } };\n",
  );

  const result = runScan(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dangerouslySetInnerHTML/);
});

test("scans workspace package sources when run from a monorepo root", () => {
  const dir = createMonorepo();

  const result = runScan(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /apps\/admin\/src\/unsafe\.ts/);
  assert.match(result.stderr, /public env names/);
});
