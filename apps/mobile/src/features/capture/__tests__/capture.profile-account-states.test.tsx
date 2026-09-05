import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("profile account capture states", () => {
  it("renders native account security, export, withdrawal, and password states", () => {
    expect(
      render(
        <CapturePreviewScreen kind="profile-account-restricted" />,
      ).getAllByText("계정 접근이 제한됐어요")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="profile-data-export-ready" />,
      ).getAllByText("내보내기 파일이 준비됐어요")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="profile-withdrawal-requested" />,
      ).getAllByText("탈퇴 요청이 접수됐어요")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="profile-biometric-app-lock" />,
      ).getAllByText("앱 잠금 설정")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="profile-password-change" />,
      ).getAllByText("비밀번호 변경")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="profile-account-settings-default" />,
      ).getAllByText("계정 설정")[0],
    ).toBeTruthy();
  });
});
