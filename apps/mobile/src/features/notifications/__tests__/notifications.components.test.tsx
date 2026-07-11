import { fireEvent, render } from "@testing-library/react-native";

import {
  NotificationList,
  NotificationPreferenceStrip,
  NotificationSummaryCard,
} from "../components";
import type { NotificationItem } from "../types";

const notifications: readonly NotificationItem[] = [
  {
    notificationId: "ntf_budget",
    type: "BUDGET_WARNING",
    title: "오늘 예산 확인",
    message: "생활비 사용 속도가 빨라졌어요",
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
    message: "오늘 기록하면 XP를 받을 수 있어요",
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
  it("renders unread and important counts without raw push token data", () => {
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
    expect(screen.getByText("pushTokenRendered=false")).toBeTruthy();
    expect(screen.queryByText(/fcm|push token|bearer/iu)).toBeNull();
  });

  it("renders notification rows with unread status and safe deeplink actions", () => {
    const onOpen = jest.fn();
    const screen = render(
      <NotificationList items={notifications} onOpenNotification={onOpen} />,
    );

    expect(screen.getByText("오늘 예산 확인")).toBeTruthy();
    expect(screen.getByLabelText("읽지 않은 알림")).toBeTruthy();
    expect(screen.getByText("sensitiveFinancialData=false")).toBeTruthy();
    expect(screen.getByText("adTargetingSeparated=true")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "오늘 예산 확인 /salary" }),
    );

    expect(onOpen).toHaveBeenCalledWith(notifications[0]);
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
  });
});
