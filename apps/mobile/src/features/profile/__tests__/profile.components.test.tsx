import { fireEvent, render } from "@testing-library/react-native";

import { ProfileHeader, ProfileMenuCard, ProfileStatGrid } from "../components";

describe("profile feature components", () => {
  it("renders a privacy-safe profile header without raw personal data", () => {
    const screen = render(
      <ProfileHeader
        avatarEmoji="SH"
        displayName="salary_saver"
        levelTitle="LV 7 Budget Builder"
        maskedEmail="sa***@example.com"
        rawPersonalDataExposed={false}
      />,
    );

    expect(screen.getByText("salary_saver")).toBeTruthy();
    expect(screen.getByText("LV 7 Budget Builder")).toBeTruthy();
    expect(screen.getByText("sa***@example.com")).toBeTruthy();
    expect(screen.getByText("rawPersonalDataExposed=false")).toBeTruthy();
    expect(screen.queryByText("salary_saver@example.com")).toBeNull();
    expect(
      screen.getByLabelText("profile header for salary_saver"),
    ).toBeTruthy();
  });

  it("renders my page stats from server-authoritative profile summary", () => {
    const screen = render(
      <ProfileStatGrid
        stats={{
          totalHijackSaved: 5780000,
          currentLevel: 7,
          levelXp: 880,
          nextLevelXp: 1000,
          selfCareScore: 82,
        }}
      />,
    );

    expect(
      screen.getByLabelText("total hijack saved 5,780,000원"),
    ).toBeTruthy();
    expect(screen.getByText("LV 7")).toBeTruthy();
    expect(screen.getByLabelText("profile level progress 88%")).toBeTruthy();
    expect(screen.getByText("selfCareScore 82")).toBeTruthy();
    expect(screen.getByText("serverAuthority=true")).toBeTruthy();
  });

  it("renders expected my page menu actions as accessible buttons", () => {
    const onSelect = jest.fn();
    const screen = render(<ProfileMenuCard onSelect={onSelect} />);

    fireEvent.press(screen.getByRole("button", { name: "manage my posts" }));
    fireEvent.press(screen.getByRole("button", { name: "manage my level" }));
    fireEvent.press(screen.getByRole("button", { name: "support ticket" }));
    fireEvent.press(screen.getByRole("button", { name: "notices" }));
    fireEvent.press(screen.getByRole("button", { name: "account settings" }));

    expect(onSelect).toHaveBeenNthCalledWith(1, "MY_POSTS");
    expect(onSelect).toHaveBeenNthCalledWith(2, "MY_LEVEL");
    expect(onSelect).toHaveBeenNthCalledWith(3, "SUPPORT");
    expect(onSelect).toHaveBeenNthCalledWith(4, "NOTICES");
    expect(onSelect).toHaveBeenNthCalledWith(5, "ACCOUNT_SETTINGS");
    expect(screen.getByText("financialRawDataExposed=false")).toBeTruthy();
  });
});
