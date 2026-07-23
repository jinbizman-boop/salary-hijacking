import { componentColors } from "../tokens";

describe("shared component design tokens", () => {
  it("uses the official Salary Hijacking primary green from the planning HTML and Stitch references", () => {
    expect(componentColors.primaryGreen).toBe("#209252");
    expect(componentColors.primaryGreenDark).toBe("#005229");
    expect(componentColors.primaryGreenSoft).toBe("#EAF8EF");
  });
});
