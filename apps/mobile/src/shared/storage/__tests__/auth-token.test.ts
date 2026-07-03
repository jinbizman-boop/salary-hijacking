import {
  attachMobileBearerToken,
  MOBILE_ACCESS_TOKEN_KEY,
} from "../auth-token";

describe("mobile auth token storage helper", () => {
  it("adds a Bearer authorization header from the secure access token key", async () => {
    const headers = new Headers();
    await attachMobileBearerToken(headers, {
      getItemAsync: async (key: string) =>
        key === MOBILE_ACCESS_TOKEN_KEY ? " access.jwt.token " : null,
    });

    expect(headers.get("authorization")).toBe("Bearer access.jwt.token");
  });

  it("does not add an authorization header when the token is missing or malformed", async () => {
    const headers = new Headers();
    await attachMobileBearerToken(headers, {
      getItemAsync: async () => "bad\r\ntoken",
    });

    expect(headers.has("authorization")).toBe(false);
  });

  it("does not add an authorization header from bearer-prefixed stored values", async () => {
    const headers = new Headers();
    await attachMobileBearerToken(headers, {
      getItemAsync: async () => "Bearer access.jwt.token",
    });

    expect(headers.has("authorization")).toBe(false);
  });
});
