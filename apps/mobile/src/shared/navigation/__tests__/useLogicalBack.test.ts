import { act, renderHook } from "@testing-library/react-native";

import { useLogicalBack } from "../useLogicalBack";

describe("useLogicalBack", () => {
  it("uses native router history before falling back to the logical parent", () => {
    const router = {
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      replace: jest.fn(),
    };

    const { result } = renderHook(() =>
      useLogicalBack({ fallbackHref: "/level", router: router as never }),
    );

    act(() => result.current());

    expect(router.canGoBack).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("falls back only when route history is unavailable", () => {
    const router = {
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      replace: jest.fn(),
    };

    const { result } = renderHook(() =>
      useLogicalBack({ fallbackHref: "/level", router: router as never }),
    );

    act(() => result.current());

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/level");
  });
});
