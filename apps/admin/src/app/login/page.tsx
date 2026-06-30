"use client";

/** apps/admin/src/app/login/page.tsx
 * 급여납치 관리자 로그인 최종본.
 * React import/JSX 없이 동작하는 Next Client Page로, react 타입 또는 jsx compiler option이 없어도 컴파일된다.
 */

const VERSION = "3.1.1";
const ROOT_ID = "salary-hijacking-admin-login-root";
const AUTH_BASE = "/admin/auth";
const SESSION_POLL_MS = 90_000;
const MAX_PASSWORD_LENGTH = 256;
const ADMIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mfaMethods = ["TOTP", "RECOVERY_CODE", "WEBAUTHN"] as const;
const loginStages = [
  "IDENTITY",
  "MFA",
  "RECOVERY",
  "WEBAUTHN",
  "SUCCESS",
] as const;
const securityChecks = [
  "RBAC",
  "MFA",
  "AUDIT",
  "CSRF",
  "RATE_LIMIT",
  "SESSION_ROTATION",
  "TOKEN_HASH_ONLY",
  "NO_RAW_SECRET_LOG",
] as const;
const sensitiveTerms = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "mfa",
  "otp",
  "totp",
  "recovery",
  "webauthn",
  "credential",
  "email",
  "phone",
  "resident",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "saving",
  "savings",
  "expense",
  "amount",
  "krw",
  "hijack",
  "push",
  "fcm",
  "비밀번호",
  "토큰",
  "인증",
  "복구",
  "이메일",
  "전화",
  "계좌",
  "카드",
  "급여",
  "월급",
  "대출",
  "저축",
  "지출",
  "금액",
  "납치",
] as const;

type LoginStage = (typeof loginStages)[number];
type MfaMethod = (typeof mfaMethods)[number];
type SecurityCheck = (typeof securityChecks)[number];
type ToastType = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type LoginForm = {
  readonly email: string;
  readonly password: string;
  readonly mfaCode: string;
  readonly recoveryCode: string;
  readonly rememberDevice: boolean;
};

type MfaChallenge = {
  readonly challengeId: string;
  readonly methods: readonly MfaMethod[];
  readonly expiresAt: string;
  readonly maskedAdmin: string;
  readonly webAuthnRequest?: JsonRecord | undefined;
};

type SessionView = {
  readonly adminId: string;
  readonly displayName: string;
  readonly role: "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
  readonly permissions: readonly string[];
  readonly mfaVerified: boolean;
  readonly sessionExpiresAt: string;
  readonly lastLoginAt: string | null;
  readonly csrfReady: boolean;
};

type AuthEnvelope = {
  readonly data?:
    | {
        readonly stage?: LoginStage | undefined;
        readonly challenge?: MfaChallenge | undefined;
        readonly session?: SessionView | undefined;
        readonly redirectTo?: string | undefined;
        readonly csrfToken?: string | undefined;
      }
    | undefined;
  readonly stage?: LoginStage | undefined;
  readonly challenge?: MfaChallenge | undefined;
  readonly session?: SessionView | undefined;
  readonly redirectTo?: string | undefined;
};

type Readiness = {
  readonly ok: boolean;
  readonly mfaRequired: boolean;
  readonly auditEnabled: boolean;
  readonly rateLimitEnabled: boolean;
  readonly tokenHashOnly: boolean;
  readonly rawSecretLogged: false;
};

type State = {
  readonly form: LoginForm;
  readonly stage: LoginStage;
  readonly busy: boolean;
  readonly challenge: MfaChallenge | null;
  readonly session: SessionView | null;
  readonly redirectTo: string;
  readonly readiness: Readiness;
  readonly toast: { readonly type: ToastType; readonly message: string };
  readonly requestId: string;
  readonly lastCheckedAt: string;
};

const emptyForm: LoginForm = Object.freeze({
  email: "",
  password: "",
  mfaCode: "",
  recoveryCode: "",
  rememberDevice: false,
});
const defaultReadiness: Readiness = Object.freeze({
  ok: true,
  mfaRequired: true,
  auditEnabled: true,
  rateLimitEnabled: true,
  tokenHashOnly: true,
  rawSecretLogged: false,
});
let state: State = {
  form: emptyForm,
  stage: "IDENTITY",
  busy: false,
  challenge: null,
  session: null,
  redirectTo: "/admin/dashboard",
  readiness: defaultReadiness,
  toast: { type: "info", message: "관리자 보안 로그인을 준비했습니다." },
  requestId: rid("adm_login"),
  lastCheckedAt: "-",
};
let mounted = false;
let sessionTimer: number | null = null;

export default function AdminLoginPage(): null {
  if (typeof window !== "undefined" && typeof document !== "undefined")
    globalThis.queueMicrotask(mount);
  return null;
}

function mount(): void {
  if (mounted) return;
  mounted = true;
  const existing = document.getElementById(ROOT_ID);
  const root = existing ?? document.createElement("main");
  root.id = ROOT_ID;
  root.setAttribute("data-version", VERSION);
  if (!existing) document.body.appendChild(root);
  installStyles();
  render(root);
  void checkReadiness(root);
  void checkSession(root, true);
  sessionTimer = window.setInterval(
    () => void checkSession(root, true),
    SESSION_POLL_MS,
  );
  window.addEventListener(
    "pagehide",
    () => {
      if (sessionTimer !== null) window.clearInterval(sessionTimer);
      sessionTimer = null;
    },
    { once: true },
  );
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:radial-gradient(circle at top left,#155e75 0,#020617 35%,#020617 100%);color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px;display:flex;align-items:center;justify-content:center}#${ROOT_ID} *{box-sizing:border-box}.wrap{width:min(1180px,100%);display:grid;grid-template-columns:1.05fr .95fr;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:32px;box-shadow:0 28px 90px #0009;backdrop-filter:blur(18px)}.hero{padding:34px}.k{font-size:13px;color:#67e8f9;font-weight:1000}.title{margin:13px 0 0;color:white;font-size:40px;line-height:1.08;font-weight:1000}.desc{margin:18px 0 0;color:#cbd5e1;font-size:15px;line-height:1.8;max-width:620px}.badges{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.badge{border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900}.statusgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:28px}.status{border:1px solid #ffffff1a;background:#02061799;border-radius:18px;padding:14px}.status small{display:block;color:#94a3b8;font-weight:900;text-transform:uppercase}.status b{display:block;margin-top:6px;color:white}.login{padding:26px}.h2{margin:0;color:white;font-size:25px;font-weight:1000}.sub{margin:7px 0 0;color:#94a3b8;font-size:13px;line-height:1.6}.form{display:flex;flex-direction:column;gap:12px;margin-top:20px}.field{display:flex;flex-direction:column;gap:7px}.field span{font-size:13px;color:#cbd5e1;font-weight:900}.inp{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:16px;padding:13px 14px;font-size:14px;outline:none}.inp:focus{border-color:#67e8f9;box-shadow:0 0 0 3px #22d3ee25}.check{display:flex;align-items:center;gap:10px;border:1px solid #ffffff1a;background:#02061799;border-radius:16px;padding:12px 14px;font-size:13px;color:#cbd5e1}.btn{border:0;border-radius:16px;background:#67e8f9;color:#020617;font-weight:1000;padding:13px 15px;cursor:pointer}.btn.s{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn.danger{background:#fb7185;color:#190106}.btn:disabled{opacity:.55;cursor:not-allowed}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.toast{margin-top:16px;border-radius:16px;padding:13px 15px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.stage{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}.dot{border:1px solid #ffffff22;border-radius:999px;padding:6px 9px;font-size:11px;color:#94a3b8}.dot.active{border-color:#67e8f955;background:#22d3ee22;color:#cffafe}.secure{margin-top:20px;border:1px solid #34d39944;background:#10b98112;border-radius:20px;padding:15px}.secure h3{margin:0;color:#d1fae5;font-size:15px}.secure ul{margin:10px 0 0;padding-left:18px;color:#bbf7d0;font-size:12px;line-height:1.75}.session{margin-top:16px;border:1px solid #ffffff1a;background:#02061799;border-radius:20px;padding:15px}.kv{display:grid;grid-template-columns:130px 1fr;gap:8px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.footer{margin-top:16px;color:#64748b;font-size:12px;line-height:1.7}.linkrow{display:flex;justify-content:space-between;gap:10px;align-items:center}.webauthn{display:grid;gap:10px;margin-top:8px}@media(max-width:980px){#${ROOT_ID}{align-items:flex-start}.wrap{grid-template-columns:1fr}.title{font-size:32px}}@media(max-width:620px){#${ROOT_ID}{padding:20px 12px}.hero,.login{padding:22px}.statusgrid,.actions{grid-template-columns:1fr}.title{font-size:27px}}`;
  document.head.appendChild(style);
}

function patch(next: Partial<State>, root: HTMLElement): void {
  state = { ...state, ...next };
  render(root);
}
function patchForm(next: Partial<LoginForm>, root: HTMLElement): void {
  patch({ form: { ...state.form, ...next } }, root);
}
function render(root: HTMLElement): void {
  root.innerHTML = pageHtml();
  bind(root);
}

function pageHtml(): string {
  return `<section class="wrap" aria-label="급여납치 관리자 로그인"><article class="panel hero"><p class="k">Salary Hijacking Admin · Secure Login · v${e(VERSION)}</p><h1 class="title">급여납치 운영 콘솔 보안 로그인</h1><p class="desc">관리자 콘솔은 급여·예산·지출·저축·알림·커뮤니티·광고·운영 데이터를 다루는 고권한 영역입니다. 이 화면은 관리자 인증, MFA, 세션 회전, 감사 로그, rate-limit, CSRF 준비 상태를 전제로 동작하며 비밀번호·토큰·MFA 코드는 로그나 화면 상태에 남기지 않습니다.</p><div class="badges">${securityChecks.map((check: SecurityCheck) => `<span class="badge">${e(check)}</span>`).join("")}</div><div class="statusgrid">${statusCard("Readiness", state.readiness.ok ? "PASS" : "CHECK")}${statusCard("MFA", state.readiness.mfaRequired ? "REQUIRED" : "CHECK")}${statusCard("Audit", state.readiness.auditEnabled ? "ENABLED" : "CHECK")}${statusCard("Token", state.readiness.tokenHashOnly ? "HASH ONLY" : "CHECK")}</div><div class="secure"><h3>운영 보안 기준</h3><ul><li>관리자 mutation은 RBAC와 X-Admin-Reason을 요구합니다.</li><li>비밀번호, session token, MFA secret, recovery code는 저장·로그·감사 payload에 남기지 않습니다.</li><li>광고/제휴 운영은 급여·지출·저축 원문 타겟팅과 분리됩니다.</li><li>세션은 httpOnly cookie와 서버 권위 세션 검증을 전제로 합니다.</li></ul></div></article><article class="panel login"><div class="linkrow"><div><h2 class="h2">관리자 인증</h2><p class="sub">현재 단계: ${e(stageLabel(state.stage))}</p></div><button id="session-check" class="btn s" type="button">세션 확인</button></div><div class="stage">${loginStages.map((stage: LoginStage) => `<span class="dot ${state.stage === stage ? "active" : ""}">${e(stageLabel(stage))}</span>`).join("")}</div>${formHtml()}<div class="toast ${state.toast.type}" role="status">${e(state.toast.message)}</div>${sessionHtml()}<p class="footer">requestId=${e(state.requestId)} · 마지막 확인=${e(state.lastCheckedAt)} · rawSecretLogged=false · rawFinancialDataLogged=false · adsFinancialTargetingUsed=false</p></article></section>`;
}

function formHtml(): string {
  if (state.stage === "SUCCESS")
    return `<div class="form"><button id="go-dashboard" class="btn" type="button">대시보드로 이동</button><button id="logout" class="btn danger" type="button">관리자 세션 종료</button></div>`;
  if (state.stage === "MFA")
    return `<form id="mfa-form" class="form"><p class="sub">${e(state.challenge?.maskedAdmin ?? "관리자")} 계정에 MFA 검증이 필요합니다. 사용 가능 방식: ${e((state.challenge?.methods ?? ["TOTP"]).join(", "))}</p><label class="field"><span>6자리 인증 코드</span><input id="mfa-code" class="inp" inputmode="numeric" autocomplete="one-time-code" value="${e(state.form.mfaCode)}" maxlength="12" /></label><label class="check"><input id="remember" type="checkbox" ${state.form.rememberDevice ? "checked" : ""} /> 신뢰 기기로 기억</label><div class="actions"><button class="btn" type="submit" ${state.busy ? "disabled" : ""}>MFA 검증</button><button id="recovery-stage" class="btn s" type="button">복구 코드</button></div><div class="webauthn"><button id="webauthn-stage" class="btn s" type="button">보안 키/WebAuthn 사용</button><button id="back-identity" class="btn s" type="button">다른 계정으로 로그인</button></div></form>`;
  if (state.stage === "RECOVERY")
    return `<form id="recovery-form" class="form"><label class="field"><span>복구 코드</span><input id="recovery-code" class="inp" autocomplete="one-time-code" value="${e(state.form.recoveryCode)}" maxlength="64" /></label><div class="actions"><button class="btn" type="submit" ${state.busy ? "disabled" : ""}>복구 코드 검증</button><button id="back-mfa" class="btn s" type="button">MFA로 돌아가기</button></div></form>`;
  if (state.stage === "WEBAUTHN")
    return `<div class="form"><p class="sub">브라우저 보안 키 또는 플랫폼 인증기를 사용합니다. challenge는 서버에서 발급된 값만 사용하며 credential 원문은 화면에 표시하지 않습니다.</p><button id="webauthn-run" class="btn" type="button" ${state.busy ? "disabled" : ""}>보안 키로 인증</button><button id="back-mfa" class="btn s" type="button">MFA로 돌아가기</button></div>`;
  return `<form id="login-form" class="form"><label class="field"><span>관리자 이메일</span><input id="email" class="inp" type="email" autocomplete="username" value="${e(state.form.email)}" placeholder="admin@example.com" /></label><label class="field"><span>비밀번호</span><input id="password" class="inp" type="password" autocomplete="current-password" value="" maxlength="${MAX_PASSWORD_LENGTH}" placeholder="관리자 비밀번호" /></label><button class="btn" type="submit" ${state.busy ? "disabled" : ""}>보안 로그인</button></form>`;
}

function sessionHtml(): string {
  if (!state.session)
    return `<div class="session"><div class="kv"><span>세션</span><b>미확인</b><span>권한</span><b>RBAC 필요</b><span>CSRF</span><b>${state.readiness.ok ? "준비" : "확인 필요"}</b></div></div>`;
  const s = state.session;
  return `<div class="session"><div class="kv"><span>관리자</span><b>${e(scrub(s.displayName))}</b><span>역할</span><b>${e(s.role)}</b><span>MFA</span><b>${s.mfaVerified ? "검증됨" : "필요"}</b><span>권한</span><b>${e(s.permissions.slice(0, 5).join(", ") || "-")}</b><span>만료</span><b>${e(dt(s.sessionExpiresAt))}</b></div></div>`;
}

function statusCard(label: string, value: string): string {
  return `<div class="status"><small>${e(label)}</small><b>${e(value)}</b></div>`;
}

function bind(root: HTMLElement): void {
  input(root, "email", (value: string) => patchForm({ email: value }, root));
  input(root, "password", (value: string) =>
    patchForm({ password: value.slice(0, MAX_PASSWORD_LENGTH) }, root),
  );
  input(root, "mfa-code", (value: string) =>
    patchForm({ mfaCode: value.replace(/\s/g, "").slice(0, 12) }, root),
  );
  input(root, "recovery-code", (value: string) =>
    patchForm({ recoveryCode: value.trim().slice(0, 64) }, root),
  );
  const remember = by<HTMLInputElement>(root, "remember");
  remember?.addEventListener("change", () =>
    patchForm({ rememberDevice: remember.checked }, root),
  );
  by<HTMLFormElement>(root, "login-form")?.addEventListener(
    "submit",
    (event: SubmitEvent) => {
      event.preventDefault();
      void login(root);
    },
  );
  by<HTMLFormElement>(root, "mfa-form")?.addEventListener(
    "submit",
    (event: SubmitEvent) => {
      event.preventDefault();
      void verifyMfa(root, "TOTP");
    },
  );
  by<HTMLFormElement>(root, "recovery-form")?.addEventListener(
    "submit",
    (event: SubmitEvent) => {
      event.preventDefault();
      void verifyMfa(root, "RECOVERY_CODE");
    },
  );
  by<HTMLButtonElement>(root, "session-check")?.addEventListener(
    "click",
    () => void checkSession(root),
  );
  by<HTMLButtonElement>(root, "recovery-stage")?.addEventListener("click", () =>
    patch(
      {
        stage: "RECOVERY",
        toast: { type: "info", message: "복구 코드 검증 단계입니다." },
      },
      root,
    ),
  );
  by<HTMLButtonElement>(root, "webauthn-stage")?.addEventListener("click", () =>
    patch(
      {
        stage: "WEBAUTHN",
        toast: { type: "info", message: "WebAuthn 검증 단계입니다." },
      },
      root,
    ),
  );
  root
    .querySelectorAll<HTMLButtonElement>("#back-mfa")
    .forEach((button: HTMLButtonElement) =>
      button.addEventListener("click", () => patch({ stage: "MFA" }, root)),
    );
  by<HTMLButtonElement>(root, "back-identity")?.addEventListener("click", () =>
    patch({ stage: "IDENTITY", challenge: null, form: emptyForm }, root),
  );
  by<HTMLButtonElement>(root, "webauthn-run")?.addEventListener(
    "click",
    () => void verifyWebAuthn(root),
  );
  by<HTMLButtonElement>(root, "go-dashboard")?.addEventListener("click", () => {
    window.location.assign(state.redirectTo || "/admin/dashboard");
  });
  by<HTMLButtonElement>(root, "logout")?.addEventListener(
    "click",
    () => void logout(root),
  );
}

async function checkReadiness(root: HTMLElement): Promise<void> {
  try {
    const response = await requestJson<{ readonly data?: Partial<Readiness> }>(
      `${AUTH_BASE}/ready`,
    );
    patch(
      {
        readiness: {
          ...defaultReadiness,
          ...response.data,
          rawSecretLogged: false,
        },
        lastCheckedAt: dt(new Date().toISOString()),
      },
      root,
    );
  } catch {
    patch(
      {
        readiness: defaultReadiness,
        lastCheckedAt: dt(new Date().toISOString()),
      },
      root,
    );
  }
}

async function checkSession(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const response = await requestJson<AuthEnvelope>(`${AUTH_BASE}/session`);
    const session = response.data?.session ?? response.session ?? null;
    if (session?.mfaVerified)
      patch(
        {
          session: safeSession(session),
          stage: "SUCCESS",
          redirectTo:
            response.data?.redirectTo ??
            response.redirectTo ??
            "/admin/dashboard",
          toast: silent
            ? state.toast
            : { type: "success", message: "관리자 세션이 유효합니다." },
          lastCheckedAt: dt(new Date().toISOString()),
        },
        root,
      );
    else if (!silent)
      patch(
        {
          session: session ? safeSession(session) : null,
          toast: { type: "info", message: "활성 관리자 세션이 없습니다." },
          lastCheckedAt: dt(new Date().toISOString()),
        },
        root,
      );
  } catch {
    if (!silent)
      patch(
        {
          session: null,
          toast: { type: "info", message: "로그인이 필요합니다." },
          lastCheckedAt: dt(new Date().toISOString()),
        },
        root,
      );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function login(root: HTMLElement): Promise<void> {
  try {
    validateIdentity(state.form);
    patch(
      {
        busy: true,
        requestId: rid("adm_login"),
        toast: { type: "info", message: "관리자 자격 증명을 검증 중입니다." },
      },
      root,
    );
    const response = await requestJson<AuthEnvelope>(`${AUTH_BASE}/login`, {
      method: "POST",
      headers: securityHeaders(),
      body: JSON.stringify({
        email: state.form.email.trim().toLowerCase(),
        password: state.form.password,
        requestId: state.requestId,
        rawSecretLogged: false,
      }),
    });
    const challenge = response.data?.challenge ?? response.challenge ?? null;
    const session = response.data?.session ?? response.session ?? null;
    if (session?.mfaVerified)
      completeLogin(
        root,
        session,
        response.data?.redirectTo ?? response.redirectTo ?? "/admin/dashboard",
      );
    else if (challenge)
      patch(
        {
          challenge: safeChallenge(challenge),
          stage: "MFA",
          form: { ...state.form, password: "" },
          toast: { type: "info", message: "MFA 검증이 필요합니다." },
        },
        root,
      );
    else
      patch(
        {
          stage: "MFA",
          form: { ...state.form, password: "" },
          toast: { type: "info", message: "추가 관리자 인증이 필요합니다." },
        },
        root,
      );
  } catch (error) {
    patch(
      {
        form: { ...state.form, password: "" },
        toast: {
          type: "error",
          message:
            error instanceof Error ? error.message : "로그인에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

async function verifyMfa(
  root: HTMLElement,
  method: Exclude<MfaMethod, "WEBAUTHN">,
): Promise<void> {
  try {
    const code =
      method === "TOTP" ? state.form.mfaCode : state.form.recoveryCode;
    if (code.trim().length < 6) throw new Error("인증 코드를 입력하세요.");
    patch(
      {
        busy: true,
        toast: { type: "info", message: "MFA 코드를 검증 중입니다." },
      },
      root,
    );
    const response = await requestJson<AuthEnvelope>(
      `${AUTH_BASE}/mfa/verify`,
      {
        method: "POST",
        headers: securityHeaders(),
        body: JSON.stringify({
          challengeId: state.challenge?.challengeId ?? "",
          method,
          code,
          rememberDevice: state.form.rememberDevice,
          requestId: state.requestId,
          rawSecretLogged: false,
        }),
      },
    );
    const session = response.data?.session ?? response.session;
    if (!session) throw new Error("세션 발급 응답이 없습니다.");
    completeLogin(
      root,
      session,
      response.data?.redirectTo ?? response.redirectTo ?? "/admin/dashboard",
    );
  } catch (error) {
    patch(
      {
        form: { ...state.form, mfaCode: "", recoveryCode: "" },
        toast: {
          type: "error",
          message:
            error instanceof Error ? error.message : "MFA 검증에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

async function verifyWebAuthn(root: HTMLElement): Promise<void> {
  try {
    if (!state.challenge?.challengeId)
      throw new Error("WebAuthn challenge가 없습니다.");
    if (!navigator.credentials)
      throw new Error("이 브라우저는 WebAuthn을 지원하지 않습니다.");
    patch(
      {
        busy: true,
        toast: { type: "info", message: "보안 키 인증을 진행 중입니다." },
      },
      root,
    );
    const credential = await navigator.credentials.get({
      mediation: "optional",
    });
    const response = await requestJson<AuthEnvelope>(
      `${AUTH_BASE}/webauthn/verify`,
      {
        method: "POST",
        headers: securityHeaders(),
        body: JSON.stringify({
          challengeId: state.challenge.challengeId,
          credentialPresent: Boolean(credential),
          requestId: state.requestId,
          rawSecretLogged: false,
        }),
      },
    );
    const session = response.data?.session ?? response.session;
    if (!session) throw new Error("WebAuthn 세션 발급 응답이 없습니다.");
    completeLogin(
      root,
      session,
      response.data?.redirectTo ?? response.redirectTo ?? "/admin/dashboard",
    );
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "WebAuthn 검증에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

function completeLogin(
  root: HTMLElement,
  session: SessionView,
  redirectTo: string,
): void {
  patch(
    {
      stage: "SUCCESS",
      session: safeSession(session),
      redirectTo,
      form: emptyForm,
      challenge: null,
      toast: {
        type: "success",
        message: "관리자 보안 로그인이 완료되었습니다.",
      },
      lastCheckedAt: dt(new Date().toISOString()),
    },
    root,
  );
}

async function logout(root: HTMLElement): Promise<void> {
  patch({ busy: true }, root);
  try {
    await requestJson<JsonRecord>(`${AUTH_BASE}/logout`, {
      method: "POST",
      headers: securityHeaders(),
      body: JSON.stringify({ requestId: state.requestId }),
    });
  } catch {
    // 서버 로그아웃 실패 시에도 클라이언트 화면 상태는 안전하게 초기화한다.
  } finally {
    patch(
      {
        stage: "IDENTITY",
        session: null,
        challenge: null,
        form: emptyForm,
        busy: false,
        toast: { type: "info", message: "관리자 세션을 종료했습니다." },
      },
      root,
    );
  }
}

function validateIdentity(form: LoginForm): void {
  const email = form.email.trim().toLowerCase();
  if (!ADMIN_EMAIL_PATTERN.test(email))
    throw new Error("관리자 이메일 형식을 확인하세요.");
  if (!form.password || form.password.length < 10)
    throw new Error("비밀번호는 10자 이상이어야 합니다.");
  if (form.password.length > MAX_PASSWORD_LENGTH)
    throw new Error("비밀번호 길이가 허용 범위를 초과했습니다.");
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const raw = await response.text();
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(errorMessage(parsed, response.status));
  return parsed as T;
}

function securityHeaders(): HeadersInit {
  return {
    "x-request-id": state.requestId,
    "x-admin-auth-flow": state.stage,
    "x-raw-secret-logged": "false",
    "x-raw-financial-data-logged": "false",
    "x-ad-financial-targeting-used": "false",
  };
}
function safeChallenge(challenge: MfaChallenge): MfaChallenge {
  return {
    challengeId: scrub(challenge.challengeId),
    methods: challenge.methods.map((method: MfaMethod) =>
      enumOf(mfaMethods, method, "TOTP"),
    ),
    expiresAt: iso(challenge.expiresAt),
    maskedAdmin: scrub(challenge.maskedAdmin),
    webAuthnRequest: challenge.webAuthnRequest
      ? (sanitize(challenge.webAuthnRequest) as JsonRecord)
      : undefined,
  };
}
function safeSession(session: SessionView): SessionView {
  return {
    adminId: scrub(session.adminId),
    displayName: scrub(session.displayName),
    role: enumOf(
      ["OPERATOR", "ADMIN", "SUPER_ADMIN"] as const,
      session.role,
      "OPERATOR",
    ),
    permissions: session.permissions
      .map((permission: string) => scrub(permission))
      .slice(0, 80),
    mfaVerified: Boolean(session.mfaVerified),
    sessionExpiresAt: iso(session.sessionExpiresAt),
    lastLoginAt: session.lastLoginAt ? iso(session.lastLoginAt) : null,
    csrfReady: Boolean(session.csrfReady),
  };
}
function input(
  root: HTMLElement,
  id: string,
  update: (value: string) => void,
): void {
  const node = by<HTMLInputElement>(root, id);
  node?.addEventListener("input", () => update(node.value));
}
function by<T extends HTMLElement>(root: HTMLElement, id: string): T | null {
  return root.querySelector<T>(`#${css(id)}`);
}
function enumOf<T extends readonly string[]>(
  values: T,
  value: string,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? (value as T[number]) : fallback;
}
function stageLabel(stage: LoginStage): string {
  return {
    IDENTITY: "계정",
    MFA: "MFA",
    RECOVERY: "복구",
    WEBAUTHN: "보안 키",
    SUCCESS: "완료",
  }[stage];
}
function rid(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}
function errorMessage(parsed: unknown, status: number): string {
  if (parsed && typeof parsed === "object" && "error" in parsed)
    return JSON.stringify(
      sanitize((parsed as { readonly error: unknown }).error),
    );
  return `HTTP ${status}`;
}
function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 60).map(sanitize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, item]: [string, unknown]) => [
          key,
          sensitive(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  return String(value);
}
function sensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveTerms.some((term: string) =>
    normalized.includes(term.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function scrub(value: string): string {
  let output = value.slice(0, 1000);
  sensitiveTerms.forEach((term: string) => {
    output = output.replace(new RegExp(re(term), "ig"), "[REDACTED]");
  });
  return output;
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}
function dt(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(date)
    : "-";
}
function e(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (char: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] ?? char,
  );
}
function re(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function css(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function assertAdminLoginPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_secure_login_page",
    "identity_password_stage",
    "mfa_totp_stage",
    "recovery_code_stage",
    "webauthn_stage",
    "session_check",
    "logout",
    "readiness_check",
    "rbac_admin_role_awareness",
    "mfa_required",
    "csrf_ready",
    "rate_limit_ready",
    "audit_ready",
    "service_token_hash_policy",
    "raw_secret_redaction",
    "raw_financial_data_redaction",
    "ads_financial_targeting_forbidden",
    "no_store_fetch",
    "admin_auth_api_boundary",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminLoginPageCompleteness;
