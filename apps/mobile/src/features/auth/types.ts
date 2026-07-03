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

export type AuthTokenStore = Readonly<{
  setItemAsync: (key: string, value: string) => Promise<void>;
}>;

export type AuthApiClient = Readonly<{
  login: (request: AuthLoginRequest) => Promise<MobileAuthResponse>;
  register: (request: AuthRegisterRequest) => Promise<MobileSignupResponse>;
}>;
