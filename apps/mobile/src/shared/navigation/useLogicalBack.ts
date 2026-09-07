import { useCallback, useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import type { Href, Router } from "expo-router";

export type LogicalBackOptions = Readonly<{
  fallbackHref: Href;
  router: Router;
}>;

export function useLogicalBack({
  fallbackHref,
  router,
}: LogicalBackOptions): () => void {
  const goBack = useCallback((): void => {
    router.replace(fallbackHref as never);
  }, [fallbackHref, router]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [goBack]);

  return goBack;
}
