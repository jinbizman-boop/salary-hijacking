import { routeAfterLogin, routeAfterSignup } from "../navigation";
import type {
  MobileAuthResponse,
  MobileSignupResponse,
} from "../../../shared/api/auth-response";

function routerSpy(): {
  readonly router: { replace: jest.Mock<void, [string]> };
} {
  return { router: { replace: jest.fn<void, [string]>() } };
}

describe("auth navigation", () => {
  it("routes verified and onboarded login sessions to salary home", () => {
    const { router } = routerSpy();
    const response: MobileAuthResponse = {
      data: {
        status: "AUTHENTICATED",
        accessToken: "access-token",
        expiresAt: "2026-07-21T00:00:00.000Z",
        user: {
          id: "user_1",
          emailVerified: true,
          onboardingCompleted: true,
          role: "USER",
        },
      },
    };

    expect(routeAfterLogin(router, response)).toBe("/salary");
    expect(router.replace).toHaveBeenCalledWith("/salary");
  });

  it("keeps email verification and onboarding gates ahead of salary home", () => {
    const unverified = routerSpy();
    const onboarding = routerSpy();

    expect(
      routeAfterLogin(unverified.router, {
        data: {
          status: "AUTHENTICATED",
          accessToken: "access-token",
          expiresAt: "2026-07-21T00:00:00.000Z",
          user: {
            id: "user_1",
            emailVerified: false,
            onboardingCompleted: true,
            role: "USER",
          },
        },
      }),
    ).toBe("/(auth)/verify-email");
    expect(
      routeAfterLogin(onboarding.router, {
        data: {
          status: "AUTHENTICATED",
          accessToken: "access-token",
          expiresAt: "2026-07-21T00:00:00.000Z",
          user: {
            id: "user_1",
            emailVerified: true,
            onboardingCompleted: false,
            role: "USER",
          },
        },
      }),
    ).toBe("/onboarding");
  });

  it("routes signup email verification before onboarding and salary home", () => {
    const { router } = routerSpy();
    const response: MobileSignupResponse = {
      data: {
        status: "EMAIL_VERIFICATION_REQUIRED",
        verificationId: "verify_1",
        maskedEmail: "u***@example.com",
      },
    };

    expect(routeAfterSignup(router, response)).toBe("/(auth)/verify-email");
    expect(router.replace).toHaveBeenCalledWith("/(auth)/verify-email");
  });
});
