import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render } from "@testing-library/react-native";

import {
  AccessibilityMoneyAnnouncer,
  AdBannerSlot,
  AppHeader,
  AppShell,
  BottomTabBar,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyText,
  PillTabs,
  PrimaryButton,
  ProgressBar,
  RecordInputCard,
  SurfaceCard,
  XpToast,
} from "..";

describe("shared mobile components", () => {
  it("keeps AppShell keyboard and safe-area aware for shared input screens", () => {
    const source = readFileSync(join(__dirname, "..", "AppShell.tsx"), "utf8");

    expect(source).toContain("KeyboardAvoidingView");
    expect(source).toContain("automaticallyAdjustKeyboardInsets");
    expect(source).toContain('keyboardDismissMode="interactive"');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain("keyboardVerticalOffset={insets.top}");
    expect(source).toContain("paddingBottom: 96 + insets.bottom");
    expect(source).toContain("paddingTop: insets.top");
  });

  it("keeps every launch-critical input shell on the keyboard-safe contract", () => {
    const inputShells = [
      join(
        __dirname,
        "..",
        "..",
        "..",
        "features",
        "auth",
        "components",
        "AuthVisualFrame.tsx",
      ),
      join(
        __dirname,
        "..",
        "..",
        "..",
        "features",
        "salary",
        "components",
        "SalaryHomeReferenceScreen.tsx",
      ),
      join(
        __dirname,
        "..",
        "..",
        "..",
        "features",
        "plan",
        "components",
        "PlanReferenceScreen.tsx",
      ),
    ];

    for (const filePath of inputShells) {
      const source = readFileSync(filePath, "utf8");

      expect(source).toContain("KeyboardAvoidingView");
      expect(source).toContain("automaticallyAdjustKeyboardInsets");
      expect(source).toContain('keyboardDismissMode="interactive"');
      expect(source).toContain('keyboardShouldPersistTaps="handled"');
      expect(source).toContain("keyboardVerticalOffset");
    }
  });

  it("renders mobile shell, header, cards, and tab navigation with accessible controls", () => {
    const onTabPress = jest.fn();
    const screen = render(
      <AppShell
        bottomTabBar={
          <BottomTabBar
            activeKey="salary"
            items={[
              { key: "salary", label: "급여", accessibilityLabel: "급여 탭" },
              { key: "level", label: "LV UP", accessibilityLabel: "LV UP 탭" },
            ]}
            onTabPress={onTabPress}
          />
        }
        header={<AppHeader subtitle="서버 권위" title="급여납치" />}
      >
        <SurfaceCard accessibilityLabel="요약 카드">
          <MoneyText accessibilityLabel="이번 달 납치 금액" amount={5780000} />
          <ProgressBar accessibilityLabel="목표 진행률" value={72} />
        </SurfaceCard>
      </AppShell>,
    );

    expect(screen.getByLabelText("급여납치 서버 권위")).toBeTruthy();
    expect(screen.getByLabelText("요약 카드")).toBeTruthy();
    expect(screen.getByText("5,780,000원")).toBeTruthy();
    expect(screen.getByLabelText("목표 진행률 72%")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "LV UP 탭" }));
    expect(onTabPress).toHaveBeenCalledWith("level");
  });

  it("keeps buttons, pill tabs, records, XP, and state components accessible", () => {
    const onButtonPress = jest.fn();
    const onTabChange = jest.fn();
    const onRecordChange = jest.fn();
    const onRecordSubmit = jest.fn();
    const screen = render(
      <>
        <PrimaryButton
          accessibilityLabel="지출 추가"
          label="지출 추가"
          onPress={onButtonPress}
        />
        <PillTabs
          activeKey="reading"
          items={[
            { key: "reading", label: "독서" },
            { key: "news", label: "뉴스" },
          ]}
          onChange={onTabChange}
        />
        <RecordInputCard
          label="private LV UP record"
          onChangeText={onRecordChange}
          onSubmit={onRecordSubmit}
          placeholder="오늘의 기록"
          value=""
        />
        <XpToast earnedXp={30} label="XP 증가" />
        <LoadingSkeleton label="LV UP 불러오는 중" />
        <EmptyState description="새 미션을 동기화하세요." title="기록 없음" />
        <ErrorState
          message="다시 시도할 수 있어요."
          onRetry={jest.fn()}
          retryLabel="재시도"
          title="불러오기 실패"
        />
      </>,
    );

    fireEvent.press(screen.getByRole("button", { name: "지출 추가" }));
    fireEvent.press(screen.getByRole("button", { name: "뉴스" }));
    fireEvent.changeText(
      screen.getByLabelText("private LV UP record"),
      "읽고 기록",
    );
    fireEvent.press(screen.getByRole("button", { name: "기록 완료" }));

    expect(onButtonPress).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith("news");
    expect(onRecordChange).toHaveBeenCalledWith("읽고 기록");
    expect(onRecordSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("XP 증가 30 XP")).toBeTruthy();
    expect(screen.getByLabelText("LV UP 불러오는 중")).toBeTruthy();
    expect(screen.getByText("기록 없음")).toBeTruthy();
    expect(screen.getByRole("button", { name: "재시도" })).toBeTruthy();
  });

  it("labels contextual ads and announces money without exposing raw targeting data", () => {
    const screen = render(
      <>
        <AdBannerSlot
          label="제휴/광고"
          title="생활비 혜택"
          description="문맥형 광고로만 보여드려요."
        />
        <AccessibilityMoneyAnnouncer amount={7000} label="오늘 남은 예산" />
      </>,
    );

    expect(screen.getByLabelText("제휴/광고 생활비 혜택")).toBeTruthy();
    expect(
      screen.getByText("민감 금융 데이터로 맞춤 타겟팅하지 않아요."),
    ).toBeTruthy();
    expect(screen.getByLabelText("오늘 남은 예산 7,000원")).toBeTruthy();
  });
});
