import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("auth capture states", () => {
  it("renders login credential error, recovery, and logout complete native states", () => {
    const error = render(
      <CapturePreviewScreen kind="login-credential-error" />,
    );
    expect(error.getByText("로그인 요청을 완료하지 못했습니다.")).toBeTruthy();
    expect(error.getByPlaceholderText("아이디를 입력하세요")).toBeTruthy();

    const recovery = render(
      <CapturePreviewScreen kind="login-password-recovery" />,
    );
    expect(recovery.getByText("비밀번호 찾기")).toBeTruthy();
    expect(recovery.getByText("재설정 링크 받기")).toBeTruthy();

    const logout = render(
      <CapturePreviewScreen kind="login-logout-complete" />,
    );
    expect(logout.getByText("로그아웃되었습니다.")).toBeTruthy();
    expect(
      logout.getByText("다시 로그인하면 급여 계획을 이어서 볼 수 있어요."),
    ).toBeTruthy();
  });
});
