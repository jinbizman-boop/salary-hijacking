import { fireEvent, render } from "@testing-library/react-native";

import {
  DailyBudgetSection,
  FixedExpenseSection,
  SalaryHeroCard,
  SalaryMetricGrid,
  VariableExpenseQuickAdd,
} from "../components";

describe("salary feature components", () => {
  it("renders server-authoritative salary summary with KRW integer money", () => {
    const screen = render(
      <>
        <SalaryHeroCard
          savedAmount={5780000}
          subtitle="서버가 계산한 이번 달 납치금액"
          title="이번 달 내가 지켜낸 돈"
        />
        <SalaryMetricGrid
          metrics={[
            { label: "수령금액", amount: 2700000 },
            { label: "지출금액", amount: 773000 },
            { label: "이번 달 납치금액", amount: 1927000 },
            { label: "다음 급여일 D-day", value: "D-14" },
          ]}
        />
      </>,
    );

    expect(screen.getByText("이번 달 내가 지켜낸 돈")).toBeTruthy();
    expect(screen.getByText("5,780,000원")).toBeTruthy();
    expect(screen.getByLabelText("수령금액 2,700,000원")).toBeTruthy();
    expect(screen.getByText("D-14")).toBeTruthy();
    expect(screen.getByText("serverAuthority=true")).toBeTruthy();
  });

  it("renders fixed expenses and daily budget without exposing raw account data", () => {
    const onRefresh = jest.fn();
    const screen = render(
      <>
        <DailyBudgetSection
          configuredAmount={20000}
          onRefresh={onRefresh}
          remainingAmount={7000}
          spentAmount={13000}
        />
        <FixedExpenseSection
          expenses={[
            {
              id: "fx_chatgpt",
              title: "ChatGPT",
              amount: 30000,
              status: "납부완료",
            },
            {
              id: "fx_video",
              title: "넷플릭스",
              amount: 15000,
              status: "납부완료",
            },
          ]}
        />
      </>,
    );

    expect(screen.getByLabelText("오늘 남은 예산 7,000원")).toBeTruthy();
    expect(screen.getByLabelText("오늘 예산 사용률 65%")).toBeTruthy();
    expect(screen.getByText("ChatGPT")).toBeTruthy();
    expect(screen.getByText("rawAccountData=false")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "오늘 예산 새로고침" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("collects variable expense input while leaving calculation to the server", () => {
    const onSubmit = jest.fn();
    const screen = render(<VariableExpenseQuickAdd onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText("지출 제목"), "점심");
    fireEvent.changeText(screen.getByLabelText("지출 금액"), "6500");
    fireEvent.press(screen.getByRole("button", { name: "지출 추가하기" }));

    expect(onSubmit).toHaveBeenCalledWith({ title: "점심", amount: 6500 });
    expect(
      screen.getByText("계산은 서버 응답 기준으로 갱신됩니다."),
    ).toBeTruthy();
  });
});
