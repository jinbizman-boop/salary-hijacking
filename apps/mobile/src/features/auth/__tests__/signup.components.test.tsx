import { fireEvent, render } from "@testing-library/react-native";

import { SignupAgreementCard, SignupForm, SignupHero } from "../components";

describe("signup feature components", () => {
  it("renders signup hero without raw credential exposure", () => {
    const screen = render(<SignupHero />);

    expect(screen.getByText("회원가입")).toBeTruthy();
    expect(screen.getByText("급여를 지키는 첫 설정을 시작해요")).toBeTruthy();
    expect(screen.getByText("rawCredentialData=false")).toBeTruthy();
  });

  it("submits register fields and required consent flags", () => {
    const onSubmit = jest.fn();
    const screen = render(<SignupForm onSubmit={onSubmit} />);

    fireEvent.changeText(
      screen.getByLabelText("가입 이메일"),
      "new@example.com",
    );
    fireEvent.changeText(screen.getByLabelText("닉네임"), "월급수비대");
    fireEvent.changeText(screen.getByLabelText("가입 비밀번호"), "P@ssw0rd!");
    fireEvent.press(screen.getByRole("button", { name: "서버 기준 가입" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "new@example.com",
      nickname: "월급수비대",
      password: "P@ssw0rd!",
      privacyAccepted: true,
      termsAccepted: true,
      marketingAccepted: false,
    });
    expect(screen.getByText("passwordRendered=false")).toBeTruthy();
  });

  it("renders agreement status with contextual marketing off by default", () => {
    const screen = render(
      <SignupAgreementCard
        marketingAccepted={false}
        privacyAccepted
        termsAccepted
      />,
    );

    expect(screen.getByText("약관 동의 완료")).toBeTruthy();
    expect(screen.getByText("개인정보 동의 완료")).toBeTruthy();
    expect(screen.getByText("마케팅 동의 안 함")).toBeTruthy();
    expect(screen.getByText("financialAdTargeting=false")).toBeTruthy();
  });
});
