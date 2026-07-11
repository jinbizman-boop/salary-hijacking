import { fireEvent, render } from "@testing-library/react-native";

import {
  LoginCredentialForm,
  LoginHero,
  SocialLoginButtons,
} from "../components";

describe("login feature components", () => {
  it("renders the login hero without exposing raw credentials or tokens", () => {
    const screen = render(<LoginHero />);

    expect(screen.getByText("급여 하이재킹")).toBeTruthy();
    expect(screen.getByText("월급이 사라지기 전에 먼저 붙잡아요")).toBeTruthy();
    expect(screen.getByText("rawCredentialData=false")).toBeTruthy();
    expect(screen.queryByText(/token|bearer|refresh/iu)).toBeNull();
  });

  it("submits email and password through an explicit server login action", () => {
    const onSubmit = jest.fn();
    const screen = render(<LoginCredentialForm onSubmit={onSubmit} />);

    fireEvent.changeText(
      screen.getByLabelText("로그인 이메일"),
      "user@example.com",
    );
    fireEvent.changeText(screen.getByLabelText("로그인 비밀번호"), "P@ssw0rd!");
    fireEvent.press(screen.getByRole("button", { name: "서버 기준 로그인" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "P@ssw0rd!",
      rememberMe: true,
    });
    expect(screen.getByText("passwordRendered=false")).toBeTruthy();
  });

  it("routes social login by provider without embedding provider tokens", () => {
    const onSelectProvider = jest.fn();
    const screen = render(
      <SocialLoginButtons onSelectProvider={onSelectProvider} />,
    );

    fireEvent.press(screen.getByRole("button", { name: "KAKAO 소셜 로그인" }));

    expect(onSelectProvider).toHaveBeenCalledWith("KAKAO");
    expect(screen.getByText("oauthTokenRendered=false")).toBeTruthy();
  });
});
