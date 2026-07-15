import { fireEvent, render } from "@testing-library/react-native";

import {
  ProfileHeader,
  ProfileMenuCard,
  ProfileScreen,
  ProfileStatGrid,
} from "../components";
import type { ProfileSnapshot } from "../types";

const serverProfileSnapshot: ProfileSnapshot = {
  activities: [],
  privacy: {
    adPersonalization: false,
    exportRequestedAt: null,
    exportStatus: "NONE",
    financialDataForAds: false,
    rawPushTokenLogging: false,
    tokenHashOnly: true,
    withdrawalRequested: false,
  },
  summary: {
    communityComments: 0,
    communityPosts: 0,
    completedGrowthTasks: 0,
    currentLevel: 7,
    currentMonthHijack: 0,
    levelXp: 420,
    nextLevelXp: 1000,
    notificationUnread: 0,
    privacyPassRate: "100.00%",
    selfCareScore: 76,
    totalHijackSaved: 1234000,
  },
  user: {
    adsFinancialTargetingUsed: false,
    avatarEmoji: "SH",
    communityDisplayName: "서버 닉네임",
    emailVerified: true,
    idHash: "profile-user-hash",
    joinedAt: "2026-07-15T00:00:00.000Z",
    level: 7,
    marketingConsent: false,
    nickname: "서버 닉네임",
    notificationConsent: true,
    onboardingCompleted: true,
    rawEmailExposed: false,
    rawFinancialDataExposed: false,
    rawPhoneExposed: false,
    rawPushTokenExposed: false,
    role: "USER",
    title: "급여 리마인더 사용자",
  },
};

describe("profile feature components", () => {
  it("renders a privacy-safe profile header without raw personal data", () => {
    const screen = render(
      <ProfileHeader
        avatarEmoji="SH"
        displayName="사용자 기획자님"
        levelTitle="18Lv"
        maskedEmail="sa***@example.com"
        rawPersonalDataExposed={false}
      />,
    );

    expect(screen.getByText("사용자 기획자님")).toBeTruthy();
    expect(screen.getByText("18Lv")).toBeTruthy();
    expect(screen.getByText("sa***@example.com")).toBeTruthy();
    expect(screen.getByText("개인정보는 마스킹되어 표시돼요")).toBeTruthy();
    expect(screen.queryByText("salary_saver@example.com")).toBeNull();
    expect(
      screen.getByLabelText("profile header for 사용자 기획자님"),
    ).toBeTruthy();
  });

  it("renders my page stats from server-authoritative profile summary", () => {
    const screen = render(
      <ProfileStatGrid
        stats={{
          totalHijackSaved: 5780000,
          currentLevel: 18,
          levelXp: 880,
          nextLevelXp: 1000,
          selfCareScore: 82,
        }}
      />,
    );

    expect(screen.getByLabelText("누적 납치 금액 5,780,000원")).toBeTruthy();
    expect(screen.getByText("18Lv")).toBeTruthy();
    expect(screen.getByLabelText("레벨 업 진행률 88%")).toBeTruthy();
    expect(screen.getByText("4.1점")).toBeTruthy();
    expect(screen.getByText("서버 기준 성과")).toBeTruthy();
  });

  it("renders expected my page menu actions as accessible buttons", () => {
    const onSelect = jest.fn();
    const screen = render(<ProfileMenuCard onSelect={onSelect} />);

    fireEvent.press(screen.getByRole("button", { name: "내 게시글 관리" }));
    fireEvent.press(screen.getByRole("button", { name: "내 레벨업 관리" }));
    fireEvent.press(screen.getByRole("button", { name: "1:1 문의" }));
    fireEvent.press(screen.getByRole("button", { name: "공지사항" }));
    fireEvent.press(screen.getByRole("button", { name: "계정 설정" }));

    expect(onSelect).toHaveBeenNthCalledWith(1, "MY_POSTS");
    expect(onSelect).toHaveBeenNthCalledWith(2, "MY_LEVEL");
    expect(onSelect).toHaveBeenNthCalledWith(3, "SUPPORT");
    expect(onSelect).toHaveBeenNthCalledWith(4, "NOTICES");
    expect(onSelect).toHaveBeenNthCalledWith(5, "ACCOUNT_SETTINGS");
    expect(
      screen.getByText("금융 원문은 MY 메뉴에 표시하지 않아요"),
    ).toBeTruthy();
  });

  it("renders the MY tab from the server-authoritative profile snapshot", async () => {
    const getProfile = jest.fn().mockResolvedValue(serverProfileSnapshot);
    const onSelectMenu = jest.fn();
    const screen = render(
      <ProfileScreen onSelectMenu={onSelectMenu} profileApi={{ getProfile }} />,
    );

    expect(await screen.findByText("서버 닉네임")).toBeTruthy();
    expect(screen.getByText("급여 리마인더 사용자")).toBeTruthy();
    expect(screen.getByLabelText("누적 납치 금액 1,234,000원")).toBeTruthy();
    expect(screen.getByLabelText("레벨 업 진행률 42%")).toBeTruthy();
    expect(screen.queryByText("사용자 기획자님")).toBeNull();
    expect(screen.queryByText("5,780,000원")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "공지사항" }));
    expect(onSelectMenu).toHaveBeenCalledWith("NOTICES");
    expect(getProfile).toHaveBeenCalledTimes(1);
  });
});
