import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { auditMobileInteractions } from "./audit-mobile-interactions.mjs";

test("runtime mobile routes have no dead primary interactions or missing literal route targets", () => {
  const result = auditMobileInteractions();

  assert.equal(result.violations.length, 0);
  assert.ok(result.routes.includes("/salary"));
  assert.ok(result.routes.includes("/plan"));
  assert.ok(result.routes.includes("/notifications"));
  assert.ok(result.routes.includes("/notifications/settings"));
  assert.ok(result.routes.includes("/community/[postId]"));
});

test("interaction audit writes reusable evidence for final QA gate G15", () => {
  auditMobileInteractions();
  const report = readFileSync("docs/qa/INTERACTION_ROUTE_AUDIT.md", "utf8");

  assert.match(report, /Violations: 0/u);
  assert.match(report, /Dead literal `onPress/u);
  assert.match(report, /Literal `router\.push`/u);
  assert.match(report, /`\/notifications\/settings`/u);
});
