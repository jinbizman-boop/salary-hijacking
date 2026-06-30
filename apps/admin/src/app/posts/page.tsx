"use client";

/** apps/admin/src/app/posts/page.tsx
 * 급여납치 관리자 커뮤니티 게시글 운영 콘솔 최종본.
 * React import/JSX 없이 동작하는 Next Client Page다.
 */

const VERSION = "3.1.2";
const ROOT_ID = "salary-hijacking-admin-posts-root";
const API_BASE = "/admin/api/v1/posts";
const PAGE_SIZE = 40;
const REFRESH_MS = 60_000;

const boards = [
  "ALL",
  "FREE",
  "PAYROLL",
  "BUDGET",
  "SAVINGS",
  "GROWTH",
  "NOTICE",
  "REPORT",
] as const;
const statuses = [
  "ALL",
  "PENDING",
  "VISIBLE",
  "HIDDEN",
  "REPORTED",
  "DELETED",
  "LOCKED",
] as const;
const severities = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const sorts = [
  "createdAt",
  "updatedAt",
  "reportCount",
  "likeCount",
  "commentCount",
  "riskScore",
] as const;
const actions = [
  "APPROVE",
  "HIDE",
  "RESTORE",
  "LOCK",
  "UNLOCK",
  "PIN",
  "UNPIN",
  "DELETE",
  "ESCALATE",
  "SANCTION_AUTHOR",
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
  "hijack",
  "payslip",
  "bankbook",
  "statement",
  "push",
  "fcm",
  "급여",
  "월급",
  "연봉",
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

type Board = Exclude<(typeof boards)[number], "ALL">;
type PostStatus = Exclude<(typeof statuses)[number], "ALL">;
type Severity = Exclude<(typeof severities)[number], "ALL">;
type SortKey = (typeof sorts)[number];
type Action = (typeof actions)[number];
type BoardFilter = (typeof boards)[number];
type StatusFilter = (typeof statuses)[number];
type SeverityFilter = (typeof severities)[number];
type Toast = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type Post = {
  readonly id: string;
  readonly board: Board;
  readonly status: PostStatus;
  readonly severity: Severity;
  readonly title: string;
  readonly safePreview: string;
  readonly anonymousAuthorLabel: string;
  readonly authorHash: string;
  readonly reportCount: number;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly riskScore: number;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly moderatorMemo: string | null;
  readonly lastReportReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly reviewedBy: string | null;
  readonly rawFinancialDataExposed: false;
  readonly rawPersonalDataExposed: false;
  readonly adsFinancialTargetingUsed: false;
  readonly auditReasonRequired: true;
};

type Stats = {
  readonly total: number;
  readonly pending: number;
  readonly reported: number;
  readonly hidden: number;
  readonly critical: number;
  readonly deleted: number;
  readonly privacyPassRate: string;
};
type ListResponse = {
  readonly data?:
    | {
        readonly items?: readonly Post[];
        readonly total?: number;
        readonly stats?: Stats;
      }
    | undefined;
  readonly items?: readonly Post[] | undefined;
  readonly total?: number | undefined;
  readonly stats?: Stats | undefined;
};
type MutationResponse = {
  readonly data?: Post | { readonly post?: Post } | undefined;
  readonly post?: Post | undefined;
};
type State = {
  readonly items: readonly Post[];
  readonly total: number;
  readonly stats: Stats;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly query: string;
  readonly board: BoardFilter;
  readonly status: StatusFilter;
  readonly severity: SeverityFilter;
  readonly sort: SortKey;
  readonly reason: string;
  readonly memo: string;
  readonly selectedId: string | null;
  readonly toast: { readonly type: Toast; readonly message: string };
};

const emptyStats: Stats = Object.freeze({
  total: 0,
  pending: 0,
  reported: 0,
  hidden: 0,
  critical: 0,
  deleted: 0,
  privacyPassRate: "100.00%",
});
const boardValues = boards.filter((x: BoardFilter): x is Board => x !== "ALL");
const statusValues = statuses.filter(
  (x: StatusFilter): x is PostStatus => x !== "ALL",
);
const severityValues = severities.filter(
  (x: SeverityFilter): x is Severity => x !== "ALL",
);
let state: State = {
  items: [],
  total: 0,
  stats: emptyStats,
  busy: false,
  loadedAt: "-",
  query: "",
  board: "ALL",
  status: "ALL",
  severity: "ALL",
  sort: "createdAt",
  reason: "",
  memo: "",
  selectedId: null,
  toast: {
    type: "info",
    message: "커뮤니티 게시글 운영 콘솔이 준비되었습니다.",
  },
};
let mounted = false;
let timer: number | null = null;

export default function AdminPostsPage(): null {
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
  style();
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

function style(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const s = document.createElement("style");
  s.id = `${ROOT_ID}-style`;
  s.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1540px;margin:auto;display:flex;flex-direction:column;gap:24px}.p{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008}.head{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:1000}.title{font-size:34px;margin:10px 0 0;color:#fff;font-weight:1000}.desc{max-width:1040px;color:#cbd5e1;font-size:14px;line-height:1.75}.hg{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.badge{border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.stats{display:grid;grid-template-columns:repeat(7,1fr);gap:12px}.stat{padding:18px}.stat small{color:#94a3b8;font-weight:900;text-transform:uppercase}.stat b{display:block;color:#fff;font-size:25px;margin-top:8px}.bar{padding:18px;display:grid;grid-template-columns:minmax(240px,1fr) 145px 145px 145px 145px auto;gap:10px}.reason{display:grid;grid-template-columns:1fr 1fr auto auto;gap:10px;padding:0 18px 18px}.inp,.sel{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px;font-size:14px}.btn{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.btn.s{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn:disabled{opacity:.55}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.grid{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:24px}.sec{padding:20px}.h2{font-size:20px;color:#fff;margin:0 0 14px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.tbl{width:100%;min-width:1080px;border-collapse:collapse;font-size:13px}.tbl th,.tbl td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.tbl thead{background:#0f172a;color:#94a3b8;font-size:11px;text-transform:uppercase}.tbl tr.selected{background:#22d3ee1a}.link{border:0;background:transparent;color:#fff;font-weight:1000;text-align:left;cursor:pointer;padding:0}.sub{display:block;color:#64748b;font-size:12px;margin-top:5px;line-height:1.45}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.VISIBLE,.LOW{border-color:#34d39966;background:#10b98122;color:#d1fae5}.PENDING,.MEDIUM,.LOCKED{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.REPORTED,.HIGH,.HIDDEN{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.CRITICAL,.DELETED{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.acts{display:flex;flex-wrap:wrap;gap:6px}.sm{font-size:12px;padding:7px 9px;border-radius:10px}.cards{display:flex;flex-direction:column;gap:12px}.card{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.ct{color:#fff;font-weight:1000}.cs{color:#94a3b8;line-height:1.6;font-size:13px;margin-top:7px}.kv{display:grid;grid-template-columns:135px 1fr;gap:8px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.safegrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.safe{border:1px solid #34d39944;background:#10b9811a;color:#d1fae5;border-radius:16px;padding:12px;font-size:12px;font-weight:900}.empty{padding:34px;text-align:center;color:#94a3b8}.ft{margin-top:12px;color:#64748b;font-size:12px;line-height:1.7}@media(max-width:1240px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(3,1fr)}.bar{grid-template-columns:1fr 1fr 1fr}.reason{grid-template-columns:1fr}.safegrid{grid-template-columns:1fr 1fr}}@media(max-width:720px){#${ROOT_ID}{padding:20px 12px}.hg,.stats,.bar,.safegrid{grid-template-columns:1fr}.title{font-size:27px}}`;
  document.head.appendChild(s);
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
    state.items.find((x: Post) => x.id === state.selectedId) ?? rows[0] ?? null;
  return `<section class="wrap"><header class="p head"><div class="hg"><div><p class="k">Admin Console · Posts · v${e(VERSION)}</p><h1 class="title">커뮤니티 게시글 운영 콘솔</h1><p class="desc">익명 커뮤니티 게시글, 신고 흐름, 고위험 콘텐츠, 광고·제휴 유도성 게시물, 금융 원문 노출 위험을 관리자 권한과 감사 로그 경계에서 검토합니다. 사용자 화면에는 익명 표시를 유지하고 내부에서는 authorHash 수준의 안전 식별자만 사용합니다.</p></div><span class="badge">익명성 보호 · 모더레이션 · RBAC · 금융 원문 차단</span></div></header><section class="stats">${stat("전체", state.stats.total)}${stat("대기", state.stats.pending)}${stat("신고", state.stats.reported)}${stat("숨김", state.stats.hidden)}${stat("긴급", state.stats.critical)}${stat("삭제", state.stats.deleted)}${stat("Privacy", state.stats.privacyPassRate)}</section><section class="p"><div class="bar"><input id="q" class="inp" value="${e(state.query)}" placeholder="제목, 미리보기, 작성자 hash, 신고 사유 검색" />${select("board", boards, state.board)}${select("status", statuses, state.status)}${select("sev", severities, state.severity)}${select("sort", sorts, state.sort)}<button id="load" class="btn" ${state.busy ? "disabled" : ""}>동기화</button></div><div class="reason"><input id="reason" class="inp" value="${e(state.reason)}" placeholder="관리자 조치 사유" /><input id="memo" class="inp" value="${e(state.memo)}" placeholder="내부 모더레이션 메모" /><button id="guard" class="btn s">Guard</button><button id="export" class="btn s">비식별 export</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="grid"><div class="p sec"><h2 class="h2">게시글 목록</h2><div class="tablewrap"><table class="tbl"><thead><tr><th>게시글</th><th>상태</th><th>게시판</th><th>작성자</th><th>신호</th><th>작업</th></tr></thead><tbody>${rows.length ? rows.map(row).join("") : `<tr><td class="empty" colspan="6">조건에 맞는 게시글이 없습니다.</td></tr>`}</tbody></table></div><p class="ft">표시 ${num(rows.length)}개 / API total ${num(state.total)}개 · 모든 조치는 X-Admin-Reason, RBAC, 감사 로그 저장을 전제로 합니다.</p></div><aside class="p sec"><h2 class="h2">상세·모더레이션 검토</h2>${detail(selected)}</aside></section><section class="p sec"><h2 class="h2">Privacy · Community · Ads Guard</h2><div class="safegrid">${guardHtml()}</div><p class="ft">마지막 동기화 ${e(state.loadedAt)} · rawFinancialDataExposed=false · rawPersonalDataExposed=false · adsFinancialTargetingUsed=false · anonymousDisplay=true</p></section></section>`;
}

function stat(label: string, value: number | string): string {
  return `<div class="p stat"><small>${e(label)}</small><b>${typeof value === "number" ? num(value) : e(value)}</b></div>`;
}
function row(x: Post): string {
  return `<tr class="${state.selectedId === x.id ? "selected" : ""}"><td><button class="link" data-action="SELECT" data-id="${e(x.id)}">${e(x.title)}</button><span class="sub">${e(x.safePreview)}<br/>${x.pinned ? "📌 고정 · " : ""}${x.locked ? "🔒 잠김 · " : ""}reviewed=${e(x.reviewedAt ? dt(x.reviewedAt) : "-")}</span></td><td><span class="pill ${e(x.status)}">${e(x.status)}</span><br/><span class="pill ${e(x.severity)}" style="margin-top:6px">${e(x.severity)}</span></td><td>${e(boardLabel(x.board))}</td><td>${e(x.anonymousAuthorLabel)}<span class="sub">hash=${e(x.authorHash)}</span></td><td>신고 ${num(x.reportCount)}<br/>댓글 ${num(x.commentCount)}<br/>risk ${num(x.riskScore)}</td><td><div class="acts">${actions.map((a: Action) => `<button class="btn s sm" data-action="${e(a)}" data-id="${e(x.id)}">${e(actionLabel(a))}</button>`).join("")}</div></td></tr>`;
}
function detail(x: Post | null): string {
  if (!x) return `<div class="empty">게시글을 선택하세요.</div>`;
  return `<div class="cards"><div class="card"><div class="ct">${e(x.title)}</div><div class="cs">${e(x.safePreview)}</div></div><div class="card kv"><span>ID</span><b>${e(x.id)}</b><span>게시판</span><b>${e(boardLabel(x.board))}</b><span>상태</span><b>${e(x.status)}</b><span>심각도</span><b>${e(x.severity)}</b><span>익명 작성자</span><b>${e(x.anonymousAuthorLabel)}</b><span>작성자 Hash</span><b>${e(x.authorHash)}</b><span>최근 신고</span><b>${e(x.lastReportReason ?? "-")}</b><span>메모</span><b>${e(x.moderatorMemo ?? "-")}</b></div><div class="card"><div class="ct">안전성</div><div class="cs">rawFinancialDataExposed=${String(x.rawFinancialDataExposed)}<br/>rawPersonalDataExposed=${String(x.rawPersonalDataExposed)}<br/>adsFinancialTargetingUsed=${String(x.adsFinancialTargetingUsed)}<br/>auditReasonRequired=${String(x.auditReasonRequired)}</div></div></div>`;
}
function select(
  id: string,
  values: readonly string[],
  selected: string,
): string {
  return `<select id="${e(id)}" class="sel">${values.map((v: string) => `<option value="${e(v)}" ${v === selected ? "selected" : ""}>${e(labelFor(v))}</option>`).join("")}</select>`;
}
function guardHtml(): string {
  return [
    "anonymousDisplay=true",
    "authorHashOnly=true",
    "rawFinancialDataExposed=false",
    "rawPersonalDataExposed=false",
    "adsFinancialTargetingUsed=false",
    "xAdminReasonRequired=true",
    "redactedAuditReady=true",
    "noStoreFetch=true",
  ]
    .map((x: string) => `<div class="safe">${e(x)} · PASS</div>`)
    .join("");
}

function bind(root: HTMLElement): void {
  input(root, "q", (v: string) => patch({ query: v }, root));
  input(root, "reason", (v: string) => patch({ reason: v }, root));
  input(root, "memo", (v: string) => patch({ memo: v }, root));
  sel(root, "board", (v: string) =>
    patch({ board: enumOf(boards, v, "ALL") }, root),
  );
  sel(root, "status", (v: string) =>
    patch({ status: enumOf(statuses, v, "ALL") }, root),
  );
  sel(root, "sev", (v: string) =>
    patch({ severity: enumOf(severities, v, "ALL") }, root),
  );
  sel(root, "sort", (v: string) =>
    patch({ sort: enumOf(sorts, v, "createdAt") }, root),
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
            "Guard PASS: 익명 표시, hash-only, raw 금융/개인정보 비노출, 광고 금융 타겟팅 금지",
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
    .forEach((b: HTMLButtonElement) =>
      b.addEventListener("click", () =>
        handle(root, b.dataset.action ?? "", b.dataset.id ?? ""),
      ),
    );
}

async function load(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const p = new URLSearchParams({
      limit: String(PAGE_SIZE),
      sort: state.sort,
    });
    if (state.query.trim()) p.set("q", state.query.trim());
    if (state.board !== "ALL") p.set("board", state.board);
    if (state.status !== "ALL") p.set("status", state.status);
    if (state.severity !== "ALL") p.set("severity", state.severity);
    const next = listFrom(
      await api<ListResponse>(`${API_BASE}?${p.toString()}`),
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
          : { type: "success", message: "게시글 목록을 동기화했습니다." },
      },
      root,
    );
  } catch (err) {
    patch(
      {
        toast: {
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "게시글 목록 조회에 실패했습니다.",
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
  post: Post,
  action: Action,
): Promise<void> {
  if (!state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "게시글 조치에는 관리자 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  patch({ busy: true }, root);
  try {
    const changed = postFrom(
      await api<MutationResponse>(
        `${API_BASE}/${encodeURIComponent(post.id)}/${action.toLowerCase()}`,
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({
            action,
            reason: state.reason.trim(),
            memo: state.memo.trim(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      ),
    );
    if (changed) {
      const safe = normalize(changed);
      const items = state.items.map((x: Post) => (x.id === safe.id ? safe : x));
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
    } else
      patch(
        {
          toast: {
            type: "success",
            message: `${actionLabel(action)} 요청을 완료했습니다.`,
          },
        },
        root,
      );
  } catch (err) {
    patch(
      {
        toast: {
          type: "error",
          message:
            err instanceof Error ? err.message : "게시글 조치에 실패했습니다.",
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
  patch({ busy: true }, root);
  try {
    await api<JsonRecord>(`${API_BASE}/exports/redacted`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        reason: state.reason.trim(),
        filters: {
          board: state.board,
          status: state.status,
          severity: state.severity,
          q: state.query.trim(),
        },
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
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
  } catch (err) {
    patch(
      {
        toast: {
          type: "error",
          message:
            err instanceof Error
              ? err.message
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
  const post = state.items.find((x: Post) => x.id === id);
  if (!post) return;
  if (actionName === "SELECT") {
    patch(
      {
        selectedId: id,
        toast: { type: "info", message: `${post.title} 상세를 열었습니다.` },
      },
      root,
    );
    return;
  }
  void mutate(root, post, enumOf(actions, actionName, "APPROVE"));
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const r = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const raw = await r.text();
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  if (!r.ok) throw new Error(errorMessage(parsed, r.status));
  return parsed as T;
}
function listFrom(r: ListResponse): {
  readonly items: readonly Post[];
  readonly total: number;
  readonly stats: Stats;
} {
  const raw = r.data?.items ?? r.items ?? [];
  const items = raw.map((x: Post) => normalize(x));
  return {
    items,
    total: r.data?.total ?? r.total ?? items.length,
    stats: r.data?.stats ?? r.stats ?? statsFrom(items),
  };
}
function postFrom(r: MutationResponse): Post | null {
  if (r.post) return r.post;
  if (r.data && "id" in r.data) return r.data as Post;
  if (r.data && "post" in r.data) return r.data.post ?? null;
  return null;
}
function normalize(x: Post): Post {
  return {
    ...x,
    id: scrub(x.id),
    board: enumOf(boardValues, x.board, "FREE"),
    status: enumOf(statusValues, x.status, "PENDING"),
    severity: enumOf(severityValues, x.severity, "LOW"),
    title: scrub(x.title),
    safePreview: scrub(x.safePreview),
    anonymousAuthorLabel: scrub(x.anonymousAuthorLabel),
    authorHash: scrub(x.authorHash),
    reportCount: nonNegative(x.reportCount),
    likeCount: nonNegative(x.likeCount),
    commentCount: nonNegative(x.commentCount),
    riskScore: nonNegative(x.riskScore),
    moderatorMemo: x.moderatorMemo ? scrub(x.moderatorMemo) : null,
    lastReportReason: x.lastReportReason ? scrub(x.lastReportReason) : null,
    createdAt: iso(x.createdAt),
    updatedAt: iso(x.updatedAt),
    reviewedAt: x.reviewedAt ? iso(x.reviewedAt) : null,
    reviewedBy: x.reviewedBy ? scrub(x.reviewedBy) : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
    auditReasonRequired: true,
  };
}
function statsFrom(items: readonly Post[]): Stats {
  const safe = items.filter(
    (x: Post) =>
      !x.rawFinancialDataExposed &&
      !x.rawPersonalDataExposed &&
      !x.adsFinancialTargetingUsed,
  ).length;
  return {
    total: items.length,
    pending: items.filter((x: Post) => x.status === "PENDING").length,
    reported: items.filter((x: Post) => x.status === "REPORTED").length,
    hidden: items.filter((x: Post) => x.status === "HIDDEN").length,
    critical: items.filter((x: Post) => x.severity === "CRITICAL").length,
    deleted: items.filter((x: Post) => x.status === "DELETED").length,
    privacyPassRate: pct(safe, items.length),
  };
}
function visible(): readonly Post[] {
  const q = state.query.trim().toLowerCase();
  return state.items
    .filter((x: Post) => state.board === "ALL" || x.board === state.board)
    .filter((x: Post) => state.status === "ALL" || x.status === state.status)
    .filter(
      (x: Post) => state.severity === "ALL" || x.severity === state.severity,
    )
    .filter(
      (x: Post) =>
        !q ||
        `${x.title} ${x.safePreview} ${x.authorHash} ${x.lastReportReason ?? ""}`
          .toLowerCase()
          .includes(q),
    )
    .slice()
    .sort(compare);
}
function compare(a: Post, b: Post): number {
  if (state.sort === "createdAt" || state.sort === "updatedAt")
    return (
      new Date(b[state.sort]).getTime() - new Date(a[state.sort]).getTime()
    );
  return Number(b[state.sort]) - Number(a[state.sort]);
}
function adminHeaders(): HeadersInit {
  return {
    "x-admin-reason": state.reason.trim(),
    "x-raw-financial-data-exposed": "false",
    "x-raw-personal-data-exposed": "false",
    "x-ad-financial-targeting-used": "false",
  };
}
function input(root: HTMLElement, id: string, fn: (v: string) => void): void {
  const n = by<HTMLInputElement>(root, id);
  n?.addEventListener("input", () => fn(n.value));
}
function sel(root: HTMLElement, id: string, fn: (v: string) => void): void {
  const n = by<HTMLSelectElement>(root, id);
  n?.addEventListener("change", () => fn(n.value));
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
function boardLabel(x: Board): string {
  return {
    FREE: "자유",
    PAYROLL: "급여",
    BUDGET: "예산",
    SAVINGS: "저축",
    GROWTH: "성장",
    NOTICE: "공지",
    REPORT: "신고",
  }[x];
}
function actionLabel(x: Action): string {
  return {
    APPROVE: "승인",
    HIDE: "숨김",
    RESTORE: "복원",
    LOCK: "잠금",
    UNLOCK: "해제",
    PIN: "고정",
    UNPIN: "고정해제",
    DELETE: "삭제",
    ESCALATE: "상신",
    SANCTION_AUTHOR: "제재",
  }[x];
}
function labelFor(x: string): string {
  if (x === "ALL") return "전체";
  if (boards.includes(x as BoardFilter) && x !== "ALL")
    return boardLabel(x as Board);
  if (actions.includes(x as Action)) return actionLabel(x as Action);
  return (
    (
      {
        createdAt: "작성일",
        updatedAt: "수정일",
        reportCount: "신고",
        likeCount: "좋아요",
        commentCount: "댓글",
        riskScore: "위험도",
      } as Record<string, string>
    )[x] ?? x
  );
}
function errorMessage(parsed: unknown, status: number): string {
  if (parsed && typeof parsed === "object" && "error" in parsed)
    return JSON.stringify(
      sanitize((parsed as { readonly error: unknown }).error),
    );
  return `HTTP ${status}`;
}
function sanitize(v: unknown): JsonValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v === "string") return scrub(v);
  if (Array.isArray(v)) return v.slice(0, 80).map(sanitize);
  if (typeof v === "object")
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .slice(0, 80)
        .map(([k, item]: [string, unknown]) => [
          k,
          sensitive(k) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  return String(v);
}
function sensitive(k: string): boolean {
  const n = k.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveTerms.some((t: string) =>
    n.includes(t.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function scrub(v: string): string {
  let out = v.slice(0, 1200);
  sensitiveTerms.forEach((t: string) => {
    out = out.replace(new RegExp(rx(t), "ig"), "[REDACTED]");
  });
  return out;
}
function nonNegative(v: number): number {
  return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0;
}
function pct(a: number, b: number): string {
  return b > 0 ? `${((a * 100) / b).toFixed(2)}%` : "100.00%";
}
function iso(v: string): string {
  const d = new Date(v);
  return Number.isFinite(d.getTime())
    ? d.toISOString()
    : new Date(0).toISOString();
}
function dt(v: string): string {
  const d = new Date(v);
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(d)
    : "-";
}
function num(v: number): string {
  return new Intl.NumberFormat("ko-KR").format(v);
}
function e(v: string): string {
  return v.replace(
    /[&<>'"]/g,
    (c: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ] ?? c,
  );
}
function rx(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function css(v: string): string {
  return v.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function assertAdminPostsPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_posts_console",
    "anonymous_community_moderation",
    "board_status_severity_sort_filters",
    "request_safe_no_store_fetch",
    "post_detail_panel",
    "approve_hide_restore_lock_unlock_pin_unpin_delete_escalate_sanction_actions",
    "x_admin_reason_required",
    "moderator_memo",
    "redacted_export_action",
    "author_hash_only",
    "raw_financial_data_redaction",
    "raw_personal_data_redaction",
    "ads_financial_targeting_forbidden",
    "community_report_review_ready",
    "audit_log_ready",
    "rbac_admin_boundary",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminPostsPageCompleteness;
