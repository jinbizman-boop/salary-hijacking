import { describe, expect, it } from "vitest";
import {
  createNeonCommunityRepository,
  shouldUseNeonCommunityRepository,
} from "../src/repositories/community.repository";
import type {
  CommunityPostInput,
  CommunityRouteRuntime,
} from "../src/routes/community.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const postId = "22222222-2222-4222-8222-222222222222";
const commentId = "33333333-3333-4333-8333-333333333333";

function createRuntime(
  path = "/api/v1/community/posts",
): CommunityRouteRuntime<unknown> {
  return {
    request: new Request(`https://api.test${path}`, {
      headers: { "x-idempotency-key": "community-test-idempotency-key" },
    }),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/api/v1/community", "") || "/",
    method: "POST",
    requestId: "community-db-repository-test",
    now: new Date("2026-07-02T03:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      authenticated: true,
      policyId: null,
    },
    repository: {} as never,
  };
}

const createPostInput: CommunityPostInput = {
  boardType: "LEVEL_CERTIFICATION",
  title: "퇴근 후 홈트 인증",
  content: "민감 정보 없이 레벨업 인증합니다.",
  tags: ["레벨업", "홈트"],
  anonymous: true,
};

describe("Neon community repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonCommunityRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonCommunityRepository({ APP_ENV: "test" })).toBe(false);
  });

  it("creates a DB-backed community post without returning owner identifiers", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonCommunityRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName === "community.createPost") {
          return {
            rows: [
              {
                post_id: postId,
                board_type: "level_up_proof",
                title: createPostInput.title,
                body: createPostInput.content,
                author_display_name_snapshot: "익명 사용자",
                is_anonymous: true,
                status: "published",
                like_count: "0",
                comment_count: "0",
                bookmark_count: "0",
                report_count: "0",
                view_count: "0",
                metadata: { tags: createPostInput.tags },
                published_at: "2026-07-02T03:00:00.000Z",
                created_at: "2026-07-02T03:00:00.000Z",
                updated_at: "2026-07-02T03:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const created = await repository.createPost(
      createPostInput,
      createRuntime(),
    );

    expect(created).toMatchObject({
      postId,
      boardType: "LEVEL_CERTIFICATION",
      title: createPostInput.title,
      content: createPostInput.content,
      tags: "레벨업,홈트",
      authorMasked: "익명 사용자",
      anonymous: true,
      status: "VISIBLE",
      likeCount: 0,
      commentCount: 0,
      serverAuthority: true,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("ownerUserId");
    expect(JSON.stringify(created)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "community.createPost",
    ]);
    expect(calls[0]?.sqlText).toContain("insert into public.community_posts");
    expect(calls[0]?.sqlText).toContain("public.community_boards");
    expect(calls[0]?.params).toContain(userId);
  });

  it("creates a DB-backed community comment and leaves the count update on the server", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonCommunityRepository({
      query: async (sqlText, params, options) => {
        calls.push({
          operationName: options.operationName,
          sqlText,
          params,
        });
        if (options.operationName === "community.createComment") {
          return {
            rows: [
              {
                comment_id: commentId,
                post_id: postId,
                body: "댓글도 민감 정보 없이 남깁니다.",
                author_display_name_snapshot: "익명 사용자",
                is_anonymous: true,
                status: "published",
                like_count: "0",
                report_count: "0",
                published_at: "2026-07-02T03:00:00.000Z",
                created_at: "2026-07-02T03:00:00.000Z",
                updated_at: "2026-07-02T03:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const created = await repository.createComment(
      postId,
      { content: "댓글도 민감 정보 없이 남깁니다.", anonymous: true },
      createRuntime(`/api/v1/community/posts/${postId}/comments`),
    );

    expect(created).toMatchObject({
      commentId,
      postId,
      authorMasked: "익명 사용자",
      anonymous: true,
      content: "댓글도 민감 정보 없이 남깁니다.",
      status: "VISIBLE",
      serverAuthority: true,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("ownerUserId");
    expect(JSON.stringify(created)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "community.createComment",
    ]);
    expect(calls[0]?.sqlText).toContain(
      "insert into public.community_comments",
    );
    expect(calls[0]?.sqlText).toContain("update public.community_posts");
    expect(calls[0]?.params).toContain(userId);
  });
});
