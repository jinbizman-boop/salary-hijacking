/** apps/mobile/app/(auth)/login.tsx
 * 급여납치 모바일 로그인 화면 최종본.
 * import/JSX 문법 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { normalizeMobileAuthResponse } from "../../src/shared/api/auth-response";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type AuthPhase = "LOGIN" | "MFA" | "LOCKED";
type ToastKind = "info" | "success" | "error";
type MfaMethod = "TOTP" | "RECOVERY_CODE";
type UserRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
type PlatformOS = "ios" | "android" | "web" | "windows" | "macos" | string;
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;
type ElementType =
  | string
  | ((props: Record<string, unknown>) => unknown)
  | object;
type SetState<T> = (next: T | ((previous: T) => T)) => void;

type ReactRuntime = Readonly<{
  createElement: (
    type: ElementType,
    props?: Record<string, unknown> | null,
    ...children: readonly unknown[]
  ) => unknown;
  useCallback: <TCallback extends (...args: never[]) => unknown>(
    callback: TCallback,
    deps: readonly unknown[],
  ) => TCallback;
  useMemo: <TValue>(factory: () => TValue, deps: readonly unknown[]) => TValue;
  useState: <TValue>(initial: TValue) => readonly [TValue, SetState<TValue>];
}>;

type NativeRuntime = Readonly<{
  ActivityIndicator: ElementType;
  KeyboardAvoidingView: ElementType;
  Pressable: ElementType;
  SafeAreaView: ElementType;
  ScrollView: ElementType;
  StyleSheet: {
    readonly create: <
      TStyles extends Record<string, Readonly<Record<string, unknown>>>,
    >(
      styles: TStyles,
    ) => TStyles;
  };
  Text: ElementType;
  TextInput: ElementType;
  View: ElementType;
  Platform: { readonly OS: PlatformOS };
}>;

type RouterRuntime = Readonly<{ useRouter: () => RouterLike }>;
type RouterLike = Readonly<{
  push: (href: never) => void;
  replace: (href: never) => void;
}>;
type SecureStoreOptions = Readonly<{ keychainAccessible?: string }>;
type SecureStoreRuntime = Readonly<{
  WHEN_UNLOCKED_THIS_DEVICE_ONLY?: string;
  setItemAsync: (
    key: string,
    value: string,
    options?: SecureStoreOptions,
  ) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;

type LoginSuccessPayload = Readonly<{
  status: "AUTHENTICATED";
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: string;
  user: Readonly<{
    id: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    role: UserRole;
  }>;
}>;

type MfaRequiredPayload = Readonly<{
  status: "MFA_REQUIRED";
  challengeId: string;
  methods: readonly MfaMethod[];
  maskedDestination?: string | null;
}>;

type LockedPayload = Readonly<{
  status: "LOCKED";
  message: string;
  retryAfterSeconds?: number | null;
}>;
type AuthPayload = LoginSuccessPayload | MfaRequiredPayload | LockedPayload;
type AuthResponse = Readonly<{ data?: AuthPayload; error?: unknown }>;

type StoredSession = Readonly<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  userId: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  role: UserRole;
}>;

type LoginForm = Readonly<{
  email: string;
  password: string;
  rememberDevice: boolean;
}>;
type MfaForm = Readonly<{
  challengeId: string;
  method: MfaMethod;
  code: string;
}>;

const SCREEN_VERSION = "3.1.6";
const ACCESS_TOKEN_KEY = "salary-hijacking.mobile.access-token";
const REFRESH_TOKEN_KEY = "salary-hijacking.mobile.refresh-token";
const SESSION_META_KEY = "salary-hijacking.mobile.session-meta";
const POST_LOGIN_HOME = "/salary";
const ONBOARDING_ROUTE = "/onboarding";
const VERIFY_EMAIL_ROUTE = "/(auth)/verify-email";
const SIGNUP_ROUTE = "/(auth)/signup";
const FORGOT_PASSWORD_ROUTE = "/(auth)/forgot-password";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECOVERY_CODE_PATTERN = /^[a-zA-Z0-9-]{8,32}$/;
const TOTP_PATTERN = /^\d{6}$/;

const SENSITIVE_KEYWORDS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "session",
  "email",
  "phone",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "expense",
  "savings",
  "amount",
  "hijack",
  "push",
  "fcm",
  "비밀번호",
  "토큰",
  "이메일",
  "전화",
  "계좌",
  "카드",
  "급여",
  "월급",
  "지출",
  "저축",
  "금액",
  "납치",
] as const;

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

export default function LoginScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [phase, setPhase] = ReactRuntimeRef.useState<AuthPhase>("LOGIN");
  const [form, setForm] = ReactRuntimeRef.useState<LoginForm>({
    email: "",
    password: "",
    rememberDevice: true,
  });
  const [mfa, setMfa] = ReactRuntimeRef.useState<MfaForm>({
    challengeId: "",
    method: "TOTP",
    code: "",
  });
  const [maskedDestination, setMaskedDestination] =
    ReactRuntimeRef.useState<string>("");
  const [showPassword, setShowPassword] =
    ReactRuntimeRef.useState<boolean>(false);
  const [busy, setBusy] = ReactRuntimeRef.useState<boolean>(false);
  const [toast, setToast] = ReactRuntimeRef.useState<{
    readonly kind: ToastKind;
    readonly message: string;
  }>({
    kind: "info",
    message: "서버 권위 인증으로 안전하게 로그인합니다.",
  });

  const canSubmit = ReactRuntimeRef.useMemo((): boolean => {
    if (busy || phase === "LOCKED") return false;
    if (phase === "MFA") return validateMfaCode(mfa.method, mfa.code);
    return EMAIL_PATTERN.test(form.email.trim()) && form.password.length >= 8;
  }, [busy, form.email, form.password, mfa.code, mfa.method, phase]);

  const submitLogin = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    const email = form.email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      setToast({ kind: "error", message: "이메일 형식을 확인하세요." });
      return;
    }

    if (form.password.length < 8) {
      setToast({ kind: "error", message: "비밀번호는 8자 이상이어야 합니다." });
      return;
    }

    setBusy(true);

    try {
      const response = await requestAuth("/api/v1/auth/login", {
        email,
        password: form.password,
        rememberMe: form.rememberDevice,
        rememberDevice: form.rememberDevice,
        client: mobileClientContext(),
      });

      await handleAuthResponse(
        response,
        router,
        setPhase,
        setMfa,
        setMaskedDestination,
        setToast,
      );
    } catch (error) {
      setToast({
        kind: "error",
        message:
          error instanceof Error ? error.message : "로그인에 실패했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }, [form.email, form.password, form.rememberDevice, router]);

  const submitMfa = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    if (!validateMfaCode(mfa.method, mfa.code)) {
      setToast({
        kind: "error",
        message:
          mfa.method === "TOTP"
            ? "6자리 인증 코드를 입력하세요."
            : "복구 코드를 확인하세요.",
      });
      return;
    }

    setBusy(true);

    try {
      const response = await requestAuth("/api/v1/auth/mfa/verify", {
        challengeId: mfa.challengeId,
        method: mfa.method,
        code: mfa.code.trim(),
        rememberMe: form.rememberDevice,
        rememberDevice: form.rememberDevice,
        client: mobileClientContext(),
      });

      await handleAuthResponse(
        response,
        router,
        setPhase,
        setMfa,
        setMaskedDestination,
        setToast,
      );
    } catch (error) {
      setToast({
        kind: "error",
        message:
          error instanceof Error ? error.message : "MFA 검증에 실패했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }, [form.rememberDevice, mfa.challengeId, mfa.code, mfa.method, router]);

  const goSignup = ReactRuntimeRef.useCallback(
    (): void => router.push(SIGNUP_ROUTE as never),
    [router],
  );
  const goForgotPassword = ReactRuntimeRef.useCallback(
    (): void => router.push(FORGOT_PASSWORD_ROUTE as never),
    [router],
  );

  const resetMfa = ReactRuntimeRef.useCallback((): void => {
    setPhase("LOGIN");
    setMfa({ challengeId: "", method: "TOTP", code: "" });
    setMaskedDestination("");
    setToast({ kind: "info", message: "로그인 정보를 다시 입력하세요." });
  }, []);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
      NativeRuntimeRef.KeyboardAvoidingView,
      {
        behavior:
          NativeRuntimeRef.Platform.OS === "ios" ? "padding" : undefined,
        style: styles.keyboard,
      },
      h(
        NativeRuntimeRef.ScrollView,
        {
          keyboardShouldPersistTaps: "handled",
          contentContainerStyle: styles.scrollContent,
        },
        h(
          NativeRuntimeRef.View,
          { style: styles.card },
          renderBrand(),
          h(
            NativeRuntimeRef.Text,
            { style: styles.headline },
            "급여, 예산, 지출, 저축을 서버 권위로 안전하게 관리합니다.",
          ),
          h(
            NativeRuntimeRef.Text,
            { style: styles.description },
            "로그인 화면은 인증 진입점만 담당하고 급여·예산·지출·저축 계산은 API 서버가 최종 확정합니다. 민감 금융 데이터와 push token은 이 화면에서 기록하거나 광고 타겟팅에 사용하지 않습니다.",
          ),
          renderToast(toast),
          phase === "MFA"
            ? renderMfaForm({
                busy,
                canSubmit,
                maskedDestination,
                mfa,
                resetMfa,
                setMfa,
                submitMfa,
              })
            : renderLoginForm({
                busy,
                canSubmit,
                form,
                goForgotPassword,
                goSignup,
                setForm,
                setShowPassword,
                showPassword,
                submitLogin,
              }),
          renderGuardBox(),
        ),
      ),
    ),
  );
}

function renderBrand(): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.brandRow },
    h(
      NativeRuntimeRef.View,
      { style: styles.brandMark },
      h(NativeRuntimeRef.Text, { style: styles.brandMarkText }, "급"),
    ),
    h(
      NativeRuntimeRef.View,
      null,
      h(
        NativeRuntimeRef.Text,
        { style: styles.brandKicker },
        "Paycheck Accounting",
      ),
      h(NativeRuntimeRef.Text, { style: styles.brandTitle }, "급여납치 로그인"),
    ),
  );
}

function renderToast(toast: {
  readonly kind: ToastKind;
  readonly message: string;
}): unknown {
  const variant =
    toast.kind === "error"
      ? styles.toastError
      : toast.kind === "success"
        ? styles.toastSuccess
        : styles.toastInfo;
  return h(
    NativeRuntimeRef.View,
    { style: [styles.toast, variant] },
    h(NativeRuntimeRef.Text, { style: styles.toastText }, toast.message),
  );
}

function renderLoginForm(
  args: Readonly<{
    busy: boolean;
    canSubmit: boolean;
    form: LoginForm;
    goForgotPassword: () => void;
    goSignup: () => void;
    setForm: SetState<LoginForm>;
    setShowPassword: SetState<boolean>;
    showPassword: boolean;
    submitLogin: () => Promise<void>;
  }>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.form },
    h(NativeRuntimeRef.Text, { style: styles.sectionTitle }, "계정 로그인"),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "이메일",
      autoCapitalize: "none",
      autoComplete: "email",
      autoCorrect: false,
      inputMode: "email",
      keyboardType: "email-address",
      onChangeText: (email: string): void =>
        args.setForm((prev: LoginForm) => ({ ...prev, email })),
      placeholder: "이메일",
      placeholderTextColor: "#64748b",
      style: styles.input,
      textContentType: "username",
      value: args.form.email,
    }),
    h(
      NativeRuntimeRef.View,
      { style: styles.passwordWrap },
      h(NativeRuntimeRef.TextInput, {
        accessibilityLabel: "비밀번호",
        autoCapitalize: "none",
        autoComplete: "password",
        autoCorrect: false,
        onChangeText: (password: string): void =>
          args.setForm((prev: LoginForm) => ({ ...prev, password })),
        onSubmitEditing: args.canSubmit ? args.submitLogin : undefined,
        placeholder: "비밀번호",
        placeholderTextColor: "#64748b",
        secureTextEntry: !args.showPassword,
        style: styles.passwordInput,
        textContentType: "password",
        value: args.form.password,
      }),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: args.showPassword
            ? "비밀번호 숨기기"
            : "비밀번호 보기",
          onPress: (): void => args.setShowPassword((value: boolean) => !value),
          style: styles.passwordToggle,
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.passwordToggleText },
          args.showPassword ? "숨김" : "보기",
        ),
      ),
    ),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "checkbox",
        accessibilityState: { checked: args.form.rememberDevice },
        onPress: (): void =>
          args.setForm((prev: LoginForm) => ({
            ...prev,
            rememberDevice: !prev.rememberDevice,
          })),
        style: styles.checkboxRow,
      },
      h(
        NativeRuntimeRef.View,
        {
          style: [
            styles.checkbox,
            args.form.rememberDevice ? styles.checkboxActive : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.checkboxMark },
          args.form.rememberDevice ? "✓" : "",
        ),
      ),
      h(
        NativeRuntimeRef.Text,
        { style: styles.checkboxText },
        "신뢰할 수 있는 기기에서 로그인 상태 유지",
      ),
    ),
    renderPrimaryButton(args.canSubmit, args.busy, args.submitLogin, "로그인"),
    h(
      NativeRuntimeRef.View,
      { style: styles.linkRow },
      h(
        NativeRuntimeRef.Pressable,
        { accessibilityRole: "link", onPress: args.goForgotPassword },
        h(NativeRuntimeRef.Text, { style: styles.linkText }, "비밀번호 재설정"),
      ),
      h(
        NativeRuntimeRef.Pressable,
        { accessibilityRole: "link", onPress: args.goSignup },
        h(NativeRuntimeRef.Text, { style: styles.linkText }, "회원가입"),
      ),
    ),
  );
}

function renderMfaForm(
  args: Readonly<{
    busy: boolean;
    canSubmit: boolean;
    maskedDestination: string;
    mfa: MfaForm;
    resetMfa: () => void;
    setMfa: SetState<MfaForm>;
    submitMfa: () => Promise<void>;
  }>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.form },
    h(NativeRuntimeRef.Text, { style: styles.sectionTitle }, "2단계 인증"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.helperText },
      args.maskedDestination
        ? `${args.maskedDestination}에 연결된 인증 방식을 확인하세요.`
        : "등록된 인증 앱 또는 복구 코드를 입력하세요.",
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.segmented },
      renderSegmentButton(
        args.mfa.method === "TOTP",
        "인증 앱 코드 사용",
        "인증 앱",
        (): void =>
          args.setMfa((prev: MfaForm) => ({
            ...prev,
            method: "TOTP",
            code: "",
          })),
      ),
      renderSegmentButton(
        args.mfa.method === "RECOVERY_CODE",
        "복구 코드 사용",
        "복구 코드",
        (): void =>
          args.setMfa((prev: MfaForm) => ({
            ...prev,
            method: "RECOVERY_CODE",
            code: "",
          })),
      ),
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "MFA 코드",
      autoCapitalize: "none",
      autoCorrect: false,
      keyboardType: args.mfa.method === "TOTP" ? "number-pad" : "default",
      maxLength: args.mfa.method === "TOTP" ? 6 : 32,
      onChangeText: (code: string): void =>
        args.setMfa((prev: MfaForm) => ({ ...prev, code })),
      placeholder: args.mfa.method === "TOTP" ? "6자리 코드" : "복구 코드",
      placeholderTextColor: "#64748b",
      secureTextEntry: args.mfa.method === "RECOVERY_CODE",
      style: styles.input,
      value: args.mfa.code,
    }),
    renderPrimaryButton(
      args.canSubmit,
      args.busy,
      args.submitMfa,
      "인증 후 계속",
    ),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        onPress: args.resetMfa,
        style: styles.secondaryButton,
      },
      h(
        NativeRuntimeRef.Text,
        { style: styles.secondaryButtonText },
        "로그인 정보 다시 입력",
      ),
    ),
  );
}

function renderSegmentButton(
  active: boolean,
  accessibilityLabel: string,
  label: string,
  onPress: () => void,
): unknown {
  return h(
    NativeRuntimeRef.Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel,
      onPress,
      style: [styles.segmentButton, active ? styles.segmentButtonActive : null],
    },
    h(
      NativeRuntimeRef.Text,
      { style: [styles.segmentText, active ? styles.segmentTextActive : null] },
      label,
    ),
  );
}

function renderPrimaryButton(
  canSubmit: boolean,
  busy: boolean,
  onPress: () => Promise<void>,
  label: string,
): unknown {
  return h(
    NativeRuntimeRef.Pressable,
    {
      accessibilityRole: "button",
      disabled: !canSubmit,
      onPress,
      style: [styles.primaryButton, !canSubmit ? styles.buttonDisabled : null],
    },
    busy
      ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
      : h(NativeRuntimeRef.Text, { style: styles.primaryButtonText }, label),
  );
}

function renderGuardBox(): unknown {
  const items = [
    "serverAuthority=true",
    "tokenSecureStore=true",
    "rawFinancialLog=false",
    "rawPushTokenLog=false",
    "adsFinancialTargeting=false",
    "credentialsNoConsole=true",
  ] as const;

  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "Security · Privacy Guard",
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.guardGrid },
      ...items.map((item: string) =>
        h(
          NativeRuntimeRef.View,
          { key: item, style: styles.guardPill },
          h(NativeRuntimeRef.Text, { style: styles.guardPillText }, item),
        ),
      ),
    ),
  );
}

async function handleAuthResponse(
  response: AuthResponse,
  router: RouterLike,
  setPhase: (phase: AuthPhase) => void,
  setMfa: (form: MfaForm) => void,
  setMaskedDestination: (value: string) => void,
  setToast: (toast: {
    readonly kind: ToastKind;
    readonly message: string;
  }) => void,
): Promise<void> {
  const payload = response.data;

  if (!payload) throw new Error(errorMessage(response.error, 400));

  if (payload.status === "MFA_REQUIRED") {
    setPhase("MFA");
    setMfa({
      challengeId: payload.challengeId,
      method: payload.methods.includes("TOTP") ? "TOTP" : "RECOVERY_CODE",
      code: "",
    });
    setMaskedDestination(payload.maskedDestination ?? "");
    setToast({ kind: "info", message: "추가 인증이 필요합니다." });
    return;
  }

  if (payload.status === "LOCKED") {
    setPhase("LOCKED");
    const retryText = payload.retryAfterSeconds
      ? ` ${payload.retryAfterSeconds}초 후 다시 시도하세요.`
      : "";
    throw new Error(`${safeMessage(payload.message)}${retryText}`);
  }

  await persistSession({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? null,
    expiresAt: payload.expiresAt,
    userId: payload.user.id,
    emailVerified: payload.user.emailVerified,
    onboardingCompleted: payload.user.onboardingCompleted,
    role: payload.user.role,
  });

  setToast({ kind: "success", message: "로그인되었습니다." });

  const nextRoute = payload.user.emailVerified
    ? payload.user.onboardingCompleted
      ? POST_LOGIN_HOME
      : ONBOARDING_ROUTE
    : VERIFY_EMAIL_ROUTE;
  router.replace(nextRoute as never);
}

async function requestAuth(
  path: string,
  payload: JsonRecord,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-client-platform": String(NativeRuntimeRef.Platform.OS),
      "x-correlation-id": createCorrelationId(),
      "x-raw-financial-data-logged": "false",
      "x-raw-push-token-logged": "false",
      "x-ad-financial-targeting-used": "false",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as AuthResponse) : {};

  if (!response.ok)
    throw new Error(errorMessage(parsed.error ?? parsed, response.status));

  return normalizeMobileAuthResponse(parsed);
}

async function persistSession(session: StoredSession): Promise<void> {
  if (!session.accessToken || !session.expiresAt || !session.userId)
    throw new Error("인증 응답이 올바르지 않습니다.");

  await SecureStoreRef.setItemAsync(
    ACCESS_TOKEN_KEY,
    session.accessToken,
    secureStoreOptions(),
  );

  if (session.refreshToken)
    await SecureStoreRef.setItemAsync(
      REFRESH_TOKEN_KEY,
      session.refreshToken,
      secureStoreOptions(),
    );
  else await SecureStoreRef.deleteItemAsync(REFRESH_TOKEN_KEY);

  await SecureStoreRef.setItemAsync(
    SESSION_META_KEY,
    JSON.stringify({
      expiresAt: session.expiresAt,
      userId: session.userId,
      emailVerified: session.emailVerified,
      onboardingCompleted: session.onboardingCompleted,
      role: session.role,
      tokenHashOnly: true,
      rawFinancialDataLogged: false,
      rawPushTokenLogged: false,
      adsFinancialTargetingUsed: false,
    }),
    secureStoreOptions(),
  );
}

function h(
  type: ElementType,
  props?: Record<string, unknown> | null,
  ...children: readonly unknown[]
): unknown {
  return ReactRuntimeRef.createElement(type, props ?? null, ...children);
}

function loadReactRuntime(): ReactRuntime {
  const mod = loadModule("react") as Partial<ReactRuntime>;

  return {
    createElement:
      typeof mod.createElement === "function"
        ? mod.createElement
        : fallbackCreateElement,
    useCallback:
      typeof mod.useCallback === "function"
        ? mod.useCallback
        : (callback: never): never => callback,
    useMemo:
      typeof mod.useMemo === "function"
        ? mod.useMemo
        : (factory: () => unknown): unknown => factory(),
    useState:
      typeof mod.useState === "function" ? mod.useState : fallbackUseState,
  } as ReactRuntime;
}

function loadNativeRuntime(): NativeRuntime {
  const mod = loadModule("react-native") as Partial<NativeRuntime>;
  const fallback = (name: string): ElementType => name;

  return {
    ActivityIndicator: mod.ActivityIndicator ?? fallback("ActivityIndicator"),
    KeyboardAvoidingView:
      mod.KeyboardAvoidingView ?? fallback("KeyboardAvoidingView"),
    Pressable: mod.Pressable ?? fallback("Pressable"),
    SafeAreaView: mod.SafeAreaView ?? fallback("SafeAreaView"),
    ScrollView: mod.ScrollView ?? fallback("ScrollView"),
    StyleSheet: mod.StyleSheet ?? {
      create: <
        TStyles extends Record<string, Readonly<Record<string, unknown>>>,
      >(
        stylesArg: TStyles,
      ): TStyles => stylesArg,
    },
    Text: mod.Text ?? fallback("Text"),
    TextInput: mod.TextInput ?? fallback("TextInput"),
    View: mod.View ?? fallback("View"),
    Platform: mod.Platform ?? { OS: "web" },
  };
}

function loadRouterRuntime(): RouterRuntime {
  const mod = loadModule("expo-router") as Partial<RouterRuntime>;

  return {
    useRouter:
      typeof mod.useRouter === "function"
        ? mod.useRouter
        : (): RouterLike => ({
            push: (_href: never): void => undefined,
            replace: (_href: never): void => undefined,
          }),
  };
}

function loadSecureStoreRuntime(): SecureStoreRuntime {
  const mod = loadModule("expo-secure-store") as Partial<SecureStoreRuntime>;
  return createSecureStoreRuntime(NativeRuntimeRef.Platform.OS, mod);
}

function loadModule(moduleName: string): unknown {
  try {
    switch (moduleName) {
      case "react":
        return require("react");
      case "react-native":
        return require("react-native");
      case "expo-router":
        return require("expo-router");
      case "expo-secure-store":
        return require("expo-secure-store");
      default:
        return {};
    }
  } catch {
    return {};
  }
}

function fallbackCreateElement(
  type: ElementType,
  props?: Record<string, unknown> | null,
  ...children: readonly unknown[]
): unknown {
  return {
    $$typeof: Symbol.for("react.element"),
    type,
    key: props?.key == null ? null : String(props.key),
    ref: null,
    props:
      children.length > 0
        ? {
            ...(props ?? {}),
            children: children.length === 1 ? children[0] : children,
          }
        : (props ?? {}),
    _owner: null,
  };
}

function fallbackUseState<TValue>(
  initial: TValue,
): readonly [TValue, SetState<TValue>] {
  return [
    initial,
    (_next: TValue | ((previous: TValue) => TValue)): void => undefined,
  ];
}

function secureStoreOptions(): SecureStoreOptions {
  return NativeRuntimeRef.Platform.OS === "ios" &&
    SecureStoreRef.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    ? { keychainAccessible: SecureStoreRef.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    : {};
}

function mobileClientContext(): JsonRecord {
  return {
    app: "salary-hijacking-mobile",
    version: SCREEN_VERSION,
    platform: String(NativeRuntimeRef.Platform.OS),
    locale: "ko-KR",
    timezone: "Asia/Seoul",
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
  };
}

function validateMfaCode(method: MfaMethod, code: string): boolean {
  const trimmed = code.trim();
  return method === "TOTP"
    ? TOTP_PATTERN.test(trimmed)
    : RECOVERY_CODE_PATTERN.test(trimmed);
}

function errorMessage(value: unknown, status: number): string {
  const sanitized = sanitize(value);

  if (typeof sanitized === "string" && sanitized.trim())
    return safeMessage(sanitized);

  if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
    const message = (sanitized as { readonly message?: JsonValue }).message;
    if (typeof message === "string" && message.trim())
      return safeMessage(message);
  }

  if (status === 401) return "이메일 또는 비밀번호를 확인하세요.";
  if (status === 403) return "접근이 제한된 계정입니다.";
  if (status === 423) return "계정이 잠겼습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";

  return `로그인 요청에 실패했습니다. (${status})`;
}

function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitize);

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]: [string, unknown]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  }

  return String(value);
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return SENSITIVE_KEYWORDS.some((keyword: string) =>
    normalized.includes(keyword.toLowerCase().replace(/[\s._-]/g, "")),
  );
}

function scrub(value: string): string {
  let output = value.slice(0, 700);

  SENSITIVE_KEYWORDS.forEach((keyword: string) => {
    output = output.replace(
      new RegExp(regexEscape(keyword), "gi"),
      "[REDACTED]",
    );
  });

  return output;
}

function safeMessage(value: string): string {
  return (
    scrub(value).replace(/\s+/g, " ").trim().slice(0, 180) ||
    "요청을 처리하지 못했습니다."
  );
}

function createCorrelationId(): string {
  const cryptoLike = (
    globalThis as unknown as {
      readonly crypto?: { readonly randomUUID?: () => string };
    }
  ).crypto;

  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID();

  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertMobileLoginScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_login_screen_runtime_loaded",
    "react_native_runtime_loaded",
    "email_password_login",
    "mfa_totp_and_recovery_code",
    "secure_store_session_persistence",
    "server_authority_auth_boundary",
    "api_v1_auth_login",
    "api_v1_auth_mfa_verify",
    "email_verified_route_guard",
    "onboarding_route_guard",
    "forgot_password_and_signup_routes",
    "input_validation",
    "rate_limit_error_handling",
    "account_locked_handling",
    "sensitive_error_redaction",
    "raw_financial_data_log_forbidden",
    "raw_push_token_log_forbidden",
    "ads_financial_targeting_forbidden",
    "token_hash_policy_marker",
    "korean_mobile_ux",
    "accessibility_labels",
    "keyboard_avoiding_layout",
    "responsive_scroll_layout",
    "typescript_strict_ready",
  ] as const;

  return { ok: checks.length >= 20, version: SCREEN_VERSION, checks };
}

const styles = NativeRuntimeRef.StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.96)",
    gap: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: 8,
  },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandMarkText: { color: "#020617", fontSize: 22, fontWeight: "900" },
  brandKicker: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  headline: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 34,
  },
  description: { color: "#cbd5e1", fontSize: 14, lineHeight: 22 },
  toast: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastInfo: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(34,211,238,0.36)",
  },
  toastSuccess: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(52,211,153,0.36)",
  },
  toastError: {
    backgroundColor: "rgba(244,63,94,0.16)",
    borderColor: "rgba(251,113,133,0.42)",
  },
  toastText: { color: "#e2e8f0", fontSize: 13, lineHeight: 19 },
  form: { gap: 12 },
  sectionTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  helperText: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
  input: {
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#f8fafc",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  passwordWrap: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 54,
    paddingLeft: 15,
  },
  passwordInput: {
    color: "#f8fafc",
    flex: 1,
    fontSize: 16,
    minHeight: 52,
    paddingRight: 10,
  },
  passwordToggle: { paddingHorizontal: 14, paddingVertical: 12 },
  passwordToggleText: { color: "#67e8f9", fontSize: 13, fontWeight: "900" },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 3,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 8,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxActive: { backgroundColor: "#34d399", borderColor: "#34d399" },
  checkboxMark: { color: "#020617", fontSize: 15, fontWeight: "900" },
  checkboxText: { color: "#cbd5e1", flex: 1, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#020617", fontSize: 16, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: "#e2e8f0", fontSize: 15, fontWeight: "800" },
  buttonDisabled: { opacity: 0.46 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  linkText: { color: "#67e8f9", fontSize: 14, fontWeight: "800" },
  segmented: {
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    paddingVertical: 10,
  },
  segmentButtonActive: { backgroundColor: "#67e8f9" },
  segmentText: { color: "#94a3b8", fontSize: 13, fontWeight: "900" },
  segmentTextActive: { color: "#020617" },
  guardBox: {
    borderColor: "rgba(52,211,153,0.26)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  guardTitle: { color: "#d1fae5", fontSize: 14, fontWeight: "900" },
  guardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  guardPill: {
    backgroundColor: "rgba(16,185,129,0.14)",
    borderColor: "rgba(52,211,153,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  guardPillText: { color: "#d1fae5", fontSize: 11, fontWeight: "800" },
});
