import { fireEvent, render } from "@testing-library/react-native";

import {
  ForgotPasswordForm,
  PasswordRecoveryHero,
  ResetPasswordForm,
} from "../components";

describe("password recovery feature components", () => {
  it("renders password recovery hero without raw credential exposure", () => {
    const screen = render(<PasswordRecoveryHero mode="forgot" />);

    expect(screen.getByText("비밀번호 찾기")).toBeTruthy();
    expect(
      screen.getByText("가입한 이메일로 재설정 링크를 받을 수 있어요"),
    ).toBeTruthy();
    expect(screen.getByText("rawCredentialData=false")).toBeTruthy();
  });

  it("submits password reset email through the server recovery action", () => {
    const onSubmit = jest.fn();
    const screen = render(<ForgotPasswordForm onSubmit={onSubmit} />);

    fireEvent.changeText(
      screen.getByLabelText("재설정 이메일"),
      " reset@example.com ",
    );
    fireEvent.press(screen.getByRole("button", { name: "재설정 링크 받기" }));

    expect(onSubmit).toHaveBeenCalledWith({ email: "reset@example.com" });
    expect(screen.getByText("rawEmailLogged=false")).toBeTruthy();
  });

  it("submits reset token and new password without rendering token text", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <ResetPasswordForm onSubmit={onSubmit} token="reset-token-123" />,
    );

    fireEvent.changeText(screen.getByLabelText("새 비밀번호"), "N3wP@ssword!");
    fireEvent.press(screen.getByRole("button", { name: "비밀번호 재설정" }));

    expect(onSubmit).toHaveBeenCalledWith({
      token: "reset-token-123",
      newPassword: "N3wP@ssword!",
    });
    expect(screen.queryByText("reset-token-123")).toBeNull();
    expect(screen.getByText("resetTokenRendered=false")).toBeTruthy();
    expect(screen.getByText("passwordRendered=false")).toBeTruthy();
  });
});
