import { fireEvent, render } from "@testing-library/react-native";

import {
  AuthBrandLogo,
  EurekaWorldMark,
  LoginCredentialForm,
  LoginHero,
  SocialLoginButtons,
} from "../components";

describe("login feature components", () => {
  it("renders the reference brand lockup without exposing raw tokens", () => {
    const screen = render(<LoginHero />);

    expect(screen.getByText("급여납치")).toBeTruthy();
    expect(screen.getByText("SALARY HIJACKING")).toBeTruthy();
    expect(screen.getByLabelText("급여납치 브랜드 로고")).toBeTruthy();
    expect(screen.queryByText(/token|bearer|refresh/iu)).toBeNull();
  });

  it("keeps the shared brand and Eureka marks renderable", () => {
    const brand = render(<AuthBrandLogo />);
    const eureka = render(<EurekaWorldMark />);

    expect(brand.getByText("급여납치")).toBeTruthy();
    expect(eureka.getByLabelText("Eureka World 공식 로고")).toBeTruthy();
    expect(eureka.queryByText("Eureka World")).toBeNull();
  });

  it("submits id and password through the password field submit action", () => {
    const onSubmit = jest.fn();
    const screen = render(<LoginCredentialForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText("아이디"), "user@example.com");
    fireEvent.changeText(screen.getByLabelText("비밀번호"), "P@ssw0rd!");
    fireEvent(screen.getByLabelText("비밀번호"), "submitEditing");

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "P@ssw0rd!",
      rememberMe: true,
    });
  });

  it("routes supported social login icons and keeps Facebook as visual-only", () => {
    const onSelectProvider = jest.fn();
    const screen = render(
      <SocialLoginButtons onSelectProvider={onSelectProvider} />,
    );

    fireEvent.press(screen.getByRole("button", { name: "카카오 로그인" }));
    fireEvent.press(screen.getByRole("button", { name: "네이버 로그인" }));
    fireEvent.press(screen.getByRole("button", { name: "구글 로그인" }));
    fireEvent.press(
      screen.getByRole("button", { name: "페이스북 로그인 준비 중" }),
    );

    expect(onSelectProvider).toHaveBeenNthCalledWith(1, "KAKAO");
    expect(onSelectProvider).toHaveBeenNthCalledWith(2, "NAVER");
    expect(onSelectProvider).toHaveBeenNthCalledWith(3, "GOOGLE");
    expect(onSelectProvider).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("checkbox", { name: "자동 로그인" })).toBeTruthy();
  });
});
