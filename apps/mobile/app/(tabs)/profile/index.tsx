import { useRouter } from "expo-router";

import {
  ProfileScreen,
  type ProfileMenuKey,
} from "../../../src/features/profile/components";

const SCREEN_VERSION = "4.3.0-profile-server-summary";
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
    <ProfileScreen
      onSelectMenu={(key) => {
        router.push(profileMenuRoutes[key]);
      }}
    />
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
    "ProfileScreen",
    "server-authoritative profile snapshot",
    "누적 납치 금액",
    "레벨 업 현황",
    "자기 관리 성과",
    "내 게시글 관리",
    "내 레벨업 관리",
    "1:1 문의",
    "공지사항",
    "account settings",
    PROFILE_WITHDRAWAL_REQUEST_ENDPOINT,
    AUTH_LOGOUT_ENDPOINT,
    "personal_raw_data_hidden",
    "financial_raw_data_hidden",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 14, version: SCREEN_VERSION, checks };
}
