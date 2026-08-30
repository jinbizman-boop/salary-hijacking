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

  it("submits id and password through the final reference login form", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <LoginCredentialForm
        onForgotPasswordPress={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.changeText(screen.getByLabelText("아이디"), "user@example.com");
    fireEvent.changeText(screen.getByLabelText("비밀번호"), "P@ssw0rd!");
    fireEvent.press(screen.getByRole("button", { name: "로그인" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "P@ssw0rd!",
      rememberMe: true,
    });
    expect(screen.getByPlaceholderText("아이디를 입력하세요")).toBeTruthy();
    expect(screen.getByPlaceholderText("비밀번호를 입력하세요")).toBeTruthy();
    expect(screen.getByText("비밀번호 찾기")).toBeTruthy();
  });

  it("routes final reference social login buttons without stale providers", () => {
    const onSelectProvider = jest.fn();
    const screen = render(
      <SocialLoginButtons onSelectProvider={onSelectProvider} />,
    );

    fireEvent.press(screen.getByRole("button", { name: "카카오로 계속하기" }));
    fireEvent.press(screen.getByRole("button", { name: "네이버로 계속하기" }));
    fireEvent.press(screen.getByRole("button", { name: "Apple로 로그인" }));

    expect(onSelectProvider).toHaveBeenNthCalledWith(1, "KAKAO");
    expect(onSelectProvider).toHaveBeenNthCalledWith(2, "NAVER");
    expect(onSelectProvider).toHaveBeenNthCalledWith(3, "APPLE");
    expect(onSelectProvider).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("button", { name: /페이스북|구글/u })).toBeNull();
  });
});
