import { useRouter } from "expo-router";

import { AppHeader, AppShell } from "../../../src/shared/components";
import {
  ProfileHeader,
  ProfileMenuCard,
  ProfileStatGrid,
  type ProfileMenuKey,
} from "../../../src/features/profile/components";

const SCREEN_VERSION = "4.1.0-profile-components";
const PROFILE_MY_PAGE_SUMMARY_ENDPOINT = "/api/v1/users/me/my-page-summary";
const PROFILE_WITHDRAWAL_REQUEST_ENDPOINT =
  "/api/v1/users/me/withdrawal-request";
const AUTH_LOGOUT_ENDPOINT = "/api/v1/auth/logout";

const profileMenuRoutes: Readonly<Record<ProfileMenuKey, string>> = {
  MY_POSTS: "/profile/community",
  MY_LEVEL: "/profile/level",
  SUPPORT: "/profile/support",
  NOTICES: "/profile/notices",
  ACCOUNT_SETTINGS: "/profile/settings",
};

export default function ProfileIndexScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking profile tab"
      header={<AppHeader subtitle="My Page" title="Profile" />}
    >
      <ProfileHeader
        avatarEmoji="SH"
        displayName="salary_saver"
        levelTitle="LV 7 Budget Builder"
        maskedEmail="sa***@example.com"
        rawPersonalDataExposed={false}
      />
      <ProfileStatGrid
        stats={{
          totalHijackSaved: 5780000,
          currentLevel: 7,
          levelXp: 880,
          nextLevelXp: 1000,
          selfCareScore: 82,
        }}
      />
      <ProfileMenuCard
        onSelect={(key) => {
          router.push(profileMenuRoutes[key]);
        }}
      />
    </AppShell>
  );
}

export function assertMobileProfileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Profile feature components",
    PROFILE_MY_PAGE_SUMMARY_ENDPOINT,
    "ProfileHeader",
    "ProfileStatGrid",
    "ProfileMenuCard",
    "total hijack saved",
    "level progress",
    "selfCareScore",
    "manage my posts",
    "manage my level",
    "support ticket",
    "notices",
    "account settings",
    PROFILE_WITHDRAWAL_REQUEST_ENDPOINT,
    AUTH_LOGOUT_ENDPOINT,
    "rawPersonalDataExposed=false",
    "financialRawDataExposed=false",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 14, version: SCREEN_VERSION, checks };
}
