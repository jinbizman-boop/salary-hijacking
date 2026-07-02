import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSecurityAuditEvidence,
  writeSecurityAuditEvidenceFile,
} from "./generate-security-audit-evidence.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-security-audit-evidence-"));

const writeJson = (rootDir, filePath, value) => {
  const absolutePath = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const validProof = {
  schemaVersion: 1,
  observedAt: "2026-07-02T00:00:00.000Z",
  source: "local release audit proof",
  secretsRedacted: true,
  containsSecretValues: false,
  audit: {
    packageManager: "pnpm",
    auditCommand: "corepack pnpm audit --audit-level=high --prod=false",
    registryAuditVerified: true,
    lockfileAudited: true,
    productionDependenciesAudited: true,
    devDependenciesAudited: true,
    criticalVulnerabilities: 0,
    highVulnerabilities: 0,
    moderateVulnerabilities: 1,
    lowVulnerabilities: 2,
    noHighOrCriticalVulnerabilities: true,
  },
};

test("builds blocked no-secret security audit evidence by default", () => {
  const rootDir = makeWorkspace();
  const evidence = buildSecurityAuditEvidence({
    rootDir,
    now: () => new Date("2026-07-02T00:00:00.000Z"),
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.secretsRedacted, true);
  assert.equal(evidence.containsSecretValues, false);
  assert.equal(evidence.audit.packageManager, "pnpm");
  assert.equal(evidence.audit.registryAuditVerified, false);
  assert.equal(evidence.audit.noHighOrCriticalVulnerabilities, false);
  assert.equal(evidence.audit.criticalVulnerabilities, null);
  assert.equal(evidence.audit.highVulnerabilities, null);
  assert.ok(evidence.nextEvidenceRequired.length > 0);
});

test("uses a local no-secret proof file to mark audit gates verified", () => {
  const rootDir = makeWorkspace();
  writeJson(rootDir, "release/security-audit-proof.local.json", validProof);

  const evidence = buildSecurityAuditEvidence({
    rootDir,
    now: () => new Date("2026-07-02T00:00:00.000Z"),
  });

  assert.equal(evidence.audit.registryAuditVerified, true);
  assert.equal(evidence.audit.lockfileAudited, true);
  assert.equal(evidence.audit.productionDependenciesAudited, true);
  assert.equal(evidence.audit.devDependenciesAudited, true);
  assert.equal(evidence.audit.criticalVulnerabilities, 0);
  assert.equal(evidence.audit.highVulnerabilities, 0);
  assert.equal(evidence.audit.noHighOrCriticalVulnerabilities, true);
  assert.deepEqual(evidence.nextEvidenceRequired, []);
});

test("rejects proof files that contain raw registry tokens", () => {
  const rootDir = makeWorkspace();
  writeJson(rootDir, "release/security-audit-proof.local.json", {
    ...validProof,
    npmTokenValue: "npm_secret_value_that_must_not_be_tracked",
  });

  assert.throws(
    () => buildSecurityAuditEvidence({ rootDir }),
    /must use schemaVersion 1, secretsRedacted=true, containsSecretValues=false, and contain no raw registry tokens or secret values/,
  );
});

test("rejects copied audit reports or advisory payloads", () => {
  const rootDir = makeWorkspace();
  writeJson(rootDir, "release/security-audit-proof.local.json", {
    ...validProof,
    rawAuditReport: {
      advisories: [{ module_name: "example", vulnerable_versions: "*" }],
    },
  });

  assert.throws(
    () => buildSecurityAuditEvidence({ rootDir }),
    /must not contain copied audit reports, advisories, registry responses, or dependency payloads/,
  );
});

test("preserves existing no-secret tracked evidence when local proof is absent", () => {
  const rootDir = makeWorkspace();
  writeJson(rootDir, "release/security-audit-evidence.json", {
    ...validProof,
    source: "tracked no-secret evidence",
  });

  const evidence = buildSecurityAuditEvidence({ rootDir });

  assert.equal(evidence.audit.registryAuditVerified, true);
  assert.equal(evidence.audit.noHighOrCriticalVulnerabilities, true);
});

test("writes release/security-audit-evidence.json with generated evidence", () => {
  const rootDir = makeWorkspace();
  writeJson(rootDir, "release/security-audit-proof.local.json", validProof);

  const outputPath = writeSecurityAuditEvidenceFile({
    rootDir,
    now: () => new Date("2026-07-02T00:00:00.000Z"),
  });

  assert.equal(
    outputPath,
    path.join(rootDir, "release", "security-audit-evidence.json"),
  );
  const evidence = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(evidence.audit.registryAuditVerified, true);
  assert.equal(evidence.audit.noHighOrCriticalVulnerabilities, true);
});
