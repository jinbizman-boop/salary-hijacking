import type {
  MobileAuthResponse,
  MobileSignupResponse,
} from "../../shared/api/auth-response";

export type AuthLoginRequest = Readonly<{
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
}>;

export type AuthRegisterRequest = Readonly<{
  email: string;
  password: string;
  nickname: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
  deviceId?: string;
}>;

export type AuthRefreshRequest = Readonly<{
  deviceId?: string;
}>;

export type AuthSocialProvider = "KAKAO" | "NAVER" | "GOOGLE" | "APPLE";

export type AuthOAuthStartRequest = Readonly<{
  provider: AuthSocialProvider;
  redirectUri: string;
}>;

export type AuthOAuthCompleteRequest = Readonly<{
  state: string;
  code: string;
  deviceId?: string;
}>;

export type AuthOAuthStartResult = Readonly<{
  provider: AuthSocialProvider;
  state: string;
  codeChallenge: string | null;
  codeChallengeMethod: "S256" | null;
  redirectUri: string;
  authorizationUrl: string | null;
}>;

export type AuthPasswordResetRequest = Readonly<{
  email: string;
}>;

export type AuthPasswordResetResult = Readonly<{
  accepted: boolean;
}>;

export type AuthPasswordResetConfirmRequest = Readonly<{
  token: string;
  newPassword: string;
}>;

export type AuthPasswordResetConfirmResult = Readonly<{
  completed: boolean;
}>;

export type AuthVerifyEmailRequest = Readonly<{
  token: string;
}>;

export type AuthVerifyEmailResult = Readonly<{
  verified: boolean;
}>;

export type AuthEmailVerificationRequest = Readonly<{
  email: string;
}>;

export type AuthEmailVerificationResult = Readonly<{
  accepted: boolean;
}>;

export type AuthLogoutResult = Readonly<{
  revoked: boolean;
}>;

export type AuthTokenStore = Readonly<{
  getItemAsync?: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync?: (key: string) => Promise<void>;
}>;

export type AuthApiClient = Readonly<{
  login: (request: AuthLoginRequest) => Promise<MobileAuthResponse>;
  register: (request: AuthRegisterRequest) => Promise<MobileSignupResponse>;
  startOAuth: (request: AuthOAuthStartRequest) => Promise<AuthOAuthStartResult>;
  completeOAuth: (
    request: AuthOAuthCompleteRequest,
  ) => Promise<MobileAuthResponse>;
  requestPasswordReset: (
    request: AuthPasswordResetRequest,
  ) => Promise<AuthPasswordResetResult>;
  confirmPasswordReset: (
    request: AuthPasswordResetConfirmRequest,
  ) => Promise<AuthPasswordResetConfirmResult>;
  verifyEmail: (
    request: AuthVerifyEmailRequest,
  ) => Promise<AuthVerifyEmailResult>;
  requestEmailVerification: (
    request: AuthEmailVerificationRequest,
  ) => Promise<AuthEmailVerificationResult>;
  refresh: (request?: AuthRefreshRequest) => Promise<MobileAuthResponse>;
  logout: () => Promise<AuthLogoutResult>;
}>;
