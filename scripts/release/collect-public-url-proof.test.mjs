import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectPublicUrlProof } from "./collect-public-url-proof.mjs";

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
  "content-language": "ko-KR",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "x-financial-raw-data-exposed": "false",
  "x-ad-financial-targeting": "separated",
};

const pageBodies = {
  "/": '<html><body>급여납치 이번 달 내가 지켜낸 돈 <a href="/privacy">개인정보</a><a href="/support">지원</a><a href="/terms">이용약관</a></body></html>',
  "/privacy": "<html><body>급여납치 개인정보 처리방침 고객 지원</body></html>",
  "/support":
    "<html><body>급여납치 고객 지원 support@salaryhijacking.com</body></html>",
  "/terms": "<html><body>급여납치 이용약관 고객 지원</body></html>",
};

const makeFetch =
  (overrides = {}) =>
  async (url) => {
    const pathName = new URL(url).pathname;
    const page = overrides[pathName] ?? {};
    return new Response(page.body ?? pageBodies[pathName], {
      status: page.status ?? 200,
      headers: {
        ...htmlHeaders,
        ...(page.headers ?? {}),
      },
    });
  };

test("collects no-secret proof booleans for reachable public app URLs", async () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-public-url-proof-"),
  );
  const outputPath = path.join(
    rootDir,
    "release",
    "public-url-proof.local.json",
  );

  const proof = await collectPublicUrlProof({
    baseUrl: "https://salaryhijacking.com",
    fetchImpl: makeFetch(),
    outputPath,
    now: () => new Date("2026-07-01T13:00:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.observedAt, "2026-07-01T13:00:00.000Z");
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.equal(proof.reachability.landingReachable, true);
  assert.equal(proof.reachability.privacyReachable, true);
  assert.equal(proof.reachability.supportReachable, true);
  assert.equal(proof.reachability.termsReachable, true);
  assert.equal(proof.headers.cspVerified, true);
  assert.equal(proof.headers.privacyHeadersVerified, true);
  assert.equal(proof.headers.noIndexAbsentOnPublicPages, true);
  assert.equal(proof.content.koreanCopyVerified, true);
  assert.equal(proof.content.storeReviewUrlsVerified, true);
  assert.equal(proof.content.noSensitiveRawDataExposed, true);

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(written, /<html|support@salaryhijacking\.com/i);
  assert.doesNotMatch(written, /salaryAmount|expenseAmount|pushToken/i);
});

test("marks proof false when public pages expose sensitive payload markers", async () => {
  const proof = await collectPublicUrlProof({
    baseUrl: "https://salaryhijacking.com",
    fetchImpl: makeFetch({
      "/privacy": {
        body: "<html><body>급여납치 개인정보 salaryAmount DATABASE_URL</body></html>",
      },
    }),
    writeFile: false,
    now: () => new Date("2026-07-01T13:30:00.000Z"),
  });

  assert.equal(proof.reachability.privacyReachable, true);
  assert.equal(proof.content.noSensitiveRawDataExposed, false);
});

test("marks header proof false when CSP or privacy headers are missing", async () => {
  const proof = await collectPublicUrlProof({
    baseUrl: "https://salaryhijacking.com",
    fetchImpl: makeFetch({
      "/support": {
        headers: {
          "content-security-policy": "",
          "x-financial-raw-data-exposed": "true",
        },
      },
    }),
    writeFile: false,
  });

  assert.equal(proof.reachability.supportReachable, true);
  assert.equal(proof.headers.cspVerified, false);
  assert.equal(proof.headers.privacyHeadersVerified, false);
});

test("does not accept mojibake text as verified Korean public copy", async () => {
  const proof = await collectPublicUrlProof({
    baseUrl: "https://salaryhijacking.com",
    fetchImpl: makeFetch({
      "/": {
        body: '<html><body>湲됱뿬?⑹튂 ?대쾲 ???닿? 吏耳쒕궦 ??<a href="/privacy">媛쒖씤?뺣낫</a><a href="/support">吏??</a><a href="/terms">?댁슜?쎄?</a></body></html>',
      },
      "/privacy": {
        body: "<html><body>湲됱뿬?⑹튂 媛쒖씤?뺣낫 泥섎━諛⑹묠</body></html>",
      },
      "/support": {
        body: "<html><body>湲됱뿬?⑹튂 怨좉컼 吏??</body></html>",
      },
      "/terms": {
        body: "<html><body>湲됱뿬?⑹튂 ?댁슜?쎄?</body></html>",
      },
    }),
    writeFile: false,
  });

  assert.equal(proof.reachability.landingReachable, true);
  assert.equal(proof.content.koreanCopyVerified, false);
  assert.equal(proof.content.storeReviewUrlsVerified, true);
});
