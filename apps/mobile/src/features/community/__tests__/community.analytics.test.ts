import { createCommunityAnalytics } from "../community.analytics";

describe("community analytics", () => {
  it("only emits allowlisted, non-identifying properties", () => {
    const sink = jest.fn();
    const analytics = createCommunityAnalytics(sink);

    analytics.track("community_post_publish_attempt", {
      boardType: "LEVEL_CERTIFICATION",
      moderationStatus: "SAFE",
      correlationId: "correlation-1",
      content: "원문 본문",
      amountMinor: 3_500_000,
      email: "person@example.com",
    });

    expect(sink).toHaveBeenCalledWith({
      event: "community_post_publish_attempt",
      boardType: "LEVEL_CERTIFICATION",
      moderationStatus: "SAFE",
      correlationId: "correlation-1",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(JSON.stringify(sink.mock.calls[0])).not.toMatch(
      /원문 본문|3500000|person@example\.com/,
    );
  });

  it("rejects unsupported event names", () => {
    const analytics = createCommunityAnalytics(jest.fn());
    expect(() =>
      analytics.track("community_raw_payload" as "community_feed_view", {}),
    ).toThrow("허용되지 않은 커뮤니티 분석 이벤트");
  });
});
