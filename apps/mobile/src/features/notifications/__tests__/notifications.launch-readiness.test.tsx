import { fireEvent, render } from "@testing-library/react-native";

import { NotificationScreen } from "../components";

describe("notification launch readiness screen", () => {
  it("renders as an independent Korean notification stack and opens deep links", () => {
    const onBack = jest.fn();
    const onOpenHref = jest.fn();
    const onSettings = jest.fn();
    const screen = render(
      <NotificationScreen
        onBack={onBack}
        onOpenHref={onOpenHref}
        onSettings={onSettings}
      />,
    );

    expect(screen.getByText("알림")).toBeTruthy();
    expect(screen.getByText("새로운 알림이 있어요")).toBeTruthy();
    expect(screen.queryByText("급여")).toBeNull();
    expect(screen.queryByText("계획")).toBeNull();
    expect(screen.queryByText("커뮤니티")).toBeNull();
    expect(screen.queryByText("MY")).toBeNull();

    fireEvent.press(
      screen.getByRole("button", { name: "이전 화면으로 돌아가기" }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole("button", { name: "알림 설정 열기" }));
    expect(onSettings).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByRole("button", {
        name: "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기 열기",
      }),
    );
    expect(onOpenHref).toHaveBeenCalledWith("/level/reading");
  });
});
