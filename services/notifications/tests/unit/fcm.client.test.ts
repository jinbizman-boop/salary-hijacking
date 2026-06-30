import { describe, expect, it } from "vitest";

import { createFcmClient } from "../../src/fcm.client";

async function createPrivateKeyPem(): Promise<string> {
  const keyPair = (await globalThis.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const privateKey = await globalThis.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey,
  );
  const base64 = Buffer.from(privateKey).toString("base64");
  const lines = base64.match(/.{1,64}/g) ?? [];

  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----`;
}

describe("createFcmClient", () => {
  it("shares one OAuth token refresh across concurrent callers", async () => {
    const privateKey = await createPrivateKeyPem();
    let fetchCount = 0;
    const fetcher: typeof fetch = async () => {
      fetchCount += 1;
      return new Response(
        JSON.stringify({
          access_token: "shared-access-token",
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };
    const client = createFcmClient({
      projectId: "salary-hijacking-test",
      clientEmail: "fcm-test@salary-hijacking.invalid",
      privateKey,
      fetcher,
    });
    const context = {
      env: {},
      now: new Date("2026-06-25T00:00:00.000Z"),
    };

    const tokens = await Promise.all([
      client.getAccessToken(context),
      client.getAccessToken(context),
    ]);

    expect(tokens).toEqual(["shared-access-token", "shared-access-token"]);
    expect(fetchCount).toBe(1);
  });
});
