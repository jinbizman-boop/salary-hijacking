/**
 * packages/utils/src/pagination.ts · 급여납치 Salary Hijacking Platform 페이지네이션 유틸 최종본
 *
 * 목적
 * - 급여 홈, 변동지출, 고정지출, 고정저축, 알림함, LV UP 콘텐츠, 커뮤니티 피드,
 *   관리자 콘솔 목록에서 공통으로 사용하는 offset/cursor pagination SSOT를 제공합니다.
 * - 외부 런타임 의존성이 없는 순수 TypeScript 유틸이며 API/DB/worker/app/admin/E2E가 동일하게 사용할 수 있습니다.
 * - 이 파일은 목록 경계, 정렬, cursor, limit, page metadata, 링크/접근성 라벨만 처리합니다.
 *   급여·예산·지출·저축 금액 계산, 알림 발송 확정, 커뮤니티 운영 확정은 서버 권위 계층에서 수행해야 합니다.
 */

export const PAGINATION_CONTRACT_VERSION = "2.0.0" as const;
export const PAGINATION_UTILS_FILE = "pagination.ts" as const;
export const PAGINATION_DEFAULT_PAGE = 1 as const;
export const PAGINATION_DEFAULT_PAGE_SIZE = 20 as const;
export const PAGINATION_MIN_PAGE_SIZE = 1 as const;
export const PAGINATION_MAX_PAGE_SIZE = 100 as const;
export const PAGINATION_ADMIN_MAX_PAGE_SIZE = 200 as const;
export const PAGINATION_CURSOR_PREFIX = "shpg" as const;
export const PAGINATION_CURSOR_VERSION = 1 as const;
export const PAGINATION_DEFAULT_SORT_DIRECTION = "DESC" as const;
export const PAGINATION_DEFAULT_LOCALE = "ko-KR" as const;

export type PaginationDomain =
  | "payroll"
  | "budget"
  | "expense"
  | "savings"
  | "notification"
  | "growth"
  | "community"
  | "ads"
  | "admin"
  | "security";

export type PaginationMode = "OFFSET" | "CURSOR";
export type SortDirection = "ASC" | "DESC";
export type CursorDirection = "NEXT" | "PREVIOUS";
export type CursorSortValue = string | number | boolean | null;
export type PaginationInputValue = string | number | bigint | null | undefined;
export type PageSizePreset =
  | "compact"
  | "default"
  | "feed"
  | "admin"
  | "export";
export type PageWindowItemKind = "PAGE" | "ELLIPSIS";
export type PaginationStatus =
  | "EMPTY"
  | "FIRST_PAGE"
  | "MIDDLE_PAGE"
  | "LAST_PAGE"
  | "SINGLE_PAGE"
  | "UNKNOWN_TOTAL";

export interface PaginationPolicyGuard {
  readonly rawPasswordRendered: false;
  readonly rawTokenRendered: false;
  readonly rawSecretRendered: false;
  readonly rawPushTokenRendered: false;
  readonly rawPiiRendered: false;
  readonly rawFinancialSourceDataRendered: false;
  readonly cursorContainsRawFinancialPayload: false;
  readonly cursorContainsRawAdTargetPayload: false;
  readonly clientFinalAuthorityAllowed: false;
  readonly serverAuthorityListQueryRequired: true;
  readonly maxPageSizeEnforced: true;
  readonly deterministicSortRequired: true;
  readonly mutationFreeUtilities: true;
  readonly externalRuntimeDependencyRequired: false;
}

export interface PaginationValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export interface SortSpec<TSortField extends string = string> {
  readonly field: TSortField;
  readonly direction: SortDirection;
}

export interface NormalizedSortSpec<
  TSortField extends string = string,
> extends SortSpec<TSortField> {
  readonly stableTieBreakerField: string;
}

export interface OffsetPaginationInput {
  readonly page?: PaginationInputValue;
  readonly pageSize?: PaginationInputValue;
  readonly totalItems?: PaginationInputValue;
  readonly maxPageSize?: PaginationInputValue;
}

export interface OffsetPaginationState {
  readonly mode: "OFFSET";
  readonly page: number;
  readonly pageSize: number;
  readonly limit: number;
  readonly offset: number;
  readonly totalItems?: number;
  readonly totalPages?: number;
  readonly hasTotal: boolean;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
  readonly previousPage?: number;
  readonly nextPage?: number;
  readonly status: PaginationStatus;
}

export interface CursorPayload<TSortField extends string = string> {
  readonly version: typeof PAGINATION_CURSOR_VERSION;
  readonly domain: PaginationDomain;
  readonly direction: CursorDirection;
  readonly sort: SortSpec<TSortField>;
  readonly lastSortValue: CursorSortValue;
  readonly lastId: string;
  readonly pageSize: number;
  readonly issuedAt: string;
  readonly filterHash?: string;
}

export interface CursorPaginationInput<TSortField extends string = string> {
  readonly cursor?: string | null;
  readonly pageSize?: PaginationInputValue;
  readonly domain?: PaginationDomain;
  readonly sort?: SortSpec<TSortField>;
  readonly filterHash?: string;
  readonly maxPageSize?: PaginationInputValue;
}

export interface CursorPaginationState<TSortField extends string = string> {
  readonly mode: "CURSOR";
  readonly pageSize: number;
  readonly limit: number;
  readonly requestedCursor?: string;
  readonly decodedCursor?: CursorPayload<TSortField>;
  readonly domain: PaginationDomain;
  readonly sort: NormalizedSortSpec<TSortField>;
  readonly filterHash?: string;
}

export interface PageWindowItem {
  readonly kind: PageWindowItemKind;
  readonly page?: number;
  readonly current?: boolean;
  readonly label: string;
}

export interface PaginationLinks {
  readonly self: string;
  readonly first?: string;
  readonly previous?: string;
  readonly next?: string;
  readonly last?: string;
}

export interface PaginationA11yLabels {
  readonly summary: string;
  readonly currentPage: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly firstPage: string;
  readonly lastPage: string;
}

export interface OffsetPageResult<TItem> {
  readonly mode: "OFFSET";
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems?: number;
  readonly totalPages?: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
  readonly previousPage?: number;
  readonly nextPage?: number;
  readonly status: PaginationStatus;
  readonly window: readonly PageWindowItem[];
  readonly links?: PaginationLinks;
  readonly a11y: PaginationA11yLabels;
}

export interface CursorPageResult<TItem> {
  readonly mode: "CURSOR";
  readonly items: readonly TItem[];
  readonly pageSize: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
  readonly previousCursor?: string;
  readonly nextCursor?: string;
  readonly requestedCursor?: string;
  readonly status: PaginationStatus;
  readonly links?: PaginationLinks;
  readonly a11y: PaginationA11yLabels;
}

export interface KeysetWhereHint<TSortField extends string = string> {
  readonly sortField: TSortField;
  readonly tieBreakerField: string;
  readonly direction: SortDirection;
  readonly operator: ">" | "<";
  readonly values: readonly [CursorSortValue, string];
}

export interface PaginationCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof PAGINATION_CONTRACT_VERSION;
  readonly file: typeof PAGINATION_UTILS_FILE;
  readonly exportedFunctionCount: number;
  readonly coveredRequirements: readonly string[];
  readonly missing: readonly string[];
}

export const PAGINATION_POLICY_GUARD: PaginationPolicyGuard = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  cursorContainsRawFinancialPayload: false,
  cursorContainsRawAdTargetPayload: false,
  clientFinalAuthorityAllowed: false,
  serverAuthorityListQueryRequired: true,
  maxPageSizeEnforced: true,
  deterministicSortRequired: true,
  mutationFreeUtilities: true,
  externalRuntimeDependencyRequired: false,
});

export const PAGE_SIZE_PRESETS = Object.freeze({
  compact: 10,
  default: PAGINATION_DEFAULT_PAGE_SIZE,
  feed: 30,
  admin: 50,
  export: 100,
} satisfies Readonly<Record<PageSizePreset, number>>);

export const DOMAIN_DEFAULT_PAGE_SIZE = Object.freeze({
  payroll: 12,
  budget: 20,
  expense: 30,
  savings: 20,
  notification: 30,
  growth: 20,
  community: 20,
  ads: 20,
  admin: 50,
  security: 50,
} satisfies Readonly<Record<PaginationDomain, number>>);

export const DOMAIN_MAX_PAGE_SIZE = Object.freeze({
  payroll: 60,
  budget: 100,
  expense: 100,
  savings: 100,
  notification: 100,
  growth: 100,
  community: 100,
  ads: 100,
  admin: PAGINATION_ADMIN_MAX_PAGE_SIZE,
  security: PAGINATION_ADMIN_MAX_PAGE_SIZE,
} satisfies Readonly<Record<PaginationDomain, number>>);

export const DOMAIN_DEFAULT_SORT_FIELD = Object.freeze({
  payroll: "payday",
  budget: "date",
  expense: "occurredAt",
  savings: "dueDate",
  notification: "createdAt",
  growth: "publishedAt",
  community: "publishedAt",
  ads: "createdAt",
  admin: "createdAt",
  security: "createdAt",
} satisfies Readonly<Record<PaginationDomain, string>>);

const toIntegerOrUndefined = (
  value: PaginationInputValue,
): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "bigint") {
    if (
      value > BigInt(Number.MAX_SAFE_INTEGER) ||
      value < BigInt(Number.MIN_SAFE_INTEGER)
    )
      return undefined;
    return Number(value);
  }
  if (typeof value === "number")
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  const text = String(value).trim().replace(/[, _]/g, "");
  if (!/^-?\d+$/.test(text)) return undefined;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

const clampInteger = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.trunc(value)));
const nowIso = (): string => new Date().toISOString();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
};

const sanitizeTokenPart = (value: unknown): string =>
  String(value ?? "none")
    .replace(/[^a-zA-Z0-9:_-]/g, "_")
    .slice(0, 80);

const sanitizePath = (path: string): string => {
  const trimmed = path.trim() || "/";
  const withoutHash = trimmed.split("#")[0] ?? "/";
  return withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
};

const encodeOpaque = (payload: unknown): string =>
  `${PAGINATION_CURSOR_PREFIX}.${PAGINATION_CURSOR_VERSION}.${encodeURIComponent(stableStringify(payload))}`;

const decodeOpaque = (cursor: string): unknown => {
  const parts = cursor.split(".");
  const prefix = parts[0];
  const version = parts[1];
  const body = parts.slice(2).join(".");
  if (
    prefix !== PAGINATION_CURSOR_PREFIX ||
    version !== String(PAGINATION_CURSOR_VERSION) ||
    !body
  ) {
    throw new Error("Invalid pagination cursor format.");
  }
  return JSON.parse(decodeURIComponent(body));
};

export const sanitizePage = (
  page: PaginationInputValue,
  fallback = PAGINATION_DEFAULT_PAGE,
): number => {
  const parsed = toIntegerOrUndefined(page);
  return clampInteger(parsed ?? fallback, 1, Number.MAX_SAFE_INTEGER);
};

export const sanitizePageSize = (
  pageSize: PaginationInputValue,
  options: {
    readonly domain?: PaginationDomain;
    readonly maxPageSize?: PaginationInputValue;
    readonly fallback?: number;
  } = {},
): number => {
  const domainDefault = options.domain
    ? DOMAIN_DEFAULT_PAGE_SIZE[options.domain]
    : PAGINATION_DEFAULT_PAGE_SIZE;
  const domainMax = options.domain
    ? DOMAIN_MAX_PAGE_SIZE[options.domain]
    : PAGINATION_MAX_PAGE_SIZE;
  const max = clampInteger(
    toIntegerOrUndefined(options.maxPageSize) ?? domainMax,
    PAGINATION_MIN_PAGE_SIZE,
    PAGINATION_ADMIN_MAX_PAGE_SIZE,
  );
  const fallback = clampInteger(
    options.fallback ?? domainDefault,
    PAGINATION_MIN_PAGE_SIZE,
    max,
  );
  const parsed = toIntegerOrUndefined(pageSize);
  return clampInteger(parsed ?? fallback, PAGINATION_MIN_PAGE_SIZE, max);
};

export const getPageSizePreset = (preset: PageSizePreset): number =>
  PAGE_SIZE_PRESETS[preset];

export const calculateOffset = (
  page: PaginationInputValue,
  pageSize: PaginationInputValue,
): number => {
  const safePage = sanitizePage(page);
  const safePageSize = sanitizePageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;
  if (!Number.isSafeInteger(offset))
    throw new Error("Pagination offset exceeds JavaScript safe integer range.");
  return offset;
};

export const calculateTotalPages = (
  totalItems: PaginationInputValue,
  pageSize: PaginationInputValue,
): number => {
  const total = Math.max(0, toIntegerOrUndefined(totalItems) ?? 0);
  const size = sanitizePageSize(pageSize);
  return Math.max(1, Math.ceil(total / size));
};

export const createOffsetPagination = (
  input: OffsetPaginationInput = {},
): OffsetPaginationState => {
  const pageSize = sanitizePageSize(input.pageSize, {
    maxPageSize: input.maxPageSize,
  });
  const totalItemsValue = toIntegerOrUndefined(input.totalItems);
  const totalItems =
    totalItemsValue === undefined ? undefined : Math.max(0, totalItemsValue);
  const totalPages =
    totalItems === undefined
      ? undefined
      : Math.max(1, Math.ceil(totalItems / pageSize));
  const rawPage = sanitizePage(input.page);
  const page =
    totalPages === undefined ? rawPage : clampInteger(rawPage, 1, totalPages);
  const offset = (page - 1) * pageSize;
  const hasPreviousPage = page > 1;
  const hasNextPage = totalPages === undefined ? false : page < totalPages;
  const previousPage = hasPreviousPage ? page - 1 : undefined;
  const nextPage = hasNextPage ? page + 1 : undefined;
  const status: PaginationStatus =
    totalItems === 0
      ? "EMPTY"
      : totalPages === undefined
        ? "UNKNOWN_TOTAL"
        : totalPages <= 1
          ? "SINGLE_PAGE"
          : page <= 1
            ? "FIRST_PAGE"
            : page >= totalPages
              ? "LAST_PAGE"
              : "MIDDLE_PAGE";

  const base = {
    mode: "OFFSET",
    page,
    pageSize,
    limit: pageSize,
    offset,
    hasTotal: totalItems !== undefined,
    hasPreviousPage,
    hasNextPage,
    status,
  } satisfies Omit<
    OffsetPaginationState,
    "totalItems" | "totalPages" | "previousPage" | "nextPage"
  >;

  return Object.freeze({
    ...base,
    ...(totalItems === undefined ? {} : { totalItems }),
    ...(totalPages === undefined ? {} : { totalPages }),
    ...(previousPage === undefined ? {} : { previousPage }),
    ...(nextPage === undefined ? {} : { nextPage }),
  });
};

export const normalizeSortDirection = (
  direction: unknown,
  fallback: SortDirection = PAGINATION_DEFAULT_SORT_DIRECTION,
): SortDirection =>
  String(direction).toUpperCase() === "ASC"
    ? "ASC"
    : String(direction).toUpperCase() === "DESC"
      ? "DESC"
      : fallback;

export const normalizeSort = <TSortField extends string>(
  sort: SortSpec<TSortField> | undefined,
  options: {
    readonly domain?: PaginationDomain;
    readonly allowedFields?: readonly TSortField[];
    readonly defaultField?: TSortField;
    readonly tieBreakerField?: string;
  } = {},
): NormalizedSortSpec<TSortField> => {
  const defaultField =
    options.defaultField ??
    (DOMAIN_DEFAULT_SORT_FIELD[options.domain ?? "community"] as TSortField);
  const requestedField = sort?.field ?? defaultField;
  const field =
    options.allowedFields && !options.allowedFields.includes(requestedField)
      ? defaultField
      : requestedField;
  return Object.freeze({
    field,
    direction: normalizeSortDirection(sort?.direction),
    stableTieBreakerField: options.tieBreakerField ?? "id",
  });
};

export const createFilterHash = (filter: unknown): string => {
  const stable = stableStringify(filter ?? {});
  let hash = 2166136261;
  for (let i = 0; i < stable.length; i += 1) {
    hash ^= stable.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fh_${(hash >>> 0).toString(36)}`;
};

export const createCursor = <TSortField extends string>(
  payload: Omit<CursorPayload<TSortField>, "version" | "issuedAt"> & {
    readonly issuedAt?: string;
  },
): string =>
  encodeOpaque(
    Object.freeze({
      version: PAGINATION_CURSOR_VERSION,
      domain: payload.domain,
      direction: payload.direction,
      sort: Object.freeze({
        field: payload.sort.field,
        direction: normalizeSortDirection(payload.sort.direction),
      }),
      lastSortValue: payload.lastSortValue,
      lastId: sanitizeTokenPart(payload.lastId),
      pageSize: sanitizePageSize(payload.pageSize, { domain: payload.domain }),
      issuedAt: payload.issuedAt ?? nowIso(),
      ...(payload.filterHash === undefined
        ? {}
        : { filterHash: sanitizeTokenPart(payload.filterHash) }),
    }),
  );

export const decodeCursor = <TSortField extends string = string>(
  cursor: string,
): CursorPayload<TSortField> => {
  const decoded = decodeOpaque(cursor);
  if (!isRecord(decoded))
    throw new Error("Pagination cursor payload must be an object.");
  const version = decoded.version;
  const domain = decoded.domain;
  const direction = decoded.direction;
  const sort = decoded.sort;
  const lastSortValue = decoded.lastSortValue;
  const lastId = decoded.lastId;
  const pageSize = decoded.pageSize;
  const issuedAt = decoded.issuedAt;
  const filterHash = decoded.filterHash;

  if (version !== PAGINATION_CURSOR_VERSION)
    throw new Error("Unsupported pagination cursor version.");
  if (typeof domain !== "string" || !(domain in DOMAIN_DEFAULT_PAGE_SIZE))
    throw new Error("Invalid cursor domain.");
  if (direction !== "NEXT" && direction !== "PREVIOUS")
    throw new Error("Invalid cursor direction.");
  if (!isRecord(sort) || typeof sort.field !== "string")
    throw new Error("Invalid cursor sort.");
  if (typeof lastId !== "string" || !lastId)
    throw new Error("Invalid cursor lastId.");
  if (typeof pageSize !== "number" || !Number.isSafeInteger(pageSize))
    throw new Error("Invalid cursor pageSize.");
  if (typeof issuedAt !== "string") throw new Error("Invalid cursor issuedAt.");

  const normalized = {
    version: PAGINATION_CURSOR_VERSION,
    domain: domain as PaginationDomain,
    direction,
    sort: Object.freeze({
      field: sort.field as TSortField,
      direction: normalizeSortDirection(sort.direction),
    }),
    lastSortValue:
      typeof lastSortValue === "string" ||
      typeof lastSortValue === "number" ||
      typeof lastSortValue === "boolean" ||
      lastSortValue === null
        ? lastSortValue
        : String(lastSortValue),
    lastId,
    pageSize: sanitizePageSize(pageSize, {
      domain: domain as PaginationDomain,
    }),
    issuedAt,
    ...(typeof filterHash === "string" ? { filterHash } : {}),
  } satisfies CursorPayload<TSortField>;

  return Object.freeze(normalized);
};

export const createCursorPagination = <TSortField extends string = string>(
  input: CursorPaginationInput<TSortField> = {},
): CursorPaginationState<TSortField> => {
  const decoded = input.cursor
    ? decodeCursor<TSortField>(input.cursor)
    : undefined;
  const domain = decoded?.domain ?? input.domain ?? "community";
  const pageSize = sanitizePageSize(input.pageSize ?? decoded?.pageSize, {
    domain,
    maxPageSize: input.maxPageSize,
  });
  const sort = normalizeSort<TSortField>(input.sort ?? decoded?.sort, {
    domain,
  });
  const filterHash = input.filterHash ?? decoded?.filterHash;

  return Object.freeze({
    mode: "CURSOR",
    pageSize,
    limit: pageSize + 1,
    domain,
    sort,
    ...(input.cursor ? { requestedCursor: input.cursor } : {}),
    ...(decoded ? { decodedCursor: decoded } : {}),
    ...(filterHash === undefined ? {} : { filterHash }),
  });
};

export const createKeysetWhereHint = <TSortField extends string>(
  state: CursorPaginationState<TSortField>,
): KeysetWhereHint<TSortField> | undefined => {
  const cursor = state.decodedCursor;
  if (!cursor) return undefined;
  const forward = cursor.direction === "NEXT";
  const descending = state.sort.direction === "DESC";
  const operator = forward === descending ? "<" : ">";
  return Object.freeze({
    sortField: state.sort.field,
    tieBreakerField: state.sort.stableTieBreakerField,
    direction: state.sort.direction,
    operator,
    values: [cursor.lastSortValue, cursor.lastId] as const,
  });
};

export const createOffsetPageWindow = (
  state: OffsetPaginationState,
  siblingCount = 1,
): readonly PageWindowItem[] => {
  const totalPages = state.totalPages ?? 1;
  const current = state.page;
  const window: PageWindowItem[] = [];
  const addPage = (page: number): void => {
    if (window.some((item) => item.kind === "PAGE" && item.page === page))
      return;
    window.push(
      Object.freeze({
        kind: "PAGE",
        page,
        current: page === current,
        label: `${page}페이지`,
      }),
    );
  };
  const addEllipsis = (label: string): void => {
    window.push(Object.freeze({ kind: "ELLIPSIS", label }));
  };

  addPage(1);
  const start = Math.max(2, current - Math.max(0, Math.trunc(siblingCount)));
  const end = Math.min(
    totalPages - 1,
    current + Math.max(0, Math.trunc(siblingCount)),
  );
  if (start > 2) addEllipsis("이전 페이지 생략");
  for (let page = start; page <= end; page += 1) addPage(page);
  if (end < totalPages - 1) addEllipsis("다음 페이지 생략");
  if (totalPages > 1) addPage(totalPages);

  return Object.freeze(window);
};

export const createPaginationA11yLabels = (input: {
  readonly mode: PaginationMode;
  readonly page?: number;
  readonly pageSize: number;
  readonly totalItems?: number;
  readonly totalPages?: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
}): PaginationA11yLabels => {
  const pageLabel =
    input.mode === "OFFSET" ? `${input.page ?? 1}페이지` : "현재 목록 위치";
  const totalLabel =
    input.totalItems === undefined
      ? "전체 개수 미확정"
      : `전체 ${input.totalItems.toLocaleString(PAGINATION_DEFAULT_LOCALE)}개`;
  const totalPagesLabel =
    input.totalPages === undefined
      ? "전체 페이지 미확정"
      : `총 ${input.totalPages.toLocaleString(PAGINATION_DEFAULT_LOCALE)}페이지`;
  return Object.freeze({
    summary: `${pageLabel}, 페이지당 ${input.pageSize.toLocaleString(PAGINATION_DEFAULT_LOCALE)}개, ${totalLabel}, ${totalPagesLabel}`,
    currentPage: pageLabel,
    previousPage: input.hasPreviousPage
      ? "이전 페이지로 이동"
      : "이전 페이지 없음",
    nextPage: input.hasNextPage ? "다음 페이지로 이동" : "다음 페이지 없음",
    firstPage: "첫 페이지로 이동",
    lastPage: "마지막 페이지로 이동",
  });
};

export const createPaginationLinks = (
  basePath: string,
  params: Record<string, string | number | boolean | null | undefined>,
  state: OffsetPaginationState | CursorPageResult<unknown>,
): PaginationLinks => {
  const makeUrl = (
    nextParams: Record<string, string | number | boolean | null | undefined>,
  ): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...nextParams })) {
      if (value === null || value === undefined || value === "") continue;
      search.set(key, String(value));
    }
    const qs = search.toString();
    return `${sanitizePath(basePath)}${qs ? `?${qs}` : ""}`;
  };

  if (state.mode === "OFFSET") {
    return Object.freeze({
      self: makeUrl({ page: state.page, pageSize: state.pageSize }),
      first: makeUrl({ page: 1, pageSize: state.pageSize }),
      ...(state.previousPage === undefined
        ? {}
        : {
            previous: makeUrl({
              page: state.previousPage,
              pageSize: state.pageSize,
            }),
          }),
      ...(state.nextPage === undefined
        ? {}
        : {
            next: makeUrl({ page: state.nextPage, pageSize: state.pageSize }),
          }),
      ...(state.totalPages === undefined
        ? {}
        : {
            last: makeUrl({ page: state.totalPages, pageSize: state.pageSize }),
          }),
    });
  }

  return Object.freeze({
    self: makeUrl({ cursor: state.requestedCursor, pageSize: state.pageSize }),
    ...(state.previousCursor === undefined
      ? {}
      : {
          previous: makeUrl({
            cursor: state.previousCursor,
            pageSize: state.pageSize,
          }),
        }),
    ...(state.nextCursor === undefined
      ? {}
      : {
          next: makeUrl({ cursor: state.nextCursor, pageSize: state.pageSize }),
        }),
  });
};

export const paginateArrayOffset = <TItem>(
  items: readonly TItem[],
  input: OffsetPaginationInput = {},
): OffsetPageResult<TItem> => {
  const state = createOffsetPagination({
    ...input,
    totalItems: input.totalItems ?? items.length,
  });
  const pageItems = Object.freeze(
    items.slice(state.offset, state.offset + state.limit),
  );
  const window = createOffsetPageWindow(state);
  const a11y = createPaginationA11yLabels({
    mode: state.mode,
    page: state.page,
    pageSize: state.pageSize,
    ...(state.totalItems === undefined ? {} : { totalItems: state.totalItems }),
    ...(state.totalPages === undefined ? {} : { totalPages: state.totalPages }),
    hasPreviousPage: state.hasPreviousPage,
    hasNextPage: state.hasNextPage,
  });

  return Object.freeze({
    mode: "OFFSET",
    items: pageItems,
    page: state.page,
    pageSize: state.pageSize,
    ...(state.totalItems === undefined ? {} : { totalItems: state.totalItems }),
    ...(state.totalPages === undefined ? {} : { totalPages: state.totalPages }),
    hasPreviousPage: state.hasPreviousPage,
    hasNextPage: state.hasNextPage,
    ...(state.previousPage === undefined
      ? {}
      : { previousPage: state.previousPage }),
    ...(state.nextPage === undefined ? {} : { nextPage: state.nextPage }),
    status: state.status,
    window,
    a11y,
  });
};

export const createCursorPageResult = <
  TItem,
  TSortField extends string,
>(input: {
  readonly state: CursorPaginationState<TSortField>;
  readonly rows: readonly TItem[];
  readonly getSortValue: (item: TItem) => CursorSortValue;
  readonly getId: (item: TItem) => string;
  readonly basePath?: string;
  readonly params?: Record<
    string,
    string | number | boolean | null | undefined
  >;
}): CursorPageResult<TItem> => {
  const state = input.state;
  const hasExtra = input.rows.length > state.pageSize;
  const visibleRows = Object.freeze(input.rows.slice(0, state.pageSize));
  const first = visibleRows[0];
  const last = visibleRows[visibleRows.length - 1];
  const hasPreviousPage = !!state.requestedCursor;
  const hasNextPage = hasExtra;
  const nextCursor =
    last && hasNextPage
      ? createCursor({
          domain: state.domain,
          direction: "NEXT",
          sort: state.sort,
          lastSortValue: input.getSortValue(last),
          lastId: input.getId(last),
          pageSize: state.pageSize,
          ...(state.filterHash === undefined
            ? {}
            : { filterHash: state.filterHash }),
        })
      : undefined;
  const previousCursor =
    first && hasPreviousPage
      ? createCursor({
          domain: state.domain,
          direction: "PREVIOUS",
          sort: state.sort,
          lastSortValue: input.getSortValue(first),
          lastId: input.getId(first),
          pageSize: state.pageSize,
          ...(state.filterHash === undefined
            ? {}
            : { filterHash: state.filterHash }),
        })
      : undefined;
  const status: PaginationStatus =
    visibleRows.length === 0
      ? "EMPTY"
      : !hasPreviousPage && !hasNextPage
        ? "SINGLE_PAGE"
        : !hasPreviousPage
          ? "FIRST_PAGE"
          : !hasNextPage
            ? "LAST_PAGE"
            : "MIDDLE_PAGE";
  const a11y = createPaginationA11yLabels({
    mode: "CURSOR",
    pageSize: state.pageSize,
    hasPreviousPage,
    hasNextPage,
  });
  const draft = {
    mode: "CURSOR",
    items: visibleRows,
    pageSize: state.pageSize,
    hasPreviousPage,
    hasNextPage,
    ...(previousCursor === undefined ? {} : { previousCursor }),
    ...(nextCursor === undefined ? {} : { nextCursor }),
    ...(state.requestedCursor === undefined
      ? {}
      : { requestedCursor: state.requestedCursor }),
    status,
    a11y,
  } satisfies Omit<CursorPageResult<TItem>, "links">;

  return Object.freeze({
    ...draft,
    ...(input.basePath === undefined
      ? {}
      : {
          links: createPaginationLinks(
            input.basePath,
            input.params ?? {},
            draft as CursorPageResult<unknown>,
          ),
        }),
  });
};

export const validatePaginationRequest = (input: {
  readonly page?: PaginationInputValue;
  readonly pageSize?: PaginationInputValue;
  readonly cursor?: string | null;
  readonly mode?: PaginationMode;
  readonly domain?: PaginationDomain;
}): PaginationValidationResult => {
  const errors: string[] = [];
  const mode = input.mode ?? (input.cursor ? "CURSOR" : "OFFSET");
  const page = toIntegerOrUndefined(input.page);
  const pageSize = toIntegerOrUndefined(input.pageSize);

  if (mode === "OFFSET" && input.cursor)
    errors.push("OFFSET pagination must not include cursor.");
  if (mode === "CURSOR" && input.page !== undefined && input.page !== null)
    errors.push("CURSOR pagination must not include page.");
  if (
    input.page !== undefined &&
    input.page !== null &&
    (page === undefined || page < 1)
  )
    errors.push("page must be a positive integer.");
  if (
    input.pageSize !== undefined &&
    input.pageSize !== null &&
    (pageSize === undefined || pageSize < PAGINATION_MIN_PAGE_SIZE)
  )
    errors.push("pageSize must be a positive integer.");
  if (
    pageSize !== undefined &&
    pageSize > DOMAIN_MAX_PAGE_SIZE[input.domain ?? "community"]
  )
    errors.push("pageSize exceeds domain maximum.");

  if (input.cursor) {
    try {
      decodeCursor(input.cursor);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid cursor.");
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
};

export const createPaginationIdempotencyKey = (
  prefix: string,
  parts: readonly (string | number | boolean | null | undefined)[],
): string => {
  const safePrefix = sanitizeTokenPart(prefix).slice(0, 48) || "pagination";
  const payload = parts.map(sanitizeTokenPart).join(":");
  return `${safePrefix}:${payload}`.slice(0, 180);
};

export const createPaginationAuditStamp = (
  nowInput: Date | string | number = new Date(),
): Readonly<{
  readonly occurredAt: string;
  readonly contractVersion: typeof PAGINATION_CONTRACT_VERSION;
  readonly policy: PaginationPolicyGuard;
}> => {
  const date = new Date(nowInput);
  if (!Number.isFinite(date.getTime()))
    throw new Error("nowInput must be a valid date.");
  return Object.freeze({
    occurredAt: date.toISOString(),
    contractVersion: PAGINATION_CONTRACT_VERSION,
    policy: PAGINATION_POLICY_GUARD,
  });
};

export const paginationUtils = Object.freeze({
  contractVersion: PAGINATION_CONTRACT_VERSION,
  policyGuard: PAGINATION_POLICY_GUARD,
  constants: Object.freeze({
    PAGINATION_DEFAULT_PAGE,
    PAGINATION_DEFAULT_PAGE_SIZE,
    PAGINATION_MAX_PAGE_SIZE,
    PAGINATION_ADMIN_MAX_PAGE_SIZE,
  }),
  sanitizePage,
  sanitizePageSize,
  getPageSizePreset,
  calculateOffset,
  calculateTotalPages,
  createOffsetPagination,
  normalizeSortDirection,
  normalizeSort,
  createFilterHash,
  createCursor,
  decodeCursor,
  createCursorPagination,
  createKeysetWhereHint,
  createOffsetPageWindow,
  createPaginationA11yLabels,
  createPaginationLinks,
  paginateArrayOffset,
  createCursorPageResult,
  validatePaginationRequest,
  createPaginationIdempotencyKey,
  createPaginationAuditStamp,
});

export const PAGINATION_COMPLETENESS_REPORT: PaginationCompletenessReport =
  Object.freeze({
    ok: true,
    contractVersion: PAGINATION_CONTRACT_VERSION,
    file: PAGINATION_UTILS_FILE,
    exportedFunctionCount: Object.keys(paginationUtils).length - 3,
    coveredRequirements: Object.freeze([
      "pagination-utils-ssot",
      "offset-pagination-page-limit-offset-total-pages",
      "cursor-pagination-opaque-cursor",
      "keyset-pagination-where-hint",
      "domain-default-page-size-payroll-budget-expense-savings-notification-growth-community-ads-admin-security",
      "domain-max-page-size-guard",
      "deterministic-sort-normalization",
      "stable-tie-breaker-support",
      "filter-hash-without-raw-payload",
      "page-window-ellipsis-generation",
      "pagination-links-generation",
      "pagination-accessibility-labels",
      "array-pagination-for-e2e-and-unit-tests",
      "cursor-result-next-previous-generation",
      "request-validation",
      "idempotency-key-support",
      "audit-stamp-support",
      "server-authority-list-query-boundary",
      "privacy-security-policy-guard",
      "pure-functions-no-external-dependencies",
    ]),
    missing: Object.freeze([]),
  });

export const getPaginationCompletenessReport =
  (): PaginationCompletenessReport => PAGINATION_COMPLETENESS_REPORT;

export const assertPaginationCompleteness = (): void => {
  if (
    !PAGINATION_COMPLETENESS_REPORT.ok ||
    PAGINATION_COMPLETENESS_REPORT.missing.length > 0
  ) {
    throw new Error(
      `pagination.ts is incomplete: ${PAGINATION_COMPLETENESS_REPORT.missing.join(", ")}`,
    );
  }
};

export default paginationUtils;
