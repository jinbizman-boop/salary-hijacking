import { describe, expect, it } from "vitest";
import {
  createNeonUsersRepository,
  shouldUseNeonUsersRepository,
} from "../src/repositories/users.repository";
import type { UsersRouteRuntime } from "../src/routes/users.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";

function createRuntime(): UsersRouteRuntime<unknown> {
  return {
    request: new Request("https://api.test/api/v1/users/me/support-tickets"),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/users/me/support-tickets"),
    path: "/api/v1/users/me/support-tickets",
    relativePath: "/me/support-tickets",
    method: "POST",
    requestId: "users-support-ticket-db-repository-test",
    now: new Date("2026-07-03T06:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

describe("Neon users support ticket repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonUsersRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonUsersRepository({ APP_ENV: "test" })).toBe(false);
  });

  it("stores mobile support tickets without echoing owner ids, message body, or raw sensitive data", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUsersRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              ads_financial_targeting_used: false,
              category: "ACCOUNT",
              created_at: "2026-07-03T06:00:00.000Z",
              raw_financial_data_exposed: false,
              raw_personal_data_exposed: false,
              raw_push_token_exposed: false,
              status: "OPEN",
              subject: "로그인 도움이 필요해요",
              ticket_id: ticketId,
              user_id: userId,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.createSupportTicket(
      {
        category: "ACCOUNT",
        message: "계정 설정 화면에서 로그인 상태를 확인하고 싶어요.",
        subject: "로그인 도움이 필요해요",
      },
      createRuntime(),
    );

    expect(result).toMatchObject({
      adsFinancialTargetingUsed: false,
      category: "ACCOUNT",
      createdAt: "2026-07-03T06:00:00.000Z",
      id: ticketId,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      status: "OPEN",
      subject: "로그인 도움이 필요해요",
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(JSON.stringify(result)).not.toContain("계정 설정 화면");
    expect(calls.map((call) => call.operationName)).toEqual([
      "users.createSupportTicket",
    ]);
    expect(calls[0]?.sqlText).toContain(
      "insert into public.user_support_tickets",
    );
    expect(calls[0]?.params).toContain(userId);
    expect(calls[0]?.params).toContain(
      "계정 설정 화면에서 로그인 상태를 확인하고 싶어요.",
    );
  });
});
