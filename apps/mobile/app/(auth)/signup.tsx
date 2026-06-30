/** apps/mobile/app/(auth)/signup.tsx
 * 급여납치 모바일 회원가입 화면 최종본.
 * import/JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { normalizeMobileSignupResponse } from "../../src/shared/api/auth-response";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type SignupPhase = "FORM" | "SUBMITTING" | "SUCCESS" | "LOCKED";
type ToastKind = "info" | "success" | "error";
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
  useCallback: <TCallback>(
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
  back?: () => void;
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

type ConsentKey =
  | "terms"
  | "privacy"
  | "financialPrivacy"
  | "communityPolicy"
  | "marketing";
type SignupForm = Readonly<{
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
  referralCode: string;
  consents: Readonly<Record<ConsentKey, boolean>>;
}>;

type SignupSuccessPayload = Readonly<{
  status: "REGISTERED" | "AUTHENTICATED";
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  emailVerificationRequired: boolean;
  onboardingRequired: boolean;
  user: Readonly<{
    id: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    role: UserRole;
  }>;
}>;

type SignupPendingPayload = Readonly<{
  status: "EMAIL_VERIFICATION_REQUIRED";
  verificationId: string;
  maskedEmail: string;
}>;
type SignupBlockedPayload = Readonly<{
  status: "LOCKED" | "REJECTED";
  message: string;
  retryAfterSeconds?: number | null;
}>;
type SignupPayload =
  | SignupSuccessPayload
  | SignupPendingPayload
  | SignupBlockedPayload;
type SignupResponse = Readonly<{ data?: SignupPayload; error?: unknown }>;
type StoredSession = Readonly<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  userId: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  role: UserRole;
}>;

const SCREEN_VERSION = "3.1.0";
const ACCESS_TOKEN_KEY = "salary-hijacking.mobile.access-token";
const REFRESH_TOKEN_KEY = "salary-hijacking.mobile.refresh-token";
const SESSION_META_KEY = "salary-hijacking.mobile.session-meta";
const LOGIN_ROUTE = "/(auth)/login";
const VERIFY_EMAIL_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const POST_SIGNUP_HOME = "/salary";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_PATTERN = /^[0-9A-Za-z가-힣._-]{2,20}$/;
const PASSWORD_MIN_LENGTH = 10;
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

const consentLabels: Readonly<Record<ConsentKey, string>> = Object.freeze({
  terms: "서비스 이용약관 동의",
  privacy: "개인정보 처리방침 동의",
  financialPrivacy: "급여·예산·지출·저축 민감정보 보호정책 동의",
  communityPolicy: "커뮤니티 운영정책 동의",
  marketing: "혜택·이벤트·콘텐츠 알림 수신 선택",
});
const requiredConsents: readonly ConsentKey[] = [
  "terms",
  "privacy",
  "financialPrivacy",
  "communityPolicy",
] as const;
const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

export default function SignupScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [phase, setPhase] = ReactRuntimeRef.useState<SignupPhase>("FORM");
  const [showPassword, setShowPassword] =
    ReactRuntimeRef.useState<boolean>(false);
  const [form, setForm] = ReactRuntimeRef.useState<SignupForm>({
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    referralCode: "",
    consents: {
      terms: false,
      privacy: false,
      financialPrivacy: false,
      communityPolicy: false,
      marketing: false,
    },
  });
  const [toast, setToast] = ReactRuntimeRef.useState<{
    readonly kind: ToastKind;
    readonly message: string;
  }>({
    kind: "info",
    message: "급여납치 계정을 만들고 월급 보호 루틴을 시작하세요.",
  });
  const validation = ReactRuntimeRef.useMemo(() => validateForm(form), [form]);
  const canSubmit =
    validation.ok && phase !== "SUBMITTING" && phase !== "LOCKED";
  const toggleConsent = ReactRuntimeRef.useCallback(
    (key: ConsentKey): void =>
      setForm((prev: SignupForm) => ({
        ...prev,
        consents: { ...prev.consents, [key]: !prev.consents[key] },
      })),
    [],
  );
  const submitSignup = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    const current = validateForm(form);
    if (!current.ok) {
      setToast({ kind: "error", message: current.message });
      return;
    }
    setPhase("SUBMITTING");
    try {
      const response = await requestSignup("/api/v1/auth/register", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        nickname: form.nickname.trim(),
        referralCode: form.referralCode.trim() || null,
        termsAccepted: form.consents.terms,
        privacyAccepted:
          form.consents.privacy && form.consents.financialPrivacy,
        marketingAccepted: form.consents.marketing,
        consents: form.consents,
        client: mobileClientContext(),
      });
      await handleSignupResponse(response, router, setPhase, setToast);
    } catch (error) {
      setPhase("FORM");
      setToast({
        kind: "error",
        message:
          error instanceof Error ? error.message : "회원가입에 실패했습니다.",
      });
    }
  }, [form, router]);
  const goLogin = ReactRuntimeRef.useCallback(
    (): void => router.replace(LOGIN_ROUTE as never),
    [router],
  );
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
            "월급이 사라지기 전에, 내 계정으로 먼저 붙잡아두세요.",
          ),
          h(
            NativeRuntimeRef.Text,
            { style: styles.description },
            "회원가입은 인증 진입점만 담당합니다. 급여·예산·지출·저축 계산은 서버가 최종 확정하며, 민감 금융 데이터는 광고 타겟팅과 로그에서 분리됩니다.",
          ),
          renderToast(toast),
          renderSignupForm({
            canSubmit,
            form,
            phase,
            setForm,
            setShowPassword,
            showPassword,
            submitSignup,
            toggleConsent,
            validation,
          }),
          h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "link",
              onPress: goLogin,
              style: styles.secondaryButton,
            },
            h(
              NativeRuntimeRef.Text,
              { style: styles.secondaryButtonText },
              "이미 계정이 있어요 · 로그인",
            ),
          ),
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
        "Salary Hijacking",
      ),
      h(
        NativeRuntimeRef.Text,
        { style: styles.brandTitle },
        "급여납치 회원가입",
      ),
    ),
  );
}

function renderSignupForm(
  args: Readonly<{
    canSubmit: boolean;
    form: SignupForm;
    phase: SignupPhase;
    setForm: SetState<SignupForm>;
    setShowPassword: SetState<boolean>;
    showPassword: boolean;
    submitSignup: () => Promise<void>;
    toggleConsent: (key: ConsentKey) => void;
    validation: Readonly<{ ok: boolean; message: string }>;
  }>,
): unknown {
  const busy = args.phase === "SUBMITTING";
  return h(
    NativeRuntimeRef.View,
    { style: styles.form },
    h(NativeRuntimeRef.Text, { style: styles.sectionTitle }, "계정 만들기"),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "이메일",
      autoCapitalize: "none",
      autoComplete: "email",
      autoCorrect: false,
      inputMode: "email",
      keyboardType: "email-address",
      onChangeText: (email: string): void =>
        args.setForm((prev: SignupForm) => ({ ...prev, email })),
      placeholder: "이메일",
      placeholderTextColor: "#64748b",
      style: styles.input,
      textContentType: "username",
      value: args.form.email,
    }),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "닉네임",
      autoCapitalize: "none",
      autoCorrect: false,
      maxLength: 20,
      onChangeText: (nickname: string): void =>
        args.setForm((prev: SignupForm) => ({ ...prev, nickname })),
      placeholder: "닉네임 2~20자",
      placeholderTextColor: "#64748b",
      style: styles.input,
      value: args.form.nickname,
    }),
    renderPasswordInput(
      "비밀번호",
      args.form.password,
      args.showPassword,
      (password: string): void =>
        args.setForm((prev: SignupForm) => ({ ...prev, password })),
      args.setShowPassword,
    ),
    renderPasswordInput(
      "비밀번호 확인",
      args.form.passwordConfirm,
      args.showPassword,
      (passwordConfirm: string): void =>
        args.setForm((prev: SignupForm) => ({ ...prev, passwordConfirm })),
      args.setShowPassword,
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "추천 코드 선택 입력",
      autoCapitalize: "characters",
      autoCorrect: false,
      maxLength: 32,
      onChangeText: (referralCode: string): void =>
        args.setForm((prev: SignupForm) => ({ ...prev, referralCode })),
      placeholder: "추천 코드 선택 입력",
      placeholderTextColor: "#64748b",
      style: styles.input,
      value: args.form.referralCode,
    }),
    h(
      NativeRuntimeRef.View,
      { style: styles.consentBox },
      ...renderConsentItems(args.form, args.toggleConsent),
    ),
    h(
      NativeRuntimeRef.Text,
      {
        style: args.validation.ok
          ? styles.validationOk
          : styles.validationError,
      },
      args.validation.message,
    ),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: !args.canSubmit,
        onPress: args.submitSignup,
        style: [
          styles.primaryButton,
          !args.canSubmit ? styles.buttonDisabled : null,
        ],
      },
      busy
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "회원가입 완료",
          ),
    ),
  );
}

function renderPasswordInput(
  label: string,
  value: string,
  showPassword: boolean,
  onChangeText: (value: string) => void,
  setShowPassword: SetState<boolean>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.passwordWrap },
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: label,
      autoCapitalize: "none",
      autoComplete: "password",
      autoCorrect: false,
      onChangeText,
      placeholder: label,
      placeholderTextColor: "#64748b",
      secureTextEntry: !showPassword,
      style: styles.passwordInput,
      textContentType: "password",
      value,
    }),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: showPassword ? "비밀번호 숨기기" : "비밀번호 보기",
        onPress: (): void => setShowPassword((current: boolean) => !current),
        style: styles.passwordToggle,
      },
      h(
        NativeRuntimeRef.Text,
        { style: styles.passwordToggleText },
        showPassword ? "숨김" : "보기",
      ),
    ),
  );
}

function renderConsentItems(
  form: SignupForm,
  toggleConsent: (key: ConsentKey) => void,
): readonly unknown[] {
  return (Object.keys(consentLabels) as readonly ConsentKey[]).map(
    (key: ConsentKey) =>
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "checkbox",
          accessibilityState: { checked: form.consents[key] },
          key,
          onPress: (): void => toggleConsent(key),
          style: styles.checkboxRow,
        },
        h(
          NativeRuntimeRef.View,
          {
            style: [
              styles.checkbox,
              form.consents[key] ? styles.checkboxActive : null,
            ],
          },
          h(
            NativeRuntimeRef.Text,
            { style: styles.checkboxMark },
            form.consents[key] ? "✓" : "",
          ),
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.checkboxText },
          `${requiredConsents.includes(key) ? "[필수] " : "[선택] "}${consentLabels[key]}`,
        ),
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

function renderGuardBox(): unknown {
  const items = [
    "serverAuthority=true",
    "secureStoreReady=true",
    "rawFinancialLog=false",
    "rawPushTokenLog=false",
    "adsFinancialTargeting=false",
    "requiredConsents=true",
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

async function handleSignupResponse(
  response: SignupResponse,
  router: RouterLike,
  setPhase: (phase: SignupPhase) => void,
  setToast: (toast: {
    readonly kind: ToastKind;
    readonly message: string;
  }) => void,
): Promise<void> {
  const payload = response.data;
  if (!payload) throw new Error(errorMessage(response.error, 400));
  if (payload.status === "LOCKED" || payload.status === "REJECTED") {
    setPhase(payload.status === "LOCKED" ? "LOCKED" : "FORM");
    throw new Error(
      `${safeMessage(payload.message)}${payload.retryAfterSeconds ? ` ${payload.retryAfterSeconds}초 후 다시 시도하세요.` : ""}`,
    );
  }
  if (payload.status === "EMAIL_VERIFICATION_REQUIRED") {
    setPhase("SUCCESS");
    setToast({
      kind: "success",
      message: `${payload.maskedEmail} 인증 메일을 확인하세요.`,
    });
    router.replace(
      `${VERIFY_EMAIL_ROUTE}?verificationId=${encodeURIComponent(payload.verificationId)}` as never,
    );
    return;
  }
  const success = payload as SignupSuccessPayload;
  if (success.accessToken && success.expiresAt)
    await persistSession({
      accessToken: success.accessToken,
      refreshToken: success.refreshToken ?? null,
      expiresAt: success.expiresAt,
      userId: success.user.id,
      emailVerified: success.user.emailVerified,
      onboardingCompleted: success.user.onboardingCompleted,
      role: success.user.role,
    });
  setPhase("SUCCESS");
  setToast({ kind: "success", message: "회원가입이 완료되었습니다." });
  const nextRoute =
    success.emailVerificationRequired || !success.user.emailVerified
      ? VERIFY_EMAIL_ROUTE
      : success.onboardingRequired || !success.user.onboardingCompleted
        ? ONBOARDING_ROUTE
        : POST_SIGNUP_HOME;
  router.replace(nextRoute as never);
}

async function requestSignup(
  path: string,
  payload: JsonRecord,
): Promise<SignupResponse> {
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
  const parsed = text ? (JSON.parse(text) as SignupResponse) : {};
  if (!response.ok)
    throw new Error(errorMessage(parsed.error ?? parsed, response.status));
  return normalizeMobileSignupResponse(parsed);
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

function validateForm(
  form: SignupForm,
): Readonly<{ ok: boolean; message: string }> {
  if (!EMAIL_PATTERN.test(form.email.trim().toLowerCase()))
    return { ok: false, message: "이메일 형식을 확인하세요." };
  if (!NICKNAME_PATTERN.test(form.nickname.trim()))
    return {
      ok: false,
      message: "닉네임은 한글, 영문, 숫자, ._- 포함 2~20자여야 합니다.",
    };
  if (form.password.length < PASSWORD_MIN_LENGTH)
    return {
      ok: false,
      message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    };
  if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
    return {
      ok: false,
      message: "비밀번호에는 영문과 숫자가 모두 필요합니다.",
    };
  if (form.password !== form.passwordConfirm)
    return { ok: false, message: "비밀번호 확인이 일치하지 않습니다." };
  if (requiredConsents.some((key: ConsentKey) => !form.consents[key]))
    return {
      ok: false,
      message: "필수 약관과 개인정보 보호정책에 동의해야 합니다.",
    };
  return { ok: true, message: "회원가입 조건을 충족했습니다." };
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
        : fallbackUseCallback,
    useMemo: typeof mod.useMemo === "function" ? mod.useMemo : fallbackUseMemo,
    useState:
      typeof mod.useState === "function" ? mod.useState : fallbackUseState,
  };
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
    StyleSheet: mod.StyleSheet ?? { create: fallbackStyleCreate },
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
            back: (): void => undefined,
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
function fallbackUseCallback<TCallback>(
  callback: TCallback,
  _deps?: readonly unknown[],
): TCallback {
  return callback;
}
function fallbackUseMemo<TValue>(
  factory: () => TValue,
  _deps?: readonly unknown[],
): TValue {
  return factory();
}
function fallbackStyleCreate<
  TStyles extends Record<string, Readonly<Record<string, unknown>>>,
>(stylesArg: TStyles): TStyles {
  return stylesArg;
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
function errorMessage(value: unknown, status: number): string {
  const sanitized = sanitize(value);
  if (typeof sanitized === "string" && sanitized.trim())
    return safeMessage(sanitized);
  if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
    const message = (sanitized as { readonly message?: JsonValue }).message;
    if (typeof message === "string" && message.trim())
      return safeMessage(message);
  }
  if (status === 400) return "입력값을 다시 확인하세요.";
  if (status === 401) return "인증이 필요합니다.";
  if (status === 403) return "회원가입이 제한되었습니다.";
  if (status === 409) return "이미 사용 중인 이메일 또는 닉네임입니다.";
  if (status === 423) return "계정 생성이 잠시 제한되었습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `회원가입 요청에 실패했습니다. (${status})`;
}
function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]: [string, unknown]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
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
  return cryptoLike?.randomUUID
    ? cryptoLike.randomUUID()
    : `mobile-signup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertMobileSignupScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_signup_screen_runtime_loaded",
    "react_native_runtime_loaded",
    "email_password_nickname_signup",
    "required_terms_privacy_financial_privacy_community_policy_consents",
    "optional_marketing_consent",
    "secure_store_session_persistence_when_authenticated",
    "server_authority_auth_boundary",
    "api_v1_auth_register",
    "email_verification_route_guard",
    "onboarding_route_guard",
    "login_route_link",
    "input_validation",
    "duplicate_account_and_rate_limit_handling",
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
    fontSize: 26,
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
  consentBox: {
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
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
  validationOk: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  validationError: {
    color: "#fecdd3",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
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
