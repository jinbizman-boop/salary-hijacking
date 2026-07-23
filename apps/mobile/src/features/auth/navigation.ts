import type {
  MobileAuthResponse,
  MobileSignupResponse,
} from "../../shared/api/auth-response";

const VERIFY_EMAIL_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const SALARY_ROUTE = "/salary";

type AuthRouter = Readonly<{
  replace: (href: string) => void;
}>;

export function routeAfterLogin(
  router: AuthRouter,
  response: MobileAuthResponse,
): string {
  if (response.data?.status !== "AUTHENTICATED") {
    return "ACCOUNT_REVIEW_REQUIRED";
  }
  if (!response.data.user.emailVerified) {
    router.replace(VERIFY_EMAIL_ROUTE);
    return VERIFY_EMAIL_ROUTE;
  }
  if (!response.data.user.onboardingCompleted) {
    router.replace(ONBOARDING_ROUTE);
    return ONBOARDING_ROUTE;
  }
  router.replace(SALARY_ROUTE);
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
