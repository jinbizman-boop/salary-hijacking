import { describe, expect, it } from "vitest";

import {
  AnalyticsEventSchema,
  AnalyticsPrivacyParameterSchema,
  createAnalyticsDedupeKey,
  validateAnalyticsEventBatch,
} from "./analytics.schema";

describe("Phase 8 analytics privacy contract", () => {
  it("accepts a supported privacy-safe analytics event", () => {
    const parsed = AnalyticsEventSchema.parse({
      eventId: "evt_01J8WEBANL000000000000001",
      eventName: "payroll_setup_completed",
      eventVersion: 1,
      occurredAt: "2026-08-27T00:00:00.000Z",
      source: "web",
      identifierPolicy: "anonymous_or_pseudonymous",
      consentClass: "product_analytics",
      parameters: {
        budget_status: "within",
        goal_completion_bucket: "75_99",
        source_page: "landing",
      },
    });

    expect(parsed.eventName).toBe("payroll_setup_completed");
    expect(createAnalyticsDedupeKey(parsed)).toBe(
      "evt_01J8WEBANL000000000000001:payroll_setup_completed:1",
    );
  });

  it("rejects raw financial values, PII, tokens, and free-text content", () => {
    const prohibitedParameters = [
      { salary: 3000000 },
      { email: "user@example.test" },
      { access_token: "eyJhbGciOiJIUzI1NiJ9.payload.signature" },
      { comment_body: "오늘 급여와 카드값 상세 메모" },
    ];

    for (const parameters of prohibitedParameters) {
      expect(
        AnalyticsEventSchema.safeParse({
          eventId: "evt_01J8WEBANL000000000000002",
          eventName: "screen_view",
          eventVersion: 1,
          occurredAt: "2026-08-27T00:00:00.000Z",
          source: "web",
          identifierPolicy: "anonymous_or_pseudonymous",
          consentClass: "essential_operational",
          parameters,
        }).success,
      ).toBe(false);
    }
  });

  it("validates individual privacy audit parameters without source-text matching", () => {
    expect(
      AnalyticsPrivacyParameterSchema.parse({
        event: "ad_click",
        version: 1,
        parameter: "ad_slot",
        classification: "non_sensitive_operational",
        allowed: true,
        reason: "Slot id contains no user PII or financial values.",
      }).allowed,
    ).toBe(true);

    expect(
      AnalyticsPrivacyParameterSchema.safeParse({
        event: "ad_click",
        version: 1,
        parameter: "email",
        classification: "pii",
        allowed: true,
        reason: "Not allowed.",
      }).success,
    ).toBe(false);
  });

  it("detects duplicate event submissions by event identity", () => {
    const event = AnalyticsEventSchema.parse({
      eventId: "evt_01J8WEBANL000000000000003",
      eventName: "partner_inquiry_started",
      eventVersion: 1,
      occurredAt: "2026-08-27T00:00:00.000Z",
      source: "web",
      identifierPolicy: "anonymous_or_pseudonymous",
      consentClass: "product_analytics",
      parameters: { source_page: "landing" },
    });

    const result = validateAnalyticsEventBatch([event, event]);

    expect(result.ok).toBe(false);
    expect(result.duplicateCount).toBe(1);
    expect(result.issues[0]?.code).toBe("ANALYTICS_DUPLICATE_EVENT");
  });
});
