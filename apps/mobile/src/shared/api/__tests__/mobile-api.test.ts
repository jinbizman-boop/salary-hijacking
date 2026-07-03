import {
  createMobileAuthenticatedFetcher,
  createMobileBudgetApi,
} from "../mobile-api";

describe("mobile api factory", () => {
  it("attaches the stored access token to feature API requests without exposing refresh tokens", async () => {
    const calls: Request[] = [];
    const budgetApi = createMobileBudgetApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "mobile-api-auth-test",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        return new Response(
          JSON.stringify({
            data: {
              budgetId: "budget_1",
              budgetDate: "2026-07-03",
              availableAmountMinor: 20_000,
              spentAmountMinor: 7_000,
              remainingAmountMinor: 13_000,
              usageRate: 0.35,
              currency: "KRW",
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
              updatedAt: "2026-07-03T00:00:00.000Z",
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      tokenStore: {
        getItemAsync: async () => " access.jwt.token ",
      },
    });

    await budgetApi.getToday();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.get("authorization")).toBe(
      "Bearer access.jwt.token",
    );
    expect(calls[0]?.headers.get("authorization")).not.toContain("refresh");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
  });

  it("drops malformed stored tokens before a request leaves the app", async () => {
    const calls: Request[] = [];
    const fetcher = createMobileAuthenticatedFetcher({
      fetcher: async (input, init) => {
        calls.push(input instanceof Request ? input : new Request(input, init));
        return new Response("{}", {
          headers: { "content-type": "application/json" },
        });
      },
      tokenStore: {
        getItemAsync: async () => "bad\nbearer",
      },
    });

    await fetcher("https://api.salaryhijacking.com/api/v1/users/me/profile");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.has("authorization")).toBe(false);
  });
});
