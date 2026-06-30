/* eslint-env jest */
/* global beforeAll, by, describe, device, element, expect, it */

describe("Salary Hijacking mobile shell", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: "NO",
      },
    });
  });

  it("launches the Expo Router root shell", async () => {
    await expect(element(by.id("salary-hijacking-mobile-root"))).toBeVisible();
  });
});
