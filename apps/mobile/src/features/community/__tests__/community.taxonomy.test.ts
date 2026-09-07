import {
  COMMUNITY_BOARD_LABELS,
  COMMUNITY_BOARD_TYPES,
  COMMUNITY_LEGACY_CATEGORY_MAPPING,
  communityBoardLabel,
  normalizeCommunityBoardType,
} from "../community.constants";

describe("community taxonomy", () => {
  it("locks the final three category labels, order, and internal keys", () => {
    expect(COMMUNITY_BOARD_TYPES).toEqual(["FREE", "LEVELUP", "HOBBY"]);
    expect(
      COMMUNITY_BOARD_TYPES.map((key) => COMMUNITY_BOARD_LABELS[key]),
    ).toEqual(["자유 게시판", "레벨업 인증", "취미 게시판"]);
  });

  it("normalizes legacy data without allowing legacy categories as new keys", () => {
    expect(COMMUNITY_LEGACY_CATEGORY_MAPPING).toEqual({
      "급여 이야기": "FREE",
      "예산 팁": "FREE",
      "지출 줄이기": "FREE",
      저축: "FREE",
      "저축 목표": "FREE",
      부업: "FREE",
      자유: "FREE",
      "자유 게시판": "FREE",
      레벨업: "LEVELUP",
      "레벨업 인증": "LEVELUP",
      취미: "HOBBY",
      "취미 게시판": "HOBBY",
      SALARY_TALK: "FREE",
      BUDGET_TIP: "FREE",
      EXPENSE_CUT: "FREE",
      SAVINGS_GOAL: "FREE",
      SIDE_HUSTLE: "FREE",
      LEVEL_CERTIFICATION: "LEVELUP",
      HEALTH_ROUTINE: "HOBBY",
    });
    expect(normalizeCommunityBoardType("BUDGET_TIP")).toBe("FREE");
    expect(normalizeCommunityBoardType("LEVEL_CERTIFICATION")).toBe("LEVELUP");
    expect(normalizeCommunityBoardType("HEALTH_ROUTINE")).toBe("HOBBY");
    expect(communityBoardLabel("자유")).toBe("자유 게시판");
    expect(communityBoardLabel("레벨업")).toBe("레벨업 인증");
    expect(communityBoardLabel("취미")).toBe("취미 게시판");
  });
});
