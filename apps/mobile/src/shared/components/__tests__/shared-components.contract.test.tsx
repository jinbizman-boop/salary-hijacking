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
    expect(source).toContain("paddingBottom:");
    expect(source).toContain("designSystem.navigation.bottomTabs.visualHeight");
    expect(source).toContain("componentSpacing.lg");
    expect(source).toContain("insets.bottom");
    expect(source).toContain("paddingTop: insets.top");
    expect(source).toContain("StatusBar");
    expect(source).toContain('barStyle="dark-content"');
    expect(source).toContain("backgroundColor={componentColors.background}");
  });

  it("renders modal overlays outside the scroll content so actions stay reachable", () => {
    const source = readFileSync(join(__dirname, "..", "AppShell.tsx"), "utf8");

    expect(source).toContain("overlay?: React.ReactNode");
    expect(source).toContain("overlay,");
    expect(source).toMatch(
      /<\/ScrollView>\s*\{overlay \? <View style=\{styles\.overlay\}>\{overlay\}<\/View> : null\}/,
    );
    expect(source).toContain("...StyleSheet.absoluteFillObject");
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
        "SalaryHomeScreen.tsx",
      ),
      join(
        __dirname,
        "..",
        "..",
        "..",
        "features",
        "plan",
        "components",
        "PlanScreen.tsx",
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
        header={<AppHeader subtitle="오늘의 흐름" title="급여납치" />}
      >
        <SurfaceCard accessibilityLabel="요약 카드">
          <MoneyText accessibilityLabel="이번 달 납치 금액" amount={5780000} />
          <ProgressBar accessibilityLabel="목표 진행률" value={72} />
        </SurfaceCard>
      </AppShell>,
    );

    expect(screen.getByLabelText("급여납치 오늘의 흐름")).toBeTruthy();
    expect(screen.getByLabelText("요약 카드")).toBeTruthy();
    expect(screen.getByText("5,780,000원")).toBeTruthy();
    expect(screen.getByLabelText("목표 진행률 72%")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "LV UP 탭" }));
    expect(onTabPress).toHaveBeenCalledWith("level");
  });

  it("renders AppHeader semantic variants with canonical back and action controls", () => {
    const onBack = jest.fn();
    const onBrandPress = jest.fn();
    const onAction = jest.fn();
    const screen = render(
      <AppHeader
        actionLabel="알림 설정 열기"
        actionText="설정"
        onAction={onAction}
        onBack={onBack}
        onBrandPress={onBrandPress}
        subtitle="서버 기준"
        title="알림"
        variant="TITLE_ACTION"
      />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "이전 화면으로 돌아가기" }),
    );
    fireEvent.press(screen.getByRole("button", { name: "급여 홈" }));
    fireEvent.press(screen.getByRole("button", { name: "알림 설정 열기" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onBrandPress).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
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

  it("emits optional release perf markers from canonical buttons", () => {
    const info = jest.spyOn(globalThis.console, "info").mockImplementation();

    const screen = render(
      <PrimaryButton
        accessibilityLabel="지출 추가"
        label="지출 추가"
        onPress={jest.fn()}
        perfMarker="interaction.quick_expense.press"
      />,
    );

    fireEvent(screen.getByRole("button", { name: "지출 추가" }), "pressIn");

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("marker=interaction.quick_expense.press"),
    );

    info.mockRestore();
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
    expect(screen.queryByText("RESERVED")).toBeNull();
    expect(screen.queryByText("NO_FILL")).toBeNull();
    expect(screen.queryByText("ERROR")).toBeNull();
    expect(screen.getByLabelText("오늘 남은 예산 7,000원")).toBeTruthy();
  });
});
