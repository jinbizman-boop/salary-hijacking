import { createPlanCommitmentsApi } from "../api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("plan commitments api", () => {
  it("hydrates fixed expense and savings commitments through server-authoritative APIs", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "plan-commitments-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        if (normalized.url.endsWith("/api/v1/fixed-expenses")) {
          return jsonResponse({
            data: {
              items: [
                {
                  expenseId: "expense_chatgpt",
                  title: "ChatGPT",
                  category: "SUBSCRIPTION",
                  amountMinor: 30_000,
                  frequency: "MONTHLY",
                  paymentDay: 20,
                  status: "ACTIVE",
                  serverAuthority: true,
                  financialRawDataExposed: false,
                },
                {
                  expenseId: "expense_mobile",
                  title: "통신비",
                  category: "UTILITY",
                  amountMinor: 70_000,
                  frequency: "MONTHLY",
                  paymentDay: 25,
                  status: "ACTIVE",
                  serverAuthority: true,
                  financialRawDataExposed: false,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 2,
            },
          });
        }

        return jsonResponse({
          data: {
            items: [
              {
                goalId: "goal_emergency",
                title: "비상금",
                goalType: "EMERGENCY_FUND",
                targetAmountMinor: 1_000_000,
                currentAmountMinor: 120_000,
                fixedSaveAmountMinor: 150_000,
                status: "ACTIVE",
                serverAuthority: true,
                financialRawAccountDataExposed: false,
              },
              {
                goalId: "goal_travel",
                title: "여행 준비",
                goalType: "CUSTOM",
                targetAmountMinor: 2_000_000,
                currentAmountMinor: 500_000,
                fixedSaveAmountMinor: 200_000,
                status: "ACTIVE",
                serverAuthority: true,
                financialRawAccountDataExposed: false,
              },
            ],
            page: 1,
            pageSize: 20,
            total: 2,
          },
        });
      },
      platform: "android",
    });

    const result = await api.getCommitments();

    expect(result).toMatchObject({
      fixedExpenseTotalMinor: 100_000,
      fixedSavingsTotalMinor: 350_000,
      serverAuthority: true,
      rawFinancialDataExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(result.fixedExpenses).toHaveLength(2);
    expect(result.savingsGoals).toHaveLength(2);
    expect(result.fixedExpenses[0]).toMatchObject({
      amountMinor: 30_000,
      dueLabel: "매월 20일",
      title: "ChatGPT",
    });
    expect(result.savingsGoals[0]).toMatchObject({
      fixedSaveAmountMinor: 150_000,
      title: "비상금",
    });
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.salaryhijacking.com/api/v1/fixed-expenses",
      "https://api.salaryhijacking.com/api/v1/savings",
    ]);

    for (const call of calls) {
      expect(call.headers.get("x-correlation-id")).toBe(
        "plan-commitments-test",
      );
      expect(call.headers.get("x-client-platform")).toBe("android");
      expect(call.headers.get("x-raw-financial-data-exposed")).toBe("false");
      expect(call.headers.get("x-raw-personal-data-exposed")).toBe("false");
      expect(call.headers.get("x-raw-push-token-exposed")).toBe("false");
      expect(call.headers.get("x-ad-financial-targeting-used")).toBe("false");
    }
    expect(JSON.stringify(result)).not.toContain("userId");
  });

  it("rejects unsafe financial exposure flags before the plan screen uses them", async () => {
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        if (normalized.url.endsWith("/api/v1/fixed-expenses")) {
          return jsonResponse({
            data: {
              items: [
                {
                  expenseId: "unsafe_expense",
                  title: "unsafe",
                  amountMinor: 10_000,
                  paymentDay: 1,
                  status: "ACTIVE",
                  serverAuthority: true,
                  financialRawDataExposed: true,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 1,
            },
          });
        }

        return jsonResponse({
          data: {
            items: [],
            page: 1,
            pageSize: 20,
            total: 0,
          },
        });
      },
      platform: "ios",
    });

    await expect(api.getCommitments()).rejects.toMatchObject({
      code: "PLAN_UNSAFE_FINANCIAL_EXPOSURE",
    });
  });

  it("rejects invalid fixed expense and savings goal ids returned by the server", async () => {
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        if (normalized.url.endsWith("/api/v1/fixed-expenses")) {
          return jsonResponse({
            data: {
              items: [
                {
                  expenseId: "../expense_chatgpt",
                  title: "ChatGPT",
                  category: "SUBSCRIPTION",
                  amountMinor: 30_000,
                  paymentDay: 20,
                  status: "ACTIVE",
                  serverAuthority: true,
                  financialRawDataExposed: false,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 1,
            },
          });
        }

        return jsonResponse({
          data: {
            items: [
              {
                goalId: "goal_emergency\r\nAuthorization",
                title: "Emergency fund",
                goalType: "EMERGENCY_FUND",
                targetAmountMinor: 1_000_000,
                currentAmountMinor: 120_000,
                fixedSaveAmountMinor: 150_000,
                status: "ACTIVE",
                serverAuthority: true,
                financialRawAccountDataExposed: false,
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      },
      platform: "android",
    });

    await expect(api.getCommitments()).rejects.toMatchObject({
      code: "PLAN_INVALID_RESPONSE",
    });
  });

  it("rejects raw sensitive fixed expense and savings response titles before display", async () => {
    const fixedExpenseApi = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        if (normalized.url.endsWith("/api/v1/fixed-expenses")) {
          return jsonResponse({
            data: {
              items: [
                {
                  expenseId: "expense_sensitive_title",
                  title: "card 1234-5678-9012-3456",
                  category: "SUBSCRIPTION",
                  amountMinor: 30_000,
                  paymentDay: 20,
                  status: "ACTIVE",
                  serverAuthority: true,
                  financialRawDataExposed: false,
                },
              ],
              page: 1,
              pageSize: 20,
              total: 1,
            },
          });
        }

        return jsonResponse({
          data: {
            items: [],
            page: 1,
            pageSize: 20,
            total: 0,
          },
        });
      },
      platform: "android",
    });

    await expect(fixedExpenseApi.getCommitments()).rejects.toMatchObject({
      code: "PLAN_INVALID_RESPONSE",
    });

    const savingsApi = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        if (normalized.url.endsWith("/api/v1/fixed-expenses")) {
          return jsonResponse({
            data: {
              items: [],
              page: 1,
              pageSize: 20,
              total: 0,
            },
          });
        }

        return jsonResponse({
          data: {
            items: [
              {
                goalId: "goal_sensitive_title",
                title: "owner user@example.com",
                goalType: "CUSTOM",
                targetAmountMinor: 1_000_000,
                currentAmountMinor: 0,
                fixedSaveAmountMinor: 100_000,
                status: "ACTIVE",
                serverAuthority: true,
                financialRawAccountDataExposed: false,
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      },
      platform: "ios",
    });

    await expect(savingsApi.getCommitments()).rejects.toMatchObject({
      code: "PLAN_INVALID_RESPONSE",
    });
  });

  it("creates fixed expense and savings commitments through server-authoritative APIs", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "plan-create-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        if (normalized.url.endsWith("/api/v1/fixed-expenses")) {
          return jsonResponse(
            {
              data: {
                expenseId: "expense_new_subscription",
                title: "New subscription",
                category: "SUBSCRIPTION",
                amountMinor: 19_000,
                paymentDay: 21,
                status: "ACTIVE",
                serverAuthority: true,
                financialRawDataExposed: false,
              },
            },
            201,
          );
        }

        return jsonResponse(
          {
            data: {
              goalId: "goal_new_saving",
              title: "New saving",
              goalType: "CUSTOM",
              targetAmountMinor: 500_000,
              currentAmountMinor: 0,
              fixedSaveAmountMinor: 80_000,
              status: "ACTIVE",
              serverAuthority: true,
              financialRawAccountDataExposed: false,
            },
          },
          201,
        );
      },
      platform: "ios",
    });

    await expect(
      api.createFixedExpense({
        amountMinor: 19_000,
        category: "SUBSCRIPTION",
        paymentDay: 21,
        title: "New subscription",
      }),
    ).resolves.toMatchObject({
      amountMinor: 19_000,
      id: "expense_new_subscription",
      serverAuthority: true,
      title: "New subscription",
    });
    await expect(
      api.createSavingsGoal({
        fixedSaveAmountMinor: 80_000,
        goalType: "CUSTOM",
        targetAmountMinor: 500_000,
        title: "New saving",
      }),
    ).resolves.toMatchObject({
      fixedSaveAmountMinor: 80_000,
      id: "goal_new_saving",
      serverAuthority: true,
      title: "New saving",
    });
    await expect(
      api.createFixedExpense({
        amountMinor: -1,
        category: "SUBSCRIPTION",
        paymentDay: 21,
        title: "Bad",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_CREATE_REQUEST" });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/fixed-expenses",
    );
    expect(calls[1]?.method).toBe("POST");
    expect(calls[1]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/savings",
    );
    for (const call of calls) {
      expect(call.headers.get("x-raw-financial-data-exposed")).toBe("false");
      expect(call.headers.get("x-ad-financial-targeting-used")).toBe("false");
    }
    expect(JSON.parse((await calls[0]?.clone().text()) ?? "{}")).toMatchObject({
      affectsDailyBudget: true,
      amountMinor: 19_000,
      autoPay: true,
      frequency: "MONTHLY",
      paymentDay: 21,
      title: "New subscription",
    });
    expect(JSON.parse((await calls[1]?.clone().text()) ?? "{}")).toMatchObject({
      affectsDailyBudget: true,
      autoSave: true,
      fixedSaveAmountMinor: 80_000,
      frequency: "MONTHLY",
      saveDay: 25,
      targetAmountMinor: 500_000,
      title: "New saving",
    });
  });

  it("rejects unknown fixed expense and savings create fields before plan payloads", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} }, 201);
      },
      platform: "ios",
    });

    await expect(
      api.createFixedExpense({
        accountNumber: "123-456-789012",
        amountMinor: 19_000,
        category: "SUBSCRIPTION",
        paymentDay: 21,
        title: "New subscription",
      } as never),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_CREATE_REQUEST" });

    await expect(
      api.createSavingsGoal({
        fixedSaveAmountMinor: 80_000,
        goalType: "CUSTOM",
        rawSalaryMemo: "salary 2,700,000",
        targetAmountMinor: 500_000,
        title: "New saving",
      } as never),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_CREATE_REQUEST" });

    expect(calls).toHaveLength(0);
  });

  it("normalizes fixed expense categories to the server enum before mutation requests", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        return jsonResponse(
          {
            data: {
              expenseId: "expense_subscription",
              title: "Subscription",
              category: "SUBSCRIPTION",
              amountMinor: 19_000,
              paymentDay: 21,
              status: "ACTIVE",
              serverAuthority: true,
              financialRawDataExposed: false,
            },
          },
          201,
        );
      },
      platform: "android",
    });

    await expect(
      api.createFixedExpense({
        amountMinor: 19_000,
        category: "subscription",
        paymentDay: 21,
        title: "Subscription",
      }),
    ).resolves.toMatchObject({
      category: "SUBSCRIPTION",
      id: "expense_subscription",
      serverAuthority: true,
    });
    await expect(
      api.updateFixedExpense("expense_subscription", {
        category: "not_a_server_category",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_UPDATE_REQUEST" });

    expect(calls).toHaveLength(1);
    expect(JSON.parse((await calls[0]?.clone().text()) ?? "{}")).toMatchObject({
      category: "SUBSCRIPTION",
    });
  });

  it("rejects raw sensitive plan text before it reaches fixed expense or savings APIs", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse(
          {
            data: {
              expenseId: "expense_sensitive",
              title: "unsafe",
              category: "SUBSCRIPTION",
              amountMinor: 19_000,
              paymentDay: 21,
              status: "ACTIVE",
              serverAuthority: true,
              financialRawDataExposed: false,
            },
          },
          201,
        );
      },
      platform: "ios",
    });

    await expect(
      api.createFixedExpense({
        amountMinor: 19_000,
        category: "SUBSCRIPTION",
        paymentDay: 21,
        title: "급여명세서 자동결제",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_CREATE_REQUEST" });
    await expect(
      api.createSavingsGoal({
        fixedSaveAmountMinor: 80_000,
        goalType: "CUSTOM",
        targetAmountMinor: 500_000,
        title: "계좌 110-123-456789 비상금",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_CREATE_REQUEST" });
    await expect(
      api.recordFixedExpensePayment("expense_chatgpt", {
        amountMinor: 30_000,
        idempotencyKey: "fixed-payment-sensitive-key",
        memo: "카드 1234-5678-9012-3456로 납부",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_PAYMENT_REQUEST" });
    await expect(
      api.recordSavingsDeposit("goal_emergency", {
        amountMinor: 80_000,
        idempotencyKey: "savings-deposit-sensitive-key",
        memo: "Authorization Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      }),
    ).rejects.toMatchObject({
      code: "PLAN_INVALID_SAVINGS_DEPOSIT_REQUEST",
    });

    expect(calls).toHaveLength(0);
  });

  it("records fixed expense payment through the server payment API without exposing raw user fields", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "fixed-payment-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        return jsonResponse(
          {
            data: {
              expense: {
                expenseId: "expense_chatgpt",
                title: "ChatGPT",
                category: "SUBSCRIPTION",
                amountMinor: 30_000,
                paymentDay: 20,
                status: "ACTIVE",
                paidTotalMinor: 30_000,
                lastPaidAt: "2026-07-03T00:00:00.000Z",
                serverAuthority: true,
                financialRawDataExposed: false,
                userId: "internal-user-id",
              },
              idempotentReplay: false,
              payment: {
                paymentId: "payment_1",
                userId: "internal-user-id",
              },
            },
          },
          201,
        );
      },
      platform: "android",
    });

    await expect(
      api.recordFixedExpensePayment("expense_chatgpt", {
        amountMinor: 30_000,
        idempotencyKey: "fixed-payment-test-key",
        paidAt: "2026-07-03T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      amountMinor: 30_000,
      id: "expense_chatgpt",
      serverAuthority: true,
      title: "ChatGPT",
    });
    await expect(
      api.recordFixedExpensePayment("expense_chatgpt", {
        amountMinor: 0,
        idempotencyKey: "bad",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_PAYMENT_REQUEST" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/fixed-expenses/expense_chatgpt/pay",
    );
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    expect(JSON.parse((await calls[0]?.clone().text()) ?? "{}")).toMatchObject({
      idempotencyKey: "fixed-payment-test-key",
      paidAmountMinor: 30_000,
      paymentStatus: "PAID",
    });
  });

  it("records savings deposits through the server savings transaction API", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "savings-deposit-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        return jsonResponse(
          {
            data: {
              goal: {
                goalId: "goal_emergency",
                title: "Emergency fund",
                goalType: "EMERGENCY_FUND",
                targetAmountMinor: 1_000_000,
                currentAmountMinor: 200_000,
                fixedSaveAmountMinor: 80_000,
                status: "ACTIVE",
                serverAuthority: true,
                financialRawAccountDataExposed: false,
                userId: "internal-user-id",
              },
              transaction: {
                transactionId: "svt_1",
                userId: "internal-user-id",
              },
              idempotentReplay: false,
            },
          },
          201,
        );
      },
      platform: "android",
    });

    await expect(
      api.recordSavingsDeposit("goal_emergency", {
        amountMinor: 80_000,
        idempotencyKey: "savings-deposit-test-key",
        memo: "mobile plan savings deposit",
        occurredAt: "2026-07-03T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      currentAmountMinor: 200_000,
      fixedSaveAmountMinor: 80_000,
      id: "goal_emergency",
      serverAuthority: true,
      title: "Emergency fund",
    });
    await expect(
      api.recordSavingsDeposit("goal_emergency", {
        amountMinor: 0,
        idempotencyKey: "bad",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_SAVINGS_DEPOSIT_REQUEST" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/savings/goal_emergency/deposit",
    );
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    expect(JSON.parse((await calls[0]?.clone().text()) ?? "{}")).toMatchObject({
      amountMinor: 80_000,
      idempotencyKey: "savings-deposit-test-key",
      memo: "mobile plan savings deposit",
      transactionType: "DEPOSIT",
    });
  });

  it("rejects unknown payment and deposit fields before plan money payloads", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} }, 201);
      },
      platform: "android",
    });

    await expect(
      api.recordFixedExpensePayment("expense_chatgpt", {
        accountNumber: "123-456-789012",
        amountMinor: 30_000,
        idempotencyKey: "fixed-payment-extra-key",
        paidAt: "2026-07-03T00:00:00.000Z",
      } as never),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_PAYMENT_REQUEST" });

    await expect(
      api.recordSavingsDeposit("goal_emergency", {
        amountMinor: 80_000,
        idempotencyKey: "savings-deposit-extra-key",
        occurredAt: "2026-07-04T00:00:00.000Z",
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({
      code: "PLAN_INVALID_SAVINGS_DEPOSIT_REQUEST",
    });

    expect(calls).toHaveLength(0);
  });

  it("deletes fixed expenses and savings goals through server-authoritative APIs", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "plan-delete-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        if (normalized.url.endsWith("/api/v1/fixed-expenses/expense_old")) {
          return jsonResponse({
            data: { expenseId: "expense_old", status: "DELETED" },
          });
        }

        return jsonResponse({
          data: { goalId: "goal_old", status: "DELETED" },
        });
      },
      platform: "android",
    });

    await expect(api.deleteFixedExpense("expense_old")).resolves.toMatchObject({
      id: "expense_old",
      rawFinancialDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    await expect(api.deleteSavingsGoal("goal_old")).resolves.toMatchObject({
      id: "goal_old",
      rawFinancialDataExposed: false,
      serverAuthority: true,
      status: "DELETED",
    });
    await expect(api.deleteFixedExpense("")).rejects.toMatchObject({
      code: "PLAN_INVALID_DELETE_REQUEST",
    });

    expect(calls.map((call) => [call.method, call.url])).toEqual([
      [
        "DELETE",
        "https://api.salaryhijacking.com/api/v1/fixed-expenses/expense_old",
      ],
      ["DELETE", "https://api.salaryhijacking.com/api/v1/savings/goal_old"],
    ]);
    for (const call of calls) {
      expect(call.headers.get("x-raw-financial-data-exposed")).toBe("false");
      expect(call.headers.get("x-ad-financial-targeting-used")).toBe("false");
      expect(call.headers.get("x-correlation-id")).toBe("plan-delete-test");
    }
  });

  it("updates fixed expenses and savings goals through server-authoritative APIs", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "plan-update-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);

        if (normalized.url.endsWith("/api/v1/fixed-expenses/expense_chatgpt")) {
          return jsonResponse({
            data: {
              expenseId: "expense_chatgpt",
              title: "ChatGPT Plus",
              category: "SUBSCRIPTION",
              amountMinor: 35_000,
              paymentDay: 20,
              status: "ACTIVE",
              serverAuthority: true,
              financialRawDataExposed: false,
            },
          });
        }

        return jsonResponse({
          data: {
            goalId: "goal_emergency",
            title: "Emergency fund",
            goalType: "EMERGENCY_FUND",
            targetAmountMinor: 1_200_000,
            currentAmountMinor: 200_000,
            fixedSaveAmountMinor: 100_000,
            status: "ACTIVE",
            serverAuthority: true,
            financialRawAccountDataExposed: false,
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.updateFixedExpense("expense_chatgpt", {
        amountMinor: 35_000,
        category: "SUBSCRIPTION",
        paymentDay: 20,
        title: "ChatGPT Plus",
      }),
    ).resolves.toMatchObject({
      amountMinor: 35_000,
      id: "expense_chatgpt",
      serverAuthority: true,
      title: "ChatGPT Plus",
    });

    await expect(
      api.updateSavingsGoal("goal_emergency", {
        fixedSaveAmountMinor: 100_000,
        goalType: "EMERGENCY_FUND",
        targetAmountMinor: 1_200_000,
        title: "Emergency fund",
      }),
    ).resolves.toMatchObject({
      fixedSaveAmountMinor: 100_000,
      id: "goal_emergency",
      serverAuthority: true,
      title: "Emergency fund",
    });

    await expect(
      api.updateFixedExpense("expense_chatgpt", { amountMinor: 0 }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_UPDATE_REQUEST" });
    await expect(
      api.updateSavingsGoal("goal_emergency", {
        fixedSaveAmountMinor: 2_000_000,
        targetAmountMinor: 1_000_000,
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_UPDATE_REQUEST" });

    expect(calls.map((call) => [call.method, call.url])).toEqual([
      [
        "PATCH",
        "https://api.salaryhijacking.com/api/v1/fixed-expenses/expense_chatgpt",
      ],
      [
        "PATCH",
        "https://api.salaryhijacking.com/api/v1/savings/goal_emergency",
      ],
    ]);
    expect(JSON.parse((await calls[0]?.clone().text()) ?? "{}")).toMatchObject({
      amountMinor: 35_000,
      category: "SUBSCRIPTION",
      paymentDay: 20,
      title: "ChatGPT Plus",
    });
    expect(JSON.parse((await calls[1]?.clone().text()) ?? "{}")).toMatchObject({
      fixedSaveAmountMinor: 100_000,
      goalType: "EMERGENCY_FUND",
      targetAmountMinor: 1_200_000,
      title: "Emergency fund",
    });
    for (const call of calls) {
      expect(call.headers.get("x-raw-financial-data-exposed")).toBe("false");
      expect(call.headers.get("x-ad-financial-targeting-used")).toBe("false");
      expect(call.headers.get("x-correlation-id")).toBe("plan-update-test");
    }
  });

  it("rejects unknown plan update fields before they can enter server payloads", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({
          data: {
            expenseId: "expense_chatgpt",
            title: "ChatGPT",
            category: "SUBSCRIPTION",
            amountMinor: 30_000,
            paymentDay: 20,
            status: "ACTIVE",
            serverAuthority: true,
            financialRawDataExposed: false,
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.updateFixedExpense("expense_chatgpt", {
        amountMinor: 30_000,
        accountNumber: "123-456-7890",
      } as never),
    ).rejects.toMatchObject({
      code: "PLAN_INVALID_UPDATE_REQUEST",
    });
    await expect(
      api.updateSavingsGoal("goal_emergency", {
        targetAmountMinor: 1_000_000,
        rawAccountMemo: "account 123-456-7890",
      } as never),
    ).rejects.toMatchObject({
      code: "PLAN_INVALID_UPDATE_REQUEST",
    });
    expect(calls).toHaveLength(0);
  });

  it("blocks unsafe commitment ids before money mutation requests reach the network", async () => {
    const calls: Request[] = [];
    const api = createPlanCommitmentsApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });
    const overlongId = `expense_${"a".repeat(300)}`;

    await expect(
      api.recordFixedExpensePayment("e", {
        amountMinor: 10_000,
        idempotencyKey: "fixed-payment-id-boundary",
      }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_PAYMENT_REQUEST" });
    await expect(
      api.recordSavingsDeposit("g", {
        amountMinor: 10_000,
        idempotencyKey: "savings-deposit-id-boundary",
      }),
    ).rejects.toMatchObject({
      code: "PLAN_INVALID_SAVINGS_DEPOSIT_REQUEST",
    });
    await expect(
      api.updateFixedExpense(overlongId, { amountMinor: 10_000 }),
    ).rejects.toMatchObject({ code: "PLAN_INVALID_UPDATE_REQUEST" });
    await expect(api.deleteSavingsGoal(overlongId)).rejects.toMatchObject({
      code: "PLAN_INVALID_DELETE_REQUEST",
    });

    expect(calls).toHaveLength(0);
  });
});
