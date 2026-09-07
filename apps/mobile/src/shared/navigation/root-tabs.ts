import type { Href } from "expo-router";

export type RootTabName = "salary" | "plan" | "level" | "community" | "profile";

export const ROOT_TAB_ROUTES: Readonly<Record<RootTabName, Href>> = {
  community: "/community",
  level: "/level",
  plan: "/plan",
  profile: "/profile",
  salary: "/salary",
} as const;

export const ROOT_TAB_NAVIGATION_PRIORITY = {
  androidBack: "2_PREVIOUS_SCREEN",
  bottomTabTap: "1_EXPLICIT_TAB_PRESS",
} as const;

export function getRootTabHref(tabName: RootTabName): Href {
  return ROOT_TAB_ROUTES[tabName];
}
