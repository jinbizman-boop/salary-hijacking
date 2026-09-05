import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android launch social provider migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../../database/migrations/0027_android_launch_social_provider_contract.sql",
    ),
    "utf8",
  );

  it("narrows auth identity providers to the Android commercial launch set", () => {
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS chk_auth_provider");
    expect(migration).toContain(
      "provider IN ('EMAIL', 'PASSWORD', 'GOOGLE', 'KAKAO', 'NAVER')",
    );
    expect(migration).toContain("unsupported auth identity provider rows exist");
  });

  it("narrows OAuth state providers without preserving stale Apple or Facebook starts", () => {
    expect(migration).toContain(
      "DROP CONSTRAINT IF EXISTS chk_auth_oauth_states_provider",
    );
    expect(migration).toContain("provider IN ('GOOGLE', 'KAKAO', 'NAVER')");
    expect(migration).toContain("unsupported oauth state provider rows exist");
    expect(migration).not.toMatch(/'APPLE'|'FACEBOOK'/u);
  });
});
