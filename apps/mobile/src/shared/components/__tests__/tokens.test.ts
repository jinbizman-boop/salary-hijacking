import {
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
  salaryHijackingDesignSystem,
} from "../tokens";

describe("shared component design tokens", () => {
  it("freezes the canonical Salary Hijacking design system palette", () => {
    expect(salaryHijackingDesignSystem.colors.brand.primary).toBe("#209252");
    expect(salaryHijackingDesignSystem.colors.brand.secondary).toBe("#2FA86A");
    expect(salaryHijackingDesignSystem.colors.brand.primarySoft).toBe("#EAF6EF");
    expect(salaryHijackingDesignSystem.colors.brand.surface).toBe("#D9F0E3");
    expect(salaryHijackingDesignSystem.colors.text.primary).toBe("#202327");
    expect(salaryHijackingDesignSystem.colors.text.secondary).toBe("#6D737A");
    expect(salaryHijackingDesignSystem.colors.border.default).toBe("#E7EBEF");
    expect(salaryHijackingDesignSystem.colors.surface.subtle).toBe("#F7F9FA");
    expect(salaryHijackingDesignSystem.colors.semantic.warning).toBe("#F7D34D");
    expect(salaryHijackingDesignSystem.colors.semantic.danger).toBe("#D74B4B");
  });

  it("keeps shared component tokens derived from the canonical palette", () => {
    expect(componentColors.background).toBe(
      salaryHijackingDesignSystem.colors.surface.subtle,
    );
    expect(componentColors.primaryGreen).toBe(
      salaryHijackingDesignSystem.colors.brand.primary,
    );
    expect(componentColors.primaryGreenDark).toBe(
      salaryHijackingDesignSystem.colors.brand.primaryPressed,
    );
    expect(componentColors.primaryGreenSoft).toBe(
      salaryHijackingDesignSystem.colors.brand.primarySoft,
    );
    expect(componentColors.textPrimary).toBe(
      salaryHijackingDesignSystem.colors.text.primary,
    );
    expect(componentColors.line).toBe(
      salaryHijackingDesignSystem.colors.border.default,
    );
  });

  it("normalizes spacing, radius, typography, navigation, and header contracts", () => {
    expect(salaryHijackingDesignSystem.spacing).toEqual({
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      8: 32,
      10: 40,
    });
    expect(salaryHijackingDesignSystem.radius).toEqual({
      sm: 8,
      md: 12,
      lg: 16,
      xl: 22,
      full: 999,
    });
    expect(salaryHijackingDesignSystem.navigation.bottomTabs.labels).toEqual([
      "홈",
      "계획",
      "LV UP",
      "커뮤니티",
      "MY",
    ]);
    expect(salaryHijackingDesignSystem.navigation.bottomTabs.visualHeight).toBe(
      74,
    );
    expect(salaryHijackingDesignSystem.navigation.bottomTabs.safeAreaAware).toBe(
      true,
    );
    expect(salaryHijackingDesignSystem.header.variants).toEqual([
      "ROOT",
      "BACK",
      "TITLE",
      "TITLE_ACTION",
      "TRANSPARENT",
    ]);

    expect(componentSpacing.lg).toBe(salaryHijackingDesignSystem.spacing[5]);
    expect(componentRadius.button).toBe(salaryHijackingDesignSystem.radius.md);
    expect(componentRadius.card).toBe(salaryHijackingDesignSystem.radius.lg);
    expect(componentTypography.heroAmount).toBe(
      salaryHijackingDesignSystem.typography.amountXL.fontSize,
    );
    expect(
      Object.values(salaryHijackingDesignSystem.typography).every(
        (token) => token.letterSpacing === 0,
      ),
    ).toBe(true);
  });
});
