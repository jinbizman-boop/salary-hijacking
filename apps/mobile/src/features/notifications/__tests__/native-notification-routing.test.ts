import {
  createNativeNotificationRouting,
  notificationRouteFromResponse,
} from "../native-notification-routing";

describe("native notification routing", () => {
  it("extracts only canonical in-app notification deeplinks from FCM responses", () => {
    expect(
      notificationRouteFromResponse({
        notification: {
          request: {
            content: {
              data: { deeplink: "salaryhijacking://notifications" },
            },
          },
        },
      }),
    ).toBe("/notifications");

    expect(
      notificationRouteFromResponse({
        notification: {
          request: {
            content: {
              data: { deeplink: "https://example.invalid/phish" },
            },
          },
        },
      }),
    ).toBeNull();
  });

  it("registers foreground display and response handlers without exposing raw payloads", () => {
    const setNotificationHandler = jest.fn();
    const addNotificationResponseReceivedListener = jest.fn(() => ({
      remove: jest.fn(),
    }));
    const getLastNotificationResponseAsync = jest.fn(async () => ({
      notification: {
        request: {
          content: {
            data: { deeplink: "salaryhijacking://notifications/settings" },
          },
        },
      },
    }));
    const replace = jest.fn();

    const routing = createNativeNotificationRouting({
      notifications: {
        addNotificationResponseReceivedListener,
        getLastNotificationResponseAsync,
        setNotificationHandler,
      },
      router: { replace },
    });

    void routing.replayLastResponse();

    expect(setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
    expect(addNotificationResponseReceivedListener).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});
