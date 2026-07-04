import {
  AUTH_PASSWORD_POLICY_MESSAGE,
  isServerAuthEmailCandidate,
  isServerAuthPasswordCandidate,
} from "../password-policy";

describe("auth password policy", () => {
  it("matches the server auth password policy before signup or reset submission", () => {
    expect(isServerAuthPasswordCandidate("short1")).toBe(false);
    expect(isServerAuthPasswordCandidate("longbutwithoutnumber")).toBe(false);
    expect(isServerAuthPasswordCandidate("1234567890")).toBe(false);
    expect(isServerAuthPasswordCandidate("Validpass1")).toBe(true);
  });

  it("matches the server auth email shape before auth form submission", () => {
    expect(isServerAuthEmailCandidate(" user@example.com ")).toBe(true);
    expect(isServerAuthEmailCandidate("user@example")).toBe(false);
    expect(isServerAuthEmailCandidate("user at example.com")).toBe(false);
    expect(isServerAuthEmailCandidate("user@example.com\nx-auth: token")).toBe(
      false,
    );
  });

  it("keeps a user-facing policy message without exposing tokens or financial data", () => {
    expect(AUTH_PASSWORD_POLICY_MESSAGE).toContain("10");
    expect(AUTH_PASSWORD_POLICY_MESSAGE).toContain("영문");
    expect(AUTH_PASSWORD_POLICY_MESSAGE).toContain("숫자");
    expect(AUTH_PASSWORD_POLICY_MESSAGE).not.toMatch(
      /token|secret|salary|expense|refresh|jwt/i,
    );
  });
});
