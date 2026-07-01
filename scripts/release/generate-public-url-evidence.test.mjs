import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPublicUrlEvidence,
  writePublicUrlEvidenceFile,
} from "./generate-public-url-evidence.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

const expectedUrls = {
  landingUrl: "https://salaryhijacking.com/",
  privacyUrl: "https://salaryhijacking.com/privacy",
  supportUrl: "https://salaryhijacking.com/support",
  termsUrl: "https://salaryhijacking.com/terms",
};

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-public-url-evidence-"),
  );
  write(
    rootDir,
    "release/release-targets.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        publicUrls: expectedUrls,
      },
      null,
      2,
    ),
  );
  return rootDir;
};

test("builds blocked no-secret public URL evidence by default", () => {
  const rootDir = makeWorkspace();

  const evidence = buildPublicUrlEvidence({
    rootDir,
    now: () => new Date("2026-07-01T11:00:00.000Z"),
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.observedAt, "2026-07-01T11:00:00.000Z");
  assert.equal(evidence.secretsRedacted, true);
  assert.equal(evidence.containsSecretValues, false);
  assert.deepEqual(evidence.expectedUrls, expectedUrls);
  assert.equal(evidence.reachability.landingReachable, false);
  assert.equal(evidence.reachability.privacyReachable, false);
  assert.equal(evidence.reachability.supportReachable, false);
  assert.equal(evidence.reachability.termsReachable, false);
  assert.equal(evidence.headers.cspVerified, false);
  assert.equal(evidence.headers.privacyHeadersVerified, false);
  assert.equal(evidence.content.koreanCopyVerified, false);
  assert.equal(evidence.content.noSensitiveRawDataExposed, false);
  assert.ok(evidence.nextEvidenceRequired.length > 0);
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /(postgres(?:ql)?:\/\/|sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{16,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]+|napi_[a-z0-9_-]{16,}|cf_[a-z0-9_-]{16,})/i,
  );
});

test("uses a local proof file to mark public URL release gates verified", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "public-url-proof.local.json",
  );
  write(
    rootDir,
    "release/public-url-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        reachability: {
          landingReachable: true,
          privacyReachable: true,
          supportReachable: true,
          termsReachable: true,
        },
        headers: {
          cspVerified: true,
          privacyHeadersVerified: true,
          noIndexAbsentOnPublicPages: true,
        },
        content: {
          koreanCopyVerified: true,
          storeReviewUrlsVerified: true,
          noSensitiveRawDataExposed: true,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildPublicUrlEvidence({
    rootDir,
    proofPath,
    now: () => new Date("2026-07-01T11:30:00.000Z"),
  });

  assert.equal(evidence.reachability.landingReachable, true);
  assert.equal(evidence.reachability.privacyReachable, true);
  assert.equal(evidence.reachability.supportReachable, true);
  assert.equal(evidence.reachability.termsReachable, true);
  assert.equal(evidence.headers.cspVerified, true);
  assert.equal(evidence.headers.privacyHeadersVerified, true);
  assert.equal(evidence.headers.noIndexAbsentOnPublicPages, true);
  assert.equal(evidence.content.koreanCopyVerified, true);
  assert.equal(evidence.content.storeReviewUrlsVerified, true);
  assert.equal(evidence.content.noSensitiveRawDataExposed, true);
  assert.deepEqual(evidence.nextEvidenceRequired, []);
});

test("preserves existing no-secret public URL evidence when local proof is absent", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/public-url-evidence.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        reachability: {
          landingReachable: true,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildPublicUrlEvidence({ rootDir });

  assert.equal(evidence.reachability.landingReachable, true);
  assert.equal(evidence.reachability.privacyReachable, false);
});

test("rejects proof files that contain raw secrets or copied response bodies", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "public-url-proof.local.json",
  );
  write(
    rootDir,
    "release/public-url-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        content: {
          responseBody: {
            email: "actual-user@example.com",
            salaryAmount: 2700000,
          },
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildPublicUrlEvidence({ rootDir, proofPath }),
    /raw public page payloads or sensitive data/i,
  );
});

test("rejects proof files that contain copied public response headers", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "public-url-proof.local.json",
  );
  write(
    rootDir,
    "release/public-url-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        headers: {
          cspVerified: true,
          privacyHeadersVerified: true,
          noIndexAbsentOnPublicPages: true,
          responseHeaders: {
            "set-cookie": "session=raw-public-session",
            authorization: "Bearer copied-public-token",
          },
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildPublicUrlEvidence({ rootDir, proofPath }),
    /raw public page payloads or sensitive data/i,
  );
});

test("writes release/public-url-evidence.json with generated evidence", () => {
  const rootDir = makeWorkspace();

  const outputPath = writePublicUrlEvidenceFile({
    rootDir,
    now: () => new Date("2026-07-01T12:00:00.000Z"),
  });

  assert.equal(
    outputPath,
    path.join(rootDir, "release", "public-url-evidence.json"),
  );
  const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(written.observedAt, "2026-07-01T12:00:00.000Z");
  assert.deepEqual(written.expectedUrls, expectedUrls);
});
