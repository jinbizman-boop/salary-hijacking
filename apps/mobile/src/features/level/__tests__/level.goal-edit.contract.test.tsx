import { fireEvent, render } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  GrowthMissionRow,
  IconEmojiPicker,
} from "../components/GrowthProductCards";
import {
  LVUP_DEFAULT_GOALS,
  buildGrowthGoalEditDraft,
  buildGrowthGoalSaveRequest,
  validateGrowthGoalIcon,
} from "../goal-architecture";
import type { GrowthMissionViewModel } from "../product-model";
import {
  USER_SYMBOL_EMOJI_CATEGORIES,
  USER_SYMBOL_RESOLUTION_PRIORITY,
  searchUserSymbols,
  suggestGoalIcon,
} from "../user-symbols";

const mission: GrowthMissionViewModel = {
  domain: "READING",
  editCta: "목표 수정",
  goalText: "하루 5페이지",
  primaryCta: "독서하기",
  progressText: "오늘 2 / 5페이지",
  progressValue: 40,
  quickCompleteCta: "빠른 완료",
  route: "/level/reading",
  sourceLabel: "맞춤 추천",
  status: "IN_PROGRESS",
  statusLabel: "진행 중",
  streakText: "3일 연속",
  title: "독서",
  userIcon: { iconKey: "book-open", iconType: "SYSTEM_ICON" },
};

describe("LV UP goal edit contract", () => {
  it("keeps every mission goal edit as a 48dp touch target with domain context", () => {
    const onEdit = jest.fn();
    const source = readFileSync(
      join(__dirname, "..", "components", "GrowthProductCards.tsx"),
      "utf8",
    );
    const screen = render(
      <GrowthMissionRow
        mission={mission}
        onDetail={jest.fn()}
        onEdit={onEdit}
        onQuickComplete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "독서 목표 수정" }));

    expect(onEdit).toHaveBeenCalledWith(mission);
    expect(screen.getByLabelText("독서 목표 수정")).toBeTruthy();
    expect(source).toContain("secondaryActionRow");
    expect(source).toContain("minHeight: designSystem.layout.touchTarget");
    expect(source).toContain("flex: 1");
  });

  it("routes main mission edits to the domain-specific goal editor", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "level",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("openGoalEditor");
    expect(source).toContain('pathname: "/level/goals"');
    expect(source).toContain("domain: mission.domain");
    expect(source).not.toContain('onEdit={() => router.push("/level/goals"');
  });

  it("keeps goal management wired to server save instead of a dead edit button", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "level",
        "goals.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("updateGrowthGoalWithServerAuthority");
    expect(source).toContain("IconEmojiPicker");
    expect(source).toContain("아이콘 선택");
    expect(source).not.toContain("onPress={() => undefined}");
  });

  it("builds a complete server-save draft with immutable-history and icon metadata", () => {
    const draft = buildGrowthGoalEditDraft(LVUP_DEFAULT_GOALS[0]!, {
      effectiveDateMode: "TOMORROW",
      icon: { iconKey: "book-open", iconType: "SYSTEM_ICON" },
      targetValue: 10,
    });
    const request = buildGrowthGoalSaveRequest(draft, "2026-09-07");

    expect(request).toMatchObject({
      activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      domain: "READING",
      effectiveDate: "2026-09-08",
      historicalMissionMutationCount: 0,
      icon: { iconKey: "book-open", iconType: "SYSTEM_ICON" },
      source: "CUSTOM",
      targetUnit: "page",
      targetValue: 10,
    });
  });

  it("validates emoji as one picker-selected grapheme and rejects remote icon payloads", () => {
    expect(
      validateGrowthGoalIcon({ emoji: "👨‍💻", iconType: "EMOJI" }).valid,
    ).toBe(true);
    expect(
      validateGrowthGoalIcon({ emoji: "🇰🇷", iconType: "EMOJI" }).valid,
    ).toBe(true);
    expect(
      validateGrowthGoalIcon({
        iconKey: "https://cdn.example/icon.svg",
        iconType: "SYSTEM_ICON",
      } as never).valid,
    ).toBe(false);
  });

  it("renders a categorized user icon and emoji picker with search, recent, and favorites", () => {
    const onSelect = jest.fn();
    const screen = render(
      <IconEmojiPicker
        favorites={["star", { emoji: "🔥", iconType: "EMOJI" }]}
        onSelect={onSelect}
        recent={["book-open"]}
        selected={{ iconKey: "book-open", iconType: "SYSTEM_ICON" }}
      />,
    );

    expect(screen.getByText("최근 사용")).toBeTruthy();
    expect(screen.getByText("즐겨찾기")).toBeTruthy();
    expect(screen.getByText("공부")).toBeTruthy();
    expect(screen.getByText("🏃 운동")).toBeTruthy();
    expect(screen.getByText("😀 표정/감정")).toBeTruthy();
    expect(screen.getByText("🌱 성장")).toBeTruthy();
    fireEvent.press(
      screen.getAllByRole("button", { name: "이모지 📚 선택" })[0]!,
    );
    expect(onSelect).toHaveBeenCalledWith({ emoji: "📚", iconType: "EMOJI" });
    fireEvent.changeText(screen.getByLabelText("아이콘 검색"), "카페");
    expect(screen.getByText("🥗 식생활")).toBeTruthy();
  });

  it("keeps the user symbol registry broad, searchable, and deterministic", () => {
    expect(USER_SYMBOL_RESOLUTION_PRIORITY).toEqual([
      "USER_SELECTED",
      "CATEGORY_DEFAULT",
      "KEYWORD_AUTO_SUGGESTION",
      "GENERIC_FALLBACK",
    ]);
    expect(USER_SYMBOL_EMOJI_CATEGORIES.length).toBeGreaterThanOrEqual(25);
    expect(
      USER_SYMBOL_EMOJI_CATEGORIES.flatMap((category) => category.items).length,
    ).toBeGreaterThanOrEqual(180);
    expect(
      searchUserSymbols("헬스").some(
        (category) => category.title === "🏋️ 헬스",
      ),
    ).toBe(true);
    expect(
      searchUserSymbols("외국어").some(
        (category) => category.title === "🌎 외국어/세계",
      ),
    ).toBe(true);
    expect(
      suggestGoalIcon({ title: "영어 문장 5개", domain: "LANGUAGE" }),
    ).toEqual({ iconKey: "languages", iconType: "SYSTEM_ICON" });
    expect(
      suggestGoalIcon({
        title: "러닝 30분",
        userSelected: { emoji: "🏃‍♂️", iconType: "EMOJI" },
      }),
    ).toEqual({ emoji: "🏃‍♂️", iconType: "EMOJI" });
  });
});
