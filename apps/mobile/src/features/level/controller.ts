import type {
  GrowthApiClient,
  GrowthContentCompleteResult,
  GrowthContentItem,
  GrowthContentType,
  GrowthDashboard,
  GrowthSummary,
} from "./types";
import type {
  GrowthGoalDomain,
  GrowthGoalSaveRequest,
  GrowthGoalSaveResult,
} from "./goal-architecture";

export type GrowthCompletionUiResult = Readonly<{
  completedAt: string;
  contentId: string;
  expDelta: number;
  idempotentReplay: boolean;
  source: "server";
}>;

export async function loadGrowthDashboardSnapshot(
  api: GrowthApiClient,
): Promise<GrowthDashboard> {
  return api.getDashboard();
}

export async function loadGrowthSummarySnapshot(
  api: GrowthApiClient,
  options?: Parameters<GrowthApiClient["getSummary"]>[0],
): Promise<GrowthSummary> {
  return api.getSummary(options);
}

export async function loadGrowthContentForType(
  api: GrowthApiClient,
  contentType: GrowthContentType,
): Promise<GrowthContentItem | null> {
  const result = await api.listContents({
    contentType,
    page: 1,
    pageSize: 10,
  });
  return result.items[0] ?? null;
}

export async function completeGrowthContentWithServerAuthority(
  api: GrowthApiClient,
  content: GrowthContentItem,
  note: string | null,
): Promise<GrowthCompletionUiResult> {
  return completionResultFromApi(
    await api.completeContent({
      contentId: content.contentId,
      idempotencyKey: growthContentIdempotencyKey(content.contentId),
      note,
    }),
  );
}

export async function updateGrowthGoalWithServerAuthority(
  api: GrowthApiClient,
  domain: GrowthGoalDomain,
  request: GrowthGoalSaveRequest,
): Promise<GrowthGoalSaveResult> {
  return api.updateGoal(domain, request);
}

function completionResultFromApi(
  result: GrowthContentCompleteResult,
): GrowthCompletionUiResult {
  return {
    completedAt: result.completion.completedAt,
    contentId: result.completion.contentId,
    expDelta: result.completion.expDelta,
    idempotentReplay: result.idempotentReplay,
    source: "server",
  };
}

function growthContentIdempotencyKey(contentId: string): string {
  const entropy =
    globalThis.crypto?.randomUUID?.().replace(/-/gu, "") ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `growth-content-${safeIdempotencyPart(contentId)}-${safeIdempotencyPart(
    entropy,
  )}`;
}

function safeIdempotencyPart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^A-Za-z0-9_-]/gu, "-")
      .replace(/-+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 80) || "request"
  );
}
