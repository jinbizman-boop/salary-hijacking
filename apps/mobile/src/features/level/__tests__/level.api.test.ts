import { createGrowthApi } from "../api";

describe("mobile growth API goal management", () => {
  it("updates a domain goal through the server with icon metadata and history immutability", async () => {
    const fetcher = jest.fn(async (input: URL | RequestInfo) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(request.method).toBe("PATCH");
      expect(request.url).toBe(
        "https://api.salaryhijacking.com/api/v1/growth/goals/READING",
      );
      const body = (await request.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        activeDays: ["MON", "TUE"],
        domain: "READING",
        domainOption: "경제·경영",
        effectiveDate: "2026-09-08",
        targetUnit: "page",
        targetValue: 10,
      });
      expect(JSON.stringify(body)).not.toContain("https://");
      return new Response(
        JSON.stringify({
          data: {
            activeGoal: {
              activeDays: ["MON", "TUE"],
              domain: "READING",
              domainOption: "경제·경영",
              effectiveDate: "2026-09-08",
              frequency: "WEEKDAYS",
              icon: { emoji: "📚", iconType: "EMOJI" },
              preferredTime: "08:00",
              source: "CUSTOM",
              targetUnit: "page",
              targetValue: 10,
              title: "독서",
            },
            historicalMissionMutationCount: 0,
            serverAuthority: true,
          },
        }),
        { status: 200 },
      );
    });
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher,
      platform: "android",
    });

    await expect(
      api.updateGoal("READING", {
        activeDays: ["MON", "TUE"],
        domain: "READING",
        domainOption: "경제·경영",
        effectiveDate: "2026-09-08",
        frequency: "WEEKDAYS",
        historicalMissionMutationCount: 0,
        icon: { emoji: "📚", iconType: "EMOJI" },
        preferredTime: "08:00",
        source: "CUSTOM",
        targetUnit: "page",
        targetValue: 10,
        title: "독서",
      }),
    ).resolves.toMatchObject({
      activeGoal: {
        domain: "READING",
        icon: { emoji: "📚", iconType: "EMOJI" },
        targetValue: 10,
      },
      historicalMissionMutationCount: 0,
      serverAuthority: true,
    });
  });
});
