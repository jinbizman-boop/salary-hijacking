import { describe, expect, it } from "vitest";
import {
  createNeonAdminRepository,
  shouldUseNeonAdminRepository,
} from "../src/repositories/admin.repository";
import type { AdminRouteRuntime } from "../src/routes/admin.routes";

const adminId = "99999999-9999-4999-8999-999999999999";
const contentId = "44444444-4444-4444-8444-444444444444";

function createRuntime(path = "/admin/api/v1/growth/contents") {
  return {
    request: new Request(`https://api.test${path}`, {
      headers: { "x-admin-reason": "curated LV UP content operation" },
    }),
    env: { DATABASE_URL: "postgres://example.invalid/salary" },
    execution: {},
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/admin/api/v1", ""),
    method: "GET",
    requestId: "admin-growth-content-db",
    principal: {
      adminId,
      roles: ["ADM_CONTENT"],
      permissions: ["growth:read", "growth:manage"],
      mfaVerified: true,
      policyId: null,
    },
    repository: null,
  } as unknown as AdminRouteRuntime<{ readonly DATABASE_URL: string }>;
}

function contentRow(overrides: Record<string, unknown> = {}) {
  return {
    content_id: contentId,
    content_type: "READING",
    title: "Money habit reading",
    subtitle: "A short operator summary",
    category: "ECONOMY_BUSINESS",
    difficulty: "NORMAL",
    estimated_minutes: 12,
    topics: ["budget", "habit"],
    summary: "Operator-authored summary that never stores the full book text.",
    mission_prompt: "Write one action you will try today.",
    record_question: "What money habit did you notice?",
    source_title: "Money Habit",
    source_author: "Author Name",
    source_name: "Publisher",
    source_url: "https://publisher.example/books/money-habit",
    license_type: "CURATED_LINK",
    safety_level: "GENERAL",
    viewpoint_tag: null,
    exp_reward: 30,
    status: "PUBLISHED",
    review_required: true,
    full_text_stored: false,
    ad_targeting_separated: true,
    recommendation_uses_sensitive_financial_data: false,
    published_at: "2026-07-11T00:00:00.000Z",
    archived_at: null,
    created_at: "2026-07-10T00:00:00.000Z",
    updated_at: "2026-07-11T00:00:00.000Z",
    total_count: 1,
    ...overrides,
  };
}

describe("admin LV UP content DB repository", () => {
  it("selects the Neon admin repository only when a database URL is present", () => {
    expect(
      shouldUseNeonAdminRepository({ DATABASE_URL: "postgres://db" }),
    ).toBe(true);
    expect(shouldUseNeonAdminRepository({})).toBe(false);
  });

  it("lists LV UP content operations from growth_content_items without exposing admin identity", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonAdminRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [contentRow()], rowCount: 1 };
      },
    });

    const result = await repository.listGrowthContents(
      { contentType: "READING", status: "PUBLISHED" },
      { page: 1, pageSize: 20, offset: 0, limit: 20 },
      createRuntime(),
    );

    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [
        {
          contentId,
          contentType: "READING",
          sourceUrl: "https://publisher.example/books/money-habit",
          licenseType: "CURATED_LINK",
          safetyLevel: "GENERAL",
          fullTextStored: false,
          adTargetingSeparated: true,
          recommendationUsesSensitiveFinancialData: false,
          financialRawDataExposed: false,
          serverAuthority: true,
          auditReasonRequired: true,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(adminId);
    expect(calls[0]?.operationName).toBe("admin.listGrowthContents");
    expect(calls[0]?.sqlText).toContain("public.growth_content_items");
    expect(calls[0]?.params).toContain("READING");
    expect(calls[0]?.params).toContain("PUBLISHED");
  });

  it("creates curated LV UP content with source, license, safety, and no full-text storage", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonAdminRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [contentRow({ status: "DRAFT" })], rowCount: 1 };
      },
    });

    const result = await repository.createGrowthContent(
      {
        contentType: "READING",
        title: "Money habit reading",
        category: "ECONOMY_BUSINESS",
        difficulty: "NORMAL",
        estimatedMinutes: 12,
        topics: ["budget", "habit"],
        summary: "Operator-authored summary that never stores full text.",
        missionPrompt: "Write one action you will try today.",
        recordQuestion: "What money habit did you notice?",
        sourceTitle: "Money Habit",
        sourceAuthor: "Author Name",
        sourceName: "Publisher",
        sourceUrl: "https://publisher.example/books/money-habit",
        licenseType: "CURATED_LINK",
        safetyLevel: "GENERAL",
        xpReward: 30,
      },
      createRuntime(),
    );

    expect(result).toMatchObject({
      contentId,
      status: "DRAFT",
      fullTextStored: false,
      adTargetingSeparated: true,
      financialRawDataExposed: false,
    });
    expect(calls[0]?.operationName).toBe("admin.createGrowthContent");
    expect(calls[0]?.sqlText).toContain(
      "insert into public.growth_content_items",
    );
    expect(calls[0]?.params).toContain(false);
    expect(calls[0]?.params).toContain(true);
  });

  it("publishes and archives LV UP content through status updates", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonAdminRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        const status = options.operationName.includes("archive")
          ? "ARCHIVED"
          : "PUBLISHED";
        return { rows: [contentRow({ status })], rowCount: 1 };
      },
    });

    await repository.publishGrowthContent(
      contentId,
      {
        contentType: "READING",
        sourceUrl: "https://publisher.example/books/money-habit",
        licenseType: "CURATED_LINK",
        safetyLevel: "GENERAL",
      },
      createRuntime(`/admin/api/v1/growth/contents/${contentId}/publish`),
    );
    await repository.archiveGrowthContent(
      contentId,
      {},
      createRuntime(`/admin/api/v1/growth/contents/${contentId}/archive`),
    );

    expect(calls.map((call) => call.operationName)).toEqual([
      "admin.publishGrowthContent",
      "admin.archiveGrowthContent",
    ]);
    expect(calls[0]?.sqlText).toContain("status = 'PUBLISHED'");
    expect(calls[1]?.sqlText).toContain("status = 'ARCHIVED'");
    expect(calls[0]?.params).toContain(contentId);
  });
});
