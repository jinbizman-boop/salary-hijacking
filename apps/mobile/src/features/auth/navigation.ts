import type {
  MobileAuthResponse,
  MobileAuthSuccessPayload,
  MobileSignupResponse,
} from "../../shared/api/auth-response";

const VERIFY_EMAIL_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const SALARY_ROUTE = "/salary";

export type AuthSessionChangeEvent = Readonly<{
  reason: "authenticated" | "logged_out";
  targetRoute: string;
}>;

type AuthRouter = Readonly<{
  replace: (href: string) => void;
}>;

const authSessionListeners = new Set<
  (event: AuthSessionChangeEvent) => void
>();

export function subscribeAuthSessionChange(
  listener: (event: AuthSessionChangeEvent) => void,
): () => void {
  authSessionListeners.add(listener);
  return () => {
    authSessionListeners.delete(listener);
  };
}

function publishAuthSessionChange(event: AuthSessionChangeEvent): void {
  for (const listener of authSessionListeners) listener(event);
}

export function routeAfterLogin(
  router: AuthRouter,
  response: MobileAuthResponse,
): string {
  void router;
  if (response.data?.status !== "AUTHENTICATED") {
    return "ACCOUNT_REVIEW_REQUIRED";
  }
  const targetRoute = resolveAuthenticatedUserRoute(response.data.user);
  publishAuthSessionChange({ reason: "authenticated", targetRoute });
  return targetRoute;
}

export function routeAfterLogout(): string {
  publishAuthSessionChange({
    reason: "logged_out",
    targetRoute: "/(auth)/login",
  });
  return "/(auth)/login";
}

function resolveAuthenticatedUserRoute(
  user: MobileAuthSuccessPayload["user"],
): string {
  if (!user.emailVerified) return VERIFY_EMAIL_ROUTE;
  if (!user.onboardingCompleted) return ONBOARDING_ROUTE;
  return SALARY_ROUTE;
}

export function routeAfterSignup(
  router: AuthRouter,
  response: MobileSignupResponse,
): string {
  if (response.data?.status === "EMAIL_VERIFICATION_REQUIRED") {
    router.replace(VERIFY_EMAIL_ROUTE);
    return VERIFY_EMAIL_ROUTE;
  }
  if (
    response.data?.status === "AUTHENTICATED" ||
    response.data?.status === "REGISTERED"
  ) {
    if (
      response.data.emailVerificationRequired ||
      !response.data.user.emailVerified
    ) {
      router.replace(VERIFY_EMAIL_ROUTE);
      return VERIFY_EMAIL_ROUTE;
    }
    if (
      response.data.onboardingRequired ||
      !response.data.user.onboardingCompleted
    ) {
      router.replace(ONBOARDING_ROUTE);
      return ONBOARDING_ROUTE;
    }
    router.replace(SALARY_ROUTE);
    return SALARY_ROUTE;
  }
  return "ACCOUNT_REVIEW_REQUIRED";
}
