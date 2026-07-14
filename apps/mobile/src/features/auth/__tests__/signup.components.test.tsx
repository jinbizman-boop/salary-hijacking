import { fireEvent, render } from "@testing-library/react-native";

import { SignupAgreementCard, SignupForm, SignupHero } from "../components";

describe("signup feature components", () => {
  it("renders signup with the same reference brand system", () => {
    const screen = render(<SignupHero />);

    expect(screen.getByText("급여납치")).toBeTruthy();
    expect(screen.getByText("SALARY HIJACKING")).toBeTruthy();
    expect(screen.getByText("회원가입")).toBeTruthy();
  });

  it("submits register fields and required consent flags", () => {
    const onSubmit = jest.fn();
    const screen = render(<SignupForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText("아이디"), "new@example.com");
    fireEvent.changeText(screen.getByLabelText("닉네임"), "월급수비대");
    fireEvent.changeText(screen.getByLabelText("비밀번호"), "P@ssw0rd!");
    fireEvent(screen.getByLabelText("비밀번호"), "submitEditing");

    expect(onSubmit).toHaveBeenCalledWith({
      email: "new@example.com",
      nickname: "월급수비대",
      password: "P@ssw0rd!",
      privacyAccepted: true,
      termsAccepted: true,
      marketingAccepted: false,
    });
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
    expect(screen.getByText("마케팅 선택")).toBeTruthy();
  });
});
