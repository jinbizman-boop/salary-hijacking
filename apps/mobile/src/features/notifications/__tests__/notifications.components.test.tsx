import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  NotificationList,
  NotificationPreferenceStrip,
  NotificationScreen,
  NotificationSettingsScreen,
  NotificationSummaryCard,
} from "../components";
import {
  assertMobileNotificationsIndexCompleteness,
  type NotificationHref,
} from "../components/NotificationScreen";
import type { NotificationItem } from "../types";

const mojibakeMarkers = ["湲", "됱", "뿬", "⑹", "뚮", "꾩", "紐", "臾", "�"];

function expectNoMojibake(text: string): void {
  for (const marker of mojibakeMarkers) {
    expect(text).not.toContain(marker);
  }
}

const notifications: readonly NotificationItem[] = [
  {
    notificationId: "ntf_budget",
    type: "BUDGET_WARNING",
    title: "오늘 예산 확인",
    message: "생활비 사용 속도가 빨라졌어요.",
    priority: "HIGH",
    channels: ["IN_APP", "PUSH"],
    deeplink: "/salary",
    status: "UNREAD",
    scheduledAt: null,
    expiresAt: null,
    isMandatory: false,
    metadata: {},
    createdAt: "2026-07-10T00:00:00.000Z",
    readAt: null,
    archivedAt: null,
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  },
  {
    notificationId: "ntf_level",
    type: "LEVEL_UP",
    title: "LV UP 루틴",
    message: "오늘 기록하면 XP를 받을 수 있어요.",
    priority: "NORMAL",
    channels: ["IN_APP"],
    deeplink: "/level",
    status: "READ",
    scheduledAt: null,
    expiresAt: null,
    isMandatory: false,
    metadata: {},
    createdAt: "2026-07-10T01:00:00.000Z",
    readAt: "2026-07-10T02:00:00.000Z",
    archivedAt: null,
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  },
];

describe("notifications feature components", () => {
  it("renders readable unread and important counts without raw push token data", () => {
    const screen = render(
      <NotificationSummaryCard
        importantCount={1}
        unreadCount={3}
        updatedAtLabel="방금 전"
      />,
    );

    expect(screen.getByText("새 알림")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("중요 1")).toBeTruthy();
    expect(
      screen.getByText("푸시 토큰 원문은 표시하지 않습니다."),
    ).toBeTruthy();
    expect(screen.queryByText("pushTokenRendered=false")).toBeNull();
    expect(screen.queryByText(/fcm|push token|bearer/iu)).toBeNull();
    expectNoMojibake(screen.toJSON() ? JSON.stringify(screen.toJSON()) : "");
  });

  it("renders notification rows with unread status and safe deeplink actions", () => {
    const onOpen = jest.fn();
    const screen = render(
      <NotificationList items={notifications} onOpenNotification={onOpen} />,
    );

    expect(screen.getByText("오늘 예산 확인")).toBeTruthy();
    expect(screen.getByLabelText("읽지 않은 알림")).toBeTruthy();
    expect(
      screen.getByText("민감 금액 원문은 알림에 담지 않습니다."),
    ).toBeTruthy();
    expect(screen.getByText("광고 타겟팅 데이터와 분리됩니다.")).toBeTruthy();
    expect(screen.queryByText("sensitiveFinancialData=false")).toBeNull();
    expect(screen.queryByText("adTargetingSeparated=true")).toBeNull();

    fireEvent.press(
      screen.getByRole("button", { name: "오늘 예산 확인 /salary" }),
    );

    expect(onOpen).toHaveBeenCalledWith(notifications[0]);
    expectNoMojibake(screen.toJSON() ? JSON.stringify(screen.toJSON()) : "");
  });

  it("renders standalone notification screen and opens deep links", () => {
    const opened: NotificationHref[] = [];
    const screen = render(
      <NotificationScreen onOpenHref={(href) => opened.push(href)} />,
    );

    expect(screen.getByText("알림")).toBeTruthy();
    expect(screen.getByText("새로운 알림이 있어요")).toBeTruthy();
    expect(screen.getByText("내 급여 납치 현황 목표 달성")).toBeTruthy();
    expect(screen.queryByText(/5,780,000|5,500,000/u)).toBeNull();
    expect(screen.queryByText("급여")).toBeNull();
    expect(screen.queryByText("계획")).toBeNull();

    fireEvent.press(
      screen.getByRole("button", {
        name: "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기 열기",
      }),
    );

    expect(opened).toEqual(["/level/reading"]);
    expectNoMojibake(screen.toJSON() ? JSON.stringify(screen.toJSON()) : "");
  });

  it("renders notification empty, offline, and error variants with retry actions", () => {
    const retry = jest.fn();
    const empty = render(<NotificationScreen variant="empty" />);
    expect(empty.getByText("새로운 알림이 없어요")).toBeTruthy();
    expect(empty.queryByText("급여")).toBeNull();
    expectNoMojibake(empty.toJSON() ? JSON.stringify(empty.toJSON()) : "");

    const offline = render(
      <NotificationScreen onRetry={retry} variant="offline" />,
    );
    expect(offline.getByText("오프라인 보호 모드")).toBeTruthy();
    fireEvent.press(offline.getByRole("button", { name: "다시 연결" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expectNoMojibake(offline.toJSON() ? JSON.stringify(offline.toJSON()) : "");

    const error = render(
      <NotificationScreen onRetry={retry} variant="error" />,
    );
    expect(error.getByText("알림을 불러오지 못했어요")).toBeTruthy();
    fireEvent.press(error.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledTimes(2);
    expectNoMojibake(error.toJSON() ? JSON.stringify(error.toJSON()) : "");
  });

  it("renders all-read and no-unread-with-list states with readable history", () => {
    const allRead = render(<NotificationScreen variant="all-read" />);
    expect(allRead.getByText("모든 알림을 읽었어요")).toBeTruthy();
    expect(allRead.getByText("최근 알림 기록")).toBeTruthy();
    expect(
      allRead.getByText("내 급여 납치 현황 목표 달성"),
    ).toBeTruthy();
    expect(allRead.queryByText("급여")).toBeNull();
    expectNoMojibake(allRead.toJSON() ? JSON.stringify(allRead.toJSON()) : "");

    const noUnread = render(
      <NotificationScreen variant="no-unread-with-list" />,
    );
    expect(noUnread.getByText("읽지 않은 알림은 없어요")).toBeTruthy();
    expect(noUnread.getByText("최근 알림 기록")).toBeTruthy();
    expect(noUnread.getByText("Today, Business Conversation")).toBeTruthy();
    expect(noUnread.queryByText("계획")).toBeNull();
    expectNoMojibake(
      noUnread.toJSON() ? JSON.stringify(noUnread.toJSON()) : "",
    );
  });

  it("keeps notification index completeness contract readable", () => {
    const contract = assertMobileNotificationsIndexCompleteness();

    expect(contract.ok).toBe(true);
    expect(contract.checks).toContain("새로운 알림이 있어요");
    expect(contract.checks).toContain("금융 원천 데이터 광고 타겟팅 금지");
    expectNoMojibake(contract.checks.join("\n"));
  });

  it("renders notification preferences and mark-all-read action", () => {
    const onMarkAllRead = jest.fn();
    const screen = render(
      <NotificationPreferenceStrip
        marketingEnabled={false}
        onMarkAllRead={onMarkAllRead}
        pushEnabled
      />,
    );

    expect(screen.getByText("푸시 켜짐")).toBeTruthy();
    expect(screen.getByText("마케팅 꺼짐")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "모두 읽음" }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expectNoMojibake(screen.toJSON() ? JSON.stringify(screen.toJSON()) : "");
  });

  it("renders notification settings without bottom navigation and saves preferences", async () => {
    jest.useFakeTimers();
    const onBack = jest.fn();
    const onOpenSystemSettings = jest.fn();
    const screen = render(
      <NotificationSettingsScreen
        onBack={onBack}
        onOpenSystemSettings={onOpenSystemSettings}
      />,
    );

    expect(screen.getByText("알림 설정")).toBeTruthy();
    expect(screen.getByText("급여/납치금액")).toBeTruthy();
    expect(screen.queryByText("급여")).toBeNull();
    expect(screen.queryByText("계획")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "알림 설정 저장" }));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("알림 설정을 저장했습니다.")).toBeTruthy();
    });

    fireEvent.press(
      screen.getByRole("button", { name: "Android 시스템 알림 설정 열기" }),
    );
    expect(onOpenSystemSettings).toHaveBeenCalledTimes(1);
    expectNoMojibake(screen.toJSON() ? JSON.stringify(screen.toJSON()) : "");
    jest.useRealTimers();
  });
});
