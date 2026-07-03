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

export type AuthPasswordResetRequest = Readonly<{
  email: string;
}>;

export type AuthPasswordResetResult = Readonly<{
  accepted: boolean;
}>;

export type AuthLogoutResult = Readonly<{
  revoked: boolean;
}>;

export type AuthTokenStore = Readonly<{
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync?: (key: string) => Promise<void>;
}>;

export type AuthApiClient = Readonly<{
  login: (request: AuthLoginRequest) => Promise<MobileAuthResponse>;
  register: (request: AuthRegisterRequest) => Promise<MobileSignupResponse>;
  requestPasswordReset: (
    request: AuthPasswordResetRequest,
  ) => Promise<AuthPasswordResetResult>;
  refresh: (request?: AuthRefreshRequest) => Promise<MobileAuthResponse>;
  logout: () => Promise<AuthLogoutResult>;
}>;
