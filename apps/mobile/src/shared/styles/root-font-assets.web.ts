/* eslint-disable @typescript-eslint/no-require-imports */

export function getRootFontAssets(): Readonly<Record<string, unknown>> {
  return {
    "Freesentation-4Regular": require("../../../assets/fonts/Freesentation-4Regular.ttf"),
    "Freesentation-5Medium": require("../../../assets/fonts/Freesentation-5Medium.ttf"),
    "Freesentation-6SemiBold": require("../../../assets/fonts/Freesentation-6SemiBold.ttf"),
    "Freesentation-7Bold": require("../../../assets/fonts/Freesentation-7Bold.ttf"),
    "Freesentation-8ExtraBold": require("../../../assets/fonts/Freesentation-8ExtraBold.ttf"),
    "Freesentation-9Black": require("../../../assets/fonts/Freesentation-9Black.ttf"),
  };
}
