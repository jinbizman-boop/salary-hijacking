import {
  normalizeMobileAuthResponse,
  normalizeMobileSignupResponse,
} from "../auth-response";

describe("mobile auth response adapter", () => {
  const now = new Date("2026-06-29T05:00:00.000Z");

  it("normalizes the current API login response into the mobile authenticated shape", () => {
    const normalized = normalizeMobileAuthResponse(
      {
        data: {
          user: {
            userId: "usr_123",
            roles: "USER",
            accountStatus: "ACTIVE",
          },
          tokens: {
            accessToken: "access.jwt",
            refreshToken: "refresh.token",
            accessTokenExpiresIn: 900,
          },
          mfaRequired: false,
        },
      },
      now,
    );

    expect(normalized.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "access.jwt",
      expiresAt: "2026-06-29T05:15:00.000Z",
      user: {
        id: "usr_123",
        emailVerified: true,
        onboardingCompleted: true,
        role: "USER",
      },
    });
    expect(JSON.stringify(normalized)).not.toContain("refresh.token");
  });

  it("keeps MFA-required API responses in the mobile MFA shape", () => {
    const normalized = normalizeMobileAuthResponse(
      {
        data: {
          user: {
            userId: "admin_1",
            roles: "ADMIN",
            emailMasked: "ad***@example.com",
          },
          tokens: {
            accessToken: "mfa.pending.jwt",
            refreshToken: "mfa.refresh",
            accessTokenExpiresIn: 300,
          },
          mfaRequired: true,
        },
      },
      now,
    );

    expect(normalized.data).toMatchObject({
      status: "MFA_REQUIRED",
      challengeId: "server-mfa-required",
      methods: ["TOTP", "RECOVERY_CODE"],
      maskedDestination: "ad***@example.com",
    });
  });

  it("normalizes the current API register response into the mobile signup shape", () => {
    const normalized = normalizeMobileSignupResponse(
      {
        data: {
          user: {
            userId: "usr_new",
            roles: "USER",
            accountStatus: "ACTIVE",
          },
          tokens: {
            accessToken: "new.access.jwt",
            refreshToken: "new.refresh.token",
            accessTokenExpiresIn: 900,
          },
          emailVerificationTokenForDelivery: "emv_dev_delivery_token",
        },
      },
      now,
    );

    expect(normalized.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "new.access.jwt",
      expiresAt: "2026-06-29T05:15:00.000Z",
      emailVerificationRequired: true,
      onboardingRequired: false,
      user: {
        id: "usr_new",
        emailVerified: false,
        onboardingCompleted: true,
        role: "USER",
      },
    });
    expect(JSON.stringify(normalized)).not.toContain("new.refresh.token");
  });

  it("redacts refresh tokens from legacy authenticated auth payloads", () => {
    const normalized = normalizeMobileAuthResponse({
      data: {
        status: "AUTHENTICATED",
        accessToken: "legacy.access.jwt",
        refreshToken: "legacy.refresh.token",
        expiresAt: "2026-06-29T05:15:00.000Z",
        user: {
          id: "usr_legacy",
          emailVerified: true,
          onboardingCompleted: true,
          role: "USER",
        },
      },
    });

    expect(normalized.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "legacy.access.jwt",
      expiresAt: "2026-06-29T05:15:00.000Z",
      user: {
        id: "usr_legacy",
        emailVerified: true,
        onboardingCompleted: true,
        role: "USER",
      },
    });
    expect(JSON.stringify(normalized)).not.toContain("legacy.refresh.token");
  });

  it("redacts refresh tokens from legacy authenticated signup payloads", () => {
    const normalized = normalizeMobileSignupResponse({
      data: {
        status: "AUTHENTICATED",
        accessToken: "legacy.signup.access.jwt",
        refreshToken: "legacy.signup.refresh.token",
        expiresAt: "2026-06-29T05:15:00.000Z",
        emailVerificationRequired: false,
        onboardingRequired: false,
        user: {
          id: "usr_signup_legacy",
          emailVerified: true,
          onboardingCompleted: true,
          role: "USER",
        },
      },
    });

    expect(normalized.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "legacy.signup.access.jwt",
      expiresAt: "2026-06-29T05:15:00.000Z",
      emailVerificationRequired: false,
      onboardingRequired: false,
      user: {
        id: "usr_signup_legacy",
        emailVerified: true,
        onboardingCompleted: true,
        role: "USER",
      },
    });
    expect(JSON.stringify(normalized)).not.toContain(
      "legacy.signup.refresh.token",
    );
  });

  it("keeps locked-account and pending-signup fallback copy readable", () => {
    expect(
      normalizeMobileAuthResponse({
        data: {
          user: {
            accountStatus: "LOCKED",
            userId: "usr_locked",
          },
        },
      }).data,
    ).toMatchObject({
      message: "계정 상태 확인이 필요합니다.",
      status: "LOCKED",
    });

    expect(
      normalizeMobileSignupResponse({
        data: {
          emailVerificationRequired: true,
          user: { userId: "usr_pending" },
        },
      }).data,
    ).toMatchObject({
      maskedEmail: "이메일",
      status: "EMAIL_VERIFICATION_REQUIRED",
    });
  });

  it("throws readable safe Korean errors for malformed auth responses", () => {
    expect(() =>
      normalizeMobileAuthResponse({
        data: {
          tokens: {},
          user: { userId: "usr_missing_token" },
        },
      }),
    ).toThrow("인증 응답이 올바르지 않습니다.");

    expect(() =>
      normalizeMobileAuthResponse({
        data: {
          tokens: { accessToken: "bad token with spaces" },
          user: { userId: "usr_bad_token" },
        },
      }),
    ).toThrow("인증 토큰이 올바르지 않습니다.");

    expect(() =>
      normalizeMobileAuthResponse({
        data: {
          tokens: { accessToken: "valid.jwt" },
          user: {},
        },
      }),
    ).toThrow("인증 사용자 응답이 올바르지 않습니다.");
  });
});
