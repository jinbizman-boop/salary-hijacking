import {
  routeAfterLogin,
  routeAfterLogout,
  routeAfterSignup,
  subscribeAuthSessionChange,
} from "../navigation";
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
  it("resolves verified and onboarded login sessions without navigating outside the root auth gate", () => {
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
    expect(router.replace).not.toHaveBeenCalled();
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

  it("publishes authenticated session changes for the root gate to consume exactly once", () => {
    const events: string[] = [];
    const unsubscribe = subscribeAuthSessionChange((event) => {
      events.push(event.reason);
    });

    routeAfterLogin(routerSpy().router, {
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
    });
    unsubscribe();
    routeAfterLogin(routerSpy().router, {
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
    });

    expect(events).toEqual(["authenticated"]);
  });

  it("publishes logout session changes without route-local navigation", () => {
    const events: string[] = [];
    const unsubscribe = subscribeAuthSessionChange((event) => {
      events.push(`${event.reason}:${event.targetRoute}`);
    });

    expect(routeAfterLogout()).toBe("/(auth)/login");
    unsubscribe();

    expect(events).toEqual(["logged_out:/(auth)/login"]);
  });
});
