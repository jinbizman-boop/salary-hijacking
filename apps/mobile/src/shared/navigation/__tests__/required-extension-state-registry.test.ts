import {
  CANONICAL_DESTRUCTIVE_STATE_TOTAL,
  CANONICAL_VALIDATION_STATE_TOTAL,
  PRODUCT_REQUIRED_EXTENSION_IMPLEMENTED,
  PRODUCT_REQUIRED_EXTENSION_STATES,
  PRODUCT_REQUIRED_EXTENSION_UNIMPLEMENTED,
  requiredExtensionStateRegistry,
} from "../required-extension-state-registry";

describe("required extension UI state registry", () => {
  it("keeps product-required validation and destructive states mapped to native production surfaces", () => {
    expect(PRODUCT_REQUIRED_EXTENSION_STATES).toBe(20);
    expect(CANONICAL_VALIDATION_STATE_TOTAL).toBe(12);
    expect(CANONICAL_DESTRUCTIVE_STATE_TOTAL).toBe(8);
    expect(PRODUCT_REQUIRED_EXTENSION_IMPLEMENTED).toBe(
      PRODUCT_REQUIRED_EXTENSION_STATES,
    );
    expect(PRODUCT_REQUIRED_EXTENSION_UNIMPLEMENTED).toBe(0);

    for (const state of requiredExtensionStateRegistry) {
      expect(state.productionRoute).toMatch(/^\/|\(auth\)/u);
      expect(state.routeFile).toContain("apps/mobile/app/");
      expect(state.nativeComponent).toMatch(/[A-Z]/u);
      expect(state.designSystemComponent).toMatch(/[A-Z]/u);
      expect(state.recoveryAction.length).toBeGreaterThan(0);
      expect(state.nativeImplemented).toBe(true);
    }
  });
});
