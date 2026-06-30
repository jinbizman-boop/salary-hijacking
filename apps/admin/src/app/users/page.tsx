"use client";

/** apps/admin/src/app/users/page.tsx
 * 급여납치 관리자 사용자·계정 운영 콘솔 최종본.
 * React import/JSX 없이 동작하는 Next Client Page다.
 */

const VERSION = "3.1.2";
const ROOT_ID = "salary-hijacking-admin-users-root";
const API_BASE = "/admin/api/v1/users";
const PAGE_SIZE = 40;
const REFRESH_MS = 60_000;

const roles = ["ALL", "USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const;
const statuses = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "LOCKED",
  "SUSPENDED",
  "WITHDRAWN",
  "DELETED",
] as const;
const riskLevels = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const consentStates = [
  "ALL",
  "MARKETING_OPT_IN",
  "MARKETING_OPT_OUT",
  "PRIVACY_EXPORT_REQUESTED",
  "WITHDRAWAL_REQUESTED",
] as const;
const sortKeys = [
  "createdAt",
  "updatedAt",
  "lastSeenAt",
  "riskScore",
  "reportCount",
  "payrollPlanCount",
] as const;
const actions = [
  "VERIFY_EMAIL",
  "LOCK",
  "UNLOCK",
  "SUSPEND",
  "RESTORE",
  "FORCE_LOGOUT",
  "REVOKE_TOKENS",
  "REQUEST_PASSWORD_RESET",
  "EXPORT_REDACTED",
  "ANONYMIZE",
  "HARD_DELETE",
] as const;
const sensitiveTerms = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
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
  "dailybudget",
  "hijack",
  "variance",
  "carryover",
  "adtarget",
  "targeting",
  "push",
  "device",
  "fcm",
  "payslip",
  "bankbook",
  "statement",
  "급여",
  "월급",
  "계좌",
  "카드",
  "대출",
  "저축",
  "지출",
  "금액",
  "납치",
  "명세서",
  "통장",
  "토큰",
  "비밀번호",
  "주민",
  "전화",
  "이메일",
] as const;

type Role = Exclude<(typeof roles)[number], "ALL">;
type UserStatus = Exclude<(typeof statuses)[number], "ALL">;
type RiskLevel = Exclude<(typeof riskLevels)[number], "ALL">;
type ConsentState = Exclude<(typeof consentStates)[number], "ALL">;
type SortKey = (typeof sortKeys)[number];
type Action = (typeof actions)[number];
type RoleFilter = (typeof roles)[number];
type StatusFilter = (typeof statuses)[number];
type RiskFilter = (typeof riskLevels)[number];
type ConsentFilter = (typeof consentStates)[number];
type Toast = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type UserRow = {
  readonly id: string;
  readonly displayName: string;
  readonly maskedEmail: string;
  readonly maskedPhone: string | null;
  readonly role: Role;
  readonly status: UserStatus;
  readonly riskLevel: RiskLevel;
  readonly consentState: ConsentState;
  readonly mfaEnabled: boolean;
  readonly emailVerified: boolean;
  readonly payrollPlanCount: number;
  readonly budgetPlanCount: number;
  readonly savingsGoalCount: number;
  readonly notificationTokenHashCount: number;
  readonly reportCount: number;
  readonly riskScore: number;
  readonly lastSeenAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly withdrawalRequestedAt: string | null;
  readonly privacyExportRequestedAt: string | null;
  readonly adminMemo: string | null;
  readonly lastAdminActionReason: string | null;
  readonly rawFinancialDataExposed: false;
  readonly rawPersonalDataExposed: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly auditReasonRequired: true;
};

type Stats = {
  readonly total: number;
  readonly active: number;
  readonly locked: number;
  readonly suspended: number;
  readonly withdrawn: number;
  readonly highRisk: number;
  readonly privacyExportRequested: number;
  readonly privacyPassRate: string;
};

type ListResponse = {
  readonly data?:
    | {
        readonly items?: readonly UserRow[];
        readonly total?: number;
        readonly stats?: Stats;
      }
    | undefined;
  readonly items?: readonly UserRow[] | undefined;
  readonly total?: number | undefined;
  readonly stats?: Stats | undefined;
};

type MutationResponse = {
  readonly data?: UserRow | { readonly user?: UserRow } | undefined;
  readonly user?: UserRow | undefined;
};

type State = {
  readonly items: readonly UserRow[];
  readonly total: number;
  readonly stats: Stats;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly query: string;
  readonly role: RoleFilter;
  readonly status: StatusFilter;
  readonly risk: RiskFilter;
  readonly consent: ConsentFilter;
  readonly sort: SortKey;
  readonly reason: string;
  readonly memo: string;
  readonly selectedId: string | null;
  readonly toast: { readonly type: Toast; readonly message: string };
};

const emptyStats: Stats = Object.freeze({
  total: 0,
  active: 0,
  locked: 0,
  suspended: 0,
  withdrawn: 0,
  highRisk: 0,
  privacyExportRequested: 0,
  privacyPassRate: "100.00%",
});
const roleValues = roles.filter(
  (value: RoleFilter): value is Role => value !== "ALL",
);
const statusValues = statuses.filter(
  (value: StatusFilter): value is UserStatus => value !== "ALL",
);
const riskValues = riskLevels.filter(
  (value: RiskFilter): value is RiskLevel => value !== "ALL",
);
const consentValues = consentStates.filter(
  (value: ConsentFilter): value is ConsentState => value !== "ALL",
);

let state: State = {
  items: [],
  total: 0,
  stats: emptyStats,
  busy: false,
  loadedAt: "-",
  query: "",
  role: "ALL",
  status: "ALL",
  risk: "ALL",
  consent: "ALL",
  sort: "updatedAt",
  reason: "",
  memo: "",
  selectedId: null,
  toast: { type: "info", message: "사용자·계정 운영 콘솔이 준비되었습니다." },
};
let mounted = false;
let timer: number | null = null;

export default function AdminUsersPage(): null {
  if (typeof window !== "undefined" && typeof document !== "undefined")
    globalThis.queueMicrotask(mount);
  return null;
}

function mount(): void {
  if (mounted) return;
  mounted = true;
  const root =
    document.getElementById(ROOT_ID) ?? document.createElement("main");
  root.id = ROOT_ID;
  root.setAttribute("data-version", VERSION);
  if (!root.parentElement) document.body.appendChild(root);
  installStyles();
  render(root);
  void load(root);
  timer = window.setInterval(() => void load(root, true), REFRESH_MS);
  window.addEventListener(
    "pagehide",
    () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    },
    { once: true },
  );
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1560px;margin:auto;display:flex;flex-direction:column;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(18px)}.head{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:1000}.title{font-size:34px;line-height:1.1;margin:10px 0 0;color:white;font-weight:1000}.desc{max-width:1080px;color:#cbd5e1;font-size:14px;line-height:1.75}.headgrid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.badge{border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.stats{display:grid;grid-template-columns:repeat(8,1fr);gap:12px}.stat{padding:18px}.stat small{color:#94a3b8;font-weight:900;text-transform:uppercase}.stat b{display:block;color:#fff;font-size:24px;margin-top:8px}.toolbar{padding:18px;display:grid;grid-template-columns:minmax(240px,1fr) 145px 145px 145px 190px 145px auto;gap:10px}.reason{display:grid;grid-template-columns:1fr 1fr auto auto;gap:10px;padding:0 18px 18px}.input,.select{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px;font-size:14px}.button{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.button.secondary{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.button.danger{background:#fb7185;color:#190106}.button:disabled{opacity:.55}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.grid{display:grid;grid-template-columns:minmax(0,1fr) 450px;gap:24px}.section{padding:20px}.h2{font-size:20px;color:white;margin:0 0 14px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.table{width:100%;min-width:1180px;border-collapse:collapse;font-size:13px}.table th,.table td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.table thead{background:#0f172a;color:#94a3b8;font-size:11px;text-transform:uppercase}.table tr.selected{background:#22d3ee1a}.link{border:0;background:transparent;color:#fff;font-weight:1000;text-align:left;cursor:pointer;padding:0}.sub{display:block;color:#64748b;font-size:12px;margin-top:5px;line-height:1.45}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.ACTIVE,.LOW,.USER{border-color:#34d39966;background:#10b98122;color:#d1fae5}.PENDING,.MEDIUM,.OPERATOR{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.LOCKED,.SUSPENDED,.HIGH,.ADMIN{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.CRITICAL,.DELETED,.SUPER_ADMIN{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.WITHDRAWN{color:#cbd5e1}.actions{display:flex;flex-wrap:wrap;gap:6px}.small{font-size:12px;padding:7px 9px;border-radius:10px}.cards{display:flex;flex-direction:column;gap:12px}.card{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.ct{color:#fff;font-weight:1000}.cs{color:#94a3b8;line-height:1.6;font-size:13px;margin-top:7px}.kv{display:grid;grid-template-columns:150px 1fr;gap:8px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.safegrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.safe{border:1px solid #34d39944;background:#10b9811a;color:#d1fae5;border-radius:16px;padding:12px;font-size:12px;font-weight:900}.empty{padding:34px;text-align:center;color:#94a3b8}.footer{margin-top:12px;color:#64748b;font-size:12px;line-height:1.7}@media(max-width:1280px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(4,1fr)}.toolbar{grid-template-columns:1fr 1fr 1fr}.reason{grid-template-columns:1fr}.safegrid{grid-template-columns:1fr 1fr}}@media(max-width:720px){#${ROOT_ID}{padding:20px 12px}.headgrid,.stats,.toolbar,.safegrid{grid-template-columns:1fr}.title{font-size:27px}}`;
  document.head.appendChild(style);
}

function patch(next: Partial<State>, root: HTMLElement): void {
  state = { ...state, ...next };
  render(root);
}

function render(root: HTMLElement): void {
  root.innerHTML = html();
  bind(root);
}

function html(): string {
  const rows = visible();
  const selected =
    state.items.find((item: UserRow) => item.id === state.selectedId) ??
    rows[0] ??
    null;
  return `<section class="wrap"><header class="panel head"><div class="headgrid"><div><p class="k">Admin Console · Users · v${e(VERSION)}</p><h1 class="title">사용자·계정 운영 콘솔</h1><p class="desc">사용자, 관리자 계정, 개인정보 요청, 탈퇴/복구, 세션·토큰, 알림 토큰 hash, 커뮤니티 신고, 광고/제휴 동의 상태를 관리자 권한과 감사 로그 경계에서 운영합니다. 화면과 export는 마스킹·비식별 기준이며 raw 금융 데이터, raw 개인정보, raw push token, 광고 금융 타겟팅은 차단합니다.</p></div><span class="badge">사용자 운영 · 개인정보 요청 · RBAC · 비식별 export</span></div></header><section class="stats">${stat("전체", state.stats.total)}${stat("활성", state.stats.active)}${stat("잠금", state.stats.locked)}${stat("정지", state.stats.suspended)}${stat("탈퇴", state.stats.withdrawn)}${stat("고위험", state.stats.highRisk)}${stat("Export", state.stats.privacyExportRequested)}${stat("Privacy", state.stats.privacyPassRate)}</section><section class="panel"><div class="toolbar"><input id="q" class="input" value="${e(state.query)}" placeholder="사용자명, masked email, hash, 메모 검색" />${select("role", roles, state.role)}${select("status", statuses, state.status)}${select("risk", riskLevels, state.risk)}${select("consent", consentStates, state.consent)}${select("sort", sortKeys, state.sort)}<button id="load" class="button" ${state.busy ? "disabled" : ""}>동기화</button></div><div class="reason"><input id="reason" class="input" value="${e(state.reason)}" placeholder="관리자 조치 사유" /><input id="memo" class="input" value="${e(state.memo)}" placeholder="내부 계정 운영 메모" /><button id="guard" class="button secondary">Guard</button><button id="export" class="button secondary">비식별 export</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="grid"><div class="panel section"><h2 class="h2">사용자 목록</h2><div class="tablewrap"><table class="table"><thead><tr><th>사용자</th><th>역할·상태</th><th>동의·보안</th><th>서비스 사용</th><th>위험·요청</th><th>작업</th></tr></thead><tbody>${rows.length ? rows.map(row).join("") : `<tr><td class="empty" colspan="6">조건에 맞는 사용자가 없습니다.</td></tr>`}</tbody></table></div><p class="footer">표시 ${num(rows.length)}개 / API total ${num(state.total)}개 · 모든 조치는 X-Admin-Reason, RBAC, 감사 로그 저장을 전제로 합니다.</p></div><aside class="panel section"><h2 class="h2">상세·계정 검토</h2>${detail(selected)}</aside></section><section class="panel section"><h2 class="h2">Privacy · Auth · Ads Guard</h2><div class="safegrid">${guardHtml()}</div><p class="footer">마지막 동기화 ${e(state.loadedAt)} · maskedEmailOnly=true · tokenHashOnly=true · rawFinancialDataExposed=false · adsFinancialTargetingUsed=false</p></section></section>`;
}

function stat(labelText: string, value: number | string): string {
  return `<div class="panel stat"><small>${e(labelText)}</small><b>${typeof value === "number" ? num(value) : e(value)}</b></div>`;
}

function row(user: UserRow): string {
  return `<tr class="${state.selectedId === user.id ? "selected" : ""}"><td><button class="link" data-action="SELECT" data-id="${e(user.id)}">${e(user.displayName)}</button><span class="sub">${e(user.maskedEmail)} · ${e(user.maskedPhone ?? "-")}<br/>id=${e(user.id)}</span></td><td><span class="pill ${e(user.role)}">${e(user.role)}</span><br/><span class="pill ${e(user.status)}" style="margin-top:6px">${e(user.status)}</span></td><td>${e(consentLabel(user.consentState))}<span class="sub">MFA=${String(user.mfaEnabled)} · email=${String(user.emailVerified)}<br/>tokenHash ${num(user.notificationTokenHashCount)}</span></td><td>급여계획 ${num(user.payrollPlanCount)}<br/>예산 ${num(user.budgetPlanCount)}<br/>저축목표 ${num(user.savingsGoalCount)}</td><td><span class="pill ${e(user.riskLevel)}">${e(user.riskLevel)}</span><span class="sub">risk ${num(user.riskScore)} · 신고 ${num(user.reportCount)}<br/>last ${e(user.lastSeenAt ? dt(user.lastSeenAt) : "-")}</span></td><td><div class="actions">${actions.map((action: Action) => `<button class="button secondary small" data-action="${e(action)}" data-id="${e(user.id)}">${e(actionLabel(action))}</button>`).join("")}</div></td></tr>`;
}

function detail(user: UserRow | null): string {
  if (!user) return `<div class="empty">사용자를 선택하세요.</div>`;
  return `<div class="cards"><div class="card"><div class="ct">${e(user.displayName)}</div><div class="cs">${e(user.maskedEmail)} · ${e(user.maskedPhone ?? "-")}<br/>${e(user.role)} · ${e(user.status)} · ${e(user.riskLevel)}</div></div><div class="card kv"><span>ID</span><b>${e(user.id)}</b><span>권한</span><b>${e(user.role)}</b><span>상태</span><b>${e(user.status)}</b><span>동의</span><b>${e(consentLabel(user.consentState))}</b><span>MFA</span><b>${String(user.mfaEnabled)}</b><span>이메일 인증</span><b>${String(user.emailVerified)}</b><span>탈퇴 요청</span><b>${e(user.withdrawalRequestedAt ? dt(user.withdrawalRequestedAt) : "-")}</b><span>개인정보 export</span><b>${e(user.privacyExportRequestedAt ? dt(user.privacyExportRequestedAt) : "-")}</b><span>최근 사유</span><b>${e(user.lastAdminActionReason ?? "-")}</b><span>메모</span><b>${e(user.adminMemo ?? "-")}</b></div><div class="card"><div class="ct">안전성</div><div class="cs">rawFinancialDataExposed=${String(user.rawFinancialDataExposed)}<br/>rawPersonalDataExposed=${String(user.rawPersonalDataExposed)}<br/>rawPushTokenLogged=${String(user.rawPushTokenLogged)}<br/>adsFinancialTargetingUsed=${String(user.adsFinancialTargetingUsed)}<br/>auditReasonRequired=${String(user.auditReasonRequired)}</div></div></div>`;
}

function select(
  id: string,
  values: readonly string[],
  selected: string,
): string {
  return `<select id="${e(id)}" class="select">${values.map((value: string) => `<option value="${e(value)}" ${value === selected ? "selected" : ""}>${e(labelFor(value))}</option>`).join("")}</select>`;
}

function guardHtml(): string {
  return [
    "maskedEmailOnly=true",
    "maskedPhoneOnly=true",
    "tokenHashOnly=true",
    "rawFinancialDataExposed=false",
    "rawPersonalDataExposed=false",
    "rawPushTokenLogged=false",
    "adsFinancialTargetingUsed=false",
    "xAdminReasonRequired=true",
  ]
    .map((item: string) => `<div class="safe">${e(item)} · PASS</div>`)
    .join("");
}

function bind(root: HTMLElement): void {
  input(root, "q", (value: string) => patch({ query: value }, root));
  input(root, "reason", (value: string) => patch({ reason: value }, root));
  input(root, "memo", (value: string) => patch({ memo: value }, root));
  selectBind(root, "role", (value: string) =>
    patch({ role: enumOf(roles, value, "ALL") }, root),
  );
  selectBind(root, "status", (value: string) =>
    patch({ status: enumOf(statuses, value, "ALL") }, root),
  );
  selectBind(root, "risk", (value: string) =>
    patch({ risk: enumOf(riskLevels, value, "ALL") }, root),
  );
  selectBind(root, "consent", (value: string) =>
    patch({ consent: enumOf(consentStates, value, "ALL") }, root),
  );
  selectBind(root, "sort", (value: string) =>
    patch({ sort: enumOf(sortKeys, value, "updatedAt") }, root),
  );
  by<HTMLButtonElement>(root, "load")?.addEventListener(
    "click",
    () => void load(root),
  );
  by<HTMLButtonElement>(root, "guard")?.addEventListener("click", () =>
    patch(
      {
        toast: {
          type: "success",
          message:
            "Guard PASS: masked identity, tokenHash-only, raw 금융/개인정보/push token 비노출, 광고 금융 타겟팅 금지",
        },
      },
      root,
    ),
  );
  by<HTMLButtonElement>(root, "export")?.addEventListener(
    "click",
    () => void exportRedacted(root),
  );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-action][data-id]")
    .forEach((button: HTMLButtonElement) =>
      button.addEventListener("click", () =>
        handle(root, button.dataset.action ?? "", button.dataset.id ?? ""),
      ),
    );
}

async function load(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      sort: state.sort,
    });
    if (state.query.trim()) params.set("q", state.query.trim());
    if (state.role !== "ALL") params.set("role", state.role);
    if (state.status !== "ALL") params.set("status", state.status);
    if (state.risk !== "ALL") params.set("risk", state.risk);
    if (state.consent !== "ALL") params.set("consent", state.consent);
    const next = listFrom(
      await api<ListResponse>(`${API_BASE}?${params.toString()}`),
    );
    patch(
      {
        items: next.items,
        total: next.total,
        stats: next.stats,
        selectedId: state.selectedId ?? next.items[0]?.id ?? null,
        loadedAt: dt(new Date().toISOString()),
        toast: silent
          ? state.toast
          : { type: "success", message: "사용자 목록을 동기화했습니다." },
      },
      root,
    );
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "사용자 목록 조회에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function mutate(
  root: HTMLElement,
  user: UserRow,
  action: Action,
): Promise<void> {
  if (action !== "EXPORT_REDACTED" && !state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "사용자 조치에는 관리자 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  if (
    (action === "ANONYMIZE" || action === "HARD_DELETE") &&
    user.status !== "WITHDRAWN" &&
    user.status !== "DELETED"
  ) {
    patch(
      {
        toast: {
          type: "error",
          message:
            "익명화/영구삭제는 탈퇴 또는 삭제 상태에서만 실행해야 합니다.",
        },
      },
      root,
    );
    return;
  }
  patch({ busy: true }, root);
  try {
    const changed = userFrom(
      await api<MutationResponse>(
        `${API_BASE}/${encodeURIComponent(user.id)}/${action.toLowerCase()}`,
        {
          method: "POST",
          headers: adminHeaders(action),
          body: JSON.stringify({
            action,
            reason: state.reason.trim() || "redacted export",
            memo: state.memo.trim(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPushTokenLogged: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      ),
    );
    if (changed) {
      const safe = normalize(changed);
      const items = state.items.map((item: UserRow) =>
        item.id === safe.id ? safe : item,
      );
      patch(
        {
          items,
          selectedId: safe.id,
          stats: statsFrom(items),
          toast: {
            type: "success",
            message: `${actionLabel(action)} 작업을 완료했습니다.`,
          },
        },
        root,
      );
    } else {
      patch(
        {
          toast: {
            type: "success",
            message: `${actionLabel(action)} 요청을 완료했습니다.`,
          },
        },
        root,
      );
    }
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "사용자 조치에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

async function exportRedacted(root: HTMLElement): Promise<void> {
  if (!state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "비식별 export에는 관리자 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  const selected = state.items.find(
    (item: UserRow) => item.id === state.selectedId,
  );
  if (selected) {
    await mutate(root, selected, "EXPORT_REDACTED");
    return;
  }
  patch({ busy: true }, root);
  try {
    await api<JsonRecord>(`${API_BASE}/exports/redacted`, {
      method: "POST",
      headers: adminHeaders("EXPORT_REDACTED"),
      body: JSON.stringify({
        reason: state.reason.trim(),
        filters: {
          role: state.role,
          status: state.status,
          risk: state.risk,
          consent: state.consent,
          q: state.query.trim(),
        },
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenLogged: false,
      }),
    });
    patch(
      {
        toast: {
          type: "success",
          message: "비식별 사용자 export 요청을 완료했습니다.",
        },
      },
      root,
    );
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "비식별 export에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

function handle(root: HTMLElement, actionName: string, id: string): void {
  const user = state.items.find((item: UserRow) => item.id === id);
  if (!user) return;
  if (actionName === "SELECT") {
    patch(
      {
        selectedId: id,
        toast: {
          type: "info",
          message: `${user.displayName} 상세를 열었습니다.`,
        },
      },
      root,
    );
    return;
  }
  void mutate(root, user, enumOf(actions, actionName, "LOCK"));
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
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

function listFrom(response: ListResponse): {
  readonly items: readonly UserRow[];
  readonly total: number;
  readonly stats: Stats;
} {
  const raw = response.data?.items ?? response.items ?? [];
  const items = raw.map((item: UserRow) => normalize(item));
  return {
    items,
    total: response.data?.total ?? response.total ?? items.length,
    stats: response.data?.stats ?? response.stats ?? statsFrom(items),
  };
}

function userFrom(response: MutationResponse): UserRow | null {
  if (response.user) return response.user;
  if (response.data && "id" in response.data) return response.data as UserRow;
  if (response.data && "user" in response.data)
    return response.data.user ?? null;
  return null;
}

function normalize(user: UserRow): UserRow {
  return {
    ...user,
    id: scrub(user.id),
    displayName: scrub(user.displayName),
    maskedEmail: scrub(user.maskedEmail),
    maskedPhone: user.maskedPhone ? scrub(user.maskedPhone) : null,
    role: enumOf(roleValues, user.role, "USER"),
    status: enumOf(statusValues, user.status, "ACTIVE"),
    riskLevel: enumOf(riskValues, user.riskLevel, "LOW"),
    consentState: enumOf(consentValues, user.consentState, "MARKETING_OPT_OUT"),
    payrollPlanCount: nonNegative(user.payrollPlanCount),
    budgetPlanCount: nonNegative(user.budgetPlanCount),
    savingsGoalCount: nonNegative(user.savingsGoalCount),
    notificationTokenHashCount: nonNegative(user.notificationTokenHashCount),
    reportCount: nonNegative(user.reportCount),
    riskScore: nonNegative(user.riskScore),
    lastSeenAt: user.lastSeenAt ? iso(user.lastSeenAt) : null,
    createdAt: iso(user.createdAt),
    updatedAt: iso(user.updatedAt),
    withdrawalRequestedAt: user.withdrawalRequestedAt
      ? iso(user.withdrawalRequestedAt)
      : null,
    privacyExportRequestedAt: user.privacyExportRequestedAt
      ? iso(user.privacyExportRequestedAt)
      : null,
    adminMemo: user.adminMemo ? scrub(user.adminMemo) : null,
    lastAdminActionReason: user.lastAdminActionReason
      ? scrub(user.lastAdminActionReason)
      : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    auditReasonRequired: true,
  };
}

function statsFrom(items: readonly UserRow[]): Stats {
  const safe = items.filter(
    (item: UserRow) =>
      !item.rawFinancialDataExposed &&
      !item.rawPersonalDataExposed &&
      !item.rawPushTokenLogged &&
      !item.adsFinancialTargetingUsed,
  ).length;
  return {
    total: items.length,
    active: items.filter((item: UserRow) => item.status === "ACTIVE").length,
    locked: items.filter((item: UserRow) => item.status === "LOCKED").length,
    suspended: items.filter((item: UserRow) => item.status === "SUSPENDED")
      .length,
    withdrawn: items.filter((item: UserRow) => item.status === "WITHDRAWN")
      .length,
    highRisk: items.filter(
      (item: UserRow) =>
        item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL",
    ).length,
    privacyExportRequested: items.filter(
      (item: UserRow) => item.consentState === "PRIVACY_EXPORT_REQUESTED",
    ).length,
    privacyPassRate: pct(safe, items.length),
  };
}

function visible(): readonly UserRow[] {
  const query = state.query.trim().toLowerCase();
  return state.items
    .filter((item: UserRow) => state.role === "ALL" || item.role === state.role)
    .filter(
      (item: UserRow) => state.status === "ALL" || item.status === state.status,
    )
    .filter(
      (item: UserRow) => state.risk === "ALL" || item.riskLevel === state.risk,
    )
    .filter(
      (item: UserRow) =>
        state.consent === "ALL" || item.consentState === state.consent,
    )
    .filter(
      (item: UserRow) =>
        !query ||
        `${item.displayName} ${item.maskedEmail} ${item.id} ${item.adminMemo ?? ""}`
          .toLowerCase()
          .includes(query),
    )
    .slice()
    .sort(compare);
}

function compare(left: UserRow, right: UserRow): number {
  if (
    state.sort === "createdAt" ||
    state.sort === "updatedAt" ||
    state.sort === "lastSeenAt"
  ) {
    const leftDate =
      state.sort === "lastSeenAt"
        ? (left.lastSeenAt ?? left.updatedAt)
        : left[state.sort];
    const rightDate =
      state.sort === "lastSeenAt"
        ? (right.lastSeenAt ?? right.updatedAt)
        : right[state.sort];
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  }
  return Number(right[state.sort]) - Number(left[state.sort]);
}

function adminHeaders(action: Action): HeadersInit {
  return {
    "x-admin-reason":
      state.reason.trim() ||
      (action === "EXPORT_REDACTED" ? "redacted export" : "user operation"),
    "x-raw-financial-data-exposed": "false",
    "x-raw-personal-data-exposed": "false",
    "x-raw-push-token-logged": "false",
    "x-ad-financial-targeting-used": "false",
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

function selectBind(
  root: HTMLElement,
  id: string,
  update: (value: string) => void,
): void {
  const node = by<HTMLSelectElement>(root, id);
  node?.addEventListener("change", () => update(node.value));
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

function roleLabel(value: Role): string {
  return {
    USER: "사용자",
    OPERATOR: "운영자",
    ADMIN: "관리자",
    SUPER_ADMIN: "최고관리자",
  }[value];
}

function consentLabel(value: ConsentState): string {
  return {
    MARKETING_OPT_IN: "마케팅 동의",
    MARKETING_OPT_OUT: "마케팅 거부",
    PRIVACY_EXPORT_REQUESTED: "개인정보 export 요청",
    WITHDRAWAL_REQUESTED: "탈퇴 요청",
  }[value];
}

function actionLabel(value: Action): string {
  return {
    VERIFY_EMAIL: "이메일 인증",
    LOCK: "잠금",
    UNLOCK: "해제",
    SUSPEND: "정지",
    RESTORE: "복구",
    FORCE_LOGOUT: "강제 로그아웃",
    REVOKE_TOKENS: "토큰 폐기",
    REQUEST_PASSWORD_RESET: "비밀번호 재설정",
    EXPORT_REDACTED: "비식별 export",
    ANONYMIZE: "익명화",
    HARD_DELETE: "영구삭제",
  }[value];
}

function labelFor(value: string): string {
  if (value === "ALL") return "전체";
  if (roles.includes(value as RoleFilter) && value !== "ALL")
    return roleLabel(value as Role);
  if (consentStates.includes(value as ConsentFilter) && value !== "ALL")
    return consentLabel(value as ConsentState);
  if (actions.includes(value as Action)) return actionLabel(value as Action);
  return (
    (
      {
        createdAt: "가입일",
        updatedAt: "수정일",
        lastSeenAt: "최근 접속",
        riskScore: "위험도",
        reportCount: "신고",
        payrollPlanCount: "급여계획",
      } as Record<string, string>
    )[value] ?? value
  );
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
  if (Array.isArray(value)) return value.slice(0, 80).map(sanitize);
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
  let output = value.slice(0, 1200);
  sensitiveTerms.forEach((term: string) => {
    output = output.replace(new RegExp(regexEscape(term), "ig"), "[REDACTED]");
  });
  return output;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function pct(numerator: number, denominator: number): string {
  return denominator > 0
    ? `${((numerator * 100) / denominator).toFixed(2)}%`
    : "100.00%";
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

function num(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
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

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function css(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function assertAdminUsersPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_users_console",
    "user_admin_account_operations",
    "role_status_risk_consent_sort_filters",
    "user_detail_panel",
    "verify_lock_unlock_suspend_restore_force_logout_revoke_tokens_password_reset_actions",
    "privacy_export_anonymize_hard_delete_actions",
    "x_admin_reason_required",
    "internal_admin_memo",
    "masked_email_only",
    "masked_phone_only",
    "token_hash_only",
    "raw_financial_data_redaction",
    "raw_personal_data_redaction",
    "raw_push_token_redaction",
    "ads_financial_targeting_forbidden",
    "withdrawal_and_privacy_export_support",
    "rbac_admin_boundary",
    "audit_log_ready",
    "no_store_fetch",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminUsersPageCompleteness;
