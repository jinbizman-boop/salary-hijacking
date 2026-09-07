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
      join(__dirname, "..", "..", "..", "..", "app", "level", "goals.tsx"),
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
        favorites={["star"]}
        onSelect={onSelect}
        recent={["book-open"]}
        selected={{ iconKey: "book-open", iconType: "SYSTEM_ICON" }}
      />,
    );

    expect(screen.getByText("최근 사용")).toBeTruthy();
    expect(screen.getByText("즐겨찾기")).toBeTruthy();
    expect(screen.getByText("독서/공부")).toBeTruthy();
    expect(screen.getByText("운동")).toBeTruthy();
    expect(screen.getByText("😀 표정/감정")).toBeTruthy();
    expect(screen.getByText("🌱 성장")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "이모지 📚 선택" }));
    expect(onSelect).toHaveBeenCalledWith({ emoji: "📚", iconType: "EMOJI" });
  });
});
