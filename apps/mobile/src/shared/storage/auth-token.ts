export const MOBILE_ACCESS_TOKEN_KEY = "salary-hijacking.mobile.access-token";

export type MobileBearerTokenStore = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
}>;

export async function attachMobileBearerToken(
  headers: Headers,
  store: MobileBearerTokenStore,
): Promise<Headers> {
  const token = normalizeBearerToken(await readAccessToken(store));
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

async function readAccessToken(
  store: MobileBearerTokenStore,
): Promise<string | null> {
  try {
    return await store.getItemAsync(MOBILE_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function normalizeBearerToken(value: string | null): string | null {
  const token = value?.trim();
  if (!token || token.length > 8_192) return null;
  if (/\s/u.test(token)) return null;
  return token;
}
