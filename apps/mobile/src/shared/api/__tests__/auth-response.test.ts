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
      refreshToken: "refresh.token",
      expiresAt: "2026-06-29T05:15:00.000Z",
      user: {
        id: "usr_123",
        emailVerified: true,
        onboardingCompleted: true,
        role: "USER",
      },
    });
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
      refreshToken: "new.refresh.token",
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
  });
});
