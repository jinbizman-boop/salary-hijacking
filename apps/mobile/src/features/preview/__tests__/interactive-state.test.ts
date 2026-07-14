import {
  PREVIEW_STATE_STORAGE_KEY,
  configurePreviewStatePersistence,
  formatKrw,
  getKstParts,
  getPreviewState,
  getVisiblePlanReminderItems,
  hydratePreviewStateFromStorage,
  iconForCategory,
  isDailyBudgetItemCompletedOnDate,
  resetPreviewStateForTests,
  updatePreviewState,
  type PlanItem,
  type PreviewStateSecureStorage,
} from "../interactive-state";

describe("interactive preview state Korean copy", () => {
  beforeEach(() => {
    resetPreviewStateForTests();
  });

  it("keeps money and KST date labels in readable Korean", () => {
    expect(formatKrw(5780000)).toBe("5,780,000원");
    expect(getKstParts(new Date("2026-07-12T15:30:00.000Z")).text).toBe(
      "2026년 7월 13일",
    );
  });

  it("keeps seeded salary and plan rows free of mojibake copy", () => {
    const state = getPreviewState();
    const serialized = JSON.stringify(state);

    expect(serialized).toContain("빽다방 아이스 아메리카노");
    expect(serialized).toContain("KT광화문지사 구내식당 점심 식사");
    expect(serialized).toContain("유튜브 프리미엄");
    expect(serialized).toContain("MS오피스");
    expect(serialized).toContain("학자금 대출");
    expect(serialized).not.toMatch(/[占�疫燁獄筌袁]/u);
  });

  it("maps readable Korean categories to the expected icon families", () => {
    expect(iconForCategory("한식")).toBeTruthy();
    expect(iconForCategory("카페")).toBeTruthy();
    expect(iconForCategory("담배")).toBeTruthy();
    expect(iconForCategory("구독")).toBeTruthy();
  });
});

describe("interactive preview daily budget completion dates", () => {
  beforeEach(() => {
    resetPreviewStateForTests();
  });

  it("keeps legacy completed daily rows completed when no date key exists", () => {
    const item = getPreviewState().dailyItems.find((row) => row.completed);
    if (!item) {
      throw new Error("Seeded completed daily item is required");
    }

    expect(isDailyBudgetItemCompletedOnDate(item, "2026-07-14")).toBe(true);
  });

  it("treats a completed daily row as scheduled on a different KST date", () => {
    const seeded = getPreviewState();
    const category = seeded.dailyItems[0]?.category;
    if (!category) {
      throw new Error("Seeded daily category is required");
    }

    expect(
      isDailyBudgetItemCompletedOnDate(
        {
          amount: 2000,
          category,
          completed: true,
          content: "DailyResetCoffee",
          id: "daily-reset-coffee",
          usedDateKey: "2026-07-13",
        },
        "2026-07-14",
      ),
    ).toBe(false);
  });
});

describe("interactive preview state secure persistence", () => {
  beforeEach(() => {
    resetPreviewStateForTests();
  });

  it("hydrates saved preview state after in-memory state is reset", async () => {
    const storage = createMemorySecureStorage();
    configurePreviewStatePersistence(storage);

    updatePreviewState((previous) => ({
      ...previous,
      variableExpenses: [
        ...previous.variableExpenses,
        {
          amount: 12345,
          category: "기타",
          content: "테스트 결제 저장",
          id: "variable-persisted",
        },
      ],
    }));

    expect(await storage.getItemAsync(PREVIEW_STATE_STORAGE_KEY)).toContain(
      "variable-persisted",
    );

    resetPreviewStateForTests();
    configurePreviewStatePersistence(storage);
    expect(
      getPreviewState().variableExpenses.some(
        (item) => item.id === "variable-persisted",
      ),
    ).toBe(false);

    const restored = await hydratePreviewStateFromStorage();

    expect(restored.variableExpenses).toContainEqual({
      amount: 12345,
      category: "기타",
      content: "테스트 결제 저장",
      id: "variable-persisted",
    });
    expect(getPreviewState()).toBe(restored);
  });

  it("ignores malformed persisted payloads without replacing the seeded state", async () => {
    const storage = createMemorySecureStorage();
    await storage.setItemAsync(
      PREVIEW_STATE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, state: { dailyLimit: -1 } }),
    );
    configurePreviewStatePersistence(storage);

    const restored = await hydratePreviewStateFromStorage();

    expect(restored.dailyLimit).toBe(20000);
    expect(restored.dailyItems).toHaveLength(5);
  });

  it("rejects persisted daily rows with malformed completion date keys", async () => {
    const storage = createMemorySecureStorage();
    const seeded = getPreviewState();
    const category = seeded.dailyItems[0]?.category;
    if (!category) {
      throw new Error("Seeded daily category is required");
    }
    await storage.setItemAsync(
      PREVIEW_STATE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        state: {
          ...seeded,
          dailyItems: [
            {
              amount: 2000,
              category,
              completed: true,
              content: "DailyResetCoffee",
              id: "daily-reset-coffee",
              usedDateKey: "2026/07/13",
            },
          ],
        },
      }),
    );
    configurePreviewStatePersistence(storage);

    const restored = await hydratePreviewStateFromStorage();

    expect(restored.dailyItems).toHaveLength(5);
    expect(await storage.getItemAsync(PREVIEW_STATE_STORAGE_KEY)).toBeNull();
  });

  it("rejects persisted preview rows that contain sensitive personal data", async () => {
    const storage = createMemorySecureStorage();
    await storage.setItemAsync(
      PREVIEW_STATE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        state: {
          ...getPreviewState(),
          variableExpenses: [
            {
              amount: 1000,
              category: "기타",
              content: "010-1234-5678 계좌 확인",
              id: "variable-sensitive",
            },
          ],
        },
      }),
    );
    configurePreviewStatePersistence(storage);

    const restored = await hydratePreviewStateFromStorage();

    expect(
      restored.variableExpenses.some(
        (item) => item.id === "variable-sensitive",
      ),
    ).toBe(false);
    expect(await storage.getItemAsync(PREVIEW_STATE_STORAGE_KEY)).toBeNull();
  });

  it("does not write sensitive preview rows into secure storage", async () => {
    const storage = createMemorySecureStorage();
    configurePreviewStatePersistence(storage);

    const before = getPreviewState();
    const after = updatePreviewState((previous) => ({
      ...previous,
      variableExpenses: [
        ...previous.variableExpenses,
        {
          amount: 1000,
          category: "기타",
          content: "010-1234-5678 계좌 확인",
          id: "variable-sensitive-write",
        },
      ],
    }));

    expect(after).toBe(before);
    expect(
      getPreviewState().variableExpenses.some(
        (item) => item.id === "variable-sensitive-write",
      ),
    ).toBe(false);
    expect(await storage.getItemAsync(PREVIEW_STATE_STORAGE_KEY)).toBeNull();
  });
});

describe("interactive preview recurring plan reminders", () => {
  it("hides only the completed current-month occurrence and exposes the next month again", () => {
    const seeded = getPreviewState();
    const fixedCategory = seeded.planItems.find(
      (item) => item.section === "fixed",
    )?.category;
    const savingCategory = seeded.planItems.find(
      (item) => item.section === "saving",
    )?.category;
    if (!fixedCategory || !savingCategory) {
      throw new Error("Seeded fixed and saving plan categories are required");
    }
    const rows: readonly PlanItem[] = [
      {
        amount: 32000,
        category: fixedCategory,
        content: "ChatGPT",
        day: 10,
        id: "fixed-current",
        section: "fixed",
        usedMonthKey: "2026-07",
      },
      {
        amount: 14900,
        category: fixedCategory,
        content: "YouTube",
        day: 10,
        id: "fixed-open",
        section: "fixed",
      },
      {
        amount: 200000,
        category: savingCategory,
        content: "여행",
        day: 25,
        id: "saving-previous",
        section: "saving",
        usedMonthKey: "2026-06",
      },
    ];

    expect(
      getVisiblePlanReminderItems(rows, "2026-07").map((item) => item.id),
    ).toEqual(["fixed-open", "saving-previous"]);
    expect(
      getVisiblePlanReminderItems(rows, "2026-08").map((item) => item.id),
    ).toEqual(["fixed-current", "fixed-open", "saving-previous"]);
  });

  it("does not expose future-dated fixed or savings occurrences on salary home", () => {
    const seeded = getPreviewState();
    const fixedCategory = seeded.planItems.find(
      (item) => item.section === "fixed",
    )?.category;
    const savingCategory = seeded.planItems.find(
      (item) => item.section === "saving",
    )?.category;
    if (!fixedCategory || !savingCategory) {
      throw new Error("Seeded fixed and saving plan categories are required");
    }
    const rows: readonly PlanItem[] = [
      {
        amount: 32000,
        category: fixedCategory,
        content: "ChatGPT",
        day: 10,
        id: "fixed-overdue",
        section: "fixed",
      },
      {
        amount: 200000,
        category: savingCategory,
        content: "Travel",
        day: 25,
        id: "saving-future",
        section: "saving",
      },
    ];

    expect(
      getVisiblePlanReminderItems(rows, "2026-07", 14).map((item) => item.id),
    ).toEqual(["fixed-overdue"]);
    expect(
      getVisiblePlanReminderItems(rows, "2026-07", 25).map((item) => item.id),
    ).toEqual(["fixed-overdue", "saving-future"]);
  });
});

function createMemorySecureStorage(): PreviewStateSecureStorage {
  const values = new Map<string, string>();
  return {
    deleteItemAsync: async (key: string): Promise<void> => {
      values.delete(key);
    },
    getItemAsync: async (key: string): Promise<string | null> =>
      values.get(key) ?? null,
    setItemAsync: async (key: string, value: string): Promise<void> => {
      values.set(key, value);
    },
  };
}
