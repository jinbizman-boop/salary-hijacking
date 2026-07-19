import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const source = await readFile(
  new URL("./capture-mobile-clean-fintech-screenshots.mjs", import.meta.url),
  "utf8",
);

test("capture script fails before screenshots when Expo web export is missing", () => {
  assert.match(source, /ensureWebExportReady/);
  assert.match(source, /dist[/\\]index\.html/);
  assert.match(source, /run export:web before capture/i);
});

test("capture script rejects HTTP error pages and server error text", () => {
  assert.match(source, /response\.status\(\)\s*>=\s*400/);
  assert.match(source, /ENOENT|server error|dist[/\\]index\.html/);
});

test("capture script produces the 17 core mobile UI evidence screenshots", () => {
  assert.match(source, /const mobileUiEvidenceCaptures = \[/);
  assert.match(source, /"01_splash\.png"/);
  assert.match(source, /"17_profile_level\.png"/);
  assert.match(
    source,
    /mobileUiEvidenceCount: mobileUiEvidenceCaptures\.length/,
  );
});

test("capture script records responsive overflow checks for 320 through 768px", () => {
  assert.match(
    source,
    /const responsiveViewportWidths = \[320, 360, 375, 390, 393, 412, 430, 768\]/,
  );
  assert.match(source, /horizontalOverflow/);
  assert.match(source, /responsiveCheckCount: responsiveChecks\.length/);
});
