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
    fireEvent.changeText(screen.getByLabelText("이름"), "홍길동");
    fireEvent.changeText(screen.getByLabelText("닉네임"), "월급수비대");
    fireEvent.changeText(screen.getByLabelText("생년월일"), "1992.03.14");
    fireEvent.changeText(screen.getByLabelText("휴대폰 번호"), "010.1234.5678");
    fireEvent.changeText(screen.getByLabelText("비밀번호"), "P@ssw0rd!");
    fireEvent.changeText(screen.getByLabelText("비밀번호 확인"), "P@ssw0rd!");
    fireEvent.press(screen.getByLabelText("이용약관 필수 동의"));
    fireEvent.press(screen.getByLabelText("개인정보 처리방침 필수 동의"));
    fireEvent.press(screen.getByLabelText("서비스 이용 필수 동의"));
    fireEvent(screen.getByLabelText("비밀번호 확인"), "submitEditing");

    expect(onSubmit).toHaveBeenCalledWith({
      birthDate: "1992.03.14",
      email: "new@example.com",
      name: "홍길동",
      nickname: "월급수비대",
      password: "P@ssw0rd!",
      phoneNumber: "010.1234.5678",
      marketingAccepted: false,
      privacyAccepted: true,
      serviceAccepted: true,
      termsAccepted: true,
    });
  });

  it("submits register fields from the visible signup CTA", () => {
    const onSubmit = jest.fn();
    const screen = render(<SignupForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText("아이디"), "new@example.com");
    fireEvent.changeText(screen.getByLabelText("이름"), "홍길동");
    fireEvent.changeText(screen.getByLabelText("닉네임"), "월급수비대");
    fireEvent.changeText(screen.getByLabelText("생년월일"), "1992.03.14");
    fireEvent.changeText(screen.getByLabelText("휴대폰 번호"), "010.1234.5678");
    fireEvent.changeText(screen.getByLabelText("비밀번호"), "Password123");
    fireEvent.changeText(screen.getByLabelText("비밀번호 확인"), "Password123");
    fireEvent.press(screen.getByLabelText("이용약관 필수 동의"));
    fireEvent.press(screen.getByLabelText("개인정보 처리방침 필수 동의"));
    fireEvent.press(screen.getByLabelText("서비스 이용 필수 동의"));
    fireEvent.press(screen.getByLabelText("회원가입 완료"));

    expect(onSubmit).toHaveBeenCalledWith({
      birthDate: "1992.03.14",
      email: "new@example.com",
      name: "홍길동",
      nickname: "월급수비대",
      password: "Password123",
      phoneNumber: "010.1234.5678",
      marketingAccepted: false,
      privacyAccepted: true,
      serviceAccepted: true,
      termsAccepted: true,
    });
  });

  it("requires explicit required consents before signup submit", () => {
    const onSubmit = jest.fn();
    const screen = render(<SignupForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText("아이디"), "new@example.com");
    fireEvent.changeText(screen.getByLabelText("이름"), "홍길동");
    fireEvent.changeText(screen.getByLabelText("닉네임"), "월급수비대");
    fireEvent.changeText(screen.getByLabelText("생년월일"), "1992.03.14");
    fireEvent.changeText(screen.getByLabelText("휴대폰 번호"), "010.1234.5678");
    fireEvent.changeText(screen.getByLabelText("비밀번호"), "Password123");
    fireEvent.changeText(screen.getByLabelText("비밀번호 확인"), "Password123");
    fireEvent.press(screen.getByLabelText("회원가입 완료"));

    expect(onSubmit).not.toHaveBeenCalled();
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
