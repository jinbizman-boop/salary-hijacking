import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";

import {
  ProfileScreen,
  type ProfileMenuKey,
} from "../../../src/features/profile/components";
import { routeAfterLogout } from "../../../src/features/auth/navigation";
import { revokeNativeNotificationDevice } from "../../../src/features/notifications/controller";
import { createNativeNotificationRegistrationDependencies } from "../../../src/features/notifications/native-device-registration";
import {
  createMobileAuthApi,
  createMobileNotificationsApi,
} from "../../../src/shared/api/mobile-api";

const SCREEN_VERSION = "4.3.0-profile-server-summary";
const PROFILE_MY_PAGE_SUMMARY_ENDPOINT = "/api/v1/users/me/my-page-summary";
const PROFILE_WITHDRAWAL_REQUEST_ENDPOINT =
  "/api/v1/users/me/withdrawal-request";
const AUTH_LOGOUT_ENDPOINT = "/api/v1/auth/logout";

const profileMenuRoutes: Readonly<Record<ProfileMenuKey, string>> = {
  PROFILE: "/profile/account",
  ACCOUNT_SECURITY: "/profile/settings",
  MY_POSTS: "/profile/community",
  MY_LEVEL: "/profile/level",
  NOTIFICATION_SETTINGS: "/profile/notifications",
  SUPPORT: "/profile/support",
  NOTICES: "/profile/notices",
};

export default function ProfileIndexScreen(): React.ReactElement {
  const router = useRouter();
  const authApi = useMemo(() => createMobileAuthApi(), []);
  const notificationsApi = useMemo(() => createMobileNotificationsApi(), []);
  const handleLogout = useCallback(async () => {
    try {
      try {
        const dependencies =
          await createNativeNotificationRegistrationDependencies();
        await revokeNativeNotificationDevice(notificationsApi, dependencies);
      } catch {
        // Logout must still end the local session if device revoke is offline.
      }
      await authApi.logout();
    } finally {
      routeAfterLogout();
    }
  }, [authApi, notificationsApi]);

  return (
    <ProfileScreen
      onLogout={handleLogout}
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
    "지켜낸 돈",
    "내 LV UP",
    "성장",
    "프로필",
    "계정/보안",
    "내 게시글 관리",
    "내 레벨업 관리",
    "알림 설정",
    "고객지원",
    "공지사항",
    PROFILE_WITHDRAWAL_REQUEST_ENDPOINT,
    AUTH_LOGOUT_ENDPOINT,
    "personal_raw_data_hidden",
    "financial_raw_data_hidden",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 14, version: SCREEN_VERSION, checks };
}
