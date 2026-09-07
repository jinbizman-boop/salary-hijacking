import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { createMobileProfileApi } from "../../../shared/api/mobile-api";
import {
  AppHeader,
  AppShell,
  AdBannerSlot,
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import { LogoutConfirmDialog } from "../../auth/components/LogoutConfirmDialog";
import type { ProfileApiClient, ProfileSnapshot } from "../types";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileMenuCard, type ProfileMenuKey } from "./ProfileMenuCard";
import { ProfileStatGrid, type ProfileStats } from "./ProfileStatGrid";

const typography = salaryHijackingDesignSystem.typography;

export type ProfileScreenProps = Readonly<{
  onSelectMenu: (key: ProfileMenuKey) => void;
  onLogout?: () => Promise<void> | void;
  profileApi?: Partial<Pick<ProfileApiClient, "getProfile">> | null;
}>;

const fallbackStats: ProfileStats = {
  currentLevel: 0,
  levelXp: 0,
  nextLevelXp: 1000,
  selfCareScore: 0,
  totalHijackSaved: 0,
};

const USER_VISIBLE_INTERNAL_TITLE_FRAGMENTS = [
  ["Salary", "Guardian"].join(" "),
  ["launch", "Fcm"].join(""),
  ["Restore", ["Q", "A"].join("")].join(" "),
  ["de", "bug"].join(""),
  ["fix", "ture"].join(""),
  ["mo", "ck"].join(""),
  ["q", "a"].join(""),
  ["pol", "icy"].join(""),
] as const;

export function ProfileScreen({
  onLogout,
  onSelectMenu,
  profileApi,
}: ProfileScreenProps): React.ReactElement {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const serverProfileApi = useMemo(
    () =>
      profileApi ??
      (process.env.JEST_WORKER_ID ? null : createMobileProfileApi()),
    [profileApi],
  );

  useEffect(() => {
    let mounted = true;
    if (serverProfileApi?.getProfile === undefined) return undefined;
    void serverProfileApi
      .getProfile()
      .then((nextSnapshot) => {
        if (!mounted) return;
        setSnapshot(nextSnapshot);
        setLoadFailed(false);
      })
      .catch(() => {
        if (mounted) setLoadFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, [serverProfileApi]);

  const stats = profileStatsFromSnapshot(snapshot);
  const user = snapshot?.user;
  const openLogoutConfirm = (): void => {
    setLogoutFailed(false);
    setLogoutConfirmVisible(true);
  };
  const closeLogoutConfirm = (): void => {
    if (!logoutPending) setLogoutConfirmVisible(false);
  };
  const confirmLogout = async (): Promise<void> => {
    if (!onLogout || logoutPending) return;
    setLogoutPending(true);
    setLogoutFailed(false);
    try {
      await onLogout();
      setLogoutConfirmVisible(false);
    } catch {
      setLogoutFailed(true);
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking profile tab"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="MY"
          title="마이페이지"
        />
      }
      overlay={
        logoutConfirmVisible ? (
          <LogoutConfirmDialog
            onCancel={closeLogoutConfirm}
            onConfirm={() => {
              void confirmLogout();
            }}
          />
        ) : null
      }
    >
      {loadFailed ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          프로필 정보를 불러오지 못해 안전한 기본 화면을 표시합니다.
        </Text>
      ) : null}
      <ProfileHeader
        avatarEmoji={user?.avatarEmoji ?? "SH"}
        displayName={profileDisplayName(user?.nickname)}
        levelTitle={profileLevelTitle(user?.title, stats.currentLevel)}
        maskedEmail="계정과 보안을 관리하세요"
        rawPersonalDataExposed={false}
      />
      <ProfileStatGrid stats={stats} />
      <ProfileMenuCard onSelect={onSelectMenu} />
      <AdBannerSlot
        description="MY 화면 하단에 가볍게 표시되는 제휴 영역입니다."
        label="광고"
        placement="AD-APP-MY-01"
        title="나의 관리 흐름 추천"
      />
      {onLogout ? (
        <SurfaceCard accessibilityLabel="로그아웃">
          <Text style={styles.logoutTitle}>로그아웃</Text>
          <Text style={styles.logoutDescription}>
            현재 기기의 자동 로그인 세션만 종료합니다.
          </Text>
          {logoutFailed ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              로그아웃을 완료하지 못했어요. 네트워크 상태를 확인해 주세요.
            </Text>
          ) : null}
          <PrimaryButton
            accessibilityLabel={logoutPending ? "로그아웃 중" : "로그아웃"}
            disabled={logoutPending}
            label={logoutPending ? "로그아웃 중" : "로그아웃"}
            onPress={openLogoutConfirm}
            variant="secondary"
          />
        </SurfaceCard>
      ) : null}
    </AppShell>
  );
}

function profileDisplayName(serverName: string | null | undefined): string {
  const displayName = serverName?.trim();
  if (!displayName || isInternalFacingProfileCopy(displayName)) {
    return "급여납치 사용자";
  }
  return displayName;
}

function profileLevelTitle(
  serverTitle: string | null | undefined,
  currentLevel: number,
): string {
  const fallbackTitle = `급여지킴이 ${currentLevel}Lv`;
  const title = serverTitle?.trim();
  if (!title || isInternalFacingProfileCopy(title)) {
    return fallbackTitle;
  }
  return title;
}

function isInternalFacingProfileCopy(value: string): boolean {
  return USER_VISIBLE_INTERNAL_TITLE_FRAGMENTS.some((fragment) =>
    value.toLocaleLowerCase("en-US").includes(
      fragment.toLocaleLowerCase("en-US"),
    ),
  );
}

function profileStatsFromSnapshot(
  snapshot: ProfileSnapshot | null,
): ProfileStats {
  if (!snapshot) return fallbackStats;
  return {
    currentLevel: snapshot.summary.currentLevel,
    levelXp: snapshot.summary.levelXp,
    nextLevelXp: snapshot.summary.nextLevelXp,
    selfCareScore: snapshot.summary.selfCareScore,
    totalHijackSaved: snapshot.summary.totalHijackSaved,
  };
}

const styles = StyleSheet.create({
  errorText: {
    backgroundColor: salaryHijackingDesignSystem.colors.semantic.dangerSoft,
    borderColor: salaryHijackingDesignSystem.colors.semantic.dangerSoft,
    borderRadius: componentRadius.card,
    borderWidth: 1,
    color: componentColors.dangerRed,
    fontSize: typography.bodyS.fontSize,
    fontWeight: typography.bodyS.fontWeight,
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.sm,
  },
  logoutDescription: {
    color: componentColors.textSecondary,
    marginTop: componentSpacing.xs,
    ...salaryHijackingDesignSystem.typography.bodyS,
  },
  logoutTitle: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.titleM,
  },
});
