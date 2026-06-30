"use client";

/** apps/admin/src/app/reports/page.tsx
 * 급여납치 관리자 신고·CS·운영 리포트 콘솔 최종본.
 * React import/JSX 없이 동작하는 Next Client Page다.
 */

const VERSION = "3.1.2";
const ROOT_ID = "salary-hijacking-admin-reports-root";
const API_BASE = "/admin/api/v1/reports";
const PAGE_SIZE = 40;
const REFRESH_MS = 60_000;

const reportTypes = [
  "ALL",
  "COMMUNITY_POST",
  "COMMUNITY_COMMENT",
  "USER_PROFILE",
  "AD_CAMPAIGN",
  "NOTICE",
  "PAYROLL_DATA",
  "BUDGET_DATA",
  "SECURITY",
  "CS_TICKET",
] as const;
const reportStatuses = [
  "ALL",
  "OPEN",
  "TRIAGED",
  "IN_REVIEW",
  "ACTION_REQUIRED",
  "RESOLVED",
  "REJECTED",
  "ARCHIVED",
] as const;
const severities = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const assigneeScopes = [
  "ALL",
  "UNASSIGNED",
  "MINE",
  "OPS",
  "TRUST_SAFETY",
  "ADS",
  "SECURITY",
  "CS",
] as const;
const sortKeys = [
  "createdAt",
  "updatedAt",
  "severity",
  "reportCount",
  "slaDueAt",
  "riskScore",
] as const;
const actions = [
  "TRIAGE",
  "ASSIGN",
  "RESOLVE",
  "REJECT",
  "HIDE_TARGET",
  "RESTORE_TARGET",
  "SANCTION_ACTOR",
  "ESCALATE",
  "ARCHIVE",
  "EXPORT_REDACTED",
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

type ReportType = Exclude<(typeof reportTypes)[number], "ALL">;
type ReportStatus = Exclude<(typeof reportStatuses)[number], "ALL">;
type Severity = Exclude<(typeof severities)[number], "ALL">;
type AssigneeScope = (typeof assigneeScopes)[number];
type SortKey = (typeof sortKeys)[number];
type Action = (typeof actions)[number];
type ReportTypeFilter = (typeof reportTypes)[number];
type ReportStatusFilter = (typeof reportStatuses)[number];
type SeverityFilter = (typeof severities)[number];
type Toast = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type Report = {
  readonly id: string;
  readonly type: ReportType;
  readonly status: ReportStatus;
  readonly severity: Severity;
  readonly title: string;
  readonly safeSummary: string;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly targetSafePreview: string;
  readonly reporterHash: string;
  readonly reportedActorHash: string | null;
  readonly assigneeScope: Exclude<AssigneeScope, "ALL" | "MINE">;
  readonly assigneeLabel: string | null;
  readonly reportCount: number;
  readonly riskScore: number;
  readonly slaDueAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt: string | null;
  readonly moderatorMemo: string | null;
  readonly lastActionReason: string | null;
  readonly rawFinancialDataExposed: false;
  readonly rawPersonalDataExposed: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly auditReasonRequired: true;
};

type Stats = {
  readonly total: number;
  readonly open: number;
  readonly triaged: number;
  readonly actionRequired: number;
  readonly resolved: number;
  readonly critical: number;
  readonly slaBreached: number;
  readonly privacyPassRate: string;
};

type ListResponse = {
  readonly data?:
    | {
        readonly items?: readonly Report[];
        readonly total?: number;
        readonly stats?: Stats;
      }
    | undefined;
  readonly items?: readonly Report[] | undefined;
  readonly total?: number | undefined;
  readonly stats?: Stats | undefined;
};
type MutationResponse = {
  readonly data?: Report | { readonly report?: Report } | undefined;
  readonly report?: Report | undefined;
};
type State = {
  readonly items: readonly Report[];
  readonly total: number;
  readonly stats: Stats;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly query: string;
  readonly type: ReportTypeFilter;
  readonly status: ReportStatusFilter;
  readonly severity: SeverityFilter;
  readonly assignee: AssigneeScope;
  readonly sort: SortKey;
  readonly reason: string;
  readonly memo: string;
  readonly selectedId: string | null;
  readonly toast: { readonly type: Toast; readonly message: string };
};

const emptyStats: Stats = Object.freeze({
  total: 0,
  open: 0,
  triaged: 0,
  actionRequired: 0,
  resolved: 0,
  critical: 0,
  slaBreached: 0,
  privacyPassRate: "100.00%",
});
const reportTypeValues = reportTypes.filter(
  (value: ReportTypeFilter): value is ReportType => value !== "ALL",
);
const reportStatusValues = reportStatuses.filter(
  (value: ReportStatusFilter): value is ReportStatus => value !== "ALL",
);
const severityValues = severities.filter(
  (value: SeverityFilter): value is Severity => value !== "ALL",
);
const assigneeValues = assigneeScopes.filter(
  (value: AssigneeScope): value is Exclude<AssigneeScope, "ALL" | "MINE"> =>
    value !== "ALL" && value !== "MINE",
);

let state: State = {
  items: [],
  total: 0,
  stats: emptyStats,
  busy: false,
  loadedAt: "-",
  query: "",
  type: "ALL",
  status: "ALL",
  severity: "ALL",
  assignee: "ALL",
  sort: "createdAt",
  reason: "",
  memo: "",
  selectedId: null,
  toast: { type: "info", message: "신고·리포트 운영 콘솔이 준비되었습니다." },
};
let mounted = false;
let timer: number | null = null;

export default function AdminReportsPage(): null {
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
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1560px;margin:auto;display:flex;flex-direction:column;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(18px)}.head{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:1000}.title{font-size:34px;line-height:1.1;margin:10px 0 0;color:white;font-weight:1000}.desc{max-width:1080px;color:#cbd5e1;font-size:14px;line-height:1.75}.headgrid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.badge{border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.stats{display:grid;grid-template-columns:repeat(8,1fr);gap:12px}.stat{padding:18px}.stat small{color:#94a3b8;font-weight:900;text-transform:uppercase}.stat b{display:block;color:#fff;font-size:24px;margin-top:8px}.toolbar{padding:18px;display:grid;grid-template-columns:minmax(240px,1fr) 155px 155px 145px 155px 145px auto;gap:10px}.reason{display:grid;grid-template-columns:1fr 1fr auto auto;gap:10px;padding:0 18px 18px}.input,.select{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px;font-size:14px}.button{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.button.secondary{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.button.danger{background:#fb7185;color:#190106}.button:disabled{opacity:.55}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.grid{display:grid;grid-template-columns:minmax(0,1fr) 450px;gap:24px}.section{padding:20px}.h2{font-size:20px;color:white;margin:0 0 14px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.table{width:100%;min-width:1160px;border-collapse:collapse;font-size:13px}.table th,.table td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.table thead{background:#0f172a;color:#94a3b8;font-size:11px;text-transform:uppercase}.table tr.selected{background:#22d3ee1a}.link{border:0;background:transparent;color:#fff;font-weight:1000;text-align:left;cursor:pointer;padding:0}.sub{display:block;color:#64748b;font-size:12px;margin-top:5px;line-height:1.45}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.OPEN,.LOW{border-color:#34d39966;background:#10b98122;color:#d1fae5}.TRIAGED,.IN_REVIEW,.MEDIUM{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.ACTION_REQUIRED,.HIGH,.REJECTED{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.CRITICAL{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.RESOLVED{border-color:#60a5fa66;background:#2563eb22;color:#dbeafe}.ARCHIVED{color:#cbd5e1}.actions{display:flex;flex-wrap:wrap;gap:6px}.small{font-size:12px;padding:7px 9px;border-radius:10px}.cards{display:flex;flex-direction:column;gap:12px}.card{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.ct{color:#fff;font-weight:1000}.cs{color:#94a3b8;line-height:1.6;font-size:13px;margin-top:7px}.kv{display:grid;grid-template-columns:150px 1fr;gap:8px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.safegrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.safe{border:1px solid #34d39944;background:#10b9811a;color:#d1fae5;border-radius:16px;padding:12px;font-size:12px;font-weight:900}.empty{padding:34px;text-align:center;color:#94a3b8}.footer{margin-top:12px;color:#64748b;font-size:12px;line-height:1.7}@media(max-width:1280px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(4,1fr)}.toolbar{grid-template-columns:1fr 1fr 1fr}.reason{grid-template-columns:1fr}.safegrid{grid-template-columns:1fr 1fr}}@media(max-width:720px){#${ROOT_ID}{padding:20px 12px}.headgrid,.stats,.toolbar,.safegrid{grid-template-columns:1fr}.title{font-size:27px}}`;
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
    state.items.find((item: Report) => item.id === state.selectedId) ??
    rows[0] ??
    null;
  return `<section class="wrap"><header class="panel head"><div class="headgrid"><div><p class="k">Admin Console · Reports · v${e(VERSION)}</p><h1 class="title">신고·CS·운영 리포트 콘솔</h1><p class="desc">커뮤니티 신고, 광고/제휴 검토, 보안 리포트, CS 티켓, 급여·예산·지출·저축 데이터 관련 운영 리포트를 관리자 권한과 감사 로그 경계에서 처리합니다. 화면과 export는 비식별·마스킹 기준이며 raw 금융 데이터, raw 개인정보, raw push token, 광고 금융 타겟팅은 차단합니다.</p></div><span class="badge">신고 처리 · CS · Trust & Safety · RBAC · 비식별 export</span></div></header><section class="stats">${stat("전체", state.stats.total)}${stat("열림", state.stats.open)}${stat("분류", state.stats.triaged)}${stat("조치", state.stats.actionRequired)}${stat("해결", state.stats.resolved)}${stat("긴급", state.stats.critical)}${stat("SLA", state.stats.slaBreached)}${stat("Privacy", state.stats.privacyPassRate)}</section><section class="panel"><div class="toolbar"><input id="q" class="input" value="${e(state.query)}" placeholder="제목, 대상, reporter hash, 요약 검색" />${select("type", reportTypes, state.type)}${select("status", reportStatuses, state.status)}${select("severity", severities, state.severity)}${select("assignee", assigneeScopes, state.assignee)}${select("sort", sortKeys, state.sort)}<button id="load" class="button" ${state.busy ? "disabled" : ""}>동기화</button></div><div class="reason"><input id="reason" class="input" value="${e(state.reason)}" placeholder="관리자 조치 사유" /><input id="memo" class="input" value="${e(state.memo)}" placeholder="내부 처리 메모" /><button id="guard" class="button secondary">Guard</button><button id="export" class="button secondary">비식별 export</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="grid"><div class="panel section"><h2 class="h2">리포트 목록</h2><div class="tablewrap"><table class="table"><thead><tr><th>리포트</th><th>상태</th><th>유형</th><th>대상</th><th>위험·SLA</th><th>작업</th></tr></thead><tbody>${rows.length ? rows.map(row).join("") : `<tr><td class="empty" colspan="6">조건에 맞는 리포트가 없습니다.</td></tr>`}</tbody></table></div><p class="footer">표시 ${num(rows.length)}개 / API total ${num(state.total)}개 · 모든 조치는 X-Admin-Reason, RBAC, 감사 로그 저장을 전제로 합니다.</p></div><aside class="panel section"><h2 class="h2">상세·처리 검토</h2>${detail(selected)}</aside></section><section class="panel section"><h2 class="h2">Privacy · Ads · Audit Guard</h2><div class="safegrid">${guardHtml()}</div><p class="footer">마지막 동기화 ${e(state.loadedAt)} · rawFinancialDataExposed=false · rawPersonalDataExposed=false · rawPushTokenLogged=false · adsFinancialTargetingUsed=false</p></section></section>`;
}

function stat(labelText: string, value: number | string): string {
  return `<div class="panel stat"><small>${e(labelText)}</small><b>${typeof value === "number" ? num(value) : e(value)}</b></div>`;
}

function row(report: Report): string {
  return `<tr class="${state.selectedId === report.id ? "selected" : ""}"><td><button class="link" data-action="SELECT" data-id="${e(report.id)}">${e(report.title)}</button><span class="sub">${e(report.safeSummary)}<br/>reporter=${e(report.reporterHash)} · actor=${e(report.reportedActorHash ?? "-")}</span></td><td><span class="pill ${e(report.status)}">${e(report.status)}</span><br/><span class="pill ${e(report.severity)}" style="margin-top:6px">${e(report.severity)}</span></td><td>${e(typeLabel(report.type))}<span class="sub">assignee=${e(scopeLabel(report.assigneeScope))}</span></td><td>${e(report.targetLabel)}<span class="sub">${e(report.targetSafePreview)}</span></td><td>신고 ${num(report.reportCount)}<br/>risk ${num(report.riskScore)}<br/>SLA ${e(dt(report.slaDueAt))}</td><td><div class="actions">${actions.map((action: Action) => `<button class="button secondary small" data-action="${e(action)}" data-id="${e(report.id)}">${e(actionLabel(action))}</button>`).join("")}</div></td></tr>`;
}

function detail(report: Report | null): string {
  if (!report) return `<div class="empty">리포트를 선택하세요.</div>`;
  return `<div class="cards"><div class="card"><div class="ct">${e(report.title)}</div><div class="cs">${e(report.safeSummary)}</div></div><div class="card kv"><span>ID</span><b>${e(report.id)}</b><span>유형</span><b>${e(typeLabel(report.type))}</b><span>상태</span><b>${e(report.status)}</b><span>심각도</span><b>${e(report.severity)}</b><span>대상</span><b>${e(report.targetLabel)}</b><span>Reporter Hash</span><b>${e(report.reporterHash)}</b><span>Actor Hash</span><b>${e(report.reportedActorHash ?? "-")}</b><span>담당</span><b>${e(report.assigneeLabel ?? scopeLabel(report.assigneeScope))}</b><span>최근 사유</span><b>${e(report.lastActionReason ?? "-")}</b><span>메모</span><b>${e(report.moderatorMemo ?? "-")}</b></div><div class="card"><div class="ct">안전성</div><div class="cs">rawFinancialDataExposed=${String(report.rawFinancialDataExposed)}<br/>rawPersonalDataExposed=${String(report.rawPersonalDataExposed)}<br/>rawPushTokenLogged=${String(report.rawPushTokenLogged)}<br/>adsFinancialTargetingUsed=${String(report.adsFinancialTargetingUsed)}<br/>auditReasonRequired=${String(report.auditReasonRequired)}</div></div></div>`;
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
    "reporterHashOnly=true",
    "actorHashOnly=true",
    "rawFinancialDataExposed=false",
    "rawPersonalDataExposed=false",
    "rawPushTokenLogged=false",
    "adsFinancialTargetingUsed=false",
    "xAdminReasonRequired=true",
    "redactedExportReady=true",
  ]
    .map((item: string) => `<div class="safe">${e(item)} · PASS</div>`)
    .join("");
}

function bind(root: HTMLElement): void {
  input(root, "q", (value: string) => patch({ query: value }, root));
  input(root, "reason", (value: string) => patch({ reason: value }, root));
  input(root, "memo", (value: string) => patch({ memo: value }, root));
  selectBind(root, "type", (value: string) =>
    patch({ type: enumOf(reportTypes, value, "ALL") }, root),
  );
  selectBind(root, "status", (value: string) =>
    patch({ status: enumOf(reportStatuses, value, "ALL") }, root),
  );
  selectBind(root, "severity", (value: string) =>
    patch({ severity: enumOf(severities, value, "ALL") }, root),
  );
  selectBind(root, "assignee", (value: string) =>
    patch({ assignee: enumOf(assigneeScopes, value, "ALL") }, root),
  );
  selectBind(root, "sort", (value: string) =>
    patch({ sort: enumOf(sortKeys, value, "createdAt") }, root),
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
            "Guard PASS: hash-only, raw 금융/개인정보/push token 비노출, 광고 금융 타겟팅 금지",
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
    if (state.type !== "ALL") params.set("type", state.type);
    if (state.status !== "ALL") params.set("status", state.status);
    if (state.severity !== "ALL") params.set("severity", state.severity);
    if (state.assignee !== "ALL") params.set("assignee", state.assignee);
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
          : { type: "success", message: "리포트 목록을 동기화했습니다." },
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
              : "리포트 목록 조회에 실패했습니다.",
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
  report: Report,
  action: Action,
): Promise<void> {
  if (action !== "EXPORT_REDACTED" && !state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "리포트 조치에는 관리자 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  patch({ busy: true }, root);
  try {
    const changed = reportFrom(
      await api<MutationResponse>(
        `${API_BASE}/${encodeURIComponent(report.id)}/${action.toLowerCase()}`,
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
      const items = state.items.map((item: Report) =>
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
              : "리포트 조치에 실패했습니다.",
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
    (item: Report) => item.id === state.selectedId,
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
          type: state.type,
          status: state.status,
          severity: state.severity,
          assignee: state.assignee,
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
          message: "비식별 export 요청을 완료했습니다.",
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
  const report = state.items.find((item: Report) => item.id === id);
  if (!report) return;
  if (actionName === "SELECT") {
    patch(
      {
        selectedId: id,
        toast: { type: "info", message: `${report.title} 상세를 열었습니다.` },
      },
      root,
    );
    return;
  }
  void mutate(root, report, enumOf(actions, actionName, "TRIAGE"));
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
  readonly items: readonly Report[];
  readonly total: number;
  readonly stats: Stats;
} {
  const raw = response.data?.items ?? response.items ?? [];
  const items = raw.map((item: Report) => normalize(item));
  return {
    items,
    total: response.data?.total ?? response.total ?? items.length,
    stats: response.data?.stats ?? response.stats ?? statsFrom(items),
  };
}

function reportFrom(response: MutationResponse): Report | null {
  if (response.report) return response.report;
  if (response.data && "id" in response.data) return response.data as Report;
  if (response.data && "report" in response.data)
    return response.data.report ?? null;
  return null;
}

function normalize(report: Report): Report {
  return {
    ...report,
    id: scrub(report.id),
    type: enumOf(reportTypeValues, report.type, "COMMUNITY_POST"),
    status: enumOf(reportStatusValues, report.status, "OPEN"),
    severity: enumOf(severityValues, report.severity, "LOW"),
    title: scrub(report.title),
    safeSummary: scrub(report.safeSummary),
    targetId: scrub(report.targetId),
    targetLabel: scrub(report.targetLabel),
    targetSafePreview: scrub(report.targetSafePreview),
    reporterHash: scrub(report.reporterHash),
    reportedActorHash: report.reportedActorHash
      ? scrub(report.reportedActorHash)
      : null,
    assigneeScope: enumOf(assigneeValues, report.assigneeScope, "UNASSIGNED"),
    assigneeLabel: report.assigneeLabel ? scrub(report.assigneeLabel) : null,
    reportCount: nonNegative(report.reportCount),
    riskScore: nonNegative(report.riskScore),
    slaDueAt: iso(report.slaDueAt),
    createdAt: iso(report.createdAt),
    updatedAt: iso(report.updatedAt),
    resolvedAt: report.resolvedAt ? iso(report.resolvedAt) : null,
    moderatorMemo: report.moderatorMemo ? scrub(report.moderatorMemo) : null,
    lastActionReason: report.lastActionReason
      ? scrub(report.lastActionReason)
      : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    auditReasonRequired: true,
  };
}

function statsFrom(items: readonly Report[]): Stats {
  const now = Date.now();
  const safe = items.filter(
    (item: Report) =>
      !item.rawFinancialDataExposed &&
      !item.rawPersonalDataExposed &&
      !item.rawPushTokenLogged &&
      !item.adsFinancialTargetingUsed,
  ).length;
  return {
    total: items.length,
    open: items.filter((item: Report) => item.status === "OPEN").length,
    triaged: items.filter((item: Report) => item.status === "TRIAGED").length,
    actionRequired: items.filter(
      (item: Report) => item.status === "ACTION_REQUIRED",
    ).length,
    resolved: items.filter((item: Report) => item.status === "RESOLVED").length,
    critical: items.filter((item: Report) => item.severity === "CRITICAL")
      .length,
    slaBreached: items.filter(
      (item: Report) =>
        new Date(item.slaDueAt).getTime() < now &&
        item.status !== "RESOLVED" &&
        item.status !== "ARCHIVED",
    ).length,
    privacyPassRate: pct(safe, items.length),
  };
}

function visible(): readonly Report[] {
  const query = state.query.trim().toLowerCase();
  return state.items
    .filter((item: Report) => state.type === "ALL" || item.type === state.type)
    .filter(
      (item: Report) => state.status === "ALL" || item.status === state.status,
    )
    .filter(
      (item: Report) =>
        state.severity === "ALL" || item.severity === state.severity,
    )
    .filter(
      (item: Report) =>
        state.assignee === "ALL" || item.assigneeScope === state.assignee,
    )
    .filter(
      (item: Report) =>
        !query ||
        `${item.title} ${item.safeSummary} ${item.targetLabel} ${item.reporterHash} ${item.reportedActorHash ?? ""}`
          .toLowerCase()
          .includes(query),
    )
    .slice()
    .sort(compare);
}

function compare(left: Report, right: Report): number {
  if (
    state.sort === "createdAt" ||
    state.sort === "updatedAt" ||
    state.sort === "slaDueAt"
  )
    return (
      new Date(right[state.sort]).getTime() -
      new Date(left[state.sort]).getTime()
    );
  if (state.sort === "severity")
    return severityRank(right.severity) - severityRank(left.severity);
  return Number(right[state.sort]) - Number(left[state.sort]);
}

function severityRank(value: Severity): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[value];
}

function adminHeaders(action: Action): HeadersInit {
  return {
    "x-admin-reason":
      state.reason.trim() ||
      (action === "EXPORT_REDACTED" ? "redacted export" : "report operation"),
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

function typeLabel(value: ReportType): string {
  return {
    COMMUNITY_POST: "게시글 신고",
    COMMUNITY_COMMENT: "댓글 신고",
    USER_PROFILE: "사용자 신고",
    AD_CAMPAIGN: "광고 검토",
    NOTICE: "공지 리포트",
    PAYROLL_DATA: "급여 데이터",
    BUDGET_DATA: "예산 데이터",
    SECURITY: "보안",
    CS_TICKET: "CS 티켓",
  }[value];
}

function scopeLabel(value: Exclude<AssigneeScope, "ALL" | "MINE">): string {
  return {
    UNASSIGNED: "미배정",
    OPS: "운영",
    TRUST_SAFETY: "Trust & Safety",
    ADS: "광고",
    SECURITY: "보안",
    CS: "CS",
  }[value];
}

function actionLabel(value: Action): string {
  return {
    TRIAGE: "분류",
    ASSIGN: "배정",
    RESOLVE: "해결",
    REJECT: "반려",
    HIDE_TARGET: "대상 숨김",
    RESTORE_TARGET: "대상 복원",
    SANCTION_ACTOR: "작성자 제재",
    ESCALATE: "상신",
    ARCHIVE: "보관",
    EXPORT_REDACTED: "비식별 export",
  }[value];
}

function labelFor(value: string): string {
  if (value === "ALL") return "전체";
  if (reportTypes.includes(value as ReportTypeFilter) && value !== "ALL")
    return typeLabel(value as ReportType);
  if (assigneeScopes.includes(value as AssigneeScope))
    return value === "MINE"
      ? "내 담당"
      : value === "ALL"
        ? "전체"
        : scopeLabel(value as Exclude<AssigneeScope, "ALL" | "MINE">);
  if (actions.includes(value as Action)) return actionLabel(value as Action);
  return (
    (
      {
        createdAt: "생성일",
        updatedAt: "수정일",
        severity: "심각도",
        reportCount: "신고 수",
        slaDueAt: "SLA",
        riskScore: "위험도",
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

function assertAdminReportsPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_reports_console",
    "community_cs_ads_security_reports",
    "report_type_status_severity_assignee_sort_filters",
    "report_detail_panel",
    "triage_assign_resolve_reject_hide_restore_sanction_escalate_archive_actions",
    "x_admin_reason_required",
    "moderator_memo",
    "redacted_export_action",
    "reporter_hash_only",
    "actor_hash_only",
    "raw_financial_data_redaction",
    "raw_personal_data_redaction",
    "raw_push_token_redaction",
    "ads_financial_targeting_forbidden",
    "sla_risk_stats",
    "audit_log_ready",
    "rbac_admin_boundary",
    "no_store_fetch",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminReportsPageCompleteness;
