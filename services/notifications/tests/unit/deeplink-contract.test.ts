import { describe, expect, it } from "vitest";
import {
  isCanonicalNotificationDeeplink,
  notificationDeeplinkFor,
  notificationRouteFor,
} from "../../src/deeplink-contract";

describe("Phase 5 notification deeplink contract", () => {
  it.each([
    ["PAYDAY", "/salary"],
    ["FIXED_PAYMENT_DUE", "/plan"],
    ["SAVINGS_DUE", "/plan"],
    ["BUDGET_OVER", "/salary"],
    ["BUDGET_REMAINING", "/salary"],
    ["HIJACK_GOAL", "/salary"],
    ["GROWTH_TASK", "/level"],
    ["GROWTH_LEVEL_UP", "/level"],
    ["COMMUNITY_COMMENT", "/community"],
    ["COMMUNITY_REACTION", "/community"],
    ["NOTICE", "/notifications"],
    ["SECURITY", "/notifications"],
    ["SYSTEM", "/notifications"],
  ] as const)("maps %s to the existing production route %s", (type, route) => {
    expect(notificationRouteFor(type)).toBe(route);
    const target = notificationDeeplinkFor(type);
    expect(target.route).toBe(route);
    expect(isCanonicalNotificationDeeplink(type, target.deeplink)).toBe(true);
    expect(target.deeplink).not.toContain("(tabs)");
  });

  it("produces stable, encoded route params", () => {
    const target = notificationDeeplinkFor("PAYDAY", {
      planId: "plan/123",
      paydayDate: "2026-08-25",
      optional: null,
    });

    expect(target.deeplink).toBe(
      "salary-hijacking://salary?paydayDate=2026-08-25&planId=plan%2F123",
    );
  });

  it("rejects a legacy producer URL that does not resolve to the canonical route", () => {
    expect(
      isCanonicalNotificationDeeplink(
        "PAYDAY",
        "salary-hijacking://payroll/payday/plan-1",
      ),
    ).toBe(false);
  });
});
