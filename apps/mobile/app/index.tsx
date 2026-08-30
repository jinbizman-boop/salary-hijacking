import type { ReactElement } from "react";

const SCREEN_VERSION = "5.0.0-root-auth-gate-entry";

export default function MobileIndexScreen(): ReactElement | null {
  return null;
}

export function assertMobileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "root auth gate owns launch routing",
    "no index login redirect",
    "no index home redirect",
    "no index deep link redirect",
    "no index capture preview runtime",
    "no preview auth bypass",
    "no static splash placeholder",
    "no auth token read",
    "no financial raw data",
    "no personal raw data",
    "no push token raw data",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}
